import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  useSignalTypes,
  useCreateSignalType,
  useUpdateSignalType,
  useDeleteSignalType,
} from "@/hooks/use-signals";
import { Plus, FileText } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { TemplateCard, TemplateFormDialog } from "@/components/discord-templates";
import type { SignalType } from "@shared/schema";

export default function DiscordTemplatesPage() {
  const { data: signalTypes, isLoading } = useSignalTypes();
  const createSignalType = useCreateSignalType();
  const updateSignalType = useUpdateSignalType();
  const deleteSignalType = useDeleteSignalType();
  const { toast } = useToast();

  const [createOpen, setCreateOpen] = useState(false);
  const [editingType, setEditingType] = useState<SignalType | null>(null);

  async function handleCreate(data: any) {
    try {
      await createSignalType.mutateAsync(data);
      toast({ title: "Template created" });
      setCreateOpen(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  }

  async function handleUpdate(data: any) {
    if (!editingType) return;
    try {
      await updateSignalType.mutateAsync({ id: editingType.id, data });
      toast({ title: "Template updated" });
      setEditingType(null);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteSignalType.mutateAsync(id);
      toast({ title: "Template deleted" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
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
            Discord Templates
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage your Discord embed templates for each asset class
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} data-testid="button-create-type">
          <Plus className="h-4 w-4 mr-2" /> New Template
        </Button>
      </div>

      <TemplateFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreate}
        isPending={createSignalType.isPending}
        mode="create"
      />

      {editingType && (
        <TemplateFormDialog
          key={editingType.id}
          open={!!editingType}
          onOpenChange={(open) => { if (!open) setEditingType(null); }}
          initial={editingType}
          onSubmit={handleUpdate}
          isPending={updateSignalType.isPending}
          mode="edit"
        />
      )}

      {!signalTypes || signalTypes.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No templates"
          description="Create your first Discord template to get started."
          testId="empty-signal-types"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {signalTypes.map(st => (
            <TemplateCard
              key={st.id}
              template={st}
              onEdit={setEditingType}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
