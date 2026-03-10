import { useState } from "react";
import { useSignals, useSignalTypes } from "@/hooks/use-signals";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Briefcase, Search, X, CheckCircle, XCircle, Clock, DollarSign, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import type { Signal, SignalType } from "@shared/schema";

function getPnl(entry: number, close: number, direction: string): { pct: number; dollar: number } {
  if (!entry || !close) return { pct: 0, dollar: 0 };
  const diff = direction === "Short" ? entry - close : close - entry;
  return { pct: (diff / entry) * 100, dollar: diff };
}

function PositionCard({
  signal,
  signalType,
  onClose,
  onReopen,
}: {
  signal: Signal;
  signalType?: SignalType;
  onClose: (s: Signal) => void;
  onReopen: (s: Signal) => void;
}) {
  const data = (signal.data ?? {}) as Record<string, string>;
  const color = signalType?.color ?? "#3B82F6";
  const ticker = data.ticker || "—";
  const entryPrice = parseFloat(data.entry_price || data.option_price || "0");
  const isOption = data.is_option === "true";
  const direction = data.direction || "Long";
  const tradeType = data.trade_type || "Scalp";
  const optionType = data.option_type || "";
  const strike = data.strike || "";
  const expiration = data.expiration || "";
  const stopLoss = data.stop_loss_pct || "";
  const isOpen = signal.status === "open";
  const closePrice = signal.closePrice ? parseFloat(signal.closePrice) : null;
  const pnl = closePrice ? getPnl(entryPrice, closePrice, direction) : null;

  return (
    <Card
      className={`transition-all ${isOpen ? "border-l-4" : "opacity-75"}`}
      style={isOpen ? { borderLeftColor: color } : {}}
      data-testid={`card-position-${signal.id}`}
    >
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-base" data-testid={`text-ticker-${signal.id}`}>{ticker}</span>
          <Badge
            variant={isOpen ? "default" : "secondary"}
            className={isOpen ? "bg-green-500/20 text-green-400 hover:bg-green-500/20" : "bg-muted text-muted-foreground"}
            data-testid={`badge-status-${signal.id}`}
          >
            {isOpen ? "Open" : "Closed"}
          </Badge>
          <Badge variant="outline" data-testid={`badge-type-${signal.id}`}>
            {tradeType}
          </Badge>
          {isOption && (
            <Badge variant="outline" className="text-blue-400 border-blue-400/30">
              {optionType} {strike} {expiration}
            </Badge>
          )}
          {!isOption && (
            <Badge variant="outline" className="text-purple-400 border-purple-400/30">
              {data.instrument_type === "Crypto" ? "Crypto" : "Shares"} {direction}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {signal.sentToDiscord ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : signal.discordChannelName ? (
            <XCircle className="h-4 w-4 text-red-500" />
          ) : (
            <Clock className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="text-xs text-muted-foreground">
            {signal.createdAt
              ? formatDistanceToNow(new Date(signal.createdAt), { addSuffix: true })
              : "just now"}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-md bg-muted/50 border border-border px-3 py-2">
            <p className="text-xs text-muted-foreground font-medium">Entry Price</p>
            <p className="text-sm font-semibold text-green-400" data-testid={`text-entry-${signal.id}`}>
              {entryPrice > 0 ? `$${entryPrice.toFixed(2)}` : "—"}
            </p>
          </div>
          <div className="rounded-md bg-muted/50 border border-border px-3 py-2">
            <p className="text-xs text-muted-foreground font-medium">Stop Loss</p>
            <p className="text-sm font-semibold text-red-400" data-testid={`text-sl-${signal.id}`}>
              {stopLoss ? `-${stopLoss}%` : "—"}
            </p>
          </div>
          {closePrice !== null && (
            <div className="rounded-md bg-muted/50 border border-border px-3 py-2">
              <p className="text-xs text-muted-foreground font-medium">Close Price</p>
              <p className="text-sm font-semibold" data-testid={`text-close-${signal.id}`}>
                ${closePrice.toFixed(2)}
              </p>
            </div>
          )}
          {pnl && (
            <div className="rounded-md bg-muted/50 border border-border px-3 py-2">
              <p className="text-xs text-muted-foreground font-medium">P&L</p>
              <div className="flex items-center gap-1">
                {pnl.pct >= 0 ? (
                  <ArrowUpRight className="h-3.5 w-3.5 text-green-400" />
                ) : (
                  <ArrowDownRight className="h-3.5 w-3.5 text-red-400" />
                )}
                <p
                  className={`text-sm font-semibold ${pnl.pct >= 0 ? "text-green-400" : "text-red-400"}`}
                  data-testid={`text-pnl-${signal.id}`}
                >
                  {pnl.pct >= 0 ? "+" : ""}{pnl.pct.toFixed(2)}%
                </p>
              </div>
            </div>
          )}
        </div>

        {data.take_profit_levels && (() => {
          try {
            const levels = JSON.parse(data.take_profit_levels) as Array<{ levelPct: number; takeOffPct: number }>;
            if (levels.length === 0) return null;
            return (
              <div className="rounded-md bg-muted/50 border border-border px-3 py-2">
                <p className="text-xs text-muted-foreground font-medium mb-1">Take Profit Levels</p>
                <div className="flex flex-wrap gap-2">
                  {levels.map((l, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      TP{i + 1}: +{l.levelPct}% ({l.takeOffPct}% off)
                    </Badge>
                  ))}
                </div>
              </div>
            );
          } catch { return null; }
        })()}

        {signal.closeNote && (
          <div className="rounded-md bg-muted/50 border border-border px-3 py-2">
            <p className="text-xs text-muted-foreground font-medium">Close Note</p>
            <p className="text-sm" data-testid={`text-note-${signal.id}`}>{signal.closeNote}</p>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          {isOpen ? (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onClose(signal)}
              data-testid={`button-close-${signal.id}`}
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Close Position
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onReopen(signal)}
              data-testid={`button-reopen-${signal.id}`}
            >
              Reopen
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function PositionManagement() {
  const { data: signals, isLoading: signalsLoading } = useSignals();
  const { data: signalTypes, isLoading: typesLoading } = useSignalTypes();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("open");
  const [closeDialog, setCloseDialog] = useState<Signal | null>(null);
  const [closePrice, setClosePrice] = useState("");
  const [closeNote, setCloseNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const typesMap = new Map(signalTypes?.map(st => [st.id, st]) ?? []);

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
        status: "closed",
        closePrice: closePrice || undefined,
        closeNote: closeNote || undefined,
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/signals"] });
      toast({ title: "Position closed" });
      setCloseDialog(null);
      setClosePrice("");
      setCloseNote("");
    } catch (err: any) {
      toast({ title: "Failed to close position", description: err.message, variant: "destructive" });
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

  if (signalsLoading || typesLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="flex gap-3">
          <Skeleton className="h-9 flex-1" />
          <Skeleton className="h-9 w-48" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
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
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground" data-testid="text-position-count">
            {filtered.length} position{filtered.length !== 1 ? "s" : ""}
          </p>
          {filtered.map(signal => (
            <PositionCard
              key={signal.id}
              signal={signal}
              signalType={typesMap.get(signal.signalTypeId!)}
              onClose={(s) => {
                const data = (s.data ?? {}) as Record<string, string>;
                const entry = data.entry_price || data.option_price || "";
                setClosePrice(entry);
                setCloseDialog(s);
              }}
              onReopen={handleReopen}
            />
          ))}
        </div>
      )}

      <Dialog open={!!closeDialog} onOpenChange={(open) => { if (!open) setCloseDialog(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle data-testid="text-close-dialog-title">Close Position</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Close Price</Label>
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
                placeholder="Reason for closing, observations..."
                value={closeNote}
                onChange={(e) => setCloseNote(e.target.value)}
                rows={3}
                data-testid="input-close-note"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseDialog(null)} data-testid="button-cancel-close">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleClose}
              disabled={isSubmitting}
              data-testid="button-confirm-close"
            >
              {isSubmitting ? "Closing..." : "Close Position"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
