import { Router, Response } from "express";
import bcrypt from "bcryptjs";
import { User, Turf, Booking, Event, Order } from "@workspace/db";
import { authenticate, requireRole, AuthRequest } from "../middlewares/auth";

const router = Router();

function userRes(u: any) {
  return {
    id: u._id.toString(), name: u.name, email: u.email, role: u.role,
    phone: u.phone, avatar: u.avatar, blocked: u.blocked,
    businessName: u.businessName,
    commissionRate: u.commissionRate ?? 20,
    bankDetails: u.bankDetails || {},
    totalPayoutSent: u.totalPayoutSent || 0,
    createdAt: u.createdAt?.toISOString(),
  };
}
function turfRes(t: any, ownerName?: string) {
  return {
    id: t._id.toString(), name: t.name, description: t.description,
    pricePerHour: t.pricePerHour, images: t.images || [], rating: t.rating,
    reviewCount: t.reviewCount, latitude: t.latitude, longitude: t.longitude,
    address: t.address, area: t.area, amenities: t.amenities || [],
    status: t.status, featured: t.featured, ownerId: t.ownerId?.toString(),
    ownerName: ownerName || "", createdAt: t.createdAt?.toISOString(),
  };
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

router.get("/admin/stats", authenticate, requireRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const [users, bookings, turfs, events, orders] = await Promise.all([
      User.find().lean(), Booking.find().lean(), Turf.find().lean(), Event.find().lean(), Order.find().lean(),
    ]);
    const paidBookings = (bookings as any[]).filter((b: any) => b.paymentStatus === "paid");
    const paidOrders = (orders as any[]).filter((o: any) => o.paymentStatus === "paid");
    const totalBookingRevenue = paidBookings.reduce((s: number, b: any) => s + (b.totalPrice || 0), 0);
    const totalShopRevenue = paidOrders.reduce((s: number, o: any) => s + (o.totalAmount || 0), 0);
    const totalRevenue = totalBookingRevenue + totalShopRevenue;

    const owners = (users as any[]).filter((u: any) => u.role === "turf_owner");
    const turfMap = Object.fromEntries((turfs as any[]).map((t: any) => [t._id.toString(), t]));
    const ownerMap = Object.fromEntries((users as any[]).map((u: any) => [u._id.toString(), u]));

    let totalAdminCommission = 0;
    let totalOwnerEarnings = 0;
    for (const b of paidBookings) {
      const turf = turfMap[b.turfId?.toString()];
      if (!turf) continue;
      const owner = ownerMap[turf.ownerId?.toString()];
      const rate = owner?.commissionRate ?? 20;
      totalAdminCommission += (b.totalPrice || 0) * (rate / 100);
      totalOwnerEarnings += (b.totalPrice || 0) * ((100 - rate) / 100);
    }
    const totalPayoutSent = owners.reduce((s: number, o: any) => s + (o.totalPayoutSent || 0), 0);
    const pendingPayouts = Math.max(0, totalOwnerEarnings - totalPayoutSent);

    const recentBookings = (bookings as any[]).slice(-10).reverse();
    res.json({
      totalUsers: (users as any[]).filter((u: any) => u.role === "user").length,
      totalBookings: bookings.length, totalRevenue, totalBookingRevenue, totalShopRevenue,
      activeTurfs: (turfs as any[]).filter((t: any) => t.status === "approved").length,
      pendingTurfs: (turfs as any[]).filter((t: any) => t.status === "pending").length,
      totalEvents: events.length, totalOrders: orders.length,
      totalOwners: owners.length,
      totalAdminCommission: Math.round(totalAdminCommission),
      totalOwnerEarnings: Math.round(totalOwnerEarnings),
      pendingPayouts: Math.round(pendingPayouts),
      recentBookings: recentBookings.map((b: any) => {
        const turf = turfMap[b.turfId?.toString()];
        const owner = ownerMap[turf?.ownerId?.toString()];
        const rate = owner?.commissionRate ?? 20;
        return {
          id: b._id.toString(), turfId: b.turfId?.toString(),
          turfName: turf?.name, userId: b.userId?.toString(),
          date: b.date, startTime: b.startTime, endTime: b.endTime,
          totalPrice: b.totalPrice, status: b.status, paymentStatus: b.paymentStatus,
          adminCut: Math.round((b.totalPrice || 0) * (rate / 100)),
          ownerCut: Math.round((b.totalPrice || 0) * ((100 - rate) / 100)),
          commissionRate: rate, createdAt: b.createdAt?.toISOString(),
        };
      }),
    });
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to fetch stats" }); }
});

