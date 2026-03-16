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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import type { SignalType } from "@shared/schema";
import type { Category } from "@shared/template-definitions";

function renderDiscordMarkdown(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

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
            variant="ghost"
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
          variant="ghost"
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

  const preview = buildPreviewEmbed(
    { ...template, fieldsTemplate: template.fieldsTemplate as Array<{ name: string; value: string }> },
    sampleData
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Discord Preview — {template.name}</DialogTitle>
        </DialogHeader>
        <div className="rounded-md bg-[#313338] p-4" data-testid="preview-embed-container">
          {template.content && (
            <p className="text-sm text-white mb-3" data-testid="preview-content">{template.content}</p>
          )}
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#CCB167] text-black font-bold text-xs flex-shrink-0">
              CT
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-white">Crowned Trader</span>
                <span className="text-[10px] bg-[#5865F2] text-white px-1 py-0 rounded-sm font-medium">BOT</span>
              </div>
              <div
                className="rounded-md border-l-4 p-3 space-y-2 bg-[#2b2d31] mt-1"
                style={{ borderLeftColor: preview.color }}
                data-testid="preview-embed"
              >
                {preview.title && (
                  <p className="font-bold text-sm text-white" data-testid="preview-title">{preview.title}</p>
                )}
                {preview.description && (
                  <p className="text-sm text-gray-300 whitespace-pre-wrap" data-testid="preview-description">{renderDiscordMarkdown(preview.description)}</p>
                )}
                {preview.fields.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 pt-1" data-testid="preview-fields">
                    {preview.fields.map((f, i) => (
                      <div key={i} data-testid={`preview-field-${i}`}>
                        <p className="text-xs font-semibold text-gray-400">{f.name}</p>
                        <p className="text-sm text-gray-200">{f.value}</p>
                      </div>
                    ))}
                  </div>
                )}
                {preview.footer && (
                  <p className="text-xs text-gray-500 pt-2 border-t border-gray-600" data-testid="preview-footer">
                    {preview.footer}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SendManualDialog({
  template,
  open,
  onOpenChange,
}: {
  template: SignalType | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: currentUser } = useAuth();
  const createSignal = useCreateSignal();
  const { toast } = useToast();
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [channelName, setChannelName] = useState<string>("");
  const userChannels = currentUser?.discordChannels || [];

  if (!template) return null;

  const vars = template.variables as Array<{ name: string; type: string; label?: string }>;

  const preview = buildPreviewEmbed(
    { ...template, fieldsTemplate: template.fieldsTemplate as Array<{ name: string; value: string }> },
    formData
  );

  async function handleSend() {
    if (!template) return;
    const missingFields = vars.filter(v => !formData[v.name]?.trim());
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
        signalTypeId: template.id,
        data: formData,
        discordChannelName: channelName || null,
      });
      toast({ title: "Signal sent", description: "Your trading signal has been sent successfully." });
      setFormData({});
      setChannelName("");
      onOpenChange(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to send signal";
      toast({ title: "Error", description: message, variant: "destructive" });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Send Manual — {template.name} ({template.category})</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            {vars.map(v => (
              <div key={v.name} className="space-y-1">
                <Label htmlFor={`manual-${v.name}`} className="text-xs">{v.label || v.name}</Label>
                <Input
                  id={`manual-${v.name}`}
                  placeholder={v.label || v.name}
                  value={formData[v.name] || ""}
                  onChange={e => setFormData(prev => ({ ...prev, [v.name]: e.target.value }))}
                  data-testid={`input-manual-${v.name}`}
                />
              </div>
            ))}
            <div className="space-y-1">
              <Label className="text-xs">Discord Channel</Label>
              <Select value={channelName} onValueChange={setChannelName}>
                <SelectTrigger data-testid="select-manual-channel">
                  <SelectValue placeholder="Select channel (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {userChannels.map((ch, i) => (
                    <SelectItem key={i} value={ch.name} data-testid={`option-channel-${i}`}>
                      # {ch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full"
              onClick={handleSend}
              disabled={createSignal.isPending}
              data-testid="button-confirm-send"
            >
              <Send className="h-4 w-4 mr-2" />
              {createSignal.isPending ? "Sending..." : "Send Signal"}
            </Button>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-2">Live Preview</p>
            <div className="rounded-md bg-[#313338] p-3">
              {template.content && (
                <p className="text-xs text-white mb-2">{template.content}</p>
              )}
              <div className="flex items-start gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#CCB167] text-black font-bold text-[10px] flex-shrink-0">
                  CT
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-xs text-white">Crowned Trader</span>
                    <span className="text-[8px] bg-[#5865F2] text-white px-1 rounded-sm">BOT</span>
                  </div>
                  <div
                    className="rounded border-l-[3px] p-2 space-y-1.5 bg-[#2b2d31] mt-0.5"
                    style={{ borderLeftColor: preview.color }}
                  >
                    {preview.title && <p className="font-bold text-xs text-white">{preview.title}</p>}
                    {preview.description && <p className="text-[11px] text-gray-300 whitespace-pre-wrap">{renderDiscordMarkdown(preview.description)}</p>}
                    {preview.fields.length > 0 && (
                      <div className="grid grid-cols-2 gap-1 pt-1">
                        {preview.fields.map((f, i) => (
                          <div key={i}>
                            <p className="text-[10px] font-semibold text-gray-400">{f.name}</p>
                            <p className="text-xs text-gray-200">{f.value}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {preview.footer && (
                      <p className="text-[10px] text-gray-500 pt-1 border-t border-gray-600">{preview.footer}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function DiscordTemplatesPage() {
  const { data: signalTypes, isLoading } = useSignalTypes();
  const [activeCategory, setActiveCategory] = useState<Category>("Options");
  const [previewTemplate, setPreviewTemplate] = useState<SignalType | null>(null);
  const [sendTemplate, setSendTemplate] = useState<SignalType | null>(null);

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

      <SendManualDialog
        template={sendTemplate}
        open={!!sendTemplate}
        onOpenChange={(open) => { if (!open) setSendTemplate(null); }}
      />
    </div>
  );
}
