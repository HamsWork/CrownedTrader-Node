export function renderTemplate(
  template: string,
  data: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key) => {
    return data[key] ?? `{{${key}}}`;
  });
}

export function renderFieldsTemplate(
  fields: Array<{ name: string; value: string; inline?: boolean }>,
  data: Record<string, string>
): Array<{ name: string; value: string; inline: boolean }> {
  return fields.map((field) => ({
    name: renderTemplate(field.name, data),
    value: renderTemplate(field.value, data),
    inline: field.inline ?? true,
  }));
}
