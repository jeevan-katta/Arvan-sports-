import { Router, Request, Response } from "express";
import { authenticate, AuthRequest } from "../middlewares/auth";
import {
  getAllMatches, getMatch, getMatchByUser, createMatch, updateMatch, addBall, deleteMatch,
} from "../lib/live-scores";
import { Turf } from "@workspace/db";

const router = Router();

router.get("/live-scores", async (_req: Request, res: Response) => {
  res.json(await getAllMatches());
});

router.get("/live-scores/mine", authenticate, async (req: AuthRequest, res: Response) => {
  const match = await getMatchByUser(req.user!.id);
  if (!match) { res.status(404).json({ error: "No active match" }); return; }
  res.json(match);
});

router.get("/live-scores/:id", async (req: Request, res: Response) => {
  const match = await getMatch(String(req.params.id));
  if (!match) { res.status(404).json({ error: "Match not found" }); return; }
  res.json(match);
});

router.post("/live-scores", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { turfId, turfName, teamA, teamB } = req.body;
    if (!turfName || !teamA || !teamB) {
      res.status(400).json({ error: "turfName, teamA, teamB are required" }); return;
    }
    const { battingTeam = "A", maxOvers = 8, bookingId } = req.body;
    const resolvedTurfId = turfId ? String(turfId) : `community_${req.user!.id}`;

    // Fetch turf location if turfId is provided
    let lat: number | undefined;
    let lng: number | undefined;
    if (turfId && String(turfId).match(/^[0-9a-fA-F]{24}$/)) {
      const turf = await Turf.findById(turfId);
      if (turf) {
        lat = turf.latitude;
        lng = turf.longitude;
      }
    }

    const match = await createMatch({
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
      striker: undefined,
      nonStriker: undefined,
      currentBowler: undefined,
      bookingId: bookingId ? String(bookingId) : undefined,
      lat,
      lng,
    });
    res.status(201).json(match);
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Failed to create live match" });
  }
});

router.put("/live-scores/:id", authenticate, async (req: AuthRequest, res: Response) => {
  const updated = await updateMatch(String(req.params.id), req.body);
  if (!updated) { res.status(404).json({ error: "Match not found" }); return; }
  res.json(updated);
});

// Set/update team rosters
router.put("/live-scores/:id/players", authenticate, async (req: AuthRequest, res: Response) => {
  const match = await getMatch(String(req.params.id));
  if (!match) { res.status(404).json({ error: "Match not found" }); return; }
  if (match.createdBy !== req.user!.id && req.user!.role !== "admin") {
    res.status(403).json({ error: "Not your match" }); return;
  }
  const { teamAPlayers, teamBPlayers } = req.body;
  const updated = await updateMatch(String(req.params.id), {
    ...(teamAPlayers !== undefined && { teamAPlayers }),
    ...(teamBPlayers !== undefined && { teamBPlayers }),
  });
  res.json(updated);
});

// Set current striker / non-striker / bowler
router.put("/live-scores/:id/current", authenticate, async (req: AuthRequest, res: Response) => {
  const match = await getMatch(String(req.params.id));
  if (!match) { res.status(404).json({ error: "Match not found" }); return; }
  if (match.createdBy !== req.user!.id && req.user!.role !== "admin") {
    res.status(403).json({ error: "Not your match" }); return;
  }
  const { striker, nonStriker, currentBowler } = req.body;
  let bowlers = [...match.bowlers];
  // Auto-add bowler to bowlers list if new
  if (currentBowler && !bowlers.find(b => b.name === currentBowler)) {
    bowlers = [...bowlers, { name: currentBowler, legalBalls: 0, runs: 0, wickets: 0 }];
  }
  const updated = await updateMatch(String(req.params.id), {
    ...(striker !== undefined && { striker }),
    ...(nonStriker !== undefined && { nonStriker }),
    ...(currentBowler !== undefined && { currentBowler, bowlers }),
  });
  res.json(updated);
});

router.post("/live-scores/:id/ball", authenticate, async (req: AuthRequest, res: Response) => {
  const { result, team } = req.body;
  if (!result) { res.status(400).json({ error: "result required (0/1/2/3/4/6/W/NB/WD)" }); return; }
  const updated = await addBall(String(req.params.id), String(result), team);
  if (!updated) { res.status(404).json({ error: "Match not found" }); return; }
  res.json(updated);
});

router.delete("/live-scores/:id", authenticate, (req: AuthRequest, res: Response) => {
  const ok = deleteMatch(String(req.params.id));
  if (!ok) { res.status(404).json({ error: "Match not found" }); return; }
  res.json({ success: true });
});

export default router;
