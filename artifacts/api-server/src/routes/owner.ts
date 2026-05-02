import { Router, Response } from "express";
import { db, turfsTable, bookingsTable, usersTable, timeSlotsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { authenticate, requireRole, AuthRequest } from "../middlewares/auth";

const router = Router();

router.get("/owner/turfs", authenticate, requireRole("turf_owner", "admin"), async (req: AuthRequest, res: Response) => {
  try {
    const turfs = await db.select().from(turfsTable).where(eq(turfsTable.ownerId, req.user!.id));
    res.json(turfs);
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Failed to fetch turfs" });
  }
});

router.put("/owner/turfs/:id", authenticate, requireRole("turf_owner", "admin"), async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const [existing] = await db.select().from(turfsTable).where(eq(turfsTable.id, id));
    if (!existing || existing.ownerId !== req.user!.id) {
      res.status(403).json({ error: "Not authorized to edit this turf" }); return;
    }
    const { name, description, pricePerHour, amenities, address, area } = req.body;
    const [updated] = await db.update(turfsTable).set({ name, description, pricePerHour, amenities, address, area }).where(eq(turfsTable.id, id)).returning();
    res.json(updated);
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Failed to update turf" });
  }
});

router.get("/owner/bookings", authenticate, requireRole("turf_owner", "admin"), async (req: AuthRequest, res: Response) => {
  try {
    const ownerTurfs = await db.select({ id: turfsTable.id }).from(turfsTable).where(eq(turfsTable.ownerId, req.user!.id));
    const turfIds = ownerTurfs.map(t => t.id);
    if (turfIds.length === 0) { res.json([]); return; }

    const rows = await db.select({
      booking: bookingsTable,
      turf: { name: turfsTable.name, area: turfsTable.area, images: turfsTable.images },
      user: { name: usersTable.name, email: usersTable.email, phone: usersTable.phone },
    })
      .from(bookingsTable)
      .leftJoin(turfsTable, eq(bookingsTable.turfId, turfsTable.id))
      .leftJoin(usersTable, eq(bookingsTable.userId, usersTable.id));

    const filtered = rows.filter(r => turfIds.includes(r.booking.turfId));
    res.json(filtered.map(r => ({
      ...r.booking,
      turfName: r.turf?.name,
      turfArea: r.turf?.area,
      turfImage: r.turf?.images?.[0],
      userName: r.user?.name,
      userEmail: r.user?.email,
      userPhone: r.user?.phone,
    })));
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});

router.get("/owner/revenue", authenticate, requireRole("turf_owner", "admin"), async (req: AuthRequest, res: Response) => {
  try {
    const ownerTurfs = await db.select({ id: turfsTable.id, name: turfsTable.name }).from(turfsTable).where(eq(turfsTable.ownerId, req.user!.id));
    const turfIds = ownerTurfs.map(t => t.id);

    if (turfIds.length === 0) {
      res.json({ totalRevenue: 0, totalBookings: 0, confirmedBookings: 0, pendingBookings: 0, perTurf: [] });
      return;
    }

    const rows = await db.select({
      booking: bookingsTable,
      turf: { name: turfsTable.name },
    })
      .from(bookingsTable)
      .leftJoin(turfsTable, eq(bookingsTable.turfId, turfsTable.id));

    const myBookings = rows.filter(r => turfIds.includes(r.booking.turfId));
    const confirmed = myBookings.filter(r => r.booking.paymentStatus === "paid");
    const totalRevenue = confirmed.reduce((sum, r) => sum + (r.booking.totalPrice || 0), 0);

    const perTurf = ownerTurfs.map(turf => {
      const turfBookings = myBookings.filter(r => r.booking.turfId === turf.id);
      const turfPaid = turfBookings.filter(r => r.booking.paymentStatus === "paid");
      return {
        turfId: turf.id,
        turfName: turf.name,
        totalBookings: turfBookings.length,
        confirmedBookings: turfPaid.length,
        revenue: turfPaid.reduce((sum, r) => sum + (r.booking.totalPrice || 0), 0),
      };
    });

    res.json({
      totalRevenue,
      totalBookings: myBookings.length,
      confirmedBookings: confirmed.length,
      pendingBookings: myBookings.filter(r => r.booking.status === "pending").length,
      perTurf,
    });
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Failed to fetch revenue" });
  }
});

export default router;
