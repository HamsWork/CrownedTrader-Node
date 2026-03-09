import { useState } from "react";
import { useSignals, useSignalTypes } from "@/hooks/use-signals";
import { SignalCard } from "@/components/signal-card";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { History, Search } from "lucide-react";

export default function SignalHistory() {
  const { data: signals, isLoading: signalsLoading } = useSignals();
  const { data: signalTypes, isLoading: typesLoading } = useSignalTypes();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  const typesMap = new Map(signalTypes?.map(st => [st.id, st]) ?? []);

  const filtered = signals?.filter(signal => {
    const data = (signal.data ?? {}) as Record<string, string>;
    const matchesSearch = !search || Object.values(data).some(v =>
      v.toLowerCase().includes(search.toLowerCase())
    );
    const matchesType = filterType === "all" || signal.signalTypeId.toString() === filterType;
    return matchesSearch && matchesType;
  }) ?? [];

  if (signalsLoading || typesLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-3">
          <Skeleton className="h-9 flex-1" />
          <Skeleton className="h-9 w-48" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">
          Signal History
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Browse all past trading signals
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search signals..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full sm:w-48" data-testid="select-filter-type">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {signalTypes?.map(st => (
              <SelectItem key={st.id} value={st.id.toString()}>
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: st.color }} />
                  {st.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={History}
          title="No signals found"
          description={search || filterType !== "all"
            ? "Try adjusting your search or filter."
            : "Your signal history will appear here once you send signals."
          }
          testId="empty-signals"
        />
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground" data-testid="text-signal-count">
            {filtered.length} signal{filtered.length !== 1 ? "s" : ""}
          </p>
          {filtered.map(signal => (
            <SignalCard
              key={signal.id}
              signal={signal}
              signalType={typesMap.get(signal.signalTypeId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
