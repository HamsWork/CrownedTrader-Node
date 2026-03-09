import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertSignalTypeSchema, insertSignalSchema, insertDiscordChannelSchema, registerSchema, loginSchema } from "@shared/schema";
import { buildEmbed, sendToDiscord } from "./utils/discord";
import { isValidDiscordWebhookUrl } from "./utils/validation";
import { hashPassword, comparePassword, toSafeUser, requireAuth, requireAdmin } from "./auth";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.post("/api/users", requireAdmin, async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0].message });

    const existing = await storage.getUserByUsername(parsed.data.username);
    if (existing) return res.status(400).json({ message: "Username already taken" });

    const role = req.body.role === "admin" ? "admin" : "user";
    const hashed = await hashPassword(parsed.data.password);
    const user = await storage.createUser({ username: parsed.data.username, password: hashed, role });

    const channels = req.body.channels as Array<{ name: string; webhookUrl: string }> | undefined;
    if (channels && Array.isArray(channels)) {
      for (const ch of channels) {
        if (!ch.name || !ch.webhookUrl) {
          return res.status(400).json({ message: "Each channel requires name and webhookUrl" });
        }
        if (!isValidDiscordWebhookUrl(ch.webhookUrl)) {
          return res.status(400).json({ message: `Invalid webhook URL for channel "${ch.name}"` });
        }
      }
      for (const ch of channels) {
        await storage.createDiscordChannel({ name: ch.name, webhookUrl: ch.webhookUrl, userId: user.id });
      }
    }

    const userChannels = await storage.getDiscordChannelsByUser(user.id);
    res.status(201).json({ ...toSafeUser(user), channels: userChannels });
  });

  app.post("/api/auth/login", async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0].message });

    const user = await storage.getUserByUsername(parsed.data.username);
    if (!user) return res.status(401).json({ message: "Invalid username or password" });

    const valid = await comparePassword(parsed.data.password, user.password);
    if (!valid) return res.status(401).json({ message: "Invalid username or password" });

    req.session.userId = user.id;
    res.json(toSafeUser(user));
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ message: "Logged out" });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Not authenticated" });
    const user = await storage.getUser(req.session.userId);
    if (!user) return res.status(401).json({ message: "Not authenticated" });
    res.json(toSafeUser(user));
  });

  app.get("/api/users", requireAdmin, async (_req, res) => {
    const allUsers = await storage.getUsers();
    res.json(allUsers.map(toSafeUser));
  });

  app.patch("/api/users/:id/role", requireAdmin, async (req, res) => {
    const { role } = req.body;
    if (!role || !["admin", "user"].includes(role)) {
      return res.status(400).json({ message: "Invalid role. Must be 'admin' or 'user'." });
    }
    const updated = await storage.updateUserRole(Number(req.params.id), role);
    if (!updated) return res.status(404).json({ message: "User not found" });
    res.json(toSafeUser(updated));
  });

  app.delete("/api/users/:id", requireAdmin, async (req, res) => {
    const currentUser = (req as any).user;
    if (currentUser.id === Number(req.params.id)) {
      return res.status(400).json({ message: "Cannot delete your own account" });
    }
    await storage.deleteDiscordChannelsByUser(Number(req.params.id));
    const deleted = await storage.deleteUser(Number(req.params.id));
    if (!deleted) return res.status(404).json({ message: "User not found" });
    res.status(204).send();
  });

  app.get("/api/users/:id/channels", requireAdmin, async (req, res) => {
    const userId = Number(req.params.id);
    const user = await storage.getUser(userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    const channels = await storage.getDiscordChannelsByUser(userId);
    res.json(channels);
  });

  app.put("/api/users/:id/channels", requireAdmin, async (req, res) => {
    const userId = Number(req.params.id);
    const user = await storage.getUser(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const channels = req.body.channels as Array<{ id?: number; name: string; webhookUrl: string }>;
    if (!Array.isArray(channels)) {
      return res.status(400).json({ message: "channels array is required" });
    }

    for (const ch of channels) {
      if (!ch.name || !ch.webhookUrl) {
        return res.status(400).json({ message: "Each channel requires name and webhookUrl" });
      }
      if (!isValidDiscordWebhookUrl(ch.webhookUrl)) {
        return res.status(400).json({ message: `Invalid webhook URL for channel "${ch.name}"` });
      }
    }

    const existingChannels = await storage.getDiscordChannelsByUser(userId);
    const incomingIds = new Set(channels.filter(c => c.id).map(c => c.id));

    for (const existing of existingChannels) {
      if (!incomingIds.has(existing.id)) {
        await storage.deleteDiscordChannel(existing.id);
      }
    }

    const result: any[] = [];
    for (const ch of channels) {
      if (ch.id && existingChannels.some(e => e.id === ch.id)) {
        const updated = await storage.updateDiscordChannel(ch.id, { name: ch.name, webhookUrl: ch.webhookUrl });
        if (updated) result.push(updated);
      } else {
        const created = await storage.createDiscordChannel({ name: ch.name, webhookUrl: ch.webhookUrl, userId });
        result.push(created);
      }
    }

    res.json(result);
  });

  app.get("/api/signal-types", requireAuth, async (_req, res) => {
    const types = await storage.getSignalTypes();
    res.json(types);
  });

  app.get("/api/signal-types/:id", requireAuth, async (req, res) => {
    const st = await storage.getSignalType(Number(req.params.id));
    if (!st) return res.status(404).json({ message: "Signal type not found" });
    res.json(st);
  });

  app.post("/api/signal-types", requireAdmin, async (req, res) => {
    const parsed = insertSignalTypeSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const st = await storage.createSignalType(parsed.data);
    res.status(201).json(st);
  });

  app.patch("/api/signal-types/:id", requireAdmin, async (req, res) => {
    const partial = insertSignalTypeSchema.partial().safeParse(req.body);
    if (!partial.success) return res.status(400).json({ message: partial.error.message });
    const updated = await storage.updateSignalType(Number(req.params.id), partial.data);
    if (!updated) return res.status(404).json({ message: "Signal type not found" });
    res.json(updated);
  });

  app.delete("/api/signal-types/:id", requireAdmin, async (req, res) => {
    const deleted = await storage.deleteSignalType(Number(req.params.id));
    if (!deleted) return res.status(404).json({ message: "Signal type not found" });
    res.status(204).send();
  });

  app.get("/api/signals", requireAuth, async (_req, res) => {
    const sigs = await storage.getSignals();
    res.json(sigs);
  });

  app.post("/api/signals", requireAuth, async (req, res) => {
    const parsed = insertSignalSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });

    const signalType = await storage.getSignalType(parsed.data.signalTypeId);
    if (!signalType) return res.status(400).json({ message: "Invalid signal type" });

    if (parsed.data.discordChannelId) {
      const channel = await storage.getDiscordChannel(parsed.data.discordChannelId);
      if (!channel) return res.status(400).json({ message: "Invalid discord channel" });
    }

    const currentUser = (req as any).user;
    const signal = await storage.createSignal({ ...parsed.data, userId: currentUser.id });

    if (signal.discordChannelId) {
      const channel = await storage.getDiscordChannel(signal.discordChannelId);
      if (channel) {
        const embed = buildEmbed(signalType, signal);
        const sent = await sendToDiscord(channel.webhookUrl, embed, signalType.content || undefined);
        await storage.updateSignalDiscordStatus(signal.id, sent);
        signal.sentToDiscord = sent;
      }
    }

    res.status(201).json(signal);
  });

  app.get("/api/discord-channels", requireAuth, async (req, res) => {
    const currentUser = (req as any).user;
    let channels;
    if (currentUser.role === "admin") {
      channels = await storage.getDiscordChannels();
    } else {
      channels = await storage.getDiscordChannelsByUser(currentUser.id);
    }
    if (currentUser.role === "admin") {
      const allUsers = await storage.getUsers();
      const usersMap = new Map(allUsers.map(u => [u.id, u.username]));
      const enriched = channels.map(ch => ({
        ...ch,
        ownerUsername: ch.userId ? usersMap.get(ch.userId) ?? null : null,
      }));
      return res.json(enriched);
    }
    res.json(channels);
  });

  app.post("/api/discord-channels", requireAuth, async (req, res) => {
    const parsed = insertDiscordChannelSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    if (!isValidDiscordWebhookUrl(parsed.data.webhookUrl)) {
      return res.status(400).json({ message: "Invalid Discord webhook URL. Must be a valid https://discord.com/api/webhooks/ URL." });
    }
    const currentUser = (req as any).user;
    const ch = await storage.createDiscordChannel({ ...parsed.data, userId: currentUser.id });
    res.status(201).json(ch);
  });

  app.patch("/api/discord-channels/:id", requireAuth, async (req, res) => {
    const currentUser = (req as any).user;
    const existing = await storage.getDiscordChannel(Number(req.params.id));
    if (!existing) return res.status(404).json({ message: "Channel not found" });
    if (currentUser.role !== "admin" && existing.userId !== currentUser.id) {
      return res.status(403).json({ message: "Not authorized" });
    }
    const partial = insertDiscordChannelSchema.partial().safeParse(req.body);
    if (!partial.success) return res.status(400).json({ message: partial.error.message });
    if (partial.data.webhookUrl && !isValidDiscordWebhookUrl(partial.data.webhookUrl)) {
      return res.status(400).json({ message: "Invalid Discord webhook URL." });
    }
    const { userId: _ignore, ...updateData } = partial.data;
    const updated = await storage.updateDiscordChannel(Number(req.params.id), updateData);
    if (!updated) return res.status(404).json({ message: "Channel not found" });
    res.json(updated);
  });

  app.delete("/api/discord-channels/:id", requireAuth, async (req, res) => {
    const currentUser = (req as any).user;
    const existing = await storage.getDiscordChannel(Number(req.params.id));
    if (!existing) return res.status(404).json({ message: "Channel not found" });
    if (currentUser.role !== "admin" && existing.userId !== currentUser.id) {
      return res.status(403).json({ message: "Not authorized" });
    }
    const deleted = await storage.deleteDiscordChannel(Number(req.params.id));
    if (!deleted) return res.status(404).json({ message: "Channel not found" });
    res.status(204).send();
  });

  app.get("/api/stats", requireAuth, async (_req, res) => {
    const [allSignals, allTypes, allChannels] = await Promise.all([
      storage.getSignals(),
      storage.getSignalTypes(),
      storage.getDiscordChannels(),
    ]);
    res.json({
      totalSignals: allSignals.length,
      totalSignalTypes: allTypes.length,
      totalChannels: allChannels.length,
      sentToDiscord: allSignals.filter(s => s.sentToDiscord).length,
      recentSignals: allSignals.slice(0, 5),
    });
  });

  return httpServer;
}
