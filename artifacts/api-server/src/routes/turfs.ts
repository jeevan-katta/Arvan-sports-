import { Router, Request, Response } from "express";
import { db, turfsTable, timeSlotsTable, reviewsTable, usersTable } from "@workspace/db";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { authenticate, requireRole, AuthRequest } from "../middlewares/auth";
import { CreateTurfBody, CreateTurfSlotBody, ReviewTurfBody } from "@workspace/api-zod";

const router = Router();

function distance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function turfResponse(turf: any, owner?: any, distanceKm?: number) {
  return {
    id: turf.id,
    name: turf.name,
    description: turf.description,
    pricePerHour: turf.pricePerHour,
    images: turf.images || [],
    rating: turf.rating,
    reviewCount: turf.reviewCount,
    latitude: turf.latitude,
    longitude: turf.longitude,
    address: turf.address,
    area: turf.area,
    amenities: turf.amenities || [],
    status: turf.status,
    featured: turf.featured,
    ownerId: turf.ownerId,
    ownerName: owner?.name,
    distanceKm: distanceKm !== undefined ? Math.round(distanceKm * 10) / 10 : undefined,
    createdAt: turf.createdAt?.toISOString(),
  };
}

router.get("/turfs", async (req: Request, res: Response) => {
  try {
    const { lat, lng, minPrice, maxPrice, minRating, search } = req.query as Record<string, string>;
    const rows = await db.select({
      turf: turfsTable,
      owner: { name: usersTable.name },
    }).from(turfsTable).leftJoin(usersTable, eq(turfsTable.ownerId, usersTable.id));

    let turfs = rows
      .filter(r => r.turf.status === "approved")
      .map(r => ({
        ...r.turf,
        ownerName: r.owner?.name,
        distanceKm: lat && lng && r.turf.latitude && r.turf.longitude
          ? distance(parseFloat(lat), parseFloat(lng), r.turf.latitude, r.turf.longitude)
          : undefined,
      }));

    if (search) {
      const s = search.toLowerCase();
      turfs = turfs.filter(t => t.name.toLowerCase().includes(s) || t.area?.toLowerCase().includes(s));
    }
    if (minPrice) turfs = turfs.filter(t => t.pricePerHour >= parseFloat(minPrice));
    if (maxPrice) turfs = turfs.filter(t => t.pricePerHour <= parseFloat(maxPrice));
    if (minRating) turfs = turfs.filter(t => t.rating >= parseFloat(minRating));

    if (lat && lng) {
      turfs.sort((a, b) => (a.distanceKm || 999) - (b.distanceKm || 999));
    }

    res.json(turfs.map(t => turfResponse(t, undefined, t.distanceKm)));
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Failed to fetch turfs" });
  }
});

router.post("/turfs", authenticate, requireRole("turf_owner", "admin"), async (req: AuthRequest, res: Response) => {
  try {
    const parsed = CreateTurfBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input" });
      return;
    }
    const [turf] = await db.insert(turfsTable).values({
      ...parsed.data,
      ownerId: req.user!.id,
      status: req.user!.role === "admin" ? "approved" : "pending",
    }).returning();
    res.status(201).json(turfResponse(turf));
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Failed to create turf" });
  }
});

router.get("/turfs/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const [row] = await db.select({
      turf: turfsTable,
      owner: { name: usersTable.name },
    }).from(turfsTable).leftJoin(usersTable, eq(turfsTable.ownerId, usersTable.id)).where(eq(turfsTable.id, id));
    if (!row) {
      res.status(404).json({ error: "Turf not found" });
      return;
    }
    const reviews = await db.select({
      review: reviewsTable,
      user: { name: usersTable.name, avatar: usersTable.avatar },
    }).from(reviewsTable).leftJoin(usersTable, eq(reviewsTable.userId, usersTable.id)).where(eq(reviewsTable.turfId, id));
    const result = turfResponse({ ...row.turf }, row.owner);
    res.json({
      ...result,
      reviews: reviews.map(r => ({
        id: r.review.id,
        turfId: r.review.turfId,
        userId: r.review.userId,
        userName: r.user?.name,
        userAvatar: r.user?.avatar,
        rating: r.review.rating,
        comment: r.review.comment,
        createdAt: r.review.createdAt?.toISOString(),
      })),
    });
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Failed to fetch turf" });
  }
});

