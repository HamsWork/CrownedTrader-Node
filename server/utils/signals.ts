import { storage } from "../storage";
import type { Signal, User, UserDiscordChannel } from "@shared/schema";
import { buildTradeSyncPayload, sendToTradeSync } from "./tradesync";

interface ProcessSignalOptions {
  signal: Signal;
  currentUser: User & { discordChannels?: UserDiscordChannel[] };
  chartFile?: { path: string; originalname?: string } | null;
}

interface ProcessSignalResult {
  signal: Signal;
  tradeSyncError?: string;
}

export async function processSignalDelivery(
  options: ProcessSignalOptions
): Promise<ProcessSignalResult> {
  const { signal: initialSignal, currentUser } = options;

  const signal = await storage.getSignal(initialSignal.id) ?? initialSignal;
  let tradeSyncError: string | undefined;

  try {
    const data = signal.data as any as Record<string, string>;
    const levelsRaw = data.take_profit_levels ? JSON.parse(data.take_profit_levels) : [];

    let webhookUrl: string | undefined;
    if (signal.discordChannelName) {
      const userChannels = currentUser.discordChannels || [];
      const channelNameLower = signal.discordChannelName.trim().toLowerCase();
      const ch = userChannels.find(c => (c.name || "").trim().toLowerCase() === channelNameLower);
      if (ch?.webhookUrl) webhookUrl = ch.webhookUrl;
    }
    if (!webhookUrl && data.discord_webhook_url) {
      webhookUrl = data.discord_webhook_url;
    }

    const tsPayload = buildTradeSyncPayload(data, levelsRaw, webhookUrl);
    console.log("TradeSync payload", JSON.stringify(tsPayload));
    const tsResult = await sendToTradeSync(tsPayload);
    console.log("TradeSync result", JSON.stringify(tsResult));
    if (!tsResult.ok) {
      tradeSyncError = tsResult.error;
    } else {
      // Persist the TradeSync payload as the canonical signal data (SignalData shape),
      // enriched with the TradeSync signal id when available.
      let tradesyncId: string | number | undefined;
      const resultData: any = tsResult.data;
      if (resultData?.signal?.id != null) {
        const raw = resultData.signal.id;
        tradesyncId = typeof raw === "string" || typeof raw === "number" ? raw : undefined;
      }

      const enriched: any = { ...tsPayload };
      if (tradesyncId !== undefined && tradesyncId !== null) {
        enriched.tradesync_id = tradesyncId;
      }
      // Position Management reads data.trade_tracking ("Automatic" | "Manual updates") for the badge
      if (typeof enriched.auto_track === "boolean") {
        enriched.trade_tracking = enriched.auto_track ? "Automatic" : "Manual updates";
      }

      await storage.updateSignalData(signal.id, enriched);
      signal.data = enriched;
    }
  } catch (err: any) {
    tradeSyncError = err?.message || "TradeSync integration error";
  }

  return { signal, tradeSyncError };
}
