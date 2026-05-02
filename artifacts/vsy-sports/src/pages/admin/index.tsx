import { useState } from "react";
import { useGetRevenueStats } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend,
} from "recharts";
import {
  Users, MapPin, Calendar, ShoppingBag, TrendingUp,
  IndianRupee, Building2, BookOpen, AlertCircle, ArrowUpRight,
  CheckCircle2, Clock, XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

function useAdminStats() {
  const { token } = useAuth();
  return useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const res = await fetch("/api/admin/stats", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
    enabled: !!token,
  });
}

type Period = "week" | "month" | "year";

export default function AdminDashboard() {
  const [period, setPeriod] = useState<Period>("month");
  const { data: stats, isLoading } = useAdminStats();
  const { data: revenue, isLoading: loadingRevenue } = useGetRevenueStats({ period });

  const statCards = [
    {
      title: "Total Revenue", value: `₹${(stats?.totalRevenue || 0).toLocaleString("en-IN")}`,
      icon: IndianRupee, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20",
      sub: `₹${(stats?.totalBookingRevenue || 0).toLocaleString("en-IN")} bookings · ₹${(stats?.totalShopRevenue || 0).toLocaleString("en-IN")} shop`,
    },
    {
      title: "Admin Commission", value: `₹${(stats?.totalAdminCommission || 0).toLocaleString("en-IN")}`,
      icon: TrendingUp, color: "text-primary", bg: "bg-primary/10 border-primary/20",
      sub: "From all booking commissions",
    },
    {
      title: "Pending Payouts", value: `₹${(stats?.pendingPayouts || 0).toLocaleString("en-IN")}`,
      icon: AlertCircle, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20",
      sub: "Owner earnings not yet paid",
    },
    {
      title: "Total Owners", value: stats?.totalOwners || 0,
      icon: Building2, color: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/20",
      sub: `${stats?.activeTurfs || 0} active turfs`,
    },
    {
      title: "Total Bookings", value: stats?.totalBookings || 0,
      icon: BookOpen, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20",
      sub: `${stats?.pendingTurfs || 0} turfs pending approval`,
    },
    {
      title: "Users", value: stats?.totalUsers || 0,
      icon: Users, color: "text-cyan-400", bg: "bg-cyan-500/10 border-cyan-500/20",
      sub: `${stats?.totalEvents || 0} events · ${stats?.totalOrders || 0} orders`,
    },
  ];

  if (isLoading) {
    return (
      <div className="p-6 md:p-8">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-28 rounded-2xl bg-white/5 animate-pulse" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1,2].map(i => <div key={i} className="h-72 rounded-2xl bg-white/5 animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6 text-white">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-black tracking-tight">Dashboard Overview</h2>
          <p className="text-white/40 text-sm mt-0.5">Welcome back, Admin · {format(new Date(), "MMMM dd, yyyy")}</p>
        </div>
        <div className="flex gap-1 bg-white/5 rounded-xl p-1">
          {(["week","month","year"] as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all",
                period === p ? "bg-primary text-primary-foreground" : "text-white/40 hover:text-white")}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {statCards.map((card, i) => (
          <div key={i} className={cn("rounded-2xl border p-4 md:p-5", card.bg)}>
            <div className="flex items-start justify-between mb-3">
              <p className="text-white/50 text-xs font-bold uppercase tracking-wider leading-tight">{card.title}</p>
              <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center bg-white/5 flex-shrink-0", card.color)}>
                <card.icon className="h-4 w-4" />
              </div>
            </div>
            <p className={cn("text-xl md:text-2xl font-black", card.color)}>{card.value}</p>
            <p className="text-white/30 text-[10px] mt-1 leading-tight">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Revenue Split Highlight */}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-3 md:col-span-1 bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 rounded-2xl p-4 md:p-5">
          <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-3">Platform Commission</p>
          <p className="text-2xl md:text-3xl font-black text-primary">₹{(stats?.totalAdminCommission || 0).toLocaleString("en-IN")}</p>
          <div className="mt-3 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-white/50">Gross Booking Revenue</span>
              <span className="text-white font-bold">₹{(stats?.totalBookingRevenue || 0).toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-white/50">Owner Earnings (total)</span>
              <span className="text-emerald-400 font-bold">₹{(stats?.totalOwnerEarnings || 0).toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between text-xs border-t border-white/10 pt-2">
              <span className="text-amber-400 font-bold">Pending Payouts</span>
              <span className="text-amber-400 font-bold">₹{(stats?.pendingPayouts || 0).toLocaleString("en-IN")}</span>
            </div>
          </div>
        </div>

        {/* Revenue Chart */}
        <div className="col-span-3 md:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-4 md:p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Revenue Breakdown
            </p>
          </div>
          <div className="h-48">
            {revenue?.chartData ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenue.chartData} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff10" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#ffffff40" }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#ffffff40" }} tickFormatter={(v) => `₹${v}`} width={55} />
                  <Tooltip
                    contentStyle={{ background: "#1a1d27", border: "1px solid #ffffff20", borderRadius: "12px", color: "#fff", fontSize: 12 }}
                    formatter={(value: any) => [`₹${value}`, undefined]}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, color: "#ffffff60" }} />
                  <Bar dataKey="revenue" name="Total" fill="hsl(var(--primary))" radius={[4,4,0,0]} opacity={0.9} />
                  <Bar dataKey="commission" name="Commission" fill="#a78bfa" radius={[4,4,0,0]} opacity={0.8} />
                  <Bar dataKey="ownerPayout" name="Owner" fill="#34d399" radius={[4,4,0,0]} opacity={0.7} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-white/30 text-sm">No chart data</div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Bookings */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" /> Recent Bookings
          </h3>
          <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider">Revenue split shown</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-white/30">Turf / Date</th>
                <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-white/30">Owner</th>
                <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-white/30">Total</th>
                <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-primary/60">Admin %</th>
                <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-emerald-400/60">Owner %</th>
                <th className="px-5 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-white/30">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {stats?.recentBookings?.length === 0 && (
                <tr><td colSpan={6} className="text-center py-8 text-white/30 text-sm">No bookings yet</td></tr>
              )}
              {stats?.recentBookings?.map((b: any) => (
                <tr key={b.id} className="hover:bg-white/[0.03] transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="font-bold text-white text-sm leading-tight">{b.turfName || "—"}</p>
                    <p className="text-[11px] text-white/30 mt-0.5">{b.date} · {b.startTime}–{b.endTime}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="text-sm text-white/60">{b.ownerName || "—"}</p>
                    <p className="text-[10px] text-white/30">{b.commissionRate}% commission</p>
                  </td>
                  <td className="px-5 py-3.5 text-right font-bold text-white">₹{(b.totalPrice || 0).toLocaleString("en-IN")}</td>
                  <td className="px-5 py-3.5 text-right font-bold text-primary">₹{(b.adminCut || 0).toLocaleString("en-IN")}</td>
                  <td className="px-5 py-3.5 text-right font-bold text-emerald-400">₹{(b.ownerCut || 0).toLocaleString("en-IN")}</td>
                  <td className="px-5 py-3.5 text-center">
                    <span className={cn("inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full",
                      b.paymentStatus === "paid" ? "bg-emerald-500/10 text-emerald-400" :
                      b.status === "cancelled" ? "bg-red-500/10 text-red-400" :
                      "bg-amber-500/10 text-amber-400"
                    )}>
                      {b.paymentStatus === "paid" ? <CheckCircle2 className="h-3 w-3" /> :
                       b.status === "cancelled" ? <XCircle className="h-3 w-3" /> :
                       <Clock className="h-3 w-3" />}
                      {b.paymentStatus === "paid" ? "Paid" : b.status === "cancelled" ? "Cancelled" : "Pending"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
