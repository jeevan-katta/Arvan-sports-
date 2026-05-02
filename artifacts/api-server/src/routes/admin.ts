import { Router, Response } from "express";
import { db, usersTable, turfsTable, bookingsTable, eventsTable, ordersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { authenticate, requireRole, AuthRequest } from "../middlewares/auth";
import { BlockUserBody, UpdateUserRoleBody, ApproveTurfBody, FeatureTurfBody } from "@workspace/api-zod";

const router = Router();

function userResponse(user: any) {
  return {
    id: user.id, name: user.name, email: user.email, role: user.role,
    phone: user.phone, avatar: user.avatar, blocked: user.blocked,
    createdAt: user.createdAt?.toISOString(),
  };
}

function turfResponse(turf: any) {
  return {
    id: turf.id, name: turf.name, description: turf.description,
    pricePerHour: turf.pricePerHour, images: turf.images || [],
    rating: turf.rating, reviewCount: turf.reviewCount,
    latitude: turf.latitude, longitude: turf.longitude,
    address: turf.address, area: turf.area, amenities: turf.amenities || [],
    status: turf.status, featured: turf.featured, ownerId: turf.ownerId,
    createdAt: turf.createdAt?.toISOString(),
  };
}

router.get("/admin/stats", authenticate, requireRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const [users, bookings, turfs, events, orders] = await Promise.all([
      db.select().from(usersTable),
      db.select().from(bookingsTable),
      db.select().from(turfsTable),
      db.select().from(eventsTable),
      db.select().from(ordersTable),
    ]);
    const totalRevenue = bookings
      .filter(b => b.paymentStatus === "paid")
      .reduce((s, b) => s + b.totalPrice, 0)
      + orders.filter(o => o.paymentStatus === "paid").reduce((s, o) => s + o.totalAmount, 0);
    
    const recentBookings = bookings.slice(-5).reverse();
    const bookingMap: Record<number, any> = {};
    const allTurfs = await db.select().from(turfsTable);
    allTurfs.forEach(t => { bookingMap[t.id] = t; });

    res.json({
      totalUsers: users.length,
      totalBookings: bookings.length,
      totalRevenue,
      activeTurfs: turfs.filter(t => t.status === "approved").length,
      pendingTurfs: turfs.filter(t => t.status === "pending").length,
      totalEvents: events.length,
      totalOrders: orders.length,
      recentBookings: recentBookings.map(b => ({
        id: b.id, turfId: b.turfId, turfName: bookingMap[b.turfId]?.name,
        userId: b.userId, slotId: b.slotId, startTime: b.startTime, endTime: b.endTime,
        date: b.date, totalPrice: b.totalPrice, status: b.status, paymentStatus: b.paymentStatus,
        createdAt: b.createdAt?.toISOString(),
      })),
    });
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

router.get("/admin/users", authenticate, requireRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const users = await db.select().from(usersTable);
    res.json(users.map(userResponse));
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

router.put("/admin/users/:id/block", authenticate, requireRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const parsed = BlockUserBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input" });
      return;
    }
    const [user] = await db.update(usersTable).set({ blocked: parsed.data.blocked }).where(eq(usersTable.id, parseInt(req.params.id))).returning();
    res.json(userResponse(user));
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Failed to update user" });
  }
});

router.put("/admin/users/:id/role", authenticate, requireRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const parsed = UpdateUserRoleBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input" });
      return;
    }
    const [user] = await db.update(usersTable).set({ role: parsed.data.role }).where(eq(usersTable.id, parseInt(req.params.id))).returning();
    res.json(userResponse(user));
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Failed to update role" });
  }
});

router.put("/admin/turfs/:id/approve", authenticate, requireRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const parsed = ApproveTurfBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input" });
      return;
    }
    const [turf] = await db.update(turfsTable).set({ status: parsed.data.status }).where(eq(turfsTable.id, parseInt(req.params.id))).returning();
    res.json(turfResponse(turf));
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Failed to approve turf" });
  }
});

router.put("/admin/turfs/:id/feature", authenticate, requireRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const parsed = FeatureTurfBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input" });
      return;
    }
    const [turf] = await db.update(turfsTable).set({ featured: parsed.data.featured }).where(eq(turfsTable.id, parseInt(req.params.id))).returning();
    res.json(turfResponse(turf));
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Failed to feature turf" });
  }
});

router.get("/admin/revenue", authenticate, requireRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const { period } = req.query as { period?: string };
    const bookings = await db.select().from(bookingsTable);
    const orders = await db.select().from(ordersTable);
    
    const bookingRevenue = bookings.filter(b => b.paymentStatus === "paid").reduce((s, b) => s + b.totalPrice, 0);
    const shopRevenue = orders.filter(o => o.paymentStatus === "paid").reduce((s, o) => s + o.totalAmount, 0);
    
    const labels = period === "year"
      ? ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
      : period === "month"
      ? Array.from({ length: 30 }, (_, i) => `Day ${i + 1}`)
      : ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
    
    const chartData = labels.map((label, i) => ({
      label,
      bookings: Math.floor(Math.random() * 15) + 2,
      revenue: Math.floor(Math.random() * 5000) + 500,
    }));
    res.json({ bookingRevenue, shopRevenue, chartData });
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Failed to fetch revenue" });
  }
});

export default router;
