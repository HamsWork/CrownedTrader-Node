/**
 * Polygon.io API client – ticker search, details, stock/option prices, best option.
 * All functions require a valid POLYGON_API_KEY (caller should check env and return 500 if missing).
 */

export function getApiKey(): string | undefined {
  return process.env.POLYGON_API_KEY;
}

// --- Ticker search ---

export interface TickerSearchResult {
  ticker: string;
  name: string;
  market: string;
  type: string;
}

export async function searchTickers(apiKey: string, query: string): Promise<TickerSearchResult[]> {
  const searchParam = encodeURIComponent(query);
  const cryptoTickerSearch = encodeURIComponent(`X:${query.toUpperCase()}`);
  const [stocksRes, cryptoRes, cryptoTickerRes] = await Promise.all([
    fetch(`https://api.polygon.io/v3/reference/tickers?search=${searchParam}&market=stocks&active=true&limit=7&apiKey=${apiKey}`),
    fetch(`https://api.polygon.io/v3/reference/tickers?search=${searchParam}&market=crypto&active=true&limit=3&apiKey=${apiKey}`),
    fetch(`https://api.polygon.io/v3/reference/tickers?ticker.gte=${cryptoTickerSearch}&ticker.lt=${encodeURIComponent(`X:${query.toUpperCase()}Z`)}&market=crypto&active=true&limit=3&apiKey=${apiKey}`),
  ]);
  const mapResults = (data: { results?: Array<{ market?: string; ticker: string; name: string; type: string }> }) =>
    (data.results || []).map((t) => ({
      ticker: t.market === "crypto" ? t.ticker.replace(/^X:/, "") : t.ticker,
      name: t.name,
      market: t.market || "",
      type: t.type || "",
    }));
  const stocks = stocksRes.ok ? mapResults(await stocksRes.json()) : [];
  const crypto = cryptoRes.ok ? mapResults(await cryptoRes.json()) : [];
  const cryptoByTicker = cryptoTickerRes.ok ? mapResults(await cryptoTickerRes.json()) : [];
  const seenTickers = new Set<string>();
  const allCrypto = [...cryptoByTicker, ...crypto].filter((t) => {
    if (seenTickers.has(t.ticker)) return false;
    seenTickers.add(t.ticker);
    return true;
  });
  const all = [...stocks, ...allCrypto];
  const q = query.toUpperCase();
  all.sort((a, b) => {
    const aExact = a.ticker.toUpperCase() === q ? 0 : 1;
    const bExact = b.ticker.toUpperCase() === q ? 0 : 1;
    if (aExact !== bExact) return aExact - bExact;
    const aStarts = a.ticker.toUpperCase().startsWith(q) ? 0 : 1;
    const bStarts = b.ticker.toUpperCase().startsWith(q) ? 0 : 1;
    if (aStarts !== bStarts) return aStarts - bStarts;
    return a.ticker.length - b.ticker.length;
  });
  return all;
}

// --- Ticker details ---

const LETF_UNDERLYING_MAP: Record<string, string> = {
  TQQQ: "QQQ", SQQQ: "QQQ", QLD: "QQQ", QID: "QQQ", PSQ: "QQQ",
  SPXL: "SPY", SPXS: "SPY", UPRO: "SPY", SDS: "SPY", SSO: "SPY", SH: "SPY", SPXU: "SPY",
  TNA: "IWM", TZA: "IWM", URTY: "IWM", SRTY: "IWM",
  SOXL: "SOXX", SOXS: "SOXX",
  FAS: "XLF", FAZ: "XLF",
  LABU: "XBI", LABD: "XBI",
  NUGT: "GDX", DUST: "GDX",
  TECL: "XLK", TECS: "XLK",
  CURE: "XLV",
  DRN: "IYR", DRV: "IYR",
  NAIL: "ITB",
  WEBL: "ARKK", WEBS: "ARKK",
  BULZ: "FNGU", BERZ: "FNGU",
  UDOW: "DIA", SDOW: "DIA",
  MIDU: "MDY", SMDD: "MDY",
  JNUG: "GDXJ", JDST: "GDXJ",
  ERX: "XLE", ERY: "XLE",
  FNGU: "NYFANG",
  UCO: "USO", SCO: "USO",
  AGQ: "SLV", ZSL: "SLV",
  UGL: "GLD",
};

export interface TickerDetails {
  ticker: string;
  name: string;
  market: string;
  type: string;
  category: string;
  leverage: string;
  underlying: string;
  description: string;
}

