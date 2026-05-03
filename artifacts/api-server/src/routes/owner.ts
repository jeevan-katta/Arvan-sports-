import { Router, Response } from "express";
import { Turf, Booking, User, Notification } from "@workspace/db";
import { authenticate, requireRole, AuthRequest } from "../middlewares/auth";

const router = Router();

// ── Turfs ──────────────────────────────────────────────────────────────────────

router.get("/owner/turfs", authenticate, requireRole("turf_owner", "admin"), async (req: AuthRequest, res: Response) => {
  try {
    const turfs = await Turf.find({ ownerId: req.user!.id }).lean();
    res.json(turfs.map((t: any) => ({
      id: t._id.toString(), name: t.name, description: t.description, pricePerHour: t.pricePerHour,
      pricing: t.pricing || null,
      images: t.images || [], rating: t.rating, reviewCount: t.reviewCount, address: t.address,
      area: t.area, latitude: t.latitude, longitude: t.longitude,
      amenities: t.amenities || [], status: t.status, featured: t.featured,
      ownerId: t.ownerId?.toString(), createdAt: t.createdAt?.toISOString(),
    })));
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to fetch turfs" }); }
});

router.post("/owner/turfs", authenticate, requireRole("turf_owner", "admin"), async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, pricePerHour, pricing, area, address, latitude, longitude, amenities, images } = req.body;
    if (!name || !area) {
      res.status(400).json({ error: "Name and area are required" }); return;
    }
    const effectivePrice = pricePerHour || (pricing ? Math.min(...Object.values(pricing as Record<string,number>).filter((v: number) => v > 0)) : 0) || 0;
    const turf = await Turf.create({
      name: name.trim(),
      description: description?.trim() || "",
      pricePerHour: effectivePrice,
      pricing: pricing || null,
      area: area.trim(),
      address: address?.trim() || "",
      latitude: latitude ? Number(latitude) : undefined,
      longitude: longitude ? Number(longitude) : undefined,
      amenities: amenities || [],
      images: images || [],
      status: "pending",
      featured: false,
      ownerId: req.user!.id,
    });
    res.status(201).json({
      id: turf._id.toString(), name: turf.name, description: turf.description,
      pricePerHour: turf.pricePerHour, pricing: turf.pricing || null,
      area: turf.area, address: turf.address,
      latitude: turf.latitude, longitude: turf.longitude, amenities: turf.amenities,
      images: turf.images, status: turf.status, featured: turf.featured,
      ownerId: turf.ownerId?.toString(), createdAt: (turf as any).createdAt?.toISOString(),
    });
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to create turf" }); }
});

router.put("/owner/turfs/:id", authenticate, requireRole("turf_owner", "admin"), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await Turf.findById(req.params.id).lean() as any;
    if (!existing || existing.ownerId?.toString() !== req.user!.id.toString()) {
      res.status(403).json({ error: "Not authorized to edit this turf" }); return;
    }
    const { name, description, pricePerHour, pricing, amenities, images, address, area, latitude, longitude } = req.body;
    const effectivePrice = pricePerHour || (pricing ? Math.min(...Object.values(pricing as Record<string,number>).filter((v: number) => v > 0)) : 0) || 0;
    const updated = await Turf.findByIdAndUpdate(
      req.params.id,
      { name, description, pricePerHour: effectivePrice, pricing: pricing || null, amenities, images: images || [], address, area, latitude, longitude },
      { new: true }
    ).lean() as any;
    res.json({
      id: updated._id.toString(), name: updated.name, description: updated.description,
      pricePerHour: updated.pricePerHour, pricing: updated.pricing || null,
      area: updated.area, address: updated.address,
      latitude: updated.latitude, longitude: updated.longitude, amenities: updated.amenities || [],
      images: updated.images || [], status: updated.status, featured: updated.featured,
      ownerId: updated.ownerId?.toString(), createdAt: updated.createdAt?.toISOString(),
    });
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to update turf" }); }
});

