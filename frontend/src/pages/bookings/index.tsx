import React, { useState } from "react";
import { useListBookings } from "@workspace/api-client-react";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, parseISO, isToday, isBefore, startOfDay } from "date-fns";
import { MapPin, Calendar, Clock, ChevronRight, Radio, Timer, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

type FilterKey = "upcoming" | "pending" | "completed" | "cancelled" | "all";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "upcoming", label: "Upcoming" },
  { key: "pending",  label: "Pending" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
  { key: "all",      label: "All" },
];

function to12hr(time: string): string {
  if (!time) return "";
  const [hStr, mStr] = time.split(":");
  const h = parseInt(hStr, 10);
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return mStr === "00" ? `${h12} ${suffix}` : `${h12}:${mStr} ${suffix}`;
}

function isExpiredClient(booking: any) {
  return booking.status === "pending" && booking.expiresAt && new Date(booking.expiresAt) < new Date();
}

export default function Bookings() {
  const { data: bookings, isLoading } = useListBookings();
  const [activeFilter, setActiveFilter] = useState<FilterKey>("upcoming");

  const today = startOfDay(new Date());

  const todayLive = bookings?.filter(b =>
    b.status === "confirmed" && isToday(parseISO(b.date))
  ) ?? [];

  const upcoming = bookings?.filter(b =>
    b.status === "confirmed" && !isToday(parseISO(b.date)) && !isBefore(parseISO(b.date), today)
  ) ?? [];

  const pendingPayment = bookings?.filter(b =>
    b.status === "pending" && !isExpiredClient(b)
  ) ?? [];

  const completed = bookings?.filter(b =>
    b.status === "confirmed" && isBefore(parseISO(b.date), today) && !isToday(parseISO(b.date))
  ) ?? [];

  const cancelled = bookings?.filter(b =>
    b.status === "cancelled" || isExpiredClient(b)
  ) ?? [];

  const counts: Record<FilterKey, number> = {
    upcoming: todayLive.length + upcoming.length,
    pending:  pendingPayment.length,
    completed: completed.length,
    cancelled: cancelled.length,
    all: (bookings?.length ?? 0),
  };

  const showTodayLive  = activeFilter === "upcoming" || activeFilter === "all";
  const showUpcoming   = activeFilter === "upcoming" || activeFilter === "all";
  const showPending    = activeFilter === "pending"  || activeFilter === "all";
  const showCompleted  = activeFilter === "completed" || activeFilter === "all";
  const showCancelled  = activeFilter === "cancelled" || activeFilter === "all";

  const hasAny = bookings && bookings.length > 0;

  const visibleCount =
    (showTodayLive ? todayLive.length : 0) +
    (showUpcoming  ? upcoming.length : 0) +
    (showPending   ? pendingPayment.length : 0) +
    (showCompleted ? completed.length : 0) +
    (showCancelled ? cancelled.length : 0);

  return (
    <div className="flex flex-col min-h-full pb-20">
      <Header title="My Bookings" showLocation={false} />

      {/* Filter chips */}
      <div className="bg-background border-b border-border px-4 py-3">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {FILTERS.map(f => {
            const isActive = activeFilter === f.key;
            const count = counts[f.key];
            return (
              <button
                key={f.key}
                onClick={() => setActiveFilter(f.key)}
                className={cn(
                  "flex-shrink-0 flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-bold transition-all",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {f.label}
                {count > 0 && (
                  <span className={cn(
                    "text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center",
                    isActive ? "bg-white/25 text-white" : "bg-background text-foreground"
                  )}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <main className="flex-1 p-4 space-y-6">
        {isLoading ? (
          [1, 2, 3].map(i => <div key={i} className="h-36 rounded-xl bg-muted animate-pulse" />)
        ) : !hasAny ? (
          <div className="text-center py-20">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-3" />
            <h3 className="font-bold text-lg">No bookings yet</h3>
            <p className="text-muted-foreground text-sm mb-6">You haven't booked any turfs yet.</p>
            <Link href="/turfs">
              <Button className="rounded-xl px-6 h-11 font-bold">Explore Venues</Button>
            </Link>
          </div>
        ) : visibleCount === 0 ? (
          <div className="text-center py-20">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground opacity-40 mb-3" />
            <h3 className="font-bold text-base">No {FILTERS.find(f => f.key === activeFilter)?.label.toLowerCase()} bookings</h3>
            <p className="text-muted-foreground text-sm mt-1">
              {activeFilter === "upcoming" && "Book a turf to get started!"}
              {activeFilter === "pending"  && "No payments pending."}
              {activeFilter === "completed" && "Your completed matches will show here."}
              {activeFilter === "cancelled" && "No cancelled bookings."}
              {activeFilter === "all"       && "No bookings found."}
            </p>
            {activeFilter === "upcoming" && (
              <Link href="/turfs">
                <Button className="mt-5 rounded-xl px-6 h-11 font-bold">Explore Venues</Button>
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* TODAY'S LIVE */}
            {showTodayLive && todayLive.length > 0 && (
              <Section
                icon={<div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />}
                title="Today's Matches"
                titleClass="text-red-600"
              >
                {todayLive.map(b => (
                  <Link key={b.id} href={`/booking/${b.id}`} className="block">
                    <Card className="border-green-500/30 bg-gradient-to-br from-green-50/50 to-emerald-50/20 dark:from-green-950/30 overflow-hidden shadow-sm">
                      <div className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-0.5">
                              <h4 className="font-bold">{b.turfName}</h4>
                              <Badge className="bg-green-500 text-white text-[10px] px-1.5">TODAY</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{b.turfArea}</p>
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex items-center text-sm bg-white/60 dark:bg-background/40 rounded-lg px-3 py-1.5 mb-3">
                          <Clock className="h-3.5 w-3.5 mr-2 text-primary" />
                          <span className="font-semibold">{to12hr(b.startTime ?? "")} – {to12hr(b.endTime ?? "")}</span>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-green-200/50 dark:border-green-900/50">
                          <span className="font-bold text-primary text-lg">₹{b.totalPrice}</span>
                          <Button size="sm" className="h-8 rounded-lg bg-green-600 hover:bg-green-700 gap-1.5 text-xs font-bold">
                            <Radio className="h-3.5 w-3.5" /> Go Live
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </Link>
                ))}
              </Section>
            )}

            {/* PENDING PAYMENT */}
            {showPending && pendingPayment.length > 0 && (
              <Section
                icon={<Timer className="h-4 w-4 text-yellow-600" />}
                title="Pending Payment"
                titleClass="text-yellow-700 dark:text-yellow-500"
              >
                {pendingPayment.map(b => (
                  <BookingCard key={b.id} booking={b} variant="pending" />
                ))}
              </Section>
            )}

            {/* UPCOMING */}
            {showUpcoming && upcoming.length > 0 && (
              <Section
                icon={<CheckCircle2 className="h-4 w-4 text-primary" />}
                title="Upcoming"
                titleClass="text-foreground"
              >
                {upcoming.map(b => (
                  <BookingCard key={b.id} booking={b} variant="upcoming" />
                ))}
              </Section>
            )}

            {/* COMPLETED */}
            {showCompleted && completed.length > 0 && (
              <Section
                icon={<CheckCircle2 className="h-4 w-4 text-muted-foreground" />}
                title="Completed"
                titleClass="text-muted-foreground"
              >
                {completed.map(b => (
                  <BookingCard key={b.id} booking={b} variant="completed" />
                ))}
              </Section>
            )}

            {/* CANCELLED */}
            {showCancelled && cancelled.length > 0 && (
              <Section
                icon={<XCircle className="h-4 w-4 text-destructive" />}
                title="Cancelled"
                titleClass="text-destructive"
              >
                {cancelled.map(b => (
                  <BookingCard key={b.id} booking={b} variant="cancelled" />
                ))}
              </Section>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function Section({ icon, title, titleClass, children }: {
  icon: React.ReactNode;
  title: string;
  titleClass?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h2 className={cn("font-bold text-sm uppercase tracking-wider", titleClass)}>{title}</h2>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function BookingCard({ booking: b, variant }: { booking: any; variant: "pending" | "upcoming" | "completed" | "cancelled" }) {
  const borderClass = {
    pending:   "border-yellow-400/40 hover:border-yellow-400/60",
    upcoming:  "border-primary/20 hover:border-primary/40",
    completed: "border-border hover:border-border",
    cancelled: "border-red-200/40 hover:border-red-200/60",
  }[variant];

  const badgeClass = {
    pending:   "bg-yellow-500/10 text-yellow-700 border-yellow-400/30",
    upcoming:  "bg-primary/10 text-primary border-primary/20",
    completed: "bg-muted text-muted-foreground border-border",
    cancelled: "bg-red-500/10 text-red-600 border-red-300/30",
  }[variant];

  const badgeLabel = {
    pending:   "Pay Now",
    upcoming:  "Confirmed",
    completed: "Completed",
    cancelled: "Cancelled",
  }[variant];

  return (
    <Link href={`/booking/${b.id}`} className="block">
      <Card className={cn("border shadow-sm transition-colors", borderClass)}>
        <div className="flex gap-3 p-4">
          {b.turfImage && (
            <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-muted">
              <img src={b.turfImage} alt={b.turfName} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start mb-1">
              <h4 className="font-bold text-sm leading-tight flex-1 pr-2 truncate">{b.turfName}</h4>
              <Badge variant="outline" className={cn("capitalize text-[10px] font-bold px-2 py-0.5 flex-shrink-0", badgeClass)}>
                {badgeLabel}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
              <MapPin className="h-3 w-3" />{b.turfArea}
            </p>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3 text-primary" />
                {format(parseISO(b.date), "MMM dd, yyyy")}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-primary" />
                {to12hr(b.startTime)}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-bold text-primary">₹{b.totalPrice}</span>
              {variant === "pending" && b.expiresAt && (
                <ExpiryCountdown expiresAt={b.expiresAt} />
              )}
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}

function ExpiryCountdown({ expiresAt }: { expiresAt: string }) {
  const [secondsLeft, setSecondsLeft] = React.useState(
    Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
  );
  React.useEffect(() => {
    const t = setInterval(() => {
      setSecondsLeft(Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)));
    }, 1000);
    return () => clearInterval(t);
  }, [expiresAt]);
  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  return (
    <span className="flex items-center gap-1 text-xs font-bold text-yellow-600">
      <AlertCircle className="h-3 w-3" />
      {mins}:{secs.toString().padStart(2, "0")}
    </span>
  );
}
