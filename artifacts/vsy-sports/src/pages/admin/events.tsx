import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Calendar as CalendarIcon, Plus, Trash2, MapPin, Trophy, Users, IndianRupee, Star, Building2, Shield, Swords, RefreshCw } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const eventSchema = z.object({
  title:           z.string().min(3),
  description:     z.string().optional(),
  date:            z.string(),
  time:            z.string(),
  venue:           z.string(),
  area:            z.string(),
  prize:           z.string(),
  entryFee:        z.coerce.number(),
  maxParticipants: z.coerce.number(),
  type:            z.enum(["event", "tournament"]).default("tournament"),
  featured:        z.boolean().default(false),
});
type EventFormValues = z.infer<typeof eventSchema>;

const TYPE_COLORS: Record<string, string> = {
  event:      "bg-blue-500/10 text-blue-400 border-blue-500/20",
  tournament: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  maintenance:"bg-orange-500/10 text-orange-400 border-orange-500/20",
};

const ROLE_ICON: Record<string, any> = { admin: Shield, owner: Building2 };

function fmtTime(s: string) {
  try { return format(new Date(s), "dd MMM yyyy"); } catch { return s; }
}

export default function AdminEvents() {
  const { token } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filter, setFilter]             = useState<"all" | "event" | "tournament" | "maintenance">("all");

  // Fetch all events including owner-created ones
  const { data: events = [], isLoading } = useQuery<any[]>({
    queryKey: ["admin-events-all"],
    queryFn: () =>
      fetch("/api/admin/events-all", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    enabled: !!token,
  });

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: { title: "", description: "", date: "", time: "", venue: "", area: "", prize: "", entryFee: 0, maxParticipants: 16, type: "tournament", featured: false },
  });

  const createMutation = useMutation({
    mutationFn: async (data: EventFormValues) => {
      const r = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error || "Failed");
      return json;
    },
    onSuccess: () => { toast({ title: "Event created!" }); setIsDialogOpen(false); form.reset(); qc.invalidateQueries({ queryKey: ["admin-events-all"] }); },
    onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/events/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error("Failed");
    },
    onSuccess: () => { toast({ title: "Deleted" }); qc.invalidateQueries({ queryKey: ["admin-events-all"] }); },
    onError: () => toast({ variant: "destructive", title: "Failed to delete" }),
  });

  const featureMutation = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/admin/events/${id}/feature`, { method: "PUT", headers: { Authorization: `Bearer ${token}` } });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error || "Failed");
      return json;
    },
    onSuccess: (data) => {
      toast({ title: data.featured ? "Event featured!" : "Feature removed" });
      qc.invalidateQueries({ queryKey: ["admin-events-all"] });
    },
    onError: () => toast({ variant: "destructive", title: "Failed to update" }),
  });

  const onSubmit = (data: EventFormValues) => createMutation.mutate(data);

  const filtered = filter === "all" ? events : events.filter(e => e.type === filter);
  const counts = {
    all: events.length,
    event: events.filter(e => e.type === "event").length,
    tournament: events.filter(e => e.type === "tournament").length,
    maintenance: events.filter(e => e.type === "maintenance").length,
  };

  return (
    <div className="p-4 md:p-8 text-white">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-black tracking-tight">Events & Tournaments</h2>
          <p className="text-white/40 text-sm mt-0.5">{events.length} total · {events.filter(e => e.featured).length} featured</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 font-bold bg-primary hover:bg-primary/90 rounded-xl h-10 px-5">
              <Plus className="h-4 w-4" /> Create Event
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto bg-[#1a1d27] border-white/10 text-white sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" /> Create Event / Tournament
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
                {/* Type */}
                <FormField control={form.control} name="type" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/60 text-xs">Type</FormLabel>
                    <div className="grid grid-cols-2 gap-2">
                      {(["event","tournament"] as const).map(t => (
                        <button type="button" key={t} onClick={() => field.onChange(t)}
                          className={cn("py-2.5 rounded-xl border text-sm font-bold capitalize transition-all",
                            field.value === t ? "bg-primary border-primary text-white" : "bg-white/5 border-white/10 text-white/50 hover:border-white/20")}>
                          {t === "tournament" ? "🏆 Tournament" : "📅 Event"}
                        </button>
                      ))}
                    </div>
                  </FormItem>
                )} />
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/60 text-xs">Title</FormLabel>
                    <FormControl><Input {...field} placeholder="VSY Box Cricket Championship 2026" className="bg-white/5 border-white/10 text-white placeholder:text-white/20" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="date" render={({ field }) => (
                    <FormItem><FormLabel className="text-white/60 text-xs">Date</FormLabel><FormControl><Input type="date" {...field} className="bg-white/5 border-white/10 text-white" /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="time" render={({ field }) => (
                    <FormItem><FormLabel className="text-white/60 text-xs">Time</FormLabel><FormControl><Input type="time" {...field} className="bg-white/5 border-white/10 text-white" /></FormControl></FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="venue" render={({ field }) => (
                    <FormItem><FormLabel className="text-white/60 text-xs">Venue</FormLabel><FormControl><Input {...field} placeholder="VSY Box Cricket" className="bg-white/5 border-white/10 text-white placeholder:text-white/20" /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="area" render={({ field }) => (
                    <FormItem><FormLabel className="text-white/60 text-xs">Area</FormLabel><FormControl><Input {...field} placeholder="Gachibowli" className="bg-white/5 border-white/10 text-white placeholder:text-white/20" /></FormControl></FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <FormField control={form.control} name="prize" render={({ field }) => (
                    <FormItem><FormLabel className="text-white/60 text-xs">Prize</FormLabel><FormControl><Input {...field} placeholder="₹50,000" className="bg-white/5 border-white/10 text-white placeholder:text-white/20" /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="entryFee" render={({ field }) => (
                    <FormItem><FormLabel className="text-white/60 text-xs">Entry Fee (₹)</FormLabel><FormControl><Input type="number" {...field} className="bg-white/5 border-white/10 text-white" /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="maxParticipants" render={({ field }) => (
                    <FormItem><FormLabel className="text-white/60 text-xs">Max Teams</FormLabel><FormControl><Input type="number" {...field} className="bg-white/5 border-white/10 text-white" /></FormControl></FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem><FormLabel className="text-white/60 text-xs">Description (optional)</FormLabel><FormControl><Input {...field} placeholder="Rules, format, contact info..." className="bg-white/5 border-white/10 text-white placeholder:text-white/20" /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="featured" render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-xl border border-white/10 bg-white/5 p-4">
                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    <div>
                      <FormLabel className="text-white text-sm font-bold">Feature this event</FormLabel>
                      <p className="text-[11px] text-white/30 mt-0.5">Displayed prominently at the top of the events page</p>
                    </div>
                  </FormItem>
                )} />
                <Button type="submit" className="w-full font-bold h-11 bg-primary hover:bg-primary/90" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creating..." : "Create Event"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 mb-5 overflow-x-auto">
        {(["all","event","tournament","maintenance"] as const).map(t => (
          <button key={t} onClick={() => setFilter(t)}
            className={cn(
              "whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5",
              filter === t ? "bg-primary text-white" : "bg-white/5 text-white/40 hover:text-white"
            )}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
            <span className={cn("text-[9px] font-black px-1.5 rounded-full", filter === t ? "bg-white/20" : "bg-white/10")}>
              {counts[t]}
            </span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-56 rounded-2xl bg-white/5 animate-pulse" />)}
        </div>
      ) : !filtered.length ? (
        <div className="text-center py-20 text-white/30">
          <Trophy className="h-16 w-16 mx-auto mb-4 opacity-20" />
          <p className="font-bold text-lg">No {filter === "all" ? "events" : filter + "s"} yet</p>
          <p className="text-sm mt-1 mb-5">Create your first {filter === "all" ? "event or tournament" : filter} to engage the community</p>
          <Button onClick={() => setIsDialogOpen(true)} className="font-bold gap-2 bg-primary hover:bg-primary/90">
            <Plus className="h-4 w-4" /> Create Event
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((event: any) => {
            const RoleIcon = ROLE_ICON[event.createdByRole] || Shield;
            return (
              <div key={event.id} className={cn(
                "bg-white/5 border rounded-2xl overflow-hidden relative flex flex-col",
                event.featured ? "border-primary/40 bg-primary/5" : "border-white/10"
              )}>
                {/* Top badges row */}
                <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap">
                  {event.featured && (
                    <div className="bg-primary text-primary-foreground text-[9px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Star className="h-2.5 w-2.5" /> Featured
                    </div>
                  )}
                  <div className={cn("text-[9px] font-black uppercase px-2 py-0.5 rounded-full border", TYPE_COLORS[event.type] || TYPE_COLORS.event)}>
                    {event.type}
                  </div>
                </div>

                {/* Creator badge */}
                <div className="absolute top-3 right-3 flex items-center gap-1 bg-white/10 rounded-full px-2 py-0.5">
                  <RoleIcon className="h-3 w-3 text-white/50" />
                  <span className="text-[9px] text-white/50 font-bold">{event.createdByName || event.createdByRole}</span>
                </div>

                <div className="p-5 pt-10 flex-1">
                  <h3 className="font-bold text-white text-base leading-tight mb-3">{event.title}</h3>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex items-center gap-2 text-white/50">
                      <CalendarIcon className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                      <span>{event.date}{event.time ? ` · ${event.time}` : ""}</span>
                    </div>
                    {(event.venue || event.area) && (
                      <div className="flex items-center gap-2 text-white/50">
                        <MapPin className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                        <span className="truncate">{[event.venue, event.area].filter(Boolean).join(", ")}</span>
                      </div>
                    )}
                    {event.turfName && (
                      <div className="flex items-center gap-2 text-white/50">
                        <Swords className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                        <span className="truncate">{event.turfName}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-white/50">
                      <Users className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                      <span>{event.currentParticipants || 0} / {event.maxParticipants || "∞"} registered</span>
                    </div>
                  </div>

                  {event.type !== "maintenance" && (
                    <div className="flex gap-2 mt-4">
                      <div className="flex-1 bg-white/5 rounded-xl p-3 text-center">
                        <p className="text-[10px] text-white/30 font-bold uppercase">Entry</p>
                        <p className="font-black text-primary mt-0.5">₹{event.entryFee || 0}</p>
                      </div>
                      {event.prize && (
                        <div className="flex-1 bg-amber-500/10 rounded-xl p-3 text-center">
                          <p className="text-[10px] text-amber-400/60 font-bold uppercase">Prize</p>
                          <p className="font-black text-amber-400 mt-0.5 text-sm truncate">{event.prize}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Progress bar */}
                  {event.maxParticipants > 0 && event.type !== "maintenance" && (
                    <div className="mt-3">
                      <div className="flex justify-between text-[10px] text-white/30 mb-1">
                        <span>Registrations</span>
                        <span>{Math.round(((event.currentParticipants || 0) / event.maxParticipants) * 100)}%</span>
                      </div>
                      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${Math.min(100, ((event.currentParticipants || 0) / event.maxParticipants) * 100)}%` }} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="border-t border-white/10 p-3 flex justify-between items-center gap-2">
                  <button
                    onClick={() => featureMutation.mutate(event.id)}
                    disabled={featureMutation.isPending}
                    className={cn(
                      "flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl transition-all",
                      event.featured
                        ? "bg-primary/20 text-primary hover:bg-primary/30"
                        : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    {featureMutation.isPending ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Star className="h-3 w-3" />}
                    {event.featured ? "Unfeature" : "Feature"}
                  </button>
                  <Button variant="ghost" size="sm"
                    className="h-8 text-xs font-bold text-red-400 hover:bg-red-500/10 rounded-lg gap-1.5"
                    onClick={() => { if (confirm("Delete this event?")) deleteMutation.mutate(event.id); }}>
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
