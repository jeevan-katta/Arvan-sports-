import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Bell, X, CheckCheck, IndianRupee, AlertCircle, CheckCircle2, Info, Megaphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface Notif {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  amount?: number;
  createdAt: string;
}

const TYPE_CONFIG: Record<string, { icon: any; color: string; bg: string }> = {
  payout_received:  { icon: IndianRupee,  color: "text-emerald-500", bg: "bg-emerald-500/10" },
  account_held:     { icon: AlertCircle,  color: "text-red-500",     bg: "bg-red-500/10"     },
  account_released: { icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  turf_approved:    { icon: CheckCircle2, color: "text-primary",     bg: "bg-primary/10"     },
  turf_rejected:    { icon: AlertCircle,  color: "text-red-500",     bg: "bg-red-500/10"     },
  announcement:     { icon: Megaphone,    color: "text-primary",     bg: "bg-primary/10"     },
  general:          { icon: Info,         color: "text-blue-500",    bg: "bg-blue-500/10"    },
};

function apiFetch(path: string, token: string, method = "GET") {
  return fetch(path, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  }).then(r => r.json());
}

export function NotificationBell() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const { data: notifications = [] } = useQuery<Notif[]>({
    queryKey: ["owner-notifications"],
    queryFn: () => apiFetch("/api/owner/notifications", token || ""),
    enabled: !!token,
    refetchInterval: 30_000,
  });

  const unread = notifications.filter(n => !n.read).length;

  const markAllMutation = useMutation({
    mutationFn: () => apiFetch("/api/owner/notifications/read-all", token || "", "PUT"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["owner-notifications"] }),
  });

  const markOneMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/owner/notifications/${id}/read`, token || "", "PUT"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["owner-notifications"] }),
  });

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(v => !v)}
        className="relative flex items-center justify-center h-8 w-8 rounded-full hover:bg-muted transition-colors"
      >
        <Bell className="h-4 w-4 text-muted-foreground" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-[9px] font-black text-white flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-80 max-w-[calc(100vw-2rem)] bg-card border border-border rounded-2xl shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              <span className="font-bold text-sm">Notifications</span>
              {unread > 0 && (
                <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
                  {unread} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button onClick={() => markAllMutation.mutate()} className="text-xs text-primary hover:underline flex items-center gap-1">
                  <CheckCheck className="h-3 w-3" /> Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-10 text-center">
                <Bell className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-20" />
                <p className="text-sm text-muted-foreground font-bold">No notifications yet</p>
                <p className="text-xs text-muted-foreground mt-1">You'll be notified about payouts, account updates, and announcements</p>
              </div>
            ) : (
              notifications.map(n => {
                const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.general;
                const Icon = cfg.icon;
                return (
                  <button
                    key={n.id}
                    className={cn(
                      "w-full flex items-start gap-3 px-4 py-3 text-left border-b border-border last:border-0 hover:bg-muted/50 transition-colors",
                      !n.read && "bg-primary/5"
                    )}
                    onClick={() => { if (!n.read) markOneMutation.mutate(n.id); }}
                  >
                    <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5", cfg.bg)}>
                      <Icon className={cn("h-4 w-4", cfg.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={cn("text-xs font-bold truncate", !n.read && "text-foreground")}>{n.title}</p>
                        {!n.read && <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
