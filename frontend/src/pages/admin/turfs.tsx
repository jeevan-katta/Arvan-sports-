import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Building2, CheckCircle2, Clock, XCircle, MapPin, IndianRupee,
  Star, Phone, Mail, Briefcase, Filter, RefreshCw, AlertCircle,
  ChevronDown, ChevronUp, MessageSquare, Search, Sparkles,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface AdminTurf {
  id: string;
  name: string;
  description?: string;
  pricePerHour: number;
  area?: string;
  address?: string;
  amenities: string[];
  images: string[];
  status: string;
  rating: number;
  reviewCount: number;
  featured: boolean;
  ownerId: string;
  ownerName: string;
  ownerEmail?: string;
  ownerPhone?: string;
  ownerBusiness?: string;
  createdAt?: string;
}

const STATUS = {
  pending:  { label: "Pending",  icon: Clock,        color: "text-amber-400",   bg: "bg-amber-500/10 border-amber-500/30"    },
  approved: { label: "Approved", icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30" },
  rejected: { label: "Rejected", icon: XCircle,      color: "text-red-400",     bg: "bg-red-500/10 border-red-500/30"         },
};

const FILTERS = ["all", "pending", "approved", "rejected"] as const;
type FilterVal = typeof FILTERS[number];

function apiFetch(path: string, token: string, method = "GET", body?: object) {
  return fetch(path, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  }).then(r => r.json());
}

