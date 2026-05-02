import { pgTable, serial, integer, text, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { turfsTable, timeSlotsTable } from "./turfs";

export const bookingsTable = pgTable("bookings", {
  id: serial("id").primaryKey(),
  turfId: integer("turf_id").notNull().references(() => turfsTable.id),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  slotId: integer("slot_id").notNull().references(() => timeSlotsTable.id),
  slotIds: text("slot_ids"),
  date: text("date").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  totalPrice: real("total_price").notNull(),
  paidAmount: real("paid_amount"),
  playerCount: integer("player_count").notNull().default(10),
  status: text("status").notNull().default("pending"),
  paymentType: text("payment_type").notNull().default("full"),
  paymentStatus: text("payment_status").notNull().default("unpaid"),
  razorpayOrderId: text("razorpay_order_id"),
  razorpayPaymentId: text("razorpay_payment_id"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertBookingSchema = createInsertSchema(bookingsTable).omit({ id: true, createdAt: true });
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookingsTable.$inferSelect;
