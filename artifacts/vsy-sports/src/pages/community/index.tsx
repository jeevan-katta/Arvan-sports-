import { useState } from "react";
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
  Radio, ChevronRight, Zap, Trophy, UserPlus,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getListPostsQueryKey } from "@workspace/api-client-react";
import { useLiveScores, ballColor } from "@/hooks/use-live-scores";
import { cn } from "@/lib/utils";

const postSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().optional(),
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

export default function Community() {
  const [isPostDialogOpen, setIsPostDialogOpen] = useState(false);
  const [isScoreDialogOpen, setIsScoreDialogOpen] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { token, isAuthenticated } = useAuth();
  const { matches, connected } = useLiveScores();

  const { data: posts, isLoading } = useListPosts({ status: "open" });
  const createPostMutation = useCreatePost();

  const postForm = useForm<PostForm>({
    resolver: zodResolver(postSchema),
    defaultValues: { title: "", description: "", playersNeeded: 1, matchDate: format(new Date(), "yyyy-MM-dd"), matchTime: "18:00", turfName: "", area: "" },
  });

  const scoreForm = useForm<ScoreForm>({
    resolver: zodResolver(scoreSchema),
    defaultValues: { teamA: "", teamB: "", venue: "", maxOvers: 8, battingTeam: "A" },
  });

  const authFetch = (url: string, options: RequestInit = {}) =>
    fetch(url, {
      ...options,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers as object || {}) },
    });

  const onPostSubmit = (data: PostForm) => {
    createPostMutation.mutate({ data }, {
      onSuccess: () => {
        toast({ title: "Match posted!" });
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
      toast({ title: "🔴 Scorecard is LIVE!", description: "Go to Profile → Manage Scorecard to score balls." });
      // Navigate to profile/match
      window.location.href = `/profile/match/${match.id}`;
    } catch (e: any) {
      toast({ variant: "destructive", title: "Failed to start", description: e.message });
    }
  };

  const liveMatches = matches.filter(m => m.status === "live");

  return (
    <div className="flex flex-col min-h-full pb-24 bg-muted/10">
      <Header title="Community" showLocation={false} />

      {/* ═══════════════════════════════════════
          SECTION 1 — LIVE SCORES
      ════════════════════════════════════════ */}
      <section>
        {/* Section header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2 bg-background">
          <div className="flex items-center gap-2">
            <div className={cn("h-2.5 w-2.5 rounded-full", liveMatches.length > 0 ? "bg-red-500 animate-pulse" : "bg-muted-foreground/30")} />
            <h2 className="font-bold text-sm uppercase tracking-wider">
              Live Scores
              {liveMatches.length > 0 && (
                <span className="ml-1.5 text-red-600 font-bold">{liveMatches.length}</span>
              )}
            </h2>
            <span className={cn("text-[10px] font-medium", connected ? "text-green-600" : "text-muted-foreground")}>
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

        {/* Live match cards */}
        <div className="px-4 pb-4 bg-background border-b-4 border-muted">
          {liveMatches.length === 0 ? (
            <div className="flex items-center gap-3 py-4 px-3 rounded-xl border border-dashed border-border/60">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <Radio className="h-5 w-5 text-muted-foreground opacity-40" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">No live matches right now</p>
                <p className="text-xs text-muted-foreground/70">Start a scorecard to broadcast live!</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {liveMatches.map(match => (
                <div
                  key={match.id}
                  className="relative overflow-hidden rounded-xl border border-red-200/60 dark:border-red-900/60 bg-gradient-to-br from-red-600 to-rose-700 text-white shadow-md shadow-red-500/10"
                >
                  {/* Venue + badge */}
                  <div className="flex items-center justify-between px-3 pt-3 pb-2 border-b border-white/10">
                    <p className="text-[10px] font-bold uppercase tracking-wider opacity-70 truncate flex-1">{match.turfName}</p>
                    <Badge className="bg-white/20 border-0 text-white text-[10px] font-bold flex-shrink-0">
                      <Radio className="h-2.5 w-2.5 mr-1 animate-pulse" /> LIVE
                    </Badge>
                  </div>

                  {/* Scores */}
                  <div className="flex items-center px-3 py-3 gap-2">
                    <div className={cn("flex-1 text-center transition-opacity", match.battingTeam === "A" ? "opacity-100" : "opacity-55")}>
                      <p className="text-[11px] font-bold truncate mb-0.5">{match.teamA}</p>
                      <p className="text-2xl font-bold leading-none tabular-nums">
                        {match.scoreA}<span className="text-sm font-normal opacity-80">/{match.wicketsA}</span>
                      </p>
                      {match.battingTeam === "A" && (
                        <p className="text-[9px] font-bold text-green-300 mt-0.5 uppercase tracking-wide">● batting</p>
                      )}
                      {match.striker && match.battingTeam === "A" && (
                        <p className="text-[10px] opacity-70 mt-0.5">{match.striker} ●</p>
                      )}
                    </div>

                    <div className="flex flex-col items-center px-2">
                      <span className="text-xs opacity-40 font-bold">vs</span>
                      <span className="text-[10px] opacity-60 mt-1">{match.overs}</span>
                    </div>

                    <div className={cn("flex-1 text-center transition-opacity", match.battingTeam === "B" ? "opacity-100" : "opacity-55")}>
                      <p className="text-[11px] font-bold truncate mb-0.5">{match.teamB}</p>
                      <p className="text-2xl font-bold leading-none tabular-nums">
                        {match.scoreB}<span className="text-sm font-normal opacity-80">/{match.wicketsB}</span>
                      </p>
                      {match.battingTeam === "B" && (
                        <p className="text-[9px] font-bold text-green-300 mt-0.5 uppercase tracking-wide">● batting</p>
                      )}
                      {match.striker && match.battingTeam === "B" && (
                        <p className="text-[10px] opacity-70 mt-0.5">{match.striker} ●</p>
                      )}
                    </div>
                  </div>

                  {/* Last 6 balls */}
                  {match.balls?.length > 0 && (
                    <div className="flex gap-1.5 justify-center px-3 pb-3">
                      {match.balls.slice(-6).map((b, i) => (
                        <span key={i} className={cn("w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm", ballColor(b.result))}>
                          {b.result}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Current bowler */}
                  {match.currentBowler && (
                    <div className="px-3 pb-2 flex items-center gap-1 justify-center">
                      <span className="text-[10px] opacity-60">Bowling:</span>
                      <span className="text-[10px] font-bold opacity-80">{match.currentBowler}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ═══════════════════════════════════════
          SECTION 2 — FIND PLAYERS
      ════════════════════════════════════════ */}
      <section className="flex-1">
        {/* Section header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2 bg-background sticky top-[57px] z-10 border-b border-border shadow-sm">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <h2 className="font-bold text-sm uppercase tracking-wider">Find Players</h2>
            {posts && posts.length > 0 && (
              <span className="text-[10px] font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">{posts.length} open</span>
            )}
          </div>
          <Button
            size="sm"
            className="h-8 rounded-xl gap-1.5 text-xs font-bold"
            onClick={() => setIsPostDialogOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" /> Post Match
          </Button>
        </div>

        {/* Match posts */}
        <div className="p-4 space-y-3">
          {isLoading ? (
            [1, 2, 3].map(i => <div key={i} className="h-36 rounded-xl bg-muted animate-pulse" />)
          ) : posts?.length === 0 ? (
            <div className="text-center py-14">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-primary/60" />
              </div>
              <h3 className="font-bold text-base">No open matches</h3>
              <p className="text-muted-foreground text-sm mt-1 mb-5">Be the first to post and find players!</p>
              <Button onClick={() => setIsPostDialogOpen(true)} className="gap-2 rounded-xl font-bold px-6">
                <Plus className="h-4 w-4" /> Post a Match
              </Button>
            </div>
          ) : (
            posts.map(post => {
              const spotsLeft = Math.max(0, post.playersNeeded - (post.playersJoined || 0));
              const isFull = spotsLeft === 0;
              return (
                <Link key={post.id} href={`/community/${post.id}`} className="block group">
                  <Card className={cn(
                    "border shadow-sm hover:shadow-md transition-all overflow-hidden",
                    isFull ? "border-muted opacity-70" : "hover:border-primary/40"
                  )}>
                    <div className="p-4">
                      {/* Header row */}
                      <div className="flex items-start gap-3 mb-3">
                        <Avatar className="h-10 w-10 border-2 border-primary/10 flex-shrink-0">
                          <AvatarImage src={(post as any).userAvatar} />
                          <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                            {(post as any).userName?.substring(0, 2).toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-sm leading-tight line-clamp-1 group-hover:text-primary transition-colors">{post.title}</h4>
                          <p className="text-xs text-muted-foreground mt-0.5">by {(post as any).userName}</p>
                        </div>
                        <div className="flex-shrink-0 ml-1">
                          {isFull ? (
                            <Badge variant="secondary" className="text-[10px] font-bold">Full</Badge>
                          ) : (
                            <Badge className="bg-orange-500/10 text-orange-600 border-orange-200/50 dark:border-orange-900/50 text-[10px] font-bold">
                              {spotsLeft} spot{spotsLeft !== 1 ? "s" : ""} left
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Info grid */}
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        <div className="flex flex-col bg-muted/40 rounded-lg p-2">
                          <Calendar className="h-3 w-3 text-primary mb-1" />
                          <span className="text-[11px] font-bold text-foreground">
                            {post.matchDate ? format(parseISO(post.matchDate), "MMM dd") : "TBD"}
                          </span>
                        </div>
                        <div className="flex flex-col bg-muted/40 rounded-lg p-2">
                          <Clock className="h-3 w-3 text-primary mb-1" />
                          <span className="text-[11px] font-bold text-foreground">{post.matchTime || "TBD"}</span>
                        </div>
                        <div className="flex flex-col bg-muted/40 rounded-lg p-2">
                          <Users className="h-3 w-3 text-primary mb-1" />
                          <span className="text-[11px] font-bold text-foreground">{post.playersJoined || 0}/{post.playersNeeded}</span>
                        </div>
                      </div>

                      {/* Venue */}
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
                        <MapPin className="h-3 w-3 text-primary flex-shrink-0" />
                        <span className="truncate">{post.turfName ? `${post.turfName}, ` : ""}{post.area}</span>
                      </div>

                      {/* Players progress bar */}
                      <div className="h-1 bg-muted rounded-full overflow-hidden mb-3">
                        <div
                          className={cn("h-full rounded-full transition-all", isFull ? "bg-muted-foreground" : "bg-primary")}
                          style={{ width: `${Math.min(100, ((post.playersJoined || 0) / post.playersNeeded) * 100)}%` }}
                        />
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-xs text-muted-foreground gap-1">
                          <MessageSquare className="h-3.5 w-3.5" />
                          <span>Chat & join</span>
                        </div>
                        <div className={cn("flex items-center gap-1 text-xs font-bold", isFull ? "text-muted-foreground" : "text-primary")}>
                          {isFull ? "View" : <><UserPlus className="h-3.5 w-3.5" /> Reserve Spot</>}
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
      </section>

      {/* ─── Post Match Dialog ─── */}
      <Dialog open={isPostDialogOpen} onOpenChange={setIsPostDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Post a Match</DialogTitle>
          </DialogHeader>
          <form onSubmit={postForm.handleSubmit(onPostSubmit)} className="space-y-4 pt-2">
            <div>
              <label className="text-sm font-medium">Post Title</label>
              <Input placeholder="Need 2 players for Saturday match" className="mt-1" {...postForm.register("title")} />
              {postForm.formState.errors.title && <p className="text-xs text-destructive mt-1">{postForm.formState.errors.title.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Players Needed</label>
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
              <Input placeholder="Gachibowli, VSY Box Cricket" className="mt-1" {...scoreForm.register("venue")} />
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
