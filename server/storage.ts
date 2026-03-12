import { eq, desc } from "drizzle-orm";
import { db } from "./db";
import {
  users,
  signalTypes,
  signals,
  tradePlans,
  type User,
  type InsertUser,
  type SignalType,
  type InsertSignalType,
  type Signal,
  type InsertSignal,
  type TradePlan,
  type InsertTradePlan,
  type UserDiscordChannel,
} from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser & { role?: string; discordChannels?: UserDiscordChannel[] }): Promise<User>;
  getUsers(): Promise<User[]>;
  updateUserRole(id: number, role: string): Promise<User | undefined>;
  updateUserPassword(id: number, password: string): Promise<User | undefined>;
  updateUserChannels(id: number, channels: UserDiscordChannel[]): Promise<User | undefined>;
  acceptTos(id: number): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;

  getSignalTypes(): Promise<SignalType[]>;
  getSignalType(id: number): Promise<SignalType | undefined>;
  createSignalType(st: InsertSignalType): Promise<SignalType>;
  updateSignalType(id: number, st: Partial<InsertSignalType>): Promise<SignalType | undefined>;
  deleteSignalType(id: number): Promise<boolean>;

  getSignals(): Promise<Signal[]>;
  getSignal(id: number): Promise<Signal | undefined>;
  createSignal(signal: InsertSignal): Promise<Signal>;
  updateSignalDiscordStatus(id: number, sent: boolean): Promise<void>;
  updateSignalStatus(id: number, status: string, closePrice?: string, closeNote?: string): Promise<Signal | undefined>;
  updateSignalData(id: number, data: Record<string, string>): Promise<Signal | undefined>;

  getTradePlans(): Promise<TradePlan[]>;
  getTradePlansByUser(userId: number): Promise<TradePlan[]>;
  getTradePlan(id: number): Promise<TradePlan | undefined>;
  createTradePlan(plan: InsertTradePlan): Promise<TradePlan>;
  updateTradePlan(id: number, data: Partial<Omit<InsertTradePlan, "userId">>): Promise<TradePlan | undefined>;
  deleteTradePlan(id: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(user: InsertUser & { role?: string; discordChannels?: UserDiscordChannel[] }): Promise<User> {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }

  async getUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(users.username);
  }

  async updateUserRole(id: number, role: string): Promise<User | undefined> {
    const [updated] = await db.update(users).set({ role }).where(eq(users.id, id)).returning();
    return updated;
  }

  async updateUserPassword(id: number, password: string): Promise<User | undefined> {
    const [updated] = await db.update(users).set({ password }).where(eq(users.id, id)).returning();
    return updated;
  }

  async updateUserChannels(id: number, channels: UserDiscordChannel[]): Promise<User | undefined> {
    const [updated] = await db.update(users).set({ discordChannels: channels }).where(eq(users.id, id)).returning();
    return updated;
  }

  async acceptTos(id: number): Promise<User | undefined> {
    const [updated] = await db.update(users).set({ tosAccepted: true }).where(eq(users.id, id)).returning();
    return updated;
  }

  async deleteUser(id: number): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id)).returning();
    return result.length > 0;
  }

  async getSignalTypes(): Promise<SignalType[]> {
    return db.select().from(signalTypes).orderBy(signalTypes.name);
  }

  async getSignalType(id: number): Promise<SignalType | undefined> {
    const [st] = await db.select().from(signalTypes).where(eq(signalTypes.id, id));
    return st;
  }

  async createSignalType(st: InsertSignalType): Promise<SignalType> {
    const [created] = await db.insert(signalTypes).values(st).returning();
    return created;
  }

  async updateSignalType(id: number, st: Partial<InsertSignalType>): Promise<SignalType | undefined> {
    const [updated] = await db.update(signalTypes).set(st).where(eq(signalTypes.id, id)).returning();
    return updated;
  }

  async deleteSignalType(id: number): Promise<boolean> {
    const result = await db.delete(signalTypes).where(eq(signalTypes.id, id)).returning();
    return result.length > 0;
  }

  async getSignals(): Promise<Signal[]> {
    return db.select().from(signals).orderBy(desc(signals.createdAt));
  }

  async getSignalsByUser(userId: number): Promise<Signal[]> {
    return db
      .select()
      .from(signals)
      .where(eq(signals.userId, userId))
      .orderBy(desc(signals.createdAt));
  }

  async getSignal(id: number): Promise<Signal | undefined> {
    const [s] = await db.select().from(signals).where(eq(signals.id, id));
    return s;
  }

  async createSignal(signal: InsertSignal): Promise<Signal> {
    const [created] = await db.insert(signals).values(signal).returning();
    return created;
  }

  async updateSignalDiscordStatus(id: number, sent: boolean): Promise<void> {
    await db.update(signals).set({ sentToDiscord: sent }).where(eq(signals.id, id));
  }

  async updateSignalData(id: number, data: Record<string, string>): Promise<Signal | undefined> {
    const [updated] = await db.update(signals).set({ data }).where(eq(signals.id, id)).returning();
    return updated;
  }

  async updateSignalStatus(id: number, status: string, closePrice?: string, closeNote?: string): Promise<Signal | undefined> {
    const updates: any = { status };
    if (status === "closed") {
      updates.closedAt = new Date();
    }
    if (closePrice !== undefined) updates.closePrice = closePrice;
    if (closeNote !== undefined) updates.closeNote = closeNote;
    const [updated] = await db.update(signals).set(updates).where(eq(signals.id, id)).returning();
    return updated;
  }

  async getTradePlans(): Promise<TradePlan[]> {
    return db.select().from(tradePlans).orderBy(desc(tradePlans.createdAt));
  }

  async getTradePlansByUser(userId: number): Promise<TradePlan[]> {
    return db.select().from(tradePlans).where(eq(tradePlans.userId, userId)).orderBy(desc(tradePlans.createdAt));
  }

  async getTradePlan(id: number): Promise<TradePlan | undefined> {
    const [plan] = await db.select().from(tradePlans).where(eq(tradePlans.id, id));
    return plan;
  }

  async createTradePlan(plan: InsertTradePlan): Promise<TradePlan> {
    const [created] = await db.insert(tradePlans).values(plan).returning();
    return created;
  }

  async updateTradePlan(id: number, data: Partial<InsertTradePlan>): Promise<TradePlan | undefined> {
    const [updated] = await db.update(tradePlans).set(data).where(eq(tradePlans.id, id)).returning();
    return updated;
  }

  async deleteTradePlan(id: number): Promise<boolean> {
    const result = await db.delete(tradePlans).where(eq(tradePlans.id, id)).returning();
    return result.length > 0;
  }
}

export const storage = new DatabaseStorage();
