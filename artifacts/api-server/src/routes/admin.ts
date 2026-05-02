import { Router, Response } from "express";
import { User, Turf, Booking, Event, Order } from "@workspace/db";
import { authenticate, requireRole, AuthRequest } from "../middlewares/auth";

const router = Router();

function userRes(u: any) {
  return { id: u._id.toString(), name: u.name, email: u.email, role: u.role, phone: u.phone, avatar: u.avatar, blocked: u.blocked, createdAt: u.createdAt?.toISOString() };
}
function turfRes(t: any) {
  return { id: t._id.toString(), name: t.name, description: t.description, pricePerHour: t.pricePerHour, images: t.images || [], rating: t.rating, reviewCount: t.reviewCount, latitude: t.latitude, longitude: t.longitude, address: t.address, area: t.area, amenities: t.amenities || [], status: t.status, featured: t.featured, ownerId: t.ownerId?.toString(), createdAt: t.createdAt?.toISOString() };
}

router.get("/admin/stats", authenticate, requireRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const [users, bookings, turfs, events, orders] = await Promise.all([
      User.find().lean(), Booking.find().lean(), Turf.find().lean(), Event.find().lean(), Order.find().lean(),
    ]);
    const totalRevenue = (bookings as any[]).filter((b: any) => b.paymentStatus === "paid").reduce((s: number, b: any) => s + b.totalPrice, 0)
      + (orders as any[]).filter((o: any) => o.paymentStatus === "paid").reduce((s: number, o: any) => s + o.totalAmount, 0);
    const turfMap = Object.fromEntries((turfs as any[]).map((t: any) => [t._id.toString(), t]));
    const recentBookings = (bookings as any[]).slice(-5).reverse();
    res.json({
      totalUsers: users.length, totalBookings: bookings.length, totalRevenue,
      activeTurfs: (turfs as any[]).filter((t: any) => t.status === "approved").length,
      pendingTurfs: (turfs as any[]).filter((t: any) => t.status === "pending").length,
      totalEvents: events.length, totalOrders: orders.length,
      recentBookings: recentBookings.map((b: any) => ({
        id: b._id.toString(), turfId: b.turfId?.toString(), turfName: turfMap[b.turfId?.toString()]?.name,
        userId: b.userId?.toString(), slotId: b.slotId?.toString(),
        startTime: b.startTime, endTime: b.endTime, date: b.date,
        totalPrice: b.totalPrice, status: b.status, paymentStatus: b.paymentStatus,
        createdAt: b.createdAt?.toISOString(),
      })),
    });
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to fetch stats" }); }
});

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

router.get("/admin/revenue", authenticate, requireRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const { period } = req.query as { period?: string };
    const [bookings, orders] = await Promise.all([Booking.find({ paymentStatus: "paid" }).lean(), Order.find({ paymentStatus: "paid" }).lean()]);
    const bookingRevenue = (bookings as any[]).reduce((s: number, b: any) => s + b.totalPrice, 0);
    const shopRevenue = (orders as any[]).reduce((s: number, o: any) => s + o.totalAmount, 0);
    const labels = period === "year"
      ? ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
      : period === "month"
      ? Array.from({ length: 30 }, (_, i) => `Day ${i + 1}`)
      : ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
    const chartData = labels.map((label) => ({ label, bookings: Math.floor(Math.random() * 15) + 2, revenue: Math.floor(Math.random() * 5000) + 500 }));
    res.json({ bookingRevenue, shopRevenue, chartData });
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to fetch revenue" }); }
});

export default router;
