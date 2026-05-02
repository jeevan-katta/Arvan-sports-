import { useState } from "react";
import { useListTurfs, useApproveTurf, useFeatureTurf, useDeleteTurf } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { MapPin, CheckCircle, XCircle, Star, Trash2, Search, Clock } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getListTurfsQueryKey } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | "approved" | "pending" | "rejected";

export default function AdminTurfs() {
  const { data: turfs, isLoading } = useListTurfs();
  const approveMutation = useApproveTurf();
  const featureMutation = useFeatureTurf();
  const deleteMutation = useDeleteTurf();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const handleApprove = (id: number, status: "approved" | "rejected") => {
    approveMutation.mutate({ id, data: { status } }, {
      onSuccess: () => {
        toast({ title: `Turf ${status}` });
        queryClient.invalidateQueries({ queryKey: getListTurfsQueryKey() });
      },
    });
  };

  const handleFeature = (id: number, currentFeatured: boolean) => {
    featureMutation.mutate({ id, data: { featured: !currentFeatured } }, {
      onSuccess: () => {
        toast({ title: "Featured status updated" });
        queryClient.invalidateQueries({ queryKey: getListTurfsQueryKey() });
      },
    });
  };

  const handleDelete = (id: number) => {
    if (!confirm("Delete this turf? This cannot be undone.")) return;
    deleteMutation.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Turf deleted" });
        queryClient.invalidateQueries({ queryKey: getListTurfsQueryKey() });
      },
    });
  };

  const counts = {
    all: turfs?.length || 0,
    approved: turfs?.filter(t => t.status === "approved").length || 0,
    pending: turfs?.filter(t => t.status === "pending").length || 0,
    rejected: turfs?.filter(t => t.status === "rejected").length || 0,
  };

  const filtered = (turfs || []).filter(t => {
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    const q = search.toLowerCase();
    const matchSearch = !search || t.name?.toLowerCase().includes(q) || (t.area || "").toLowerCase().includes(q) || (t.ownerName || "").toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const filters: { label: string; value: StatusFilter; color: string }[] = [
    { label: "All", value: "all", color: "" },
    { label: "Approved", value: "approved", color: "text-emerald-400" },
    { label: "Pending", value: "pending", color: "text-amber-400" },
    { label: "Rejected", value: "rejected", color: "text-red-400" },
  ];

  return (
    <div className="p-4 md:p-8 text-white">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-black tracking-tight">Turf Management</h2>
          <p className="text-white/40 text-sm mt-0.5">{turfs?.length || 0} venues registered</p>
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3 mb-6">
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
      </div>

      {/* Filters + Search */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="flex gap-1 bg-white/5 rounded-xl p-1 flex-shrink-0">
          {filters.map(f => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                statusFilter === f.value ? "bg-primary text-primary-foreground" : "text-white/40 hover:text-white"
              )}
            >
              {f.label}
              <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-black",
                statusFilter === f.value ? "bg-white/20 text-white" : "bg-white/5 text-white/30"
              )}>{counts[f.value]}</span>
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, area or owner..."
            className="pl-8 bg-white/5 border-white/10 text-white placeholder:text-white/20 h-9 text-sm"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-white/30">Venue</th>
                <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-white/30">Owner</th>
                <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-white/30">Price/Hr</th>
                <th className="px-5 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-white/30">Rating</th>
                <th className="px-5 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-white/30">Status</th>
                <th className="px-5 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-white/30">Featured</th>
                <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-white/30">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading && [...Array(4)].map((_, i) => (
                <tr key={i}>
                  {[...Array(7)].map((_, j) => (
                    <td key={j} className="px-5 py-4"><div className="h-4 bg-white/5 rounded animate-pulse" /></td>
                  ))}
                </tr>
              ))}
              {!isLoading && filtered.length === 0 && (
                <tr><td colSpan={7} className="text-center py-12 text-white/30 text-sm">No turfs found</td></tr>
              )}
              {!isLoading && filtered.map((turf: any) => (
                <tr key={turf.id} className="hover:bg-white/[0.03] transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      {turf.images?.[0] ? (
                        <img src={turf.images[0]} alt={turf.name} className="h-10 w-14 rounded-lg object-cover flex-shrink-0 bg-white/5" />
                      ) : (
                        <div className="h-10 w-14 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                          <MapPin className="h-4 w-4 text-white/20" />
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-white text-sm leading-tight">{turf.name}</p>
                        <p className="text-[11px] text-white/30 flex items-center gap-1 mt-0.5">
                          <MapPin className="h-2.5 w-2.5" />{turf.area}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-white/60 text-sm">{turf.ownerName || "—"}</td>
                  <td className="px-5 py-4 text-right font-bold text-primary">₹{turf.pricePerHour}</td>
                  <td className="px-5 py-4 text-center">
                    <span className="text-amber-400 font-bold text-sm">★ {(turf.rating || 0).toFixed(1)}</span>
                    <p className="text-[10px] text-white/30">{turf.reviewCount || 0} reviews</p>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className={cn("inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full",
                      turf.status === "approved" ? "bg-emerald-500/10 text-emerald-400" :
                      turf.status === "rejected" ? "bg-red-500/10 text-red-400" :
                      "bg-amber-500/10 text-amber-400"
                    )}>
                      {turf.status === "approved" ? <CheckCircle className="h-3 w-3" /> :
                       turf.status === "rejected" ? <XCircle className="h-3 w-3" /> :
                       <Clock className="h-3 w-3" />}
                      {turf.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <button
                      onClick={() => handleFeature(turf.id, turf.featured || false)}
                      className={cn("h-8 w-8 rounded-xl flex items-center justify-center mx-auto transition-all",
                        turf.featured ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30" : "bg-white/5 text-white/20 hover:bg-white/10 hover:text-white/40"
                      )}
                    >
                      <Star className={cn("h-4 w-4", turf.featured && "fill-current")} />
                    </button>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {turf.status === "pending" && (
                        <>
                          <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg text-emerald-400 hover:bg-emerald-500/10" onClick={() => handleApprove(turf.id, "approved")}>
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg text-red-400 hover:bg-red-500/10" onClick={() => handleApprove(turf.id, "rejected")}>
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {turf.status === "rejected" && (
                        <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg text-emerald-400 hover:bg-emerald-500/10" onClick={() => handleApprove(turf.id, "approved")}>
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg text-red-400/60 hover:bg-red-500/10 hover:text-red-400" onClick={() => handleDelete(turf.id)}>
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
    </div>
  );
}
