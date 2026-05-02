import { useState, useEffect, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useLiveScores, ballColor, formatOvers, type LiveMatch, type Player, type Bowler } from "@/hooks/use-live-scores";
import { Radio, Trophy, RefreshCw, Users, ChevronDown, Plus, X, ArrowLeftRight } from "lucide-react";
import { cn } from "@/lib/utils";

const BALL_OPTIONS = [
  { label: "0", value: "0", cls: "bg-muted text-foreground border border-border" },
  { label: "1", value: "1", cls: "bg-green-100 text-green-900 dark:bg-green-900/50 dark:text-green-100" },
  { label: "2", value: "2", cls: "bg-green-200 text-green-900 dark:bg-green-800/50" },
  { label: "3", value: "3", cls: "bg-green-300 text-green-900 dark:bg-green-700/50" },
  { label: "4", value: "4", cls: "bg-blue-500 text-white" },
  { label: "6", value: "6", cls: "bg-purple-600 text-white" },
  { label: "W", value: "W", cls: "bg-red-600 text-white" },
  { label: "NB", value: "NB", cls: "bg-yellow-400 text-black text-[10px]" },
  { label: "WD", value: "WD", cls: "bg-yellow-300 text-black text-[10px]" },
];

type ActiveTab = "score" | "players" | "scorecard";

