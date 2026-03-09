import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useTradePlans, useUpdateTradePlan, useDeleteTradePlan } from "@/hooks/use-signals";
import { EmptyState } from "@/components/empty-state";
import {
  Target,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  Trash2,
  ClipboardList,
} from "lucide-react";
import type { TradePlan } from "@shared/schema";

type StatusFilter = "all" | "active" | "closed" | "stopped";

function getStatusColor(plan: TradePlan) {
  if (plan.status === "closed" || plan.stopLossHit) return "destructive";
  if (plan.tp3Hit) return "default";
  if (plan.tp2Hit || plan.tp1Hit) return "default";
  return "secondary";
}

function getStatusLabel(plan: TradePlan) {
  if (plan.stopLossHit) return "Stopped Out";
  if (plan.status === "closed") return "Closed";
  if (plan.tp3Hit) return "TP3 Hit";
  if (plan.tp2Hit) return "TP2 Hit";
  if (plan.tp1Hit) return "TP1 Hit";
  return "Active";
}

function getPnlColor(pnl: string | null) {
  if (!pnl) return "text-muted-foreground";
  const val = parseFloat(pnl);
  if (val > 0) return "text-green-500";
  if (val < 0) return "text-red-500";
  return "text-muted-foreground";
}

function TargetDot({ hit, label }: { hit: boolean; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div
        className={`h-2.5 w-2.5 rounded-full ${
          hit ? "bg-green-500" : "bg-muted-foreground/30"
        }`}
        data-testid={`dot-${label.toLowerCase()}`}
      />
      <span className={`text-xs ${hit ? "text-green-500 font-semibold" : "text-muted-foreground"}`}>
        {label}
      </span>
    </div>
  );
}

