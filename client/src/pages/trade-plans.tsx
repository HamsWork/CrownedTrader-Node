import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useTradePlans, useCreateTradePlan, useUpdateTradePlan, useDeleteTradePlan } from "@/hooks/use-signals";
import { useAuth } from "@/hooks/use-auth";
import { Plus, Trash2, Info, Save, ClipboardList, Send } from "lucide-react";
import { useLocation } from "wouter";
import type { TradePlan, TakeProfitLevel } from "@shared/schema";
import {
  TakeProfitLevelForm,
  TARGET_TYPES,
  RAISE_SL_OPTIONS,
  TRAILING_STOP_OPTIONS,
  DEFAULT_LEVELS_SYMBOL,
  DEFAULT_LEVELS_UNDERLYING,
  computePrice,
} from "@/components/take-profit-level-form";

function PlanPreview({
  levels,
  stopLossPct,
  targetType,
}: {
  levels: TakeProfitLevel[];
  stopLossPct: string;
  targetType: string;
}) {
  const isUnderlying = targetType === "Underlying Price Based";
  const ep = 5;
  const underlyingEntry = 180;
  const slPctVal = parseFloat(stopLossPct) || 10;
  const targetsStr = levels
    .map((l, i) => isUnderlying ? `TP${i + 1}: $${l.levelPct.toFixed(2)}` : `TP${i + 1}: ${l.levelPct.toFixed(2)}%`)
    .join(", ");

  const slParts: string[] = [];
  if (isUnderlying) {
    slParts.push(`$${parseFloat(stopLossPct).toFixed(2)}`);
    levels.forEach((l) => {
      if (l.raiseStopLossTo === "Break even") {
        slParts.push(`$${underlyingEntry.toFixed(2)}`);
      } else if (l.raiseStopLossTo === "Custom Level" && l.customRaiseSLValue) {
        slParts.push(`$${parseFloat(l.customRaiseSLValue).toFixed(2)}`);
      }
    });
  } else {
    slParts.push(`$${(ep * (1 - slPctVal / 100)).toFixed(2)} (-${slPctVal.toFixed(2)}%)`);
    levels.forEach((l) => {
      if (l.raiseStopLossTo === "Break even") {
        slParts.push(`$${ep.toFixed(2)} (0.00%)`);
      } else if (l.raiseStopLossTo === "Custom Level" && l.customRaiseSLValue) {
        const customPrice = (ep * (1 + parseFloat(l.customRaiseSLValue || "0") / 100)).toFixed(2);
        slParts.push(`$${customPrice} (+${l.customRaiseSLValue}%)`);
      }
    });
  }
  const stopLossStr = slParts.join(", ");

  return (
    <div className="rounded-md border border-border bg-muted/30 p-3 text-xs space-y-2">
      <p className="font-semibold flex items-center gap-1.5">
        <span>📋</span> Trade Plan
      </p>
      <p>
        <span>🎯</span> Targets: {targetsStr}
      </p>
      <p>
        <span>🔴</span> Stop Loss: {stopLossStr}
      </p>

      <p className="font-semibold flex items-center gap-1.5 pt-1">
        <span>🔥</span> Take Profit Plan
      </p>
      {levels.map((l, i) => {
        const levelLabel = isUnderlying ? `$${l.levelPct.toFixed(2)}` : `${l.levelPct.toFixed(2)}%`;
        let desc = `At ${levelLabel} take off ${l.takeOffPct.toFixed(2)}% of `;
        desc += i === 0 ? "position" : "remaining position";
        if (l.raiseStopLossTo === "Break even") {
          desc += isUnderlying
            ? ` and raise stop loss to $${underlyingEntry.toFixed(2)} (break even)`
            : " and raise stop loss to break even";
        } else if (l.raiseStopLossTo === "Custom Level" && l.customRaiseSLValue) {
          desc += isUnderlying
            ? ` and raise stop loss to $${l.customRaiseSLValue}`
            : ` and raise stop loss to +${l.customRaiseSLValue}%`;
        }
        if (l.trailingStop === "On") {
          desc += l.trailingStopPct ? ` with ${l.trailingStopPct}% trailing stop` : " with trailing stop";
        }
        desc += ".";
        return (
          <p key={i} className="text-[#dbdee1] leading-relaxed" data-testid={`text-tp-desc-${i}`}>
            <strong>Take Profit ({i + 1}):</strong> {desc}
          </p>
        );
      })}
    </div>
  );
}

