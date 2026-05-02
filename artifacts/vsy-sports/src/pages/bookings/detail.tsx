import { useState } from "react";
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
import { MapPin, Calendar, Clock, CreditCard, CheckCircle2, AlertCircle, Radio, Users, Zap } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetBookingQueryKey } from "@workspace/api-client-react";

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function BookingDetail() {
  const { id } = useParams();
  const bookingId = parseInt(id || "0", 10);
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [isLiveDialogOpen, setIsLiveDialogOpen] = useState(false);
  const [teamA, setTeamA] = useState("");
  const [teamB, setTeamB] = useState("");
  const [liveMatchId, setLiveMatchId] = useState<string | null>(null);
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [overs, setOvers] = useState("0.0");
  const [isUpdatingScore, setIsUpdatingScore] = useState(false);

  const { data: booking, isLoading } = useGetBooking(bookingId, {
    query: { enabled: !!bookingId }
  });

  const createPaymentMutation = useCreateBookingPayment();
  const verifyPaymentMutation = useVerifyBookingPayment();

  const handlePayment = async () => {
    if (!booking) return;

    try {
      toast({ title: "Initiating Payment", description: "Opening Razorpay checkout..." });
      const paymentOrder = await createPaymentMutation.mutateAsync({ id: bookingId });

      const rzpOptions = {
        key: paymentOrder.key,
        amount: paymentOrder.amount,
        currency: paymentOrder.currency || "INR",
        name: "Vsy Sports",
        description: `Turf Booking #${bookingId}`,
        order_id: paymentOrder.orderId,
        prefill: {
          name: user?.name || "",
          email: user?.email || "",
        },
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
            toast({ title: "Payment Successful! 🎉", description: "Your booking is confirmed." });
          } catch (err: any) {
            toast({ variant: "destructive", title: "Payment Verification Failed", description: err.message });
          }
        },
        modal: {
          ondismiss: () => {
            toast({ title: "Payment cancelled", description: "You closed the payment window." });
          }
        }
      };

      if (window.Razorpay) {
        const rzp = new window.Razorpay(rzpOptions);
        rzp.on("payment.failed", (resp: any) => {
          toast({ variant: "destructive", title: "Payment Failed", description: resp.error?.description || "Payment failed" });
        });
        rzp.open();
      } else {
        toast({ variant: "destructive", title: "Payment Error", description: "Razorpay SDK not loaded." });
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Payment Initialization Failed", description: error.message });
    }
  };

  const handleGoLive = async () => {
    if (!teamA || !teamB) {
      toast({ title: "Enter both team names", variant: "destructive" });
      return;
    }
    try {
      const res = await fetch("/api/live-scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          turfId: booking?.turfId,
          turfName: booking?.turfName,
          teamA, teamB,
          bookingId: bookingId.toString(),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const match = await res.json();
      setLiveMatchId(match.id);
      setIsLiveDialogOpen(false);
      toast({ title: "🔴 Match is now LIVE!", description: "Live score is broadcasting to Community." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed to start match", description: err.message });
    }
  };

  const handleUpdateScore = async () => {
    if (!liveMatchId) return;
    setIsUpdatingScore(true);
    try {
      const res = await fetch(`/api/live-scores/${liveMatchId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ scoreA, scoreB, overs }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast({ title: "Score updated!" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed to update score", description: err.message });
    } finally {
      setIsUpdatingScore(false);
    }
  };

  const handleEndMatch = async () => {
    if (!liveMatchId) return;
    try {
      await fetch(`/api/live-scores/${liveMatchId}`, {
        method: "DELETE",
        credentials: "include",
      });
      setLiveMatchId(null);
      toast({ title: "Match ended. Final scores saved." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center">Loading...</div>;
  if (!booking) return <div className="h-screen flex items-center justify-center">Booking not found</div>;

  const isConfirmed = booking.status === "confirmed";
  const isTodayBooking = isToday(parseISO(booking.date));
  const canGoLive = isConfirmed && isTodayBooking;

  return (
    <div className="flex flex-col min-h-screen bg-muted/10 pb-32">
      <Header title="Booking Details" showLocation={false} />

      <main className="flex-1 p-4 space-y-5">
        {/* Status Header */}
        <div className="text-center py-4">
          {isConfirmed ? (
            <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="h-8 w-8" />
            </div>
          ) : booking.status === "cancelled" ? (
            <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="h-8 w-8" />
            </div>
          ) : (
            <div className="w-16 h-16 bg-yellow-500/20 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <Clock className="h-8 w-8" />
            </div>
          )}
          <h2 className="text-xl font-bold mb-1">
            {isConfirmed ? "Booking Confirmed!" : booking.status === "cancelled" ? "Booking Cancelled" : "Payment Pending"}
          </h2>
          <p className="text-muted-foreground text-sm">Booking ID: #{booking.id}</p>
        </div>

        {/* Booking Info Card */}
        <Card className="p-4 border-none shadow-md">
          <h3 className="font-bold text-lg mb-4">{booking.turfName}</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-primary flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Location</p>
                <p className="font-medium text-sm">{booking.turfArea}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-primary flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Date</p>
                <p className="font-medium text-sm">{format(parseISO(booking.date), "EEEE, MMMM dd, yyyy")}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-primary flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Time Slot</p>
                <p className="font-medium text-sm">{booking.startTime} – {booking.endTime}</p>
              </div>
            </div>
            {(booking as any).playerCount && (
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-primary flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Players</p>
                  <p className="font-medium text-sm">{(booking as any).playerCount} players</p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-dashed flex justify-between items-center">
            <span className="font-bold text-muted-foreground">Total Amount</span>
            <span className="text-2xl font-bold text-primary">₹{booking.totalPrice}</span>
          </div>
        </Card>

        {/* Payment Status */}
        <div className="bg-card rounded-xl p-4 shadow-sm border border-border">
          <h3 className="font-bold mb-3">Payment Status</h3>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Razorpay</span>
            </div>
            <Badge variant={booking.paymentStatus === "paid" ? "default" : "secondary"}>
              {booking.paymentStatus === "paid" ? "Paid" : "Pending"}
            </Badge>
          </div>
        </div>

        {/* Live Score Section */}
        {canGoLive && !liveMatchId && (
          <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/5 border border-green-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Radio className="h-5 w-5 text-green-600 animate-pulse" />
              <h3 className="font-bold text-green-700">Today's Match — Go Live!</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Your booking is confirmed for today. Stream live scores to the Community feed!
            </p>
            {!isLiveDialogOpen ? (
              <Button
                className="w-full bg-green-600 hover:bg-green-700"
                onClick={() => setIsLiveDialogOpen(true)}
              >
                <Zap className="h-4 w-4 mr-2" /> Start Live Score
              </Button>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Team A Name</label>
                  <Input
                    placeholder="e.g. Banjara Lions"
                    value={teamA}
                    onChange={e => setTeamA(e.target.value)}
                    className="bg-background"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Team B Name</label>
                  <Input
                    placeholder="e.g. Hitech Hawks"
                    value={teamB}
                    onChange={e => setTeamB(e.target.value)}
                    className="bg-background"
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setIsLiveDialogOpen(false)}>Cancel</Button>
                  <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={handleGoLive}>
                    <Radio className="h-4 w-4 mr-2" /> Go Live!
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Live Score Control Panel */}
        {liveMatchId && (
          <div className="bg-gradient-to-br from-red-500/10 to-orange-500/5 border border-red-500/30 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
              <h3 className="font-bold text-red-600">LIVE — Update Score</h3>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">{teamA} Score</label>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setScoreA(s => Math.max(0, s - 1))}>-</Button>
                  <span className="w-10 text-center font-bold text-lg">{scoreA}</span>
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setScoreA(s => s + 1)}>+</Button>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">{teamB} Score</label>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setScoreB(s => Math.max(0, s - 1))}>-</Button>
                  <span className="w-10 text-center font-bold text-lg">{scoreB}</span>
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setScoreB(s => s + 1)}>+</Button>
                </div>
              </div>
            </div>

            <div className="mb-3">
              <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Overs</label>
              <Input
                placeholder="e.g. 4.2 / 8"
                value={overs}
                onChange={e => setOvers(e.target.value)}
                className="bg-background h-9"
              />
            </div>

            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={handleUpdateScore}
                disabled={isUpdatingScore}
              >
                {isUpdatingScore ? "Updating..." : "Update Score"}
              </Button>
              <Button variant="outline" className="text-red-600 border-red-300" onClick={handleEndMatch}>
                End Match
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* Action Footer — sits above the bottom nav (h-16) */}
      {!isConfirmed && booking.status !== "cancelled" && (
        <div className="fixed bottom-16 left-0 right-0 p-4 bg-background border-t border-border z-40 max-w-md mx-auto">
          <Button
            className="w-full h-14 font-bold text-base rounded-xl shadow-lg shadow-primary/25"
            onClick={handlePayment}
            disabled={createPaymentMutation.isPending || verifyPaymentMutation.isPending}
          >
            {createPaymentMutation.isPending || verifyPaymentMutation.isPending
              ? "Processing..."
              : "Pay with Razorpay →"}
          </Button>
        </div>
      )}

      {isConfirmed && (
        <div className="fixed bottom-16 left-0 right-0 p-4 bg-background border-t border-border z-40 max-w-md mx-auto">
          <Link href="/turfs" className="block w-full">
            <Button variant="outline" className="w-full h-12 font-bold rounded-xl">
              Book Another Turf
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
