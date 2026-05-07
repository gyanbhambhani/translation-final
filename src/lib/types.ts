export type Era =
  | "original"
  | "1600s"
  | "1700s"
  | "1800s"
  | "1840s"
  | "1860s"
  | "1880s"
  | "1900s"
  | "1910s"
  | "1920s"
  | "1930s"
  | "1940s"
  | "1950s"
  | "1960s"
  | "1970s"
  | "1980s"
  | "1990s"
  | "2000s"
  | "2010s"
  | "2020s";

/**
 * `kind` is the typed category of how a text entered the corpus. It
 * powers a short pill in the UI ("register study", "Project Gutenberg",
 * "this project") so a viewer can never confuse a published translation
 * with a register exercise composed for this project.
 *
 * `provenance` is the free-form citation / prose explanation that gets
 * surfaced on the work detail page. The catalog stores publication
 * citations there ("Coverdale Bible (1535), Psalm 23."); the corpus
 * stores register-study disclosure ("Composed by Gyan Bhambhani for
 * this project to evoke 1970s nayi-kavita Hindi…"). Same field, same
 * purpose: tell the reader where this text actually came from.
 *
 * `sourceUrl` is a verifiable link when one exists (Gutenberg,
 * archive.org, Poetry Foundation, etc.).
 */
export type ProvenanceKind =
  | "original" // The author's own English source poem.
  | "register-study" // Composed for this project to evoke a decade's register.
  | "project-author" // The project author's present-day translation.
  | "gutenberg" // Pulled live from Project Gutenberg.
  | "curated" // Hand-curated reference text with a `sourceUrl`.
  | "user"; // A user-submitted translation, in-session only.

export interface TranslationText {
  id: string;
  workId: string;
  language: string;
  languageCode: string;
  translator: string | null;
  year: number;
  era: Era;
  register: string;
  text?: string;
  previewText?: string;
  /** @deprecated kept for back-compat; new entries use `kind`. */
  source?: "gutenberg" | "curated" | "user";
  kind?: ProvenanceKind;
  provenance?: string;
  sourceUrl?: string;
  gutenbergTextId?: string;
}

export interface Work {
  id: string;
  title: string;
  author: string;
  sourceLanguage: string;
  originalYear?: number;
  year?: number;
  description?: string;
  collection?: string;
  tags?: string[];
  texts?: TranslationText[];
  translations?: TranslationText[];
}

export interface EmbeddingPoint {
  id: string;
  workId: string;
  x: number;
  y: number;
  language: string;
  languageCode: string;
  translator: string | null;
  year: number;
  era: Era;
  register: string;
  previewText: string;
  kind?: ProvenanceKind;
  provenance?: string;
  sourceUrl?: string;
  isUserSubmission?: boolean;
  userLabel?: string;
}

export interface EmbeddingsFile {
  _meta: {
    model: string;
    umapNeighbors: number;
    umapMinDist: number;
    generatedAt: string;
    note?: string;
  };
  points: EmbeddingPoint[];
}

export interface ScoredLine {
  index: number;
  text: string;
  wordCount: number;
  weight: number;
}

export interface ScoredText {
  id: string;
  workId: string;
  totalLines: number;
  totalWordCount: number;
  scoredAt: string;
  lines: ScoredLine[];
}

export interface EmotionalWeightsFile {
  _meta: {
    model: string;
    scale: string;
    generatedAt: string;
    note: string;
  };
  texts: Record<string, ScoredText>;
}

export interface SearchResult {
  id: string;
  title: string;
  author: string;
  sourceLanguage: string;
  originalYear?: number;
  description?: string;
  translationCount: number;
  languages: string[];
  source: "corpus" | "catalog";
}

export const ERA_COLORS: Record<string, string> = {
  original: "#6366f1",
  "1600s": "#8b5cf6",
  "1700s": "#a78bfa",
  "1800s": "#c4b5fd",
  "1840s": "#cbb5fd",
  "1860s": "#d8b4fe",
  "1880s": "#e879f9",
  "1900s": "#f0abfc",
  "1910s": "#f0abc4",
  "1920s": "#f472b6",
  "1930s": "#fb7185",
  "1940s": "#f97373",
  "1950s": "#f97316",
  "1960s": "#f59e0b",
  "1970s": "#eab308",
  "1980s": "#84cc16",
  "1990s": "#22c55e",
  "2000s": "#06b6d4",
  "2010s": "#3b82f6",
  "2020s": "#1d4ed8",
};

export const LANGUAGE_SHAPES: Record<string, string> = {
  English: "circle",
  Hindi: "square",
  French: "triangle",
  German: "diamond",
  Spanish: "cross",
  Persian: "star",
  "Ancient Greek": "circle",
  Latin: "diamond",
  Chinese: "square",
  Italian: "triangle",
  Bengali: "cross",
};
