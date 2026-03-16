import { renderTemplate } from "@shared/template-render";
import { normalizeSpacerField } from "@shared/discord-embed-fields";

export interface TemplateField {
  name: string;
  value: string;
  inline?: boolean;
}

export { renderTemplate } from "@shared/template-render";

export function renderFieldsWithData(
  fields: TemplateField[],
  data: Record<string, string>
): Array<{ name: string; value: string; inline: boolean }> {
  return fields.map((field) => {
    const name = normalizeSpacerField(renderTemplate(field.name, data));
    const value = normalizeSpacerField(renderTemplate(field.value, data));
    return { name, value, inline: field.inline ?? true };
  });
}

export function buildPreviewEmbed(
  template: {
    color: string;
    titleTemplate: string;
    descriptionTemplate: string;
    fieldsTemplate: TemplateField[];
    footerTemplate: string;
    showTitleDefault: boolean;
    showDescriptionDefault: boolean;
  },
  data: Record<string, string>
) {
  return {
    title: template.showTitleDefault ? renderTemplate(template.titleTemplate, data) : "",
    description: template.showDescriptionDefault ? renderTemplate(template.descriptionTemplate, data) : "",
    fields: renderFieldsWithData(template.fieldsTemplate, data),
    footer: renderTemplate(template.footerTemplate, data),
    color: template.color,
  };
}
