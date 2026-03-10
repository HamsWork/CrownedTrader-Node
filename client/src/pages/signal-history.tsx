import { useState } from "react";
import { useSignals } from "@/hooks/use-signals";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { History, Search, CheckCircle, XCircle, ChevronDown, ChevronUp, Copy, FileText, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { Signal } from "@shared/schema";

function getSignalFields(signal: Signal) {
  const data = (signal.data ?? {}) as Record<string, string>;
  const ticker = data.ticker || "—";
  const isOption = data.is_option === "true";
  const optionType = data.option_type || "";
  const strike = data.strike || "";
  const expiration = data.expiration || "";
  const direction = data.direction || "Long";
  const instrumentType = data.instrument_type || (isOption ? "Options" : "Shares");
  const tradeType = data.trade_type || "Scalp";
  const entryPrice = parseFloat(data.entry_price || data.option_price || "0");
  const stockPrice = data.stock_price || "";
  const stopLoss = data.stop_loss_pct || "";
  const targetType = data.target_type || "";
  const sentToDiscord = signal.sentToDiscord;
  const createdAt = signal.createdAt ? new Date(signal.createdAt) : new Date();
  const tracking = data.trade_tracking || "Manual";

  let stopPrice = "";
  if (stopLoss && entryPrice > 0) {
    const slPct = parseFloat(stopLoss);
    if (isOption) {
      stopPrice = (entryPrice * (1 - slPct / 100)).toFixed(2);
    } else {
      stopPrice = (entryPrice * (1 - slPct / 100)).toFixed(2);
    }
  }

  return {
    ticker,
    isOption,
    optionType,
    strike,
    expiration,
    direction,
    instrumentType,
    tradeType,
    entryPrice,
    stockPrice,
    stopLoss,
    stopPrice,
    targetType,
    sentToDiscord,
    createdAt,
    tracking,
    data,
  };
}

function SignalCard({ signal }: { signal: Signal }) {
  const [expanded, setExpanded] = useState(false);
  const { toast } = useToast();
  const f = getSignalFields(signal);
  const isLong = f.direction === "Long";
  const dirIcon = isLong ? ArrowUpRight : ArrowDownRight;
  const DirIcon = dirIcon;

  const triggerPrice = f.stockPrice ? `$${parseFloat(f.stockPrice).toFixed(2)}` : `$${f.entryPrice.toFixed(2)}`;

  let contractSummary = "";
  if (f.isOption) {
    contractSummary = `${f.ticker} ${f.optionType === "CALL" ? "Call" : "Put"} $${f.strike} ${f.expiration}`;
  } else if (f.instrumentType === "LETF") {
    contractSummary = `${f.ticker} shares`;
  } else if (f.instrumentType === "Crypto") {
    contractSummary = `${f.ticker} crypto`;
  } else {
    contractSummary = `${f.ticker} shares`;
  }

  let targetLabel = "";
  if (f.targetType) {
    targetLabel = f.targetType.toLowerCase().includes("stock") || f.targetType.toLowerCase().includes("underlying")
      ? "stock-price levels"
      : "symbol-price levels";
  }

  function handleCopy() {
    const payload = JSON.stringify(signal.data, null, 2);
    navigator.clipboard.writeText(payload);
    toast({ title: "Copied to clipboard" });
  }

  return (
    <div
      className="rounded-lg border border-border bg-card overflow-hidden"
      data-testid={`card-signal-${signal.id}`}
    >
      <div className="px-4 py-3 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1">
              {f.sentToDiscord ? (
                <CheckCircle className="h-4 w-4 text-green-400" />
              ) : (
                <XCircle className="h-4 w-4 text-red-400" />
              )}
              <DirIcon className="h-4 w-4 text-muted-foreground" />
            </div>
            <span className="font-bold text-sm" data-testid={`text-ticker-${signal.id}`}>{f.ticker}</span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 bg-muted/50 text-muted-foreground border-border">
              {f.tradeType === "Scalp" ? "breakout" : f.tradeType === "Swing" ? "breakdown" : f.tradeType.toLowerCase()}
            </Badge>
            <Badge
              className={`text-[10px] px-2 py-0 h-5 font-bold ${
                isLong
                  ? "bg-green-600 text-white border-green-600"
                  : "bg-red-600 text-white border-red-600"
              }`}
            >
              {f.direction.toUpperCase()}
            </Badge>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 bg-muted/50 text-muted-foreground border-border">
              entry
            </Badge>
            {f.instrumentType !== "Options" && f.instrumentType !== "Shares" && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 bg-purple-500/20 text-purple-400 border-purple-500/30">
                {f.instrumentType}
              </Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground whitespace-nowrap" data-testid={`text-time-${signal.id}`}>
            {format(f.createdAt, "hh:mm:ss a")}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 bg-purple-500/10 text-purple-400 border-purple-500/30">
            {f.isOption ? (f.instrumentType === "LETF Option" ? "LETF Option" : "Options") : f.instrumentType}
          </Badge>
          <Badge
            variant="outline"
            className={`text-[10px] px-1.5 py-0 h-5 ${
              f.sentToDiscord
                ? "bg-green-500/10 text-green-400 border-green-500/30"
                : "bg-red-500/10 text-red-400 border-red-500/30"
            }`}
          >
            HTTP {f.sentToDiscord ? "201" : "—"}
          </Badge>
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs">
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 bg-green-500/10 text-green-400 border-green-500/30">
            {f.isOption
              ? `${f.ticker}  ${f.optionType === "CALL" ? "Call" : "Put"}  $${f.strike}  ${f.expiration}`
              : f.ticker
            }
          </Badge>
          {targetLabel && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 bg-muted/50 text-muted-foreground border-border">
              {targetLabel}
            </Badge>
          )}
          {f.sentToDiscord && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 bg-green-500/10 text-green-400 border-green-500/30">
              verified
            </Badge>
          )}
          <span className="text-muted-foreground ml-auto text-[11px]">{contractSummary}</span>
        </div>

        <div className="flex items-center gap-6 text-sm">
          <div>
            <span className="text-muted-foreground">Trigger </span>
            <span className="font-bold">{triggerPrice}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Entry </span>
            <span className="font-bold">${f.entryPrice > 0 ? f.entryPrice.toFixed(2) : "—"}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Stop </span>
            <span className="font-bold text-red-400">${f.stopPrice || "—"}</span>
          </div>
        </div>
      </div>

      <div className="border-t border-border px-4 py-2 flex items-center justify-between bg-muted/10">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          data-testid={`button-toggle-payload-${signal.id}`}
        >
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          Show Raw Payload
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            data-testid={`button-copy-${signal.id}`}
          >
            <Copy className="h-3 w-3" />
            Copy
          </button>
          <button
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            data-testid={`button-preview-${signal.id}`}
          >
            <FileText className="h-3 w-3" />
            Discord Preview
          </button>
          <span className="text-xs text-muted-foreground" data-testid={`text-date-${signal.id}`}>
            {format(f.createdAt, "MMM dd, yyyy")}
          </span>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border px-4 py-3 bg-muted/20">
          <pre className="text-xs font-mono text-muted-foreground overflow-x-auto whitespace-pre-wrap" data-testid={`text-payload-${signal.id}`}>
            {JSON.stringify(signal.data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export default function SignalHistory() {
  const { data: signals, isLoading } = useSignals();
  const [search, setSearch] = useState("");

  const allSignals = signals ?? [];
  const totalSent = allSignals.length;
  const successCount = allSignals.filter(s => s.sentToDiscord).length;
  const failedCount = totalSent - successCount;

  const filtered = allSignals.filter(signal => {
    const f = getSignalFields(signal);
    return !search ||
      f.ticker.toLowerCase().includes(search.toLowerCase()) ||
      f.instrumentType.toLowerCase().includes(search.toLowerCase()) ||
      f.direction.toLowerCase().includes(search.toLowerCase());
  });

  const sorted = [...filtered].sort((a, b) => {
    const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return db - da;
  });

  const grouped: Record<string, Signal[]> = {};
  for (const signal of sorted) {
    const dateKey = signal.createdAt
      ? format(new Date(signal.createdAt), "MM/dd/yyyy")
      : "Unknown";
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(signal);
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">
            Signal History
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Complete log of all trading signals
          </p>
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

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-border bg-card text-center py-4">
          <div className="text-3xl font-bold" data-testid="text-total-sent">{totalSent}</div>
          <div className="text-xs text-muted-foreground mt-1">Total Sent</div>
        </div>
        <div className="rounded-lg border border-border bg-card text-center py-4">
          <div className="text-3xl font-bold text-green-400" data-testid="text-success-count">{successCount}</div>
          <div className="text-xs text-muted-foreground mt-1">Success</div>
        </div>
        <div className="rounded-lg border border-border bg-card text-center py-4">
          <div className="text-3xl font-bold text-red-400" data-testid="text-failed-count">{failedCount}</div>
          <div className="text-xs text-muted-foreground mt-1">Failed</div>
        </div>
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          icon={History}
          title="No signals found"
          description={search
            ? "Try adjusting your search."
            : "Your signal history will appear here once you send signals."
          }
          testId="empty-signals"
        />
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([dateKey, dateSignals]) => {
            const okCount = dateSignals.filter(s => s.sentToDiscord).length;
            return (
              <div key={dateKey} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold" data-testid={`text-date-group-${dateKey}`}>{dateKey}</h3>
                  <span className="text-xs text-muted-foreground">
                    <span className="text-green-400">{okCount} ok</span>{" "}
                    {dateSignals.length} total
                  </span>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {dateSignals.map(signal => (
                    <SignalCard key={signal.id} signal={signal} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
