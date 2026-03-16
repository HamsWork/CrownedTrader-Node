import type { ReactNode } from "react";
import { ZWSP, normalizeSpacerField } from "@shared/discord-embed-fields";

export interface DiscordEmbedData {
  title: string;
  description: string;
  fields: Array<{ name: string; value: string; inline?: boolean }>;
  footer: string;
  color: string;
}

export interface DiscordEmbedPreviewProps {
  embed: DiscordEmbedData;
  content?: string;
  botName?: string;
  botInitials?: string;
  botAvatarColor?: string;
}

function isSpacerField(f: { name: string; value: string; inline?: boolean }): boolean {
  const n = normalizeSpacerField(f.name).trim();
  const v = normalizeSpacerField(f.value).trim();
  return (n === ZWSP || n === "") && (v === "" || v === ZWSP) && !f.inline;
}

type Section = { type: "spacer" | "inline" | "block"; fields: DiscordEmbedData["fields"] };

function buildSections(fields: DiscordEmbedData["fields"]): Section[] {
  const sections: Section[] = [];
  let currentInline: DiscordEmbedData["fields"] = [];

  const flushInline = () => {
    if (currentInline.length > 0) {
      sections.push({ type: "inline", fields: [...currentInline] });
      currentInline = [];
    }
  };

  for (const f of fields) {
    if (isSpacerField(f)) {
      flushInline();
      sections.push({ type: "spacer", fields: [] });
    } else if (f.inline) {
      currentInline.push(f);
    } else {
      flushInline();
      sections.push({ type: "block", fields: [f] });
    }
  }
  flushInline();
  return sections;
}

function renderMarkdown(text: string): ReactNode[] {
  return text.split(/\*\*(.*?)\*\*/).map((part, i) =>
    i % 2 === 1 ? <strong key={i}>{part}</strong> : part
  );
}

export function DiscordEmbedPreview({
  embed,
  content,
}: DiscordEmbedPreviewProps) {
  const sections = buildSections(embed.fields);

  return (
    <div className="h-full rounded-md bg-[#313338] p-4" data-testid="discord-embed-preview">
      {content && (
        <p className="text-[13px] text-white mb-3" data-testid="preview-content">{content}</p>
      )}
      <div className="rounded-md overflow-hidden bg-[#2b2d31] border border-[#1e1f22]" data-testid="preview-embed">
        <div className="flex">
          <div className="w-1 shrink-0" style={{ backgroundColor: embed.color }} />
          <div className="p-3 flex-1 min-w-0 space-y-2">
            {embed.title && (
              <p className="text-[13px] font-bold text-[#dbdee1]" data-testid="preview-title">{embed.title}</p>
            )}
            {embed.description && (
              <p className="text-[13px] text-[#dbdee1] font-medium leading-snug whitespace-pre-wrap" data-testid="preview-description">
                {renderMarkdown(embed.description)}
              </p>
            )}

            {sections.map((section, si) => {
              if (section.type === "spacer") {
                return <div key={si} className="h-1" />;
              }
              if (section.type === "inline") {
                return (
                  <div key={si} className="grid grid-cols-3 gap-2">
                    {section.fields.map((field, fi) => (
                      <div key={fi} className="min-w-0" data-testid={`preview-field-${si}-${fi}`}>
                        <p className="text-[11px] font-semibold text-[#b5bac1] uppercase tracking-wide">{normalizeSpacerField(field.name)}</p>
                        <p className="text-[12px] text-[#dbdee1] whitespace-pre-wrap break-words">{normalizeSpacerField(field.value)}</p>
                      </div>
                    ))}
                  </div>
                );
              }
              const field = section.fields[0];
              return (
                <div key={si} data-testid={`preview-field-block-${si}`}>
                  <p className="text-[11px] font-semibold text-[#b5bac1] uppercase tracking-wide">{normalizeSpacerField(field.name)}</p>
                  <p className="text-[12px] text-[#dbdee1] whitespace-pre-wrap break-words leading-relaxed">{normalizeSpacerField(field.value)}</p>
                </div>
              );
            })}

            {embed.footer && (
              <p className="text-[10px] text-[#949ba4] pt-1 border-t border-[#3f4147]" data-testid="preview-footer">
                {embed.footer}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
