import { BarChart3, Send, Hash, CheckCircle } from "lucide-react";
import { useStats, useSignalTypes } from "@/hooks/use-signals";
import { StatCard } from "@/components/stat-card";
import { SignalCard } from "@/components/signal-card";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function Dashboard() {
  const { data: stats, isLoading } = useStats();
  const { data: signalTypes } = useSignalTypes();

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const typesMap = new Map(signalTypes?.map(st => [st.id, st]) ?? []);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">
          Dashboard
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Overview of your trading signals
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Signals"
          value={stats?.totalSignals ?? 0}
          icon={Send}
          description="Signals sent"
          testId="stat-total-signals"
        />
        <StatCard
          title="Signal Types"
          value={stats?.totalSignalTypes ?? 0}
          icon={BarChart3}
          description="Configured types"
          testId="stat-signal-types"
        />
        <StatCard
          title="Discord Channels"
          value={stats?.totalChannels ?? 0}
          icon={Hash}
          description="Connected channels"
          testId="stat-channels"
        />
        <StatCard
          title="Sent to Discord"
          value={stats?.sentToDiscord ?? 0}
          icon={CheckCircle}
          description="Successfully delivered"
          testId="stat-sent-discord"
        />
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold">Recent Signals</h2>
        </CardHeader>
        <CardContent>
          {!stats?.recentSignals || stats.recentSignals.length === 0 ? (
            <EmptyState
              icon={Send}
              title="No signals yet"
              description="Send your first trading signal to see it here."
              testId="empty-recent-signals"
            />
          ) : (
            <div className="space-y-3">
              {stats.recentSignals.map((signal) => (
                <SignalCard
                  key={signal.id}
                  signal={signal}
                  signalType={typesMap.get(signal.signalTypeId)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
