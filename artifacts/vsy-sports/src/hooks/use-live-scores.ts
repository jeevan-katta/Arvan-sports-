import { useState, useEffect, useRef, useCallback } from "react";

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