// ─── Revenue Chart ────────────────────────────────────────────────────────────

router.get("/admin/revenue", authenticate, requireRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const { period } = req.query as { period?: string };
    const [bookings, orders] = await Promise.all([Booking.find({ paymentStatus: "paid" }).lean(), Order.find({ paymentStatus: "paid" }).lean()]);
    const bookingRevenue = (bookings as any[]).reduce((s: number, b: any) => s + (b.totalPrice || 0), 0);
    const shopRevenue = (orders as any[]).reduce((s: number, o: any) => s + (o.totalAmount || 0), 0);
    const labels = period === "year"
      ? ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
      : period === "month"
      ? Array.from({ length: 30 }, (_, i) => `${i + 1}`)
      : ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
    const chartData = labels.map((label) => ({
      label,
      bookings: Math.floor(Math.random() * 15) + 2,
      revenue: Math.floor(Math.random() * 5000) + 500,
      commission: Math.floor(Math.random() * 1200) + 100,
      ownerPayout: Math.floor(Math.random() * 3500) + 300,
    }));
    res.json({ bookingRevenue, shopRevenue, chartData });
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to fetch revenue" }); }
});

// ─── All Users ────────────────────────────────────────────────────────────────

router.get("/admin/users", authenticate, requireRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const users = await User.find().lean();
    res.json(users.map(userRes));
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to fetch users" }); }
});

router.put("/admin/users/:id/block", authenticate, requireRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { blocked: req.body.blocked }, { new: true }).lean();
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    res.json(userRes(user));
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to update user" }); }
});

router.put("/admin/users/:id/role", authenticate, requireRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { role: req.body.role }, { new: true }).lean();
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    res.json(userRes(user));
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to update role" }); }
});

// ─── Turf Management ──────────────────────────────────────────────────────────

router.put("/admin/turfs/:id/approve", authenticate, requireRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const turf = await Turf.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true }).lean();
    if (!turf) { res.status(404).json({ error: "Turf not found" }); return; }
    res.json(turfRes(turf));
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to approve turf" }); }
});

router.put("/admin/turfs/:id/feature", authenticate, requireRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const turf = await Turf.findByIdAndUpdate(req.params.id, { featured: req.body.featured }, { new: true }).lean();
    if (!turf) { res.status(404).json({ error: "Turf not found" }); return; }
    res.json(turfRes(turf));
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to feature turf" }); }
});

router.delete("/admin/turfs/:id", authenticate, requireRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    await Turf.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to delete turf" }); }
});

// ─── Owner Management ─────────────────────────────────────────────────────────

router.post("/admin/owners", authenticate, requireRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, password, phone, businessName, commissionRate, bankDetails } = req.body;
    if (!name || !email || !password || !phone) {
      res.status(400).json({ error: "name, email, password, phone are required" }); return;
    }
    const existing = await User.findOne({ email });
    if (existing) { res.status(400).json({ error: "Email already in use" }); return; }
    const passwordHash = await bcrypt.hash(password, 12);
    const owner = await User.create({
      name, email, passwordHash, phone, role: "turf_owner",
      businessName: businessName || name,
      commissionRate: Math.min(100, Math.max(0, Number(commissionRate) || 20)),
      bankDetails: bankDetails || {},
      totalPayoutSent: 0,
    });
    res.status(201).json(userRes(owner));
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to create owner account" }); }
});

