import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage } from "http";
import { Server } from "http";
import { logger } from "./logger";
import { Match } from "@workspace/db";

export interface Player {
  name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  isOut: boolean;
}

export interface Bowler {
  name: string;
  legalBalls: number;
  runs: number;
  wickets: number;
}

export interface Ball {
  result: string;
  team: "A" | "B";
  over: number;
  ball: number;
  striker?: string;
  bowler?: string;
  bowlerName?: string;
}

export interface LiveMatch {
  id: string;
  turfId: string;
  turfName: string;
  teamA: string;
  teamB: string;
  scoreA: number;
  scoreB: number;
  wicketsA: number;
  wicketsB: number;
  overs: string;
  battingTeam: "A" | "B";
  balls: Ball[];
  maxOvers: number;
  status: "live" | "completed" | "upcoming";
  startedAt: string;
  updatedAt: string;
  createdBy?: string;
  teamAPlayers: Player[];
  teamBPlayers: Player[];
  bowlers: Bowler[];
  striker?: string;
  nonStriker?: string;
  currentBowler?: string;
  bookingId?: string;
  lat?: number;
  lng?: number;
}

const liveMatches = new Map<string, LiveMatch>();
let wss: WebSocketServer | null = null;

export function setupWebSocket(server: Server) {
  wss = new WebSocketServer({ server, path: "/api/ws" });
  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    logger.debug({ url: req.url }, "WebSocket client connected");
    ws.send(JSON.stringify({ type: "init", matches: Array.from(liveMatches.values()) }));
    ws.on("error", (err) => logger.error({ err }, "WebSocket error"));
    ws.on("close", () => logger.debug("WebSocket client disconnected"));
  });
  logger.info("WebSocket server ready at /api/ws");
}

export function broadcast(event: object) {
  if (!wss) return;
  const msg = JSON.stringify(event);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) client.send(msg);
  });
}

export async function getAllMatches(): Promise<LiveMatch[]> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const records = await Match.find({ startedAt: { $gt: sevenDaysAgo }, status: "live" }).lean();
  return records.map(r => ({
    id: r.matchId,
    turfId: r.turfId || "",
    turfName: r.turfName || "",
    teamA: r.teamA || "",
    teamB: r.teamB || "",
    scoreA: r.scoreA,
    scoreB: r.scoreB,
    wicketsA: r.wicketsA,
    wicketsB: r.wicketsB,
    overs: r.overs || "0.0",
    battingTeam: (r.battingTeam as "A" | "B") || "A",
    balls: (r.balls || []) as Ball[],
    maxOvers: r.maxOvers,
    status: (r.status as "live") || "live",
    startedAt: r.startedAt?.toISOString() || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: r.createdBy,
    teamAPlayers: (r.teamAPlayers || []) as Player[],
    teamBPlayers: (r.teamBPlayers || []) as Player[],
    bowlers: (r.bowlers || []) as Bowler[],
    striker: r.striker,
    nonStriker: r.nonStriker,
    currentBowler: r.currentBowler,
    bookingId: r.bookingId,
    lat: r.lat,
    lng: r.lng,
  }));
}

export async function getMatch(id: string): Promise<LiveMatch | undefined> {
  const match = liveMatches.get(id);
  if (match) return match;
  
  const r = await Match.findOne({ matchId: id }).lean();
  if (!r) return undefined;

  return {
    id: r.matchId,
    turfId: r.turfId || "",
    turfName: r.turfName || "",
    teamA: r.teamA || "",
    teamB: r.teamB || "",
    scoreA: r.scoreA,
    scoreB: r.scoreB,
    wicketsA: r.wicketsA,
    wicketsB: r.wicketsB,
    overs: r.overs || "0.0",
    battingTeam: (r.battingTeam as "A" | "B") || "A",
    balls: (r.balls || []) as Ball[],
    maxOvers: r.maxOvers,
    status: (r.status as "live") || "live",
    startedAt: r.startedAt?.toISOString() || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: r.createdBy,
    teamAPlayers: (r.teamAPlayers || []) as Player[],
    teamBPlayers: (r.teamBPlayers || []) as Player[],
    bowlers: (r.bowlers || []) as Bowler[],
    striker: r.striker,
    nonStriker: r.nonStriker,
    currentBowler: r.currentBowler,
    bookingId: r.bookingId,
    lat: r.lat,
    lng: r.lng,
  };
}

