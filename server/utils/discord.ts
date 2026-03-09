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
  embed: DiscordEmbed
): Promise<boolean> {
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [embed],
      }),
    });
    return res.ok;
  } catch (err) {
    console.error("Discord webhook error:", err);
    return false;
  }
}