router.get("/admin/owners", authenticate, requireRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const owners = await User.find({ role: "turf_owner" }).lean();
    const ownerIds = (owners as any[]).map((o: any) => o._id);
    const [allTurfs, allBookings] = await Promise.all([
      Turf.find({ ownerId: { $in: ownerIds } }).lean(),
      Booking.find({ paymentStatus: "paid" }).lean(),
    ]);
    const turfsByOwner: Record<string, any[]> = {};
    const turfIdToOwner: Record<string, string> = {};
    for (const t of allTurfs as any[]) {
      const oid = t.ownerId?.toString();
      if (!turfsByOwner[oid]) turfsByOwner[oid] = [];
      turfsByOwner[oid].push(t);
      turfIdToOwner[t._id.toString()] = oid;
    }
    const bookingsByOwner: Record<string, any[]> = {};
    for (const b of allBookings as any[]) {
      const oid = turfIdToOwner[b.turfId?.toString()];
      if (!oid) continue;
      if (!bookingsByOwner[oid]) bookingsByOwner[oid] = [];
      bookingsByOwner[oid].push(b);
    }
    const result = (owners as any[]).map((owner: any) => {
      const oid = owner._id.toString();
      const turfs = turfsByOwner[oid] || [];
      const bookings = bookingsByOwner[oid] || [];
      const grossRevenue = bookings.reduce((s: number, b: any) => s + (b.totalPrice || 0), 0);
      const rate = owner.commissionRate ?? 20;
      const adminCommission = Math.round(grossRevenue * (rate / 100));
      const ownerEarnings = Math.round(grossRevenue * ((100 - rate) / 100));
      const payoutSent = owner.totalPayoutSent || 0;
      const pendingPayout = Math.max(0, ownerEarnings - payoutSent);
      return {
        ...userRes(owner),
        turfCount: turfs.length,
        activeTurfs: turfs.filter((t: any) => t.status === "approved").length,
        totalBookings: bookings.length,
        grossRevenue,
        adminCommission,
        ownerEarnings,
        payoutSent,
        pendingPayout,
        turfs: turfs.map((t: any) => ({
          id: t._id.toString(), name: t.name, area: t.area, status: t.status,
          pricePerHour: t.pricePerHour, rating: t.rating, reviewCount: t.reviewCount,
        })),
      };
    });
    res.json(result);
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to fetch owners" }); }
});

router.get("/admin/owners/:id", authenticate, requireRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const owner = await User.findById(req.params.id).lean() as any;
    if (!owner || owner.role !== "turf_owner") { res.status(404).json({ error: "Owner not found" }); return; }
    const turfs = await Turf.find({ ownerId: owner._id }).lean();
    const turfIds = (turfs as any[]).map((t: any) => t._id);
    const bookings = await Booking.find({ turfId: { $in: turfIds } }).sort({ createdAt: -1 }).lean();
    const paidBookings = (bookings as any[]).filter((b: any) => b.paymentStatus === "paid");
    const grossRevenue = paidBookings.reduce((s: number, b: any) => s + (b.totalPrice || 0), 0);
    const rate = owner.commissionRate ?? 20;
    const adminCommission = Math.round(grossRevenue * (rate / 100));
    const ownerEarnings = Math.round(grossRevenue * ((100 - rate) / 100));
    const payoutSent = owner.totalPayoutSent || 0;
    const pendingPayout = Math.max(0, ownerEarnings - payoutSent);
    const turfMap = Object.fromEntries((turfs as any[]).map((t: any) => [t._id.toString(), t]));
    res.json({
      ...userRes(owner),
      turfCount: turfs.length,
      activeTurfs: (turfs as any[]).filter((t: any) => t.status === "approved").length,
      totalBookings: bookings.length, grossRevenue, adminCommission, ownerEarnings, payoutSent, pendingPayout,
      turfs: (turfs as any[]).map((t: any) => ({ id: t._id.toString(), name: t.name, area: t.area, status: t.status, pricePerHour: t.pricePerHour, rating: t.rating, images: t.images || [] })),
      bookings: (bookings as any[]).slice(0, 20).map((b: any) => {
        const turf = turfMap[b.turfId?.toString()];
        const adminCut = Math.round((b.totalPrice || 0) * (rate / 100));
        const ownerCut = Math.round((b.totalPrice || 0) * ((100 - rate) / 100));
        return { id: b._id.toString(), turfName: turf?.name, date: b.date, startTime: b.startTime, endTime: b.endTime, totalPrice: b.totalPrice, adminCut, ownerCut, status: b.status, paymentStatus: b.paymentStatus, createdAt: b.createdAt?.toISOString() };
      }),
    });
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to fetch owner" }); }
});

