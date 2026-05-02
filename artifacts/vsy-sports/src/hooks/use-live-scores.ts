import { useState, useEffect, useRef, useCallback } from "react";

export interface Ball {
  result: string;
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

type WsMessage =
  | { type: "init"; matches: LiveMatch[] }
  | { type: "match_created"; match: LiveMatch }
  | { type: "score_update"; match: LiveMatch }
  | { type: "match_ended"; id: string };

export function useLiveScores() {
  const [matches, setMatches] = useState<LiveMatch[]>([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;

    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${proto}//${window.location.host}/api/ws`);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => {
      setConnected(false);
      reconnectTimer.current = setTimeout(connect, 3000);
    };
    ws.onerror = () => ws.close();
    ws.onmessage = (e) => {
      try {
        const msg: WsMessage = JSON.parse(e.data);
        if (msg.type === "init") {
          setMatches(msg.matches);
        } else if (msg.type === "match_created") {
          setMatches((prev) => [...prev, msg.match]);
        } else if (msg.type === "score_update") {
          setMatches((prev) => prev.map((m) => (m.id === msg.match.id ? msg.match : m)));
        } else if (msg.type === "match_ended") {
          setMatches((prev) => prev.filter((m) => m.id !== msg.id));
        }
      } catch {}
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { matches, connected };
}

/** Returns colored dot class for a ball result */
export function ballColor(result: string): string {
  if (result === "6") return "bg-purple-500 text-white";
  if (result === "4") return "bg-blue-500 text-white";
  if (result === "W") return "bg-red-500 text-white";
  if (result === "NB" || result === "WD") return "bg-yellow-500 text-black";
  if (result === "0") return "bg-muted text-muted-foreground";
  return "bg-green-500 text-white";
}
