import { Router, Request, Response } from "express";
import { db, eventsTable, eventParticipantsTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { authenticate, requireRole, AuthRequest } from "../middlewares/auth";
import { CreateEventBody } from "@workspace/api-zod";

const router = Router();

function eventResponse(event: any, participantCount?: number) {
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    date: event.date,
    time: event.time,
    venue: event.venue,
    area: event.area,
    image: event.image,
    prize: event.prize,
    entryFee: event.entryFee,
    maxParticipants: event.maxParticipants,
    currentParticipants: participantCount ?? event.currentParticipants,
    featured: event.featured,
    status: event.status,
    createdAt: event.createdAt?.toISOString(),
  };
}

router.get("/events", async (req: Request, res: Response) => {
  try {
    const { featured } = req.query as Record<string, string>;
    let events = await db.select().from(eventsTable);
    if (featured === "true") events = events.filter(e => e.featured);
    const counts = await db.select({ eventId: eventParticipantsTable.eventId }).from(eventParticipantsTable);
    const countMap: Record<number, number> = {};
    counts.forEach(c => { countMap[c.eventId] = (countMap[c.eventId] || 0) + 1; });
    res.json(events.map(e => eventResponse(e, countMap[e.id] || 0)));
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

router.post("/events", authenticate, requireRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const parsed = CreateEventBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input" });
      return;
    }
    const [event] = await db.insert(eventsTable).values(parsed.data).returning();
    res.status(201).json(eventResponse(event));
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Failed to create event" });
  }
});

router.get("/events/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, id));
    if (!event) {
      res.status(404).json({ error: "Event not found" });
      return;
    }
    const participants = await db.select({ eventId: eventParticipantsTable.eventId }).from(eventParticipantsTable).where(eq(eventParticipantsTable.eventId, id));
    res.json({ ...eventResponse(event, participants.length), participants: [] });
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Failed to fetch event" });
  }
});

router.put("/events/:id", authenticate, requireRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const parsed = CreateEventBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input" });
      return;
    }
    const [event] = await db.update(eventsTable).set(parsed.data).where(eq(eventsTable.id, id)).returning();
    res.json(eventResponse(event));
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Failed to update event" });
  }
});

router.delete("/events/:id", authenticate, requireRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(eventsTable).where(eq(eventsTable.id, id));
    res.json({ success: true });
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Failed to delete event" });
  }
});

router.post("/events/:id/join", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const eventId = parseInt(req.params.id);
    const existing = await db.select().from(eventParticipantsTable).where(
      and(eq(eventParticipantsTable.eventId, eventId), eq(eventParticipantsTable.userId, req.user!.id))
    );
    if (existing.length === 0) {
      await db.insert(eventParticipantsTable).values({ eventId, userId: req.user!.id });
    }
    const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, eventId));
    const count = await db.select().from(eventParticipantsTable).where(eq(eventParticipantsTable.eventId, eventId));
    res.json(eventResponse(event, count.length));
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Failed to join event" });
  }
});

export default router;
