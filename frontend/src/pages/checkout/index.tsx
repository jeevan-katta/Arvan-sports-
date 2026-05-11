import { useState } from "react";
import { useLocation } from "wouter";
import { Header } from "@/components/layout/Header";
import { useGetCart, useCreateOrder, useCreateOrderPayment, useVerifyOrderPayment } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { MapPin, CreditCard, ShieldCheck, Package } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetCartQueryKey } from "@workspace/api-client-react";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const addressSchema = z.object({
  fullName: z.string().min(2, "Name is required"),
  phone: z.string().min(10, "Valid phone number is required"),
  streetAddress: z.string().min(10, "Full street address is required"),
  city: z.string().min(2, "City is required").default("Hyderabad"),
  pincode: z.string().min(6, "Valid pincode is required"),
});

type AddressFormValues = z.infer<typeof addressSchema>;

export default function Checkout() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: cart } = useGetCart();
  const createOrderMutation = useCreateOrder();
  const createPaymentMutation = useCreateOrderPayment();
  const verifyPaymentMutation = useVerifyOrderPayment();

  const form = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      fullName: user?.name || "",
      phone: "",
      streetAddress: "",
      city: "Hyderabad",
      pincode: "",
    },
  });

  const onSubmit = async (data: AddressFormValues) => {
    if (!cart || cart.items.length === 0) return;

    setIsProcessing(true);

    try {
      const fullAddress = `${data.fullName}, ${data.phone}\n${data.streetAddress}, ${data.city} - ${data.pincode}`;

      const order = await createOrderMutation.mutateAsync({
        data: { shippingAddress: fullAddress }
      });

      const paymentOrder = await createPaymentMutation.mutateAsync({ id: order.id });

      const rzpOptions = {
        key: paymentOrder.key,
        amount: paymentOrder.amount,
        currency: paymentOrder.currency || "INR",
        name: "Arvan Sports",
        description: `Order #${order.id}`,
        order_id: paymentOrder.orderId,
        prefill: {
          name: data.fullName,
          contact: data.phone,
          email: user?.email || "",
        },
        theme: { color: "#16a34a" },
        handler: async (response: any) => {
          try {
            await verifyPaymentMutation.mutateAsync({
              id: order.id,
              data: {
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              }
            });

            queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });
            toast({
              title: "Order Placed! 🎉",
              description: `Order #${order.id} confirmed. Your gear is on the way!`,
            });
            setLocation("/orders");
          } catch (err: any) {
            toast({ variant: "destructive", title: "Payment Verification Failed", description: err.message });
            setIsProcessing(false);
          }
        },
        modal: {
          ondismiss: () => {
            toast({ title: "Payment cancelled", description: "Your order was not placed." });
            setIsProcessing(false);
          }
        }
      };

      if (window.Razorpay) {
        const rzp = new window.Razorpay(rzpOptions);
        rzp.on("payment.failed", (resp: any) => {
          toast({ variant: "destructive", title: "Payment Failed", description: resp.error?.description || "Payment failed" });
          setIsProcessing(false);
        });
        rzp.open();
      } else {
        toast({ variant: "destructive", title: "Payment Error", description: "Razorpay is not loaded. Please refresh and try again." });
        setIsProcessing(false);
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Checkout Failed", description: error.message });
      setIsProcessing(false);
    }
  };

  if (!cart || cart.items.length === 0) {
    setLocation("/cart");
    return null;
  }

  return (
    <div className="flex flex-col min-h-screen bg-background pb-36">
      <Header title="Checkout" showLocation={false} />

      <main className="p-4 space-y-5">
        {/* Order Summary */}
        <div className="bg-muted/30 p-4 rounded-xl border border-border">
          <h3 className="font-bold flex items-center mb-3">
            <Package className="h-4 w-4 mr-2 text-primary" /> Order Summary
          </h3>
          <div className="space-y-2">
            {cart.items.map(item => (
              <div key={item.productId} className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-lg border border-border/50 flex items-center justify-center flex-shrink-0">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="max-w-full max-h-full p-0.5 object-contain" />
                  ) : (
                    <Package className="h-4 w-4 text-muted-foreground/30" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                </div>
                <span className="text-sm font-bold flex-shrink-0">₹{item.subtotal}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Delivery Address */}
        <div className="bg-muted/30 p-4 rounded-xl border border-border">
          <h3 className="font-bold flex items-center mb-3">
            <MapPin className="h-4 w-4 mr-2 text-primary" /> Delivery Address
          </h3>

          <Form {...form}>
            <form id="checkout-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="fullName" render={({ field }) => (
                  <FormItem className="col-span-2"><FormControl>
                    <Input placeholder="Full Name" className="bg-background" {...field} />
                  </FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem className="col-span-2"><FormControl>
                    <Input placeholder="Phone Number" type="tel" className="bg-background" {...field} />
                  </FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="streetAddress" render={({ field }) => (
                  <FormItem className="col-span-2"><FormControl>
                    <Textarea placeholder="House No, Building, Street, Area" className="bg-background resize-none h-20" {...field} />
                  </FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="city" render={({ field }) => (
                  <FormItem><FormControl>
                    <Input placeholder="City" className="bg-background" {...field} disabled />
                  </FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="pincode" render={({ field }) => (
                  <FormItem><FormControl>
                    <Input placeholder="Pincode" className="bg-background" {...field} />
                  </FormControl><FormMessage /></FormItem>
                )} />
              </div>
            </form>
          </Form>
        </div>

        {/* Payment Method */}
        <div className="bg-muted/30 p-4 rounded-xl border border-border">
          <h3 className="font-bold flex items-center mb-3">
            <CreditCard className="h-4 w-4 mr-2 text-primary" /> Payment Method
          </h3>
          <div className="p-3 border-2 border-primary bg-primary/5 rounded-xl flex items-center gap-3">
            <div className="h-4 w-4 rounded-full border-4 border-primary flex-shrink-0" />
            <div className="flex-1">
              <span className="font-semibold text-sm">Pay via Razorpay</span>
              <p className="text-xs text-muted-foreground">UPI · Cards · NetBanking · Wallets</p>
            </div>
            <img src="https://razorpay.com/favicon.png" alt="Razorpay" className="h-5 w-5 rounded opacity-80" />
          </div>
        </div>
      </main>

      {/* Footer — above bottom nav (h-16) */}
      <div className="fixed bottom-16 left-0 right-0 bg-background border-t border-border z-40 max-w-md mx-auto">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center text-sm text-muted-foreground">
              <ShieldCheck className="h-4 w-4 mr-1 text-green-500" /> 100% Secure Checkout
            </div>
            <div className="font-bold text-lg text-primary">₹{cart.total}</div>
          </div>
          <Button
            type="submit"
            form="checkout-form"
            className="w-full h-14 text-base font-bold rounded-xl shadow-lg shadow-primary/25"
            disabled={isProcessing}
          >
            {isProcessing ? "Processing..." : `Pay ₹${cart.total} with Razorpay`}
          </Button>
        </div>
      </div>
    </div>
  );
}
