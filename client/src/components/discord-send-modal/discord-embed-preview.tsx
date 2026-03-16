import type { ReactNode } from "react";

export interface DiscordEmbedData {
  title: string;
  description: string;
  fields: Array<{ name: string; value: string }>;
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

function renderDiscordMarkdown(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

export function DiscordEmbedPreview({
  embed,
  content,
  botName = "Crowned Trader",
  botInitials = "CT",
  botAvatarColor = "#CCB167",
}: DiscordEmbedPreviewProps) {
  return (
    <div className="rounded-md bg-[#313338] p-4" data-testid="discord-embed-preview">
      {content && (
        <p className="text-sm text-white mb-3" data-testid="preview-content">{content}</p>
      )}
      <div className="flex items-start gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-full font-bold text-xs flex-shrink-0"
          style={{ backgroundColor: botAvatarColor, color: "#000" }}
        >
          {botInitials}
        </div>
        <div className="flex-1 space-y-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-white">{botName}</span>
            <span className="text-[10px] bg-[#5865F2] text-white px-1 py-0 rounded-sm font-medium">BOT</span>
          </div>
          <div
            className="rounded-md border-l-4 p-3 space-y-2 bg-[#2b2d31] mt-1"
            style={{ borderLeftColor: embed.color }}
            data-testid="preview-embed"
          >
            {embed.title && (
              <p className="font-bold text-sm text-white" data-testid="preview-title">{embed.title}</p>
            )}
            {embed.description && (
              <p className="text-sm text-gray-300 whitespace-pre-wrap" data-testid="preview-description">
                {renderDiscordMarkdown(embed.description)}
              </p>
            )}
            {embed.fields.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 pt-1" data-testid="preview-fields">
                {embed.fields.map((f, i) => (
                  <div key={i} data-testid={`preview-field-${i}`}>
                    <p className="text-xs font-semibold text-gray-400">{f.name}</p>
                    <p className="text-sm text-gray-200">{renderDiscordMarkdown(f.value)}</p>
                  </div>
                ))}
              </div>
            )}
            {embed.footer && (
              <p className="text-xs text-gray-500 pt-2 border-t border-gray-600" data-testid="preview-footer">
                {embed.footer}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
