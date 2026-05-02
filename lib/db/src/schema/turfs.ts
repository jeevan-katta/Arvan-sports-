import { pgTable, serial, text, real, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const turfsTable = pgTable("turfs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  pricePerHour: real("price_per_hour").notNull(),
  images: jsonb("images").$type<string[]>().notNull().default([]),
  rating: real("rating").notNull().default(0),
  reviewCount: integer("review_count").notNull().default(0),
  latitude: real("latitude"),
  longitude: real("longitude"),
  address: text("address"),
  area: text("area"),
  amenities: jsonb("amenities").$type<string[]>().notNull().default([]),
  status: text("status").notNull().default("pending"),
  featured: boolean("featured").notNull().default(false),
  ownerId: integer("owner_id").notNull().references(() => usersTable.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertTurfSchema = createInsertSchema(turfsTable).omit({ id: true, createdAt: true, rating: true, reviewCount: true });
export type InsertTurf = z.infer<typeof insertTurfSchema>;
export type Turf = typeof turfsTable.$inferSelect;

export const timeSlotsTable = pgTable("time_slots", {
  id: serial("id").primaryKey(),
  turfId: integer("turf_id").notNull().references(() => turfsTable.id),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type TimeSlot = typeof timeSlotsTable.$inferSelect;

export const reviewsTable = pgTable("reviews", {
  id: serial("id").primaryKey(),
  turfId: integer("turf_id").notNull().references(() => turfsTable.id),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Review = typeof reviewsTable.$inferSelect;
