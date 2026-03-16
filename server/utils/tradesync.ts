const TRADESYNC_BASE_URL = process.env.TRADESYNC_BASE_URL || "https://3778bee5-d34e-4048-9502-5dd398f69e9e-00-38xggkppvlgnp.picard.replit.dev";
const TRADESYNC_API_KEY = process.env.TRADESYNC_API_KEY || "ts_9c148863865d1a03f557954b8e8f89726444e1eb6bfdb9e5";

/** Target / TP entry shape within targets map */
export interface SignalTargetEntry {
  price?: number;
  percentage?: number;
  take_off_percent?: number;
  raise_stop_loss?: { price?: number; percentage?: number };
}

export interface SignalData {
  ticker: string;
  instrument_type: string;
  direction: string;
  entry_price: number | null;
  /** Option/LETF Option: expiration date */
  expiration?: string;
  strike?: number;
  right?: string;
  /** LETF / LETF Option */
  underlying_ticker?: string | null;
  leverage?: number;
  leverage_direction?: string;
  targets?: Record<string, SignalTargetEntry>;
  stop_loss?: number;
  stop_loss_percentage?: number;
  time_stop?: string;
  auto_track?: boolean;
  underlying_price_based?: boolean;
  entry_underlying_price?: number | null;
  entry_letf_price?: number | null;
  entry_option_price?: number | null;
  discord_webhook_url?: string | null;
  /** Scalp / Swing / Leap — shown as Type in Position Management */
  trade_type?: string;
  /** Optional TradeSync signal identifier returned from ingest API */
  tradesync_id?: number;
}

export interface TradeSyncResult {
  ok: boolean;
  data?: any;
  error?: string;
}

// Shapes based on TradeSync /api/discord-templates/var-templates response
export interface TradeSyncTemplateField {
  name: string;
  value: string;
  inline?: boolean;
}

export interface TradeSyncTemplateInner {
  description: string;
  color: string;
  fields: TradeSyncTemplateField[];
  footer: string;
  timestamp?: boolean;
}

export interface TradeSyncTemplateItem {
  type: string;          // e.g. "signal_alert", "target_hit"
  label: string;         // human readable label
  content: string;       // message content, e.g. "@everyone"
  template: TradeSyncTemplateInner;
  sampleVars?: Record<string, string>;
  // preview / isCustom and other fields are ignored for now
}

export interface TradeSyncTemplateGroup {
  instrumentType: string;           // "Options", "Shares", "LETF", "LETF Option", "Crypto"
  ticker: string;
  templates: TradeSyncTemplateItem[];
}

export async function sendToTradeSync(signal: SignalData): Promise<TradeSyncResult> {
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

export async function fetchDiscordTemplatesFromTradeSync(): Promise<TradeSyncResult> {
  if (!TRADESYNC_API_KEY) {
    return { ok: false, error: "TradeSync API key not configured" };
  }

  try {
    const res = await fetch(`${TRADESYNC_BASE_URL}/api/discord-templates/var-templates`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${TRADESYNC_API_KEY}`,
      },
    });

    const body = await res.json().catch(() => null);

    if (!res.ok) {
      const msg = body?.message || `TradeSync API error (${res.status})`;
      return { ok: false, error: msg };
    }

    const groups: TradeSyncTemplateGroup[] = Array.isArray(body)
      ? body
      : Array.isArray(body?.data)
        ? body.data
        : [];

    let nextId = 1;
    const normalized = groups.flatMap((group) => {
      const instrumentType = group.instrumentType || "Options";
      return (group.templates || []).map((tpl) => {
        const tmpl = tpl.template;
        const sampleVars = tpl.sampleVars || {};

        const variables = Object.keys(sampleVars).map((name) => ({
          name,
          type: "string",
          label: name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        }));

        const fieldsTemplate = (tmpl.fields || []).map((f) => ({
          name: f.name,
          value: f.value,
        }));

        return {
          id: nextId++,
          name: tpl.label,
          slug: tpl.type,
          category: instrumentType,
          content: tpl.content || "",
          variables,
          // TradeSync templates only have description; we render it as descriptionTemplate
          titleTemplate: "",
          descriptionTemplate: tmpl.description || "",
          color: tmpl.color || "#22c55e",
          fieldsTemplate,
          footerTemplate: tmpl.footer || "",
          showTitleDefault: false,
          showDescriptionDefault: true,
          createdAt: new Date().toISOString(),
        };
      });
    });

    return { ok: true, data: normalized };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to reach TradeSync API" };
  }
}

export async function stopAutoTrack(tradeSyncSignalId: string | number): Promise<TradeSyncResult> {
  if (!TRADESYNC_API_KEY) {
    return { ok: false, error: "TradeSync API key not configured" };
  }
  const idSegment = encodeURIComponent(String(tradeSyncSignalId));
  try {
    const res = await fetch(`${TRADESYNC_BASE_URL}/api/signals/${idSegment}/stop-auto-track`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${TRADESYNC_API_KEY}`,
      },
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      const msg = body?.message || `TradeSync API error (${res.status})`;
      return { ok: false, error: msg };
    }
    return { ok: true, data: body };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Failed to reach TradeSync API" };
  }
}

