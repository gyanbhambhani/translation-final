#!/usr/bin/env tsx
/**
 * Generates real embeddings via OpenAI and reduces to 2D via UMAP.
 * Writes results to data/embeddings.json.
 *
 * Usage:
 *   OPENAI_API_KEY=sk-... npm run embed
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import OpenAI from "openai";
import { UMAP } from "umap-js";

const DATA_DIR = join(process.cwd(), "data");

interface TranslationText {
  id: string;
  workId: string;
  language: string;
  languageCode: string;
  translator: string | null;
  year: number;
  era: string;
  register: string;
  text?: string;
  previewText?: string;
  // Provenance metadata flows through to embeddings.json so every UI
  // surface can label register studies vs. real published translations.
  kind?: string;
  provenance?: string;
  sourceUrl?: string;
}

interface CorpusWork {
  id: string;
  texts: TranslationText[];
}

interface CatalogWork {
  id: string;
  translations: TranslationText[];
}

function readJSON<T>(filename: string): T {
  return JSON.parse(readFileSync(join(DATA_DIR, filename), "utf-8")) as T;
}

function collectTexts(): TranslationText[] {
  const corpus = readJSON<{ works: CorpusWork[] }>("corpus.json");
  const catalog = readJSON<{ works: CatalogWork[] }>("works-catalog.json");

  const texts: TranslationText[] = [];

  for (const work of corpus.works) {
    texts.push(...work.texts);
  }

  for (const work of catalog.works) {
    for (const t of work.translations) {
      if (t.previewText) texts.push(t);
    }
  }

  return texts;
}

async function embedBatch(
  openai: OpenAI,
  inputs: string[]
): Promise<number[][]> {
  const BATCH = 100;
  const all: number[][] = [];
  for (let i = 0; i < inputs.length; i += BATCH) {
    const slice = inputs.slice(i, i + BATCH);
    process.stdout.write(`  Embedding batch ${Math.floor(i / BATCH) + 1}/${Math.ceil(inputs.length / BATCH)}...\r`);
    const res = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: slice,
    });
    all.push(...res.data.sort((a, b) => a.index - b.index).map((d) => d.embedding));
  }
  console.log("\n  Done embedding.");
  return all;
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("ERROR: OPENAI_API_KEY environment variable is required.");
    process.exit(1);
  }

  const openai = new OpenAI({ apiKey });

  console.log("Collecting texts from corpus and catalog...");
  const texts = collectTexts();
  console.log(`  Found ${texts.length} texts.`);

  const inputs = texts.map((t) => {
    const content = t.text || t.previewText || "";
    return content.slice(0, 8000);
  });

  console.log("Generating embeddings via OpenAI text-embedding-3-small...");
  const vectors = await embedBatch(openai, inputs);

  console.log("Running UMAP dimensionality reduction...");
  const umap = new UMAP({
    nNeighbors: Math.min(5, vectors.length - 1),
    minDist: 0.3,
    nComponents: 2,
    nEpochs: 200,
    random: mulberry32(42),
  });

  const embedding2D = umap.fit(vectors);

  const points = texts.map((t, i) => ({
    id: t.id,
    workId: t.workId,
    x: embedding2D[i][0],
    y: embedding2D[i][1],
    language: t.language,
    languageCode: t.languageCode,
    translator: t.translator,
    year: t.year,
    era: t.era,
    register: t.register,
    previewText: (t.previewText || t.text || "").slice(0, 120),
    kind: t.kind,
    provenance: t.provenance,
    sourceUrl: t.sourceUrl,
  }));

  const output = {
    _meta: {
      model: "text-embedding-3-small",
      umapNeighbors: 5,
      umapMinDist: 0.3,
      generatedAt: new Date().toISOString(),
    },
    points,
  };

  const outPath = join(DATA_DIR, "embeddings.json");
  writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`\nWrote ${points.length} points to ${outPath}`);

  const vectorsOut = {
    _meta: {
      model: "text-embedding-3-small",
      dimensions: vectors[0]?.length ?? 0,
      generatedAt: new Date().toISOString(),
    },
    items: texts.map((t, i) => ({
      id: t.id,
      workId: t.workId,
      vector: vectors[i],
    })),
  };
  const vectorsPath = join(DATA_DIR, "vectors.json");
  writeFileSync(vectorsPath, JSON.stringify(vectorsOut));
  console.log(`Wrote ${vectorsOut.items.length} vectors to ${vectorsPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
