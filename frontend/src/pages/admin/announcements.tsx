import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Megaphone, Plus, Pin, Trash2, RefreshCw, Send,
  Building2, Shield, Bell, Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const TYPE_COLORS: Record<string, string> = {
  general:     "bg-blue-500/10 text-blue-400 border-blue-500/20",
  event:       "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  tournament:  "bg-amber-500/10 text-amber-400 border-amber-500/20",
  maintenance: "bg-orange-500/10 text-orange-400 border-orange-500/20",
};

const ROLE_ICON: Record<string, any> = {
  admin: Shield,
  owner: Building2,
};

function fmtTime(s: string) {
  try { return format(new Date(s), "dd MMM yyyy · hh:mm a"); } catch { return s; }
}

function CreateAnnouncementDialog({ token, onClose, onCreated }: { token: string; onClose: () => void; onCreated: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ title: "", message: "", type: "general" });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: form.title.trim(), message: form.message.trim(), type: form.type }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Failed");
      return data;
    },
    onSuccess: () => { toast({ title: "Announcement sent to all users!" }); onCreated(); onClose(); },
    onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.message }),
  });

  const valid = form.title.trim().length > 0 && form.message.trim().length > 0;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-[#1a1d27] border-white/10 text-white sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-primary" /> New Announcement
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 text-xs text-primary/80">
            <Bell className="h-3.5 w-3.5 inline mr-1.5" />
            This will send a push notification to every user on the platform.
          </div>

          <div>
            <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-1.5 block">Type</label>
            <select value={form.type} onChange={set("type")}
              className="w-full h-11 text-sm bg-white/5 border border-white/10 rounded-xl px-3 text-white font-medium focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="general">General</option>
              <option value="event">Event</option>
              <option value="tournament">Tournament</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-1.5 block">Title <span className="text-destructive">*</span></label>
            <Input value={form.title} onChange={set("title")} placeholder="Announcement headline"
              className="h-11 bg-white/5 border-white/10 text-white placeholder:text-white/20" />
          </div>

          <div>
            <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-1.5 block">Message <span className="text-destructive">*</span></label>
            <Textarea value={form.message} onChange={set("message")} placeholder="Full message visible to users..."
              className="resize-none bg-white/5 border-white/10 text-white placeholder:text-white/20 text-sm" rows={5} />
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1 h-11 border-white/10 text-white hover:bg-white/5" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button className="flex-1 h-11 font-bold gap-2 bg-primary hover:bg-primary/90" disabled={isPending || !valid} onClick={() => mutate()}>
              {isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {isPending ? "Sending…" : "Send to All"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminAnnouncements() {
  const { token } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);

  const { data: announcements = [], isLoading } = useQuery<any[]>({
    queryKey: ["admin-announcements"],
    queryFn: () =>
      fetch("/api/admin/announcements", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    enabled: !!token,
  });

  const pinMutation = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/announcements/${id}/pin`, { method: "PUT", headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error("Failed");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-announcements"] }),
    onError: () => toast({ variant: "destructive", title: "Failed to pin" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/announcements/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error("Failed");
    },
    onSuccess: () => { toast({ title: "Deleted" }); qc.invalidateQueries({ queryKey: ["admin-announcements"] }); },
    onError: () => toast({ variant: "destructive", title: "Failed to delete" }),
  });

  const pinned   = announcements.filter(a => a.pinned);
  const unpinned = announcements.filter(a => !a.pinned);

  return (
    <div className="p-4 md:p-8 text-white">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-black tracking-tight flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-primary" /> Announcements
          </h2>
          <p className="text-white/40 text-sm mt-0.5">
            {announcements.length} total · {pinned.length} pinned
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2 font-bold bg-primary hover:bg-primary/90 rounded-xl h-10 px-5">
          <Plus className="h-4 w-4" /> New Announcement
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 rounded-2xl bg-white/5 animate-pulse" />)}
        </div>
      ) : !announcements.length ? (
        <div className="text-center py-20 text-white/30">
          <Megaphone className="h-16 w-16 mx-auto mb-4 opacity-20" />
          <p className="font-bold text-lg">No announcements yet</p>
          <p className="text-sm mt-1 mb-5">Send your first platform-wide announcement</p>
          <Button onClick={() => setShowCreate(true)} className="font-bold gap-2 bg-primary hover:bg-primary/90">
            <Plus className="h-4 w-4" /> New Announcement
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {pinned.length > 0 && (
            <div>
              <p className="text-xs font-black text-white/30 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Pin className="h-3 w-3" /> Pinned
              </p>
              <div className="space-y-3">
                {pinned.map(a => <AnnouncementCard key={a.id} ann={a} token={token!} onPin={() => pinMutation.mutate(a.id)} onDelete={() => { if (confirm("Delete this announcement?")) deleteMutation.mutate(a.id); }} />)}
              </div>
            </div>
          )}
          {unpinned.length > 0 && (
            <div>
              {pinned.length > 0 && <p className="text-xs font-black text-white/30 uppercase tracking-widest mb-3">Recent</p>}
              <div className="space-y-3">
                {unpinned.map(a => <AnnouncementCard key={a.id} ann={a} token={token!} onPin={() => pinMutation.mutate(a.id)} onDelete={() => { if (confirm("Delete this announcement?")) deleteMutation.mutate(a.id); }} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {showCreate && (
        <CreateAnnouncementDialog
          token={token!}
          onClose={() => setShowCreate(false)}
          onCreated={() => qc.invalidateQueries({ queryKey: ["admin-announcements"] })}
        />
      )}
    </div>
  );
}

function AnnouncementCard({ ann, token, onPin, onDelete }: { ann: any; token: string; onPin: () => void; onDelete: () => void }) {
  const RoleIcon = ROLE_ICON[ann.createdByRole] || Shield;
  return (
    <div className={cn("bg-white/5 border rounded-2xl p-4", ann.pinned ? "border-primary/30 bg-primary/5" : "border-white/10")}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {ann.pinned && (
              <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
                <Pin className="h-2.5 w-2.5" /> Pinned
              </span>
            )}
            <span className={cn("text-[9px] font-black uppercase px-2 py-0.5 rounded-full border", TYPE_COLORS[ann.type] || TYPE_COLORS.general)}>
              {ann.type}
            </span>
            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-white/40">
              <RoleIcon className="h-3 w-3" /> {ann.createdByName || ann.createdByRole}
            </span>
          </div>
          <h3 className="font-bold text-white text-sm leading-tight">{ann.title}</h3>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <button onClick={onPin} title={ann.pinned ? "Unpin" : "Pin"}
            className={cn("h-8 w-8 rounded-xl flex items-center justify-center transition-colors",
              ann.pinned ? "bg-primary/20 text-primary" : "bg-white/5 text-white/30 hover:text-white hover:bg-white/10")}>
            <Pin className="h-3.5 w-3.5" />
          </button>
          <button onClick={onDelete} className="h-8 w-8 rounded-xl flex items-center justify-center bg-white/5 text-red-400 hover:bg-red-500/10 transition-colors">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <p className="text-sm text-white/60 leading-relaxed">{ann.message}</p>
      {ann.turfName && <p className="text-xs text-primary/60 mt-2">📍 {ann.turfName}</p>}
      <div className="flex items-center gap-1 mt-3 text-[10px] text-white/25">
        <Clock className="h-3 w-3" /> {fmtTime(ann.createdAt)}
      </div>
    </div>
  );
}
