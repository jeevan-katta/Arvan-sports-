import { useParams, Link } from "wouter";
import { format, parseISO } from "date-fns";
import { useGetEvent, useJoinEvent } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ChevronLeft, MapPin, Calendar, Clock, Trophy, Users, Info, Ticket } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetEventQueryKey } from "@workspace/api-client-react";

export default function EventDetail() {
  const { id } = useParams();
  const eventId = id || "";
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: event, isLoading } = useGetEvent(eventId, {
    query: { enabled: !!eventId } as any
  });

  const joinMutation = useJoinEvent();

  const handleJoin = () => {
    if (!user) {
      toast({ title: "Login required", description: "Please login to register for this event." });
      return;
    }

    joinMutation.mutate({ id: eventId }, {
      onSuccess: () => {
        toast({ title: "Registration successful!", description: "You are now registered for this event." });
        queryClient.invalidateQueries({ queryKey: getGetEventQueryKey(eventId) });
      },
      onError: (error) => {
        toast({ variant: "destructive", title: "Registration failed", description: error.message });
      }
    });
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center">Loading...</div>;
  if (!event) return <div className="h-screen flex items-center justify-center">Event not found</div>;

  const isFull = event.currentParticipants && event.maxParticipants && event.currentParticipants >= event.maxParticipants;
  const isRegistered = event.participants?.some(p => p.id === user?.id);

  return (
    <div className="flex flex-col min-h-screen bg-background pb-24">
      {/* Hero Image */}
      <div className="relative h-64 bg-secondary w-full">
        <Link href="/events" className="absolute top-4 left-4 z-10 bg-background/50 backdrop-blur-md hover:bg-background/80 rounded-full p-2 text-foreground">
            <ChevronLeft className="h-6 w-6" />
        </Link>
        
        {event.image ? (
          <img src={event.image} alt={event.title} className="w-full h-full object-cover mix-blend-overlay opacity-60" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-secondary to-primary/30" />
        )}
        
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 pt-20">
          <Badge className="bg-primary hover:bg-primary text-primary-foreground mb-2">
            {event.status}
          </Badge>
          <h1 className="text-2xl md:text-3xl font-bold font-display tracking-wide text-white leading-tight">
            {event.title}
          </h1>
        </div>
      </div>

      <div className="p-4 space-y-6 -mt-2 relative z-10">
        {/* Key Info Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-3 border-none shadow-md flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-bold">Prize Pool</p>
              <p className="text-sm font-bold leading-tight">{event.prize}</p>
            </div>
          </Card>
          <Card className="p-3 border-none shadow-md flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-secondary/10 flex items-center justify-center text-secondary flex-shrink-0">
              <Ticket className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-bold">Entry Fee</p>
              <p className="text-sm font-bold leading-tight">₹{event.entryFee}</p>
            </div>
          </Card>
        </div>

        {/* Details Section */}
        <div className="space-y-4 bg-card border border-border/50 rounded-xl p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-bold text-sm">Date & Time</p>
              <p className="text-sm text-muted-foreground">
                {format(parseISO(event.date), "EEEE, MMMM dd, yyyy")}
                {event.time && ` • ${event.time}`}
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-bold text-sm">Venue</p>
              <p className="text-sm text-muted-foreground">
                {event.venue}
                {event.area && <><br/>{event.area}</>}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Users className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="w-full">
              <p className="font-bold text-sm">Registration Status</p>
              <div className="flex items-center justify-between mb-1 mt-1">
                <span className="text-xs text-muted-foreground">
                  {event.currentParticipants || 0} registered
                </span>
                <span className="text-xs text-muted-foreground">
                  {event.maxParticipants} max
                </span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full" 
                  style={{ width: `${Math.min(100, ((event.currentParticipants || 0) / (event.maxParticipants || 1)) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        {event.description && (
          <div>
            <h3 className="font-bold flex items-center gap-2 mb-2">
              <Info className="h-4 w-4 text-primary" /> About Event
            </h3>
            <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
              {event.description}
            </div>
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/90 backdrop-blur-md border-t border-border z-40 max-w-md mx-auto">
        <Button 
          className="w-full h-14 font-bold text-base rounded-xl"
          disabled={isRegistered || isFull || event.status !== 'upcoming' || joinMutation.isPending}
          onClick={handleJoin}
          variant={isRegistered ? "secondary" : "default"}
        >
          {joinMutation.isPending ? "Processing..." : 
           isRegistered ? "You're Registered" : 
           isFull ? "Registration Full" : 
           event.status !== 'upcoming' ? "Registration Closed" : 
           "Register Now"}
        </Button>
      </div>
    </div>
  );
}