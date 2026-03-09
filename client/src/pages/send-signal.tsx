import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useSignalTypes, useCreateSignal } from "@/hooks/use-signals";
import { useAuth } from "@/hooks/use-auth";
import { Send, Zap } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { buildPreviewEmbed } from "@/components/discord-templates";
import type { SignalType } from "@shared/schema";

export default function SendSignal() {
  const { data: signalTypes, isLoading: typesLoading } = useSignalTypes();
  const { data: currentUser } = useAuth();
  const createSignal = useCreateSignal();
  const { toast } = useToast();

  const [selectedTypeId, setSelectedTypeId] = useState<string>("");
  const [selectedChannelName, setSelectedChannelName] = useState<string>("");
  const [formData, setFormData] = useState<Record<string, string>>({});

  const selectedType = signalTypes?.find(st => st.id.toString() === selectedTypeId);
  const userChannels = currentUser?.discordChannels || [];

  function handleTypeChange(value: string) {
    setSelectedTypeId(value);
    setFormData({});
  }

  function handleFieldChange(name: string, value: string) {
    setFormData(prev => ({ ...prev, [name]: value }));
  }

  function renderPreview(type: SignalType) {
    const preview = buildPreviewEmbed(
      { ...type, fieldsTemplate: type.fieldsTemplate as Array<{ name: string; value: string }> },
      formData
    );

    return (
      <div
        className="rounded-md border-l-4 p-4 space-y-2 bg-card"
        style={{ borderLeftColor: preview.color }}
        data-testid="signal-preview"
      >
        {preview.title && (
          <p className="font-bold text-sm">{preview.title}</p>
        )}
        {preview.description && (
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{preview.description}</p>
        )}
        {preview.fields.length > 0 && (
          <div className="grid grid-cols-2 gap-2 pt-2">
            {preview.fields.map((f, i) => (
              <div key={i}>
                <p className="text-xs font-semibold text-muted-foreground">{f.name}</p>
                <p className="text-sm">{f.value}</p>
              </div>
            ))}
          </div>
        )}
        {preview.footer && (
          <p className="text-xs text-muted-foreground pt-2 border-t">
            {preview.footer}
          </p>
        )}
      </div>
    );
  }

  async function handleSubmit() {
    if (!selectedType) return;

    const variables = selectedType.variables as Array<{ name: string; type: string; label?: string }>;
    const missingFields = variables.filter(v => !formData[v.name]?.trim());
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
        signalTypeId: selectedType.id,
        data: formData,
        discordChannelName: selectedChannelName || null,
      });
      toast({
        title: "Signal sent",
        description: "Your trading signal has been submitted successfully.",
      });
      setFormData({});
      setSelectedTypeId("");
      setSelectedChannelName("");
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to send signal",
        variant: "destructive",
      });
    }
  }

  if (typesLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!signalTypes || signalTypes.length === 0) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Zap}
          title="No signal types configured"
          description="Create a signal type first before sending signals."
          testId="empty-no-types"
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">
          Send Signal
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Submit a new trading signal
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h2 className="font-semibold">Signal Details</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="signal-type">Signal Type</Label>
              <Select value={selectedTypeId} onValueChange={handleTypeChange}>
                <SelectTrigger id="signal-type" data-testid="select-signal-type">
                  <SelectValue placeholder="Choose a signal type" />
                </SelectTrigger>
                <SelectContent>
                  {signalTypes.map(st => (
                    <SelectItem key={st.id} value={st.id.toString()} data-testid={`option-type-${st.id}`}>
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: st.color }} />
                        {st.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedType && (
              <>
                {(selectedType.variables as Array<{ name: string; type: string; label?: string }>).map(variable => (
                  <div key={variable.name} className="space-y-2">
                    <Label htmlFor={`field-${variable.name}`}>
                      {variable.label || variable.name}
                    </Label>
                    <Input
                      id={`field-${variable.name}`}
                      type={variable.type === "number" ? "number" : "text"}
                      placeholder={`Enter ${variable.label || variable.name}`}
                      value={formData[variable.name] || ""}
                      onChange={(e) => handleFieldChange(variable.name, e.target.value)}
                      data-testid={`input-${variable.name}`}
                    />
                  </div>
                ))}

                <div className="space-y-2">
                  <Label htmlFor="discord-channel">Discord Channel (optional)</Label>
                  <Select value={selectedChannelName} onValueChange={setSelectedChannelName}>
                    <SelectTrigger id="discord-channel" data-testid="select-discord-channel">
                      <SelectValue placeholder="Select a channel" />
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
                  onClick={handleSubmit}
                  disabled={createSignal.isPending}
                  data-testid="button-send-signal"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {createSignal.isPending ? "Sending..." : "Send Signal"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {selectedType && (
          <Card>
            <CardHeader>
              <h2 className="font-semibold">Discord Preview</h2>
            </CardHeader>
            <CardContent>
              <div className="rounded-md bg-[#36393f] p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-xs flex-shrink-0">
                    CT
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-white">Crowned Trader</span>
                      <LocalBadge className="text-[10px] bg-[#5865F2] text-white px-1 py-0">BOT</LocalBadge>
                    </div>
                    {renderPreview(selectedType)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function LocalBadge({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={`inline-flex items-center rounded-sm font-medium ${className}`}>{children}</span>;
}
