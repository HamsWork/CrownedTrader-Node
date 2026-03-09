import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, X } from "lucide-react";
import { SIGNAL_COLORS } from "@/lib/constants";
import type { SignalType } from "@shared/schema";
import type { TemplateVariable, TemplateField } from "@shared/template-definitions";

interface TemplateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: SignalType | null;
  onSubmit: (data: any) => Promise<void>;
  isPending: boolean;
  mode: "create" | "edit";
}

export function TemplateFormDialog({
  open,
  onOpenChange,
  initial,
  onSubmit,
  isPending,
  mode,
}: TemplateFormDialogProps) {
  const initVars = (initial?.variables as TemplateVariable[] | undefined);
  const initFields = (initial?.fieldsTemplate as TemplateField[] | undefined);

  const [name, setName] = useState(initial?.name ?? "");
  const [color, setColor] = useState(initial?.color ?? "#3B82F6");
  const [variables, setVariables] = useState<TemplateVariable[]>(
    initVars && initVars.length > 0 ? initVars : [{ name: "", type: "string", label: "" }]
  );
  const [titleTemplate, setTitleTemplate] = useState(initial?.titleTemplate ?? "");
  const [descriptionTemplate, setDescriptionTemplate] = useState(initial?.descriptionTemplate ?? "");
  const [fieldsTemplate, setFieldsTemplate] = useState<TemplateField[]>(
    initFields ?? []
  );
  const [footerTemplate, setFooterTemplate] = useState(initial?.footerTemplate ?? "Crowned Trader Signals");
  const { toast } = useToast();

  function addVariable() {
    setVariables([...variables, { name: "", type: "string", label: "" }]);
  }

  function removeVariable(index: number) {
    setVariables(variables.filter((_, i) => i !== index));
  }

  function updateVariable(index: number, field: keyof TemplateVariable, value: string) {
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

  function updateField(index: number, field: keyof TemplateField, value: string) {
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
