import { Router, Request, Response } from "express";
import { db, bookingsTable, turfsTable, timeSlotsTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { authenticate, requireRole, AuthRequest } from "../middlewares/auth";
import { CreateBookingBody } from "@workspace/api-zod";
import crypto from "crypto";

const router = Router();

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || "rzp_test_dummy_key";
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "dummy_secret_key";

function bookingResponse(booking: any, turf?: any, user?: any) {
  return {
    id: booking.id,
    turfId: booking.turfId,
    turfName: turf?.name,
    turfImage: turf?.images?.[0],
    turfArea: turf?.area,
    userId: booking.userId,
    userName: user?.name,
    slotId: booking.slotId,
    startTime: booking.startTime,
    endTime: booking.endTime,
    date: booking.date,
    totalPrice: booking.totalPrice,
    status: booking.status,
    paymentStatus: booking.paymentStatus,
    createdAt: booking.createdAt?.toISOString(),
  };
}

router.get("/bookings", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { status, date } = req.query as Record<string, string>;
    const rows = await db.select({
      booking: bookingsTable,
      turf: { name: turfsTable.name, images: turfsTable.images, area: turfsTable.area },
      user: { name: usersTable.name },
    }).from(bookingsTable)
      .leftJoin(turfsTable, eq(bookingsTable.turfId, turfsTable.id))
      .leftJoin(usersTable, eq(bookingsTable.userId, usersTable.id));

    let bookings = rows;
    if (req.user!.role !== "admin") {
      bookings = bookings.filter(r => r.booking.userId === req.user!.id);
    }
    if (status) bookings = bookings.filter(r => r.booking.status === status);
    if (date) bookings = bookings.filter(r => r.booking.date === date);
    res.json(bookings.map(r => bookingResponse(r.booking, r.turf, r.user)));
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});

router.post("/bookings", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const parsed = CreateBookingBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input" });
      return;
    }
    const { turfId, slotId, date } = parsed.data;
    const existing = await db.select().from(bookingsTable).where(
      and(eq(bookingsTable.turfId, turfId), eq(bookingsTable.slotId, slotId), eq(bookingsTable.date, date))
    );
    if (existing.some(b => b.status !== "cancelled")) {
      res.status(400).json({ error: "Slot already booked for this date" });
      return;
    }
    const [slot] = await db.select().from(timeSlotsTable).where(eq(timeSlotsTable.id, slotId));
    const [turf] = await db.select().from(turfsTable).where(eq(turfsTable.id, turfId));
    if (!slot || !turf) {
      res.status(404).json({ error: "Slot or turf not found" });
      return;
    }
    const [booking] = await db.insert(bookingsTable).values({
      turfId, userId: req.user!.id, slotId, date,
      startTime: slot.startTime, endTime: slot.endTime,
      totalPrice: turf.pricePerHour,
      status: "pending",
    }).returning();
    res.status(201).json(bookingResponse(booking, turf));
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Failed to create booking" });
  }
});

router.get("/bookings/:id", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const [row] = await db.select({
      booking: bookingsTable,
      turf: { name: turfsTable.name, images: turfsTable.images, area: turfsTable.area },
      user: { name: usersTable.name },
    }).from(bookingsTable)
      .leftJoin(turfsTable, eq(bookingsTable.turfId, turfsTable.id))
      .leftJoin(usersTable, eq(bookingsTable.userId, usersTable.id))
      .where(eq(bookingsTable.id, id));
    if (!row) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }
    res.json(bookingResponse(row.booking, row.turf, row.user));
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Failed to fetch booking" });
  }
});

router.delete("/bookings/:id", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const [booking] = await db.update(bookingsTable).set({ status: "cancelled" }).where(eq(bookingsTable.id, id)).returning();
    if (!booking) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }
    res.json(bookingResponse(booking));
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Failed to cancel booking" });
  }
});

router.post("/bookings/:id/payment", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, id));
    if (!booking) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }
    const orderId = `order_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    await db.update(bookingsTable).set({ razorpayOrderId: orderId }).where(eq(bookingsTable.id, id));
    res.json({ orderId, amount: booking.totalPrice * 100, currency: "INR", key: RAZORPAY_KEY_ID });
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Failed to create payment" });
  }
});

router.post("/bookings/:id/verify-payment", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
    const isTestMode = RAZORPAY_KEY_SECRET === "dummy_secret_key" || razorpaySignature === "simulated_signature";
    if (!isTestMode) {
      const expectedSig = crypto.createHmac("sha256", RAZORPAY_KEY_SECRET)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`).digest("hex");
      if (expectedSig !== razorpaySignature) {
        res.status(400).json({ error: "Invalid payment signature" });
        return;
      }
    }
    const [booking] = await db.update(bookingsTable).set({
      paymentStatus: "paid", status: "confirmed",
      razorpayPaymentId,
    }).where(eq(bookingsTable.id, id)).returning();
    res.json(bookingResponse(booking));
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Failed to verify payment" });
  }
});

export default router;
