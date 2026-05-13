import { useState, useRef, useEffect } from "react";
import { Bell, MapPin, Loader2, X, CheckCheck, IndianRupee, AlertCircle, CheckCircle2, Info, Megaphone } from "lucide-react";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface HeaderProps {
  title?: string;
  showLocation?: boolean;
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

function UserNotificationBell() {
  const { token } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data: notifications = [] } = useQuery<any[]>({
    queryKey: ["user-notifications"],
    queryFn: () => fetch("/api/user/notifications", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    enabled: !!token,
    refetchInterval: 30_000,
  });

  const unread = Array.isArray(notifications) ? notifications.filter(n => !n.read).length : 0;

  const markAll = useMutation({
    mutationFn: () => fetch("/api/user/notifications/read-all", { method: "PUT", headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user-notifications"] }),
  });

  const markOne = useMutation({
    mutationFn: (id: string) => fetch(`/api/user/notifications/${id}/read`, { method: "PUT", headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user-notifications"] }),
  });

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="relative flex items-center justify-center h-8 w-8 rounded-full hover:bg-muted transition-colors"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-[9px] font-black text-white flex items-center justify-center ring-2 ring-background">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
        {unread === 0 && (
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary ring-2 ring-background" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-80 max-w-[calc(100vw-2rem)] bg-card border border-border rounded-2xl shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              <span className="font-bold text-sm">Notifications</span>
              {unread > 0 && <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">{unread} new</span>}
            </div>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button onClick={() => markAll.mutate()} className="text-xs text-primary hover:underline flex items-center gap-1">
                  <CheckCheck className="h-3 w-3" /> Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {!Array.isArray(notifications) || !notifications.length ? (
              <div className="py-10 text-center">
                <Bell className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-20" />
                <p className="text-sm text-muted-foreground font-bold">No notifications yet</p>
                <p className="text-xs text-muted-foreground mt-1">Announcements and updates will appear here</p>
              </div>
            ) : (
              notifications.map((n: any) => {
                const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.general;
                const Icon = cfg.icon;
                return (
                  <button key={n.id}
                    className={cn("w-full flex items-start gap-3 px-4 py-3 text-left border-b border-border last:border-0 hover:bg-muted/50 transition-colors", !n.read && "bg-primary/5")}
                    onClick={() => { if (!n.read) markOne.mutate(n.id); }}>
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

export function Header({ title = "Arvan Sports", showLocation = true }: HeaderProps) {
  const { city, loading, request } = useGeolocation(true);
  const { token } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border h-14 flex items-center justify-between px-4">
      <div className="flex items-center gap-2">
        {showLocation ? (
          <button onClick={request} className="flex flex-col text-left">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Current Location</span>
            <div className="flex items-center text-sm font-semibold">
              {loading ? (
                <><Loader2 className="h-3 w-3 mr-1 text-primary animate-spin" /> Locating…</>
              ) : (
                <><MapPin className="h-3 w-3 mr-1 text-primary" />{city ?? "Hyderabad"}</>
              )}
            </div>
          </button>
        ) : (
          <h1 className="text-lg font-display font-bold tracking-wide">{title}</h1>
        )}
      </div>
      <div className="flex items-center gap-2">
        {token ? <UserNotificationBell /> : (
          <button className="relative flex items-center justify-center h-8 w-8 rounded-full hover:bg-muted transition-colors">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary ring-2 ring-background" />
          </button>
        )}
      </div>
    </header>
  );
}
