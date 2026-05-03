import { Router, Response } from "express";
import { Types } from "mongoose";
import { Turf, Booking, User, Notification, Event, EventParticipant, Standing } from "@workspace/db";
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
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const existing = await Turf.findById(id).lean() as any;
    if (!existing || existing.ownerId?.toString() !== req.user!.id.toString()) {
      res.status(403).json({ error: "Not authorized to edit this turf" }); return;
    }
    const { name, description, pricePerHour, pricing, amenities, images, address, area, latitude, longitude } = req.body;
    const effectivePrice = pricePerHour || (pricing ? Math.min(...Object.values(pricing as Record<string,number>).filter((v: number) => v > 0)) : 0) || 0;
    const updated = await Turf.findByIdAndUpdate(
      id,
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
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const existing = await Turf.findById(id).lean() as any;
    if (!existing || existing.ownerId?.toString() !== req.user!.id.toString()) {
      res.status(403).json({ error: "Not authorized to delete this turf" }); return;
    }
    if (existing.status === "approved") {
      res.status(400).json({ error: "Cannot delete an approved turf. Contact admin." }); return;
    }
    await Turf.findByIdAndDelete(id);
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

// ── Collect Cash ────────────────────────────────────────────────────────────────

router.post("/owner/bookings/:id/collect-cash", authenticate, requireRole("turf_owner", "admin"), async (req: AuthRequest, res: Response) => {
  try {
    const bookingId = String(req.params.id);
    if (!Types.ObjectId.isValid(bookingId)) { res.status(404).json({ error: "Booking not found" }); return; }

    const ownerTurfs = await Turf.find({ ownerId: req.user!.id }, "_id").lean();
    const turfIds = ownerTurfs.map((t: any) => t._id.toString());

    const booking = await Booking.findById(bookingId).lean() as any;
    if (!booking) { res.status(404).json({ error: "Booking not found" }); return; }
    if (!turfIds.includes(booking.turfId?.toString())) { res.status(403).json({ error: "Not your booking" }); return; }
    if (booking.paymentStatus !== "partially_paid") {
      res.status(400).json({ error: "This booking does not have a pending cash balance" }); return;
    }

    const totalPrice = booking.totalPrice || 0;
    const paidAmount = booking.paidAmount || 0;
    const pendingCash = totalPrice - paidAmount;

    // Mark cash as collected
    await Booking.findByIdAndUpdate(bookingId, {
      paymentStatus: "cash_collected",
      cashCollectedAt: new Date(),
    });

    // Calculate owner's share from advance (platform keeps commission from advance)
    const owner = await User.findById(req.user!.id).lean() as any;
    const commissionRate = owner?.commissionRate ?? 20;
    const commissionAmount = Math.round(totalPrice * commissionRate / 100);
    // Owner's advance share = advance paid - commission deducted from it (capped to 0)
    const ownerAdvanceShare = Math.max(0, paidAmount - commissionAmount);

    // Notify owner: cash collected, advance share recorded
    await Notification.create({
      userId: req.user!.id,
      type: "cash_collected",
      title: "Cash Collected",
      message: `₹${pendingCash.toLocaleString("en-IN")} cash collected for booking on ${booking.date} (${booking.startTime}–${booking.endTime}). Your advance share of ₹${ownerAdvanceShare.toLocaleString("en-IN")} from online payment is settled.`,
      amount: pendingCash,
    });

    // Notify user that cash was collected
    await Notification.create({
      userId: booking.userId?.toString(),
      type: "cash_collected",
      title: "Cash Payment Received",
      message: `Your pending cash of ₹${pendingCash.toLocaleString("en-IN")} for booking on ${booking.date} has been collected by the venue. Booking fully settled.`,
      amount: pendingCash,
    });

    res.json({
      success: true,
      pendingCash,
      ownerAdvanceShare,
      commissionAmount,
      totalPrice,
    });
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to collect cash" }); }
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
    const bookingFilter: any = { paymentStatus: { $in: ["paid", "cash_collected"] } };
    if (turfId) {
      const validId = turfIds.find((id: any) => id.toString() === String(turfId));
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
    const collectedCash = (bookings as any[]).filter((b: any) => b.paymentStatus === "cash_collected").reduce((s: number, b: any) => s + Math.max(0, (b.totalPrice || 0) - (b.paidAmount || 0)), 0);
    const commissionRate = owner.commissionRate ?? 20;
    const adminCommission = Math.round(grossRevenue * commissionRate / 100);
    const ownerEarnings = grossRevenue - adminCommission;
    const payoutSent = owner.payoutSent ?? 0;
    const adjustedOwnerEarnings = Math.max(0, ownerEarnings - collectedCash);
    const adjustedPendingPayout = Math.max(0, adjustedOwnerEarnings - payoutSent);
    res.json({
      commissionRate, ownerEarnings: adjustedOwnerEarnings, adminCommission, grossRevenue, payoutSent, pendingPayout: adjustedPendingPayout, collectedCash,
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

// ── Bank Details ─────────────────────────────────────────────────────────────────

router.put("/owner/bank-details", authenticate, requireRole("turf_owner", "admin"), async (req: AuthRequest, res: Response) => {
  try {
    const { bankName, accountName, accountNumber, ifscCode, upiId } = req.body;

    // Basic validation
    if (ifscCode && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode.toUpperCase())) {
      res.status(400).json({ error: "Invalid IFSC code format (e.g. SBIN0001234)" }); return;
    }
    if (upiId && !/^[\w.\-+]+@[\w]+$/.test(upiId)) {
      res.status(400).json({ error: "Invalid UPI ID format (e.g. name@upi)" }); return;
    }
    if (accountNumber && !/^\d{9,18}$/.test(accountNumber)) {
      res.status(400).json({ error: "Account number must be 9–18 digits" }); return;
    }

    const updated = await User.findByIdAndUpdate(
      req.user!.id,
      {
        bankDetails: {
          bankName:      (bankName      || "").trim(),
          accountName:   (accountName   || "").trim(),
          accountNumber: (accountNumber || "").trim(),
          ifscCode:      (ifscCode      || "").trim().toUpperCase(),
          upiId:         (upiId         || "").trim(),
        },
      },
      { new: true }
    ).lean() as any;

    if (!updated) { res.status(404).json({ error: "User not found" }); return; }

    res.json({
      success: true,
      bankDetails: updated.bankDetails ?? {},
    });
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to update bank details" }); }
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
        ? Booking.find({ turfId: { $in: turfIds }, paymentStatus: { $in: ["paid", "cash_collected"] } }).lean()
        : Promise.resolve([]),
    ]);

    // Today revenue (paid + cash_collected bookings today)
    const todayPaid = (todayBookings as any[]).filter((b: any) => b.paymentStatus === "paid" || b.paymentStatus === "cash_collected");
    const todayRevenue = todayPaid.reduce((s: number, b: any) => s + (b.totalPrice || 0), 0);

    // All-time payout calc
    const commissionRate = owner.commissionRate ?? 20;
    const grossRevenue   = (allPaidBookings as any[]).reduce((s: number, b: any) => s + (b.totalPrice || 0), 0);
    const adminCommission = Math.round(grossRevenue * commissionRate / 100);
    const ownerEarnings  = grossRevenue - adminCommission;
    const payoutSent     = owner.payoutSent ?? 0;
    const collectedCash  = (todayBookings as any[]).filter((b: any) => b.paymentStatus === "cash_collected").reduce((s: number, b: any) => s + Math.max(0, (b.totalPrice || 0) - (b.paidAmount || 0)), 0);
    const adjustedOwnerEarnings = Math.max(0, ownerEarnings - collectedCash);
    const pendingPayout  = Math.max(0, adjustedOwnerEarnings - payoutSent);

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

// ── Owner Events & Tournaments ────────────────────────────────────────────────

router.get("/owner/events", authenticate, requireRole("turf_owner", "admin"), async (req: AuthRequest, res: Response) => {
  try {
    const events = await Event.find({ createdBy: req.user!.id }).sort({ createdAt: -1 }).lean();
    const eventIds = events.map((e: any) => e._id);
    const countMap: Record<string, number> = {};
    if (eventIds.length) {
      const parts = await EventParticipant.aggregate([
        { $match: { eventId: { $in: eventIds } } },
        { $group: { _id: "$eventId", count: { $sum: 1 } } },
      ]);
      parts.forEach((p: any) => { countMap[p._id.toString()] = p.count; });
    }
    res.json(events.map((e: any) => ({
      id: e._id.toString(), title: e.title, description: e.description,
      date: e.date, time: e.time, venue: e.venue, area: e.area, image: e.image,
      prize: e.prize, entryFee: e.entryFee, maxParticipants: e.maxParticipants,
      currentParticipants: countMap[e._id.toString()] ?? e.currentParticipants,
      featured: e.featured, status: e.status,
      type: e.type || "event",
      turfId: e.turfId?.toString(), turfName: e.turfName,
      maintenanceStartTime: e.maintenanceStartTime, maintenanceEndTime: e.maintenanceEndTime,
      createdAt: e.createdAt?.toISOString(),
    })));
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to fetch owner events" }); }
});

router.post("/owner/events", authenticate, requireRole("turf_owner", "admin"), async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, date, time, venue, area, prize, entryFee, maxParticipants, type, turfId, turfName, maintenanceStartTime, maintenanceEndTime, image } = req.body;
    if (!title?.trim() || !date) { res.status(400).json({ error: "title and date required" }); return; }

    // If turfId provided, verify ownership
    if (turfId && Types.ObjectId.isValid(turfId)) {
      const turf = await Turf.findOne({ _id: turfId, ownerId: req.user!.id }).lean();
      if (!turf && req.user!.role !== "admin") { res.status(403).json({ error: "You don't own that turf" }); return; }
    }

    const me = await User.findById(req.user!.id).select("name").lean() as any;
    const event = await Event.create({
      title: title.trim(), description, date, time, venue, area, prize,
      entryFee: entryFee || 0, maxParticipants,
      type: type || "tournament",
      image: image || undefined,
      turfId: turfId && Types.ObjectId.isValid(turfId) ? turfId : undefined,
      turfName,
      maintenanceStartTime, maintenanceEndTime,
      createdBy: req.user!.id,
      createdByRole: req.user!.role === "admin" ? "admin" : "owner",
      createdByName: me?.name || "",
      status: "upcoming",
      featured: false,
    });

    res.status(201).json({
      id: event._id.toString(), title: event.title, date: event.date, type: event.type,
      image: event.image, prize: event.prize, entryFee: event.entryFee,
      maxParticipants: event.maxParticipants, featured: event.featured,
      status: event.status, venue: event.venue, area: event.area,
      turfId: event.turfId?.toString(), turfName: event.turfName,
      createdAt: event.createdAt?.toISOString(),
    });
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to create event" }); }
});

router.put("/owner/events/:id", authenticate, requireRole("turf_owner", "admin"), async (req: AuthRequest, res: Response) => {
  try {
    if (!Types.ObjectId.isValid(String(req.params.id))) { res.status(404).json({ error: "Not found" }); return; }
    const existing = await Event.findOne({ _id: req.params.id, createdBy: req.user!.id }).lean();
    if (!existing && req.user!.role !== "admin") { res.status(403).json({ error: "Not your event" }); return; }
    const allowed = ["title","description","date","time","venue","area","prize","entryFee","maxParticipants","status","type","maintenanceStartTime","maintenanceEndTime","turfName","image"];
    const update: any = {};
    for (const k of allowed) if (req.body[k] !== undefined) update[k] = req.body[k];
    const updated = await Event.findByIdAndUpdate(req.params.id, update, { new: true }).lean() as any;
    if (!updated) { res.status(404).json({ error: "Not found" }); return; }
    res.json({ id: updated._id.toString(), ...update });
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to update event" }); }
});

router.delete("/owner/events/:id", authenticate, requireRole("turf_owner", "admin"), async (req: AuthRequest, res: Response) => {
  try {
    if (!Types.ObjectId.isValid(String(req.params.id))) { res.status(404).json({ error: "Not found" }); return; }
    const existing = await Event.findOne({ _id: req.params.id, createdBy: req.user!.id }).lean();
    if (!existing && req.user!.role !== "admin") { res.status(403).json({ error: "Not your event" }); return; }
    await Event.findByIdAndDelete(req.params.id);
    await EventParticipant.deleteMany({ eventId: req.params.id });
    res.json({ success: true });
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to delete event" }); }
});

router.get("/owner/events/:id/applications", authenticate, requireRole("turf_owner", "admin"), async (req: AuthRequest, res: Response) => {
  try {
    if (!Types.ObjectId.isValid(String(req.params.id))) { res.status(404).json({ error: "Not found" }); return; }
    const ev = await Event.findOne({ _id: req.params.id, createdBy: req.user!.id }).lean() as any;
    if (!ev && req.user!.role !== "admin") { res.status(403).json({ error: "Not your event" }); return; }
    const participants = await EventParticipant.find({ eventId: req.params.id })
      .populate("userId", "name phone email avatar")
      .sort({ joinedAt: -1 })
      .lean();
    res.json({
      eventId: req.params.id,
      eventTitle: ev?.title,
      total: participants.length,
      applications: participants.map((p: any) => ({
        id: p._id.toString(),
        userId: p.userId?._id?.toString() || p.userId?.toString(),
        name: p.name || p.userId?.name || "Unknown",
        phone: p.phone || p.userId?.phone,
        email: p.userId?.email,
        avatar: p.userId?.avatar,
        teamName: p.teamName,
        joinedAt: p.joinedAt?.toISOString(),
      })),
    });
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to fetch applications" }); }
});

// ── Standings (Leaderboard) ────────────────────────────────────────────────────

// GET /api/owner/events/:id/standings
router.get("/owner/events/:id/standings", authenticate, requireRole("turf_owner", "admin"), async (req: AuthRequest, res: Response) => {
  try {
    if (!Types.ObjectId.isValid(String(req.params.id))) { res.status(404).json({ error: "Not found" }); return; }
    const standings = await Standing.find({ eventId: req.params.id }).sort({ position: 1 }).lean();
    res.json(standings.map((s: any) => ({
      id: s._id.toString(), eventId: s.eventId.toString(), position: s.position,
      teamName: s.teamName, played: s.played, won: s.won, lost: s.lost, drawn: s.drawn,
      points: s.points, goalsFor: s.goalsFor, goalsAgainst: s.goalsAgainst,
      updatedAt: s.updatedAt?.toISOString(),
    })));
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to fetch standings" }); }
});

// POST /api/owner/events/:id/standings — upsert a team row
router.post("/owner/events/:id/standings", authenticate, requireRole("turf_owner", "admin"), async (req: AuthRequest, res: Response) => {
  try {
    if (!Types.ObjectId.isValid(String(req.params.id))) { res.status(404).json({ error: "Not found" }); return; }
    const ev = await Event.findOne({ _id: req.params.id, createdBy: req.user!.id }).lean();
    if (!ev && req.user!.role !== "admin") { res.status(403).json({ error: "Not your event" }); return; }
    const { teamName, position, played, won, lost, drawn, points, goalsFor, goalsAgainst } = req.body;
    if (!teamName || position == null) { res.status(400).json({ error: "teamName and position are required" }); return; }
    const standing = await Standing.findOneAndUpdate(
      { eventId: req.params.id, teamName },
      { eventId: req.params.id, teamName, position: Number(position),
        played: Number(played) || 0, won: Number(won) || 0, lost: Number(lost) || 0,
        drawn: Number(drawn) || 0, points: Number(points) || 0,
        goalsFor: Number(goalsFor) || 0, goalsAgainst: Number(goalsAgainst) || 0 },
      { upsert: true, new: true }
    ).lean() as any;
    res.json({
      id: standing._id.toString(), eventId: standing.eventId.toString(), position: standing.position,
      teamName: standing.teamName, played: standing.played, won: standing.won, lost: standing.lost,
      drawn: standing.drawn, points: standing.points, goalsFor: standing.goalsFor,
      goalsAgainst: standing.goalsAgainst, updatedAt: standing.updatedAt?.toISOString(),
    });
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to save standing" }); }
});

// DELETE /api/owner/events/:id/standings/:standingId
router.delete("/owner/events/:id/standings/:standingId", authenticate, requireRole("turf_owner", "admin"), async (req: AuthRequest, res: Response) => {
  try {
    if (!Types.ObjectId.isValid(String(req.params.id)) || !Types.ObjectId.isValid(String(req.params.standingId))) {
      res.status(404).json({ error: "Not found" }); return;
    }
    const ev = await Event.findOne({ _id: req.params.id, createdBy: req.user!.id }).lean();
    if (!ev && req.user!.role !== "admin") { res.status(403).json({ error: "Not your event" }); return; }
    await Standing.findByIdAndDelete(req.params.standingId);
    res.json({ success: true });
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to delete standing" }); }
});

export default router;
