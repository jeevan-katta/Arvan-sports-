import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  IndianRupee, TrendingUp, Users, MapPin, BookOpen, ShoppingBag,
  Building2, AlertCircle, CheckCircle2, Clock, XCircle, Trophy,
  ArrowUpRight, Wallet, Package, Star, CalendarDays,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

type Period = "week" | "month" | "year";

function useAdminStats(token: string | null) {
  return useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const r = await fetch("/api/admin/stats", { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    enabled: !!token,
  });
}

function useRevenueChart(token: string | null, period: Period) {
  return useQuery({
    queryKey: ["admin-revenue", period],
    queryFn: async () => {
      const r = await fetch(`/api/admin/revenue?period=${period}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    enabled: !!token,
  });
}

const PIE_COLORS = ["#22d3ee", "#f97316", "#f43f5e"];

const fmtINR = (n: number | undefined | null) => `₹${(n || 0).toLocaleString("en-IN")}`;

export default function AdminDashboard() {
  const { token } = useAuth();
  const [period, setPeriod] = useState<Period>("month");
  const { data: s, isLoading } = useAdminStats(token);
  const { data: rev } = useRevenueChart(token, period);

  const kpis = [
    { label: "Platform Revenue", value: fmtINR(s?.totalRevenue || 0), sub: `${fmtINR(s?.totalBookingRevenue || 0)} bookings + ${fmtINR(s?.totalShopRevenue || 0)} shop`, icon: IndianRupee, color: "text-emerald-400", border: "border-emerald-500/20", bg: "bg-emerald-500/10" },
    { label: "Admin Commission", value: fmtINR(s?.totalAdminCommission || 0), sub: "Earned from all bookings", icon: TrendingUp, color: "text-primary", border: "border-primary/20", bg: "bg-primary/10" },
    { label: "Pending Payouts", value: fmtINR(s?.pendingPayouts || 0), sub: `${fmtINR(s?.totalPayoutSent || 0)} already paid`, icon: Wallet, color: "text-amber-400", border: "border-amber-500/20", bg: "bg-amber-500/10" },
    { label: "Total Bookings", value: (s?.totalBookings || 0).toLocaleString(), sub: `${s?.newBookingsThisMonth || 0} this month`, icon: BookOpen, color: "text-blue-400", border: "border-blue-500/20", bg: "bg-blue-500/10" },
    { label: "Turf Owners", value: s?.totalOwners || 0, sub: `${s?.heldCommissionOwners || 0} on hold · ${s?.blockedOwners || 0} blocked`, icon: Building2, color: "text-violet-400", border: "border-violet-500/20", bg: "bg-violet-500/10" },
    { label: "Registered Users", value: (s?.totalUsers || 0).toLocaleString(), sub: `${s?.newUsersThisMonth || 0} joined this month`, icon: Users, color: "text-cyan-400", border: "border-cyan-500/20", bg: "bg-cyan-500/10" },
    { label: "Active Turfs", value: s?.activeTurfs || 0, sub: `${s?.pendingTurfs || 0} awaiting review`, icon: MapPin, color: "text-rose-400", border: "border-rose-500/20", bg: "bg-rose-500/10" },
    { label: "Shop Orders", value: s?.totalOrders || 0, sub: `${s?.totalProducts || 0} products listed`, icon: ShoppingBag, color: "text-orange-400", border: "border-orange-500/20", bg: "bg-orange-500/10" },
  ];

  const bookingPieData = [
    { name: "Confirmed", value: s?.confirmedBookings || 0 },
    { name: "Pending", value: s?.pendingBookings || 0 },
    { name: "Cancelled", value: s?.cancelledBookings || 0 },
  ];

  const revenuePieData = [
    { name: "Bookings", value: s?.totalBookingRevenue || 0 },
    { name: "Shop", value: s?.totalShopRevenue || 0 },
  ];
  const REV_COLORS = ["#f97316", "#22d3ee"];

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 space-y-5 animate-pulse">
        <div className="h-8 w-64 bg-white/5 rounded-xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{[...Array(8)].map((_,i) => <div key={i} className="h-28 rounded-2xl bg-white/5"/>)}</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{[...Array(3)].map((_,i) => <div key={i} className="h-72 rounded-2xl bg-white/5"/>)}</div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6 text-white min-h-screen">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-black tracking-tight text-white">Platform Overview</h1>
          <p className="text-white/40 text-sm mt-0.5 flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" />{format(new Date(), "EEEE, MMMM dd yyyy")}
          </p>
        </div>
        <div className="flex bg-white/5 rounded-xl p-1 gap-1">
          {(["week","month","year"] as Period[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all",
                period === p ? "bg-primary text-primary-foreground" : "text-white/40 hover:text-white")}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* ── KPI Grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {kpis.map((k, i) => (
          <div key={i} className={cn("rounded-2xl border p-4 flex flex-col gap-2", k.bg, k.border)}>
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/50 leading-tight">{k.label}</p>
              <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center bg-black/20 flex-shrink-0", k.color)}>
                <k.icon className="h-3.5 w-3.5" />
              </div>
            </div>
            <p className={cn("text-xl md:text-2xl font-black leading-none", k.color)}>{k.value}</p>
            <p className="text-[10px] text-white/30 leading-tight">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Revenue Split Banner ── */}
      <div className="bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border border-primary/20 rounded-2xl p-5">
        <div className="flex flex-col md:flex-row justify-between gap-5">
          <div>
            <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Revenue Split Summary</p>
            <p className="text-3xl font-black text-white">{fmtINR(s?.totalBookingRevenue || 0)}</p>
            <p className="text-sm text-white/40 mt-1">Total gross booking revenue</p>
          </div>
          <div className="flex gap-4 md:gap-8 items-center">
            <div className="text-center">
              <p className="text-[10px] font-bold text-primary/70 uppercase tracking-wider mb-1">Admin Commission</p>
              <p className="text-2xl font-black text-primary">{fmtINR(s?.totalAdminCommission || 0)}</p>
              <p className="text-[10px] text-white/30 mt-0.5">Platform earnings</p>
            </div>
            <div className="h-12 w-px bg-white/10" />
            <div className="text-center">
              <p className="text-[10px] font-bold text-emerald-400/70 uppercase tracking-wider mb-1">Owner Earnings</p>
              <p className="text-2xl font-black text-emerald-400">{fmtINR(s?.totalOwnerEarnings || 0)}</p>
              <p className="text-[10px] text-white/30 mt-0.5">Total owed to owners</p>
            </div>
            <div className="h-12 w-px bg-white/10" />
            <div className="text-center">
              <p className="text-[10px] font-bold text-amber-400/70 uppercase tracking-wider mb-1">Pending Payout</p>
              <p className="text-2xl font-black text-amber-400">{fmtINR(s?.pendingPayouts || 0)}</p>
              <p className="text-[10px] text-white/30 mt-0.5">Yet to be paid out</p>
            </div>
          </div>
        </div>
        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex justify-between text-[10px] text-white/30 mb-1.5">
            <span>Payout settlement progress</span>
            <span>{s?.totalOwnerEarnings > 0 ? Math.round((s.totalPayoutSent / s.totalOwnerEarnings) * 100) : 0}% settled</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all"
              style={{ width: `${s?.totalOwnerEarnings > 0 ? Math.min(100, (s.totalPayoutSent / s.totalOwnerEarnings) * 100) : 0}%` }} />
          </div>
        </div>
      </div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Revenue Bar Chart */}
        <div className="md:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-5">
          <p className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" /> Revenue Trend
          </p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rev?.chartData || []} barGap={2} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff08" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "#ffffff30" }} interval="preserveStartEnd" />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "#ffffff30" }} tickFormatter={v => `₹${v}`} width={50} />
                <Tooltip contentStyle={{ background: "#1a1d27", border: "1px solid #ffffff15", borderRadius: 12, fontSize: 11, color: "#fff" }} formatter={(v: any) => [`₹${v}`, undefined]} />
                <Legend wrapperStyle={{ fontSize: 10, color: "#ffffff40", paddingTop: 8 }} />
                <Bar dataKey="revenue" name="Booking Revenue" fill="#f97316" radius={[3,3,0,0]} opacity={0.9} />
                <Bar dataKey="commission" name="Admin Cut" fill="#a78bfa" radius={[3,3,0,0]} opacity={0.8} />
                <Bar dataKey="shop" name="Shop" fill="#22d3ee" radius={[3,3,0,0]} opacity={0.7} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Charts Column */}
        <div className="flex flex-col gap-4">
          <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-5">
            <p className="text-xs font-bold text-white/60 mb-3">Booking Status</p>
            <div className="h-28">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={bookingPieData} dataKey="value" cx="50%" cy="50%" outerRadius={50} innerRadius={28} paddingAngle={2}>
                    {bookingPieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#1a1d27", border: "1px solid #ffffff15", borderRadius: 8, fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex gap-3 flex-wrap mt-1">
              {bookingPieData.map((d, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full" style={{ background: PIE_COLORS[i] }} />
                  <span className="text-[10px] text-white/40">{d.name} <span className="text-white/70 font-bold">{d.value}</span></span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-5">
            <p className="text-xs font-bold text-white/60 mb-3">Revenue Sources</p>
            <div className="h-28">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={revenuePieData} dataKey="value" cx="50%" cy="50%" outerRadius={50} innerRadius={28} paddingAngle={2}>
                    {revenuePieData.map((_, i) => <Cell key={i} fill={REV_COLORS[i]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#1a1d27", border: "1px solid #ffffff15", borderRadius: 8, fontSize: 11 }} formatter={(v: any) => [`₹${Number(v).toLocaleString("en-IN")}`, undefined]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex gap-3 flex-wrap mt-1">
              {revenuePieData.map((d, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full" style={{ background: REV_COLORS[i] }} />
                  <span className="text-[10px] text-white/40">{d.name} <span className="text-white/70 font-bold">₹{d.value.toLocaleString("en-IN")}</span></span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom Row ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top Owners */}
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-white/10">
            <Trophy className="h-4 w-4 text-amber-400" />
            <h3 className="font-bold text-sm text-white">Top Owners by Revenue</h3>
          </div>
          <div className="divide-y divide-white/5">
            {(s?.topOwners || []).length === 0 && (
              <p className="text-center py-8 text-white/30 text-sm">No owner revenue data yet</p>
            )}
            {(s?.topOwners || []).map((o: any, i: number) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3 hover:bg-white/[0.03] transition-colors">
                <span className={cn("h-7 w-7 rounded-xl flex items-center justify-center text-xs font-black flex-shrink-0",
                  i === 0 ? "bg-amber-500/20 text-amber-400" : i === 1 ? "bg-slate-500/20 text-slate-400" : i === 2 ? "bg-orange-700/20 text-orange-600" : "bg-white/5 text-white/30"
                )}>#{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-white truncate">{o.businessName || o.name}</p>
                  <p className="text-[11px] text-white/30">{o.name}</p>
                </div>
                <p className="font-black text-emerald-400 text-sm">{fmtINR(o.revenue)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Bookings */}
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              <h3 className="font-bold text-sm text-white">Recent Bookings</h3>
            </div>
            <span className="text-[10px] text-white/30">Revenue split</span>
          </div>
          <div className="divide-y divide-white/5">
            {(s?.recentBookings || []).length === 0 && (
              <p className="text-center py-8 text-white/30 text-sm">No bookings yet</p>
            )}
            {(s?.recentBookings || []).map((b: any) => (
              <div key={b.id} className="flex items-center gap-3 px-5 py-3 hover:bg-white/[0.03] transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-white truncate">{b.turfName || "—"}</p>
                  <p className="text-[11px] text-white/30">{b.date} · {b.startTime}–{b.endTime}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-white text-sm">{fmtINR(b.totalPrice || 0)}</p>
                  <div className="flex gap-1.5 text-[10px] mt-0.5">
                    <span className="text-primary font-bold">{fmtINR(b.adminCut)}</span>
                    <span className="text-white/20">·</span>
                    <span className="text-emerald-400 font-bold">{fmtINR(b.ownerCut)}</span>
                  </div>
                </div>
                <span className={cn("flex-shrink-0 text-[10px] font-bold px-2 py-1 rounded-full ml-1",
                  b.paymentStatus === "paid" ? "bg-emerald-500/10 text-emerald-400" :
                  b.status === "cancelled" ? "bg-red-500/10 text-red-400" :
                  "bg-amber-500/10 text-amber-400"
                )}>
                  {b.paymentStatus === "paid" ? "Paid" : b.status === "cancelled" ? "Cancelled" : "Pending"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
