import { readFileSync, existsSync, statSync } from "fs";
import { join } from "path";
import type {
  Work,
  EmbeddingsFile,
  EmotionalWeightsFile,
  SearchResult,
  TranslationText,
} from "./types";

function readJSON<T>(filename: string): T {
  const filePath = join(process.cwd(), "data", filename);
  return JSON.parse(readFileSync(filePath, "utf-8")) as T;
}

interface CorpusFile {
  works: (Work & { texts: TranslationText[] })[];
}

interface CatalogFile {
  works: (Work & { translations: TranslationText[] })[];
}

export function getCorpus(): CorpusFile {
  return readJSON<CorpusFile>("corpus.json");
}

export function getCatalog(): CatalogFile {
  return readJSON<CatalogFile>("works-catalog.json");
}

export function getEmbeddings(): EmbeddingsFile {
  return readJSON<EmbeddingsFile>("embeddings.json");
}

let _weightsCache: { mtimeMs: number; data: EmotionalWeightsFile } | null = null;

/**
 * Load the per-line emotional-weight scores produced by `npm run weights`.
 * Returns null (not throws) if the file hasn't been generated yet — the UI
 * should render a "run npm run weights" empty state instead of crashing.
 *
 * The cache is keyed on the file's mtime so that re-running the scoring
 * script while the dev server is up is reflected immediately, rather than
 * requiring a server restart.
 */
export function getEmotionalWeights(): EmotionalWeightsFile | null {
  const path = join(process.cwd(), "data", "emotional-weights.json");
  if (!existsSync(path)) return null;
  const mtimeMs = statSync(path).mtimeMs;
  if (_weightsCache && _weightsCache.mtimeMs === mtimeMs) {
    return _weightsCache.data;
  }
  const data = JSON.parse(readFileSync(path, "utf-8")) as EmotionalWeightsFile;
  _weightsCache = { mtimeMs, data };
  return data;
}

export function searchWorks(query: string): SearchResult[] {
  const q = query.toLowerCase();
  const results: SearchResult[] = [];

  const corpus = getCorpus();
  for (const work of corpus.works) {
    if (
      work.title.toLowerCase().includes(q) ||
      work.author.toLowerCase().includes(q)
    ) {
      const languages = [...new Set(work.texts.map((t) => t.language))];
      results.push({
        id: work.id,
        title: work.title,
        author: work.author,
        sourceLanguage: work.sourceLanguage,
        originalYear: work.year,
        translationCount: work.texts.filter((t) => t.translator !== null).length,
        languages,
        source: "corpus",
      });
    }
  }

  const catalog = getCatalog();
  for (const work of catalog.works) {
    if (
      work.title.toLowerCase().includes(q) ||
      work.author.toLowerCase().includes(q) ||
      (work.description?.toLowerCase().includes(q)) ||
      (work.tags?.some((tag) => tag.toLowerCase().includes(q)))
    ) {
      const languages = [...new Set(work.translations.map((t) => t.language))];
      results.push({
        id: work.id,
        title: work.title,
        author: work.author,
        sourceLanguage: work.sourceLanguage,
        originalYear: work.originalYear,
        description: work.description,
        translationCount: work.translations.length,
        languages,
        source: "catalog",
      });
    }
  }

  return results;
}

export function getWorkById(id: string): Work | null {
  const corpus = getCorpus();
  const corpusWork = corpus.works.find((w) => w.id === id);
  if (corpusWork) {
    return {
      ...corpusWork,
      translations: corpusWork.texts,
    };
  }

  const catalog = getCatalog();
  const catalogWork = catalog.works.find((w) => w.id === id);
  return catalogWork ?? null;
}

export function getTranslationsForWork(workId: string): TranslationText[] {
  const corpus = getCorpus();
  const corpusWork = corpus.works.find((w) => w.id === workId);
  if (corpusWork) return corpusWork.texts;

  const catalog = getCatalog();
  const catalogWork = catalog.works.find((w) => w.id === workId);
  return catalogWork?.translations ?? [];
}

export function getEmbeddingPointsForWork(workId: string) {
  const embeddings = getEmbeddings();
  return embeddings.points.filter((p) => p.workId === workId);
}

export function getAllEmbeddingPoints() {
  return getEmbeddings().points;
}

export function getFeaturedWorks(): SearchResult[] {
  const results: SearchResult[] = [];

  const corpus = getCorpus();
  for (const work of corpus.works) {
    const languages = [...new Set(work.texts.map((t) => t.language))];
    results.push({
      id: work.id,
      title: work.title,
      author: work.author,
      sourceLanguage: work.sourceLanguage,
      originalYear: work.year,
      translationCount: work.texts.filter((t) => t.translator !== null).length,
      languages,
      source: "corpus",
    });
  }

  const catalog = getCatalog();
  for (const work of catalog.works) {
    const languages = [...new Set(work.translations.map((t) => t.language))];
    results.push({
      id: work.id,
      title: work.title,
      author: work.author,
      sourceLanguage: work.sourceLanguage,
      originalYear: work.originalYear,
      description: work.description,
      translationCount: work.translations.length,
      languages,
      source: "catalog",
    });
  }

  return results;
}