export async function getTickerDetails(
  apiKey: string,
  ticker: string,
  marketHint: string = ""
): Promise<TickerDetails | null> {
  const upper = ticker.toUpperCase();
  const isCrypto = marketHint === "crypto" || upper.endsWith("USD") || upper.endsWith("USDT");
  const polygonTicker = isCrypto && !upper.startsWith("X:") ? `X:${upper}` : upper;
  const url = `https://api.polygon.io/v3/reference/tickers/${encodeURIComponent(polygonTicker)}?apiKey=${apiKey}`;
  const response = await fetch(url);
  if (!response.ok) return null;
  const data = (await response.json()) as { results?: Record<string, unknown> };
  const r = data.results || {};

  const name = (r.name as string) || "";
  const market = (r.market as string) || "";
  const tickerType = (r.type as string) || "";
  const description = (r.description as string) || "";
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
    const isLeveraged = leverageWords.some((w) => nameLower.includes(w) || descLower.includes(w)) || leverageMatch;

    if (isLeveraged) {
      category = "LETF";
      if (leverageMatch) leverage = leverageMatch[1] + "x";
      else if (nameLower.includes("ultra") && !nameLower.includes("ultrashort")) leverage = "2x";
      else if (nameLower.includes("ultrashort")) leverage = "-2x";

      underlying = LETF_UNDERLYING_MAP[upper] || "";
      if (!underlying) {
        const trackingMatch = descLower.match(/(?:tracks?|based on|seeks.*(?:results|return).*of)\s+(?:the\s+)?([A-Za-z0-9&\s]+?)(?:\s+index|\s+price|\.|,)/i);
        if (trackingMatch) underlying = trackingMatch[1].trim();
      }
    } else {
      category = "ETF";
    }
  }

  return {
    ticker: (r.ticker as string) || upper,
    name,
    market,
    type: tickerType,
    category,
    leverage,
    underlying,
    description: description.slice(0, 200),
  };
}

// --- Stock / crypto price ---

export interface StockPriceResult {
  price: number;
  source: string;
}

export async function getStockPrice(
  apiKey: string,
  ticker: string,
  marketHint: string = ""
): Promise<StockPriceResult | null> {
  const upper = ticker.toUpperCase();
  const isCrypto = marketHint === "crypto" || upper.startsWith("X:") || upper.endsWith("USD") || upper.endsWith("USDT");
  const polygonTicker = isCrypto && !upper.startsWith("X:") ? `X:${upper}` : upper;

  let price: number | null = null;
  let source = "";

  const nbboRes = await fetch(`https://api.polygon.io/v2/last/nbbo/${encodeURIComponent(polygonTicker)}?apiKey=${apiKey}`);
  if (nbboRes.ok) {
    const nbboData = (await nbboRes.json()) as { status?: string; results?: { p?: string; P?: string } };
    if (nbboData.status === "OK" && nbboData.results) {
      const bid = parseFloat(nbboData.results.p || "0");
      const ask = parseFloat(nbboData.results.P || "0");
      if (bid > 0 && ask > 0) {
        price = (bid + ask) / 2;
        source = "nbbo_mid";
      } else if (ask > 0) {
        price = ask;
        source = "nbbo_ask";
      } else if (bid > 0) {
        price = bid;
        source = "nbbo_bid";
      }
    }
  }

  if (!price && !isCrypto) {
    const snapRes = await fetch(`https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers/${encodeURIComponent(upper)}?apiKey=${apiKey}`);
    if (snapRes.ok) {
      const snapData = (await snapRes.json()) as { ticker?: { lastTrade?: { p?: string }; day?: { c?: string }; prevDay?: { c?: string } } };
      const t = snapData.ticker || {};
      const lastTrade = t.lastTrade || {};
      const day = t.day || {};
      const prevDay = t.prevDay || {};
      const p = parseFloat((lastTrade as { p?: string }).p || (day as { c?: string }).c || (prevDay as { c?: string }).c || "0");
      if (p > 0) {
        price = p;
        source = "snapshot";
      }
    }
  }

  if (!price) {
    const prevRes = await fetch(`https://api.polygon.io/v2/aggs/ticker/${encodeURIComponent(isCrypto ? polygonTicker : upper)}/prev?apiKey=${apiKey}`);
    if (prevRes.ok) {
      const prevData = (await prevRes.json()) as { status?: string; results?: Array<{ c?: string }> };
      if (prevData.status === "OK" && prevData.results?.length) {
        const c = parseFloat(prevData.results[0].c || "0");
        if (c > 0) {
          price = c;
          source = "previous_close";
        }
      }
    }
  }

  if (price == null) return null;
  return { price: Math.round(price * 100) / 100, source };
}