function PlanCard({
  plan,
  onEdit,
  onRemove,
  onSetDefault,
  onUseToPost,
}: {
  plan: TradePlan;
  onEdit: () => void;
  onRemove: () => void;
  onSetDefault: () => void;
  onUseToPost: () => void;
}) {
  return (
    <Card className="flex flex-col" data-testid={`card-plan-${plan.id}`}>
      <CardContent className="pt-5 flex-1 flex flex-col">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-base" data-testid={`text-plan-name-${plan.id}`}>
              {plan.name}
            </h3>
            {plan.isDefault && (
              <Badge variant="outline" className="text-[10px]" data-testid={`badge-default-${plan.id}`}>
                Default
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-red-500 hover:text-red-400 hover:bg-red-500/10 h-7 gap-1"
            onClick={onRemove}
            data-testid={`button-remove-plan-${plan.id}`}
          >
            <Trash2 className="h-3 w-3" />
            Remove
          </Button>
        </div>

        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-muted-foreground">Trade Plan Type</span>
          <span className="text-xs font-medium">{plan.targetType}</span>
        </div>

        <div className="flex-1 mb-4">
          <PlanPreview
            levels={plan.takeProfitLevels}
            stopLossPct={plan.stopLossPct}
            targetType={plan.targetType}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
          {plan.isDefault ? (
            <Button variant="outline" size="sm" className="text-xs" disabled data-testid={`button-default-${plan.id}`}>
              Default
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={onSetDefault}
              data-testid={`button-set-default-${plan.id}`}
            >
              Set as default
            </Button>
          )}
          <Button variant="outline" size="sm" className="text-xs" onClick={onUseToPost} data-testid={`button-use-plan-${plan.id}`}>
            <Send className="h-3 w-3 mr-1" />
            Use to post
          </Button>
          <Button variant="default" size="sm" className="text-xs" onClick={onEdit} data-testid={`button-edit-plan-${plan.id}`}>
            Edit
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function CreateNewCard({ onClick }: { onClick: () => void }) {
  return (
    <Card
      className="flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors min-h-[200px] sm:min-h-[300px]"
      onClick={onClick}
      data-testid="card-create-new-plan"
    >
      <CardContent className="flex flex-col items-center justify-center text-center py-12">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/40 mb-4">
          <Plus className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="font-bold text-base mb-1">Create New Trade Plan</h3>
        <p className="text-xs text-muted-foreground max-w-[200px]">
          Build another preset for a different strategy or trade type.
        </p>
      </CardContent>
    </Card>
  );
}

function PlanFormModal({
  open,
  onOpenChange,
  editingPlan,
  userId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingPlan: TradePlan | null;
  userId: number;
}) {
  const createPlan = useCreateTradePlan();
  const updatePlan = useUpdateTradePlan();
  const { toast } = useToast();

  const [name, setName] = useState(editingPlan?.name || "");
  const [targetType, setTargetType] = useState(editingPlan?.targetType || "Symbol Price Based");
  const [stopLossPct, setStopLossPct] = useState(editingPlan?.stopLossPct ? parseFloat(editingPlan.stopLossPct).toFixed(2) : "10.00");
  const [localSlPrice, setLocalSlPrice] = useState("");
  const [isSlPriceEditing, setIsSlPriceEditing] = useState(false);
  const defaultLevels = editingPlan?.takeProfitLevels?.length
    ? editingPlan.takeProfitLevels
    : (editingPlan?.targetType === "Underlying Price Based" ? [...DEFAULT_LEVELS_UNDERLYING] : [...DEFAULT_LEVELS_SYMBOL]);
  const [levels, setLevels] = useState<TakeProfitLevel[]>(defaultLevels);
  const ep = 5;
  const underlyingEntry = 180;

  function handleTargetTypeChange(newType: string) {
    const wasUnderlying = targetType === "Underlying Price Based";
    const isNowUnderlying = newType === "Underlying Price Based";
    setTargetType(newType);
    if (wasUnderlying !== isNowUnderlying) {
      if (isNowUnderlying) {
        setLevels([...DEFAULT_LEVELS_UNDERLYING]);
        setStopLossPct("175.00");
      } else {
        setLevels([...DEFAULT_LEVELS_SYMBOL]);
        setStopLossPct("10.00");
      }
    }
  }
  const slPct = parseFloat(stopLossPct) || 10;

  function handleLevelChange(index: number, updated: TakeProfitLevel) {
    setLevels((prev) => prev.map((l, i) => (i === index ? updated : l)));
  }

  function addLevel() {
    const lastPct = levels.length > 0 ? levels[levels.length - 1].levelPct : 0;
    const increment = targetType === "Underlying Price Based" ? 5 : 10;
    setLevels((prev) => [
      ...prev,
      { levelPct: lastPct + increment, takeOffPct: 50, raiseStopLossTo: "Off", customRaiseSLValue: "", trailingStop: "Off", trailingStopPct: "" },
    ]);
  }

  function removeLevel(index: number) {
    setLevels((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    if (!name.trim()) {
      toast({ title: "Plan name is required", variant: "destructive" });
      return;
    }
    const payload = {
      name: name.trim(),
      targetType,
      stopLossPct,
      takeProfitLevels: levels,
      isDefault: editingPlan?.isDefault || false,
    };

    try {
      if (editingPlan) {
        await updatePlan.mutateAsync({ id: editingPlan.id, data: payload });
        toast({ title: "Trade plan updated" });
      } else {
        await createPlan.mutateAsync({ ...payload, userId });
        toast({ title: "Trade plan created" });
      }
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to save", variant: "destructive" });
    }
  }

  const isUnderlying = targetType === "Underlying Price Based";
  const computedSlPrice = isUnderlying ? stopLossPct : (ep * (1 - slPct / 100)).toFixed(2);
  const slPrice = isSlPriceEditing ? localSlPrice : computedSlPrice;

  useEffect(() => {
    if (!isSlPriceEditing) {
      setLocalSlPrice(computedSlPrice);
    }
  }, [computedSlPrice, isSlPriceEditing]);
  const targetsStr = isUnderlying
    ? levels.map((l) => `$${l.levelPct.toFixed(2)}`).join(", ")
    : levels.map((l) => `$${computePrice(ep, l.levelPct)} (+${l.levelPct.toFixed(2)}%)`).join(", ");

  const modalSlParts: string[] = [];
  if (isUnderlying) {
    modalSlParts.push(`$${parseFloat(stopLossPct).toFixed(2)}`);
    levels.forEach((l) => {
      if (l.raiseStopLossTo === "Break even") {
        modalSlParts.push(`$${underlyingEntry.toFixed(2)}`);
      } else if (l.raiseStopLossTo === "Custom Level" && l.customRaiseSLValue) {
        modalSlParts.push(`$${parseFloat(l.customRaiseSLValue).toFixed(2)}`);
      }
    });
  } else {
    modalSlParts.push(`$${computedSlPrice} (-${slPct.toFixed(2)}%)`);
    levels.forEach((l) => {
      if (l.raiseStopLossTo === "Break even") {
        modalSlParts.push(`$${ep.toFixed(2)} (0.00%)`);
      } else if (l.raiseStopLossTo === "Custom Level" && l.customRaiseSLValue) {
        const customPrice = (ep * (1 + parseFloat(l.customRaiseSLValue || "0") / 100)).toFixed(2);
        modalSlParts.push(`$${customPrice} (+${l.customRaiseSLValue}%)`);
      }
    });
  }
  const modalStopLossStr = modalSlParts.join(", ");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] sm:w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle data-testid="text-modal-title">
            {editingPlan ? "Edit Trade Plan" : "New Trade Plan"}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Create or edit your Trade Plan presets and confirm how they will look in the Live Preview.
          </p>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-4 sm:gap-6 mt-4 items-start">
          <div className="space-y-4 sm:space-y-5">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/20">
                <ClipboardList className="h-4 w-4 text-amber-400" />
              </div>
              <h2 className="font-bold text-base">Trade Plan</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-2">
                <Label className="font-semibold text-sm">Plan Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. My Scalp Plan"
                  data-testid="input-plan-name"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-semibold text-sm">Trade Plan Type</Label>
                <Select value={targetType} onValueChange={handleTargetTypeChange}>
                  <SelectTrigger data-testid="select-target-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TARGET_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {targetType === "Underlying Price Based" && (
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {`Default prices based on $${underlyingEntry} entry`}
                  </p>
                )}
                {targetType === "Symbol Price Based" && (
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Default preview based on $5.00 entry
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <p className="font-semibold text-sm">Take Profit Levels</p>
              <Button variant="outline" size="sm" onClick={addLevel} data-testid="button-add-tp">
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Take Profit
              </Button>
            </div>

            <div className="space-y-4">
              {levels.map((level, i) => (
                <TakeProfitLevelForm
                  key={i}
                  index={i}
                  level={level}
                  entryPrice={ep}
                  canRemove={i > 0}
                  isUnderlyingBased={targetType === "Underlying Price Based"}
                  defaultCustomSLValue={
                    targetType === "Underlying Price Based"
                      ? (i === 0 ? underlyingEntry.toFixed(2) : levels[i - 1].levelPct.toFixed(2))
                      : (i === 0 ? "0" : levels[i - 1].levelPct.toFixed(2))
                  }
                  onChange={(updated) => handleLevelChange(i, updated)}
                  onRemove={() => removeLevel(i)}
                />
              ))}
            </div>

            <div className="rounded-lg border border-border p-3 sm:p-4 space-y-3 sm:space-y-4" data-testid="section-stop-loss">
              <h4 className="font-semibold text-sm">Stop Loss</h4>
              {targetType === "Underlying Price Based" ? (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Underlying Price</Label>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground shrink-0">$</span>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={stopLossPct}
                      onChange={(e) => setStopLossPct(e.target.value)}
                      onBlur={() => {
                        const val = parseFloat(stopLossPct) || 0;
                        setStopLossPct(val.toFixed(2));
                      }}
                      className="text-sm"
                      data-testid="input-stop-loss-pct"
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
                        value={stopLossPct}
                        onChange={(e) => setStopLossPct(e.target.value)}
                        onBlur={() => {
                          const val = parseFloat(stopLossPct) || 0;
                          setStopLossPct(val.toFixed(2));
                        }}
                        className="text-sm"
                        data-testid="input-stop-loss-pct"
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
                        value={slPrice}
                        onFocus={() => setIsSlPriceEditing(true)}
                        onChange={(e) => setLocalSlPrice(e.target.value)}
                        onBlur={() => {
                          setIsSlPriceEditing(false);
                          const newPrice = parseFloat(localSlPrice) || 0;
                          const newPct = ep > 0 ? ((ep - newPrice) / ep) * 100 : 0;
                          setStopLossPct(Math.max(0, parseFloat(newPct.toFixed(2))).toFixed(2));
                        }}
                        className="text-sm"
                        data-testid="input-stop-loss-price"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={handleSave}
              disabled={createPlan.isPending || updatePlan.isPending}
              data-testid="button-save-plan"
            >
              <Save className="h-4 w-4 mr-2" />
              {createPlan.isPending || updatePlan.isPending
                ? "Saving..."
                : editingPlan
                ? "Save Changes"
                : "Create Trade Plan"}
            </Button>
          </div>

          <div className="lg:sticky lg:top-0">
            <Card data-testid="card-modal-preview">
              <CardContent className="pt-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-500/20">
                    <span className="text-sm">🔮</span>
                  </div>
                  <h2 className="font-bold text-sm">Live Preview</h2>
                </div>

                <div className="rounded-lg bg-[#1a1d23] border border-[#2a2d35] overflow-hidden">
                  <div className="p-3 space-y-3 text-xs text-[#dcddde]">
                    <div>
                      <p className="font-bold text-white flex items-center gap-1.5">
                        <span>📋</span> Trade Plan
                      </p>
                      <p className="mt-1">
                        <span>🎯</span> Targets: {targetsStr || "—"}
                      </p>
                      <p>
                        <span>🔴</span> Stop Loss: {modalStopLossStr}
                      </p>
                    </div>

                    <div>
                      <p className="font-bold text-white flex items-center gap-1.5">
                        <span>🔥</span> Take Profit Plan
                      </p>
                      {levels.map((l, i) => {
                        const levelLabel = isUnderlying ? `$${l.levelPct.toFixed(2)}` : `${l.levelPct.toFixed(2)}%`;
                        let desc = `At ${levelLabel} take off ${l.takeOffPct.toFixed(2)}% of `;
                        desc += i === 0 ? "position" : "remaining position";
                        if (l.raiseStopLossTo === "Break even") {
                          desc += isUnderlying
                            ? ` and raise stop loss to $${underlyingEntry.toFixed(2)} (break even)`
                            : " and raise stop loss to break even";
                        } else if (l.raiseStopLossTo === "Custom Level" && l.customRaiseSLValue) {
                          desc += isUnderlying
                            ? ` and raise stop loss to $${l.customRaiseSLValue}`
                            : ` and raise stop loss to +${l.customRaiseSLValue}%`;
                        }
                        if (l.trailingStop === "On") {
                          desc += l.trailingStopPct ? ` with ${l.trailingStopPct}% trailing stop` : " with trailing stop";
                        }
                        desc += ".";
                        return (
                          <p key={i} className="text-[#dbdee1] leading-relaxed mt-0.5">
                            <strong>Take Profit ({i + 1}):</strong> {desc}
                          </p>
                        );
                      })}
                    </div>

                    <p className="text-[10px] text-[#72767d] italic">
                      Disclaimer: Not financial advice. Trade at your own risk.
                    </p>
                  </div>

                  <div className="bg-[#12141a] border-t border-[#2a2d35] px-3 py-2 flex items-start gap-2">
                    <div className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-500/30 shrink-0 mt-0.5">
                      <Info className="h-2.5 w-2.5 text-amber-400" />
                    </div>
                    <p className="text-[10px] text-[#72767d]">
                      This is how your signal will appear in Discord. Update the form to see changes in real-time.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function TradePlansPage() {
  const { data: currentUser } = useAuth();
  const { data: plans, isLoading } = useTradePlans();
  const updatePlan = useUpdateTradePlan();
  const deletePlan = useDeleteTradePlan();
  const { toast } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<TradePlan | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [, setLocation] = useLocation();

  function openCreate() {
    setEditingPlan(null);
    setModalOpen(true);
  }

  function openEdit(plan: TradePlan) {
    setEditingPlan(plan);
    setModalOpen(true);
  }

  async function handleSetDefault(planId: number) {
    if (!plans) return;
    try {
      for (const p of plans) {
        await updatePlan.mutateAsync({ id: p.id, data: { isDefault: p.id === planId } });
      }
      toast({ title: "Default plan updated" });
    } catch {
      toast({ title: "Failed to update default plan", variant: "destructive" });
    }
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
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-80" />
          ))}
        </div>
      </div>
    );
  }

  const planCount = plans?.length || 0;

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div>
        <p className="text-muted-foreground text-sm">
          Manage your default plan and your custom trade plan presets.
        </p>
        <div className="flex items-center gap-3 mt-3">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight" data-testid="text-page-title">
            Your trade plans
          </h1>
          <Badge variant="outline" className="text-xs" data-testid="badge-plan-count">
            {planCount} Total
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
        {(plans || []).map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            onEdit={() => openEdit(plan)}
            onRemove={() => setDeleteId(plan.id)}
            onSetDefault={() => handleSetDefault(plan.id)}
            onUseToPost={() => setLocation("/send-signal")}
          />
        ))}
        <CreateNewCard onClick={openCreate} />
      </div>

      {modalOpen && currentUser && (
        <PlanFormModal
          key={editingPlan ? `edit-${editingPlan.id}` : "create"}
          open={modalOpen}
          onOpenChange={(open) => {
            setModalOpen(open);
            if (!open) setEditingPlan(null);
          }}
          editingPlan={editingPlan}
          userId={currentUser.id}
        />
      )}

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Trade Plan</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this trade plan? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
