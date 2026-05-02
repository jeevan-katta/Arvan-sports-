import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage } from "http";
import { Server } from "http";
import { logger } from "./logger";

export interface Ball {
  result: string; // "0"|"1"|"2"|"3"|"4"|"6"|"W"|"NB"|"WD"
  team: "A" | "B";
  over: number;
  ball: number;
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
}

const liveMatches = new Map<string, LiveMatch>();
let wss: WebSocketServer | null = null;

export function setupWebSocket(server: Server) {
  wss = new WebSocketServer({ server, path: "/api/ws" });

  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    logger.info({ url: req.url }, "WebSocket client connected");
    ws.send(JSON.stringify({ type: "init", matches: Array.from(liveMatches.values()) }));
    ws.on("error", (err) => logger.error({ err }, "WebSocket error"));
    ws.on("close", () => logger.info("WebSocket client disconnected"));
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

export function getAllMatches(): LiveMatch[] {
  return Array.from(liveMatches.values());
}

export function getMatch(id: string): LiveMatch | undefined {
  return liveMatches.get(id);
}

export function createMatch(data: Omit<LiveMatch, "id" | "startedAt" | "updatedAt" | "balls" | "wicketsA" | "wicketsB">): LiveMatch {
  const id = `match_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const now = new Date().toISOString();
  const match: LiveMatch = { ...data, id, balls: [], wicketsA: 0, wicketsB: 0, startedAt: now, updatedAt: now };
  liveMatches.set(id, match);
  broadcast({ type: "match_created", match });
  return match;
}

export function updateMatch(id: string, updates: Partial<Omit<LiveMatch, "id" | "startedAt">>): LiveMatch | null {
  const match = liveMatches.get(id);
  if (!match) return null;
  const updated: LiveMatch = { ...match, ...updates, updatedAt: new Date().toISOString() };
  liveMatches.set(id, updated);
  broadcast({ type: "score_update", match: updated });
  return updated;
}

/** Add a single delivery and auto-update score/wickets/overs */
export function addBall(id: string, result: string, team?: "A" | "B"): LiveMatch | null {
  const match = liveMatches.get(id);
  if (!match) return null;

  const battingTeam = team || match.battingTeam;
  const isLegalBall = result !== "NB" && result !== "WD";

  // legal balls for current batting team to determine over/ball position
  const legalBallsForTeam = match.balls.filter(b => b.team === battingTeam && b.result !== "NB" && b.result !== "WD").length;
  const overNum = Math.floor(legalBallsForTeam / 6);
  const ballNum = isLegalBall ? legalBallsForTeam % 6 : -1;

  const ball: Ball = { result, team: battingTeam, over: overNum, ball: ballNum };
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

  // Recalculate overs from all legal deliveries
  const totalLegal = newBalls.filter(b => b.result !== "NB" && b.result !== "WD").length;
  const oversNum = Math.floor(totalLegal / 6);
  const ballsInOver = totalLegal % 6;
  const oversStr = `${oversNum}.${ballsInOver} / ${match.maxOvers}`;

  const updated: LiveMatch = {
    ...match, balls: newBalls, scoreA, scoreB, wicketsA, wicketsB,
    overs: oversStr, battingTeam, updatedAt: new Date().toISOString(),
  };
  liveMatches.set(id, updated);
  broadcast({ type: "score_update", match: updated });
  return updated;
}

/** Broadcast that specific slots on a turf+date just became booked */
export function broadcastSlotUpdate(turfId: string, date: string, slotIds: string[]) {
  broadcast({ type: "slot_update", turfId, date, slotIds });
}

export function deleteMatch(id: string): boolean {
  const existed = liveMatches.has(id);
  if (existed) {
    liveMatches.delete(id);
    broadcast({ type: "match_ended", id });
  }
  return existed;
}

// Seed a sample live match
const sampleId = `match_sample`;
liveMatches.set(sampleId, {
  id: sampleId, turfId: "sample", turfName: "VSY Box Cricket Ground",
  teamA: "Banjara Lions", teamB: "Hitech Hawks",
  scoreA: 87, scoreB: 64, wicketsA: 3, wicketsB: 5,
  overs: "6.2 / 8", battingTeam: "B", maxOvers: 8,
  balls: ["4","1","W","6","0","2"].map((r, i) => ({ result: r, team: "A" as const, over: 0, ball: i })),
  status: "live", startedAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
});
