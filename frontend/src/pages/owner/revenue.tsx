import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp, IndianRupee, CheckCircle2, Clock, Building2,
  Wallet, ChevronDown, ChevronUp, CreditCard, History,
  ArrowUpRight, AlertCircle, RefreshCw, Landmark,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const COLORS = ["#FF6B35", "#1B3A5C", "#FF9A6C", "#2D5F8A", "#FFB899"];
const fmtINR = (n: number | undefined | null) => `₹${(n || 0).toLocaleString("en-IN")}`;

function apiFetch(path: string, token: string) {
  return fetch(path, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json());
}

export default function OwnerRevenue() {
  const token = localStorage.getItem("arvan_token") || "";
  const [historyOpen, setHistoryOpen] = useState(false);

  const { data: revenue, isLoading: revLoading } = useQuery<any>({
    queryKey: ["owner-revenue"],
    queryFn: () => apiFetch("/api/owner/revenue", token),
    enabled: !!token,
  });

  const { data: payout, isLoading: payLoading } = useQuery<any>({
    queryKey: ["owner-payout-status"],
    queryFn: () => apiFetch("/api/owner/payout-status", token),
    enabled: !!token,
  });

  const isLoading = revLoading || payLoading;

  if (isLoading) {
    return (
      <div className="p-6 space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  const chartData = (revenue?.perTurf || []).map((t: any) => ({
    name: t.turfName.length > 12 ? t.turfName.slice(0, 12) + "…" : t.turfName,
    revenue: t.revenue,
    bookings: t.totalBookings,
  }));

  const settled = payout?.ownerEarnings > 0
    ? Math.min(100, Math.round((payout.payoutSent / payout.ownerEarnings) * 100))
    : 0;

  const ownerPct = 100 - (payout?.commissionRate || 20);

  return (
    <div className="p-4 space-y-5 pb-8">
      <div className="pt-2">
        <h2 className="text-xl font-display font-bold">Revenue & Payout</h2>
        <p className="text-muted-foreground text-sm">Your earnings breakdown and settlement status</p>
      </div>

      {/* ── Payout Status Banner ── */}
      {payout && (
        <div className={cn(
          "rounded-2xl border p-4",
          payout.commissionHeld
            ? "bg-red-500/10 border-red-500/30"
            : payout.pendingPayout > 0
              ? "bg-amber-500/10 border-amber-500/30"
              : "bg-emerald-500/10 border-emerald-500/30"
        )}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Wallet className={cn("h-5 w-5", payout.commissionHeld ? "text-red-500" : payout.pendingPayout > 0 ? "text-amber-500" : "text-emerald-500")} />
              <span className="font-bold text-sm">Payout Status</span>
              {payout.commissionHeld && (
                <span className="text-[9px] font-black bg-red-500/20 text-red-500 border border-red-500/30 px-2 py-0.5 rounded-full uppercase">HELD</span>
              )}
            </div>
            <span className="text-xs font-bold text-muted-foreground capitalize flex items-center gap-1">
              <RefreshCw className="h-3 w-3" />{payout.payoutSchedule || "manual"}
            </span>
          </div>

          {/* Settlement progress */}
          <div className="mb-3">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-muted-foreground">{settled}% settled</span>
              <span className="font-bold">{fmtINR(payout.payoutSent)} / {fmtINR(payout.ownerEarnings)}</span>
            </div>
            <div className="h-2.5 bg-black/10 rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all", settled === 100 ? "bg-emerald-500" : "bg-primary")}
                style={{ width: `${settled}%` }}
              />
            </div>
          </div>

          {/* Split grid */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-white/50 dark:bg-white/5 rounded-xl p-2">
              <p className="text-muted-foreground text-[9px] font-bold uppercase mb-0.5">Gross</p>
              <p className="font-black text-foreground">{fmtINR(payout.grossRevenue)}</p>
            </div>
            <div className="bg-amber-500/10 rounded-xl p-2">
              <p className="text-amber-600 dark:text-amber-400 text-[9px] font-bold uppercase mb-0.5">Pending</p>
              <p className="font-black text-amber-600 dark:text-amber-400">{fmtINR(payout.pendingPayout)}</p>
            </div>
            <div className="bg-emerald-500/10 rounded-xl p-2">
              <p className="text-emerald-600 dark:text-emerald-400 text-[9px] font-bold uppercase mb-0.5">Paid Out</p>
              <p className="font-black text-emerald-600 dark:text-emerald-400">{fmtINR(payout.payoutSent)}</p>
            </div>
          </div>

          {payout.commissionHeld && (
            <div className="mt-3 flex items-center gap-2 bg-red-500/10 rounded-xl p-2.5 text-xs">
              <AlertCircle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
              <span className="text-red-600 dark:text-red-400 font-medium">Your payout is currently on hold. Contact admin for details.</span>
            </div>
          )}
        </div>
      )}

      {/* ── Commission Breakdown ── */}
      {payout && (
        <Card className="p-4 border-none shadow-sm">
          <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
            <IndianRupee className="h-4 w-4 text-primary" /> Revenue Split
          </h3>
          <div className="space-y-2.5 text-sm">
            {[
              { label: "Gross Revenue (all bookings)", val: payout.grossRevenue, cl: "text-foreground font-bold", bar: 100 },
              { label: `Admin Commission (${payout.commissionRate}%)`, val: payout.adminCommission, cl: "text-primary font-bold", bar: payout.commissionRate },
              { label: `Your Share (${ownerPct}%)`, val: payout.ownerEarnings, cl: "text-emerald-600 dark:text-emerald-400 font-black", bar: ownerPct },
            ].map((row, i) => (
              <div key={i} className={cn("pb-2", i < 2 && "border-b border-border")}>
                <div className="flex justify-between mb-1">
                  <span className="text-muted-foreground text-xs">{row.label}</span>
                  <span className={row.cl}>{fmtINR(row.val)}</span>
                </div>
                <div className="h-1 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full", i === 0 ? "bg-muted-foreground/30" : i === 1 ? "bg-primary/60" : "bg-emerald-500")}
                    style={{ width: `${row.bar}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4 border-none shadow-sm bg-primary text-primary-foreground">
          <IndianRupee className="h-5 w-5 mb-2 opacity-80" />
          <p className="text-2xl font-bold">{fmtINR(revenue?.totalRevenue)}</p>
          <p className="text-xs opacity-80 mt-1">Total Revenue</p>
        </Card>
        <Card className="p-4 border-none shadow-sm">
          <TrendingUp className="h-5 w-5 mb-2 text-primary" />
          <p className="text-2xl font-bold">{revenue?.totalBookings || 0}</p>
          <p className="text-xs text-muted-foreground mt-1">Total Bookings</p>
        </Card>
        <Card className="p-4 border-none shadow-sm">
          <CheckCircle2 className="h-5 w-5 mb-2 text-green-500" />
          <p className="text-2xl font-bold">{revenue?.confirmedBookings || 0}</p>
          <p className="text-xs text-muted-foreground mt-1">Confirmed</p>
        </Card>
        <Card className="p-4 border-none shadow-sm">
          <Clock className="h-5 w-5 mb-2 text-yellow-600" />
          <p className="text-2xl font-bold">{revenue?.pendingBookings || 0}</p>
          <p className="text-xs text-muted-foreground mt-1">Pending</p>
        </Card>
      </div>

      {/* ── Bar Chart ── */}
      {chartData.length > 0 && (
        <Card className="p-4 border-none shadow-sm">
          <h3 className="font-bold mb-4">Revenue by Turf</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip
                formatter={(v: number) => [`₹${v.toLocaleString("en-IN")}`, "Revenue"]}
                contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
              />
              <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                {chartData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* ── Per Turf Table ── */}
      {revenue?.perTurf?.length > 0 && (
        <div>
          <h3 className="font-bold mb-3">Turf Breakdown</h3>
          <div className="space-y-2">
            {revenue.perTurf.map((t: any, i: number) => (
              <Card key={t.turfId} className="p-4 border-none shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg flex items-center justify-center"
                      style={{ background: COLORS[i % COLORS.length] + "20", color: COLORS[i % COLORS.length] }}>
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-bold text-sm">{t.turfName}</p>
                      <p className="text-xs text-muted-foreground">{t.confirmedBookings}/{t.totalBookings} confirmed</p>
                    </div>
                  </div>
                  <p className="font-bold text-primary">{fmtINR(t.revenue)}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── Bank Details ── */}
      {payout?.bankDetails && Object.values(payout.bankDetails).some(Boolean) && (
        <Card className="p-4 border-none shadow-sm">
          <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
            <Landmark className="h-4 w-4 text-primary" /> Bank Details on File
          </h3>
          <div className="space-y-2 text-sm">
            {payout.bankDetails.bankName && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Bank</span>
                <span className="font-medium">{payout.bankDetails.bankName}</span>
              </div>
            )}
            {payout.bankDetails.accountName && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Account Holder</span>
                <span className="font-medium">{payout.bankDetails.accountName}</span>
              </div>
            )}
            {payout.bankDetails.accountNumber && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Account No.</span>
                <span className="font-mono font-medium">
                  {"●".repeat(Math.max(0, payout.bankDetails.accountNumber.length - 4))}{payout.bankDetails.accountNumber.slice(-4)}
                </span>
              </div>
            )}
            {payout.bankDetails.ifscCode && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">IFSC</span>
                <span className="font-mono font-medium">{payout.bankDetails.ifscCode}</span>
              </div>
            )}
            {payout.bankDetails.upiId && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">UPI</span>
                <span className="font-medium">{payout.bankDetails.upiId}</span>
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-3">Contact admin to update bank details</p>
        </Card>
      )}

      {/* ── Payout History ── */}
      {payout?.payoutHistory?.length > 0 && (
        <div>
          <button
            className="w-full flex items-center justify-between font-bold mb-3 text-sm"
            onClick={() => setHistoryOpen(v => !v)}
          >
            <span className="flex items-center gap-2">
              <History className="h-4 w-4 text-primary" />
              Payout History ({payout.payoutHistory.length})
            </span>
            {historyOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>

          {historyOpen && (
            <div className="space-y-2">
              {[...payout.payoutHistory].reverse().map((p: any, i: number) => (
                <Card key={i} className="p-3.5 border-none shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      </div>
                      <div>
                        <p className="font-black text-emerald-600 dark:text-emerald-400">{fmtINR(p.amount)}</p>
                        <p className="text-xs text-muted-foreground capitalize mt-0.5">
                          {p.method?.replace("_", " ")} · {p.date ? format(new Date(p.date), "dd MMM yyyy") : "—"}
                        </p>
                        {p.note && <p className="text-xs text-muted-foreground italic mt-0.5">"{p.note}"</p>}
                      </div>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                  </div>
                </Card>
              ))}

              <Card className="p-3 border-none shadow-sm bg-muted/50">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total received</span>
                  <span className="font-black text-primary">{fmtINR(payout.payoutSent)}</span>
                </div>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Empty payout history message */}
      {payout?.payoutHistory?.length === 0 && (
        <Card className="p-6 border-none shadow-sm text-center">
          <Wallet className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-30" />
          <p className="font-bold text-muted-foreground text-sm">No payouts yet</p>
          <p className="text-xs text-muted-foreground mt-1">Payouts will appear here once the admin processes them</p>
        </Card>
      )}
    </div>
  );
}