export async function getMatchByUser(userId: string): Promise<LiveMatch | undefined> {
  const r = await Match.findOne({ createdBy: userId, status: "live" }).lean();
  if (!r) return undefined;
  
  return {
    id: r.matchId,
    turfId: r.turfId || "",
    turfName: r.turfName || "",
    teamA: r.teamA || "",
    teamB: r.teamB || "",
    scoreA: r.scoreA,
    scoreB: r.scoreB,
    wicketsA: r.wicketsA,
    wicketsB: r.wicketsB,
    overs: r.overs || "0.0",
    battingTeam: (r.battingTeam as "A" | "B") || "A",
    balls: (r.balls || []) as Ball[],
    maxOvers: r.maxOvers,
    status: (r.status as "live") || "live",
    startedAt: r.startedAt?.toISOString() || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: r.createdBy,
    teamAPlayers: (r.teamAPlayers || []) as Player[],
    teamBPlayers: (r.teamBPlayers || []) as Player[],
    bowlers: (r.bowlers || []) as Bowler[],
    striker: r.striker,
    nonStriker: r.nonStriker,
    currentBowler: r.currentBowler,
    bookingId: r.bookingId,
    lat: r.lat,
    lng: r.lng,
  };
}

async function persistMatch(match: LiveMatch) {
  try {
    await Match.findOneAndUpdate(
      { matchId: match.id },
      {
        matchId: match.id,
        createdBy: match.createdBy || "anonymous",
        turfId: match.turfId,
        turfName: match.turfName,
        teamA: match.teamA,
        teamB: match.teamB,
        scoreA: match.scoreA,
        scoreB: match.scoreB,
        wicketsA: match.wicketsA,
        wicketsB: match.wicketsB,
        overs: match.overs,
        battingTeam: match.battingTeam,
        balls: match.balls,
        maxOvers: match.maxOvers,
        status: match.status,
        teamAPlayers: match.teamAPlayers,
        teamBPlayers: match.teamBPlayers,
        bowlers: match.bowlers,
        striker: match.striker,
        nonStriker: match.nonStriker,
        currentBowler: match.currentBowler,
        bookingId: match.bookingId,
        lat: match.lat,
        lng: match.lng,
        startedAt: new Date(match.startedAt),
        expireAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      { upsert: true, new: true }
    );
  } catch (err) {
    logger.error({ err, matchId: match.id }, "Failed to persist match");
  }
}

export async function loadMatchesFromDB() {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const records = await Match.find({ startedAt: { $gt: sevenDaysAgo }, status: "live" }).lean();
    for (const r of records) {
      const match: LiveMatch = {
        id: r.matchId,
        turfId: r.turfId || "",
        turfName: r.turfName || "",
        teamA: r.teamA || "",
        teamB: r.teamB || "",
        scoreA: r.scoreA,
        scoreB: r.scoreB,
        wicketsA: r.wicketsA,
        wicketsB: r.wicketsB,
        overs: r.overs || "0.0",
        battingTeam: (r.battingTeam as "A" | "B") || "A",
        balls: (r.balls || []) as Ball[],
        maxOvers: r.maxOvers,
        status: (r.status as "live") || "live",
        startedAt: r.startedAt?.toISOString() || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: r.createdBy,
        teamAPlayers: (r.teamAPlayers || []) as Player[],
        teamBPlayers: (r.teamBPlayers || []) as Player[],
        bowlers: (r.bowlers || []) as Bowler[],
        striker: r.striker,
        nonStriker: r.nonStriker,
        currentBowler: r.currentBowler,
        bookingId: r.bookingId,
        lat: r.lat,
        lng: r.lng,
      };
      liveMatches.set(match.id, match);
    }
    logger.info({ count: records.length }, "Loaded matches from DB");
  } catch (err) {
    logger.error({ err }, "Failed to load matches from DB");
  }
}

