/**
 * Shared line-splitting logic used by both the offline emotional-weight
 * scoring script and the per-work alignment / drift visualizations.
 *
 * - For verse poetry (lines short, hard `\n` breaks), this acts as a
 *   plain `split("\n")` after trimming and dropping blanks.
 * - For prose paragraphs (catalog previews from Project Gutenberg),
 *   any "line" longer than the threshold is further broken on sentence
 *   boundaries (`.!?।` followed by an uppercase / Devanagari letter).
 * - If sentence-boundary splitting still leaves chunks too long
 *   (typical of 18th- and 19th-century English translations that use
 *   `;` as the dominant clause separator), we fall back to a stronger
 *   split that includes `;` and `:` as break points.
 *
 * The function is deterministic and language-agnostic — it works the
 * same on English, Hindi (Devanagari `।`), Sanskrit, Bengali, etc.
 */
export function splitLines(text: string): string[] {
  const SOFT_BREAK = /(?<=[.!?।])\s+(?=[A-Z\u0900-\u097F"'])/u;
  const HARD_BREAK = /(?<=[.!?;:।])\s+/u;
  const LONG_LINE_THRESHOLD = 22;
  const STILL_TOO_LONG = 28;

  const wc = (s: string) => s.split(/\s+/).filter(Boolean).length;

  const paragraphs = text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const out: string[] = [];
  for (const p of paragraphs) {
    if (wc(p) <= LONG_LINE_THRESHOLD) {
      out.push(p);
      continue;
    }

    let pieces = p
      .split(SOFT_BREAK)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const stillChunky =
      pieces.length === 1 || pieces.some((s) => wc(s) > STILL_TOO_LONG);

    if (stillChunky) {
      pieces = p
        .split(HARD_BREAK)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    }

    if (pieces.length > 1) out.push(...pieces);
    else out.push(p);
  }
  return out;
}
