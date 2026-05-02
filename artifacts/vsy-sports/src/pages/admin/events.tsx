import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Trophy, Plus, Trash2, MapPin, Users, Calendar as CalendarIcon,
  IndianRupee, Star, Clock, CheckCircle2, Search, Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

function hdr(token: string) {
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

const fmtINR = (n: number) => `₹${(n || 0).toLocaleString("en-IN")}`;

const eventSchema = z.object({
  title: z.string().min(3, "Min 3 characters"),
  description: z.string().optional(),
  date: z.string().min(1, "Required"),
  time: z.string().min(1, "Required"),
  venue: z.string().min(2, "Required"),
  area: z.string().min(2, "Required"),
  prize: z.string().min(1, "Required"),
  entryFee: z.coerce.number().min(0),
  maxParticipants: z.coerce.number().min(2),
  featured: z.boolean().default(false),
});

type EventForm = z.infer<typeof eventSchema>;

export default function AdminEvents() {
  const { token } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [editEvent, setEditEvent] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [showFeaturedOnly, setShowFeaturedOnly] = useState(false);

  const form = useForm<EventForm>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: "", description: "", date: "", time: "",
      venue: "", area: "", prize: "", entryFee: 0,
      maxParticipants: 16, featured: false,
    },
  });

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["admin-events"],
    queryFn: async () => {
      const r = await fetch("/api/events", { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    enabled: !!token,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-events"] });

  const createMut = useMutation({
    mutationFn: async (data: EventForm) => {
      const r = await fetch("/api/events", {
        method: "POST", headers: hdr(token!), body: JSON.stringify(data),
      });
      if (!r.ok) throw new Error((await r.json()).error || "Failed");
      return r.json();
    },
    onSuccess: () => {
      toast({ title: "Event created!" });
      setCreateOpen(false);
      form.reset();
      invalidate();
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.message }),
  });

  const updateMut = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<EventForm> }) => {
      const r = await fetch(`/api/events/${id}`, {
        method: "PUT", headers: hdr(token!), body: JSON.stringify(data),
      });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => { toast({ title: "Event updated!" }); setEditEvent(null); invalidate(); },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/events/${id}`, { method: "DELETE", headers: hdr(token!) });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => { toast({ title: "Event deleted" }); setDeleteTarget(null); invalidate(); },
  });

  const openCreate = () => {
    form.reset({ title: "", description: "", date: "", time: "", venue: "", area: "", prize: "", entryFee: 0, maxParticipants: 16, featured: false });
    setCreateOpen(true);
  };

  const openEdit = (event: any) => {
    form.reset({
      title: event.title, description: event.description || "",
      date: event.date, time: event.time, venue: event.venue,
      area: event.area, prize: event.prize,
      entryFee: event.entryFee, maxParticipants: event.maxParticipants,
      featured: event.featured || false,
    });
    setEditEvent(event);
  };

  const filtered = (Array.isArray(events) ? events : []).filter((e: any) => {
    const q = search.toLowerCase();
    const matchSearch = !search || e.title?.toLowerCase().includes(q) || e.venue?.toLowerCase().includes(q) || e.area?.toLowerCase().includes(q);
    const matchFeatured = !showFeaturedOnly || e.featured;
    return matchSearch && matchFeatured;
  });

  const totalRevenue = (Array.isArray(events) ? events : []).reduce((s: number, e: any) => s + ((e.entryFee || 0) * (e.currentParticipants || 0)), 0);
  const totalParticipants = (Array.isArray(events) ? events : []).reduce((s: number, e: any) => s + (e.currentParticipants || 0), 0);

  const EventFormContent = ({ isEdit = false }: { isEdit?: boolean }) => (
    <form onSubmit={form.handleSubmit(d => isEdit ? updateMut.mutate({ id: editEvent.id, data: d }) : createMut.mutate(d))} className="space-y-4">
      <div>
        <label className="text-xs text-white/50 font-medium">Event Title *</label>
        <Input {...form.register("title")} placeholder="VSY Box Cricket Championship 2026"
          className="mt-1 bg-white/5 border-white/10 text-white placeholder:text-white/20" />
        {form.formState.errors.title && <p className="text-red-400 text-xs mt-1">{form.formState.errors.title.message}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-white/50 font-medium">Date *</label>
          <Input type="date" {...form.register("date")} className="mt-1 bg-white/5 border-white/10 text-white" />
        </div>
        <div>
          <label className="text-xs text-white/50 font-medium">Time *</label>
          <Input type="time" {...form.register("time")} className="mt-1 bg-white/5 border-white/10 text-white" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-white/50 font-medium">Venue *</label>
          <Input {...form.register("venue")} placeholder="VSY Box Cricket" className="mt-1 bg-white/5 border-white/10 text-white placeholder:text-white/20" />
        </div>
        <div>
          <label className="text-xs text-white/50 font-medium">Area *</label>
          <Input {...form.register("area")} placeholder="Gachibowli" className="mt-1 bg-white/5 border-white/10 text-white placeholder:text-white/20" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-white/50 font-medium">Prize *</label>
          <Input {...form.register("prize")} placeholder="₹50,000" className="mt-1 bg-white/5 border-white/10 text-white placeholder:text-white/20" />
        </div>
        <div>
          <label className="text-xs text-white/50 font-medium">Entry Fee (₹)</label>
          <Input type="number" {...form.register("entryFee")} className="mt-1 bg-white/5 border-white/10 text-white" />
        </div>
        <div>
          <label className="text-xs text-white/50 font-medium">Max Teams</label>
          <Input type="number" {...form.register("maxParticipants")} className="mt-1 bg-white/5 border-white/10 text-white" />
        </div>
      </div>
      <div>
        <label className="text-xs text-white/50 font-medium">Description</label>
        <Input {...form.register("description")} placeholder="Rules, format, contact info..." className="mt-1 bg-white/5 border-white/10 text-white placeholder:text-white/20" />
      </div>
      <label className={cn("flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all",
        form.watch("featured") ? "border-primary/40 bg-primary/10" : "border-white/10 bg-white/5 hover:border-white/20")}>
        <input type="checkbox" {...form.register("featured")} className="accent-primary h-4 w-4" />
        <div>
          <p className="text-sm font-bold text-white">Feature this event</p>
          <p className="text-[11px] text-white/30 mt-0.5">Displayed prominently on the events page</p>
        </div>
        {form.watch("featured") && <Star className="h-4 w-4 text-amber-400 fill-current ml-auto" />}
      </label>
      <Button type="submit" className="w-full h-11 font-bold bg-primary hover:bg-primary/90"
        disabled={createMut.isPending || updateMut.isPending}>
        {isEdit
          ? (updateMut.isPending ? "Saving..." : "Save Changes")
          : (createMut.isPending ? "Creating..." : "Create Event")}
      </Button>
    </form>
  );

  return (
    <div className="p-4 md:p-8 text-white">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-black tracking-tight">Events & Tournaments</h2>
          <p className="text-white/40 text-sm mt-0.5">{(Array.isArray(events) ? events : []).length} events · {totalParticipants} total registrations</p>
        </div>
        <Button onClick={openCreate} className="gap-2 font-bold bg-primary hover:bg-primary/90 rounded-xl h-10 px-5">
          <Plus className="h-4 w-4" /> Create Event
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
          <p className="text-2xl font-black text-white">{(Array.isArray(events) ? events : []).length}</p>
          <p className="text-[10px] text-white/30 font-bold uppercase mt-0.5">Total Events</p>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 text-center">
          <p className="text-2xl font-black text-emerald-400">{fmtINR(totalRevenue)}</p>
          <p className="text-[10px] text-emerald-400/60 font-bold uppercase mt-0.5">Entry Revenue</p>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 text-center">
          <p className="text-2xl font-black text-blue-400">{totalParticipants}</p>
          <p className="text-[10px] text-blue-400/60 font-bold uppercase mt-0.5">Registered Teams</p>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-center">
          <p className="text-2xl font-black text-amber-400">{(Array.isArray(events) ? events : []).filter((e: any) => e.featured).length}</p>
          <p className="text-[10px] text-amber-400/60 font-bold uppercase mt-0.5">Featured</p>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search events by title, venue or area..."
            className="pl-8 bg-white/5 border-white/10 text-white placeholder:text-white/20 h-9 text-sm" />
        </div>
        <button onClick={() => setShowFeaturedOnly(v => !v)}
          className={cn("flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border flex-shrink-0",
            showFeaturedOnly ? "bg-amber-500/15 border-amber-500/30 text-amber-400" : "bg-white/5 border-white/10 text-white/40 hover:text-white")}>
          <Star className={cn("h-3.5 w-3.5", showFeaturedOnly && "fill-current")} />
          Featured only
        </button>
      </div>

      {/* Events Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-60 rounded-2xl bg-white/5 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-white/30">
          <Trophy className="h-16 w-16 mx-auto mb-4 opacity-20" />
          <p className="font-bold text-lg">No events yet</p>
          <p className="text-sm mt-1 mb-5">Create your first tournament to get started</p>
          <Button onClick={openCreate} className="font-bold gap-2 bg-primary hover:bg-primary/90">
            <Plus className="h-4 w-4" /> Create Event
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((event: any) => {
            const fillPct = event.maxParticipants > 0
              ? Math.min(100, Math.round(((event.currentParticipants || 0) / event.maxParticipants) * 100))
              : 0;
            const isFull = fillPct >= 100;
            const entryRevenue = (event.entryFee || 0) * (event.currentParticipants || 0);

            return (
              <div key={event.id} className={cn(
                "bg-white/5 border rounded-2xl overflow-hidden flex flex-col relative group hover:border-white/20 transition-all",
                event.featured ? "border-amber-500/30 bg-amber-500/[0.03]" : "border-white/10"
              )}>
                {event.featured && (
                  <div className="absolute top-3 right-3">
                    <span className="bg-amber-500 text-[9px] font-black text-white px-2 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                      <Star className="h-2.5 w-2.5 fill-current" /> Featured
                    </span>
                  </div>
                )}

                <div className="p-5 flex-1 space-y-3">
                  <h3 className="font-black text-white text-base leading-tight pr-16">{event.title}</h3>

                  <div className="space-y-1.5 text-[12px]">
                    <div className="flex items-center gap-2 text-white/40">
                      <CalendarIcon className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                      <span>{event.date} at {event.time}</span>
                    </div>
                    <div className="flex items-center gap-2 text-white/40">
                      <MapPin className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                      <span>{event.venue}, {event.area}</span>
                    </div>
                    <div className="flex items-center gap-2 text-white/40">
                      <Users className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                      <span>{event.currentParticipants || 0} / {event.maxParticipants} teams</span>
                      {isFull && <span className="text-[9px] font-black bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full">FULL</span>}
                    </div>
                  </div>

                  {/* Prize + Entry row */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5 text-center">
                      <p className="text-[9px] text-amber-400/60 font-bold uppercase">Prize Pool</p>
                      <p className="font-black text-amber-400 text-sm mt-0.5 truncate">{event.prize}</p>
                    </div>
                    <div className="bg-primary/10 border border-primary/20 rounded-xl p-2.5 text-center">
                      <p className="text-[9px] text-primary/60 font-bold uppercase">Entry Fee</p>
                      <p className="font-black text-primary text-sm mt-0.5">{fmtINR(event.entryFee)}</p>
                    </div>
                  </div>

                  {/* Revenue earned */}
                  {entryRevenue > 0 && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2 flex items-center justify-between">
                      <span className="text-[10px] text-emerald-400/60 font-bold">Revenue collected</span>
                      <span className="font-black text-emerald-400 text-sm">{fmtINR(entryRevenue)}</span>
                    </div>
                  )}

                  {/* Fill progress */}
                  <div>
                    <div className="flex justify-between text-[10px] text-white/25 mb-1.5">
                      <span>Registrations</span>
                      <span>{fillPct}% full</span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full transition-all",
                        fillPct >= 100 ? "bg-red-500" : fillPct >= 75 ? "bg-amber-500" : "bg-primary")}
                        style={{ width: `${fillPct}%` }} />
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="border-t border-white/10 p-3 flex items-center gap-2">
                  <Button size="sm" variant="ghost"
                    className="flex-1 h-8 text-xs font-bold text-white/50 hover:text-white hover:bg-white/10 rounded-lg gap-1.5"
                    onClick={() => openEdit(event)}>
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button size="sm" variant="ghost"
                    className={cn("flex-1 h-8 text-xs font-bold rounded-lg gap-1.5 transition-colors",
                      event.featured
                        ? "text-amber-400 hover:bg-amber-500/10"
                        : "text-white/30 hover:text-amber-400 hover:bg-amber-500/10")}
                    onClick={() => updateMut.mutate({ id: event.id, data: { featured: !event.featured } })}>
                    <Star className={cn("h-3.5 w-3.5", event.featured && "fill-current")} />
                    {event.featured ? "Unfeature" : "Feature"}
                  </Button>
                  <Button size="icon" variant="ghost"
                    className="h-8 w-8 rounded-lg text-red-400/40 hover:bg-red-500/10 hover:text-red-400"
                    onClick={() => setDeleteTarget(event)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto bg-[#1a1d27] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" /> Create Tournament / Event
            </DialogTitle>
          </DialogHeader>
          <div className="pt-2"><EventFormContent /></div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      {editEvent && (
        <Dialog open={!!editEvent} onOpenChange={() => setEditEvent(null)}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto bg-[#1a1d27] border-white/10 text-white">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <Pencil className="h-4 w-4 text-primary" /> Edit: {editEvent.title}
              </DialogTitle>
            </DialogHeader>
            <div className="pt-2"><EventFormContent isEdit /></div>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Dialog */}
      {deleteTarget && (
        <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
          <DialogContent className="sm:max-w-sm bg-[#1a1d27] border-red-500/20 text-white">
            <DialogHeader>
              <DialogTitle className="text-red-400 flex items-center gap-2">
                <Trash2 className="h-5 w-5" /> Delete Event
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                <p className="font-bold text-white">{deleteTarget.title}</p>
                <p className="text-sm text-white/50 mt-1">{deleteTarget.date} · {deleteTarget.venue}</p>
                <p className="text-sm text-red-300/70 mt-2">
                  This permanently deletes the event and all registrations.
                </p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 border-white/15 text-white hover:bg-white/10"
                  onClick={() => setDeleteTarget(null)}>Cancel</Button>
                <Button className="flex-1 bg-red-600 hover:bg-red-700 font-bold"
                  disabled={deleteMut.isPending}
                  onClick={() => deleteMut.mutate(deleteTarget.id)}>
                  {deleteMut.isPending ? "Deleting..." : "Delete Event"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
