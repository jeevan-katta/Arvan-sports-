import { Router, Response } from "express";
import bcrypt from "bcryptjs";
import { User, Turf, Booking, Event, Order, Product, Notification } from "@workspace/db";
import { authenticate, requireRole, AuthRequest } from "../middlewares/auth";

const router = Router();

function userRes(u: any) {
  return {
    id: u._id.toString(), name: u.name, email: u.email, role: u.role,
    phone: u.phone, avatar: u.avatar, blocked: u.blocked || false,
    businessName: u.businessName,
    commissionRate: u.commissionRate ?? 20,
    commissionHeld: u.commissionHeld || false,
    payoutSchedule: u.payoutSchedule || "manual",
    bankDetails: u.bankDetails || {},
    razorpayContactId: u.razorpayContactId,
    totalPayoutSent: u.totalPayoutSent || 0,
    payoutHistory: (u.payoutHistory || []).map((p: any) => ({
      id: p._id?.toString(), amount: p.amount,
      date: p.date instanceof Date ? p.date.toISOString() : p.date,
      note: p.note, method: p.method || "bank_transfer",
      razorpayPayoutId: p.razorpayPayoutId,
      razorpayStatus: p.razorpayStatus,
      razorpayMode: p.razorpayMode,
    })),
    createdAt: u.createdAt?.toISOString(),
  };
}

function turfRes(t: any, ownerName?: string) {
  return {
    id: t._id.toString(), name: t.name, description: t.description,
    pricePerHour: t.pricePerHour, images: t.images || [], rating: t.rating,
    reviewCount: t.reviewCount, address: t.address, area: t.area,
    amenities: t.amenities || [], status: t.status, featured: t.featured,
    ownerId: t.ownerId?.toString(), ownerName: ownerName || "",
    createdAt: t.createdAt?.toISOString(),
  };
}

