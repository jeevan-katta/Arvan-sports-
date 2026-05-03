import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./use-auth";

const SW_PATH = "/sw.js";

type PermissionState = "default" | "granted" | "denied" | "unsupported";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

export function usePushNotifications() {
  const { token } = useAuth();
  const [permission, setPermission] = useState<PermissionState>(
    typeof Notification !== "undefined" ? (Notification.permission as PermissionState) : "unsupported"
  );
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading]       = useState(false);

  const isSupported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;

  // Check current subscription state on mount
  useEffect(() => {
    if (!isSupported || !token) return;
    navigator.serviceWorker.ready.then(reg =>
      reg.pushManager.getSubscription().then(sub => setSubscribed(!!sub))
    ).catch(() => {});
  }, [isSupported, token]);

  // Register service worker once
  useEffect(() => {
    if (!isSupported) return;
    navigator.serviceWorker.register(SW_PATH).catch(() => {});
  }, [isSupported]);

  const subscribe = useCallback(async () => {
    if (!isSupported || !token) return false;
    setLoading(true);
    try {
      // 1. Request permission
      const perm = await Notification.requestPermission();
      setPermission(perm as PermissionState);
      if (perm !== "granted") { setLoading(false); return false; }

      // 2. Get VAPID public key from server
      const keyRes  = await fetch("/api/push/vapid-key");
      const { publicKey } = await keyRes.json();

      // 3. Subscribe via PushManager
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      // 4. Send subscription to backend
      const subJson = sub.toJSON();
      const saveRes = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          endpoint: subJson.endpoint,
          keys: { p256dh: subJson.keys?.p256dh, auth: subJson.keys?.auth },
        }),
      });
      if (saveRes.ok) { setSubscribed(true); setLoading(false); return true; }
      throw new Error("Failed to save subscription");
    } catch {
      setLoading(false);
      return false;
    }
  }, [isSupported, token]);

  const unsubscribe = useCallback(async () => {
    if (!isSupported || !token) return;
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/unsubscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setSubscribed(false);
    } finally {
      setLoading(false);
    }
  }, [isSupported, token]);

  return { isSupported, permission, subscribed, loading, subscribe, unsubscribe };
}
