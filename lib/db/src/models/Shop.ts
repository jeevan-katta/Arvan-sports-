import mongoose, { Schema, Document, Model } from "mongoose";

export interface IProduct extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  price: number;
  originalPrice?: number;
  images: string[];
  category: string;
  brand?: string;
  stock: number;
  rating: number;
  reviewCount: number;
  createdAt: Date;
}

export interface ICartItem extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  quantity: number;
  createdAt: Date;
}

export interface IOrder extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  items: Array<{ productId: mongoose.Types.ObjectId; name: string; image: string; price: number; quantity: number }>;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  shippingAddress?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  createdAt: Date;
}

const ProductSchema = new Schema<IProduct>({
  name: { type: String, required: true },
  description: String,
  price: { type: Number, required: true },
  originalPrice: Number,
  images: { type: [String], default: [] },
  category: { type: String, required: true },
  brand: String,
  stock: { type: Number, default: 100 },
  rating: { type: Number, default: 4.0 },
  reviewCount: { type: Number, default: 0 },
}, { timestamps: { createdAt: true, updatedAt: false } });

const CartItemSchema = new Schema<ICartItem>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  quantity: { type: Number, default: 1 },
}, { timestamps: { createdAt: true, updatedAt: false } });

const OrderSchema = new Schema<IOrder>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  items: [{
    productId: { type: Schema.Types.ObjectId, ref: "Product" },
    name: String,
    image: String,
    price: Number,
    quantity: Number,
  }],
  totalAmount: { type: Number, required: true },
  status: { type: String, default: "pending" },
  paymentStatus: { type: String, default: "unpaid" },
  shippingAddress: String,
  razorpayOrderId: String,
  razorpayPaymentId: String,
}, { timestamps: { createdAt: true, updatedAt: false } });

export const Product: Model<IProduct> = mongoose.models.Product || mongoose.model<IProduct>("Product", ProductSchema);
export const CartItem: Model<ICartItem> = mongoose.models.CartItem || mongoose.model<ICartItem>("CartItem", CartItemSchema);
export const Order: Model<IOrder> = mongoose.models.Order || mongoose.model<IOrder>("Order", OrderSchema);
