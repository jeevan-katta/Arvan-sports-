import { Router, Request, Response } from "express";
import { Types } from "mongoose";
import { Turf, TimeSlot, Review, Booking } from "@workspace/db";
import { authenticate, requireRole, AuthRequest } from "../middlewares/auth";

function isValidId(id: string) { return Types.ObjectId.isValid(id); }

const router = Router();

function dist(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371, dLat = ((lat2 - lat1) * Math.PI) / 180, dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function turfRes(turf: any, ownerName?: string, distanceKm?: number) {
  return {
    id: turf._id.toString(),
    name: turf.name, description: turf.description,
    pricePerHour: turf.pricePerHour, images: turf.images || [],
    rating: turf.rating, reviewCount: turf.reviewCount,
    latitude: turf.latitude, longitude: turf.longitude,
    address: turf.address, area: turf.area,
    amenities: turf.amenities || [], status: turf.status, featured: turf.featured,
    ownerId: turf.ownerId?.toString(), ownerName,
    distanceKm: distanceKm !== undefined ? Math.round(distanceKm * 10) / 10 : undefined,
    createdAt: turf.createdAt?.toISOString(),
  };
}

/** Auto-create 24 hourly TimeSlot documents for a turf if fewer than 24 exist */
async function ensureDailySlots(turfId: string) {
  const existing = await TimeSlot.find({ turfId }).lean();
  if (existing.length >= 24) return existing;

  const existingTimes = new Set((existing as any[]).map((s: any) => s.startTime));
  const toCreate: Array<{ turfId: string; startTime: string; endTime: string }> = [];

  for (let h = 0; h < 24; h++) {
    const start = `${h.toString().padStart(2, "0")}:00`;
    const end = h === 23 ? "23:59" : `${(h + 1).toString().padStart(2, "0")}:00`;
    if (!existingTimes.has(start)) {
      toCreate.push({ turfId, startTime: start, endTime: end });
    }
  }
  if (toCreate.length > 0) {
    await TimeSlot.insertMany(toCreate);
  }
  return await TimeSlot.find({ turfId }).lean();
}

router.get("/turfs", async (req: Request, res: Response) => {
  try {
    const { lat, lng, minPrice, maxPrice, minRating, search } = req.query as Record<string, string>;
    const query: any = { status: "approved" };
    if (search) query.$or = [{ name: new RegExp(search, "i") }, { area: new RegExp(search, "i") }];
    if (minPrice || maxPrice) { query.pricePerHour = {}; if (minPrice) query.pricePerHour.$gte = parseFloat(minPrice); if (maxPrice) query.pricePerHour.$lte = parseFloat(maxPrice); }
    if (minRating) query.rating = { $gte: parseFloat(minRating) };
    const turfs = await Turf.find(query).populate("ownerId", "name").lean();
    let result = turfs.map((t: any) => ({
      ...t,
      distanceKm: lat && lng && t.latitude && t.longitude ? dist(parseFloat(lat), parseFloat(lng), t.latitude, t.longitude) : undefined,
    }));
    if (lat && lng) result.sort((a: any, b: any) => (a.distanceKm||999) - (b.distanceKm||999));
    res.json(result.map((t: any) => turfRes(t, t.ownerId?.name, t.distanceKm)));
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to fetch turfs" }); }
});

router.post("/turfs", authenticate, requireRole("turf_owner", "admin"), async (req: AuthRequest, res: Response) => {
  try {
    const turf = await Turf.create({
      ...req.body,
      ownerId: req.user!.id,
      status: req.user!.role === "admin" ? "approved" : "pending",
    });
    res.status(201).json(turfRes(turf));
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to create turf" }); }
});

router.get("/turfs/:id", async (req: Request, res: Response) => {
  try {
    if (!isValidId(req.params.id)) { res.status(404).json({ error: "Turf not found" }); return; }
    const turf = await Turf.findById(req.params.id).populate("ownerId", "name").lean() as any;
    if (!turf) { res.status(404).json({ error: "Turf not found" }); return; }
    const reviews = await Review.find({ turfId: req.params.id }).populate("userId", "name avatar").lean();
    res.json({
      ...turfRes(turf, turf.ownerId?.name),
      reviews: reviews.map((r: any) => ({
        id: r._id.toString(), turfId: r.turfId?.toString(), userId: r.userId?._id?.toString(),
        userName: r.userId?.name, userAvatar: r.userId?.avatar,
        rating: r.rating, comment: r.comment, createdAt: r.createdAt?.toISOString(),
      })),
    });
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to fetch turf" }); }
});

router.put("/turfs/:id", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!isValidId(req.params.id)) { res.status(404).json({ error: "Turf not found" }); return; }
    const turf = await Turf.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!turf) { res.status(404).json({ error: "Turf not found" }); return; }
    res.json(turfRes(turf));
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to update turf" }); }
});

router.delete("/turfs/:id", authenticate, requireRole("admin", "turf_owner"), async (req: AuthRequest, res: Response) => {
  try {
    if (!isValidId(req.params.id)) { res.status(404).json({ error: "Turf not found" }); return; }
    await Turf.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to delete turf" }); }
});

router.get("/turfs/:id/slots", async (req: Request, res: Response) => {
  try {
    if (!isValidId(req.params.id)) { res.status(404).json({ error: "Turf not found" }); return; }
    const { date } = req.query as { date?: string };
    const turf = await Turf.findById(req.params.id).lean() as any;
    if (!turf) { res.status(404).json({ error: "Turf not found" }); return; }

    // Auto-seed 24 hourly slots if fewer exist
    const slots = await ensureDailySlots(req.params.id);

    const now = new Date();
    const bookedDocs = date ? await Booking.find({ turfId: req.params.id, date }).lean() : [];

    // Confirmed bookings → isBooked. Pending not-yet-expired bookings → isReserved.
    const bookedIds = new Set<string>();
    const reservedIds = new Set<string>();

    (bookedDocs as any[]).forEach((b: any) => {
      const ids: string[] = b.slotIds?.length
        ? b.slotIds.map((id: any) => id.toString())
        : [b.slotId?.toString()].filter(Boolean);

      if (b.status === "confirmed") {
        ids.forEach(id => bookedIds.add(id));
      } else if (b.status === "pending" && b.expiresAt && new Date(b.expiresAt) > now) {
        ids.forEach(id => reservedIds.add(id));
      }
    });

    // Sort slots by startTime
    const sorted = [...slots].sort((a: any, b: any) => a.startTime.localeCompare(b.startTime));

    res.json(sorted.map((s: any) => ({
      id: s._id.toString(), turfId: s.turfId?.toString(),
      startTime: s.startTime, endTime: s.endTime,
      date: date || "",
      isBooked: bookedIds.has(s._id.toString()) || reservedIds.has(s._id.toString()),
      isReserved: reservedIds.has(s._id.toString()),
      isConfirmedBooked: bookedIds.has(s._id.toString()),
      price: turf.pricePerHour || 0,
    })));
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to fetch slots" }); }
});

router.post("/turfs/:id/slots", authenticate, requireRole("turf_owner", "admin"), async (req: AuthRequest, res: Response) => {
  try {
    if (!isValidId(req.params.id)) { res.status(404).json({ error: "Turf not found" }); return; }
    const slot = await TimeSlot.create({ turfId: req.params.id, startTime: req.body.startTime, endTime: req.body.endTime });
    res.status(201).json({ id: slot._id.toString(), turfId: slot.turfId?.toString(), startTime: slot.startTime, endTime: slot.endTime, date: "", isBooked: false, isReserved: false });
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to create slot" }); }
});

router.post("/turfs/:id/review", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!isValidId(req.params.id)) { res.status(404).json({ error: "Turf not found" }); return; }
    const review = await Review.create({ turfId: req.params.id, userId: req.user!.id, rating: req.body.rating, comment: req.body.comment });
    const allReviews = await Review.find({ turfId: req.params.id });
    const avg = allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length;
    await Turf.findByIdAndUpdate(req.params.id, { rating: Math.round(avg * 10) / 10, reviewCount: allReviews.length });
    res.status(201).json({ id: review._id.toString(), rating: review.rating, comment: review.comment, createdAt: review.createdAt?.toISOString() });
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to submit review" }); }
});

export default router;
