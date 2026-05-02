import { Router, Request, Response } from "express";
import { authenticate, requireRole, AuthRequest } from "../middlewares/auth";
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

router.post("/live-scores", authenticate, requireRole("admin", "turf_owner"), (req: AuthRequest, res: Response) => {
  const { turfId, turfName, teamA, teamB } = req.body;
  if (!turfId || !turfName || !teamA || !teamB) {
    res.status(400).json({ error: "turfId, turfName, teamA, teamB are required" }); return;
  }
  const match = createMatch({ turfId, turfName, teamA, teamB, scoreA: 0, scoreB: 0, overs: "0.0", status: "live" });
  res.status(201).json(match);
});

router.put("/live-scores/:id", authenticate, requireRole("admin", "turf_owner"), (req: AuthRequest, res: Response) => {
  const updated = updateMatch(req.params.id, req.body);
  if (!updated) { res.status(404).json({ error: "Match not found" }); return; }
  res.json(updated);
});

router.delete("/live-scores/:id", authenticate, requireRole("admin", "turf_owner"), (req: AuthRequest, res: Response) => {
  const ok = deleteMatch(req.params.id);
  if (!ok) { res.status(404).json({ error: "Match not found" }); return; }
  res.json({ success: true });
});

export default router;
