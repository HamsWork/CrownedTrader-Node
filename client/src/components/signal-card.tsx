import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock } from "lucide-react";
import type { Signal, SignalType } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

interface SignalCardProps {
  signal: Signal;
  signalType?: SignalType;
}

export function SignalCard({ signal, signalType }: SignalCardProps) {
  const data = (signal.data ?? {}) as Record<string, string>;
  const color = signalType?.color ?? "#3B82F6";

  return (
    <Card data-testid={`card-signal-${signal.id}`}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <div
            className="h-3 w-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: color }}
          />
          <span className="font-semibold text-sm">
            {signalType?.name ?? "Unknown Type"}
          </span>
          {data.ticker && (
            <Badge variant="secondary" data-testid={`badge-ticker-${signal.id}`}>
              {data.ticker}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {signal.sentToDiscord ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : signal.discordChannelName ? (
            <XCircle className="h-4 w-4 text-red-500" />
          ) : (
            <Clock className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="text-xs text-muted-foreground">
            {signal.createdAt
              ? formatDistanceToNow(new Date(signal.createdAt), { addSuffix: true })
              : "just now"}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {Object.entries(data).map(([key, value]) => (
            <div key={key} className="space-y-1">
              <p className="text-xs text-muted-foreground capitalize">
                {key.replace(/_/g, " ")}
              </p>
              <p className="text-sm font-medium" data-testid={`text-${key}-${signal.id}`}>
                {value}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
