import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, MapPin, Star, ArrowRight, Users, Trophy, ShoppingBag, Navigation, Loader2, AlertCircle } from "lucide-react";
import { useListTurfs, useListEvents, getListTurfsQueryKey, getListEventsQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useLocation } from "wouter";

export default function Home() {
  const [, navigate] = useLocation();
  const { lat, lng, city, loading: locLoading, error: locError, request: requestLocation } = useGeolocation(true);

  const nearbyParams = lat && lng ? { lat, lng } : {};
  const { data: nearbyTurfs, isLoading: loadingNearby } = useListTurfs(
    nearbyParams,
    { query: { queryKey: getListTurfsQueryKey(nearbyParams), enabled: !!(lat && lng) } }
  );

  const { data: topTurfs, isLoading: loadingTop } = useListTurfs(
    {},
    { query: { queryKey: getListTurfsQueryKey(), enabled: !(lat && lng) } }
  );

  const eventsParams = { featured: true };
  const { data: events } = useListEvents(eventsParams, {
    query: { queryKey: getListEventsQueryKey(eventsParams) }
  });

  const features = [
    { name: "Book Venue", icon: MapPin, color: "bg-blue-500", href: "/turfs" },
    { name: "Find Players", icon: Users, color: "bg-primary", href: "/community" },
    { name: "Tournaments", icon: Trophy, color: "bg-purple-500", href: "/events" },
    { name: "Pro Shop", icon: ShoppingBag, color: "bg-green-500", href: "/shop" },
  ];

  const displayTurfs = nearbyTurfs ?? topTurfs;
  const isLoadingTurfs = lat && lng ? loadingNearby : loadingTop;

  return (
    <div className="flex flex-col min-h-full">
      <Header />

      <main className="flex-1 overflow-y-auto overflow-x-hidden pb-4">
        {/* Search Hero */}
        <div className="bg-secondary text-secondary-foreground px-4 py-6 pb-8 rounded-b-3xl relative overflow-hidden">
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
              onFocus={() => navigate("/turfs")}
              readOnly
            />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="px-4 py-6">
          <div className="grid grid-cols-4 gap-3">
            {features.map((feature) => (
              <Link key={feature.name} href={feature.href} className="flex flex-col items-center gap-2 group">
                <div className={`${feature.color} w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform duration-200`}>
                  <feature.icon className="h-6 w-6" />
                </div>
                <span className="text-xs font-semibold text-center leading-tight">{feature.name}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Nearby Turfs Section */}
        <div className="py-4">
          <div className="px-4 flex items-center justify-between mb-3">
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
            <div className="mx-4 mb-3 flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-xl p-3">
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

          <div className="flex overflow-x-auto gap-4 px-4 pb-4 snap-x hide-scrollbar">
            {isLoadingTurfs ? (
              [1, 2, 3].map(i => (
                <div key={i} className="min-w-[260px] h-64 rounded-2xl bg-muted animate-pulse snap-center" />
              ))
            ) : displayTurfs?.slice(0, 6).map(turf => (
              <Link key={turf.id} href={`/turfs/${turf.id}`} className="min-w-[260px] snap-center">
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

        {/* Featured Events */}
        <div className="py-4 bg-muted/30">
          <div className="px-4 flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg">Upcoming Tournaments</h3>
            <Link href="/events" className="text-sm text-primary font-semibold flex items-center">
              See All <ArrowRight className="h-3 w-3 ml-1" />
            </Link>
          </div>
          <div className="px-4 space-y-3">
            {!events ? (
              <div className="h-24 rounded-xl bg-muted animate-pulse" />
            ) : events?.slice(0, 2).map(event => (
              <Link key={event.id} href={`/events/${event.id}`} className="block">
                <Card className="border-none shadow-sm overflow-hidden bg-gradient-to-r from-secondary to-secondary/90 text-secondary-foreground">
                  <div className="flex p-3">
                    <div className="h-20 w-20 rounded-lg bg-black/20 flex-shrink-0 flex flex-col items-center justify-center">
                      <span className="text-xs uppercase font-bold text-primary">{new Date(event.date).toLocaleString('default', { month: 'short' })}</span>
                      <span className="text-2xl font-display font-bold leading-none">{new Date(event.date).getDate()}</span>
                    </div>
                    <div className="ml-3 flex-1 overflow-hidden">
                      <h4 className="font-bold truncate">{event.title}</h4>
                      <p className="text-xs text-secondary-foreground/70 flex items-center mt-1 truncate">
                        <MapPin className="h-3 w-3 mr-1" /> {event.venue}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex -space-x-2">
                          {[1, 2, 3].map(i => (
                            <div key={i} className="w-6 h-6 rounded-full bg-muted border-2 border-secondary flex items-center justify-center text-[8px] text-muted-foreground font-bold">{i}</div>
                          ))}
                          <div className="w-6 h-6 rounded-full bg-primary border-2 border-secondary flex items-center justify-center text-[8px] text-primary-foreground font-bold">
                            +{event.currentParticipants}
                          </div>
                        </div>
                        <span className="text-xs font-bold text-primary">Win {event.prize}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
