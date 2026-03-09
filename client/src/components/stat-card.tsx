import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  testId?: string;
}

export function StatCard({ title, value, icon: Icon, description, testId }: StatCardProps) {
  return (
    <Card data-testid={testId}>
      <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
        <p className="text-sm text-muted-foreground">{title}</p>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}
