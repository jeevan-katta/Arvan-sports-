import { useState } from "react";
import { useListProducts, useCreateProduct, useListOrders, useUpdateOrderStatus } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { Package, Plus, ShoppingBag, TrendingUp, IndianRupee } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getListProductsQueryKey, getListOrdersQueryKey } from "@workspace/api-client-react";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { cn } from "@/lib/utils";

const productSchema = z.object({
  name: z.string().min(3),
  description: z.string().optional(),
  price: z.coerce.number().min(1),
  originalPrice: z.coerce.number().optional(),
  category: z.string().min(2),
  brand: z.string().optional(),
  stock: z.coerce.number().default(10),
});

const ORDER_STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-400",
  processing: "bg-blue-500/10 text-blue-400",
  shipped: "bg-violet-500/10 text-violet-400",
  delivered: "bg-emerald-500/10 text-emerald-400",
  cancelled: "bg-red-500/10 text-red-400",
};

export default function AdminShop() {
  const [activeTab, setActiveTab] = useState<"products" | "orders">("products");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: products, isLoading: loadingProducts } = useListProducts();
  const { data: orders, isLoading: loadingOrders } = useListOrders();
  const createProductMutation = useCreateProduct();
  const updateStatusMutation = useUpdateOrderStatus();

  const form = useForm<z.infer<typeof productSchema>>({
    resolver: zodResolver(productSchema),
    defaultValues: { name: "", category: "Bats", price: 0, stock: 10 },
  });

  const onProductSubmit = (data: z.infer<typeof productSchema>) => {
    createProductMutation.mutate({ data }, {
      onSuccess: () => {
        toast({ title: "Product added!" });
        form.reset();
        queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
      },
    });
  };

  const handleStatusUpdate = (id: number, status: any) => {
    updateStatusMutation.mutate({ id, data: { status } }, {
      onSuccess: () => {
        toast({ title: "Order status updated" });
        queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
      },
    });
  };

  const totalShopRevenue = (orders || [])
    .filter((o: any) => o.paymentStatus === "paid")
    .reduce((s: number, o: any) => s + (o.totalAmount || 0), 0);

  return (
    <div className="p-4 md:p-8 text-white">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-black tracking-tight">Shop Management</h2>
          <p className="text-white/40 text-sm mt-0.5">{products?.length || 0} products · {orders?.length || 0} orders</p>
        </div>
        <div className="flex gap-1 bg-white/5 rounded-xl p-1">
          <button
            onClick={() => setActiveTab("products")}
            className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all",
              activeTab === "products" ? "bg-primary text-primary-foreground" : "text-white/40 hover:text-white"
            )}
          >
            <ShoppingBag className="h-3.5 w-3.5" /> Products
          </button>
          <button
            onClick={() => setActiveTab("orders")}
            className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all",
              activeTab === "orders" ? "bg-primary text-primary-foreground" : "text-white/40 hover:text-white"
            )}
          >
            <Package className="h-3.5 w-3.5" /> Orders
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
          <p className="text-2xl font-black text-white">{products?.length || 0}</p>
          <p className="text-[10px] text-white/30 font-bold uppercase mt-0.5">Products</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
          <p className="text-2xl font-black text-white">{orders?.length || 0}</p>
          <p className="text-[10px] text-white/30 font-bold uppercase mt-0.5">Total Orders</p>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 text-center">
          <p className="text-2xl font-black text-emerald-400">₹{totalShopRevenue.toLocaleString("en-IN")}</p>
          <p className="text-[10px] text-emerald-400/60 font-bold uppercase mt-0.5">Shop Revenue</p>
        </div>
      </div>

      {/* Products Tab */}
      {activeTab === "products" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Dialog>
              <DialogTrigger asChild>
                <Button className="gap-2 font-bold bg-primary hover:bg-primary/90 rounded-xl h-10 px-5">
                  <Plus className="h-4 w-4" /> Add Product
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#1a1d27] border-white/10 text-white">
                <DialogHeader>
                  <DialogTitle className="text-white">New Product</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onProductSubmit)} className="space-y-4 pt-2">
                    <FormField control={form.control} name="name" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white/60 text-xs">Product Name</FormLabel>
                        <FormControl>
                          <Input {...field} className="bg-white/5 border-white/10 text-white" />
                        </FormControl>
                      </FormItem>
                    )} />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={form.control} name="category" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white/60 text-xs">Category</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {["Bats","Balls","Helmets","Gloves","Pads","Bags","Apparel"].map(c => (
                                <SelectItem key={c} value={c}>{c}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="brand" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white/60 text-xs">Brand</FormLabel>
                          <FormControl>
                            <Input {...field} className="bg-white/5 border-white/10 text-white" />
                          </FormControl>
                        </FormItem>
                      )} />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <FormField control={form.control} name="price" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white/60 text-xs">Price (₹)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} className="bg-white/5 border-white/10 text-white" />
                          </FormControl>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="originalPrice" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white/60 text-xs">MRP</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} className="bg-white/5 border-white/10 text-white" />
                          </FormControl>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="stock" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white/60 text-xs">Stock</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} className="bg-white/5 border-white/10 text-white" />
                          </FormControl>
                        </FormItem>
                      )} />
                    </div>
                    <Button type="submit" className="w-full font-bold bg-primary hover:bg-primary/90" disabled={createProductMutation.isPending}>
                      {createProductMutation.isPending ? "Adding..." : "Add Product"}
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-white/30">Product</th>
                    <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-white/30">Category</th>
                    <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-white/30">Price</th>
                    <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-white/30">MRP</th>
                    <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-white/30">Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {loadingProducts && [...Array(4)].map((_, i) => (
                    <tr key={i}>
                      {[...Array(5)].map((_, j) => (
                        <td key={j} className="px-5 py-4"><div className="h-4 bg-white/5 rounded animate-pulse" /></td>
                      ))}
                    </tr>
                  ))}
                  {!loadingProducts && (products || []).map((p: any) => (
                    <tr key={p.id} className="hover:bg-white/[0.03] transition-colors">
                      <td className="px-5 py-4">
                        <p className="font-bold text-white">{p.name}</p>
                        <p className="text-[11px] text-white/30">{p.brand}</p>
                      </td>
                      <td className="px-5 py-4 text-white/50">{p.category}</td>
                      <td className="px-5 py-4 text-right font-bold text-primary">₹{p.price}</td>
                      <td className="px-5 py-4 text-right text-white/30 line-through text-xs">{p.originalPrice ? `₹${p.originalPrice}` : "—"}</td>
                      <td className="px-5 py-4 text-right">
                        <span className={cn("text-sm font-bold", (p.stock || 0) <= 5 ? "text-red-400" : "text-white/60")}>
                          {p.stock}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Orders Tab */}
      {activeTab === "orders" && (
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-white/30">Order</th>
                  <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-white/30">User</th>
                  <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-white/30">Amount</th>
                  <th className="px-5 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-white/30">Payment</th>
                  <th className="px-5 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-white/30">Update Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loadingOrders && [...Array(4)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(5)].map((_, j) => (
                      <td key={j} className="px-5 py-4"><div className="h-4 bg-white/5 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))}
                {!loadingOrders && (orders || []).length === 0 && (
                  <tr><td colSpan={5} className="text-center py-12 text-white/30 text-sm">No orders yet</td></tr>
                )}
                {!loadingOrders && (orders || []).map((o: any) => (
                  <tr key={o.id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-bold text-white/80">#{o.id}</p>
                      <p className="text-[11px] text-white/30">{o.items?.length || 0} items</p>
                    </td>
                    <td className="px-5 py-4 text-white/60">{o.userName}</td>
                    <td className="px-5 py-4 text-right font-bold text-emerald-400">₹{o.totalAmount}</td>
                    <td className="px-5 py-4 text-center">
                      <span className={cn("text-[10px] font-bold px-2 py-1 rounded-full",
                        o.paymentStatus === "paid" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                      )}>
                        {o.paymentStatus}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <Select defaultValue={o.status} onValueChange={(val) => handleStatusUpdate(o.id, val)}>
                        <SelectTrigger className={cn("h-8 w-36 text-xs font-bold mx-auto bg-white/5 border-white/10 text-white", ORDER_STATUS_COLORS[o.status])}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {["pending","processing","shipped","delivered","cancelled"].map(s => (
                            <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
