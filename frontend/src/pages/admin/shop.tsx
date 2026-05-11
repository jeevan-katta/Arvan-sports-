import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  ShoppingBag, Plus, Search, Trash2, Pencil, Package,
  TrendingUp, IndianRupee, Star, AlertTriangle, BarChart2,
  ChevronDown,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const fmtINR = (n: number) => `₹${(n || 0).toLocaleString("en-IN")}`;
function hdr(token: string) { return { "Content-Type": "application/json", Authorization: `Bearer ${token}` }; }

const CATEGORIES = ["Bats","Balls","Helmets","Gloves","Pads","Bags","Apparel","Footwear","Accessories","Other"];

const productSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  price: z.coerce.number().min(1),
  originalPrice: z.coerce.number().optional(),
  category: z.string().min(1),
  brand: z.string().optional(),
  stock: z.coerce.number().min(0).default(10),
});

type ProductForm = z.infer<typeof productSchema>;

const ORDER_STATUS = ["pending","processing","shipped","delivered","cancelled"];
const ORDER_STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-400",
  processing: "bg-blue-500/10 text-blue-400",
  shipped: "bg-violet-500/10 text-violet-400",
  delivered: "bg-emerald-500/10 text-emerald-400",
  cancelled: "bg-red-500/10 text-red-400",
};

const CAT_COLORS = ["#f97316","#22d3ee","#a78bfa","#f43f5e","#34d399","#fbbf24","#60a5fa","#e879f9"];