export async function purgeOldMatches() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  let purged = 0;
  for (const [id, match] of liveMatches.entries()) {
    if (new Date(match.startedAt) < sevenDaysAgo) {
      liveMatches.delete(id);
      broadcast({ type: "match_ended", id });
      purged++;
    }
  }
  if (purged > 0) logger.info({ purged }, "Purged old matches from memory");
}

export async function createMatch(data: Omit<LiveMatch, "id" | "startedAt" | "updatedAt" | "balls" | "wicketsA" | "wicketsB" | "teamAPlayers" | "teamBPlayers" | "bowlers">): Promise<LiveMatch> {
  const id = `match_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const now = new Date().toISOString();
  const match: LiveMatch = {
    ...data,
    id,
    balls: [],
    wicketsA: 0,
    wicketsB: 0,
    teamAPlayers: [],
    teamBPlayers: [],
    bowlers: [],
    startedAt: now,
    updatedAt: now,
  };
  
  logger.info({ matchId: id, teamA: data.teamA, teamB: data.teamB }, "Creating live match");
  liveMatches.set(id, match);
  broadcast({ type: "match_created", match });
  await persistMatch(match);
  return match;
}

export async function updateMatch(id: string, updates: Partial<Omit<LiveMatch, "id" | "startedAt">>): Promise<LiveMatch | null> {
  const match = await getMatch(id);
  if (!match) return null;
  const updated: LiveMatch = { ...match, ...updates, updatedAt: new Date().toISOString() };
  liveMatches.set(id, updated);
  broadcast({ type: "score_update", match: updated });
  await persistMatch(updated);
  return updated;
}

function updatePlayerStats(players: Player[], name: string, result: string): Player[] {
  return players.map(p => {
    if (p.name !== name) return p;
    const runs = result === "W" || result === "NB" || result === "WD" ? 0 : parseInt(result, 10) || 0;
    return {
      ...p,
      runs: p.runs + runs,
      balls: (result === "NB" || result === "WD") ? p.balls : p.balls + 1,
      fours: result === "4" ? p.fours + 1 : p.fours,
      sixes: result === "6" ? p.sixes + 1 : p.sixes,
      isOut: result === "W" ? true : p.isOut,
    };
  });
}

function updateBowlerStats(bowlers: Bowler[], name: string, result: string): Bowler[] {
  return bowlers.map(b => {
    if (b.name !== name) return b;
    const isLegal = result !== "NB" && result !== "WD";
    const runs = result === "W" ? 0 : result === "NB" || result === "WD" ? 1 : parseInt(result, 10) || 0;
    return {
      ...b,
      legalBalls: isLegal ? b.legalBalls + 1 : b.legalBalls,
      runs: b.runs + runs,
      wickets: result === "W" ? b.wickets + 1 : b.wickets,
    };
  });
}

export async function addBall(id: string, result: string, team?: "A" | "B"): Promise<LiveMatch | null> {
  const match = await getMatch(id);
  if (!match) return null;

  const battingTeam = team || match.battingTeam;
  const isLegalBall = result !== "NB" && result !== "WD";

  const legalBallsForTeam = match.balls.filter(b => b.team === battingTeam && b.result !== "NB" && b.result !== "WD").length;
  const overNum = Math.floor(legalBallsForTeam / 6);
  const ballNum = isLegalBall ? legalBallsForTeam % 6 : -1;

  const ball: Ball = {
    result,
    team: battingTeam,
    over: overNum,
    ball: ballNum,
    striker: match.striker,
    bowler: match.currentBowler,
  };
  const newBalls = [...match.balls, ball];

  let scoreA = match.scoreA;
  let scoreB = match.scoreB;
  let wicketsA = match.wicketsA;
  let wicketsB = match.wicketsB;

  if (battingTeam === "A") {
    if (result === "W") { wicketsA = Math.min(10, wicketsA + 1); }
    else if (result === "NB" || result === "WD") { scoreA += 1; }
    else { scoreA += parseInt(result, 10) || 0; }
  } else {
    if (result === "W") { wicketsB = Math.min(10, wicketsB + 1); }
    else if (result === "NB" || result === "WD") { scoreB += 1; }
    else { scoreB += parseInt(result, 10) || 0; }
  }

  const totalLegal = newBalls.filter(b => b.result !== "NB" && b.result !== "WD").length;
  const oversNum = Math.floor(totalLegal / 6);
  const ballsInOver = totalLegal % 6;
  const oversStr = `${oversNum}.${ballsInOver} / ${match.maxOvers}`;

  // Update player stats
  let teamAPlayers = [...match.teamAPlayers];
  let teamBPlayers = [...match.teamBPlayers];
  let bowlers = [...match.bowlers];

  if (match.striker) {
    if (battingTeam === "A") teamAPlayers = updatePlayerStats(teamAPlayers, match.striker, result);
    else teamBPlayers = updatePlayerStats(teamBPlayers, match.striker, result);
  }
  if (match.currentBowler) {
    bowlers = updateBowlerStats(bowlers, match.currentBowler, result);
  }

  // Auto-rotate striker/non-striker
  let striker = match.striker;
  let nonStriker = match.nonStriker;

  if (result === "W") {
    // Striker is out — clear striker, user must pick new batter
    striker = undefined;
  } else if (isLegalBall) {
    const runs = parseInt(result, 10) || 0;
    if (runs % 2 === 1) {
      // Odd runs — rotate
      [striker, nonStriker] = [nonStriker, striker];
    }
    // End of over — rotate
    const ballsThisOver = (legalBallsForTeam + 1) % 6;
    if (ballsThisOver === 0) {
      [striker, nonStriker] = [nonStriker, striker];
    }
  }

  const updated: LiveMatch = {
    ...match,
    balls: newBalls,
    scoreA,
    scoreB,
    wicketsA,
    wicketsB,
    overs: oversStr,
    battingTeam,
    teamAPlayers,
    teamBPlayers,
    bowlers,
    striker,
    nonStriker,
    updatedAt: new Date().toISOString(),
  };
  liveMatches.set(id, updated);
  broadcast({ type: "score_update", match: updated });
  await persistMatch(updated);
  return updated;
}

export function broadcastSlotUpdate(turfId: string, date: string, slotIds: string[]) {
  broadcast({ type: "slot_update", turfId, date, slotIds });
}

export function deleteMatch(id: string): boolean {
  const existed = liveMatches.has(id);
  if (existed) {
    liveMatches.delete(id);
    broadcast({ type: "match_ended", id });
    Match.findOneAndUpdate({ matchId: id }, { status: "completed" }).catch(() => {});
  }
  return existed;
}

// Seed a sample live match on startup
const sampleId = `match_sample`;
liveMatches.set(sampleId, {
  id: sampleId,
  turfId: "sample",
  turfName: "Arvan Box Cricket Ground",
  teamA: "Banjara Lions",
  teamB: "Hitech Hawks",
  scoreA: 87,
  scoreB: 64,
  wicketsA: 3,
  wicketsB: 5,
  overs: "6.2 / 8",
  battingTeam: "B",
  maxOvers: 8,
  balls: ["4", "1", "W", "6", "0", "2"].map((r, i) => ({ result: r, team: "A" as const, over: 0, ball: i })),
  status: "live",
  startedAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  teamAPlayers: [
    { name: "Rohit", runs: 45, balls: 32, fours: 4, sixes: 2, isOut: false },
    { name: "Virat", runs: 28, balls: 22, fours: 2, sixes: 1, isOut: false },
    { name: "Dhoni", runs: 14, balls: 10, fours: 1, sixes: 0, isOut: true },
  ],
  teamBPlayers: [
    { name: "Kumar", runs: 38, balls: 28, fours: 3, sixes: 1, isOut: false },
    { name: "Rahul", runs: 18, balls: 15, fours: 1, sixes: 0, isOut: false },
  ],
  bowlers: [
    { name: "Ali", legalBalls: 18, runs: 28, wickets: 1 },
    { name: "Ravi", legalBalls: 12, runs: 22, wickets: 2 },
  ],
  striker: "Kumar",
  nonStriker: "Rahul",
  currentBowler: "Ali",
});
