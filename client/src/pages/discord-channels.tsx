import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useDiscordChannels, useCreateDiscordChannel, useDeleteDiscordChannel } from "@/hooks/use-signals";
import { useAuth } from "@/hooks/use-auth";
import { Plus, Trash2, Hash, User } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { formatDistanceToNow } from "date-fns";

export default function DiscordChannelsPage() {
  const { data: channels, isLoading } = useDiscordChannels();
  const { data: currentUser } = useAuth();
  const createChannel = useCreateDiscordChannel();
  const deleteChannel = useDeleteDiscordChannel();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");

  const isAdmin = currentUser?.role === "admin";

  async function handleSubmit() {
    if (!name.trim() || !webhookUrl.trim()) {
      toast({ title: "All fields required", variant: "destructive" });
      return;
    }

    if (!webhookUrl.startsWith("https://discord.com/api/webhooks/") &&
        !webhookUrl.startsWith("https://discordapp.com/api/webhooks/")) {
      toast({ title: "Invalid webhook URL", description: "Must be a valid Discord webhook URL", variant: "destructive" });
      return;
    }

    try {
      await createChannel.mutateAsync({ name: name.trim(), webhookUrl: webhookUrl.trim() });
      toast({ title: "Channel added" });
      setName("");
      setWebhookUrl("");
      setOpen(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to add channel";
      toast({ title: "Error", description: message, variant: "destructive" });
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteChannel.mutateAsync(id);
      toast({ title: "Channel deleted" });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete channel";
      toast({ title: "Error", description: message, variant: "destructive" });
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">
            Discord Channels
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage your Discord webhook connections
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-channel">
              <Plus className="h-4 w-4 mr-2" /> Add Channel
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Discord Channel</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Channel Name</Label>
                <Input
                  placeholder="e.g. trading-signals"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  data-testid="input-channel-name"
                />
              </div>
              <div className="space-y-2">
                <Label>Webhook URL</Label>
                <Input
                  placeholder="https://discord.com/api/webhooks/..."
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  data-testid="input-webhook-url"
                />
                <p className="text-xs text-muted-foreground">
                  Get this from Discord: Server Settings &gt; Integrations &gt; Webhooks
                </p>
              </div>
              <Button
                className="w-full"
                onClick={handleSubmit}
                disabled={createChannel.isPending}
                data-testid="button-submit-channel"
              >
                {createChannel.isPending ? "Adding..." : "Add Channel"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {!channels || channels.length === 0 ? (
        <EmptyState
          icon={Hash}
          title="No Discord channels"
          description="Add a Discord webhook to start sending signals to your server."
          testId="empty-channels"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {channels.map(ch => {
            const ownerName = (ch as any).ownerUsername as string | null;
            return (
              <Card key={ch.id} data-testid={`card-channel-${ch.id}`}>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold">{ch.name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(ch.id)}
                    data-testid={`button-delete-channel-${ch.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground font-mono truncate" data-testid={`text-webhook-${ch.id}`}>
                    {ch.webhookUrl.slice(0, 50)}...
                  </p>
                  <div className="flex items-center gap-3 mt-2">
                    {ownerName && (
                      <Badge variant="outline" className="text-xs gap-1" data-testid={`badge-owner-${ch.id}`}>
                        <User className="h-3 w-3" />
                        {ownerName}
                      </Badge>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Added {ch.createdAt
                        ? formatDistanceToNow(new Date(ch.createdAt), { addSuffix: true })
                        : "recently"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
