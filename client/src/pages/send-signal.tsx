import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useCreateSignal, useTradePlans } from "@/hooks/use-signals";
import { useAuth } from "@/hooks/use-auth";
import { queryClient } from "@/lib/queryClient";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Send, Settings, Rocket, Info, Search, ChevronDown, ChevronUp, Plus, ClipboardList, Upload, X, ImageIcon, Video, FileText, AlertCircle } from "lucide-react";
import type { TradePlan, TakeProfitLevel, SignalType } from "@shared/schema";
import { DiscordEmbedPreview } from "@/components/discord-send-modal/discord-embed-preview";
import { buildPreviewEmbed } from "@/components/discord-templates/template-utils";
import {
  TakeProfitLevelForm,
  TARGET_TYPES,
  DEFAULT_LEVELS_SYMBOL,
  DEFAULT_LEVELS_UNDERLYING,
  computePrice,
} from "@/components/take-profit-level-form";

const TRADE_TYPES = ["Scalp", "Swing", "Leap"];
const TRADE_TRACKING = ["Manual updates", "Automatic"];
const OPTION_TYPES = ["CALL", "PUT"];
const DIRECTIONS = ["Long", "Short"];

function getDefaultExpiration() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

interface TickerResult {
  ticker: string;
  name: string;
  market: string;
  type: string;
}

interface TickerDetails {
  ticker: string;
  name: string;
  category: string;
  leverage: string;
  underlying: string;
}

const CATEGORY_BADGES: Record<string, { label: string; color: string }> = {
  Stock: { label: "Stock", color: "bg-amber-500/20 text-amber-400" },
  ETF: { label: "ETF", color: "bg-cyan-500/20 text-cyan-400" },
  LETF: { label: "LETF", color: "bg-orange-500/20 text-orange-400" },
  Crypto: { label: "Crypto", color: "bg-purple-500/20 text-purple-400" },
};

