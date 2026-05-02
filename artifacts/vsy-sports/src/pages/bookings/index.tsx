import { useListBookings } from "@workspace/api-client-react";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, parseISO, isToday } from "date-fns";
import { MapPin, Calendar, Clock, ChevronRight, Radio } from "lucide-react";
import { Link } from "wouter";

export default function Bookings() {
  const { data: bookings, isLoading } = useListBookings();

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "confirmed": return "bg-green-500/10 text-green-600 border-green-500/20";
      case "pending": return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
      case "cancelled": return "bg-red-500/10 text-red-600 border-red-500/20";
      default: return "bg-muted text-muted-foreground border-border";
    }
  };

  const todayConfirmed = bookings?.filter(b => b.status === "confirmed" && isToday(parseISO(b.date)));
  const otherBookings = bookings?.filter(b => !(b.status === "confirmed" && isToday(parseISO(b.date))));

  return (
    <div className="flex flex-col min-h-full pb-20">
      <Header title="My Bookings" showLocation={false} />

      <main className="flex-1 p-4 space-y-4">
        {isLoading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="h-36 rounded-xl bg-muted animate-pulse" />
          ))
        ) : !bookings || bookings.length === 0 ? (
          <div className="text-center py-20">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-3" />
            <h3 className="font-bold text-lg">No bookings yet</h3>
            <p className="text-muted-foreground text-sm mb-6">You haven't booked any turfs yet.</p>
            <Link href="/turfs">
              <Button className="rounded-xl px-6 h-11 font-bold">Explore Venues</Button>
            </Link>
          </div>
        ) : (
          <>
            {/* Today's Confirmed Matches */}
            {todayConfirmed && todayConfirmed.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                  <h2 className="font-bold text-sm uppercase tracking-wider text-red-600">Today's Matches</h2>
                </div>
                {todayConfirmed.map(booking => (
                  <Link key={booking.id} href={`/booking/${booking.id}`} className="block mb-3">
                    <Card className="border-green-500/30 bg-gradient-to-br from-green-50/50 to-emerald-50/30 dark:from-green-950/30 shadow-sm overflow-hidden">
                      <div className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-bold text-base">{booking.turfName}</h4>
                              <Badge className="bg-green-500 text-white text-[10px] px-1.5">TODAY</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground flex items-center">
                              <MapPin className="h-3 w-3 mr-1" /> {booking.turfArea}
                            </p>
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </div>

                        <div className="flex gap-3 mb-3">
                          <div className="flex items-center text-sm bg-background/60 rounded-lg px-3 py-1.5 flex-1">
                            <Clock className="h-3.5 w-3.5 mr-2 text-primary" />
                            <span className="font-medium">{booking.startTime} – {booking.endTime}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-green-200/50">
                          <span className="font-bold text-primary text-lg">₹{booking.totalPrice}</span>
                          <Button size="sm" className="h-8 rounded-lg bg-green-600 hover:bg-green-700 gap-1.5 text-xs font-bold">
                            <Radio className="h-3.5 w-3.5" /> Go Live
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            )}

            {/* Other Bookings */}
            {otherBookings && otherBookings.length > 0 && (
              <div className="space-y-3">
                {todayConfirmed && todayConfirmed.length > 0 && (
                  <h2 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Past & Upcoming</h2>
                )}
                {otherBookings.map(booking => (
                  <Link key={booking.id} href={`/booking/${booking.id}`} className="block">
                    <Card className="border-border shadow-sm hover:border-primary/40 transition-colors">
                      <div className="flex gap-3 p-4">
                        {booking.turfImage && (
                          <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-muted">
                            <img src={booking.turfImage} alt={booking.turfName} className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-1">
                            <h4 className="font-bold text-sm leading-tight flex-1 pr-2 truncate">{booking.turfName}</h4>
                            <Badge variant="outline" className={`${getStatusStyle(booking.status)} capitalize text-[10px] font-bold px-2 py-0.5 flex-shrink-0`}>
                              {booking.status}
                            </Badge>
                          </div>

                          <p className="text-xs text-muted-foreground flex items-center mb-2">
                            <MapPin className="h-3 w-3 mr-1" /> {booking.turfArea}
                          </p>

                          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-primary" />
                              {format(parseISO(booking.date), "MMM dd, yyyy")}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-primary" />
                              {booking.startTime}
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="font-bold text-primary">₹{booking.totalPrice}</span>
                            {booking.status === "pending" && (
                              <span className="text-xs font-bold text-yellow-600 bg-yellow-500/10 px-2 py-0.5 rounded-full">
                                Pay Now
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
