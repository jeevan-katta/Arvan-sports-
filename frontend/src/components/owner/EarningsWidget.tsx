import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import {
  Zap, Clock, RefreshCw, Building2, Wallet,
  CalendarCheck2, AlertTriangle, ChevronRight, IndianRupee,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";

const fmtINR = (n: number | undefined | null) =>
  `₹${(n || 0).toLocaleString("en-IN")}`;

const SCHEDULE_CFG = {
  immediate: { label: "Instant Pay",  icon: Zap,      color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/20", dot: "bg-emerald-400", desc: "Paid on every booking" },
  daily:     { label: "Daily Payout", icon: Clock,     color: "text-blue-500",   bg: "bg-blue-500/10 border-blue-500/20",       dot: "bg-blue-400",    desc: "Batch at midnight IST" },
  weekly:    { label: "Weekly",       icon: RefreshCw, color: "text-violet-500", bg: "bg-violet-500/10 border-violet-500/20",   dot: "bg-violet-400",  desc: "Weekly settlement" },
  manual:    { label: "Manual",       icon: Building2, color: "text-foreground/40", bg: "bg-muted border-border",               dot: "bg-muted-foreground/30", desc: "Admin triggers" },
} as const;

function StatusPill({ schedule, held }: { schedule: string; held: boolean }) {
  const cfg = SCHEDULE_CFG[schedule as keyof typeof SCHEDULE_CFG] ?? SCHEDULE_CFG.manual;
  const Icon = cfg.icon;
  if (held) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500">
        <AlertTriangle className="h-3 w-3" /> PAYOUT HELD
      </span>
    );
  }
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-lg border", cfg.bg, cfg.color)}>
      <Icon className="h-3 w-3" /> {cfg.label}
    </span>
  );
}

