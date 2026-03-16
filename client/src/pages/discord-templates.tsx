import { useState } from "react";
import { useSignalTypes, useCreateSignal } from "@/hooks/use-signals";
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
} from "lucide-react";
import { SiDiscord } from "react-icons/si";
import { CATEGORIES, SAMPLE_TICKERS } from "@shared/template-definitions";
import { buildPreviewEmbed } from "@/components/discord-templates";
import { DiscordSendModal, DiscordEmbedPreview } from "@/components/discord-send-modal";
import type { SignalType } from "@shared/schema";
import type { Category } from "@shared/template-definitions";

const SLUG_ICONS: Record<string, { icon: typeof Rocket; className: string }> = {
  signal_alert: { icon: Rocket, className: "text-green-400" },
  target_hit: { icon: CircleCheck, className: "text-green-400" },
  target_hit_tp2: { icon: CircleCheck, className: "text-green-400" },
  stop_loss_raised: { icon: CircleAlert, className: "text-amber-400" },
  stop_loss_hit: { icon: TriangleAlert, className: "text-red-400" },
};

function TemplateCard({
  template,
  onPreview,
  onSendManual,
}: {
  template: SignalType;
  onPreview: (t: SignalType) => void;
  onSendManual: (t: SignalType) => void;
}) {
  const fieldsArr = template.fieldsTemplate as Array<{ name: string; value: string }>;
  const slugInfo = SLUG_ICONS[template.slug] || { icon: MessageSquare, className: "text-muted-foreground" };
  const Icon = slugInfo.icon;

  return (
    <div
      className="rounded-lg border border-border/50 bg-card p-4 flex flex-col gap-3"
      data-testid={`card-template-${template.id}`}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted/60 shrink-0">
          <Icon className={`h-4 w-4 ${slugInfo.className}`} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-sm truncate" data-testid={`text-template-name-${template.id}`}>
            {template.name}
          </h3>
          <p className="text-xs text-muted-foreground font-mono truncate">{template.slug}</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPreview(template)}
            className="text-xs gap-1.5"
            data-testid={`button-preview-${template.id}`}
          >
            <Eye className="h-3.5 w-3.5" />
            Preview
          </Button>
          <Button
            size="sm"
            onClick={() => onSendManual(template)}
            className="text-xs gap-1.5"
            data-testid={`button-send-manual-${template.id}`}
          >
            <Send className="h-3.5 w-3.5" />
            Send Manual
          </Button>
        </div>
      </div>
      <div className="flex sm:hidden items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPreview(template)}
          className="text-xs gap-1.5 flex-1"
          data-testid={`button-preview-mobile-${template.id}`}
        >
          <Eye className="h-3.5 w-3.5" />
          Preview
        </Button>
        <Button
          size="sm"
          onClick={() => onSendManual(template)}
          className="text-xs gap-1.5 flex-1"
          data-testid={`button-send-manual-mobile-${template.id}`}
        >
          <Send className="h-3.5 w-3.5" />
          Send Manual
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {template.content && (
          <Badge variant="secondary" className="text-[10px] font-mono">
            content: {template.content}
          </Badge>
        )}
        <Badge variant="secondary" className="text-[10px] font-mono">
          color: {template.color}
        </Badge>
        <Badge variant="secondary" className="text-[10px] font-mono">
          {fieldsArr.length} fields
        </Badge>
      </div>
    </div>
  );
}

function PreviewDialog({
  template,
  open,
  onOpenChange,
}: {
  template: SignalType | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!template) return null;

  const category = template.category as Category;
  const sampleTicker = SAMPLE_TICKERS[category] || "AAPL";
  const vars = template.variables as Array<{ name: string; type: string; label?: string }>;
  const sampleData: Record<string, string> = {};
  vars.forEach(v => {
    if (v.name === "ticker" || v.name === "coin") sampleData[v.name] = sampleTicker;
    else if (v.name === "pair") sampleData[v.name] = "USDT";
    else if (v.name === "contract") sampleData[v.name] = `${sampleTicker} 150C 01/17`;
    else if (v.name === "strike") sampleData[v.name] = "150";
    else if (v.name === "expiration") sampleData[v.name] = "01/17/2026";
    else if (v.name === "direction") sampleData[v.name] = "Call";
    else if (v.name === "action") sampleData[v.name] = "Buy";
    else if (v.name === "leverage") sampleData[v.name] = "3x";
    else if (v.name === "entry_price") sampleData[v.name] = "145.50";
    else if (v.name === "exit_price") sampleData[v.name] = "162.30";
    else if (v.name === "stop_loss" || v.name === "old_stop_loss") sampleData[v.name] = "140.00";
    else if (v.name === "new_stop_loss") sampleData[v.name] = "148.00";
    else if (v.name === "take_profit") sampleData[v.name] = "165.00";
    else if (v.name === "quantity") sampleData[v.name] = "100";
    else if (v.name === "profit_pct") sampleData[v.name] = "11.5";
    else if (v.name === "loss_pct") sampleData[v.name] = "-3.8";
    else if (v.name === "pnl") sampleData[v.name] = "+$1,680";
    else if (v.name === "notes") sampleData[v.name] = "Strong breakout above resistance";
    else sampleData[v.name] = v.name;
  });

  const embed = buildPreviewEmbed(
    { ...template, fieldsTemplate: template.fieldsTemplate as Array<{ name: string; value: string }> },
    sampleData
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Discord Preview — {template.name}</DialogTitle>
        </DialogHeader>
        <DiscordEmbedPreview
          embed={embed}
          content={template.content || undefined}
        />
      </DialogContent>
    </Dialog>
  );
}

