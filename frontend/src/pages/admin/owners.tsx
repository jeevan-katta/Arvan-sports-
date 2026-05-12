import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Building2, Plus, Search, ChevronDown, ChevronUp,
  Eye, EyeOff, Pencil, Wallet, MapPin, Trash2,
  Phone, Mail, CreditCard, PauseCircle, PlayCircle,
  CheckCircle2, XCircle, History, IndianRupee, AlertCircle,
  User, Home, FileText, Landmark, RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";

const fmtINR = (n: number | undefined | null) => `₹${(n || 0).toLocaleString("en-IN")}`;
const hdr = (t: string) => ({ "Content-Type": "application/json", Authorization: `Bearer ${t}` });

const createSchema = z.object({
  // Personal
  name: z.string().min(2, "Full name required"),
  email: z.string().email("Valid email required"),
  password: z.string().min(6, "Min 6 characters"),
  phone: z.string().min(10, "Valid phone required"),
  // Business
  businessName: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  // Commission & payout
  commissionRate: z.coerce.number().min(0).max(100).default(20),
  payoutSchedule: z.string().default("manual"),
  // Bank
  bankDetails: z.object({
    bankName: z.string().optional(),
    accountName: z.string().optional(),
    accountNumber: z.string().optional(),
    ifscCode: z.string().optional(),
    upiId: z.string().optional(),
  }).optional(),
  notes: z.string().optional(),
});

type CreateForm = z.infer<typeof createSchema>;

const FORM_SECTIONS = ["Personal", "Business", "Commission", "Bank & Notes"] as const;

