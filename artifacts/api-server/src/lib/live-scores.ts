import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage } from "http";
import { Server } from "http";
import { logger } from "./logger";

export interface LiveMatch {
  id: string;
  turfId: number;
  turfName: string;
  teamA: string;
  teamB: string;
  scoreA: number;
  scoreB: number;
  overs: string;
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
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}

export function getAllMatches(): LiveMatch[] {
  return Array.from(liveMatches.values());
}

export function getMatch(id: string): LiveMatch | undefined {
  return liveMatches.get(id);
}

export function createMatch(data: Omit<LiveMatch, "id" | "startedAt" | "updatedAt">): LiveMatch {
  const id = `match_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const now = new Date().toISOString();
  const match: LiveMatch = { ...data, id, startedAt: now, updatedAt: now };
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

export function deleteMatch(id: string): boolean {
  const existed = liveMatches.has(id);
  if (existed) {
    liveMatches.delete(id);
    broadcast({ type: "match_ended", id });
  }
  return existed;
}

// Seed a sample live match so the UI has data
const sampleId = `match_sample`;
liveMatches.set(sampleId, {
  id: sampleId,
  turfId: 1,
  turfName: "VSY Box Cricket Ground",
  teamA: "Banjara Lions",
  teamB: "Hitech Hawks",
  scoreA: 87,
  scoreB: 64,
  overs: "6.2 / 8",
  status: "live",
  startedAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});
