import { useState } from "react";
import { Link } from "wouter";
import { Header } from "@/components/layout/Header";
import { useListTurfs } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, MapPin, Star, Navigation, Loader2, AlertCircle } from "lucide-react";
import { useGeolocation } from "@/hooks/use-geolocation";

export default function Turfs() {
  const [search, setSearch] = useState("");
  const [sortByDistance, setSortByDistance] = useState(false);

  const { lat, lng, city, loading: locLoading, error: locError, request: requestLocation, permission } = useGeolocation(false);

  const { data: turfs, isLoading } = useListTurfs({
    search: search || undefined,
    ...(sortByDistance && lat && lng ? { lat: String(lat), lng: String(lng) } : {}),
  });

  function handleDistanceToggle() {
    if (!sortByDistance) {
      if (!lat) requestLocation();
      setSortByDistance(true);
    } else {
      setSortByDistance(false);
    }
  }

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Venues" showLocation={false} />

      <div className="p-4 bg-background sticky top-14 z-30 border-b border-border space-y-2">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or area..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 bg-muted/50 border-none rounded-xl"
            />
          </div>
          <Button
            variant={sortByDistance ? "default" : "outline"}
            size="icon"
            className="h-10 w-10 rounded-xl border-none shrink-0"
            onClick={handleDistanceToggle}
            title="Sort by distance"
          >
            {locLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Navigation className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Distance sort status bar */}
        {sortByDistance && (
          <div className="flex items-center gap-2 text-xs">
            {locLoading && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Getting location…
              </span>
            )}
            {locError && (
              <span className="flex items-center gap-1 text-amber-600">
                <AlertCircle className="h-3 w-3" /> {locError} — showing all turfs
              </span>
            )}
            {lat && lng && !locLoading && (
              <span className="flex items-center gap-1 text-primary font-medium">
                <Navigation className="h-3 w-3" /> Sorted by distance from {city ?? "your location"}
                <button onClick={() => setSortByDistance(false)} className="ml-1 text-muted-foreground hover:text-foreground">✕</button>
              </span>
            )}
          </div>
        )}

        {/* Prompt to enable location if not yet granted */}
        {sortByDistance && !lat && !locLoading && !locError && (
          <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-lg p-2">
            <Navigation className="h-4 w-4 text-primary shrink-0" />
            <p className="text-xs flex-1">Allow location access to sort by distance</p>
            <Button size="sm" className="h-6 text-xs px-2 rounded" onClick={requestLocation}>Allow</Button>
          </div>
        )}
      </div>

      <main className="flex-1 p-4 space-y-4">
        {isLoading ? (
          [1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 rounded-2xl bg-muted animate-pulse" />
          ))
        ) : turfs?.length === 0 ? (
          <div className="text-center py-10">
            <MapPin className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-3" />
            <h3 className="font-bold text-lg">No turfs found</h3>
            <p className="text-muted-foreground text-sm">Try adjusting your search filters.</p>
          </div>
        ) : (
          turfs?.map(turf => (
            <Link key={turf.id} href={`/turfs/${turf.id}`} className="block group">
              <Card className="border-none shadow-sm overflow-hidden flex flex-col sm:flex-row min-h-40">
                <div className="sm:w-1/3 relative bg-muted h-40 sm:h-auto">
                  {turf.images?.[0] ? (
                    <img src={turf.images[0]} alt={turf.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-secondary/10">
                      <MapPin className="h-6 w-6 text-muted-foreground/50" />
                    </div>
                  )}
                  {turf.featured && (
                    <div className="absolute top-2 left-2 bg-primary text-primary-foreground px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider">
                      Featured
                    </div>
                  )}
                </div>
                <CardContent className="sm:w-2/3 p-3 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-bold line-clamp-1">{turf.name}</h4>
                      <div className="flex items-center text-xs font-bold text-yellow-600 bg-yellow-500/10 px-1.5 py-0.5 rounded ml-1 shrink-0">
                        <Star className="h-3 w-3 fill-current mr-0.5" />
                        {turf.rating || "New"}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center mb-2 truncate">
                      <MapPin className="h-3 w-3 mr-1 shrink-0" /> {turf.area}
                      {turf.distanceKm != null && (
                        <span className="ml-1 flex items-center gap-0.5 text-primary font-semibold shrink-0">
                          <Navigation className="h-2.5 w-2.5" />{turf.distanceKm} km
                        </span>
                      )}
                    </p>
                    <div className="flex gap-1 flex-wrap">
                      {turf.amenities?.slice(0, 2).map((amenity, i) => (
                        <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
                          {amenity}
                        </Badge>
                      ))}
                      {turf.amenities && turf.amenities.length > 2 && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
                          +{turf.amenities.length - 2}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-end justify-between mt-2">
                    <span className="font-bold text-primary text-lg">₹{turf.pricePerHour}<span className="text-xs text-muted-foreground font-normal">/hr</span></span>
                    <Button size="sm" className="h-7 text-xs rounded-lg px-3">Book</Button>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </main>
    </div>
  );
}
