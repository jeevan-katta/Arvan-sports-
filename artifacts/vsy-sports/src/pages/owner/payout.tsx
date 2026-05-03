import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import {
  Wallet, CheckCircle2, Clock, AlertCircle, ArrowUpRight,
  History, Landmark, RefreshCw, ChevronDown, ChevronUp,
  IndianRupee, CreditCard, SlidersHorizontal, X,
  Pencil, Save, ShieldCheck, BadgeCheck, TriangleAlert,
  Building2, Smartphone, Eye, EyeOff, Banknote,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const fmtINR = (n: number | undefined | null) =>
  `₹${(n || 0).toLocaleString("en-IN")}`;

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - i);

// ── Validators ─────────────────────────────────────────────────────────────────
const validateIFSC  = (v: string) => !v || /^[A-Z]{4}0[A-Z0-9]{6}$/.test(v.toUpperCase());
const validateUPI   = (v: string) => !v || /^[\w.\-+]+@[\w]+$/.test(v);
const validateAccNo = (v: string) => !v || /^\d{9,18}$/.test(v);

// ── Bank Details Form ──────────────────────────────────────────────────────────
function BankDetailsForm({
  initial,
  token,
  onSaved,
  onCancel,
}: {
  initial: any;
  token: string;
  onSaved: (data: any) => void;
  onCancel: () => void;
}) {
  const { toast } = useToast();
  const [tab, setTab] = useState<"bank" | "upi">(
    initial?.upiId && !initial?.accountNumber ? "upi" : "bank"
  );
  const [showAccNo, setShowAccNo] = useState(false);

  const [form, setForm] = useState({
    bankName:      initial?.bankName      || "",
    accountName:   initial?.accountName   || "",
    accountNumber: initial?.accountNumber || "",
    ifscCode:      initial?.ifscCode      || "",
    upiId:         initial?.upiId         || "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = k === "ifscCode" ? e.target.value.toUpperCase() : e.target.value;
    setForm(f => ({ ...f, [k]: v }));
    setErrors(er => { const n = { ...er }; delete n[k]; return n; });
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (tab === "bank") {
      if (!form.accountName.trim()) errs.accountName = "Account holder name is required";
      if (!form.accountNumber.trim()) errs.accountNumber = "Account number is required";
      else if (!validateAccNo(form.accountNumber)) errs.accountNumber = "Must be 9–18 digits";
      if (!form.ifscCode.trim()) errs.ifscCode = "IFSC code is required";
      else if (!validateIFSC(form.ifscCode)) errs.ifscCode = "Format: SBIN0001234";
    } else {
      if (!form.upiId.trim()) errs.upiId = "UPI ID is required";
      else if (!validateUPI(form.upiId)) errs.upiId = "Format: name@upi or name@bank";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const payload = tab === "bank"
        ? { bankName: form.bankName, accountName: form.accountName, accountNumber: form.accountNumber, ifscCode: form.ifscCode, upiId: "" }
        : { bankName: "", accountName: "", accountNumber: "", ifscCode: "", upiId: form.upiId };
      const r = await fetch("/api/owner/bank-details", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Failed to save");
      return data;
    },
    onSuccess: (data) => {
      toast({ title: "Bank details saved!", description: "Payouts will be sent to this account." });
      onSaved(data.bankDetails);
    },
    onError: (e: any) => {
      toast({ variant: "destructive", title: "Error", description: e.message });
    },
  });

  const handleSave = () => { if (validate()) mutate(); };

  return (
    <div className="space-y-4">
      {/* Tab switcher */}
      <div className="flex bg-muted rounded-xl p-1 gap-1">
        <button
          onClick={() => setTab("bank")}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all",
            tab === "bank"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Building2 className="h-3.5 w-3.5" /> Bank Account
        </button>
        <button
          onClick={() => setTab("upi")}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all",
            tab === "upi"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Smartphone className="h-3.5 w-3.5" /> UPI ID
        </button>
      </div>

      {tab === "bank" ? (
        <div className="space-y-3">
          {/* Bank name */}
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Bank Name <span className="font-normal normal-case">(optional)</span>
            </label>
            <Input
              value={form.bankName}
              onChange={set("bankName")}
              placeholder="e.g. State Bank of India"
              className="h-11 text-sm"
            />
          </div>

          {/* Account holder */}
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Account Holder Name <span className="text-destructive">*</span>
            </label>
            <Input
              value={form.accountName}
              onChange={set("accountName")}
              placeholder="As on bank records"
              className={cn("h-11 text-sm", errors.accountName && "border-destructive focus-visible:ring-destructive")}
            />
            {errors.accountName && <p className="text-xs text-destructive mt-1">{errors.accountName}</p>}
          </div>

          {/* Account number */}
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Account Number <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <Input
                type={showAccNo ? "text" : "password"}
                value={form.accountNumber}
                onChange={set("accountNumber")}
                placeholder="9–18 digit account number"
                className={cn("h-11 text-sm pr-10", errors.accountNumber && "border-destructive focus-visible:ring-destructive")}
                inputMode="numeric"
              />
              <button
                type="button"
                onClick={() => setShowAccNo(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showAccNo ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.accountNumber
              ? <p className="text-xs text-destructive mt-1">{errors.accountNumber}</p>
              : <p className="text-[10px] text-muted-foreground mt-1">Stored securely — only last 4 digits shown</p>
            }
          </div>

          {/* IFSC */}
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              IFSC Code <span className="text-destructive">*</span>
            </label>
            <Input
              value={form.ifscCode}
              onChange={set("ifscCode")}
              placeholder="e.g. SBIN0001234"
              className={cn("h-11 text-sm font-mono", errors.ifscCode && "border-destructive focus-visible:ring-destructive")}
              maxLength={11}
            />
            {errors.ifscCode
              ? <p className="text-xs text-destructive mt-1">{errors.ifscCode}</p>
              : <p className="text-[10px] text-muted-foreground mt-1">11-character code on your cheque/passbook</p>
            }
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex items-start gap-2.5">
            <Smartphone className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-bold text-foreground">Pay via UPI</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Payouts via UPI are instant. Your phone-linked UPI ID works here.
              </p>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              UPI ID <span className="text-destructive">*</span>
            </label>
            <Input
              value={form.upiId}
              onChange={set("upiId")}
              placeholder="yourname@upi or 9876543210@ybl"
              className={cn("h-11 text-sm", errors.upiId && "border-destructive focus-visible:ring-destructive")}
              autoCapitalize="none"
              autoComplete="off"
            />
            {errors.upiId
              ? <p className="text-xs text-destructive mt-1">{errors.upiId}</p>
              : <p className="text-[10px] text-muted-foreground mt-1">Format: name@paytm · number@ybl · name@oksbi</p>
            }
          </div>
          {form.upiId && validateUPI(form.upiId) && (
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2.5">
              <BadgeCheck className="h-4 w-4 text-emerald-500 flex-shrink-0" />
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Valid UPI format</p>
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 pt-1">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 h-11"
          onClick={onCancel}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button
          size="sm"
          className="flex-1 h-11 font-bold gap-2"
          onClick={handleSave}
          disabled={isPending}
        >
          {isPending ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {isPending ? "Saving…" : "Save Details"}
        </Button>
      </div>
    </div>
  );
}

// ── Read-only bank details view ────────────────────────────────────────────────
function BankDetailsView({ bd }: { bd: any }) {
  const hasBank = bd?.accountNumber || bd?.ifscCode;
  const hasUPI  = bd?.upiId;

  if (!hasBank && !hasUPI) return null;

  return (
    <div className="space-y-2.5 text-sm">
      {bd.bankName && (
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <Landmark className="h-3.5 w-3.5" /> Bank
          </span>
          <span className="font-semibold">{bd.bankName}</span>
        </div>
      )}
      {bd.accountName && (
        <div className="flex justify-between items-center border-t border-border pt-2">
          <span className="text-muted-foreground text-xs">Holder</span>
          <span className="font-semibold">{bd.accountName}</span>
        </div>
      )}
      {bd.accountNumber && (
        <div className="flex justify-between items-center border-t border-border pt-2">
          <span className="text-muted-foreground text-xs">Account</span>
          <span className="font-mono font-semibold">
            {"●".repeat(Math.max(0, bd.accountNumber.length - 4))}{bd.accountNumber.slice(-4)}
          </span>
        </div>
      )}
      {bd.ifscCode && (
        <div className="flex justify-between items-center border-t border-border pt-2">
          <span className="text-muted-foreground text-xs">IFSC</span>
          <span className="font-mono font-semibold">{bd.ifscCode}</span>
        </div>
      )}
      {bd.upiId && (
        <div className={cn("flex justify-between items-center pt-2", (hasBank) && "border-t border-border")}>
          <span className="text-muted-foreground text-xs flex items-center gap-1.5">
            <Smartphone className="h-3.5 w-3.5" /> UPI
          </span>
          <span className="font-semibold text-primary">{bd.upiId}</span>
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function OwnerPayout() {
  const { token } = useAuth();
  const qc = useQueryClient();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [editingBank, setEditingBank] = useState(false);

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<string>(String(now.getMonth() + 1));
  const [selectedYear, setSelectedYear]   = useState<string>(String(now.getFullYear()));
  const [selectedTurf, setSelectedTurf]   = useState<string>("");

  const hasFilter = !!(selectedMonth || selectedYear || selectedTurf);

  const { data: turfs = [] } = useQuery<any[]>({
    queryKey: ["owner-turfs-list"],
    queryFn: () =>
      fetch("/api/owner/turfs", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    enabled: !!token,
  });

  const params = new URLSearchParams();
  if (selectedMonth) params.set("month", selectedMonth);
  if (selectedYear)  params.set("year",  selectedYear);
  if (selectedTurf)  params.set("turfId", selectedTurf);
  const qs = params.toString() ? `?${params.toString()}` : "";

  const { data: payout, isLoading } = useQuery<any>({
    queryKey: ["owner-payout-status", selectedMonth, selectedYear, selectedTurf],
    queryFn: async () => {
      const r = await fetch(`/api/owner/payout-status${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return r.json();
    },
    enabled: !!token,
  });

  const clearFilters = () => {
    setSelectedMonth(""); setSelectedYear(""); setSelectedTurf("");
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  const settled    = payout?.ownerEarnings > 0
    ? Math.min(100, Math.round((payout.payoutSent / payout.ownerEarnings) * 100))
    : 0;
  const ownerPct   = 100 - (payout?.commissionRate ?? 20);
  const bd         = payout?.bankDetails ?? {};
  const hasBank    = !!(bd.accountNumber || bd.ifscCode);
  const hasUPI     = !!bd.upiId;
  const hasAny     = hasBank || hasUPI;
  const pendingCashBookings = payout?.pendingCashBookings ?? [];
  const pendingCashTotal = pendingCashBookings.reduce((sum: number, booking: any) => {
    const pending = booking.pendingCashAmount ?? Math.max(0, (booking.totalPrice || 0) - (booking.paidAmount || 0));
    return sum + pending;
  }, 0);

  const onBankSaved = (newBd: any) => {
    setEditingBank(false);
    qc.setQueryData(
      ["owner-payout-status", selectedMonth, selectedYear, selectedTurf],
      (old: any) => old ? { ...old, bankDetails: newBd } : old
    );
    qc.invalidateQueries({ queryKey: ["owner-payout-status"] });
    qc.invalidateQueries({ queryKey: ["owner-today"] });
  };

  return (
    <div className="p-4 space-y-5 pb-10">

      {/* ── Header ── */}
      <div className="pt-2 flex items-start justify-between">
        <div>
          <h2 className="text-xl font-display font-bold flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" /> Payout Dashboard
          </h2>
          <p className="text-muted-foreground text-sm mt-0.5">
            {hasFilter ? "Filtered view · earnings & revenue data" : "Your earnings, settlement & payment details"}
          </p>
        </div>
        <button
          onClick={() => setFiltersOpen(v => !v)}
          className={cn(
            "flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border transition-all",
            filtersOpen || hasFilter
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-muted text-muted-foreground border-border hover:border-primary hover:text-primary"
          )}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" /> Filters
          {hasFilter && (
            <span className="ml-0.5 bg-white/20 text-white text-[10px] font-black px-1.5 rounded-full">
              {[selectedMonth, selectedYear, selectedTurf].filter(Boolean).length}
            </span>
          )}
        </button>
      </div>

      {/* ── Filter Panel ── */}
      {filtersOpen && (
        <Card className="p-4 border-none shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold">Filter Earnings</p>
            {hasFilter && (
              <button onClick={clearFilters} className="text-xs text-destructive flex items-center gap-1 font-medium">
                <X className="h-3 w-3" /> Clear all
              </button>
            )}
          </div>
          {turfs.length > 1 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wider">Turf</p>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setSelectedTurf("")}
                  className={cn("text-xs px-3 py-1.5 rounded-xl border font-bold transition-all",
                    !selectedTurf ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground border-border")}>
                  All Turfs
                </button>
                {turfs.map((t: any) => (
                  <button key={t.id} onClick={() => setSelectedTurf(t.id)}
                    className={cn("text-xs px-3 py-1.5 rounded-xl border font-bold transition-all",
                      selectedTurf === t.id ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground border-border")}>
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wider">Month</p>
              <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
                className="w-full text-sm bg-muted rounded-xl px-3 py-2 border border-border font-medium appearance-none focus:outline-none focus:ring-2 focus:ring-primary">
                <option value="">All months</option>
                {MONTHS.map((m, i) => <option key={i} value={String(i + 1)}>{m}</option>)}
              </select>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wider">Year</p>
              <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)}
                className="w-full text-sm bg-muted rounded-xl px-3 py-2 border border-border font-medium appearance-none focus:outline-none focus:ring-2 focus:ring-primary">
                <option value="">All years</option>
                {YEARS.map(y => <option key={y} value={String(y)}>{y}</option>)}
              </select>
            </div>
          </div>
          {hasFilter && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl px-3 py-2 text-xs text-primary font-medium">
              Showing: {[
                selectedTurf ? turfs.find((t:any) => t.id === selectedTurf)?.name : null,
                selectedMonth ? MONTHS[parseInt(selectedMonth) - 1] : null,
                selectedYear || null,
              ].filter(Boolean).join(" · ") || "All data"}
            </div>
          )}
        </Card>
      )}

      {/* ── Status Banner ── */}
      <div className={cn("rounded-2xl border p-4",
        payout?.commissionHeld ? "bg-red-500/10 border-red-500/30"
          : payout?.pendingPayout > 0 ? "bg-amber-500/10 border-amber-500/30"
          : "bg-emerald-500/10 border-emerald-500/30")}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            {payout?.commissionHeld
              ? <AlertCircle className="h-4 w-4 text-red-500" />
              : payout?.pendingPayout > 0
                ? <Clock className="h-4 w-4 text-amber-500" />
                : <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
            <span className="font-bold text-sm">
              {payout?.commissionHeld ? "Payout On Hold" : payout?.pendingPayout > 0 ? "Payment Pending" : "All Settled"}
            </span>
            {payout?.commissionHeld && (
              <span className="text-[9px] font-black bg-red-500/20 text-red-500 border border-red-500/30 px-2 py-0.5 rounded-full uppercase">HELD</span>
            )}
            {hasFilter && (
              <span className="text-[9px] font-black bg-primary/15 text-primary border border-primary/30 px-2 py-0.5 rounded-full uppercase">FILTERED</span>
            )}
          </div>
          <span className="text-xs text-muted-foreground capitalize flex items-center gap-1">
            <RefreshCw className="h-3 w-3" />{payout?.payoutSchedule ?? "manual"}
          </span>
        </div>
        {payout?.commissionHeld && (
          <p className="text-xs text-red-600 dark:text-red-400 mt-2 mb-3">Your payouts are currently frozen. Please contact admin.</p>
        )}
        <div className="mt-3">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-muted-foreground">{settled}% settled</span>
            <span className="font-bold">{fmtINR(payout?.payoutSent)} / {fmtINR(payout?.ownerEarnings)}</span>
          </div>
          <div className="h-3 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
            <div className={cn("h-full rounded-full transition-all duration-500", settled === 100 ? "bg-emerald-500" : "bg-primary")}
              style={{ width: `${settled}%` }} />
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
        <Card className={cn("p-4 border-none shadow-sm", payout?.pendingPayout > 0 ? "bg-amber-500/10" : "bg-emerald-500/10")}>
          <Wallet className={cn("h-4 w-4 mb-2", payout?.pendingPayout > 0 ? "text-amber-500" : "text-emerald-500")} />
          <p className={cn("text-2xl font-black", payout?.pendingPayout > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400")}>
            {fmtINR(payout?.pendingPayout)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Pending Payout</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Awaiting transfer</p>
        </Card>
        <Card className="p-4 border-none shadow-sm">
          <CheckCircle2 className="h-4 w-4 mb-2 text-emerald-500" />
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{fmtINR(payout?.payoutSent)}</p>
          <p className="text-xs text-muted-foreground mt-1">Total Received</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{payout?.payoutHistory?.length ?? 0} transactions</p>
        </Card>
        <Card className="p-4 border-none shadow-sm">
          <IndianRupee className="h-4 w-4 mb-2 text-muted-foreground" />
          <p className="text-2xl font-black">{fmtINR(payout?.grossRevenue)}</p>
          <p className="text-xs text-muted-foreground mt-1">Gross Revenue</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Admin: {fmtINR(payout?.adminCommission)} ({payout?.commissionRate}%)
          </p>
        </Card>
        <Card className="p-4 border-none shadow-sm bg-amber-500/10">
          <Banknote className="h-4 w-4 mb-2 text-amber-500" />
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400">{fmtINR(pendingCashTotal)}</p>
          <p className="text-xs text-muted-foreground mt-1">Pending Cash Bookings</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{pendingCashBookings.length} bookings awaiting cash</p>
        </Card>
      </div>

      {/* ── Revenue Split ── */}
      <Card className="p-4 border-none shadow-sm">
        <h3 className="font-bold text-sm mb-3">Revenue Split</h3>
        <div className="space-y-3">
          {[
            { label: "Gross Revenue",                              val: payout?.grossRevenue,    pct: 100,                      color: "bg-muted-foreground/20", textColor: "text-foreground" },
            { label: `Admin Commission (${payout?.commissionRate ?? 20}%)`, val: payout?.adminCommission, pct: payout?.commissionRate ?? 20, color: "bg-orange-400",          textColor: "text-orange-500" },
            { label: `Your Share (${ownerPct}%)`,                  val: payout?.ownerEarnings,   pct: ownerPct,                 color: "bg-primary",             textColor: "text-primary" },
          ].map((row, i) => (
            <div key={i}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">{row.label}</span>
                <span className={cn("font-bold", row.textColor)}>{fmtINR(row.val)}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className={cn("h-full rounded-full", row.color)} style={{ width: `${row.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* ── Bank / UPI Details ── */}
      <Card className="p-4 border-none shadow-sm">
        {/* Card header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <Landmark className="h-4 w-4 text-primary" /> Payment Details
          </h3>
          {!editingBank && (
            <button
              onClick={() => setEditingBank(true)}
              className="flex items-center gap-1.5 text-xs font-bold text-primary hover:opacity-75 transition-opacity"
            >
              <Pencil className="h-3.5 w-3.5" />
              {hasAny ? "Edit" : "Add Details"}
            </button>
          )}
        </div>

        {editingBank ? (
          <BankDetailsForm
            initial={bd}
            token={token!}
            onSaved={onBankSaved}
            onCancel={() => setEditingBank(false)}
          />
        ) : hasAny ? (
          <>
            {/* Verified badge */}
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2.5 mb-4">
              <ShieldCheck className="h-4 w-4 text-emerald-500 flex-shrink-0" />
              <div>
                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  {hasUPI && !hasBank ? "UPI linked for payouts" : "Bank account linked for payouts"}
                </p>
                <p className="text-[10px] text-muted-foreground">Payouts will be sent to this account</p>
              </div>
            </div>
            <BankDetailsView bd={bd} />
            <p className="text-[10px] text-muted-foreground mt-4 pt-3 border-t border-border">
              Payouts processed per your{" "}
              <span className="font-bold capitalize">{payout?.payoutSchedule ?? "manual"}</span>{" "}
              schedule. Tap Edit to update your details.
            </p>
          </>
        ) : (
          /* Empty state — prompt to add */
          <div className="space-y-4">
            <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
              <TriangleAlert className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-bold text-amber-600 dark:text-amber-400">No payment details added</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Add your bank account or UPI ID so admin can send your earnings directly to you.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setEditingBank(true)}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-all group"
              >
                <Building2 className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                <p className="text-xs font-bold text-muted-foreground group-hover:text-foreground transition-colors">Add Bank Account</p>
              </button>
              <button
                onClick={() => setEditingBank(true)}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-all group"
              >
                <Smartphone className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                <p className="text-xs font-bold text-muted-foreground group-hover:text-foreground transition-colors">Add UPI ID</p>
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* ── Payout History ── */}
      <div>
        <button
          onClick={() => setHistoryOpen(v => !v)}
          className="w-full flex items-center justify-between font-bold text-sm py-1 mb-3"
        >
          <span className="flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            Payout History
            <span className="bg-primary/10 text-primary text-[10px] font-black px-2 py-0.5 rounded-full">
              {payout?.payoutHistory?.length ?? 0}
            </span>
          </span>
          {historyOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>

        {historyOpen && (
          <div className="space-y-2">
            {!payout?.payoutHistory?.length ? (
              <Card className="p-6 border-none shadow-sm text-center">
                <Wallet className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-20" />
                <p className="font-bold text-muted-foreground text-sm">No payouts received yet</p>
                <p className="text-xs text-muted-foreground mt-1">Payments will appear here once processed</p>
              </Card>
            ) : (
              <>
                {[...payout.payoutHistory].reverse().map((p: any, i: number) => (
                  <Card key={i} className="p-4 border-none shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
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
              </>
            )}
          </div>
        )}

        {!historyOpen && !payout?.payoutHistory?.length && (
          <Card className="p-5 border-none shadow-sm text-center">
            <Wallet className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-20" />
            <p className="font-bold text-muted-foreground text-sm">No payouts yet</p>
            <p className="text-xs text-muted-foreground mt-1">Your payment history will appear here</p>
          </Card>
        )}
      </div>
    </div>
  );
}