export default function DiscordTemplatesPage() {
  const { data: signalTypes, isLoading } = useSignalTypes();
  const { data: currentUser } = useAuth();
  const createSignal = useCreateSignal();
  const { toast } = useToast();
  const [activeCategory, setActiveCategory] = useState<Category>("Options");
  const [previewTemplate, setPreviewTemplate] = useState<SignalType | null>(null);
  const [sendTemplate, setSendTemplate] = useState<SignalType | null>(null);

  const userChannels = currentUser?.discordChannels || [];

  const templatesByCategory = signalTypes?.reduce<Record<string, SignalType[]>>((acc, t) => {
    const cat = t.category || "Options";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(t);
    return acc;
  }, {}) ?? {};

  const categoryCounts = CATEGORIES.map(cat => ({
    name: cat,
    count: templatesByCategory[cat]?.length ?? 0,
  }));

  const activeTemplates = templatesByCategory[activeCategory] ?? [];
  const sampleTicker = SAMPLE_TICKERS[activeCategory];

  async function handleSendSignal(data: Record<string, string>, channelName: string) {
    if (!sendTemplate) return;
    const vars = sendTemplate.variables as Array<{ name: string; type: string; label?: string }>;
    const missingFields = vars.filter(v => !data[v.name]?.trim());
    if (missingFields.length > 0) {
      toast({
        title: "Missing fields",
        description: `Please fill in: ${missingFields.map(v => v.label || v.name).join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    try {
      await createSignal.mutateAsync({
        signalTypeId: sendTemplate.id,
        data,
        discordChannelName: channelName || null,
      });
      toast({ title: "Signal sent", description: "Your trading signal has been sent successfully." });
      setSendTemplate(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to send signal";
      toast({ title: "Error", description: message, variant: "destructive" });
    }
  }

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-6">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-4 w-96" />
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-28" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-start gap-3">
        <SiDiscord className="h-6 w-6 sm:h-7 sm:w-7 text-[#5865F2] shrink-0 mt-1" />
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight" data-testid="text-page-title">
            Discord Message Templates
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
            All available Discord message templates by instrument type. Click any template to send it manually.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2" data-testid="category-tabs">
        {categoryCounts.map(({ name, count }) => (
          <button
            key={name}
            onClick={() => setActiveCategory(name as Category)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors border ${
              activeCategory === name
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:bg-muted"
            }`}
            data-testid={`tab-${name.toLowerCase().replace(/\s+/g, "-")}`}
          >
            {name}
            <span className={`inline-flex items-center justify-center h-5 min-w-5 px-1 rounded text-[11px] font-semibold ${
              activeCategory === name
                ? "bg-primary-foreground/20 text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}>
              {count}
            </span>
          </button>
        ))}
      </div>

      <p className="text-sm text-muted-foreground" data-testid="text-category-info">
        Showing templates for <span className="font-semibold text-foreground">{activeCategory}</span> using sample ticker{" "}
        <span className="font-semibold text-foreground">{sampleTicker}</span>
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {activeTemplates.map(template => (
          <TemplateCard
            key={template.id}
            template={template}
            onPreview={setPreviewTemplate}
            onSendManual={setSendTemplate}
          />
        ))}
      </div>

      <PreviewDialog
        template={previewTemplate}
        open={!!previewTemplate}
        onOpenChange={(open) => { if (!open) setPreviewTemplate(null); }}
      />

      {sendTemplate && (
        <DiscordSendModal
          open={!!sendTemplate}
          onOpenChange={(open) => { if (!open) setSendTemplate(null); }}
          title={sendTemplate.name}
          content={sendTemplate.content || undefined}
          variables={sendTemplate.variables as Array<{ name: string; type: string; label?: string }>}
          channels={userChannels}
          buildEmbed={(data) => buildPreviewEmbed(
            { ...sendTemplate, fieldsTemplate: sendTemplate.fieldsTemplate as Array<{ name: string; value: string }> },
            data
          )}
          onSend={handleSendSignal}
          isSending={createSignal.isPending}
        />
      )}
    </div>
  );
}
