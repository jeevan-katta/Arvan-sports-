import { useState } from "react";
import { Link } from "wouter";
import { Header } from "@/components/layout/Header";
import { useListTurfs } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, MapPin, Star, Filter } from "lucide-react";

export default function Turfs() {
  const [search, setSearch] = useState("");
  
  const { data: turfs, isLoading } = useListTurfs({
    search: search || undefined
  });

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Venues" showLocation={false} />
      
      <div className="p-4 bg-background sticky top-14 z-30 border-b border-border">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by name or area..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 bg-muted/50 border-none rounded-xl"
            />
          </div>
          <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl bg-muted/50 border-none">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
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
                <Card className="border-none shadow-sm overflow-hidden flex flex-row h-36">
                  <div className="w-1/3 relative bg-muted">
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
                  <CardContent className="w-2/3 p-3 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="font-bold line-clamp-1">{turf.name}</h4>
                        <div className="flex items-center text-xs font-bold text-yellow-600 bg-yellow-500/10 px-1.5 py-0.5 rounded">
                          <Star className="h-3 w-3 fill-current mr-0.5" />
                          {turf.rating || "New"}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center mb-2 truncate">
                        <MapPin className="h-3 w-3 mr-1" /> {turf.area} • {turf.distanceKm}km away
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