export default function AdminOwners() {
  const { token } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "blocked" | "held">("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [formStep, setFormStep] = useState(0);
  const [editOwner, setEditOwner] = useState<any>(null);
  const [editRate, setEditRate] = useState("20");
  const [editSchedule, setEditSchedule] = useState("manual");
  const [payoutOwner, setPayoutOwner] = useState<any>(null);
  const [historyOwner, setHistoryOwner] = useState<any>(null);
  const [deleteOwner, setDeleteOwner] = useState<any>(null);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutNote, setPayoutNote] = useState("");
  const [payoutMethod, setPayoutMethod] = useState("bank_transfer");
  const [showPw, setShowPw] = useState(false);

  const form = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      name: "", email: "", password: "", phone: "",
      businessName: "", address: "", city: "", state: "", pincode: "",
      commissionRate: 20, payoutSchedule: "manual",
      bankDetails: { bankName: "", accountName: "", accountNumber: "", ifscCode: "", upiId: "" },
      notes: "",
    },
  });

  const rate = form.watch("commissionRate");

  const { data: owners = [], isLoading } = useQuery({
    queryKey: ["admin-owners"],
    queryFn: async () => {
      const r = await fetch("/api/admin/owners", { headers: { Authorization: `Bearer ${token}` } });
      return r.json();
    },
    enabled: !!token,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-owners"] });
    qc.invalidateQueries({ queryKey: ["admin-stats"] });
  };

  const createMut = useMutation({
    mutationFn: async (d: CreateForm) => {
      const r = await fetch("/api/admin/owners", { method: "POST", headers: hdr(token!), body: JSON.stringify(d) });
      if (!r.ok) throw new Error((await r.json()).error);
      return r.json();
    },
    onSuccess: () => {
      toast({ title: "Owner account created!" });
      setCreateOpen(false); setFormStep(0); form.reset();
      invalidate();
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.message }),
  });

  const updateMut = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const r = await fetch(`/api/admin/owners/${id}`, { method: "PUT", headers: hdr(token!), body: JSON.stringify(data) });
      if (!r.ok) throw new Error((await r.json()).error);
      return r.json();
    },
    onSuccess: () => { toast({ title: "Owner updated!" }); setEditOwner(null); invalidate(); },
    onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.message }),
  });

  const holdMut = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/admin/owners/${id}/hold`, { method: "POST", headers: hdr(token!), body: "{}" });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: (d) => { toast({ title: d.commissionHeld ? "Commission held!" : "Commission released!" }); invalidate(); },
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
    onSuccess: () => {
      toast({ title: "Payout recorded!" });
      setPayoutOwner(null); setPayoutAmount(""); setPayoutNote("");
      invalidate();
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.message }),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/admin/owners/${id}`, { method: "DELETE", headers: hdr(token!) });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => { toast({ title: "Owner deleted" }); setDeleteOwner(null); invalidate(); },
  });

  const filtered = useMemo(() => owners.filter((o: any) => {
    const q = search.toLowerCase();
    const matchSearch = !search || o.name?.toLowerCase().includes(q) || o.email?.toLowerCase().includes(q) || o.businessName?.toLowerCase().includes(q) || o.phone?.includes(q);
    const matchStatus =
      filterStatus === "all" ||
      (filterStatus === "blocked" && o.blocked) ||
      (filterStatus === "held" && o.commissionHeld) ||
      (filterStatus === "active" && !o.blocked && !o.commissionHeld);
    return matchSearch && matchStatus;
  }), [owners, search, filterStatus]);

  const totalGross = owners.reduce((s: number, o: any) => s + (o.grossRevenue || 0), 0);
  const totalCommission = owners.reduce((s: number, o: any) => s + (o.adminCommission || 0), 0);
  const totalPending = owners.reduce((s: number, o: any) => s + (o.pendingPayout || 0), 0);

  // Multi-step form validation per step
  const stepFields: (keyof CreateForm)[][] = [
    ["name", "email", "password", "phone"],
    ["businessName", "address", "city", "state", "pincode"],
    ["commissionRate", "payoutSchedule"],
    [],
  ];

  const nextStep = async () => {
    const valid = await form.trigger(stepFields[formStep] as any);
    if (valid) setFormStep(s => s + 1);
  };

  return (
    <div className="p-4 md:p-8 text-white min-h-screen">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-black tracking-tight flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" /> Owner Management
          </h2>
          <p className="text-white/40 text-sm mt-0.5">
            {owners.length} owners · {owners.filter((o: any) => o.commissionHeld).length} on hold · {owners.filter((o: any) => o.blocked).length} blocked
          </p>
        </div>
        <Button onClick={() => { setCreateOpen(true); setFormStep(0); form.reset(); }}
          className="gap-2 font-bold bg-primary hover:bg-primary/90 rounded-xl h-10 px-5">
          <Plus className="h-4 w-4" /> Add Owner
        </Button>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-4">
          <p className="text-[10px] font-bold text-white/30 uppercase tracking-wider">Gross Revenue</p>
          <p className="text-xl md:text-2xl font-black text-white mt-1">{fmtINR(totalGross)}</p>
        </div>
        <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4">
          <p className="text-[10px] font-bold text-primary/50 uppercase tracking-wider">Admin Commission</p>
          <p className="text-xl md:text-2xl font-black text-primary mt-1">{fmtINR(totalCommission)}</p>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4">
          <p className="text-[10px] font-bold text-amber-400/50 uppercase tracking-wider">Pending Payouts</p>
          <p className="text-xl md:text-2xl font-black text-amber-400 mt-1">{fmtINR(totalPending)}</p>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name, email, phone, business..."
            className="pl-8 bg-white/[0.05] border-white/10 text-white placeholder:text-white/20 h-9 text-sm" />
        </div>
        <div className="flex gap-1 bg-white/[0.04] rounded-xl p-1">
          {(["all", "active", "held", "blocked"] as const).map(f => (
            <button key={f} onClick={() => setFilterStatus(f)}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all",
                filterStatus === f ? "bg-primary text-white" : "text-white/40 hover:text-white")}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Owner Cards */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-28 rounded-2xl bg-white/[0.04] animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-white/30">
          <Building2 className="h-16 w-16 mx-auto mb-4 opacity-20" />
          <p className="font-bold text-lg">No owners found</p>
          <p className="text-sm mt-1 mb-5">Add your first turf owner to get started</p>
          <Button onClick={() => { setCreateOpen(true); setFormStep(0); }}
            className="font-bold gap-2 bg-primary hover:bg-primary/90">
            <Plus className="h-4 w-4" /> Add Owner
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((owner: any) => {
            const isOpen = expanded === owner.id;
            const ownerPct = 100 - owner.commissionRate;
            const settled = owner.ownerEarnings > 0
              ? Math.min(100, Math.round((owner.payoutSent / owner.ownerEarnings) * 100))
              : 0;

            return (
              <div key={owner.id} className={cn(
                "border rounded-2xl overflow-hidden transition-all",
                owner.commissionHeld ? "border-amber-500/30 bg-amber-500/[0.03]" :
                  owner.blocked ? "border-red-500/20 bg-red-500/[0.02]" :
                    isOpen ? "border-primary/30 bg-primary/[0.03]" :
                      "border-white/[0.08] bg-white/[0.04] hover:border-white/15"
              )}>
                {/* Header row */}
                <div className="flex items-center gap-3 p-4 cursor-pointer" onClick={() => setExpanded(isOpen ? null : owner.id)}>
                  {/* Avatar */}
                  <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-primary/30 to-violet-600/15 flex items-center justify-center font-black text-primary flex-shrink-0">
                    {(owner.name || "OW").slice(0, 2).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-white text-sm">{owner.name}</span>
                      {owner.businessName && owner.businessName !== owner.name &&
                        <span className="text-[10px] text-white/35 bg-white/[0.06] px-2 py-0.5 rounded-full">{owner.businessName}</span>}
                      {owner.commissionHeld &&
                        <span className="text-[9px] font-black bg-amber-500/15 text-amber-400 border border-amber-500/25 px-2 py-0.5 rounded-full uppercase">HELD</span>}
                      {owner.blocked &&
                        <span className="text-[9px] font-black bg-red-500/15 text-red-400 border border-red-500/25 px-2 py-0.5 rounded-full uppercase">BLOCKED</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap text-[10px] text-white/30">
                      <span className="flex items-center gap-1"><Mail className="h-2.5 w-2.5" />{owner.email}</span>
                      {owner.phone && <span className="flex items-center gap-1"><Phone className="h-2.5 w-2.5" />{owner.phone}</span>}
                      <span className="flex items-center gap-1"><MapPin className="h-2.5 w-2.5" />{owner.turfCount} turf{owner.turfCount !== 1 ? "s" : ""}</span>
                    </div>
                  </div>

                  {/* Revenue pills — desktop */}
                  <div className="hidden xl:flex items-center gap-5 flex-shrink-0 text-sm">
                    <div className="text-right">
                      <p className="text-[9px] text-white/25 font-bold uppercase">Gross</p>
                      <p className="font-black text-white">{fmtINR(owner.grossRevenue)}</p>
                    </div>
                    <div className="h-8 w-px bg-white/[0.08]" />
                    <div className="text-right">
                      <p className="text-[9px] text-primary/50 font-bold uppercase">Admin {owner.commissionRate}%</p>
                      <p className="font-black text-primary">{fmtINR(owner.adminCommission)}</p>
                    </div>
                    <div className="h-8 w-px bg-white/[0.08]" />
                    <div className="text-right">
                      <p className="text-[9px] text-emerald-400/50 font-bold uppercase">Owner {ownerPct}%</p>
                      <p className="font-black text-emerald-400">{fmtINR(owner.ownerEarnings)}</p>
                    </div>
                    {owner.pendingPayout > 0 && <>
                      <div className="h-8 w-px bg-white/[0.08]" />
                      <div className="text-right">
                        <p className="text-[9px] text-amber-400/50 font-bold uppercase">Pending</p>
                        <p className="font-black text-amber-400">{fmtINR(owner.pendingPayout)}</p>
                      </div>
                    </>}
                  </div>

                  <div className="flex-shrink-0 ml-1">
                    {isOpen ? <ChevronUp className="h-4 w-4 text-white/25" /> : <ChevronDown className="h-4 w-4 text-white/25" />}
                  </div>
                </div>

                {/* Mobile revenue */}
                <div className="xl:hidden flex gap-2 px-4 pb-3">
                  {[
                    { l: "GROSS", v: fmtINR(owner.grossRevenue), cl: "text-white", bg: "bg-white/[0.05]" },
                    { l: `ADMIN ${owner.commissionRate}%`, v: fmtINR(owner.adminCommission), cl: "text-primary", bg: "bg-primary/10" },
                    { l: `OWNER ${ownerPct}%`, v: fmtINR(owner.ownerEarnings), cl: "text-emerald-400", bg: "bg-emerald-500/10" },
                    { l: "PENDING", v: fmtINR(owner.pendingPayout), cl: "text-amber-400", bg: "bg-amber-500/10" },
                  ].map((item, i) => (
                    <div key={i} className={cn("flex-1 rounded-xl p-2 text-center min-w-0", item.bg)}>
                      <p className="text-[8px] text-white/25 font-bold truncate">{item.l}</p>
                      <p className={cn("font-black text-xs mt-0.5 truncate", item.cl)}>{item.v}</p>
                    </div>
                  ))}
                </div>

                {/* Expanded panel */}
                {isOpen && (
                  <div className="border-t border-white/[0.06]">
                    {/* Actions row */}
                    <div className="flex flex-wrap gap-2 p-4 pb-0">
                      <Button size="sm" variant="outline"
                        className="h-8 text-xs font-bold rounded-xl border-white/10 text-white hover:bg-white/10 gap-1.5"
                        onClick={() => { setEditOwner(owner); setEditRate(String(owner.commissionRate)); setEditSchedule(owner.payoutSchedule || "manual"); }}>
                        <Pencil className="h-3.5 w-3.5" /> Edit Details
                      </Button>
                      <Button size="sm"
                        className={cn("h-8 text-xs font-bold rounded-xl gap-1.5",
                          owner.commissionHeld ? "bg-emerald-600 hover:bg-emerald-700" : "bg-amber-600 hover:bg-amber-700")}
                        onClick={() => holdMut.mutate(owner.id)} disabled={holdMut.isPending}>
                        {owner.commissionHeld ? <><PlayCircle className="h-3.5 w-3.5" /> Release Hold</> : <><PauseCircle className="h-3.5 w-3.5" /> Hold Payout</>}
                      </Button>
                      <Button size="sm"
                        className="h-8 text-xs font-bold rounded-xl bg-emerald-700 hover:bg-emerald-800 gap-1.5"
                        onClick={() => { setPayoutOwner(owner); setPayoutAmount(String(owner.pendingPayout)); }}
                        disabled={owner.pendingPayout <= 0 || owner.commissionHeld}>
                        <Wallet className="h-3.5 w-3.5" /> Pay {fmtINR(owner.pendingPayout)}
                      </Button>
                      <Button size="sm" variant="outline"
                        className="h-8 text-xs font-bold rounded-xl border-blue-500/25 text-blue-400 hover:bg-blue-500/10 gap-1.5"
                        onClick={() => setHistoryOwner(owner)}>
                        <History className="h-3.5 w-3.5" /> History ({owner.payoutHistory?.length || 0})
                      </Button>
                      <Button size="sm" variant="outline"
                        className={cn("h-8 text-xs font-bold rounded-xl gap-1.5",
                          owner.blocked ? "border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/10" : "border-white/10 text-white/50 hover:bg-white/10")}
                        onClick={() => updateMut.mutate({ id: owner.id, data: { blocked: !owner.blocked } })}>
                        {owner.blocked ? <><CheckCircle2 className="h-3.5 w-3.5" /> Unblock</> : <><XCircle className="h-3.5 w-3.5" /> Block</>}
                      </Button>
                      <Button size="sm" variant="outline"
                        className="h-8 text-xs font-bold rounded-xl border-red-500/25 text-red-400 hover:bg-red-500/10 gap-1.5 ml-auto"
                        onClick={() => setDeleteOwner(owner)}>
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </Button>
                    </div>

                    {/* Detail grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
                      {/* Revenue & settlement */}
                      <div className="bg-black/20 rounded-2xl p-4 space-y-2.5">
                        <p className="text-[10px] font-black text-white/30 uppercase tracking-wider mb-1">Revenue Breakdown</p>
                        {[
                          { label: "Gross Revenue", val: owner.grossRevenue, cl: "text-white" },
                          { label: `Admin (${owner.commissionRate}%)`, val: owner.adminCommission, cl: "text-primary" },
                          { label: `Owner (${ownerPct}%)`, val: owner.ownerEarnings, cl: "text-emerald-400" },
                          { label: "Paid Out", val: owner.payoutSent, cl: "text-blue-400" },
                          { label: "Pending", val: owner.pendingPayout, cl: "text-amber-400 font-black" },
                        ].map((row, i) => (
                          <div key={i} className={cn("flex justify-between text-sm", i > 0 && "border-t border-white/[0.05] pt-2")}>
                            <span className="text-white/35">{row.label}</span>
                            <span className={cn("font-bold", row.cl)}>{fmtINR(row.val)}</span>
                          </div>
                        ))}
                        <div className="pt-2 border-t border-white/[0.05]">
                          <div className="flex justify-between text-[10px] text-white/20 mb-1.5">
                            <span>Settlement</span><span>{settled}%</span>
                          </div>
                          <div className="h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full"
                              style={{ width: `${settled}%` }} />
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-white/25 pt-1">
                          <RefreshCw className="h-3 w-3" />
                          Schedule: <span className="capitalize font-bold text-white/50">{owner.payoutSchedule || "manual"}</span>
                        </div>
                      </div>

                      {/* Owner contact & address */}
                      <div className="bg-black/20 rounded-2xl p-4">
                        <p className="text-[10px] font-black text-white/30 uppercase tracking-wider mb-3">Contact & Location</p>
                        <div className="space-y-2.5 text-sm">
                          <div className="flex items-start gap-2">
                            <User className="h-3.5 w-3.5 text-white/25 mt-0.5 flex-shrink-0" />
                            <span className="text-white/60">{owner.name}</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <Mail className="h-3.5 w-3.5 text-white/25 mt-0.5 flex-shrink-0" />
                            <span className="text-white/60 break-all">{owner.email}</span>
                          </div>
                          {owner.phone && (
                            <div className="flex items-start gap-2">
                              <Phone className="h-3.5 w-3.5 text-white/25 mt-0.5 flex-shrink-0" />
                              <span className="text-white/60">{owner.phone}</span>
                            </div>
                          )}
                          {owner.address && (
                            <div className="flex items-start gap-2">
                              <Home className="h-3.5 w-3.5 text-white/25 mt-0.5 flex-shrink-0" />
                              <span className="text-white/60">{owner.address}</span>
                            </div>
                          )}
                        </div>
                        <div className="mt-3 pt-3 border-t border-white/[0.05]">
                          <p className="text-[10px] font-black text-white/25 uppercase mb-2">Turfs ({owner.turfCount})</p>
                          {(owner.turfs ?? []).length === 0 ? (
                            <p className="text-sm text-white/20">No turfs yet</p>
                          ) : (
                            <div className="space-y-1.5">
                              {(owner.turfs?.slice(0, 4) ?? []).map((t: any) => (
                                <div key={t.id} className="flex items-center justify-between gap-2">
                                  <span className="text-sm text-white/55 truncate">{t.name}</span>
                                  <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0",
                                    t.status === "approved" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400")}>
                                    {t.status}
                                  </span>
                                </div>
                              ))}
                              {(owner.turfs ?? []).length > 4 && <p className="text-[11px] text-white/20">+{owner.turfs.length - 4} more</p>}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Bank details */}
                      <div className="bg-black/20 rounded-2xl p-4">
                        <p className="text-[10px] font-black text-white/30 uppercase tracking-wider mb-3">Bank Details</p>
                        {!owner.bankDetails || !Object.values(owner.bankDetails).some(Boolean) ? (
                          <p className="text-sm text-white/20 italic">No bank details on file</p>
                        ) : (
                          <div className="space-y-2.5 text-sm">
                            {owner.bankDetails.bankName && (
                              <div className="flex items-center gap-2">
                                <Landmark className="h-3.5 w-3.5 text-white/25 flex-shrink-0" />
                                <span className="text-white/60">{owner.bankDetails.bankName}</span>
                              </div>
                            )}
                            {owner.bankDetails.accountName && (
                              <div className="flex gap-2"><span className="text-white/20 text-xs w-14 flex-shrink-0">Holder</span><span className="text-white/60">{owner.bankDetails.accountName}</span></div>
                            )}
                            {owner.bankDetails.accountNumber && (
                              <div className="flex gap-2"><span className="text-white/20 text-xs w-14 flex-shrink-0">Account</span>
                                <span className="text-white/60 font-mono">{"●".repeat(Math.max(0, (owner.bankDetails.accountNumber || "").length - 4))}{(owner.bankDetails.accountNumber || "").slice(-4)}</span>
                              </div>
                            )}
                            {owner.bankDetails.ifscCode && (
                              <div className="flex gap-2"><span className="text-white/20 text-xs w-14 flex-shrink-0">IFSC</span><span className="text-white/60 font-mono">{owner.bankDetails.ifscCode}</span></div>
                            )}
                            {owner.bankDetails.upiId && (
                              <div className="flex gap-2"><span className="text-white/20 text-xs w-14 flex-shrink-0">UPI</span><span className="text-white/60">{owner.bankDetails.upiId}</span></div>
                            )}
                          </div>
                        )}
                        {owner.notes && (
                          <div className="mt-3 pt-3 border-t border-white/[0.05]">
                            <p className="text-[10px] font-black text-white/25 uppercase mb-1">Notes</p>
                            <p className="text-sm text-white/40 italic">"{owner.notes}"</p>
                          </div>
                        )}
                        <p className="text-[10px] text-white/20 mt-3">
                          Added {owner.createdAt ? format(new Date(owner.createdAt), "dd MMM yyyy") : "—"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ─── CREATE OWNER — Multi-step Dialog ─── */}
      <Dialog open={createOpen} onOpenChange={v => { setCreateOpen(v); if (!v) { setFormStep(0); form.reset(); } }}>
        <DialogContent className="sm:max-w-lg max-h-[92vh] overflow-y-auto bg-[#161924] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" /> Add New Owner
            </DialogTitle>
          </DialogHeader>

          {/* Step indicator */}
          <div className="flex items-center gap-1 mt-2 mb-4">
            {FORM_SECTIONS.map((s, i) => (
              <div key={s} className="flex items-center flex-1">
                <button type="button" onClick={() => { if (i < formStep) setFormStep(i); }}
                  className={cn("flex-1 text-center py-1.5 rounded-lg text-[10px] font-bold transition-all",
                    i === formStep ? "bg-primary text-white" :
                      i < formStep ? "bg-emerald-500/15 text-emerald-400 cursor-pointer hover:bg-emerald-500/25" :
                        "bg-white/[0.04] text-white/20")}>
                  {s}
                </button>
                {i < FORM_SECTIONS.length - 1 && <div className={cn("w-2 h-px mx-1", i < formStep ? "bg-emerald-500/40" : "bg-white/[0.08]")} />}
              </div>
            ))}
          </div>

          <form onSubmit={form.handleSubmit(d => createMut.mutate(d))}>

            {/* Step 0: Personal */}
            {formStep === 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <User className="h-4 w-4 text-primary" />
                  <p className="font-bold text-white text-sm">Personal Information</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-xs text-white/40 font-medium">Full Name *</label>
                    <Input {...form.register("name")} placeholder="Ravi Kumar" className="mt-1 bg-white/[0.06] border-white/10 text-white placeholder:text-white/20" />
                    {form.formState.errors.name && <p className="text-red-400 text-xs mt-1">{form.formState.errors.name.message}</p>}
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-white/40 font-medium">Email Address *</label>
                    <Input {...form.register("email")} type="email" placeholder="ravi@example.com" className="mt-1 bg-white/[0.06] border-white/10 text-white placeholder:text-white/20" />
                    {form.formState.errors.email && <p className="text-red-400 text-xs mt-1">{form.formState.errors.email.message}</p>}
                  </div>
                  <div>
                    <label className="text-xs text-white/40 font-medium">Phone Number *</label>
                    <Input {...form.register("phone")} placeholder="9876543210" className="mt-1 bg-white/[0.06] border-white/10 text-white placeholder:text-white/20" />
                    {form.formState.errors.phone && <p className="text-red-400 text-xs mt-1">{form.formState.errors.phone.message}</p>}
                  </div>
                  <div>
                    <label className="text-xs text-white/40 font-medium">Password *</label>
                    <div className="relative mt-1">
                      <Input {...form.register("password")} type={showPw ? "text" : "password"} placeholder="Min 6 chars"
                        className="bg-white/[0.06] border-white/10 text-white placeholder:text-white/20 pr-9" />
                      <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                        onClick={() => setShowPw(v => !v)}>
                        {showPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                    {form.formState.errors.password && <p className="text-red-400 text-xs mt-1">{form.formState.errors.password.message}</p>}
                  </div>
                </div>
                <Button type="button" className="w-full h-10 font-bold bg-primary hover:bg-primary/90" onClick={nextStep}>
                  Continue → Business Details
                </Button>
              </div>
            )}

            {/* Step 1: Business */}
            {formStep === 1 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <Building2 className="h-4 w-4 text-primary" />
                  <p className="font-bold text-white text-sm">Business Information</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-xs text-white/40 font-medium">Business / Venue Name</label>
                    <Input {...form.register("businessName")} placeholder="Banjara Hills Cricket Zone" className="mt-1 bg-white/[0.06] border-white/10 text-white placeholder:text-white/20" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-white/40 font-medium">Street Address</label>
                    <Input {...form.register("address")} placeholder="12-3-456, Banjara Hills, Road No. 5" className="mt-1 bg-white/[0.06] border-white/10 text-white placeholder:text-white/20" />
                  </div>
                  <div>
                    <label className="text-xs text-white/40 font-medium">City</label>
                    <Input {...form.register("city")} placeholder="Hyderabad" className="mt-1 bg-white/[0.06] border-white/10 text-white placeholder:text-white/20" />
                  </div>
                  <div>
                    <label className="text-xs text-white/40 font-medium">State</label>
                    <Input {...form.register("state")} placeholder="Telangana" className="mt-1 bg-white/[0.06] border-white/10 text-white placeholder:text-white/20" />
                  </div>
                  <div>
                    <label className="text-xs text-white/40 font-medium">Pincode</label>
                    <Input {...form.register("pincode")} placeholder="500034" className="mt-1 bg-white/[0.06] border-white/10 text-white placeholder:text-white/20" />
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button type="button" variant="outline" className="flex-1 border-white/10 text-white hover:bg-white/10" onClick={() => setFormStep(0)}>← Back</Button>
                  <Button type="button" className="flex-1 h-10 font-bold bg-primary hover:bg-primary/90" onClick={nextStep}>Continue → Commission</Button>
                </div>
              </div>
            )}

            {/* Step 2: Commission */}
            {formStep === 2 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <IndianRupee className="h-4 w-4 text-primary" />
                  <p className="font-bold text-white text-sm">Commission & Payout Settings</p>
                </div>
                <div className="bg-primary/10 border border-primary/20 rounded-xl p-4">
                  <p className="text-[10px] font-black text-primary/70 uppercase tracking-wider mb-3">Admin Commission Rate</p>
                  <div className="flex items-center gap-3">
                    <input type="range" min="0" max="50" step="1"
                      value={rate}
                      onChange={e => form.setValue("commissionRate", Number(e.target.value))}
                      className="flex-1 accent-primary h-1.5" />
                    <div className="flex items-center border border-white/15 rounded-lg overflow-hidden">
                      <input type="number" min="0" max="100"
                        value={rate}
                        onChange={e => form.setValue("commissionRate", Number(e.target.value))}
                        className="w-12 bg-transparent px-2 py-1.5 text-sm font-black text-primary text-center outline-none" />
                      <span className="pr-2 text-primary font-bold">%</span>
                    </div>
                  </div>
                  {/* Split bar */}
                  <div className="mt-3 flex gap-0.5 h-5 rounded-lg overflow-hidden">
                    <div className="flex items-center justify-center bg-primary text-[9px] font-black text-white transition-all duration-300"
                      style={{ width: `${rate}%`, minWidth: rate > 0 ? "20px" : "0" }}>
                      {Number(rate) >= 5 ? `${rate}%` : ""}
                    </div>
                    <div className="flex items-center justify-center bg-emerald-500 text-[9px] font-black text-white flex-1">
                      Owner {100 - Number(rate)}%
                    </div>
                  </div>
                  <p className="text-[10px] text-white/30 mt-2">
                    On ₹1,000 → Admin gets <span className="text-primary font-bold">₹{Number(rate) * 10}</span> · Owner gets <span className="text-emerald-400 font-bold">₹{(100 - Number(rate)) * 10}</span>
                  </p>
                </div>

                <div>
                  <label className="text-xs text-white/40 font-medium">Payout Schedule</label>
                  <Select onValueChange={v => form.setValue("payoutSchedule", v)} defaultValue="manual">
                    <SelectTrigger className="mt-1 bg-white/[0.06] border-white/10 text-white h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual (pay on request)</SelectItem>
                      <SelectItem value="weekly">Weekly (every Monday)</SelectItem>
                      <SelectItem value="monthly">Monthly (1st of each month)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-3">
                  <Button type="button" variant="outline" className="flex-1 border-white/10 text-white hover:bg-white/10" onClick={() => setFormStep(1)}>← Back</Button>
                  <Button type="button" className="flex-1 font-bold bg-primary hover:bg-primary/90" onClick={nextStep}>Continue → Bank Details</Button>
                </div>
              </div>
            )}

            {/* Step 3: Bank + Notes */}
            {formStep === 3 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <CreditCard className="h-4 w-4 text-primary" />
                  <p className="font-bold text-white text-sm">Bank Details & Notes</p>
                </div>
                <div className="border border-white/[0.08] rounded-xl overflow-hidden">
                  <div className="bg-white/[0.04] px-4 py-3">
                    <p className="text-[11px] font-black text-white/30 uppercase tracking-wider">Bank Details <span className="font-normal normal-case text-white/15">(for payouts)</span></p>
                  </div>
                  <div className="p-4 grid grid-cols-2 gap-3">
                    {[
                      { k: "bankDetails.bankName" as const, l: "Bank Name", p: "HDFC Bank", span: 2 },
                      { k: "bankDetails.accountName" as const, l: "Account Holder Name", p: "Ravi Kumar", span: 2 },
                      { k: "bankDetails.accountNumber" as const, l: "Account Number", p: "12345678901234", span: 1 },
                      { k: "bankDetails.ifscCode" as const, l: "IFSC Code", p: "HDFC0001234", span: 1 },
                      { k: "bankDetails.upiId" as const, l: "UPI ID", p: "ravi@upi", span: 2 },
                    ].map(f => (
                      <div key={f.k} className={f.span === 2 ? "col-span-2" : ""}>
                        <label className="text-xs text-white/35">{f.l}</label>
                        <Input {...form.register(f.k)} placeholder={f.p}
                          className="mt-0.5 bg-white/[0.05] border-white/[0.08] text-white placeholder:text-white/15 text-sm h-9" />
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-white/40 font-medium flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" /> Internal Notes (optional)
                  </label>
                  <Input {...form.register("notes")} placeholder="e.g. Referred by Suresh, documents verified 1 May 2025"
                    className="mt-1 bg-white/[0.06] border-white/10 text-white placeholder:text-white/20 text-sm" />
                </div>

                {/* Summary preview */}
                <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 text-sm space-y-1.5">
                  <p className="text-[10px] font-black text-white/25 uppercase mb-2">Summary</p>
                  <div className="flex justify-between"><span className="text-white/35">Name</span><span className="text-white font-medium">{form.getValues("name") || "—"}</span></div>
                  <div className="flex justify-between"><span className="text-white/35">Email</span><span className="text-white/60">{form.getValues("email") || "—"}</span></div>
                  <div className="flex justify-between"><span className="text-white/35">Phone</span><span className="text-white/60">{form.getValues("phone") || "—"}</span></div>
                  {form.getValues("businessName") && <div className="flex justify-between"><span className="text-white/35">Business</span><span className="text-white/60">{form.getValues("businessName")}</span></div>}
                  <div className="flex justify-between border-t border-white/[0.06] pt-1.5 mt-1.5">
                    <span className="text-white/35">Commission</span>
                    <span className="text-primary font-bold">{rate}% admin / {100 - Number(rate)}% owner</span>
                  </div>
                  <div className="flex justify-between"><span className="text-white/35">Schedule</span><span className="text-white/60 capitalize">{form.getValues("payoutSchedule")}</span></div>
                </div>

                <div className="flex gap-3">
                  <Button type="button" variant="outline" className="flex-1 border-white/10 text-white hover:bg-white/10" onClick={() => setFormStep(2)}>← Back</Button>
                  <Button type="submit" className="flex-1 h-11 font-bold bg-primary hover:bg-primary/90" disabled={createMut.isPending}>
                    {createMut.isPending ? "Creating..." : "Create Owner Account"}
                  </Button>
                </div>
              </div>
            )}
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── EDIT Dialog ─── */}
      {editOwner && (
        <Dialog open={!!editOwner} onOpenChange={() => setEditOwner(null)}>
          <DialogContent className="sm:max-w-md max-h-[92vh] overflow-y-auto bg-[#161924] border-white/10 text-white">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <Pencil className="h-4 w-4 text-primary" /> Edit: {editOwner.name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="bg-primary/10 border border-primary/20 rounded-xl p-4">
                <p className="text-[10px] font-black text-primary/60 uppercase tracking-wider mb-3">Commission Rate</p>
                <div className="flex items-center gap-3">
                  <input type="range" min="0" max="50" step="1" value={editRate}
                    onChange={e => setEditRate(e.target.value)} className="flex-1 accent-primary h-1.5" />
                  <div className="flex items-center border border-white/15 rounded-lg overflow-hidden">
                    <input type="number" min="0" max="100" value={editRate}
                      onChange={e => setEditRate(e.target.value)}
                      className="w-12 bg-transparent px-2 py-1.5 text-sm font-black text-primary text-center outline-none" />
                    <span className="pr-2 text-primary font-bold">%</span>
                  </div>
                </div>
                <div className="mt-2 flex gap-0.5 h-4 rounded-lg overflow-hidden">
                  <div className="bg-primary transition-all" style={{ width: `${editRate}%` }} />
                  <div className="bg-emerald-500 flex-1 flex items-center justify-center text-[8px] font-black text-white">{100 - Number(editRate)}%</div>
                </div>
                <p className="text-[10px] text-amber-400/70 flex items-center gap-1 mt-2">
                  <AlertCircle className="h-3 w-3 flex-shrink-0" /> Applies to future bookings only
                </p>
              </div>
              <div>
                <label className="text-xs text-white/40 font-medium">Payout Schedule</label>
                <Select value={editSchedule} onValueChange={setEditSchedule}>
                  <SelectTrigger className="mt-1 bg-white/[0.06] border-white/10 text-white h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-xs text-white/40 font-medium mb-2">Bank Details</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { k: "bankName", l: "Bank Name", span: 2 },
                    { k: "accountName", l: "Account Holder", span: 2 },
                    { k: "accountNumber", l: "Account No.", span: 1 },
                    { k: "ifscCode", l: "IFSC Code", span: 1 },
                    { k: "upiId", l: "UPI ID", span: 2 },
                  ].map(f => (
                    <div key={f.k} className={f.span === 2 ? "col-span-2" : ""}>
                      <label className="text-xs text-white/30">{f.l}</label>
                      <Input id={`edit-${f.k}`} defaultValue={editOwner.bankDetails?.[f.k] || ""}
                        className="mt-0.5 bg-white/[0.05] border-white/[0.08] text-white text-sm h-9" />
                    </div>
                  ))}
                </div>
              </div>
              <Button className="w-full font-bold bg-primary hover:bg-primary/90" disabled={updateMut.isPending}
                onClick={() => {
                  const bd: any = {};
                  ["bankName", "accountName", "accountNumber", "ifscCode", "upiId"].forEach(k => {
                    const el = document.getElementById(`edit-${k}`) as HTMLInputElement;
                    if (el) bd[k] = el.value;
                  });
                  updateMut.mutate({ id: editOwner.id, data: { commissionRate: Number(editRate), payoutSchedule: editSchedule, bankDetails: bd } });
                }}>
                {updateMut.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ─── PAYOUT Dialog ─── */}
      {payoutOwner && (
        <Dialog open={!!payoutOwner} onOpenChange={() => { setPayoutOwner(null); setPayoutAmount(""); setPayoutNote(""); }}>
          <DialogContent className="sm:max-w-sm bg-[#161924] border-white/10 text-white">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-white">
                <Wallet className="h-5 w-5 text-emerald-400" /> Record Payout
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="bg-emerald-500/[0.08] border border-emerald-500/20 rounded-xl p-4 space-y-2 text-sm">
                {[
                  { l: "Owner", v: payoutOwner.name, cl: "text-white font-bold" },
                  { l: "Owner Earnings", v: fmtINR(payoutOwner.ownerEarnings), cl: "text-emerald-400 font-bold" },
                  { l: "Already Paid", v: fmtINR(payoutOwner.payoutSent), cl: "text-blue-400 font-bold" },
                  { l: "Pending", v: fmtINR(payoutOwner.pendingPayout), cl: "text-amber-400 font-black" },
                ].map((row, i) => (
                  <div key={i} className={cn("flex justify-between", i === 3 && "border-t border-white/[0.08] pt-2")}>
                    <span className="text-white/40">{row.l}</span>
                    <span className={row.cl}>{row.v}</span>
                  </div>
                ))}
              </div>
              {payoutOwner.bankDetails && Object.values(payoutOwner.bankDetails).some(Boolean) && (
                <div className="bg-white/[0.04] rounded-xl p-3 text-xs">
                  <p className="text-[10px] font-bold text-white/25 uppercase mb-1.5">Pay To</p>
                  {payoutOwner.bankDetails.bankName && <p className="text-white/50">{payoutOwner.bankDetails.bankName}</p>}
                  {payoutOwner.bankDetails.accountNumber && <p className="text-white/50 font-mono mt-0.5">Acc: ●●●●{payoutOwner.bankDetails.accountNumber.slice(-4)}</p>}
                  {payoutOwner.bankDetails.ifscCode && <p className="text-white/50 font-mono mt-0.5">IFSC: {payoutOwner.bankDetails.ifscCode}</p>}
                  {payoutOwner.bankDetails.upiId && <p className="text-white/50 mt-0.5">UPI: {payoutOwner.bankDetails.upiId}</p>}
                </div>
              )}
              <div>
                <label className="text-xs text-white/40 font-medium">Payout Amount (₹)</label>
                <Input type="number" value={payoutAmount} onChange={e => setPayoutAmount(e.target.value)}
                  placeholder={`Max ${fmtINR(payoutOwner.pendingPayout)}`}
                  className="mt-1 bg-white/[0.06] border-white/10 text-white placeholder:text-white/20 text-xl font-black h-12" />
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
              <div>
                <label className="text-xs text-white/40 font-medium">Method</label>
                <Select value={payoutMethod} onValueChange={setPayoutMethod}>
                  <SelectTrigger className="mt-1 bg-white/[0.06] border-white/10 text-white h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">Bank Transfer (NEFT/IMPS)</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-white/40 font-medium">Note (optional)</label>
                <Input value={payoutNote} onChange={e => setPayoutNote(e.target.value)}
                  placeholder="e.g. Weekly settlement May W1"
                  className="mt-1 bg-white/[0.06] border-white/10 text-white placeholder:text-white/20 text-sm" />
              </div>
              <Button className="w-full h-11 font-bold bg-emerald-600 hover:bg-emerald-700"
                disabled={payoutMut.isPending || !payoutAmount || Number(payoutAmount) <= 0}
                onClick={() => payoutMut.mutate({ id: payoutOwner.id, amount: Number(payoutAmount), note: payoutNote, method: payoutMethod })}>
                {payoutMut.isPending ? "Recording..." : `Confirm ${fmtINR(Number(payoutAmount || 0))}`}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ─── HISTORY Dialog ─── */}
      {historyOwner && (
        <Dialog open={!!historyOwner} onOpenChange={() => setHistoryOwner(null)}>
          <DialogContent className="sm:max-w-sm max-h-[80vh] overflow-y-auto bg-[#161924] border-white/10 text-white">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-white">
                <History className="h-4 w-4 text-blue-400" /> History: {historyOwner.name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-2 pt-2">
              {(!historyOwner.payoutHistory || historyOwner.payoutHistory.length === 0) ? (
                <p className="text-center py-8 text-white/30 text-sm">No payouts recorded yet</p>
              ) : (
                [...historyOwner.payoutHistory].reverse().map((p: any, i: number) => (
                  <div key={i} className="bg-white/[0.04] rounded-xl p-3 flex justify-between gap-3">
                    <div>
                      <p className="font-black text-emerald-400">{fmtINR(p.amount)}</p>
                      <p className="text-[11px] text-white/35 mt-0.5 capitalize">
                        {p.method?.replace("_", " ")} · {p.date ? format(new Date(p.date), "dd MMM yyyy") : "—"}
                      </p>
                      {p.note && <p className="text-[11px] text-white/25 italic mt-0.5">"{p.note}"</p>}
                    </div>
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  </div>
                ))
              )}
              <div className="border-t border-white/[0.08] pt-3 flex justify-between text-sm">
                <span className="text-white/35">Total paid</span>
                <span className="font-black text-blue-400">{fmtINR(historyOwner.payoutSent)}</span>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ─── DELETE Confirm ─── */}
      {deleteOwner && (
        <Dialog open={!!deleteOwner} onOpenChange={() => setDeleteOwner(null)}>
          <DialogContent className="sm:max-w-sm bg-[#161924] border-red-500/20 text-white">
            <DialogHeader>
              <DialogTitle className="text-red-400 flex items-center gap-2">
                <Trash2 className="h-5 w-5" /> Delete Owner
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="bg-red-500/[0.08] border border-red-500/20 rounded-xl p-4">
                <p className="font-bold text-white">{deleteOwner.name}</p>
                <p className="text-sm text-white/40 mt-0.5">{deleteOwner.email}</p>
                {deleteOwner.businessName && <p className="text-sm text-white/30">{deleteOwner.businessName}</p>}
                <div className="mt-3 text-sm text-red-300/70 space-y-0.5">
                  <p>• Permanently deletes this owner account</p>
                  <p>• Turf listings and bookings are preserved</p>
                  <p>• This cannot be undone</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 border-white/10 text-white hover:bg-white/10" onClick={() => setDeleteOwner(null)}>Cancel</Button>
                <Button className="flex-1 bg-red-600 hover:bg-red-700 font-bold" disabled={deleteMut.isPending}
                  onClick={() => deleteMut.mutate(deleteOwner.id)}>
                  {deleteMut.isPending ? "Deleting..." : "Delete Account"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
