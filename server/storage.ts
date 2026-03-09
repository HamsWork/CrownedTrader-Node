import { eq, desc } from "drizzle-orm";
import { db } from "./db";
import {
  users,
  signalTypes,
  signals,
  discordChannels,
  type User,
  type InsertUser,
  type SignalType,
  type InsertSignalType,
  type Signal,
  type InsertSignal,
  type DiscordChannel,
  type InsertDiscordChannel,
} from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser & { role?: string }): Promise<User>;
  getUsers(): Promise<User[]>;
  updateUserRole(id: number, role: string): Promise<User | undefined>;
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

  getDiscordChannels(): Promise<DiscordChannel[]>;
  getDiscordChannel(id: number): Promise<DiscordChannel | undefined>;
  createDiscordChannel(ch: InsertDiscordChannel): Promise<DiscordChannel>;
  updateDiscordChannel(id: number, ch: Partial<InsertDiscordChannel>): Promise<DiscordChannel | undefined>;
  deleteDiscordChannel(id: number): Promise<boolean>;
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

  async createUser(user: InsertUser & { role?: string }): Promise<User> {
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

  async getDiscordChannels(): Promise<DiscordChannel[]> {
    return db.select().from(discordChannels).orderBy(discordChannels.name);
  }

  async getDiscordChannel(id: number): Promise<DiscordChannel | undefined> {
    const [ch] = await db.select().from(discordChannels).where(eq(discordChannels.id, id));
    return ch;
  }

  async createDiscordChannel(ch: InsertDiscordChannel): Promise<DiscordChannel> {
    const [created] = await db.insert(discordChannels).values(ch).returning();
    return created;
  }

  async updateDiscordChannel(id: number, ch: Partial<InsertDiscordChannel>): Promise<DiscordChannel | undefined> {
    const [updated] = await db.update(discordChannels).set(ch).where(eq(discordChannels.id, id)).returning();
    return updated;
  }

  async deleteDiscordChannel(id: number): Promise<boolean> {
    const result = await db.delete(discordChannels).where(eq(discordChannels.id, id)).returning();
    return result.length > 0;
  }
}

export const storage = new DatabaseStorage();
