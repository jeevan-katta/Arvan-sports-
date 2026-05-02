import { Router, Request, Response } from "express";
import { authenticate, AuthRequest } from "../middlewares/auth";
import { Booking } from "@workspace/db";
import {
  getAllMatches, getMatch, createMatch, updateMatch, addBall, deleteMatch,
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
    const { turfId, turfName, teamA, teamB } = req.body;
    if (!turfName || !teamA || !teamB) {
      res.status(400).json({ error: "turfName, teamA, teamB are required" }); return;
    }
    const { battingTeam = "A", maxOvers = 8 } = req.body;
    const resolvedTurfId = turfId ? String(turfId) : `community_${req.user!.id}`;
    const match = createMatch({
      turfId: resolvedTurfId,
      turfName,
      teamA,
      teamB,
      scoreA: 0,
      scoreB: 0,
      overs: `0.0 / ${maxOvers}`,
      battingTeam,
      maxOvers,
      status: "live",
      createdBy: req.user!.id,
    });
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

router.post("/live-scores/:id/ball", authenticate, (req: AuthRequest, res: Response) => {
  const { result, team } = req.body;
  if (!result) { res.status(400).json({ error: "result required (0/1/2/3/4/6/W/NB/WD)" }); return; }
  const updated = addBall(req.params.id, String(result), team);
  if (!updated) { res.status(404).json({ error: "Match not found" }); return; }
  res.json(updated);
});

router.delete("/live-scores/:id", authenticate, (req: AuthRequest, res: Response) => {
  const ok = deleteMatch(req.params.id);
  if (!ok) { res.status(404).json({ error: "Match not found" }); return; }
  res.json({ success: true });
});

export default router;
