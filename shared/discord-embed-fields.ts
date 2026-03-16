/** Zero-width space used for Discord embed spacer fields */
export const ZWSP = "\u200b";

/** Literal 6-character string that some APIs return instead of the actual character */
const LITERAL_ZWSP = "\\u200b";

/**
 * Normalize a field string so spacer is the actual Unicode character,
 * not the literal "\\u200b". Ensures JSON and Discord preview show "\u200b" correctly.
 */
export function normalizeSpacerField(s: string | undefined | null): string {
  if (s === undefined || s === null || s === "") return ZWSP;
  if (s === ZWSP || s === LITERAL_ZWSP) return ZWSP;
  return s;
}
