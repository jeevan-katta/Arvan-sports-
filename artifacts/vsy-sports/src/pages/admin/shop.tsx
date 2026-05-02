import { useState } from "react";
import { useListProducts, useCreateProduct, useListOrders, useUpdateOrderStatus } from "@workspace/api-client-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { Package, Plus, ShoppingBag } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getListProductsQueryKey, getListOrdersQueryKey } from "@workspace/api-client-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const productSchema = z.object({
  name: z.string().min(3),
  description: z.string().optional(),
  price: z.coerce.number().min(1),
  originalPrice: z.coerce.number().optional(),
  category: z.string().min(2),
  brand: z.string().optional(),
  stock: z.coerce.number().default(10),
});

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
    defaultValues: { name: "", category: "Bats", price: 0, stock: 10 }
  });

  const onProductSubmit = (data: z.infer<typeof productSchema>) => {
    createProductMutation.mutate({ data }, {
      onSuccess: () => {
        toast({ title: "Product added to shop" });
        form.reset();
        queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
      }
    });
  };

  const handleStatusUpdate = (id: number, status: any) => {
    updateStatusMutation.mutate({ id, data: { status } }, {
      onSuccess: () => {
        toast({ title: "Order status updated" });
        queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
      }
    });
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Shop Management</h2>
        <div className="bg-muted p-1 rounded-xl flex gap-1">
          <Button 
            variant={activeTab === "products" ? "default" : "ghost"} 
            size="sm" 
            onClick={() => setActiveTab("products")}
            className="rounded-lg"
          >
            <ShoppingBag className="h-4 w-4 mr-2" /> Products
          </Button>
          <Button 
            variant={activeTab === "orders" ? "default" : "ghost"} 
            size="sm" 
            onClick={() => setActiveTab("orders")}
            className="rounded-lg"
          >
            <Package className="h-4 w-4 mr-2" /> Orders
          </Button>
        </div>
      </div>

      {activeTab === "products" ? (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Dialog>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" /> Add Product</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>New Product</DialogTitle></DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onProductSubmit)} className="space-y-4">
                    <FormField control={form.control} name="name" render={({ field }) => (
                      <FormItem><FormLabel>Product Name</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                    )} />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={form.control} name="category" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              {["Bats", "Balls", "Helmets", "Gloves", "Pads", "Bags", "Apparel"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="brand" render={({ field }) => (
                        <FormItem><FormLabel>Brand</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                      )} />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <FormField control={form.control} name="price" render={({ field }) => (
                        <FormItem><FormLabel>Price (₹)</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name="originalPrice" render={({ field }) => (
                        <FormItem><FormLabel>MRP (Optional)</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name="stock" render={({ field }) => (
                        <FormItem><FormLabel>Stock</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                      )} />
                    </div>
                    <Button type="submit" className="w-full">Add Product</Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <Card className="border-none shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-bold">
                  <tr>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Price</th>
                    <th className="px-4 py-3">Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {products?.map((p) => (
                    <tr key={p.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3 font-bold">{p.name} <span className="text-xs text-muted-foreground font-normal ml-2">{p.brand}</span></td>
                      <td className="px-4 py-3">{p.category}</td>
                      <td className="px-4 py-3 font-medium">₹{p.price}</td>
                      <td className="px-4 py-3">{p.stock}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : (
        <Card className="border-none shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-bold">
                <tr>
                  <th className="px-4 py-3">Order ID</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Items</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3">Status Update</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orders?.map((o) => (
                  <tr key={o.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium">#{o.id}</td>
                    <td className="px-4 py-3">{o.userName}</td>
                    <td className="px-4 py-3 font-bold text-primary">₹{o.totalAmount}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{o.items.length} items</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${o.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {o.paymentStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Select defaultValue={o.status} onValueChange={(val) => handleStatusUpdate(o.id, val)}>
                        <SelectTrigger className="h-8 w-[140px] text-xs font-bold uppercase tracking-wider">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="processing">Processing</SelectItem>
                          <SelectItem value="shipped">Shipped</SelectItem>
                          <SelectItem value="delivered">Delivered</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}