// ── Dashboard Stats ────────────────────────────────────────────────────────────
router.get("/admin/stats", authenticate, requireRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const [users, bookings, turfs, events, orders, products] = await Promise.all([
      User.find().lean(), Booking.find().lean(), Turf.find().lean(),
      Event.find().lean(), Order.find().lean(), Product.find().lean(),
    ]);

    const paidBookings = (bookings as any[]).filter((b: any) => b.paymentStatus === "paid");
    const paidOrders = (orders as any[]).filter((o: any) => o.paymentStatus === "paid");
    const totalBookingRevenue = paidBookings.reduce((s: number, b: any) => s + (b.totalPrice || 0), 0);
    const totalShopRevenue = paidOrders.reduce((s: number, o: any) => s + (o.totalAmount || 0), 0);
    const totalRevenue = totalBookingRevenue + totalShopRevenue;

    const owners = (users as any[]).filter((u: any) => u.role === "turf_owner");
    const regularUsers = (users as any[]).filter((u: any) => u.role === "user");
    const turfMap = Object.fromEntries((turfs as any[]).map((t: any) => [t._id.toString(), t]));
    const ownerMap = Object.fromEntries((users as any[]).map((u: any) => [u._id.toString(), u]));

    let totalAdminCommission = 0, totalOwnerEarnings = 0;
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

    // Booking status breakdown
    const confirmedBookings = (bookings as any[]).filter((b: any) => b.status === "confirmed").length;
    const pendingBookings = (bookings as any[]).filter((b: any) => b.status === "pending").length;
    const cancelledBookings = (bookings as any[]).filter((b: any) => b.status === "cancelled").length;

    // This month stats
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const newUsersThisMonth = (users as any[]).filter((u: any) => u.createdAt && new Date(u.createdAt) >= startOfMonth).length;
    const newBookingsThisMonth = (bookings as any[]).filter((b: any) => b.createdAt && new Date(b.createdAt) >= startOfMonth).length;

    // Top owners by revenue
    const ownerRevenue: Record<string, number> = {};
    for (const b of paidBookings) {
      const turf = turfMap[b.turfId?.toString()];
      if (!turf) continue;
      const oid = turf.ownerId?.toString();
      if (oid) ownerRevenue[oid] = (ownerRevenue[oid] || 0) + (b.totalPrice || 0);
    }
    const topOwners = Object.entries(ownerRevenue)
      .sort(([, a], [, b]) => b - a).slice(0, 5)
      .map(([id, revenue]) => {
        const o = ownerMap[id];
        return { id, name: o?.name, businessName: o?.businessName, revenue };
      });

    // Recent bookings
    const recentBookings = (bookings as any[]).slice(-8).reverse().map((b: any) => {
      const turf = turfMap[b.turfId?.toString()];
      const owner = ownerMap[turf?.ownerId?.toString()];
      const rate = owner?.commissionRate ?? 20;
      return {
        id: b._id.toString(), turfName: turf?.name, ownerName: owner?.name,
        date: b.date, startTime: b.startTime, endTime: b.endTime,
        totalPrice: b.totalPrice, status: b.status, paymentStatus: b.paymentStatus,
        adminCut: Math.round((b.totalPrice || 0) * (rate / 100)),
        ownerCut: Math.round((b.totalPrice || 0) * ((100 - rate) / 100)),
        commissionRate: rate, createdAt: b.createdAt?.toISOString(),
      };
    });

    res.json({
      totalUsers: regularUsers.length, totalOwners: owners.length,
      totalBookings: bookings.length, totalRevenue, totalBookingRevenue, totalShopRevenue,
      totalAdminCommission: Math.round(totalAdminCommission),
      totalOwnerEarnings: Math.round(totalOwnerEarnings),
      totalPayoutSent: Math.round(totalPayoutSent),
      pendingPayouts: Math.round(pendingPayouts),
      activeTurfs: (turfs as any[]).filter((t: any) => t.status === "approved").length,
      pendingTurfs: (turfs as any[]).filter((t: any) => t.status === "pending").length,
      totalTurfs: turfs.length,
      totalEvents: events.length, totalOrders: orders.length,
      totalProducts: products.length,
      confirmedBookings, pendingBookings, cancelledBookings,
      newUsersThisMonth, newBookingsThisMonth,
      blockedOwners: owners.filter((o: any) => o.blocked).length,
      heldCommissionOwners: owners.filter((o: any) => o.commissionHeld).length,
      topOwners, recentBookings,
    });
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to fetch stats" }); }
});

// ── Revenue Chart ──────────────────────────────────────────────────────────────
router.get("/admin/revenue", authenticate, requireRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const { period } = req.query as { period?: string };
    const [bookings, orders] = await Promise.all([
      Booking.find({ paymentStatus: "paid" }).lean(),
      Order.find({ paymentStatus: "paid" }).lean(),
    ]);

    const now = new Date();
    let labels: string[];
    let getKey: (d: Date) => string;

    if (period === "year") {
      labels = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      getKey = (d) => labels[d.getMonth()];
    } else if (period === "week") {
      labels = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
      getKey = (d) => labels[(d.getDay() + 6) % 7];
    } else {
      labels = Array.from({ length: 30 }, (_, i) => String(i + 1));
      getKey = (d) => String(d.getDate());
    }

    const revenueByLabel: Record<string, number> = {};
    const commissionByLabel: Record<string, number> = {};
    const ownerByLabel: Record<string, number> = {};
    labels.forEach(l => { revenueByLabel[l] = 0; commissionByLabel[l] = 0; ownerByLabel[l] = 0; });

    for (const b of bookings as any[]) {
      const d = b.createdAt ? new Date(b.createdAt) : null;
      if (!d) continue;
      const key = getKey(d);
      if (!(key in revenueByLabel)) continue;
      const amt = b.totalPrice || 0;
      revenueByLabel[key] += amt;
      commissionByLabel[key] += amt * 0.2;
      ownerByLabel[key] += amt * 0.8;
    }

    const shopByLabel: Record<string, number> = {};
    labels.forEach(l => { shopByLabel[l] = 0; });
    for (const o of orders as any[]) {
      const d = o.createdAt ? new Date(o.createdAt) : null;
      if (!d) continue;
      const key = getKey(d);
      if (!(key in shopByLabel)) continue;
      shopByLabel[key] += o.totalAmount || 0;
    }

    const chartData = labels.map((label) => ({
      label,
      revenue: Math.round(revenueByLabel[label]),
      commission: Math.round(commissionByLabel[label]),
      ownerPayout: Math.round(ownerByLabel[label]),
      shop: Math.round(shopByLabel[label]),
    }));

    const bookingRevenue = (bookings as any[]).reduce((s: number, b: any) => s + (b.totalPrice || 0), 0);
    const shopRevenue = (orders as any[]).reduce((s: number, o: any) => s + (o.totalAmount || 0), 0);
    res.json({ bookingRevenue, shopRevenue, chartData });
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to fetch revenue" }); }
});

