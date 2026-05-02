import { Router, Request, Response } from "express";
import { db, productsTable, cartItemsTable, ordersTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { authenticate, requireRole, AuthRequest } from "../middlewares/auth";
import { CreateProductBody, AddToCartBody, CreateOrderBody, UpdateOrderStatusBody } from "@workspace/api-zod";
import Razorpay from "razorpay";
import crypto from "crypto";

const router = Router();

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || "rzp_test_dummy_key";
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "dummy_secret_key";

const razorpay = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET,
});

function productResponse(p: any) {
  return {
    id: p.id, name: p.name, description: p.description,
    price: p.price, originalPrice: p.originalPrice,
    images: p.images || [], category: p.category,
    brand: p.brand, stock: p.stock,
    rating: p.rating, reviewCount: p.reviewCount,
    createdAt: p.createdAt?.toISOString(),
  };
}

function cartResponse(items: any[]) {
  const cartItems = items.map(i => ({
    productId: i.cart.productId,
    name: i.product?.name || "",
    image: (i.product?.images as string[])?.[0] || "",
    price: i.product?.price || 0,
    quantity: i.cart.quantity,
    subtotal: (i.product?.price || 0) * i.cart.quantity,
  }));
  const total = cartItems.reduce((s, i) => s + i.subtotal, 0);
  return { items: cartItems, total, itemCount: cartItems.reduce((s, i) => s + i.quantity, 0) };
}

// Products
router.get("/shop/products", async (req: Request, res: Response) => {
  try {
    const { category, search } = req.query as Record<string, string>;
    let products = await db.select().from(productsTable);
    if (category) products = products.filter(p => p.category === category);
    if (search) {
      const s = search.toLowerCase();
      products = products.filter(p => p.name.toLowerCase().includes(s) || p.brand?.toLowerCase().includes(s));
    }
    res.json(products.map(productResponse));
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

router.post("/shop/products", authenticate, requireRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const parsed = CreateProductBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
    const [product] = await db.insert(productsTable).values(parsed.data).returning();
    res.status(201).json(productResponse(product));
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Failed to create product" });
  }
});

router.get("/shop/products/:id", async (req: Request, res: Response) => {
  try {
    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, parseInt(req.params.id)));
    if (!product) { res.status(404).json({ error: "Product not found" }); return; }
    res.json(productResponse(product));
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Failed to fetch product" });
  }
});

router.put("/shop/products/:id", authenticate, requireRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const parsed = CreateProductBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
    const [product] = await db.update(productsTable).set(parsed.data).where(eq(productsTable.id, parseInt(req.params.id))).returning();
    res.json(productResponse(product));
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Failed to update product" });
  }
});

router.delete("/shop/products/:id", authenticate, requireRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    await db.delete(productsTable).where(eq(productsTable.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Failed to delete product" });
  }
});

// Cart
router.get("/shop/cart", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const items = await db.select({
      cart: cartItemsTable,
      product: { name: productsTable.name, price: productsTable.price, images: productsTable.images },
    }).from(cartItemsTable).leftJoin(productsTable, eq(cartItemsTable.productId, productsTable.id))
      .where(eq(cartItemsTable.userId, req.user!.id));
    res.json(cartResponse(items));
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Failed to fetch cart" });
  }
});

router.post("/shop/cart", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const parsed = AddToCartBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
    const { productId, quantity } = parsed.data;
    const existing = await db.select().from(cartItemsTable).where(
      and(eq(cartItemsTable.userId, req.user!.id), eq(cartItemsTable.productId, productId))
    );
    if (existing.length > 0) {
      await db.update(cartItemsTable).set({ quantity: existing[0].quantity + quantity })
        .where(and(eq(cartItemsTable.userId, req.user!.id), eq(cartItemsTable.productId, productId)));
    } else {
      await db.insert(cartItemsTable).values({ userId: req.user!.id, productId, quantity });
    }
    const items = await db.select({
      cart: cartItemsTable,
      product: { name: productsTable.name, price: productsTable.price, images: productsTable.images },
    }).from(cartItemsTable).leftJoin(productsTable, eq(cartItemsTable.productId, productsTable.id))
      .where(eq(cartItemsTable.userId, req.user!.id));
    res.json(cartResponse(items));
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Failed to add to cart" });
  }
});

router.put("/shop/cart/:productId", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const productId = parseInt(req.params.productId);
    const { quantity } = req.body;
    if (!quantity || quantity < 1) {
      await db.delete(cartItemsTable).where(
        and(eq(cartItemsTable.userId, req.user!.id), eq(cartItemsTable.productId, productId))
      );
    } else {
      await db.update(cartItemsTable).set({ quantity })
        .where(and(eq(cartItemsTable.userId, req.user!.id), eq(cartItemsTable.productId, productId)));
    }
    const items = await db.select({
      cart: cartItemsTable,
      product: { name: productsTable.name, price: productsTable.price, images: productsTable.images },
    }).from(cartItemsTable).leftJoin(productsTable, eq(cartItemsTable.productId, productsTable.id))
      .where(eq(cartItemsTable.userId, req.user!.id));
    res.json(cartResponse(items));
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Failed to update cart" });
  }
});

