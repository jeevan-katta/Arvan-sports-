import { useState, useEffect, useRef, useCallback } from "react";

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

export interface AppNotification {
  id: string;
  type: "new_post" | "match_live";
  message: string;
  area?: string;
  at: number;
}

type WsMessage =
  | { type: "init"; matches: LiveMatch[] }
  | { type: "match_created"; match: LiveMatch }
  | { type: "score_update"; match: LiveMatch }
  | { type: "match_ended"; id: string }
  | { type: "notification"; notifType: "new_post" | "match_live"; message: string; post?: any; match?: LiveMatch };

export function useLiveScores() {
  const [matches, setMatches] = useState<LiveMatch[]>([]);
  const [connected, setConnected] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const addNotification = useCallback((n: Omit<AppNotification, "id" | "at">) => {
    const notif: AppNotification = { ...n, id: Math.random().toString(36).slice(2), at: Date.now() };
    setNotifications(prev => [notif, ...prev].slice(0, 20));
    // Browser notification (if permission granted)
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      new Notification("Arvan Sports", { body: notif.message, icon: "/logo.png" });
    }
  }, []);

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
          addNotification({ type: "match_live", message: `🔴 Match going live: ${msg.match.teamA} vs ${msg.match.teamB}` });
        } else if (msg.type === "score_update") {
          setMatches((prev) => prev.map((m) => (m.id === msg.match.id ? msg.match : m)));
        } else if (msg.type === "match_ended") {
          setMatches((prev) => prev.filter((m) => m.id !== msg.id));
        } else if (msg.type === "notification") {
          addNotification({ type: msg.notifType, message: msg.message });
        }
      } catch {}
    };
  }, [addNotification]);

  // Request browser notification permission on mount
  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const clearNotifications = useCallback(() => setNotifications([]), []);

  return { matches, connected, notifications, clearNotifications };
}

export function ballColor(result: string): string {
  if (result === "6") return "bg-purple-500 text-white";
  if (result === "4") return "bg-blue-500 text-white";
  if (result === "W") return "bg-red-500 text-white";
  if (result === "NB" || result === "WD") return "bg-yellow-500 text-black";
  if (result === "0") return "bg-muted text-muted-foreground";
  return "bg-green-500 text-white";
}

export function formatOvers(legalBalls: number): string {
  return `${Math.floor(legalBalls / 6)}.${legalBalls % 6}`;
}
