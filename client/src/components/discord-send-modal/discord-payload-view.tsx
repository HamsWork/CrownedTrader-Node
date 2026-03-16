import type { DiscordEmbedData } from "./discord-embed-preview";

export interface DiscordPayloadViewProps {
  embed: DiscordEmbedData;
  content?: string;
}

function colorNameToDecimal(hex: string): number {
  const clean = hex.replace("#", "");
  return parseInt(clean, 16);
}

export function buildPayloadJson(embed: DiscordEmbedData, content?: string) {
  const payload: Record<string, unknown> = {};

  if (content) {
    payload.content = content;
  }

  const embedObj: Record<string, unknown> = {};

  if (embed.description) {
    embedObj.description = `**${embed.title}**\n${embed.description}`;
  } else if (embed.title) {
    embedObj.description = `**${embed.title}**`;
  }

  embedObj.color = colorNameToDecimal(embed.color);

  if (embed.fields.length > 0) {
    embedObj.fields = embed.fields.map(f => ({
      name: f.name,
      value: f.value,
      inline: true,
    }));
  }

  if (embed.footer) {
    embedObj.footer = { text: embed.footer };
  }

  payload.embeds = [embedObj];

  return payload;
}

export function DiscordPayloadView({ embed, content }: DiscordPayloadViewProps) {
  const payload = buildPayloadJson(embed, content);

  return (
    <div
      className="rounded-md bg-[#1e1f22] border border-[#2b2d31] p-4 font-mono text-xs text-gray-300 overflow-auto max-h-[400px]"
      data-testid="discord-payload-view"
    >
      <pre className="whitespace-pre-wrap break-words">
        {JSON.stringify(payload, null, 2)}
      </pre>
    </div>
  );
}
