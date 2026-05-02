import { Router, Response } from "express";
import { Turf, Booking, User } from "@workspace/db";
import { authenticate, requireRole, AuthRequest } from "../middlewares/auth";

const router = Router();

router.get("/owner/turfs", authenticate, requireRole("turf_owner", "admin"), async (req: AuthRequest, res: Response) => {
  try {
    const turfs = await Turf.find({ ownerId: req.user!.id }).lean();
    res.json(turfs.map((t: any) => ({
      id: t._id.toString(), name: t.name, description: t.description, pricePerHour: t.pricePerHour,
      images: t.images || [], rating: t.rating, reviewCount: t.reviewCount, address: t.address,
      area: t.area, amenities: t.amenities || [], status: t.status, featured: t.featured,
      ownerId: t.ownerId?.toString(), createdAt: t.createdAt?.toISOString(),
    })));
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to fetch turfs" }); }
});

router.put("/owner/turfs/:id", authenticate, requireRole("turf_owner", "admin"), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await Turf.findById(req.params.id).lean() as any;
    if (!existing || existing.ownerId?.toString() !== req.user!.id.toString()) {
      res.status(403).json({ error: "Not authorized to edit this turf" }); return;
    }
    const { name, description, pricePerHour, amenities, address, area } = req.body;
    const updated = await Turf.findByIdAndUpdate(req.params.id, { name, description, pricePerHour, amenities, address, area }, { new: true }).lean() as any;
    res.json({ id: updated._id.toString(), ...updated });
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to update turf" }); }
});

router.get("/owner/bookings", authenticate, requireRole("turf_owner", "admin"), async (req: AuthRequest, res: Response) => {
  try {
    const ownerTurfs = await Turf.find({ ownerId: req.user!.id }, "_id name area images").lean();
    const turfIds = ownerTurfs.map((t: any) => t._id);
    if (!turfIds.length) { res.json([]); return; }
    const turfMap = Object.fromEntries((ownerTurfs as any[]).map((t: any) => [t._id.toString(), t]));
    const bookings = await Booking.find({ turfId: { $in: turfIds } }).sort({ createdAt: -1 }).lean();
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

router.get("/owner/revenue", authenticate, requireRole("turf_owner", "admin"), async (req: AuthRequest, res: Response) => {
  try {
    const ownerTurfs = await Turf.find({ ownerId: req.user!.id }, "_id name").lean();
    const turfIds = ownerTurfs.map((t: any) => t._id);
    if (!turfIds.length) { res.json({ totalRevenue: 0, totalBookings: 0, confirmedBookings: 0, pendingBookings: 0, perTurf: [] }); return; }
    const bookings = await Booking.find({ turfId: { $in: turfIds } }).lean();
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

router.get("/owner/payout-status", authenticate, requireRole("turf_owner", "admin"), async (req: AuthRequest, res: Response) => {
  try {
    const owner = await User.findById(req.user!.id).lean() as any;
    if (!owner) { res.status(404).json({ error: "Owner not found" }); return; }

    // Compute gross revenue from paid bookings
    const ownerTurfs = await Turf.find({ ownerId: req.user!.id }, "_id name").lean();
    const turfIds = ownerTurfs.map((t: any) => t._id);
    const bookings = turfIds.length
      ? await Booking.find({ turfId: { $in: turfIds }, paymentStatus: "paid" }).lean()
      : [];
    const grossRevenue = (bookings as any[]).reduce((s: number, b: any) => s + (b.totalPrice || 0), 0);
    const commissionRate = owner.commissionRate ?? 20;
    const adminCommission = Math.round(grossRevenue * commissionRate / 100);
    const ownerEarnings = grossRevenue - adminCommission;
    const payoutSent = owner.payoutSent ?? 0;
    const pendingPayout = Math.max(0, ownerEarnings - payoutSent);

    res.json({
      commissionRate,
      ownerEarnings,
      adminCommission,
      grossRevenue,
      payoutSent,
      pendingPayout,
      commissionHeld: owner.commissionHeld ?? false,
      payoutSchedule: owner.payoutSchedule ?? "manual",
      bankDetails: owner.bankDetails ?? {},
      payoutHistory: (owner.payoutHistory ?? []).map((p: any) => ({
        amount: p.amount,
        date: p.date instanceof Date ? p.date.toISOString() : p.date,
        note: p.note,
        method: p.method,
      })),
    });
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to fetch payout status" }); }
});

export default router;
