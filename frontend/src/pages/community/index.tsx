import { useState, useEffect, useMemo } from "react";
import { Link } from "wouter";
import { format, parseISO } from "date-fns";
import { useListPosts, useCreatePost } from "@workspace/api-client-react";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import {
  MapPin, Calendar, Clock, Users, Plus, MessageSquare,
  Radio, ChevronRight, Zap, Trophy, UserPlus, Swords, Bell, Search, Navigation,
  ChevronDown, ChevronUp, User, Activity,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getListPostsQueryKey } from "@workspace/api-client-react";
import { useLiveScores, ballColor } from "@/hooks/use-live-scores";
import { cn } from "@/lib/utils";

const postSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().optional(),
  lookingFor: z.enum(["team", "individual"]),
  teamName: z.string().optional(),
  playersNeeded: z.coerce.number().min(1),
  matchDate: z.string().min(1),
  matchTime: z.string().min(1),
  turfName: z.string().optional(),
  area: z.string().min(2, "Area is required"),
});

const scoreSchema = z.object({
  teamA: z.string().min(1, "Team A name required"),
  teamB: z.string().min(1, "Team B name required"),
  venue: z.string().min(1, "Venue / area required"),
  maxOvers: z.coerce.number().min(1).max(50),
  battingTeam: z.enum(["A", "B"]),
});

type PostForm = z.infer<typeof postSchema>;
type ScoreForm = z.infer<typeof scoreSchema>;
type Tab = "matches" | "scores";

