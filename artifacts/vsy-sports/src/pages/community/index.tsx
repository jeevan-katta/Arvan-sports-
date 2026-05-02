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
import { MapPin, Calendar, Clock, Users, Plus, MessageSquare, Radio, ChevronRight, Zap, Trophy } from "lucide-react";
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

const BALL_OPTIONS = [
  { label: "0", value: "0", cls: "bg-muted text-foreground" },
  { label: "1", value: "1", cls: "bg-green-100 text-green-800 dark:bg-green-900/60 dark:text-green-100" },
  { label: "2", value: "2", cls: "bg-green-200 text-green-900 dark:bg-green-800/60 dark:text-green-100" },
  { label: "3", value: "3", cls: "bg-green-300 text-green-900 dark:bg-green-700/60" },
  { label: "4", value: "4", cls: "bg-blue-500 text-white" },
  { label: "6", value: "6", cls: "bg-purple-600 text-white" },
  { label: "W", value: "W", cls: "bg-red-600 text-white" },
  { label: "NB", value: "NB", cls: "bg-yellow-400 text-black" },
  { label: "WD", value: "WD", cls: "bg-yellow-300 text-black" },
];

export default function Community() {
  const [isPostDialogOpen, setIsPostDialogOpen] = useState(false);
  const [isScoreDialogOpen, setIsScoreDialogOpen] = useState(false);
  const [myMatchId, setMyMatchId] = useState<string | null>(null);
  const [myMatch, setMyMatch] = useState<any | null>(null);
  const [isAddingBall, setIsAddingBall] = useState(false);

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
        toast({ title: "Post created!" });
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
      setMyMatchId(match.id);
      setMyMatch(match);
      setIsScoreDialogOpen(false);
      scoreForm.reset();
      toast({ title: "Scorecard is LIVE!", description: "Everyone in Community can see it." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Failed to start", description: e.message });
    }
  };

  const handleAddBall = async (result: string) => {
    if (!myMatchId) return;
    setIsAddingBall(true);
    try {
      const res = await authFetch(`/api/live-scores/${myMatchId}/ball`, {
        method: "POST",
        body: JSON.stringify({ result, team: myMatch?.battingTeam }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setMyMatch(await res.json());
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
      setIsAddingBall(false);
    }
  };

  const handleSwitchInnings = async () => {
    if (!myMatchId || !myMatch) return;
    const newBatting = myMatch.battingTeam === "A" ? "B" : "A";
    try {
      const res = await authFetch(`/api/live-scores/${myMatchId}`, { method: "PUT", body: JSON.stringify({ battingTeam: newBatting }) });
      if (!res.ok) throw new Error((await res.json()).error);
      setMyMatch(await res.json());
      toast({ title: `${newBatting === "A" ? myMatch.teamA : myMatch.teamB} now batting` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    }
  };

  const handleEndMatch = async () => {
    if (!myMatchId) return;
    await authFetch(`/api/live-scores/${myMatchId}`, { method: "DELETE" });
    setMyMatchId(null);
    setMyMatch(null);
    toast({ title: "Match ended." });
  };

  // Live matches from WS — sort: my own match first, then others
  const liveMatches = matches.filter(m => m.status === "live");
  const sortedLive = [...liveMatches].sort((a, b) => (a.id === myMatchId ? -1 : b.id === myMatchId ? 1 : 0));

  return (
    <div className="flex flex-col min-h-full pb-24">
      <Header title="Community" showLocation={false} />

      {/* My Live Scoring Panel */}
      {myMatchId && myMatch && (
        <div className="bg-gradient-to-r from-red-600 to-orange-600 text-white px-4 py-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider">You're Scoring Live</span>
            <button onClick={handleEndMatch} className="ml-auto text-[11px] font-bold bg-white/20 px-2 py-0.5 rounded-full hover:bg-white/30">
              End Match
            </button>
          </div>

          {/* Score display */}
          <div className="bg-white/10 rounded-2xl p-3 mb-3">
            <div className="flex items-center justify-between mb-2">
              <div className={cn("flex-1 text-center", myMatch.battingTeam === "A" ? "opacity-100" : "opacity-60")}>
                <p className="text-[11px] font-bold uppercase opacity-80 truncate">{myMatch.teamA}</p>
                <p className="text-2xl font-bold">{myMatch.scoreA}<span className="text-base font-normal">/{myMatch.wicketsA}W</span></p>
                {myMatch.battingTeam === "A" && <p className="text-[10px] font-bold text-green-300">● BATTING</p>}
              </div>
              <div className="px-3 text-xs font-bold opacity-60">vs</div>
              <div className={cn("flex-1 text-center", myMatch.battingTeam === "B" ? "opacity-100" : "opacity-60")}>
                <p className="text-[11px] font-bold uppercase opacity-80 truncate">{myMatch.teamB}</p>
                <p className="text-2xl font-bold">{myMatch.scoreB}<span className="text-base font-normal">/{myMatch.wicketsB}W</span></p>
                {myMatch.battingTeam === "B" && <p className="text-[10px] font-bold text-green-300">● BATTING</p>}
              </div>
            </div>
            <p className="text-center text-[11px] opacity-70">{myMatch.overs}</p>
            {myMatch.balls?.length > 0 && (
              <div className="flex gap-1.5 justify-center mt-2 flex-wrap">
                {myMatch.balls.slice(-6).map((b: any, i: number) => (
                  <span key={i} className={cn("w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold", ballColor(b.result))}>{b.result}</span>
                ))}
              </div>
            )}
          </div>

          {/* Ball input */}
          <div className="grid grid-cols-9 gap-1.5 mb-2">
            {BALL_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => handleAddBall(opt.value)}
                disabled={isAddingBall}
                className={cn("h-9 rounded-xl font-bold text-xs transition-all active:scale-95 disabled:opacity-50", opt.cls)}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <button onClick={handleSwitchInnings} className="w-full text-center text-xs font-bold text-white/70 hover:text-white py-1">
            Switch Innings →
          </button>
        </div>
      )}

      {/* Running Live Matches (from all users) */}
      {sortedLive.length > 0 && (
        <div className="bg-gradient-to-b from-red-600/95 to-red-700/90 text-white px-4 pt-3 pb-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider">
              {sortedLive.length} Match{sortedLive.length > 1 ? "es" : ""} Live
            </span>
            <span className="text-[10px] opacity-60 ml-auto">{connected ? "● live" : "○ connecting"}</span>
          </div>
          <div className="space-y-2">
            {sortedLive.map(match => (
              <div key={match.id} className="bg-white/10 rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold uppercase opacity-70 truncate flex-1">{match.turfName}</p>
                  <Badge className="bg-red-500/50 border-0 text-white text-[10px] font-bold flex-shrink-0">
                    <Radio className="h-2.5 w-2.5 mr-1 animate-pulse" /> LIVE
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <div className={cn("flex-1 text-center", match.battingTeam === "A" ? "opacity-100" : "opacity-50")}>
                    <p className="text-[11px] font-bold truncate">{match.teamA}</p>
                    <p className="text-xl font-bold tabular-nums">{match.scoreA}<span className="text-sm font-normal">/{match.wicketsA}</span></p>
                  </div>
                  <span className="text-xs opacity-50 font-bold">vs</span>
                  <div className={cn("flex-1 text-center", match.battingTeam === "B" ? "opacity-100" : "opacity-50")}>
                    <p className="text-[11px] font-bold truncate">{match.teamB}</p>
                    <p className="text-xl font-bold tabular-nums">{match.scoreB}<span className="text-sm font-normal">/{match.wicketsB}</span></p>
                  </div>
                </div>
                <p className="text-center text-[10px] opacity-60 mt-1">{match.overs}</p>
                {match.balls?.length > 0 && (
                  <div className="flex gap-1 mt-2 justify-center flex-wrap">
                    {match.balls.slice(-6).map((b: any, i: number) => (
                      <span key={i} className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold", ballColor(b.result))}>{b.result}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Header bar */}
      <div className="p-4 bg-background border-b border-border">
        <div className="flex justify-between items-center mb-1">
          <div>
            <h2 className="font-bold text-lg">Community</h2>
            <p className="text-xs text-muted-foreground">Find players · share scores</p>
          </div>
          <div className="flex gap-2">
            {isAuthenticated && !myMatchId && (
              <Button
                size="sm"
                variant="outline"
                className="h-9 rounded-xl gap-1.5 font-bold border-red-300 text-red-600 hover:bg-red-50"
                onClick={() => setIsScoreDialogOpen(true)}
              >
                <Trophy className="h-3.5 w-3.5" /> Score
              </Button>
            )}
            <Button size="sm" className="h-9 rounded-xl gap-1.5 font-bold" onClick={() => setIsPostDialogOpen(true)}>
              <Plus className="h-4 w-4" /> Post Match
            </Button>
          </div>
        </div>
      </div>

      <main className="flex-1 p-4 space-y-3">
        {isLoading ? (
          [1, 2, 3].map(i => <div key={i} className="h-36 rounded-xl bg-muted animate-pulse" />)
        ) : posts?.length === 0 ? (
          <div className="text-center py-16">
            <Users className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-3" />
            <h3 className="font-bold text-lg">No open matches</h3>
            <p className="text-muted-foreground text-sm mb-4">Be the first to post!</p>
            <Button onClick={() => setIsPostDialogOpen(true)} className="gap-2 rounded-xl font-bold">
              <Plus className="h-4 w-4" /> Post a Match
            </Button>
          </div>
        ) : (
          posts?.map(post => (
            <Link key={post.id} href={`/community/${post.id}`} className="block group">
              <Card className="border-border shadow-sm hover:border-primary/40 transition-all overflow-hidden">
                <div className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Avatar className="h-10 w-10 border border-border flex-shrink-0">
                        <AvatarImage src={(post as any).userAvatar} />
                        <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                          {(post as any).userName?.substring(0, 2).toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <h4 className="font-bold text-sm leading-tight line-clamp-1 group-hover:text-primary transition-colors">{post.title}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">by {(post as any).userName}</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-orange-500/10 text-orange-600 border-none font-bold flex-shrink-0 ml-2">
                      {post.playersNeeded} needed
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-y-1.5 gap-x-3 mb-3 text-xs">
                    <div className="flex items-center text-muted-foreground">
                      <Calendar className="h-3 w-3 mr-1.5 text-primary flex-shrink-0" />
                      <span className="truncate">{post.matchDate ? format(parseISO(post.matchDate), "MMM dd, yyyy") : "TBD"}</span>
                    </div>
                    <div className="flex items-center text-muted-foreground">
                      <Clock className="h-3 w-3 mr-1.5 text-primary flex-shrink-0" />
                      <span className="truncate">{post.matchTime || "TBD"}</span>
                    </div>
                    <div className="flex items-center text-muted-foreground col-span-2">
                      <MapPin className="h-3 w-3 mr-1.5 text-primary flex-shrink-0" />
                      <span className="truncate">{post.turfName ? `${post.turfName}, ` : ""}{post.area}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-border/50">
                    <div className="flex items-center text-xs font-medium text-muted-foreground">
                      <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                      Discuss & join
                    </div>
                    <div className="flex items-center gap-1 text-xs font-bold text-primary">
                      View <ChevronRight className="h-3.5 w-3.5" />
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          ))
        )}
      </main>

      {/* Post Match Dialog */}
      <Dialog open={isPostDialogOpen} onOpenChange={setIsPostDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Looking for players?</DialogTitle>
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
              <Textarea placeholder="Any skill level requirements? Split cost?" className="mt-1 resize-none h-20" {...postForm.register("description")} />
            </div>
            <Button type="submit" className="w-full font-bold" disabled={createPostMutation.isPending}>
              {createPostMutation.isPending ? "Creating..." : "Create Post"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Start Scorecard Dialog */}
      <Dialog open={isScoreDialogOpen} onOpenChange={setIsScoreDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-red-500" /> Start Live Scorecard
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground -mt-2 mb-2">Playing anywhere? Share live scores with the community!</p>
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
                  <button
                    type="button"
                    onClick={() => scoreForm.setValue("battingTeam", "A")}
                    className={cn("flex-1 h-9 rounded-lg border text-xs font-bold transition-all",
                      scoreForm.watch("battingTeam") === "A" ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/40")}
                  >Team A</button>
                  <button
                    type="button"
                    onClick={() => scoreForm.setValue("battingTeam", "B")}
                    className={cn("flex-1 h-9 rounded-lg border text-xs font-bold transition-all",
                      scoreForm.watch("battingTeam") === "B" ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/40")}
                  >Team B</button>
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
