import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import { format, parseISO, isToday } from "date-fns";
import { useGetBooking, useCreateBookingPayment, useVerifyBookingPayment } from "@workspace/api-client-react";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { MapPin, Calendar, Clock, CreditCard, CheckCircle2, AlertCircle, Radio, Users, Zap, Timer, ChevronRight } from "lucide-react";
import { ballColor } from "@/hooks/use-live-scores";
import { useQueryClient } from "@tanstack/react-query";
import { getGetBookingQueryKey } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

declare global { interface Window { Razorpay: any; } }

function useCountdown(expiresAt: string | undefined) {
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  useEffect(() => {
    if (!expiresAt) return;
    const update = () => setSecondsLeft(Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)));
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [expiresAt]);
  return secondsLeft;
}

export default function BookingDetail() {
  const { id } = useParams();
  const bookingId = id || "";
  const { toast } = useToast();
  const { user, token } = useAuth();
  const queryClient = useQueryClient();

  const [paymentType, setPaymentType] = useState<"full" | "advance">("full");
  const [isLiveOpen, setIsLiveOpen] = useState(false);
  const [teamA, setTeamA] = useState("");
  const [teamB, setTeamB] = useState("");
  const [liveMatchId, setLiveMatchId] = useState<string | null>(null);
  const [battingTeam, setBattingTeam] = useState<"A" | "B">("A");
  const [maxOvers, setMaxOvers] = useState(8);
  const [liveMatch, setLiveMatch] = useState<any | null>(null);
  const [isAddingBall, setIsAddingBall] = useState(false);

  const { data: booking, isLoading } = useGetBooking(bookingId, { query: { enabled: !!bookingId } });
  const secondsLeft = useCountdown((booking as any)?.expiresAt);
  const createPaymentMutation = useCreateBookingPayment();
  const verifyPaymentMutation = useVerifyBookingPayment();

  const handlePayment = async () => {
    if (!booking) return;
    try {
      const paymentOrder = await createPaymentMutation.mutateAsync({ id: bookingId, data: { paymentType } as any });
      const orderId: string = (paymentOrder as any).orderId || "";

      // Simulated payment (no real Razorpay keys configured)
      if (orderId.startsWith("order_sim_")) {
        await verifyPaymentMutation.mutateAsync({
          id: bookingId,
          data: {
            razorpayOrderId: orderId,
            razorpayPaymentId: `sim_pay_${Date.now()}`,
            razorpaySignature: "simulated",
          } as any,
        });
        queryClient.invalidateQueries({ queryKey: getGetBookingQueryKey(bookingId) });
        toast({ title: "Payment Successful!", description: "Your slot is confirmed." });
        return;
      }

      // Real Razorpay flow
      const rzpOptions = {
        key: (paymentOrder as any).key,
        amount: (paymentOrder as any).amount,
        currency: (paymentOrder as any).currency || "INR",
        name: "Vsy Sports",
        description: paymentType === "advance"
          ? `30% Advance for Booking #${bookingId} (₹${(paymentOrder as any).paidAmount})`
          : `Full Payment for Booking #${bookingId}`,
        order_id: orderId,
        prefill: { name: user?.name || "", email: user?.email || "" },
        theme: { color: "#16a34a" },
        handler: async (response: any) => {
          try {
            await verifyPaymentMutation.mutateAsync({
              id: bookingId,
              data: {
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              }
            });
            queryClient.invalidateQueries({ queryKey: getGetBookingQueryKey(bookingId) });
            toast({ title: "Payment Successful!", description: "Your slot is confirmed." });
          } catch (err: any) {
            toast({ variant: "destructive", title: "Verification Failed", description: err.message });
          }
        },
        modal: { ondismiss: () => toast({ title: "Payment cancelled" }) }
      };
      if (window.Razorpay) {
        const rzp = new window.Razorpay(rzpOptions);
        rzp.on("payment.failed", (r: any) => toast({ variant: "destructive", title: "Payment Failed", description: r.error?.description }));
        rzp.open();
      } else {
        toast({ variant: "destructive", title: "Error", description: "Razorpay SDK not loaded." });
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Payment Failed", description: error.message });
    }
  };

  /** Helper: authenticated fetch using the stored JWT token */
  const authFetch = (url: string, options: RequestInit = {}) => {
    return fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers as object || {}),
      },
    });
  };

  const handleGoLive = async () => {
    if (!teamA.trim() || !teamB.trim()) {
      toast({ title: "Enter both team names", variant: "destructive" });
      return;
    }
    try {
      const res = await authFetch("/api/live-scores", {
        method: "POST",
        body: JSON.stringify({
          turfId: String(booking?.turfId),
          turfName: booking?.turfName,
          teamA: teamA.trim(),
          teamB: teamB.trim(),
          battingTeam,
          maxOvers,
          bookingId: String(bookingId),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || "Failed to start match");
      }
      const match = await res.json();
      setLiveMatchId(match.id);
      setLiveMatch(match);
      setIsLiveOpen(false);
      toast({ title: "🔴 Match is LIVE!", description: "Scores are broadcasting to Community." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed to start match", description: err.message });
    }
  };

  const handleAddBall = async (result: string) => {
    if (!liveMatchId) return;
    setIsAddingBall(true);
    try {
      const res = await authFetch(`/api/live-scores/${liveMatchId}/ball`, {
        method: "POST",
        body: JSON.stringify({ result, team: liveMatch?.battingTeam || battingTeam }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const updated = await res.json();
      setLiveMatch(updated);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally {
      setIsAddingBall(false);
    }
  };

  const handleSwitchInnings = async () => {
    if (!liveMatchId || !liveMatch) return;
    const newBatting = liveMatch.battingTeam === "A" ? "B" : "A";
    try {
      const res = await authFetch(`/api/live-scores/${liveMatchId}`, {
        method: "PUT",
        body: JSON.stringify({ battingTeam: newBatting }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const updated = await res.json();
      setLiveMatch(updated);
      toast({ title: `${newBatting === "A" ? liveMatch.teamA : liveMatch.teamB} now batting` });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  const handleEndMatch = async () => {
    if (!liveMatchId) return;
    try {
      await authFetch(`/api/live-scores/${liveMatchId}`, { method: "DELETE" });
      setLiveMatchId(null);
      setLiveMatch(null);
      toast({ title: "Match ended." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  const BALL_OPTIONS = [
    { label: "0", value: "0", cls: "bg-muted text-foreground" },
    { label: "1", value: "1", cls: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" },
    { label: "2", value: "2", cls: "bg-green-200 text-green-900 dark:bg-green-800 dark:text-green-100" },
    { label: "3", value: "3", cls: "bg-green-300 text-green-900" },
    { label: "4", value: "4", cls: "bg-blue-500 text-white" },
    { label: "6", value: "6", cls: "bg-purple-600 text-white" },
    { label: "W", value: "W", cls: "bg-red-600 text-white" },
    { label: "NB", value: "NB", cls: "bg-yellow-400 text-black" },
    { label: "WD", value: "WD", cls: "bg-yellow-300 text-black" },
  ];

  if (isLoading) return <div className="h-screen flex items-center justify-center">Loading...</div>;
  if (!booking) return <div className="h-screen flex items-center justify-center">Booking not found</div>;

  const isConfirmed = booking.status === "confirmed";
  const isExpired = booking.status === "pending" && secondsLeft === 0 && !!(booking as any).expiresAt;
  const isPending = booking.status === "pending" && !isExpired;
  const isTodayBooking = isToday(parseISO(booking.date));
  const canGoLive = isConfirmed && isTodayBooking;

  const totalPrice = booking.totalPrice || 0;
  const advanceAmount = Math.round(totalPrice * 0.3);
  const payAmount = paymentType === "advance" ? advanceAmount : totalPrice;

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;

  return (
    <div className="flex flex-col min-h-screen bg-muted/10 pb-36">
      <Header title="Booking Details" showLocation={false} />

      <main className="flex-1 p-4 space-y-4">
        {/* Status Header */}
        <div className="text-center py-4">
          {isConfirmed ? (
            <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="h-8 w-8" />
            </div>
          ) : isExpired ? (
            <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="h-8 w-8" />
            </div>
          ) : (
            <div className="w-16 h-16 bg-yellow-500/20 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <Timer className="h-8 w-8" />
            </div>
          )}
          <h2 className="text-xl font-bold mb-1">
            {isConfirmed ? "Booking Confirmed!" : isExpired ? "Reservation Expired" : "Reserved — Complete Payment"}
          </h2>
          <p className="text-muted-foreground text-sm">Booking #{booking.id}</p>
        </div>

        {/* Countdown Banner */}
        {isPending && (booking as any).expiresAt && secondsLeft > 0 && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 flex items-center gap-3">
            <Timer className="h-5 w-5 text-yellow-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-bold text-yellow-700">Slot reserved for</p>
              <p className="text-xs text-yellow-600">Complete payment before the timer runs out or your slot will be released</p>
            </div>
            <div className="text-xl font-bold text-yellow-700 tabular-nums">
              {mins}:{secs.toString().padStart(2, "0")}
            </div>
          </div>
        )}

        {/* Expired notice */}
        {isExpired && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-sm text-red-700 font-medium">Your 10-minute reservation has expired. The slots are now available again. Please go back and rebook.</p>
          </div>
        )}

        {/* Booking Info */}
        <Card className="p-4 border-none shadow-md">
          <h3 className="font-bold text-lg mb-4">{booking.turfName}</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-primary flex-shrink-0" />
              <div><p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Location</p><p className="font-medium text-sm">{booking.turfArea}</p></div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-primary flex-shrink-0" />
              <div><p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Date</p><p className="font-medium text-sm">{format(parseISO(booking.date), "EEEE, MMMM dd, yyyy")}</p></div>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-primary flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Time</p>
                <p className="font-medium text-sm">{booking.startTime} – {booking.endTime}
                  {(booking as any).slotIds?.length > 1 && (
                    <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
                      {(booking as any).slotIds.length} slots
                    </span>
                  )}
                </p>
              </div>
            </div>
            {(booking as any).playerCount && (
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-primary flex-shrink-0" />
                <div><p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Players</p><p className="font-medium text-sm">{(booking as any).playerCount} players</p></div>
              </div>
            )}
          </div>
          <div className="mt-4 pt-4 border-t border-dashed flex justify-between items-center">
            <span className="font-bold text-muted-foreground">Total</span>
            <span className="text-2xl font-bold text-primary">₹{totalPrice}</span>
          </div>
        </Card>

        {/* Payment Status */}
        <div className="bg-card rounded-xl p-4 shadow-sm border border-border">
          <h3 className="font-bold mb-2">Payment</h3>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {isConfirmed
                  ? ((booking as any).paymentType === "advance"
                    ? `30% paid · ₹${(booking as any).paidAmount} · Balance ₹${totalPrice - ((booking as any).paidAmount || 0)} due at venue`
                    : `Fully paid · ₹${totalPrice}`)
                  : "Not paid yet"}
              </span>
            </div>
            <Badge variant={booking.paymentStatus === "paid" ? "default" : booking.paymentStatus === "partially_paid" ? "secondary" : "outline"}>
              {booking.paymentStatus === "paid" ? "Paid" : booking.paymentStatus === "partially_paid" ? "Advance Paid" : "Pending"}
            </Badge>
          </div>
        </div>

        {/* Payment Type Selector (only when pending) */}
        {isPending && !isExpired && (
          <div className="bg-card rounded-xl p-4 shadow-sm border border-border">
            <h3 className="font-bold mb-3">Choose Payment Option</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setPaymentType("full")}
                className={cn(
                  "p-3 rounded-xl border-2 text-left transition-all",
                  paymentType === "full" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                )}
              >
                <p className="font-bold text-sm">Full Payment</p>
                <p className="text-xl font-bold text-primary mt-1">₹{totalPrice}</p>
                <p className="text-xs text-muted-foreground mt-1">Slot confirmed immediately</p>
              </button>
              <button
                onClick={() => setPaymentType("advance")}
                className={cn(
                  "p-3 rounded-xl border-2 text-left transition-all relative",
                  paymentType === "advance" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                )}
              >
                <span className="absolute top-2 right-2 text-[9px] font-bold bg-orange-500 text-white px-1.5 py-0.5 rounded">SAVE</span>
                <p className="font-bold text-sm">30% Advance</p>
                <p className="text-xl font-bold text-primary mt-1">₹{advanceAmount}</p>
                <p className="text-xs text-muted-foreground mt-1">Pay ₹{totalPrice - advanceAmount} at venue</p>
              </button>
            </div>
          </div>
        )}

        {/* Go Live */}
        {canGoLive && !liveMatchId && (
          <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/5 border border-green-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Radio className="h-5 w-5 text-green-600 animate-pulse" />
              <h3 className="font-bold text-green-700">Today's Match — Go Live!</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Stream ball-by-ball scores to the Community!</p>
            {!isLiveOpen ? (
              <Button className="w-full bg-green-600 hover:bg-green-700" onClick={() => setIsLiveOpen(true)}>
                <Zap className="h-4 w-4 mr-2" /> Start Live Score
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Team A</label>
                    <Input placeholder="e.g. Banjara Lions" value={teamA} onChange={e => setTeamA(e.target.value)} className="bg-background" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Team B</label>
                    <Input placeholder="e.g. Hitech Hawks" value={teamB} onChange={e => setTeamB(e.target.value)} className="bg-background" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Batting First</label>
                    <div className="flex gap-2">
                      <button onClick={() => setBattingTeam("A")} className={cn("flex-1 h-9 rounded-lg border text-xs font-bold transition-all", battingTeam === "A" ? "border-primary bg-primary text-primary-foreground" : "border-border")}>A</button>
                      <button onClick={() => setBattingTeam("B")} className={cn("flex-1 h-9 rounded-lg border text-xs font-bold transition-all", battingTeam === "B" ? "border-primary bg-primary text-primary-foreground" : "border-border")}>B</button>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Max Overs</label>
                    <Input type="number" min={1} max={50} value={maxOvers} onChange={e => setMaxOvers(parseInt(e.target.value) || 8)} className="bg-background h-9" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setIsLiveOpen(false)}>Cancel</Button>
                  <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={handleGoLive}>
                    <Radio className="h-4 w-4 mr-2" /> Go Live!
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Ball-by-Ball Live Score Control */}
        {liveMatchId && liveMatch && (
          <div className="bg-gradient-to-br from-red-500/10 to-orange-500/5 border border-red-500/30 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
                <h3 className="font-bold text-red-600">LIVE — Ball by Ball</h3>
              </div>
              <span className="text-xs text-muted-foreground">{liveMatch.overs}</span>
            </div>

            {/* Scoreboard */}
            <div className="flex items-center justify-between bg-background rounded-xl p-3">
              <div className={cn("flex-1 text-center", liveMatch.battingTeam === "A" ? "opacity-100" : "opacity-50")}>
                <p className="text-xs font-bold text-muted-foreground uppercase truncate">{liveMatch.teamA}</p>
                <p className="text-2xl font-display font-bold text-primary">{liveMatch.scoreA}<span className="text-sm font-normal">/{liveMatch.wicketsA}W</span></p>
                {liveMatch.battingTeam === "A" && <p className="text-[10px] text-green-600 font-bold">● BATTING</p>}
              </div>
              <div className="px-2 text-center text-muted-foreground font-bold text-sm">vs</div>
              <div className={cn("flex-1 text-center", liveMatch.battingTeam === "B" ? "opacity-100" : "opacity-50")}>
                <p className="text-xs font-bold text-muted-foreground uppercase truncate">{liveMatch.teamB}</p>
                <p className="text-2xl font-display font-bold">{liveMatch.scoreB}<span className="text-sm font-normal">/{liveMatch.wicketsB}W</span></p>
                {liveMatch.battingTeam === "B" && <p className="text-[10px] text-green-600 font-bold">● BATTING</p>}
              </div>
            </div>

            {/* Last balls */}
            {liveMatch.balls && liveMatch.balls.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5">Last 6 balls</p>
                <div className="flex gap-1.5">
                  {liveMatch.balls.slice(-6).map((b: any, i: number) => (
                    <span key={i} className={cn("w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold", ballColor(b.result))}>
                      {b.result}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Ball input buttons */}
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2">Add Delivery</p>
              <div className="grid grid-cols-5 gap-2">
                {BALL_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => handleAddBall(opt.value)}
                    disabled={isAddingBall}
                    className={cn("h-11 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-50", opt.cls)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 text-xs" onClick={handleSwitchInnings}>
                <ChevronRight className="h-3 w-3 mr-1" /> Switch Innings
              </Button>
              <Button variant="outline" className="text-red-600 border-red-300 text-xs" onClick={handleEndMatch}>
                End Match
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* Footer CTA */}
      {isPending && !isExpired && (
        <div className="fixed bottom-16 left-0 right-0 p-4 bg-background border-t border-border z-40 max-w-md mx-auto">
          <Button
            className="w-full h-14 font-bold text-base rounded-xl shadow-lg shadow-primary/25"
            onClick={handlePayment}
            disabled={createPaymentMutation.isPending || verifyPaymentMutation.isPending}
          >
            {createPaymentMutation.isPending || verifyPaymentMutation.isPending
              ? "Processing..."
              : `Pay ₹${payAmount} ${paymentType === "advance" ? "(30% Advance)" : "(Full)"} →`}
          </Button>
        </div>
      )}
      {isExpired && (
        <div className="fixed bottom-16 left-0 right-0 p-4 bg-background border-t border-border z-40 max-w-md mx-auto">
          <Link href="/turfs" className="block">
            <Button className="w-full h-12 font-bold rounded-xl">Browse Venues Again</Button>
          </Link>
        </div>
      )}
      {isConfirmed && (
        <div className="fixed bottom-16 left-0 right-0 p-4 bg-background border-t border-border z-40 max-w-md mx-auto">
          <Link href="/turfs" className="block">
            <Button variant="outline" className="w-full h-12 font-bold rounded-xl">Book Another Turf</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
