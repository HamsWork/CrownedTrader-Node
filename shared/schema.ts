import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  jsonb,
  serial,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const discordChannelSchema = z.object({
  name: z.string(),
  webhookUrl: z.string(),
});

export type UserDiscordChannel = z.infer<typeof discordChannelSchema>;

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("user"),
  discordChannels: jsonb("discord_channels").$type<UserDiscordChannel[]>().default([]).notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type SafeUser = Omit<User, "password">;

export const signalTypes = pgTable("signal_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().default(""),
  category: text("category").notNull().default("Options"),
  content: text("content").default(""),
  variables: jsonb("variables").$type<Array<{ name: string; type: string; label?: string }>>().default([]).notNull(),
  titleTemplate: text("title_template").notNull().default(""),
  descriptionTemplate: text("description_template").notNull().default(""),
  color: varchar("color", { length: 7 }).notNull().default("#3B82F6"),
  fieldsTemplate: jsonb("fields_template").$type<Array<{ name: string; value: string }>>().default([]).notNull(),
  footerTemplate: text("footer_template").notNull().default(""),
  showTitleDefault: boolean("show_title_default").notNull().default(true),
  showDescriptionDefault: boolean("show_description_default").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSignalTypeSchema = createInsertSchema(signalTypes, {
  variables: z.array(z.object({ name: z.string(), type: z.string(), label: z.string().optional() })).default([]),
  fieldsTemplate: z.array(z.object({ name: z.string(), value: z.string() })).default([]),
}).omit({
  id: true,
  createdAt: true,
});
export type InsertSignalType = z.infer<typeof insertSignalTypeSchema>;
export type SignalType = typeof signalTypes.$inferSelect;

export const signals = pgTable("signals", {
  id: serial("id").primaryKey(),
  signalTypeId: integer("signal_type_id"),
  userId: integer("user_id"),
  data: jsonb("data").$type<Record<string, string>>().default({}).notNull(),
  discordChannelName: text("discord_channel_name"),
  sentToDiscord: boolean("sent_to_discord").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSignalSchema = createInsertSchema(signals).omit({
  id: true,
  sentToDiscord: true,
  createdAt: true,
});
export type InsertSignal = z.infer<typeof insertSignalSchema>;
export type Signal = typeof signals.$inferSelect;

export const takeProfitLevelSchema = z.object({
  levelPct: z.number(),
  takeOffPct: z.number(),
  raiseStopLossTo: z.string().default("Off"),
  customRaiseSLValue: z.string().optional().default(""),
  trailingStop: z.string().default("Off"),
  trailingStopPct: z.string().optional().default(""),
});
export type TakeProfitLevel = z.infer<typeof takeProfitLevelSchema>;

export const tradePlans = pgTable("trade_plans", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull().default("Default Plan"),
  targetType: text("target_type").notNull().default("% based (Option)"),
  stopLossPct: text("stop_loss_pct").notNull().default("10"),
  takeProfitLevels: jsonb("take_profit_levels").$type<TakeProfitLevel[]>().default([]).notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTradePlanSchema = createInsertSchema(tradePlans).omit({
  id: true,
  createdAt: true,
});
export type InsertTradePlan = z.infer<typeof insertTradePlanSchema>;
export type TradePlan = typeof tradePlans.$inferSelect;
