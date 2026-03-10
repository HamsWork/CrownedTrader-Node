import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertSignalTypeSchema, insertSignalSchema, insertTradePlanSchema, registerSchema, loginSchema, discordChannelSchema } from "@shared/schema";
import { buildEmbed, sendToDiscord, sendFileToDiscord, type DiscordEmbed } from "./utils/discord";
import { isValidDiscordWebhookUrl } from "./utils/validation";
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

  app.post("/api/signals", requireAuth, upload.single("chartMedia"), async (req, res) => {
    let body = req.body;
    if (typeof body.data === "string") {
      try {
        body = { ...body, data: JSON.parse(body.data) };
      } catch { /* keep as-is */ }
    }

    const parsed = insertSignalSchema.safeParse(body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });

    const currentUser = (req as any).user;
    const signal = await storage.createSignal({ ...parsed.data, userId: currentUser.id });
    const chartFile = req.file;

    const discordErrors: string[] = [];

    try {
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
            const result = await sendToDiscord(channel.webhookUrl, embed, signalType.content || undefined);
            await storage.updateSignalDiscordStatus(signal.id, result.ok);
            signal.sentToDiscord = result.ok;
            if (!result.ok) discordErrors.push(result.error || "Failed to send embed to Discord");
          } else {
            const data = signal.data as Record<string, string>;
            const entry = parseFloat(data.entry_price) || 0;
            const embed = {
              title: `🔺 Trade Alert`,
              description: `**${data.ticker || ""}** — ${data.trade_type || "Scalp"}\nEntry: $${entry.toFixed(2)}`,
              color: 0x22c55e,
              fields: [] as Array<{name: string; value: string; inline?: boolean}>,
              footer: { text: "Disclaimer: Not financial advice. Trade at your own risk." },
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
            if (data.risk_management) {
              embed.fields.push({ name: "🛡️ Risk Management", value: data.risk_management, inline: false });
            }
            const result = await sendToDiscord(channel.webhookUrl, embed);
            await storage.updateSignalDiscordStatus(signal.id, result.ok);
            signal.sentToDiscord = result.ok;
            if (!result.ok) discordErrors.push(result.error || "Failed to send embed to Discord");
          }

          if (chartFile) {
            const chartResult = await sendFileToDiscord(channel.webhookUrl, chartFile.path, chartFile.originalname || "chart.png", "📊 **Chart Analysis**");
            if (!chartResult.ok) discordErrors.push(`Chart upload: ${chartResult.error || "Failed"}`);
          }
        } else {
          discordErrors.push(`Channel "${signal.discordChannelName}" not found or has no webhook URL`);
        }
      }
    } finally {
      if (chartFile) {
        try { fs.unlinkSync(chartFile.path); } catch {}
      }
    }

    const response: Record<string, unknown> = { ...signal };
    if (discordErrors.length > 0) {
      response.discordErrors = discordErrors;
    }
    res.status(201).json(response);
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
        timestamp: new Date().toISOString(),
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
    if (!query || query.length < 1) {
      return res.json([]);
    }
    const apiKey = process.env.POLYGON_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ message: "Polygon API key not configured" });
    }
    try {
      const searchParam = encodeURIComponent(query);
      const [stocksRes, cryptoRes] = await Promise.all([
        fetch(`https://api.polygon.io/v3/reference/tickers?search=${searchParam}&market=stocks&active=true&limit=7&apiKey=${apiKey}`),
        fetch(`https://api.polygon.io/v3/reference/tickers?search=${searchParam}&market=crypto&active=true&limit=3&apiKey=${apiKey}`),
      ]);
      const mapResults = (data: any) => (data.results || []).map((t: any) => ({
        ticker: t.ticker,
        name: t.name,
        market: t.market,
        type: t.type,
      }));
      const stocks = stocksRes.ok ? mapResults(await stocksRes.json()) : [];
      const crypto = cryptoRes.ok ? mapResults(await cryptoRes.json()) : [];
      const all = [...stocks, ...crypto];
      const q = query.toUpperCase();
      all.sort((a: any, b: any) => {
        const aExact = a.ticker.toUpperCase() === q ? 0 : 1;
        const bExact = b.ticker.toUpperCase() === q ? 0 : 1;
        if (aExact !== bExact) return aExact - bExact;
        const aStarts = a.ticker.toUpperCase().startsWith(q) ? 0 : 1;
        const bStarts = b.ticker.toUpperCase().startsWith(q) ? 0 : 1;
        if (aStarts !== bStarts) return aStarts - bStarts;
        return a.ticker.length - b.ticker.length;
      });
      res.json(all);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch tickers" });
    }
  });

  app.get("/api/ticker-details/:ticker", requireAuth, async (req, res) => {
    const ticker = req.params.ticker.toUpperCase();
    const apiKey = process.env.POLYGON_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ message: "Polygon API key not configured" });
    }
    try {
      const url = `https://api.polygon.io/v3/reference/tickers/${encodeURIComponent(ticker)}?apiKey=${apiKey}`;
      const response = await fetch(url);
      if (!response.ok) {
        return res.status(502).json({ message: "Polygon API error" });
      }
      const data = await response.json() as any;
      const r = data.results || {};

      const name = r.name || "";
      const market = r.market || "";
      const tickerType = r.type || "";
      const description = r.description || "";
      const nameLower = name.toLowerCase();
      const descLower = description.toLowerCase();

      let category = "Stock";
      let leverage = "";
      let underlying = "";

      if (market === "crypto") {
        category = "Crypto";
      } else if (tickerType === "ETF" || tickerType === "ETN") {
        const leverageMatch = nameLower.match(/(\d+)x\b/) || descLower.match(/(\d+)x\b/);
        const leverageWords = ["ultra", "leveraged", "direxion", "proshares"];
        const isLeveraged = leverageWords.some(w => nameLower.includes(w) || descLower.includes(w)) || leverageMatch;

        if (isLeveraged) {
          category = "LETF";
          if (leverageMatch) {
            leverage = leverageMatch[1] + "x";
          } else if (nameLower.includes("ultra") && !nameLower.includes("ultrashort")) {
            leverage = "2x";
          } else if (nameLower.includes("ultrashort")) {
            leverage = "-2x";
          }

          const trackingMatch = descLower.match(/(?:tracks?|based on|seeks.*(?:results|return).*of)\s+(?:the\s+)?([A-Za-z0-9&\s]+?)(?:\s+index|\s+price|\.|,)/i);
          if (trackingMatch) {
            underlying = trackingMatch[1].trim();
          }
        } else {
          category = "ETF";
        }
      }

      res.json({
        ticker: r.ticker || ticker,
        name,
        market,
        type: tickerType,
        category,
        leverage,
        underlying,
        description: description.slice(0, 200),
      });
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch ticker details" });
    }
  });

  app.get("/api/stock-price/:ticker", requireAuth, async (req, res) => {
    const ticker = req.params.ticker.toUpperCase();
    const apiKey = process.env.POLYGON_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ message: "Polygon API key not configured" });
    }
    try {
      const isCrypto = ticker.startsWith("X:") || ticker.endsWith("USD") || ticker.endsWith("USDT");
      const polygonTicker = isCrypto && !ticker.startsWith("X:") ? `X:${ticker}` : ticker;

      let price: number | null = null;
      let source = "";

      const nbboRes = await fetch(`https://api.polygon.io/v2/last/nbbo/${encodeURIComponent(polygonTicker)}?apiKey=${apiKey}`);
      if (nbboRes.ok) {
        const nbboData = await nbboRes.json() as any;
        if (nbboData.status === "OK" && nbboData.results) {
          const bid = parseFloat(nbboData.results.p || "0");
          const ask = parseFloat(nbboData.results.P || "0");
          if (bid > 0 && ask > 0) { price = (bid + ask) / 2; source = "nbbo_mid"; }
          else if (ask > 0) { price = ask; source = "nbbo_ask"; }
          else if (bid > 0) { price = bid; source = "nbbo_bid"; }
        }
      }

      if (!price && !isCrypto) {
        const snapRes = await fetch(`https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers/${encodeURIComponent(ticker)}?apiKey=${apiKey}`);
        if (snapRes.ok) {
          const snapData = await snapRes.json() as any;
          const t = snapData.ticker || {};
          const lastTrade = t.lastTrade || {};
          const day = t.day || {};
          const prevDay = t.prevDay || {};
          const p = parseFloat(lastTrade.p || day.c || prevDay.c || "0");
          if (p > 0) { price = p; source = "snapshot"; }
        }
      }

      if (!price) {
        const prevRes = await fetch(`https://api.polygon.io/v2/aggs/ticker/${encodeURIComponent(isCrypto ? polygonTicker : ticker)}/prev?apiKey=${apiKey}`);
        if (prevRes.ok) {
          const prevData = await prevRes.json() as any;
          if (prevData.status === "OK" && prevData.results?.length > 0) {
            const c = parseFloat(prevData.results[0].c || "0");
            if (c > 0) { price = c; source = "previous_close"; }
          }
        }
      }

      if (price) {
        return res.json({ price: Math.round(price * 100) / 100, source });
      }
      return res.status(404).json({ message: "Price not available" });
    } catch {
      return res.status(500).json({ message: "Failed to fetch stock price" });
    }
  });

  app.get("/api/option-quote", requireAuth, async (req, res) => {
    const apiKey = process.env.POLYGON_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ message: "Polygon API key not configured" });
    }

    const underlying = ((req.query.underlying as string) || "").trim().toUpperCase();
    const expiration = ((req.query.expiration as string) || "").trim();
    const strike = parseFloat(req.query.strike as string);
    const optionType = ((req.query.optionType as string) || "call").trim().toUpperCase();

    if (!underlying || !expiration || isNaN(strike) || strike <= 0) {
      return res.status(400).json({ message: "underlying, expiration, and strike are required" });
    }

    try {
      const expClean = expiration.replace(/-/g, "");
      const side = optionType === "PUT" ? "P" : "C";
      const strikePadded = (strike * 1000).toFixed(0).padStart(8, "0");
      const contractTicker = `O:${underlying}${expClean}${side}${strikePadded}`;

      const url = `https://api.polygon.io/v3/snapshot/options/${encodeURIComponent(underlying)}/${encodeURIComponent(contractTicker)}?apiKey=${apiKey}`;
      const snapRes = await fetch(url);

      if (!snapRes.ok) {
        return res.status(404).json({ message: "Option contract not found" });
      }

      const snapData = await snapRes.json() as any;
      if (snapData.status !== "OK" || !snapData.results) {
        return res.status(404).json({ message: "Option contract not found" });
      }

      const results = snapData.results;
      const lq = results.last_quote || results.lastQuote || {};
      const bid = parseFloat(lq.bid || lq.bid_price || "0") || 0;
      const ask = parseFloat(lq.ask || lq.ask_price || "0") || 0;
      let price: number | null = null;
      if (bid > 0 && ask > 0) price = (bid + ask) / 2;
      else if (ask > 0) price = ask;
      else if (bid > 0) price = bid;

      if (!price) {
        const lt = results.last_trade || results.lastTrade || {};
        const p = parseFloat(lt.price || lt.p || "0");
        if (p > 0) price = p;
      }

      if (!price) {
        return res.status(404).json({ message: "No price data for this contract" });
      }

      const greeks = results.greeks || {};
      return res.json({
        contract: contractTicker,
        price: Math.round(price * 100) / 100,
        bid: bid > 0 ? bid : null,
        ask: ask > 0 ? ask : null,
        delta: greeks.delta != null ? parseFloat(greeks.delta) : null,
        openInterest: parseInt(results.open_interest || "0") || 0,
      });
    } catch (err) {
      console.error("Option quote error:", err);
      return res.status(500).json({ message: "Failed to fetch option quote" });
    }
  });

  app.get("/api/best-option", requireAuth, async (req, res) => {
    const apiKey = process.env.POLYGON_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ message: "Polygon API key not configured" });
    }

    const underlying = ((req.query.underlying as string) || "").trim().toUpperCase();
    const side = ((req.query.side as string) || "call").trim().toLowerCase();
    const tradeType = ((req.query.tradeType as string) || "scalp").trim().toLowerCase();
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
      const today = new Date();
      let expGte: string, expLte: string;

      if (tradeType === "scalp") {
        expGte = today.toISOString().slice(0, 10);
        const end = new Date(today);
        end.setDate(end.getDate() + 3);
        expLte = end.toISOString().slice(0, 10);
      } else if (tradeType === "swing") {
        const start = new Date(today);
        start.setDate(start.getDate() + 6);
        expGte = start.toISOString().slice(0, 10);
        const end = new Date(today);
        end.setDate(end.getDate() + 45);
        expLte = end.toISOString().slice(0, 10);
      } else {
        const start = new Date(today);
        start.setDate(start.getDate() + 200);
        expGte = start.toISOString().slice(0, 10);
        const end = new Date(today);
        end.setDate(end.getDate() + 450);
        expLte = end.toISOString().slice(0, 10);
      }

      const strikeRange = tradeType === "leap" ? 0.05 : 0.02;
      const strikeGte = underlyingPrice * (1 - strikeRange);
      const strikeLte = underlyingPrice * (1 + strikeRange);

      const params = new URLSearchParams({
        contract_type: side,
        "expiration_date.gte": expGte,
        "expiration_date.lte": expLte,
        "strike_price.gte": strikeGte.toFixed(2),
        "strike_price.lte": strikeLte.toFixed(2),
        limit: "250",
        apiKey,
      });

      const allSnapshots: any[] = [];
      let url: string | null = `https://api.polygon.io/v3/snapshot/options/${encodeURIComponent(underlying)}?${params}`;
      let pages = 0;

      while (url && pages < 5) {
        pages++;
        const snapRes = await fetch(url);
        if (!snapRes.ok) break;
        const snapData = await snapRes.json() as any;
        const results = snapData.results || [];
        allSnapshots.push(...results);
        url = snapData.next_url ? `${snapData.next_url}&apiKey=${apiKey}` : null;
      }

      if (allSnapshots.length === 0) {
        return res.status(404).json({ message: "No option contracts found" });
      }

      interface NormalizedOption {
        contract: string;
        expiration: string;
        strike: number;
        delta: number | null;
        openInterest: number;
        bid: number | null;
        ask: number | null;
        spread: number | null;
        optionPrice: number | null;
        dte: number | null;
      }

      const rows: NormalizedOption[] = [];
      for (const item of allSnapshots) {
        const details = item.details || {};
        const contract = (details.ticker || item.ticker || "").trim();
        const exp = (details.expiration_date || "").trim();
        const strike = parseFloat(details.strike_price);
        if (!contract || !exp || isNaN(strike)) continue;

        const greeks = item.greeks || {};
        const delta = greeks.delta != null ? parseFloat(greeks.delta) : null;
        const oi = parseInt(item.open_interest || "0") || 0;
        const lq = item.last_quote || {};
        const bid = lq.bid != null ? parseFloat(lq.bid) : null;
        const ask = lq.ask != null ? parseFloat(lq.ask) : null;
        const spread = (bid != null && ask != null && bid >= 0 && ask >= 0) ? ask - bid : null;

        let optionPrice: number | null = null;
        if (bid != null && ask != null && bid > 0 && ask > 0) optionPrice = (bid + ask) / 2;
        else if (ask != null && ask > 0) optionPrice = ask;
        else if (bid != null && bid > 0) optionPrice = bid;
        else {
          const lt = item.last_trade || {};
          const p = parseFloat(lt.price || lt.p || "0");
          if (p > 0) optionPrice = p;
        }

        const expDate = new Date(exp + "T00:00:00");
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const dte = Math.floor((expDate.getTime() - todayStart.getTime()) / 86400000);

        rows.push({ contract, expiration: exp, strike, delta, openInterest: oi, bid, ask, spread, optionPrice, dte });
      }

      if (rows.length === 0) {
        return res.status(404).json({ message: "No valid option data found" });
      }

      const px = underlyingPrice;
      const isCall = side === "call";

      function strikeInRange(strike: number, maxPct: number) {
        return Math.abs((strike - px) / px) <= maxPct;
      }
      function moneynessScore(strike: number, maxPct: number) {
        const m = (strike - px) / px;
        const target = isCall ? maxPct : -maxPct;
        return Math.abs(m - target) + (Math.abs(m) <= maxPct ? 0 : 0.5 + Math.abs(m));
      }

      interface FilterLevel {
        dteRange?: [number, number];
        dteRanges?: [number, number][];
        deltaRange: [number, number];
        strikePct?: number;
        minOi: number;
        maxSpread: number;
        targetDte?: number;
      }

      let levels: FilterLevel[];
      if (tradeType === "scalp") {
        levels = [
          { dteRange: [0, 0], deltaRange: [0.35, 0.60], minOi: 500, maxSpread: 0.10 },
          { dteRange: [0, 0], deltaRange: [0.25, 0.65], minOi: 300, maxSpread: 0.15 },
          { dteRange: [0, 1], deltaRange: [0.25, 0.65], minOi: 200, maxSpread: 0.15 },
          { dteRange: [0, 2], deltaRange: [0.20, 0.70], minOi: 100, maxSpread: 0.20 },
        ];
      } else if (tradeType === "swing") {
        levels = [
          { dteRanges: [[13, 25], [6, 15]], deltaRange: [0.40, 0.60], strikePct: 0.02, minOi: 1000, maxSpread: 0.05 },
          { dteRanges: [[13, 45], [6, 30]], deltaRange: [0.40, 0.60], strikePct: 0.02, minOi: 500, maxSpread: 0.10 },
          { dteRanges: [[6, 45]], deltaRange: [0.30, 0.70], strikePct: 0.03, minOi: 300, maxSpread: 0.15 },
          { dteRanges: [[6, 60]], deltaRange: [0.25, 0.75], strikePct: 0.05, minOi: 100, maxSpread: 0.20 },
        ];
      } else {
        levels = [
          { dteRange: [330, 395], deltaRange: [0.50, 0.80], strikePct: 0.02, minOi: 500, maxSpread: 0.05, targetDte: 365 },
          { dteRange: [270, 450], deltaRange: [0.40, 0.85], strikePct: 0.03, minOi: 300, maxSpread: 0.10, targetDte: 365 },
          { dteRange: [200, 500], deltaRange: [0.30, 0.90], strikePct: 0.05, minOi: 100, maxSpread: 0.15, targetDte: 365 },
        ];
      }

      for (const level of levels) {
        const dteRanges = level.dteRanges || (level.dteRange ? [level.dteRange] : [[0, 9999]]);
        const [dLo, dHi] = level.deltaRange;
        const spct = level.strikePct ?? 1;

        for (const [dteLo, dteHi] of dteRanges) {
          const candidates: NormalizedOption[] = [];
          for (const r of rows) {
            if (r.dte == null || r.dte < dteLo || r.dte > dteHi) continue;
            if (r.delta == null) continue;
            const absDelta = Math.abs(r.delta);
            if (absDelta < dLo || absDelta > dHi) continue;
            if (spct < 1 && !strikeInRange(r.strike, spct)) continue;
            if (r.openInterest < level.minOi) continue;
            if (r.spread == null || r.spread >= level.maxSpread) continue;
            candidates.push(r);
          }

          if (candidates.length > 0) {
            const targetDte = level.targetDte ?? (tradeType === "scalp" ? 0 : 20);
            candidates.sort((a, b) => {
              if (tradeType === "scalp") {
                const da = Math.abs(Math.abs(a.delta || 0) - 0.50);
                const db = Math.abs(Math.abs(b.delta || 0) - 0.50);
                if (da !== db) return da - db;
                return (a.dte || 9999) - (b.dte || 9999);
              }
              const dteDiffA = Math.abs((a.dte || 0) - targetDte);
              const dteDiffB = Math.abs((b.dte || 0) - targetDte);
              if (dteDiffA !== dteDiffB) return dteDiffA - dteDiffB;
              const ma = moneynessScore(a.strike, spct);
              const mb = moneynessScore(b.strike, spct);
              if (ma !== mb) return ma - mb;
              return (a.spread || 9e9) - (b.spread || 9e9);
            });

            const best = candidates[0];
            return res.json({
              contract: best.contract,
              expiration: best.expiration,
              strike: best.strike,
              optionPrice: best.optionPrice ? Math.round(best.optionPrice * 100) / 100 : null,
              delta: best.delta,
              openInterest: best.openInterest,
              spread: best.spread ? Math.round(best.spread * 100) / 100 : null,
              dte: best.dte,
            });
          }
        }
      }

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

  return httpServer;
}
