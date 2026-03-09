import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2 } from "lucide-react";
import type { SignalType } from "@shared/schema";
import type { TemplateVariable, TemplateField } from "@shared/template-definitions";

interface TemplateCardProps {
  template: SignalType;
  onEdit?: (template: SignalType) => void;
  onDelete?: (id: number) => void;
  readonly?: boolean;
}

export function TemplateCard({ template, onEdit, onDelete, readonly }: TemplateCardProps) {
  const vars = template.variables as TemplateVariable[];
  const fields = template.fieldsTemplate as TemplateField[];

  return (
    <Card data-testid={`card-type-${template.id}`} className="flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: template.color }} />
          <span className="font-semibold text-lg">{template.name}</span>
        </div>
        {!readonly && (
          <div className="flex gap-1">
            {onEdit && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(template)}
                data-testid={`button-edit-type-${template.id}`}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(template.id)}
                data-testid={`button-delete-type-${template.id}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
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
        {template.titleTemplate && (
          <div>
            <p className="text-xs text-muted-foreground">Title</p>
            <p className="text-sm font-mono break-all">{template.titleTemplate}</p>
          </div>
        )}
        {template.descriptionTemplate && (
          <div>
            <p className="text-xs text-muted-foreground">Description</p>
            <p className="text-sm font-mono break-all whitespace-pre-wrap">{template.descriptionTemplate}</p>
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
        {template.footerTemplate && (
          <div>
            <p className="text-xs text-muted-foreground">Footer</p>
            <p className="text-xs font-mono">{template.footerTemplate}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
