import { useState, useMemo, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Wallet, Search, CheckCircle2, AlertCircle, X,
  History, CreditCard, RefreshCw, Zap, Clock,
  PlayCircle, ShieldCheck, Download, ChevronUp, ChevronDown,
  ArrowUpDown, Building2, Phone, Mail, Settings2, TrendingUp,
  IndianRupee, Users, Layers, MoreVertical, Pencil, PauseCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";

const fmtINR = (n: number | undefined | null) => `₹${(n || 0).toLocaleString("en-IN")}`;
const hdr = (t: string) => ({ "Content-Type": "application/json", Authorization: `Bearer ${t}` });

type SortKey = "name" | "pending" | "grossRevenue" | "ownerEarnings" | "settlement" | "commissionRate";
type SortDir = "asc" | "desc";

const SCHEDULE_CFG: Record<string, { label: string; color: string; dot: string; icon: any; desc: string }> = {
  immediate: { label: "Instant",  color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/25", dot: "bg-emerald-400", icon: Zap,      desc: "Paid on every booking" },
  daily:     { label: "Daily",    color: "text-blue-400 bg-blue-500/10 border-blue-500/25",           dot: "bg-blue-400",    icon: Clock,     desc: "Batch paid at midnight" },
  weekly:    { label: "Weekly",   color: "text-violet-400 bg-violet-500/10 border-violet-500/25",     dot: "bg-violet-400",  icon: RefreshCw, desc: "Weekly manual cycle" },
  manual:    { label: "Manual",   color: "text-white/35 bg-white/[0.04] border-white/10",             dot: "bg-white/20",    icon: Building2, desc: "Admin triggers manually" },
};

function RzpBadge({ id, status }: { id?: string; status?: string }) {
  if (!id) return null;
  const c = status === "processed" ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
    : status === "queued" ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
    : "text-sky-400 bg-sky-500/10 border-sky-500/20";
  return (
    <span className={cn("inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md border", c)}>
      <ShieldCheck className="h-2.5 w-2.5" /> RZP · {status || "sent"}
    </span>
  );
}

function ScheduleBadge({ schedule, onClick }: { schedule: string; onClick?: () => void }) {
  const cfg = SCHEDULE_CFG[schedule] || SCHEDULE_CFG.manual;
  const Icon = cfg.icon;
  return (
    <button
      onClick={onClick}
      className={cn("inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-lg border transition-opacity hover:opacity-75", cfg.color, onClick ? "cursor-pointer" : "cursor-default")}
    >
      <Icon className="h-3 w-3" /> {cfg.label}
    </button>
  );
}

function StatCard({ label, value, sub, color, icon: Icon }: { label: string; value: string; sub?: string; color: string; icon: any }) {
  return (
    <div className={cn("rounded-2xl border p-4 flex flex-col gap-1", color)}>
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-wider opacity-60">{label}</p>
        <Icon className="h-4 w-4 opacity-40" />
      </div>
      <p className="text-xl font-black mt-0.5">{value}</p>
      {sub && <p className="text-[10px] opacity-40">{sub}</p>}
    </div>
  );
}

function SortBtn({ label, sortKey, current, dir, onSort }: { label: string; sortKey: SortKey; current: SortKey; dir: SortDir; onSort: (k: SortKey) => void }) {
  const active = current === sortKey;
  return (
    <button onClick={() => onSort(sortKey)}
      className={cn("flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider transition-colors select-none whitespace-nowrap",
        active ? "text-white" : "text-white/30 hover:text-white/60")}>
      {label}
      {active ? (dir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-40" />}
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */

export default function AdminPayout() {
  const { token } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  // list state
  const [search, setSearch]         = useState("");
  const [filter, setFilter]         = useState<"all"|"pending"|"auto"|"held"|"settled">("all");
  const [sortKey, setSortKey]       = useState<SortKey>("pending");
  const [sortDir, setSortDir]       = useState<SortDir>("desc");
  const [selected, setSelected]     = useState<Set<string>>(new Set());

  // panel / dialogs
  const [panel, setPanel]           = useState<any>(null);   // slide-out owner detail
  const [panelTab, setPanelTab]     = useState<"overview"|"history"|"settings">("overview");
  const [payDialog, setPayDialog]   = useState<any>(null);
  const [bulkDialog, setBulkDialog] = useState(false);
  const [editRate, setEditRate]     = useState(false);
  const [rateVal, setRateVal]       = useState("");

  // pay form
  const [payAmt, setPayAmt]   = useState("");
  const [payNote, setPayNote] = useState("");
  const [payMode, setPayMode] = useState("bank_transfer");

  // bulk form
  const [bulkNote, setBulkNote] = useState("");
  const [bulkMode, setBulkMode] = useState("bank_transfer");

  /* ── queries ── */
  const { data: owners = [], isLoading } = useQuery({
    queryKey: ["admin-owners"],
    queryFn: async () => {
      const r = await fetch("/api/admin/owners", { headers: { Authorization: `Bearer ${token}` } });
      return r.json();
    },
    enabled: !!token,
    refetchInterval: 30_000,
  });

  const { data: rzp } = useQuery({
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

  /* ── mutations ── */
  const holdMut = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/admin/owners/${id}/hold`, { method: "POST", headers: hdr(token!), body: "{}" });
      if (!r.ok) throw new Error("Failed"); return r.json();
    },
    onSuccess: (d) => { toast({ title: d.commissionHeld ? "Payout held" : "Payout released" }); invalidate(); if (panel?.id === d.id) setPanel((p: any) => ({ ...p, commissionHeld: d.commissionHeld })); },
  });

  const payMut = useMutation({
    mutationFn: async ({ id, amount, note, method }: { id: string; amount: number; note: string; method: string }) => {
      const r = await fetch(`/api/admin/owners/${id}/payout`, { method: "POST", headers: hdr(token!), body: JSON.stringify({ amount, note, method }) });
      if (!r.ok) throw new Error((await r.json()).error); return r.json();
    },
    onSuccess: (d) => {
      if (d.razorpayPayoutId) toast({ title: "Razorpay payout sent!", description: `ID: ${d.razorpayPayoutId}` });
      else if (d.rzpError) toast({ title: "Recorded (manual)", description: d.rzpError });
      else toast({ title: "Payout recorded!" });
      setPayDialog(null); setPayAmt(""); setPayNote("");
      invalidate();
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.message }),
  });

  const bulkMut = useMutation({
    mutationFn: async ({ ownerIds, note, method }: { ownerIds: string[]; note: string; method: string }) => {
      const r = await fetch("/api/admin/payouts/bulk", { method: "POST", headers: hdr(token!), body: JSON.stringify({ ownerIds, note, method }) });
      if (!r.ok) throw new Error("Bulk failed"); return r.json();
    },
    onSuccess: (d) => {
      toast({ title: `Bulk done — ${d.processed} paid, ${d.skipped} skipped` });
      setBulkDialog(false); setSelected(new Set()); setBulkNote(""); invalidate();
    },
    onError: () => toast({ variant: "destructive", title: "Bulk payout failed" }),
  });

  const batchMut = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/admin/payouts/run-batch", { method: "POST", headers: hdr(token!) });
      if (!r.ok) throw new Error("Batch failed"); return r.json();
    },
    onSuccess: (d) => { toast({ title: "Daily batch done!", description: `Processed: ${d.processed} · Skipped: ${d.skipped}` }); invalidate(); },
    onError: () => toast({ variant: "destructive", title: "Batch failed" }),
  });

  const scheduleMut = useMutation({
    mutationFn: async ({ id, schedule }: { id: string; schedule: string }) => {
      const r = await fetch(`/api/admin/owners/${id}`, { method: "PUT", headers: hdr(token!), body: JSON.stringify({ payoutSchedule: schedule }) });
      if (!r.ok) throw new Error("Failed"); return r.json();
    },
    onSuccess: (_, vars) => {
      toast({ title: "Schedule updated" });
      setPanel((p: any) => p ? { ...p, payoutSchedule: vars.schedule } : p);
      invalidate();
    },
  });

  const rateMut = useMutation({
    mutationFn: async ({ id, rate }: { id: string; rate: number }) => {
      const r = await fetch(`/api/admin/owners/${id}`, { method: "PUT", headers: hdr(token!), body: JSON.stringify({ commissionRate: rate }) });
      if (!r.ok) throw new Error("Failed"); return r.json();
    },
    onSuccess: (_, vars) => {
      toast({ title: "Commission rate updated" });
      setPanel((p: any) => p ? { ...p, commissionRate: vars.rate } : p);
      setEditRate(false); invalidate();
    },
  });

  /* ── sort/filter ── */
  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir("desc"); }
  };

  const processed = useMemo(() => {
    const q = search.toLowerCase();
    let list = (owners as any[]).filter((o: any) => {
      const matchSearch = !search || o.name?.toLowerCase().includes(q) || o.email?.toLowerCase().includes(q) || o.businessName?.toLowerCase().includes(q);
      const matchFilter =
        filter === "all"     ? true :
        filter === "pending" ? (o.pendingPayout > 0 && !o.commissionHeld) :
        filter === "auto"    ? (o.payoutSchedule === "immediate" || o.payoutSchedule === "daily") :
        filter === "held"    ? o.commissionHeld :
        filter === "settled" ? o.pendingPayout <= 0 : true;
      return matchSearch && matchFilter;
    });

    list.sort((a: any, b: any) => {
      let av = 0, bv = 0;
      if (sortKey === "name")           { av = a.name?.localeCompare(b.name); return sortDir === "asc" ? av : -av; }
      if (sortKey === "pending")        { av = a.pendingPayout; bv = b.pendingPayout; }
      if (sortKey === "grossRevenue")   { av = a.grossRevenue;  bv = b.grossRevenue; }
      if (sortKey === "ownerEarnings")  { av = a.ownerEarnings; bv = b.ownerEarnings; }
      if (sortKey === "settlement")     { av = a.ownerEarnings > 0 ? a.payoutSent / a.ownerEarnings : 1; bv = b.ownerEarnings > 0 ? b.payoutSent / b.ownerEarnings : 1; }
      if (sortKey === "commissionRate") { av = a.commissionRate ?? 20; bv = b.commissionRate ?? 20; }
      return sortDir === "asc" ? av - bv : bv - av;
    });
    return list;
  }, [owners, search, filter, sortKey, sortDir]);

  /* ── aggregate stats ── */
  const totalGross    = (owners as any[]).reduce((s: number, o: any) => s + (o.grossRevenue || 0), 0);
  const totalComm     = (owners as any[]).reduce((s: number, o: any) => s + (o.adminCommission || 0), 0);
  const totalEarnings = (owners as any[]).reduce((s: number, o: any) => s + (o.ownerEarnings || 0), 0);
  const totalPaid     = (owners as any[]).reduce((s: number, o: any) => s + (o.payoutSent || 0), 0);
  const totalPending  = (owners as any[]).reduce((s: number, o: any) => s + (o.pendingPayout || 0), 0);
  const autoCount     = (owners as any[]).filter((o: any) => o.payoutSchedule === "immediate" || o.payoutSchedule === "daily").length;
  const pendingCount  = (owners as any[]).filter((o: any) => o.pendingPayout > 0 && !o.commissionHeld).length;
  const heldCount     = (owners as any[]).filter((o: any) => o.commissionHeld).length;
  const settlePct     = totalEarnings > 0 ? Math.round((totalPaid / totalEarnings) * 100) : 0;

  const selectedOwners = (owners as any[]).filter((o: any) => selected.has(o.id));
  const selectedPending = selectedOwners.reduce((s: number, o: any) => s + (o.pendingPayout || 0), 0);

  const allPageSelected = processed.length > 0 && processed.every((o: any) => selected.has(o.id));
  const toggleAll = () => {
    if (allPageSelected) setSelected(new Set());
    else setSelected(new Set(processed.map((o: any) => o.id)));
  };

  const openPanel = (owner: any) => {
    setPanel(owner);
    setPanelTab("overview");
    setEditRate(false);
    setRateVal(String(owner.commissionRate ?? 20));
  };

  const exportCSV = () => {
    window.open(`/api/admin/payouts/export?t=${token}`, "_blank");
  };

  /* ─────────────────────── RENDER ─────────────────────────────────────────── */
  return (
    <div className="text-white min-h-screen">
      <div className={cn("transition-all duration-300", panel ? "mr-[380px]" : "")}>
        <div className="p-4 md:p-6">

          {/* ── Header ─────────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
            <div>
              <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
                <Wallet className="h-5 w-5 text-emerald-400" /> Payout Manager
              </h2>
              <p className="text-white/35 text-xs mt-0.5">
                {(owners as any[]).length} owners · {pendingCount} pending · {heldCount} held · {autoCount} auto
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className={cn("flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1.5 rounded-lg border",
                rzp?.configured ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-white/[0.04] border-white/10 text-white/30")}>
                <ShieldCheck className="h-3 w-3" />
                {rzp?.configured ? "Razorpay X Live" : "Razorpay X Off"}
              </div>
              <Button size="sm" variant="outline"
                className="h-8 text-xs gap-1.5 bg-white/[0.04] border-white/10 text-white/60 hover:text-white hover:bg-white/[0.08]"
                onClick={exportCSV}>
                <Download className="h-3.5 w-3.5" /> Export CSV
              </Button>
              <Button size="sm"
                className="h-8 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 font-bold"
                onClick={() => batchMut.mutate()} disabled={batchMut.isPending}>
                <PlayCircle className="h-3.5 w-3.5" />
                {batchMut.isPending ? "Running..." : "Run Daily Batch"}
              </Button>
            </div>
          </div>

          {/* ── Stats ──────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
            <StatCard label="Admin Commission" value={fmtINR(totalComm)} sub={`${(owners as any[]).length > 0 ? Math.round(totalComm / Math.max(totalGross, 1) * 100) : 0}% of gross`} color="bg-violet-500/10 border-violet-500/20 text-violet-400" icon={IndianRupee} />
            <StatCard label="Owner Earnings"   value={fmtINR(totalEarnings)} sub="Total owed to owners"  color="bg-emerald-500/10 border-emerald-500/20 text-emerald-400" icon={TrendingUp} />
            <StatCard label="Total Paid Out"   value={fmtINR(totalPaid)} sub={`${settlePct}% settled`}  color="bg-blue-500/10 border-blue-500/20 text-blue-400" icon={CheckCircle2} />
            <StatCard label="Pending Payouts"  value={fmtINR(totalPending)} sub={`${pendingCount} owners`}  color="bg-amber-500/10 border-amber-500/20 text-amber-400" icon={Clock} />
            <StatCard label="Auto-Payout"      value={String(autoCount)} sub="Instant + Daily owners"   color="bg-sky-500/10 border-sky-500/20 text-sky-400" icon={Zap} />
          </div>

          {/* ── Settlement bar ─────────────────────────────────────────────── */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 mb-5">
            <div className="flex justify-between items-center mb-2">
              <p className="text-xs font-bold text-white/50">Platform Settlement</p>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-white/30">Gross: <span className="text-white/60 font-bold">{fmtINR(totalGross)}</span></span>
                <span className="text-white/30">Paid: <span className="text-blue-400 font-bold">{fmtINR(totalPaid)}</span></span>
                <span className="text-white/30">Due: <span className="text-amber-400 font-bold">{fmtINR(totalPending)}</span></span>
                <span className="font-black text-white">{settlePct}%</span>
              </div>
            </div>
            <div className="h-2.5 bg-white/[0.05] rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-700"
                style={{ width: `${Math.min(100, settlePct)}%` }} />
            </div>
          </div>

          {/* ── Toolbar ────────────────────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/25" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, email or business…"
                className="pl-9 h-9 bg-white/[0.04] border-white/10 text-white placeholder:text-white/20 text-sm" />
            </div>
            <div className="flex gap-1 bg-white/[0.04] rounded-xl p-1 flex-shrink-0">
              {(["all","pending","auto","held","settled"] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={cn("px-3 py-1.5 rounded-lg text-[11px] font-bold capitalize transition-all",
                    filter === f ? "bg-primary text-white" : "text-white/35 hover:text-white")}>
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* ── Bulk action bar ────────────────────────────────────────────── */}
          {selected.size > 0 && (
            <div className="flex items-center justify-between gap-3 bg-primary/10 border border-primary/25 rounded-xl px-4 py-3 mb-4">
              <p className="text-sm font-bold text-white">
                {selected.size} selected · <span className="text-amber-400">{fmtINR(selectedPending)} pending</span>
              </p>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline"
                  className="h-8 text-xs bg-transparent border-white/20 text-white/60 hover:text-white"
                  onClick={() => setSelected(new Set())}>
                  Clear
                </Button>
                <Button size="sm"
                  className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 gap-1.5"
                  onClick={() => setBulkDialog(true)}
                  disabled={selectedPending === 0}>
                  <Wallet className="h-3.5 w-3.5" /> Pay All Selected
                </Button>
              </div>
            </div>
          )}

          {/* ── Table ──────────────────────────────────────────────────────── */}
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => <div key={i} className="h-14 rounded-xl bg-white/[0.04] animate-pulse" />)}
            </div>
          ) : processed.length === 0 ? (
            <div className="text-center py-20 text-white/25">
              <Wallet className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="font-bold text-sm">No owners match this filter</p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden lg:block rounded-2xl border border-white/[0.07] overflow-hidden">
                {/* Table header */}
                <div className="grid grid-cols-[24px_1fr_90px_110px_110px_90px_110px_130px_80px] gap-3 px-4 py-3 bg-white/[0.03] border-b border-white/[0.06]">
                  <input type="checkbox" checked={allPageSelected} onChange={toggleAll}
                    className="accent-primary cursor-pointer mt-0.5" />
                  <SortBtn label="Owner"         sortKey="name"           current={sortKey} dir={sortDir} onSort={toggleSort} />
                  <SortBtn label="Commission"    sortKey="commissionRate" current={sortKey} dir={sortDir} onSort={toggleSort} />
                  <SortBtn label="Gross"         sortKey="grossRevenue"   current={sortKey} dir={sortDir} onSort={toggleSort} />
                  <SortBtn label="Owner Share"   sortKey="ownerEarnings"  current={sortKey} dir={sortDir} onSort={toggleSort} />
                  <SortBtn label="Settled"       sortKey="settlement"     current={sortKey} dir={sortDir} onSort={toggleSort} />
                  <SortBtn label="Pending"       sortKey="pending"        current={sortKey} dir={sortDir} onSort={toggleSort} />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/30">Schedule</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/30 text-right">Actions</span>
                </div>

                {/* Rows */}
                <div className="divide-y divide-white/[0.04]">
                  {processed.map((o: any) => {
                    const settled = o.ownerEarnings > 0 ? Math.min(100, Math.round(o.payoutSent / o.ownerEarnings * 100)) : 100;
                    const hasPending = o.pendingPayout > 0;
                    const isSelected = selected.has(o.id);
                    const isActive = panel?.id === o.id;

                    return (
                      <div key={o.id}
                        className={cn("grid grid-cols-[24px_1fr_90px_110px_110px_90px_110px_130px_80px] gap-3 px-4 py-3.5 items-center transition-colors cursor-pointer",
                          isActive ? "bg-primary/[0.08] border-l-2 border-primary" : "hover:bg-white/[0.03]",
                          o.commissionHeld && "opacity-60")}
                        onClick={() => openPanel(o)}>
                        <input type="checkbox" checked={isSelected}
                          onClick={e => e.stopPropagation()}
                          onChange={() => { const s = new Set(selected); s.has(o.id) ? s.delete(o.id) : s.add(o.id); setSelected(s); }}
                          className="accent-primary cursor-pointer mt-0.5" />

                        {/* Owner name */}
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary/25 to-violet-600/15 flex items-center justify-center text-primary text-[11px] font-black flex-shrink-0">
                            {o.name?.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-white truncate">{o.name}</p>
                            <p className="text-[10px] text-white/30 truncate">{o.businessName || o.email}</p>
                          </div>
                          {o.commissionHeld && <span className="text-[8px] font-black bg-red-500/15 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded-md uppercase flex-shrink-0">HELD</span>}
                        </div>

                        {/* Commission */}
                        <p className="text-sm font-bold text-violet-400">{o.commissionRate ?? 20}%</p>

                        {/* Gross */}
                        <p className="text-sm font-bold text-white/60">{fmtINR(o.grossRevenue)}</p>

                        {/* Owner share */}
                        <p className="text-sm font-bold text-emerald-400">{fmtINR(o.ownerEarnings)}</p>

                        {/* Settlement % + mini bar */}
                        <div className="space-y-1">
                          <p className="text-[11px] font-bold text-white/60">{settled}%</p>
                          <div className="h-1 bg-white/[0.07] rounded-full overflow-hidden w-12">
                            <div className={cn("h-full rounded-full", settled === 100 ? "bg-emerald-500" : "bg-primary")} style={{ width: `${settled}%` }} />
                          </div>
                        </div>

                        {/* Pending */}
                        <p className={cn("text-sm font-black", hasPending ? "text-amber-400" : "text-white/20")}>
                          {fmtINR(o.pendingPayout)}
                        </p>

                        {/* Schedule */}
                        <ScheduleBadge schedule={o.payoutSchedule || "manual"} />

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 justify-end" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => holdMut.mutate(o.id)}
                            className={cn("h-7 w-7 flex items-center justify-center rounded-lg transition-colors",
                              o.commissionHeld ? "bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30" : "bg-white/[0.05] text-white/40 hover:bg-amber-500/15 hover:text-amber-400")}>
                            {o.commissionHeld ? <CheckCircle2 className="h-3.5 w-3.5" /> : <PauseCircle className="h-3.5 w-3.5" />}
                          </button>
                          <button
                            disabled={!hasPending || o.commissionHeld}
                            onClick={() => { setPayDialog(o); setPayAmt(String(o.pendingPayout)); }}
                            className={cn("h-7 px-2.5 rounded-lg text-[11px] font-bold transition-colors",
                              hasPending && !o.commissionHeld ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-white/[0.04] text-white/20 cursor-not-allowed")}>
                            Pay
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Mobile cards */}
              <div className="lg:hidden space-y-2">
                {processed.map((o: any) => {
                  const settled = o.ownerEarnings > 0 ? Math.min(100, Math.round(o.payoutSent / o.ownerEarnings * 100)) : 100;
                  const hasPending = o.pendingPayout > 0;
                  return (
                    <div key={o.id}
                      className={cn("border rounded-2xl p-4 transition-all cursor-pointer",
                        panel?.id === o.id ? "border-primary bg-primary/[0.06]" : "border-white/[0.07] bg-white/[0.02] hover:border-white/15",
                        o.commissionHeld && "opacity-60")}
                      onClick={() => openPanel(o)}>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/25 to-violet-600/15 flex items-center justify-center text-primary font-black flex-shrink-0">
                          {o.name?.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-sm text-white">{o.name}</p>
                            {o.commissionHeld && <span className="text-[8px] font-black bg-red-500/15 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded-md uppercase">HELD</span>}
                            <ScheduleBadge schedule={o.payoutSchedule || "manual"} />
                          </div>
                          <p className="text-[11px] text-white/30 mt-0.5">{o.businessName || o.email} · {o.commissionRate ?? 20}% commission</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className={cn("text-base font-black", hasPending ? "text-amber-400" : "text-white/20")}>{fmtINR(o.pendingPayout)}</p>
                          <p className="text-[10px] text-white/25">{settled}% settled</p>
                        </div>
                      </div>
                      <div className="mt-3 h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                        <div className={cn("h-full rounded-full", settled === 100 ? "bg-emerald-500" : "bg-primary")} style={{ width: `${settled}%` }} />
                      </div>
                      <div className="mt-3 flex gap-2" onClick={e => e.stopPropagation()}>
                        <button onClick={() => holdMut.mutate(o.id)}
                          className={cn("flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-colors",
                            o.commissionHeld ? "bg-emerald-600/20 text-emerald-400" : "bg-white/[0.05] text-white/40")}>
                          {o.commissionHeld ? "Release" : "Hold"}
                        </button>
                        <button disabled={!hasPending || o.commissionHeld}
                          onClick={() => { setPayDialog(o); setPayAmt(String(o.pendingPayout)); }}
                          className={cn("flex-1 py-1.5 rounded-lg text-[11px] font-bold",
                            hasPending && !o.commissionHeld ? "bg-emerald-600 text-white" : "bg-white/[0.04] text-white/20 cursor-not-allowed")}>
                          Pay {fmtINR(o.pendingPayout)}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ════════════════════════ SLIDE-OUT OWNER PANEL ══════════════════════ */}
      {panel && (
        <div className="fixed top-0 right-0 h-full w-[380px] bg-[#0f1119] border-l border-white/[0.08] z-40 flex flex-col shadow-2xl">
          {/* Panel header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.07] flex-shrink-0">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/25 to-violet-600/15 flex items-center justify-center text-primary font-black flex-shrink-0">
              {panel.name?.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-sm text-white truncate">{panel.name}</p>
              <p className="text-[10px] text-white/35 truncate">{panel.email}</p>
            </div>
            <button onClick={() => setPanel(null)} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-white/[0.07] text-white/40 hover:text-white transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-white/[0.07] flex-shrink-0">
            {(["overview","history","settings"] as const).map(tab => (
              <button key={tab} onClick={() => setPanelTab(tab)}
                className={cn("flex-1 py-3 text-[11px] font-bold capitalize transition-colors",
                  panelTab === tab ? "border-b-2 border-primary text-white" : "text-white/35 hover:text-white/70")}>
                {tab}
              </button>
            ))}
          </div>

          {/* Panel body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">

            {/* ── OVERVIEW ── */}
            {panelTab === "overview" && (
              <>
                {/* Earnings breakdown */}
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 space-y-3">
                  <p className="text-[10px] font-black text-white/30 uppercase tracking-wider">Earnings Breakdown</p>
                  {[
                    { l: "Gross Revenue",    v: fmtINR(panel.grossRevenue),   c: "text-white/70" },
                    { l: `Admin Commission (${panel.commissionRate ?? 20}%)`, v: fmtINR(panel.adminCommission),  c: "text-violet-400" },
                    { l: "Owner Share",      v: fmtINR(panel.ownerEarnings),  c: "text-emerald-400 font-black" },
                    { l: "Already Paid",     v: fmtINR(panel.payoutSent),     c: "text-blue-400" },
                    { l: "Pending",          v: fmtINR(panel.pendingPayout),  c: "text-amber-400 font-black" },
                  ].map((r, i) => (
                    <div key={i} className={cn("flex justify-between text-sm", i === 2 && "pt-2 border-t border-white/[0.06]")}>
                      <span className="text-white/40">{r.l}</span>
                      <span className={r.c}>{r.v}</span>
                    </div>
                  ))}
                  <div className="pt-2">
                    <div className="flex justify-between text-[10px] text-white/30 mb-1">
                      <span>Settlement</span>
                      <span>{panel.ownerEarnings > 0 ? Math.round(panel.payoutSent / panel.ownerEarnings * 100) : 100}%</span>
                    </div>
                    <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full"
                        style={{ width: `${panel.ownerEarnings > 0 ? Math.min(100, Math.round(panel.payoutSent / panel.ownerEarnings * 100)) : 100}%` }} />
                    </div>
                  </div>
                </div>

                {/* Quick stats */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { l: "Turfs", v: panel.turfCount || 0 },
                    { l: "Bookings", v: panel.totalBookings || 0 },
                    { l: "Active", v: panel.activeTurfs || 0 },
                  ].map((s, i) => (
                    <div key={i} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 text-center">
                      <p className="text-xl font-black text-white">{s.v}</p>
                      <p className="text-[10px] text-white/30 mt-0.5">{s.l}</p>
                    </div>
                  ))}
                </div>

                {/* Bank details */}
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
                  <p className="text-[10px] font-black text-white/30 uppercase tracking-wider mb-3">Bank / UPI Details</p>
                  {!panel.bankDetails || !Object.values(panel.bankDetails).some(Boolean) ? (
                    <p className="text-sm text-white/25 italic">No bank details — auto-payout disabled</p>
                  ) : (
                    <div className="space-y-2 text-sm">
                      {panel.bankDetails.bankName && <div className="flex gap-2"><CreditCard className="h-3.5 w-3.5 text-white/25 mt-0.5 flex-shrink-0"/><span className="text-white/60">{panel.bankDetails.bankName}</span></div>}
                      {panel.bankDetails.accountName && <div className="flex justify-between"><span className="text-white/30 text-xs">Holder</span><span className="text-white/60">{panel.bankDetails.accountName}</span></div>}
                      {panel.bankDetails.accountNumber && <div className="flex justify-between"><span className="text-white/30 text-xs">Account</span><span className="text-white/60 font-mono">{"●".repeat(Math.max(0,panel.bankDetails.accountNumber.length-4))}{panel.bankDetails.accountNumber.slice(-4)}</span></div>}
                      {panel.bankDetails.ifscCode && <div className="flex justify-between"><span className="text-white/30 text-xs">IFSC</span><span className="text-white/60 font-mono">{panel.bankDetails.ifscCode}</span></div>}
                      {panel.bankDetails.upiId && <div className="flex justify-between"><span className="text-white/30 text-xs">UPI</span><span className="text-white/60">{panel.bankDetails.upiId}</span></div>}
                    </div>
                  )}
                  {panel.razorpayContactId && (
                    <p className="mt-3 text-[10px] text-emerald-400/60 flex items-center gap-1 pt-3 border-t border-white/[0.06]">
                      <ShieldCheck className="h-3 w-3" /> RZP Contact: {panel.razorpayContactId}
                    </p>
                  )}
                  <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-1">
                    <p className="text-[10px] text-white/30 flex items-center gap-1.5"><Mail className="h-3 w-3"/>{panel.email}</p>
                    {panel.phone && <p className="text-[10px] text-white/30 flex items-center gap-1.5"><Phone className="h-3 w-3"/>{panel.phone}</p>}
                  </div>
                </div>
              </>
            )}

            {/* ── HISTORY ── */}
            {panelTab === "history" && (
              <>
                {(!panel.payoutHistory || panel.payoutHistory.length === 0) ? (
                  <div className="text-center py-12 text-white/25">
                    <History className="h-10 w-10 mx-auto mb-3 opacity-20" />
                    <p className="text-sm">No payouts yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {[...panel.payoutHistory].reverse().map((p: any, i: number) => (
                      <div key={i} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3.5">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="text-base font-black text-emerald-400">{fmtINR(p.amount)}</p>
                            <p className="text-[10px] text-white/35 mt-0.5 capitalize">
                              {p.method?.replace("_", " ")} · {p.date ? format(new Date(p.date), "dd MMM yyyy, hh:mm a") : "—"}
                            </p>
                            {p.note && <p className="text-[10px] text-white/25 italic mt-0.5">"{p.note}"</p>}
                          </div>
                          <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                        </div>
                        {p.razorpayPayoutId && (
                          <div className="mt-2 flex items-center gap-2 flex-wrap pt-2 border-t border-white/[0.06]">
                            <RzpBadge id={p.razorpayPayoutId} status={p.razorpayStatus} />
                            <span className="text-[9px] text-white/20 font-mono">{p.razorpayPayoutId}</span>
                            {p.razorpayMode && <span className="text-[9px] text-white/20">{p.razorpayMode}</span>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ── SETTINGS ── */}
            {panelTab === "settings" && (
              <>
                {/* Commission rate */}
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-black text-white/30 uppercase tracking-wider">Commission Rate</p>
                    {!editRate && (
                      <button onClick={() => { setEditRate(true); setRateVal(String(panel.commissionRate ?? 20)); }}
                        className="text-[10px] text-primary font-bold flex items-center gap-1 hover:underline">
                        <Pencil className="h-3 w-3" /> Edit
                      </button>
                    )}
                  </div>
                  {editRate ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Input type="number" min="0" max="100" value={rateVal} onChange={e => setRateVal(e.target.value)}
                          className="bg-white/[0.06] border-white/10 text-white text-xl font-black h-11 text-center" />
                        <span className="text-xl font-black text-white/50">%</span>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="flex-1 h-8 bg-transparent border-white/15 text-white/50 hover:text-white text-xs"
                          onClick={() => setEditRate(false)}>Cancel</Button>
                        <Button size="sm" className="flex-1 h-8 bg-primary hover:bg-primary/90 text-xs font-bold"
                          disabled={rateMut.isPending}
                          onClick={() => rateMut.mutate({ id: panel.id, rate: Number(rateVal) })}>
                          {rateMut.isPending ? "Saving…" : "Save"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-3xl font-black text-violet-400">{panel.commissionRate ?? 20}%</p>
                  )}
                </div>

                {/* Payout schedule */}
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
                  <p className="text-[10px] font-black text-white/30 uppercase tracking-wider mb-3">Payout Schedule</p>
                  <div className="space-y-2">
                    {(["immediate","daily","weekly","manual"] as const).map(s => {
                      const cfg = SCHEDULE_CFG[s];
                      const Icon = cfg.icon;
                      const active = (panel.payoutSchedule || "manual") === s;
                      return (
                        <button key={s} onClick={() => scheduleMut.mutate({ id: panel.id, schedule: s })}
                          className={cn("w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all",
                            active ? "border-primary bg-primary/[0.08]" : "border-white/[0.07] bg-white/[0.02] hover:border-white/15")}>
                          <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 border", cfg.color)}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-bold text-white">{cfg.label}</p>
                            <p className="text-[10px] text-white/35">{cfg.desc}</p>
                          </div>
                          {active && <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Hold toggle */}
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
                  <p className="text-[10px] font-black text-white/30 uppercase tracking-wider mb-3">Payout Hold</p>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-white">{panel.commissionHeld ? "Payouts frozen" : "Payouts active"}</p>
                      <p className="text-[10px] text-white/35 mt-0.5">{panel.commissionHeld ? "No payouts will be sent" : "Payouts run on schedule"}</p>
                    </div>
                    <Button size="sm"
                      className={cn("h-8 text-xs font-bold gap-1.5", panel.commissionHeld ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600/70 hover:bg-red-700")}
                      onClick={() => holdMut.mutate(panel.id)} disabled={holdMut.isPending}>
                      {panel.commissionHeld ? <><CheckCircle2 className="h-3.5 w-3.5"/> Release</> : <><PauseCircle className="h-3.5 w-3.5"/> Hold</>}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Panel footer — always visible pay button */}
          <div className="p-4 border-t border-white/[0.07] flex-shrink-0">
            {panel.commissionHeld && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-xs text-red-400 mb-3">
                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" /> Payouts are on hold for this owner
              </div>
            )}
            <Button
              className="w-full h-11 font-bold gap-2 bg-emerald-600 hover:bg-emerald-700"
              disabled={!panel.pendingPayout || panel.pendingPayout <= 0 || panel.commissionHeld}
              onClick={() => { setPayDialog(panel); setPayAmt(String(panel.pendingPayout)); }}>
              <Wallet className="h-4 w-4" />
              {panel.pendingPayout > 0 ? `Pay ${fmtINR(panel.pendingPayout)} to ${panel.name?.split(" ")[0]}` : "Nothing Pending"}
            </Button>
          </div>
        </div>
      )}

      {/* ══════════════════════ PAY DIALOG ══════════════════════════════════ */}
      <Dialog open={!!payDialog} onOpenChange={() => { setPayDialog(null); setPayAmt(""); setPayNote(""); }}>
        <DialogContent className="sm:max-w-sm bg-[#0f1119] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white text-base">
              {rzp?.configured ? <ShieldCheck className="h-5 w-5 text-emerald-400" /> : <Wallet className="h-5 w-5 text-emerald-400" />}
              {rzp?.configured ? "Send via Razorpay" : "Record Payout"} — {payDialog?.name?.split(" ")[0]}
            </DialogTitle>
          </DialogHeader>
          {payDialog && (
            <div className="space-y-4 pt-1">
              {rzp?.configured ? (
                <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-xs text-emerald-400">
                  <ShieldCheck className="h-3.5 w-3.5 flex-shrink-0" />
                  Razorpay X active — money transfers to owner's account instantly
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-white/[0.04] border border-white/10 rounded-xl p-3 text-xs text-white/40">
                  <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                  Razorpay X not configured — recorded as manual payout
                </div>
              )}

              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { l: "Owner Share", v: fmtINR(payDialog.ownerEarnings), c: "text-emerald-400" },
                  { l: "Paid",        v: fmtINR(payDialog.payoutSent),    c: "text-blue-400" },
                  { l: "Pending",     v: fmtINR(payDialog.pendingPayout), c: "text-amber-400 font-black" },
                ].map((s, i) => (
                  <div key={i} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-2.5">
                    <p className={cn("text-sm font-black", s.c)}>{s.v}</p>
                    <p className="text-[9px] text-white/30 mt-0.5">{s.l}</p>
                  </div>
                ))}
              </div>

              {payDialog.bankDetails && Object.values(payDialog.bankDetails).some(Boolean) && (
                <div className="bg-white/[0.03] rounded-xl p-3 text-xs space-y-1">
                  <p className="text-[10px] font-bold text-white/25 uppercase mb-1.5">Paying To</p>
                  {payDialog.bankDetails.bankName && <p className="text-white/50">{payDialog.bankDetails.bankName}</p>}
                  {payDialog.bankDetails.accountNumber && <p className="text-white/50 font-mono">Acc: ●●●●{payDialog.bankDetails.accountNumber.slice(-4)}</p>}
                  {payDialog.bankDetails.ifscCode && <p className="text-white/50 font-mono">IFSC: {payDialog.bankDetails.ifscCode}</p>}
                  {payDialog.bankDetails.upiId && <p className="text-white/50">UPI: {payDialog.bankDetails.upiId}</p>}
                </div>
              )}

              <div>
                <label className="text-xs text-white/40 font-medium">Amount (₹)</label>
                <Input type="number" value={payAmt} onChange={e => setPayAmt(e.target.value)}
                  className="mt-1 bg-white/[0.06] border-white/10 text-white text-2xl font-black h-12 text-center" />
                <div className="flex gap-1.5 mt-2">
                  {[25,50,75,100].map(p => (
                    <button key={p} type="button"
                      onClick={() => setPayAmt(String(Math.round(payDialog.pendingPayout * p / 100)))}
                      className={cn("flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-colors",
                        p === 100 ? "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25" : "bg-white/[0.05] text-white/40 hover:bg-white/[0.08] hover:text-white")}>
                      {p}%
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/40 font-medium">Method</label>
                  <Select value={payMode} onValueChange={setPayMode}>
                    <SelectTrigger className="mt-1 bg-white/[0.06] border-white/10 text-white h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank_transfer">Bank Transfer {rzp?.configured ? "· RZP" : ""}</SelectItem>
                      <SelectItem value="upi">UPI {rzp?.configured ? "· RZP" : ""}</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-white/40 font-medium">Note</label>
                  <Input value={payNote} onChange={e => setPayNote(e.target.value)}
                    placeholder="Optional note…"
                    className="mt-1 bg-white/[0.06] border-white/10 text-white h-9 text-xs placeholder:text-white/20" />
                </div>
              </div>

              <Button className="w-full h-11 font-bold gap-2 bg-emerald-600 hover:bg-emerald-700"
                disabled={payMut.isPending || !payAmt || Number(payAmt) <= 0}
                onClick={() => payMut.mutate({ id: payDialog.id, amount: Number(payAmt), note: payNote, method: payMode })}>
                {payMut.isPending ? "Processing…"
                  : rzp?.configured && (payMode === "bank_transfer" || payMode === "upi")
                    ? <><ShieldCheck className="h-4 w-4"/>Send ₹{(Number(payAmt)||0).toLocaleString("en-IN")} via Razorpay</>
                    : <><Wallet className="h-4 w-4"/>Record ₹{(Number(payAmt)||0).toLocaleString("en-IN")} Payout</>}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ══════════════════════ BULK PAY DIALOG ═════════════════════════════ */}
      <Dialog open={bulkDialog} onOpenChange={() => setBulkDialog(false)}>
        <DialogContent className="sm:max-w-sm bg-[#0f1119] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white text-base">
              <Users className="h-5 w-5 text-emerald-400" /> Bulk Payout — {selected.size} owners
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-center">
              <p className="text-2xl font-black text-amber-400">{fmtINR(selectedPending)}</p>
              <p className="text-xs text-white/40 mt-1">Total pending across {selected.size} selected owners</p>
            </div>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {selectedOwners.map((o: any) => (
                <div key={o.id} className="flex items-center justify-between text-sm bg-white/[0.03] rounded-lg px-3 py-2">
                  <span className="text-white/70">{o.name}</span>
                  <span className="font-bold text-amber-400">{fmtINR(o.pendingPayout)}</span>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-white/40 font-medium">Method</label>
                <Select value={bulkMode} onValueChange={setBulkMode}>
                  <SelectTrigger className="mt-1 bg-white/[0.06] border-white/10 text-white h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-white/40 font-medium">Note</label>
                <Input value={bulkNote} onChange={e => setBulkNote(e.target.value)} placeholder="Bulk settlement…"
                  className="mt-1 bg-white/[0.06] border-white/10 text-white h-9 text-xs placeholder:text-white/20" />
              </div>
            </div>
            <Button className="w-full h-11 font-bold gap-2 bg-emerald-600 hover:bg-emerald-700"
              disabled={bulkMut.isPending || selectedPending === 0}
              onClick={() => bulkMut.mutate({ ownerIds: Array.from(selected), note: bulkNote, method: bulkMode })}>
              {bulkMut.isPending ? "Processing…" : <><Wallet className="h-4 w-4"/>Pay {fmtINR(selectedPending)} to {selected.size} owners</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
