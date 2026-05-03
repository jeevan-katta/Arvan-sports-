import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, User, Clock, IndianRupee, ChevronLeft, ChevronRight, PlayCircle, Hourglass, CheckCircle2, Building2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, parseISO, addDays, subDays } from "date-fns";

interface Turf {
  id: string;
  name: string;
  area: string;
}

interface Booking {
  id: string;
  turfId: string;
  turfName: string;
  turfArea: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  date: string;
  startTime: string;
  endTime: string;
  totalPrice: number;
  status: string;
  paymentStatus: string;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function getSlotStatus(booking: Booking, now: Date): "past" | "running" | "upcoming" | "other" {
  const today = format(now, "yyyy-MM-dd");
  if (booking.date !== today) return "other";
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const startMins = timeToMinutes(booking.startTime);
  const endMins = timeToMinutes(booking.endTime);
  if (nowMins >= startMins && nowMins < endMins) return "running";
  if (nowMins < startMins) return "upcoming";
  return "past";
}

const SLOT_BADGE: Record<string, { label: string; cls: string; icon: any }> = {
  running:  { label: "Running Now",  cls: "bg-green-500/15 text-green-600 border-green-500/30",  icon: PlayCircle   },
  upcoming: { label: "Upcoming",     cls: "bg-blue-500/15 text-blue-600 border-blue-500/30",     icon: Hourglass    },
  past:     { label: "Completed",    cls: "bg-muted text-muted-foreground border-border",         icon: CheckCircle2 },
  other:    { label: "",             cls: "",                                                      icon: null         },
};

export default function OwnerBookings() {
  const token = localStorage.getItem("vsy_token") || "";
  const now = new Date();
  const todayStr = format(now, "yyyy-MM-dd");

  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [showAll, setShowAll] = useState(false);
  const [selectedTurfId, setSelectedTurfId] = useState<string>("");

  const isToday = selectedDate === todayStr;

  // Fetch owner's turfs for the filter
  const { data: turfs = [] } = useQuery<Turf[]>({
    queryKey: ["owner-turfs-list"],
    queryFn: () =>
      fetch("/api/owner/turfs", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    enabled: !!token,
  });

  const prevDay = () => setSelectedDate(d => format(subDays(parseISO(d), 1), "yyyy-MM-dd"));
  const nextDay = () => {
    if (selectedDate >= todayStr) return;
    setSelectedDate(d => format(addDays(parseISO(d), 1), "yyyy-MM-dd"));
  };
  const goToday = () => { setSelectedDate(todayStr); setShowAll(false); };

  const queryParams = new URLSearchParams({ date: selectedDate });
  if (selectedTurfId) queryParams.set("turfId", selectedTurfId);

  const { data: bookings = [], isLoading } = useQuery<Booking[]>({
    queryKey: ["owner-bookings", selectedDate, selectedTurfId],
    queryFn: () =>
      fetch(`/api/owner/bookings?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.json()),
    enabled: !!token,
  });

  const now2 = new Date();
  const annotated = bookings.map(b => ({
    ...b,
    _slot: getSlotStatus(b, now2),
  }));

  let displayed = annotated;
  if (isToday && !showAll) {
    displayed = annotated.filter(b => b._slot === "running" || b._slot === "upcoming");
  }

  displayed = [...displayed].sort((a, b) => {
    const order = { running: 0, upcoming: 1, past: 2, other: 3 };
    const oa = order[a._slot]; const ob = order[b._slot];
    if (oa !== ob) return oa - ob;
    return a.startTime.localeCompare(b.startTime);
  });

  const pastCount = isToday ? annotated.filter(b => b._slot === "past").length : 0;
  const showTurfFilter = turfs.length > 1;

  if (isLoading) return <div className="p-6 text-center text-muted-foreground">Loading bookings...</div>;

  return (
    <div className="p-4 space-y-4 pb-8">
      <div className="pt-2">
        <h2 className="text-xl font-display font-bold">Bookings</h2>
        <p className="text-muted-foreground text-sm">
          {bookings.length} booking{bookings.length !== 1 ? "s" : ""} on this day
          {selectedTurfId && turfs.length > 0 && (
            <span> · {turfs.find(t => t.id === selectedTurfId)?.name}</span>
          )}
        </p>
      </div>

      {/* Turf filter — only shown when owner has 2+ turfs */}
      {showTurfFilter && (
        <div className="flex gap-2 overflow-x-auto pb-0.5 no-scrollbar">
          <button
            onClick={() => setSelectedTurfId("")}
            className={`flex-shrink-0 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border font-bold transition-all whitespace-nowrap ${
              !selectedTurfId
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted text-muted-foreground border-border"
            }`}
          >
            <Building2 className="h-3 w-3" /> All Turfs
          </button>
          {turfs.map(t => (
            <button
              key={t.id}
              onClick={() => setSelectedTurfId(t.id)}
              className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-xl border font-bold transition-all whitespace-nowrap ${
                selectedTurfId === t.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted text-muted-foreground border-border"
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>
      )}

      {/* Date navigator */}
      <div className="flex items-center justify-between bg-muted/60 rounded-2xl p-3">
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={prevDay}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-center flex-1">
          <p className="font-bold text-sm">
            {isToday ? "Today" : format(parseISO(selectedDate), "EEEE")}
          </p>
          <p className="text-xs text-muted-foreground">{format(parseISO(selectedDate), "dd MMM yyyy")}</p>
        </div>
        <Button
          variant="ghost" size="icon"
          className="h-8 w-8 rounded-xl"
          onClick={nextDay}
          disabled={isToday}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Jump to today */}
      {!isToday && (
        <Button variant="outline" size="sm" className="w-full h-8 text-xs" onClick={goToday}>
          Jump to Today
        </Button>
      )}

      {/* Today: upcoming/running filter toggle */}
      {isToday && bookings.length > 0 && (
        <div className="flex gap-2">
          <button
            onClick={() => setShowAll(false)}
            className={`flex-1 text-xs py-1.5 rounded-xl border font-bold transition-all ${
              !showAll ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground border-border"
            }`}
          >
            Upcoming & Running
          </button>
          <button
            onClick={() => setShowAll(true)}
            className={`flex-1 text-xs py-1.5 rounded-xl border font-bold transition-all ${
              showAll ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground border-border"
            }`}
          >
            All Today
          </button>
        </div>
      )}

      {/* Booking list */}
      {displayed.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 text-center">
          <CalendarDays className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <p className="font-bold text-muted-foreground">
            {isToday && !showAll ? "No upcoming bookings for today" : "No bookings on this day"}
          </p>
          {isToday && !showAll && pastCount > 0 && (
            <button onClick={() => setShowAll(true)} className="text-xs text-primary mt-2 underline">
              View {pastCount} completed booking{pastCount > 1 ? "s" : ""}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map(b => {
            const slotCfg = SLOT_BADGE[b._slot];
            const SlotIcon = slotCfg?.icon;
            return (
              <Card key={b.id} className="p-4 border-none shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-bold text-sm">{b.turfName}</p>
                    <p className="text-xs text-muted-foreground">{b.turfArea}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    {isToday && slotCfg?.label && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${slotCfg.cls}`}>
                        {SlotIcon && <SlotIcon className="h-2.5 w-2.5" />}
                        {slotCfg.label}
                      </span>
                    )}
                    <Badge
                      variant={b.paymentStatus === "paid" ? "default" : "outline"}
                      className="text-[10px]"
                    >
                      {b.paymentStatus === "paid" ? "Paid" : "Unpaid"}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-1.5 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="h-3.5 w-3.5" />
                    <span>{b.userName || "—"}</span>
                    {b.userPhone && <span className="text-xs">· {b.userPhone}</span>}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    <span className="font-medium">{b.startTime} – {b.endTime}</span>
                  </div>
                  <div className="flex items-center gap-2 font-bold text-primary">
                    <IndianRupee className="h-3.5 w-3.5" />
                    <span>₹{b.totalPrice}</span>
                  </div>
                </div>
              </Card>
            );
          })}

          {isToday && !showAll && pastCount > 0 && (
            <button
              onClick={() => setShowAll(true)}
              className="w-full text-xs text-muted-foreground py-2 border border-dashed border-border rounded-xl hover:border-primary hover:text-primary transition-colors"
            >
              + {pastCount} completed booking{pastCount > 1 ? "s" : ""} — tap to show
            </button>
          )}
        </div>
      )}
    </div>
  );
}
