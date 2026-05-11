import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ImageUpload } from "@/components/ImageUpload";
import {
  Calendar, MapPin, Trophy, Users, Star, Building2, Shield,
  Plus, Trash2, RefreshCw, Search, Filter, Swords, TrendingUp,
  Clock, ChevronDown, ChevronUp, ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const TYPE_META: Record<string, { label: string; color: string; dot: string }> = {
  event:      { label: "Event",      color: "bg-blue-500/15 text-blue-400 border-blue-500/20",   dot: "bg-blue-400"   },
  tournament: { label: "Tournament", color: "bg-amber-500/15 text-amber-400 border-amber-500/20", dot: "bg-amber-400" },
  maintenance:{ label: "Maintenance",color: "bg-orange-500/15 text-orange-400 border-orange-500/20",dot:"bg-orange-400"},
};

const STATUS_META: Record<string, { label: string; color: string }> = {
  upcoming:  { label: "Upcoming",  color: "bg-primary/15 text-primary" },
  ongoing:   { label: "Ongoing",   color: "bg-emerald-500/15 text-emerald-400" },
  completed: { label: "Completed", color: "bg-white/10 text-white/40" },
  cancelled: { label: "Cancelled", color: "bg-red-500/15 text-red-400" },
};

const ROLE_ICON: Record<string, any> = { admin: Shield, owner: Building2 };

function fmtDate(d: string) { try { return format(new Date(d), "dd MMM yyyy"); } catch { return d; } }

type TabFilter = "all" | "event" | "tournament" | "maintenance";

interface CreateForm {
  title: string; description: string; type: "event" | "tournament";
  date: string; time: string; venue: string; area: string;
  prize: string; entryFee: string; maxParticipants: string;
  image: string; featured: boolean;
}

const BLANK: CreateForm = {
  title: "", description: "", type: "tournament",
  date: "", time: "", venue: "", area: "",
  prize: "", entryFee: "", maxParticipants: "",
  image: "", featured: false,
};

export default function AdminEvents() {
  const { token } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [tab, setTab]         = useState<TabFilter>("all");
  const [search, setSearch]   = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm]       = useState<CreateForm>(BLANK);

  const { data: events = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ["admin-events-all"],
    queryFn: () => fetch("/api/admin/events-all", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    enabled: !!token,
  });

  const set = (k: keyof CreateForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const createMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: form.title.trim(), description: form.description.trim() || undefined,
          type: form.type, date: form.date, time: form.time || undefined,
          venue: form.venue || undefined, area: form.area || undefined,
          prize: form.prize || undefined, entryFee: Number(form.entryFee) || 0,
          maxParticipants: Number(form.maxParticipants) || undefined,
          image: form.image || undefined, featured: form.featured,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Failed");
      return data;
    },
    onSuccess: () => {
      toast({ title: `${form.type === "tournament" ? "Tournament" : "Event"} created!` });
      setShowCreate(false);
      setForm(BLANK);
      qc.invalidateQueries({ queryKey: ["admin-events-all"] });
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.message }),
  });

  const featureMutation = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/admin/events/${id}/feature`, { method: "PUT", headers: { Authorization: `Bearer ${token}` } });
      const data = await r.json(); if (!r.ok) throw new Error(data.error); return data;
    },
    onSuccess: (d) => { toast({ title: d.featured ? "Featured!" : "Unfeatured" }); qc.invalidateQueries({ queryKey: ["admin-events-all"] }); },
    onError: () => toast({ variant: "destructive", title: "Failed" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/events/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error("Failed");
    },
    onSuccess: () => { toast({ title: "Deleted" }); qc.invalidateQueries({ queryKey: ["admin-events-all"] }); },
    onError: () => toast({ variant: "destructive", title: "Failed to delete" }),
  });

  const q = search.toLowerCase();
  const filtered = events.filter(e => {
    if (tab !== "all" && e.type !== tab) return false;
    if (q && !e.title.toLowerCase().includes(q) && !(e.venue || "").toLowerCase().includes(q)) return false;
    return true;
  });

  const counts = {
    all: events.length,
    event: events.filter(e => e.type === "event").length,
    tournament: events.filter(e => e.type === "tournament").length,
    maintenance: events.filter(e => e.type === "maintenance").length,
  };

  const featuredCount = events.filter(e => e.featured).length;
  const totalParticipants = events.reduce((s, e) => s + (e.currentParticipants || 0), 0);

  return (
    <div className="min-h-full bg-[#111420]">

      {/* ── Page header ── */}
      <div className="bg-[#0d0f18] border-b border-white/[0.07] px-4 md:px-8 py-6">
        <div className="flex items-start justify-between gap-4 max-w-6xl mx-auto">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
              <Trophy className="h-6 w-6 text-primary" /> Events & Tournaments
            </h1>
            <p className="text-white/40 text-sm mt-1">Manage all events from admin and owners</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => refetch()} className="h-9 w-9 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-white/30 hover:text-white hover:bg-white/10 transition-all">
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
            <Button onClick={() => setShowCreate(true)} className="h-9 gap-2 font-bold bg-primary hover:bg-primary/90 rounded-xl px-4">
              <Plus className="h-4 w-4" /> Create
            </Button>
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-4 gap-3 mt-5 max-w-6xl mx-auto">
          {[
            { label: "Total", value: events.length, icon: Trophy, color: "text-primary" },
            { label: "Featured", value: featuredCount, icon: Star, color: "text-amber-400" },
            { label: "Tournaments", value: counts.tournament, icon: Swords, color: "text-purple-400" },
            { label: "Participants", value: totalParticipants, icon: Users, color: "text-emerald-400" },
          ].map(stat => (
            <div key={stat.label} className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-3 text-center">
              <stat.icon className={cn("h-4 w-4 mx-auto mb-1.5", stat.color)} />
              <p className={cn("text-xl font-black", stat.color)}>{stat.value}</p>
              <p className="text-[10px] text-white/30 font-bold uppercase tracking-wider mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 md:px-8 py-5 max-w-6xl mx-auto space-y-4">

        {/* ── Toolbar ── */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/25" />
            <Input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by title or venue…"
              className="pl-9 bg-white/[0.05] border-white/10 text-white placeholder:text-white/20 h-10"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {(["all","event","tournament","maintenance"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={cn("px-3 h-10 rounded-xl text-xs font-bold capitalize transition-all border",
                  tab === t ? "bg-primary border-primary text-white" : "bg-white/[0.05] border-white/10 text-white/40 hover:text-white")}>
                {t === "all" ? "All" : TYPE_META[t].label}
                <span className={cn("ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full font-black", tab === t ? "bg-white/20" : "bg-white/10")}>
                  {counts[t]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Events grid ── */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <div key={i} className="h-64 rounded-2xl bg-white/[0.04] animate-pulse" />)}
          </div>
        ) : !filtered.length ? (
          <div className="text-center py-20 text-white/20">
            <Trophy className="h-16 w-16 mx-auto mb-4 opacity-20" />
            <p className="font-bold text-lg">{search ? "No results found" : `No ${tab === "all" ? "events" : tab + "s"}`}</p>
            {!search && <Button onClick={() => setShowCreate(true)} className="mt-4 gap-2 bg-primary hover:bg-primary/90"><Plus className="h-4 w-4" />Create one</Button>}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(ev => {
              const typeMeta = TYPE_META[ev.type] || TYPE_META.event;
              const statusMeta = STATUS_META[ev.status] || STATUS_META.upcoming;
              const RoleIcon = ROLE_ICON[ev.createdByRole] || Shield;
              const isExpanded = expandedId === ev.id;
              const pct = ev.maxParticipants ? Math.min(100, Math.round(((ev.currentParticipants || 0) / ev.maxParticipants) * 100)) : 0;

              return (
                <div key={ev.id} className={cn(
                  "bg-[#161924] border rounded-2xl overflow-hidden flex flex-col transition-all",
                  ev.featured ? "border-primary/40 shadow-lg shadow-primary/10" : "border-white/[0.08]"
                )}>
                  {/* Image */}
                  <div className="relative h-40 bg-gradient-to-br from-white/[0.05] to-transparent flex-shrink-0">
                    {ev.image ? (
                      <img src={ev.image} alt={ev.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="h-10 w-10 text-white/10" />
                      </div>
                    )}
                    {/* Overlays */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#161924] via-transparent to-transparent" />
                    <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap">
                      {ev.featured && (
                        <span className="flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-primary text-white shadow">
                          <Star className="h-2.5 w-2.5 fill-current" /> Featured
                        </span>
                      )}
                      <span className={cn("text-[9px] font-black uppercase px-2 py-0.5 rounded-full border", typeMeta.color)}>
                        {typeMeta.label}
                      </span>
                    </div>
                    <div className="absolute top-3 right-3">
                      <div className="flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-full px-2 py-0.5">
                        <RoleIcon className="h-3 w-3 text-white/50" />
                        <span className="text-[9px] text-white/50 font-bold">{ev.createdByName || ev.createdByRole}</span>
                      </div>
                    </div>
                    <span className={cn("absolute bottom-3 right-3 text-[9px] font-bold px-2 py-0.5 rounded-full", statusMeta.color)}>
                      {statusMeta.label}
                    </span>
                  </div>

                  {/* Body */}
                  <div className="p-4 flex-1 flex flex-col">
                    <h3 className="font-bold text-white text-sm leading-tight mb-2">{ev.title}</h3>
                    <div className="space-y-1 text-xs text-white/40 mb-3">
                      <div className="flex items-center gap-1.5"><Calendar className="h-3 w-3 text-primary flex-shrink-0" />{fmtDate(ev.date)}{ev.time ? ` · ${ev.time}` : ""}</div>
                      {(ev.venue || ev.area) && <div className="flex items-center gap-1.5"><MapPin className="h-3 w-3 text-primary flex-shrink-0" /><span className="truncate">{[ev.venue, ev.area].filter(Boolean).join(", ")}</span></div>}
                      <div className="flex items-center gap-1.5"><Users className="h-3 w-3 text-primary flex-shrink-0" />{ev.currentParticipants || 0}{ev.maxParticipants ? `/${ev.maxParticipants}` : ""} registered</div>
                    </div>

                    {/* Prize + Fee chips */}
                    {(ev.prize || ev.entryFee > 0) && ev.type !== "maintenance" && (
                      <div className="flex gap-2 mb-3">
                        {ev.prize && <div className="flex-1 bg-amber-500/10 rounded-xl px-2.5 py-1.5 text-center"><p className="text-[9px] text-amber-400/60 font-black uppercase">Prize</p><p className="text-xs font-black text-amber-400">{ev.prize}</p></div>}
                        {ev.entryFee > 0 && <div className="flex-1 bg-white/[0.05] rounded-xl px-2.5 py-1.5 text-center"><p className="text-[9px] text-white/30 font-black uppercase">Entry</p><p className="text-xs font-black text-white">₹{ev.entryFee}</p></div>}
                      </div>
                    )}

                    {/* Progress bar */}
                    {ev.maxParticipants > 0 && ev.type !== "maintenance" && (
                      <div className="mb-3">
                        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <p className="text-[9px] text-white/25 mt-1 text-right">{pct}% filled</p>
                      </div>
                    )}

                    <div className="mt-auto" />

                    {/* Toggle description */}
                    {ev.description && (
                      <button onClick={() => setExpandedId(isExpanded ? null : ev.id)}
                        className="flex items-center gap-1 text-[10px] text-white/25 hover:text-white/50 mb-2 transition-colors">
                        {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        {isExpanded ? "Hide" : "Show"} description
                      </button>
                    )}
                    {isExpanded && ev.description && (
                      <p className="text-xs text-white/40 leading-relaxed mb-3 bg-white/[0.03] rounded-xl p-3">{ev.description}</p>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-3 border-t border-white/[0.06]">
                      <button
                        onClick={() => featureMutation.mutate(ev.id)}
                        disabled={featureMutation.isPending}
                        className={cn("flex-1 flex items-center justify-center gap-1.5 text-xs font-bold py-2 rounded-xl transition-all border",
                          ev.featured
                            ? "bg-primary/20 border-primary/40 text-primary hover:bg-primary/30"
                            : "bg-white/[0.04] border-white/10 text-white/30 hover:border-primary/40 hover:text-primary hover:bg-primary/10"
                        )}
                      >
                        <Star className={cn("h-3.5 w-3.5", ev.featured && "fill-current")} />
                        {ev.featured ? "Unfeature" : "Feature"}
                      </button>
                      <button
                        onClick={() => { if (confirm("Delete this event?")) deleteMutation.mutate(ev.id); }}
                        disabled={deleteMutation.isPending}
                        className="flex items-center gap-1 text-xs font-bold text-red-400 hover:bg-red-500/10 px-3 py-2 rounded-xl transition-colors border border-red-500/20"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Create Dialog ── */}
      <Dialog open={showCreate} onOpenChange={v => { setShowCreate(v); if (!v) setForm(BLANK); }}>
        <DialogContent className="max-h-[92vh] overflow-y-auto bg-[#1a1d27] border-white/10 text-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Trophy className="h-4 w-4 text-primary" /> Create Event / Tournament
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            {/* Type selector */}
            <div>
              <label className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2 block">Type</label>
              <div className="grid grid-cols-2 gap-2">
                {(["tournament","event"] as const).map(t => (
                  <button type="button" key={t} onClick={() => setForm(f => ({ ...f, type: t }))}
                    className={cn("py-3 rounded-xl border text-sm font-bold capitalize transition-all",
                      form.type === t ? "bg-primary border-primary text-white" : "bg-white/[0.04] border-white/10 text-white/40 hover:border-white/20")}>
                    {t === "tournament" ? "🏆 Tournament" : "📅 Event"}
                  </button>
                ))}
              </div>
            </div>

            {/* Image upload */}
            <div>
              <label className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2 block">Cover Photo</label>
              <ImageUpload
                value={form.image}
                onChange={url => setForm(f => ({ ...f, image: url }))}
                token={token || ""}
                label="Upload Cover Photo"
              />
            </div>

            {/* Title */}
            <div>
              <label className="text-xs font-bold text-white/40 uppercase tracking-wider mb-1.5 block">Title <span className="text-red-400">*</span></label>
              <Input value={form.title} onChange={set("title")} placeholder={form.type === "tournament" ? "e.g. Arvan Summer Championship 2026" : "e.g. Corporate Cricket Night"}
                className="bg-white/[0.05] border-white/10 text-white placeholder:text-white/20 h-11" />
            </div>

            {/* Date + Time */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-white/40 uppercase tracking-wider mb-1.5 block">Date <span className="text-red-400">*</span></label>
                <Input type="date" value={form.date} onChange={set("date")} className="bg-white/[0.05] border-white/10 text-white h-11" />
              </div>
              <div>
                <label className="text-xs font-bold text-white/40 uppercase tracking-wider mb-1.5 block">Time</label>
                <Input type="time" value={form.time} onChange={set("time")} className="bg-white/[0.05] border-white/10 text-white h-11" />
              </div>
            </div>

            {/* Venue + Area */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-white/40 uppercase tracking-wider mb-1.5 block">Venue</label>
                <Input value={form.venue} onChange={set("venue")} placeholder="Arvan Sports Ground" className="bg-white/[0.05] border-white/10 text-white placeholder:text-white/20 h-11" />
              </div>
              <div>
                <label className="text-xs font-bold text-white/40 uppercase tracking-wider mb-1.5 block">Area</label>
                <Input value={form.area} onChange={set("area")} placeholder="Gachibowli" className="bg-white/[0.05] border-white/10 text-white placeholder:text-white/20 h-11" />
              </div>
            </div>

            {/* Prize + Fee + Max */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-white/40 uppercase tracking-wider mb-1.5 block">Prize Pool</label>
                <Input value={form.prize} onChange={set("prize")} placeholder="₹50,000" className="bg-white/[0.05] border-white/10 text-white placeholder:text-white/20 h-11" />
              </div>
              <div>
                <label className="text-xs font-bold text-white/40 uppercase tracking-wider mb-1.5 block">Entry (₹)</label>
                <Input type="number" value={form.entryFee} onChange={set("entryFee")} placeholder="0" className="bg-white/[0.05] border-white/10 text-white h-11" />
              </div>
              <div>
                <label className="text-xs font-bold text-white/40 uppercase tracking-wider mb-1.5 block">Max Teams</label>
                <Input type="number" value={form.maxParticipants} onChange={set("maxParticipants")} placeholder="16" className="bg-white/[0.05] border-white/10 text-white h-11" />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-bold text-white/40 uppercase tracking-wider mb-1.5 block">Description</label>
              <Textarea value={form.description} onChange={set("description")} placeholder="Rules, format, contact info, schedule…"
                className="resize-none bg-white/[0.05] border-white/10 text-white placeholder:text-white/20 text-sm" rows={4} />
            </div>

            {/* Featured toggle */}
            <label className="flex items-center gap-3 p-3.5 bg-white/[0.04] border border-white/10 rounded-xl cursor-pointer hover:border-primary/40 transition-colors">
              <div onClick={() => setForm(f => ({ ...f, featured: !f.featured }))}
                className={cn("h-5 w-9 rounded-full transition-all relative flex-shrink-0 cursor-pointer",
                  form.featured ? "bg-primary" : "bg-white/20")}>
                <div className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all", form.featured ? "right-0.5" : "left-0.5")} />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Feature this event</p>
                <p className="text-[11px] text-white/30">Shown prominently on the homepage and events page</p>
              </div>
            </label>

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1 h-11 border-white/10 text-white/50 hover:bg-white/[0.05]"
                onClick={() => { setShowCreate(false); setForm(BLANK); }} disabled={createMutation.isPending}>
                Cancel
              </Button>
              <Button className="flex-1 h-11 font-bold bg-primary hover:bg-primary/90 gap-2"
                disabled={createMutation.isPending || !form.title.trim() || !form.date}
                onClick={() => createMutation.mutate()}>
                {createMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {createMutation.isPending ? "Creating…" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
