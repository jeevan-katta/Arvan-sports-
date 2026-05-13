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

  const fetchSlots = useCallback(async () => {
    try {
      const res = await fetch(`/api/turfs/${turfId}/slots?date=${date}`);
      if (res.ok) {
        const slots = await res.json();
        // Extract the IDs of slots that are booked or reserved
        const bookedSlotIds = slots.filter((s: any) => s.isBooked).map((s: any) => s.id);
        onUpdateRef.current(bookedSlotIds);
      }
    } catch (err) {
      console.error("Failed to poll slots:", err);
    }
  }, [turfId, date]);

  const connect = useCallback(() => {
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) return;
    
    const isVercel = window.location.hostname.includes("vercel.app");
    if (isVercel) return;

    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${proto}//${window.location.host}/api/ws`);
    wsRef.current = ws;

    ws.onclose = () => {
      reconnectRef.current = setTimeout(connect, 10000);
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

  // Polling Fallback
  useEffect(() => {
    const pollInterval = setInterval(() => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        fetchSlots();
      }
    }, 10000); // Poll every 10s for slots

    return () => clearInterval(pollInterval);
  }, [fetchSlots]);
}
