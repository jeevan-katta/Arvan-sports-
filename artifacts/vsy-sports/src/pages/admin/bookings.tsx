import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import {
  BookOpen, Search, CheckCircle2, XCircle, Clock,
  IndianRupee, TrendingUp, Phone, User, ChevronLeft,
  ChevronRight, CreditCard,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | "confirmed" | "pending" | "cancelled";

const fmtINR = (n: number) => `₹${(n || 0).toLocaleString("en-IN")}`;

function safeDate(d: string) {
  try { return format(parseISO(d), "MMM dd, yyyy"); } catch { return d; }
}

const STATUS_STYLE: Record<string, string> = {
  paid: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  confirmed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  cancelled: "bg-red-500/10 text-red-400 border-red-500/20",
};

const PAGE_SIZE = 30;

export default function AdminBookings() {
  const { token } = useAuth();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-bookings", statusFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), page: String(page) });
      if (statusFilter !== "all") params.set("status", statusFilter);
      const r = await fetch(`/api/admin/bookings?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    enabled: !!token,
  });

  const bookings: any[] = data?.bookings || [];
  const total: number = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const filtered = useMemo(() => {
    if (!search) return bookings;
    const q = search.toLowerCase();
    return bookings.filter(b =>
      b.turfName?.toLowerCase().includes(q) ||
      b.userName?.toLowerCase().includes(q) ||
      b.ownerName?.toLowerCase().includes(q) ||
      b.userPhone?.includes(q)
    );
  }, [bookings, search]);

  const summary = useMemo(() => ({
    gross: filtered.reduce((s, b) => s + (b.totalPrice || 0), 0),
    admin: filtered.reduce((s, b) => s + (b.adminCut || 0), 0),
    owner: filtered.reduce((s, b) => s + (b.ownerCut || 0), 0),
    paid: filtered.filter(b => b.paymentStatus === "paid").length,
    cancelled: filtered.filter(b => b.status === "cancelled").length,
  }), [filtered]);

  return (
    <div className="p-4 md:p-8 text-white">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-black tracking-tight">All Bookings</h2>
          <p className="text-white/40 text-sm mt-0.5">
            {total.toLocaleString()} total records · page {page} of {totalPages}
          </p>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:col-span-1">
          <p className="text-[10px] font-bold text-white/30 uppercase tracking-wider mb-1">Gross (shown)</p>
          <p className="text-lg font-black text-white">{fmtINR(summary.gross)}</p>
        </div>
        <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4">
          <p className="text-[10px] font-bold text-primary/50 uppercase tracking-wider mb-1">Admin Cut</p>
          <p className="text-lg font-black text-primary">{fmtINR(summary.admin)}</p>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4">
          <p className="text-[10px] font-bold text-emerald-400/50 uppercase tracking-wider mb-1">Owner Payouts</p>
          <p className="text-lg font-black text-emerald-400">{fmtINR(summary.owner)}</p>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4">
          <p className="text-[10px] font-bold text-blue-400/50 uppercase tracking-wider mb-1">Paid</p>
          <p className="text-lg font-black text-blue-400">{summary.paid}</p>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4">
          <p className="text-[10px] font-bold text-red-400/50 uppercase tracking-wider mb-1">Cancelled</p>
          <p className="text-lg font-black text-red-400">{summary.cancelled}</p>
        </div>
      </div>

      {/* Filters + Search */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="flex gap-1 bg-white/5 rounded-xl p-1 flex-shrink-0">
          {(["all", "confirmed", "pending", "cancelled"] as StatusFilter[]).map(f => (
            <button key={f} onClick={() => { setStatusFilter(f); setPage(1); }}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all",
                statusFilter === f ? "bg-primary text-primary-foreground" : "text-white/40 hover:text-white")}>
              {f}
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by turf, user, owner or phone..."
            className="pl-8 bg-white/5 border-white/10 text-white placeholder:text-white/20 h-9 text-sm" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02]">
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-white/30">Turf / Date / Time</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-white/30">Customer</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-white/30">Owner</th>
                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-white/30">Total</th>
                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-primary/60">Admin</th>
                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-emerald-400/60">Owner</th>
                <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-white/30">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading && [...Array(8)].map((_, i) => (
                <tr key={i}>{[...Array(7)].map((_, j) => (
                  <td key={j} className="px-4 py-4"><div className="h-4 bg-white/5 rounded animate-pulse" /></td>
                ))}</tr>
              ))}
              {!isLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-14 text-white/30">
                    <BookOpen className="h-10 w-10 mx-auto mb-2 opacity-20" />
                    <p className="font-bold">No bookings found</p>
                  </td>
                </tr>
              )}
              {!isLoading && filtered.map((b: any) => (
                <tr key={b.id} className="hover:bg-white/[0.03] transition-colors group">

                  {/* Turf / Date */}
                  <td className="px-4 py-3.5">
                    <p className="font-bold text-white text-sm leading-tight">{b.turfName || "—"}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-white/30">
                      <span>{b.date ? safeDate(b.date) : "—"}</span>
                      <span className="text-white/15">·</span>
                      <span>{b.startTime}–{b.endTime}</span>
                    </div>
                    {b.turfArea && (
                      <p className="text-[10px] text-white/20 mt-0.5">{b.turfArea}</p>
                    )}
                  </td>

                  {/* Customer */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <User className="h-3 w-3 text-white/25 flex-shrink-0" />
                      <p className="text-sm text-white/80 font-medium">{b.userName || "—"}</p>
                    </div>
                    {b.userPhone && (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Phone className="h-3 w-3 text-white/20 flex-shrink-0" />
                        <p className="text-[11px] text-white/35">{b.userPhone}</p>
                      </div>
                    )}
                  </td>

                  {/* Owner */}
                  <td className="px-4 py-3.5">
                    <p className="text-sm text-white/60 font-medium">{b.ownerName || "—"}</p>
                    <p className="text-[10px] text-white/30 mt-0.5">{b.commissionRate}% commission</p>
                  </td>

                  {/* Total */}
                  <td className="px-4 py-3.5 text-right">
                    <p className="font-black text-white">{fmtINR(b.totalPrice)}</p>
                    {b.paymentType && (
                      <div className="flex items-center justify-end gap-1 mt-0.5">
                        <CreditCard className="h-2.5 w-2.5 text-white/20" />
                        <p className="text-[10px] text-white/30 capitalize">{b.paymentType}</p>
                      </div>
                    )}
                  </td>

                  {/* Admin cut */}
                  <td className="px-4 py-3.5 text-right">
                    <p className="font-bold text-primary">{fmtINR(b.adminCut)}</p>
                  </td>

                  {/* Owner cut */}
                  <td className="px-4 py-3.5 text-right">
                    <p className="font-bold text-emerald-400">{fmtINR(b.ownerCut)}</p>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3.5 text-center">
                    <span className={cn("inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full border",
                      b.paymentStatus === "paid" ? STATUS_STYLE.paid :
                      b.status === "cancelled" ? STATUS_STYLE.cancelled :
                      STATUS_STYLE.pending)}>
                      {b.paymentStatus === "paid"
                        ? <><CheckCircle2 className="h-3 w-3" />Paid</>
                        : b.status === "cancelled"
                        ? <><XCircle className="h-3 w-3" />Cancelled</>
                        : <><Clock className="h-3 w-3" />Pending</>}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="border-t border-white/10 px-4 py-3 flex items-center justify-between">
            <p className="text-xs text-white/30">
              Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
            </p>
            <div className="flex items-center gap-2">
              <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg text-white/40 hover:text-white hover:bg-white/10"
                onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const p = Math.min(Math.max(1, page - 2), totalPages - 4) + i;
                  if (p < 1 || p > totalPages) return null;
                  return (
                    <button key={p} onClick={() => setPage(p)}
                      className={cn("h-8 w-8 rounded-lg text-xs font-bold transition-all",
                        p === page ? "bg-primary text-primary-foreground" : "text-white/40 hover:text-white hover:bg-white/10")}>
                      {p}
                    </button>
                  );
                })}
              </div>
              <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg text-white/40 hover:text-white hover:bg-white/10"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
