import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, MapPin, Star, ArrowRight, Users, Trophy, ShoppingBag, Navigation, Loader2, AlertCircle, Sparkles, Calendar, IndianRupee } from "lucide-react";
import { useListTurfs, useListEvents } from "@workspace/api-client-react";
import { Link } from "wouter";
import { useMemo, useState } from "react";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useLocation } from "wouter";

export default function Home() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const { lat, lng, city, loading: locLoading, error: locError, request: requestLocation } = useGeolocation(true);

  const { data: nearbyTurfs, isLoading: loadingNearby } = useListTurfs(
    lat && lng ? { lat: String(lat), lng: String(lng) } : {},
    { query: { enabled: !!(lat && lng) } }
  );

  const { data: topTurfs, isLoading: loadingTop } = useListTurfs(
    {},
    { query: { enabled: !(lat && lng) } }
  );

  const { data: featuredTurfs } = useListTurfs(
    { featured: "true" } as any,
    { query: { enabled: true } }
  );

  const { data: featuredEvents } = useListEvents({ featured: true });

  const features = [
    { name: "Book Venue", icon: MapPin, color: "bg-blue-500", href: "/turfs" },
    { name: "Find Players", icon: Users, color: "bg-primary", href: "/community" },
    { name: "Tournaments", icon: Trophy, color: "bg-purple-500", href: "/events" },
    { name: "Pro Shop", icon: ShoppingBag, color: "bg-green-500", href: "/shop" },
  ];

  const displayTurfs = nearbyTurfs ?? topTurfs;
  const isLoadingTurfs = lat && lng ? loadingNearby : loadingTop;
  const hasFeaturedTurfs = featuredTurfs && featuredTurfs.length > 0;
  const hasFeaturedEvents = featuredEvents && featuredEvents.length > 0;
  const searchQuery = search.trim().toLowerCase();
  const allSearchResults = useMemo(() => {
    const turfsArray = Array.isArray(displayTurfs) ? displayTurfs : [];
    const eventsArray = Array.isArray(featuredEvents) ? featuredEvents : [];

    const turfMatches = turfsArray.filter((turf: any) => {
      if (!searchQuery) return true;
      const haystack = [
        turf.name,
        turf.area,
        turf.city,
        turf.location,
        turf.address,
        turf.type,
        "turf",
        "venue",
        "ground",
        "box cricket",
        "book venue",
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(searchQuery);
    });

    const eventMatches = eventsArray.filter((event: any) => {
      if (!searchQuery) return true;
      const typeLabel = event.type === "tournament" ? "tournament event" : "event";
      const haystack = [
        event.title,
        event.description,
        event.venue,
        event.area,
        event.prize,
        typeLabel,
        "tournament",
        "tornament",
        "event",
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(searchQuery);
    });

    const searchIsEventLike =
      searchQuery.includes("tournament") ||
      searchQuery.includes("tornament") ||
      searchQuery.includes("event") ||
      searchQuery.includes("match") ||
      searchQuery.includes("cup") ||
      searchQuery.includes("league");
    const searchIsTurfLike =
      searchQuery.includes("turf") ||
      searchQuery.includes("venue") ||
      searchQuery.includes("ground") ||
      searchQuery.includes("box") ||
      searchQuery.includes("cricket");
    const shopMatch = searchQuery.includes("shop") || searchQuery.includes("store") || searchQuery.includes("product");
    const combinedMatches = searchQuery
      ? [...turfMatches, ...eventMatches]
      : [...turfsArray, ...eventsArray];
    return { turfMatches, eventMatches, shopMatch, searchIsEventLike, searchIsTurfLike, combinedMatches };
  }, [displayTurfs, featuredEvents, searchQuery]);

  return (
    <div className="flex flex-col min-h-full">
      <Header />

      <main className="flex-1 overflow-y-auto overflow-x-hidden pb-24 lg:pb-8">
        {/* Search Hero */}
        <div className="bg-secondary text-secondary-foreground px-4 sm:px-6 lg:px-10 py-6 pb-8 rounded-b-3xl relative overflow-hidden">
          <div className="w-full max-w-screen-2xl mx-auto">
          <div className="absolute top-0 right-0 opacity-10 pointer-events-none">
            <svg width="200" height="200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
          </div>
          <h2 className="text-2xl font-display font-bold mb-2 relative z-10">
            TIME TO <span className="text-primary">PLAY</span>.
          </h2>
          <p className="text-sm opacity-80 mb-6 relative z-10">Find premium box cricket turfs in Hyderabad.</p>
          <div className="relative z-10">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search turfs, areas, or events..."
              className="pl-9 bg-background/95 border-none shadow-sm text-foreground h-12 rounded-xl"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          {searchQuery && (
            <div className="relative z-10 mt-3 rounded-2xl bg-background/95 p-3 shadow-sm space-y-3 w-full max-w-4xl">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-2">Matching Venues</p>
                <div className="space-y-2">
                  {allSearchResults.turfMatches.length > 0 ? allSearchResults.turfMatches.slice(0, 3).map((turf: any) => (
                    <Link key={turf.id} href={`/turfs/${turf.id}`} className="flex items-center gap-3 rounded-xl border border-border p-2">
                      <div className="h-11 w-11 rounded-lg bg-muted overflow-hidden shrink-0">
                        {turf.images?.[0] ? <img src={turf.images[0]} alt={turf.name} className="h-full w-full object-cover" /> : <MapPin className="h-5 w-5 m-3 text-muted-foreground" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold truncate">{turf.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{turf.area || turf.city || "Turf"}</p>
                      </div>
                    </Link>
                  )) : <p className="text-xs text-muted-foreground">No matching venues.</p>}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-2">Matching Events</p>
                <div className="space-y-2">
                  {(allSearchResults.searchIsEventLike || allSearchResults.eventMatches.length > 0) ? allSearchResults.eventMatches.slice(0, 3).map((event: any) => (
                    <Link key={event.id} href={`/events/${event.id}`} className="flex items-center gap-3 rounded-xl border border-border p-2">
                      <div className="h-11 w-11 rounded-lg bg-muted overflow-hidden shrink-0 flex items-center justify-center">
                        {event.image ? <img src={event.image} alt={event.title} className="h-full w-full object-cover" /> : <Trophy className="h-5 w-5 text-primary" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold truncate">{event.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{event.type === "tournament" ? "Tournament" : "Event"}{event.venue ? ` · ${event.venue}` : ""}</p>
                      </div>
                    </Link>
                  )) : <p className="text-xs text-muted-foreground">No matching tournaments or events.</p>}
                </div>
              </div>
              <Button variant="secondary" className="w-full rounded-xl" onClick={() => navigate(allSearchResults.shopMatch ? "/shop" : allSearchResults.searchIsEventLike ? "/events" : "/turfs")}>
                Search all results
              </Button>
            </div>
          )}
          </div>
        </div>

        {/* ── Featured Turfs ── */}
        {hasFeaturedTurfs && (
          <div className="py-4 bg-gradient-to-b from-primary/5 to-transparent">
            <div className="px-4 sm:px-6 lg:px-10 flex items-center justify-between mb-3 w-full max-w-screen-2xl mx-auto">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary fill-primary/30" />
                <h3 className="font-bold text-lg">Featured Venues</h3>
              </div>
              <Link href="/turfs" className="text-sm text-primary font-semibold flex items-center">
                See All <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </div>
            <div className="grid grid-flow-col auto-cols-[minmax(240px,1fr)] gap-4 px-4 sm:px-6 lg:px-10 pb-2 overflow-x-auto snap-x hide-scrollbar w-full max-w-screen-2xl mx-auto lg:grid-flow-row lg:auto-cols-auto lg:grid-cols-2 xl:grid-cols-3">
              {Array.isArray(featuredTurfs) && featuredTurfs.map(turf => (
                <Link key={turf.id} href={`/turfs/${turf.id}`} className="snap-center">
                  <Card className="border border-primary/20 shadow-sm shadow-primary/10 overflow-hidden h-full">
                    <div className="relative h-32 bg-muted">
                      {turf.images?.[0] ? (
                        <img src={turf.images[0]} alt={turf.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-primary/5">
                          <MapPin className="h-8 w-8 text-primary/20" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute top-2 left-2 flex items-center gap-1 bg-primary text-primary-foreground px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider">
                        <Sparkles className="h-2.5 w-2.5" /> Featured
                      </div>
                      {turf.rating && (
                        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded-md text-xs font-bold flex items-center gap-0.5 text-white">
                          <Star className="h-2.5 w-2.5 text-yellow-400 fill-yellow-400" />
                          {turf.rating}
                        </div>
                      )}
                    </div>
                    <CardContent className="p-3">
                      <h4 className="font-bold text-sm truncate">{turf.name}</h4>
                      <p className="text-xs text-muted-foreground flex items-center mt-0.5 truncate">
                        <MapPin className="h-3 w-3 mr-1 shrink-0" />{turf.area}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="font-bold text-primary text-sm">₹{turf.pricePerHour}<span className="text-[10px] text-muted-foreground font-normal">/hr</span></span>
                        <Button size="sm" className="h-6 text-[10px] rounded-full px-3">Book</Button>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── Nearby / Top-rated Turfs ── */}
        <div className="py-4">
          <div className="px-4 sm:px-6 lg:px-10 flex items-center justify-between mb-3 w-full max-w-screen-2xl mx-auto">
            <div className="flex items-center gap-2">
              <Navigation className="h-4 w-4 text-primary" />
              <h3 className="font-bold text-lg">
                {lat && lng ? "Nearby Venues" : "Top Rated Venues"}
              </h3>
              {lat && lng && city && (
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  near {city}
                </span>
              )}
            </div>
            <Link href="/turfs" className="text-sm text-primary font-semibold flex items-center">
              See All <ArrowRight className="h-3 w-3 ml-1" />
            </Link>
          </div>

          {/* Location prompt */}
          {!lat && !locLoading && (
            <div className="mx-4 sm:mx-6 lg:mx-10 mb-3 flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-xl p-3 w-full max-w-screen-2xl">
              {locError ? (
                <>
                  <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold">Location access denied</p>
                    <p className="text-xs text-muted-foreground">Showing top-rated venues instead</p>
                  </div>
                </>
              ) : (
                <>
                  <Navigation className="h-5 w-5 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold">Find turfs near you</p>
                    <p className="text-xs text-muted-foreground">Enable location for distance-sorted results</p>
                  </div>
                  <Button size="sm" className="h-7 text-xs rounded-full px-3 shrink-0" onClick={requestLocation}>
                    Enable
                  </Button>
                </>
              )}
            </div>
          )}

          {locLoading && (
            <div className="mx-4 mb-3 flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Getting your location…
            </div>
          )}

          <div className="grid grid-flow-col auto-cols-[minmax(260px,1fr)] gap-4 px-4 sm:px-6 lg:px-10 pb-4 overflow-x-auto snap-x hide-scrollbar w-full max-w-screen-2xl mx-auto lg:grid-flow-row lg:auto-cols-auto lg:grid-cols-2 xl:grid-cols-3">
            {isLoadingTurfs ? (
              [1, 2, 3].map(i => (
                <div key={i} className="min-w-[260px] h-64 rounded-2xl bg-muted animate-pulse snap-center" />
              ))
            ) : displayTurfs?.slice(0, 6).map(turf => (
              <Link key={turf.id} href={`/turfs/${turf.id}`} className="snap-center">
                <Card className="border-none shadow-sm overflow-hidden h-full">
                  <div className="relative h-36 bg-muted">
                    {turf.images?.[0] ? (
                      <img src={turf.images[0]} alt={turf.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-secondary/10">
                        <MapPin className="h-8 w-8 text-muted-foreground/50" />
                      </div>
                    )}
                    <div className="absolute top-2 left-2 bg-background/90 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1">
                      <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                      {turf.rating || "New"}
                    </div>
                    {turf.distanceKm != null ? (
                      <div className="absolute top-2 right-2 bg-primary text-primary-foreground px-2 py-1 rounded-md text-[10px] font-bold flex items-center gap-1">
                        <Navigation className="h-2.5 w-2.5" />
                        {turf.distanceKm} km
                      </div>
                    ) : turf.featured ? (
                      <div className="absolute top-2 right-2 bg-primary text-primary-foreground px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider">
                        Featured
                      </div>
                    ) : null}
                  </div>
                  <CardContent className="p-3">
                    <h4 className="font-bold truncate">{turf.name}</h4>
                    <p className="text-xs text-muted-foreground flex items-center mt-1 truncate">
                      <MapPin className="h-3 w-3 mr-1 shrink-0" />
                      {turf.area}
                      {turf.distanceKm != null && (
                        <span className="ml-1 text-primary font-semibold">• {turf.distanceKm} km away</span>
                      )}
                    </p>
                    <div className="flex items-center justify-between mt-3">
                      <span className="font-bold text-primary">₹{turf.pricePerHour}<span className="text-xs text-muted-foreground font-normal">/hr</span></span>
                      <Button size="sm" variant="secondary" className="h-7 text-xs rounded-full px-4">Book</Button>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* ── Featured Tournaments & Events ── */}
        {hasFeaturedEvents && (
          <div className="py-4 bg-muted/30">
            <div className="px-4 sm:px-6 lg:px-10 flex items-center justify-between mb-4 w-full max-w-screen-2xl mx-auto">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-primary" />
                <h3 className="font-bold text-lg">Featured Tournaments</h3>
              </div>
              <Link href="/events" className="text-sm text-primary font-semibold flex items-center">
                See All <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </div>
            <div className="px-4 sm:px-6 lg:px-10 space-y-3 w-full max-w-screen-2xl mx-auto">
              {Array.isArray(featuredEvents) && featuredEvents.slice(0, 3).map(event => (
                <Link key={event.id} href={`/events/${event.id}`} className="block">
                  <Card className="border-none shadow-sm overflow-hidden">
                    {/* Cover photo if available */}
                    {event.image && (
                      <div className="relative h-36 overflow-hidden">
                        <img src={event.image} alt={event.title} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                        <div className="absolute bottom-3 left-3 right-3">
                          <p className="text-white font-bold text-sm leading-tight">{event.title}</p>
                          {event.prize && (
                            <p className="text-primary text-xs font-black mt-0.5">Win {event.prize}</p>
                          )}
                        </div>
                        <div className="absolute top-3 right-3 bg-primary/90 text-primary-foreground text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                          <Sparkles className="h-2.5 w-2.5" /> Featured
                        </div>
                      </div>
                    )}
                    <div className={event.image ? "p-3 bg-gradient-to-r from-secondary to-secondary/90 text-secondary-foreground" : "bg-gradient-to-r from-secondary to-secondary/90 text-secondary-foreground"}>
                      <div className={event.image ? "flex items-center gap-3" : "flex p-3"}>
                        {!event.image && (
                          <div className="h-20 w-20 rounded-lg bg-black/20 flex-shrink-0 flex flex-col items-center justify-center">
                            <span className="text-xs uppercase font-bold text-primary">{new Date(event.date).toLocaleString('default', { month: 'short' })}</span>
                            <span className="text-2xl font-display font-bold leading-none">{new Date(event.date).getDate()}</span>
                          </div>
                        )}
                        <div className={event.image ? "flex-1 flex items-center justify-between gap-2" : "ml-3 flex-1 overflow-hidden"}>
                          {!event.image && (
                            <div>
                              <h4 className="font-bold truncate">{event.title}</h4>
                              <p className="text-xs text-secondary-foreground/70 flex items-center mt-1 truncate">
                                <MapPin className="h-3 w-3 mr-1" /> {event.venue}
                              </p>
                              {event.prize && (
                                <p className="text-xs font-bold text-primary mt-1">Win {event.prize}</p>
                              )}
                            </div>
                          )}
                          <div className={event.image ? "flex items-center gap-3 w-full" : "flex items-center justify-between mt-2"}>
                            <div className="flex items-center gap-1 text-xs text-secondary-foreground/60">
                              <Calendar className="h-3 w-3" />
                              {new Date(event.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                              {event.venue && <><span className="mx-1">·</span><MapPin className="h-3 w-3" /><span className="truncate max-w-[80px]">{event.venue}</span></>}
                            </div>
                            {event.entryFee > 0 && (
                              <span className="text-xs font-bold text-primary flex items-center gap-0.5">
                                <IndianRupee className="h-3 w-3" />{event.entryFee} entry
                              </span>
                            )}
                            <span className="text-xs font-bold bg-primary/20 text-primary px-2 py-0.5 rounded-full ml-auto">
                              {event.currentParticipants} joined
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Fallback: show upcoming events even if none are featured */}
        {!hasFeaturedEvents && (
          <div className="py-4 bg-muted/30">
            <div className="px-4 sm:px-6 lg:px-10 flex items-center justify-between mb-4 w-full max-w-screen-2xl mx-auto">
              <h3 className="font-bold text-lg">Upcoming Tournaments</h3>
              <Link href="/events" className="text-sm text-primary font-semibold flex items-center">
                See All <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </div>
            <div className="px-4 sm:px-6 lg:px-10 w-full max-w-screen-2xl mx-auto">
              <div className="rounded-2xl bg-gradient-to-r from-secondary to-secondary/80 p-5 text-center">
                <Trophy className="h-10 w-10 mx-auto text-primary mb-2" />
                <p className="font-bold text-sm">No featured tournaments yet</p>
                <p className="text-xs text-muted-foreground mt-1">Check back soon for upcoming events</p>
                <Link href="/events">
                  <Button size="sm" className="mt-3 gap-1.5 text-xs"><ArrowRight className="h-3 w-3" /> Browse All Events</Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
