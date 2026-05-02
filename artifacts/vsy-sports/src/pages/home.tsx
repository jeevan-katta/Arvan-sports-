import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, MapPin, Star, ArrowRight, ShieldCheck, Zap, Users, Trophy, ShoppingBag } from "lucide-react";
import { useListTurfs, useListEvents } from "@workspace/api-client-react";
import { Link } from "wouter";

export default function Home() {
  const { data: turfs, isLoading: loadingTurfs } = useListTurfs({
    // Just fetch some for home page
  });

  const { data: events, isLoading: loadingEvents } = useListEvents({
    featured: true
  });

  const features = [
    { name: "Book Venue", icon: MapPin, color: "bg-blue-500", href: "/turfs" },
    { name: "Find Players", icon: Users, color: "bg-primary", href: "/community" },
    { name: "Tournaments", icon: Trophy, color: "bg-purple-500", href: "/events" },
    { name: "Pro Shop", icon: ShoppingBag, color: "bg-green-500", href: "/shop" },
  ];

  return (
    <div className="flex flex-col min-h-full">
      <Header />
      
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        {/* Search Hero */}
        <div className="bg-secondary text-secondary-foreground px-4 py-6 pb-8 rounded-b-3xl relative overflow-hidden">
          <div className="absolute top-0 right-0 opacity-10 pointer-events-none">
            <svg width="200" height="200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
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
            />
          </div>
        </div>

        {/* Quick Actions Grid */}
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

        {/* Featured Turfs */}
        <div className="py-4">
          <div className="px-4 flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg">Top Rated Venues</h3>
            <Link href="/turfs" className="text-sm text-primary font-semibold flex items-center">
              See All <ArrowRight className="h-3 w-3 ml-1" />
            </Link>
          </div>
          
          <div className="flex overflow-x-auto gap-4 px-4 pb-4 snap-x hide-scrollbar">
            {loadingTurfs ? (
              [1, 2, 3].map(i => (
                <div key={i} className="min-w-[260px] h-64 rounded-2xl bg-muted animate-pulse snap-center" />
              ))
            ) : turfs?.slice(0, 5).map(turf => (
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
                      {turf.featured && (
                        <div className="absolute top-2 right-2 bg-primary text-primary-foreground px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider">
                          Featured
                        </div>
                      )}
                    </div>
                    <CardContent className="p-3">
                      <h4 className="font-bold truncate">{turf.name}</h4>
                      <p className="text-xs text-muted-foreground flex items-center mt-1 truncate">
                        <MapPin className="h-3 w-3 mr-1" /> {turf.area} • {turf.distanceKm}km away
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
            {loadingEvents ? (
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
                              <div key={i} className="w-6 h-6 rounded-full bg-muted border-2 border-secondary flex items-center justify-center text-[8px] text-muted-foreground font-bold">
                                {i}
                              </div>
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

