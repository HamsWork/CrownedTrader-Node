import { useState } from "react";
import { useSignals, useSignalTypes } from "@/hooks/use-signals";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Briefcase, Search, DollarSign, TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import type { Signal } from "@shared/schema";

function formatDate(d: Date | string | null) {
  if (!d) return "—";
  return format(new Date(d), "MMM dd, yyyy HH:mm");
}

function getPnlPct(entry: number, mark: number, direction: string): number {
  if (!entry || !mark) return 0;
  const diff = direction === "Short" ? entry - mark : mark - entry;
  return (diff / entry) * 100;
}

export default function PositionManagement() {
  const { data: signals, isLoading: signalsLoading } = useSignals();
  const { data: signalTypes, isLoading: typesLoading } = useSignalTypes();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("open");
  const [closeDialog, setCloseDialog] = useState<Signal | null>(null);
  const [isPartialExit, setIsPartialExit] = useState(false);
  const [closePrice, setClosePrice] = useState("");
  const [closeNote, setCloseNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

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
      setCloseDialog(null);
      setClosePrice("");
      setCloseNote("");
      setIsPartialExit(false);
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
      await apiRequest("PATCH", `/api/signals/${signal.id}/data`, { trade_tracking: "Manual updates" });
      await queryClient.invalidateQueries({ queryKey: ["/api/signals"] });
      toast({ title: "Switched to manual tracking" });
    } catch (err: any) {
      toast({ title: "Failed to switch tracking", description: err.message, variant: "destructive" });
    }
  }

  function openExitDialog(signal: Signal, partial: boolean) {
    const data = (signal.data ?? {}) as Record<string, string>;
    const entry = data.entry_price || data.option_price || "";
    setClosePrice(entry);
    setCloseNote("");
    setIsPartialExit(partial);
    setCloseDialog(signal);
  }

  if (signalsLoading || typesLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="flex gap-3">
          <Skeleton className="h-9 flex-1" />
          <Skeleton className="h-9 w-48" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">
          Position Management
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Track and manage your trading positions
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="rounded-md bg-muted/50 border border-border px-4 py-2 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-green-400" />
          <span className="text-sm font-medium" data-testid="text-open-count">{openCount} Open</span>
        </div>
        <div className="rounded-md bg-muted/50 border border-border px-4 py-2 flex items-center gap-2">
          <TrendingDown className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium" data-testid="text-closed-count">{closedCount} Closed</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search positions by ticker, type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48" data-testid="select-status-filter">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Positions</SelectItem>
            <SelectItem value="open">Open Only</SelectItem>
            <SelectItem value="closed">Closed Only</SelectItem>
          </SelectContent>
        </Select>
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
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="table-positions">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 font-semibold text-xs uppercase text-muted-foreground">Symbol</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs uppercase text-muted-foreground">QTY</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs uppercase text-muted-foreground">Closed</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs uppercase text-muted-foreground">Entry</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs uppercase text-muted-foreground">Mark</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs uppercase text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs uppercase text-muted-foreground">P/L %</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs uppercase text-muted-foreground">Realized P/L %</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs uppercase text-muted-foreground">Opened</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs uppercase text-muted-foreground">Track Mode</th>
                  <th className="text-right px-4 py-3 font-semibold text-xs uppercase text-muted-foreground"></th>
                </tr>
              </thead>
              <tbody>
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
                  const markPrice = signal.closePrice ? parseFloat(signal.closePrice) : null;
                  const isOpen = signal.status === "open";
                  const tracking = data.trade_tracking || "Manual";
                  const pnlPct = markPrice ? getPnlPct(entryPrice, markPrice, direction) : 0;
                  const realizedPnl = !isOpen && markPrice ? getPnlPct(entryPrice, markPrice, direction) : 0;

                  let contractLine = "";
                  if (isOption) {
                    contractLine = `${optionType} ${strike} - ${expiration}`;
                  } else if (instrumentType === "Crypto") {
                    contractLine = "Crypto";
                  } else {
                    contractLine = "Shares";
                  }

                  return (
                    <tr
                      key={signal.id}
                      className="border-b border-border last:border-b-0 hover:bg-muted/20 transition-colors"
                      data-testid={`row-position-${signal.id}`}
                    >
                      <td className="px-4 py-3">
                        <div>
                          <span className="font-bold text-sm" data-testid={`text-ticker-${signal.id}`}>{ticker}</span>
                          <p className="text-xs text-muted-foreground mt-0.5">{contractLine}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm" data-testid={`text-qty-${signal.id}`}>
                        100
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground" data-testid={`text-closed-qty-${signal.id}`}>
                        {isOpen ? "—" : "100"}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium" data-testid={`text-entry-${signal.id}`}>
                        {entryPrice > 0 ? `$${entryPrice.toFixed(2)}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-sm" data-testid={`text-mark-${signal.id}`}>
                        {markPrice ? `$${markPrice.toFixed(2)}` : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className={isOpen
                            ? "bg-green-500/10 text-green-400 border-green-500/30"
                            : "bg-muted text-muted-foreground border-border"
                          }
                          data-testid={`badge-status-${signal.id}`}
                        >
                          {isOpen ? "Opened" : "Closed"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-sm font-medium ${
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
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-sm font-medium ${
                            !isOpen && markPrice
                              ? realizedPnl >= 0 ? "text-green-400" : "text-red-400"
                              : "text-green-400"
                          }`}
                          data-testid={`text-realized-pnl-${signal.id}`}
                        >
                          {!isOpen && markPrice
                            ? `${realizedPnl >= 0 ? "+" : ""}${realizedPnl.toFixed(1)}%`
                            : "+0.0%"
                          }
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap" data-testid={`text-opened-${signal.id}`}>
                        {formatDate(signal.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-sm" data-testid={`text-tracking-${signal.id}`}>
                        {tracking === "Automatic" ? "Auto" : "Manual"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {isOpen ? (
                            tracking === "Automatic" ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-7 px-3"
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
                                  className="text-xs h-7 px-3"
                                  onClick={() => openExitDialog(signal, true)}
                                  data-testid={`button-partial-exit-${signal.id}`}
                                >
                                  Partial Exit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="default"
                                  className="text-xs h-7 px-3"
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
                              className="text-xs h-7 px-3"
                              onClick={() => handleReopen(signal)}
                              data-testid={`button-reopen-${signal.id}`}
                            >
                              Reopen
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={!!closeDialog} onOpenChange={(open) => { if (!open) { setCloseDialog(null); setIsPartialExit(false); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle data-testid="text-close-dialog-title">
              {isPartialExit ? "Partial Exit" : "Full Exit — Close Position"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {closeDialog && (() => {
              const data = (closeDialog.data ?? {}) as Record<string, string>;
              const ticker = data.ticker || "—";
              const isOpt = data.is_option === "true";
              const contractLine = isOpt
                ? `${data.option_type || ""} ${data.strike || ""} - ${data.expiration || ""}`
                : (data.instrument_type === "Crypto" ? "Crypto" : "Shares");
              return (
                <div className="rounded-md bg-muted/50 border border-border px-3 py-2">
                  <span className="font-bold text-sm">{ticker}</span>
                  <span className="text-xs text-muted-foreground ml-2">{contractLine}</span>
                </div>
              );
            })()}
            <div className="space-y-2">
              <Label>Exit Price</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Exit price"
                  value={closePrice}
                  onChange={(e) => setClosePrice(e.target.value)}
                  className="pl-9"
                  data-testid="input-close-price"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Note (optional)</Label>
              <Textarea
                placeholder="Reason for exit, observations..."
                value={closeNote}
                onChange={(e) => setCloseNote(e.target.value)}
                rows={3}
                data-testid="input-close-note"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCloseDialog(null); setIsPartialExit(false); }} data-testid="button-cancel-close">
              Cancel
            </Button>
            <Button
              variant={isPartialExit ? "default" : "destructive"}
              onClick={handleClose}
              disabled={isSubmitting}
              data-testid="button-confirm-close"
            >
              {isSubmitting ? "Processing..." : isPartialExit ? "Record Partial Exit" : "Close Position"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
