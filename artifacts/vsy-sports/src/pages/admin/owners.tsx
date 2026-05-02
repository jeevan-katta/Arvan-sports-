import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Building2, Plus, IndianRupee, MapPin, BookOpen, TrendingUp,
  ChevronDown, ChevronRight, Eye, EyeOff, Pencil, Wallet,
  CheckCircle2, XCircle, Clock, Users, AlertCircle, X,
  CreditCard, Phone, Mail, Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const createOwnerSchema = z.object({
  name: z.string().min(2, "Name required"),
  email: z.string().email("Valid email required"),
  password: z.string().min(6, "Min 6 characters"),
  phone: z.string().min(10, "Valid phone required"),
  businessName: z.string().optional(),
  commissionRate: z.coerce.number().min(0).max(100),
  bankDetails: z.object({
    accountName: z.string().optional(),
    accountNumber: z.string().optional(),
    ifscCode: z.string().optional(),
    bankName: z.string().optional(),
    upiId: z.string().optional(),
  }).optional(),
});

type CreateOwnerForm = z.infer<typeof createOwnerSchema>;

function authHeaders(token: string) {
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

export default function AdminOwners() {
  const { token } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [editOwner, setEditOwner] = useState<any>(null);
  const [expandedOwner, setExpandedOwner] = useState<string | null>(null);
  const [payoutOwner, setPayoutOwner] = useState<any>(null);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [newCommissionRate, setNewCommissionRate] = useState("");

  const { data: owners = [], isLoading } = useQuery({
    queryKey: ["admin-owners"],
    queryFn: async () => {
      const res = await fetch("/api/admin/owners", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed to fetch owners");
      return res.json();
    },
    enabled: !!token,
  });

  const createForm = useForm<CreateOwnerForm>({
    resolver: zodResolver(createOwnerSchema),
    defaultValues: {
      name: "", email: "", password: "", phone: "", businessName: "",
      commissionRate: 20,
      bankDetails: { accountName: "", accountNumber: "", ifscCode: "", bankName: "", upiId: "" },
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateOwnerForm) => {
      const res = await fetch("/api/admin/owners", {
        method: "POST", headers: authHeaders(token!), body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Owner account created!", description: "They can now log in and manage their turfs." });
      setCreateOpen(false);
      createForm.reset();
      queryClient.invalidateQueries({ queryKey: ["admin-owners"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.message }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/admin/owners/${id}`, {
        method: "PUT", headers: authHeaders(token!), body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Owner updated!" });
      setEditOwner(null);
      queryClient.invalidateQueries({ queryKey: ["admin-owners"] });
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.message }),
  });

  const payoutMutation = useMutation({
    mutationFn: async ({ id, amount }: { id: string; amount: number }) => {
      const res = await fetch(`/api/admin/owners/${id}/payout`, {
        method: "POST", headers: authHeaders(token!), body: JSON.stringify({ amount }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Payout recorded!", description: "Owner's settled amount has been updated." });
      setPayoutOwner(null);
      setPayoutAmount("");
      queryClient.invalidateQueries({ queryKey: ["admin-owners"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.message }),
  });

  const blockMutation = useMutation({
    mutationFn: async ({ id, blocked }: { id: string; blocked: boolean }) => {
      const res = await fetch(`/api/admin/owners/${id}`, {
        method: "PUT", headers: authHeaders(token!), body: JSON.stringify({ blocked }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Owner status updated" });
      queryClient.invalidateQueries({ queryKey: ["admin-owners"] });
    },
  });

  const totalGross = owners.reduce((s: number, o: any) => s + (o.grossRevenue || 0), 0);
  const totalCommission = owners.reduce((s: number, o: any) => s + (o.adminCommission || 0), 0);
  const totalPending = owners.reduce((s: number, o: any) => s + (o.pendingPayout || 0), 0);

  return (
    <div className="p-4 md:p-8 text-white">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-black tracking-tight">Turf Owner Management</h2>
          <p className="text-white/40 text-sm mt-0.5">{owners.length} registered owners</p>
        </div>
        <Button
          onClick={() => setCreateOpen(true)}
          className="gap-2 font-bold bg-primary hover:bg-primary/90 rounded-xl h-10 px-5"
        >
          <Plus className="h-4 w-4" /> Create Owner Account
        </Button>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1">Gross Booking Revenue</p>
          <p className="text-lg md:text-2xl font-black text-white">₹{totalGross.toLocaleString("en-IN")}</p>
        </div>
        <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4">
          <p className="text-[10px] font-bold text-primary/70 uppercase tracking-wider mb-1">Admin Commission</p>
          <p className="text-lg md:text-2xl font-black text-primary">₹{totalCommission.toLocaleString("en-IN")}</p>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4">
          <p className="text-[10px] font-bold text-amber-400/70 uppercase tracking-wider mb-1">Pending Payouts</p>
          <p className="text-lg md:text-2xl font-black text-amber-400">₹{totalPending.toLocaleString("en-IN")}</p>
        </div>
      </div>

      {/* Owners List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-32 rounded-2xl bg-white/5 animate-pulse" />)}
        </div>
      ) : owners.length === 0 ? (
        <div className="text-center py-20 text-white/30">
          <Building2 className="h-16 w-16 mx-auto mb-4 opacity-20" />
          <p className="font-bold text-lg">No owner accounts yet</p>
          <p className="text-sm mt-1 mb-5">Create your first turf owner account to get started</p>
          <Button onClick={() => setCreateOpen(true)} className="font-bold gap-2">
            <Plus className="h-4 w-4" /> Create Owner Account
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {owners.map((owner: any) => {
            const isExpanded = expandedOwner === owner.id;
            const ownerShare = 100 - owner.commissionRate;
            return (
              <div key={owner.id} className={cn(
                "bg-white/5 border rounded-2xl overflow-hidden transition-all",
                isExpanded ? "border-primary/40" : "border-white/10 hover:border-white/20"
              )}>
                {/* Header row */}
                <div
                  className="flex items-center gap-4 p-4 cursor-pointer"
                  onClick={() => setExpandedOwner(isExpanded ? null : owner.id)}
                >
                  {/* Avatar */}
                  <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary/30 to-violet-500/20 flex items-center justify-center flex-shrink-0 text-lg font-black text-primary">
                    {owner.name?.substring(0, 2).toUpperCase()}
                  </div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-white text-base leading-tight">{owner.name}</h3>
                      {owner.businessName && owner.businessName !== owner.name && (
                        <span className="text-[10px] font-bold text-white/40 bg-white/5 px-2 py-0.5 rounded-full">{owner.businessName}</span>
                      )}
                      {owner.blocked ? (
                        <Badge className="text-[9px] bg-red-500/20 text-red-400 border-red-500/30">Blocked</Badge>
                      ) : (
                        <Badge className="text-[9px] bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Active</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-[11px] text-white/40">
                      <span className="flex items-center gap-1"><Mail className="h-2.5 w-2.5" />{owner.email}</span>
                      {owner.phone && <span className="flex items-center gap-1"><Phone className="h-2.5 w-2.5" />{owner.phone}</span>}
                    </div>
                  </div>

                  {/* Revenue pills */}
                  <div className="hidden md:flex items-center gap-3 text-sm flex-shrink-0">
                    <div className="text-right">
                      <p className="text-[10px] text-white/30 font-bold uppercase">Gross</p>
                      <p className="font-black text-white">₹{(owner.grossRevenue || 0).toLocaleString("en-IN")}</p>
                    </div>
                    <div className="h-8 w-px bg-white/10" />
                    <div className="text-right">
                      <p className="text-[10px] text-primary/70 font-bold uppercase">Admin {owner.commissionRate}%</p>
                      <p className="font-black text-primary">₹{(owner.adminCommission || 0).toLocaleString("en-IN")}</p>
                    </div>
                    <div className="h-8 w-px bg-white/10" />
                    <div className="text-right">
                      <p className="text-[10px] text-emerald-400/70 font-bold uppercase">Owner {ownerShare}%</p>
                      <p className="font-black text-emerald-400">₹{(owner.ownerEarnings || 0).toLocaleString("en-IN")}</p>
                    </div>
                    {owner.pendingPayout > 0 && (
                      <>
                        <div className="h-8 w-px bg-white/10" />
                        <div className="text-right">
                          <p className="text-[10px] text-amber-400/70 font-bold uppercase">Pending</p>
                          <p className="font-black text-amber-400">₹{(owner.pendingPayout || 0).toLocaleString("en-IN")}</p>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Chevron */}
                  <div className="flex-shrink-0 ml-2">
                    {isExpanded ? <ChevronDown className="h-4 w-4 text-white/40" /> : <ChevronRight className="h-4 w-4 text-white/40" />}
                  </div>
                </div>

                {/* Mobile revenue row */}
                <div className="md:hidden flex gap-3 px-4 pb-3 text-xs">
                  <div className="flex-1 bg-white/5 rounded-xl p-2 text-center">
                    <p className="text-white/30 text-[9px] font-bold">GROSS</p>
                    <p className="font-black text-white">₹{(owner.grossRevenue || 0).toLocaleString("en-IN")}</p>
                  </div>
                  <div className="flex-1 bg-primary/10 rounded-xl p-2 text-center">
                    <p className="text-primary/60 text-[9px] font-bold">ADMIN {owner.commissionRate}%</p>
                    <p className="font-black text-primary">₹{(owner.adminCommission || 0).toLocaleString("en-IN")}</p>
                  </div>
                  <div className="flex-1 bg-emerald-500/10 rounded-xl p-2 text-center">
                    <p className="text-emerald-400/60 text-[9px] font-bold">OWNER {ownerShare}%</p>
                    <p className="font-black text-emerald-400">₹{(owner.ownerEarnings || 0).toLocaleString("en-IN")}</p>
                  </div>
                  {owner.pendingPayout > 0 && (
                    <div className="flex-1 bg-amber-500/10 rounded-xl p-2 text-center">
                      <p className="text-amber-400/60 text-[9px] font-bold">PENDING</p>
                      <p className="font-black text-amber-400">₹{(owner.pendingPayout || 0).toLocaleString("en-IN")}</p>
                    </div>
                  )}
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-white/10">
                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-2 p-4 pb-0">
                      <Button size="sm" variant="outline" className="h-8 text-xs font-bold rounded-xl border-white/20 text-white hover:bg-white/10 gap-1.5"
                        onClick={() => { setEditOwner(owner); setNewCommissionRate(String(owner.commissionRate)); }}>
                        <Pencil className="h-3.5 w-3.5" /> Edit & Commission
                      </Button>
                      <Button size="sm" className="h-8 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 gap-1.5"
                        onClick={() => setPayoutOwner(owner)}
                        disabled={owner.pendingPayout <= 0}>
                        <Wallet className="h-3.5 w-3.5" /> Record Payout
                        {owner.pendingPayout > 0 && <span className="ml-1 bg-white/20 px-1.5 rounded-full text-[10px] font-black">₹{owner.pendingPayout.toLocaleString("en-IN")}</span>}
                      </Button>
                      <Button size="sm" variant="outline"
                        className={cn("h-8 text-xs font-bold rounded-xl gap-1.5", owner.blocked
                          ? "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                          : "border-red-500/30 text-red-400 hover:bg-red-500/10")}
                        onClick={() => blockMutation.mutate({ id: owner.id, blocked: !owner.blocked })}>
                        {owner.blocked ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                        {owner.blocked ? "Unblock" : "Block"}
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                      {/* Revenue breakdown */}
                      <div className="bg-white/5 rounded-2xl p-4 space-y-3">
                        <p className="text-[10px] font-black text-white/40 uppercase tracking-wider">Revenue Breakdown</p>
                        <div className="space-y-2">
                          {[
                            { label: "Gross Revenue", value: owner.grossRevenue, color: "text-white" },
                            { label: `Admin Commission (${owner.commissionRate}%)`, value: owner.adminCommission, color: "text-primary" },
                            { label: `Owner Earnings (${ownerShare}%)`, value: owner.ownerEarnings, color: "text-emerald-400" },
                            { label: "Total Paid Out", value: owner.payoutSent, color: "text-blue-400" },
                            { label: "Pending Payout", value: owner.pendingPayout, color: "text-amber-400", bold: true },
                          ].map((row, i) => (
                            <div key={i} className={cn("flex justify-between text-sm py-1.5", i > 0 && "border-t border-white/5")}>
                              <span className="text-white/50">{row.label}</span>
                              <span className={cn("font-bold", row.color, row.bold && "font-black")}>₹{(row.value || 0).toLocaleString("en-IN")}</span>
                            </div>
                          ))}
                        </div>
                        {/* Progress bar */}
                        <div>
                          <div className="flex justify-between text-[10px] text-white/30 mb-1.5">
                            <span>Settlement progress</span>
                            <span>{owner.ownerEarnings > 0 ? Math.round((owner.payoutSent / owner.ownerEarnings) * 100) : 0}%</span>
                          </div>
                          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all"
                              style={{ width: `${owner.ownerEarnings > 0 ? Math.min(100, (owner.payoutSent / owner.ownerEarnings) * 100) : 0}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Turfs + Bank */}
                      <div className="space-y-3">
                        {/* Turfs */}
                        <div className="bg-white/5 rounded-2xl p-4">
                          <p className="text-[10px] font-black text-white/40 uppercase tracking-wider mb-3">Turfs ({owner.turfCount})</p>
                          {owner.turfs?.length === 0 ? (
                            <p className="text-sm text-white/30">No turfs registered</p>
                          ) : (
                            <div className="space-y-2">
                              {owner.turfs?.slice(0, 4).map((t: any) => (
                                <div key={t.id} className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <MapPin className="h-3 w-3 text-primary flex-shrink-0" />
                                    <span className="text-sm text-white/80 font-medium">{t.name}</span>
                                    <span className="text-[10px] text-white/30">{t.area}</span>
                                  </div>
                                  <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full",
                                    t.status === "approved" ? "bg-emerald-500/10 text-emerald-400" :
                                    t.status === "rejected" ? "bg-red-500/10 text-red-400" :
                                    "bg-amber-500/10 text-amber-400"
                                  )}>{t.status}</span>
                                </div>
                              ))}
                              {owner.turfs?.length > 4 && (
                                <p className="text-[11px] text-white/30">+{owner.turfs.length - 4} more</p>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Bank Details */}
                        {owner.bankDetails && Object.values(owner.bankDetails).some(v => v) && (
                          <div className="bg-white/5 rounded-2xl p-4">
                            <p className="text-[10px] font-black text-white/40 uppercase tracking-wider mb-3">Bank Details</p>
                            <div className="space-y-1.5 text-sm">
                              {owner.bankDetails.bankName && <div className="flex items-center gap-2"><CreditCard className="h-3 w-3 text-white/30" /><span className="text-white/60">{owner.bankDetails.bankName}</span></div>}
                              {owner.bankDetails.accountName && <div className="flex items-center gap-2"><Users className="h-3 w-3 text-white/30" /><span className="text-white/60">{owner.bankDetails.accountName}</span></div>}
                              {owner.bankDetails.accountNumber && <div className="flex items-center gap-2"><span className="text-white/30 text-xs">#</span><span className="text-white/60 font-mono">{"*".repeat(Math.max(0, owner.bankDetails.accountNumber.length - 4)) + owner.bankDetails.accountNumber.slice(-4)}</span></div>}
                              {owner.bankDetails.ifscCode && <div className="flex items-center gap-2"><span className="text-white/30 text-xs">IFSC</span><span className="text-white/60 font-mono">{owner.bankDetails.ifscCode}</span></div>}
                              {owner.bankDetails.upiId && <div className="flex items-center gap-2"><span className="text-white/30 text-xs">UPI</span><span className="text-white/60">{owner.bankDetails.upiId}</span></div>}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Stats row */}
                    <div className="flex items-center gap-4 px-4 pb-4 text-xs text-white/30">
                      <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" />{owner.totalBookings} bookings</span>
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{owner.activeTurfs} active turfs</span>
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Joined {owner.createdAt ? new Date(owner.createdAt).toLocaleDateString("en-IN") : "—"}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Create Owner Dialog ─── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto bg-[#1a1d27] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" /> Create Turf Owner Account
            </DialogTitle>
          </DialogHeader>
          <p className="text-white/50 text-sm -mt-1 mb-4">The commission rate is locked at account creation — it defines how revenue is split on every booking.</p>

          <form onSubmit={createForm.handleSubmit(d => createMutation.mutate(d))} className="space-y-4">
            <div className="bg-primary/10 border border-primary/20 rounded-xl p-4">
              <p className="text-[11px] font-black text-primary uppercase tracking-wider mb-3">Commission Rate</p>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="text-xs text-white/50 font-medium">Admin keeps (%) — you retain this % of every booking</label>
                  <div className="flex items-center gap-3 mt-2">
                    <input
                      type="range" min="0" max="50" step="1"
                      {...createForm.register("commissionRate")}
                      onChange={e => createForm.setValue("commissionRate", Number(e.target.value))}
                      className="flex-1 accent-primary"
                    />
                    <div className="flex items-center border border-white/20 rounded-lg overflow-hidden flex-shrink-0">
                      <input
                        type="number" min="0" max="100"
                        {...createForm.register("commissionRate")}
                        className="w-14 bg-transparent px-2 py-1.5 text-sm font-black text-primary text-center outline-none"
                      />
                      <span className="pr-2 text-primary font-bold text-sm">%</span>
                    </div>
                  </div>
                </div>
              </div>
              {/* Visual split */}
              {(() => {
                const rate = Number(createForm.watch("commissionRate") || 20);
                return (
                  <div className="mt-3 flex gap-1 h-6 rounded-lg overflow-hidden">
                    <div className="flex items-center justify-center bg-primary text-[10px] font-black text-primary-foreground transition-all" style={{ width: `${rate}%` }}>
                      {rate >= 8 ? `Admin ${rate}%` : ""}
                    </div>
                    <div className="flex items-center justify-center bg-emerald-500 text-[10px] font-black text-white flex-1 transition-all">
                      Owner {100 - rate}%
                    </div>
                  </div>
                );
              })()}
              <p className="text-[10px] text-white/40 mt-2">Example: ₹1,000 booking → Admin gets ₹{Math.round(Number(createForm.watch("commissionRate") || 20) * 10)}, Owner gets ₹{Math.round((100 - Number(createForm.watch("commissionRate") || 20)) * 10)}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-white/50 font-medium">Full Name *</label>
                <Input {...createForm.register("name")} placeholder="Rajesh Kumar" className="mt-1 bg-white/5 border-white/10 text-white placeholder:text-white/20" />
                {createForm.formState.errors.name && <p className="text-red-400 text-xs mt-1">{createForm.formState.errors.name.message}</p>}
              </div>
              <div>
                <label className="text-xs text-white/50 font-medium">Business / Turf Name</label>
                <Input {...createForm.register("businessName")} placeholder="Banjara Sports" className="mt-1 bg-white/5 border-white/10 text-white placeholder:text-white/20" />
              </div>
            </div>

            <div>
              <label className="text-xs text-white/50 font-medium">Email Address *</label>
              <Input {...createForm.register("email")} type="email" placeholder="owner@example.com" className="mt-1 bg-white/5 border-white/10 text-white placeholder:text-white/20" />
              {createForm.formState.errors.email && <p className="text-red-400 text-xs mt-1">{createForm.formState.errors.email.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-white/50 font-medium">Phone *</label>
                <Input {...createForm.register("phone")} placeholder="9876543210" className="mt-1 bg-white/5 border-white/10 text-white placeholder:text-white/20" />
                {createForm.formState.errors.phone && <p className="text-red-400 text-xs mt-1">{createForm.formState.errors.phone.message}</p>}
              </div>
              <div>
                <label className="text-xs text-white/50 font-medium">Password *</label>
                <div className="relative mt-1">
                  <Input {...createForm.register("password")} type={showPassword ? "text" : "password"} placeholder="Min 6 chars" className="bg-white/5 border-white/10 text-white placeholder:text-white/20 pr-9" />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30" onClick={() => setShowPassword(v => !v)}>
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
                {createForm.formState.errors.password && <p className="text-red-400 text-xs mt-1">{createForm.formState.errors.password.message}</p>}
              </div>
            </div>

            {/* Bank Details */}
            <div className="border border-white/10 rounded-xl overflow-hidden">
              <div className="bg-white/5 px-4 py-3">
                <p className="text-[11px] font-black text-white/50 uppercase tracking-wider">Bank Details (Optional)</p>
                <p className="text-[10px] text-white/30 mt-0.5">Needed for processing payouts</p>
              </div>
              <div className="p-4 grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/40">Bank Name</label>
                  <Input {...createForm.register("bankDetails.bankName")} placeholder="HDFC Bank" className="mt-1 bg-white/5 border-white/10 text-white placeholder:text-white/20 text-sm h-9" />
                </div>
                <div>
                  <label className="text-xs text-white/40">Account Holder</label>
                  <Input {...createForm.register("bankDetails.accountName")} placeholder="Rajesh Kumar" className="mt-1 bg-white/5 border-white/10 text-white placeholder:text-white/20 text-sm h-9" />
                </div>
                <div>
                  <label className="text-xs text-white/40">Account Number</label>
                  <Input {...createForm.register("bankDetails.accountNumber")} placeholder="1234567890" className="mt-1 bg-white/5 border-white/10 text-white placeholder:text-white/20 text-sm h-9" />
                </div>
                <div>
                  <label className="text-xs text-white/40">IFSC Code</label>
                  <Input {...createForm.register("bankDetails.ifscCode")} placeholder="HDFC0001234" className="mt-1 bg-white/5 border-white/10 text-white placeholder:text-white/20 text-sm h-9" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-white/40">UPI ID</label>
                  <Input {...createForm.register("bankDetails.upiId")} placeholder="owner@upi" className="mt-1 bg-white/5 border-white/10 text-white placeholder:text-white/20 text-sm h-9" />
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full h-11 font-bold bg-primary hover:bg-primary/90" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating account..." : "Create Owner Account"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── Edit / Commission Dialog ─── */}
      {editOwner && (
        <Dialog open={!!editOwner} onOpenChange={() => setEditOwner(null)}>
          <DialogContent className="sm:max-w-md bg-[#1a1d27] border-white/10 text-white">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <Pencil className="h-4 w-4 text-primary" /> Edit Owner: {editOwner.name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-5 pt-2">
              {/* Commission Rate */}
              <div className="bg-primary/10 border border-primary/20 rounded-xl p-4">
                <p className="text-[11px] font-black text-primary uppercase tracking-wider mb-3">Admin Commission Rate</p>
                <div className="flex items-center gap-3">
                  <input
                    type="range" min="0" max="50" step="1"
                    value={newCommissionRate}
                    onChange={e => setNewCommissionRate(e.target.value)}
                    className="flex-1 accent-primary"
                  />
                  <div className="flex items-center border border-white/20 rounded-lg overflow-hidden">
                    <input
                      type="number" min="0" max="100"
                      value={newCommissionRate}
                      onChange={e => setNewCommissionRate(e.target.value)}
                      className="w-14 bg-transparent px-2 py-1.5 text-sm font-black text-primary text-center outline-none"
                    />
                    <span className="pr-2 text-primary font-bold text-sm">%</span>
                  </div>
                </div>
                <div className="mt-2 flex gap-1 h-5 rounded-lg overflow-hidden">
                  <div className="bg-primary text-[9px] font-black text-primary-foreground flex items-center justify-center transition-all" style={{ width: `${newCommissionRate}%` }}>
                    {Number(newCommissionRate) >= 8 ? `${newCommissionRate}%` : ""}
                  </div>
                  <div className="bg-emerald-500 text-[9px] font-black text-white flex-1 flex items-center justify-center">{100 - Number(newCommissionRate)}%</div>
                </div>
                <div className="mt-2 text-[10px] text-amber-400 flex items-start gap-1.5">
                  <AlertCircle className="h-3 w-3 flex-shrink-0 mt-0.5" />
                  <span>Changing this rate affects all future bookings. Past revenue calculations remain unchanged.</span>
                </div>
              </div>

              {/* Bank Details update */}
              <div>
                <p className="text-[11px] font-black text-white/50 uppercase tracking-wider mb-3">Bank Details</p>
                <div className="space-y-2">
                  {["bankName", "accountName", "accountNumber", "ifscCode", "upiId"].map(field => (
                    <div key={field}>
                      <label className="text-xs text-white/40 capitalize">{field.replace(/([A-Z])/g, " $1")}</label>
                      <Input
                        defaultValue={editOwner.bankDetails?.[field] || ""}
                        id={`edit-${field}`}
                        placeholder={field === "upiId" ? "owner@upi" : field === "ifscCode" ? "HDFC0001234" : ""}
                        className="mt-0.5 bg-white/5 border-white/10 text-white placeholder:text-white/20 text-sm h-9"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <Button
                className="w-full font-bold bg-primary hover:bg-primary/90"
                disabled={updateMutation.isPending}
                onClick={() => {
                  const bankDetails: any = {};
                  ["bankName","accountName","accountNumber","ifscCode","upiId"].forEach(f => {
                    const el = document.getElementById(`edit-${f}`) as HTMLInputElement;
                    if (el) bankDetails[f] = el.value;
                  });
                  updateMutation.mutate({ id: editOwner.id, data: { commissionRate: Number(newCommissionRate), bankDetails } });
                }}
              >
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ─── Payout Dialog ─── */}
      {payoutOwner && (
        <Dialog open={!!payoutOwner} onOpenChange={() => { setPayoutOwner(null); setPayoutAmount(""); }}>
          <DialogContent className="sm:max-w-sm bg-[#1a1d27] border-white/10 text-white">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <Wallet className="h-5 w-5 text-emerald-400" /> Record Payout
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-white/50">Owner</span>
                  <span className="font-bold">{payoutOwner.name}</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-white/50">Total Earnings</span>
                  <span className="font-bold text-emerald-400">₹{(payoutOwner.ownerEarnings || 0).toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-white/50">Already Paid</span>
                  <span className="font-bold text-blue-400">₹{(payoutOwner.payoutSent || 0).toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-sm border-t border-white/10 pt-2">
                  <span className="text-amber-400 font-bold">Pending</span>
                  <span className="text-amber-400 font-black">₹{(payoutOwner.pendingPayout || 0).toLocaleString("en-IN")}</span>
                </div>
              </div>

              {payoutOwner.bankDetails && Object.values(payoutOwner.bankDetails).some((v: any) => v) && (
                <div className="bg-white/5 rounded-xl p-3 text-sm">
                  <p className="text-[10px] font-bold text-white/30 uppercase mb-2">Payment Details</p>
                  {payoutOwner.bankDetails.bankName && <p className="text-white/60"><span className="text-white/30">Bank:</span> {payoutOwner.bankDetails.bankName}</p>}
                  {payoutOwner.bankDetails.accountNumber && <p className="text-white/60 font-mono"><span className="text-white/30">Acc:</span> {payoutOwner.bankDetails.accountNumber}</p>}
                  {payoutOwner.bankDetails.ifscCode && <p className="text-white/60 font-mono"><span className="text-white/30">IFSC:</span> {payoutOwner.bankDetails.ifscCode}</p>}
                  {payoutOwner.bankDetails.upiId && <p className="text-white/60"><span className="text-white/30">UPI:</span> {payoutOwner.bankDetails.upiId}</p>}
                </div>
              )}

              <div>
                <label className="text-xs text-white/50 font-medium">Payout Amount (₹)</label>
                <Input
                  type="number"
                  placeholder={`Max ₹${payoutOwner.pendingPayout}`}
                  value={payoutAmount}
                  onChange={e => setPayoutAmount(e.target.value)}
                  className="mt-1 bg-white/5 border-white/10 text-white placeholder:text-white/20 text-lg font-bold h-12"
                />
                <div className="flex gap-2 mt-2">
                  {[25, 50, 100].map(pct => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setPayoutAmount(String(Math.round(payoutOwner.pendingPayout * pct / 100)))}
                      className="flex-1 text-[11px] font-bold py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 transition-colors"
                    >
                      {pct}%
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setPayoutAmount(String(payoutOwner.pendingPayout))}
                    className="flex-1 text-[11px] font-bold py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-colors"
                  >
                    Full
                  </button>
                </div>
              </div>

              <Button
                className="w-full h-11 font-bold bg-emerald-600 hover:bg-emerald-700"
                disabled={payoutMutation.isPending || !payoutAmount || Number(payoutAmount) <= 0}
                onClick={() => payoutMutation.mutate({ id: payoutOwner.id, amount: Number(payoutAmount) })}
              >
                {payoutMutation.isPending ? "Recording..." : `Confirm Payout ₹${Number(payoutAmount || 0).toLocaleString("en-IN")}`}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