// ── Users ──────────────────────────────────────────────────────────────────────
router.get("/admin/users", authenticate, requireRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const users = await User.find().lean();
    const allBookings = await Booking.find().lean();
    const allOrders = await Order.find().lean();

    const bookingsByUser: Record<string, number> = {};
    const spendingByUser: Record<string, number> = {};
    for (const b of allBookings as any[]) {
      const uid = b.userId?.toString();
      if (uid) {
        bookingsByUser[uid] = (bookingsByUser[uid] || 0) + 1;
        if (b.paymentStatus === "paid") spendingByUser[uid] = (spendingByUser[uid] || 0) + (b.totalPrice || 0);
      }
    }
    for (const o of allOrders as any[]) {
      const uid = o.userId?.toString();
      if (uid && o.paymentStatus === "paid") spendingByUser[uid] = (spendingByUser[uid] || 0) + (o.totalAmount || 0);
    }

    res.json((users as any[]).map((u: any) => ({
      ...userRes(u),
      totalBookings: bookingsByUser[u._id.toString()] || 0,
      totalSpending: Math.round(spendingByUser[u._id.toString()] || 0),
    })));
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

router.delete("/admin/users/:id", authenticate, requireRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.params.id).lean() as any;
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    if (user.role === "admin") { res.status(400).json({ error: "Cannot delete admin accounts" }); return; }
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to delete user" }); }
});

// ── Turf Management ────────────────────────────────────────────────────────────
router.put("/admin/turfs/:id/approve", authenticate, requireRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const turf = await Turf.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true }).lean();
    if (!turf) { res.status(404).json({ error: "Turf not found" }); return; }
    res.json(turfRes(turf));
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to approve turf" }); }
});

router.delete("/admin/turfs/:id", authenticate, requireRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    await Turf.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to delete turf" }); }
});

// ── Owner Management ───────────────────────────────────────────────────────────
router.post("/admin/owners", authenticate, requireRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, password, phone, businessName, commissionRate, payoutSchedule, bankDetails } = req.body;
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
      commissionHeld: false,
      payoutSchedule: payoutSchedule || "manual",
      bankDetails: bankDetails || {},
      totalPayoutSent: 0,
      payoutHistory: [],
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
      Booking.find({ paymentStatus: { $in: ["paid", "cash_collected"] } }).lean(),
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
      const cashCollected = bookings.filter((b: any) => b.paymentStatus === "cash_collected").reduce((s: number, b: any) => s + Math.max(0, (b.totalPrice || 0) - (b.paidAmount || 0)), 0);
      const onlineCollected = bookings.filter((b: any) => b.paymentStatus === "paid").reduce((s: number, b: any) => s + (b.paidAmount || 0), 0);
      const payoutSent = owner.totalPayoutSent || 0;
      const pendingPayout = Math.max(0, ownerEarnings - cashCollected - payoutSent);
      return {
        ...userRes(owner),
        turfCount: turfs.length,
        activeTurfs: turfs.filter((t: any) => t.status === "approved").length,
        totalBookings: bookings.length,
        grossRevenue, adminCommission, ownerEarnings, payoutSent, pendingPayout, cashCollected, onlineCollected,
        turfs: turfs.map((t: any) => ({
          id: t._id.toString(), name: t.name, area: t.area, status: t.status,
          pricePerHour: t.pricePerHour, rating: t.rating, reviewCount: t.reviewCount,
        })),
      };
    });
    res.json(result);
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to fetch owners" }); }
});