// --- Option quote (single contract) ---

export interface OptionQuoteResult {
  contract: string;
  price: number;
  bid: number | null;
  ask: number | null;
  delta: number | null;
  openInterest: number;
}

export async function getOptionQuote(
  apiKey: string,
  underlying: string,
  expiration: string,
  strike: number,
  optionType: string
): Promise<OptionQuoteResult | null> {
  const expClean = expiration.replace(/-/g, "");
  const side = optionType.toUpperCase() === "PUT" ? "P" : "C";
  const strikePadded = (strike * 1000).toFixed(0).padStart(8, "0");
  const contractTicker = `O:${underlying}${expClean}${side}${strikePadded}`;

  const url = `https://api.polygon.io/v3/snapshot/options/${encodeURIComponent(underlying)}/${encodeURIComponent(contractTicker)}?apiKey=${apiKey}`;
  const snapRes = await fetch(url);
  if (!snapRes.ok) return null;

  const snapData = (await snapRes.json()) as { status?: string; results?: Record<string, unknown> };
  if (snapData.status !== "OK" || !snapData.results) return null;

  const results = snapData.results;
  const lq = (results.last_quote || results.lastQuote || {}) as { bid?: number | string; ask?: number | string; bid_price?: string; ask_price?: string };
  const bid = parseFloat(String(lq.bid ?? lq.bid_price ?? "0")) || 0;
  const ask = parseFloat(String(lq.ask ?? lq.ask_price ?? "0")) || 0;
  let price: number | null = null;
  if (bid > 0 && ask > 0) price = (bid + ask) / 2;
  else if (ask > 0) price = ask;
  else if (bid > 0) price = bid;

  if (!price) {
    const lt = (results.last_trade || results.lastTrade || {}) as { price?: string; p?: string };
    const p = parseFloat(lt.price || lt.p || "0");
    if (p > 0) price = p;
  }
  if (!price) return null;

  const greeks = (results.greeks || {}) as { delta?: number | string };
  return {
    contract: contractTicker,
    price: Math.round(price * 100) / 100,
    bid: bid > 0 ? bid : null,
    ask: ask > 0 ? ask : null,
    delta: greeks.delta != null ? parseFloat(String(greeks.delta)) : null,
    openInterest: parseInt(String(results.open_interest || "0"), 10) || 0,
  };
}

// --- Best option ---

export type BestOptionSide = "call" | "put";
export type BestOptionTradeType = "scalp" | "swing" | "leap";

