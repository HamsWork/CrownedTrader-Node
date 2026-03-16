import type { DiscordEmbedData } from "./discord-embed-preview";

function colorNameToDecimal(hex: string): number {
  const clean = hex.replace("#", "");
  return parseInt(clean, 16);
}

function decimalToHex(decimal: number): string {
  return "#" + decimal.toString(16).padStart(6, "0");
}

export function buildPayloadJson(embed: DiscordEmbedData | null | undefined, content?: string) {
  if (!embed) return { embeds: [{}] };

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
    embedObj.fields = embed.fields.map(f => {
      const isBlank = (!f.value || f.value === "\u200b") && (!f.name || f.name === "\u200b");
      return {
        name: f.name || "\u200b",
        value: f.value || "\u200b",
        inline: !isBlank,
      };
    });
  }

  if (embed.footer) {
    embedObj.footer = { text: embed.footer };
  }

  payload.embeds = [embedObj];

  return payload;
}

export function parsePayloadToEmbed(json: string): { embed: DiscordEmbedData; content?: string } | null {
  try {
    const payload = JSON.parse(json);
    const content = payload.content || undefined;
    const embedObj = payload.embeds?.[0];
    if (!embedObj) return null;

    const desc = (embedObj.description || "") as string;
    const boldMatch = desc.match(/^\*\*(.+?)\*\*\n?([\s\S]*)$/);
    const title = boldMatch ? boldMatch[1] : "";
    const description = boldMatch ? boldMatch[2] : desc;

    const color = typeof embedObj.color === "number" ? decimalToHex(embedObj.color) : "#CCB167";

    const fields = Array.isArray(embedObj.fields)
      ? embedObj.fields.map((f: { name?: string; value?: string; inline?: boolean }) => ({
          name: f.name || "",
          value: f.value || "",
          inline: f.inline !== false,
        }))
      : [];

    const footer = typeof embedObj.footer === "object" && embedObj.footer?.text
      ? String(embedObj.footer.text)
      : "";

    return { embed: { title, description, fields, footer, color }, content };
  } catch {
    return null;
  }
}

export interface EditablePayloadViewProps {
  value: string;
  onChange: (value: string) => void;
  hasError: boolean;
}

export function EditablePayloadView({ value, onChange, hasError }: EditablePayloadViewProps) {
  return (
    <div
      className={`h-full flex flex-col rounded-md bg-[#1e1f22] border p-0 font-mono text-xs text-gray-300 overflow-hidden ${
        hasError ? "border-red-500/50" : "border-[#2b2d31]"
      }`}
      data-testid="discord-payload-view"
    >
      <textarea
        className="w-full flex-1 min-h-[300px] bg-transparent p-4 font-mono text-xs text-gray-300 resize-none outline-none"
        value={value}
        onChange={e => onChange(e.target.value)}
        spellCheck={false}
        data-testid="textarea-payload-json"
      />
      {hasError && (
        <p className="text-[10px] text-red-400 px-4 pb-2">Invalid JSON — preview not updated</p>
      )}
    </div>
  );
}
