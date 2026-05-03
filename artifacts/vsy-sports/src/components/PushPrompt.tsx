import { useState, useEffect } from "react";
import { Bell, BellOff, X } from "lucide-react";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

const DISMISSED_KEY = "vsy_push_dismissed";

export function PushPrompt() {
  const { token } = useAuth();
  const { isSupported, permission, subscribed, loading, subscribe } = usePushNotifications();
  const [dismissed, setDismissed] = useState(true);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Only show after a short delay and if not dismissed before
    if (!token) return;
    const wasDeclined = localStorage.getItem(DISMISSED_KEY);
    if (!wasDeclined) {
      const t = setTimeout(() => setDismissed(false), 1500);
      return () => clearTimeout(t);
    }
  }, [token]);

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "1");
    setDismissed(true);
  };

  const handleEnable = async () => {
    const ok = await subscribe();
    if (ok) {
      setDone(true);
      setTimeout(dismiss, 2000);
    } else {
      dismiss();
    }
  };

  // Don't show if: not supported, already subscribed, permission denied, dismissed, or not logged in
  if (!isSupported || subscribed || permission === "denied" || dismissed || !token) return null;

  return (
    <div className={cn(
      "fixed bottom-20 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm z-50",
      "bg-card border border-border rounded-2xl shadow-2xl shadow-black/20 p-4",
      "animate-in slide-in-from-bottom-4 duration-300"
    )}>
      {done ? (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-bold text-sm">Notifications enabled!</p>
            <p className="text-xs text-muted-foreground mt-0.5">You'll get alerts even when the app is closed</p>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm">Enable push notifications</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Get announcements, booking updates, and tournament alerts directly on your device
            </p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleEnable}
                disabled={loading}
                className="flex-1 h-9 bg-primary text-primary-foreground text-xs font-bold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {loading ? "Enabling…" : "Enable Notifications"}
              </button>
              <button
                onClick={dismiss}
                className="h-9 w-9 flex items-center justify-center rounded-xl bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Compact toggle for profile/settings page
export function PushToggle() {
  const { isSupported, permission, subscribed, loading, subscribe, unsubscribe } = usePushNotifications();
  const { token } = useAuth();

  if (!isSupported || !token) return null;

  const handleToggle = () => {
    if (subscribed) unsubscribe();
    else subscribe();
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading || permission === "denied"}
      className={cn(
        "flex items-center gap-3 w-full px-4 py-3 rounded-2xl border transition-all",
        subscribed
          ? "bg-primary/5 border-primary/20 text-primary"
          : "bg-muted/50 border-border text-muted-foreground hover:border-primary/30"
      )}
    >
      {subscribed
        ? <Bell className="h-4 w-4 flex-shrink-0" />
        : <BellOff className="h-4 w-4 flex-shrink-0" />
      }
      <div className="flex-1 text-left">
        <p className="text-sm font-bold">
          {permission === "denied"
            ? "Notifications blocked"
            : subscribed ? "Push notifications on" : "Push notifications off"
          }
        </p>
        <p className="text-xs opacity-60 mt-0.5">
          {permission === "denied"
            ? "Enable in browser settings to receive alerts"
            : subscribed
              ? "You'll receive alerts on this device"
              : "Tap to get alerts even when app is closed"
          }
        </p>
      </div>
      {permission !== "denied" && (
        <div className={cn(
          "h-5 w-9 rounded-full transition-all flex-shrink-0 relative",
          subscribed ? "bg-primary" : "bg-muted-foreground/30"
        )}>
          <div className={cn(
            "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all",
            subscribed ? "right-0.5" : "left-0.5"
          )} />
        </div>
      )}
    </button>
  );
}
