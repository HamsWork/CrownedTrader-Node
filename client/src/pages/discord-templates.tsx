import { useState, useMemo } from "react";
import { useDiscordVarTemplates, useCreateSignal } from "@/hooks/use-signals";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Eye,
  Send,
  Rocket,
  CircleCheck,
  CircleAlert,
  TriangleAlert,
  MessageSquare,
  Target,
  ShieldAlert,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
import { SiDiscord } from "react-icons/si";
import { CATEGORIES, SAMPLE_TICKERS } from "@shared/template-definitions";
import { buildPreviewEmbed } from "@/components/discord-templates";
import {
  DiscordSendModal,
  DiscordEmbedPreview,
  parsePayloadToEmbed,
} from "@/components/discord-send-modal";

type Category = (typeof CATEGORIES)[number];
type SignalType = NonNullable<
  ReturnType<typeof useDiscordVarTemplates>["data"]
>[number];

const SLUG_ICONS: Record<string, { icon: typeof Rocket; className: string }> = {
  signal_alert: { icon: TrendingUp, className: "text-green-500" },
  target_hit: { icon: Target, className: "text-green-500" },
  target_hit_tp2: { icon: Target, className: "text-green-500" },
  stop_loss_raised: { icon: ShieldAlert, className: "text-amber-500" },
  stop_loss_hit: { icon: AlertTriangle, className: "text-red-500" },
};

const SLUG_COLORS: Record<string, string> = {
  signal_alert: "bg-green-500/10 text-green-500 border-green-500/20",
  target_hit: "bg-green-500/10 text-green-500 border-green-500/20",
  target_hit_tp2: "bg-green-500/10 text-green-500 border-green-500/20",
  stop_loss_raised: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  stop_loss_hit: "bg-red-500/10 text-red-500 border-red-500/20",
};

function buildSampleData(template: SignalType): Record<string, string> {
  const category = template.category as Category;
  const sampleTicker = SAMPLE_TICKERS[category] || "AAPL";
  const vars = template.variables as Array<{
    name: string;
    type: string;
    label?: string;
  }>;
  const data: Record<string, string> = {};
  vars.forEach((v) => {
    if (v.name === "ticker" || v.name === "coin") data[v.name] = sampleTicker;
    else if (v.name === "pair") data[v.name] = "USDT";
    else if (v.name === "contract") data[v.name] = `${sampleTicker} 150C 01/17`;
    else if (v.name === "strike") data[v.name] = "150";
    else if (v.name === "expiration" || v.name === "expiry") data[v.name] = "01/17/2026";
    else if (v.name === "direction") data[v.name] = "Call";
    else if (v.name === "right") data[v.name] = "Call";
    else if (v.name === "action") data[v.name] = "Buy";
    else if (v.name === "leverage") data[v.name] = "3";
    else if (v.name === "entry_price") data[v.name] = "145.50";
    else if (v.name === "exit_price") data[v.name] = "162.30";
    else if (v.name === "stock_price") data[v.name] = "148.25";
    else if (v.name === "option_price") data[v.name] = "3.45";
    else if (v.name === "stop_loss" || v.name === "old_stop_loss") data[v.name] = "140.00";
    else if (v.name === "new_stop_loss") data[v.name] = "148.00";
    else if (v.name === "take_profit") data[v.name] = "165.00";
    else if (v.name === "quantity") data[v.name] = "100";
    else if (v.name === "profit_pct") data[v.name] = "+11.5%";
    else if (v.name === "loss_pct") data[v.name] = "-3.8%";
    else if (v.name === "pnl" || v.name === "pnl_dollar") data[v.name] = "+$1,680";
    else if (v.name === "tp_number") data[v.name] = "1";
    else if (v.name === "tp_price") data[v.name] = "155.00";
    else if (v.name === "take_off_pct") data[v.name] = "50%";
    else if (v.name === "r_multiple") data[v.name] = "2.1R";
    else if (v.name === "risk_value") data[v.name] = "Risk-Free";
    else if (v.name === "risk_mgmt") data[v.name] = "Raising stop loss to $145.50 (break even) on remaining position to secure gains while allowing room to run.";
    else if (v.name === "position_mgmt") data[v.name] = "✅ Reduce position by 50% (lock in profit)\n🎯 Let remaining 50% ride to TP2 ($162.00)";
    else if (v.name === "is_break_even") data[v.name] = "Yes";
    else if (v.name === "app_name") data[v.name] = "Crowned Trader";
    else if (v.name === "instrument_type") data[v.name] = category;
    else if (v.name === "instrument_label") data[v.name] = category;
    else if (v.name === "underlying") data[v.name] = sampleTicker;
    else if (v.name === "letf_ticker") data[v.name] = "TQQQ";
    else if (v.name === "letf_direction") data[v.name] = "Bull";
    else if (v.name === "letf_entry") data[v.name] = "52.30";
    else if (v.name === "trade_plan") data[v.name] = "🎯 Targets: $155.00, $162.00\n🛑 Stop loss: $140.00\n🌐 Time Stop: 3 days";
    else if (v.name === "take_profit_plan") data[v.name] = "Take Profit (1): At $155.00 (+6.5%) take off 50% of position and raise stop loss to break even.\nTake Profit (2): At $162.00 (+11.3%) take off 100% of remaining position.";
    else if (v.name === "targets_summary") data[v.name] = "TP1: 155 | TP2: 162 | TP3: 170";
    else if (v.name === "time_stop") data[v.name] = "3 days";
    else if (v.name === "notes") data[v.name] = "Strong breakout above resistance";
    else data[v.name] = v.name;
  });
  return data;
}

