import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Trophy, Users, ChevronRight, Clock, Shield, Building2, Wrench, Megaphone, Pin } from "lucide-react";
import { format, parseISO } from "date-fns";

const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  event:       { label: "Event",       color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
  tournament:  { label: "Tournament",  color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  maintenance: { label: "Maintenance", color: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20" },
};

export default function Events() {
  const { data: events = [], isLoading: eventsLoading } = useQuery<any[]>({
    queryKey: ["public-events"],
    queryFn: () => fetch("/api/events").then(r => r.json()),
  });

  const { data: announcements = [] } = useQuery<any[]>({
    queryKey: ["announcements"],
    queryFn: () => fetch("/api/announcements").then(r => r.json()),
  });

  const featuredEvents = events.filter(e => e.featured);
  const regularEvents  = events.filter(e => !e.featured);
  const pinnedAnnouncements = announcements.filter((a: any) => a.pinned).slice(0, 2);

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Tournaments & Events" showLocation={false} />
      
      <main className="flex-1 pb-4">
        {eventsLoading ? (
          <div className="p-4 space-y-4">
            <div className="h-64 rounded-2xl bg-muted animate-pulse" />
            <div className="h-32 rounded-2xl bg-muted animate-pulse" />
            <div className="h-32 rounded-2xl bg-muted animate-pulse" />
          </div>
        ) : (
          <>
            {/* Pinned announcements */}
            {pinnedAnnouncements.length > 0 && (
              <div className="p-4 pb-0 space-y-2">
                {pinnedAnnouncements.map((ann: any) => (
                  <div key={ann.id} className="flex items-start gap-3 bg-primary/5 border border-primary/20 rounded-2xl p-3.5">
                    <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Megaphone className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Pin className="h-3 w-3 text-primary" />
                        <p className="text-xs font-black text-primary uppercase tracking-wider">Pinned · {ann.createdByRole === "admin" ? "Admin" : ann.createdByName}</p>
                      </div>
                      <p className="font-bold text-sm">{ann.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{ann.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Featured Events Banner */}
            {featuredEvents.length > 0 && (
              <div className="p-4 bg-muted/20">
                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center">
                  <Trophy className="h-4 w-4 mr-2 text-primary" />
                  Featured Tournament
                </h3>
                
                {featuredEvents.map(event => (
                  <Link key={event.id} href={`/events/${event.id}`} className="block group">
                    <Card className="border-none shadow-md overflow-hidden relative">
                      <div className="h-48 bg-secondary/80 relative">
                        {event.image ? (
                          <img src={event.image} alt={event.title} className="w-full h-full object-cover mix-blend-overlay opacity-50" />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-tr from-secondary to-primary/30" />
                        )}
                        <div className="absolute top-3 left-3 flex gap-1.5">
                          <div className="bg-primary text-primary-foreground px-2 py-1 rounded text-xs font-bold uppercase">
                            {event.status}
                          </div>
                          {event.type && event.type !== "event" && (
                            <div className={`px-2 py-1 rounded text-xs font-bold uppercase border ${TYPE_CONFIG[event.type]?.color || ""}`}>
                              {TYPE_CONFIG[event.type]?.label}
                            </div>
                          )}
                        </div>
                        {event.createdByRole === "owner" && (
                          <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/40 rounded-full px-2 py-0.5">
                            <Building2 className="h-3 w-3 text-white/70" />
                            <span className="text-[9px] text-white/70 font-bold">{event.createdByName}</span>
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent text-white">
                          <h2 className="text-xl font-display font-bold leading-tight mb-1">{event.title}</h2>
                          <div className="flex items-center text-sm opacity-90">
                            <MapPin className="h-3.5 w-3.5 mr-1" />
                            {event.venue}
                          </div>
                        </div>
                      </div>
                      <CardContent className="p-4 bg-card grid grid-cols-3 divide-x border-t border-border">
                        <div className="flex flex-col items-center justify-center px-2">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Date</span>
                          <span className="text-sm font-bold">{format(parseISO(event.date), "MMM dd")}</span>
                        </div>
                        <div className="flex flex-col items-center justify-center px-2">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Prize</span>
                          <span className="text-sm font-bold text-primary">{event.prize || "—"}</span>
                        </div>
                        <div className="flex flex-col items-center justify-center px-2">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Entry Fee</span>
                          <span className="text-sm font-bold">₹{event.entryFee || 0}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}

            {/* All Events */}
            <div className="p-4 pt-2 space-y-3">
              <h3 className="font-bold text-lg mb-2">Upcoming Events</h3>
              
              {regularEvents.length === 0 ? (
                <div className="text-center py-10 bg-muted/30 rounded-xl border border-dashed">
                  <Calendar className="h-10 w-10 mx-auto text-muted-foreground opacity-50 mb-2" />
                  <p className="text-sm text-muted-foreground">No other events currently scheduled.</p>
                </div>
              ) : (
                regularEvents.map(event => {
                  const typeCfg = TYPE_CONFIG[event.type] || TYPE_CONFIG.event;
                  return (
                    <Link key={event.id} href={`/events/${event.id}`} className="block">
                      <Card className="border-border shadow-sm p-4 hover:border-primary/50 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-bold leading-tight max-w-[70%]">{event.title}</h4>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${typeCfg.color}`}>
                              {typeCfg.label}
                            </span>
                            <Badge variant="outline" className="text-[10px] capitalize px-1.5 py-0">
                              {event.status}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-y-1 gap-x-2 text-xs text-muted-foreground mb-3">
                          <div className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1 text-primary" />
                            {format(parseISO(event.date), "MMM dd, yyyy")}
                          </div>
                          <div className="flex items-center">
                            <Clock className="h-3 w-3 mr-1 text-primary" />
                            {event.time || "TBD"}
                          </div>
                          <div className="flex items-center col-span-2 mt-1">
                            <MapPin className="h-3 w-3 mr-1 text-primary flex-shrink-0" />
                            <span className="truncate">{[event.venue, event.area].filter(Boolean).join(", ")}</span>
                          </div>
                          {event.createdByRole === "owner" && event.createdByName && (
                            <div className="flex items-center col-span-2 mt-0.5 text-primary/60">
                              <Building2 className="h-3 w-3 mr-1" />
                              <span>By {event.createdByName}</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between pt-3 border-t border-border/50">
                          <div className="flex items-center gap-3">
                            {event.prize && (
                              <div className="text-xs font-bold bg-primary/10 text-primary px-2 py-1 rounded">
                                Win {event.prize}
                              </div>
                            )}
                            <div className="text-xs text-muted-foreground flex items-center">
                              <Users className="h-3 w-3 mr-1" />
                              {event.currentParticipants || 0}/{event.maxParticipants || "∞"}
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </Card>
                    </Link>
                  );
                })
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
