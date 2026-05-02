import { useState, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { format } from "date-fns";
import { useGetTurf, useGetTurfSlots, useCreateBooking } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { MapPin, Star, ChevronLeft, Calendar as CalendarIcon, Info, Users, Car, Coffee, Shield, Check, Minus, Plus, Clock } from "lucide-react";
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

  const { data: turf, isLoading: isLoadingTurf } = useGetTurf(turfId, { query: { enabled: !!turfId } });
  const { data: slots, isLoading: isLoadingSlots } = useGetTurfSlots(turfId, { date: format(selectedDate, "yyyy-MM-dd") }, { query: { enabled: !!turfId } });
  const createBooking = useCreateBooking();

  /** Check if selected slots form a consecutive chain (no gaps) */
  const isConsecutive = useMemo(() => {
    if (selectedSlotIds.length <= 1) return true;
    if (!slots) return false;
    const selected = slots.filter(s => selectedSlotIds.includes(s.id)).sort((a, b) => a.startTime.localeCompare(b.startTime));
    for (let i = 1; i < selected.length; i++) {
      if (selected[i].startTime !== selected[i - 1].endTime) return false;
    }
    return true;
  }, [selectedSlotIds, slots]);

  const toggleSlot = (slotId: number) => {
    setSelectedSlotIds(prev => prev.includes(slotId) ? prev.filter(id => id !== slotId) : [...prev, slotId]);
  };

  const handleBooking = async () => {
    if (!isAuthenticated) {
      toast({ title: "Login Required", description: "Please login to book a slot." });
      setLocation("/login");
      return;
    }
    if (selectedSlotIds.length === 0) return;
    if (!isConsecutive) {
      toast({ variant: "destructive", title: "Non-consecutive slots", description: "Please select slots that are back-to-back, or book them separately." });
      return;
    }

    try {
      const booking = await createBooking.mutateAsync({
        data: { turfId, slotIds: selectedSlotIds, date: format(selectedDate, "yyyy-MM-dd"), playerCount } as any
      });
      toast({ title: "Slots Reserved!", description: `${selectedSlotIds.length} slot${selectedSlotIds.length > 1 ? "s" : ""} reserved for 10 min. Complete payment to confirm.` });
      setLocation(`/booking/${booking.id}`);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Booking Failed", description: error.message || "Could not reserve slots." });
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

  if (isLoadingTurf) return <div className="h-screen flex items-center justify-center">Loading...</div>;
  if (!turf) return <div className="h-screen flex items-center justify-center">Turf not found</div>;

  const selectedSlots = (slots || []).filter(s => selectedSlotIds.includes(s.id)).sort((a, b) => a.startTime.localeCompare(b.startTime));
  const totalPrice = selectedSlotIds.length * (turf.pricePerHour || 0);
  const advancePrice = Math.round(totalPrice * 0.3);

  return (
    <div className="flex flex-col min-h-screen bg-background pb-36">
      {/* Hero */}
      <div className="relative h-64 sm:h-80 bg-muted w-full">
        <Button variant="ghost" size="icon" className="absolute top-4 left-4 z-10 bg-background/50 backdrop-blur-md hover:bg-background/80 rounded-full" onClick={() => window.history.back()}>
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
              <h1 className="text-2xl font-bold">{turf.name}</h1>
              <p className="text-sm opacity-90 flex items-center mt-1"><MapPin className="h-3 w-3 mr-1" />{turf.area}</p>
            </div>
            <div className="bg-yellow-500 text-yellow-950 px-2 py-1 rounded-lg flex items-center font-bold text-sm">
              <Star className="h-4 w-4 fill-current mr-1" />{turf.rating || "New"}
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Price */}
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-muted-foreground">Price per hour</p>
            <p className="text-2xl font-bold text-primary">₹{turf.pricePerHour}</p>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <p>30% advance: <span className="font-bold text-foreground">₹{Math.round((turf.pricePerHour || 0) * 0.3)}</span></p>
          </div>
        </div>

        {turf.description && <p className="text-sm text-muted-foreground leading-relaxed">{turf.description}</p>}

        {/* Amenities */}
        {turf.amenities && turf.amenities.length > 0 && (
          <div>
            <h3 className="font-bold mb-3">Amenities</h3>
            <div className="grid grid-cols-2 gap-2">
              {turf.amenities.map((a, i) => (
                <div key={i} className="flex items-center text-sm p-2 bg-muted/50 rounded-lg">
                  <div className="mr-3 text-primary">{getAmenityIcon(a)}</div>{a}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Slot Picker */}
        <div>
          <div className="flex justify-between items-end mb-3">
            <div>
              <h3 className="font-bold">Book Slots</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Select consecutive slots for a single booking</p>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 border-dashed">
                  <CalendarIcon className="mr-2 h-4 w-4 text-primary" />{format(selectedDate, "MMM dd")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar mode="single" selected={selectedDate} onSelect={d => { if (d) { setSelectedDate(d); setSelectedSlotIds([]); } }} disabled={d => d < new Date(new Date().setHours(0,0,0,0))} initialFocus />
              </PopoverContent>
            </Popover>
          </div>

          {/* Non-consecutive warning */}
          {selectedSlotIds.length > 1 && !isConsecutive && (
            <div className="mb-3 p-3 bg-destructive/10 border border-destructive/30 rounded-xl flex items-start gap-2">
              <Info className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-xs text-destructive font-medium">Selected slots are not consecutive. Please select only back-to-back slots for a single booking, or book them separately.</p>
            </div>
          )}

          {/* Selection Summary */}
          {selectedSlotIds.length > 0 && (
            <div className={cn("mb-3 p-3 rounded-xl border flex items-center justify-between", isConsecutive ? "bg-primary/5 border-primary/20" : "bg-destructive/5 border-destructive/20")}>
              <div>
                <p className={cn("text-xs font-bold uppercase tracking-wider", isConsecutive ? "text-primary" : "text-destructive")}>
                  {selectedSlotIds.length} slot{selectedSlotIds.length > 1 ? "s" : ""} selected
                  {selectedSlotIds.length > 1 && isConsecutive && " · 1 booking"}
                </p>
                {isConsecutive && selectedSlots.length > 0 && (
                  <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {selectedSlots[0].startTime} – {selectedSlots[selectedSlots.length - 1].endTime}
                  </p>
                )}
              </div>
              <button onClick={() => setSelectedSlotIds([])} className="text-xs text-muted-foreground hover:text-destructive font-medium">Clear</button>
            </div>
          )}

          {isLoadingSlots ? (
            <div className="grid grid-cols-3 gap-2">{[1,2,3,4,5,6].map(i => <div key={i} className="h-14 bg-muted animate-pulse rounded-lg" />)}</div>
          ) : slots && slots.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {slots.map(slot => {
                const isSelected = selectedSlotIds.includes(slot.id);
                const isPending = !slot.isBooked && false; // server returns isBooked correctly
                return (
                  <button
                    key={slot.id}
                    disabled={!!slot.isBooked}
                    onClick={() => !slot.isBooked && toggleSlot(slot.id)}
                    className={cn(
                      "h-14 flex flex-col items-center justify-center p-1 rounded-xl border-2 relative overflow-hidden transition-all",
                      isSelected ? "bg-primary border-primary text-primary-foreground shadow-md shadow-primary/20"
                        : slot.isBooked ? "bg-muted/50 border-muted opacity-50 cursor-not-allowed"
                        : "bg-card border-border hover:border-primary/50 hover:bg-primary/5 cursor-pointer"
                    )}
                  >
                    {isSelected && <span className="absolute top-1 right-1"><Check className="h-3 w-3" /></span>}
                    <span className="text-sm font-bold">{slot.startTime}</span>
                    <span className={cn("text-[10px] mt-0.5", isSelected ? "opacity-80" : "text-muted-foreground")}>₹{slot.price || turf.pricePerHour}</span>
                    {slot.isBooked && (
                      <div className="absolute inset-0 flex items-center justify-center bg-background/80">
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
              <Button variant="outline" size="icon" className="h-9 w-9 rounded-full border-2" onClick={() => setPlayerCount(c => Math.max(2, c-1))} disabled={playerCount <= 2}><Minus className="h-4 w-4" /></Button>
              <span className="w-8 text-center font-bold text-lg">{playerCount}</span>
              <Button variant="outline" size="icon" className="h-9 w-9 rounded-full border-2" onClick={() => setPlayerCount(c => Math.min(22, c+1))} disabled={playerCount >= 22}><Plus className="h-4 w-4" /></Button>
            </div>
          </div>
        </div>

        {/* Reviews */}
        {turf.reviews && turf.reviews.length > 0 && (
          <div>
            <h3 className="font-bold mb-3 flex items-center justify-between">Reviews <span className="text-sm font-normal text-muted-foreground">({turf.reviewCount} total)</span></h3>
            <div className="space-y-3">
              {turf.reviews.slice(0, 3).map(review => (
                <Card key={review.id} className="p-3 bg-muted/30 border-none shadow-none">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-semibold text-sm">{review.userName || "User"}</span>
                    <div className="flex text-yellow-500">
                      {Array.from({length: 5}).map((_, i) => <Star key={i} className={`h-3 w-3 ${i < review.rating ? "fill-current" : "opacity-20"}`} />)}
                    </div>
                  </div>
                  {review.comment && <p className="text-sm text-muted-foreground">{review.comment}</p>}
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Fixed CTA — above bottom nav */}
      <div className="fixed bottom-16 left-0 right-0 p-4 bg-background/95 backdrop-blur-md border-t border-border z-40 max-w-md mx-auto">
        <div className="flex items-center gap-4">
          <div className="flex-1 min-w-0">
            {selectedSlotIds.length > 0 ? (
              <div>
                <span className="text-xs text-muted-foreground font-medium uppercase">
                  {selectedSlotIds.length} slot{selectedSlotIds.length > 1 ? "s" : ""} · ₹{totalPrice} total
                </span>
                <p className="text-[11px] text-muted-foreground">30% advance: ₹{advancePrice}</p>
              </div>
            ) : (
              <div>
                <span className="text-xs text-muted-foreground">From</span>
                <p className="font-bold text-foreground">₹{turf.pricePerHour}<span className="text-sm font-normal text-muted-foreground">/hr</span></p>
              </div>
            )}
          </div>
          <Button
            className="flex-1 h-12 font-bold text-base rounded-xl"
            disabled={selectedSlotIds.length === 0 || createBooking.isPending || (selectedSlotIds.length > 1 && !isConsecutive)}
            onClick={handleBooking}
          >
            {createBooking.isPending ? "Reserving..." : selectedSlotIds.length === 0 ? "Select a Slot" : `Reserve →`}
          </Button>
        </div>
      </div>
    </div>
  );
}
