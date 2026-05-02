import { useLiveScores, ballColor } from "@/hooks/use-live-scores";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Activity, Wifi, WifiOff } from "lucide-react";

export function LiveScoresWidget() {
  const { matches, connected } = useLiveScores();

  const liveMatches = matches.filter(m => m.status === "live");

  if (liveMatches.length === 0) return null;

  return (
    <div className="px-4 pt-3 pb-1">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
          </span>
          <span className="text-sm font-bold uppercase tracking-wider text-red-500">Live Scores</span>
        </div>
        {connected ? (
          <Wifi className="h-3.5 w-3.5 text-green-500" />
        ) : (
          <WifiOff className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
        {liveMatches.map(match => {
          const lastBalls = (match.balls || []).slice(-6);
          const battingScore = match.battingTeam === "A" ? match.scoreA : match.scoreB;
          const battingWickets = match.battingTeam === "A" ? match.wicketsA : match.wicketsB;
          const battingTeamName = match.battingTeam === "A" ? match.teamA : match.teamB;

          return (
            <Card key={match.id} className="flex-shrink-0 w-72 p-3 border-none shadow-md bg-gradient-to-br from-card to-primary/5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-muted-foreground truncate">{match.turfName}</span>
                <Badge className="bg-red-500/10 text-red-500 border-red-500/20 text-[10px] py-0">LIVE</Badge>
              </div>

              <div className="flex items-center justify-between mb-2">
                <div className="flex-1 text-center">
                  <p className="font-bold text-sm truncate">{match.teamA}</p>
                  <p className="text-xl font-display font-bold text-primary">
                    {match.scoreA}<span className="text-sm font-normal text-muted-foreground">/{match.wicketsA}</span>
                  </p>
                </div>
                <div className="px-2 text-center">
                  <Activity className="h-4 w-4 text-muted-foreground mx-auto" />
                  <p className="text-[10px] text-muted-foreground mt-0.5">{match.overs}</p>
                </div>
                <div className="flex-1 text-center">
                  <p className="font-bold text-sm truncate">{match.teamB}</p>
                  <p className="text-xl font-display font-bold text-foreground">
                    {match.scoreB}<span className="text-sm font-normal text-muted-foreground">/{match.wicketsB}</span>
                  </p>
                </div>
              </div>

              {lastBalls.length > 0 && (
                <div className="mt-1.5">
                  <p className="text-[9px] font-bold text-muted-foreground uppercase mb-1">
                    {battingTeamName} batting · {battingScore}/{battingWickets}
                  </p>
                  <div className="flex gap-1">
                    {lastBalls.map((b, i) => (
                      <span key={i} className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${ballColor(b.result)}`}>
                        {b.result}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
