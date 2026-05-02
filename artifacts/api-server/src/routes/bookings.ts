import { Router, Request, Response } from "express";
import { db, bookingsTable, turfsTable, timeSlotsTable, usersTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import { authenticate, requireRole, AuthRequest } from "../middlewares/auth";
import Razorpay from "razorpay";
import crypto from "crypto";

const router = Router();

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || "rzp_test_dummy_key";
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "dummy_secret_key";

const razorpay = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET,
});

const PENDING_EXPIRY_MINUTES = 10;

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
    slotIds: booking.slotIds ? JSON.parse(booking.slotIds) : [booking.slotId],
    startTime: booking.startTime,
    endTime: booking.endTime,
    date: booking.date,
    totalPrice: booking.totalPrice,
    paidAmount: booking.paidAmount ?? booking.totalPrice,
    playerCount: booking.playerCount,
    paymentType: booking.paymentType || "full",
    status: booking.status,
    paymentStatus: booking.paymentStatus,
    razorpayOrderId: booking.razorpayOrderId,
    expiresAt: booking.expiresAt?.toISOString(),
    createdAt: booking.createdAt?.toISOString(),
  };
}

/** A pending booking is still "active" (slot reserved) only within its 10-min window */
function isPendingActive(booking: any): boolean {
  if (booking.status === "confirmed") return true;
  if (booking.status === "pending" && booking.expiresAt) {
    return new Date(booking.expiresAt) > new Date();
  }
  return false;
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
    const { turfId, slotIds, date, playerCount } = req.body as {
      turfId: number;
      slotIds: number[];
      date: string;
      playerCount?: number;
    };

    if (!turfId || !slotIds || !Array.isArray(slotIds) || slotIds.length === 0 || !date) {
      res.status(400).json({ error: "turfId, slotIds (array), and date are required" });
      return;
    }

    const [turf] = await db.select().from(turfsTable).where(eq(turfsTable.id, turfId));
    if (!turf) {
      res.status(404).json({ error: "Turf not found" });
      return;
    }

    // Check each slot for existing active bookings
    const now = new Date();
    const existing = await db.select().from(bookingsTable).where(
      and(
        eq(bookingsTable.turfId, turfId),
        eq(bookingsTable.date, date),
        inArray(bookingsTable.slotId, slotIds)
      )
    );

    const conflicts = existing.filter(b => isPendingActive(b));
    if (conflicts.length > 0) {
      res.status(400).json({ error: "One or more slots are already booked or reserved" });
      return;
    }

    // Fetch all slots to get start/end times
    const slots = await db.select().from(timeSlotsTable).where(
      inArray(timeSlotsTable.id, slotIds)
    );
    if (slots.length !== slotIds.length) {
      res.status(404).json({ error: "One or more slots not found" });
      return;
    }

    // Sort slots by startTime to get correct merged time span
    slots.sort((a, b) => a.startTime.localeCompare(b.startTime));
    const firstSlot = slots[0];
    const lastSlot = slots[slots.length - 1];

    const totalPrice = turf.pricePerHour * slotIds.length;
    const expiresAt = new Date(now.getTime() + PENDING_EXPIRY_MINUTES * 60 * 1000);

    // Create one booking for the first slot, storing all slot IDs
    const [booking] = await db.insert(bookingsTable).values({
      turfId,
      userId: req.user!.id,
      slotId: firstSlot.id,
      slotIds: JSON.stringify(slotIds),
      date,
      startTime: firstSlot.startTime,
      endTime: lastSlot.endTime,
      totalPrice,
      playerCount: playerCount || 10,
      status: "pending",
      paymentType: "full",
      expiresAt,
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
    const paymentType = (req.body.paymentType as string) || "full";

    const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, id));
    if (!booking) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }

    // Check if booking has expired
    if (booking.status === "pending" && booking.expiresAt && new Date(booking.expiresAt) < new Date()) {
      await db.update(bookingsTable).set({ status: "cancelled" }).where(eq(bookingsTable.id, id));
      res.status(400).json({ error: "Booking reservation has expired. Please rebook." });
      return;
    }

    // Calculate amount based on payment type
    const paidAmount = paymentType === "advance"
      ? Math.round(booking.totalPrice * 0.3 * 100) / 100
      : booking.totalPrice;

    const isDummy = RAZORPAY_KEY_ID === "rzp_test_dummy_key";
    let orderId: string;

    if (isDummy) {
      orderId = `order_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    } else {
      const rzpOrder = await razorpay.orders.create({
        amount: Math.round(paidAmount * 100),
        currency: "INR",
        receipt: `booking_${id}`,
      });
      orderId = rzpOrder.id;
    }

    await db.update(bookingsTable).set({
      razorpayOrderId: orderId,
      paymentType,
      paidAmount,
    }).where(eq(bookingsTable.id, id));

    res.json({
      orderId,
      amount: Math.round(paidAmount * 100),
      currency: "INR",
      key: RAZORPAY_KEY_ID,
      totalPrice: booking.totalPrice,
      paidAmount,
      paymentType,
    });
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Failed to create payment" });
  }
});

router.post("/bookings/:id/verify-payment", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    const isDummy = RAZORPAY_KEY_SECRET === "dummy_secret_key";
    if (!isDummy) {
      const expectedSig = crypto.createHmac("sha256", RAZORPAY_KEY_SECRET)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`).digest("hex");
      if (expectedSig !== razorpaySignature) {
        res.status(400).json({ error: "Invalid payment signature" });
        return;
      }
    }

    const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, id));
    if (!booking) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }

    const isFullyPaid = booking.paymentType !== "advance";
    const [updated] = await db.update(bookingsTable).set({
      paymentStatus: isFullyPaid ? "paid" : "partially_paid",
      status: "confirmed",
      razorpayPaymentId,
      expiresAt: null,
    }).where(eq(bookingsTable.id, id)).returning();

    res.json(bookingResponse(updated));
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Failed to verify payment" });
  }
});

export default router;