router.put("/admin/owners/:id", authenticate, requireRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const { commissionRate, businessName, bankDetails, blocked, payoutSchedule, phone } = req.body;
    const update: any = {};
    if (commissionRate !== undefined) update.commissionRate = Math.min(100, Math.max(0, Number(commissionRate)));
    if (businessName !== undefined) update.businessName = businessName;
    if (bankDetails !== undefined) update.bankDetails = bankDetails;
    if (blocked !== undefined) update.blocked = blocked;
    if (payoutSchedule !== undefined) update.payoutSchedule = payoutSchedule;
    if (phone !== undefined) update.phone = phone;
    const owner = await User.findByIdAndUpdate(req.params.id, update, { new: true }).lean();
    if (!owner) { res.status(404).json({ error: "Owner not found" }); return; }
    res.json(userRes(owner));
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to update owner" }); }
});

router.post("/admin/owners/:id/hold", authenticate, requireRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const owner = await User.findById(req.params.id).lean() as any;
    if (!owner) { res.status(404).json({ error: "Owner not found" }); return; }
    const newHeld = !owner.commissionHeld;
    const updated = await User.findByIdAndUpdate(req.params.id, { commissionHeld: newHeld }, { new: true }).lean();
    // Send notification to owner
    await Notification.create({
      userId: req.params.id,
      type: newHeld ? "account_held" : "account_released",
      title: newHeld ? "Payouts Put On Hold" : "Payouts Released",
      message: newHeld
        ? "Your payouts have been put on hold by admin. Please contact support for details."
        : "Your payouts have been released. Payments will resume on your regular schedule.",
    });
    res.json({ ...userRes(updated!), commissionHeld: newHeld });
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to toggle hold" }); }
});

router.post("/admin/owners/:id/payout", authenticate, requireRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const { amount, note, method } = req.body;
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      res.status(400).json({ error: "Valid payout amount is required" }); return;
    }
    const owner = await User.findById(req.params.id).lean() as any;
    if (!owner) { res.status(404).json({ error: "Owner not found" }); return; }
    if (owner.commissionHeld) { res.status(400).json({ error: "Commission is on hold for this owner" }); return; }

    const amt = Number(amount);
    let razorpayPayoutId: string | undefined;
    let razorpayStatus: string | undefined;
    let razorpayMode: string | undefined;
    let rzpError: string | undefined;

    const useRazorpay = (method === "bank_transfer" || method === "upi") &&
      (owner.bankDetails?.accountNumber || owner.bankDetails?.upiId);

    if (useRazorpay) {
      const { sendPayout, isRazorpayXConfigured } = await import("../lib/razorpay-payout");
      if (isRazorpayXConfigured()) {
        const result = await sendPayout(
          { id: req.params.id as string, name: owner.name, email: owner.email, phone: owner.phone, razorpayContactId: owner.razorpayContactId, bankDetails: owner.bankDetails },
          amt,
          note || `Admin payout`,
          `admin_${req.params.id}_${Date.now()}`,
        );
        if (result.success) {
          razorpayPayoutId = result.payoutId;
          razorpayStatus = result.status;
          razorpayMode = result.mode;
        } else {
          rzpError = result.error;
        }
      }
    }

    const payoutRecord: any = {
      amount: amt, date: new Date(), note: note || "",
      method: method || "bank_transfer",
      ...(razorpayPayoutId && { razorpayPayoutId, razorpayStatus, razorpayMode }),
    };

    const updated = await User.findByIdAndUpdate(
      req.params.id,
      { $inc: { totalPayoutSent: amt }, $push: { payoutHistory: payoutRecord } },
      { new: true }
    ).lean();

    const methodLabel: Record<string, string> = { bank_transfer: "Bank Transfer", upi: "UPI", cash: "Cash", cheque: "Cheque" };
    await Notification.create({
      userId: req.params.id,
      type: "payout_received",
      title: razorpayPayoutId ? "Payout Sent via Razorpay" : "Payout Recorded",
      message: `₹${amt.toLocaleString("en-IN")} ${razorpayPayoutId ? "has been transferred to your account via Razorpay" : `has been recorded via ${methodLabel[method] || "Bank Transfer"}`}.${note ? ` Note: ${note}` : ""}`,
      amount: amt,
    });

    res.json({ ...userRes(updated!), razorpayPayoutId, razorpayStatus, rzpError });
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to record payout" }); }
});