function TradePlanCard({
  plan,
  onToggleTarget,
  onClose,
  onDelete,
}: {
  plan: TradePlan;
  onToggleTarget: (planId: number, target: string, value: boolean) => void;
  onClose: (planId: number) => void;
  onDelete: (planId: number) => void;
}) {
  const entry = parseFloat(plan.entryPrice) || 0;
  const isActive = plan.status === "active" && !plan.stopLossHit;

  return (
    <Card
      className={`transition-all hover:shadow-md ${
        !isActive ? "opacity-75" : ""
      }`}
      data-testid={`card-trade-plan-${plan.id}`}
    >
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
              <span className="font-bold text-sm text-primary">{plan.ticker.slice(0, 4)}</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base truncate" data-testid={`text-ticker-${plan.id}`}>
                  {plan.ticker}
                </h3>
                <Badge variant={getStatusColor(plan)} className="text-[10px] shrink-0" data-testid={`badge-status-${plan.id}`}>
                  {getStatusLabel(plan)}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                <span>{plan.tradeType}</span>
                <span>·</span>
                <span>{plan.isShares ? "Shares" : `${plan.optionType} Option`}</span>
                {!plan.isShares && plan.expiration && (
                  <>
                    <span>·</span>
                    <span>Exp {plan.expiration}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="text-right shrink-0">
            <p className="text-xs text-muted-foreground">Entry</p>
            <p className="font-bold text-sm" data-testid={`text-entry-${plan.id}`}>${entry.toFixed(2)}</p>
          </div>
        </div>

        {!plan.isShares && plan.strike && (
          <div className="grid grid-cols-3 gap-2 mb-3 px-2 py-2 rounded-md bg-muted/50 text-xs">
            <div>
              <span className="text-muted-foreground">Strike</span>
              <p className="font-medium">{plan.strike}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Exp</span>
              <p className="font-medium">{plan.expiration || "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Stock</span>
              <p className="font-medium">${plan.stockPrice || "—"}</p>
            </div>
          </div>
        )}

        <div className="space-y-2 mb-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Targets</p>
          <div className="grid grid-cols-3 gap-2">
            <button
              className={`rounded-md border p-2 text-center text-xs transition-colors ${
                plan.tp1Hit
                  ? "border-green-500/50 bg-green-500/10"
                  : "border-border hover:border-green-500/30"
              } ${isActive ? "cursor-pointer" : "cursor-default"}`}
              onClick={() => isActive && onToggleTarget(plan.id, "tp1Hit", !plan.tp1Hit)}
              disabled={!isActive}
              data-testid={`button-tp1-${plan.id}`}
            >
              <TargetDot hit={plan.tp1Hit} label="TP1" />
              <p className="font-semibold mt-1">${plan.tp1Target || "—"}</p>
              <p className="text-muted-foreground">+{plan.tp1Pct}%</p>
            </button>
            <button
              className={`rounded-md border p-2 text-center text-xs transition-colors ${
                plan.tp2Hit
                  ? "border-green-500/50 bg-green-500/10"
                  : "border-border hover:border-green-500/30"
              } ${isActive ? "cursor-pointer" : "cursor-default"}`}
              onClick={() => isActive && onToggleTarget(plan.id, "tp2Hit", !plan.tp2Hit)}
              disabled={!isActive}
              data-testid={`button-tp2-${plan.id}`}
            >
              <TargetDot hit={plan.tp2Hit} label="TP2" />
              <p className="font-semibold mt-1">${plan.tp2Target || "—"}</p>
              <p className="text-muted-foreground">+{plan.tp2Pct}%</p>
            </button>
            <button
              className={`rounded-md border p-2 text-center text-xs transition-colors ${
                plan.tp3Hit
                  ? "border-green-500/50 bg-green-500/10"
                  : "border-border hover:border-green-500/30"
              } ${isActive ? "cursor-pointer" : "cursor-default"}`}
              onClick={() => isActive && onToggleTarget(plan.id, "tp3Hit", !plan.tp3Hit)}
              disabled={!isActive}
              data-testid={`button-tp3-${plan.id}`}
            >
              <TargetDot hit={plan.tp3Hit} label="TP3" />
              <p className="font-semibold mt-1">${plan.tp3Target || "—"}</p>
              <p className="text-muted-foreground">+{plan.tp3Pct}%</p>
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between px-2 py-2 rounded-md bg-muted/50 mb-3">
          <div className="flex items-center gap-1.5 text-xs">
            <XCircle className="h-3.5 w-3.5 text-red-500" />
            <span className="text-muted-foreground">Stop Loss:</span>
            <span className="font-semibold text-red-500">-{plan.stopLossPct}%</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">
              {new Date(plan.createdAt).toLocaleDateString()}
            </span>
          </div>
          {plan.pnl && (
            <div className="flex items-center gap-1.5 text-xs">
              {parseFloat(plan.pnl) >= 0 ? (
                <TrendingUp className="h-3.5 w-3.5 text-green-500" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5 text-red-500" />
              )}
              <span className={`font-semibold ${getPnlColor(plan.pnl)}`}>
                {parseFloat(plan.pnl) >= 0 ? "+" : ""}{plan.pnl}%
              </span>
            </div>
          )}
        </div>

        {isActive && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10"
              onClick={() => onToggleTarget(plan.id, "stopLossHit", true)}
              data-testid={`button-stop-loss-${plan.id}`}
            >
              <XCircle className="h-3.5 w-3.5 mr-1" />
              Stop Loss Hit
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              onClick={() => onClose(plan.id)}
              data-testid={`button-close-trade-${plan.id}`}
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
              Close Trade
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-red-500"
              onClick={() => onDelete(plan.id)}
              data-testid={`button-delete-plan-${plan.id}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        {!isActive && (
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-red-500"
              onClick={() => onDelete(plan.id)}
              data-testid={`button-delete-plan-${plan.id}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function TradePlansPage() {
  const { data: plans, isLoading } = useTradePlans();
  const updatePlan = useUpdateTradePlan();
  const deletePlan = useDeleteTradePlan();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const filteredPlans = (plans || []).filter(p => {
    if (search && !p.ticker.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter === "active" && (p.status !== "active" || p.stopLossHit)) return false;
    if (statusFilter === "closed" && p.status !== "closed") return false;
    if (statusFilter === "stopped" && !p.stopLossHit) return false;
    return true;
  });

  const activeCount = (plans || []).filter(p => p.status === "active" && !p.stopLossHit).length;
  const closedCount = (plans || []).filter(p => p.status === "closed").length;
  const stoppedCount = (plans || []).filter(p => p.stopLossHit).length;

  function handleToggleTarget(planId: number, target: string, value: boolean) {
    updatePlan.mutate(
      { id: planId, data: { [target]: value } as any },
      {
        onSuccess: () => {
          toast({ title: `${target.replace("Hit", "")} ${value ? "marked as hit" : "unmarked"}` });
        },
      }
    );
  }

  function handleCloseTrade(planId: number) {
    updatePlan.mutate(
      { id: planId, data: { status: "closed" } as any },
      {
        onSuccess: () => {
          toast({ title: "Trade closed" });
        },
      }
    );
  }

  function handleConfirmDelete() {
    if (deleteId === null) return;
    deletePlan.mutate(deleteId, {
      onSuccess: () => {
        toast({ title: "Trade plan deleted" });
        setDeleteId(null);
      },
    });
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">
            Trade Plans
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track and manage your active trade positions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs" data-testid="badge-active-count">
            {activeCount} Active
          </Badge>
          <Badge variant="outline" className="text-xs" data-testid="badge-closed-count">
            {closedCount} Closed
          </Badge>
          <Badge variant="outline" className="text-xs text-red-500" data-testid="badge-stopped-count">
            {stoppedCount} Stopped
          </Badge>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by ticker..."
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
            data-testid="input-search-plans"
          />
        </div>
        <Select value={statusFilter} onValueChange={v => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="w-[160px]" data-testid="select-status-filter">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Plans</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
            <SelectItem value="stopped">Stopped Out</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredPlans.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={plans?.length === 0 ? "No trade plans yet" : "No matching plans"}
          description={
            plans?.length === 0
              ? "Trade plans are created when you send a signal. Head to Send Signal to get started."
              : "Try adjusting your search or filter."
          }
          testId="empty-trade-plans"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredPlans.map(plan => (
            <TradePlanCard
              key={plan.id}
              plan={plan}
              onToggleTarget={handleToggleTarget}
              onClose={handleCloseTrade}
              onDelete={setDeleteId}
            />
          ))}
        </div>
      )}

      <AlertDialog open={deleteId !== null} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Trade Plan</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this trade plan? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
