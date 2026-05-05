export type Era =
  | "original"
  | "1600s"
  | "1700s"
  | "1800s"
  | "1860s"
  | "1880s"
  | "1920s"
  | "1930s"
  | "1950s"
  | "1960s"
  | "1970s"
  | "1980s"
  | "1990s"
  | "2000s"
  | "2010s"
  | "2020s";

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
  source?: "gutenberg" | "curated" | "user";
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
  "1860s": "#d8b4fe",
  "1880s": "#e879f9",
  "1920s": "#f0abfc",
  "1930s": "#f472b6",
  "1950s": "#fb7185",
  "1960s": "#f97316",
  "1970s": "#f59e0b",
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
};
