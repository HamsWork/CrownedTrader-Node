import { useState, useEffect, useRef, useCallback } from "react";
import { useSignalTypes } from "@/hooks/use-signals";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Briefcase, Search, DollarSign, TrendingUp, TrendingDown, RefreshCw, LayoutDashboard, Send, History, ClipboardList } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { Signal, TakeProfitLevel } from "@shared/schema";

function formatDate(d: Date | string | null) {
  if (!d) return "—";
  return format(new Date(d), "MMM dd, yyyy HH:mm");
}

function getPnlPct(entry: number, mark: number, direction: string): number {
  if (!entry || !mark) return 0;
  const diff = direction === "Short" ? entry - mark : mark - entry;
  return (diff / entry) * 100;
}

function findHitTpLevel(
  entryPrice: number,
  currentPrice: number,
  levels: TakeProfitLevel[],
  direction: string
): { level: number; index: number } | null {
  if (!levels.length || !entryPrice || !currentPrice) return null;
  const pnlPct = getPnlPct(entryPrice, currentPrice, direction);
  let hitIndex = -1;
  for (let i = levels.length - 1; i >= 0; i--) {
    if (pnlPct >= levels[i].levelPct) {
      hitIndex = i;
      break;
    }
  }
  if (hitIndex < 0) return null;
  return { level: hitIndex + 1, index: hitIndex };
}

