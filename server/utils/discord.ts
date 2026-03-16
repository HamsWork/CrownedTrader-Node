import type { SignalType, Signal } from "@shared/schema";
import { renderTemplate, renderFieldsTemplate } from "./template";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

export interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  fields?: Array<{ name: string; value: string; inline: boolean }>;
  footer?: { text: string };
  timestamp?: string;
  image?: { url: string };
}

function hexToDecimal(hex: string): number {
  return parseInt(hex.replace("#", ""), 16);
}

export function buildEmbed(
  signalType: SignalType,
  signal: Signal
): DiscordEmbed {
  const data = (signal.data ?? {}) as Record<string, string>;
  const embed: DiscordEmbed = {
    color: hexToDecimal(signalType.color),
    timestamp: new Date().toISOString(),
  };

  if (signalType.showTitleDefault && signalType.titleTemplate) {
    embed.title = renderTemplate(signalType.titleTemplate, data);
  }
  if (signalType.showDescriptionDefault && signalType.descriptionTemplate) {
    embed.description = renderTemplate(signalType.descriptionTemplate, data);
  }

  const fieldsArr = signalType.fieldsTemplate as Array<{ name: string; value: string; inline?: boolean }>;
  if (fieldsArr && fieldsArr.length > 0) {
    embed.fields = renderFieldsTemplate(fieldsArr, data);
  }

  if (signalType.footerTemplate) {
    embed.footer = { text: renderTemplate(signalType.footerTemplate, data) };
  }

  return embed;
}

export interface DiscordResult {
  ok: boolean;
  error?: string;
}

export async function sendToDiscord(
  webhookUrl: string,
  embed: DiscordEmbed,
  content?: string
): Promise<DiscordResult> {
  try {
    const body: Record<string, unknown> = { embeds: [embed] };
    if (content) {
      body.content = content;
    }
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      let detail = `Discord returned ${res.status}`;
      try {
        const parsed = JSON.parse(errorText);
        if (parsed.message) detail = parsed.message;
      } catch { if (errorText) detail = errorText.slice(0, 200); }
      console.error("Discord webhook error:", res.status, errorText);
      return { ok: false, error: detail };
    }
    return { ok: true };
  } catch (err: any) {
    console.error("Discord webhook error:", err);
    return { ok: false, error: err.message || "Network error sending to Discord" };
  }
}

export async function sendFileToDiscord(
  webhookUrl: string,
  filePath: string,
  fileName: string,
  content?: string,
  embed?: DiscordEmbed
): Promise<DiscordResult> {
  try {
    const fs = await import("fs");
    const fileBuffer = fs.readFileSync(filePath);

    const formData = new FormData();

    if (embed) {
      const payload: Record<string, unknown> = { embeds: [embed] };
      if (content) payload.content = content;
      formData.append("payload_json", JSON.stringify(payload));
    } else {
      if (content) {
        formData.append("content", content);
      }
    }

    const blob = new Blob([fileBuffer]);
    formData.append("file", blob, fileName);

    const res = await fetch(webhookUrl, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      let detail = `Discord returned ${res.status}`;
      try {
        const parsed = JSON.parse(errorText);
        if (parsed.message) detail = parsed.message;
      } catch { if (errorText) detail = errorText.slice(0, 200); }
      console.error("Discord file webhook error:", res.status, errorText);
      return { ok: false, error: detail };
    }

    return { ok: true };
  } catch (err: any) {
    console.error("Discord file webhook error:", err);
    return { ok: false, error: err.message || "Network error sending file to Discord" };
  }
}