router.put("/turfs/:id", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const parsed = CreateTurfBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input" });
      return;
    }
    const [turf] = await db.update(turfsTable).set(parsed.data).where(eq(turfsTable.id, id)).returning();
    if (!turf) {
      res.status(404).json({ error: "Turf not found" });
      return;
    }
    res.json(turfResponse(turf));
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Failed to update turf" });
  }
});

router.delete("/turfs/:id", authenticate, requireRole("admin", "turf_owner"), async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(turfsTable).where(eq(turfsTable.id, id));
    res.json({ success: true });
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Failed to delete turf" });
  }
});

router.get("/turfs/:id/slots", async (req: Request, res: Response) => {
  try {
    const turfId = parseInt(req.params.id);
    const { date } = req.query as { date?: string };
    
    const slots = await db.select().from(timeSlotsTable).where(eq(timeSlotsTable.turfId, turfId));
    
    const [turf] = await db.select().from(turfsTable).where(eq(turfsTable.id, turfId));
    
    const { bookingsTable } = await import("@workspace/db");
    const bookedSlots = date ? await db.select().from(bookingsTable).where(
      and(eq(bookingsTable.turfId, turfId), eq(bookingsTable.date, date))
    ) : [];

    const now = new Date();
    // A slot is blocked only if: confirmed, OR pending within the 10-min reservation window
    const bookedSlotIds = new Set(
      bookedSlots
        .filter(b => {
          if (b.status === "confirmed") return true;
          if (b.status === "pending" && b.expiresAt && new Date(b.expiresAt) > now) return true;
          return false;
        })
        .flatMap(b => {
          try {
            return b.slotIds ? JSON.parse(b.slotIds) : [b.slotId];
          } catch {
            return [b.slotId];
          }
        })
    );

    res.json(slots.map(s => ({
      id: s.id,
      turfId: s.turfId,
      startTime: s.startTime,
      endTime: s.endTime,
      date: date || "",
      isBooked: bookedSlotIds.has(s.id),
      price: turf?.pricePerHour || 0,
    })));
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Failed to fetch slots" });
  }
});

router.post("/turfs/:id/slots", authenticate, requireRole("turf_owner", "admin"), async (req: AuthRequest, res: Response) => {
  try {
    const turfId = parseInt(req.params.id);
    const parsed = CreateTurfSlotBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input" });
      return;
    }
    const [slot] = await db.insert(timeSlotsTable).values({
      turfId,
      startTime: parsed.data.startTime,
      endTime: parsed.data.endTime,
    }).returning();
    res.status(201).json({ id: slot.id, turfId: slot.turfId, startTime: slot.startTime, endTime: slot.endTime, date: "", isBooked: false });
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Failed to create slot" });
  }
});

router.post("/turfs/:id/review", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const turfId = parseInt(req.params.id);
    const parsed = ReviewTurfBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input" });
      return;
    }
    const [review] = await db.insert(reviewsTable).values({
      turfId,
      userId: req.user!.id,
      rating: parsed.data.rating,
      comment: parsed.data.comment,
    }).returning();
    const allReviews = await db.select().from(reviewsTable).where(eq(reviewsTable.turfId, turfId));
    const avgRating = allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length;
    await db.update(turfsTable).set({ rating: Math.round(avgRating * 10) / 10, reviewCount: allReviews.length }).where(eq(turfsTable.id, turfId));
    res.status(201).json({ id: review.id, turfId: review.turfId, userId: review.userId, rating: review.rating, comment: review.comment, createdAt: review.createdAt?.toISOString() });
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Failed to submit review" });
  }
});

export default router;
