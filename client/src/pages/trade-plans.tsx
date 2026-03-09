import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useTradePlans, useCreateTradePlan, useUpdateTradePlan, useDeleteTradePlan } from "@/hooks/use-signals";
import { useAuth } from "@/hooks/use-auth";
import { ClipboardList, Plus, Trash2, Info, Save, ChevronDown, ChevronUp } from "lucide-react";
import type { TradePlan, TakeProfitLevel } from "@shared/schema";

const TARGET_TYPES = ["% based (Option)", "% based (Shares)", "$ based"];
const RAISE_SL_OPTIONS = ["Off", "Break even (entry)", "+5%", "+10%", "Trail"];
const TRAILING_STOP_OPTIONS = ["Off", "5%", "10%", "15%", "20%"];

const DEFAULT_LEVELS: TakeProfitLevel[] = [
  { levelPct: 10, takeOffPct: 50, raiseStopLossTo: "Break even (entry)", trailingStop: "Off" },
  { levelPct: 20, takeOffPct: 50, raiseStopLossTo: "Off", trailingStop: "Off" },
  { levelPct: 30, takeOffPct: 50, raiseStopLossTo: "Off", trailingStop: "Off" },
];

function computePrice(entryPrice: number, levelPct: number) {
  return (entryPrice * (1 + levelPct / 100)).toFixed(2);
}