function PartialExitPreview({
  signal,
  currentPrice,
}: {
  signal: Signal;
  currentPrice: number;
}) {
  const data = (signal.data ?? {}) as Record<string, string>;
  const ticker = data.ticker || "—";
  const isOption = data.is_option === "true";
  const optionType = data.option_type || "";
  const strike = data.strike || "";
  const expiration = data.expiration || "";
  const entryPrice = parseFloat(data.entry_price || data.option_price || "0");
  const direction = data.direction || "Long";
  const instrumentType = data.instrument_type || (isOption ? "Options" : "Shares");

  let levels: TakeProfitLevel[] = [];
  try {
    levels = JSON.parse(data.take_profit_levels || "[]");
  } catch {}

  const profitPct = currentPrice > 0 ? getPnlPct(entryPrice, currentPrice, direction) : 0;
  const hitTp = currentPrice > 0 ? findHitTpLevel(entryPrice, currentPrice, levels, direction) : null;
  const tpIndex = hitTp?.level ?? 1;
  const hitLevel = hitTp ? levels[hitTp.index] : levels[0];
  const nextLevel = hitTp && hitTp.index + 1 < levels.length ? levels[hitTp.index + 1] : null;
  const takeOffPct = hitLevel?.takeOffPct ?? 50;
  const remainPct = 100 - takeOffPct;
  const raiseSL = hitLevel?.raiseStopLossTo || "Off";
  const nextTpPrice = nextLevel
    ? (entryPrice * (1 + nextLevel.levelPct / 100)).toFixed(2)
    : null;
  const newSLLabel = raiseSL === "Break even"
    ? `$${entryPrice.toFixed(2)} (break even)`
    : raiseSL !== "Off"
      ? `$${raiseSL}`
      : null;

  const instrumentLabel = isOption ? "Options" : "Shares";

  return (
    <div className="rounded-md bg-[#2b2d31] text-[#dcddde] text-[13px] overflow-hidden">
      <div className="p-4 text-sm text-[#dcddde]">
        <p className="text-[#dcddde] text-sm font-medium mb-3">@everyone</p>
        <div className="flex gap-1">
          <div className="w-1 rounded-full bg-[#2ecc71] shrink-0" />
          <div className="flex-1 pl-3 space-y-3">
            <p className="font-bold text-white">🏆 {ticker} {instrumentLabel} Take Profit {tpIndex} HIT</p>

            {isOption ? (
              <>
                <div className="grid grid-cols-3 gap-x-4 gap-y-2">
                  <div>
                    <span className="text-[#72767d] text-xs font-semibold">❌ EXPIRATION</span>
                    <p className="text-white">{expiration || "—"}</p>
                  </div>
                  <div>
                    <span className="text-[#72767d] text-xs font-semibold">👑 STRIKE</span>
                    <p className="text-white">{strike} {optionType}</p>
                  </div>
                  <div>
                    <span className="text-[#72767d] text-xs font-semibold">💰 OPTION PRICE</span>
                    <p className="text-white">${currentPrice > 0 ? currentPrice.toFixed(2) : "0.00"}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-x-4 gap-y-2">
                  <div>
                    <span className="text-[#72767d] text-xs font-semibold">✅ ENTRY</span>
                    <p className="text-white">${entryPrice.toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="text-[#72767d] text-xs font-semibold">🎯 TP{tpIndex} HIT</span>
                    <p className="text-white">${currentPrice > 0 ? currentPrice.toFixed(2) : "0.00"}</p>
                  </div>
                  <div>
                    <span className="text-[#72767d] text-xs font-semibold">🎆 PROFIT</span>
                    <p className="text-white">{profitPct > 0 ? "+" : ""}{profitPct.toFixed(1)}%</p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-x-4 gap-y-2">
                  <div>
                    <span className="text-[#72767d] text-xs font-semibold">🟢 Ticker</span>
                    <p className="text-white">{ticker}</p>
                  </div>
                  <div>
                    <span className="text-[#72767d] text-xs font-semibold">✅ ENTRY</span>
                    <p className="text-white">${entryPrice.toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="text-[#72767d] text-xs font-semibold">🎯 TP{tpIndex} HIT</span>
                    <p className="text-white">${currentPrice > 0 ? currentPrice.toFixed(2) : "0.00"}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-x-4 gap-y-2">
                  <div>
                    <span className="text-[#72767d] text-xs font-semibold">📈 DIRECTION</span>
                    <p className="text-white">{direction}</p>
                  </div>
                  <div>
                    <span className="text-[#72767d] text-xs font-semibold">🎆 PROFIT</span>
                    <p className="text-white">{profitPct > 0 ? "+" : ""}{profitPct.toFixed(1)}%</p>
                  </div>
                </div>
              </>
            )}

            <p className="text-white">⚙️ STATUS: TP{tpIndex} REACHED 🚨</p>

            <div>
              <p className="font-bold text-white flex items-center gap-1.5">
                <span>⚙️</span> POSITION MANAGEMENT
              </p>
              <p className="text-xs mt-1 leading-relaxed">
                ✅ Reduce position by {takeOffPct}% (lock in profit)
              </p>
              {remainPct > 0 && nextTpPrice && (
                <p className="text-xs mt-1 leading-relaxed">
                  ✅ Let remaining {remainPct}% ride to TP{tpIndex + 1} (${nextTpPrice})
                </p>
              )}
            </div>

            {newSLLabel && (
              <div>
                <p className="font-bold text-white flex items-center gap-1.5">
                  <span>⚙️</span> RISK MANAGEMENT
                </p>
                <p className="text-xs mt-1 leading-relaxed">
                  Raising stop loss to {newSLLabel} on remaining position to secure gains while allowing room to run.
                </p>
              </div>
            )}

            <p className="text-[10px] text-[#72767d] italic pt-1">
              Disclaimer: Not financial advice. Trade at your own risk.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

type FullExitReason = "take_profit" | "stop_loss" | "trailing_stop";

function FullExitPreview({
  signal,
  currentPrice,
  reason,
}: {
  signal: Signal;
  currentPrice: number;
  reason: FullExitReason;
}) {
  const data = (signal.data ?? {}) as Record<string, string>;
  const ticker = data.ticker || "—";
  const isOption = data.is_option === "true";
  const optionType = data.option_type || "";
  const strike = data.strike || "";
  const expiration = data.expiration || "";
  const entryPrice = parseFloat(data.entry_price || data.option_price || "0");
  const direction = data.direction || "Long";

  let levels: TakeProfitLevel[] = [];
  try {
    levels = JSON.parse(data.take_profit_levels || "[]");
  } catch {}

  const profitPct = currentPrice > 0 ? getPnlPct(entryPrice, currentPrice, direction) : 0;
  const hitTp = currentPrice > 0 ? findHitTpLevel(entryPrice, currentPrice, levels, direction) : null;
  const tpIndex = hitTp?.level ?? 1;
  const instrumentLabel = isOption ? "Options" : "Shares";

  const slPct = parseFloat(data.stop_loss_pct || "0");
  const slPrice = entryPrice > 0 ? entryPrice * (1 - slPct / 100) : 0;
  const exitPrice = currentPrice > 0 ? currentPrice : slPrice;
  const resultPct = entryPrice > 0 ? (((exitPrice - entryPrice) / entryPrice) * 100) : 0;

  if (reason === "take_profit") {
    const barColor = "#2ecc71";
    return (
      <div className="rounded-md bg-[#2b2d31] text-[#dcddde] text-[13px] overflow-hidden">
        <div className="p-4 text-sm text-[#dcddde]">
          <p className="text-[#dcddde] text-sm font-medium mb-3">@everyone</p>
          <div className="flex gap-1">
            <div className="w-1 rounded-full shrink-0" style={{ backgroundColor: barColor }} />
            <div className="flex-1 pl-3 space-y-3">
              <p className="font-bold text-white">🏆 {ticker} {instrumentLabel} Take Profit {tpIndex} HIT</p>

              {isOption ? (
                <>
                  <div className="grid grid-cols-3 gap-x-4 gap-y-2">
                    <div>
                      <span className="text-[#72767d] text-xs font-semibold">❌ EXPIRATION</span>
                      <p className="text-white">{expiration || "—"}</p>
                    </div>
                    <div>
                      <span className="text-[#72767d] text-xs font-semibold">👑 STRIKE</span>
                      <p className="text-white">{strike} {optionType}</p>
                    </div>
                    <div>
                      <span className="text-[#72767d] text-xs font-semibold">💰 OPTION PRICE</span>
                      <p className="text-white">${exitPrice.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-x-4 gap-y-2">
                    <div>
                      <span className="text-[#72767d] text-xs font-semibold">✅ ENTRY</span>
                      <p className="text-white">${entryPrice.toFixed(2)}</p>
                    </div>
                    <div>
                      <span className="text-[#72767d] text-xs font-semibold">🎯 TP{tpIndex} HIT</span>
                      <p className="text-white">${exitPrice.toFixed(2)}</p>
                    </div>
                    <div>
                      <span className="text-[#72767d] text-xs font-semibold">🎆 PROFIT</span>
                      <p className="text-white">{profitPct > 0 ? "+" : ""}{profitPct.toFixed(1)}%</p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-x-4 gap-y-2">
                    <div>
                      <span className="text-[#72767d] text-xs font-semibold">🟢 Ticker</span>
                      <p className="text-white">{ticker}</p>
                    </div>
                    <div>
                      <span className="text-[#72767d] text-xs font-semibold">✅ ENTRY</span>
                      <p className="text-white">${entryPrice.toFixed(2)}</p>
                    </div>
                    <div>
                      <span className="text-[#72767d] text-xs font-semibold">🎯 TP{tpIndex} HIT</span>
                      <p className="text-white">${exitPrice.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-x-4 gap-y-2">
                    <div>
                      <span className="text-[#72767d] text-xs font-semibold">📈 DIRECTION</span>
                      <p className="text-white">{direction}</p>
                    </div>
                    <div>
                      <span className="text-[#72767d] text-xs font-semibold">🎆 PROFIT</span>
                      <p className="text-white">{profitPct > 0 ? "+" : ""}{profitPct.toFixed(1)}%</p>
                    </div>
                  </div>
                </>
              )}

              <p className="text-white">⚙️ STATUS: POSITION CLOSED 🚨</p>

              <div>
                <p className="font-bold text-white flex items-center gap-1.5">
                  <span>⚙️</span> POSITION MANAGEMENT
                </p>
                <p className="text-xs mt-1 leading-relaxed">
                  ✅ Full exit (100%) at ${exitPrice.toFixed(2)} ({profitPct > 0 ? "+" : ""}{profitPct.toFixed(1)}%)
                </p>
              </div>

              <p className="text-[10px] text-[#72767d] italic pt-1">
                Disclaimer: Not financial advice. Trade at your own risk.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (reason === "stop_loss") {
    const barColor = "#e74c3c";
    return (
      <div className="rounded-md bg-[#2b2d31] text-[#dcddde] text-[13px] overflow-hidden">
        <div className="p-4 text-sm text-[#dcddde]">
          <p className="text-[#dcddde] text-sm font-medium mb-3">@everyone</p>
          <div className="flex gap-1">
            <div className="w-1 rounded-full shrink-0" style={{ backgroundColor: barColor }} />
            <div className="flex-1 pl-3 space-y-3">
              <p className="font-bold text-white">🔴 {ticker} {instrumentLabel} Stop Loss HIT</p>

              {isOption ? (
                <>
                  <div className="grid grid-cols-3 gap-x-4 gap-y-2">
                    <div>
                      <span className="text-[#72767d] text-xs font-semibold">❌ EXPIRATION</span>
                      <p className="text-white">{expiration || "—"}</p>
                    </div>
                    <div>
                      <span className="text-[#72767d] text-xs font-semibold">👑 STRIKE</span>
                      <p className="text-white">{strike} {optionType}</p>
                    </div>
                    <div>
                      <span className="text-[#72767d] text-xs font-semibold">💰 OPTION PRICE</span>
                      <p className="text-white">${exitPrice.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-x-4 gap-y-2">
                    <div>
                      <span className="text-[#72767d] text-xs font-semibold">✅ ENTRY</span>
                      <p className="text-white">${entryPrice.toFixed(2)}</p>
                    </div>
                    <div>
                      <span className="text-[#72767d] text-xs font-semibold">🔴 STOP HIT</span>
                      <p className="text-white">${exitPrice.toFixed(2)}</p>
                    </div>
                    <div>
                      <span className="text-[#72767d] text-xs font-semibold">🎆 RESULT</span>
                      <p className="text-white">{resultPct.toFixed(1)}%</p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-x-4 gap-y-2">
                    <div>
                      <span className="text-[#72767d] text-xs font-semibold">🟢 Ticker</span>
                      <p className="text-white">{ticker}</p>
                    </div>
                    <div>
                      <span className="text-[#72767d] text-xs font-semibold">✅ ENTRY</span>
                      <p className="text-white">${entryPrice.toFixed(2)}</p>
                    </div>
                    <div>
                      <span className="text-[#72767d] text-xs font-semibold">🔴 STOP HIT</span>
                      <p className="text-white">${exitPrice.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-x-4 gap-y-2">
                    <div>
                      <span className="text-[#72767d] text-xs font-semibold">📈 DIRECTION</span>
                      <p className="text-white">{direction}</p>
                    </div>
                    <div>
                      <span className="text-[#72767d] text-xs font-semibold">🎆 RESULT</span>
                      <p className="text-white">{resultPct.toFixed(1)}%</p>
                    </div>
                  </div>
                </>
              )}

              <p className="text-white">⚙️ STATUS: POSITION CLOSED 🚨</p>

              <div>
                <p className="font-bold text-white flex items-center gap-1.5">
                  <span>💔</span> DISCIPLINE MATTERS
                </p>
                <p className="text-xs mt-1 leading-relaxed">
                  Following the plan keeps you in the game for winning trades
                </p>
              </div>

              <p className="text-[10px] text-[#72767d] italic pt-1">
                Disclaimer: Not financial advice. Trade at your own risk.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const barColor = "#f39c12";
  return (
    <div className="rounded-md bg-[#2b2d31] text-[#dcddde] text-[13px] overflow-hidden">
      <div className="p-4 text-sm text-[#dcddde]">
        <p className="text-[#dcddde] text-sm font-medium mb-3">@everyone</p>
        <div className="flex gap-1">
          <div className="w-1 rounded-full shrink-0" style={{ backgroundColor: barColor }} />
          <div className="flex-1 pl-3 space-y-3">
            <p className="font-bold text-white">⚡ {ticker} {instrumentLabel} Trailing Stop HIT</p>

            {isOption ? (
              <>
                <div className="grid grid-cols-3 gap-x-4 gap-y-2">
                  <div>
                    <span className="text-[#72767d] text-xs font-semibold">❌ EXPIRATION</span>
                    <p className="text-white">{expiration || "—"}</p>
                  </div>
                  <div>
                    <span className="text-[#72767d] text-xs font-semibold">👑 STRIKE</span>
                    <p className="text-white">{strike} {optionType}</p>
                  </div>
                  <div>
                    <span className="text-[#72767d] text-xs font-semibold">💰 OPTION PRICE</span>
                    <p className="text-white">${exitPrice.toFixed(2)}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-x-4 gap-y-2">
                  <div>
                    <span className="text-[#72767d] text-xs font-semibold">✅ ENTRY</span>
                    <p className="text-white">${entryPrice.toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="text-[#72767d] text-xs font-semibold">⚡ TRAIL STOP</span>
                    <p className="text-white">${exitPrice.toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="text-[#72767d] text-xs font-semibold">🎆 RESULT</span>
                    <p className="text-white">{profitPct >= 0 ? "+" : ""}{profitPct.toFixed(1)}%</p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-x-4 gap-y-2">
                  <div>
                    <span className="text-[#72767d] text-xs font-semibold">🟢 Ticker</span>
                    <p className="text-white">{ticker}</p>
                  </div>
                  <div>
                    <span className="text-[#72767d] text-xs font-semibold">✅ ENTRY</span>
                    <p className="text-white">${entryPrice.toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="text-[#72767d] text-xs font-semibold">⚡ TRAIL STOP</span>
                    <p className="text-white">${exitPrice.toFixed(2)}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-x-4 gap-y-2">
                  <div>
                    <span className="text-[#72767d] text-xs font-semibold">📈 DIRECTION</span>
                    <p className="text-white">{direction}</p>
                  </div>
                  <div>
                    <span className="text-[#72767d] text-xs font-semibold">🎆 RESULT</span>
                    <p className="text-white">{profitPct >= 0 ? "+" : ""}{profitPct.toFixed(1)}%</p>
                  </div>
                </div>
              </>
            )}

            <p className="text-white">⚙️ STATUS: POSITION CLOSED 🚨</p>

            <div>
              <p className="font-bold text-white flex items-center gap-1.5">
                <span>⚙️</span> RESULT
              </p>
              <p className="text-xs mt-1 leading-relaxed">
                Locked in: ${exitPrice.toFixed(2)} ({profitPct >= 0 ? "+" : ""}{profitPct.toFixed(1)}%)
              </p>
            </div>

            <p className="text-[10px] text-[#72767d] italic pt-1">
              Disclaimer: Not financial advice. Trade at your own risk.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

const quickNav = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Send Signal", href: "/send", icon: Send },
  { label: "Trade Plans", href: "/trade-plans", icon: ClipboardList },
  { label: "Signal History", href: "/history", icon: History },
];

export default function PositionManagement() {
  const { data: signals, isLoading: signalsLoading } = useQuery<Signal[]>({
    queryKey: ["/api/signals"],
    refetchInterval: 15000,
  });
  const { data: signalTypes, isLoading: typesLoading } = useSignalTypes();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("open");
  const [closeDialog, setCloseDialog] = useState<Signal | null>(null);
  const [isPartialExit, setIsPartialExit] = useState(false);
  const [closePrice, setClosePrice] = useState("");
  const [useManualPrice, setUseManualPrice] = useState(false);
  const [closeNote, setCloseNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [isFetchingPrice, setIsFetchingPrice] = useState(false);
  const [fullExitReason, setFullExitReason] = useState<FullExitReason>("take_profit");
  const { toast } = useToast();

  const [livePrices, setLivePrices] = useState<Record<string, number>>({});
  const [lastPriceUpdate, setLastPriceUpdate] = useState<Date | null>(null);
  const pricePollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const useManualPriceRef = useRef(useManualPrice);
  useManualPriceRef.current = useManualPrice;

  useEffect(() => {
    if (pricePollingRef.current) {
      clearInterval(pricePollingRef.current);
      pricePollingRef.current = null;
    }

    const openSignals = signals?.filter(s => s.status === "open") ?? [];
    if (openSignals.length === 0) return;

    interface PriceFetchJob {
      key: string;
      isOption: boolean;
      ticker: string;
      optionType?: string;
      expiration?: string;
      strike?: string;
    }

    const jobs: PriceFetchJob[] = [];
    const seenKeys = new Set<string>();

    for (const s of openSignals) {
      const d = (s.data ?? {}) as Record<string, string>;
      const ticker = d.ticker;
      if (!ticker) continue;

      const isOpt = d.is_option === "true";
      const hasOptionFields = isOpt && !!d.expiration && !!d.strike && !!d.option_type;
      const key = hasOptionFields
        ? `opt:${ticker}:${d.expiration}:${d.strike}:${d.option_type}`
        : `stock:${ticker}`;

      if (seenKeys.has(key)) continue;
      seenKeys.add(key);

      if (hasOptionFields) {
        jobs.push({ key, isOption: true, ticker, optionType: d.option_type, expiration: d.expiration, strike: d.strike });
      } else {
        jobs.push({ key, isOption: false, ticker });
      }
    }

    const abortController = new AbortController();

    const pollAll = async () => {
      if (abortController.signal.aborted) return;
      const results: Record<string, number> = {};
      await Promise.allSettled(
        jobs.map(async (job) => {
          try {
            let url: string;
            if (job.isOption) {
              const params = new URLSearchParams({
                underlying: job.ticker,
                expiration: job.expiration!,
                strike: job.strike!,
                optionType: job.optionType!,
              });
              url = `/api/option-quote?${params}`;
            } else {
              url = `/api/stock-price/${encodeURIComponent(job.ticker)}`;
            }
            const res = await fetch(url, {
              credentials: "include",
              signal: abortController.signal,
            });
            if (res.ok) {
              const d = await res.json();
              const price = d?.price;
              if (price) results[job.key] = price;
            }
          } catch {}
        })
      );
      if (!abortController.signal.aborted && Object.keys(results).length > 0) {
        setLivePrices(prev => ({ ...prev, ...results }));
        setLastPriceUpdate(new Date());
      }
    };

    pollAll();
    pricePollingRef.current = setInterval(pollAll, 15000);

    return () => {
      abortController.abort();
      if (pricePollingRef.current) {
        clearInterval(pricePollingRef.current);
        pricePollingRef.current = null;
      }
    };
  }, [signals]);

  const dialogPollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (dialogPollingRef.current) {
      clearInterval(dialogPollingRef.current);
      dialogPollingRef.current = null;
    }

    if (!closeDialog) {
      setLivePrice(null);
      return;
    }
    const data = (closeDialog.data ?? {}) as Record<string, string>;
    const ticker = data.ticker;
    if (!ticker) return;

    const abortController = new AbortController();
    const isOption = data.is_option === "true";

    const fetchPrice = async () => {
      if (abortController.signal.aborted) return;
      try {
        let url: string;
        if (isOption && data.expiration && data.strike && data.option_type) {
          const params = new URLSearchParams({
            underlying: ticker,
            expiration: data.expiration,
            strike: data.strike,
            optionType: data.option_type,
          });
          url = `/api/option-quote?${params}`;
        } else {
          url = `/api/stock-price/${encodeURIComponent(ticker)}`;
        }
        const res = await fetch(url, {
          credentials: "include",
          signal: abortController.signal,
        });
        if (res.ok) {
          const d = await res.json();
          if (d?.price) {
            setLivePrice(d.price);
            if (!useManualPriceRef.current) {
              setClosePrice(d.price.toString());
            }
          }
        }
      } catch {}
      setIsFetchingPrice(false);
    };

    setIsFetchingPrice(true);
    fetchPrice();
    dialogPollingRef.current = setInterval(fetchPrice, 15000);

    return () => {
      abortController.abort();
      if (dialogPollingRef.current) {
        clearInterval(dialogPollingRef.current);
        dialogPollingRef.current = null;
      }
    };
  }, [closeDialog]);

  const filtered = signals?.filter(signal => {
    const data = (signal.data ?? {}) as Record<string, string>;
    const matchesSearch = !search || Object.values(data).some(v =>
      v.toLowerCase().includes(search.toLowerCase())
    );
    const matchesStatus = statusFilter === "all" || signal.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) ?? [];

  const openCount = signals?.filter(s => s.status === "open").length ?? 0;
  const closedCount = signals?.filter(s => s.status === "closed").length ?? 0;

  async function handleClose() {
    if (!closeDialog) return;
    setIsSubmitting(true);
    try {
      await apiRequest("PATCH", `/api/signals/${closeDialog.id}/status`, {
        status: isPartialExit ? "open" : "closed",
        closePrice: closePrice || undefined,
        closeNote: closeNote ? (isPartialExit ? `[Partial Exit] ${closeNote}` : closeNote) : (isPartialExit ? "[Partial Exit]" : undefined),
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/signals"] });
      toast({ title: isPartialExit ? "Partial exit recorded" : "Position closed" });
      resetDialog();
    } catch (err: any) {
      toast({ title: "Failed to update position", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleReopen(signal: Signal) {
    try {
      await apiRequest("PATCH", `/api/signals/${signal.id}/status`, { status: "open" });
      await queryClient.invalidateQueries({ queryKey: ["/api/signals"] });
      toast({ title: "Position reopened" });
    } catch (err: any) {
      toast({ title: "Failed to reopen position", description: err.message, variant: "destructive" });
    }
  }

  async function handleSwitchToManual(signal: Signal) {
    try {
      await apiRequest("POST", `/api/signals/${signal.id}/stop-auto-track`);
      await queryClient.invalidateQueries({ queryKey: ["/api/signals"] });
      toast({ title: "Switched to manual tracking" });
    } catch (err: any) {
      toast({ title: "Failed to switch tracking", description: err.message, variant: "destructive" });
    }
  }

  function openExitDialog(signal: Signal, partial: boolean) {
    setClosePrice("0.00");
    setCloseNote("");
    setIsPartialExit(partial);
    setUseManualPrice(false);
    setFullExitReason("take_profit");
    setCloseDialog(signal);
  }

  function resetDialog() {
    setCloseDialog(null);
    setIsPartialExit(false);
    setClosePrice("");
    setCloseNote("");
    setUseManualPrice(false);
    setLivePrice(null);
    setFullExitReason("take_profit");
  }

  if (signalsLoading || typesLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="flex gap-3">
          <Skeleton className="h-9 flex-1" />
          <Skeleton className="h-9 w-48" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  const currentPriceNum = parseFloat(closePrice) || 0;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight" data-testid="text-page-title">
            Position Management
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1">
            Track and manage your trading positions
            {lastPriceUpdate && (
              <span className="ml-2 text-[10px] tabular-nums text-muted-foreground">
                Live · {lastPriceUpdate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap" data-testid="nav-quick-links">
          {quickNav.map((item) => (
            <Link key={item.href} href={item.href}>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" data-testid={`nav-link-${item.label.toLowerCase().replace(/\s+/g, "-")}`}>
                <item.icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{item.label}</span>
              </Button>
            </Link>
          ))}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center border-b border-border overflow-x-auto scrollbar-none" style={{ scrollbarWidth: "none" }}>
          {([
            { value: "open", label: "Open", labelFull: "Open Positions", count: openCount, icon: TrendingUp, color: "text-green-400" },
            { value: "closed", label: "Closed", labelFull: "Closed Positions", count: closedCount, icon: TrendingDown, color: "text-muted-foreground" },
            { value: "all", label: "All", labelFull: "All", count: (openCount + closedCount), icon: Briefcase, color: "text-muted-foreground" },
          ] as const).map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-4 py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${
                statusFilter === tab.value
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
              data-testid={`tab-${tab.value}`}
            >
              <tab.icon className={`h-3.5 w-3.5 ${statusFilter === tab.value ? tab.color : ""}`} />
              <span className="hidden sm:inline">{tab.labelFull}</span>
              <span className="sm:hidden">{tab.label}</span>
              <span className={`ml-1 text-xs rounded-full px-1.5 py-0.5 ${
                statusFilter === tab.value
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by ticker..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
            data-testid="input-search"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No positions found"
          description={search || statusFilter !== "all"
            ? "Try adjusting your search or filter."
            : "Your positions will appear here once you send signals."
          }
          testId="empty-positions"
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3" data-testid="grid-positions">
          {filtered.map(signal => {
            const data = (signal.data ?? {}) as Record<string, string>;
            const ticker = data.ticker || "—";
            const isOption = data.is_option === "true";
            const optionType = data.option_type || "";
            const strike = data.strike || "";
            const expiration = data.expiration || "";
            const direction = data.direction || "Long";
            const instrumentType = data.instrument_type || (isOption ? "Options" : "Shares");
            const entryPrice = parseFloat(data.entry_price || data.option_price || "0");
            const isOpen = signal.status === "open";
            const tracking = data.trade_tracking || "Manual";
            const livePriceKey = isOption && data.expiration && data.strike && data.option_type
              ? `opt:${ticker}:${data.expiration}:${data.strike}:${data.option_type}`
              : `stock:${ticker}`;
            const liveMarkPrice = isOpen && ticker !== "—" ? livePrices[livePriceKey] : undefined;
            const markPrice = isOpen
              ? (liveMarkPrice ?? null)
              : (signal.closePrice ? parseFloat(signal.closePrice) : null);
            const pnlPct = markPrice ? getPnlPct(entryPrice, markPrice, direction) : 0;
            const realizedPnl = !isOpen && signal.closePrice ? getPnlPct(entryPrice, parseFloat(signal.closePrice), direction) : 0;
            const tradeType = data.trade_type || "—";

            let contractLine = "";
            if (isOption) {
              contractLine = `${optionType} ${strike} — ${expiration}`;
            } else if (instrumentType === "Crypto") {
              contractLine = "Crypto";
            } else {
              contractLine = instrumentType || "Shares";
            }

            return (
              <div
                key={signal.id}
                className="rounded-lg border border-border bg-card overflow-hidden hover:border-border/80 transition-colors"
                data-testid={`card-position-${signal.id}`}
              >
                <div className="px-4 py-3 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-base" data-testid={`text-ticker-${signal.id}`}>{ticker}</span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${isOpen
                          ? "bg-green-500/10 text-green-400 border-green-500/30"
                          : "bg-muted text-muted-foreground border-border"
                        }`}
                        data-testid={`badge-status-${signal.id}`}
                      >
                        {isOpen ? "Open" : "Closed"}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px]">
                        {tracking === "Automatic" ? "Auto" : "Manual"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{contractLine}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div
                      className={`text-lg font-bold ${
                        markPrice
                          ? pnlPct >= 0 ? "text-green-400" : "text-red-400"
                          : "text-muted-foreground"
                      }`}
                      data-testid={`text-pnl-${signal.id}`}
                    >
                      {markPrice
                        ? `${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(1)}%`
                        : "—"
                      }
                    </div>
                    <div className="text-[10px] text-muted-foreground uppercase">P/L</div>
                  </div>
                </div>

                <div className="px-4 pb-3">
                  <div className="grid grid-cols-3 gap-3 py-2 border-t border-border">
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase font-medium">Entry</div>
                      <div className="text-sm font-semibold mt-0.5" data-testid={`text-entry-${signal.id}`}>
                        {entryPrice > 0 ? `$${entryPrice.toFixed(2)}` : "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase font-medium flex items-center gap-1">
                        Mark
                        {isOpen && markPrice && (
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" title="Live price" />
                        )}
                      </div>
                      <div className="text-sm font-semibold mt-0.5" data-testid={`text-mark-${signal.id}`}>
                        {markPrice ? `$${markPrice.toFixed(2)}` : "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase font-medium">Realized</div>
                      <div
                        className={`text-sm font-semibold mt-0.5 ${
                          !isOpen && markPrice
                            ? realizedPnl >= 0 ? "text-green-400" : "text-red-400"
                            : "text-muted-foreground"
                        }`}
                        data-testid={`text-realized-pnl-${signal.id}`}
                      >
                        {!isOpen && markPrice
                          ? `${realizedPnl >= 0 ? "+" : ""}${realizedPnl.toFixed(1)}%`
                          : "—"
                        }
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 py-2 border-t border-border">
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase font-medium">Type</div>
                      <div className="text-xs mt-0.5">{tradeType}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase font-medium">Direction</div>
                      <div className="text-xs mt-0.5">{isOption ? optionType : direction}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase font-medium">Opened</div>
                      <div className="text-xs mt-0.5" data-testid={`text-opened-${signal.id}`}>
                        {signal.createdAt ? format(new Date(signal.createdAt), "MMM dd") : "—"}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-border">
                    {isOpen ? (
                      tracking === "Automatic" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-8 flex-1"
                          onClick={() => handleSwitchToManual(signal)}
                          data-testid={`button-switch-manual-${signal.id}`}
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Switch to Manual
                        </Button>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-8 flex-1"
                            onClick={() => openExitDialog(signal, true)}
                            data-testid={`button-partial-exit-${signal.id}`}
                          >
                            Partial Exit
                          </Button>
                          <Button
                            size="sm"
                            variant="default"
                            className="text-xs h-8 flex-1"
                            onClick={() => openExitDialog(signal, false)}
                            data-testid={`button-full-exit-${signal.id}`}
                          >
                            Full Exit
                          </Button>
                        </>
                      )
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-8 flex-1"
                        onClick={() => handleReopen(signal)}
                        data-testid={`button-reopen-${signal.id}`}
                      >
                        Reopen
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!closeDialog} onOpenChange={(open) => { if (!open) resetDialog(); }}>
        <DialogContent className="max-w-lg w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="text-close-dialog-title">
              {isPartialExit ? "Partial Exit (Take Profit)" : "Full Exit"}
            </DialogTitle>
          </DialogHeader>

          {isPartialExit && closeDialog ? (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">Current Price</Label>
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <Input
                      type="number"
                      step="0.01"
                      value={closePrice}
                      onChange={(e) => setClosePrice(e.target.value)}
                      disabled={!useManualPrice}
                      className="text-sm"
                      data-testid="input-close-price"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={useManualPrice}
                      onCheckedChange={(v) => {
                        setUseManualPrice(v);
                        if (!v && livePrice) {
                          setClosePrice(livePrice.toString());
                        }
                      }}
                      data-testid="switch-manual-price"
                    />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">Use Manual Price</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">Discord Preview</Label>
                <PartialExitPreview signal={closeDialog} currentPrice={currentPriceNum} />
              </div>

              <DialogFooter className="flex justify-between sm:justify-between gap-2 pt-2">
                <div className="flex gap-2">
                  <Button variant="outline" onClick={resetDialog} data-testid="button-cancel-close">
                    Cancel
                  </Button>
                </div>
                <Button
                  onClick={handleClose}
                  disabled={isSubmitting}
                  data-testid="button-confirm-close"
                >
                  {isSubmitting ? "Processing..." : "Partial Exit"}
                </Button>
              </DialogFooter>
            </div>
          ) : closeDialog ? (
            <div className="space-y-4 py-2">
              <div className="flex flex-wrap gap-2">
                {(["take_profit", "stop_loss", "trailing_stop"] as FullExitReason[]).map((r) => {
                  const labels: Record<FullExitReason, string> = {
                    take_profit: "Take Profit",
                    stop_loss: "Stop Loss",
                    trailing_stop: "Trailing Stop",
                  };
                  return (
                    <button
                      key={r}
                      onClick={() => setFullExitReason(r)}
                      className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium border transition-colors ${
                        fullExitReason === r
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
                      }`}
                      data-testid={`button-exit-reason-${r}`}
                    >
                      <span className={`w-2 h-2 rounded-full ${fullExitReason === r ? "bg-green-400" : "bg-muted-foreground/50"}`} />
                      {labels[r]}
                    </button>
                  );
                })}
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">Current Price</Label>
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <Input
                      type="number"
                      step="0.01"
                      value={closePrice}
                      onChange={(e) => setClosePrice(e.target.value)}
                      disabled={!useManualPrice}
                      className="text-sm"
                      data-testid="input-close-price"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={useManualPrice}
                      onCheckedChange={(v) => {
                        setUseManualPrice(v);
                        if (!v && livePrice) {
                          setClosePrice(livePrice.toString());
                        }
                      }}
                      data-testid="switch-manual-price"
                    />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">Use Manual Price</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">Discord Preview</Label>
                <FullExitPreview signal={closeDialog} currentPrice={currentPriceNum} reason={fullExitReason} />
              </div>

              <DialogFooter className="flex justify-between sm:justify-between gap-2 pt-2">
                <Button variant="outline" onClick={resetDialog} data-testid="button-cancel-close">
                  Cancel
                </Button>
                <Button
                  onClick={handleClose}
                  disabled={isSubmitting}
                  data-testid="button-confirm-close"
                >
                  {isSubmitting ? "Processing..." : "Full Exit"}
                </Button>
              </DialogFooter>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
