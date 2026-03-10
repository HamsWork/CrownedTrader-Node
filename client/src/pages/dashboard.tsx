import { useState } from "react";
import { Trophy, Crown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

type LeaderboardTrader = {
  userId: number;
  username: string;
  trades: number;
  wins: number;
  losses: number;
  avgPnl: number;
  winRate: number;
};

type LeaderboardData = {
  period: string;
  dateRange: string;
  totals: {
    trades: number;
    wins: number;
    losses: number;
    avgPnl: number;
    winRate: number;
  };
  traders: LeaderboardTrader[];
};

const periods = [
  { value: "this_week", label: "This Week" },
  { value: "last_week", label: "Last Week" },
  { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
] as const;

function Leaderboard() {
  const [period, setPeriod] = useState("this_week");

  const { data, isLoading } = useQuery<LeaderboardData>({
    queryKey: ["/api/leaderboard", period],
    queryFn: () =>
      fetch(`/api/leaderboard?period=${period}`, { credentials: "include" })
        .then(r => { if (!r.ok) throw new Error("Failed"); return r.json(); }),
  });

  const selectedLabel = periods.find(p => p.value === period)?.label ?? "This Week";

  return (
    <div className="space-y-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="text-xs font-semibold text-primary uppercase tracking-wider" data-testid="text-leaderboard-period-label">
            {selectedLabel}
          </div>
          {data?.dateRange && (
            <div className="text-xs text-muted-foreground mt-0.5" data-testid="text-leaderboard-date-range">
              {data.dateRange}
            </div>
          )}
        </div>
        <div className="flex items-center gap-0">
          <h2 className="text-2xl font-black tracking-widest uppercase text-center flex-1 sm:flex-none" data-testid="text-leaderboard-title">
            Crowned Traders
          </h2>
        </div>
        <div className="flex flex-wrap gap-1">
          {periods.map(p => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-medium rounded-md border transition-colors ${
                period === p.value
                  ? "bg-foreground text-background border-foreground"
                  : "bg-transparent text-muted-foreground border-border hover:text-foreground hover:border-foreground/50"
              }`}
              data-testid={`button-period-${p.value}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="text-center mb-4">
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground" data-testid="text-leaderboard-subtitle">
          Leaderboard
        </span>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-20" />
          <Skeleton className="h-40" />
        </div>
      ) : data ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-px bg-border rounded-lg overflow-hidden border border-border">
            {[
              { label: "Trades", value: data.totals.trades.toString(), color: "text-foreground" },
              { label: "Wins", value: data.totals.wins.toString(), color: "text-green-400" },
              { label: "Losses", value: data.totals.losses.toString(), color: "text-foreground" },
              { label: "Avg. P/L", value: `${data.totals.avgPnl >= 0 ? "" : ""}${data.totals.avgPnl.toFixed(2)}%`, color: data.totals.avgPnl >= 0 ? "text-green-400" : "text-red-400" },
              { label: "Avg. Win Rate", value: `${data.totals.winRate.toFixed(2)}%`, color: data.totals.winRate >= 50 ? "text-green-400" : "text-red-400" },
            ].map((stat) => (
              <div key={stat.label} className="bg-card px-4 py-3">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{stat.label}</div>
                <div className={`text-xl font-bold mt-1 ${stat.color}`} data-testid={`text-total-${stat.label.toLowerCase().replace(/[\s.]/g, "-")}`}>
                  {stat.value}
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]" data-testid="table-leaderboard">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-3 sm:px-4 py-3 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground w-12">Rank</th>
                    <th className="text-left px-3 sm:px-4 py-3 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground">Crowned Trader</th>
                    <th className="text-left px-3 sm:px-4 py-3 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground">Trades</th>
                    <th className="text-left px-3 sm:px-4 py-3 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground">Wins</th>
                    <th className="text-left px-3 sm:px-4 py-3 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground">Losses</th>
                    <th className="text-left px-3 sm:px-4 py-3 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground">Avg. P/L</th>
                    <th className="text-left px-3 sm:px-4 py-3 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground">Win Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {data.traders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                        No trading activity in this period
                      </td>
                    </tr>
                  ) : (
                    data.traders.map((trader, idx) => (
                      <tr
                        key={trader.userId}
                        className="border-b border-border last:border-b-0 hover:bg-muted/20 transition-colors"
                        data-testid={`row-trader-${trader.userId}`}
                      >
                        <td className="px-3 sm:px-4 py-3 font-bold text-sm" data-testid={`text-rank-${trader.userId}`}>
                          <div className="flex items-center gap-1">
                            {idx === 0 && data.traders.length > 1 && (
                              <Crown className="h-3.5 w-3.5 text-yellow-400" />
                            )}
                            {idx + 1}
                          </div>
                        </td>
                        <td className="px-3 sm:px-4 py-3">
                          <div>
                            <div className="font-bold text-sm" data-testid={`text-trader-name-${trader.userId}`}>
                              {trader.username}
                            </div>
                            <div className="text-xs text-muted-foreground">@{trader.username}</div>
                          </div>
                        </td>
                        <td className="px-3 sm:px-4 py-3 text-sm" data-testid={`text-trades-${trader.userId}`}>
                          {trader.trades}
                        </td>
                        <td className="px-3 sm:px-4 py-3">
                          <span className="text-sm font-medium text-green-400" data-testid={`text-wins-${trader.userId}`}>
                            {trader.wins}
                          </span>
                        </td>
                        <td className="px-3 sm:px-4 py-3 text-sm" data-testid={`text-losses-${trader.userId}`}>
                          {trader.losses}
                        </td>
                        <td className="px-3 sm:px-4 py-3">
                          <span
                            className={`text-sm font-medium ${trader.avgPnl >= 0 ? "text-green-400" : "text-red-400"}`}
                            data-testid={`text-avg-pnl-${trader.userId}`}
                          >
                            {trader.avgPnl >= 0 ? "" : ""}{trader.avgPnl.toFixed(2)}%
                          </span>
                        </td>
                        <td className="px-3 sm:px-4 py-3">
                          <span
                            className={`text-sm font-medium ${trader.winRate >= 50 ? "text-green-400" : "text-red-400"}`}
                            data-testid={`text-win-rate-${trader.userId}`}
                          >
                            {trader.winRate.toFixed(2)}%
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function Dashboard() {
  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight" data-testid="text-page-title">
          Dashboard
        </h1>
        <p className="text-muted-foreground text-xs sm:text-sm mt-1">
          Overview of your trading signals
        </p>
      </div>

      <Leaderboard />
    </div>
  );
}