function TickerAutocomplete({
  value,
  onChange,
  tickerDetails,
  onTickerDetails,
  onStockPrice,
}: {
  value: string;
  onChange: (ticker: string) => void;
  tickerDetails: TickerDetails | null;
  onTickerDetails: (details: TickerDetails | null) => void;
  onStockPrice: (price: number | null) => void;
}) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<TickerResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const latestTickerRef = useRef<string>("");

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const searchTickers = useCallback(async (q: string) => {
    if (q.length < 1) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`/api/ticker-search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data);
        setIsOpen(data.length > 0);
      }
    } catch {
    } finally {
      setIsLoading(false);
    }
  }, []);

  async function fetchDetails(ticker: string, market?: string) {
    latestTickerRef.current = ticker;
    const marketParam = market ? `?market=${encodeURIComponent(market)}` : "";
    try {
      const [detailsRes, priceRes] = await Promise.all([
        fetch(`/api/ticker-details/${encodeURIComponent(ticker)}${marketParam}`),
        fetch(`/api/stock-price/${encodeURIComponent(ticker)}${marketParam}`),
      ]);
      if (latestTickerRef.current !== ticker) return;
      if (detailsRes.ok) {
        const data = await detailsRes.json();
        onTickerDetails(data);
      }
      if (priceRes.ok) {
        const data = await priceRes.json();
        onStockPrice(data.price);
      } else {
        onStockPrice(null);
      }
    } catch {
      if (latestTickerRef.current === ticker) onStockPrice(null);
    }
  }

  function stripCryptoPrefix(t: string) {
    return t.replace(/^X:/, "");
  }

  function handleInputChange(val: string) {
    const upper = stripCryptoPrefix(val.toUpperCase());
    setQuery(upper);
    onChange(upper);
    onTickerDetails(null);
    onStockPrice(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchTickers(upper), 300);
  }

  function selectTicker(ticker: string, market?: string) {
    const clean = stripCryptoPrefix(ticker);
    setQuery(clean);
    onChange(clean);
    setIsOpen(false);
    setResults([]);
    fetchDetails(clean, market);
  }

  const badge = tickerDetails ? CATEGORY_BADGES[tickerDetails.category] : null;

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search ticker (e.g., AAPL, TQQQ, BTCUSD)"
          value={query}
          onChange={e => handleInputChange(e.target.value)}
          onFocus={() => { if (results.length > 0) setIsOpen(true); }}
          className="pl-9"
          data-testid="input-ticker"
        />
      </div>
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-lg max-h-60 overflow-y-auto">
          {isLoading ? (
            <div className="p-3 text-sm text-muted-foreground text-center">Searching...</div>
          ) : (
            results.map((r) => {
              const displayTicker = stripCryptoPrefix(r.ticker);
              return (
                <button
                  key={r.ticker}
                  type="button"
                  className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-accent cursor-pointer transition-colors"
                  onClick={() => selectTicker(r.ticker, r.market)}
                  data-testid={`ticker-option-${displayTicker}`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-semibold shrink-0">{displayTicker}</span>
                    <span className="text-muted-foreground truncate text-xs">{r.name}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground uppercase shrink-0 ml-2">{r.market}</span>
                </button>
              );
            })
          )}
        </div>
      )}
      {tickerDetails && badge && (
        <div className="mt-2 flex items-center gap-2 flex-wrap" data-testid="ticker-details-hint">
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.color}`}>
            {badge.label}
          </span>
          <span className="text-xs text-muted-foreground">{tickerDetails.name}</span>
          {tickerDetails.category === "LETF" && (
            <span className="text-xs text-muted-foreground">
              {tickerDetails.leverage && `• ${tickerDetails.leverage} leverage`}
              {tickerDetails.underlying && ` • Underlying: ${tickerDetails.underlying}`}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

interface TradeForm {
  channel: string;
  tradeType: string;
  tradeTracking: string;
  ticker: string;
  isOption: boolean;
  direction: string;
  manualContract: boolean;
  optionType: string;
  expiration: string;
  strike: string;
  optionPrice: string;
  stockPrice: string;
  entryPrice: string;
  tradePlanId: string;
  customTargetType: string;
  customStopLossPct: string;
  customLevels: TakeProfitLevel[];
  showChartAnalysis: boolean;
  timeHorizon: string;
}

function getTemplateCategory(tickerDetails: TickerDetails | null, isOption: boolean): string {
  const cat = tickerDetails?.category || "Stock";
  if (cat === "Crypto") return "Crypto";
  if (cat === "LETF") return isOption ? "LETF Option" : "LETF";
  return isOption ? "Options" : "Shares";
}

function buildTradePlanText(form: TradeForm, tickerDetails: TickerDetails | null): string {
  const entry = parseFloat(form.isOption ? form.optionPrice : form.stockPrice) || 0;
  const isUnderlyingBased = form.customTargetType === "Underlying Price Based";
  const levels = form.customLevels;
  const slPct = parseFloat(form.customStopLossPct) || 10;
  const stopLossPrice = isUnderlyingBased
    ? parseFloat(form.customStopLossPct || "0")
    : entry * (1 - slPct / 100);
  const timeStopDays = form.tradeType === "Scalp" ? 2 : form.tradeType === "Swing" ? 5 : 10;

  const targetParts = isUnderlyingBased
    ? levels.map(l => {
        const pct = entry > 0 ? (((l.levelPct - entry) / entry) * 100).toFixed(1) : "0.0";
        return `$${l.levelPct.toFixed(2)} (${pct}%)`;
      })
    : levels.map(l => {
        const price = (entry * (1 + l.levelPct / 100)).toFixed(2);
        return `$${price} (${l.levelPct.toFixed(1)}%)`;
      });

  const lines = [
    `🎯 Targets: ${targetParts.join(", ")}`,
    `🛑 Stop loss: $${stopLossPrice.toFixed(2)}`,
    `🌐 Time Stop: ${timeStopDays} days`,
  ];
  if (form.timeHorizon) {
    lines.push(`📅 Time Horizon: ${form.timeHorizon}`);
  }
  return lines.join("\n");
}

function buildTakeProfitPlanText(form: TradeForm): string {
  const entry = parseFloat(form.isOption ? form.optionPrice : form.stockPrice) || 0;
  const isUnderlyingBased = form.customTargetType === "Underlying Price Based";
  const levels = form.customLevels;

  return levels.map((l, i) => {
    const pricePart = isUnderlyingBased
      ? `$${l.levelPct.toFixed(2)} (+${entry > 0 ? (((l.levelPct - entry) / entry) * 100).toFixed(1) : "0.0"}%)`
      : `+${l.levelPct.toFixed(1)}%`;
    let line = `Take Profit (${i + 1}): At ${pricePart} take off ${l.takeOffPct}% of ${i === 0 ? "position" : "remaining position"}`;
    if (l.raiseStopLossTo !== "Off") {
      line += ` and raise stop loss to ${l.raiseStopLossTo === "Break even" ? "break even" : (isUnderlyingBased ? `$${l.customRaiseSLValue}` : `${l.customRaiseSLValue}%`)}`;
    }
    if (l.trailingStop === "On") {
      line += ` with ${l.trailingStopPct}% trailing stop`;
    }
    return line + ".";
  }).join("\n");
}

function buildTemplateVars(form: TradeForm, tickerDetails: TickerDetails | null): Record<string, string> {
  const entry = parseFloat(form.isOption ? form.optionPrice : form.stockPrice) || 0;
  const stockPrice = parseFloat(form.stockPrice) || 0;
  const ticker = form.ticker || "TICKER";
  const hasPlan = !!form.tradePlanId;

  const isUnderlyingBased = form.customTargetType === "Underlying Price Based";
  const slPct = parseFloat(form.customStopLossPct) || 10;
  const stopLossPrice = isUnderlyingBased
    ? parseFloat(form.customStopLossPct || "0")
    : entry * (1 - slPct / 100);
  const timeStopDays = form.tradeType === "Scalp" ? 2 : form.tradeType === "Swing" ? 5 : 10;

  const vars: Record<string, string> = {
    app_name: "Crowned Trader",
    ticker,
    stock_price: `$${stockPrice.toFixed(2)}`,
    direction: form.isOption ? (form.optionType === "CALL" ? "Call" : "Put") : form.direction,
    entry_price: `$${entry.toFixed(2)}`,
    stop_loss: `$${stopLossPrice.toFixed(2)}`,
    time_stop: `${timeStopDays} days`,
    trade_plan: hasPlan ? buildTradePlanText(form, tickerDetails) : "No trade plan selected",
    take_profit_plan: hasPlan ? buildTakeProfitPlanText(form) : "—",
  };

  if (form.isOption) {
    vars.expiration = form.expiration || "—";
    vars.strike = form.strike || "—";
    vars.option_price = `$${entry.toFixed(2)}`;
  }

  const cat = tickerDetails?.category;
  if (cat === "Crypto") {
    vars.coin = ticker;
    vars.pair = "USDT";
    vars.entry_price = `$${entry.toFixed(2)}`;
  }

  if (cat === "LETF") {
    vars.underlying = tickerDetails?.underlying || ticker;
    vars.leverage = tickerDetails?.leverage || "3";
    vars.letf_ticker = ticker;
    vars.letf_direction = "Bull";
    vars.letf_entry = `$${entry.toFixed(2)}`;
  }

  return vars;
}

function LivePreview({ form, chartPreviewUrl, chartMediaType, tickerDetails }: { form: TradeForm; chartPreviewUrl: string | null; chartMediaType: "image" | "video" | null; tickerDetails: TickerDetails | null }) {
  const { data: signalTypes = [], isLoading: isLoadingTemplates } = useQuery<SignalType[]>({
    queryKey: ["/api/signal-types"],
  });

  const templateCategory = getTemplateCategory(tickerDetails, form.isOption);

  const entryTemplate = useMemo(() => {
    return signalTypes.find(
      (t) => t.slug === "signal_alert" && t.category === templateCategory
    ) || null;
  }, [signalTypes, templateCategory]);

  const templateVars = useMemo(
    () => buildTemplateVars(form, tickerDetails),
    [form, tickerDetails]
  );

  const embed = useMemo(() => {
    if (!entryTemplate) return null;
    return buildPreviewEmbed(
      {
        color: entryTemplate.color,
        titleTemplate: entryTemplate.titleTemplate,
        descriptionTemplate: entryTemplate.descriptionTemplate,
        fieldsTemplate: (entryTemplate.fieldsTemplate || []) as Array<{ name: string; value: string; inline?: boolean }>,
        footerTemplate: entryTemplate.footerTemplate,
        showTitleDefault: entryTemplate.showTitleDefault,
        showDescriptionDefault: entryTemplate.showDescriptionDefault,
      },
      templateVars
    );
  }, [entryTemplate, templateVars]);

  return (
    <Card className="sticky top-20" data-testid="card-live-preview">
      <CardContent className="pt-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-500/20">
            <span className="text-sm">🔮</span>
          </div>
          <h2 className="font-bold text-lg" data-testid="text-preview-title">Live Preview</h2>
        </div>

        {isLoadingTemplates ? (
          <div className="rounded-lg bg-[#313338] p-6 text-center" data-testid="preview-loading">
            <p className="text-sm text-[#949ba4]">Loading template preview...</p>
          </div>
        ) : !entryTemplate ? (
          <div className="rounded-lg bg-[#313338] p-6 text-center" data-testid="preview-missing">
            <AlertCircle className="h-5 w-5 text-amber-500 mx-auto mb-2" />
            <p className="text-sm text-[#949ba4]">No entry template found for {templateCategory}</p>
          </div>
        ) : embed ? (
          <div className="space-y-0">
            <DiscordEmbedPreview
              embed={embed}
              content={entryTemplate.content || "@everyone"}
            />

            {form.showChartAnalysis && chartPreviewUrl && (
              <div className="bg-[#313338] px-4 pb-4 -mt-0 rounded-b-md">
                {chartMediaType === "image" && (
                  <div className="rounded-lg overflow-hidden border border-[#2a2d35] bg-black/25">
                    <img src={chartPreviewUrl} alt="Chart" className="w-full max-h-[200px] object-contain" data-testid="preview-chart-image" />
                  </div>
                )}
                {chartMediaType === "video" && (
                  <div className="rounded-lg overflow-hidden border border-[#2a2d35] bg-black/25">
                    <video src={chartPreviewUrl} controls className="w-full max-h-[200px]" data-testid="preview-chart-video" />
                  </div>
                )}
              </div>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default function SendSignal() {
  const { data: currentUser } = useAuth();
  const createSignal = useCreateSignal();
  const { toast } = useToast();
  const { data: tradePlans = [] } = useTradePlans();

  const userChannels = currentUser?.discordChannels || [];
  const [tickerDetails, setTickerDetails] = useState<TickerDetails | null>(null);
  const [underlyingPrice, setUnderlyingPrice] = useState<number | null>(null);
  const [tradePlanOpen, setTradePlanOpen] = useState(false);

  const [form, setForm] = useState<TradeForm>({
    channel: userChannels.length > 0 ? userChannels[0].name : "",
    tradeType: "Scalp",
    tradeTracking: "Manual updates",
    ticker: "",
    isOption: true,
    direction: "Long",
    manualContract: false,
    optionType: "CALL",
    expiration: getDefaultExpiration(),
    strike: "",
    optionPrice: "",
    stockPrice: "",
    entryPrice: "",
    tradePlanId: "",
    customTargetType: "Symbol Price Based",
    customStopLossPct: "10.00",
    customLevels: [...DEFAULT_LEVELS_SYMBOL],
    showChartAnalysis: false,
    timeHorizon: "",
  });

  const formRef = useRef(form);
  formRef.current = form;

  const [lastPriceUpdate, setLastPriceUpdate] = useState<Date | null>(null);
  const [lastOptionPriceUpdate, setLastOptionPriceUpdate] = useState<Date | null>(null);
  const [bestOptionError, setBestOptionError] = useState<string | null>(null);
  const [isFetchingOption, setIsFetchingOption] = useState(false);
  const [isFetchingManualQuote, setIsFetchingManualQuote] = useState(false);
  const [manualQuoteError, setManualQuoteError] = useState<string | null>(null);
  const manualQuoteAbortRef = useRef<AbortController | null>(null);
  const manualQuoteReqIdRef = useRef(0);

  const [isSendingMultipart, setIsSendingMultipart] = useState(false);
  const [chartFile, setChartFile] = useState<File | null>(null);
  const [chartPreviewUrl, setChartPreviewUrl] = useState<string | null>(null);
  const [chartMediaType, setChartMediaType] = useState<"image" | "video" | null>(null);
  const [chartDragging, setChartDragging] = useState(false);
  const chartFileRef = useRef<HTMLInputElement>(null);

  const handleChartFile = useCallback((file: File) => {
    if (file.type.startsWith("image/")) {
      setChartMediaType("image");
    } else if (file.type.startsWith("video/")) {
      setChartMediaType("video");
    } else {
      toast({ title: "Unsupported file type. Please upload an image or video.", variant: "destructive" });
      return;
    }
    setChartFile(file);
    setChartPreviewUrl(URL.createObjectURL(file));
  }, [toast]);

  const clearChart = useCallback(() => {
    if (chartPreviewUrl) URL.revokeObjectURL(chartPreviewUrl);
    setChartFile(null);
    setChartPreviewUrl(null);
    setChartMediaType(null);
    if (chartFileRef.current) chartFileRef.current.value = "";
  }, [chartPreviewUrl]);

  useEffect(() => {
    if (tickerDetails?.category === "LETF" && tickerDetails.underlying) {
      fetch(`/api/stock-price/${encodeURIComponent(tickerDetails.underlying)}`)
        .then(r => r.ok ? r.json() : null)
        .then(d => setUnderlyingPrice(d?.price ?? null))
        .catch(() => setUnderlyingPrice(null));
    } else {
      setUnderlyingPrice(null);
    }
    if (tickerDetails?.category === "Crypto") {
      setForm(prev => ({ ...prev, isOption: false }));
    }
  }, [tickerDetails]);

  const pricePollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (pricePollingRef.current) {
      clearInterval(pricePollingRef.current);
      pricePollingRef.current = null;
    }

    const ticker = form.ticker?.trim();
    if (!ticker) return;

    const market = tickerDetails?.category === "Crypto" ? "crypto" : undefined;

    const pollPrices = async () => {
      try {
        const marketParam = market ? `?market=${encodeURIComponent(market)}` : "";
        const res = await fetch(`/api/stock-price/${encodeURIComponent(ticker)}${marketParam}`, { signal: abortController.signal });
        if (res.ok) {
          const data = await res.json();
          if (data.price) {
            setForm(prev => ({ ...prev, stockPrice: data.price.toString() }));
            setLastPriceUpdate(new Date());
          }
        }
        if (tickerDetails?.category === "LETF" && tickerDetails.underlying) {
          const ulRes = await fetch(`/api/stock-price/${encodeURIComponent(tickerDetails.underlying)}`, { signal: abortController.signal });
          if (ulRes.ok) {
            const ulData = await ulRes.json();
            setUnderlyingPrice(ulData?.price ?? null);
          }
        }
      } catch {}
    };

    const pollOptionPrice = async () => {
      try {
        const currentForm = formRef.current;
        if (!currentForm.isOption) return;
        const exp = currentForm.expiration?.trim();
        const strikeVal = parseFloat(currentForm.strike);
        if (!exp || isNaN(strikeVal) || strikeVal <= 0) return;
        const params = new URLSearchParams({
          underlying: ticker,
          expiration: exp,
          strike: strikeVal.toString(),
          optionType: currentForm.optionType,
        });
        const res = await fetch(`/api/option-quote?${params}`, { signal: abortController.signal });
        if (res.ok) {
          const data = await res.json();
          if (data.price) {
            setForm(prev => ({ ...prev, optionPrice: data.price.toString() }));
            setLastOptionPriceUpdate(new Date());
          }
        }
      } catch {}
    };

    const abortController = new AbortController();

    const safePoll = async () => {
      if (abortController.signal.aborted) return;
      await pollPrices();
      await pollOptionPrice();
    };

    pricePollingRef.current = setInterval(safePoll, 1000);

    return () => {
      abortController.abort();
      if (pricePollingRef.current) {
        clearInterval(pricePollingRef.current);
        pricePollingRef.current = null;
      }
    };
  }, [form.ticker, tickerDetails?.category, tickerDetails?.underlying]);

  useEffect(() => {
    if (userChannels.length > 0 && !form.channel) {
      setForm(prev => ({ ...prev, channel: userChannels[0].name }));
    }
  }, [userChannels]);

  useEffect(() => {
    if (tradePlans.length > 0 && !form.tradePlanId) {
      const defaultPlan = tradePlans.find(p => p.isDefault) || tradePlans[0];
      setForm(prev => ({
        ...prev,
        tradePlanId: defaultPlan.id.toString(),
        customTargetType: defaultPlan.targetType,
        customStopLossPct: parseFloat(defaultPlan.stopLossPct).toFixed(2),
        customLevels: defaultPlan.takeProfitLevels?.length
          ? defaultPlan.takeProfitLevels.map(l => ({ ...l }))
          : (defaultPlan.targetType === "Underlying Price Based" ? [...DEFAULT_LEVELS_UNDERLYING] : [...DEFAULT_LEVELS_SYMBOL]),
      }));
    } else if (tradePlans.length === 0 && !form.tradePlanId) {
      setForm(prev => ({
        ...prev,
        tradePlanId: "live-custom",
        customTargetType: "Symbol Price Based",
        customStopLossPct: "10.00",
        customLevels: [...DEFAULT_LEVELS_SYMBOL],
      }));
    }
  }, [tradePlans]);

  const bestOptionAbortRef = useRef<AbortController | null>(null);
  const bestOptionReqIdRef = useRef(0);
  const bestOptionSelectedRef = useRef(false);

  const fetchBestOption = useCallback(async (ticker: string, stockPx: string, optionType: string, tradeType: string) => {
    const price = parseFloat(stockPx);
    if (!ticker || !price || price <= 0) return;

    if (bestOptionAbortRef.current) bestOptionAbortRef.current.abort();
    const controller = new AbortController();
    bestOptionAbortRef.current = controller;
    const reqId = ++bestOptionReqIdRef.current;

    setIsFetchingOption(true);
    setBestOptionError(null);
    try {
      const params = new URLSearchParams({
        underlying: ticker,
        side: optionType.toLowerCase(),
        tradeType: tradeType.toLowerCase(),
        underlyingPrice: price.toString(),
      });
      const res = await fetch(`/api/best-option?${params}`, { signal: controller.signal });
      if (reqId !== bestOptionReqIdRef.current) return;
      if (res.ok) {
        const data = await res.json();
        setForm(prev => ({
          ...prev,
          expiration: data.expiration || prev.expiration,
          strike: data.strike?.toString() || prev.strike,
          optionPrice: data.optionPrice?.toString() || prev.optionPrice,
        }));
        if (data.optionPrice) setLastOptionPriceUpdate(new Date());
        setBestOptionError(null);
      } else {
        setForm(prev => ({
          ...prev,
          expiration: getDefaultExpiration(),
          strike: "",
          optionPrice: "",
        }));
        setLastOptionPriceUpdate(null);
        setBestOptionError(`No ${tradeType.toLowerCase()} option found matching criteria. Switch to Manual to enter contract details.`);
      }
    } catch (e: any) {
      if (e.name !== "AbortError") {
        console.error("Best option fetch failed:", e);
        setBestOptionError("Failed to fetch option data. Try again or switch to Manual.");
      }
    } finally {
      if (reqId === bestOptionReqIdRef.current) {
        setIsFetchingOption(false);
      }
    }
  }, []);

  useEffect(() => {
    bestOptionSelectedRef.current = false;
  }, [form.ticker, form.optionType, form.tradeType, form.isOption, form.manualContract]);

  useEffect(() => {
    if (form.isOption && !form.manualContract && form.ticker && parseFloat(form.stockPrice) > 0) {
      if (!bestOptionSelectedRef.current) {
        bestOptionSelectedRef.current = true;
        fetchBestOption(form.ticker, form.stockPrice, form.optionType, form.tradeType);
      }
    } else {
      if (bestOptionAbortRef.current) bestOptionAbortRef.current.abort();
      bestOptionReqIdRef.current++;
      setIsFetchingOption(false);
    }
  }, [form.isOption, form.manualContract, form.ticker, form.stockPrice, form.optionType, form.tradeType]);

  useEffect(() => {
    const today = new Date();
    if (form.tradeType === "Scalp") {
      setForm(prev => ({ ...prev, timeHorizon: "" }));
    } else if (form.tradeType === "Swing") {
      const oneMonth = new Date(today);
      oneMonth.setMonth(oneMonth.getMonth() + 1);
      setForm(prev => ({ ...prev, timeHorizon: oneMonth.toISOString().split("T")[0] }));
    } else if (form.tradeType === "Leap") {
      const oneYear = new Date(today);
      oneYear.setFullYear(oneYear.getFullYear() + 1);
      setForm(prev => ({ ...prev, timeHorizon: oneYear.toISOString().split("T")[0] }));
    }
  }, [form.tradeType]);


  useEffect(() => {
    if (!form.isOption || !form.manualContract) {
      setManualQuoteError(null);
      return;
    }

    const ticker = form.ticker?.trim().toUpperCase();
    const expiration = form.expiration?.trim();
    const strike = parseFloat(form.strike);
    if (!ticker || !expiration || isNaN(strike) || strike <= 0) {
      setManualQuoteError(null);
      return;
    }

    if (manualQuoteAbortRef.current) manualQuoteAbortRef.current.abort();
    const controller = new AbortController();
    manualQuoteAbortRef.current = controller;
    const reqId = ++manualQuoteReqIdRef.current;

    setIsFetchingManualQuote(true);
    setManualQuoteError(null);

    const params = new URLSearchParams({
      underlying: ticker,
      expiration,
      strike: strike.toString(),
      optionType: form.optionType,
    });

    fetch(`/api/option-quote?${params}`, { signal: controller.signal })
      .then(async (res) => {
        if (reqId !== manualQuoteReqIdRef.current) return;
        if (res.ok) {
          const data = await res.json();
          setForm(prev => ({ ...prev, optionPrice: data.price?.toString() || "" }));
          setManualQuoteError(null);
        } else {
          setForm(prev => ({ ...prev, optionPrice: "" }));
          setManualQuoteError("Contract not found");
        }
      })
      .catch((e: any) => {
        if (e.name !== "AbortError" && reqId === manualQuoteReqIdRef.current) {
          setForm(prev => ({ ...prev, optionPrice: "" }));
          setManualQuoteError("Failed to fetch option price");
        }
      })
      .finally(() => {
        if (reqId === manualQuoteReqIdRef.current) {
          setIsFetchingManualQuote(false);
        }
      });
  }, [form.isOption, form.manualContract, form.ticker, form.expiration, form.strike, form.optionType]);

  useEffect(() => {
    if (!form.isOption && form.stockPrice && !form.entryPrice) {
      setForm(prev => ({ ...prev, entryPrice: prev.stockPrice }));
    }
  }, [form.isOption, form.stockPrice]);

  function update<K extends keyof TradeForm>(key: K, value: TradeForm[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    if (!form.ticker.trim()) {
      toast({ title: "Ticker is required", variant: "destructive" });
      return;
    }

    const entry = parseFloat(form.isOption ? form.optionPrice : form.stockPrice) || 0;
    if (entry <= 0) {
      toast({ title: form.isOption ? "Option price is required" : "Stock price is required", variant: "destructive" });
      return;
    }

    if (!form.tradePlanId) {
      toast({ title: "Please select a Trade Plan", variant: "destructive" });
      return;
    }

    const levels = form.customLevels;
    const slPct = parseFloat(form.customStopLossPct) || 10;
    const isUnderlyingBased = form.customTargetType === "Underlying Price Based";

    const signalData: Record<string, string> = {
      ticker: form.ticker,
      trade_type: form.tradeType,
      trade_tracking: form.tradeTracking,
      is_option: form.isOption ? "true" : "false",
      stock_price: form.stockPrice || "0",
      entry_price: entry.toString(),
      trade_plan_id: form.tradePlanId,
      stop_loss_pct: slPct.toString(),
      target_type: isUnderlyingBased ? "Underlying Price Based" : "Symbol Price Based",
      take_profit_levels: JSON.stringify(levels),
      ...(form.timeHorizon ? { time_horizon: form.timeHorizon } : {}),
      instrument_type: tickerDetails?.category === "LETF"
        ? (form.isOption ? "LETF Option" : "LETF")
        : tickerDetails?.category === "Crypto"
          ? "Crypto"
          : (form.isOption ? "Options" : "Shares"),
    };

    levels.forEach((l, i) => {
      if (isUnderlyingBased) {
        signalData[`tp${i + 1}_pct`] = l.levelPct.toString();
        signalData[`tp${i + 1}_target`] = l.levelPct.toFixed(2);
      } else {
        const price = (entry * (1 + l.levelPct / 100)).toFixed(2);
        signalData[`tp${i + 1}_pct`] = l.levelPct.toString();
        signalData[`tp${i + 1}_target`] = price;
      }
    });

    if (form.isOption) {
      signalData.option_type = form.optionType;
      signalData.expiration = form.expiration;
      signalData.strike = form.strike;
      signalData.option_price = form.optionPrice;
    } else {
      signalData.direction = form.direction;
    }


    try {
      let responseData: any;
      if (form.showChartAnalysis && chartFile) {
        setIsSendingMultipart(true);
        const formData = new FormData();
        formData.append("data", JSON.stringify(signalData));
        formData.append("discordChannelName", form.channel || "");
        formData.append("chartMedia", chartFile);

        const res = await fetch("/api/signals", {
          method: "POST",
          body: formData,
          credentials: "include",
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ message: "Failed to send signal" }));
          throw new Error(err.message || "Failed to send signal");
        }
        responseData = await res.json().catch(() => ({}));
        queryClient.invalidateQueries({ queryKey: ["/api/signals"] });
        queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      } else {
        responseData = await createSignal.mutateAsync({
          data: signalData,
          discordChannelName: form.channel || null,
        });
      }

      const errors: string[] = [];
      if (responseData?.discordErrors?.length > 0) {
        errors.push("Discord: " + responseData.discordErrors.join("; "));
      }
      if (responseData?.tradeSyncError) {
        errors.push("TradeSync: " + responseData.tradeSyncError);
      }

      if (errors.length > 0) {
        toast({
          title: "Signal saved, but some deliveries failed",
          description: errors.join("\n"),
          variant: "destructive",
        });
      } else {
        toast({ title: "Signal sent!", description: "Your trade alert has been published." });
      }
      clearChart();
      setForm(prev => ({
        ...prev,
        ticker: "",
        strike: "",
        optionPrice: "",
        stockPrice: "",
        entryPrice: "",
        showChartAnalysis: false,
      }));
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to send signal", variant: "destructive" });
    } finally {
      setIsSendingMultipart(false);
    }
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_520px] gap-4 sm:gap-6 items-start">
        <div className="space-y-6">
          <Card data-testid="card-signal-config">
            <CardContent className="pt-5">
              <div className="flex items-center gap-2 mb-5">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/20">
                  <Settings className="h-4 w-4 text-amber-400" />
                </div>
                <h2 className="font-bold text-lg">Signal Configuration</h2>
              </div>

              <div className="space-y-5">
                <div className="space-y-2">
                  <Label className="font-semibold text-sm">Destination Channel</Label>
                  {userChannels.length === 0 ? (
                    <Alert variant="destructive" data-testid="alert-no-discord-channel">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>No Discord channel permissions</AlertTitle>
                      <AlertDescription>
                        You don&apos;t have access to any Discord channel. Contact your admin to add a Discord channel for your account.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Select value={form.channel} onValueChange={v => update("channel", v)}>
                      <SelectTrigger data-testid="select-channel">
                        <SelectValue placeholder="Select a channel" />
                      </SelectTrigger>
                      <SelectContent>
                        {userChannels.map((ch, i) => (
                          <SelectItem key={i} value={ch.name} data-testid={`option-channel-${i}`}>
                            {ch.name} {i === 0 ? "(Default)" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="font-semibold text-sm">Trade Type</Label>
                  <Select value={form.tradeType} onValueChange={v => update("tradeType", v)}>
                    <SelectTrigger data-testid="select-trade-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TRADE_TYPES.map(t => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="font-semibold text-sm">Trade Tracking</Label>
                  <Select value={form.tradeTracking} onValueChange={v => update("tradeTracking", v)}>
                    <SelectTrigger data-testid="select-trade-tracking">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TRADE_TRACKING.map(t => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    If you choose Automatic, you can switch to Manual at any time in Position Management.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-trade-details">
            <CardContent className="pt-5">
              <div className="flex items-center gap-2 mb-5">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-purple-500/20">
                  <Rocket className="h-4 w-4 text-purple-400" />
                </div>
                <h2 className="font-bold text-lg">Trade Details</h2>
              </div>

              <div className="space-y-5">
                <div className="space-y-2">
                  <Label className="font-semibold text-sm">
                    Ticker <span className="text-destructive">*</span>
                  </Label>
                  <TickerAutocomplete
                    value={form.ticker}
                    onChange={(ticker) => update("ticker", ticker)}
                    tickerDetails={tickerDetails}
                    onTickerDetails={setTickerDetails}
                    onStockPrice={(price) => {
                      setForm(prev => ({
                        ...prev,
                        stockPrice: price ? price.toString() : "",
                      }));
                      setLastPriceUpdate(price ? new Date() : null);
                    }}
                  />
                </div>

                {tickerDetails?.category !== "Crypto" && (
                  <div className="flex items-center justify-between py-2">
                    <Label className="font-semibold text-sm cursor-pointer" htmlFor="is-option">
                      Is Option
                    </Label>
                    <Switch
                      id="is-option"
                      checked={form.isOption}
                      onCheckedChange={v => update("isOption", v)}
                      data-testid="switch-is-option"
                    />
                  </div>
                )}

                {form.stockPrice ? (
                  <div className="rounded-md bg-muted/50 border border-border px-3 py-2 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground font-medium">{tickerDetails?.category === "LETF" ? `${form.ticker} (LETF) Price:` : tickerDetails?.category === "Crypto" ? "Crypto Price:" : "Stock Price:"}</span>
                        <span className="text-sm font-semibold text-green-400" data-testid="text-stock-price">${parseFloat(form.stockPrice).toFixed(2)}</span>
                      </div>
                      {lastPriceUpdate && (
                        <span className="text-[10px] text-muted-foreground tabular-nums" data-testid="text-price-updated">
                          Live · {lastPriceUpdate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        </span>
                      )}
                    </div>
                    {tickerDetails?.category === "LETF" && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground font-medium">{tickerDetails.underlying || "Underlying"} Price:</span>
                        {underlyingPrice !== null ? (
                          <span className="text-sm font-semibold text-amber-400" data-testid="text-underlying-price">${underlyingPrice.toFixed(2)}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground animate-pulse">Loading...</span>
                        )}
                      </div>
                    )}
                  </div>
                ) : null}

                {form.isOption ? (
                  <div className="space-y-5 rounded-lg border border-border p-4">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-sm">Option contract</span>
                      {isFetchingOption && (
                        <span className="text-xs text-muted-foreground animate-pulse" data-testid="text-fetching-option">Finding best option...</span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <Switch
                        checked={form.manualContract}
                        onCheckedChange={v => update("manualContract", v)}
                        data-testid="switch-manual-contract"
                      />
                      <span className="text-sm text-muted-foreground">
                        Manual option contract (enter Expiration and Strike manually)
                      </span>
                    </div>

                    <div className="space-y-2">
                      <Label className="font-semibold text-sm">Option Type</Label>
                      <Select value={form.optionType} onValueChange={v => update("optionType", v)}>
                        <SelectTrigger data-testid="select-option-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {OPTION_TYPES.map(t => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="font-semibold text-sm">Expiration</Label>
                        <Input
                          type="date"
                          value={form.expiration}
                          onChange={e => update("expiration", e.target.value)}
                          disabled={!form.manualContract}
                          data-testid="input-expiration"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="font-semibold text-sm">Strike</Label>
                        <Input
                          placeholder="Strike price"
                          value={form.strike}
                          onChange={e => update("strike", e.target.value)}
                          disabled={!form.manualContract}
                          data-testid="input-strike"
                        />
                      </div>
                    </div>

                    <div className="rounded-md bg-muted/50 border border-border px-3 py-2 min-h-[20px]">
                      {(isFetchingManualQuote || isFetchingOption) ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground font-medium">Option Price:</span>
                          <span className="text-xs text-muted-foreground animate-pulse" data-testid="text-option-price-loading">
                            {form.manualContract ? "Looking up contract..." : "Finding best option..."}
                          </span>
                        </div>
                      ) : manualQuoteError && form.manualContract ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground font-medium">Option Price:</span>
                          <span className="text-xs text-orange-400" data-testid="text-option-price-error">{manualQuoteError}</span>
                        </div>
                      ) : bestOptionError && !form.manualContract ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground font-medium">Option Price:</span>
                            <span className="text-xs text-muted-foreground">—</span>
                          </div>
                          <p className="text-xs text-orange-400" data-testid="text-best-option-error">{bestOptionError}</p>
                        </div>
                      ) : form.optionPrice ? (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground font-medium">Option Price:</span>
                            <span className="text-sm font-semibold text-amber-400" data-testid="text-option-price">${parseFloat(form.optionPrice).toFixed(2)}</span>
                          </div>
                          {lastOptionPriceUpdate && (
                            <span className="text-[10px] text-muted-foreground tabular-nums" data-testid="text-option-price-updated">
                              Live · {lastOptionPriceUpdate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground font-medium">Option Price:</span>
                          <span className="text-xs text-muted-foreground">—</span>
                        </div>
                      )}
                    </div>

                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label className="font-semibold text-sm">Direction</Label>
                    <Select value={form.direction} onValueChange={v => update("direction", v)}>
                      <SelectTrigger data-testid="select-direction">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DIRECTIONS.map(d => (
                          <SelectItem key={d} value={d}>{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="rounded-lg border border-border p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-amber-400" />
                    <span className="font-semibold text-sm">Trade Plan</span>
                  </div>

                  <div className="space-y-2">
                    <Label className="font-semibold text-sm">Select Trade Plan</Label>
                    <Select value={form.tradePlanId} onValueChange={v => {
                      if (v === "live-custom") {
                        setForm(prev => ({
                          ...prev,
                          tradePlanId: v,
                          customTargetType: "Symbol Price Based",
                          customStopLossPct: "10.00",
                          customLevels: [...DEFAULT_LEVELS_SYMBOL],
                        }));
                        setTradePlanOpen(true);
                      } else {
                        const plan = tradePlans.find(p => p.id.toString() === v);
                        if (plan) {
                          setForm(prev => ({
                            ...prev,
                            tradePlanId: v,
                            customTargetType: plan.targetType,
                            customStopLossPct: parseFloat(plan.stopLossPct).toFixed(2),
                            customLevels: plan.takeProfitLevels?.length
                              ? plan.takeProfitLevels.map(l => ({ ...l }))
                              : (plan.targetType === "Underlying Price Based" ? [...DEFAULT_LEVELS_UNDERLYING] : [...DEFAULT_LEVELS_SYMBOL]),
                          }));
                        } else {
                          update("tradePlanId", v);
                        }
                        setTradePlanOpen(false);
                      }
                    }}>
                      <SelectTrigger data-testid="select-trade-plan">
                        <SelectValue placeholder="Select a trade plan" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="live-custom" data-testid="option-trade-plan-live-custom">
                          <span className="flex items-center gap-2">
                            <span className="inline-block h-2 w-2 rounded-full bg-orange-400" />
                            Live Custom
                          </span>
                        </SelectItem>
                        {tradePlans.length > 0 && (
                          <SelectSeparator />
                        )}
                        {tradePlans.map(plan => (
                          <SelectItem key={plan.id} value={plan.id.toString()} data-testid={`option-trade-plan-${plan.id}`}>
                            <span className="flex items-center gap-2">
                              <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
                              {plan.name} {plan.isDefault ? "(Default)" : ""}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {tradePlans.length === 0 && form.tradePlanId !== "live-custom" && (
                      <p className="text-xs text-muted-foreground">No trade plans found. Create one on the Trade Plans page or use Live Custom.</p>
                    )}
                  </div>

                  {form.tradePlanId && (
                    <>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between py-2 hover:text-foreground transition-colors"
                        onClick={() => setTradePlanOpen(!tradePlanOpen)}
                        data-testid="button-toggle-trade-plan"
                      >
                        <span className="text-sm font-semibold">
                          {form.tradePlanId === "live-custom"
                            ? "Custom Trade Plan Settings"
                            : `${tradePlans.find(p => p.id.toString() === form.tradePlanId)?.name || "Trade Plan"} Settings`}
                        </span>
                        {tradePlanOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                      </button>

                      {tradePlanOpen && (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label className="font-semibold text-sm">Trade Plan Type</Label>
                            <Select value={form.customTargetType} onValueChange={v => {
                              const wasUnderlying = form.customTargetType === "Underlying Price Based";
                              const isNowUnderlying = v === "Underlying Price Based";
                              if (wasUnderlying !== isNowUnderlying) {
                                setForm(prev => ({
                                  ...prev,
                                  customTargetType: v,
                                  customLevels: isNowUnderlying ? [...DEFAULT_LEVELS_UNDERLYING] : [...DEFAULT_LEVELS_SYMBOL],
                                  customStopLossPct: isNowUnderlying ? "175.00" : "10.00",
                                }));
                              } else {
                                update("customTargetType", v);
                              }
                            }}>
                              <SelectTrigger data-testid="select-custom-target-type">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {TARGET_TYPES.map(t => (
                                  <SelectItem key={t} value={t}>{t}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {form.customTargetType === "Underlying Price Based" && (
                              <p className="text-[11px] text-muted-foreground mt-1">
                                {parseFloat(form.stockPrice) > 0
                                  ? `Prices based on $${parseFloat(form.stockPrice).toFixed(2)} stock price`
                                  : "Enter a ticker to see live prices"}
                              </p>
                            )}
                            {form.customTargetType === "Symbol Price Based" && (
                              <p className="text-[11px] text-muted-foreground mt-1">
                                {(parseFloat(form.isOption ? form.optionPrice : form.stockPrice) || 0) > 0
                                  ? `Prices based on $${(parseFloat(form.isOption ? form.optionPrice : form.stockPrice) || 0).toFixed(2)} entry`
                                  : "Enter a ticker to see live prices"}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center justify-between">
                            <p className="font-semibold text-sm">Take Profit Levels</p>
                            <Button variant="outline" size="sm" onClick={() => {
                              const lastPct = form.customLevels.length > 0 ? form.customLevels[form.customLevels.length - 1].levelPct : 0;
                              const increment = form.customTargetType === "Underlying Price Based" ? 5 : 10;
                              setForm(prev => ({
                                ...prev,
                                customLevels: [...prev.customLevels, { levelPct: lastPct + increment, takeOffPct: 50, raiseStopLossTo: "Off", customRaiseSLValue: "", trailingStop: "Off", trailingStopPct: "" }],
                              }));
                            }} data-testid="button-add-custom-level">
                              <Plus className="h-3.5 w-3.5 mr-1" />
                              Add Take Profit
                            </Button>
                          </div>

                          <div className="space-y-4">
                            {form.customLevels.map((level, i) => {
                              const isUnderlying = form.customTargetType === "Underlying Price Based";
                              const ep = isUnderlying
                                ? (parseFloat(form.stockPrice) || 0)
                                : (parseFloat(form.isOption ? form.optionPrice : form.stockPrice) || 0);
                              return (
                                <TakeProfitLevelForm
                                  key={i}
                                  index={i}
                                  level={level}
                                  entryPrice={ep}
                                  canRemove={i > 0}
                                  isUnderlyingBased={isUnderlying}
                                  showPrice={form.isOption}
                                  defaultCustomSLValue={
                                    isUnderlying
                                      ? (i === 0 ? (ep > 0 ? ep.toFixed(2) : "0") : form.customLevels[i - 1].levelPct.toFixed(2))
                                      : (i === 0 ? "0" : form.customLevels[i - 1].levelPct.toFixed(2))
                                  }
                                  onChange={(updated) => {
                                    setForm(prev => ({
                                      ...prev,
                                      customLevels: prev.customLevels.map((l, j) => j === i ? updated : l),
                                    }));
                                  }}
                                  onRemove={() => {
                                    setForm(prev => ({
                                      ...prev,
                                      customLevels: prev.customLevels.filter((_, j) => j !== i),
                                    }));
                                  }}
                                />
                              );
                            })}
                          </div>

                          <div className="rounded-lg border border-border p-3 sm:p-4 space-y-3 sm:space-y-4" data-testid="section-custom-stop-loss">
                            <h4 className="font-semibold text-sm">Stop Loss</h4>
                            {form.customTargetType === "Underlying Price Based" ? (
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Underlying Price</Label>
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-muted-foreground shrink-0">$</span>
                                  <Input
                                    type="text"
                                    inputMode="decimal"
                                    value={form.customStopLossPct}
                                    onChange={e => update("customStopLossPct", e.target.value)}
                                    onBlur={() => {
                                      const val = parseFloat(form.customStopLossPct) || 0;
                                      update("customStopLossPct", val.toFixed(2));
                                    }}
                                    className="text-sm"
                                    data-testid="input-custom-stop-loss"
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className={`grid gap-3 ${form.isOption ? "grid-cols-2" : "grid-cols-1"}`}>
                                <div className="space-y-1">
                                  <Label className="text-xs text-muted-foreground">Stop Loss %</Label>
                                  <div className="flex items-center gap-1">
                                    <Input
                                      type="text"
                                      inputMode="decimal"
                                      value={form.customStopLossPct}
                                      onChange={e => update("customStopLossPct", e.target.value)}
                                      onBlur={() => {
                                        const val = parseFloat(form.customStopLossPct) || 0;
                                        update("customStopLossPct", val.toFixed(2));
                                      }}
                                      className="text-sm"
                                      data-testid="input-custom-stop-loss"
                                    />
                                    <span className="text-xs text-muted-foreground shrink-0">%</span>
                                  </div>
                                </div>
                                {form.isOption && (() => {
                                  const slEntry = parseFloat(form.optionPrice) || 0;
                                  return (
                                    <div className="space-y-1">
                                      <Label className="text-xs text-muted-foreground">Price</Label>
                                      <div className="flex items-center gap-1">
                                        <span className="text-xs text-muted-foreground shrink-0">$</span>
                                        <Input
                                          type="text"
                                          inputMode="decimal"
                                          value={slEntry > 0 ? (slEntry * (1 - (parseFloat(form.customStopLossPct) || 10) / 100)).toFixed(2) : "0.00"}
                                          onChange={e => {
                                            const newPrice = parseFloat(e.target.value) || 0;
                                            const newPct = slEntry > 0 ? ((slEntry - newPrice) / slEntry) * 100 : 0;
                                            update("customStopLossPct", Math.max(0, parseFloat(newPct.toFixed(2))).toFixed(2));
                                          }}
                                          className="text-sm"
                                          data-testid="input-custom-stop-loss-price"
                                        />
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {(form.tradeType === "Swing" || form.tradeType === "Leap") && (
                  <div className="space-y-2">
                    <Label className="font-semibold text-sm">Time Horizon</Label>
                    <Input
                      type="date"
                      value={form.timeHorizon}
                      onChange={e => update("timeHorizon", e.target.value)}
                      data-testid="input-time-horizon"
                    />
                    <p className="text-xs text-muted-foreground">
                      {form.tradeType === "Swing"
                        ? "Defaults to 1 month from today"
                        : "Defaults to 1 year from today"}
                    </p>
                  </div>
                )}

                <div className="rounded-lg border border-border p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-amber-400" />
                    <span className="font-semibold text-sm">Optional Fields</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Select which optional fields to include in your Discord message:</p>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={form.showChartAnalysis}
                        onCheckedChange={v => {
                          update("showChartAnalysis", v);
                          if (!v) clearChart();
                        }}
                        data-testid="switch-chart-analysis"
                      />
                      <Label className="font-medium text-sm cursor-pointer" onClick={() => {
                        const next = !form.showChartAnalysis;
                        update("showChartAnalysis", next);
                        if (!next) clearChart();
                      }}>Chart Analysis</Label>
                    </div>
                  </div>

                  {form.showChartAnalysis && (
                    <>
                      <Separator />

                      {form.showChartAnalysis && (
                        <div className="space-y-2">
                          <Label className="font-semibold text-sm">TA Media (Image or Video)</Label>
                          <input
                            ref={chartFileRef}
                            type="file"
                            accept="image/*,video/*"
                            className="hidden"
                            onChange={e => { const f = e.target.files?.[0]; if (f) handleChartFile(f); }}
                            data-testid="input-chart-media-file"
                          />
                          <div
                            className={`relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                              chartDragging
                                ? "border-primary bg-primary/5"
                                : chartFile
                                  ? "border-green-500/50 bg-green-500/5"
                                  : "border-border hover:border-muted-foreground/50"
                            }`}
                            onDragOver={e => { e.preventDefault(); setChartDragging(true); }}
                            onDragLeave={e => { e.preventDefault(); setChartDragging(false); }}
                            onDrop={e => { e.preventDefault(); setChartDragging(false); const f = e.dataTransfer.files[0]; if (f) handleChartFile(f); }}
                            onClick={() => !chartFile && chartFileRef.current?.click()}
                            data-testid="dropzone-chart-media"
                          >
                            {chartFile ? (
                              <div className="space-y-3">
                                <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400">
                                  {chartMediaType === "image" ? <ImageIcon className="h-5 w-5" /> : <Video className="h-5 w-5" />}
                                  <span className="font-medium text-sm">{chartFile.name}</span>
                                </div>
                                {chartPreviewUrl && chartMediaType === "image" && (
                                  <img src={chartPreviewUrl} alt="Preview" className="mx-auto max-h-48 rounded-lg object-contain" data-testid="img-chart-preview" />
                                )}
                                {chartPreviewUrl && chartMediaType === "video" && (
                                  <video src={chartPreviewUrl} controls className="mx-auto max-h-48 rounded-lg" data-testid="video-chart-preview" />
                                )}
                                <Button variant="outline" size="sm" onClick={e => { e.stopPropagation(); clearChart(); }} data-testid="button-clear-chart">
                                  <X className="h-3 w-3 mr-1" /> Remove
                                </Button>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                                <div>
                                  <p className="font-medium text-sm">Drag & drop a file here</p>
                                  <p className="text-xs text-muted-foreground">or click to browse (images/videos)</p>
                                </div>
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">Supported: images and video clips. Keep files small enough for Discord webhook limits.</p>
                        </div>
                      )}

                    </>
                  )}
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleSubmit}
                  disabled={createSignal.isPending || isSendingMultipart}
                  data-testid="button-send-signal"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {(createSignal.isPending || isSendingMultipart) ? "Sending..." : "Send Signal"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:sticky lg:top-6">
          <LivePreview form={form} chartPreviewUrl={chartPreviewUrl} chartMediaType={chartMediaType} tickerDetails={tickerDetails} />
        </div>
      </div>
    </div>
  );
}