router.delete("/admin/owners/:id", authenticate, requireRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const owner = await User.findById(req.params.id).lean() as any;
    if (!owner || owner.role !== "turf_owner") { res.status(404).json({ error: "Owner not found" }); return; }
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to delete owner" }); }
});

// ── Batch payout trigger ──────────────────────────────────────────────────────

router.post("/admin/payouts/run-batch", authenticate, requireRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const { runDailyPayouts } = await import("../lib/auto-payout");
    const result = await runDailyPayouts();
    res.json({ success: true, ...result });
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Batch payout failed" }); }
});

router.get("/admin/payouts/razorpay-status", authenticate, requireRole("admin"), async (_req: AuthRequest, res: Response) => {
  const { isRazorpayXConfigured } = await import("../lib/razorpay-payout");
  res.json({ configured: isRazorpayXConfigured() });
});

router.post("/admin/payouts/bulk", authenticate, requireRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const { ownerIds, note, method } = req.body as { ownerIds: string[]; note?: string; method?: string };
    if (!Array.isArray(ownerIds) || ownerIds.length === 0) {
      res.status(400).json({ error: "ownerIds array required" }); return;
    }
    const { sendPayout, isRazorpayXConfigured } = await import("../lib/razorpay-payout");
    const rzpEnabled = isRazorpayXConfigured();

    const owners = await User.find({ _id: { $in: ownerIds }, role: "turf_owner", commissionHeld: { $ne: true } }).lean() as any[];
    const ownerIdSet = new Set(owners.map((o: any) => o._id.toString()));
    const [allTurfs, allBookings] = await Promise.all([
      Turf.find({ ownerId: { $in: Array.from(ownerIdSet) } }).lean(),
      Booking.find({ paymentStatus: { $in: ["paid", "cash_collected"] } }).lean(),
    ]);
    const turfIdToOwner: Record<string, string> = {};
    const turfsByOwner: Record<string, any[]> = {};
    for (const t of allTurfs as any[]) {
      const oid = t.ownerId?.toString();
      turfIdToOwner[t._id.toString()] = oid;
      if (!turfsByOwner[oid]) turfsByOwner[oid] = [];
      turfsByOwner[oid].push(t);
    }
    const bookingsByOwner: Record<string, any[]> = {};
    for (const b of allBookings as any[]) {
      const oid = turfIdToOwner[b.turfId?.toString()];
      if (oid && ownerIdSet.has(oid)) {
        if (!bookingsByOwner[oid]) bookingsByOwner[oid] = [];
        bookingsByOwner[oid].push(b);
      }
    }

    const results: any[] = [];
    for (const owner of owners) {
      const oid = owner._id.toString();
      const bookings = bookingsByOwner[oid] || [];
      const rate = owner.commissionRate ?? 20;
      const grossRevenue = bookings.reduce((s: number, b: any) => s + (b.totalPrice || 0), 0);
      const ownerEarnings = Math.round(grossRevenue * ((100 - rate) / 100));
      const cashCollected = bookings.filter((b: any) => b.paymentStatus === "cash_collected").reduce((s: number, b: any) => s + Math.max(0, (b.totalPrice || 0) - (b.paidAmount || 0)), 0);
      const payoutSent = owner.totalPayoutSent || 0;
      const pending = Math.max(0, ownerEarnings - cashCollected - payoutSent);
      if (pending < 1) { results.push({ id: oid, name: owner.name, skipped: true, reason: "No pending amount" }); continue; }

      let razorpayPayoutId: string | undefined;
      let razorpayStatus: string | undefined;
      let razorpayMode: string | undefined;
      const useRzp = rzpEnabled && (method === "bank_transfer" || method === "upi" || !method) && (owner.bankDetails?.accountNumber || owner.bankDetails?.upiId);
      if (useRzp) {
        const result = await sendPayout({ id: oid, name: owner.name, email: owner.email, phone: owner.phone, razorpayContactId: owner.razorpayContactId, bankDetails: owner.bankDetails }, pending, note || `Bulk payout`, `bulk_${oid}_${Date.now()}`);
        if (result.success) { razorpayPayoutId = result.payoutId; razorpayStatus = result.status; razorpayMode = result.mode; }
      }
      const payoutRecord: any = { amount: pending, date: new Date(), note: note || "Bulk payout", method: method || "bank_transfer", ...(razorpayPayoutId && { razorpayPayoutId, razorpayStatus, razorpayMode }) };
      await User.findByIdAndUpdate(oid, { $inc: { totalPayoutSent: pending }, $push: { payoutHistory: payoutRecord } });
      await Notification.create({ userId: oid, type: "payout_received", title: razorpayPayoutId ? "Payout Sent via Razorpay" : "Payout Processed", message: `₹${pending.toLocaleString("en-IN")} has been ${razorpayPayoutId ? "transferred to your account" : "recorded for transfer"}.`, amount: pending });
      results.push({ id: oid, name: owner.name, amount: pending, razorpayPayoutId, razorpayStatus, success: true });
    }
    res.json({ results, processed: results.filter(r => r.success).length, skipped: results.filter(r => r.skipped).length });
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Bulk payout failed" }); }
});