export default function MatchManager() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { token, user } = useAuth();
  const { toast } = useToast();
  const { matches } = useLiveScores();

  const [activeTab, setActiveTab] = useState<ActiveTab>("score");
  const [isAddingBall, setIsAddingBall] = useState(false);
  const [isEnding, setIsEnding] = useState(false);

  // Player selection dialogs
  const [strikerDialog, setStrikerDialog] = useState(false);
  const [nonStrikerDialog, setNonStrikerDialog] = useState(false);
  const [bowlerDialog, setBowlerDialog] = useState(false);

  // New player input
  const [newPlayerTeam, setNewPlayerTeam] = useState<"A" | "B">("A");
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newBowlerName, setNewBowlerName] = useState("");

  const match: LiveMatch | undefined = matches.find(m => m.id === id);

  const authFetch = useCallback((url: string, options: RequestInit = {}) =>
    fetch(url, {
      ...options,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers as object || {}) },
    }), [token]);

  useEffect(() => {
    if (!match && matches.length > 0) {
      toast({ variant: "destructive", title: "Match not found" });
      setLocation("/profile");
    }
  }, [match, matches.length, setLocation, toast]);

  if (!match) {
    return (
      <div className="flex flex-col min-h-full">
        <Header title="Match" showLocation={false} />
        <div className="flex-1 flex items-center justify-center">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      </div>
    );
  }

  const battingPlayers = match.battingTeam === "A" ? match.teamAPlayers : match.teamBPlayers;
  const fieldingPlayers = match.battingTeam === "A" ? match.teamBPlayers : match.teamAPlayers;
  const activeBatters = battingPlayers.filter(p => !p.isOut);

  const handleAddBall = async (result: string) => {
    if (!match.striker && result !== "WD" && result !== "NB") {
      toast({ variant: "destructive", title: "Set striker first", description: "Tap the striker name to pick a batter." });
      return;
    }
    setIsAddingBall(true);
    try {
      const res = await authFetch(`/api/live-scores/${id}/ball`, {
        method: "POST",
        body: JSON.stringify({ result, team: match.battingTeam }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
      setIsAddingBall(false);
    }
  };

  const setCurrentPlayers = async (updates: { striker?: string; nonStriker?: string; currentBowler?: string }) => {
    try {
      const res = await authFetch(`/api/live-scores/${id}/current`, {
        method: "PUT",
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error((await res.json()).error);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    }
  };

  const addPlayerToTeam = async (team: "A" | "B", name: string) => {
    if (!name.trim()) return;
    const existing = team === "A" ? match.teamAPlayers : match.teamBPlayers;
    if (existing.find(p => p.name.toLowerCase() === name.trim().toLowerCase())) {
      toast({ title: "Player already in team" }); return;
    }
    const newPlayer: Player = { name: name.trim(), runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false };
    const updated = team === "A"
      ? { teamAPlayers: [...match.teamAPlayers, newPlayer] }
      : { teamBPlayers: [...match.teamBPlayers, newPlayer] };
    try {
      const res = await authFetch(`/api/live-scores/${id}/players`, { method: "PUT", body: JSON.stringify(updated) });
      if (!res.ok) throw new Error((await res.json()).error);
      setNewPlayerName("");
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    }
  };

  const handleSwitchInnings = async () => {
    const newBatting = match.battingTeam === "A" ? "B" : "A";
    try {
      const res = await authFetch(`/api/live-scores/${id}`, { method: "PUT", body: JSON.stringify({ battingTeam: newBatting, striker: undefined, nonStriker: undefined, currentBowler: undefined }) });
      if (!res.ok) throw new Error((await res.json()).error);
      toast({ title: `${newBatting === "A" ? match.teamA : match.teamB} now batting` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    }
  };

  const handleEndMatch = async () => {
    setIsEnding(true);
    try {
      await authFetch(`/api/live-scores/${id}`, { method: "DELETE" });
      toast({ title: "Match ended." });
      setLocation("/profile");
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
      setIsEnding(false);
    }
  };

  const currentBattingTeamName = match.battingTeam === "A" ? match.teamA : match.teamB;
  const teamAOversStr = match.battingTeam === "A" ? match.overs : `${match.maxOvers}.0 / ${match.maxOvers}`;
  const teamBOversStr = match.battingTeam === "B" ? match.overs : `— / ${match.maxOvers}`;

  return (
    <div className="flex flex-col min-h-full pb-24">
      <Header title="Scorecard" showLocation={false} />

      {/* Live Score Banner */}
      <div className="bg-gradient-to-r from-red-600 to-orange-600 text-white px-4 pt-3 pb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-wider">Live</span>
            <span className="text-[10px] opacity-60 ml-1">{match.turfName}</span>
          </div>
          <Badge className="bg-white/20 border-0 text-white text-[10px]">
            <Radio className="h-2.5 w-2.5 mr-1 animate-pulse" /> Broadcasting
          </Badge>
        </div>

        {/* Score */}
        <div className="flex items-stretch gap-2 mb-2">
          <div className={cn("flex-1 bg-white/10 rounded-xl p-2.5 text-center", match.battingTeam === "A" ? "ring-2 ring-white/40" : "opacity-70")}>
            <p className="text-[10px] font-bold uppercase opacity-80 truncate mb-1">{match.teamA}</p>
            <p className="text-2xl font-bold">{match.scoreA}<span className="text-sm font-normal">/{match.wicketsA}</span></p>
            <p className="text-[10px] opacity-60">{teamAOversStr}</p>
            {match.battingTeam === "A" && <p className="text-[9px] font-bold text-green-300 mt-0.5">● BATTING</p>}
          </div>
          <div className="flex flex-col items-center justify-center px-1">
            <span className="text-xs opacity-40 font-bold">vs</span>
          </div>
          <div className={cn("flex-1 bg-white/10 rounded-xl p-2.5 text-center", match.battingTeam === "B" ? "ring-2 ring-white/40" : "opacity-70")}>
            <p className="text-[10px] font-bold uppercase opacity-80 truncate mb-1">{match.teamB}</p>
            <p className="text-2xl font-bold">{match.scoreB}<span className="text-sm font-normal">/{match.wicketsB}</span></p>
            <p className="text-[10px] opacity-60">{teamBOversStr}</p>
            {match.battingTeam === "B" && <p className="text-[9px] font-bold text-green-300 mt-0.5">● BATTING</p>}
          </div>
        </div>

        {/* Last 6 balls */}
        {match.balls.length > 0 && (
          <div className="flex gap-1.5 justify-center mt-2 flex-wrap">
            {match.balls.filter(b => b.team === match.battingTeam).slice(-6).map((b, i) => (
              <span key={i} className={cn("w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold", ballColor(b.result))}>{b.result}</span>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex bg-background border-b border-border">
        {(["score", "scorecard", "players"] as ActiveTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors",
              activeTab === tab ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab === "score" ? "Score" : tab === "scorecard" ? "Scorecard" : "Teams"}
          </button>
        ))}
      </div>

      <main className="flex-1 p-4 space-y-4">

        {/* SCORE TAB */}
        {activeTab === "score" && (
          <>
            {/* Current Players */}
            <Card className="overflow-hidden">
              <div className="p-3 bg-muted/30 border-b border-border">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{currentBattingTeamName} Batting</p>
              </div>
              <div className="divide-y divide-border/50">
                {/* Striker */}
                <button
                  className="w-full p-3 flex items-center justify-between hover:bg-muted/20 transition-colors"
                  onClick={() => setStrikerDialog(true)}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-primary bg-primary/10 rounded px-1.5 py-0.5">●</span>
                    <div className="text-left">
                      <p className="text-[10px] text-muted-foreground">Striker (Facing)</p>
                      <p className="font-bold text-sm">{match.striker || <span className="text-muted-foreground font-normal">Tap to select</span>}</p>
                    </div>
                  </div>
                  {match.striker && (() => {
                    const p = battingPlayers.find(p => p.name === match.striker);
                    return p ? <span className="text-xs text-muted-foreground font-mono">{p.runs}({p.balls})</span> : null;
                  })()}
                  <ChevronDown className="h-4 w-4 text-muted-foreground ml-2" />
                </button>
                {/* Non-striker */}
                <button
                  className="w-full p-3 flex items-center justify-between hover:bg-muted/20 transition-colors"
                  onClick={() => setNonStrikerDialog(true)}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground bg-muted rounded px-1.5 py-0.5">○</span>
                    <div className="text-left">
                      <p className="text-[10px] text-muted-foreground">Non-Striker</p>
                      <p className="font-bold text-sm">{match.nonStriker || <span className="text-muted-foreground font-normal">Tap to select</span>}</p>
                    </div>
                  </div>
                  {match.nonStriker && (() => {
                    const p = battingPlayers.find(p => p.name === match.nonStriker);
                    return p ? <span className="text-xs text-muted-foreground font-mono">{p.runs}({p.balls})</span> : null;
                  })()}
                  <ChevronDown className="h-4 w-4 text-muted-foreground ml-2" />
                </button>
                {/* Bowler */}
                <button
                  className="w-full p-3 flex items-center justify-between hover:bg-muted/20 transition-colors"
                  onClick={() => setBowlerDialog(true)}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-orange-600 bg-orange-100 dark:bg-orange-900/30 rounded px-1.5 py-0.5">⚡</span>
                    <div className="text-left">
                      <p className="text-[10px] text-muted-foreground">Bowler</p>
                      <p className="font-bold text-sm">{match.currentBowler || <span className="text-muted-foreground font-normal">Tap to select</span>}</p>
                    </div>
                  </div>
                  {match.currentBowler && (() => {
                    const b = match.bowlers.find(b => b.name === match.currentBowler);
                    return b ? <span className="text-xs text-muted-foreground font-mono">{formatOvers(b.legalBalls)}-{b.runs}-{b.wickets}W</span> : null;
                  })()}
                  <ChevronDown className="h-4 w-4 text-muted-foreground ml-2" />
                </button>
              </div>
            </Card>

            {/* Ball input */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">This Ball</p>
              <div className="grid grid-cols-9 gap-1.5">
                {BALL_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => handleAddBall(opt.value)}
                    disabled={isAddingBall}
                    className={cn("h-10 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-50 shadow-sm", opt.cls)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 gap-1.5 text-xs font-bold" onClick={handleSwitchInnings}>
                <ArrowLeftRight className="h-3.5 w-3.5" /> Switch Innings
              </Button>
              <Button variant="destructive" size="sm" className="flex-1 gap-1.5 text-xs font-bold" onClick={handleEndMatch} disabled={isEnding}>
                <X className="h-3.5 w-3.5" /> {isEnding ? "Ending..." : "End Match"}
              </Button>
            </div>
          </>
        )}

        {/* SCORECARD TAB */}
        {activeTab === "scorecard" && (
          <div className="space-y-4">
            {/* Batting scorecard */}
            {[match.teamA, match.teamB].map((teamName, ti) => {
              const isTeamA = ti === 0;
              const players: Player[] = isTeamA ? match.teamAPlayers : match.teamBPlayers;
              const score = isTeamA ? match.scoreA : match.scoreB;
              const wickets = isTeamA ? match.wicketsA : match.wicketsB;
              const batting = (isTeamA && match.battingTeam === "A") || (!isTeamA && match.battingTeam === "B");

              if (players.length === 0) return null;
              return (
                <Card key={teamName} className="overflow-hidden">
                  <div className="p-3 bg-muted/30 border-b border-border flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm">{teamName}</p>
                      <p className="text-xs text-muted-foreground">{score}/{wickets}</p>
                    </div>
                    {batting && <Badge className="bg-red-100 text-red-700 border-none text-[10px] dark:bg-red-900/30 dark:text-red-400">● Batting</Badge>}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border/50">
                          <th className="text-left p-2 text-muted-foreground font-medium">Batter</th>
                          <th className="p-2 text-right text-muted-foreground font-medium">R</th>
                          <th className="p-2 text-right text-muted-foreground font-medium">B</th>
                          <th className="p-2 text-right text-muted-foreground font-medium">4s</th>
                          <th className="p-2 text-right text-muted-foreground font-medium">6s</th>
                          <th className="p-2 text-right text-muted-foreground font-medium">SR</th>
                        </tr>
                      </thead>
                      <tbody>
                        {players.map(p => {
                          const isStriker = p.name === match.striker;
                          const isNonStriker = p.name === match.nonStriker;
                          const sr = p.balls > 0 ? ((p.runs / p.balls) * 100).toFixed(0) : "—";
                          return (
                            <tr key={p.name} className={cn("border-b border-border/30 last:border-0", isStriker || isNonStriker ? "bg-primary/5" : "")}>
                              <td className="p-2 font-medium">
                                <div className="flex items-center gap-1">
                                  {isStriker && <span className="text-primary text-[10px]">●</span>}
                                  {isNonStriker && <span className="text-muted-foreground text-[10px]">○</span>}
                                  <span className={p.isOut ? "line-through text-muted-foreground" : ""}>{p.name}</span>
                                  {p.isOut && <span className="text-[10px] text-muted-foreground ml-1">out</span>}
                                </div>
                              </td>
                              <td className="p-2 text-right font-bold">{p.runs}</td>
                              <td className="p-2 text-right text-muted-foreground">{p.balls}</td>
                              <td className="p-2 text-right text-muted-foreground">{p.fours}</td>
                              <td className="p-2 text-right text-muted-foreground">{p.sixes}</td>
                              <td className="p-2 text-right text-muted-foreground">{sr}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>
              );
            })}

            {/* Bowling */}
            {match.bowlers.length > 0 && (
              <Card className="overflow-hidden">
                <div className="p-3 bg-muted/30 border-b border-border">
                  <p className="font-bold text-sm">Bowling</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border/50">
                        <th className="text-left p-2 text-muted-foreground font-medium">Bowler</th>
                        <th className="p-2 text-right text-muted-foreground font-medium">O</th>
                        <th className="p-2 text-right text-muted-foreground font-medium">R</th>
                        <th className="p-2 text-right text-muted-foreground font-medium">W</th>
                        <th className="p-2 text-right text-muted-foreground font-medium">Eco</th>
                      </tr>
                    </thead>
                    <tbody>
                      {match.bowlers.map((b: Bowler) => {
                        const overs = formatOvers(b.legalBalls);
                        const oversFull = Math.floor(b.legalBalls / 6) + (b.legalBalls % 6) / 10;
                        const eco = oversFull > 0 ? (b.runs / oversFull).toFixed(1) : "—";
                        return (
                          <tr key={b.name} className={cn("border-b border-border/30 last:border-0", b.name === match.currentBowler ? "bg-orange-50 dark:bg-orange-900/10" : "")}>
                            <td className="p-2 font-medium">
                              <div className="flex items-center gap-1">
                                {b.name === match.currentBowler && <span className="text-orange-600 text-[10px]">⚡</span>}
                                {b.name}
                              </div>
                            </td>
                            <td className="p-2 text-right text-muted-foreground">{overs}</td>
                            <td className="p-2 text-right text-muted-foreground">{b.runs}</td>
                            <td className="p-2 text-right font-bold">{b.wickets}</td>
                            <td className="p-2 text-right text-muted-foreground">{eco}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* TEAMS TAB */}
        {activeTab === "players" && (
          <div className="space-y-4">
            {[{ team: "A" as const, name: match.teamA, players: match.teamAPlayers }, { team: "B" as const, name: match.teamB, players: match.teamBPlayers }].map(({ team, name, players }) => (
              <Card key={team} className="overflow-hidden">
                <div className="p-3 bg-muted/30 border-b border-border flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <p className="font-bold text-sm">{name}</p>
                  <Badge variant="secondary" className="text-[10px] ml-auto">{players.length} players</Badge>
                </div>
                <div className="p-3 space-y-2">
                  {players.map(p => (
                    <div key={p.name} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
                      <div className="flex items-center gap-2">
                        <div className={cn("h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold", p.isOut ? "bg-muted text-muted-foreground line-through" : "bg-primary/10 text-primary")}>
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                        <span className={cn("text-sm font-medium", p.isOut ? "line-through text-muted-foreground" : "")}>
                          {p.name}
                          {p.name === match.striker && <span className="text-primary ml-1 text-[10px]">●</span>}
                          {p.name === match.nonStriker && <span className="text-muted-foreground ml-1 text-[10px]">○</span>}
                        </span>
                      </div>
                      {(p.runs > 0 || p.balls > 0) && (
                        <span className="text-xs text-muted-foreground font-mono">{p.runs}({p.balls})</span>
                      )}
                    </div>
                  ))}
                  <div className="flex gap-2 pt-2">
                    <Input
                      placeholder="Add player name..."
                      className="h-8 text-xs flex-1"
                      value={newPlayerTeam === team ? newPlayerName : ""}
                      onFocus={() => setNewPlayerTeam(team)}
                      onChange={e => { setNewPlayerTeam(team); setNewPlayerName(e.target.value); }}
                      onKeyDown={e => { if (e.key === "Enter" && newPlayerTeam === team) { addPlayerToTeam(team, newPlayerName); } }}
                    />
                    <Button size="sm" className="h-8 px-3 text-xs gap-1" onClick={() => addPlayerToTeam(team, newPlayerTeam === team ? newPlayerName : "")}>
                      <Plus className="h-3.5 w-3.5" /> Add
                    </Button>
                  </div>
                </div>
              </Card>
            ))}

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 gap-1.5 font-bold text-sm" onClick={handleSwitchInnings}>
                <ArrowLeftRight className="h-4 w-4" /> Switch Innings
              </Button>
              <Button variant="destructive" className="flex-1 gap-1.5 font-bold text-sm" onClick={handleEndMatch} disabled={isEnding}>
                <X className="h-4 w-4" /> {isEnding ? "Ending..." : "End Match"}
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* Striker picker dialog */}
      <Dialog open={strikerDialog} onOpenChange={setStrikerDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Select Striker (Facing)</DialogTitle></DialogHeader>
          <div className="space-y-2 pt-2">
            {activeBatters.filter(p => p.name !== match.nonStriker).map(p => (
              <button
                key={p.name}
                className={cn("w-full flex items-center justify-between p-3 rounded-xl border transition-all hover:border-primary/50", match.striker === p.name ? "border-primary bg-primary/5" : "border-border")}
                onClick={() => { setCurrentPlayers({ striker: p.name }); setStrikerDialog(false); }}
              >
                <span className="font-bold">{p.name}</span>
                <span className="text-xs text-muted-foreground">{p.runs}({p.balls})</span>
              </button>
            ))}
            {activeBatters.length === 0 && <p className="text-center text-muted-foreground text-sm py-4">Add players in the Teams tab first</p>}
          </div>
        </DialogContent>
      </Dialog>

      {/* Non-striker dialog */}
      <Dialog open={nonStrikerDialog} onOpenChange={setNonStrikerDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Select Non-Striker</DialogTitle></DialogHeader>
          <div className="space-y-2 pt-2">
            {activeBatters.filter(p => p.name !== match.striker).map(p => (
              <button
                key={p.name}
                className={cn("w-full flex items-center justify-between p-3 rounded-xl border transition-all hover:border-primary/50", match.nonStriker === p.name ? "border-primary bg-primary/5" : "border-border")}
                onClick={() => { setCurrentPlayers({ nonStriker: p.name }); setNonStrikerDialog(false); }}
              >
                <span className="font-bold">{p.name}</span>
                <span className="text-xs text-muted-foreground">{p.runs}({p.balls})</span>
              </button>
            ))}
            {activeBatters.length === 0 && <p className="text-center text-muted-foreground text-sm py-4">Add players in the Teams tab first</p>}
          </div>
        </DialogContent>
      </Dialog>

      {/* Bowler dialog */}
      <Dialog open={bowlerDialog} onOpenChange={setBowlerDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Select / Change Bowler</DialogTitle></DialogHeader>
          <div className="space-y-2 pt-2">
            {match.bowlers.map(b => (
              <button
                key={b.name}
                className={cn("w-full flex items-center justify-between p-3 rounded-xl border transition-all hover:border-primary/50", match.currentBowler === b.name ? "border-primary bg-primary/5" : "border-border")}
                onClick={() => { setCurrentPlayers({ currentBowler: b.name }); setBowlerDialog(false); }}
              >
                <span className="font-bold">{b.name}</span>
                <span className="text-xs text-muted-foreground">{formatOvers(b.legalBalls)} ov · {b.runs}R · {b.wickets}W</span>
              </button>
            ))}
            {fieldingPlayers.filter(p => !match.bowlers.find(b => b.name === p.name)).map(p => (
              <button
                key={p.name}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-dashed border-border hover:border-primary/50 transition-all"
                onClick={() => { setCurrentPlayers({ currentBowler: p.name }); setBowlerDialog(false); }}
              >
                <span className="font-medium">{p.name}</span>
                <span className="text-xs text-muted-foreground">New bowler</span>
              </button>
            ))}
            <div className="pt-2 border-t border-border">
              <p className="text-[11px] text-muted-foreground mb-2">Or type a new bowler name:</p>
              <div className="flex gap-2">
                <Input placeholder="Bowler name" className="h-9 text-sm flex-1" value={newBowlerName} onChange={e => setNewBowlerName(e.target.value)} />
                <Button size="sm" className="h-9 px-3" onClick={() => {
                  if (newBowlerName.trim()) { setCurrentPlayers({ currentBowler: newBowlerName.trim() }); setNewBowlerName(""); setBowlerDialog(false); }
                }}>OK</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
