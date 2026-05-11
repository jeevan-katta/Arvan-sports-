import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { BookOpen, Search, CheckCircle2, XCircle, Clock, IndianRupee, TrendingUp, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | "confirmed" | "pending" | "cancelled";

function useAdminBookings(status?: string) {
  const { token } = useAuth();
  return useQuery({
    queryKey: ["admin-bookings", status],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "50" });
      if (status && status !== "all") params.set("status", status);
      const res = await fetch(`/api/admin/bookings?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!token,
  });
}

export default function AdminBookings() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useAdminBookings(statusFilter);
  const bookings: any[] = data?.bookings || [];

  const filtered = bookings.filter(b => {
    if (!search) return true;
    const q = search.toLowerCase();
    return b.turfName?.toLowerCase().includes(q) || b.userName?.toLowerCase().includes(q) || b.ownerName?.toLowerCase().includes(q);
  });

  const totalGross = filtered.reduce((s, b) => s + (b.totalPrice || 0), 0);
  const totalAdmin = filtered.reduce((s, b) => s + (b.adminCut || 0), 0);
  const totalOwner = filtered.reduce((s, b) => s + (b.ownerCut || 0), 0);

  const filters: { label: string; value: StatusFilter }[] = [
    { label: "All", value: "all" },
    { label: "Confirmed", value: "confirmed" },
    { label: "Pending", value: "pending" },
    { label: "Cancelled", value: "cancelled" },
  ];

  return (
    <div className="p-4 md:p-8 text-white">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-black tracking-tight">All Bookings</h2>
          <p className="text-white/40 text-sm mt-0.5">{data?.total || 0} total · showing {filtered.length}</p>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <IndianRupee className="h-3.5 w-3.5 text-white/40" />
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Gross Revenue</p>
          </div>
          <p className="text-lg md:text-xl font-black text-white">₹{totalGross.toLocaleString("en-IN")}</p>
        </div>
        <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-3.5 w-3.5 text-primary/60" />
            <p className="text-[10px] font-bold text-primary/60 uppercase tracking-wider">Admin Commission</p>
          </div>
          <p className="text-lg md:text-xl font-black text-primary">₹{totalAdmin.toLocaleString("en-IN")}</p>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <IndianRupee className="h-3.5 w-3.5 text-emerald-400/60" />
            <p className="text-[10px] font-bold text-emerald-400/60 uppercase tracking-wider">Owner Payouts</p>
          </div>
          <p className="text-lg md:text-xl font-black text-emerald-400">₹{totalOwner.toLocaleString("en-IN")}</p>
        </div>
      </div>

      {/* Filters + Search */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex gap-1 bg-white/5 rounded-xl p-1 flex-shrink-0">
          {filters.map(f => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                statusFilter === f.value ? "bg-primary text-primary-foreground" : "text-white/40 hover:text-white")}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by turf, user or owner..."
            className="pl-8 bg-white/5 border-white/10 text-white placeholder:text-white/20 h-9 text-sm"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-white/30">Turf / Date</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-white/30">User</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-white/30">Owner / Rate</th>
                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-white/30">Total</th>
                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-primary/60">Admin</th>
                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-emerald-400/60">Owner</th>
                <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-white/30">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading && (
                [...Array(6)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(7)].map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-white/5 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              )}
              {!isLoading && filtered.length === 0 && (
                <tr><td colSpan={7} className="text-center py-12 text-white/30 text-sm">No bookings found</td></tr>
              )}
              {!isLoading && filtered.map((b: any) => (
                <tr key={b.id} className="hover:bg-white/[0.03] transition-colors">
                  <td className="px-4 py-3.5">
                    <p className="font-bold text-white text-sm leading-tight">{b.turfName || "—"}</p>
                    <p className="text-[11px] text-white/30 mt-0.5">
                      {b.date ? (() => { try { return format(parseISO(b.date), "MMM dd, yyyy"); } catch { return b.date; } })() : "—"} · {b.startTime}–{b.endTime}
                    </p>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="text-sm text-white/80 font-medium">{b.userName || "—"}</p>
                    {b.userPhone && <p className="text-[11px] text-white/30">{b.userPhone}</p>}
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="text-sm text-white/60">{b.ownerName || "—"}</p>
                    <p className="text-[10px] text-white/30">{b.commissionRate}% commission</p>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <p className="font-bold text-white">₹{(b.totalPrice || 0).toLocaleString("en-IN")}</p>
                    <p className="text-[10px] text-white/30">{b.paymentType}</p>
                  </td>
                  <td className="px-4 py-3.5 text-right font-bold text-primary">₹{(b.adminCut || 0).toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3.5 text-right font-bold text-emerald-400">₹{(b.ownerCut || 0).toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3.5 text-center">
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
