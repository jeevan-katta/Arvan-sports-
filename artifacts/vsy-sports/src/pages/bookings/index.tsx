import { useListBookings } from "@workspace/api-client-react";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import { MapPin, Calendar, Clock, ChevronRight } from "lucide-react";
import { Link } from "wouter";

export default function Bookings() {
  const { data: bookings, isLoading } = useListBookings();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed": return "bg-green-500/10 text-green-600 border-green-500/20";
      case "pending": return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
      case "cancelled": return "bg-red-500/10 text-red-600 border-red-500/20";
      default: return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <div className="flex flex-col min-h-full">
      <Header title="My Bookings" showLocation={false} />
      
      <main className="flex-1 p-4 space-y-4">
        {isLoading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />
          ))
        ) : bookings?.length === 0 ? (
          <div className="text-center py-20">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-3" />
            <h3 className="font-bold text-lg">No bookings yet</h3>
            <p className="text-muted-foreground text-sm mb-6">You haven't booked any turfs yet.</p>
            <Link href="/turfs" className="inline-flex items-center justify-center h-10 px-6 font-medium bg-primary text-primary-foreground rounded-lg">
              Explore Venues
            </Link>
          </div>
        ) : (
          bookings?.map(booking => (
            <Link key={booking.id} href={`/booking/${booking.id}`} className="block">
                <Card className="border-border shadow-sm p-4 hover:border-primary/50 transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h4 className="font-bold text-base">{booking.turfName}</h4>
                      <p className="text-xs text-muted-foreground flex items-center mt-1">
                        <MapPin className="h-3 w-3 mr-1" /> {booking.turfArea}
                      </p>
                    </div>
                    <Badge variant="outline" className={`${getStatusColor(booking.status)} capitalize text-[10px] font-bold px-2 py-0.5`}>
                      {booking.status}
                    </Badge>
                  </div>
                  
                  <div className="bg-muted/50 rounded-lg p-3 grid grid-cols-2 gap-2 mb-3">
                    <div className="flex items-center text-sm">
                      <Calendar className="h-4 w-4 mr-2 text-primary" />
                      <span className="font-medium">{format(parseISO(booking.date), "MMM dd, yyyy")}</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <Clock className="h-4 w-4 mr-2 text-primary" />
                      <span className="font-medium">{booking.startTime}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
                    <span className="font-bold text-lg">₹{booking.totalPrice}</span>
                    <span className="text-xs text-muted-foreground flex items-center font-medium">
                      View Details <ChevronRight className="h-3 w-3 ml-1" />
                    </span>
                  </div>
                </Card>
            </Link>
          ))
        )}
      </main>
    </div>
  );
}