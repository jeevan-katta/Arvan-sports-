import { Router, Request, Response } from "express";
import { authenticate, AuthRequest } from "../middlewares/auth";
import { Booking } from "@workspace/db";
import {
  getAllMatches, getMatch, createMatch, updateMatch, deleteMatch,
} from "../lib/live-scores";

const router = Router();

router.get("/live-scores", (_req: Request, res: Response) => {
  res.json(getAllMatches());
});

router.get("/live-scores/:id", (req: Request, res: Response) => {
  const match = getMatch(req.params.id);
  if (!match) { res.status(404).json({ error: "Match not found" }); return; }
  res.json(match);
});

router.post("/live-scores", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { turfId, turfName, teamA, teamB, bookingId } = req.body;
    if (!turfId || !turfName || !teamA || !teamB) {
      res.status(400).json({ error: "turfId, turfName, teamA, teamB are required" }); return;
    }
    const userRole = req.user!.role;
    const userId = req.user!.id;
    if (userRole !== "admin" && userRole !== "turf_owner") {
      if (!bookingId) {
        res.status(403).json({ error: "Only admins, turf owners, or users with a confirmed booking can post live scores" }); return;
      }
      const today = new Date().toISOString().split("T")[0];
      const booking = await Booking.findOne({ _id: bookingId, userId, status: "confirmed", turfId, date: today }).lean();
      if (!booking) {
        res.status(403).json({ error: "No confirmed booking found for today at this turf" }); return;
      }
    }
    const match = createMatch({ turfId, turfName, teamA, teamB, scoreA: 0, scoreB: 0, overs: "0.0", status: "live" });
    res.status(201).json(match);
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Failed to create live match" });
  }
});

router.put("/live-scores/:id", authenticate, (req: AuthRequest, res: Response) => {
  const updated = updateMatch(req.params.id, req.body);
  if (!updated) { res.status(404).json({ error: "Match not found" }); return; }
  res.json(updated);
});

router.delete("/live-scores/:id", authenticate, (req: AuthRequest, res: Response) => {
  const ok = deleteMatch(req.params.id);
  if (!ok) { res.status(404).json({ error: "Match not found" }); return; }
  res.json({ success: true });
});

export default router;
