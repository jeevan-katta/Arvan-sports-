import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import {
  Wallet, CheckCircle2, Clock, AlertCircle, ArrowUpRight,
  History, Landmark, RefreshCw, ChevronDown, ChevronUp,
  IndianRupee, CreditCard, Phone, Mail,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const fmtINR = (n: number | undefined | null) =>
  `₹${(n || 0).toLocaleString("en-IN")}`;

export default function OwnerPayout() {
  const { token } = useAuth();
  const [historyOpen, setHistoryOpen] = useState(false);

  const { data: payout, isLoading } = useQuery<any>({
    queryKey: ["owner-payout-status"],
    queryFn: async () => {
      const r = await fetch("/api/owner/payout-status", {
        headers: { Authorization: `Bearer ${token}` },
      });
      return r.json();
    },
    enabled: !!token,
  });

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  const settled =
    payout?.ownerEarnings > 0
      ? Math.min(
          100,
          Math.round((payout.payoutSent / payout.ownerEarnings) * 100)
        )
      : 0;
  const ownerPct = 100 - (payout?.commissionRate ?? 20);
  const hasBankDetails =
    payout?.bankDetails &&
    Object.values(payout.bankDetails).some(Boolean);

  return (
    <div className="p-4 space-y-5 pb-10">
      <div className="pt-2">
        <h2 className="text-xl font-display font-bold flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" /> Payout Dashboard
        </h2>
        <p className="text-muted-foreground text-sm mt-0.5">
          Your earnings, settlement status &amp; payment history
        </p>
      </div>

      {/* ── Status Banner ── */}
      <div
        className={cn(
          "rounded-2xl border p-4",
          payout?.commissionHeld
            ? "bg-red-500/10 border-red-500/30"
            : payout?.pendingPayout > 0
            ? "bg-amber-500/10 border-amber-500/30"
            : "bg-emerald-500/10 border-emerald-500/30"
        )}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            {payout?.commissionHeld ? (
              <AlertCircle className="h-4 w-4 text-red-500" />
            ) : payout?.pendingPayout > 0 ? (
              <Clock className="h-4 w-4 text-amber-500" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            )}
            <span className="font-bold text-sm">
              {payout?.commissionHeld
                ? "Payout On Hold"
                : payout?.pendingPayout > 0
                ? "Payment Pending"
                : "All Settled"}
            </span>
            {payout?.commissionHeld && (
              <span className="text-[9px] font-black bg-red-500/20 text-red-500 border border-red-500/30 px-2 py-0.5 rounded-full uppercase">
                HELD
              </span>
            )}
          </div>
          <span className="text-xs text-muted-foreground capitalize flex items-center gap-1">
            <RefreshCw className="h-3 w-3" />
            {payout?.payoutSchedule ?? "manual"}
          </span>
        </div>

        {payout?.commissionHeld && (
          <p className="text-xs text-red-600 dark:text-red-400 mt-2 mb-3">
            Your payouts are currently frozen. Please contact admin.
          </p>
        )}

        {/* Progress bar */}
        <div className="mt-3">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-muted-foreground">{settled}% settled</span>
            <span className="font-bold">
              {fmtINR(payout?.payoutSent)} / {fmtINR(payout?.ownerEarnings)}
            </span>
          </div>
          <div className="h-3 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                settled === 100 ? "bg-emerald-500" : "bg-primary"
              )}
              style={{ width: `${settled}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
            <span>Paid: {fmtINR(payout?.payoutSent)}</span>
            <span>Pending: {fmtINR(payout?.pendingPayout)}</span>
          </div>
        </div>
      </div>

      {/* ── Balance Cards ── */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4 border-none shadow-sm bg-primary text-primary-foreground">
          <IndianRupee className="h-4 w-4 mb-2 opacity-70" />
          <p className="text-2xl font-black">{fmtINR(payout?.ownerEarnings)}</p>
          <p className="text-xs opacity-75 mt-1">Total Earned</p>
          <p className="text-[10px] opacity-50 mt-0.5">Your {ownerPct}% share</p>
        </Card>

        <Card
          className={cn(
            "p-4 border-none shadow-sm",
            payout?.pendingPayout > 0 ? "bg-amber-500/10" : "bg-emerald-500/10"
          )}
        >
          <Wallet
            className={cn(
              "h-4 w-4 mb-2",
              payout?.pendingPayout > 0 ? "text-amber-500" : "text-emerald-500"
            )}
          />
          <p
            className={cn(
              "text-2xl font-black",
              payout?.pendingPayout > 0
                ? "text-amber-600 dark:text-amber-400"
                : "text-emerald-600 dark:text-emerald-400"
            )}
          >
            {fmtINR(payout?.pendingPayout)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Pending Payout</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Awaiting transfer
          </p>
        </Card>

        <Card className="p-4 border-none shadow-sm">
          <CheckCircle2 className="h-4 w-4 mb-2 text-emerald-500" />
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {fmtINR(payout?.payoutSent)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Total Received</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {payout?.payoutHistory?.length ?? 0} transactions
          </p>
        </Card>

        <Card className="p-4 border-none shadow-sm">
          <IndianRupee className="h-4 w-4 mb-2 text-muted-foreground" />
          <p className="text-2xl font-black">{fmtINR(payout?.grossRevenue)}</p>
          <p className="text-xs text-muted-foreground mt-1">Gross Revenue</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Admin: {fmtINR(payout?.adminCommission)} ({payout?.commissionRate}%)
          </p>
        </Card>
      </div>

      {/* ── Revenue Split ── */}
      <Card className="p-4 border-none shadow-sm">
        <h3 className="font-bold text-sm mb-3">Revenue Split</h3>
        <div className="space-y-3">
          {[
            {
              label: "Gross Revenue",
              val: payout?.grossRevenue,
              pct: 100,
              color: "bg-muted-foreground/20",
              textColor: "text-foreground",
            },
            {
              label: `Admin Commission (${payout?.commissionRate ?? 20}%)`,
              val: payout?.adminCommission,
              pct: payout?.commissionRate ?? 20,
              color: "bg-orange-400",
              textColor: "text-orange-500",
            },
            {
              label: `Your Share (${ownerPct}%)`,
              val: payout?.ownerEarnings,
              pct: ownerPct,
              color: "bg-primary",
              textColor: "text-primary",
            },
          ].map((row, i) => (
            <div key={i}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">{row.label}</span>
                <span className={cn("font-bold", row.textColor)}>
                  {fmtINR(row.val)}
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full", row.color)}
                  style={{ width: `${row.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* ── Bank Details ── */}
      <Card className="p-4 border-none shadow-sm">
        <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
          <Landmark className="h-4 w-4 text-primary" /> Payment Details
        </h3>
        {!hasBankDetails ? (
          <div className="text-center py-4">
            <CreditCard className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-30" />
            <p className="text-sm text-muted-foreground">
              No bank details on file
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Contact admin to add your bank details
            </p>
          </div>
        ) : (
          <div className="space-y-2.5 text-sm">
            {payout.bankDetails.bankName && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Landmark className="h-3.5 w-3.5" /> Bank
                </span>
                <span className="font-medium">{payout.bankDetails.bankName}</span>
              </div>
            )}
            {payout.bankDetails.accountName && (
              <div className="flex justify-between items-center border-t border-border pt-2">
                <span className="text-muted-foreground">Account Holder</span>
                <span className="font-medium">{payout.bankDetails.accountName}</span>
              </div>
            )}
            {payout.bankDetails.accountNumber && (
              <div className="flex justify-between items-center border-t border-border pt-2">
                <span className="text-muted-foreground">Account No.</span>
                <span className="font-mono font-medium">
                  {"●".repeat(
                    Math.max(0, payout.bankDetails.accountNumber.length - 4)
                  )}
                  {payout.bankDetails.accountNumber.slice(-4)}
                </span>
              </div>
            )}
            {payout.bankDetails.ifscCode && (
              <div className="flex justify-between items-center border-t border-border pt-2">
                <span className="text-muted-foreground">IFSC Code</span>
                <span className="font-mono font-medium">
                  {payout.bankDetails.ifscCode}
                </span>
              </div>
            )}
            {payout.bankDetails.upiId && (
              <div className="flex justify-between items-center border-t border-border pt-2">
                <span className="text-muted-foreground">UPI ID</span>
                <span className="font-medium">{payout.bankDetails.upiId}</span>
              </div>
            )}
          </div>
        )}
        <p className="text-[10px] text-muted-foreground mt-3 pt-3 border-t border-border">
          Payouts are processed per your{" "}
          <span className="font-bold capitalize">
            {payout?.payoutSchedule ?? "manual"}
          </span>{" "}
          schedule. Contact admin to update bank details.
        </p>
      </Card>

      {/* ── Payout History ── */}
      <div>
        <button
          onClick={() => setHistoryOpen((v) => !v)}
          className="w-full flex items-center justify-between font-bold text-sm py-1 mb-3"
        >
          <span className="flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            Payout History
            <span className="bg-primary/10 text-primary text-[10px] font-black px-2 py-0.5 rounded-full">
              {payout?.payoutHistory?.length ?? 0}
            </span>
          </span>
          {historyOpen ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {historyOpen && (
          <div className="space-y-2">
            {!payout?.payoutHistory?.length ? (
              <Card className="p-6 border-none shadow-sm text-center">
                <Wallet className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-20" />
                <p className="font-bold text-muted-foreground text-sm">
                  No payouts received yet
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Payments will appear here once processed
                </p>
              </Card>
            ) : (
              <>
                {[...payout.payoutHistory]
                  .reverse()
                  .map((p: any, i: number) => (
                    <Card key={i} className="p-4 border-none shadow-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                          </div>
                          <div>
                            <p className="font-black text-emerald-600 dark:text-emerald-400">
                              {fmtINR(p.amount)}
                            </p>
                            <p className="text-xs text-muted-foreground capitalize mt-0.5">
                              {p.method?.replace("_", " ")} ·{" "}
                              {p.date
                                ? format(new Date(p.date), "dd MMM yyyy")
                                : "—"}
                            </p>
                            {p.note && (
                              <p className="text-xs text-muted-foreground italic mt-0.5">
                                "{p.note}"
                              </p>
                            )}
                          </div>
                        </div>
                        <ArrowUpRight className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                      </div>
                    </Card>
                  ))}

                <Card className="p-3 border-none shadow-sm bg-muted/50">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Total received
                    </span>
                    <span className="font-black text-primary">
                      {fmtINR(payout.payoutSent)}
                    </span>
                  </div>
                </Card>
              </>
            )}
          </div>
        )}

        {/* Auto-expand hint when no history */}
        {!historyOpen && !payout?.payoutHistory?.length && (
          <Card className="p-5 border-none shadow-sm text-center">
            <Wallet className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-20" />
            <p className="font-bold text-muted-foreground text-sm">
              No payouts yet
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Your payment history will appear here
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