function LiveDot({ refreshedAt }: { refreshedAt: Date | null }) {
  const [pulse, setPulse] = useState(false);
  const prev = useRef<Date | null>(null);

  useEffect(() => {
    if (refreshedAt && refreshedAt !== prev.current) {
      prev.current = refreshedAt;
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 1200);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [refreshedAt]);

  return (
    <span className={cn("inline-flex items-center gap-1 text-[10px] font-bold transition-colors duration-300",
      pulse ? "text-emerald-500" : "text-muted-foreground/40")}>
      <span className={cn("h-1.5 w-1.5 rounded-full transition-all duration-300",
        pulse ? "bg-emerald-500 scale-125" : "bg-muted-foreground/25")} />
      LIVE
    </span>
  );
}

function CountUp({ to, duration = 600 }: { to: number; duration?: number }) {
  const [val, setVal] = useState(0);
  const prevTo = useRef(0);

  useEffect(() => {
    if (to === prevTo.current) return undefined;
    const start = prevTo.current;
    const diff = to - start;
    prevTo.current = to;
    if (diff === 0) return undefined;
    const steps = 20;
    let step = 0;
    const iv = setInterval(() => {
      step++;
      setVal(Math.round(start + diff * (step / steps)));
      if (step >= steps) clearInterval(iv);
    }, duration / steps);
    return () => clearInterval(iv);
  }, [to, duration]);

  return <>{val.toLocaleString("en-IN")}</>;
}

function BookingRow({ b }: { b: any }) {
  const isPaid = b.paymentStatus === "paid";
  const isCancelled = b.status === "cancelled";
  return (
    <div className={cn("flex items-center gap-3 py-2.5 border-b border-border/50 last:border-0",
      isCancelled && "opacity-40")}>
      {/* Time bubble */}
      <div className="flex-shrink-0 text-center">
        <p className="text-[11px] font-black text-foreground leading-tight">{b.startTime}</p>
        <p className="text-[9px] text-muted-foreground">{b.endTime}</p>
      </div>
      {/* Divider */}
      <div className="h-8 w-px bg-border flex-shrink-0" />
      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-foreground truncate">{b.turfName}</p>
        <p className="text-[10px] text-muted-foreground truncate">{b.userName || "Guest"}</p>
      </div>
      {/* Right */}
      <div className="text-right flex-shrink-0">
        <p className={cn("text-xs font-black", isPaid ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground/50")}>
          {fmtINR(b.totalPrice)}
        </p>
        <p className={cn("text-[9px] font-bold uppercase",
          isCancelled ? "text-red-500" : isPaid ? "text-emerald-600 dark:text-emerald-400" : "text-amber-500")}>
          {isCancelled ? "cancelled" : isPaid ? "paid" : "pending"}
        </p>
      </div>
    </div>
  );
}

export default function EarningsWidget() {
  const { token } = useAuth();
  const [, navigate] = useLocation();
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);
  const [lastVal, setLastVal] = useState(0);
  const [showAll, setShowAll] = useState(false);

  const { data, dataUpdatedAt, isLoading } = useQuery<any>({
    queryKey: ["owner-today"],
    queryFn: async () => {
      const r = await fetch("/api/owner/today", {
        headers: { Authorization: `Bearer ${token}` },
      });
      return r.json();
    },
    enabled: !!token,
    refetchInterval: 30_000,
    staleTime: 25_000,
  });

  useEffect(() => {
    if (dataUpdatedAt) setRefreshedAt(new Date(dataUpdatedAt));
  }, [dataUpdatedAt]);

  // Animate revenue bump when it changes
  const todayRevenue = data?.todayRevenue ?? 0;
  useEffect(() => { setLastVal(todayRevenue); }, [todayRevenue]);

  const schedule = data?.payoutSchedule ?? "manual";
  const held     = data?.commissionHeld ?? false;
  const pending  = data?.pendingPayout ?? 0;
  const cut      = data?.todayOwnerCut ?? 0;
  const cfg      = SCHEDULE_CFG[schedule as keyof typeof SCHEDULE_CFG] ?? SCHEDULE_CFG.manual;

  const bookings: any[] = data?.todayBookingList ?? [];
  const visible = showAll ? bookings : bookings.slice(0, 3);

  // Skeleton
  if (isLoading) {
    return (
      <div className="rounded-3xl border border-border bg-card p-4 space-y-3 animate-pulse">
        <div className="h-4 w-32 bg-muted rounded-lg" />
        <div className="h-12 w-48 bg-muted rounded-xl" />
        <div className="grid grid-cols-3 gap-2">
          {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-muted rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-border bg-card overflow-hidden shadow-sm">
      {/* ── Gradient header band ── */}
      <div className={cn("relative px-4 pt-4 pb-5",
        held
          ? "bg-gradient-to-br from-red-500/[0.08] to-transparent"
          : pending > 0
            ? "bg-gradient-to-br from-primary/[0.07] to-transparent"
            : "bg-gradient-to-br from-emerald-500/[0.07] to-transparent")}>

        {/* Top row: title + LIVE dot */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CalendarCheck2 className="h-4 w-4 text-primary" />
            <p className="text-xs font-black uppercase tracking-wider text-foreground/60">Today's Earnings</p>
          </div>
          <LiveDot refreshedAt={refreshedAt} />
        </div>

        {/* Big revenue number */}
        <div className="flex items-end gap-3 mb-3">
          <div>
            <p className="text-[11px] text-muted-foreground font-medium mb-0.5">Gross collected today</p>
            <p className="text-4xl font-black text-foreground tracking-tight">
              ₹<CountUp to={todayRevenue} />
            </p>
            {cut > 0 && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">
                Your cut: {fmtINR(cut)} ({100 - (data?.commissionRate ?? 20)}%)
              </p>
            )}
          </div>
        </div>

        {/* Status pills row */}
        <div className="flex items-center gap-2 flex-wrap">
          <StatusPill schedule={schedule} held={held} />
          {!held && (
            <span className={cn("inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg",
              pending > 0 ? "bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400" : "bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400")}>
              <IndianRupee className="h-2.5 w-2.5" />
              {pending > 0 ? `${fmtINR(pending)} pending` : "All settled"}
            </span>
          )}
        </div>

        {/* Last payout footnote */}
        {data?.lastPayout && (
          <p className="text-[10px] text-muted-foreground/50 mt-2">
            Last payout: <span className="font-bold text-muted-foreground/70">{fmtINR(data.lastPayout.amount)}</span>
            {data.lastPayout.date && ` · ${format(parseISO(data.lastPayout.date), "dd MMM")}`}
          </p>
        )}
      </div>

      {/* ── 3 mini stat cards ── */}
      <div className="grid grid-cols-3 gap-2 px-4 py-3 border-b border-border">
        {[
          {
            label: "Bookings",
            value: data?.todayTotalBookings ?? 0,
            sub: `${data?.todayPaidBookings ?? 0} paid`,
            icon: CalendarCheck2,
            color: "text-primary",
            bg: "bg-primary/10",
          },
          {
            label: "Upcoming",
            value: data?.todayUpcomingSlots ?? 0,
            sub: "slots left today",
            icon: Clock,
            color: "text-violet-500",
            bg: "bg-violet-500/10",
          },
          {
            label: "Pending",
            value: fmtINR(pending),
            sub: cfg.desc,
            icon: cfg.icon,
            color: held ? "text-red-500" : pending > 0 ? "text-amber-500" : "text-emerald-500",
            bg: held ? "bg-red-500/10" : pending > 0 ? "bg-amber-500/10" : "bg-emerald-500/10",
            isStr: true,
          },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="bg-muted/50 rounded-2xl p-3 flex flex-col gap-1">
              <div className={cn("h-7 w-7 rounded-xl flex items-center justify-center", s.bg)}>
                <Icon className={cn("h-3.5 w-3.5", s.color)} />
              </div>
              <p className={cn("font-black text-foreground", s.isStr ? "text-sm" : "text-xl leading-tight")}>
                {s.isStr ? s.value : <CountUp to={s.value as number} />}
              </p>
              <p className="text-[9px] text-muted-foreground leading-tight">{s.sub}</p>
              <p className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-wide">{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* ── Today's booking list ── */}
      <div className="px-4 pt-3 pb-2">
        <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/50 mb-1">
          {bookings.length > 0 ? `${bookings.length} booking${bookings.length > 1 ? "s" : ""} today` : "No bookings today"}
        </p>

        {bookings.length === 0 ? (
          <div className="py-4 text-center">
            <CalendarCheck2 className="h-8 w-8 mx-auto mb-2 text-muted-foreground/20" />
            <p className="text-xs text-muted-foreground/40">Bookings will appear here in real time</p>
          </div>
        ) : (
          <>
            {visible.map((b: any) => <BookingRow key={b.id} b={b} />)}
            {bookings.length > 3 && (
              <button
                onClick={() => setShowAll(s => !s)}
                className="w-full text-center text-[11px] font-bold text-primary py-2 hover:opacity-70 transition-opacity">
                {showAll ? "Show less" : `+${bookings.length - 3} more`}
              </button>
            )}
          </>
        )}
      </div>

      {/* ── Footer action ── */}
      <button
        onClick={() => navigate("/owner/payout")}
        className="w-full flex items-center justify-between px-4 py-3 border-t border-border hover:bg-muted/40 transition-colors group">
        <div className="flex items-center gap-2">
          <Wallet className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-bold text-foreground/70 group-hover:text-foreground transition-colors">
            View full payout dashboard
          </span>
        </div>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
      </button>
    </div>
  );
}
