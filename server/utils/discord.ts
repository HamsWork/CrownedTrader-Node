import type { SignalType, Signal } from "@shared/schema";
import { renderTemplate, renderFieldsTemplate } from "./template";

interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  fields?: Array<{ name: string; value: string; inline: boolean }>;
  footer?: { text: string };
  timestamp?: string;
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

  const fieldsArr = signalType.fieldsTemplate as Array<{ name: string; value: string }>;
  if (fieldsArr && fieldsArr.length > 0) {
    embed.fields = renderFieldsTemplate(fieldsArr, data);
  }

  if (signalType.footerTemplate) {
    embed.footer = { text: renderTemplate(signalType.footerTemplate, data) };
  }

  return embed;
}

export async function sendToDiscord(
  webhookUrl: string,
  embed: DiscordEmbed,
  content?: string
): Promise<boolean> {
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
    return res.ok;
  } catch (err) {
    console.error("Discord webhook error:", err);
    return false;
  }
}

export async function sendFileToDiscord(
  webhookUrl: string,
  filePath: string,
  fileName: string,
  content?: string
): Promise<boolean> {
  try {
    const fs = await import("fs");
    const fileBuffer = fs.readFileSync(filePath);

    const formData = new FormData();
    if (content) {
      formData.append("content", content);
    }
    const blob = new Blob([fileBuffer]);
    formData.append("file", blob, fileName);

    const res = await fetch(webhookUrl, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      console.error("Discord file webhook response error:", res.status, errorText);
    }

    return res.ok;
  } catch (err) {
    console.error("Discord file webhook error:", err);
    return false;
  }
}
