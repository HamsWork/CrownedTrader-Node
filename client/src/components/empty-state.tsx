import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  testId?: string;
}

export function EmptyState({ icon: Icon, title, description, testId }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center" data-testid={testId}>
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm">{description}</p>
    </div>
  );
}
