import { type NextRequest } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import OpenAI from "openai";
import { getCorpus, getCatalog, getEmbeddings } from "@/lib/data";

interface VectorItem {
  id: string;
  workId: string;
  vector: number[];
}

interface VectorsFile {
  _meta: { model: string; dimensions: number; generatedAt: string };
  items: VectorItem[];
}

let cachedVectors: VectorsFile | null = null;

function getVectors(): VectorsFile {
  if (cachedVectors) return cachedVectors;
  const path = join(process.cwd(), "data", "vectors.json");
  cachedVectors = JSON.parse(readFileSync(path, "utf-8")) as VectorsFile;
  return cachedVectors;
}

function cosineSimilarity(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

interface WorkMeta {
  title: string;
  author: string;
  sourceLanguage: string;
}

function buildWorkLookup(): Map<string, WorkMeta> {
  const m = new Map<string, WorkMeta>();
  for (const w of getCorpus().works) {
    m.set(w.id, {
      title: w.title,
      author: w.author,
      sourceLanguage: w.sourceLanguage,
    });
  }
  for (const w of getCatalog().works) {
    m.set(w.id, {
      title: w.title,
      author: w.author,
      sourceLanguage: w.sourceLanguage,
    });
  }
  return m;
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!q) {
    return Response.json({ query: "", results: [] });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "OPENAI_API_KEY is not configured" },
      { status: 503 }
    );
  }

  const openai = new OpenAI({ apiKey });
  const res = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: q,
  });
  const queryVec = res.data[0].embedding;

  const vectors = getVectors();
  const embeddings = getEmbeddings();
  const pointsById = new Map(embeddings.points.map((p) => [p.id, p]));
  const workById = buildWorkLookup();

  const scored = vectors.items.map((it) => ({
    id: it.id,
    workId: it.workId,
    similarity: cosineSimilarity(queryVec, it.vector),
  }));
  scored.sort((a, b) => b.similarity - a.similarity);

  const limit = Math.min(
    Math.max(Number(request.nextUrl.searchParams.get("limit") ?? 12), 1),
    30
  );
  const top = scored.slice(0, limit);

  const results = top.map((s) => {
    const point = pointsById.get(s.id);
    const work = workById.get(s.workId);
    return {
      pointId: s.id,
      workId: s.workId,
      workTitle: work?.title ?? "Unknown",
      author: work?.author ?? "Unknown",
      sourceLanguage: work?.sourceLanguage,
      translator: point?.translator ?? null,
      year: point?.year ?? null,
      era: point?.era ?? null,
      language: point?.language ?? null,
      previewText: point?.previewText ?? "",
      similarity: s.similarity,
    };
  });

  return Response.json({ query: q, results });
}
