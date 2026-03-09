import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  useSignalTypes,
  useCreateSignalType,
  useUpdateSignalType,
  useDeleteSignalType,
} from "@/hooks/use-signals";
import { Plus, Trash2, FileText, X, Pencil } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { SIGNAL_COLORS } from "@/lib/constants";
import type { SignalType } from "@shared/schema";

interface VariableField {
  name: string;
  type: string;
  label: string;
}

interface EmbedField {
  name: string;
  value: string;
}

function TemplateFormDialog({
  open,
  onOpenChange,
  initial,
  onSubmit,
  isPending,
  mode,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: SignalType | null;
  onSubmit: (data: any) => Promise<void>;
  isPending: boolean;
  mode: "create" | "edit";
}) {
  const [name, setName] = useState(initial?.name || "");
  const [color, setColor] = useState(initial?.color || "#3B82F6");
  const [variables, setVariables] = useState<VariableField[]>(
    (initial?.variables as VariableField[])?.length
      ? (initial.variables as VariableField[])
      : [{ name: "", type: "string", label: "" }]
  );
  const [titleTemplate, setTitleTemplate] = useState(initial?.titleTemplate || "");
  const [descriptionTemplate, setDescriptionTemplate] = useState(initial?.descriptionTemplate || "");
  const [fieldsTemplate, setFieldsTemplate] = useState<EmbedField[]>(
    (initial?.fieldsTemplate as EmbedField[]) || []
  );
  const [footerTemplate, setFooterTemplate] = useState(initial?.footerTemplate || "Crowned Trader Signals");
  const { toast } = useToast();

  function addVariable() {
    setVariables([...variables, { name: "", type: "string", label: "" }]);
  }

  function removeVariable(index: number) {
    setVariables(variables.filter((_, i) => i !== index));
  }

  function updateVariable(index: number, field: keyof VariableField, value: string) {
    const updated = [...variables];
    updated[index] = { ...updated[index], [field]: value };
    setVariables(updated);
  }

  function addField() {
    setFieldsTemplate([...fieldsTemplate, { name: "", value: "" }]);
  }

  function removeField(index: number) {
    setFieldsTemplate(fieldsTemplate.filter((_, i) => i !== index));
  }

  function updateField(index: number, field: keyof EmbedField, value: string) {
    const updated = [...fieldsTemplate];
    updated[index] = { ...updated[index], [field]: value };
    setFieldsTemplate(updated);
  }

  async function handleSubmit() {
    const validVars = variables.filter(v => v.name.trim());
    if (!name.trim()) {
      toast({ title: "Name required", variant: "destructive" });
      return;
    }
    await onSubmit({
      name: name.trim(),
      color,
      variables: validVars,
      titleTemplate,
      descriptionTemplate,
      fieldsTemplate: fieldsTemplate.filter(f => f.name.trim()),
      footerTemplate,
      showTitleDefault: true,
      showDescriptionDefault: true,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "Edit Template" : "Create Discord Template"}</DialogTitle>
          <DialogDescription>
            {mode === "edit" ? "Update the template configuration below." : "Configure a new Discord embed template."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                placeholder="e.g. Options, Crypto"
                value={name}
                onChange={(e) => setName(e.target.value)}
                data-testid="input-type-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {SIGNAL_COLORS.map(c => (
                  <button
                    key={c}
                    className={`h-8 w-8 rounded-md transition-all ${color === c ? "ring-2 ring-ring ring-offset-2 ring-offset-background" : ""}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setColor(c)}
                    data-testid={`button-color-${c.slice(1)}`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Variables</Label>
              <Button variant="ghost" size="sm" onClick={addVariable} data-testid="button-add-variable">
                <Plus className="h-3 w-3 mr-1" /> Add
              </Button>
            </div>
            <div className="space-y-2">
              {variables.map((v, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <Input
                    placeholder="name (e.g. ticker)"
                    value={v.name}
                    onChange={(e) => updateVariable(i, "name", e.target.value)}
                    className="flex-1"
                    data-testid={`input-var-name-${i}`}
                  />
                  <Input
                    placeholder="label (e.g. Ticker)"
                    value={v.label}
                    onChange={(e) => updateVariable(i, "label", e.target.value)}
                    className="flex-1"
                    data-testid={`input-var-label-${i}`}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeVariable(i)}
                    disabled={variables.length <= 1}
                    data-testid={`button-remove-var-${i}`}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Use {"{{variable_name}}"} in templates to insert values
            </p>
          </div>

          <div className="space-y-2">
            <Label>Title Template</Label>
            <Input
              placeholder="e.g. {{ticker}} {{strike}}{{direction}} {{expiration}}"
              value={titleTemplate}
              onChange={(e) => setTitleTemplate(e.target.value)}
              data-testid="input-title-template"
            />
          </div>

          <div className="space-y-2">
            <Label>Description Template</Label>
            <Textarea
              placeholder="e.g. Entry: ${{entry_price}} | SL: ${{stop_loss}} | TP: ${{take_profit}}"
              value={descriptionTemplate}
              onChange={(e) => setDescriptionTemplate(e.target.value)}
              data-testid="input-desc-template"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Embed Fields</Label>
              <Button variant="ghost" size="sm" onClick={addField} data-testid="button-add-field">
                <Plus className="h-3 w-3 mr-1" /> Add
              </Button>
            </div>
            <div className="space-y-2">
              {fieldsTemplate.map((f, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <Input
                    placeholder="Field name"
                    value={f.name}
                    onChange={(e) => updateField(i, "name", e.target.value)}
                    className="flex-1"
                    data-testid={`input-field-name-${i}`}
                  />
                  <Input
                    placeholder="Field value (e.g. {{ticker}})"
                    value={f.value}
                    onChange={(e) => updateField(i, "value", e.target.value)}
                    className="flex-1"
                    data-testid={`input-field-value-${i}`}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeField(i)}
                    data-testid={`button-remove-field-${i}`}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Footer Template</Label>
            <Input
              placeholder="e.g. Crowned Trader | Options"
              value={footerTemplate}
              onChange={(e) => setFooterTemplate(e.target.value)}
              data-testid="input-footer-template"
            />
          </div>

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={isPending}
            data-testid="button-submit-type"
          >
            {isPending ? "Saving..." : mode === "edit" ? "Save Changes" : "Create Template"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

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
          {signalTypes.map(st => {
            const vars = st.variables as Array<{ name: string; type: string; label?: string }>;
            const fields = st.fieldsTemplate as Array<{ name: string; value: string }>;
            return (
              <Card key={st.id} data-testid={`card-type-${st.id}`} className="flex flex-col">
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: st.color }} />
                    <span className="font-semibold text-lg">{st.name}</span>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingType(st)}
                      data-testid={`button-edit-type-${st.id}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(st.id)}
                      data-testid={`button-delete-type-${st.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 flex-1">
                  {vars.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Variables ({vars.length})</p>
                      <div className="flex flex-wrap gap-1">
                        {vars.map(v => (
                          <Badge key={v.name} variant="secondary" className="text-xs" data-testid={`badge-var-${v.name}`}>
                            {v.label || v.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {st.titleTemplate && (
                    <div>
                      <p className="text-xs text-muted-foreground">Title</p>
                      <p className="text-sm font-mono break-all">{st.titleTemplate}</p>
                    </div>
                  )}
                  {st.descriptionTemplate && (
                    <div>
                      <p className="text-xs text-muted-foreground">Description</p>
                      <p className="text-sm font-mono break-all whitespace-pre-wrap">{st.descriptionTemplate}</p>
                    </div>
                  )}
                  {fields.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground">Embed Fields ({fields.length})</p>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-1">
                        {fields.map((f, i) => (
                          <div key={i} className="text-xs">
                            <span className="text-muted-foreground">{f.name}:</span>{" "}
                            <span className="font-mono">{f.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {st.footerTemplate && (
                    <div>
                      <p className="text-xs text-muted-foreground">Footer</p>
                      <p className="text-xs font-mono">{st.footerTemplate}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
