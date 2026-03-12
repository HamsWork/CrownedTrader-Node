import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertSignalTypeSchema, insertSignalSchema, insertTradePlanSchema, registerSchema, loginSchema, discordChannelSchema } from "@shared/schema";
import { buildEmbed, sendToDiscord, sendFileToDiscord, type DiscordEmbed } from "./utils/discord";
import { sendToTradeSync, buildTradeSyncPayload, stopAutoTrack } from "./utils/tradesync";
import { processSignalDelivery } from "./utils/signals";
import { isValidDiscordWebhookUrl } from "./utils/validation";
import {
  getApiKey as getPolygonApiKey,
  searchTickers,
  getTickerDetails,
  getStockPrice,
  getOptionQuote,
  getBestOption,
} from "./utils/polygon";
import { hashPassword, comparePassword, toSafeUser, requireAuth, requireAdmin } from "./auth";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";

const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({ dest: uploadDir, limits: { fileSize: 25 * 1024 * 1024 } });

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

  app.patch("/api/signals/:id/status", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid signal ID" });
    const { status, closePrice, closeNote } = req.body;
    if (!status || !["open", "closed"].includes(status)) {
      return res.status(400).json({ message: "Status must be 'open' or 'closed'" });
    }
    const updated = await storage.updateSignalStatus(id, status, closePrice, closeNote);
    if (!updated) return res.status(404).json({ message: "Signal not found" });
    res.json(updated);
  });

  app.patch("/api/signals/:id/data", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid signal ID" });
    const signal = await storage.getSignal(id);
    if (!signal) return res.status(404).json({ message: "Signal not found" });
    const existingData = (signal.data ?? {}) as Record<string, string>;
    const updates = req.body as Record<string, string>;
    const merged = { ...existingData, ...updates };
    const updated = await storage.updateSignalData(id, merged);
    res.json(updated);
  });

  app.post("/api/signals/:id/stop-auto-track", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    console.log("stop-auto-track", id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid signal ID" });
    const signal = await storage.getSignal(id);
    if (!signal) return res.status(404).json({ message: "Signal not found" });

    const data = (signal.data ?? {}) as any;
    const rawTsId = data.tradesync_id;
    let tradesyncId: number | undefined;
    if (typeof rawTsId === "number") {
      tradesyncId = rawTsId;
    } else if (typeof rawTsId === "string") {
      const parsed = parseInt(rawTsId, 10);
      if (!Number.isNaN(parsed)) tradesyncId = parsed;
    }

    if (!tradesyncId) {
      return res.status(400).json({ message: "TradeSync id not found for this signal" });
    }

    const result = await stopAutoTrack(tradesyncId);
    if (!result.ok) {
      return res.status(502).json({ message: result.error ?? "TradeSync stop-auto-track failed" });
    }
    const merged = {
      ...((signal.data ?? {}) as Record<string, unknown>),
      auto_track: false,
      trade_tracking: "Manual updates",
    };
    const updated = await storage.updateSignalData(id, merged as unknown as Record<string, string>);
    res.json(updated ?? signal);
  });

  app.post("/api/signals", requireAuth, upload.single("chartMedia"), async (req, res) => {
    let body = req.body;
    if (typeof body.data === "string") {
      try {
        body = { ...body, data: JSON.parse(body.data) };
      } catch {
        // keep as-is
      }
    }

    const parsed = insertSignalSchema.safeParse(body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });

    const currentUser = (req as any).user;
    const created = await storage.createSignal({ ...parsed.data, userId: currentUser.id });

    try {
      const { signal, tradeSyncError } = await processSignalDelivery({
        signal: created,
        currentUser,
        chartFile: req.file ?? null,
      });

      const response: Record<string, unknown> = { ...signal };
      if (tradeSyncError) response.tradeSyncError = tradeSyncError;

      res.status(201).json(response);
    } catch (err: any) {
      return res.status(500).json({ message: err?.message || "Failed to process signal" });
    }
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

  app.post("/api/send-ta", requireAuth, upload.single("media"), async (req, res) => {
    try {
      const currentUser = (req as any).user;
      const { channel, commentary } = req.body;
      const file = req.file;

      if (!file && !commentary?.trim()) {
        return res.status(400).json({ message: "Please add commentary or upload media" });
      }
      if (!channel) {
        return res.status(400).json({ message: "Destination channel is required" });
      }

      const userChannels = currentUser.discordChannels || [];
      const selectedChannel = userChannels.find((ch: any) => ch.name === channel);
      if (!selectedChannel || !selectedChannel.webhookUrl) {
        return res.status(400).json({ message: "Channel not found or missing webhook URL" });
      }

      const description = (commentary || "").trim();
      const fileName = file ? (file.originalname || "ta_media").trim() : "";
      const isImage = file ? (file.mimetype || "").startsWith("image/") : false;

      const taEmbed: DiscordEmbed = {
        color: 0x5865F2,
        footer: { text: "Disclaimer: Not financial advice. Trade at your own risk." },
      };
      if (description) {
        taEmbed.description = description;
      }

      if (file && isImage) {
        taEmbed.image = { url: `attachment://${fileName}` };
      }

      let discordResult;
      if (file) {
        discordResult = await sendFileToDiscord(
          selectedChannel.webhookUrl,
          file.path,
          fileName,
          "@everyone",
          taEmbed
        );
        fs.unlink(file.path, () => {});
      } else {
        discordResult = await sendToDiscord(
          selectedChannel.webhookUrl,
          taEmbed,
          "@everyone"
        );
      }

      if (!discordResult.ok) {
        return res.status(502).json({ message: `Discord error: ${discordResult.error || "Failed to send to Discord"}` });
      }

      res.json({ success: true });
    } catch (err) {
      console.error("Send TA error:", err);
      res.status(500).json({ message: "Failed to send TA" });
    }
  });

  app.get("/api/ticker-search", requireAuth, async (req, res) => {
    const query = (req.query.q as string || "").trim();
    if (!query || query.length < 1) return res.json([]);
    const apiKey = getPolygonApiKey();
    if (!apiKey) return res.status(500).json({ message: "Polygon API key not configured" });
    try {
      const all = await searchTickers(apiKey, query);
      res.json(all);
    } catch {
      res.status(500).json({ message: "Failed to fetch tickers" });
    }
  });

  app.get("/api/ticker-details/:ticker", requireAuth, async (req, res) => {
    const ticker = String(req.params.ticker ?? "").toUpperCase();
    const apiKey = getPolygonApiKey();
    if (!apiKey) return res.status(500).json({ message: "Polygon API key not configured" });
    try {
      const marketHint = (req.query.market as string) || "";
      const details = await getTickerDetails(apiKey, ticker, marketHint);
      if (!details) return res.status(502).json({ message: "Polygon API error" });
      res.json(details);
    } catch {
      res.status(500).json({ message: "Failed to fetch ticker details" });
    }
  });

  app.get("/api/stock-price/:ticker", requireAuth, async (req, res) => {
    const ticker = String(req.params.ticker ?? "").toUpperCase();
    const apiKey = getPolygonApiKey();
    if (!apiKey) return res.status(500).json({ message: "Polygon API key not configured" });
    try {
      const marketHint = (req.query.market as string) || "";
      const result = await getStockPrice(apiKey, ticker, marketHint);
      if (result) return res.json(result);
      return res.status(404).json({ message: "Price not available" });
    } catch {
      return res.status(500).json({ message: "Failed to fetch stock price" });
    }
  });

  app.get("/api/option-quote", requireAuth, async (req, res) => {
    const apiKey = getPolygonApiKey();
    if (!apiKey) return res.status(500).json({ message: "Polygon API key not configured" });

    const underlying = ((req.query.underlying as string) || "").trim().toUpperCase();
    const expiration = ((req.query.expiration as string) || "").trim();
    const strike = parseFloat(req.query.strike as string);
    const optionType = ((req.query.optionType as string) || "call").trim();

    if (!underlying || !expiration || isNaN(strike) || strike <= 0) {
      return res.status(400).json({ message: "underlying, expiration, and strike are required" });
    }

    try {
      const quote = await getOptionQuote(apiKey, underlying, expiration, strike, optionType);
      if (!quote) return res.status(404).json({ message: "Option contract not found" });
      return res.json(quote);
    } catch (err) {
      console.error("Option quote error:", err);
      return res.status(500).json({ message: "Failed to fetch option quote" });
    }
  });

  app.get("/api/best-option", requireAuth, async (req, res) => {
    const apiKey = getPolygonApiKey();
    if (!apiKey) return res.status(500).json({ message: "Polygon API key not configured" });

    const underlying = ((req.query.underlying as string) || "").trim().toUpperCase();
    const side = ((req.query.side as string) || "call").trim().toLowerCase() as "call" | "put";
    const tradeType = ((req.query.tradeType as string) || "scalp").trim().toLowerCase() as "scalp" | "swing" | "leap";
    const underlyingPrice = parseFloat(req.query.underlyingPrice as string);

    if (!underlying || !underlyingPrice || underlyingPrice <= 0) {
      return res.status(400).json({ message: "underlying and underlyingPrice are required" });
    }
    if (!["call", "put"].includes(side)) {
      return res.status(400).json({ message: "side must be call or put" });
    }
    if (!["scalp", "swing", "leap"].includes(tradeType)) {
      return res.status(400).json({ message: "tradeType must be scalp, swing, or leap" });
    }

    try {
      const result = await getBestOption(apiKey, underlying, side, tradeType, underlyingPrice);
      if (result) return res.json(result);
      return res.status(404).json({ message: "No option contract meets the selection criteria" });
    } catch (err) {
      console.error("Best option error:", err);
      return res.status(500).json({ message: "Failed to find best option" });
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

  app.get("/api/leaderboard", requireAuth, async (req, res) => {
    try {
      const period = (req.query.period as string) || "this_week";
      const now = new Date();
      let startDate: Date;
      let endDate: Date = now;

      if (period === "this_week") {
        const day = now.getDay();
        startDate = new Date(now);
        startDate.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
      } else if (period === "last_week") {
        const day = now.getDay();
        const thisMonday = new Date(now);
        thisMonday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
        startDate = new Date(thisMonday);
        startDate.setDate(thisMonday.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
      } else if (period === "this_month") {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      } else if (period === "last_month") {
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      } else {
        startDate = new Date(0);
      }

      const [allSignals, allUsers] = await Promise.all([
        storage.getSignals(),
        storage.getUsers(),
      ]);

      const periodSignals = allSignals.filter(s => {
        const created = new Date(s.createdAt);
        return created >= startDate && created <= endDate;
      });

      const usersMap = new Map(allUsers.map(u => [u.id, u]));

      const userStats: Record<number, {
        userId: number;
        username: string;
        trades: number;
        wins: number;
        losses: number;
        totalPnl: number;
      }> = {};

      for (const signal of periodSignals) {
        const uid = signal.userId ?? 0;
        if (!userStats[uid]) {
          const user = usersMap.get(uid);
          userStats[uid] = {
            userId: uid,
            username: user?.username ?? "Unknown",
            trades: 0,
            wins: 0,
            losses: 0,
            totalPnl: 0,
          };
        }
        const st = userStats[uid];
        st.trades++;

        const data = (signal.data ?? {}) as Record<string, string>;
        const entryPrice = parseFloat(data.entry_price || data.option_price || "0");
        const direction = data.direction || "Long";

        if (signal.status === "closed" && signal.closePrice) {
          const exitPrice = parseFloat(signal.closePrice);
          if (entryPrice > 0 && exitPrice > 0) {
            const pnl = direction === "Short"
              ? ((entryPrice - exitPrice) / entryPrice) * 100
              : ((exitPrice - entryPrice) / entryPrice) * 100;
            st.totalPnl += pnl;
            if (pnl >= 0) st.wins++;
            else st.losses++;
          }
        }
      }

      const leaderboard = Object.values(userStats)
        .map(st => ({
          ...st,
          avgPnl: st.trades > 0 ? st.totalPnl / st.trades : 0,
          winRate: (st.wins + st.losses) > 0 ? (st.wins / (st.wins + st.losses)) * 100 : 0,
        }))
        .sort((a, b) => b.avgPnl - a.avgPnl);

      const totals = {
        trades: periodSignals.length,
        wins: leaderboard.reduce((s, l) => s + l.wins, 0),
        losses: leaderboard.reduce((s, l) => s + l.losses, 0),
        avgPnl: leaderboard.length > 0
          ? leaderboard.reduce((s, l) => s + l.avgPnl, 0) / leaderboard.length
          : 0,
        winRate: (() => {
          const totalW = leaderboard.reduce((s, l) => s + l.wins, 0);
          const totalL = leaderboard.reduce((s, l) => s + l.losses, 0);
          return (totalW + totalL) > 0 ? (totalW / (totalW + totalL)) * 100 : 0;
        })(),
      };

      const formatDateRange = (s: Date, e: Date) => {
        const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
        return `${fmt(s)} – ${fmt(e)}`;
      };

      res.json({
        period,
        dateRange: formatDateRange(startDate, endDate),
        totals,
        traders: leaderboard,
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/audit", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      if (user?.role !== "admin") {
        return res.status(403).json({ message: "Admin only" });
      }

      const fs = await import("fs");
      const path = await import("path");
      const projectRoot = process.cwd();

      let auditJson: any = {};
      try {
        const jsonPath = path.join(projectRoot, "SYSTEM_AUDIT.json");
        const raw = fs.readFileSync(jsonPath, "utf-8");
        auditJson = JSON.parse(raw);
      } catch {
        auditJson = { overview: { name: "Crowned Trader", version: "1.0.0" }, features: [], dataFlows: [], latestChanges: [] };
      }

      const fileDescriptions: Record<string, string> = {
        "server/index.ts": "Application entry point, starts Express server",
        "server/routes.ts": "All API route handlers and endpoint definitions",
        "server/storage.ts": "Database storage interface and implementation (Drizzle ORM)",
        "server/auth.ts": "Custom session-based authentication with bcryptjs",
        "server/db.ts": "Database connection pool configuration",
        "server/seed.ts": "Database seeding with default users and signal types",
        "server/vite.ts": "Vite dev server integration for development",
        "server/static.ts": "Static file serving for production builds",
        "server/utils/discord.ts": "Discord webhook integration for sending embeds",
        "server/utils/template.ts": "Discord message template rendering engine",
        "server/utils/tradesync.ts": "TradeSync API client for pushing trade signals",
        "server/utils/validation.ts": "Request validation utilities",
        "shared/schema.ts": "Database schema, Zod validators, and TypeScript types",
        "shared/template-definitions.ts": "30 Discord embed template definitions",
        "shared/template-render.ts": "Template rendering logic for Discord embeds",
        "client/src/App.tsx": "Root React component with routing and layout",
        "client/src/main.tsx": "React application entry point",
        "client/src/pages/dashboard.tsx": "Dashboard with stats and leaderboard",
        "client/src/pages/send-signal.tsx": "Send Signal form with live Discord preview",
        "client/src/pages/send-ta.tsx": "Send Technical Analysis page",
        "client/src/pages/position-management.tsx": "Position tracking with partial/full exit modals",
        "client/src/pages/signal-history.tsx": "Signal history browser with search and filtering",
        "client/src/pages/trade-plans.tsx": "Trade plan management (take profit levels, stop loss)",
        "client/src/pages/discord-templates.tsx": "Discord template editor (admin)",
        "client/src/pages/user-management.tsx": "User CRUD management (admin)",
        "client/src/pages/login.tsx": "Login page",
        "client/src/pages/not-found.tsx": "404 page",
        "client/src/pages/system-audit.tsx": "System audit and codebase status page",
        "client/src/components/app-sidebar.tsx": "Main navigation sidebar",
        "client/src/components/signal-card.tsx": "Signal display card component",
        "client/src/components/stat-card.tsx": "Dashboard stat card component",
        "client/src/components/empty-state.tsx": "Empty state placeholder component",
        "client/src/components/theme-provider.tsx": "Dark/light theme provider",
        "client/src/components/take-profit-level-form.tsx": "Take profit level form component",
        "client/src/hooks/use-auth.ts": "Authentication React hook",
        "client/src/hooks/use-signals.ts": "Signal data fetching hooks",
        "client/src/hooks/use-toast.ts": "Toast notification hook",
        "client/src/lib/queryClient.ts": "TanStack Query client configuration",
        "client/src/lib/constants.ts": "Application constants",
        "client/src/lib/utils.ts": "Utility functions (cn, etc.)",
        "drizzle.config.ts": "Drizzle ORM configuration",
        "vite.config.ts": "Vite bundler configuration",
        "tailwind.config.ts": "Tailwind CSS configuration",
        "package.json": "Project dependencies and scripts",
      };

      const lastUpdateNotes: Record<string, string> = {
        "server/index.ts": "Stable entry point — no recent changes",
        "server/routes.ts": "Added /api/leaderboard endpoint, enhanced /api/audit to serve SYSTEM_AUDIT.json with dynamic file stats",
        "server/storage.ts": "Added updateSignalData() method for merging signal data fields; extended IStorage interface",
        "server/auth.ts": "Custom session auth with bcryptjs (10 rounds) — stable",
        "server/db.ts": "Database connection pool — stable, no recent changes",
        "server/seed.ts": "Seeds admin/trader1 users and 30 Discord templates — stable",
        "server/vite.ts": "Vite dev server middleware integration — stable",
        "server/static.ts": "Static file serving for production — stable",
        "server/utils/discord.ts": "Discord webhook sender with TLS override — stable",
        "server/utils/template.ts": "Template rendering with Handlebars-style variable substitution — stable",
        "server/utils/tradesync.ts": "TradeSync API integration for auto-tracking trade signals — stable",
        "server/utils/validation.ts": "Zod-based request validation helpers — stable",
        "shared/schema.ts": "Added status, closedAt, closePrice, closeNote fields to signals table; exported TakeProfitLevel type",
        "shared/template-definitions.ts": "30 Discord embed templates across Options, Shares, LETF, LETF Option, Crypto categories — stable",
        "shared/template-render.ts": "Template rendering logic for Discord embeds — stable",
        "client/src/App.tsx": "Added routes for /history, /audit; imported new page components",
        "client/src/main.tsx": "React entry point — stable",
        "client/src/pages/dashboard.tsx": "Crowned Traders Leaderboard with period filtering and responsive stats grid",
        "client/src/pages/send-signal.tsx": "Unified Send Signal form with crypto detection, LETF underlying map, live Discord preview, TradeSync integration",
        "client/src/pages/send-ta.tsx": "Send Technical Analysis page — stable",
        "client/src/pages/position-management.tsx": "Rebuilt with tab navigation, Partial/Full Exit modals, Switch to Manual tracking, responsive table",
        "client/src/pages/signal-history.tsx": "Card-based layout grouped by date with summary stats, expandable payload, copy and Discord preview",
        "client/src/pages/trade-plans.tsx": "Trade plan CRUD with take profit levels, stop loss, trailing stop configuration — stable",
        "client/src/pages/discord-templates.tsx": "Admin template editor with preview and manual send dialogs — stable",
        "client/src/pages/user-management.tsx": "Admin user CRUD with channel management — stable",
        "client/src/pages/login.tsx": "Login page with session-based auth — stable",
        "client/src/pages/not-found.tsx": "404 page — stable",
        "client/src/pages/system-audit.tsx": "Rebuilt as comprehensive architecture reference with tabs: Overview, Features, Codebase, Updates",
        "client/src/components/app-sidebar.tsx": "Navigation sidebar with role-aware menu items — stable",
        "client/src/components/signal-card.tsx": "Signal display card — stable",
        "client/src/components/stat-card.tsx": "Dashboard stat card — stable",
        "client/src/components/empty-state.tsx": "Empty state placeholder — stable",
        "client/src/components/theme-provider.tsx": "Dark/light theme toggle with localStorage — stable",
        "client/src/components/take-profit-level-form.tsx": "Take profit level form with trailing stop and raise SL options — stable",
        "client/src/hooks/use-auth.ts": "Auth hook with login/logout mutations — stable",
        "client/src/hooks/use-signals.ts": "Signal and signal type data fetching hooks — stable",
        "client/src/hooks/use-toast.ts": "Toast notification hook — stable",
        "client/src/lib/queryClient.ts": "TanStack Query client with default fetcher — stable",
        "client/src/lib/constants.ts": "APP_NAME constant — stable",
        "client/src/lib/utils.ts": "cn() utility — stable",
        "drizzle.config.ts": "Drizzle config with session table filter — stable",
        "vite.config.ts": "Vite config with path aliases — stable",
        "tailwind.config.ts": "Tailwind config with dark mode class — stable",
        "package.json": "Project dependencies — stable",
      };

      function categorize(filePath: string): string {
        if (filePath.startsWith("server/utils/")) return "Server Utilities";
        if (filePath.startsWith("server/")) return "Server Core";
        if (filePath.startsWith("shared/")) return "Shared / Schema";
        if (filePath.startsWith("client/src/pages/")) return "Client Pages";
        if (filePath.startsWith("client/src/components/") && !filePath.includes("/ui/")) return "Client Components";
        if (filePath.startsWith("client/src/hooks/") || filePath.startsWith("client/src/lib/")) return "Client Hooks & Libs";
        return "Config";
      }

      function countLines(fullPath: string): number {
        try { return fs.readFileSync(fullPath, "utf-8").split("\n").length; } catch { return 0; }
      }

      function getModTime(fullPath: string): string {
        try { return fs.statSync(fullPath).mtime.toISOString(); } catch { return new Date().toISOString(); }
      }

      const categories: Record<string, { files: any[] }> = {
        "Server Core": { files: [] },
        "Server Utilities": { files: [] },
        "Shared / Schema": { files: [] },
        "Client Pages": { files: [] },
        "Client Components": { files: [] },
        "Client Hooks & Libs": { files: [] },
        "Config": { files: [] },
      };

      for (const relPath of Object.keys(fileDescriptions)) {
        const fullPath = path.join(projectRoot, relPath);
        if (!fs.existsSync(fullPath)) continue;
        const cat = categorize(relPath);
        if (categories[cat]) {
          categories[cat].files.push({
            path: relPath,
            description: fileDescriptions[relPath] || relPath,
            lastUpdateNote: lastUpdateNotes[relPath] || "No recent changes",
            lines: countLines(fullPath),
            lastModified: getModTime(fullPath),
          });
        }
      }

      const totalFiles = Object.values(categories).reduce((s, c) => s + c.files.length, 0);
      const totalLines = Object.values(categories).reduce((s, c) => s + c.files.reduce((ls: number, f: any) => ls + f.lines, 0), 0);
      const allFiles = Object.values(categories).flatMap(c => c.files);
      const lastUpdated = allFiles.length > 0
        ? allFiles.reduce((latest: string, f: any) => f.lastModified > latest ? f.lastModified : latest, allFiles[0].lastModified)
        : new Date().toISOString();

      res.json({
        projectName: auditJson.overview?.name || "Crowned Trader",
        version: auditJson.overview?.version || "1.0.0",
        description: auditJson.overview?.description || "",
        architecture: auditJson.overview?.architecture || {},
        lastUpdated,
        totalFiles,
        totalLines,
        categories,
        features: auditJson.features || [],
        dataFlows: auditJson.dataFlows || [],
        latestChanges: auditJson.latestChanges || [],
        techStack: [
          { name: "Node.js", category: "Runtime" },
          { name: "Express", category: "Backend Framework" },
          { name: "PostgreSQL", category: "Database" },
          { name: "Drizzle ORM", category: "ORM" },
          { name: "React 18", category: "Frontend Framework" },
          { name: "TypeScript", category: "Language" },
          { name: "Vite", category: "Build Tool" },
          { name: "Tailwind CSS", category: "Styling" },
          { name: "Shadcn/ui", category: "UI Components" },
          { name: "TanStack Query", category: "Data Fetching" },
          { name: "Wouter", category: "Routing" },
          { name: "express-session + bcryptjs", category: "Authentication" },
          { name: "Zod", category: "Validation" },
          { name: "Polygon.io API", category: "Market Data" },
          { name: "Discord Webhooks", category: "Notifications" },
          { name: "TradeSync API", category: "Trade Execution" },
        ],
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  return httpServer;
}
