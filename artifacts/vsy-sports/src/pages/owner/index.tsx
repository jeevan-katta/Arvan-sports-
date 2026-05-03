import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2, CalendarDays, TrendingUp, IndianRupee, Clock, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { format, parseISO } from "date-fns";
import EarningsWidget from "@/components/owner/EarningsWidget";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

interface RevenueStats {
  totalRevenue: number;
  totalBookings: number;
  confirmedBookings: number;
  pendingBookings: number;
  perTurf: { turfId: string; turfName: string; totalBookings: number; confirmedBookings: number; revenue: number }[];
}

interface Booking {
  id: string;
  turfName: string;
  turfArea: string;
  userName: string;
  date: string;
  startTime: string;
  endTime: string;
  totalPrice: number;
  status: string;
  paymentStatus: string;
}

function apiFetch(path: string, token: string) {
  return fetch(path, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json());
}

export default function OwnerDashboard() {
  const { user } = useAuth();
  const token = localStorage.getItem("vsy_token") || "";

  const now = new Date();
  const [filterMonth, setFilterMonth] = useState(now.getMonth() + 1);
  const [filterYear, setFilterYear] = useState(now.getFullYear());

  const prevMonth = () => {
    if (filterMonth === 1) { setFilterMonth(12); setFilterYear(y => y - 1); }
    else setFilterMonth(m => m - 1);
  };
  const nextMonth = () => {
    const isCurrentOrFuture = filterYear > now.getFullYear() ||
      (filterYear === now.getFullYear() && filterMonth >= now.getMonth() + 1);
    if (isCurrentOrFuture) return;
    if (filterMonth === 12) { setFilterMonth(1); setFilterYear(y => y + 1); }
    else setFilterMonth(m => m + 1);
  };
  const isCurrentMonth = filterMonth === now.getMonth() + 1 && filterYear === now.getFullYear();

  const { data: revenue } = useQuery<RevenueStats>({
    queryKey: ["owner-revenue", filterMonth, filterYear],
    queryFn: () => apiFetch(`/api/owner/revenue?month=${filterMonth}&year=${filterYear}`, token),
    enabled: !!token,
  });

  const { data: allBookings = [] } = useQuery<Booking[]>({
    queryKey: ["owner-bookings-all"],
    queryFn: () => apiFetch("/api/owner/bookings", token),
    enabled: !!token,
  });

  const monthStr = String(filterMonth).padStart(2, "0");
  const monthBookings = allBookings.filter(b => b.date?.startsWith(`${filterYear}-${monthStr}`));
  const recentBookings = [...monthBookings].sort((a, b) => b.id > a.id ? 1 : -1).slice(0, 5);

  return (
    <div className="p-4 space-y-5 pb-8">
      {/* ── Greeting ── */}
      <div className="pt-2">
        <h2 className="text-2xl font-display font-bold">Welcome back,</h2>
        <p className="text-primary font-bold text-lg">{user?.name}</p>
        <p className="text-muted-foreground text-sm mt-1">Your turf performance overview</p>
      </div>

      {/* ── Live Earnings Widget ── */}
      <EarningsWidget />

      {/* ── Month / Year Filter ── */}
      <div className="flex items-center justify-between bg-muted/60 rounded-2xl p-3">
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={prevMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-center">
          <p className="font-bold text-sm">{MONTHS[filterMonth - 1]} {filterYear}</p>
          {isCurrentMonth && (
            <p className="text-[10px] text-primary font-bold uppercase tracking-wide">Current Month</p>
          )}
        </div>
        <Button
          variant="ghost" size="icon"
          className="h-8 w-8 rounded-xl"
          onClick={nextMonth}
          disabled={isCurrentMonth}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* ── Monthly Stats Grid ── */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4 border-none shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-8 w-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
              <IndianRupee className="h-4 w-4" />
            </div>
            <span className="text-xs font-bold text-muted-foreground uppercase">Revenue</span>
          </div>
          <p className="text-2xl font-bold">₹{(revenue?.totalRevenue || 0).toLocaleString("en-IN")}</p>
          <p className="text-xs text-muted-foreground">{revenue?.confirmedBookings || 0} paid bookings</p>
        </Card>

        <Card className="p-4 border-none shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-8 w-8 bg-secondary/10 rounded-lg flex items-center justify-center text-secondary">
              <CalendarDays className="h-4 w-4" />
            </div>
            <span className="text-xs font-bold text-muted-foreground uppercase">Bookings</span>
          </div>
          <p className="text-2xl font-bold">{revenue?.totalBookings || 0}</p>
          <p className="text-xs text-muted-foreground">{revenue?.pendingBookings || 0} pending</p>
        </Card>

        <Card className="p-4 border-none shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-8 w-8 bg-green-500/10 rounded-lg flex items-center justify-center text-green-500">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <span className="text-xs font-bold text-muted-foreground uppercase">Confirmed</span>
          </div>
          <p className="text-2xl font-bold">{revenue?.confirmedBookings || 0}</p>
          <p className="text-xs text-muted-foreground">paid & confirmed</p>
        </Card>

        <Card className="p-4 border-none shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-8 w-8 bg-yellow-500/10 rounded-lg flex items-center justify-center text-yellow-600">
              <Clock className="h-4 w-4" />
            </div>
            <span className="text-xs font-bold text-muted-foreground uppercase">Pending</span>
          </div>
          <p className="text-2xl font-bold">{revenue?.pendingBookings || 0}</p>
          <p className="text-xs text-muted-foreground">awaiting payment</p>
        </Card>
      </div>

      {/* ── Per Turf Breakdown ── */}
      {revenue?.perTurf && revenue.perTurf.length > 0 && (
        <div>
          <h3 className="font-bold mb-3">Per Turf · {MONTHS[filterMonth - 1]}</h3>
          <div className="space-y-2">
            {revenue.perTurf.map(t => (
              <Card key={t.turfId} className="p-4 border-none shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    <span className="font-bold text-sm">{t.turfName}</span>
                  </div>
                  <span className="font-bold text-primary">₹{t.revenue.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex gap-3 text-xs text-muted-foreground">
                  <span>{t.totalBookings} bookings</span>
                  <span>•</span>
                  <span>{t.confirmedBookings} confirmed</span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── Recent Bookings for selected month ── */}
      {recentBookings.length > 0 && (
        <div>
          <h3 className="font-bold mb-3">
            Recent Bookings
            <span className="text-xs font-normal text-muted-foreground ml-2">
              {MONTHS[filterMonth - 1]} {filterYear}
            </span>
          </h3>
          <div className="space-y-2">
            {recentBookings.map(b => (
              <Card key={b.id} className="p-3 border-none shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-sm">{b.userName || "User"}</p>
                    <p className="text-xs text-muted-foreground">{b.turfName} · {b.startTime}</p>
                    <p className="text-xs text-muted-foreground">
                      {b.date ? format(parseISO(b.date), "MMM dd") : "—"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm text-primary">₹{b.totalPrice}</p>
                    <Badge
                      variant={b.paymentStatus === "paid" ? "default" : "secondary"}
                      className="text-[10px] mt-1"
                    >
                      {b.paymentStatus === "paid" ? "Paid" : "Pending"}
                    </Badge>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {recentBookings.length === 0 && (
        <Card className="p-8 border-none shadow-sm text-center">
          <CalendarDays className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
          <p className="font-bold text-muted-foreground text-sm">No bookings in {MONTHS[filterMonth - 1]}</p>
        </Card>
      )}
    </div>
  );
}
