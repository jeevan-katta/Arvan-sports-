import { useState } from "react";
import { useLocation } from "wouter";
import { Header } from "@/components/layout/Header";
import { useGetCart, useCreateOrder, useCreateOrderPayment, useVerifyOrderPayment } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { MapPin, CreditCard, ShieldCheck } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetCartQueryKey } from "@workspace/api-client-react";

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
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: cart } = useGetCart();
  const createOrderMutation = useCreateOrder();
  const createPaymentMutation = useCreateOrderPayment();
  const verifyPaymentMutation = useVerifyOrderPayment();

  const form = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      fullName: "",
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
      // 1. Create order
      const fullAddress = `${data.fullName}, ${data.phone}\n${data.streetAddress}, ${data.city} - ${data.pincode}`;
      
      const order = await createOrderMutation.mutateAsync({
        data: { shippingAddress: fullAddress }
      });

      // 2. Create payment intent
      const paymentOrder = await createPaymentMutation.mutateAsync({ id: order.id });

      // 3. Simulate Razorpay flow
      toast({
        title: "Payment Initiated",
        description: "Simulating successful Razorpay payment...",
      });

      // In a real app, you'd open Razorpay checkout here
      // For this demo, we simulate success after a delay
      setTimeout(async () => {
        try {
          await verifyPaymentMutation.mutateAsync({
            data: {
              razorpayOrderId: paymentOrder.orderId,
              razorpayPaymentId: "pay_" + Math.random().toString(36).substring(2, 10),
              razorpaySignature: "simulated_signature"
            }
          });

          queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });
          
          toast({
            title: "Order Placed Successfully!",
            description: `Order #${order.id} has been confirmed.`,
          });
          
          setLocation("/orders");
        } catch (error: any) {
          toast({ variant: "destructive", title: "Payment Failed", description: error.message });
          setIsProcessing(false);
        }
      }, 1500);

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
    <div className="flex flex-col min-h-screen bg-background pb-32">
      <Header title="Checkout" showLocation={false} />

      <main className="p-4 space-y-6">
        <div className="bg-muted/30 p-4 rounded-xl border border-border">
          <h3 className="font-bold flex items-center mb-3">
            <MapPin className="h-4 w-4 mr-2 text-primary" /> Delivery Address
          </h3>
          
          <Form {...form}>
            <form id="checkout-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
              <FormField control={form.control} name="fullName" render={({ field }) => (
                <FormItem><FormControl><Input placeholder="Full Name" className="bg-background" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem><FormControl><Input placeholder="Phone Number" type="tel" className="bg-background" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="streetAddress" render={({ field }) => (
                <FormItem><FormControl><Textarea placeholder="House No, Building, Street, Area" className="bg-background resize-none" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="city" render={({ field }) => (
                  <FormItem><FormControl><Input placeholder="City" className="bg-background" {...field} disabled /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="pincode" render={({ field }) => (
                  <FormItem><FormControl><Input placeholder="Pincode" className="bg-background" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
            </form>
          </Form>
        </div>

        <div className="bg-muted/30 p-4 rounded-xl border border-border">
          <h3 className="font-bold flex items-center mb-3">
            <CreditCard className="h-4 w-4 mr-2 text-primary" /> Payment Method
          </h3>
          <div className="p-3 border border-primary bg-primary/5 rounded-lg flex items-center">
            <div className="h-4 w-4 rounded-full border-4 border-primary mr-3" />
            <span className="font-medium text-sm">Pay via Razorpay</span>
            <span className="ml-auto text-xs text-muted-foreground">UPI, Cards, NetBanking</span>
          </div>
        </div>

      </main>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border z-40 max-w-md mx-auto">
        <div className="flex items-center justify-between mb-3 text-sm">
          <div className="flex items-center text-muted-foreground">
            <ShieldCheck className="h-4 w-4 mr-1 text-green-500" /> Secure checkout
          </div>
          <div className="font-bold text-lg text-primary">₹{cart.total}</div>
        </div>
        <Button 
          type="submit"
          form="checkout-form"
          className="w-full h-14 text-base font-bold rounded-xl shadow-lg shadow-primary/25"
          disabled={isProcessing}
        >
          {isProcessing ? "Processing..." : "Place Order & Pay"}
        </Button>
      </div>
    </div>
  );
}