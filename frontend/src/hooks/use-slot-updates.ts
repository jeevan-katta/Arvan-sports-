import { useEffect, useRef, useCallback } from "react";

interface SlotUpdateMessage {
  type: "slot_update";
  turfId: string;
  date: string;
  slotIds: string[];
}

/**
 * Connects to the shared WebSocket and calls onUpdate whenever a slot_update
 * arrives that matches the given turfId + date.
 * Reuses the same WS path as live scores — the server fans out all message types.
 */
export function useSlotUpdates(
  turfId: string,
  date: string,
  onUpdate: (slotIds: string[]) => void
) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  const connect = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${proto}//${window.location.host}/api/ws`);
    wsRef.current = ws;

    ws.onclose = () => {
      reconnectRef.current = setTimeout(connect, 4000);
    };
    ws.onerror = () => ws.close();
    ws.onmessage = (e) => {
      try {
        const msg: SlotUpdateMessage = JSON.parse(e.data);
        if (msg.type === "slot_update" && msg.turfId === turfId && msg.date === date) {
          onUpdateRef.current(msg.slotIds);
        }
      } catch {}
    };
  }, [turfId, date]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      wsRef.current?.close();
    };
  }, [connect]);
}
