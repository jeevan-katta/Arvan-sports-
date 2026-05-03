import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ImageUploadLight } from "@/components/ImageUpload";
import {
  Plus, Trophy, Calendar, MapPin, Users, Trash2, Eye,
  Wrench, Star, RefreshCw, Megaphone, Send,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";

type OwnerEventType = "tournament" | "maintenance";

const TYPE_LABELS: Record<OwnerEventType, { label: string; icon: any; color: string }> = {
  tournament:  { label: "Tournament",  icon: Trophy, color: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  maintenance: { label: "Maintenance", icon: Wrench,  color: "bg-orange-500/10 text-orange-500 border-orange-500/20" },
};

const STATUS_COLORS: Record<string, string> = {
  upcoming:   "bg-primary/10 text-primary",
  ongoing:    "bg-emerald-500/10 text-emerald-500",
  completed:  "bg-muted text-muted-foreground",
  cancelled:  "bg-destructive/10 text-destructive",
};

function fmtDate(d: string) {
  try { return format(parseISO(d), "dd MMM yyyy"); } catch { return d; }
}

// ── Applications Dialog ────────────────────────────────────────────────────────
function ApplicationsDialog({ eventId, eventTitle, token, onClose }: { eventId: string; eventTitle: string; token: string; onClose: () => void }) {
  const { data, isLoading } = useQuery<any>({
    queryKey: ["owner-event-applications", eventId],
    queryFn: () =>
      fetch(`/api/owner/events/${eventId}/applications`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.json()),
    enabled: !!eventId,
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-primary" />
            Applications — {eventTitle}
          </DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}
          </div>
        ) : !data?.applications?.length ? (
          <div className="text-center py-10">
            <Users className="h-10 w-10 mx-auto text-muted-foreground opacity-20 mb-3" />
            <p className="font-bold text-muted-foreground">No applications yet</p>
            <p className="text-xs text-muted-foreground mt-1">Registrations will appear here once users join</p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">
                {data.total} Registered
              </p>
            </div>
            {data.applications.map((app: any, i: number) => (
              <div key={app.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-black text-primary flex-shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm">{app.name || "Unknown"}</p>
                  {app.teamName && <p className="text-xs text-primary font-medium">{app.teamName}</p>}
                  {app.phone && <p className="text-xs text-muted-foreground">{app.phone}</p>}
                </div>
                <p className="text-[10px] text-muted-foreground flex-shrink-0">
                  {app.joinedAt ? format(new Date(app.joinedAt), "dd MMM") : ""}
                </p>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Create Tournament Form ─────────────────────────────────────────────────────
function CreateTournamentForm({ token, turfs, onSuccess, onClose }: {
  token: string; turfs: any[]; onSuccess: () => void; onClose: () => void;
}) {
  const { toast } = useToast();
  const [type, setType] = useState<OwnerEventType>("tournament");
  const [image, setImage] = useState("");
  const [form, setForm] = useState({
    title: "", description: "", date: "", time: "", venue: "", area: "",
    prize: "", entryFee: "", maxParticipants: "",
    turfId: "", maintenanceStartTime: "", maintenanceEndTime: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const turfObj = turfs.find(t => t.id === form.turfId);
      const payload: any = {
        title: form.title.trim(), description: form.description.trim() || undefined,
        date: form.date, time: form.time || undefined,
        venue: form.venue || turfObj?.name || undefined,
        area: form.area || turfObj?.area || undefined,
        type,
        turfId: form.turfId || undefined,
        turfName: turfObj?.name || undefined,
        image: image || undefined,
      };
      if (type !== "maintenance") {
        payload.prize = form.prize || undefined;
        payload.entryFee = Number(form.entryFee) || 0;
        payload.maxParticipants = Number(form.maxParticipants) || undefined;
      } else {
        payload.maintenanceStartTime = form.maintenanceStartTime;
        payload.maintenanceEndTime   = form.maintenanceEndTime;
      }
      const r = await fetch("/api/owner/events", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Failed to create");
      return data;
    },
    onSuccess: () => {
      toast({ title: type === "maintenance" ? "Maintenance block added!" : "Tournament created!" });
      onSuccess();
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.message }),
  });

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.title.trim()) errs.title = "Title is required";
    if (!form.date) errs.date = "Date is required";
    if (type === "maintenance" && !form.maintenanceStartTime) errs.maintenanceStartTime = "Start time required";
    if (type === "maintenance" && !form.maintenanceEndTime) errs.maintenanceEndTime = "End time required";
    setErrors(errs);
    return !Object.keys(errs).length;
  };

  const isMaint = type === "maintenance";

  return (
    <div className="space-y-4 pt-1">
      {/* Type selector */}
      <div>
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Type</p>
        <div className="grid grid-cols-2 gap-2">
          {(["tournament","maintenance"] as OwnerEventType[]).map(t => {
            const { label, icon: Icon, color } = TYPE_LABELS[t];
            return (
              <button type="button" key={t} onClick={() => setType(t)}
                className={cn("flex items-center justify-center gap-2 p-3 rounded-xl border-2 text-sm font-bold transition-all",
                  type === t ? `${color} border-current` : "border-border text-muted-foreground hover:border-primary/50")}>
                <Icon className="h-4 w-4" /> {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Cover photo (tournament only) */}
      {!isMaint && (
        <div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Cover Photo</p>
          <ImageUploadLight value={image} onChange={setImage} token={token} label="Upload Tournament Photo" />
        </div>
      )}

      {/* Title */}
      <div>
        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
          {isMaint ? "Reason" : "Tournament Name"} <span className="text-destructive">*</span>
        </label>
        <Input value={form.title} onChange={set("title")}
          placeholder={isMaint ? "e.g. Turf resurfacing" : "e.g. Summer Box Cricket Championship"}
          className={cn("h-11", errors.title && "border-destructive")} />
        {errors.title && <p className="text-xs text-destructive mt-1">{errors.title}</p>}
      </div>

      {/* Date + Time */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Date <span className="text-destructive">*</span></label>
          <Input type="date" value={form.date} onChange={set("date")} className={cn("h-11", errors.date && "border-destructive")} />
          {errors.date && <p className="text-xs text-destructive mt-1">{errors.date}</p>}
        </div>
        {isMaint ? (
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Start Time <span className="text-destructive">*</span></label>
            <Input type="time" value={form.maintenanceStartTime} onChange={set("maintenanceStartTime")} className={cn("h-11", errors.maintenanceStartTime && "border-destructive")} />
          </div>
        ) : (
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Start Time</label>
            <Input type="time" value={form.time} onChange={set("time")} className="h-11" />
          </div>
        )}
      </div>

      {isMaint && (
        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">End Time <span className="text-destructive">*</span></label>
          <Input type="time" value={form.maintenanceEndTime} onChange={set("maintenanceEndTime")} className={cn("h-11", errors.maintenanceEndTime && "border-destructive")} />
        </div>
      )}

      {/* Turf selector */}
      {turfs.length > 0 && (
        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Link to Your Turf (optional)</label>
          <select value={form.turfId} onChange={e => setForm(f => ({ ...f, turfId: e.target.value }))}
            className="w-full h-11 text-sm bg-background border border-input rounded-xl px-3 font-medium focus:outline-none focus:ring-2 focus:ring-primary">
            <option value="">— None —</option>
            {turfs.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      )}

      {!isMaint && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Venue</label>
              <Input value={form.venue} onChange={set("venue")} placeholder="Venue name" className="h-11" />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Area</label>
              <Input value={form.area} onChange={set("area")} placeholder="e.g. Gachibowli" className="h-11" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Prize Pool</label>
              <Input value={form.prize} onChange={set("prize")} placeholder="₹50,000" className="h-11" />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Entry (₹)</label>
              <Input type="number" value={form.entryFee} onChange={set("entryFee")} placeholder="0" className="h-11" />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Max Teams</label>
              <Input type="number" value={form.maxParticipants} onChange={set("maxParticipants")} placeholder="16" className="h-11" />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Description</label>
            <Textarea value={form.description} onChange={set("description")}
              placeholder="Rules, format, schedule, contact info…"
              className="resize-none text-sm" rows={3} />
          </div>
        </>
      )}

      <div className="flex gap-2 pt-1">
        <Button type="button" variant="outline" className="flex-1 h-11" onClick={onClose} disabled={isPending}>Cancel</Button>
        <Button className="flex-1 h-11 font-bold gap-2" disabled={isPending} onClick={() => { if (validate()) mutate(); }}>
          {isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {isPending ? "Creating…" : isMaint ? "Add Block" : "Create Tournament"}
        </Button>
      </div>
    </div>
  );
}

// ── Announcement Form ──────────────────────────────────────────────────────────
function AnnouncementDialog({ token, turfs, onClose }: { token: string; turfs: any[]; onClose: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ title: "", message: "", type: "general", turfId: "" });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const turfObj = turfs.find(t => t.id === form.turfId);
      const r = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: form.title.trim(), message: form.message.trim(), type: form.type, turfId: form.turfId || undefined, turfName: turfObj?.name }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Failed");
      return data;
    },
    onSuccess: () => { toast({ title: "Announcement sent to all users!" }); onClose(); },
    onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.message }),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-primary" /> Make an Announcement
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 text-xs text-primary">
            This announcement will be sent as a notification to all users on the platform.
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Type</label>
            <select value={form.type} onChange={set("type")}
              className="w-full h-11 text-sm bg-background border border-input rounded-xl px-3 font-medium focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="general">General</option>
              <option value="tournament">Tournament</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Title <span className="text-destructive">*</span></label>
            <Input value={form.title} onChange={set("title")} placeholder="Announcement headline" className="h-11" />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Message <span className="text-destructive">*</span></label>
            <Textarea value={form.message} onChange={set("message")} placeholder="What would you like to announce?" className="resize-none text-sm" rows={4} />
          </div>
          {turfs.length > 0 && (
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Link to Turf (optional)</label>
              <select value={form.turfId} onChange={set("turfId")}
                className="w-full h-11 text-sm bg-background border border-input rounded-xl px-3 font-medium focus:outline-none focus:ring-2 focus:ring-primary">
                <option value="">— None —</option>
                {turfs.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          )}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 h-11" onClick={onClose} disabled={isPending}>Cancel</Button>
            <Button className="flex-1 h-11 font-bold gap-2" disabled={isPending || !form.title.trim() || !form.message.trim()} onClick={() => mutate()}>
              {isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {isPending ? "Sending…" : "Send to All"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function OwnerEvents() {
  const { token } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [showAnnounce, setShowAnnounce] = useState(false);
  const [viewApplications, setViewApplications] = useState<{ id: string; title: string } | null>(null);
  const [tab, setTab] = useState<"all" | OwnerEventType>("all");

  const { data: turfs = [] } = useQuery<any[]>({
    queryKey: ["owner-turfs-list"],
    queryFn: () => fetch("/api/owner/turfs", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    enabled: !!token,
  });

  const { data: events = [], isLoading } = useQuery<any[]>({
    queryKey: ["owner-events"],
    queryFn: () => fetch("/api/owner/events", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    enabled: !!token,
    refetchInterval: 30_000,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/owner/events/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => { toast({ title: "Deleted" }); qc.invalidateQueries({ queryKey: ["owner-events"] }); },
    onError: () => toast({ variant: "destructive", title: "Failed to delete" }),
  });

  const displayEvents = events.filter(e => e.type !== "event");
  const filtered = tab === "all" ? displayEvents : displayEvents.filter(e => e.type === tab);

  const counts = {
    all: displayEvents.length,
    tournament: displayEvents.filter(e => e.type === "tournament").length,
    maintenance: displayEvents.filter(e => e.type === "maintenance").length,
  };

  return (
    <div className="p-4 space-y-5 pb-10">
      {/* Header */}
      <div className="pt-2 flex items-start justify-between">
        <div>
          <h2 className="text-xl font-display font-bold flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" /> My Tournaments
          </h2>
          <p className="text-muted-foreground text-sm mt-0.5">{displayEvents.length} created by you</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs font-bold" onClick={() => setShowAnnounce(true)}>
            <Megaphone className="h-3.5 w-3.5" /> Announce
          </Button>
          <Button size="sm" className="h-9 gap-1.5 text-xs font-bold" onClick={() => setShowCreate(true)}>
            <Plus className="h-3.5 w-3.5" /> Create
          </Button>
        </div>
      </div>

      {/* Tab filter */}
      <div className="flex gap-1.5 overflow-x-auto hide-scrollbar">
        {(["all","tournament","maintenance"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn(
              "whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border",
              tab === t ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground border-transparent"
            )}>
            {t === "all" ? "All" : TYPE_LABELS[t].label}
            <span className={cn("text-[9px] font-black px-1.5 rounded-full", tab === t ? "bg-white/20" : "bg-muted-foreground/20")}>
              {counts[t]}
            </span>
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-28 rounded-2xl bg-muted animate-pulse" />)}</div>
      ) : !filtered.length ? (
        <Card className="p-8 border-none shadow-sm text-center">
          <Trophy className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-20" />
          <p className="font-bold text-muted-foreground">No {tab === "all" ? "tournaments" : TYPE_LABELS[tab as OwnerEventType].label.toLowerCase() + "s"} yet</p>
          <p className="text-xs text-muted-foreground mt-1 mb-4">Create your first tournament to get started</p>
          <Button size="sm" className="gap-2 font-bold" onClick={() => setShowCreate(true)}>
            <Plus className="h-3.5 w-3.5" /> Create Tournament
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(ev => {
            const typeInfo = TYPE_LABELS[ev.type as OwnerEventType] ?? TYPE_LABELS.tournament;
            const TypeIcon = typeInfo.icon;
            const pct = ev.maxParticipants ? Math.min(100, Math.round((ev.currentParticipants / ev.maxParticipants) * 100)) : 0;
            const isMaint = ev.type === "maintenance";
            return (
              <Card key={ev.id} className="border-none shadow-sm overflow-hidden">
                {/* Cover image (tournament only) */}
                {!isMaint && ev.image && (
                  <div className="h-32 w-full relative overflow-hidden">
                    <img src={ev.image} alt={ev.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                  </div>
                )}
                {/* Type stripe */}
                <div className={cn("h-1", ev.type === "tournament" ? "bg-amber-500" : "bg-orange-500")} />
                <div className="p-4">
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn("inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border", typeInfo.color)}>
                          <TypeIcon className="h-3 w-3" /> {typeInfo.label}
                        </span>
                        {ev.featured && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                            <Star className="h-2.5 w-2.5 fill-current" /> Featured
                          </span>
                        )}
                        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full capitalize", STATUS_COLORS[ev.status] || "bg-muted text-muted-foreground")}>
                          {ev.status}
                        </span>
                      </div>
                      <p className="font-bold text-sm mt-1.5 leading-tight">{ev.title}</p>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="space-y-1 text-xs text-muted-foreground mb-3">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                      <span>{fmtDate(ev.date)}{ev.time ? ` · ${ev.time}` : ""}</span>
                      {isMaint && ev.maintenanceStartTime && (
                        <span className="text-orange-500 font-bold">· {ev.maintenanceStartTime}–{ev.maintenanceEndTime}</span>
                      )}
                    </div>
                    {(ev.venue || ev.area) && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                        <span className="truncate">{[ev.venue, ev.area].filter(Boolean).join(", ")}</span>
                      </div>
                    )}
                  </div>

                  {/* Stats bar */}
                  {!isMaint && ev.maxParticipants > 0 && (
                    <div className="mb-3">
                      <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                        <span>{ev.currentParticipants} registered</span>
                        <span>{pct}% full · max {ev.maxParticipants}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )}

                  {/* Prize + fee chips */}
                  {!isMaint && (ev.prize || ev.entryFee > 0) && (
                    <div className="flex gap-2 mb-3">
                      {ev.prize && (
                        <div className="bg-amber-500/10 rounded-xl px-3 py-1.5 text-center flex-1">
                          <p className="text-[9px] text-amber-500/70 font-black uppercase">Prize Pool</p>
                          <p className="text-xs font-black text-amber-500">{ev.prize}</p>
                        </div>
                      )}
                      {ev.entryFee > 0 && (
                        <div className="bg-muted rounded-xl px-3 py-1.5 text-center flex-1">
                          <p className="text-[9px] text-muted-foreground font-black uppercase">Entry Fee</p>
                          <p className="text-xs font-black">₹{ev.entryFee}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2 border-t border-border">
                    {!isMaint && (
                      <button
                        onClick={() => setViewApplications({ id: ev.id, title: ev.title })}
                        className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold text-primary hover:bg-primary/5 py-2 rounded-xl transition-colors border border-primary/20"
                      >
                        <Eye className="h-3.5 w-3.5" /> Applications
                        {ev.currentParticipants > 0 && (
                          <span className="bg-primary text-primary-foreground text-[9px] font-black px-1.5 rounded-full">{ev.currentParticipants}</span>
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => { if (confirm("Delete this tournament?")) deleteMutation.mutate(ev.id); }}
                      disabled={deleteMutation.isPending}
                      className="flex items-center gap-1.5 text-xs font-bold text-destructive hover:bg-destructive/5 px-3 py-2 rounded-xl transition-colors border border-destructive/20"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-primary" /> Create Tournament
            </DialogTitle>
          </DialogHeader>
          <CreateTournamentForm
            token={token!}
            turfs={turfs}
            onSuccess={() => { setShowCreate(false); qc.invalidateQueries({ queryKey: ["owner-events"] }); }}
            onClose={() => setShowCreate(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Announcement Dialog */}
      {showAnnounce && <AnnouncementDialog token={token!} turfs={turfs} onClose={() => setShowAnnounce(false)} />}

      {/* Applications Dialog */}
      {viewApplications && (
        <ApplicationsDialog
          eventId={viewApplications.id}
          eventTitle={viewApplications.title}
          token={token!}
          onClose={() => setViewApplications(null)}
        />
      )}
    </div>
  );
}
