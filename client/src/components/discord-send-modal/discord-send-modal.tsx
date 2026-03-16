import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { Send } from "lucide-react";
import { SiDiscord } from "react-icons/si";
import { DiscordEmbedPreview, type DiscordEmbedData } from "./discord-embed-preview";
import { DiscordPayloadView } from "./discord-payload-view";

export interface DiscordChannel {
  name: string;
  webhookUrl?: string;
}

export interface DiscordSendVariable {
  name: string;
  type: string;
  label?: string;
}

export interface DiscordSendModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  content?: string;
  variables: DiscordSendVariable[];
  channels: DiscordChannel[];
  buildEmbed: (data: Record<string, string>) => DiscordEmbedData;
  onSend: (data: Record<string, string>, channelName: string) => Promise<void>;
  isSending?: boolean;
  botName?: string;
  botInitials?: string;
  botAvatarColor?: string;
}

export function DiscordSendModal({
  open,
  onOpenChange,
  title,
  content,
  variables,
  channels,
  buildEmbed,
  onSend,
  isSending = false,
  botName,
  botInitials,
  botAvatarColor,
}: DiscordSendModalProps) {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [channelName, setChannelName] = useState<string>("");

  useEffect(() => {
    if (!open) {
      setFormData({});
      setChannelName("");
    }
  }, [open]);

  const embed = buildEmbed(formData);

  async function handleSend() {
    await onSend(formData, channelName);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <div className="flex items-center gap-3">
            <SiDiscord className="h-6 w-6 text-[#5865F2] shrink-0" />
            <div>
              <DialogTitle className="text-lg" data-testid="send-modal-title">
                Send: {title}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Select a Discord channel, review the rendered payload, then send
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 pt-4 space-y-5 pb-0">
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 block">
              Discord Channel
            </Label>
            <Select value={channelName} onValueChange={setChannelName}>
              <SelectTrigger
                className="bg-[#1e1f22] border-[#3f4147] text-foreground"
                data-testid="select-send-channel"
              >
                <SelectValue placeholder="Select a Discord channel to send to..." />
              </SelectTrigger>
              <SelectContent>
                {channels.map((ch, i) => (
                  <SelectItem key={i} value={ch.name} data-testid={`option-channel-${i}`}>
                    # {ch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {variables.length > 0 && (
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 block">
                Variables
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {variables.map(v => (
                  <div key={v.name} className="space-y-1">
                    <Label htmlFor={`send-var-${v.name}`} className="text-xs text-muted-foreground">
                      {v.label || v.name}
                    </Label>
                    <Input
                      id={`send-var-${v.name}`}
                      placeholder={v.label || v.name}
                      value={formData[v.name] || ""}
                      onChange={e => setFormData(prev => ({ ...prev, [v.name]: e.target.value }))}
                      className="bg-[#1e1f22] border-[#3f4147]"
                      data-testid={`input-send-${v.name}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 block">
                Rendered Payload
              </Label>
              <DiscordPayloadView embed={embed} content={content} />
            </div>
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 block">
                Preview
              </Label>
              <DiscordEmbedPreview
                embed={embed}
                content={content}
                botName={botName}
                botInitials={botInitials}
                botAvatarColor={botAvatarColor}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t mt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="button-cancel-send"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={isSending}
            className="gap-2"
            data-testid="button-confirm-send"
          >
            <Send className="h-4 w-4" />
            {isSending ? "Sending..." : "Send to Discord"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
