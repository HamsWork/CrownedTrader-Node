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

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("user"),
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

export const discordChannels = pgTable("discord_channels", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  webhookUrl: text("webhook_url").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDiscordChannelSchema = createInsertSchema(discordChannels).omit({
  id: true,
  createdAt: true,
});
export type InsertDiscordChannel = z.infer<typeof insertDiscordChannelSchema>;
export type DiscordChannel = typeof discordChannels.$inferSelect;

export const signalTypes = pgTable("signal_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
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

export const insertSignalTypeSchema = createInsertSchema(signalTypes).omit({
  id: true,
  createdAt: true,
});
export type InsertSignalType = z.infer<typeof insertSignalTypeSchema>;
export type SignalType = typeof signalTypes.$inferSelect;

export const signals = pgTable("signals", {
  id: serial("id").primaryKey(),
  signalTypeId: integer("signal_type_id").notNull(),
  userId: integer("user_id"),
  data: jsonb("data").$type<Record<string, string>>().default({}).notNull(),
  discordChannelId: integer("discord_channel_id"),
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