export default function AdminTurfs() {
  const token = localStorage.getItem("arvan_token") || "";
  const qc = useQueryClient();
  const { toast } = useToast();
  const [filter, setFilter] = useState<FilterVal>("pending");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{ id: string; name: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Fetch all turfs (not filtered server-side so counts work for all tabs)
  const { data: allTurfs = [], isLoading, refetch } = useQuery<AdminTurf[]>({
    queryKey: ["admin-turfs"],
    queryFn: () => apiFetch("/api/admin/turfs", token),
    enabled: !!token,
    refetchInterval: 60_000,
  });

  const featureMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/admin/turfs/${id}/feature`, token, "PUT"),
    onSuccess: (res) => {
      if (res.error) { toast({ variant: "destructive", title: res.error }); return; }
      qc.invalidateQueries({ queryKey: ["admin-turfs"] });
      toast({ title: res.featured ? "Turf featured on homepage!" : "Turf removed from featured" });
    },
    onError: () => toast({ variant: "destructive", title: "Failed to update featured status" }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: string; reason?: string }) =>
      apiFetch(`/api/admin/turfs/${id}/status`, token, "PATCH", { status, reason }),
    onSuccess: (res, vars) => {
      if (res.error) { toast({ variant: "destructive", title: res.error }); return; }
      qc.invalidateQueries({ queryKey: ["admin-turfs"] });
      setRejectModal(null);
      setRejectReason("");
      const label = vars.status === "approved" ? "Approved" : vars.status === "rejected" ? "Rejected" : "Updated";
      toast({ title: `Turf ${label}`, description: "Owner has been notified." });
    },
    onError: () => toast({ variant: "destructive", title: "Failed to update status" }),
  });

  const counts = {
    all:      allTurfs.length,
    pending:  allTurfs.filter(t => t.status === "pending").length,
    approved: allTurfs.filter(t => t.status === "approved").length,
    rejected: allTurfs.filter(t => t.status === "rejected").length,
  };

  const filtered = allTurfs.filter(t => {
    const matchStatus = filter === "all" || t.status === filter;
    const q = search.toLowerCase();
    const matchSearch = !q ||
      t.name.toLowerCase().includes(q) ||
      (t.area || "").toLowerCase().includes(q) ||
      (t.ownerName || "").toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap pt-2">
        <div>
          <h1 className="text-2xl font-display font-black text-white flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" /> Turf Approval
          </h1>
          <p className="text-white/40 text-sm mt-0.5">
            Review and approve owner-submitted turfs
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3">
        {(["approved", "pending", "rejected"] as const).map(s => {
          const cfg = STATUS[s];
          const Icon = cfg.icon;
          return (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={cn(
                "rounded-2xl p-4 text-center border transition-all",
                cfg.bg,
                filter === s ? "ring-1 ring-white/20" : "opacity-70 hover:opacity-100"
              )}
            >
              <Icon className={cn("h-5 w-5 mx-auto mb-1", cfg.color)} />
              <p className={cn("text-2xl font-black", cfg.color)}>{counts[s]}</p>
              <p className={cn("text-[10px] font-bold uppercase mt-0.5 opacity-60", cfg.color)}>
                {cfg.label}
              </p>
            </button>
          );
        })}
      </div>

      {/* Pending banner (when viewing a different tab) */}
      {counts.pending > 0 && filter !== "pending" && (
        <button
          onClick={() => setFilter("pending")}
          className="w-full flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl px-4 py-3 text-left hover:bg-amber-500/15 transition-colors"
        >
          <AlertCircle className="h-5 w-5 text-amber-400 flex-shrink-0" />
          <div>
            <p className="font-bold text-amber-400 text-sm">
              {counts.pending} turf{counts.pending !== 1 ? "s" : ""} waiting for approval
            </p>
            <p className="text-xs text-amber-400/60">Click to review</p>
          </div>
        </button>
      )}

      {/* Search + Filter tabs */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
          <Input
            placeholder="Search by name, area or owner..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-white/[0.05] border-white/10 text-white placeholder:text-white/20 h-10"
          />
        </div>
        <div className="flex gap-1 flex-shrink-0 items-center">
          <Filter className="h-3.5 w-3.5 text-white/20 flex-shrink-0" />
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all border",
                filter === f
                  ? "bg-primary border-primary text-white"
                  : "bg-white/[0.05] border-white/10 text-white/40 hover:bg-white/10 hover:text-white"
              )}
            >
              {f}
              {f !== "all" && counts[f] > 0 && (
                <span className={cn(
                  "ml-1.5 text-[9px] font-black px-1.5 py-0.5 rounded-full",
                  f === "pending" ? "bg-amber-500 text-white" : "bg-white/10 text-white/60"
                )}>
                  {counts[f]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Turf cards */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-white/[0.04] animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Building2 className="h-14 w-14 text-white/10 mb-4" />
          <p className="font-bold text-white/30 text-lg">
            {filter === "pending" ? "No pending submissions" : "No turfs found"}
          </p>
          <p className="text-sm text-white/20 mt-1">
            {filter === "pending" ? "All submissions have been reviewed" : "Try a different filter"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(turf => {
            const cfg = STATUS[turf.status as keyof typeof STATUS] || STATUS.pending;
            const Icon = cfg.icon;
            const isExpanded = expandedId === turf.id;
            const isPending = turf.status === "pending";

            return (
              <Card
                key={turf.id}
                className={cn(
                  "bg-[#161924] overflow-hidden transition-all",
                  isPending ? "border border-amber-500/25" : "border border-white/[0.06]"
                )}
              >
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Thumbnail */}
                    {turf.images?.[0] ? (
                      <img
                        src={turf.images[0]}
                        alt={turf.name}
                        className="h-16 w-20 rounded-xl object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="h-16 w-20 rounded-xl bg-white/[0.05] flex items-center justify-center flex-shrink-0">
                        <Building2 className="h-6 w-6 text-white/15" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div className="min-w-0">
                          <h3 className="font-bold text-white leading-tight">{turf.name}</h3>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {turf.area && (
                              <span className="flex items-center gap-1 text-xs text-white/40">
                                <MapPin className="h-3 w-3" />{turf.area}
                              </span>
                            )}
                            <span className="flex items-center gap-1 text-xs font-bold text-primary">
                              <IndianRupee className="h-3 w-3" />
                              {(turf.pricePerHour || 0).toLocaleString("en-IN")}/hr
                            </span>
                            {turf.status === "approved" && turf.reviewCount > 0 && (
                              <span className="flex items-center gap-1 text-xs text-white/40">
                                <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                                {turf.rating} ({turf.reviewCount})
                              </span>
                            )}
                          </div>
                        </div>
                        <span className={cn(
                          "flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border flex-shrink-0",
                          cfg.bg, cfg.color
                        )}>
                          <Icon className="h-3 w-3" />{cfg.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <span className="text-xs text-white/40 flex items-center gap-1">
                          <Briefcase className="h-3 w-3" />
                          {turf.ownerBusiness || turf.ownerName || "—"}
                        </span>
                        {turf.createdAt && (
                          <span className="text-[10px] text-white/25">
                            {formatDistanceToNow(new Date(turf.createdAt), { addSuffix: true })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Pending: Approve / Reject buttons */}
                  {isPending && (
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        className="flex-1 h-9 bg-emerald-600 hover:bg-emerald-500 text-white border-0 font-bold"
                        disabled={statusMutation.isPending}
                        onClick={() => statusMutation.mutate({ id: turf.id, status: "approved" })}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="flex-1 h-9 font-bold"
                        onClick={() => setRejectModal({ id: turf.id, name: turf.name })}
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1.5" /> Reject
                      </Button>
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : turf.id)}
                        className="h-9 w-9 flex items-center justify-center rounded-lg bg-white/[0.05] hover:bg-white/10 text-white/30 hover:text-white transition-colors flex-shrink-0"
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    </div>
                  )}

                  {/* Non-pending controls */}
                  {!isPending && (
                    <div className="flex gap-2 mt-3 flex-wrap">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : turf.id)}
                        className="flex-1 flex items-center justify-center gap-1 text-xs text-white/30 hover:text-white py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.07] transition-colors"
                      >
                        {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        {isExpanded ? "Collapse" : "Details"}
                      </button>
                      {turf.status === "approved" && (
                        <button
                          onClick={() => featureMutation.mutate(turf.id)}
                          disabled={featureMutation.isPending}
                          className={cn(
                            "flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg border transition-all",
                            turf.featured
                              ? "bg-primary/20 border-primary/40 text-primary hover:bg-primary/30"
                              : "bg-white/[0.04] border-white/10 text-white/30 hover:border-primary/40 hover:text-primary"
                          )}
                        >
                          <Sparkles className={cn("h-3 w-3", turf.featured && "fill-current")} />
                          {turf.featured ? "Unfeature" : "Feature"}
                        </button>
                      )}
                      {turf.status === "approved" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300 hover:border-red-500/40"
                          onClick={() => setRejectModal({ id: turf.id, name: turf.name })}
                        >
                          <XCircle className="h-3 w-3 mr-1" /> Revoke
                        </Button>
                      )}
                      {turf.status === "rejected" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/40"
                          disabled={statusMutation.isPending}
                          onClick={() => statusMutation.mutate({ id: turf.id, status: "approved" })}
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Re-approve
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {/* Expanded details panel */}
                {isExpanded && (
                  <div className="border-t border-white/[0.06] p-4 bg-white/[0.02] space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white/[0.04] rounded-xl p-3">
                        <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5">Owner</p>
                        <p className="text-sm font-bold text-white">{turf.ownerName || "—"}</p>
                        {turf.ownerBusiness && (
                          <p className="text-xs text-white/40 mt-0.5">{turf.ownerBusiness}</p>
                        )}
                      </div>
                      <div className="bg-white/[0.04] rounded-xl p-3 space-y-2">
                        <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5">Contact</p>
                        {turf.ownerEmail && (
                          <p className="text-xs text-white/50 flex items-center gap-1.5">
                            <Mail className="h-3 w-3 flex-shrink-0 text-white/30" />
                            <span className="truncate">{turf.ownerEmail}</span>
                          </p>
                        )}
                        {turf.ownerPhone && (
                          <p className="text-xs text-white/50 flex items-center gap-1.5">
                            <Phone className="h-3 w-3 flex-shrink-0 text-white/30" />{turf.ownerPhone}
                          </p>
                        )}
                      </div>
                    </div>

                    {turf.address && (
                      <div className="bg-white/[0.04] rounded-xl p-3">
                        <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5">Full Address</p>
                        <p className="text-sm text-white/60">{turf.address}</p>
                      </div>
                    )}

                    {turf.description && (
                      <div className="bg-white/[0.04] rounded-xl p-3">
                        <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5">Description</p>
                        <p className="text-sm text-white/60">{turf.description}</p>
                      </div>
                    )}

                    {turf.amenities?.length > 0 && (
                      <div>
                        <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2">Amenities</p>
                        <div className="flex flex-wrap gap-1.5">
                          {turf.amenities.map(a => (
                            <span key={a} className="text-xs bg-white/[0.06] text-white/50 px-2.5 py-1 rounded-full">
                              {a}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Reject/Revoke modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-[#161924] border border-white/10 rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
              <h3 className="font-bold text-white">Reject Turf</h3>
            </div>
            <p className="text-sm text-white/50">
              Rejecting{" "}
              <span className="text-white font-semibold">"{rejectModal.name}"</span>. The owner will be notified.
            </p>
            <div>
              <Label className="text-xs text-white/40 mb-1.5 block flex items-center gap-1">
                <MessageSquare className="h-3 w-3" /> Reason (recommended)
              </Label>
              <Input
                placeholder="e.g. Missing address, incomplete details..."
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                className="bg-white/[0.05] border-white/10 text-white placeholder:text-white/20"
                onKeyDown={e => {
                  if (e.key === "Enter")
                    statusMutation.mutate({ id: rejectModal.id, status: "rejected", reason: rejectReason });
                }}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                className="flex-1"
                disabled={statusMutation.isPending}
                onClick={() =>
                  statusMutation.mutate({ id: rejectModal.id, status: "rejected", reason: rejectReason })
                }
              >
                {statusMutation.isPending ? "Rejecting..." : "Confirm Reject"}
              </Button>
              <Button
                variant="outline"
                className="flex-1 border-white/10 text-white/50 hover:bg-white/[0.05] hover:text-white"
                onClick={() => { setRejectModal(null); setRejectReason(""); }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
