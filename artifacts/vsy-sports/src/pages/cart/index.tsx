import { Link, useLocation } from "wouter";
import { Header } from "@/components/layout/Header";
import { useGetCart, useRemoveFromCart } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ShoppingBag, Trash2, ArrowRight, Minus, Plus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetCartQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export default function Cart() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const { data: cart, isLoading } = useGetCart();
  const removeMutation = useRemoveFromCart();

  const handleRemove = (productId: string) => {
    removeMutation.mutate({ productId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });
        toast({ description: "Item removed from cart" });
      }
    });
  };

  const handleUpdateQty = async (productId: string, newQty: number) => {
    if (newQty < 1) {
      handleRemove(productId);
      return;
    }
    setUpdatingId(productId);
    try {
      const res = await fetch(`/api/shop/cart/${productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ quantity: newQty }),
      });
      if (!res.ok) throw new Error("Failed to update");
      queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });
    } catch {
      toast({ variant: "destructive", description: "Failed to update quantity" });
    } finally {
      setUpdatingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-full">
        <Header title="Your Cart" showLocation={false} />
        <div className="p-4 space-y-4">
          {[1, 2].map(i => <div key={i} className="h-28 bg-muted animate-pulse rounded-xl" />)}
        </div>
      </div>
    );
  }

  const isEmpty = !cart || cart.items.length === 0;

  return (
    <div className="flex flex-col min-h-screen bg-muted/10 pb-48">
      <Header title="Your Cart" showLocation={false} />

      {isEmpty ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
            <ShoppingBag className="h-12 w-12 text-muted-foreground opacity-40" />
          </div>
          <h2 className="text-xl font-bold mb-2">Your cart is empty</h2>
          <p className="text-muted-foreground mb-8 text-sm max-w-[260px]">
            Looks like you haven't added any cricket gear to your cart yet.
          </p>
          <Button onClick={() => setLocation("/shop")} className="h-12 px-8 rounded-xl font-bold">
            Start Shopping
          </Button>
        </div>
      ) : (
        <>
          <main className="flex-1 p-4 space-y-3">
            <p className="text-sm text-muted-foreground font-medium">{cart.itemCount} item{cart.itemCount !== 1 ? "s" : ""} in cart</p>

            {cart.items.map((item) => (
              <Card key={item.productId} className="border-none shadow-sm overflow-hidden">
                <div className="flex p-3 gap-3">
                  <Link href={`/shop/${item.productId}`}>
                    <div className="w-20 h-20 bg-white rounded-xl border border-border/50 flex items-center justify-center flex-shrink-0 cursor-pointer hover:border-primary/40 transition-colors">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="max-w-full max-h-full p-1 object-contain" />
                      ) : (
                        <ShoppingBag className="h-6 w-6 text-muted-foreground/30" />
                      )}
                    </div>
                  </Link>

                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <h3 className="font-semibold text-sm line-clamp-2 pr-2 flex-1">{item.name}</h3>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive flex-shrink-0 -mt-0.5 -mr-1"
                        onClick={() => handleRemove(item.productId)}
                        disabled={removeMutation.isPending}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    <div className="flex justify-between items-center mt-2">
                      <div>
                        <span className="font-bold text-primary text-base">₹{item.price}</span>
                        <span className="text-xs text-muted-foreground ml-1">each</span>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center border border-border rounded-xl bg-background overflow-hidden">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-none hover:bg-muted"
                          disabled={updatingId === item.productId}
                          onClick={() => handleUpdateQty(item.productId, item.quantity - 1)}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </Button>
                        <span className="w-8 text-center text-sm font-bold">
                          {updatingId === item.productId ? "…" : item.quantity}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-none hover:bg-muted"
                          disabled={updatingId === item.productId}
                          onClick={() => handleUpdateQty(item.productId, item.quantity + 1)}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground mt-1">
                      Subtotal: <span className="font-semibold text-foreground">₹{item.subtotal}</span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </main>

          {/* Checkout Footer — above bottom nav (h-16) */}
          <div className="fixed bottom-16 left-0 right-0 bg-background border-t border-border z-40 max-w-md mx-auto rounded-t-2xl shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.15)]">
            <div className="p-4 space-y-2.5">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Subtotal ({cart.itemCount} item{cart.itemCount !== 1 ? "s" : ""})</span>
                <span>₹{cart.total}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Delivery</span>
                <span className="text-green-600 font-semibold">FREE</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t border-border/50">
                <span>Total</span>
                <span className="text-primary">₹{cart.total}</span>
              </div>
            </div>
            <div className="px-4 pb-4">
              <Button
                className="w-full h-14 text-base font-bold rounded-xl shadow-lg shadow-primary/25"
                onClick={() => setLocation("/checkout")}
              >
                Proceed to Checkout <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
