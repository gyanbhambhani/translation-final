import type { ProvenanceKind } from "@/lib/types";

/**
 * One source-of-truth labelling for the typed provenance categories.
 * Every UI surface that displays a translation imports from here so the
 * label, colour, and short tagline are consistent across the app.
 *
 * The big honesty job this file does: making sure a "register study"
 * never reads as if it were a published translation.
 */
const KIND_META: Record<
  ProvenanceKind,
  { label: string; tag: string; tone: "neutral" | "warn" | "accent" }
> = {
  original: {
    label: "Original",
    tag: "Author's source text",
    tone: "neutral",
  },
  "register-study": {
    label: "Register study",
    tag: "Composed for this project — not a published translation",
    tone: "warn",
  },
  "project-author": {
    label: "This project",
    tag: "Translation by the project author",
    tone: "accent",
  },
  gutenberg: {
    label: "Project Gutenberg",
    tag: "Verifiable public-domain source",
    tone: "neutral",
  },
  curated: {
    label: "Curated source",
    tag: "Verifiable historic excerpt",
    tone: "neutral",
  },
  user: {
    label: "Your translation",
    tag: "In-session only — not stored",
    tone: "accent",
  },
};

const TONE_CLASSES: Record<"neutral" | "warn" | "accent", string> = {
  neutral: "text-ink-muted border-rule",
  warn: "text-accent border-accent/45",
  accent: "text-ink border-ink-faint",
};

export function provenanceMeta(kind: ProvenanceKind | undefined) {
  if (!kind) return null;
  return KIND_META[kind] ?? null;
}

interface PillProps {
  kind?: ProvenanceKind;
  className?: string;
}

/**
 * The compact "Register study" / "Project Gutenberg" pill — fits next
 * to translator names in tight UI like search result cards, the line
 * alignment column header, the scatter-plot tooltip.
 */
export function ProvenancePill({ kind, className = "" }: PillProps) {
  const meta = provenanceMeta(kind);
  if (!meta) return null;
  const tone = TONE_CLASSES[meta.tone];
  return (
    <span
      title={meta.tag}
      className={`small-caps text-[9.5px] tracking-[0.16em] px-1.5 py-px border whitespace-nowrap ${tone} ${className}`}
    >
      {meta.label}
    </span>
  );
}

interface LineProps {
  kind?: ProvenanceKind;
  provenance?: string;
  sourceUrl?: string;
}

/**
 * The expanded provenance block — one line of disclosure under a
 * translation, used inside expandable cards and on the work detail
 * page. Renders nothing if there is no provenance metadata at all.
 */
export function ProvenanceLine({
  kind,
  provenance,
  sourceUrl,
}: LineProps) {
  const meta = provenanceMeta(kind);
  if (!meta && !provenance) return null;
  return (
    <div className="mt-3 pt-3 border-t border-rule space-y-1">
      {meta && (
        <p className="small-caps text-[10px] tracking-[0.18em] text-ink-faint">
          <span className={meta.tone === "warn" ? "text-accent" : "text-ink-muted"}>
            {meta.label}
          </span>
          <span className="text-ink-faint"> · </span>
          <span>{meta.tag}</span>
        </p>
      )}
      {provenance && (
        <p className="text-ink-muted text-[12px] leading-[1.55]">
          {provenance}
          {sourceUrl && (
            <>
              {" "}
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="link tabular text-[11.5px]"
              >
                source ↗
              </a>
            </>
          )}
        </p>
      )}
    </div>
  );
}