router.delete("/owner/turfs/:id", authenticate, requireRole("turf_owner", "admin"), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await Turf.findById(req.params.id).lean() as any;
    if (!existing || existing.ownerId?.toString() !== req.user!.id.toString()) {
      res.status(403).json({ error: "Not authorized to delete this turf" }); return;
    }
    if (existing.status === "approved") {
      res.status(400).json({ error: "Cannot delete an approved turf. Contact admin." }); return;
    }
    await Turf.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to delete turf" }); }
});

// ── Bookings ────────────────────────────────────────────────────────────────────

router.get("/owner/bookings", authenticate, requireRole("turf_owner", "admin"), async (req: AuthRequest, res: Response) => {
  try {
    const ownerTurfs = await Turf.find({ ownerId: req.user!.id }, "_id name area images").lean();
    const turfIds = ownerTurfs.map((t: any) => t._id);
    if (!turfIds.length) { res.json([]); return; }
    const turfMap = Object.fromEntries((ownerTurfs as any[]).map((t: any) => [t._id.toString(), t]));
    const { date, turfId } = req.query;
    // If turfId is specified, validate it belongs to this owner
    const allowedIds = turfId
      ? turfIds.filter((id: any) => id.toString() === turfId)
      : turfIds;
    if (!allowedIds.length) { res.json([]); return; }
    const filter: any = { turfId: { $in: allowedIds } };
    if (date) filter.date = date as string;
    const bookings = await Booking.find(filter).sort({ date: 1, startTime: 1 }).lean();
    const userIds = [...new Set(bookings.map((b: any) => b.userId?.toString()))];
    const users = await User.find({ _id: { $in: userIds } }, "name email phone").lean();
    const userMap = Object.fromEntries(users.map((u: any) => [u._id.toString(), u]));
    res.json(bookings.map((b: any) => {
      const turf = turfMap[b.turfId?.toString()];
      const user = userMap[b.userId?.toString()];
      return {
        id: b._id.toString(), turfId: b.turfId?.toString(), userId: b.userId?.toString(),
        turfName: turf?.name, turfArea: turf?.area, turfImage: turf?.images?.[0],
        userName: user?.name, userEmail: user?.email, userPhone: user?.phone,
        slotId: b.slotId?.toString(), date: b.date, startTime: b.startTime, endTime: b.endTime,
        totalPrice: b.totalPrice, paidAmount: b.paidAmount, playerCount: b.playerCount,
        status: b.status, paymentStatus: b.paymentStatus, paymentType: b.paymentType,
        createdAt: b.createdAt?.toISOString(),
      };
    }));
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to fetch bookings" }); }
});

// ── Revenue ─────────────────────────────────────────────────────────────────────

router.get("/owner/revenue", authenticate, requireRole("turf_owner", "admin"), async (req: AuthRequest, res: Response) => {
  try {
    const ownerTurfs = await Turf.find({ ownerId: req.user!.id }, "_id name").lean();
    const turfIds = ownerTurfs.map((t: any) => t._id);
    if (!turfIds.length) { res.json({ totalRevenue: 0, totalBookings: 0, confirmedBookings: 0, pendingBookings: 0, perTurf: [] }); return; }
    const { month, year } = req.query;
    const dateFilter: any = {};
    if (month && year) {
      const y = String(year); const m = String(month).padStart(2, "0");
      dateFilter.date = { $gte: `${y}-${m}-01`, $lte: `${y}-${m}-31` };
    }
    const bookings = await Booking.find({ turfId: { $in: turfIds }, ...dateFilter }).lean();
    const confirmed = (bookings as any[]).filter((b: any) => b.paymentStatus === "paid");
    const totalRevenue = confirmed.reduce((s: number, b: any) => s + (b.totalPrice || 0), 0);
    const perTurf = (ownerTurfs as any[]).map((turf: any) => {
      const tb = (bookings as any[]).filter((b: any) => b.turfId?.toString() === turf._id.toString());
      const tp = tb.filter((b: any) => b.paymentStatus === "paid");
      return { turfId: turf._id.toString(), turfName: turf.name, totalBookings: tb.length, confirmedBookings: tp.length, revenue: tp.reduce((s: number, b: any) => s + (b.totalPrice || 0), 0) };
    });
    res.json({ totalRevenue, totalBookings: bookings.length, confirmedBookings: confirmed.length, pendingBookings: (bookings as any[]).filter((b: any) => b.status === "pending").length, perTurf });
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to fetch revenue" }); }
});

// ── Payout Status ───────────────────────────────────────────────────────────────

router.get("/owner/payout-status", authenticate, requireRole("turf_owner", "admin"), async (req: AuthRequest, res: Response) => {
  try {
    const owner = await User.findById(req.user!.id).lean() as any;
    if (!owner) { res.status(404).json({ error: "Owner not found" }); return; }
    const ownerTurfs = await Turf.find({ ownerId: req.user!.id }, "_id name").lean();
    const turfIds = ownerTurfs.map((t: any) => t._id);
    const { month, year, turfId } = req.query;
    // Build filter — optional turf/date scoping
    const bookingFilter: any = { paymentStatus: "paid" };
    if (turfId) {
      const validId = turfIds.find((id: any) => id.toString() === turfId);
      bookingFilter.turfId = validId ?? null;
    } else {
      bookingFilter.turfId = { $in: turfIds };
    }
    if (month && year) {
      const y = String(year); const m = String(month).padStart(2, "0");
      bookingFilter.date = { $gte: `${y}-${m}-01`, $lte: `${y}-${m}-31` };
    } else if (year) {
      const y = String(year);
      bookingFilter.date = { $gte: `${y}-01-01`, $lte: `${y}-12-31` };
    }
    const bookings = turfIds.length ? await Booking.find(bookingFilter).lean() : [];
    const grossRevenue = (bookings as any[]).reduce((s: number, b: any) => s + (b.totalPrice || 0), 0);
    const commissionRate = owner.commissionRate ?? 20;
    const adminCommission = Math.round(grossRevenue * commissionRate / 100);
    const ownerEarnings = grossRevenue - adminCommission;
    const payoutSent = owner.payoutSent ?? 0;
    const pendingPayout = Math.max(0, ownerEarnings - payoutSent);
    res.json({
      commissionRate, ownerEarnings, adminCommission, grossRevenue, payoutSent, pendingPayout,
      commissionHeld: owner.commissionHeld ?? false,
      payoutSchedule: owner.payoutSchedule ?? "manual",
      bankDetails: owner.bankDetails ?? {},
      payoutHistory: (owner.payoutHistory ?? []).map((p: any) => ({
        amount: p.amount,
        date: p.date instanceof Date ? p.date.toISOString() : p.date,
        note: p.note, method: p.method,
      })),
    });
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to fetch payout status" }); }
});

// ── Today's Live Snapshot ────────────────────────────────────────────────────────

router.get("/owner/today", authenticate, requireRole("turf_owner", "admin"), async (req: AuthRequest, res: Response) => {
  try {
    const owner = await User.findById(req.user!.id).lean() as any;
    if (!owner) { res.status(404).json({ error: "Owner not found" }); return; }

    const ownerTurfs = await Turf.find({ ownerId: req.user!.id }, "_id name area images").lean();
    const turfIds = ownerTurfs.map((t: any) => t._id);
    const turfMap = Object.fromEntries((ownerTurfs as any[]).map((t: any) => [t._id.toString(), t]));

    // IST date string  "YYYY-MM-DD"
    const istNow = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
    const todayStr = istNow.toISOString().slice(0, 10);

    const [todayBookings, allPaidBookings] = await Promise.all([
      turfIds.length
        ? Booking.find({ turfId: { $in: turfIds }, date: todayStr }).sort({ startTime: 1 }).lean()
        : Promise.resolve([]),
      turfIds.length
        ? Booking.find({ turfId: { $in: turfIds }, paymentStatus: "paid" }).lean()
        : Promise.resolve([]),
    ]);

    // Today revenue (paid bookings today)
    const todayPaid = (todayBookings as any[]).filter((b: any) => b.paymentStatus === "paid");
    const todayRevenue = todayPaid.reduce((s: number, b: any) => s + (b.totalPrice || 0), 0);

    // All-time payout calc
    const commissionRate = owner.commissionRate ?? 20;
    const grossRevenue   = (allPaidBookings as any[]).reduce((s: number, b: any) => s + (b.totalPrice || 0), 0);
    const adminCommission = Math.round(grossRevenue * commissionRate / 100);
    const ownerEarnings  = grossRevenue - adminCommission;
    const payoutSent     = owner.payoutSent ?? 0;
    const pendingPayout  = Math.max(0, ownerEarnings - payoutSent);

    // Today's owner cut from today's paid bookings
    const todayOwnerCut = Math.round(todayRevenue * (1 - commissionRate / 100));

    // Upcoming slots today (status not cancelled)
    const nowHHMM = `${String(istNow.getUTCHours()).padStart(2,"0")}:${String(istNow.getUTCMinutes()).padStart(2,"0")}`;
    const upcomingToday = (todayBookings as any[]).filter((b: any) => b.startTime > nowHHMM && b.status !== "cancelled");

    // Last payout record
    const lastPayout = (owner.payoutHistory ?? []).slice(-1)[0] ?? null;

    res.json({
      todayDate: todayStr,
      serverTimeIST: istNow.toISOString(),
      // Today numbers
      todayTotalBookings: (todayBookings as any[]).length,
      todayPaidBookings: todayPaid.length,
      todayRevenue,
      todayOwnerCut,
      todayUpcomingSlots: upcomingToday.length,
      // Payout
      commissionRate,
      pendingPayout,
      payoutSchedule: owner.payoutSchedule ?? "manual",
      commissionHeld: owner.commissionHeld ?? false,
      lastPayout: lastPayout ? { amount: lastPayout.amount, date: lastPayout.date instanceof Date ? lastPayout.date.toISOString() : lastPayout.date, method: lastPayout.method } : null,
      // Today's booking list (slim)
      todayBookingList: (todayBookings as any[]).map((b: any) => {
        const turf = turfMap[b.turfId?.toString()];
        return {
          id: b._id.toString(),
          turfName: turf?.name ?? "Turf",
          turfImage: turf?.images?.[0] ?? null,
          startTime: b.startTime,
          endTime: b.endTime,
          userName: b.userName,
          totalPrice: b.totalPrice,
          status: b.status,
          paymentStatus: b.paymentStatus,
        };
      }),
    });
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to fetch today snapshot" }); }
});

// ── Notifications ───────────────────────────────────────────────────────────────

router.get("/owner/notifications", authenticate, requireRole("turf_owner", "admin"), async (req: AuthRequest, res: Response) => {
  try {
    const notes = await Notification.find({ userId: req.user!.id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json(notes.map((n: any) => ({
      id: n._id.toString(), type: n.type, title: n.title, message: n.message,
      read: n.read, amount: n.amount,
      createdAt: n.createdAt?.toISOString(),
    })));
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to fetch notifications" }); }
});

router.put("/owner/notifications/read-all", authenticate, requireRole("turf_owner", "admin"), async (req: AuthRequest, res: Response) => {
  try {
    await Notification.updateMany({ userId: req.user!.id, read: false }, { read: true });
    res.json({ success: true });
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to mark notifications read" }); }
});

router.put("/owner/notifications/:id/read", authenticate, requireRole("turf_owner", "admin"), async (req: AuthRequest, res: Response) => {
  try {
    await Notification.findOneAndUpdate({ _id: req.params.id, userId: req.user!.id }, { read: true });
    res.json({ success: true });
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to mark notification read" }); }
});

export default router;
