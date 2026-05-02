import { Router, Request, Response } from "express";
import { Types } from "mongoose";
import { Event, EventParticipant } from "@workspace/db";
import { authenticate, requireRole, AuthRequest } from "../middlewares/auth";

const isValidId = (id: string) => Types.ObjectId.isValid(id);

const router = Router();

function eventRes(e: any) {
  return {
    id: e._id.toString(), title: e.title, description: e.description,
    date: e.date, time: e.time, venue: e.venue, area: e.area, image: e.image,
    prize: e.prize, entryFee: e.entryFee, maxParticipants: e.maxParticipants,
    currentParticipants: e.currentParticipants, featured: e.featured, status: e.status,
    createdAt: e.createdAt?.toISOString(),
  };
}

router.get("/events", async (req: Request, res: Response) => {
  try {
    const { featured } = req.query as Record<string, string>;
    const query: any = {};
    if (featured === "true") query.featured = true;
    const events = await Event.find(query).sort({ date: 1 }).lean();
    res.json(events.map(eventRes));
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to fetch events" }); }
});

router.post("/events", authenticate, requireRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const event = await Event.create(req.body);
    res.status(201).json(eventRes(event));
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to create event" }); }
});

router.get("/events/:id", async (req: Request, res: Response) => {
  try {
    if (!isValidId(req.params.id)) { res.status(404).json({ error: "Event not found" }); return; }
    const event = await Event.findById(req.params.id).lean();
    if (!event) { res.status(404).json({ error: "Event not found" }); return; }
    const participants = await EventParticipant.find({ eventId: req.params.id }).lean();
    res.json({ ...eventRes(event), currentParticipants: participants.length, participants: [] });
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to fetch event" }); }
});

router.put("/events/:id", authenticate, requireRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    if (!isValidId(req.params.id)) { res.status(404).json({ error: "Event not found" }); return; }
    const event = await Event.findByIdAndUpdate(req.params.id, req.body, { new: true }).lean();
    if (!event) { res.status(404).json({ error: "Event not found" }); return; }
    res.json(eventRes(event));
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to update event" }); }
});

router.delete("/events/:id", authenticate, requireRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    if (!isValidId(req.params.id)) { res.status(404).json({ error: "Event not found" }); return; }
    await Event.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to delete event" }); }
});

router.post("/events/:id/join", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!isValidId(req.params.id)) { res.status(404).json({ error: "Event not found" }); return; }
    const existing = await EventParticipant.findOne({ eventId: req.params.id, userId: req.user!.id });
    if (!existing) {
      await EventParticipant.create({ eventId: req.params.id, userId: req.user!.id });
      await Event.findByIdAndUpdate(req.params.id, { $inc: { currentParticipants: 1 } });
    }
    const event = await Event.findById(req.params.id).lean();
    if (!event) { res.status(404).json({ error: "Event not found" }); return; }
    res.json(eventRes(event));
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to join event" }); }
});

export default router;