function TemplateCard({
  template,
  onSendManual,
  isExpanded,
  onToggleExpand,
}: {
  template: SignalType;
  onSendManual: (t: SignalType) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}) {
  const fieldsArr = (template.fieldsTemplate ?? []) as Array<{
    name: string;
    value: string;
  }>;
  const slugInfo = SLUG_ICONS[template.slug] || {
    icon: MessageSquare,
    className: "text-muted-foreground",
  };
  const colorClass = SLUG_COLORS[template.slug] || "bg-muted text-muted-foreground border-border";
  const Icon = slugInfo.icon;
  const hasVars = JSON.stringify(template.fieldsTemplate).includes("{{");
  const nonSpacerFields = fieldsArr.filter(f => f.name !== "\u200b" && f.name !== "");

  const sampleData = buildSampleData(template);
  const embed = buildPreviewEmbed(
    {
      ...template,
      fieldsTemplate: fieldsArr,
    },
    sampleData,
  );

  return (
    <div
      className="rounded-lg border border-border bg-card overflow-hidden"
      data-testid={`card-template-${template.id}`}
    >
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`p-1.5 rounded-md border shrink-0 ${colorClass}`}>
              <Icon className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <p
                className="text-sm font-semibold truncate"
                data-testid={`text-template-name-${template.id}`}
              >
                {template.name}
              </p>
              <p className="text-[10px] text-muted-foreground font-mono">
                {template.slug}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onToggleExpand}
              data-testid={`button-preview-${template.id}`}
              title={isExpanded ? "Hide Preview" : "Preview"}
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              className="h-7 w-7 bg-[#5865F2] hover:bg-[#4752C4] text-white"
              onClick={() => onSendManual(template)}
              data-testid={`button-send-manual-${template.id}`}
              title="Send to Discord"
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {template.content && (
            <Badge variant="outline" className="text-[10px]">
              content: {template.content}
            </Badge>
          )}
          <Badge variant="outline" className="text-[10px]">
            color: {template.color}
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            {nonSpacerFields.length} fields
          </Badge>
          {hasVars && (
            <Badge variant="outline" className="text-[10px] bg-blue-500/5 text-blue-400 border-blue-500/20">
              {"{{variables}}"}
            </Badge>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-border bg-[#313338] p-4">
          <DiscordEmbedPreview
            embed={embed}
            content={template.content || undefined}
          />
        </div>
      )}
    </div>
  );
}