export default function AdminShop() {
  const { token } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"products"|"orders"|"analytics">("products");
  const [addOpen, setAddOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<any>(null);
  const [deleteProduct, setDeleteProduct] = useState<any>(null);
  const [productSearch, setProductSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatus, setOrderStatus] = useState("all");

  const form = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
    defaultValues: { name:"", category:"Bats", price:0, stock:10 },
  });

  const { data: products = [], isLoading: loadProd } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const r = await fetch("/api/shop/products", { headers: { Authorization: `Bearer ${token}` } });
      return r.json();
    },
    enabled: !!token,
  });

  const { data: orders = [], isLoading: loadOrders } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const r = await fetch("/api/orders?admin=true", { headers: { Authorization: `Bearer ${token}` } });
      return r.json();
    },
    enabled: !!token,
  });

  const { data: shopStats } = useQuery({
    queryKey: ["admin-shop-stats"],
    queryFn: async () => {
      const r = await fetch("/api/admin/shop/stats", { headers: { Authorization: `Bearer ${token}` } });
      return r.json();
    },
    enabled: !!token,
  });

  const invalidate = () => { qc.invalidateQueries({ queryKey: ["admin-products"] }); qc.invalidateQueries({ queryKey: ["admin-shop-stats"] }); };
  const invalidateOrders = () => qc.invalidateQueries({ queryKey: ["admin-orders"] });

  const createMut = useMutation({
    mutationFn: async (data: ProductForm) => {
      const r = await fetch("/api/shop/products", { method: "POST", headers: hdr(token!), body: JSON.stringify(data) });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => { toast({ title: "Product added!" }); setAddOpen(false); form.reset(); invalidate(); },
    onError: () => toast({ variant: "destructive", title: "Failed to add product" }),
  });

  const updateProductMut = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const r = await fetch(`/api/shop/products/${id}`, { method: "PUT", headers: hdr(token!), body: JSON.stringify(data) });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => { toast({ title: "Product updated!" }); setEditProduct(null); invalidate(); },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/shop/products/${id}`, { method: "DELETE", headers: hdr(token!) });
      return r.json();
    },
    onSuccess: () => { toast({ title: "Product deleted" }); setDeleteProduct(null); invalidate(); },
  });

  const orderStatusMut = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const r = await fetch(`/api/orders/${id}/status`, { method: "PUT", headers: hdr(token!), body: JSON.stringify({ status }) });
      return r.json();
    },
    onSuccess: () => { toast({ title: "Order updated" }); invalidateOrders(); },
  });

  const filteredProducts = useMemo(() => products.filter((p: any) => {
    const q = productSearch.toLowerCase();
    const matchSearch = !productSearch || p.name?.toLowerCase().includes(q) || (p.brand||"").toLowerCase().includes(q);
    const matchCat = catFilter === "all" || p.category === catFilter;
    return matchSearch && matchCat;
  }), [products, productSearch, catFilter]);

  const filteredOrders = useMemo(() => (Array.isArray(orders) ? orders : []).filter((o: any) => {
    const q = orderSearch.toLowerCase();
    const matchSearch = !orderSearch || o.userName?.toLowerCase().includes(q);
    const matchStatus = orderStatus === "all" || o.status === orderStatus;
    return matchSearch && matchStatus;
  }), [orders, orderSearch, orderStatus]);

  const totalRevenue = useMemo(() => (Array.isArray(orders) ? orders : []).filter((o: any) => o.paymentStatus === "paid").reduce((s: number, o: any) => s + (o.totalAmount || 0), 0), [orders]);
  const catChartData = useMemo(() => Object.entries(shopStats?.categoryRevenue || {}).map(([cat, rev]) => ({ cat, rev })).sort((a: any, b: any) => b.rev - a.rev), [shopStats]);

  const ProductFormContent = ({ isEdit = false }: { isEdit?: boolean }) => (
    <form onSubmit={form.handleSubmit(d => isEdit ? updateProductMut.mutate({ id: editProduct.id, data: d }) : createMut.mutate(d))} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-xs text-white/50">Product Name *</label>
          <Input {...form.register("name")} placeholder="SG Savage Plus Cricket Bat" className="mt-1 bg-white/5 border-white/10 text-white placeholder:text-white/20"/>
          {form.formState.errors.name && <p className="text-red-400 text-xs mt-1">{form.formState.errors.name.message}</p>}
        </div>
        <div>
          <label className="text-xs text-white/50">Category *</label>
          <Select onValueChange={v => form.setValue("category", v)} defaultValue={isEdit ? editProduct?.category : "Bats"}>
            <SelectTrigger className="mt-1 bg-white/5 border-white/10 text-white h-9"><SelectValue/></SelectTrigger>
            <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-white/50">Brand</label>
          <Input {...form.register("brand")} placeholder="SG" className="mt-1 bg-white/5 border-white/10 text-white placeholder:text-white/20 h-9"/>
        </div>
        <div>
          <label className="text-xs text-white/50">Sale Price (₹) *</label>
          <Input type="number" {...form.register("price")} className="mt-1 bg-white/5 border-white/10 text-white h-9"/>
        </div>
        <div>
          <label className="text-xs text-white/50">MRP (₹)</label>
          <Input type="number" {...form.register("originalPrice")} className="mt-1 bg-white/5 border-white/10 text-white h-9"/>
        </div>
        <div>
          <label className="text-xs text-white/50">Stock Quantity</label>
          <Input type="number" {...form.register("stock")} className="mt-1 bg-white/5 border-white/10 text-white h-9"/>
        </div>
        <div>
          <label className="text-xs text-white/50">Description</label>
          <Input {...form.register("description")} placeholder="Short description..." className="mt-1 bg-white/5 border-white/10 text-white h-9 placeholder:text-white/20"/>
        </div>
      </div>
      <Button type="submit" className="w-full h-11 font-bold bg-primary hover:bg-primary/90"
        disabled={createMut.isPending || updateProductMut.isPending}>
        {isEdit ? (updateProductMut.isPending ? "Saving..." : "Save Changes") : (createMut.isPending ? "Adding..." : "Add Product")}
      </Button>
    </form>
  );

  return (
    <div className="p-4 md:p-8 text-white">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-black tracking-tight">Shop Management</h2>
          <p className="text-white/40 text-sm mt-0.5">{products.length} products · {(Array.isArray(orders) ? orders : []).length} orders</p>
        </div>
        <div className="flex items-center gap-3">
          {tab === "products" && (
            <Button onClick={() => { setAddOpen(true); form.reset(); }} className="gap-2 font-bold bg-primary hover:bg-primary/90 rounded-xl h-10 px-5">
              <Plus className="h-4 w-4"/> Add Product
            </Button>
          )}
          <div className="flex bg-white/5 rounded-xl p-1 gap-1">
            {([
              { v: "products", label: "Products", Icon: ShoppingBag },
              { v: "orders", label: "Orders", Icon: Package },
              { v: "analytics", label: "Analytics", Icon: BarChart2 },
            ] as const).map(({ v, label, Icon }) => (
              <button key={v} onClick={() => setTab(v)} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                tab === v ? "bg-primary text-primary-foreground" : "text-white/40 hover:text-white")}>
                <Icon className="h-3.5 w-3.5"/>{label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
          <p className="text-2xl font-black text-white">{products.length}</p>
          <p className="text-[10px] text-white/30 font-bold uppercase mt-0.5">Products</p>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 text-center">
          <p className="text-2xl font-black text-emerald-400">{fmtINR(totalRevenue)}</p>
          <p className="text-[10px] text-emerald-400/60 font-bold uppercase mt-0.5">Shop Revenue</p>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-center">
          <p className="text-2xl font-black text-amber-400">{shopStats?.pendingOrders || 0}</p>
          <p className="text-[10px] text-amber-400/60 font-bold uppercase mt-0.5">Pending Orders</p>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-center">
          <p className="text-2xl font-black text-red-400">{shopStats?.lowStockProducts?.length || 0}</p>
          <p className="text-[10px] text-red-400/60 font-bold uppercase mt-0.5">Low Stock Items</p>
        </div>
      </div>

      {/* ── Products Tab ── */}
      {tab === "products" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30"/>
              <Input value={productSearch} onChange={e => setProductSearch(e.target.value)} placeholder="Search products..." className="pl-8 bg-white/5 border-white/10 text-white placeholder:text-white/20 h-9 text-sm"/>
            </div>
            <Select value={catFilter} onValueChange={setCatFilter}>
              <SelectTrigger className="w-40 bg-white/5 border-white/10 text-white h-9 text-sm"><SelectValue placeholder="Category"/></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {loadProd ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
              {[...Array(8)].map((_,i) => <div key={i} className="h-52 rounded-2xl bg-white/5 animate-pulse"/>)}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-16 text-white/30">
              <ShoppingBag className="h-12 w-12 mx-auto mb-3 opacity-20"/>
              <p className="font-bold">No products found</p>
              <Button onClick={() => { setAddOpen(true); form.reset(); }} className="mt-4 font-bold gap-2 bg-primary hover:bg-primary/90"><Plus className="h-4 w-4"/>Add Product</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredProducts.map((p: any) => {
                const discount = p.originalPrice && p.originalPrice > p.price ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100) : 0;
                const lowStock = (p.stock || 0) <= 5;
                return (
                  <div key={p.id} className={cn("bg-white/5 border rounded-2xl p-4 flex flex-col gap-3 relative group",
                    lowStock ? "border-red-500/20" : "border-white/10 hover:border-white/20 transition-all")}>
                    {discount > 0 && (
                      <div className="absolute top-3 right-3 bg-emerald-500 text-[9px] font-black text-white px-2 py-0.5 rounded-full">{discount}% OFF</div>
                    )}
                    {lowStock && (
                      <div className="absolute top-3 left-3 bg-red-500/90 text-[9px] font-black text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                        <AlertTriangle className="h-2.5 w-2.5"/> Low Stock
                      </div>
                    )}

                    {/* Image placeholder / category icon */}
                    <div className="h-24 rounded-xl bg-gradient-to-br from-white/5 to-white/[0.02] flex items-center justify-center">
                      {p.images?.[0] ? (
                        <img src={p.images[0]} alt={p.name} className="h-full w-full object-contain rounded-xl"/>
                      ) : (
                        <div className="text-center">
                          <ShoppingBag className="h-8 w-8 text-white/15 mx-auto"/>
                          <p className="text-[10px] text-white/20 mt-1">{p.category}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex-1">
                      <p className="font-bold text-white text-sm leading-tight">{p.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {p.brand && <span className="text-[10px] text-white/30">{p.brand}</span>}
                        <span className="text-[10px] bg-white/5 text-white/40 px-1.5 py-0.5 rounded-full">{p.category}</span>
                      </div>
                      {p.rating > 0 && (
                        <div className="flex items-center gap-1 mt-1 text-[10px] text-amber-400">
                          <Star className="h-2.5 w-2.5 fill-current"/>{p.rating.toFixed(1)} ({p.reviewCount})
                        </div>
                      )}
                    </div>

                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-lg font-black text-primary">{fmtINR(p.price)}</p>
                        {p.originalPrice && <p className="text-[11px] text-white/25 line-through">{fmtINR(p.originalPrice)}</p>}
                      </div>
                      <div className="text-right">
                        <p className={cn("text-sm font-bold", lowStock ? "text-red-400" : "text-white/50")}>{p.stock}</p>
                        <p className="text-[10px] text-white/25">in stock</p>
                      </div>
                    </div>

                    <div className="flex gap-2 border-t border-white/5 pt-3">
                      <Button size="sm" variant="outline" className="flex-1 h-7 text-xs font-bold rounded-lg border-white/15 text-white hover:bg-white/10 gap-1"
                        onClick={() => { setEditProduct(p); form.reset({ name: p.name, description: p.description, price: p.price, originalPrice: p.originalPrice, category: p.category, brand: p.brand, stock: p.stock }); }}>
                        <Pencil className="h-3 w-3"/> Edit
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg text-red-400/50 hover:bg-red-500/10 hover:text-red-400" onClick={() => setDeleteProduct(p)}>
                        <Trash2 className="h-3.5 w-3.5"/>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Orders Tab ── */}
      {tab === "orders" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30"/>
              <Input value={orderSearch} onChange={e => setOrderSearch(e.target.value)} placeholder="Search by customer name..." className="pl-8 bg-white/5 border-white/10 text-white placeholder:text-white/20 h-9 text-sm"/>
            </div>
            <div className="flex gap-1 bg-white/5 rounded-xl p-1 flex-shrink-0">
              {["all",...ORDER_STATUS].map(s => (
                <button key={s} onClick={() => setOrderStatus(s)} className={cn("px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all",
                  orderStatus === s ? "bg-primary text-primary-foreground" : "text-white/40 hover:text-white")}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    {["Order","Customer","Items","Amount","Payment","Status","Action"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-white/30">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {loadOrders && [...Array(4)].map((_,i) => (
                    <tr key={i}>{[...Array(7)].map((_,j) => <td key={j} className="px-4 py-4"><div className="h-4 bg-white/5 rounded animate-pulse"/></td>)}</tr>
                  ))}
                  {!loadOrders && filteredOrders.length === 0 && (
                    <tr><td colSpan={7} className="text-center py-12 text-white/30 text-sm">No orders found</td></tr>
                  )}
                  {!loadOrders && filteredOrders.map((o: any) => (
                    <tr key={o.id} className="hover:bg-white/[0.03] transition-colors">
                      <td className="px-4 py-3.5">
                        <p className="font-bold text-white/80 text-sm">#{o.id?.slice(-6)}</p>
                        <p className="text-[10px] text-white/30">{o.createdAt ? format(new Date(o.createdAt), "dd MMM yyyy") : "—"}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-sm font-medium text-white/70">{o.userName || "—"}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-sm text-white/50">{o.items?.length || 0} item{o.items?.length !== 1 ? "s" : ""}</p>
                        <p className="text-[10px] text-white/25 truncate max-w-28">{o.items?.map((i: any) => i.name).join(", ")}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-bold text-emerald-400">{fmtINR(o.totalAmount)}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={cn("text-[10px] font-bold px-2 py-1 rounded-full", o.paymentStatus === "paid" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400")}>
                          {o.paymentStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={cn("text-[10px] font-bold px-2 py-1 rounded-full capitalize", ORDER_STATUS_STYLE[o.status] || "bg-white/5 text-white/40")}>
                          {o.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <Select value={o.status} onValueChange={status => orderStatusMut.mutate({ id: o.id, status })}>
                          <SelectTrigger className="h-7 w-32 text-[11px] bg-white/5 border-white/10 text-white"><SelectValue/></SelectTrigger>
                          <SelectContent>{ORDER_STATUS.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                        </Select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Analytics Tab ── */}
      {tab === "analytics" && (
        <div className="space-y-5">
          {/* Revenue by Category */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <p className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-primary"/> Revenue by Category
            </p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={catChartData} barCategoryGap="35%">
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff08"/>
                  <XAxis dataKey="cat" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#ffffff40" }}/>
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#ffffff40" }} tickFormatter={v => `₹${v}`} width={55}/>
                  <Tooltip contentStyle={{ background: "#1a1d27", border: "1px solid #ffffff15", borderRadius: 12, fontSize: 11, color: "#fff" }} formatter={(v: any) => [fmtINR(v), "Revenue"]}/>
                  <Bar dataKey="rev" radius={[4,4,0,0]}>
                    {catChartData.map((_: any, i: number) => <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Top Products */}
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/10">
                <p className="font-bold text-sm text-white flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary"/> Top Products by Revenue</p>
              </div>
              <div className="divide-y divide-white/5">
                {(shopStats?.topProducts || []).length === 0 ? (
                  <p className="text-center py-8 text-white/30 text-sm">No sales data yet</p>
                ) : shopStats?.topProducts?.map((p: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 px-5 py-3 hover:bg-white/[0.03]">
                    <span className="h-6 w-6 rounded-lg bg-white/5 flex items-center justify-center text-[11px] font-black text-white/40">#{i+1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white/80 truncate">{p.name}</p>
                      <p className="text-[10px] text-white/30">{p.qty} sold</p>
                    </div>
                    <p className="font-black text-emerald-400 text-sm">{fmtINR(p.revenue)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Low Stock */}
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
                <p className="font-bold text-sm text-white flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-red-400"/> Low Stock Alert</p>
                <span className="text-[10px] text-white/30">Stock ≤ 5 units</span>
              </div>
              <div className="divide-y divide-white/5">
                {(shopStats?.lowStockProducts || []).length === 0 ? (
                  <p className="text-center py-8 text-white/30 text-sm">All products well stocked</p>
                ) : shopStats?.lowStockProducts?.map((p: any) => (
                  <div key={p.id} className="flex items-center gap-3 px-5 py-3 hover:bg-white/[0.03]">
                    <div className="flex-1">
                      <p className="text-sm font-bold text-white/80">{p.name}</p>
                      <p className="text-[10px] text-white/30">{p.category}</p>
                    </div>
                    <div className={cn("text-sm font-black px-2.5 py-1 rounded-full", p.stock === 0 ? "bg-red-500/20 text-red-400" : "bg-amber-500/15 text-amber-400")}>
                      {p.stock} left
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Order Status Breakdown */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <p className="text-sm font-bold text-white mb-4">Order Status Breakdown</p>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
              {ORDER_STATUS.map(s => (
                <div key={s} className={cn("rounded-xl p-3 text-center", ORDER_STATUS_STYLE[s]?.replace("text-", "bg-").replace("bg-", "bg-").split(" ")[0] + "/10")}>
                  <p className={cn("text-xl font-black", ORDER_STATUS_STYLE[s]?.split(" ")[1])}>{shopStats?.statusBreakdown?.[s] || 0}</p>
                  <p className="text-[10px] text-white/30 capitalize mt-0.5">{s}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── Add Product Dialog ─── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md bg-[#1a1d27] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2"><Plus className="h-4 w-4 text-primary"/> Add New Product</DialogTitle>
          </DialogHeader>
          <div className="pt-2"><ProductFormContent/></div>
        </DialogContent>
      </Dialog>

      {/* ─── Edit Product Dialog ─── */}
      {editProduct && (
        <Dialog open={!!editProduct} onOpenChange={() => setEditProduct(null)}>
          <DialogContent className="sm:max-w-md bg-[#1a1d27] border-white/10 text-white">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2"><Pencil className="h-4 w-4 text-primary"/> Edit: {editProduct.name}</DialogTitle>
            </DialogHeader>
            <div className="pt-2"><ProductFormContent isEdit/></div>
          </DialogContent>
        </Dialog>
      )}

      {/* ─── Delete Product Dialog ─── */}
      {deleteProduct && (
        <Dialog open={!!deleteProduct} onOpenChange={() => setDeleteProduct(null)}>
          <DialogContent className="sm:max-w-sm bg-[#1a1d27] border-red-500/20 text-white">
            <DialogHeader>
              <DialogTitle className="text-red-400 flex items-center gap-2"><Trash2 className="h-5 w-5"/> Delete Product</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                <p className="font-bold text-white">{deleteProduct.name}</p>
                <p className="text-sm text-white/50">{deleteProduct.category} · {fmtINR(deleteProduct.price)}</p>
                <p className="text-sm text-red-300/70 mt-2">This will permanently remove the product from the store.</p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 border-white/15 text-white hover:bg-white/10" onClick={() => setDeleteProduct(null)}>Cancel</Button>
                <Button className="flex-1 bg-red-600 hover:bg-red-700 font-bold" disabled={deleteMut.isPending} onClick={() => deleteMut.mutate(deleteProduct.id)}>
                  {deleteMut.isPending ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
