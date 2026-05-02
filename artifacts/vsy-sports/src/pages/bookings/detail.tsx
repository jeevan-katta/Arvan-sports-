import { useParams, Link } from "wouter";
import { format, parseISO } from "date-fns";
import { useGetBooking, useCreateBookingPayment, useVerifyBookingPayment } from "@workspace/api-client-react";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Calendar, Clock, CreditCard, CheckCircle2, AlertCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetBookingQueryKey } from "@workspace/api-client-react";

export default function BookingDetail() {
  const { id } = useParams();
  const bookingId = parseInt(id || "0", 10);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: booking, isLoading } = useGetBooking(bookingId, {
    query: { enabled: !!bookingId }
  });

  const createPaymentMutation = useCreateBookingPayment();
  const verifyPaymentMutation = useVerifyBookingPayment();

  const handlePayment = async () => {
    if (!booking) return;

    try {
      toast({ title: "Initiating Payment", description: "Connecting to payment gateway..." });
      
      const paymentOrder = await createPaymentMutation.mutateAsync({ id: bookingId });
      
      // Simulate Razorpay flow
      setTimeout(async () => {
        try {
          await verifyPaymentMutation.mutateAsync({
            id: bookingId,
            data: {
              razorpayOrderId: paymentOrder.orderId,
              razorpayPaymentId: "pay_" + Math.random().toString(36).substring(2, 10),
              razorpaySignature: "simulated_signature"
            }
          });
          
          queryClient.invalidateQueries({ queryKey: getGetBookingQueryKey(bookingId) });
          
          toast({
            title: "Payment Successful",
            description: "Your booking is confirmed!",
          });
        } catch (error: any) {
          toast({ variant: "destructive", title: "Payment Verification Failed", description: error.message });
        }
      }, 1500);
      
    } catch (error: any) {
      toast({ variant: "destructive", title: "Payment Initialization Failed", description: error.message });
    }
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center">Loading...</div>;
  if (!booking) return <div className="h-screen flex items-center justify-center">Booking not found</div>;

  const isConfirmed = booking.status === "confirmed";

  return (
    <div className="flex flex-col min-h-screen bg-muted/10 pb-24">
      <Header title="Booking Details" showLocation={false} />

      <main className="flex-1 p-4 space-y-6">
        <div className="text-center py-6">
          {isConfirmed ? (
            <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8" />
            </div>
          ) : booking.status === "cancelled" ? (
            <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-8 w-8" />
            </div>
          ) : (
            <div className="w-16 h-16 bg-yellow-500/20 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="h-8 w-8" />
            </div>
          )}
          <h2 className="text-2xl font-bold mb-1">
            {isConfirmed ? "Booking Confirmed!" : booking.status === "cancelled" ? "Booking Cancelled" : "Payment Pending"}
          </h2>
          <p className="text-muted-foreground text-sm">
            Booking ID: #{booking.id}
          </p>
        </div>

        <Card className="p-4 border-none shadow-md overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <CheckCircle2 className="h-32 w-32" />
          </div>
          
          <h3 className="font-bold text-lg mb-4">{booking.turfName}</h3>
          
          <div className="space-y-4 relative z-10">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Location</p>
                <p className="font-medium text-sm">{booking.turfArea}</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Date</p>
                <p className="font-medium text-sm">{format(parseISO(booking.date), "EEEE, MMMM dd, yyyy")}</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Time Slot</p>
                <p className="font-medium text-sm">{booking.startTime} - {booking.endTime}</p>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-border border-dashed flex justify-between items-center relative z-10">
            <span className="font-bold text-muted-foreground">Total Amount</span>
            <span className="text-2xl font-bold text-primary">₹{booking.totalPrice}</span>
          </div>
        </Card>

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
      </main>

      {/* Action Footer */}
      {!isConfirmed && booking.status !== "cancelled" && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border z-40 max-w-md mx-auto">
          <Button 
            className="w-full h-14 font-bold text-base rounded-xl shadow-lg shadow-primary/25"
            onClick={handlePayment}
            disabled={createPaymentMutation.isPending || verifyPaymentMutation.isPending}
          >
            {createPaymentMutation.isPending || verifyPaymentMutation.isPending ? "Processing..." : "Pay Now"}
          </Button>
        </div>
      )}
      
      {isConfirmed && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border z-40 max-w-md mx-auto">
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