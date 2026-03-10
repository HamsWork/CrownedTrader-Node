import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import type { TakeProfitLevel } from "@shared/schema";

export const RAISE_SL_OPTIONS = ["Off", "Break even", "Custom Level"];
export const TRAILING_STOP_OPTIONS = ["Off", "On"];
export const TARGET_TYPES = ["Symbol Price Based", "Underlying Price Based"];

export const DEFAULT_LEVELS_SYMBOL: TakeProfitLevel[] = [
  { levelPct: 10, takeOffPct: 50, raiseStopLossTo: "Break even", customRaiseSLValue: "", trailingStop: "Off", trailingStopPct: "" },
  { levelPct: 20, takeOffPct: 50, raiseStopLossTo: "Off", customRaiseSLValue: "", trailingStop: "Off", trailingStopPct: "" },
  { levelPct: 30, takeOffPct: 50, raiseStopLossTo: "Off", customRaiseSLValue: "", trailingStop: "Off", trailingStopPct: "" },
];

export const DEFAULT_LEVELS_UNDERLYING: TakeProfitLevel[] = [
  { levelPct: 185, takeOffPct: 50, raiseStopLossTo: "Break even", customRaiseSLValue: "", trailingStop: "Off", trailingStopPct: "" },
  { levelPct: 190, takeOffPct: 50, raiseStopLossTo: "Off", customRaiseSLValue: "", trailingStop: "Off", trailingStopPct: "" },
  { levelPct: 195, takeOffPct: 50, raiseStopLossTo: "Off", customRaiseSLValue: "", trailingStop: "Off", trailingStopPct: "" },
];

export function computePrice(entryPrice: number, levelPct: number) {
  return (entryPrice * (1 + levelPct / 100)).toFixed(2);
}

