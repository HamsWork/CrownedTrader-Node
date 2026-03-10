import { useState, useEffect, useRef, useCallback } from "react";
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
import { Send, Settings, Rocket, Info, Search, ChevronDown, ChevronUp, Plus, ClipboardList, Upload, X, ImageIcon, Video, FileText, ShieldCheck } from "lucide-react";
import type { TradePlan, TakeProfitLevel } from "@shared/schema";
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
  Stock: { label: "Stock", color: "bg-blue-500/20 text-blue-400" },
  ETF: { label: "ETF", color: "bg-cyan-500/20 text-cyan-400" },
  LETF: { label: "LETF", color: "bg-orange-500/20 text-orange-400" },
  Crypto: { label: "Crypto", color: "bg-purple-500/20 text-purple-400" },
};

function TickerAutocomplete({
  value,
  onChange,
  tickerDetails,
  onTickerDetails,
}: {
  value: string;
  onChange: (ticker: string) => void;
  tickerDetails: TickerDetails | null;
  onTickerDetails: (details: TickerDetails | null) => void;
}) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<TickerResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

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

  async function fetchDetails(ticker: string) {
    try {
      const res = await fetch(`/api/ticker-details/${encodeURIComponent(ticker)}`);
      if (res.ok) {
        const data = await res.json();
        onTickerDetails(data);
      }
    } catch {}
  }

  function handleInputChange(val: string) {
    const upper = val.toUpperCase();
    setQuery(upper);
    onChange(upper);
    onTickerDetails(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchTickers(upper), 300);
  }

  function selectTicker(ticker: string) {
    setQuery(ticker);
    onChange(ticker);
    setIsOpen(false);
    setResults([]);
    fetchDetails(ticker);
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
            results.map((r) => (
              <button
                key={r.ticker}
                type="button"
                className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-accent cursor-pointer transition-colors"
                onClick={() => selectTicker(r.ticker)}
                data-testid={`ticker-option-${r.ticker}`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-semibold shrink-0">{r.ticker}</span>
                  <span className="text-muted-foreground truncate text-xs">{r.name}</span>
                </div>
                <span className="text-[10px] text-muted-foreground uppercase shrink-0 ml-2">{r.market}</span>
              </button>
            ))
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
  showRiskManagement: boolean;
  riskManagement: string;
}

function LivePreview({ form, tradePlans, chartPreviewUrl, chartMediaType }: { form: TradeForm; tradePlans: TradePlan[]; chartPreviewUrl: string | null; chartMediaType: "image" | "video" | null }) {
  const isCustom = form.tradePlanId === "live-custom";
  const selectedPlan = isCustom ? null : (tradePlans || []).find(p => p.id.toString() === form.tradePlanId);
  const entry = parseFloat(form.isOption ? form.optionPrice : form.entryPrice) || 0;
  const stockPrice = parseFloat(form.stockPrice) || 0;

  const levels = isCustom
    ? form.customLevels
    : (selectedPlan?.takeProfitLevels || []);
  const slPct = isCustom
    ? (parseFloat(form.customStopLossPct) || 10)
    : parseFloat(selectedPlan?.stopLossPct || "10");
  const hasPlan = isCustom || !!selectedPlan;
  const isUnderlyingBased = isCustom
    ? form.customTargetType === "Underlying Price Based"
    : selectedPlan?.targetType === "Underlying Price Based";

  return (
    <Card className="sticky top-20" data-testid="card-live-preview">
      <CardContent className="pt-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-500/20">
            <span className="text-sm">🔮</span>
          </div>
          <h2 className="font-bold text-lg" data-testid="text-preview-title">Live Preview</h2>
        </div>

        <div className="rounded-lg bg-[#1a1d23] border border-[#2a2d35] overflow-hidden">
          <div className="p-4 space-y-4 text-sm text-[#dcddde]">
            <div>
              <p className="font-bold text-white flex items-center gap-1.5">
                <span>🔺</span> Trade Alert
              </p>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-1">
              <div>
                <span className="text-[#72767d] text-xs">🟢 Ticker</span>
                <p className="font-semibold text-white">{form.ticker || "Ticker"}</p>
                <p className="text-[#72767d] text-xs">(Company Name)</p>
              </div>
              <div>
                <span className="text-[#72767d] text-xs">💹 Stock Price</span>
                <p className="font-semibold text-white">$ {stockPrice.toFixed(2)}</p>
              </div>
            </div>

            {form.isOption ? (
              <div className="grid grid-cols-3 gap-x-4 gap-y-1">
                <div>
                  <span className="text-[#72767d] text-xs">❌ Expiration</span>
                  <p className="text-white">{form.expiration || "—"}</p>
                </div>
                <div>
                  <span className="text-[#72767d] text-xs">🔥 Strike</span>
                  <p className="text-white">{form.strike || "—"}</p>
                </div>
                <div>
                  <span className="text-[#72767d] text-xs">💰 Option Price</span>
                  <p className="text-white">$ {entry.toFixed(2)}</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <div>
                  <span className="text-[#72767d] text-xs">📈 Direction</span>
                  <p className="text-white">{form.direction}</p>
                </div>
                <div>
                  <span className="text-[#72767d] text-xs">💰 Entry Price</span>
                  <p className="text-white">$ {entry.toFixed(2)}</p>
                </div>
              </div>
            )}

            {hasPlan ? (
              <>
                <div>
                  <p className="font-bold text-white flex items-center gap-1.5">
                    <span>📋</span> Trade Plan — {isCustom ? "Live Custom" : selectedPlan?.name}
                  </p>
                  <p className="mt-1">
                    <span className="text-[#72767d]">🎯</span>{" "}
                    Targets: {isUnderlyingBased
                      ? levels.map(l => `$${l.levelPct.toFixed(2)}`).join(", ")
                      : levels.map(l => {
                          const price = (entry * (1 + l.levelPct / 100)).toFixed(2);
                          return `$${price} (+${l.levelPct.toFixed(2)}%)`;
                        }).join(", ")
                    }
                  </p>
                  <p>
                    <span className="text-[#72767d]">🔴</span>{" "}
                    Stop Loss: {isUnderlyingBased
                      ? `$${parseFloat(form.customStopLossPct || selectedPlan?.stopLossPct || "0").toFixed(2)}`
                      : `$${(entry * (1 - slPct / 100)).toFixed(2)} (-${slPct.toFixed(2)}%)`
                    }
                  </p>
                </div>

                <div>
                  <p className="font-bold text-white flex items-center gap-1.5">
                    <span>🔥</span> Take Profit Plan
                  </p>
                  {levels.map((l, i) => {
                    const levelLabel = isUnderlyingBased ? `$${l.levelPct.toFixed(2)}` : `${l.levelPct.toFixed(2)}%`;
                    return (
                      <p key={i} className="text-xs mt-1 leading-relaxed">
                        Take Profit ({i + 1}): At {levelLabel} take off {l.takeOffPct}% of {i === 0 ? "position" : "remaining position"}
                        {l.raiseStopLossTo !== "Off" && ` and raise stop loss to ${l.raiseStopLossTo === "Break even" ? "break even" : (isUnderlyingBased ? `$${l.customRaiseSLValue}` : `${l.customRaiseSLValue}%`)}`}
                        {l.trailingStop === "On" && ` with ${l.trailingStopPct}% trailing stop`}.
                      </p>
                    );
                  })}
                </div>
              </>
            ) : (
              <div>
                <p className="font-bold text-white flex items-center gap-1.5">
                  <span>📋</span> Trade Plan
                </p>
                <p className="text-xs mt-1 text-[#72767d] italic">No trade plan selected</p>
              </div>
            )}

            {form.showChartAnalysis && chartPreviewUrl && (
              <div>
                <p className="font-bold text-white flex items-center gap-1.5">
                  <span>📊</span> Chart Analysis
                </p>
                {chartMediaType === "image" && (
                  <div className="rounded-lg overflow-hidden border border-[#2a2d35] bg-black/25 mt-2">
                    <img src={chartPreviewUrl} alt="Chart" className="w-full max-h-[200px] object-contain" data-testid="preview-chart-image" />
                  </div>
                )}
                {chartMediaType === "video" && (
                  <div className="rounded-lg overflow-hidden border border-[#2a2d35] bg-black/25 mt-2">
                    <video src={chartPreviewUrl} controls className="w-full max-h-[200px]" data-testid="preview-chart-video" />
                  </div>
                )}
              </div>
            )}

            {form.showRiskManagement && form.riskManagement.trim() && (
              <div>
                <p className="font-bold text-white flex items-center gap-1.5">
                  <span>🛡️</span> Risk Management
                </p>
                <p className="text-xs mt-1 whitespace-pre-wrap leading-relaxed">{form.riskManagement}</p>
              </div>
            )}

            <p className="text-xs text-[#72767d] italic">
              Disclaimer: Not financial advice. Trade at your own risk.
            </p>
          </div>

          <div className="bg-[#12141a] border-t border-[#2a2d35] px-4 py-3 flex items-start gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500/30 shrink-0 mt-0.5">
              <Info className="h-3 w-3 text-blue-400" />
            </div>
            <p className="text-xs text-[#72767d]">
              This is how your signal will appear in Discord. Update the form to see changes in real-time.
            </p>
          </div>
        </div>
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
  const [tradePlanOpen, setTradePlanOpen] = useState(true);

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
    showRiskManagement: false,
    riskManagement: "",
  });

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
    if (userChannels.length > 0 && !form.channel) {
      setForm(prev => ({ ...prev, channel: userChannels[0].name }));
    }
  }, [userChannels]);

  useEffect(() => {
    if (tradePlans.length > 0 && !form.tradePlanId) {
      const defaultPlan = tradePlans.find(p => p.isDefault) || tradePlans[0];
      setForm(prev => ({ ...prev, tradePlanId: defaultPlan.id.toString() }));
    }
  }, [tradePlans]);

  function update<K extends keyof TradeForm>(key: K, value: TradeForm[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    if (!form.ticker.trim()) {
      toast({ title: "Ticker is required", variant: "destructive" });
      return;
    }

    const entry = parseFloat(form.isOption ? form.optionPrice : form.entryPrice) || 0;
    if (entry <= 0) {
      toast({ title: form.isOption ? "Option price is required" : "Entry price is required", variant: "destructive" });
      return;
    }

    if (!form.tradePlanId) {
      toast({ title: "Please select a Trade Plan", variant: "destructive" });
      return;
    }

    const isCustom = form.tradePlanId === "live-custom";
    const selectedPlan = isCustom ? null : tradePlans.find(p => p.id.toString() === form.tradePlanId);
    const levels = isCustom
      ? form.customLevels
      : (selectedPlan?.takeProfitLevels || []);
    const slPct = isCustom
      ? (parseFloat(form.customStopLossPct) || 10)
      : parseFloat(selectedPlan?.stopLossPct || "10");

    const isUnderlyingBased = isCustom
      ? form.customTargetType === "Underlying Price Based"
      : selectedPlan?.targetType === "Underlying Price Based";

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

    if (form.showRiskManagement && form.riskManagement.trim()) {
      signalData.risk_management = form.riskManagement.trim();
    }

    try {
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
        queryClient.invalidateQueries({ queryKey: ["/api/signals"] });
        queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      } else {
        await createSignal.mutateAsync({
          data: signalData,
          discordChannelName: form.channel || null,
        });
      }

      toast({ title: "Signal sent!", description: "Your trade alert has been published." });
      clearChart();
      setForm(prev => ({
        ...prev,
        ticker: "",
        strike: "",
        optionPrice: "",
        stockPrice: "",
        entryPrice: "",
        riskManagement: "",
        showChartAnalysis: false,
        showRiskManagement: false,
      }));
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to send signal", variant: "destructive" });
    } finally {
      setIsSendingMultipart(false);
    }
  }

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6 items-start">
        <div className="space-y-6">
          <Card data-testid="card-signal-config">
            <CardContent className="pt-5">
              <div className="flex items-center gap-2 mb-5">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-500/20">
                  <Settings className="h-4 w-4 text-blue-400" />
                </div>
                <h2 className="font-bold text-lg">Signal Configuration</h2>
              </div>

              <div className="space-y-5">
                <div className="space-y-2">
                  <Label className="font-semibold text-sm">Destination Channel</Label>
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
                  />
                </div>

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

                {form.isOption ? (
                  <div className="space-y-5 rounded-lg border border-border p-4">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-sm">Option contract</span>
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

                  </div>
                ) : (
                  <div className="space-y-5 rounded-lg border border-border p-4">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-sm">Shares / Stock</span>
                    </div>

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

                    <div className="space-y-2">
                      <Label className="font-semibold text-sm">
                        Entry Price <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={form.entryPrice}
                        onChange={e => update("entryPrice", e.target.value)}
                        data-testid="input-entry-price"
                      />
                    </div>
                  </div>
                )}

                <div className="rounded-lg border border-border p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-blue-400" />
                    <span className="font-semibold text-sm">Trade Plan</span>
                  </div>

                  <div className="space-y-2">
                    <Label className="font-semibold text-sm">Select Trade Plan</Label>
                    <Select value={form.tradePlanId} onValueChange={v => {
                      update("tradePlanId", v);
                      if (v === "live-custom") {
                        setForm(prev => ({
                          ...prev,
                          tradePlanId: v,
                          customTargetType: "Symbol Price Based",
                          customStopLossPct: "10.00",
                          customLevels: [...DEFAULT_LEVELS_SYMBOL],
                        }));
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
                              <span className="inline-block h-2 w-2 rounded-full bg-blue-400" />
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

                  {form.tradePlanId === "live-custom" && (
                    <>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between py-2 hover:text-foreground transition-colors"
                        onClick={() => setTradePlanOpen(!tradePlanOpen)}
                        data-testid="button-toggle-trade-plan"
                      >
                        <span className="text-sm font-semibold">Custom Trade Plan Settings</span>
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
                                Default prices based on $180 entry
                              </p>
                            )}
                            {form.customTargetType === "Symbol Price Based" && (
                              <p className="text-[11px] text-muted-foreground mt-1">
                                Default preview based on $5.00 entry
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
                              const ep = 5;
                              const underlyingEntry = 180;
                              const isUnderlying = form.customTargetType === "Underlying Price Based";
                              return (
                                <TakeProfitLevelForm
                                  key={i}
                                  index={i}
                                  level={level}
                                  entryPrice={ep}
                                  canRemove={i > 0}
                                  isUnderlyingBased={isUnderlying}
                                  defaultCustomSLValue={
                                    isUnderlying
                                      ? (i === 0 ? underlyingEntry.toFixed(2) : form.customLevels[i - 1].levelPct.toFixed(2))
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
                              <div className="grid grid-cols-2 gap-3">
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
                                <div className="space-y-1">
                                  <Label className="text-xs text-muted-foreground">Price</Label>
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs text-muted-foreground shrink-0">$</span>
                                    <Input
                                      type="text"
                                      inputMode="decimal"
                                      value={(5 * (1 - (parseFloat(form.customStopLossPct) || 10) / 100)).toFixed(2)}
                                      onChange={e => {
                                        const newPrice = parseFloat(e.target.value) || 0;
                                        const newPct = 5 > 0 ? ((5 - newPrice) / 5) * 100 : 0;
                                        update("customStopLossPct", Math.max(0, parseFloat(newPct.toFixed(2))).toFixed(2));
                                      }}
                                      className="text-sm"
                                      data-testid="input-custom-stop-loss-price"
                                    />
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

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
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={form.showRiskManagement}
                        onCheckedChange={v => update("showRiskManagement", v)}
                        data-testid="switch-risk-management"
                      />
                      <Label className="font-medium text-sm cursor-pointer" onClick={() => update("showRiskManagement", !form.showRiskManagement)}>Risk Management</Label>
                    </div>
                  </div>
                </div>

                {(form.showChartAnalysis || form.showRiskManagement) && (
                  <div className="rounded-lg border border-border p-4 space-y-4">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-amber-400" />
                      <span className="font-semibold text-sm">Related Variables</span>
                    </div>

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

                    {form.showRiskManagement && (
                      <div className="space-y-2">
                        <Label className="font-semibold text-sm">Risk Management</Label>
                        <Textarea
                          value={form.riskManagement}
                          onChange={e => update("riskManagement", e.target.value)}
                          placeholder="Enter Risk Management (e.g., position size, 0DTE rules, due diligence)"
                          rows={4}
                          data-testid="textarea-risk-management"
                        />
                      </div>
                    )}
                  </div>
                )}

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
          <LivePreview form={form} tradePlans={tradePlans} chartPreviewUrl={chartPreviewUrl} chartMediaType={chartMediaType} />
        </div>
      </div>
    </div>
  );
}
