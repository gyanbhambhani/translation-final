import { readFileSync } from "fs";
import { join } from "path";
import type { Work, EmbeddingsFile, SearchResult, TranslationText } from "./types";

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
  const corpus = getCorpus();
  return corpus.works.map((work) => {
    const languages = [...new Set(work.texts.map((t) => t.language))];
    return {
      id: work.id,
      title: work.title,
      author: work.author,
      sourceLanguage: work.sourceLanguage,
      originalYear: work.year,
      translationCount: work.texts.filter((t) => t.translator !== null).length,
      languages,
      source: "corpus" as const,
    };
  });
}
