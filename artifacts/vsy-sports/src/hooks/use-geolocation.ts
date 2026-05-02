import { useState, useEffect, useCallback } from "react";

export type GeolocationState = {
  lat: number | null;
  lng: number | null;
  city: string | null;
  loading: boolean;
  error: string | null;
  permission: PermissionState | null;
};

const CACHE_KEY = "vsy_geolocation";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCached(): { lat: number; lng: number; city: string; ts: number } | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (Date.now() - cached.ts > CACHE_TTL) { sessionStorage.removeItem(CACHE_KEY); return null; }
    return cached;
  } catch { return null; }
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
    const data = await res.json();
    return data.address?.city || data.address?.town || data.address?.village || data.address?.state_district || "Nearby";
  } catch {
    return "Nearby";
  }
}

export function useGeolocation(autoRequest = false) {
  const cached = getCached();
  const [state, setState] = useState<GeolocationState>({
    lat: cached?.lat ?? null,
    lng: cached?.lng ?? null,
    city: cached?.city ?? null,
    loading: false,
    error: null,
    permission: null,
  });

  const request = useCallback(() => {
    if (!navigator.geolocation) {
      setState(s => ({ ...s, error: "Geolocation not supported", loading: false }));
      return;
    }
    const cached = getCached();
    if (cached) {
      setState(s => ({ ...s, lat: cached.lat, lng: cached.lng, city: cached.city, loading: false, error: null }));
      return;
    }
    setState(s => ({ ...s, loading: true, error: null }));
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const city = await reverseGeocode(lat, lng);
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({ lat, lng, city, ts: Date.now() }));
        setState(s => ({ ...s, lat, lng, city, loading: false, error: null }));
      },
      (err) => {
        const msg = err.code === 1 ? "Location permission denied" : "Could not get location";
        setState(s => ({ ...s, loading: false, error: msg }));
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
    );
  }, []);

  useEffect(() => {
    if (autoRequest) {
      const cached = getCached();
      if (cached) {
        setState(s => ({ ...s, lat: cached.lat, lng: cached.lng, city: cached.city }));
        return;
      }
      navigator.permissions?.query({ name: "geolocation" }).then((result) => {
        setState(s => ({ ...s, permission: result.state }));
        if (result.state === "granted") request();
      }).catch(() => {});
    }
  }, [autoRequest, request]);

  return { ...state, request };
}