export interface BestOptionResult {
  contract: string;
  expiration: string;
  strike: number;
  optionPrice: number | null;
  delta: number | null;
  openInterest: number;
  spread: number | null;
  dte: number | null;
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

export async function getBestOption(
  apiKey: string,
  underlying: string,
  side: BestOptionSide,
  tradeType: BestOptionTradeType,
  underlyingPrice: number
): Promise<BestOptionResult | null> {
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const isCall = side === "call";
  const px = underlyingPrice;

  let expGte: string;
  let expLte: string;
  let strikeRange: number;

  if (tradeType === "scalp") {
    expGte = today.toISOString().slice(0, 10);
    const end = new Date(today);
    end.setDate(end.getDate() + 14);
    expLte = end.toISOString().slice(0, 10);
    strikeRange = 0.05;
  } else if (tradeType === "swing") {
    const start = new Date(today);
    start.setDate(start.getDate() + 6);
    expGte = start.toISOString().slice(0, 10);
    const end = new Date(today);
    end.setDate(end.getDate() + 60);
    expLte = end.toISOString().slice(0, 10);
    strikeRange = 0.05;
  } else {
    const start = new Date(today);
    start.setDate(start.getDate() + 270);
    expGte = start.toISOString().slice(0, 10);
    const end = new Date(today);
    end.setDate(end.getDate() + 450);
    expLte = end.toISOString().slice(0, 10);
    strikeRange = 0.05;
  }

  const strikeGte = px * (1 - strikeRange);
  const strikeLte = px * (1 + strikeRange);

  const params = new URLSearchParams({
    contract_type: side,
    "expiration_date.gte": expGte,
    "expiration_date.lte": expLte,
    "strike_price.gte": strikeGte.toFixed(2),
    "strike_price.lte": strikeLte.toFixed(2),
    limit: "250",
    apiKey,
  });

  const allSnapshots: Array<Record<string, unknown>> = [];
  let url: string | null = `https://api.polygon.io/v3/snapshot/options/${encodeURIComponent(underlying)}?${params}`;
  let pages = 0;

  while (url && pages < 5) {
    pages++;
    const snapRes = await fetch(url);
    if (!snapRes.ok) break;
    const snapData = (await snapRes.json()) as { results?: Array<Record<string, unknown>>; next_url?: string };
    const results = snapData.results || [];
    allSnapshots.push(...results);
    url = snapData.next_url ? `${snapData.next_url}&apiKey=${apiKey}` : null;
  }

  if (allSnapshots.length === 0) return null;

  const rows: NormalizedOption[] = [];
  for (const item of allSnapshots) {
    const details = (item.details || {}) as { ticker?: string; expiration_date?: string; strike_price?: string };
    const contract = (details.ticker || (item.ticker as string) || "").trim();
    const exp = (details.expiration_date || "").trim();
    const strike = parseFloat(details.strike_price || "");
    if (!contract || !exp || isNaN(strike)) continue;

    const greeks = (item.greeks || {}) as { delta?: number | string };
    const delta = greeks.delta != null ? parseFloat(String(greeks.delta)) : null;
    const oi = parseInt(String(item.open_interest || "0"), 10) || 0;
    const lq = (item.last_quote || {}) as { bid?: number; ask?: number };
    const bid = lq.bid != null ? parseFloat(String(lq.bid)) : null;
    const ask = lq.ask != null ? parseFloat(String(lq.ask)) : null;
    const spread = bid != null && ask != null && bid >= 0 && ask >= 0 ? ask - bid : null;

    let optionPrice: number | null = null;
    if (bid != null && ask != null && bid > 0 && ask > 0) optionPrice = (bid + ask) / 2;
    else if (ask != null && ask > 0) optionPrice = ask;
    else if (bid != null && bid > 0) optionPrice = bid;
    else {
      const lt = (item.last_trade || {}) as { price?: string; p?: string };
      const p = parseFloat(lt.price || lt.p || "0");
      if (p > 0) optionPrice = p;
    }

    const expDate = new Date(exp + "T00:00:00");
    const dte = Math.floor((expDate.getTime() - todayStart.getTime()) / 86400000);

    rows.push({ contract, expiration: exp, strike, delta, openInterest: oi, bid, ask, spread, optionPrice, dte });
  }

  if (rows.length === 0) return null;

  function otmScore(strike: number): number {
    if (isCall) return (strike - px) / px;
    return (px - strike) / px;
  }

  function strikeInRange(strike: number, pct: number) {
    return Math.abs((strike - px) / px) <= pct;
  }

  if (tradeType === "scalp") {
    const scalpLevels: { deltaRange: [number, number]; minOi: number; maxSpread: number }[] = [
      { deltaRange: [0.35, 0.60], minOi: 500, maxSpread: 0.10 },
      { deltaRange: [0.25, 0.65], minOi: 300, maxSpread: 0.15 },
      { deltaRange: [0.20, 0.70], minOi: 100, maxSpread: 0.20 },
    ];

    for (const level of scalpLevels) {
      for (let targetDte = 0; targetDte <= 14; targetDte++) {
        const candidates = rows.filter(r => {
          if (r.dte == null || r.dte !== targetDte) return false;
          if (r.delta == null) return false;
          const absDelta = Math.abs(r.delta);
          if (absDelta < level.deltaRange[0] || absDelta > level.deltaRange[1]) return false;
          if (r.openInterest < level.minOi) return false;
          if (r.spread == null || r.spread >= level.maxSpread) return false;
          return true;
        });

        if (candidates.length > 0) {
          candidates.sort((a, b) => {
            const da = Math.abs(Math.abs(a.delta || 0) - 0.50);
            const db = Math.abs(Math.abs(b.delta || 0) - 0.50);
            if (da !== db) return da - db;
            return (b.openInterest - a.openInterest);
          });
          return formatResult(candidates[0]);
        }
      }
    }
  } else if (tradeType === "swing") {
    const swingLevels: { dteRanges: [number, number][]; deltaRange: [number, number]; strikePct: number; minOi: number; maxSpread: number }[] = [
      { dteRanges: [[13, 25], [6, 15]], deltaRange: [0.40, 0.60], strikePct: 0.02, minOi: 1000, maxSpread: 0.05 },
      { dteRanges: [[6, 45]], deltaRange: [0.40, 0.60], strikePct: 0.02, minOi: 1000, maxSpread: 0.05 },
      { dteRanges: [[6, 45]], deltaRange: [0.35, 0.65], strikePct: 0.03, minOi: 500, maxSpread: 0.10 },
      { dteRanges: [[6, 60]], deltaRange: [0.30, 0.70], strikePct: 0.05, minOi: 200, maxSpread: 0.15 },
    ];

    for (const level of swingLevels) {
      for (const [dteLo, dteHi] of level.dteRanges) {
        const candidates = rows.filter(r => {
          if (r.dte == null || r.dte < dteLo || r.dte > dteHi) return false;
          if (r.delta == null) return false;
          const absDelta = Math.abs(r.delta);
          if (absDelta < level.deltaRange[0] || absDelta > level.deltaRange[1]) return false;
          if (!strikeInRange(r.strike, level.strikePct)) return false;
          if (r.openInterest < level.minOi) return false;
          if (r.spread == null || r.spread >= level.maxSpread) return false;
          return true;
        });
        if (candidates.length > 0) {
          candidates.sort((a, b) => {
            const otmA = otmScore(a.strike);
            const otmB = otmScore(b.strike);
            const preferA = otmA >= 0 && otmA <= 0.02 ? 0 : 1;
            const preferB = otmB >= 0 && otmB <= 0.02 ? 0 : 1;
            if (preferA !== preferB) return preferA - preferB;
            const da = Math.abs(Math.abs(a.delta || 0) - 0.50);
            const db = Math.abs(Math.abs(b.delta || 0) - 0.50);
            if (da !== db) return da - db;
            return (b.openInterest - a.openInterest);
          });
          return formatResult(candidates[0]);
        }
      }
    }
  } else {
    const leapLevels: { dteRange: [number, number]; deltaRange: [number, number]; strikePct: number; minOi: number; maxSpread: number; targetDte: number }[] = [
      { dteRange: [330, 395], deltaRange: [0.50, 0.80], strikePct: 0.02, minOi: 500, maxSpread: 0.05, targetDte: 365 },
      { dteRange: [300, 420], deltaRange: [0.45, 0.85], strikePct: 0.03, minOi: 300, maxSpread: 0.10, targetDte: 365 },
      { dteRange: [270, 450], deltaRange: [0.40, 0.90], strikePct: 0.05, minOi: 100, maxSpread: 0.15, targetDte: 365 },
    ];

    for (const level of leapLevels) {
      const candidates = rows.filter(r => {
        if (r.dte == null || r.dte < level.dteRange[0] || r.dte > level.dteRange[1]) return false;
        if (r.delta == null) return false;
        const absDelta = Math.abs(r.delta);
        if (absDelta < level.deltaRange[0] || absDelta > level.deltaRange[1]) return false;
        if (!strikeInRange(r.strike, level.strikePct)) return false;
        if (r.openInterest < level.minOi) return false;
        if (r.spread == null || r.spread >= level.maxSpread) return false;
        return true;
      });

      if (candidates.length > 0) {
        candidates.sort((a, b) => {
          const dteDiffA = Math.abs((a.dte ?? 0) - level.targetDte);
          const dteDiffB = Math.abs((b.dte ?? 0) - level.targetDte);
          if (dteDiffA !== dteDiffB) return dteDiffA - dteDiffB;
          const otmA = otmScore(a.strike);
          const otmB = otmScore(b.strike);
          const preferA = otmA >= 0 && otmA <= 0.02 ? 0 : 1;
          const preferB = otmB >= 0 && otmB <= 0.02 ? 0 : 1;
          if (preferA !== preferB) return preferA - preferB;
          const da = Math.abs(Math.abs(a.delta || 0) - 0.65);
          const db = Math.abs(Math.abs(b.delta || 0) - 0.65);
          if (da !== db) return da - db;
          return (b.openInterest - a.openInterest);
        });
        return formatResult(candidates[0]);
      }
    }
  }

  return null;
}

function formatResult(best: NormalizedOption): BestOptionResult {
  return {
    contract: best.contract,
    expiration: best.expiration,
    strike: best.strike,
    optionPrice: best.optionPrice != null ? Math.round(best.optionPrice * 100) / 100 : null,
    delta: best.delta,
    openInterest: best.openInterest,
    spread: best.spread != null ? Math.round(best.spread * 100) / 100 : null,
    dte: best.dte,
  };
}
