import { Router, Response } from "express";
import { Types } from "mongoose";
import { Turf, TimeSlot, Booking, User } from "@workspace/db";
import { authenticate, AuthRequest } from "../middlewares/auth";
import Razorpay from "razorpay";
import crypto from "crypto";

const isValidId = (id: string) => Types.ObjectId.isValid(id);

const router = Router();
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || "rzp_test_dummy_key";
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "dummy_secret_key";
const razorpay = new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET });
const PENDING_EXPIRY_MINUTES = 10;

function bookingRes(b: any, turf?: any, user?: any) {
  return {
    id: b._id.toString(),
    turfId: b.turfId?.toString(),
    turfName: turf?.name,
    turfImage: turf?.images?.[0],
    turfArea: turf?.area,
    userId: b.userId?.toString(),
    userName: user?.name,
    slotId: b.slotId?.toString(),
    slotIds: (b.slotIds || []).map((id: any) => id.toString()),
    date: b.date, startTime: b.startTime, endTime: b.endTime,
    totalPrice: b.totalPrice, paidAmount: b.paidAmount ?? b.totalPrice,
    playerCount: b.playerCount, paymentType: b.paymentType || "full",
    status: b.status, paymentStatus: b.paymentStatus,
    razorpayOrderId: b.razorpayOrderId,
    expiresAt: b.expiresAt?.toISOString(),
    createdAt: b.createdAt?.toISOString(),
  };
}

router.get("/bookings", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { status, date } = req.query as Record<string, string>;
    const query: any = {};
    if (req.user!.role !== "admin") query.userId = req.user!.id;
    if (status) query.status = status;
    if (date) query.date = date;
    const bookings = await Booking.find(query).sort({ createdAt: -1 }).lean();
    const turfIds = [...new Set(bookings.map((b: any) => b.turfId?.toString()))];
    const turfs = await Turf.find({ _id: { $in: turfIds } }).lean();
    const turfMap = Object.fromEntries(turfs.map((t: any) => [t._id.toString(), t]));
    res.json(bookings.map((b: any) => bookingRes(b, turfMap[b.turfId?.toString()])));
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to fetch bookings" }); }
});

router.post("/bookings", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { turfId, slotIds, date, playerCount } = req.body as { turfId: string; slotIds: string[]; date: string; playerCount?: number };
    if (!turfId || !slotIds?.length || !date) { res.status(400).json({ error: "turfId, slotIds, date required" }); return; }
    const turf = await Turf.findById(turfId).lean() as any;
    if (!turf) { res.status(404).json({ error: "Turf not found" }); return; }
    const now = new Date();
    const existing = await Booking.find({ turfId, date, slotId: { $in: slotIds } }).lean();
    const conflicts = (existing as any[]).filter(b =>
      b.status === "confirmed" || (b.status === "pending" && b.expiresAt && new Date(b.expiresAt) > now)
    );
    if (conflicts.length > 0) { res.status(400).json({ error: "One or more slots are already booked or reserved" }); return; }
    const slots = await TimeSlot.find({ _id: { $in: slotIds } }).lean() as any[];
    if (slots.length !== slotIds.length) { res.status(404).json({ error: "One or more slots not found" }); return; }
    slots.sort((a, b) => a.startTime.localeCompare(b.startTime));
    const expiresAt = new Date(now.getTime() + PENDING_EXPIRY_MINUTES * 60 * 1000);
    const booking = await Booking.create({
      turfId, userId: req.user!.id,
      slotId: slots[0]._id, slotIds: slotIds,
      date, startTime: slots[0].startTime, endTime: slots[slots.length - 1].endTime,
      totalPrice: turf.pricePerHour * slotIds.length,
      playerCount: playerCount || 10,
      status: "pending", paymentType: "full", expiresAt,
    });
    res.status(201).json(bookingRes(booking, turf));
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to create booking" }); }
});

router.get("/bookings/:id", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!isValidId(req.params.id)) { res.status(404).json({ error: "Booking not found" }); return; }
    const booking = await Booking.findById(req.params.id).lean() as any;
    if (!booking) { res.status(404).json({ error: "Booking not found" }); return; }
    const turf = await Turf.findById(booking.turfId).lean() as any;
    const user = await User.findById(booking.userId).lean() as any;
    res.json(bookingRes(booking, turf, user));
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to fetch booking" }); }
});

router.delete("/bookings/:id", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!isValidId(req.params.id)) { res.status(404).json({ error: "Booking not found" }); return; }
    const booking = await Booking.findByIdAndUpdate(req.params.id, { status: "cancelled" }, { new: true }).lean();
    if (!booking) { res.status(404).json({ error: "Booking not found" }); return; }
    res.json(bookingRes(booking));
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to cancel booking" }); }
});

router.post("/bookings/:id/payment", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!isValidId(req.params.id)) { res.status(404).json({ error: "Booking not found" }); return; }
    const paymentType = req.body.paymentType || "full";
    const booking = await Booking.findById(req.params.id).lean() as any;
    if (!booking) { res.status(404).json({ error: "Booking not found" }); return; }
    if (booking.status === "pending" && booking.expiresAt && new Date(booking.expiresAt) < new Date()) {
      await Booking.findByIdAndUpdate(req.params.id, { status: "cancelled" });
      res.status(400).json({ error: "Booking reservation expired. Please rebook." }); return;
    }
    const paidAmount = paymentType === "advance" ? Math.round(booking.totalPrice * 0.3 * 100) / 100 : booking.totalPrice;
    const isDummy = RAZORPAY_KEY_ID === "rzp_test_dummy_key" || RAZORPAY_KEY_SECRET === "dummy_secret_key";
    let orderId: string;
    if (isDummy) {
      orderId = `order_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    } else {
      try {
        const rzpOrder = await razorpay.orders.create({ amount: Math.round(paidAmount * 100), currency: "INR", receipt: `booking_${req.params.id}` });
        orderId = rzpOrder.id;
      } catch (rzpErr: any) {
        req.log?.warn({ rzpErr }, "Razorpay order failed, falling back to simulated payment");
        orderId = `order_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      }
    }
    await Booking.findByIdAndUpdate(req.params.id, { razorpayOrderId: orderId, paymentType, paidAmount });
    res.json({ orderId, amount: Math.round(paidAmount * 100), currency: "INR", key: RAZORPAY_KEY_ID, totalPrice: booking.totalPrice, paidAmount, paymentType });
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to create payment" }); }
});

router.post("/bookings/:id/verify-payment", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!isValidId(req.params.id)) { res.status(404).json({ error: "Booking not found" }); return; }
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
    const isDummy = RAZORPAY_KEY_SECRET === "dummy_secret_key";
    if (!isDummy) {
      const expected = crypto.createHmac("sha256", RAZORPAY_KEY_SECRET).update(`${razorpayOrderId}|${razorpayPaymentId}`).digest("hex");
      if (expected !== razorpaySignature) { res.status(400).json({ error: "Invalid payment signature" }); return; }
    }
    const booking = await Booking.findById(req.params.id).lean() as any;
    if (!booking) { res.status(404).json({ error: "Booking not found" }); return; }
    const updated = await Booking.findByIdAndUpdate(req.params.id, {
      paymentStatus: booking.paymentType === "advance" ? "partially_paid" : "paid",
      status: "confirmed", razorpayPaymentId, expiresAt: null,
    }, { new: true }).lean();
    res.json(bookingRes(updated));
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to verify payment" }); }
});

export default router;
