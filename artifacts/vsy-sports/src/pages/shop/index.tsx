import { useState } from "react";
import { Link } from "wouter";
import { Header } from "@/components/layout/Header";
import { useListProducts, useGetCart } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, ShoppingBag, Star, Filter } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

const CATEGORIES = ["All", "Bats", "Balls", "Helmets", "Gloves", "Pads", "Bags", "Apparel"];

export default function Shop() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  const { data: products, isLoading } = useListProducts({
    search: search || undefined,
    category: category !== "All" ? category : undefined
  });

  return (
    <div className="flex flex-col min-h-full pb-20">
      <Header title="Pro Shop" showLocation={false} />
      
      <div className="bg-background sticky top-14 z-30 border-b border-border">
        {/* Search */}
        <div className="p-4 pb-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search gear..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-10 bg-muted/50 border-none rounded-xl"
              />
            </div>
            <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl bg-muted/50 border-none">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Categories */}
        <ScrollArea className="w-full whitespace-nowrap pb-3 pt-1">
          <div className="flex px-4 gap-2">
            {CATEGORIES.map(cat => (
              <Button
                key={cat}
                variant={category === cat ? "default" : "outline"}
                size="sm"
                className={`h-8 rounded-full px-4 border-none text-xs font-semibold ${category !== cat ? 'bg-muted/50 text-muted-foreground' : ''}`}
                onClick={() => setCategory(cat)}
              >
                {cat}
              </Button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" className="invisible" />
        </ScrollArea>
      </div>

      <main className="flex-1 p-4">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-56 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : products?.length === 0 ? (
          <div className="text-center py-20">
            <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-3" />
            <h3 className="font-bold text-lg">No products found</h3>
            <p className="text-muted-foreground text-sm">Try a different search or category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {products?.map(product => (
              <Link key={product.id} href={`/shop/${product.id}`} className="block group">
                  <Card className="border-border shadow-sm h-full overflow-hidden flex flex-col hover:border-primary/50 transition-colors">
                    <div className="h-32 bg-white relative p-2 flex items-center justify-center border-b border-border/50">
                      {product.images?.[0] ? (
                        <img src={product.images[0]} alt={product.name} className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform" />
                      ) : (
                        <ShoppingBag className="h-10 w-10 text-muted-foreground/20" />
                      )}
                      
                      {product.originalPrice && product.originalPrice > product.price && (
                        <div className="absolute top-2 left-2 bg-destructive text-destructive-foreground px-1.5 py-0.5 rounded text-[10px] font-bold">
                          -{Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}%
                        </div>
                      )}
                    </div>
                    <CardContent className="p-3 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="text-[10px] text-muted-foreground uppercase font-bold mb-1">
                          {product.brand || product.category}
                        </div>
                        <h4 className="font-semibold text-sm leading-tight line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                          {product.name}
                        </h4>
                        {product.rating && (
                          <div className="flex items-center text-xs text-muted-foreground mb-2">
                            <Star className="h-3 w-3 text-yellow-500 fill-yellow-500 mr-1" />
                            {product.rating} ({product.reviewCount})
                          </div>
                        )}
                      </div>
                      
                      <div className="mt-2 flex items-center gap-1.5">
                        <span className="font-bold text-base">₹{product.price}</span>
                        {product.originalPrice && (
                          <span className="text-xs text-muted-foreground line-through decoration-muted-foreground/50">
                            ₹{product.originalPrice}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}