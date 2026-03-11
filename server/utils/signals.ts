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
    const data = signal.data as Record<string, string>;
    const levelsRaw = data.take_profit_levels ? JSON.parse(data.take_profit_levels) : [];

    let webhookUrl: string | undefined;
    if (signal.discordChannelName) {
      const userChannels = currentUser.discordChannels || [];
      const ch = userChannels.find(c => c.name === signal.discordChannelName);
      if (ch?.webhookUrl) webhookUrl = ch.webhookUrl;
    }

    const tsPayload = buildTradeSyncPayload(data, levelsRaw, webhookUrl);
    const tsResult = await sendToTradeSync(tsPayload);
    if (!tsResult.ok) {
      tradeSyncError = tsResult.error;
    }
  } catch (err: any) {
    tradeSyncError = err?.message || "TradeSync integration error";
  }

  return { signal, tradeSyncError };
}
