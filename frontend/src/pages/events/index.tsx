import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import {
  Calendar, MapPin, Trophy, Users, Clock, Building2,
  Megaphone, Pin, Star, CheckCircle2, RefreshCw, Swords,
  Zap, ChevronRight, Lock, BarChart2
} from "lucide-react";
import { format, parseISO, isPast } from "date-fns";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";

// ─── Types ────────────────────────────────────────────────────────────────────
type EventType = "tournament" | "event";
type Tab = "tournaments" | "events" | "all";

interface AnyEvent {
  id: string;
  title: string;
  description?: string;
  date: string;
  time?: string;
  venue?: string;
  area?: string;
  image?: string;
  prize?: string;
  entryFee?: number;
  maxParticipants?: number;
  currentParticipants: number;
  featured: boolean;
  status: string;
  type: EventType;
  createdByRole?: string;
  createdByName?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtDate(d: string) {
  try { return format(parseISO(d), "MMM d, yyyy"); } catch { return d; }
}

function isOver(ev: AnyEvent) {
  try { return isPast(parseISO(ev.date)); } catch { return false; }
}

function fullPct(ev: AnyEvent) {
  if (!ev.maxParticipants) return 0;
  return Math.min(100, Math.round((ev.currentParticipants / ev.maxParticipants) * 100));
}

// ─── Leaderboard Dialog ───────────────────────────────────────────────────────
function LeaderboardDialog({ event, onClose }: { event: AnyEvent; onClose: () => void }) {
  const { data: standings = [], isLoading } = useQuery<any[]>({
    queryKey: ["standings", event.id],
    queryFn: () => fetch(`/api/events/${event.id}/standings`).then(r => r.json()),
  });

  const medalEmoji = (pos: number) => pos === 1 ? "🥇" : pos === 2 ? "🥈" : pos === 3 ? "🥉" : null;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <BarChart2 className="h-4 w-4 text-amber-500" /> Standings
          </DialogTitle>
          <p className="text-xs text-muted-foreground">{event.title}</p>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-12 rounded-xl bg-muted animate-pulse" />)}</div>
        ) : standings.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center">
            <BarChart2 className="h-10 w-10 text-muted-foreground opacity-20 mb-3" />
            <p className="font-bold text-muted-foreground text-sm">Standings not published yet</p>
            <p className="text-xs text-muted-foreground mt-1">Check back after matches begin</p>
          </div>
        ) : (
          <div className="space-y-2">
            {standings.map((s: any) => {
              const medal = medalEmoji(s.position);
              const gd = s.goalsFor - s.goalsAgainst;
              return (
                <div key={s.id} className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border transition-colors",
                  s.position === 1
                    ? "bg-amber-500/5 border-amber-500/20"
                    : s.position === 2
                      ? "bg-slate-500/5 border-slate-500/20"
                      : s.position === 3
                        ? "bg-orange-500/5 border-orange-500/10"
                        : "bg-muted/30 border-transparent"
                )}>
                  {/* Rank */}
                  <div className="w-8 text-center flex-shrink-0">
                    {medal
                      ? <span className="text-lg">{medal}</span>
                      : <span className="text-sm font-black text-muted-foreground">#{s.position}</span>}
                  </div>

                  {/* Team */}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">{s.teamName}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {s.played}P · {s.won}W · {s.lost}L{s.drawn > 0 ? ` · ${s.drawn}D` : ""}
                      {(s.goalsFor > 0 || s.goalsAgainst > 0) ? ` · GD ${gd > 0 ? "+" : ""}${gd}` : ""}
                    </p>
                  </div>

                  {/* Points */}
                  <div className="flex-shrink-0 text-right">
                    <p className={cn(
                      "text-lg font-black",
                      s.position === 1 ? "text-amber-500" : "text-primary"
                    )}>{s.points}</p>
                    <p className="text-[9px] text-muted-foreground uppercase font-bold">pts</p>
                  </div>
                </div>
              );
            })}

            {/* Column legend */}
            <p className="text-[10px] text-muted-foreground text-center pt-1">
              P=Played · W=Won · L=Lost · D=Drawn · GD=Goal Diff
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Registration Dialog ──────────────────────────────────────────────────────
function RegisterDialog({
  event,
  onClose,
  alreadyJoined,
}: {
  event: AnyEvent;
  onClose: () => void;
  alreadyJoined: boolean;
}) {
  const { token, user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const isTournament = event.type === "tournament";

  const [form, setForm] = useState({
    name: user?.name ?? "",
    phone: (user as any)?.phone ?? "",
    teamName: "",
  });

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }));

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/events/${event.id}/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim(),
          teamName: isTournament ? form.teamName.trim() : undefined,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Failed to register");
      return data;
    },
    onSuccess: () => {
      toast({ title: "Registered!", description: `You're in for ${event.title}` });
      qc.invalidateQueries({ queryKey: ["public-events"] });
      qc.invalidateQueries({ queryKey: ["event-detail", event.id] });
      onClose();
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.message }),
  });

  const validate = () => {
    if (!form.name.trim()) { toast({ variant: "destructive", title: "Enter your name" }); return false; }
    if (!form.phone.trim()) { toast({ variant: "destructive", title: "Enter your phone number" }); return false; }
    if (isTournament && !form.teamName.trim()) { toast({ variant: "destructive", title: "Enter your team name" }); return false; }
    return true;
  };

  const isFull = !!(event.maxParticipants && event.currentParticipants >= event.maxParticipants);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            {isTournament
              ? <Trophy className="h-4 w-4 text-amber-500" />
              : <Zap className="h-4 w-4 text-blue-500" />}
            {alreadyJoined ? "Already Registered" : `Register — ${event.title}`}
          </DialogTitle>
        </DialogHeader>

        {alreadyJoined ? (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <div className="h-14 w-14 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-7 w-7 text-green-500" />
            </div>
            <div>
              <p className="font-bold text-sm">You're already registered!</p>
              <p className="text-xs text-muted-foreground mt-1">
                We'll see you at {event.venue || "the venue"} on {fmtDate(event.date)}.
              </p>
            </div>
            <Button className="w-full" variant="outline" onClick={onClose}>Close</Button>
          </div>
        ) : !isAuthenticated ? (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Lock className="h-7 w-7 text-primary" />
            </div>
            <div>
              <p className="font-bold text-sm">Login required</p>
              <p className="text-xs text-muted-foreground mt-1">Please sign in to register for this {event.type}.</p>
            </div>
            <Button className="w-full" onClick={() => { onClose(); setLocation("/auth"); }}>
              Sign In / Register
            </Button>
          </div>
        ) : isFull ? (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <div className="h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center">
              <Users className="h-7 w-7 text-destructive" />
            </div>
            <div>
              <p className="font-bold text-sm">Registrations Full</p>
              <p className="text-xs text-muted-foreground mt-1">All spots have been taken for this {event.type}.</p>
            </div>
            <Button className="w-full" variant="outline" onClick={onClose}>Close</Button>
          </div>
        ) : (
          <div className="space-y-4 pt-1">
            {/* Event summary */}
            <div className="bg-muted/40 rounded-xl p-3 text-xs text-muted-foreground space-y-1">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-primary" />
                <span>{fmtDate(event.date)}{event.time ? ` · ${event.time}` : ""}</span>
              </div>
              {event.venue && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-primary" />
                  <span>{[event.venue, event.area].filter(Boolean).join(", ")}</span>
                </div>
              )}
              {event.entryFee ? (
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-foreground">Entry Fee: ₹{event.entryFee}</span>
                </div>
              ) : null}
            </div>

            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Full Name <span className="text-destructive">*</span>
              </label>
              <Input value={form.name} onChange={set("name")} placeholder="Your name" className="h-11" />
            </div>

            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Phone Number <span className="text-destructive">*</span>
              </label>
              <Input
                value={form.phone}
                onChange={set("phone")}
                placeholder="10-digit mobile number"
                type="tel"
                inputMode="numeric"
                className="h-11"
              />
            </div>

            {isTournament && (
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  Team Name <span className="text-destructive">*</span>
                </label>
                <Input value={form.teamName} onChange={set("teamName")} placeholder="e.g. Thunder Strikers" className="h-11" />
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1 h-11" onClick={onClose} disabled={isPending}>
                Cancel
              </Button>
              <Button
                className="flex-1 h-11 font-bold gap-2"
                disabled={isPending}
                onClick={() => { if (validate()) mutate(); }}
              >
                {isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {isPending ? "Registering…" : "Confirm Registration"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Event Card ───────────────────────────────────────────────────────────────
function EventCard({
  ev,
  myUserId,
  onRegister,
  onLeaderboard,
}: {
  ev: AnyEvent;
  myUserId?: string;
  onRegister: (ev: AnyEvent) => void;
  onLeaderboard: (ev: AnyEvent) => void;
}) {
  const isTournament = ev.type === "tournament";
  const pct = fullPct(ev);
  const over = isOver(ev);

  return (
    <Card className="border-none shadow-sm overflow-hidden">
      {/* Cover image */}
      {ev.image && (
        <div className="relative h-36 w-full overflow-hidden">
          <img src={ev.image} alt={ev.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
          <div className="absolute bottom-3 left-3 right-3">
            <h3 className="font-bold text-white text-base leading-tight line-clamp-2">{ev.title}</h3>
          </div>
          {ev.featured && (
            <div className="absolute top-2.5 right-2.5 bg-amber-500 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
              <Star className="h-2.5 w-2.5 fill-current" /> Featured
            </div>
          )}
        </div>
      )}

      {/* Type stripe */}
      <div className={cn("h-1", isTournament ? "bg-amber-500" : "bg-blue-500")} />

      <div className="p-4">
        {/* Title row (if no image) */}
        {!ev.image && (
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <span className={cn(
                  "inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border",
                  isTournament
                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                    : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                )}>
                  {isTournament ? <Trophy className="h-2.5 w-2.5" /> : <Zap className="h-2.5 w-2.5" />}
                  {isTournament ? "Tournament" : "Event"}
                </span>
                {ev.featured && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                    <Star className="h-2.5 w-2.5 fill-current" /> Featured
                  </span>
                )}
              </div>
              <h3 className="font-bold text-sm leading-snug">{ev.title}</h3>
            </div>
          </div>
        )}

        {/* With image: show type badge */}
        {ev.image && (
          <div className="flex items-center gap-1.5 mb-2">
            <span className={cn(
              "inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border",
              isTournament
                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
            )}>
              {isTournament ? <Trophy className="h-2.5 w-2.5" /> : <Zap className="h-2.5 w-2.5" />}
              {isTournament ? "Tournament" : "Event"}
            </span>
            <span className={cn(
              "text-[10px] font-bold px-2 py-0.5 rounded-full capitalize",
              ev.status === "open" ? "bg-green-500/10 text-green-600" :
              ev.status === "upcoming" ? "bg-blue-500/10 text-blue-600" :
              "bg-muted text-muted-foreground"
            )}>
              {ev.status}
            </span>
          </div>
        )}

        {/* Meta */}
        <div className="space-y-1 text-xs text-muted-foreground mb-3">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-primary flex-shrink-0" />
            <span>{fmtDate(ev.date)}{ev.time ? ` · ${ev.time}` : ""}</span>
          </div>
          {(ev.venue || ev.area) && (
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-primary flex-shrink-0" />
              <span className="truncate">{[ev.venue, ev.area].filter(Boolean).join(", ")}</span>
            </div>
          )}
          {ev.createdByRole === "owner" && ev.createdByName && (
            <div className="flex items-center gap-1.5 text-primary/60">
              <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
              <span>By {ev.createdByName}</span>
            </div>
          )}
        </div>

        {/* Prize + fee */}
        {(ev.prize || (ev.entryFee && ev.entryFee > 0)) && (
          <div className="flex gap-2 mb-3">
            {ev.prize && (
              <div className="bg-amber-500/10 rounded-xl px-3 py-2 text-center flex-1">
                <p className="text-[9px] text-amber-500/70 font-black uppercase tracking-wider">Prize Pool</p>
                <p className="text-xs font-black text-amber-500">{ev.prize}</p>
              </div>
            )}
            {ev.entryFee && ev.entryFee > 0 ? (
              <div className="bg-muted rounded-xl px-3 py-2 text-center flex-1">
                <p className="text-[9px] text-muted-foreground font-black uppercase tracking-wider">Entry Fee</p>
                <p className="text-xs font-black">₹{ev.entryFee}</p>
              </div>
            ) : null}
          </div>
        )}

        {/* Participants bar */}
        {ev.maxParticipants && ev.maxParticipants > 0 ? (
          <div className="mb-3">
            <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
              <span className="font-medium">
                <Users className="h-3 w-3 inline mr-0.5" />
                {ev.currentParticipants} registered
              </span>
              <span>{pct}% · max {ev.maxParticipants}</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all", pct >= 90 ? "bg-red-500" : pct >= 60 ? "bg-amber-500" : "bg-primary")}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
            <Users className="h-3.5 w-3.5" />
            <span>{ev.currentParticipants} registered</span>
          </div>
        )}

        {/* CTA */}
        {over ? (
          <div className="flex gap-2">
            <div className="flex-1 text-center text-xs text-muted-foreground bg-muted/40 rounded-xl py-2.5 font-medium">
              Ended
            </div>
            {isTournament && (
              <Button variant="outline" size="sm" className="h-10 px-3 gap-1.5 font-bold text-amber-600 border-amber-500/30 hover:bg-amber-500/5" onClick={() => onLeaderboard(ev)}>
                <BarChart2 className="h-4 w-4" /> Standings
              </Button>
            )}
          </div>
        ) : (
          <div className="flex gap-2">
            <Button
              className="flex-1 h-10 font-bold gap-2"
              onClick={() => onRegister(ev)}
              variant={pct >= 100 ? "outline" : "default"}
            >
              {pct >= 100
                ? <><Users className="h-4 w-4" /> Full</>
                : isTournament
                  ? <><Swords className="h-4 w-4" /> Register Team</>
                  : <><Zap className="h-4 w-4" /> Register Now</>}
            </Button>
            {isTournament && (
              <Button variant="outline" size="sm" className="h-10 px-3 gap-1.5 font-bold text-amber-600 border-amber-500/30 hover:bg-amber-500/5" onClick={() => onLeaderboard(ev)}>
                <BarChart2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

// ─── Featured Banner ──────────────────────────────────────────────────────────
function FeaturedBanner({ ev, onRegister }: { ev: AnyEvent; onRegister: (ev: AnyEvent) => void }) {
  const pct = fullPct(ev);
  const over = isOver(ev);

  return (
    <div className="relative rounded-2xl overflow-hidden shadow-lg">
      {/* Background */}
      <div className={cn(
        "h-52 w-full relative",
        ev.image ? "" : "bg-gradient-to-br from-amber-600 to-orange-700"
      )}>
        {ev.image && (
          <img src={ev.image} alt={ev.title} className="w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          <span className="bg-amber-500 text-white text-[9px] font-black uppercase px-2 py-1 rounded-full flex items-center gap-1">
            <Star className="h-2.5 w-2.5 fill-current" /> Featured
          </span>
          <span className="bg-white/20 backdrop-blur-sm text-white text-[9px] font-black uppercase px-2 py-1 rounded-full">
            {ev.type === "tournament" ? "Tournament" : "Event"}
          </span>
        </div>

        {/* Content */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h2 className="text-white font-bold text-xl leading-tight mb-1">{ev.title}</h2>
          <div className="flex items-center gap-3 text-white/80 text-xs mb-3">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />{fmtDate(ev.date)}
              {ev.time ? ` · ${ev.time}` : ""}
            </span>
            {ev.venue && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                <span className="truncate max-w-[120px]">{ev.venue}</span>
              </span>
            )}
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-2">
            {ev.prize && (
              <div className="bg-amber-500/20 backdrop-blur-sm border border-amber-500/30 rounded-xl px-3 py-1.5 text-center">
                <p className="text-[9px] text-amber-300 font-black uppercase">Prize</p>
                <p className="text-xs font-black text-white">{ev.prize}</p>
              </div>
            )}
            {ev.entryFee && ev.entryFee > 0 ? (
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-3 py-1.5 text-center">
                <p className="text-[9px] text-white/60 font-black uppercase">Entry</p>
                <p className="text-xs font-black text-white">₹{ev.entryFee}</p>
              </div>
            ) : null}
            {ev.maxParticipants ? (
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-3 py-1.5 text-center">
                <p className="text-[9px] text-white/60 font-black uppercase">Spots</p>
                <p className="text-xs font-black text-white">{ev.maxParticipants - ev.currentParticipants} left</p>
              </div>
            ) : null}
            {!over && (
              <Button
                size="sm"
                className="ml-auto h-9 px-4 font-bold gap-1.5 bg-white text-black hover:bg-white/90"
                onClick={() => onRegister(ev)}
              >
                {ev.type === "tournament" ? <><Swords className="h-3.5 w-3.5" /> Register</> : <><Zap className="h-3.5 w-3.5" /> Join</>}
              </Button>
            )}
          </div>

          {/* Fill bar */}
          {ev.maxParticipants && ev.maxParticipants > 0 ? (
            <div className="mt-2.5">
              <div className="h-1 bg-white/20 rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full", pct >= 90 ? "bg-red-400" : "bg-amber-400")}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-[9px] text-white/50 mt-0.5">{ev.currentParticipants}/{ev.maxParticipants} spots filled</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Events() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("tournaments");
  const [registerTarget, setRegisterTarget] = useState<AnyEvent | null>(null);
  const [leaderboardTarget, setLeaderboardTarget] = useState<AnyEvent | null>(null);

  const { data: events = [], isLoading } = useQuery<AnyEvent[]>({
    queryKey: ["public-events"],
    queryFn: () => fetch("/api/events").then(r => r.json()),
    refetchInterval: 30_000,
  });

  const { data: announcements = [] } = useQuery<any[]>({
    queryKey: ["announcements"],
    queryFn: () => fetch("/api/announcements").then(r => r.json()),
  });

  // For checking joined — fetch detail when user clicks register
  const { data: eventDetail } = useQuery<any>({
    queryKey: ["event-detail", registerTarget?.id],
    queryFn: () => fetch(`/api/events/${registerTarget!.id}`).then(r => r.json()),
    enabled: !!registerTarget,
  });

  const alreadyJoined = !!(
    user &&
    eventDetail?.participants?.some((p: any) => p.userId === (user as any).id)
  );

  const pinnedAnnouncements = announcements.filter((a: any) => a.pinned).slice(0, 2);

  const tournaments = events.filter(e => e.type === "tournament");
  const eventsOnly  = events.filter(e => e.type === "event");

  const featured = events.filter(e => e.featured);

  const tabEvents =
    tab === "tournaments" ? tournaments :
    tab === "events" ? eventsOnly :
    events;

  const counts = {
    tournaments: tournaments.length,
    events: eventsOnly.length,
    all: events.length,
  };

  const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: "tournaments", label: "Tournaments", icon: Trophy },
    { key: "events",      label: "Events",      icon: Zap },
    { key: "all",         label: "All",         icon: ChevronRight },
  ];

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Tournaments & Events" showLocation={false} />

      <main className="flex-1 pb-6">
        {isLoading ? (
          <div className="p-4 space-y-4">
            <div className="h-52 rounded-2xl bg-muted animate-pulse" />
            <div className="flex gap-2">
              {[1,2,3].map(i => <div key={i} className="h-9 flex-1 rounded-full bg-muted animate-pulse" />)}
            </div>
            {[1,2].map(i => <div key={i} className="h-48 rounded-2xl bg-muted animate-pulse" />)}
          </div>
        ) : (
          <>
            {/* Pinned announcements */}
            {pinnedAnnouncements.length > 0 && (
              <div className="px-4 pt-4 pb-0 space-y-2">
                {pinnedAnnouncements.map((ann: any) => (
                  <div key={ann.id} className="flex items-start gap-3 bg-primary/5 border border-primary/20 rounded-2xl p-3.5">
                    <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Megaphone className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Pin className="h-3 w-3 text-primary" />
                        <p className="text-xs font-black text-primary uppercase tracking-wider">
                          Pinned · {ann.createdByRole === "admin" ? "Admin" : ann.createdByName}
                        </p>
                      </div>
                      <p className="font-bold text-sm">{ann.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{ann.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Featured banner */}
            {featured.length > 0 && (
              <div className="px-4 pt-4">
                <FeaturedBanner
                  ev={featured[0]}
                  onRegister={setRegisterTarget}
                />
              </div>
            )}

            {/* Tabs */}
            <div className="px-4 pt-4 pb-1 flex gap-2">
              {TABS.map(t => {
                const Icon = t.icon;
                const active = tab === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-full text-xs font-bold transition-all border",
                      active
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-muted/60 text-muted-foreground border-transparent hover:border-border"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {t.label}
                    <span className={cn(
                      "text-[9px] font-black px-1.5 py-0.5 rounded-full leading-none",
                      active ? "bg-white/20 text-white" : "bg-muted-foreground/20"
                    )}>
                      {counts[t.key]}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Tab section label */}
            <div className="px-4 pb-2 pt-3">
              <h2 className="font-bold text-base flex items-center gap-2">
                {tab === "tournaments"
                  ? <><Trophy className="h-4 w-4 text-amber-500" /> Tournaments</>
                  : tab === "events"
                    ? <><Zap className="h-4 w-4 text-blue-500" /> Events</>
                    : <>All Upcoming</>}
              </h2>
              {tab === "tournaments" && (
                <p className="text-xs text-muted-foreground mt-0.5">Register your team and compete</p>
              )}
              {tab === "events" && (
                <p className="text-xs text-muted-foreground mt-0.5">Join open events and activities</p>
              )}
            </div>

            {/* Event list */}
            <div className="px-4 space-y-4">
              {tabEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 text-center">
                  {tab === "tournaments"
                    ? <Trophy className="h-12 w-12 text-muted-foreground opacity-20 mb-3" />
                    : <Zap className="h-12 w-12 text-muted-foreground opacity-20 mb-3" />}
                  <p className="font-bold text-muted-foreground">
                    No {tab === "tournaments" ? "tournaments" : tab === "events" ? "events" : "upcoming activities"} right now
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Check back soon for new listings</p>
                </div>
              ) : (
                tabEvents.map(ev => (
                  <EventCard
                    key={ev.id}
                    ev={ev}
                    myUserId={(user as any)?.id}
                    onRegister={setRegisterTarget}
                    onLeaderboard={setLeaderboardTarget}
                  />
                ))
              )}
            </div>
          </>
        )}
      </main>

      {/* Registration Dialog */}
      {registerTarget && (
        <RegisterDialog
          event={registerTarget}
          alreadyJoined={alreadyJoined}
          onClose={() => setRegisterTarget(null)}
        />
      )}

      {/* Leaderboard Dialog */}
      {leaderboardTarget && (
        <LeaderboardDialog
          event={leaderboardTarget}
          onClose={() => setLeaderboardTarget(null)}
        />
      )}
    </div>
  );
}
