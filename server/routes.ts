import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertSignalTypeSchema, insertSignalSchema, insertTradePlanSchema, registerSchema, loginSchema, discordChannelSchema } from "@shared/schema";
import { buildEmbed, sendToDiscord } from "./utils/discord";
import { isValidDiscordWebhookUrl } from "./utils/validation";
import { hashPassword, comparePassword, toSafeUser, requireAuth, requireAdmin } from "./auth";
import { z } from "zod";

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

    const rawChannels = req.body.channels as Array<{ name: string; webhookUrl: string }> | undefined;
    const channels = [];
    if (rawChannels && Array.isArray(rawChannels)) {
      for (const ch of rawChannels) {
        if (!ch.name || !ch.webhookUrl) {
          return res.status(400).json({ message: "Each channel requires name and webhookUrl" });
        }
        if (!isValidDiscordWebhookUrl(ch.webhookUrl)) {
          return res.status(400).json({ message: `Invalid webhook URL for channel "${ch.name}"` });
        }
        channels.push({ name: ch.name, webhookUrl: ch.webhookUrl });
      }
    }

    const user = await storage.createUser({
      username: parsed.data.username,
      password: hashed,
      role,
      discordChannels: channels,
    });

    res.status(201).json(toSafeUser(user));
  });

  app.post("/api/auth/login", async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0].message });

    const user = await storage.getUserByUsername(parsed.data.username);
    if (!user) return res.status(401).json({ message: "Invalid username or password" });

    const valid = await comparePassword(parsed.data.password, user.password);
    if (!valid) return res.status(401).json({ message: "Invalid username or password" });

    (req.session as any).userId = user.id;
    res.json(toSafeUser(user));
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.status(200).json({ message: "Logged out" });
    });
  });

  app.get("/api/auth/me", requireAuth, (req, res) => {
    res.json(toSafeUser((req as any).user));
  });

  app.get("/api/users", requireAdmin, async (_req, res) => {
    const allUsers = await storage.getUsers();
    res.json(allUsers.map(toSafeUser));
  });

  app.patch("/api/users/:id/role", requireAdmin, async (req, res) => {
    const currentUser = (req as any).user;
    if (currentUser.id === Number(req.params.id)) {
      return res.status(400).json({ message: "Cannot change your own role" });
    }
    const { role } = req.body;
    if (!role || !["admin", "user"].includes(role)) {
      return res.status(400).json({ message: "Invalid role. Must be 'admin' or 'user'." });
    }
    const updated = await storage.updateUserRole(Number(req.params.id), role);
    if (!updated) return res.status(404).json({ message: "User not found" });
    res.json(toSafeUser(updated));
  });

  app.patch("/api/users/:id/password", requireAdmin, async (req, res) => {
    const { password } = req.body;
    if (!password || typeof password !== "string" || password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters." });
    }
    const hashed = await hashPassword(password);
    const updated = await storage.updateUserPassword(Number(req.params.id), hashed);
    if (!updated) return res.status(404).json({ message: "User not found" });
    res.json(toSafeUser(updated));
  });

  app.get("/api/users/:id/channels", requireAdmin, async (req, res) => {
    const userId = Number(req.params.id);
    const user = await storage.getUser(userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user.discordChannels || []);
  });

  app.put("/api/users/:id/channels", requireAdmin, async (req, res) => {
    const userId = Number(req.params.id);
    const user = await storage.getUser(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const channelsSchema = z.array(discordChannelSchema);
    const parsed = channelsSchema.safeParse(req.body.channels);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid channels format" });
    }

    for (const ch of parsed.data) {
      if (!ch.name || !ch.webhookUrl) {
        return res.status(400).json({ message: "Each channel requires name and webhookUrl" });
      }
      if (!isValidDiscordWebhookUrl(ch.webhookUrl)) {
        return res.status(400).json({ message: `Invalid webhook URL for channel "${ch.name}"` });
      }
    }

    const updated = await storage.updateUserChannels(userId, parsed.data);
    if (!updated) return res.status(404).json({ message: "User not found" });
    res.json(updated.discordChannels);
  });

  app.delete("/api/users/:id", requireAdmin, async (req, res) => {
    const currentUser = (req as any).user;
    if (currentUser.id === Number(req.params.id)) {
      return res.status(400).json({ message: "Cannot delete your own account" });
    }
    const deleted = await storage.deleteUser(Number(req.params.id));
    if (!deleted) return res.status(404).json({ message: "User not found" });
    res.status(204).send();
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

    const currentUser = (req as any).user;
    const signal = await storage.createSignal({ ...parsed.data, userId: currentUser.id });

    if (signal.discordChannelName) {
      const userChannels = currentUser.discordChannels || [];
      const channel = userChannels.find((ch: any) => ch.name === signal.discordChannelName);
      if (channel) {
        let signalType = null;
        if (parsed.data.signalTypeId) {
          signalType = await storage.getSignalType(parsed.data.signalTypeId);
          if (!signalType) return res.status(400).json({ message: "Invalid signal type" });
        }
        if (signalType) {
          const embed = buildEmbed(signalType, signal);
          const sent = await sendToDiscord(channel.webhookUrl, embed, signalType.content || undefined);
          await storage.updateSignalDiscordStatus(signal.id, sent);
          signal.sentToDiscord = sent;
        } else {
          const data = signal.data as Record<string, string>;
          const entry = parseFloat(data.entry_price) || 0;
          const embed = {
            title: `🔺 Trade Alert`,
            description: `**${data.ticker || ""}** — ${data.trade_type || "Scalp"}\nEntry: $${entry.toFixed(2)}`,
            color: 0x22c55e,
            fields: [] as Array<{name: string; value: string; inline?: boolean}>,
            footer: { text: "Crowned Trader" },
          };
          if (data.is_shares !== "true") {
            embed.fields.push(
              { name: "Option Type", value: data.option_type || "CALL", inline: true },
              { name: "Strike", value: data.strike || "—", inline: true },
              { name: "Expiration", value: data.expiration || "—", inline: true },
            );
          }
          embed.fields.push(
            { name: "Targets", value: `TP1: $${data.tp1_target || "—"} | TP2: $${data.tp2_target || "—"} | TP3: $${data.tp3_target || "—"}`, inline: false },
            { name: "Stop Loss", value: `-${data.stop_loss_pct || "10"}%`, inline: true },
          );
          const sent = await sendToDiscord(channel.webhookUrl, embed);
          await storage.updateSignalDiscordStatus(signal.id, sent);
          signal.sentToDiscord = sent;
        }
      }
    }

    res.status(201).json(signal);
  });

  app.get("/api/trade-plans", requireAuth, async (req, res) => {
    const currentUser = (req as any).user;
    const plans = currentUser.role === "admin"
      ? await storage.getTradePlans()
      : await storage.getTradePlansByUser(currentUser.id);
    res.json(plans);
  });

  app.get("/api/trade-plans/:id", requireAuth, async (req, res) => {
    const plan = await storage.getTradePlan(Number(req.params.id));
    if (!plan) return res.status(404).json({ message: "Trade plan not found" });
    const currentUser = (req as any).user;
    if (currentUser.role !== "admin" && plan.userId !== currentUser.id) {
      return res.status(403).json({ message: "Not authorized" });
    }
    res.json(plan);
  });

  app.post("/api/trade-plans", requireAuth, async (req, res) => {
    const currentUser = (req as any).user;
    const parsed = insertTradePlanSchema.safeParse({ ...req.body, userId: currentUser.id });
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const plan = await storage.createTradePlan(parsed.data);
    res.status(201).json(plan);
  });

  app.patch("/api/trade-plans/:id", requireAuth, async (req, res) => {
    const plan = await storage.getTradePlan(Number(req.params.id));
    if (!plan) return res.status(404).json({ message: "Trade plan not found" });
    const currentUser = (req as any).user;
    if (currentUser.role !== "admin" && plan.userId !== currentUser.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const allowedFields = [
      "name", "targetType", "stopLossPct", "takeProfitLevels", "isDefault",
    ] as const;
    const updateData: Record<string, any> = {};
    for (const key of allowedFields) {
      if (key in req.body) updateData[key] = req.body[key];
    }
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: "No valid fields to update" });
    }

    const updated = await storage.updateTradePlan(Number(req.params.id), updateData);
    if (!updated) return res.status(404).json({ message: "Trade plan not found" });
    res.json(updated);
  });

  app.delete("/api/trade-plans/:id", requireAuth, async (req, res) => {
    const plan = await storage.getTradePlan(Number(req.params.id));
    if (!plan) return res.status(404).json({ message: "Trade plan not found" });
    const currentUser = (req as any).user;
    if (currentUser.role !== "admin" && plan.userId !== currentUser.id) {
      return res.status(403).json({ message: "Not authorized" });
    }
    await storage.deleteTradePlan(Number(req.params.id));
    res.status(204).send();
  });

  app.get("/api/ticker-search", requireAuth, async (req, res) => {
    const query = (req.query.q as string || "").trim();
    if (!query || query.length < 1) {
      return res.json([]);
    }
    const apiKey = process.env.POLYGON_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ message: "Polygon API key not configured" });
    }
    try {
      const url = `https://api.polygon.io/v3/reference/tickers?search=${encodeURIComponent(query)}&active=true&limit=10&apiKey=${apiKey}`;
      const response = await fetch(url);
      if (!response.ok) {
        return res.status(502).json({ message: "Polygon API error" });
      }
      const data = await response.json() as any;
      const results = (data.results || []).map((t: any) => ({
        ticker: t.ticker,
        name: t.name,
        market: t.market,
        type: t.type,
      }));
      res.json(results);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch tickers" });
    }
  });

  app.get("/api/stats", requireAuth, async (_req, res) => {
    const [allSignals, allTypes] = await Promise.all([
      storage.getSignals(),
      storage.getSignalTypes(),
    ]);
    res.json({
      totalSignals: allSignals.length,
      totalSignalTypes: allTypes.length,
      sentToDiscord: allSignals.filter(s => s.sentToDiscord).length,
      recentSignals: allSignals.slice(0, 5),
    });
  });

  return httpServer;
}
