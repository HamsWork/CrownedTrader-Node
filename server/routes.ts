import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertSignalTypeSchema, insertSignalSchema, insertDiscordChannelSchema } from "@shared/schema";
import { buildEmbed, sendToDiscord } from "./utils/discord";
import { isValidDiscordWebhookUrl } from "./utils/validation";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get("/api/signal-types", async (_req, res) => {
    const types = await storage.getSignalTypes();
    res.json(types);
  });

  app.get("/api/signal-types/:id", async (req, res) => {
    const st = await storage.getSignalType(Number(req.params.id));
    if (!st) return res.status(404).json({ message: "Signal type not found" });
    res.json(st);
  });

  app.post("/api/signal-types", async (req, res) => {
    const parsed = insertSignalTypeSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const st = await storage.createSignalType(parsed.data);
    res.status(201).json(st);
  });

  app.patch("/api/signal-types/:id", async (req, res) => {
    const partial = insertSignalTypeSchema.partial().safeParse(req.body);
    if (!partial.success) return res.status(400).json({ message: partial.error.message });
    const updated = await storage.updateSignalType(Number(req.params.id), partial.data);
    if (!updated) return res.status(404).json({ message: "Signal type not found" });
    res.json(updated);
  });

  app.delete("/api/signal-types/:id", async (req, res) => {
    const deleted = await storage.deleteSignalType(Number(req.params.id));
    if (!deleted) return res.status(404).json({ message: "Signal type not found" });
    res.status(204).send();
  });

  app.get("/api/signals", async (_req, res) => {
    const sigs = await storage.getSignals();
    res.json(sigs);
  });

  app.post("/api/signals", async (req, res) => {
    const parsed = insertSignalSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });

    const signalType = await storage.getSignalType(parsed.data.signalTypeId);
    if (!signalType) return res.status(400).json({ message: "Invalid signal type" });

    if (parsed.data.discordChannelId) {
      const channel = await storage.getDiscordChannel(parsed.data.discordChannelId);
      if (!channel) return res.status(400).json({ message: "Invalid discord channel" });
    }

    const signal = await storage.createSignal(parsed.data);

    if (signal.discordChannelId) {
      const channel = await storage.getDiscordChannel(signal.discordChannelId);
      if (channel) {
        const embed = buildEmbed(signalType, signal);
        const sent = await sendToDiscord(channel.webhookUrl, embed);
        await storage.updateSignalDiscordStatus(signal.id, sent);
        signal.sentToDiscord = sent;
      }
    }

    res.status(201).json(signal);
  });

  app.get("/api/discord-channels", async (_req, res) => {
    const channels = await storage.getDiscordChannels();
    res.json(channels);
  });

  app.post("/api/discord-channels", async (req, res) => {
    const parsed = insertDiscordChannelSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    if (!isValidDiscordWebhookUrl(parsed.data.webhookUrl)) {
      return res.status(400).json({ message: "Invalid Discord webhook URL. Must be a valid https://discord.com/api/webhooks/ URL." });
    }
    const ch = await storage.createDiscordChannel(parsed.data);
    res.status(201).json(ch);
  });

  app.patch("/api/discord-channels/:id", async (req, res) => {
    const partial = insertDiscordChannelSchema.partial().safeParse(req.body);
    if (!partial.success) return res.status(400).json({ message: partial.error.message });
    if (partial.data.webhookUrl && !isValidDiscordWebhookUrl(partial.data.webhookUrl)) {
      return res.status(400).json({ message: "Invalid Discord webhook URL." });
    }
    const updated = await storage.updateDiscordChannel(Number(req.params.id), partial.data);
    if (!updated) return res.status(404).json({ message: "Channel not found" });
    res.json(updated);
  });

  app.delete("/api/discord-channels/:id", async (req, res) => {
    const deleted = await storage.deleteDiscordChannel(Number(req.params.id));
    if (!deleted) return res.status(404).json({ message: "Channel not found" });
    res.status(204).send();
  });

  app.get("/api/stats", async (_req, res) => {
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