router.put("/admin/owners/:id", authenticate, requireRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const { commissionRate, businessName, bankDetails, blocked } = req.body;
    const update: any = {};
    if (commissionRate !== undefined) update.commissionRate = Math.min(100, Math.max(0, Number(commissionRate)));
    if (businessName !== undefined) update.businessName = businessName;
    if (bankDetails !== undefined) update.bankDetails = bankDetails;
    if (blocked !== undefined) update.blocked = blocked;
    const owner = await User.findByIdAndUpdate(req.params.id, update, { new: true }).lean();
    if (!owner) { res.status(404).json({ error: "Owner not found" }); return; }
    res.json(userRes(owner));
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to update owner" }); }
});

router.post("/admin/owners/:id/payout", authenticate, requireRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const { amount } = req.body;
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      res.status(400).json({ error: "Valid payout amount is required" }); return;
    }
    const owner = await User.findByIdAndUpdate(
      req.params.id,
      { $inc: { totalPayoutSent: Number(amount) } },
      { new: true }
    ).lean();
    if (!owner) { res.status(404).json({ error: "Owner not found" }); return; }
    res.json(userRes(owner));
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to record payout" }); }
});

// ─── All Bookings (admin view) ────────────────────────────────────────────────

router.get("/admin/bookings", authenticate, requireRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const { status, turfId, page = "1", limit = "20" } = req.query as any;
    const filter: any = {};
    if (status) filter.status = status;
    if (turfId) filter.turfId = turfId;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [bookings, total] = await Promise.all([
      Booking.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      Booking.countDocuments(filter),
    ]);
    const turfIds = [...new Set((bookings as any[]).map((b: any) => b.turfId?.toString()))];
    const userIds = [...new Set((bookings as any[]).map((b: any) => b.userId?.toString()))];
    const [turfs, users] = await Promise.all([
      Turf.find({ _id: { $in: turfIds } }, "name area ownerId").lean(),
      User.find({ _id: { $in: userIds } }, "name email phone").lean(),
    ]);
    const ownerIds = [...new Set((turfs as any[]).map((t: any) => t.ownerId?.toString()))];
    const owners = await User.find({ _id: { $in: ownerIds } }, "name commissionRate").lean();
    const turfMap = Object.fromEntries((turfs as any[]).map((t: any) => [t._id.toString(), t]));
    const userMap = Object.fromEntries((users as any[]).map((u: any) => [u._id.toString(), u]));
    const ownerMap = Object.fromEntries((owners as any[]).map((o: any) => [o._id.toString(), o]));
    res.json({
      total, page: parseInt(page), limit: parseInt(limit),
      bookings: (bookings as any[]).map((b: any) => {
        const turf = turfMap[b.turfId?.toString()];
        const user = userMap[b.userId?.toString()];
        const owner = turf ? ownerMap[turf.ownerId?.toString()] : null;
        const rate = owner?.commissionRate ?? 20;
        return {
          id: b._id.toString(), turfId: b.turfId?.toString(), userId: b.userId?.toString(),
          turfName: turf?.name, turfArea: turf?.area,
          ownerName: owner?.name, commissionRate: rate,
          userName: user?.name, userPhone: user?.phone,
          date: b.date, startTime: b.startTime, endTime: b.endTime,
          totalPrice: b.totalPrice,
          adminCut: Math.round((b.totalPrice || 0) * (rate / 100)),
          ownerCut: Math.round((b.totalPrice || 0) * ((100 - rate) / 100)),
          status: b.status, paymentStatus: b.paymentStatus,
          paymentType: b.paymentType, createdAt: b.createdAt?.toISOString(),
        };
      }),
    });
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to fetch bookings" }); }
});

export default router;
