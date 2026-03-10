import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useCreateSignal } from "@/hooks/use-signals";
import { useAuth } from "@/hooks/use-auth";
import { Send, Settings, Rocket, Info } from "lucide-react";

const TRADE_TYPES = ["Scalp", "Swing", "Leap"];
const TRADE_TRACKING = ["Manual updates", "Automatic"];
const OPTION_TYPES = ["CALL", "PUT"];

function getDefaultExpiration() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

interface TradeForm {
  channel: string;
  tradeType: string;
  tradeTracking: string;
  ticker: string;
  isShares: boolean;
  manualContract: boolean;
  optionType: string;
  expiration: string;
  strike: string;
  optionPrice: string;
  stockPrice: string;
  entryPrice: string;
  stopLossPct: string;
  tp1Pct: string;
  tp2Pct: string;
  tp3Pct: string;
}

function computeTargets(entry: number, tp1Pct: number, tp2Pct: number, tp3Pct: number) {
  return {
    tp1: (entry * (1 + tp1Pct / 100)).toFixed(2),
    tp2: (entry * (1 + tp2Pct / 100)).toFixed(2),
    tp3: (entry * (1 + tp3Pct / 100)).toFixed(2),
  };
}

function LivePreview({ form }: { form: TradeForm }) {
  const entry = parseFloat(form.isShares ? form.entryPrice : form.optionPrice) || 0;
  const stockPrice = parseFloat(form.stockPrice) || 0;
  const tp1Pct = parseFloat(form.tp1Pct) || 10;
  const tp2Pct = parseFloat(form.tp2Pct) || 20;
  const tp3Pct = parseFloat(form.tp3Pct) || 30;
  const slPct = parseFloat(form.stopLossPct) || 10;
  const targets = computeTargets(entry, tp1Pct, tp2Pct, tp3Pct);

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

            {!form.isShares && (
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
            )}

            <div>
              <p className="font-bold text-white flex items-center gap-1.5">
                <span>📋</span> Trade Plan
              </p>
              <p className="mt-1">
                <span className="text-[#72767d]">🎯</span>{" "}
                Targets: ${targets.tp1} (+{tp1Pct}%), ${targets.tp2} (+{tp2Pct}%), ${targets.tp3} (+{tp3Pct}%)
              </p>
              <p>
                <span className="text-[#72767d]">🔴</span>{" "}
                Stop Loss: -{slPct}%
              </p>
            </div>

            <div>
              <p className="font-bold text-white flex items-center gap-1.5">
                <span>🔥</span> Take Profit Plan
              </p>
              <p className="text-xs mt-1 leading-relaxed">
                Take Profit (1): At {tp1Pct}% take off 50% of position and raise stop loss to break even.
              </p>
              <p className="text-xs leading-relaxed">
                Take Profit (2): At {tp2Pct}% take off 50% of remaining position.
              </p>
              <p className="text-xs leading-relaxed">
                Take Profit (3): At {tp3Pct}% take off 50.0% of remaining position.
              </p>
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

export default function SendSignal() {
  const { data: currentUser } = useAuth();
  const createSignal = useCreateSignal();
  const { toast } = useToast();

  const userChannels = currentUser?.discordChannels || [];

  const [form, setForm] = useState<TradeForm>({
    channel: userChannels.length > 0 ? userChannels[0].name : "",
    tradeType: "Scalp",
    tradeTracking: "Manual updates",
    ticker: "",
    isShares: false,
    manualContract: false,
    optionType: "CALL",
    expiration: getDefaultExpiration(),
    strike: "",
    optionPrice: "",
    stockPrice: "",
    entryPrice: "",
    stopLossPct: "10",
    tp1Pct: "10",
    tp2Pct: "20",
    tp3Pct: "30",
  });

  useEffect(() => {
    if (userChannels.length > 0 && !form.channel) {
      setForm(prev => ({ ...prev, channel: userChannels[0].name }));
    }
  }, [userChannels]);

  function update<K extends keyof TradeForm>(key: K, value: TradeForm[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    if (!form.ticker.trim()) {
      toast({ title: "Ticker is required", variant: "destructive" });
      return;
    }

    const entry = parseFloat(form.isShares ? form.entryPrice : form.optionPrice) || 0;
    if (entry <= 0) {
      toast({ title: form.isShares ? "Entry price is required" : "Option price is required", variant: "destructive" });
      return;
    }

    const tp1Pct = parseFloat(form.tp1Pct) || 10;
    const tp2Pct = parseFloat(form.tp2Pct) || 20;
    const tp3Pct = parseFloat(form.tp3Pct) || 30;
    const slPct = parseFloat(form.stopLossPct) || 10;
    const targets = computeTargets(entry, tp1Pct, tp2Pct, tp3Pct);

    const signalData: Record<string, string> = {
      ticker: form.ticker,
      trade_type: form.tradeType,
      trade_tracking: form.tradeTracking,
      is_shares: form.isShares ? "true" : "false",
      stock_price: form.stockPrice || "0",
      entry_price: entry.toString(),
      stop_loss_pct: slPct.toString(),
      tp1_pct: tp1Pct.toString(),
      tp2_pct: tp2Pct.toString(),
      tp3_pct: tp3Pct.toString(),
      tp1_target: targets.tp1,
      tp2_target: targets.tp2,
      tp3_target: targets.tp3,
    };

    if (!form.isShares) {
      signalData.option_type = form.optionType;
      signalData.expiration = form.expiration;
      signalData.strike = form.strike;
      signalData.option_price = form.optionPrice;
    }

    try {
      await createSignal.mutateAsync({
        data: signalData,
        discordChannelName: form.channel || null,
      });

      toast({ title: "Signal sent!", description: "Your trade alert has been published." });
      setForm(prev => ({
        ...prev,
        ticker: "",
        strike: "",
        optionPrice: "",
        stockPrice: "",
        entryPrice: "",
      }));
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to send signal", variant: "destructive" });
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
                  <Input
                    placeholder="Search ticker (e.g., AAPL, TSLA, BTCUSD, ETHUSD)"
                    value={form.ticker}
                    onChange={e => update("ticker", e.target.value.toUpperCase())}
                    data-testid="input-ticker"
                  />
                </div>

                <div className="flex items-center justify-between py-2">
                  <Label className="font-semibold text-sm cursor-pointer" htmlFor="is-shares">
                    Is_Shares (Disable Options fields)
                  </Label>
                  <Switch
                    id="is-shares"
                    checked={form.isShares}
                    onCheckedChange={v => update("isShares", v)}
                    data-testid="switch-is-shares"
                  />
                </div>

                {!form.isShares && (
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

                    <div className="space-y-2">
                      <Label className="font-semibold text-sm">Option Price</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={form.optionPrice}
                        onChange={e => update("optionPrice", e.target.value)}
                        data-testid="input-option-price"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="font-semibold text-sm">Stock Price</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={form.stockPrice}
                    onChange={e => update("stockPrice", e.target.value)}
                    data-testid="input-stock-price"
                  />
                </div>

                {form.isShares && (
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
                )}

                <div className="space-y-3 rounded-lg border border-border p-4">
                  <span className="font-semibold text-sm">Risk Management</span>

                  <div className="space-y-2">
                    <Label className="text-sm">Stop Loss %</Label>
                    <Input
                      type="number"
                      step="1"
                      placeholder="10"
                      value={form.stopLossPct}
                      onChange={e => update("stopLossPct", e.target.value)}
                      data-testid="input-stop-loss"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label className="text-sm">TP1 %</Label>
                      <Input
                        type="number"
                        step="1"
                        placeholder="10"
                        value={form.tp1Pct}
                        onChange={e => update("tp1Pct", e.target.value)}
                        data-testid="input-tp1"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">TP2 %</Label>
                      <Input
                        type="number"
                        step="1"
                        placeholder="20"
                        value={form.tp2Pct}
                        onChange={e => update("tp2Pct", e.target.value)}
                        data-testid="input-tp2"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">TP3 %</Label>
                      <Input
                        type="number"
                        step="1"
                        placeholder="30"
                        value={form.tp3Pct}
                        onChange={e => update("tp3Pct", e.target.value)}
                        data-testid="input-tp3"
                      />
                    </div>
                  </div>
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleSubmit}
                  disabled={createSignal.isPending}
                  data-testid="button-send-signal"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {createSignal.isPending ? "Sending..." : "Send Signal"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:sticky lg:top-6">
          <LivePreview form={form} />
        </div>
      </div>
    </div>
  );
}
