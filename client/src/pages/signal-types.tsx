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
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  useSignalTypes,
  useCreateSignalType,
  useDeleteSignalType,
} from "@/hooks/use-signals";
import { Plus, Trash2, Settings, X } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { SIGNAL_COLORS } from "@/lib/constants";

interface VariableField {
  name: string;
  type: string;
  label: string;
}

interface EmbedField {
  name: string;
  value: string;
}

export default function SignalTypesPage() {
  const { data: signalTypes, isLoading } = useSignalTypes();
  const createSignalType = useCreateSignalType();
  const deleteSignalType = useDeleteSignalType();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const [name, setName] = useState("");
  const [color, setColor] = useState("#3B82F6");
  const [variables, setVariables] = useState<VariableField[]>([{ name: "", type: "string", label: "" }]);
  const [titleTemplate, setTitleTemplate] = useState("");
  const [descriptionTemplate, setDescriptionTemplate] = useState("");
  const [fieldsTemplate, setFieldsTemplate] = useState<EmbedField[]>([]);
  const [footerTemplate, setFooterTemplate] = useState("Crowned Trader Signals");

  function resetForm() {
    setName("");
    setColor("#3B82F6");
    setVariables([{ name: "", type: "string", label: "" }]);
    setTitleTemplate("");
    setDescriptionTemplate("");
    setFieldsTemplate([]);
    setFooterTemplate("Crowned Trader Signals");
  }

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

    try {
      await createSignalType.mutateAsync({
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
      toast({ title: "Signal type created" });
      resetForm();
      setOpen(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteSignalType.mutateAsync(id);
      toast({ title: "Signal type deleted" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
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
            Signal Types
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage your signal type templates
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-type">
              <Plus className="h-4 w-4 mr-2" /> New Signal Type
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Signal Type</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    placeholder="e.g. Entry, Stop Loss"
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
                  placeholder="e.g. {{ticker}} Entry Alert"
                  value={titleTemplate}
                  onChange={(e) => setTitleTemplate(e.target.value)}
                  data-testid="input-title-template"
                />
              </div>

              <div className="space-y-2">
                <Label>Description Template</Label>
                <Textarea
                  placeholder="e.g. New entry for {{ticker}} at {{entry_price}}"
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
                  placeholder="e.g. Crowned Trader Signals"
                  value={footerTemplate}
                  onChange={(e) => setFooterTemplate(e.target.value)}
                  data-testid="input-footer-template"
                />
              </div>

              <Button
                className="w-full"
                onClick={handleSubmit}
                disabled={createSignalType.isPending}
                data-testid="button-submit-type"
              >
                {createSignalType.isPending ? "Creating..." : "Create Signal Type"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {!signalTypes || signalTypes.length === 0 ? (
        <EmptyState
          icon={Settings}
          title="No signal types"
          description="Create your first signal type to get started."
          testId="empty-signal-types"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {signalTypes.map(st => {
            const vars = st.variables as Array<{ name: string; type: string; label?: string }>;
            return (
              <Card key={st.id} data-testid={`card-type-${st.id}`}>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: st.color }} />
                    <span className="font-semibold">{st.name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(st.id)}
                    data-testid={`button-delete-type-${st.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  {vars.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {vars.map(v => (
                        <Badge key={v.name} variant="secondary" data-testid={`badge-var-${v.name}`}>
                          {v.label || v.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {st.titleTemplate && (
                    <div>
                      <p className="text-xs text-muted-foreground">Title</p>
                      <p className="text-sm font-mono">{st.titleTemplate}</p>
                    </div>
                  )}
                  {st.descriptionTemplate && (
                    <div>
                      <p className="text-xs text-muted-foreground">Description</p>
                      <p className="text-sm font-mono">{st.descriptionTemplate}</p>
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