export default function DiscordTemplatesPage() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const { data: signalTypes, isLoading } = useDiscordVarTemplates();
  const createSignal = useCreateSignal();
  const [activeCategory, setActiveCategory] = useState<Category>("Options");
  const [sendTemplate, setSendTemplate] = useState<SignalType | null>(null);
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);

  const userChannels = currentUser?.discordChannels || [];

  const templatesByCategory =
    signalTypes?.reduce<Record<string, SignalType[]>>((acc, t) => {
      const cat = t.category || "Options";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(t);
      return acc;
    }, {}) ?? {};

  const categoryCounts = CATEGORIES.map((cat) => ({
    name: cat,
    count: templatesByCategory[cat]?.length ?? 0,
  }));

  const activeTemplates = templatesByCategory[activeCategory] ?? [];
  const sampleTicker = SAMPLE_TICKERS[activeCategory];

  const sendTemplateEmbed = useMemo(() => {
    if (!sendTemplate) return null;
    const sampleData = buildSampleData(sendTemplate);
    return buildPreviewEmbed(
      {
        ...sendTemplate,
        fieldsTemplate: (sendTemplate.fieldsTemplate ?? []) as Array<{
          name: string;
          value: string;
        }>,
      },
      sampleData,
    );
  }, [sendTemplate]);

  async function handleSendSignal(payloadJson: string, channelName: string) {
    if (!sendTemplate) return;

    const parsed = parsePayloadToEmbed(payloadJson);
    if (!parsed) {
      toast({
        title: "Invalid JSON",
        description: "The payload JSON is invalid.",
        variant: "destructive",
      });
      return;
    }

    try {
      const sampleData = buildSampleData(sendTemplate);
      await createSignal.mutateAsync({
        signalTypeId: sendTemplate.id,
        data: sampleData,
        discordChannelName: channelName || null,
      });
      toast({
        title: "Signal sent",
        description: "Your trading signal has been sent successfully.",
      });
      setSendTemplate(null);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to send signal";
      toast({ title: "Error", description: message, variant: "destructive" });
    }
  }

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6" data-testid="page-discord-templates">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2" data-testid="text-page-title">
          <SiDiscord className="h-6 w-6 text-[#5865F2]" />
          Discord Message Templates
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Default templates with {"{{variable}}"} placeholders for each instrument type and signal.
        </p>
      </div>

      <div className="flex items-center gap-2 flex-wrap" data-testid="tabs-categories">
        {categoryCounts.map(({ name, count }) => (
          <Button
            key={name}
            variant={activeCategory === name ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setActiveCategory(name as Category);
              setExpandedTemplate(null);
            }}
            data-testid={`tab-category-${name.toLowerCase().replace(/\s+/g, "-")}`}
          >
            {name}
            <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5">
              {count}
            </Badge>
          </Button>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Showing templates for <span className="font-medium text-foreground">{activeCategory}</span> using sample ticker <span className="font-mono font-medium text-foreground">{sampleTicker}</span>
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {activeTemplates.map((template) => {
          const templateKey = `${activeCategory}-${template.id}`;
          return (
            <TemplateCard
              key={template.id}
              template={template}
              onSendManual={setSendTemplate}
              isExpanded={expandedTemplate === templateKey}
              onToggleExpand={() =>
                setExpandedTemplate(
                  expandedTemplate === templateKey ? null : templateKey
                )
              }
            />
          );
        })}
      </div>

      {sendTemplate && sendTemplateEmbed && (
        <DiscordSendModal
          open={!!sendTemplate}
          onOpenChange={(open) => {
            if (!open) setSendTemplate(null);
          }}
          title={sendTemplate.name}
          content={sendTemplate.content || undefined}
          initialEmbed={sendTemplateEmbed}
          channels={userChannels}
          onSend={handleSendSignal}
          isSending={createSignal.isPending}
        />
      )}
    </div>
  );
}
