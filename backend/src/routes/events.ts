import { Router, Request, Response } from "express";
import { Types } from "mongoose";
import { Event, EventParticipant, Standing } from "@workspace/db";
import { authenticate, requireRole, AuthRequest } from "../middlewares/auth";

const isValidId = (id: string) => Types.ObjectId.isValid(id);

const router = Router();

function eventRes(e: any) {
  return {
    id: e._id.toString(), title: e.title, description: e.description,
    date: e.date, time: e.time, venue: e.venue, area: e.area, image: e.image,
    prize: e.prize, entryFee: e.entryFee, maxParticipants: e.maxParticipants,
    currentParticipants: e.currentParticipants, featured: e.featured, status: e.status,
    type: e.type || "event",
    createdByRole: e.createdByRole || "admin",
    createdByName: e.createdByName || "",
    turfId: e.turfId?.toString(),
    turfName: e.turfName,
    maintenanceStartTime: e.maintenanceStartTime,
    maintenanceEndTime: e.maintenanceEndTime,
    createdAt: e.createdAt?.toISOString(),
  };
}

function standingRes(s: any) {
  return {
    id: s._id.toString(),
    eventId: s.eventId.toString(),
    position: s.position,
    teamName: s.teamName,
    played: s.played,
    won: s.won,
    lost: s.lost,
    drawn: s.drawn,
    points: s.points,
    goalsFor: s.goalsFor,
    goalsAgainst: s.goalsAgainst,
    updatedAt: s.updatedAt?.toISOString(),
  };
}

// GET /api/events — public
router.get("/events", async (req: Request, res: Response) => {
  try {
    const { featured, type } = req.query as Record<string, string>;
    const query: any = {};
    if (featured === "true") query.featured = true;
    if (type) query.type = type;
    if (!type) query.type = { $in: ["event", "tournament"] };
    const events = await Event.find(query).sort({ featured: -1, date: 1 }).lean();
    res.json(events.map(eventRes));
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to fetch events" }); }
});

// POST /api/events — admin only
router.post("/events", authenticate, requireRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const event = await Event.create({
      ...req.body,
      createdBy: req.user!.id,
      createdByRole: "admin",
    });
    res.status(201).json(eventRes(event));
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to create event" }); }
});

// GET /api/events/:id
router.get("/events/:id", async (req: Request, res: Response) => {
  try {
    if (!isValidId(req.params.id)) { res.status(404).json({ error: "Event not found" }); return; }
    const event = await Event.findById(req.params.id).lean();
    if (!event) { res.status(404).json({ error: "Event not found" }); return; }
    const participants = await EventParticipant.find({ eventId: req.params.id })
      .populate("userId", "name phone avatar")
      .lean();
    res.json({
      ...eventRes(event),
      currentParticipants: participants.length,
      participants: participants.map((p: any) => ({
        id: p._id.toString(),
        userId: p.userId?._id?.toString() || p.userId?.toString(),
        name: p.name || p.userId?.name,
        phone: p.phone || p.userId?.phone,
        teamName: p.teamName,
        joinedAt: p.joinedAt?.toISOString(),
      })),
    });
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to fetch event" }); }
});

// GET /api/events/:id/standings — public
router.get("/events/:id/standings", async (req: Request, res: Response) => {
  try {
    if (!isValidId(req.params.id)) { res.status(404).json({ error: "Event not found" }); return; }
    const standings = await Standing.find({ eventId: req.params.id }).sort({ position: 1 }).lean();
    res.json(standings.map(standingRes));
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to fetch standings" }); }
});

// PUT /api/events/:id — admin only (full update)
router.put("/events/:id", authenticate, requireRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    if (!isValidId(req.params.id)) { res.status(404).json({ error: "Event not found" }); return; }
    const event = await Event.findByIdAndUpdate(req.params.id, req.body, { new: true }).lean();
    if (!event) { res.status(404).json({ error: "Event not found" }); return; }
    res.json(eventRes(event));
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to update event" }); }
});

// PUT /api/events/:id/feature — admin only (toggle featured)
router.put("/events/:id/feature", authenticate, requireRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    if (!isValidId(req.params.id)) { res.status(404).json({ error: "Event not found" }); return; }
    const existing = await Event.findById(req.params.id).lean() as any;
    if (!existing) { res.status(404).json({ error: "Event not found" }); return; }
    const updated = await Event.findByIdAndUpdate(
      req.params.id,
      { featured: !existing.featured },
      { new: true }
    ).lean();
    res.json(eventRes(updated));
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to update event" }); }
});

// DELETE /api/events/:id — admin only
router.delete("/events/:id", authenticate, requireRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    if (!isValidId(req.params.id)) { res.status(404).json({ error: "Event not found" }); return; }
    await Event.findByIdAndDelete(req.params.id);
    await EventParticipant.deleteMany({ eventId: req.params.id });
    await Standing.deleteMany({ eventId: req.params.id });
    res.json({ success: true });
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to delete event" }); }
});

// POST /api/events/:id/join — authenticated
router.post("/events/:id/join", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!isValidId(req.params.id)) { res.status(404).json({ error: "Event not found" }); return; }
    const event = await Event.findById(req.params.id).lean() as any;
    if (!event) { res.status(404).json({ error: "Event not found" }); return; }
    if (event.maxParticipants && event.currentParticipants >= event.maxParticipants) {
      res.status(400).json({ error: "Event is full" }); return;
    }
    const existing = await EventParticipant.findOne({ eventId: req.params.id, userId: req.user!.id });
    if (!existing) {
      await EventParticipant.create({
        eventId: req.params.id,
        userId: req.user!.id,
        name: req.body.name,
        phone: req.body.phone,
        teamName: req.body.teamName,
      });
      await Event.findByIdAndUpdate(req.params.id, { $inc: { currentParticipants: 1 } });
    }
    const updated = await Event.findById(req.params.id).lean();
    if (!updated) { res.status(404).json({ error: "Event not found" }); return; }
    res.json(eventRes(updated));
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to join event" }); }
});

export default router;