export function TakeProfitLevelForm({
  index,
  level,
  entryPrice,
  canRemove,
  isUnderlyingBased,
  defaultCustomSLValue,
  onChange,
  onRemove,
  showPrice = true,
}: {
  index: number;
  level: TakeProfitLevel;
  entryPrice: number;
  canRemove: boolean;
  isUnderlyingBased: boolean;
  defaultCustomSLValue: string;
  onChange: (updated: TakeProfitLevel) => void;
  onRemove: () => void;
  showPrice?: boolean;
}) {
  const computedPriceVal = computePrice(entryPrice, level.levelPct);
  const [localPrice, setLocalPrice] = useState(computedPriceVal);
  const [isPriceEditing, setIsPriceEditing] = useState(false);
  const [localLevelPct, setLocalLevelPct] = useState(level.levelPct.toFixed(2));
  const [isLevelPctEditing, setIsLevelPctEditing] = useState(false);
  const [localTakeOff, setLocalTakeOff] = useState(level.takeOffPct.toFixed(2));
  const [isTakeOffEditing, setIsTakeOffEditing] = useState(false);

  useEffect(() => {
    if (!isPriceEditing) {
      setLocalPrice(computedPriceVal);
    }
  }, [computedPriceVal, isPriceEditing]);

  useEffect(() => {
    if (!isLevelPctEditing) {
      setLocalLevelPct(level.levelPct.toFixed(2));
    }
  }, [level.levelPct, isLevelPctEditing]);

  useEffect(() => {
    if (!isTakeOffEditing) {
      setLocalTakeOff(level.takeOffPct.toFixed(2));
    }
  }, [level.takeOffPct, isTakeOffEditing]);

  return (
    <div className="rounded-lg border border-border p-3 sm:p-4 space-y-3 sm:space-y-4" data-testid={`tp-level-${index}`}>
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

      {isUnderlyingBased ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Underlying Price</Label>
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground shrink-0">$</span>
              <Input
                type="text"
                inputMode="decimal"
                value={localLevelPct}
                onFocus={() => setIsLevelPctEditing(true)}
                onChange={(e) => setLocalLevelPct(e.target.value)}
                onBlur={() => {
                  setIsLevelPctEditing(false);
                  const val = parseFloat(localLevelPct) || 0;
                  onChange({ ...level, levelPct: val });
                }}
                className="text-sm"
                data-testid={`input-level-pct-${index}`}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Take Off</Label>
            <div className="flex items-center gap-1">
              <Input
                type="text"
                inputMode="decimal"
                value={localTakeOff}
                onFocus={() => setIsTakeOffEditing(true)}
                onChange={(e) => setLocalTakeOff(e.target.value)}
                onBlur={() => {
                  setIsTakeOffEditing(false);
                  const val = parseFloat(localTakeOff) || 0;
                  onChange({ ...level, takeOffPct: val });
                }}
                className="text-sm"
                data-testid={`input-takeoff-${index}`}
              />
              <span className="text-xs text-muted-foreground shrink-0">%</span>
            </div>
          </div>
        </div>
      ) : (
        <div className={`grid gap-3 ${showPrice ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2"}`}>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Level %</Label>
            <div className="flex items-center gap-1">
              <Input
                type="text"
                inputMode="decimal"
                value={localLevelPct}
                onFocus={() => setIsLevelPctEditing(true)}
                onChange={(e) => setLocalLevelPct(e.target.value)}
                onBlur={() => {
                  setIsLevelPctEditing(false);
                  const val = parseFloat(localLevelPct) || 0;
                  onChange({ ...level, levelPct: val });
                }}
                className="text-sm"
                data-testid={`input-level-pct-${index}`}
              />
              <span className="text-xs text-muted-foreground shrink-0">%</span>
            </div>
          </div>
          {showPrice && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Price</Label>
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground shrink-0">$</span>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={localPrice}
                  onFocus={() => setIsPriceEditing(true)}
                  onChange={(e) => setLocalPrice(e.target.value)}
                  onBlur={() => {
                    setIsPriceEditing(false);
                    const newPrice = parseFloat(localPrice) || 0;
                    const newPct = entryPrice > 0 ? ((newPrice - entryPrice) / entryPrice) * 100 : 0;
                    onChange({ ...level, levelPct: parseFloat(newPct.toFixed(2)) });
                  }}
                  className="text-sm"
                  data-testid={`input-price-${index}`}
                />
              </div>
            </div>
          )}
          <div className={`space-y-1 ${showPrice ? "col-span-2 sm:col-span-1" : ""}`}>
            <Label className="text-xs text-muted-foreground">Take Off</Label>
            <div className="flex items-center gap-1">
              <Input
                type="text"
                inputMode="decimal"
                value={localTakeOff}
                onFocus={() => setIsTakeOffEditing(true)}
                onChange={(e) => setLocalTakeOff(e.target.value)}
                onBlur={() => {
                  setIsTakeOffEditing(false);
                  const val = parseFloat(localTakeOff) || 0;
                  onChange({ ...level, takeOffPct: val });
                }}
                className="text-sm"
                data-testid={`input-takeoff-${index}`}
              />
              <span className="text-xs text-muted-foreground shrink-0">%</span>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-border p-3 space-y-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Raise stop loss to:</Label>
          <Select
            value={level.raiseStopLossTo}
            onValueChange={(v) => onChange({ ...level, raiseStopLossTo: v, customRaiseSLValue: v === "Custom Level" ? (level.customRaiseSLValue || defaultCustomSLValue) : "" })}
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

        {level.raiseStopLossTo === "Custom Level" && (
          isUnderlyingBased ? (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Underlying Price</Label>
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground shrink-0">$</span>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={level.customRaiseSLValue || ""}
                  onChange={(e) => onChange({ ...level, customRaiseSLValue: e.target.value })}
                  placeholder="e.g. 182"
                  className="text-sm"
                  data-testid={`input-custom-sl-price-${index}`}
                />
              </div>
            </div>
          ) : (
            <div className={`grid gap-3 ${showPrice ? "grid-cols-2" : "grid-cols-1"}`}>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Level %</Label>
                <div className="flex items-center gap-1">
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={level.customRaiseSLValue || ""}
                    onChange={(e) => onChange({ ...level, customRaiseSLValue: e.target.value })}
                    placeholder="e.g. 5"
                    className="text-sm"
                    data-testid={`input-custom-sl-pct-${index}`}
                  />
                  <span className="text-xs text-muted-foreground shrink-0">%</span>
                </div>
              </div>
              {showPrice && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Price</Label>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground shrink-0">$</span>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={level.customRaiseSLValue
                        ? (entryPrice * (1 + parseFloat(level.customRaiseSLValue || "0") / 100)).toFixed(2)
                        : ""}
                      onChange={(e) => {
                        const newPrice = parseFloat(e.target.value) || 0;
                        const newPct = entryPrice > 0 ? ((newPrice - entryPrice) / entryPrice) * 100 : 0;
                        onChange({ ...level, customRaiseSLValue: newPct.toFixed(2) });
                      }}
                      className="text-sm"
                      data-testid={`input-custom-sl-price-${index}`}
                    />
                  </div>
                </div>
              )}
            </div>
          )
        )}

        <div className="border-t border-border" />

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Trailing Stop:</Label>
          <Select
            value={level.trailingStop}
            onValueChange={(v) => onChange({ ...level, trailingStop: v, trailingStopPct: v === "On" ? (level.trailingStopPct || "5") : "" })}
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

        {level.trailingStop === "On" && (
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Trailing Stop Percent</Label>
            <div className="flex items-center gap-1">
              <Input
                type="text"
                inputMode="decimal"
                value={level.trailingStopPct || ""}
                onChange={(e) => onChange({ ...level, trailingStopPct: e.target.value })}
                placeholder="e.g. 5"
                className="text-sm"
                data-testid={`input-trailing-stop-pct-${index}`}
              />
              <span className="text-xs text-muted-foreground shrink-0">%</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