export async function markTargetHit(tradeSyncSignalId: string | number): Promise<TradeSyncResult> {
  if (!TRADESYNC_API_KEY) {
    return { ok: false, error: "TradeSync API key not configured" };
  }
  const idSegment = encodeURIComponent(String(tradeSyncSignalId));
  try {
    const res = await fetch(`${TRADESYNC_BASE_URL}/api/signals/${idSegment}/target-hit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${TRADESYNC_API_KEY}`,
      },
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      const msg = body?.message || `TradeSync API error (${res.status})`;
      return { ok: false, error: msg };
    }
    return { ok: true, data: body };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Failed to reach TradeSync API" };
  }
}

export async function markStopLossHit(tradeSyncSignalId: string | number): Promise<TradeSyncResult> {
  if (!TRADESYNC_API_KEY) {
    return { ok: false, error: "TradeSync API key not configured" };
  }
  const idSegment = encodeURIComponent(String(tradeSyncSignalId));
  try {
    const res = await fetch(`${TRADESYNC_BASE_URL}/api/signals/${idSegment}/stop-loss-hit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${TRADESYNC_API_KEY}`,
      },
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      const msg = body?.message || `TradeSync API error (${res.status})`;
      return { ok: false, error: msg };
    }
    return { ok: true, data: body };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Failed to reach TradeSync API" };
  }
}

export function buildTradeSyncPayload(
  data: Record<string, string>,
  levels: Array<{ levelPct: number; takeOffPct: number; raiseStopLossTo: string; customRaiseSLValue: string }>,
  webhookUrl?: string,
): SignalData {
  const isOption = data.is_option === "true";
  const ticker = data.ticker || "";
  const entry = parseFloat(data.entry_price) || 0;
  const stockPrice = parseFloat(data.stock_price) || 0;
  const slPct = parseFloat(data.stop_loss_pct) || 10;
  const isUnderlyingBased = data.target_type === "Underlying Price Based";
  const tradeType = data.trade_type || "Scalp";

  const instrument_type = data.instrument_type || (isOption ? "Options" : "Shares");
  const direction = isOption
    ? (data.option_type === "PUT" ? "Put" : "Call")
    : (data.direction === "Short" ? "Short" : "Long");

  const timeStopDays = tradeType === "Scalp" ? 2 : tradeType === "Swing" ? 5 : 10;
  const timeStopDate = new Date();
  timeStopDate.setDate(timeStopDate.getDate() + timeStopDays);
  const time_stop = timeStopDate.toISOString().split("T")[0];

  const stopLossPrice = isUnderlyingBased
    ? parseFloat(data.stop_loss_pct) || 0
    : entry * (1 - slPct / 100);

  const targets: Record<string, SignalTargetEntry> = {};
  levels.forEach((l, i) => {
    const key = `tp${i + 1}`;
    let targetPrice: number;
    if (isUnderlyingBased) {
      targetPrice = l.levelPct;
    } else {
      targetPrice = entry * (1 + l.levelPct / 100);
    }

    const target: SignalTargetEntry = {
      price: parseFloat(targetPrice.toFixed(2)),
      percentage: l.levelPct,
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

  const payload: SignalData = {
    ticker,
    instrument_type,
    direction,
    entry_price: entry || null,
    stop_loss: parseFloat(stopLossPrice.toFixed(2)),
    stop_loss_percentage: slPct,
    time_stop,
    auto_track: data.trade_tracking === "Automatic",
    underlying_price_based: isUnderlyingBased,
    targets,
    trade_type: tradeType,
  };

  if (isOption) {
    payload.expiration = data.expiration;
    payload.strike = data.strike ? parseFloat(data.strike) : undefined;
    payload.right = data.option_type === "PUT" ? "P" : "C";
    payload.entry_option_price = data.option_price ? parseFloat(data.option_price) : null;
  }

  if (stockPrice > 0) {
    payload.entry_underlying_price = stockPrice;
  }

  if (data.underlying_ticker) {
    payload.underlying_ticker = data.underlying_ticker;
  }

  payload.discord_webhook_url = webhookUrl || null;

  return payload;
}
