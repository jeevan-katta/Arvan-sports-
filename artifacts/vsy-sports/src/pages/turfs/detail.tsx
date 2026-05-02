import { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import { format } from "date-fns";
import {
  useGetTurf,
  useGetTurfSlots,
  useCreateBooking
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { MapPin, Star, ChevronLeft, Calendar as CalendarIcon, Info, Users, Car, Coffee, Shield, Check, Minus, Plus } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export default function TurfDetail() {
  const { id } = useParams();
  const turfId = parseInt(id || "0", 10);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedSlotIds, setSelectedSlotIds] = useState<number[]>([]);
  const [playerCount, setPlayerCount] = useState(10);

  const { data: turf, isLoading: isLoadingTurf } = useGetTurf(turfId, {
    query: { enabled: !!turfId }
  });

  const { data: slots, isLoading: isLoadingSlots } = useGetTurfSlots(turfId, {
    date: format(selectedDate, "yyyy-MM-dd")
  }, {
    query: { enabled: !!turfId && !!selectedDate }
  });

  const createBooking = useCreateBooking();

  const toggleSlot = (slotId: number) => {
    setSelectedSlotIds(prev =>
      prev.includes(slotId) ? prev.filter(id => id !== slotId) : [...prev, slotId]
    );
  };

  const handleBooking = async () => {
    if (!isAuthenticated) {
      toast({ title: "Login Required", description: "Please login to book a slot." });
      setLocation("/login");
      return;
    }
    if (selectedSlotIds.length === 0) return;

    try {
      const bookingIds: number[] = [];

      for (const slotId of selectedSlotIds) {
        const booking = await createBooking.mutateAsync({
          data: {
            turfId,
            slotId,
            date: format(selectedDate, "yyyy-MM-dd"),
          }
        });
        bookingIds.push(booking.id);
      }

      toast({
        title: "Slots Booked!",
        description: `${bookingIds.length} slot${bookingIds.length > 1 ? "s" : ""} booked. Proceed to payment.`,
      });

      if (bookingIds.length === 1) {
        setLocation(`/booking/${bookingIds[0]}`);
      } else {
        setLocation("/bookings");
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Booking Failed",
        description: error.message || "One or more slots could not be booked.",
      });
    }
  };

  const getAmenityIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes("park")) return <Car className="h-4 w-4" />;
    if (n.includes("caf") || n.includes("food")) return <Coffee className="h-4 w-4" />;
    if (n.includes("change") || n.includes("shower")) return <Users className="h-4 w-4" />;
    if (n.includes("equip")) return <Shield className="h-4 w-4" />;
    return <Info className="h-4 w-4" />;
  };

  if (isLoadingTurf) {
    return <div className="h-screen w-full flex items-center justify-center">Loading...</div>;
  }

  if (!turf) {
    return <div className="h-screen w-full flex items-center justify-center">Turf not found</div>;
  }

  const selectedSlots = (slots || []).filter(s => selectedSlotIds.includes(s.id));
  const totalPrice = selectedSlots.reduce((sum, s) => sum + (s.price || turf.pricePerHour || 0), 0);
  const pricePerSlot = turf.pricePerHour || 0;

  return (
    <div className="flex flex-col min-h-screen bg-background pb-36">
      {/* Hero Image */}
      <div className="relative h-64 sm:h-80 bg-muted w-full">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 left-4 z-10 bg-background/50 backdrop-blur-md hover:bg-background/80 rounded-full text-foreground"
          onClick={() => window.history.back()}
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>

        {turf.images?.[0] ? (
          <img src={turf.images[0]} alt={turf.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-secondary/20">
            <MapPin className="h-12 w-12 text-muted-foreground/50" />
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 pt-16">
          <div className="flex justify-between items-end">
            <div className="text-white">
              <h1 className="text-2xl font-bold font-display tracking-wide">{turf.name}</h1>
              <p className="text-sm opacity-90 flex items-center mt-1">
                <MapPin className="h-3 w-3 mr-1" /> {turf.area}{turf.distanceKm ? `, ${turf.distanceKm}km away` : ""}
              </p>
            </div>
            <div className="bg-yellow-500 text-yellow-950 px-2 py-1 rounded-lg flex items-center font-bold text-sm">
              <Star className="h-4 w-4 fill-current mr-1" />
              {turf.rating || "New"}
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Price & Status */}
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-muted-foreground">Price per hour</p>
            <p className="text-2xl font-bold text-primary">₹{turf.pricePerHour}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Status</p>
            <Badge variant={turf.status === "approved" ? "default" : "secondary"} className="mt-1">
              {turf.status}
            </Badge>
          </div>
        </div>

        {/* Description */}
        {turf.description && (
          <div>
            <h3 className="font-bold mb-2">About</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{turf.description}</p>
          </div>
        )}

        {/* Amenities */}
        {turf.amenities && turf.amenities.length > 0 && (
          <div>
            <h3 className="font-bold mb-3">Amenities</h3>
            <div className="grid grid-cols-2 gap-2">
              {turf.amenities.map((amenity, i) => (
                <div key={i} className="flex items-center text-sm p-2 bg-muted/50 rounded-lg">
                  <div className="mr-3 text-primary">{getAmenityIcon(amenity)}</div>
                  {amenity}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Slots Picker */}
        <div>
          <div className="flex justify-between items-end mb-3">
            <div>
              <h3 className="font-bold">Book Slots</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Select one or more time slots</p>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 border-dashed flex items-center">
                  <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                  {format(selectedDate, "MMM dd, yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    if (date) {
                      setSelectedDate(date);
                      setSelectedSlotIds([]);
                    }
                  }}
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Selected slots summary */}
          {selectedSlotIds.length > 0 && (
            <div className="mb-3 p-3 bg-primary/5 rounded-xl border border-primary/20 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-primary uppercase tracking-wider">
                  {selectedSlotIds.length} slot{selectedSlotIds.length > 1 ? "s" : ""} selected
                </p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {selectedSlots.map(s => s.startTime).join(", ")}
                </p>
              </div>
              <button
                onClick={() => setSelectedSlotIds([])}
                className="text-xs text-muted-foreground hover:text-destructive font-medium"
              >
                Clear
              </button>
            </div>
          )}

          {isLoadingSlots ? (
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-14 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : slots && slots.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {slots.map(slot => {
                const isSelected = selectedSlotIds.includes(slot.id);
                return (
                  <button
                    key={slot.id}
                    disabled={!!slot.isBooked}
                    onClick={() => !slot.isBooked && toggleSlot(slot.id)}
                    className={cn(
                      "h-14 flex flex-col items-center justify-center p-1 rounded-xl border-2 relative overflow-hidden transition-all",
                      isSelected
                        ? "bg-primary border-primary text-primary-foreground shadow-md shadow-primary/20"
                        : slot.isBooked
                        ? "bg-muted/50 border-muted opacity-50 cursor-not-allowed"
                        : "bg-card border-border hover:border-primary/50 hover:bg-primary/5 cursor-pointer"
                    )}
                  >
                    {isSelected && (
                      <span className="absolute top-1 right-1">
                        <Check className="h-3 w-3" />
                      </span>
                    )}
                    <span className="text-sm font-bold">{slot.startTime}</span>
                    <span className={cn("text-[10px] mt-0.5", isSelected ? "opacity-80" : "text-muted-foreground")}>
                      ₹{slot.price || pricePerSlot}
                    </span>
                    {slot.isBooked && (
                      <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-[1px]">
                        <span className="text-[10px] font-bold text-destructive">BOOKED</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-center p-6 bg-muted/30 rounded-xl border border-dashed border-muted-foreground/30">
              <CalendarIcon className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">No slots available for this date.</p>
            </div>
          )}
        </div>

        {/* Player Count */}
        <div>
          <h3 className="font-bold mb-3">Number of Players</h3>
          <div className="flex items-center justify-between bg-muted/50 rounded-xl p-4">
            <div>
              <p className="text-sm font-medium">Team size</p>
              <p className="text-xs text-muted-foreground">How many players will be playing?</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 rounded-full border-2"
                onClick={() => setPlayerCount(c => Math.max(2, c - 1))}
                disabled={playerCount <= 2}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-8 text-center font-bold text-lg">{playerCount}</span>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 rounded-full border-2"
                onClick={() => setPlayerCount(c => Math.min(22, c + 1))}
                disabled={playerCount >= 22}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Reviews */}
        {turf.reviews && turf.reviews.length > 0 && (
          <div>
            <h3 className="font-bold mb-3 flex items-center justify-between">
              Reviews
              <span className="text-sm font-normal text-muted-foreground">({turf.reviewCount} total)</span>
            </h3>
            <div className="space-y-3">
              {turf.reviews.slice(0, 3).map(review => (
                <Card key={review.id} className="p-3 bg-muted/30 border-none shadow-none">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-semibold text-sm">{review.userName || "User"}</span>
                    <div className="flex text-yellow-500">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`h-3 w-3 ${i < review.rating ? "fill-current" : "text-muted opacity-30"}`} />
                      ))}
                    </div>
                  </div>
                  {review.comment && <p className="text-sm text-muted-foreground">{review.comment}</p>}
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Floating Book Action — sits above the bottom nav (h-16) */}
      <div className="fixed bottom-16 left-0 right-0 p-4 bg-background/95 backdrop-blur-md border-t border-border z-40 max-w-md mx-auto">
        <div className="flex items-center gap-4">
          <div className="flex-1 min-w-0">
            {selectedSlotIds.length > 0 ? (
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground font-medium uppercase truncate">
                  {selectedSlotIds.length} slot{selectedSlotIds.length > 1 ? "s" : ""} · {playerCount} players · {format(selectedDate, "MMM dd")}
                </span>
                <span className="text-lg font-bold text-foreground">
                  ₹{totalPrice}
                  {selectedSlotIds.length > 1 && (
                    <span className="text-xs font-normal text-muted-foreground ml-1">({selectedSlotIds.length}×₹{pricePerSlot})</span>
                  )}
                </span>
              </div>
            ) : (
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">Starting from</span>
                <span className="text-lg font-bold text-foreground">₹{pricePerSlot}<span className="text-sm font-normal text-muted-foreground">/hr</span></span>
              </div>
            )}
          </div>
          <Button
            className="flex-1 h-12 font-bold text-base rounded-xl"
            disabled={selectedSlotIds.length === 0 || createBooking.isPending}
            onClick={handleBooking}
          >
            {createBooking.isPending
              ? "Booking..."
              : selectedSlotIds.length === 0
              ? "Select a Slot"
              : `Continue →`}
          </Button>
        </div>
      </div>
    </div>
  );
}
