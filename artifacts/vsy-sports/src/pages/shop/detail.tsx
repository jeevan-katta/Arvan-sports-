import { useState } from "react";
import { useParams, Link } from "wouter";
import { useGetProduct, useAddToCart } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ShoppingCart, Star, ShieldCheck, Truck, ArrowLeftRight, Minus, Plus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetCartQueryKey } from "@workspace/api-client-react";

export default function ProductDetail() {
  const { id } = useParams();
  const productId = parseInt(id || "0", 10);
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);

  const { data: product, isLoading } = useGetProduct(productId, {
    query: { enabled: !!productId }
  });

  const addToCartMutation = useAddToCart();

  const handleAddToCart = () => {
    if (!isAuthenticated) {
      toast({ title: "Login required", description: "Please login to add items to cart." });
      return;
    }

    addToCartMutation.mutate({
      data: { productId, quantity }
    }, {
      onSuccess: () => {
        toast({ title: "Added to cart", description: `${product?.name} was added to your cart.` });
        queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });
      },
      onError: (error) => {
        toast({ variant: "destructive", title: "Failed to add", description: error.message });
      }
    });
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center">Loading...</div>;
  if (!product) return <div className="h-screen flex items-center justify-center">Product not found</div>;

  const hasDiscount = product.originalPrice && product.originalPrice > product.price;
  const discountPercent = hasDiscount 
    ? Math.round(((product.originalPrice! - product.price) / product.originalPrice!) * 100) 
    : 0;

  return (
    <div className="flex flex-col min-h-screen bg-background pb-24">
      {/* Header / Nav */}
      <header className="absolute top-0 left-0 right-0 z-40 p-4 flex justify-between items-center bg-gradient-to-b from-black/30 to-transparent">
        <Link href="/shop" className="bg-background/80 backdrop-blur rounded-full p-2 text-foreground">
            <ChevronLeft className="h-5 w-5" />
        </Link>
        <Link href="/cart" className="bg-background/80 backdrop-blur rounded-full p-2 text-foreground relative">
            <ShoppingCart className="h-5 w-5" />
        </Link>
      </header>

      {/* Image Gallery */}
      <div className="bg-white pt-16 pb-6 px-4">
        <div className="relative aspect-square w-full max-w-sm mx-auto flex items-center justify-center mb-4">
          {product.images && product.images.length > 0 ? (
            <img 
              src={product.images[activeImage]} 
              alt={product.name} 
              className="max-w-full max-h-full object-contain"
            />
          ) : (
            <div className="h-40 w-40 bg-muted rounded-full flex items-center justify-center">
              <ShoppingCart className="h-10 w-10 text-muted-foreground/30" />
            </div>
          )}
          
          {hasDiscount && (
            <Badge className="absolute top-0 right-0 bg-destructive hover:bg-destructive text-destructive-foreground text-sm font-bold px-2 py-1">
              {discountPercent}% OFF
            </Badge>
          )}
        </div>

        {product.images && product.images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto justify-center px-4 pb-2 hide-scrollbar">
            {product.images.map((img, idx) => (
              <button
                key={idx}
                className={`h-16 w-16 flex-shrink-0 rounded-md border-2 overflow-hidden ${activeImage === idx ? 'border-primary' : 'border-transparent'}`}
                onClick={() => setActiveImage(idx)}
              >
                <img src={img} alt={`View ${idx+1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 space-y-5 flex-1">
        {/* Title & Price */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {product.brand || product.category}
            </span>
            {product.rating && (
              <div className="flex items-center text-xs font-bold bg-yellow-500/10 text-yellow-600 px-2 py-0.5 rounded">
                <Star className="h-3 w-3 fill-current mr-1" />
                {product.rating} ({product.reviewCount})
              </div>
            )}
          </div>
          <h1 className="text-xl font-bold leading-tight mb-3">{product.name}</h1>
          
          <div className="flex items-end gap-2">
            <span className="text-3xl font-display font-bold text-primary">₹{product.price}</span>
            {hasDiscount && (
              <span className="text-sm text-muted-foreground line-through decoration-muted-foreground/50 mb-1.5">
                ₹{product.originalPrice}
              </span>
            )}
          </div>
        </div>

        <div className="h-px bg-border/60 w-full" />

        {/* Features/Guarantees */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="flex flex-col items-center p-2 bg-muted/30 rounded-lg">
            <ShieldCheck className="h-5 w-5 text-primary mb-1" />
            <span className="text-[10px] font-medium uppercase text-muted-foreground">Original Gear</span>
          </div>
          <div className="flex flex-col items-center p-2 bg-muted/30 rounded-lg">
            <Truck className="h-5 w-5 text-primary mb-1" />
            <span className="text-[10px] font-medium uppercase text-muted-foreground">Fast Delivery</span>
          </div>
          <div className="flex flex-col items-center p-2 bg-muted/30 rounded-lg">
            <ArrowLeftRight className="h-5 w-5 text-primary mb-1" />
            <span className="text-[10px] font-medium uppercase text-muted-foreground">Easy Returns</span>
          </div>
        </div>

        {/* Description */}
        {product.description && (
          <div>
            <h3 className="font-bold text-sm mb-2">Product Details</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {product.description}
            </p>
          </div>
        )}
      </div>

      {/* Floating Add to Cart */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/90 backdrop-blur-md border-t border-border z-40 max-w-md mx-auto">
        <div className="flex items-center gap-3">
          <div className="flex items-center border border-input rounded-xl h-14 bg-background px-1">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={quantity <= 1}
              className="h-10 w-10"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="w-8 text-center font-bold">{quantity}</span>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setQuantity(Math.min((product.stock || 10), quantity + 1))}
              disabled={quantity >= (product.stock || 10)}
              className="h-10 w-10"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          
          <Button 
            className="flex-1 h-14 font-bold text-base rounded-xl"
            onClick={handleAddToCart}
            disabled={addToCartMutation.isPending || product.stock === 0}
          >
            {addToCartMutation.isPending ? "Adding..." : 
             product.stock === 0 ? "Out of Stock" : "Add to Cart"}
          </Button>
        </div>
      </div>
    </div>
  );
}