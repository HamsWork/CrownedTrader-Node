const TRADESYNC_BASE_URL = "https://3778bee5-d34e-4048-9502-5dd398f69e9e-00-38xggkppvlgnp.picard.replit.dev";
const TRADESYNC_API_KEY = process.env.TRADESYNC_API_KEY || "";

export interface TradeSyncSignal {
  ticker: string;
  instrumentType: "Options" | "Shares" | "LETF" | "LETF Option" | "Crypto";
  direction: "Call" | "Put" | "Long" | "Short";
  expiration?: string;
  strike?: string;
  entryPrice?: string;
  stop_loss?: number;
  auto_track?: boolean;
  underlying_price_based?: boolean;
  time_stop?: string;
  discord_channel_webhook?: string;
  targets?: Record<string, {
    price: number;
    take_off_percent: number;
    raise_stop_loss?: { price: number };
  }>;
}

export interface TradeSyncResult {
  ok: boolean;
  data?: any;
  error?: string;
}

export async function sendToTradeSync(signal: TradeSyncSignal): Promise<TradeSyncResult> {
  if (!TRADESYNC_API_KEY) {
    return { ok: false, error: "TradeSync API key not configured" };
  }

  try {
    const res = await fetch(`${TRADESYNC_BASE_URL}/api/ingest/signals`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${TRADESYNC_API_KEY}`,
      },
      body: JSON.stringify(signal),
    });

    const body = await res.json().catch(() => null);

    if (!res.ok) {
      const msg = body?.message || `TradeSync API error (${res.status})`;
      return { ok: false, error: msg };
    }

    return { ok: true, data: body };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to reach TradeSync API" };
  }
}

export function buildTradeSyncPayload(
  data: Record<string, string>,
  levels: Array<{ levelPct: number; takeOffPct: number; raiseStopLossTo: string; customRaiseSLValue: string }>,
  webhookUrl?: string,
): TradeSyncSignal {
  const isOption = data.is_option === "true";
  const isShares = !isOption;
  const ticker = data.ticker || "";
  const entry = parseFloat(data.entry_price) || 0;
  const stockPrice = parseFloat(data.stock_price) || 0;
  const slPct = parseFloat(data.stop_loss_pct) || 10;
  const isUnderlyingBased = data.target_type === "Underlying Price Based";
  const tradeType = data.trade_type || "Scalp";

  const category = data.instrument_type || (isOption ? "Options" : "Shares");
  const instrumentType = category as TradeSyncSignal["instrumentType"];

  let direction: TradeSyncSignal["direction"];
  if (isOption) {
    direction = (data.option_type === "PUT" ? "Put" : "Call");
  } else {
    direction = (data.direction === "Short" ? "Short" : "Long");
  }

  const timeStopDays = tradeType === "Scalp" ? 2 : tradeType === "Swing" ? 5 : 10;
  const timeStopDate = new Date();
  timeStopDate.setDate(timeStopDate.getDate() + timeStopDays);
  const timeStop = timeStopDate.toISOString().split("T")[0];

  const stopLossPrice = isUnderlyingBased
    ? parseFloat(data.stop_loss_pct) || 0
    : entry * (1 - slPct / 100);

  const targets: TradeSyncSignal["targets"] = {};
  levels.forEach((l, i) => {
    const key = `tp${i + 1}`;
    let targetPrice: number;
    if (isUnderlyingBased) {
      targetPrice = l.levelPct;
    } else {
      targetPrice = entry * (1 + l.levelPct / 100);
    }

    const target: any = {
      price: parseFloat(targetPrice.toFixed(2)),
      take_off_percent: l.takeOffPct,
    };

    if (l.raiseStopLossTo === "Break even") {
      target.raise_stop_loss = { price: entry };
    } else if (l.raiseStopLossTo === "Custom" && l.customRaiseSLValue) {
      const raiseTo = isUnderlyingBased
        ? parseFloat(l.customRaiseSLValue)
        : entry * (1 + parseFloat(l.customRaiseSLValue) / 100);
      target.raise_stop_loss = { price: parseFloat(raiseTo.toFixed(2)) };
    }

    targets[key] = target;
  });

  const payload: TradeSyncSignal = {
    ticker,
    instrumentType,
    direction,
    entryPrice: entry.toFixed(2),
    stop_loss: parseFloat(stopLossPrice.toFixed(2)),
    auto_track: data.trade_tracking === "Automatic",
    underlying_price_based: isUnderlyingBased,
    time_stop: timeStop,
    targets,
  };

  if (isOption) {
    payload.expiration = data.expiration;
    payload.strike = data.strike;
  }

  if (webhookUrl) {
    payload.discord_channel_webhook = webhookUrl;
  }

  return payload;
}
