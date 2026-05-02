import { Router, Request, Response } from "express";
import { Product, CartItem, Order, User } from "@workspace/db";
import { authenticate, requireRole, AuthRequest } from "../middlewares/auth";
import Razorpay from "razorpay";
import crypto from "crypto";

const router = Router();
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || "rzp_test_dummy_key";
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "dummy_secret_key";
const razorpay = new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET });

function productRes(p: any) {
  return {
    id: p._id.toString(), name: p.name, description: p.description,
    price: p.price, originalPrice: p.originalPrice,
    images: p.images || [], category: p.category,
    brand: p.brand, stock: p.stock, rating: p.rating, reviewCount: p.reviewCount,
    createdAt: p.createdAt?.toISOString(),
  };
}

async function getCartData(userId: string) {
  const items = await CartItem.find({ userId }).populate("productId").lean();
  const cartItems = items.map((i: any) => {
    const p = i.productId;
    return {
      productId: p?._id?.toString() || i.productId?.toString(),
      name: p?.name || "", image: p?.images?.[0] || "",
      price: p?.price || 0, quantity: i.quantity,
      subtotal: (p?.price || 0) * i.quantity,
    };
  });
  return { items: cartItems, total: cartItems.reduce((s: number, i: any) => s + i.subtotal, 0), itemCount: cartItems.reduce((s: number, i: any) => s + i.quantity, 0) };
}

// Products
router.get("/shop/products", async (req: Request, res: Response) => {
  try {
    const { category, search } = req.query as Record<string, string>;
    const query: any = {};
    if (category) query.category = category;
    if (search) query.$or = [{ name: new RegExp(search, "i") }, { brand: new RegExp(search, "i") }];
    const products = await Product.find(query).lean();
    res.json(products.map(productRes));
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to fetch products" }); }
});

router.post("/shop/products", authenticate, requireRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json(productRes(product));
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to create product" }); }
});

router.get("/shop/products/:id", async (req: Request, res: Response) => {
  try {
    const product = await Product.findById(req.params.id).lean();
    if (!product) { res.status(404).json({ error: "Product not found" }); return; }
    res.json(productRes(product));
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to fetch product" }); }
});

router.put("/shop/products/:id", authenticate, requireRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true }).lean();
    if (!product) { res.status(404).json({ error: "Product not found" }); return; }
    res.json(productRes(product));
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to update product" }); }
});

router.delete("/shop/products/:id", authenticate, requireRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to delete product" }); }
});

// Cart
router.get("/shop/cart", authenticate, async (req: AuthRequest, res: Response) => {
  try { res.json(await getCartData(req.user!.id.toString())); }
  catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to fetch cart" }); }
});

router.post("/shop/cart", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { productId, quantity = 1 } = req.body;
    if (!productId) { res.status(400).json({ error: "productId required" }); return; }
    const existing = await CartItem.findOne({ userId: req.user!.id, productId });
    if (existing) {
      await CartItem.findByIdAndUpdate(existing._id, { quantity: existing.quantity + quantity });
    } else {
      await CartItem.create({ userId: req.user!.id, productId, quantity });
    }
    res.json(await getCartData(req.user!.id.toString()));
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to add to cart" }); }
});

router.put("/shop/cart/:productId", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { quantity } = req.body;
    if (!quantity || quantity < 1) {
      await CartItem.deleteOne({ userId: req.user!.id, productId: req.params.productId });
    } else {
      await CartItem.findOneAndUpdate({ userId: req.user!.id, productId: req.params.productId }, { quantity });
    }
    res.json(await getCartData(req.user!.id.toString()));
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to update cart" }); }
});

router.delete("/shop/cart/:productId", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await CartItem.deleteOne({ userId: req.user!.id, productId: req.params.productId });
    res.json(await getCartData(req.user!.id.toString()));
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to remove from cart" }); }
});

