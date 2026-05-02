import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  MapPin, CheckCircle, XCircle, Star, Trash2, Search, Clock,
  Building2, IndianRupee, Eye, EyeOff, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

function hdr(token: string) {
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

type StatusFilter = "all" | "approved" | "pending" | "rejected";

export default function AdminTurfs() {
  const { token } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: turfs = [], isLoading } = useQuery({
    queryKey: ["admin-turfs"],
    queryFn: async () => {
      const r = await fetch("/api/turfs", { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    enabled: !!token,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-turfs"] });

  const approveMut = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const r = await fetch(`/api/admin/turfs/${id}/approve`, {
        method: "PUT", headers: hdr(token!), body: JSON.stringify({ status }),
      });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: (_, { status }) => { toast({ title: `Turf ${status}` }); invalidate(); },
  });

  const featureMut = useMutation({
    mutationFn: async ({ id, featured }: { id: string; featured: boolean }) => {
      const r = await fetch(`/api/admin/turfs/${id}/feature`, {
        method: "PUT", headers: hdr(token!), body: JSON.stringify({ featured }),
      });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => { toast({ title: "Featured status updated" }); invalidate(); },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/admin/turfs/${id}`, { method: "DELETE", headers: hdr(token!) });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => { toast({ title: "Turf deleted" }); setDeleteTarget(null); invalidate(); },
  });

  const counts = useMemo(() => ({
    all: turfs.length,
    approved: turfs.filter((t: any) => t.status === "approved").length,
    pending: turfs.filter((t: any) => t.status === "pending").length,
    rejected: turfs.filter((t: any) => t.status === "rejected").length,
  }), [turfs]);

  const filtered = useMemo(() => turfs.filter((t: any) => {
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    const q = search.toLowerCase();
    const matchSearch = !search || t.name?.toLowerCase().includes(q) || (t.area || "").toLowerCase().includes(q) || (t.ownerName || "").toLowerCase().includes(q);
    return matchStatus && matchSearch;
  }), [turfs, statusFilter, search]);

  const totalRevenue = useMemo(() =>
    turfs.filter((t: any) => t.status === "approved").reduce((s: number, t: any) => s + (t.pricePerHour || 0), 0),
    [turfs]
  );

  return (
    <div className="p-4 md:p-8 text-white">

      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl md:text-2xl font-black tracking-tight">Turf Management</h2>
        <p className="text-white/40 text-sm mt-0.5">{turfs.length} venues registered on the platform</p>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 text-center">
          <p className="text-2xl font-black text-emerald-400">{counts.approved}</p>
          <p className="text-[10px] text-emerald-400/60 font-bold uppercase mt-0.5">Approved</p>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-center">
          <p className="text-2xl font-black text-amber-400">{counts.pending}</p>
          <p className="text-[10px] text-amber-400/60 font-bold uppercase mt-0.5">Pending Review</p>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-center">
          <p className="text-2xl font-black text-red-400">{counts.rejected}</p>
          <p className="text-[10px] text-red-400/60 font-bold uppercase mt-0.5">Rejected</p>
        </div>
        <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 text-center">
          <p className="text-2xl font-black text-primary">
            {turfs.filter((t: any) => t.featured).length}
          </p>
          <p className="text-[10px] text-primary/60 font-bold uppercase mt-0.5">Featured</p>
        </div>
      </div>

      {/* Pending Alert Banner */}
      {counts.pending > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl px-4 py-3 mb-5 flex items-center gap-3">
          <AlertCircle className="h-4 w-4 text-amber-400 flex-shrink-0" />
          <p className="text-sm text-amber-300 font-medium">
            <span className="font-black">{counts.pending}</span> turf{counts.pending !== 1 ? "s" : ""} awaiting your review
          </p>
          <button
            onClick={() => setStatusFilter("pending")}
            className="ml-auto text-xs font-bold text-amber-400 hover:text-amber-300 underline underline-offset-2"
          >
            Review now
          </button>
        </div>
      )}

      {/* Filters + Search */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="flex gap-1 bg-white/5 rounded-xl p-1 flex-shrink-0">
          {(["all", "approved", "pending", "rejected"] as StatusFilter[]).map(f => (
            <button key={f} onClick={() => setStatusFilter(f)}
              className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all",
                statusFilter === f ? "bg-primary text-primary-foreground" : "text-white/40 hover:text-white")}>
              {f}
              <span className={cn("text-[9px] px-1.5 rounded-full font-black",
                statusFilter === f ? "bg-white/20 text-white" : "bg-white/5 text-white/30")}>
                {counts[f]}
              </span>
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, area or owner..."
            className="pl-8 bg-white/5 border-white/10 text-white placeholder:text-white/20 h-9 text-sm" />
        </div>
      </div>

      {/* Turfs Table */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02]">
                {["Venue", "Owner", "Price/hr", "Rating", "Status", "Featured", "Actions"].map(h => (
                  <th key={h} className={cn("px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-white/30",
                    h === "Actions" || h === "Featured" || h === "Rating" ? "text-center" : "text-left")}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading && [...Array(5)].map((_, i) => (
                <tr key={i}>{[...Array(7)].map((_, j) => (
                  <td key={j} className="px-4 py-4"><div className="h-4 bg-white/5 rounded animate-pulse" /></td>
                ))}</tr>
              ))}
              {!isLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-14 text-white/30">
                    <MapPin className="h-10 w-10 mx-auto mb-2 opacity-20" />
                    <p className="font-bold">No turfs found</p>
                  </td>
                </tr>
              )}
              {!isLoading && filtered.map((turf: any) => (
                <tr key={turf.id} className={cn("hover:bg-white/[0.03] transition-colors",
                  turf.status === "pending" && "bg-amber-500/[0.03]")}>

                  {/* Venue */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      {turf.images?.[0] ? (
                        <img src={turf.images[0]} alt={turf.name}
                          className="h-10 w-14 rounded-lg object-cover flex-shrink-0 bg-white/5" />
                      ) : (
                        <div className="h-10 w-14 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                          <MapPin className="h-3.5 w-3.5 text-white/20" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-bold text-white text-sm leading-tight truncate max-w-40">{turf.name}</p>
                        <p className="text-[11px] text-white/30 flex items-center gap-1 mt-0.5">
                          <MapPin className="h-2.5 w-2.5" />{turf.area}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Owner */}
                  <td className="px-4 py-3.5">
                    <p className="text-sm text-white/60 font-medium">{turf.ownerName || "—"}</p>
                    {turf.ownerId && (
                      <p className="text-[10px] text-white/25 font-mono mt-0.5">{turf.ownerId.slice(-6)}</p>
                    )}
                  </td>

                  {/* Price */}
                  <td className="px-4 py-3.5">
                    <p className="font-black text-primary">₹{(turf.pricePerHour || 0).toLocaleString("en-IN")}</p>
                    <p className="text-[10px] text-white/25">per hour</p>
                  </td>

                  {/* Rating */}
                  <td className="px-4 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-1 text-amber-400">
                      <Star className="h-3.5 w-3.5 fill-current" />
                      <span className="font-bold text-sm">{(turf.rating || 0).toFixed(1)}</span>
                    </div>
                    <p className="text-[10px] text-white/30 mt-0.5">{turf.reviewCount || 0} reviews</p>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3.5 text-center">
                    <span className={cn("inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full",
                      turf.status === "approved" ? "bg-emerald-500/10 text-emerald-400" :
                      turf.status === "rejected" ? "bg-red-500/10 text-red-400" :
                      "bg-amber-500/10 text-amber-400")}>
                      {turf.status === "approved" ? <CheckCircle className="h-3 w-3" /> :
                       turf.status === "rejected" ? <XCircle className="h-3 w-3" /> :
                       <Clock className="h-3 w-3" />}
                      {turf.status}
                    </span>
                  </td>

                  {/* Featured toggle */}
                  <td className="px-4 py-3.5 text-center">
                    <button
                      onClick={() => featureMut.mutate({ id: turf.id, featured: !turf.featured })}
                      disabled={featureMut.isPending}
                      className={cn("h-8 w-8 rounded-xl flex items-center justify-center mx-auto transition-all",
                        turf.featured
                          ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
                          : "bg-white/5 text-white/20 hover:bg-white/10 hover:text-white/50"
                      )}>
                      <Star className={cn("h-4 w-4", turf.featured && "fill-current")} />
                    </button>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {turf.status === "pending" && (
                        <>
                          <Button size="icon" variant="ghost"
                            className="h-8 w-8 rounded-lg text-emerald-400 hover:bg-emerald-500/10"
                            onClick={() => approveMut.mutate({ id: turf.id, status: "approved" })}
                            disabled={approveMut.isPending}>
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost"
                            className="h-8 w-8 rounded-lg text-red-400 hover:bg-red-500/10"
                            onClick={() => approveMut.mutate({ id: turf.id, status: "rejected" })}
                            disabled={approveMut.isPending}>
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {turf.status === "rejected" && (
                        <Button size="icon" variant="ghost"
                          className="h-8 w-8 rounded-lg text-emerald-400 hover:bg-emerald-500/10"
                          onClick={() => approveMut.mutate({ id: turf.id, status: "approved" })}
                          disabled={approveMut.isPending}>
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      )}
                      {turf.status === "approved" && (
                        <Button size="icon" variant="ghost"
                          className="h-8 w-8 rounded-lg text-amber-400/60 hover:bg-amber-500/10 hover:text-amber-400"
                          onClick={() => approveMut.mutate({ id: turf.id, status: "rejected" })}
                          disabled={approveMut.isPending}>
                          <XCircle className="h-4 w-4" />
                        </Button>
                      )}
                      <Button size="icon" variant="ghost"
                        className="h-8 w-8 rounded-lg text-red-400/40 hover:bg-red-500/10 hover:text-red-400"
                        onClick={() => setDeleteTarget(turf)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Dialog */}
      {deleteTarget && (
        <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
          <DialogContent className="sm:max-w-sm bg-[#1a1d27] border-red-500/20 text-white">
            <DialogHeader>
              <DialogTitle className="text-red-400 flex items-center gap-2">
                <Trash2 className="h-5 w-5" /> Delete Turf
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                <p className="font-bold text-white">{deleteTarget.name}</p>
                <p className="text-sm text-white/50 flex items-center gap-1 mt-1">
                  <MapPin className="h-3 w-3" />{deleteTarget.area}
                </p>
                <p className="text-sm text-red-300/70 mt-3">
                  This permanently removes the turf from the platform. Existing bookings are preserved.
                </p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 border-white/15 text-white hover:bg-white/10"
                  onClick={() => setDeleteTarget(null)}>Cancel</Button>
                <Button className="flex-1 bg-red-600 hover:bg-red-700 font-bold"
                  disabled={deleteMut.isPending}
                  onClick={() => deleteMut.mutate(deleteTarget.id)}>
                  {deleteMut.isPending ? "Deleting..." : "Delete Turf"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