function LiveMatchCard({ match }: { match: any }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const striker = (match.teamAPlayers || []).concat(match.teamBPlayers || []).find((p: any) => p.name === match.striker);
  const nonStriker = (match.teamAPlayers || []).concat(match.teamBPlayers || []).find((p: any) => p.name === match.nonStriker);
  const currentBowler = (match.bowlers || []).find((b: any) => b.name === match.currentBowler);

  const getEconomy = (b: any) => {
    if (!b || b.legalBalls === 0) return "0.00";
    return (b.runs / (b.legalBalls / 6)).toFixed(2);
  };

  const groupBallsIntoOvers = (balls: any[]) => {
    const overs: any[][] = [];
    let currentOver: any[] = [];
    let legalBallsInOver = 0;

    (balls || []).forEach(ball => {
      currentOver.push(ball);
      if (ball.result !== "NB" && ball.result !== "WD") {
        legalBallsInOver++;
      }
      if (legalBallsInOver === 6) {
        overs.push(currentOver);
        currentOver = [];
        legalBallsInOver = 0;
      }
    });

    if (currentOver.length > 0) {
      overs.push(currentOver);
    }
    return overs;
  };

  const oversData = groupBallsIntoOvers(match.balls);
  const [selectedOverIdx, setSelectedOverIdx] = useState<number | null>(null);
  
  // Default to the current (last) over
  const currentOverIdx = oversData.length > 0 ? oversData.length - 1 : 0;
  const activeIdx = selectedOverIdx !== null ? selectedOverIdx : currentOverIdx;
  const activeOver = oversData[activeIdx] || [];

  const getOverStats = (over: any[]) => {
    let runs = 0;
    let wickets = 0;
    let bowler = over[0]?.bowler || over[0]?.bowlerName || "Unknown";
    over.forEach(b => {
      if (b.result === "W") wickets++;
      else if (b.result === "NB" || b.result === "WD") runs += 1;
      else runs += parseInt(b.result, 10) || 0;
    });
    return { runs, wickets, bowler };
  };

  const overStats = getOverStats(activeOver);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-red-200/60 dark:border-red-900/60 bg-gradient-to-br from-red-600 to-rose-700 text-white shadow-lg shadow-red-500/10">
      {/* Venue + badge */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-white/10">
        <p className="text-[11px] font-bold uppercase tracking-wider opacity-70 truncate flex-1">{match.turfName}</p>
        <Badge className="bg-white/20 border-0 text-white text-[10px] font-bold">
          <Radio className="h-2.5 w-2.5 mr-1 animate-pulse" /> LIVE
        </Badge>
      </div>

      {/* Scores */}
      <div className="flex items-center px-4 py-4 gap-3">
        <div className={cn("flex-1 text-center transition-opacity", match.battingTeam === "A" ? "opacity-100" : "opacity-55")}>
          <p className="text-[12px] font-bold truncate mb-1">{match.teamA}</p>
          <p className="text-3xl font-bold leading-none tabular-nums">
            {match.scoreA}<span className="text-base font-normal opacity-80">/{match.wicketsA}</span>
          </p>
          {match.battingTeam === "A" && (
            <p className="text-[9px] font-bold text-green-300 mt-1 uppercase tracking-wide">● batting</p>
          )}
        </div>
        <div className="flex flex-col items-center px-3">
          <span className="text-xs opacity-40 font-bold">vs</span>
          <span className="text-[11px] opacity-60 mt-1 font-medium">{match.overs}</span>
        </div>
        <div className={cn("flex-1 text-center transition-opacity", match.battingTeam === "B" ? "opacity-100" : "opacity-55")}>
          <p className="text-[12px] font-bold truncate mb-1">{match.teamB}</p>
          <p className="text-3xl font-bold leading-none tabular-nums">
            {match.scoreB}<span className="text-base font-normal opacity-80">/{match.wicketsB}</span>
          </p>
          {match.battingTeam === "B" && (
            <p className="text-[9px] font-bold text-green-300 mt-1 uppercase tracking-wide">● batting</p>
          )}
        </div>
      </div>

      {/* Real-time Player Stats (Strike/Bowling) */}
      <div className="mx-4 mb-4 p-3 bg-white/10 rounded-xl grid grid-cols-2 gap-4 border border-white/5">
        <div className="space-y-1.5">
          <p className="text-[9px] font-bold uppercase opacity-60 flex items-center gap-1"><Activity className="h-2 w-2" /> Batsmen</p>
          <div className="space-y-1">
            {striker ? (
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-bold truncate max-w-[60px]">{striker.name}*</span>
                <span className="text-[11px] font-bold tabular-nums">{striker.runs}({striker.balls})</span>
              </div>
            ) : match.striker && (
               <div className="flex justify-between items-center">
                <span className="text-[11px] font-bold truncate">{match.striker}*</span>
                <span className="text-[11px] font-bold">0(0)</span>
              </div>
            )}
            {nonStriker ? (
              <div className="flex justify-between items-center opacity-70">
                <span className="text-[10px] font-medium truncate max-w-[60px]">{nonStriker.name}</span>
                <span className="text-[10px] tabular-nums">{nonStriker.runs}({nonStriker.balls})</span>
              </div>
            ) : match.nonStriker && (
              <div className="flex justify-between items-center opacity-70">
                <span className="text-[10px] font-medium truncate">{match.nonStriker}</span>
                <span className="text-[10px]">0(0)</span>
              </div>
            )}
          </div>
        </div>
        <div className="space-y-1.5 border-l border-white/10 pl-4">
          <p className="text-[9px] font-bold uppercase opacity-60 flex items-center gap-1"><User className="h-2 w-2" /> Bowling</p>
          {currentBowler ? (
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-bold truncate max-w-[60px]">{currentBowler.name}</span>
                <span className="text-[11px] font-bold tabular-nums">{currentBowler.wickets}-{currentBowler.runs}</span>
              </div>
              <div className="flex justify-between items-center opacity-70">
                <span className="text-[10px]">Eco</span>
                <span className="text-[10px] tabular-nums">{getEconomy(currentBowler)}</span>
              </div>
            </div>
          ) : match.currentBowler && (
             <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-bold truncate">{match.currentBowler}</span>
                <span className="text-[11px] font-bold">0-0</span>
              </div>
              <div className="flex justify-between items-center opacity-70">
                <span className="text-[10px]">Eco</span>
                <span className="text-[10px]">0.00</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Interactive Over History */}
      {oversData.length > 0 && (
        <div className="px-4 pb-4 space-y-3">
          {/* Over Selection Tabs */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {oversData.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedOverIdx(idx)}
                className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-bold transition-all shrink-0",
                  activeIdx === idx ? "bg-white text-red-600 shadow-md" : "bg-white/10 text-white hover:bg-white/20"
                )}
              >
                Over {idx + 1}
              </button>
            ))}
          </div>

          {/* Active Over Display */}
          <div className="bg-black/10 rounded-xl p-3 space-y-2 border border-white/5">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase opacity-60">Over {activeIdx + 1}</span>
                <span className="text-[11px] font-bold text-white/90">{overStats.bowler}</span>
              </div>
              <span className="text-[10px] font-bold text-white/70">{overStats.wickets}-{overStats.runs} in over</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {activeOver.map((b: any, i: number) => (
                <span key={i} className={cn("w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shadow-sm", ballColor(b.result))}>
                  {b.result}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Collapsible Dropdown for Team Details */}
      <div className="border-t border-white/10">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full py-2 flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-wider bg-black/10 hover:bg-black/20 transition-colors"
        >
          {isExpanded ? <><ChevronUp className="h-3 w-3" /> Hide Details</> : <><ChevronDown className="h-3 w-3" /> View Team Details</>}
        </button>
        
        {isExpanded && (
          <div className="p-4 bg-black/20 space-y-4 animate-in slide-in-from-top-2 duration-200">
             {/* Team A */}
             <div className="space-y-2">
               <div className="flex items-center justify-between border-b border-white/10 pb-1">
                 <span className="text-[11px] font-bold text-white/90">{match.teamA}</span>
                 <span className="text-[10px] font-medium opacity-60">Score: {match.scoreA}/{match.wicketsA}</span>
               </div>
               <div className="grid grid-cols-1 gap-1">
                 {(match.teamAPlayers || []).map((p: any) => (
                   <div key={p.name} className="flex justify-between text-[10px] py-0.5">
                     <span className={cn("font-medium", match.striker === p.name && "text-green-300")}>{p.name} {match.striker === p.name && "*"}</span>
                     <span className="tabular-nums opacity-80">{p.runs} ({p.balls})</span>
                   </div>
                 ))}
               </div>
             </div>

             {/* Team B */}
             <div className="space-y-2">
               <div className="flex items-center justify-between border-b border-white/10 pb-1">
                 <span className="text-[11px] font-bold text-white/90">{match.teamB}</span>
                 <span className="text-[10px] font-medium opacity-60">Score: {match.scoreB}/{match.wicketsB}</span>
               </div>
               <div className="grid grid-cols-1 gap-1">
                 {(match.teamBPlayers || []).map((p: any) => (
                   <div key={p.name} className="flex justify-between text-[10px] py-0.5">
                     <span className={cn("font-medium", match.striker === p.name && "text-green-300")}>{p.name} {match.striker === p.name && "*"}</span>
                     <span className="tabular-nums opacity-80">{p.runs} ({p.balls})</span>
                   </div>
                 ))}
               </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Community() {
  const [activeTab, setActiveTab] = useState<Tab>("matches");
  const [isPostDialogOpen, setIsPostDialogOpen] = useState(false);
  const [isScoreDialogOpen, setIsScoreDialogOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => console.log("Geolocation blocked")
      );
    }
  }, []);

  const calculateDistance = (lat1: number, lon1: number, lat2?: number, lon2?: number) => {
    if (lat2 === undefined || lon2 === undefined) return Infinity;
    // Simple Euclidean for close distances (sufficient for turf sorting)
    return Math.sqrt(Math.pow(lat1 - lat2, 2) + Math.pow(lon1 - lon2, 2));
  };

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { token, isAuthenticated } = useAuth();
  const { matches, connected, notifications, clearNotifications } = useLiveScores();

  const { data: posts, isLoading } = useListPosts({ status: "open" });
  const createPostMutation = useCreatePost();

  const postForm = useForm<PostForm>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      title: "", description: "", lookingFor: "individual", teamName: "",
      playersNeeded: 5, matchDate: format(new Date(), "yyyy-MM-dd"), matchTime: "18:00", turfName: "", area: "",
    },
  });

  const scoreForm = useForm<ScoreForm>({
    resolver: zodResolver(scoreSchema),
    defaultValues: { teamA: "", teamB: "", venue: "", maxOvers: 8, battingTeam: "A" },
  });

  const watchLookingFor = postForm.watch("lookingFor");

  const authFetch = (url: string, options: RequestInit = {}) =>
    fetch(url, {
      ...options,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers as object || {}) },
    });

  const onPostSubmit = (data: PostForm) => {
    createPostMutation.mutate({ data: { ...data, lookingFor: data.lookingFor } as any }, {
      onSuccess: () => {
        toast({ title: "Match posted!", description: "Nearby players will be notified." });
        setIsPostDialogOpen(false);
        postForm.reset();
        queryClient.invalidateQueries({ queryKey: getListPostsQueryKey() });
      },
      onError: (e) => toast({ variant: "destructive", title: "Failed", description: e.message }),
    });
  };

  const onScoreSubmit = async (data: ScoreForm) => {
    try {
      const res = await authFetch("/api/live-scores", {
        method: "POST",
        body: JSON.stringify({ turfName: data.venue, teamA: data.teamA, teamB: data.teamB, battingTeam: data.battingTeam, maxOvers: data.maxOvers }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const match = await res.json();
      setIsScoreDialogOpen(false);
      scoreForm.reset();
      toast({ title: "🔴 Scorecard is LIVE!", description: "Go to your Profile to score balls." });
      window.location.href = `/profile/match/${match.id}`;
    } catch (e: any) {
      toast({ variant: "destructive", title: "Failed to start", description: e.message });
    }
  };

  const filteredMatches = useMemo(() => {
    let list = [...matches];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(m => 
        m.teamA.toLowerCase().includes(q) || 
        m.teamB.toLowerCase().includes(q) || 
        m.turfName.toLowerCase().includes(q)
      );
    }
    
    if (userLocation) {
      list.sort((a, b) => {
        const distA = calculateDistance(userLocation.lat, userLocation.lng, a.lat, a.lng);
        const distB = calculateDistance(userLocation.lat, userLocation.lng, b.lat, b.lng);
        return distA - distB;
      });
    }
    return list;
  }, [matches, searchQuery, userLocation]);

  const liveMatches = filteredMatches.filter(m => m.status === "live");
  const unreadCount = notifications.length;

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* Custom header with notification bell */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-border bg-background">
        <h1 className="font-bold text-xl tracking-tight">Community</h1>
        <button
          className="relative p-1"
          onClick={() => { setNotifOpen(v => !v); if (unreadCount > 0) clearNotifications(); }}
        >
          <Bell className="h-5 w-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Notification dropdown */}
      {notifOpen && (
        <div className="absolute top-14 right-4 z-50 w-72 bg-background border border-border rounded-xl shadow-xl overflow-hidden">
          <div className="px-3 py-2 border-b border-border flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Notifications</span>
            <button onClick={() => setNotifOpen(false)} className="text-xs text-muted-foreground hover:text-foreground">Close</button>
          </div>
          {notifications.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">No new notifications</div>
          ) : (
            <div className="max-h-64 overflow-y-auto divide-y divide-border">
              {notifications.map(n => (
                <div key={n.id} className="px-3 py-2.5">
                  <p className="text-sm font-medium">{n.message}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(n.at).toLocaleTimeString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab switcher */}
      <div className="flex-shrink-0 flex bg-background border-b border-border">
        <button
          onClick={() => setActiveTab("matches")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold transition-colors border-b-2",
            activeTab === "matches"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Users className="h-4 w-4" />
          Find Players
          {posts && posts.length > 0 && (
            <span className={cn("text-[10px] font-bold rounded-full px-1.5 py-0.5",
              activeTab === "matches" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
              {posts.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("scores")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold transition-colors border-b-2",
            activeTab === "scores"
              ? "border-red-500 text-red-600"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Radio className={cn("h-4 w-4", liveMatches.length > 0 && "animate-pulse text-red-500")} />
          Live Scores
          {liveMatches.length > 0 && (
            <span className={cn("text-[10px] font-bold rounded-full px-1.5 py-0.5",
              activeTab === "scores" ? "bg-red-500/10 text-red-600" : "bg-red-50 text-red-500 dark:bg-red-950/30")}>
              {liveMatches.length}
            </span>
          )}
        </button>
      </div>

      {/* ═══════════════════════════════════
          TAB: FIND PLAYERS
      ════════════════════════════════════ */}
      {activeTab === "matches" && (
        <div className="flex-1 overflow-y-auto">
          {/* Section action bar */}
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border/50 px-4 py-2.5 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {posts?.length ? `${posts.length} open match${posts.length !== 1 ? "es" : ""}` : "No open matches"}
            </p>
            <Button size="sm" className="h-8 rounded-xl gap-1.5 text-xs font-bold" onClick={() => setIsPostDialogOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> Post Match
            </Button>
          </div>

          <div className="p-4 space-y-3">
            {isLoading ? (
              [1, 2, 3].map(i => <div key={i} className="h-44 rounded-xl bg-muted animate-pulse" />)
            ) : !Array.isArray(posts) || posts.length === 0 ? (
              <div className="text-center py-16">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-primary/50" />
                </div>
                <h3 className="font-bold text-base">{!Array.isArray(posts) ? "Failed to load posts" : "No open matches"}</h3>
                <p className="text-muted-foreground text-sm mt-1 mb-5">{!Array.isArray(posts) ? "The server returned an invalid response." : "Be the first to post and find players!"}</p>
                <Button onClick={() => setIsPostDialogOpen(true)} className="gap-2 rounded-xl font-bold px-6">
                  <Plus className="h-4 w-4" /> Post a Match
                </Button>
              </div>
            ) : (
              posts.map(post => {
                const p = post as any;
                const isTeamMode = p.lookingFor === "team";
                const spotsLeft = Math.max(0, p.playersNeeded - (p.playersJoined || 0));
                const isFull = spotsLeft === 0;
                return (
                  <Link key={p.id} href={`/community/${p.id}`} className="block group">
                    <Card className={cn(
                      "border shadow-sm hover:shadow-md transition-all",
                      isFull ? "border-muted opacity-70" : "hover:border-primary/40"
                    )}>
                      <div className="p-4">
                        {/* Header */}
                        <div className="flex items-start gap-3 mb-3">
                          <Avatar className="h-10 w-10 border-2 border-primary/10 flex-shrink-0">
                            <AvatarImage src={p.userAvatar} />
                            <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                              {p.userName?.substring(0, 2).toUpperCase() || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-sm leading-tight line-clamp-1 group-hover:text-primary transition-colors">{p.title}</h4>
                            <p className="text-xs text-muted-foreground mt-0.5">by {p.userName}</p>
                          </div>
                          <div className="flex-shrink-0 flex flex-col items-end gap-1">
                            {isFull ? (
                              <Badge variant="secondary" className="text-[10px] font-bold">Full</Badge>
                            ) : (
                              <Badge className={cn(
                                "text-[10px] font-bold border",
                                isTeamMode
                                  ? "bg-purple-500/10 text-purple-700 border-purple-200/50 dark:border-purple-900/50"
                                  : "bg-orange-500/10 text-orange-600 border-orange-200/50"
                              )}>
                                {isTeamMode ? "vs Team" : `${spotsLeft} spot${spotsLeft !== 1 ? "s" : ""} left`}
                              </Badge>
                            )}
                            {isTeamMode && (
                              <span className="text-[9px] font-bold text-purple-600 flex items-center gap-0.5">
                                <Swords className="h-2.5 w-2.5" /> Team vs Team
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Team name if set */}
                        {isTeamMode && p.teamName && (
                          <div className="mb-2 px-2.5 py-1.5 bg-purple-50 dark:bg-purple-950/20 rounded-lg flex items-center gap-1.5">
                            <Swords className="h-3 w-3 text-purple-600" />
                            <span className="text-xs font-bold text-purple-700 dark:text-purple-400">{p.teamName}</span>
                            <span className="text-xs text-muted-foreground">is looking for opponents</span>
                          </div>
                        )}

                        {/* Info grid */}
                        <div className="grid grid-cols-3 gap-2 mb-3">
                          <div className="flex flex-col bg-muted/40 rounded-lg p-2">
                            <Calendar className="h-3 w-3 text-primary mb-1" />
                            <span className="text-[11px] font-bold">
                              {p.matchDate ? format(parseISO(p.matchDate), "MMM dd") : "TBD"}
                            </span>
                          </div>
                          <div className="flex flex-col bg-muted/40 rounded-lg p-2">
                            <Clock className="h-3 w-3 text-primary mb-1" />
                            <span className="text-[11px] font-bold">{p.matchTime || "TBD"}</span>
                          </div>
                          <div className="flex flex-col bg-muted/40 rounded-lg p-2">
                            <Users className="h-3 w-3 text-primary mb-1" />
                            <span className="text-[11px] font-bold">{p.playersJoined || 0}/{p.playersNeeded}</span>
                          </div>
                        </div>

                        {/* Venue */}
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2.5">
                          <MapPin className="h-3 w-3 text-primary flex-shrink-0" />
                          <span className="truncate">{p.turfName ? `${p.turfName}, ` : ""}{p.area}</span>
                        </div>

                        {/* Progress */}
                        <div className="h-1 bg-muted rounded-full overflow-hidden mb-3">
                          <div
                            className={cn("h-full rounded-full transition-all", isFull ? "bg-muted-foreground" : isTeamMode ? "bg-purple-500" : "bg-primary")}
                            style={{ width: `${Math.min(100, ((p.playersJoined || 0) / p.playersNeeded) * 100)}%` }}
                          />
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center text-xs text-muted-foreground gap-1">
                            <MessageSquare className="h-3.5 w-3.5" />
                            <span>Chat & join</span>
                          </div>
                          <div className={cn("flex items-center gap-1 text-xs font-bold", isFull ? "text-muted-foreground" : isTeamMode ? "text-purple-600" : "text-primary")}>
                            {isFull ? "View" : isTeamMode
                              ? <><Swords className="h-3.5 w-3.5" /> Challenge</>
                              : <><UserPlus className="h-3.5 w-3.5" /> Reserve Spot</>
                            }
                            <ChevronRight className="h-3.5 w-3.5" />
                          </div>
                        </div>
                      </div>
                    </Card>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════
          TAB: LIVE SCORES
      ════════════════════════════════════ */}
      {activeTab === "scores" && (
        <div className="flex-1 overflow-y-auto">
          {/* Section action bar */}
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border/50 px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={cn("h-2 w-2 rounded-full", liveMatches.length > 0 ? "bg-red-500 animate-pulse" : "bg-muted-foreground/30")} />
              <p className="text-xs text-muted-foreground">
                {liveMatches.length > 0 ? `${liveMatches.length} match${liveMatches.length !== 1 ? "es" : ""} live` : "No live matches"}
              </p>
              <span className={cn("text-[10px]", connected ? "text-green-600" : "text-muted-foreground")}>
                {connected ? "● live" : "○ connecting"}
              </span>
            </div>
            {isAuthenticated && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 rounded-xl gap-1.5 text-xs font-bold border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/30"
                onClick={() => setIsScoreDialogOpen(true)}
              >
                <Trophy className="h-3.5 w-3.5" /> Score Live
              </Button>
            )}
          </div>

          <div className="p-4 space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search teams or venue..." 
                  className="pl-9 h-10 bg-background rounded-xl border-border"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              <Button 
                variant="outline" 
                size="icon" 
                className={cn("h-10 w-10 shrink-0 rounded-xl", userLocation && "text-primary border-primary bg-primary/5")}
                onClick={() => {
                  navigator.geolocation.getCurrentPosition((pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }));
                }}
              >
                <Navigation className="h-4 w-4" />
              </Button>
            </div>

            {liveMatches.length === 0 ? (
              <div className="text-center py-16">
                <div className="h-16 w-16 rounded-full bg-red-50 dark:bg-red-950/20 flex items-center justify-center mx-auto mb-4">
                  <Radio className="h-8 w-8 text-red-400" />
                </div>
                <h3 className="font-bold text-base">No live matches right now</h3>
                <p className="text-muted-foreground text-sm mt-1 mb-5">Start a scorecard to broadcast your match live!</p>
                {isAuthenticated && (
                  <Button
                    variant="outline"
                    className="gap-2 rounded-xl font-bold px-6 border-red-200 text-red-600 hover:bg-red-50"
                    onClick={() => setIsScoreDialogOpen(true)}
                  >
                    <Radio className="h-4 w-4" /> Start Scoring
                  </Button>
                )}
              </div>
            ) : (
              liveMatches.map(match => <LiveMatchCard key={match.id} match={match} />)
            )}
          </div>
        </div>
      )}

      {/* ─── Post Match Dialog ─── */}
      <Dialog open={isPostDialogOpen} onOpenChange={setIsPostDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Post a Match</DialogTitle>
          </DialogHeader>
          <form onSubmit={postForm.handleSubmit(onPostSubmit)} className="space-y-4 pt-2">

            {/* Looking For selector */}
            <div>
              <label className="text-sm font-medium mb-2 block">What are you looking for?</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => postForm.setValue("lookingFor", "team")}
                  className={cn(
                    "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-left",
                    watchLookingFor === "team"
                      ? "border-purple-500 bg-purple-50 dark:bg-purple-950/20"
                      : "border-border hover:border-purple-300"
                  )}
                >
                  <Swords className={cn("h-6 w-6", watchLookingFor === "team" ? "text-purple-600" : "text-muted-foreground")} />
                  <div>
                    <p className={cn("text-xs font-bold", watchLookingFor === "team" ? "text-purple-700 dark:text-purple-400" : "")}>Opponent Team</p>
                    <p className="text-[10px] text-muted-foreground">My team is ready, need rivals</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => postForm.setValue("lookingFor", "individual")}
                  className={cn(
                    "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-left",
                    watchLookingFor === "individual"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40"
                  )}
                >
                  <UserPlus className={cn("h-6 w-6", watchLookingFor === "individual" ? "text-primary" : "text-muted-foreground")} />
                  <div>
                    <p className={cn("text-xs font-bold", watchLookingFor === "individual" ? "text-primary" : "")}>Individual Players</p>
                    <p className="text-[10px] text-muted-foreground">Fill spots one by one</p>
                  </div>
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Post Title</label>
              <Input placeholder="5-a-side cricket, Gachibowli Saturday" className="mt-1" {...postForm.register("title")} />
              {postForm.formState.errors.title && <p className="text-xs text-destructive mt-1">{postForm.formState.errors.title.message}</p>}
            </div>

            {watchLookingFor === "team" && (
              <div>
                <label className="text-sm font-medium">Your Team Name</label>
                <Input placeholder="Banjara Lions" className="mt-1" {...postForm.register("teamName")} />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">
                  {watchLookingFor === "team" ? "Team Size (per side)" : "Players Needed"}
                </label>
                <Input type="number" min="1" className="mt-1" {...postForm.register("playersNeeded")} />
              </div>
              <div>
                <label className="text-sm font-medium">Area</label>
                <Input placeholder="Gachibowli" className="mt-1" {...postForm.register("area")} />
                {postForm.formState.errors.area && <p className="text-xs text-destructive mt-1">{postForm.formState.errors.area.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Date</label>
                <Input type="date" className="mt-1" {...postForm.register("matchDate")} />
              </div>
              <div>
                <label className="text-sm font-medium">Time</label>
                <Input type="time" className="mt-1" {...postForm.register("matchTime")} />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Turf Name (optional)</label>
              <Input placeholder="If already booked..." className="mt-1" {...postForm.register("turfName")} />
            </div>
            <div>
              <label className="text-sm font-medium">Description (optional)</label>
              <Textarea placeholder="Skill level? Cost split? Contact info?" className="mt-1 resize-none h-20" {...postForm.register("description")} />
            </div>
            <Button type="submit" className="w-full font-bold" disabled={createPostMutation.isPending}>
              {createPostMutation.isPending ? "Posting..." : "Post Match"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── Start Scorecard Dialog ─── */}
      <Dialog open={isScoreDialogOpen} onOpenChange={setIsScoreDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-red-500" /> Start Live Scorecard
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground -mt-1 mb-3">Share your match scores live with the community!</p>
          <form onSubmit={scoreForm.handleSubmit(onScoreSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Team A</label>
                <Input placeholder="Banjara Lions" className="mt-1" {...scoreForm.register("teamA")} />
                {scoreForm.formState.errors.teamA && <p className="text-xs text-destructive mt-1">{scoreForm.formState.errors.teamA.message}</p>}
              </div>
              <div>
                <label className="text-sm font-medium">Team B</label>
                <Input placeholder="Hitech Hawks" className="mt-1" {...scoreForm.register("teamB")} />
                {scoreForm.formState.errors.teamB && <p className="text-xs text-destructive mt-1">{scoreForm.formState.errors.teamB.message}</p>}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Venue / Area</label>
              <Input placeholder="Gachibowli, Arvan Sports Ground" className="mt-1" {...scoreForm.register("venue")} />
              {scoreForm.formState.errors.venue && <p className="text-xs text-destructive mt-1">{scoreForm.formState.errors.venue.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Max Overs</label>
                <Input type="number" min="1" max="50" className="mt-1" {...scoreForm.register("maxOvers")} />
              </div>
              <div>
                <label className="text-sm font-medium">Batting First</label>
                <div className="flex gap-2 mt-1">
                  <button type="button" onClick={() => scoreForm.setValue("battingTeam", "A")}
                    className={cn("flex-1 h-9 rounded-lg border text-xs font-bold transition-all",
                      scoreForm.watch("battingTeam") === "A" ? "border-primary bg-primary text-primary-foreground" : "border-border")}>
                    Team A
                  </button>
                  <button type="button" onClick={() => scoreForm.setValue("battingTeam", "B")}
                    className={cn("flex-1 h-9 rounded-lg border text-xs font-bold transition-all",
                      scoreForm.watch("battingTeam") === "B" ? "border-primary bg-primary text-primary-foreground" : "border-border")}>
                    Team B
                  </button>
                </div>
              </div>
            </div>
            <Button type="submit" className="w-full font-bold bg-red-600 hover:bg-red-700">
              <Radio className="h-4 w-4 mr-2" /> Go Live!
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