// Orders
function orderRes(o: any, userName?: string) {
  return {
    id: o._id.toString(), userId: o.userId?.toString(), userName,
    items: (o.items || []).map((i: any) => ({ ...i, productId: i.productId?.toString() })),
    totalAmount: o.totalAmount, status: o.status, paymentStatus: o.paymentStatus,
    shippingAddress: o.shippingAddress, razorpayOrderId: o.razorpayOrderId,
    createdAt: o.createdAt?.toISOString(),
  };
}

router.get("/orders", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.query as Record<string, string>;
    const query: any = {};
    if (req.user!.role !== "admin") query.userId = req.user!.id;
    if (status) query.status = status;
    const orders = await Order.find(query).sort({ createdAt: -1 }).lean();
    const userIds = [...new Set(orders.map((o: any) => o.userId?.toString()))];
    const users = await User.find({ _id: { $in: userIds } }).lean();
    const userMap = Object.fromEntries(users.map((u: any) => [u._id.toString(), u.name]));
    res.json(orders.map((o: any) => orderRes(o, userMap[o.userId?.toString()])));
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to fetch orders" }); }
});

router.post("/orders", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const cartItems = await CartItem.find({ userId: req.user!.id }).populate("productId").lean();
    if (!cartItems.length) { res.status(400).json({ error: "Cart is empty" }); return; }
    const items = cartItems.map((i: any) => ({
      productId: i.productId?._id, name: i.productId?.name || "",
      image: i.productId?.images?.[0] || "", price: i.productId?.price || 0, quantity: i.quantity,
    }));
    const totalAmount = items.reduce((s, i) => s + i.price * i.quantity, 0);
    const order = await Order.create({ userId: req.user!.id, items, totalAmount, shippingAddress: req.body.shippingAddress });
    await CartItem.deleteMany({ userId: req.user!.id });
    res.status(201).json(orderRes(order));
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to create order" }); }
});

router.get("/orders/:id", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const order = await Order.findById(req.params.id).lean() as any;
    if (!order) { res.status(404).json({ error: "Order not found" }); return; }
    const user = await User.findById(order.userId).lean() as any;
    res.json(orderRes(order, user?.name));
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to fetch order" }); }
});

router.put("/orders/:id/status", authenticate, requireRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const order = await Order.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true }).lean();
    if (!order) { res.status(404).json({ error: "Order not found" }); return; }
    res.json(orderRes(order));
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to update order status" }); }
});

router.post("/orders/:id/payment", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const order = await Order.findById(req.params.id).lean() as any;
    if (!order) { res.status(404).json({ error: "Order not found" }); return; }
    const isDummy = RAZORPAY_KEY_ID === "rzp_test_dummy_key";
    let orderId: string;
    if (isDummy) {
      orderId = `order_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    } else {
      const rzpOrder = await razorpay.orders.create({ amount: Math.round(order.totalAmount * 100), currency: "INR", receipt: `order_${req.params.id}` });
      orderId = rzpOrder.id;
    }
    await Order.findByIdAndUpdate(req.params.id, { razorpayOrderId: orderId });
    res.json({ orderId, amount: Math.round(order.totalAmount * 100), currency: "INR", key: RAZORPAY_KEY_ID });
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to create payment" }); }
});

router.post("/orders/:id/verify-payment", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
    const isDummy = RAZORPAY_KEY_SECRET === "dummy_secret_key";
    if (!isDummy) {
      const expected = crypto.createHmac("sha256", RAZORPAY_KEY_SECRET).update(`${razorpayOrderId}|${razorpayPaymentId}`).digest("hex");
      if (expected !== razorpaySignature) { res.status(400).json({ error: "Invalid payment signature" }); return; }
    }
    const order = await Order.findByIdAndUpdate(req.params.id, { paymentStatus: "paid", status: "processing", razorpayPaymentId }, { new: true }).lean();
    if (!order) { res.status(404).json({ error: "Order not found" }); return; }
    res.json(orderRes(order));
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to verify payment" }); }
});

export default router;
