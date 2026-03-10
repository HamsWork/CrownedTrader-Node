import { useState } from "react";
import { useSignals } from "@/hooks/use-signals";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { History, Search, TrendingUp, TrendingDown, ArrowUpDown, ChevronUp, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import type { Signal } from "@shared/schema";

type SortKey = "date" | "ticker" | "type" | "entry" | "exit" | "pnl" | "status";
type SortDir = "asc" | "desc";

function getSignalFields(signal: Signal) {
  const data = (signal.data ?? {}) as Record<string, string>;
  const ticker = data.ticker || "—";
  const isOption = data.is_option === "true";
  const optionType = data.option_type || "";
  const strike = data.strike || "";
  const expiration = data.expiration || "";
  const direction = data.direction || "Long";
  const instrumentType = data.instrument_type || (isOption ? "Options" : "Shares");
  const tradeType = data.trade_type || "—";
  const entryPrice = parseFloat(data.entry_price || data.option_price || "0");
  const exitPrice = signal.closePrice ? parseFloat(signal.closePrice) : null;
  const channel = signal.discordChannelName || "—";
  const sentToDiscord = signal.sentToDiscord;
  const status = signal.status || "open";
  const createdAt = signal.createdAt ? new Date(signal.createdAt) : new Date();
  const closedAt = signal.closedAt ? new Date(signal.closedAt) : null;
  const tracking = data.trade_tracking || "Manual";

  let pnlPct = 0;
  if (exitPrice && entryPrice > 0) {
    pnlPct = direction === "Short"
      ? ((entryPrice - exitPrice) / entryPrice) * 100
      : ((exitPrice - entryPrice) / entryPrice) * 100;
  }

  let contractLabel = "";
  if (isOption) {
    contractLabel = `${optionType} $${strike}`;
    if (expiration) contractLabel += ` ${expiration}`;
  } else if (instrumentType === "Crypto") {
    contractLabel = "Crypto";
  } else {
    contractLabel = "Shares";
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
    exitPrice,
    channel,
    sentToDiscord,
    status,
    createdAt,
    closedAt,
    tracking,
    pnlPct,
    contractLabel,
  };
}

export default function SignalHistory() {
  const { data: signals, isLoading } = useSignals();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const allSignals = signals ?? [];
  const openCount = allSignals.filter(s => s.status === "open").length;
  const closedCount = allSignals.filter(s => s.status === "closed").length;

  const filtered = allSignals.filter(signal => {
    const f = getSignalFields(signal);
    const matchesSearch = !search ||
      f.ticker.toLowerCase().includes(search.toLowerCase()) ||
      f.contractLabel.toLowerCase().includes(search.toLowerCase()) ||
      f.channel.toLowerCase().includes(search.toLowerCase()) ||
      f.tradeType.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || f.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const sorted = [...filtered].sort((a, b) => {
    const fa = getSignalFields(a);
    const fb = getSignalFields(b);
    let cmp = 0;
    switch (sortKey) {
      case "date": cmp = fa.createdAt.getTime() - fb.createdAt.getTime(); break;
      case "ticker": cmp = fa.ticker.localeCompare(fb.ticker); break;
      case "type": cmp = fa.contractLabel.localeCompare(fb.contractLabel); break;
      case "entry": cmp = fa.entryPrice - fb.entryPrice; break;
      case "exit": cmp = (fa.exitPrice ?? 0) - (fb.exitPrice ?? 0); break;
      case "pnl": cmp = fa.pnlPct - fb.pnlPct; break;
      case "status": cmp = fa.status.localeCompare(fb.status); break;
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  function SortHeader({ label, colKey, className = "" }: { label: string; colKey: SortKey; className?: string }) {
    const active = sortKey === colKey;
    return (
      <th
        className={`text-left px-4 py-3 font-semibold text-xs uppercase text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors ${className}`}
        onClick={() => toggleSort(colKey)}
        data-testid={`sort-${colKey}`}
      >
        <div className="flex items-center gap-1">
          {label}
          {active ? (
            sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
          ) : (
            <ArrowUpDown className="h-3 w-3 opacity-30" />
          )}
        </div>
      </th>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
        <div className="flex gap-3">
          <Skeleton className="h-10 flex-1" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">
          Signal History
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Complete log of all trading signals sent
        </p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center border-b border-border">
          {([
            { value: "all", label: "All Signals", count: allSignals.length },
            { value: "open", label: "Open", count: openCount },
            { value: "closed", label: "Closed", count: closedCount },
          ] as const).map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                statusFilter === tab.value
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
              data-testid={`tab-${tab.value}`}
            >
              {tab.label}
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
            placeholder="Search by ticker, type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
            data-testid="input-search"
          />
        </div>
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          icon={History}
          title="No signals found"
          description={search || statusFilter !== "all"
            ? "Try adjusting your search or filter."
            : "Your signal history will appear here once you send signals."
          }
          testId="empty-signals"
        />
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="table-signal-history">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <SortHeader label="Date" colKey="date" />
                  <SortHeader label="Ticker" colKey="ticker" />
                  <SortHeader label="Type" colKey="type" />
                  <SortHeader label="Entry" colKey="entry" />
                  <SortHeader label="Exit" colKey="exit" />
                  <SortHeader label="P/L %" colKey="pnl" />
                  <SortHeader label="Status" colKey="status" />
                  <th className="text-left px-4 py-3 font-semibold text-xs uppercase text-muted-foreground">Channel</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs uppercase text-muted-foreground">Discord</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs uppercase text-muted-foreground">Tracking</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(signal => {
                  const f = getSignalFields(signal);
                  return (
                    <tr
                      key={signal.id}
                      className="border-b border-border last:border-b-0 hover:bg-muted/20 transition-colors"
                      data-testid={`row-signal-${signal.id}`}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm" data-testid={`text-date-${signal.id}`}>
                          {format(f.createdAt, "MMM dd, yyyy")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(f.createdAt, "HH:mm:ss")}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-sm" data-testid={`text-ticker-${signal.id}`}>
                          {f.ticker}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm" data-testid={`text-type-${signal.id}`}>
                          {f.contractLabel}
                        </div>
                        <div className="text-xs text-muted-foreground">{f.tradeType}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-sm" data-testid={`text-entry-${signal.id}`}>
                        {f.entryPrice > 0 ? `$${f.entryPrice.toFixed(2)}` : "—"}
                      </td>
                      <td className="px-4 py-3 font-mono text-sm" data-testid={`text-exit-${signal.id}`}>
                        {f.exitPrice !== null ? `$${f.exitPrice.toFixed(2)}` : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {f.exitPrice !== null ? (
                          <div className="flex items-center gap-1">
                            {f.pnlPct >= 0 ? (
                              <TrendingUp className="h-3.5 w-3.5 text-green-400" />
                            ) : (
                              <TrendingDown className="h-3.5 w-3.5 text-red-400" />
                            )}
                            <span
                              className={`text-sm font-medium ${f.pnlPct >= 0 ? "text-green-400" : "text-red-400"}`}
                              data-testid={`text-pnl-${signal.id}`}
                            >
                              {f.pnlPct >= 0 ? "+" : ""}{f.pnlPct.toFixed(2)}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm" data-testid={`text-pnl-${signal.id}`}>—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className={
                            f.status === "open"
                              ? "bg-green-500/10 text-green-400 border-green-500/30"
                              : "bg-muted text-muted-foreground border-border"
                          }
                          data-testid={`badge-status-${signal.id}`}
                        >
                          {f.status === "open" ? "Open" : "Closed"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground" data-testid={`text-channel-${signal.id}`}>
                        {f.channel}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className={
                            f.sentToDiscord
                              ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/30"
                              : "bg-muted text-muted-foreground border-border"
                          }
                          data-testid={`badge-discord-${signal.id}`}
                        >
                          {f.sentToDiscord ? "Sent" : "Not Sent"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm" data-testid={`text-tracking-${signal.id}`}>
                        {f.tracking === "Automatic" ? "Auto" : "Manual"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="bg-muted/20 border-t border-border px-4 py-2.5 flex items-center justify-between">
            <span className="text-xs text-muted-foreground" data-testid="text-signal-count">
              Showing {sorted.length} of {allSignals.length} signals
            </span>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-green-400" />
                {allSignals.filter(s => {
                  const f = getSignalFields(s);
                  return f.exitPrice !== null && f.pnlPct >= 0;
                }).length} Wins
              </span>
              <span className="flex items-center gap-1">
                <TrendingDown className="h-3 w-3 text-red-400" />
                {allSignals.filter(s => {
                  const f = getSignalFields(s);
                  return f.exitPrice !== null && f.pnlPct < 0;
                }).length} Losses
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
