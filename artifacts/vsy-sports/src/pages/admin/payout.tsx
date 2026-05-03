import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Wallet, Search, CheckCircle2, AlertCircle,
  History, IndianRupee, Building2, Phone,
  Mail, CreditCard, ChevronDown, ChevronUp, RefreshCw, Zap, Clock,
  PlayCircle, ShieldCheck, ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";

const fmtINR = (n: number | undefined | null) => `₹${(n || 0).toLocaleString("en-IN")}`;
const hdr = (t: string) => ({ "Content-Type": "application/json", Authorization: `Bearer ${t}` });

const SCHEDULE_LABELS: Record<string, { label: string; color: string; icon: any }> = {
  immediate: { label: "Instant", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/25", icon: Zap },
  daily: { label: "Daily", color: "text-blue-400 bg-blue-500/10 border-blue-500/25", icon: Clock },
  weekly: { label: "Weekly", color: "text-violet-400 bg-violet-500/10 border-violet-500/25", icon: RefreshCw },
  manual: { label: "Manual", color: "text-white/40 bg-white/[0.05] border-white/10", icon: Building2 },
};

function RazorpayBadge({ payoutId, status }: { payoutId?: string; status?: string }) {
  if (!payoutId) return null;
  const color = status === "processed" ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
    : status === "queued" ? "text-amber-400 border-amber-500/30 bg-amber-500/10"
      : "text-blue-400 border-blue-500/30 bg-blue-500/10";
  return (
    <span className={cn("inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full border uppercase tracking-wider", color)}>
      <ShieldCheck className="h-2.5 w-2.5" /> Razorpay · {status || "sent"}
    </span>
  );
}

export default function AdminPayout() {
  const { token } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "held" | "settled">("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [payoutOwner, setPayoutOwner] = useState<any>(null);
  const [historyOwner, setHistoryOwner] = useState<any>(null);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutNote, setPayoutNote] = useState("");
  const [payoutMethod, setPayoutMethod] = useState("bank_transfer");
  const [scheduleOwner, setScheduleOwner] = useState<any>(null);
  const [scheduleValue, setScheduleValue] = useState("manual");

  const { data: owners = [], isLoading } = useQuery({
    queryKey: ["admin-owners"],
    queryFn: async () => {
      const r = await fetch("/api/admin/owners", { headers: { Authorization: `Bearer ${token}` } });
      return r.json();
    },
    enabled: !!token,
  });

  const { data: rzpStatus } = useQuery({
    queryKey: ["rzp-status"],
    queryFn: async () => {
      const r = await fetch("/api/admin/payouts/razorpay-status", { headers: { Authorization: `Bearer ${token}` } });
      return r.json();
    },
    enabled: !!token,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-owners"] });
    qc.invalidateQueries({ queryKey: ["admin-stats"] });
  };

  const holdMut = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/admin/owners/${id}/hold`, { method: "POST", headers: hdr(token!), body: "{}" });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: (data) => { toast({ title: data.commissionHeld ? "Payout held!" : "Payout released!" }); invalidate(); },
  });

  const payoutMut = useMutation({
    mutationFn: async ({ id, amount, note, method }: { id: string; amount: number; note: string; method: string }) => {
      const r = await fetch(`/api/admin/owners/${id}/payout`, {
        method: "POST", headers: hdr(token!),
        body: JSON.stringify({ amount, note, method }),
      });
      if (!r.ok) throw new Error((await r.json()).error);
      return r.json();
    },
    onSuccess: (data) => {
      if (data.razorpayPayoutId) {
        toast({ title: "Razorpay payout sent!", description: `ID: ${data.razorpayPayoutId} · ${data.razorpayStatus}` });
      } else if (data.rzpError) {
        toast({ title: "Payout recorded (manual)", description: `Razorpay: ${data.rzpError}` });
      } else {
        toast({ title: "Payout recorded successfully!" });
      }
      setPayoutOwner(null); setPayoutAmount(""); setPayoutNote("");
      invalidate();
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.message }),
  });

  const batchMut = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/admin/payouts/run-batch", { method: "POST", headers: hdr(token!) });
      if (!r.ok) throw new Error("Batch failed");
      return r.json();
    },
    onSuccess: (data) => {
      toast({ title: "Batch complete!", description: `Processed: ${data.processed} · Skipped: ${data.skipped} · Failed: ${data.failed}` });
      invalidate();
    },
    onError: () => toast({ variant: "destructive", title: "Batch payout failed" }),
  });

  const scheduleMut = useMutation({
    mutationFn: async ({ id, schedule }: { id: string; schedule: string }) => {
      const r = await fetch(`/api/admin/owners/${id}`, {
        method: "PUT", headers: hdr(token!),
        body: JSON.stringify({ payoutSchedule: schedule }),
      });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => {
      toast({ title: "Payout schedule updated!" });
      setScheduleOwner(null);
      invalidate();
    },
  });

  const filtered = useMemo(() => {
    return owners.filter((o: any) => {
      const q = search.toLowerCase();
      const matchSearch = !search || o.name?.toLowerCase().includes(q) || o.email?.toLowerCase().includes(q) || o.businessName?.toLowerCase().includes(q);
      const matchFilter =
        filter === "all" ||
        (filter === "pending" && o.pendingPayout > 0 && !o.commissionHeld) ||
        (filter === "held" && o.commissionHeld) ||
        (filter === "settled" && o.pendingPayout <= 0);
      return matchSearch && matchFilter;
    });
  }, [owners, search, filter]);

  const totalPending = owners.reduce((s: number, o: any) => s + (o.pendingPayout || 0), 0);
  const totalPaid = owners.reduce((s: number, o: any) => s + (o.payoutSent || 0), 0);
  const totalEarnings = owners.reduce((s: number, o: any) => s + (o.ownerEarnings || 0), 0);
  const pendingOwners = owners.filter((o: any) => o.pendingPayout > 0 && !o.commissionHeld).length;
  const heldCount = owners.filter((o: any) => o.commissionHeld).length;
  const autoOwners = owners.filter((o: any) => o.payoutSchedule === "immediate" || o.payoutSchedule === "daily").length;

  return (
    <div className="p-4 md:p-8 text-white min-h-screen">

      {/* Header */}
      <div className="mb-5 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl md:text-2xl font-black tracking-tight flex items-center gap-2">
            <Wallet className="h-6 w-6 text-emerald-400" /> Payout Management
          </h2>
          <p className="text-white/40 text-sm mt-0.5">{owners.length} owners · {pendingOwners} pending · {autoOwners} on auto-payout</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Razorpay X status badge */}
          <div className={cn("flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border",
            rzpStatus?.configured
              ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
              : "bg-white/[0.05] border-white/10 text-white/30")}>
            <ShieldCheck className="h-3.5 w-3.5" />
            {rzpStatus?.configured ? "Razorpay X Live" : "Razorpay X Not Set"}
          </div>
          <Button
            size="sm"
            className="h-9 bg-blue-600 hover:bg-blue-700 font-bold gap-1.5 text-xs"
            onClick={() => batchMut.mutate()}
            disabled={batchMut.isPending}
          >
            <PlayCircle className="h-3.5 w-3.5" />
            {batchMut.isPending ? "Running..." : "Run Daily Batch"}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4">
          <p className="text-[10px] font-black text-emerald-400/60 uppercase tracking-wider">Total Earned</p>
          <p className="text-2xl font-black text-emerald-400 mt-1">{fmtINR(totalEarnings)}</p>
          <p className="text-[10px] text-white/25 mt-1">Owner share of all bookings</p>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4">
          <p className="text-[10px] font-black text-blue-400/60 uppercase tracking-wider">Total Paid Out</p>
          <p className="text-2xl font-black text-blue-400 mt-1">{fmtINR(totalPaid)}</p>
          <p className="text-[10px] text-white/25 mt-1">Settled to all owners</p>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4">
          <p className="text-[10px] font-black text-amber-400/60 uppercase tracking-wider">Pending Payouts</p>
          <p className="text-2xl font-black text-amber-400 mt-1">{fmtINR(totalPending)}</p>
          <p className="text-[10px] text-white/25 mt-1">{pendingOwners} owners awaiting</p>
        </div>
        <div className="bg-violet-500/10 border border-violet-500/20 rounded-2xl p-4">
          <p className="text-[10px] font-black text-violet-400/60 uppercase tracking-wider">Auto-Payout</p>
          <p className="text-2xl font-black text-violet-400 mt-1">{autoOwners}</p>
          <p className="text-[10px] text-white/25 mt-1">Instant + daily schedule</p>
        </div>
      </div>

      {/* Overall Progress */}
      <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5 mb-5">
        <div className="flex justify-between items-center mb-2">
          <p className="text-sm font-bold text-white/60">Platform-wide settlement</p>
          <p className="text-sm font-black text-white">
            {totalEarnings > 0 ? Math.round((totalPaid / totalEarnings) * 100) : 0}% settled
          </p>
        </div>
        <div className="h-3 bg-white/[0.06] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all"
            style={{ width: `${totalEarnings > 0 ? Math.min(100, (totalPaid / totalEarnings) * 100) : 0}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-white/25 mt-1.5">
          <span>Paid: {fmtINR(totalPaid)}</span>
          <span>Remaining: {fmtINR(totalPending)}</span>
          <span>Total: {fmtINR(totalEarnings)}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
          <Input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search owners..."
            className="pl-8 bg-white/[0.05] border-white/10 text-white placeholder:text-white/20 h-9 text-sm"
          />
        </div>
        <div className="flex gap-1 bg-white/[0.04] rounded-xl p-1">
          {(["all", "pending", "held", "settled"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all",
                filter === f ? "bg-primary text-white" : "text-white/40 hover:text-white")}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Owner Payout Cards */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-24 rounded-2xl bg-white/[0.04] animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-white/30">
          <Wallet className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p className="font-bold">No owners match this filter</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((owner: any) => {
            const settled = owner.ownerEarnings > 0
              ? Math.min(100, Math.round((owner.payoutSent / owner.ownerEarnings) * 100))
              : 100;
            const isExpanded = expanded === owner.id;
            const hasPending = owner.pendingPayout > 0;
            const schedInfo = SCHEDULE_LABELS[owner.payoutSchedule || "manual"] || SCHEDULE_LABELS.manual;
            const SchedIcon = schedInfo.icon;
            const isAutomatic = owner.payoutSchedule === "immediate" || owner.payoutSchedule === "daily";

            return (
              <div key={owner.id} className={cn(
                "border rounded-2xl overflow-hidden transition-all",
                owner.commissionHeld ? "bg-red-500/[0.04] border-red-500/20" :
                  isAutomatic ? "bg-violet-500/[0.03] border-violet-500/15" :
                    hasPending ? "bg-white/[0.04] border-white/[0.08] hover:border-white/15" :
                      "bg-white/[0.02] border-white/[0.05]"
              )}>
                {/* Main Row */}
                <div className="flex items-center gap-3 p-4">
                  {/* Avatar */}
                  <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary/20 to-violet-600/10 flex items-center justify-center font-black text-primary flex-shrink-0">
                    {owner.name?.slice(0, 2).toUpperCase()}
                  </div>

                  {/* Name + status */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-white">{owner.name}</span>
                      {owner.businessName && owner.businessName !== owner.name &&
                        <span className="text-[10px] text-white/30 bg-white/[0.05] px-2 py-0.5 rounded-full">{owner.businessName}</span>}
                      {owner.commissionHeld &&
                        <span className="text-[9px] font-black bg-red-500/15 text-red-400 border border-red-500/25 px-2 py-0.5 rounded-full uppercase tracking-wider">HELD</span>}
                      <button
                        onClick={() => { setScheduleOwner(owner); setScheduleValue(owner.payoutSchedule || "manual"); }}
                        className={cn("inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full border uppercase tracking-wider transition-opacity hover:opacity-80", schedInfo.color)}
                      >
                        <SchedIcon className="h-2.5 w-2.5" /> {schedInfo.label}
                      </button>
                      <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full",
                        settled === 100 ? "bg-emerald-500/10 text-emerald-400" :
                          settled >= 50 ? "bg-blue-500/10 text-blue-400" : "bg-amber-500/10 text-amber-400")}>
                        {settled}% settled
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5">
                      <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                        <div className={cn("h-full rounded-full transition-all",
                          settled === 100 ? "bg-emerald-500" : isAutomatic ? "bg-violet-500" : "bg-primary")}
                          style={{ width: `${settled}%` }} />
                      </div>
                      <span className="text-[10px] text-white/30 flex-shrink-0">
                        {fmtINR(owner.payoutSent)} / {fmtINR(owner.ownerEarnings)}
                      </span>
                    </div>
                  </div>

                  {/* Amounts */}
                  <div className="hidden sm:flex items-center gap-4 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-[9px] text-white/30 font-bold uppercase">Pending</p>
                      <p className={cn("font-black text-sm", hasPending ? "text-amber-400" : "text-white/20")}>
                        {fmtINR(owner.pendingPayout)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] text-white/30 font-bold uppercase">Commission</p>
                      <p className="font-bold text-xs text-white/50">{owner.commissionRate ?? 20}%</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      className={cn("h-8 text-xs font-bold rounded-xl gap-1.5",
                        owner.commissionHeld ? "bg-emerald-600 hover:bg-emerald-700" : "bg-amber-600 hover:bg-amber-700")}
                      onClick={() => holdMut.mutate(owner.id)}
                      disabled={holdMut.isPending}
                    >
                      <RefreshCw className="h-3 w-3" />
                      <span className="hidden sm:block">{owner.commissionHeld ? "Release" : "Hold"}</span>
                    </Button>
                    <Button
                      size="sm"
                      className="h-8 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 gap-1.5"
                      onClick={() => { setPayoutOwner(owner); setPayoutAmount(String(owner.pendingPayout)); }}
                      disabled={!hasPending || owner.commissionHeld}
                    >
                      <Wallet className="h-3 w-3" />
                      <span className="hidden sm:block">Pay</span>
                    </Button>
                    <button
                      onClick={() => setExpanded(isExpanded ? null : owner.id)}
                      className="h-8 w-8 flex items-center justify-center rounded-xl bg-white/[0.05] hover:bg-white/10 transition-colors"
                    >
                      {isExpanded ? <ChevronUp className="h-3.5 w-3.5 text-white/40" /> : <ChevronDown className="h-3.5 w-3.5 text-white/40" />}
                    </button>
                  </div>
                </div>

                {/* Mobile amount row */}
                <div className="sm:hidden flex gap-3 px-4 pb-3 text-xs">
                  <div className="flex-1 bg-white/[0.04] rounded-xl p-2 text-center">
                    <p className="text-white/25 text-[9px] font-bold uppercase">Pending</p>
                    <p className={cn("font-black mt-0.5", hasPending ? "text-amber-400" : "text-white/20")}>{fmtINR(owner.pendingPayout)}</p>
                  </div>
                  <div className="flex-1 bg-white/[0.04] rounded-xl p-2 text-center">
                    <p className="text-white/25 text-[9px] font-bold uppercase">Total Earned</p>
                    <p className="font-black text-emerald-400 mt-0.5">{fmtINR(owner.ownerEarnings)}</p>
                  </div>
                  <div className="flex-1 bg-white/[0.04] rounded-xl p-2 text-center">
                    <p className="text-white/25 text-[9px] font-bold uppercase">Commission</p>
                    <p className="font-black text-white/50 capitalize mt-0.5 text-[10px]">{owner.commissionRate ?? 20}%</p>
                  </div>
                </div>

                {/* Expanded: bank + payout history */}
                {isExpanded && (
                  <div className="border-t border-white/[0.06] p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Bank Details */}
                      <div className="bg-white/[0.03] rounded-xl p-4">
                        <p className="text-[10px] font-black text-white/30 uppercase tracking-wider mb-3">Bank Details</p>
                        {!owner.bankDetails || !Object.values(owner.bankDetails).some(Boolean) ? (
                          <p className="text-sm text-white/20">No bank details on file — auto-payout disabled</p>
                        ) : (
                          <div className="space-y-2 text-sm">
                            {owner.bankDetails.bankName && <div className="flex gap-2"><CreditCard className="h-3.5 w-3.5 text-white/25 mt-0.5 flex-shrink-0"/><span className="text-white/60">{owner.bankDetails.bankName}</span></div>}
                            {owner.bankDetails.accountName && <div className="flex gap-2"><span className="text-white/25 text-xs min-w-[48px]">Holder</span><span className="text-white/60">{owner.bankDetails.accountName}</span></div>}
                            {owner.bankDetails.accountNumber && <div className="flex gap-2"><span className="text-white/25 text-xs min-w-[48px]">Account</span><span className="text-white/60 font-mono">{"●".repeat(Math.max(0, owner.bankDetails.accountNumber.length - 4))}{owner.bankDetails.accountNumber.slice(-4)}</span></div>}
                            {owner.bankDetails.ifscCode && <div className="flex gap-2"><span className="text-white/25 text-xs min-w-[48px]">IFSC</span><span className="text-white/60 font-mono">{owner.bankDetails.ifscCode}</span></div>}
                            {owner.bankDetails.upiId && <div className="flex gap-2"><span className="text-white/25 text-xs min-w-[48px]">UPI</span><span className="text-white/60">{owner.bankDetails.upiId}</span></div>}
                          </div>
                        )}
                        {owner.razorpayContactId && (
                          <p className="mt-2 text-[10px] text-emerald-400/60 flex items-center gap-1">
                            <ShieldCheck className="h-3 w-3" /> Razorpay Contact: {owner.razorpayContactId}
                          </p>
                        )}
                        <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center gap-2 text-xs text-white/30">
                          <Mail className="h-3 w-3" />{owner.email}
                        </div>
                        {owner.phone && <p className="flex items-center gap-2 text-xs text-white/30 mt-1"><Phone className="h-3 w-3"/>{owner.phone}</p>}
                      </div>

                      {/* Payout History */}
                      <div className="bg-white/[0.03] rounded-xl p-4">
                        <p className="text-[10px] font-black text-white/30 uppercase tracking-wider mb-3 flex items-center justify-between">
                          Payout History
                          <button onClick={() => setHistoryOwner(owner)} className="text-primary text-[10px] font-bold hover:underline">View all</button>
                        </p>
                        {(!owner.payoutHistory || owner.payoutHistory.length === 0) ? (
                          <p className="text-sm text-white/20">No payouts recorded</p>
                        ) : (
                          <div className="space-y-2">
                            {[...owner.payoutHistory].reverse().slice(0, 3).map((p: any, i: number) => (
                              <div key={i} className="space-y-1">
                                <div className="flex items-center justify-between gap-2 text-sm">
                                  <div className="flex items-center gap-2">
                                    <CheckCircle2 className="h-3 w-3 text-emerald-400 flex-shrink-0" />
                                    <div>
                                      <p className="font-bold text-emerald-400">{fmtINR(p.amount)}</p>
                                      <p className="text-[10px] text-white/25 capitalize">{p.method?.replace("_", " ")} · {p.date ? format(new Date(p.date), "dd MMM") : "—"}</p>
                                    </div>
                                  </div>
                                </div>
                                {p.razorpayPayoutId && (
                                  <div className="ml-5">
                                    <RazorpayBadge payoutId={p.razorpayPayoutId} status={p.razorpayStatus} />
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="mt-3 pt-3 border-t border-white/[0.06] flex justify-between text-xs">
                          <span className="text-white/30">Total paid</span>
                          <span className="font-black text-blue-400">{fmtINR(owner.payoutSent)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Schedule Dialog ─── */}
      {scheduleOwner && (
        <Dialog open={!!scheduleOwner} onOpenChange={() => setScheduleOwner(null)}>
          <DialogContent className="sm:max-w-xs bg-[#161924] border-white/10 text-white">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <Zap className="h-4 w-4 text-violet-400" /> Payout Schedule — {scheduleOwner.name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              <p className="text-xs text-white/40">Choose how often this owner receives their share automatically.</p>
              {(["immediate", "daily", "weekly", "manual"] as const).map(s => {
                const info = SCHEDULE_LABELS[s];
                const Icon = info.icon;
                const descriptions: Record<string, string> = {
                  immediate: "Paid instantly when each booking is confirmed",
                  daily: "Batch paid every day at midnight automatically",
                  weekly: "Paid manually on a weekly cycle",
                  manual: "Admin manually triggers each payout",
                };
                return (
                  <button key={s} onClick={() => setScheduleValue(s)}
                    className={cn("w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all",
                      scheduleValue === s ? "border-primary bg-primary/10" : "border-white/10 bg-white/[0.03] hover:border-white/20")}>
                    <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0", info.color)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-white">{info.label}</p>
                      <p className="text-[10px] text-white/35">{descriptions[s]}</p>
                    </div>
                    {scheduleValue === s && <CheckCircle2 className="h-4 w-4 text-primary ml-auto" />}
                  </button>
                );
              })}
              {(scheduleValue === "immediate" || scheduleValue === "daily") && !scheduleOwner.bankDetails?.accountNumber && !scheduleOwner.bankDetails?.upiId && (
                <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-400">
                  <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                  Owner has no bank/UPI details — add them first for auto-payouts to work
                </div>
              )}
              <Button
                className="w-full h-10 bg-primary hover:bg-primary/90 font-bold"
                disabled={scheduleMut.isPending}
                onClick={() => scheduleMut.mutate({ id: scheduleOwner.id, schedule: scheduleValue })}
              >
                {scheduleMut.isPending ? "Saving..." : "Save Schedule"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ─── Pay Dialog ─── */}
      {payoutOwner && (
        <Dialog open={!!payoutOwner} onOpenChange={() => { setPayoutOwner(null); setPayoutAmount(""); setPayoutNote(""); }}>
          <DialogContent className="sm:max-w-sm bg-[#161924] border-white/10 text-white">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-white">
                <Wallet className="h-5 w-5 text-emerald-400" />
                {rzpStatus?.configured ? "Send Razorpay Payout" : "Record Payout"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              {/* Razorpay X status notice */}
              {rzpStatus?.configured ? (
                <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-xs text-emerald-400">
                  <ShieldCheck className="h-3.5 w-3.5 flex-shrink-0" />
                  Razorpay X active — money will be transferred to owner's bank/UPI automatically
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-white/[0.05] border border-white/10 rounded-xl p-3 text-xs text-white/40">
                  <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                  Razorpay X not configured — this will be recorded as a manual payout
                </div>
              )}

              {/* Owner summary */}
              <div className="bg-emerald-500/[0.08] border border-emerald-500/20 rounded-xl p-4 space-y-2 text-sm">
                <p className="font-bold text-white">{payoutOwner.name}</p>
                {payoutOwner.businessName && payoutOwner.businessName !== payoutOwner.name &&
                  <p className="text-white/40 text-xs">{payoutOwner.businessName}</p>}
                <div className="space-y-1 pt-1 border-t border-white/[0.06]">
                  {[
                    { l: "Owner Earnings", v: fmtINR(payoutOwner.ownerEarnings), cl: "text-emerald-400 font-bold" },
                    { l: "Already Paid", v: fmtINR(payoutOwner.payoutSent), cl: "text-blue-400 font-bold" },
                    { l: "Pending Amount", v: fmtINR(payoutOwner.pendingPayout), cl: "text-amber-400 font-black" },
                  ].map((row, i) => (
                    <div key={i} className="flex justify-between">
                      <span className="text-white/40">{row.l}</span>
                      <span className={row.cl}>{row.v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bank info */}
              {payoutOwner.bankDetails && Object.values(payoutOwner.bankDetails).some(Boolean) && (
                <div className="bg-white/[0.04] rounded-xl p-3 text-xs space-y-1">
                  <p className="text-[10px] font-bold text-white/25 uppercase mb-2">Paying To</p>
                  {payoutOwner.bankDetails.bankName && <p className="text-white/50">{payoutOwner.bankDetails.bankName}</p>}
                  {payoutOwner.bankDetails.accountNumber && (
                    <p className="text-white/50 font-mono">Acc: ●●●●{payoutOwner.bankDetails.accountNumber.slice(-4)}</p>
                  )}
                  {payoutOwner.bankDetails.ifscCode && (
                    <p className="text-white/50 font-mono">IFSC: {payoutOwner.bankDetails.ifscCode}</p>
                  )}
                  {payoutOwner.bankDetails.upiId && (
                    <p className="text-white/50">UPI: {payoutOwner.bankDetails.upiId}</p>
                  )}
                </div>
              )}

              {/* Amount */}
              <div>
                <label className="text-xs text-white/50 font-medium">Payout Amount (₹)</label>
                <Input
                  type="number"
                  value={payoutAmount}
                  onChange={e => setPayoutAmount(e.target.value)}
                  placeholder={`Max ${fmtINR(payoutOwner.pendingPayout)}`}
                  className="mt-1 bg-white/[0.06] border-white/10 text-white placeholder:text-white/20 text-xl font-black h-13"
                />
                <div className="flex gap-2 mt-2">
                  {[25, 50, 75, 100].map(p => (
                    <button key={p} type="button"
                      onClick={() => setPayoutAmount(String(Math.round(payoutOwner.pendingPayout * p / 100)))}
                      className={cn("flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-colors",
                        p === 100 ? "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25" : "bg-white/[0.05] text-white/40 hover:bg-white/10 hover:text-white")}>
                      {p}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Method */}
              <div>
                <label className="text-xs text-white/50 font-medium">Payment Method</label>
                <Select value={payoutMethod} onValueChange={setPayoutMethod}>
                  <SelectTrigger className="mt-1 bg-white/[0.06] border-white/10 text-white h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">Bank Transfer (NEFT/IMPS) {rzpStatus?.configured ? "· via Razorpay" : ""}</SelectItem>
                    <SelectItem value="upi">UPI {rzpStatus?.configured ? "· via Razorpay" : ""}</SelectItem>
                    <SelectItem value="cash">Cash (Manual)</SelectItem>
                    <SelectItem value="cheque">Cheque (Manual)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Note */}
              <div>
                <label className="text-xs text-white/50 font-medium">Note (optional)</label>
                <Input
                  value={payoutNote} onChange={e => setPayoutNote(e.target.value)}
                  placeholder="e.g. Weekly settlement May W1"
                  className="mt-1 bg-white/[0.06] border-white/10 text-white placeholder:text-white/20 text-sm"
                />
              </div>

              <Button
                className="w-full h-11 font-bold bg-emerald-600 hover:bg-emerald-700 gap-2"
                disabled={payoutMut.isPending || !payoutAmount || Number(payoutAmount) <= 0}
                onClick={() => payoutMut.mutate({ id: payoutOwner.id, amount: Number(payoutAmount), note: payoutNote, method: payoutMethod })}
              >
                {rzpStatus?.configured && (payoutMethod === "bank_transfer" || payoutMethod === "upi")
                  ? <ShieldCheck className="h-4 w-4" /> : <Wallet className="h-4 w-4" />}
                {payoutMut.isPending
                  ? "Processing..."
                  : rzpStatus?.configured && (payoutMethod === "bank_transfer" || payoutMethod === "upi")
                    ? `Send ₹${(Number(payoutAmount) || 0).toLocaleString("en-IN")} via Razorpay`
                    : `Record ${fmtINR(Number(payoutAmount || 0))} Payout`}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ─── History Dialog ─── */}
      {historyOwner && (
        <Dialog open={!!historyOwner} onOpenChange={() => setHistoryOwner(null)}>
          <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto bg-[#161924] border-white/10 text-white">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-white">
                <History className="h-4 w-4 text-blue-400" /> Full Payout History: {historyOwner.name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-2 pt-2">
              {(!historyOwner.payoutHistory || historyOwner.payoutHistory.length === 0) ? (
                <p className="text-center py-8 text-white/30 text-sm">No payouts recorded yet</p>
              ) : (
                [...historyOwner.payoutHistory].reverse().map((p: any, i: number) => (
                  <div key={i} className="bg-white/[0.04] rounded-xl p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-black text-emerald-400">{fmtINR(p.amount)}</p>
                        <p className="text-[11px] text-white/40 mt-0.5 capitalize">
                          {p.method?.replace("_", " ")} · {p.date ? format(new Date(p.date), "dd MMM yyyy, hh:mm a") : "—"}
                        </p>
                        {p.note && <p className="text-[11px] text-white/30 italic mt-0.5">"{p.note}"</p>}
                      </div>
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                    </div>
                    {p.razorpayPayoutId && (
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        <RazorpayBadge payoutId={p.razorpayPayoutId} status={p.razorpayStatus} />
                        <span className="text-[9px] text-white/25 font-mono">{p.razorpayPayoutId}</span>
                        {p.razorpayMode && <span className="text-[9px] text-white/25">{p.razorpayMode}</span>}
                      </div>
                    )}
                  </div>
                ))
              )}
              <div className="border-t border-white/[0.08] pt-3 flex justify-between text-sm">
                <span className="text-white/40">Total paid out</span>
                <span className="font-black text-blue-400">{fmtINR(historyOwner.payoutSent)}</span>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