router.delete("/shop/cart/:productId", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const productId = parseInt(req.params.productId);
    await db.delete(cartItemsTable).where(
      and(eq(cartItemsTable.userId, req.user!.id), eq(cartItemsTable.productId, productId))
    );
    const items = await db.select({
      cart: cartItemsTable,
      product: { name: productsTable.name, price: productsTable.price, images: productsTable.images },
    }).from(cartItemsTable).leftJoin(productsTable, eq(cartItemsTable.productId, productsTable.id))
      .where(eq(cartItemsTable.userId, req.user!.id));
    res.json(cartResponse(items));
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Failed to remove from cart" });
  }
});

// Orders
router.get("/orders", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.query as Record<string, string>;
    const rows = await db.select({
      order: ordersTable,
      user: { name: usersTable.name },
    }).from(ordersTable).leftJoin(usersTable, eq(ordersTable.userId, usersTable.id));
    let orders = rows;
    if (req.user!.role !== "admin") orders = orders.filter(r => r.order.userId === req.user!.id);
    if (status) orders = orders.filter(r => r.order.status === status);
    res.json(orders.map(r => ({
      id: r.order.id, userId: r.order.userId, userName: r.user?.name,
      items: r.order.items, totalAmount: r.order.totalAmount,
      status: r.order.status, paymentStatus: r.order.paymentStatus,
      shippingAddress: r.order.shippingAddress, createdAt: r.order.createdAt?.toISOString(),
    })));
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

router.post("/orders", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const parsed = CreateOrderBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
    const cartItems = await db.select({
      cart: cartItemsTable,
      product: { name: productsTable.name, price: productsTable.price, images: productsTable.images },
    }).from(cartItemsTable).leftJoin(productsTable, eq(cartItemsTable.productId, productsTable.id))
      .where(eq(cartItemsTable.userId, req.user!.id));
    if (cartItems.length === 0) { res.status(400).json({ error: "Cart is empty" }); return; }
    const items = cartItems.map(i => ({
      productId: i.cart.productId, name: i.product?.name || "",
      image: (i.product?.images as string[])?.[0] || "",
      price: i.product?.price || 0, quantity: i.cart.quantity,
    }));
    const totalAmount = items.reduce((s, i) => s + i.price * i.quantity, 0);
    const [order] = await db.insert(ordersTable).values({
      userId: req.user!.id, items, totalAmount,
      shippingAddress: parsed.data.shippingAddress,
    }).returning();
    await db.delete(cartItemsTable).where(eq(cartItemsTable.userId, req.user!.id));
    res.status(201).json({ id: order.id, userId: order.userId, items: order.items, totalAmount: order.totalAmount, status: order.status, paymentStatus: order.paymentStatus, shippingAddress: order.shippingAddress, createdAt: order.createdAt?.toISOString() });
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Failed to create order" });
  }
});

router.get("/orders/:id", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const [row] = await db.select({ order: ordersTable, user: { name: usersTable.name } })
      .from(ordersTable).leftJoin(usersTable, eq(ordersTable.userId, usersTable.id))
      .where(eq(ordersTable.id, parseInt(req.params.id)));
    if (!row) { res.status(404).json({ error: "Order not found" }); return; }
    res.json({ id: row.order.id, userId: row.order.userId, userName: row.user?.name, items: row.order.items, totalAmount: row.order.totalAmount, status: row.order.status, paymentStatus: row.order.paymentStatus, shippingAddress: row.order.shippingAddress, createdAt: row.order.createdAt?.toISOString() });
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Failed to fetch order" });
  }
});

router.put("/orders/:id/status", authenticate, requireRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const parsed = UpdateOrderStatusBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
    const [order] = await db.update(ordersTable).set({ status: parsed.data.status }).where(eq(ordersTable.id, parseInt(req.params.id))).returning();
    res.json({ id: order.id, status: order.status, totalAmount: order.totalAmount });
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Failed to update order status" });
  }
});

router.post("/orders/:id/payment", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, parseInt(req.params.id)));
    if (!order) { res.status(404).json({ error: "Order not found" }); return; }

    const isDummy = RAZORPAY_KEY_ID === "rzp_test_dummy_key";
    let orderId: string;

    if (isDummy) {
      orderId = `order_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    } else {
      const rzpOrder = await razorpay.orders.create({
        amount: Math.round(order.totalAmount * 100),
        currency: "INR",
        receipt: `order_${order.id}`,
      });
      orderId = rzpOrder.id;
    }

    await db.update(ordersTable).set({ razorpayOrderId: orderId }).where(eq(ordersTable.id, order.id));
    res.json({ orderId, amount: Math.round(order.totalAmount * 100), currency: "INR", key: RAZORPAY_KEY_ID });
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Failed to create payment" });
  }
});

router.post("/orders/:id/verify-payment", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
    const isDummy = RAZORPAY_KEY_SECRET === "dummy_secret_key";
    if (!isDummy) {
      const expectedSig = crypto.createHmac("sha256", RAZORPAY_KEY_SECRET)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`).digest("hex");
      if (expectedSig !== razorpaySignature) {
        res.status(400).json({ error: "Invalid payment signature" }); return;
      }
    }
    const [order] = await db.update(ordersTable).set({ paymentStatus: "paid", status: "processing", razorpayPaymentId }).where(eq(ordersTable.id, parseInt(req.params.id))).returning();
    res.json({ id: order.id, userId: order.userId, items: order.items, totalAmount: order.totalAmount, status: order.status, paymentStatus: order.paymentStatus, shippingAddress: order.shippingAddress, createdAt: order.createdAt?.toISOString() });
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Failed to verify payment" });
  }
});

export default router;
