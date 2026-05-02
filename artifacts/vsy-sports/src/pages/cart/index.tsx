import { Link, useLocation } from "wouter";
import { Header } from "@/components/layout/Header";
import { useGetCart, useRemoveFromCart } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ShoppingBag, Trash2, ArrowRight } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetCartQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

export default function Cart() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: cart, isLoading } = useGetCart();
  const removeMutation = useRemoveFromCart();

  const handleRemove = (productId: number) => {
    removeMutation.mutate({ id: productId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });
        toast({ description: "Item removed from cart" });
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-full">
        <Header title="Your Cart" showLocation={false} />
        <div className="p-4 space-y-4">
          {[1, 2].map(i => <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />)}
        </div>
      </div>
    );
  }

  const isEmpty = !cart || cart.items.length === 0;

  return (
    <div className="flex flex-col min-h-screen bg-muted/10 pb-32">
      <Header title="Your Cart" showLocation={false} />

      {isEmpty ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4">
            <ShoppingBag className="h-10 w-10 text-muted-foreground opacity-50" />
          </div>
          <h2 className="text-xl font-bold mb-2">Your cart is empty</h2>
          <p className="text-muted-foreground mb-8 text-sm max-w-[250px]">
            Looks like you haven't added any cricket gear to your cart yet.
          </p>
          <Button onClick={() => setLocation("/shop")} className="h-12 px-8 rounded-xl font-bold">
            Start Shopping
          </Button>
        </div>
      ) : (
        <>
          <main className="flex-1 p-4 space-y-3">
            {cart.items.map((item) => (
              <Card key={item.productId} className="flex p-3 gap-3 border-none shadow-sm">
                <div className="w-20 h-20 bg-white rounded-md border border-border flex items-center justify-center flex-shrink-0">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="max-w-full max-h-full p-1 object-contain" />
                  ) : (
                    <ShoppingBag className="h-6 w-6 text-muted-foreground/30" />
                  )}
                </div>
                
                <div className="flex-1 flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <h3 className="font-semibold text-sm line-clamp-2 pr-2">{item.name}</h3>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 text-muted-foreground hover:text-destructive -mt-1 -mr-1"
                      onClick={() => handleRemove(item.productId)}
                      disabled={removeMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="flex justify-between items-end mt-2">
                    <div className="text-sm font-bold text-primary">₹{item.price}</div>
                    <div className="text-xs bg-muted px-2 py-1 rounded font-medium">
                      Qty: {item.quantity}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </main>

          {/* Checkout Footer */}
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border z-40 max-w-md mx-auto rounded-t-2xl shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
            <div className="space-y-3 mb-4">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Subtotal ({cart.itemCount} items)</span>
                <span>₹{cart.total}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Delivery</span>
                <span className="text-green-600 font-medium">Free</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t border-border/50">
                <span>Total</span>
                <span>₹{cart.total}</span>
              </div>
            </div>
            
            <Button 
              className="w-full h-14 text-base font-bold rounded-xl shadow-lg shadow-primary/25"
              onClick={() => setLocation("/checkout")}
            >
              Proceed to Checkout <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}