import { useListOrders } from "@workspace/api-client-react";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import { Package, Truck, CheckCircle2, ChevronRight, ShoppingBag } from "lucide-react";
import { Link } from "wouter";

export default function Orders() {
  const { data: orders, isLoading } = useListOrders();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "delivered": return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "shipped": return <Truck className="h-5 w-5 text-blue-500" />;
      default: return <Package className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered": return "bg-green-500/10 text-green-600 border-green-500/20";
      case "shipped": return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "processing": return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
      case "cancelled": return "bg-red-500/10 text-red-600 border-red-500/20";
      default: return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <div className="flex flex-col min-h-full pb-20">
      <Header title="My Orders" showLocation={false} />
      
      <main className="flex-1 p-4 space-y-4">
        {isLoading ? (
          [1, 2].map(i => (
            <div key={i} className="h-48 rounded-xl bg-muted animate-pulse" />
          ))
        ) : orders?.length === 0 ? (
          <div className="text-center py-20">
            <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-3" />
            <h3 className="font-bold text-lg">No orders yet</h3>
            <p className="text-muted-foreground text-sm mb-6">You haven't bought any gear yet.</p>
            <Link href="/shop" className="inline-flex items-center justify-center h-10 px-6 font-medium bg-primary text-primary-foreground rounded-lg">
              Shop Now
            </Link>
          </div>
        ) : (
          orders?.map(order => (
            <Card key={order.id} className="border-border shadow-sm overflow-hidden">
              <div className="p-3 bg-muted/30 border-b border-border flex justify-between items-center">
                <div>
                  <div className="text-xs text-muted-foreground mb-0.5">Order #{order.id}</div>
                  <div className="text-xs font-medium">{format(parseISO(order.createdAt!), "MMM dd, yyyy")}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`${getStatusColor(order.status)} capitalize text-[10px] font-bold px-2 py-0.5`}>
                    {order.status}
                  </Badge>
                  {getStatusIcon(order.status)}
                </div>
              </div>
              
              <div className="p-4 space-y-3">
                {order.items.slice(0, 2).map((item, idx) => (
                  <div key={idx} className="flex gap-3">
                    <div className="h-12 w-12 bg-muted rounded flex items-center justify-center flex-shrink-0">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="max-h-full max-w-full p-1 object-contain" />
                      ) : (
                        <Package className="h-4 w-4 text-muted-foreground/50" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold line-clamp-1">{item.name}</h4>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-xs text-muted-foreground">Qty: {item.quantity}</span>
                        <span className="text-sm font-bold">₹{item.price * item.quantity}</span>
                      </div>
                    </div>
                  </div>
                ))}
                
                {order.items.length > 2 && (
                  <div className="text-xs text-center text-muted-foreground font-medium pt-1">
                    +{order.items.length - 2} more item(s)
                  </div>
                )}
              </div>
              
              <div className="p-3 bg-muted/10 border-t border-border flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Total Amount</span>
                <span className="font-bold text-primary">₹{order.totalAmount}</span>
              </div>
            </Card>
          ))
        )}
      </main>
    </div>
  );
}