router.get("/admin/payouts/export", authenticate, requireRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const owners = await User.find({ role: "turf_owner" }).lean() as any[];
    const ownerIds = owners.map((o: any) => o._id);
    const [allTurfs, allBookings] = await Promise.all([
      Turf.find({ ownerId: { $in: ownerIds } }).lean(),
      Booking.find({ paymentStatus: { $in: ["paid", "cash_collected"] } }).lean(),
    ]);
    const turfIdToOwner: Record<string, string> = {};
    for (const t of allTurfs as any[]) turfIdToOwner[t._id.toString()] = t.ownerId?.toString();
    const bookingsByOwner: Record<string, any[]> = {};
    for (const b of allBookings as any[]) {
      const oid = turfIdToOwner[b.turfId?.toString()];
      if (oid) { if (!bookingsByOwner[oid]) bookingsByOwner[oid] = []; bookingsByOwner[oid].push(b); }
    }
    const rows = [["Name", "Email", "Business", "Commission %", "Gross Revenue", "Admin Commission", "Owner Earnings", "Cash at Venue", "Bank Paid Out", "Pending Transfer", "Schedule", "Bank/UPI"].join(",")];
    for (const o of owners) {
      const oid = o._id.toString();
      const bookings = bookingsByOwner[oid] || [];
      const rate = o.commissionRate ?? 20;
      const gross = bookings.reduce((s: number, b: any) => s + (b.totalPrice || 0), 0);
      const adminCut = Math.round(gross * rate / 100);
      const ownerEarn = Math.round(gross * (100 - rate) / 100);
      const cashCollectedExport = bookings.filter((b: any) => b.paymentStatus === "cash_collected").reduce((s: number, b: any) => s + Math.max(0, (b.totalPrice || 0) - (b.paidAmount || 0)), 0);
      const paid = o.totalPayoutSent || 0;
      const pending = Math.max(0, ownerEarn - cashCollectedExport - paid);
      const bankInfo = o.bankDetails?.upiId || (o.bankDetails?.accountNumber ? `●●●●${o.bankDetails.accountNumber.slice(-4)}` : "—");
      rows.push([o.name, o.email, o.businessName || "", rate, gross, adminCut, ownerEarn, cashCollectedExport, paid, pending, o.payoutSchedule || "manual", bankInfo].join(","));
    }
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="payouts_${Date.now()}.csv"`);
    res.send(rows.join("\n"));
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Export failed" }); }
});

// ── Turfs ───────────────────────────────────────────────────────────────────────

router.get("/admin/turfs", authenticate, requireRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.query as any;
    const filter: any = {};
    if (status && status !== "all") filter.status = status;
    const turfs = await Turf.find(filter).sort({ createdAt: -1 }).lean();
    const ownerIds = [...new Set((turfs as any[]).map((t: any) => t.ownerId?.toString()).filter(Boolean))];
    const owners = await User.find({ _id: { $in: ownerIds } }, "name email phone businessName").lean();
    const ownerMap = Object.fromEntries(owners.map((o: any) => [o._id.toString(), o]));
    res.json(turfs.map((t: any) => {
      const owner = ownerMap[t.ownerId?.toString()] || {};
      return {
        ...turfRes(t, (owner as any).name),
        ownerEmail: (owner as any).email,
        ownerPhone: (owner as any).phone,
        ownerBusiness: (owner as any).businessName,
      };
    }));
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to fetch turfs" }); }
});

router.patch("/admin/turfs/:id/status", authenticate, requireRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const { status, reason } = req.body;
    if (!["approved", "rejected", "pending"].includes(status)) {
      res.status(400).json({ error: "Invalid status. Use: approved, rejected, pending" }); return;
    }
    const turf = await Turf.findById(req.params.id).lean() as any;
    if (!turf) { res.status(404).json({ error: "Turf not found" }); return; }

    const updated = await Turf.findByIdAndUpdate(req.params.id, { status }, { new: true }).lean() as any;

    // Notify the owner
    if (turf.ownerId) {
      if (status === "approved") {
        await Notification.create({
          userId: turf.ownerId,
          type: "turf_approved",
          title: "Turf Approved!",
          message: `Your turf "${turf.name}" has been approved and is now live on the platform. Customers can start booking it.`,
        });
      } else if (status === "rejected") {
        await Notification.create({
          userId: turf.ownerId,
          type: "turf_rejected",
          title: "Turf Not Approved",
          message: `Your turf "${turf.name}" was not approved.${reason ? ` Reason: ${reason}` : " Please contact admin for more details."}`,
        });
      }
    }

    res.json(turfRes(updated));
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to update turf status" }); }
});

// ── All Bookings ───────────────────────────────────────────────────────────────
router.get("/admin/bookings", authenticate, requireRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const { status, page = "1", limit = "30" } = req.query as any;
    const filter: any = {};
    if (status && status !== "all") filter.status = status;
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

// ── Shop Stats ─────────────────────────────────────────────────────────────────
router.get("/admin/shop/stats", authenticate, requireRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const [products, orders] = await Promise.all([
      Product.find().lean(),
      Order.find().lean(),
    ]);
    const paidOrders = (orders as any[]).filter((o: any) => o.paymentStatus === "paid");
    const totalRevenue = paidOrders.reduce((s: number, o: any) => s + (o.totalAmount || 0), 0);

    // Revenue by category
    const categoryRevenue: Record<string, number> = {};
    const categorySales: Record<string, number> = {};
    for (const o of paidOrders) {
      for (const item of (o as any).items || []) {
        const cat = item.category || "Other";
        categoryRevenue[cat] = (categoryRevenue[cat] || 0) + (item.price * item.quantity);
        categorySales[cat] = (categorySales[cat] || 0) + item.quantity;
      }
    }

    // Order status breakdown
    const statusBreakdown: Record<string, number> = {};
    for (const o of orders as any[]) {
      statusBreakdown[o.status] = (statusBreakdown[o.status] || 0) + 1;
    }

    // Top products by sales
    const productSales: Record<string, { name: string; qty: number; revenue: number }> = {};
    for (const o of paidOrders) {
      for (const item of (o as any).items || []) {
        const pid = item.productId?.toString() || item.name;
        if (!productSales[pid]) productSales[pid] = { name: item.name, qty: 0, revenue: 0 };
        productSales[pid].qty += item.quantity;
        productSales[pid].revenue += item.price * item.quantity;
      }
    }
    const topProducts = Object.values(productSales).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    // Low stock products
    const lowStockProducts = (products as any[]).filter((p: any) => (p.stock || 0) <= 5)
      .map((p: any) => ({ id: p._id.toString(), name: p.name, stock: p.stock, category: p.category }));

    res.json({
      totalProducts: products.length, totalOrders: orders.length,
      totalRevenue: Math.round(totalRevenue),
      pendingOrders: (orders as any[]).filter((o: any) => o.status === "pending").length,
      completedOrders: (orders as any[]).filter((o: any) => o.status === "delivered").length,
      categoryRevenue, categorySales, statusBreakdown,
      topProducts, lowStockProducts,
    });
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to fetch shop stats" }); }
});

// ── Feature Toggles ────────────────────────────────────────────────────────────

router.put("/admin/turfs/:id/feature", authenticate, requireRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const turf = await Turf.findById(req.params.id).lean() as any;
    if (!turf) { res.status(404).json({ error: "Turf not found" }); return; }
    const updated = await Turf.findByIdAndUpdate(req.params.id, { featured: !turf.featured }, { new: true }).lean() as any;
    res.json({ id: updated._id.toString(), featured: updated.featured });
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to toggle feature" }); }
});

router.put("/admin/events/:id/feature", authenticate, requireRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const ev = await Event.findById(req.params.id).lean() as any;
    if (!ev) { res.status(404).json({ error: "Event not found" }); return; }
    const updated = await Event.findByIdAndUpdate(req.params.id, { featured: !ev.featured }, { new: true }).lean() as any;
    res.json({ id: updated._id.toString(), featured: updated.featured });
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to toggle feature" }); }
});

// ── All Events (admin view) ────────────────────────────────────────────────────

router.get("/admin/events-all", authenticate, requireRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const events = await Event.find().sort({ createdAt: -1 }).lean();
    res.json(events.map((e: any) => ({
      id: e._id.toString(), title: e.title, date: e.date, time: e.time,
      venue: e.venue, area: e.area, prize: e.prize, entryFee: e.entryFee,
      maxParticipants: e.maxParticipants, currentParticipants: e.currentParticipants,
      featured: e.featured, status: e.status, type: e.type || "event",
      createdByRole: e.createdByRole || "admin", createdByName: e.createdByName || "",
      turfName: e.turfName, createdAt: e.createdAt?.toISOString(),
    })));
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to fetch events" }); }
});

// ── All Announcements (admin view) ────────────────────────────────────────────

router.get("/admin/announcements", authenticate, requireRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const { Announcement } = await import("@workspace/db");
    const list = await Announcement.find().sort({ pinned: -1, createdAt: -1 }).lean();
    res.json(list.map((a: any) => ({
      id: a._id.toString(), title: a.title, message: a.message,
      type: a.type, createdByRole: a.createdByRole, createdByName: a.createdByName,
      turfName: a.turfName, pinned: a.pinned, createdAt: a.createdAt?.toISOString(),
    })));
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to fetch announcements" }); }
});

export default router;
