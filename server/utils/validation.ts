export function isValidDiscordWebhookUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const isDiscordHost =
      parsed.hostname === "discord.com" ||
      parsed.hostname === "discordapp.com";
    const isWebhookPath = parsed.pathname.startsWith("/api/webhooks/");
    return parsed.protocol === "https:" && isDiscordHost && isWebhookPath;
  } catch {
    return false;
  }
}
