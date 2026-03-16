import { renderTemplate } from "@shared/template-render";
import type { TemplateField } from "@shared/template-definitions";

export { renderTemplate } from "@shared/template-render";

export function renderFieldsWithData(
  fields: TemplateField[],
  data: Record<string, string>
): Array<{ name: string; value: string; inline: boolean }> {
  return fields.map((field) => {
    const name = renderTemplate(field.name, data);
    const value = renderTemplate(field.value, data);
    const isBlank = (!name || name === "\u200b") && (!value || value === "\u200b");
    return { name, value, inline: !isBlank };
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