function LivePreview({
  levels,
  stopLossPct,
  entryPrice,
}: {
  levels: TakeProfitLevel[];
  stopLossPct: number;
  entryPrice: number;
}) {
  const slPrice = (entryPrice * (1 - stopLossPct / 100)).toFixed(2);

  const targetsStr = levels
    .map((l) => `$${computePrice(entryPrice, l.levelPct)} (+${l.levelPct.toFixed(1)}%)`)
    .join(", ");

  const stopLossParts = [`${slPrice}(-${stopLossPct}%)`];
  const firstRaiseSL = levels.find((l) => l.raiseStopLossTo === "Break even (entry)");
  if (firstRaiseSL) {
    stopLossParts.push(`${entryPrice.toFixed(2)}(+0%)`);
  }

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
            <p className="font-bold text-white flex items-center gap-1.5">
              <span>🔺</span> Trade Alert
            </p>

            <div>
              <p className="font-bold text-white flex items-center gap-1.5">
                <span>📋</span> Trade Plan
              </p>
              <p className="mt-1">
                <span>🎯</span> Targets: {targetsStr || "—"}
              </p>
              <p>
                <span>🔴</span> Stop Loss: {stopLossParts.join(", ")}
              </p>
            </div>

            <div>
              <p className="font-bold text-white flex items-center gap-1.5">
                <span>🔥</span> Take Profit Plan
              </p>
              {levels.map((l, i) => {
                let desc = `At ${l.levelPct.toFixed(1)}% take off ${l.takeOffPct.toFixed(1)}% of `;
                if (i === 0) {
                  desc += "position";
                  if (l.raiseStopLossTo === "Break even (entry)") {
                    desc += " and raise stop loss to break even";
                  }
                } else {
                  desc += "remaining position";
                }
                desc += ".";
                return (
                  <p key={i} className="text-xs mt-1 leading-relaxed" data-testid={`text-tp-plan-${i}`}>
                    Take Profit ({i + 1}): {desc}
                  </p>
                );
              })}
            </div>

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

function TakeProfitLevelForm({
  index,
  level,
  entryPrice,
  canRemove,
  onChange,
  onRemove,
}: {
  index: number;
  level: TakeProfitLevel;
  entryPrice: number;
  canRemove: boolean;
  onChange: (updated: TakeProfitLevel) => void;
  onRemove: () => void;
}) {
  const price = computePrice(entryPrice, level.levelPct);

  return (
    <div className="rounded-lg border border-border p-4 space-y-4" data-testid={`tp-level-${index}`}>
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm">Take Profit {index + 1}</h4>
        {canRemove && (
          <button
            className="text-xs text-red-500 hover:text-red-400 flex items-center gap-1"
            onClick={onRemove}
            data-testid={`button-remove-tp-${index}`}
          >
            <Trash2 className="h-3 w-3" />
            Remove
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Level %</Label>
          <div className="flex items-center gap-1">
            <Input
              type="number"
              step="1"
              value={level.levelPct}
              onChange={(e) => onChange({ ...level, levelPct: parseFloat(e.target.value) || 0 })}
              className="text-sm"
              data-testid={`input-level-pct-${index}`}
            />
            <span className="text-xs text-muted-foreground shrink-0">%</span>
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Price</Label>
          <Input
            type="text"
            value={price}
            readOnly
            className="text-sm bg-muted/50"
            data-testid={`input-price-${index}`}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Take Off</Label>
          <div className="flex items-center gap-1">
            <Input
              type="number"
              step="1"
              value={level.takeOffPct}
              onChange={(e) => onChange({ ...level, takeOffPct: parseFloat(e.target.value) || 0 })}
              className="text-sm"
              data-testid={`input-takeoff-${index}`}
            />
            <span className="text-xs text-muted-foreground shrink-0">%</span>
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Raise stop loss to:</Label>
        <Select
          value={level.raiseStopLossTo}
          onValueChange={(v) => onChange({ ...level, raiseStopLossTo: v })}
        >
          <SelectTrigger className="text-sm" data-testid={`select-raise-sl-${index}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RAISE_SL_OPTIONS.map((opt) => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Trailing Stop:</Label>
        <Select
          value={level.trailingStop}
          onValueChange={(v) => onChange({ ...level, trailingStop: v })}
        >
          <SelectTrigger className="text-sm" data-testid={`select-trailing-stop-${index}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TRAILING_STOP_OPTIONS.map((opt) => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export default function TradePlansPage() {
  const { data: currentUser } = useAuth();
  const { data: plans, isLoading } = useTradePlans();
  const createPlan = useCreateTradePlan();
  const updatePlan = useUpdateTradePlan();
  const deletePlan = useDeleteTradePlan();
  const { toast } = useToast();

  const [selectedPlanId, setSelectedPlanId] = useState<number | "new">("new");
  const [name, setName] = useState("Default Plan");
  const [targetType, setTargetType] = useState("% based (Option)");
  const [stopLossPct, setStopLossPct] = useState("10");
  const [levels, setLevels] = useState<TakeProfitLevel[]>(DEFAULT_LEVELS);
  const [entryPrice, setEntryPrice] = useState("5.00");
  const [showSavedPlans, setShowSavedPlans] = useState(false);

  useEffect(() => {
    if (plans && plans.length > 0 && selectedPlanId === "new") {
      loadPlan(plans[0]);
    }
  }, [plans]);

  function loadPlan(plan: TradePlan) {
    setSelectedPlanId(plan.id);
    setName(plan.name);
    setTargetType(plan.targetType);
    setStopLossPct(plan.stopLossPct);
    setLevels(plan.takeProfitLevels.length > 0 ? plan.takeProfitLevels : DEFAULT_LEVELS);
  }

  function resetToNew() {
    setSelectedPlanId("new");
    setName("Default Plan");
    setTargetType("% based (Option)");
    setStopLossPct("10");
    setLevels(DEFAULT_LEVELS);
  }

  function handleLevelChange(index: number, updated: TakeProfitLevel) {
    setLevels((prev) => prev.map((l, i) => (i === index ? updated : l)));
  }

  function addLevel() {
    const lastPct = levels.length > 0 ? levels[levels.length - 1].levelPct : 0;
    setLevels((prev) => [
      ...prev,
      { levelPct: lastPct + 10, takeOffPct: 50, raiseStopLossTo: "Off", trailingStop: "Off" },
    ]);
  }

  function removeLevel(index: number) {
    setLevels((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    if (!currentUser) return;
    const payload = {
      name,
      targetType,
      stopLossPct,
      takeProfitLevels: levels,
      isDefault: false,
    };

    try {
      if (selectedPlanId === "new") {
        const created = await createPlan.mutateAsync({
          ...payload,
          userId: currentUser.id,
        });
        setSelectedPlanId(created.id);
        toast({ title: "Trade plan created" });
      } else {
        await updatePlan.mutateAsync({ id: selectedPlanId, data: payload });
        toast({ title: "Trade plan updated" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to save", variant: "destructive" });
    }
  }

  async function handleDelete(id: number) {
    try {
      await deletePlan.mutateAsync(id);
      toast({ title: "Trade plan deleted" });
      resetToNew();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  }

  const ep = parseFloat(entryPrice) || 5;
  const slPct = parseFloat(stopLossPct) || 10;

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">
          {selectedPlanId === "new" ? "New Trade Plan" : "Edit Trade Plan"}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Create or edit your Trade Plan presets and confirm how they will look in the Live Preview.
        </p>
      </div>

      {plans && plans.length > 0 && (
        <div className="space-y-2">
          <button
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setShowSavedPlans(!showSavedPlans)}
            data-testid="button-toggle-saved"
          >
            {showSavedPlans ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            Saved Plans ({plans.length})
          </button>
          {showSavedPlans && (
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedPlanId === "new" ? "default" : "outline"}
                size="sm"
                onClick={resetToNew}
                data-testid="button-new-plan"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                New Plan
              </Button>
              {plans.map((p) => (
                <div key={p.id} className="flex items-center gap-1">
                  <Button
                    variant={selectedPlanId === p.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => loadPlan(p)}
                    data-testid={`button-load-plan-${p.id}`}
                  >
                    {p.name}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-red-500"
                    onClick={() => handleDelete(p.id)}
                    data-testid={`button-delete-plan-${p.id}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6 items-start">
        <Card data-testid="card-trade-plan-form">
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 mb-5">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-500/20">
                <ClipboardList className="h-4 w-4 text-blue-400" />
              </div>
              <h2 className="font-bold text-lg">Trade Plan</h2>
            </div>

            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-semibold text-sm">Plan Name</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Default Plan"
                    data-testid="input-plan-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold text-sm">Preview Entry Price</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={entryPrice}
                    onChange={(e) => setEntryPrice(e.target.value)}
                    data-testid="input-entry-price"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-semibold text-sm">Stop Loss %</Label>
                  <Input
                    type="number"
                    step="1"
                    value={stopLossPct}
                    onChange={(e) => setStopLossPct(e.target.value)}
                    data-testid="input-stop-loss-pct"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold text-sm">Target Type</Label>
                  <Select value={targetType} onValueChange={setTargetType}>
                    <SelectTrigger data-testid="select-target-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TARGET_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                    canRemove={levels.length > 1}
                    onChange={(updated) => handleLevelChange(i, updated)}
                    onRemove={() => removeLevel(i)}
                  />
                ))}
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
                  : selectedPlanId === "new"
                  ? "Create Trade Plan"
                  : "Save Changes"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="lg:sticky lg:top-6">
          <LivePreview levels={levels} stopLossPct={slPct} entryPrice={ep} />
        </div>
      </div>
    </div>
  );
}
