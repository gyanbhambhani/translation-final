import { type NextRequest } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import OpenAI from "openai";
import { getCorpus, getCatalog, getEmbeddings } from "@/lib/data";

/* ───────────────────── types ───────────────────── */

interface VectorItem {
  id: string;
  workId: string;
  vector: number[];
}

interface VectorsFile {
  _meta: { model: string; dimensions: number; generatedAt: string };
  items: VectorItem[];
}

interface WorkMeta {
  title: string;
  author: string;
  sourceLanguage: string;
}

interface PointMeta {
  translator: string | null;
  year: number | null;
  era: string | null;
  language: string | null;
  kind: string | null;
  previewText: string;
}

interface SearchDoc {
  pointId: string;
  workId: string;
  tokens: string[];
}

interface CorpusIndex {
  docs: SearchDoc[];
  workById: Map<string, WorkMeta>;
  pointById: Map<string, PointMeta>;
  vectorsById: Map<string, number[]>;
  df: Map<string, number>;
  avgDocLen: number;
  totalDocs: number;
}

/* ───────────────────── disk + index caches ───────────────────── */

let cachedVectors: VectorsFile | null = null;
let cachedIndex: CorpusIndex | null = null;

function getVectors(): VectorsFile {
  if (cachedVectors) return cachedVectors;
  const path = join(process.cwd(), "data", "vectors.json");
  cachedVectors = JSON.parse(readFileSync(path, "utf-8")) as VectorsFile;
  return cachedVectors;
}

const STOPWORDS = new Set([
  "the", "a", "an", "of", "in", "on", "at", "to", "for", "and", "or", "but",
  "is", "are", "was", "were", "be", "been", "being", "as", "by", "with",
  "this", "that", "these", "those", "it", "its", "i", "we", "you", "he",
  "she", "they", "them", "his", "her", "their", "our", "my", "your",
  "what", "which", "who", "whom", "whose", "do", "does", "did", "have",
  "has", "had", "from", "into", "about", "than", "then", "so", "if", "not",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s'-]/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t));
}

function buildIndex(): CorpusIndex {
  if (cachedIndex) return cachedIndex;

  const vectors = getVectors();
  const embeddings = getEmbeddings();
  const pointsById = new Map(embeddings.points.map((p) => [p.id, p]));

  const workById = new Map<string, WorkMeta>();
  for (const w of getCorpus().works) {
    workById.set(w.id, {
      title: w.title,
      author: w.author,
      sourceLanguage: w.sourceLanguage,
    });
  }
  for (const w of getCatalog().works) {
    workById.set(w.id, {
      title: w.title,
      author: w.author,
      sourceLanguage: w.sourceLanguage,
    });
  }

  const docs: SearchDoc[] = [];
  const pointById = new Map<string, PointMeta>();
  const vectorsById = new Map<string, number[]>();

  for (const it of vectors.items) {
    const point = pointsById.get(it.id);
    const work = workById.get(it.workId);
    const parts: string[] = [];
    if (work?.title) parts.push(work.title);
    if (work?.author) parts.push(work.author);
    if (work?.sourceLanguage) parts.push(work.sourceLanguage);
    if (point?.translator) parts.push(point.translator);
    if (point?.language) parts.push(point.language);
    if (point?.era) parts.push(point.era);
    if (point?.previewText) parts.push(point.previewText);

    docs.push({
      pointId: it.id,
      workId: it.workId,
      tokens: tokenize(parts.join(" ")),
    });
    pointById.set(it.id, {
      translator: point?.translator ?? null,
      year: point?.year ?? null,
      era: point?.era ?? null,
      language: point?.language ?? null,
      kind: point?.kind ?? null,
      previewText: point?.previewText ?? "",
    });
    vectorsById.set(it.id, it.vector);
  }

  const df = new Map<string, number>();
  for (const d of docs) {
    const seen = new Set<string>();
    for (const t of d.tokens) {
      if (seen.has(t)) continue;
      seen.add(t);
      df.set(t, (df.get(t) ?? 0) + 1);
    }
  }
  const avgDocLen =
    docs.reduce((s, d) => s + d.tokens.length, 0) / Math.max(1, docs.length);

  cachedIndex = {
    docs,
    workById,
    pointById,
    vectorsById,
    df,
    avgDocLen,
    totalDocs: docs.length,
  };
  return cachedIndex;
}

/* ───────────────────── scoring ───────────────────── */

function cosineSimilarity(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function bm25Score(
  qTokens: string[],
  doc: SearchDoc,
  idx: CorpusIndex,
  k1 = 1.5,
  b = 0.75
): number {
  if (qTokens.length === 0 || doc.tokens.length === 0) return 0;
  const N = idx.totalDocs;
  const dl = doc.tokens.length;
  const avgdl = idx.avgDocLen;

  const tf = new Map<string, number>();
  for (const t of doc.tokens) tf.set(t, (tf.get(t) ?? 0) + 1);

  let score = 0;
  for (const qt of qTokens) {
    const f = tf.get(qt) ?? 0;
    if (f === 0) continue;
    const dfT = idx.df.get(qt) ?? 0;
    const idf = Math.log(1 + (N - dfT + 0.5) / (dfT + 0.5));
    const num = f * (k1 + 1);
    const den = f + k1 * (1 - b + (b * dl) / Math.max(1, avgdl));
    score += idf * (num / den);
  }
  return score;
}

/** Reciprocal Rank Fusion (Cormack et al. 2009). */
function rrf(ranks: number[], k = 60): number {
  let s = 0;
  for (const r of ranks) {
    if (r >= 0) s += 1 / (k + r + 1);
  }
  return s;
}

/** Map raw cosine into a perceptual 0–100 "match" score, calibrated for
 *  text-embedding-3-small (where unrelated text typically sits at ~0.1–0.2,
 *  related text at ~0.30–0.45, and strong matches at 0.50+). */
function matchPercent(cosine: number): number {
  const x = (cosine - 0.28) * 8;
  const s = 1 / (1 + Math.exp(-x));
  return Math.round(s * 100);
}

function band(cosine: number): "strong" | "close" | "related" | "loose" {
  if (cosine >= 0.55) return "strong";
  if (cosine >= 0.42) return "close";
  if (cosine >= 0.30) return "related";
  return "loose";
}

/* ───────────────────── HyDE ───────────────────── */

const HYDE_CACHE_MAX = 200;
const hydeCache = new Map<string, { text: string; vector: number[] }>();

function hydeKey(q: string): string {
  return q.toLowerCase().trim().replace(/\s+/g, " ");
}

const HYDE_SYSTEM = [
  "You write a brief literary passage (3-5 sentences, ~80 words) that an",
  "editor might match against a query about world poetry, philosophy, or",
  "literature in translation. Write evocative, image-rich prose as though",
  "excerpted from a translation. No preamble, no quotes, no title — just",
  "the passage itself.",
].join(" ");

async function generateHyDE(openai: OpenAI, q: string): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.5,
    max_tokens: 200,
    messages: [
      { role: "system", content: HYDE_SYSTEM },
      { role: "user", content: `Query: ${q}\n\nWrite the hypothetical passage.` },
    ],
  });
  return completion.choices[0]?.message?.content?.trim() ?? "";
}

function rememberHyde(key: string, text: string, vector: number[]) {
  if (hydeCache.size >= HYDE_CACHE_MAX) {
    const firstKey = hydeCache.keys().next().value;
    if (firstKey !== undefined) hydeCache.delete(firstKey);
  }
  hydeCache.set(key, { text, vector });
}

/* ───────────────────── handler ───────────────────── */

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!q) {
    return Response.json({ query: "", results: [], hyde: null, usedHyde: false });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "OPENAI_API_KEY is not configured" },
      { status: 503 }
    );
  }

  const useHyde = request.nextUrl.searchParams.get("hyde") !== "0";
  const limit = Math.min(
    Math.max(Number(request.nextUrl.searchParams.get("limit") ?? 12), 1),
    30
  );

  const openai = new OpenAI({ apiKey });
  const idx = buildIndex();
  const cacheKey = hydeKey(q);

  let hydeText: string | null = null;
  let hydeVec: number[] | null = null;

  // Reuse a recent HyDE passage for the same query if we have one.
  if (useHyde && q.length >= 4) {
    const cached = hydeCache.get(cacheKey);
    if (cached) {
      hydeText = cached.text;
      hydeVec = cached.vector;
    }
  }

  // Embed the raw query in parallel with HyDE (when not cached) so the
  // overall latency is dominated by the slower of the two.
  const queryEmbedPromise = openai.embeddings.create({
    model: "text-embedding-3-small",
    input: q,
  });

  let hydeWork: Promise<void> | null = null;
  if (useHyde && q.length >= 4 && hydeVec === null) {
    hydeWork = (async () => {
      try {
        const text = await generateHyDE(openai, q);
        if (!text) return;
        const r = await openai.embeddings.create({
          model: "text-embedding-3-small",
          input: text,
        });
        hydeText = text;
        hydeVec = r.data[0].embedding;
        rememberHyde(cacheKey, text, hydeVec);
      } catch {
        // HyDE is best-effort; fall back to the raw query alone.
      }
    })();
  }

  const queryRes = await queryEmbedPromise;
  const queryVec = queryRes.data[0].embedding;
  if (hydeWork) await hydeWork;

  // ─── Lexical (BM25) ───
  const qTokens = tokenize(q);
  const bm25 = idx.docs.map((d) => ({
    pointId: d.pointId,
    workId: d.workId,
    score: bm25Score(qTokens, d, idx),
  }));
  bm25.sort((a, b) => b.score - a.score);
  const bm25Rank = new Map<string, number>();
  bm25.forEach((r, i) => {
    if (r.score > 0) bm25Rank.set(r.pointId, i);
  });

  // ─── Semantic (cosine — max of raw query and HyDE passage) ───
  type SemRow = {
    pointId: string;
    workId: string;
    cosine: number;
    cosineQuery: number;
    cosineHyde: number | null;
  };
  const sem: SemRow[] = idx.docs.map((d) => {
    const v = idx.vectorsById.get(d.pointId)!;
    const sQ = cosineSimilarity(queryVec, v);
    const sH = hydeVec ? cosineSimilarity(hydeVec, v) : -1;
    return {
      pointId: d.pointId,
      workId: d.workId,
      cosine: Math.max(sQ, sH),
      cosineQuery: sQ,
      cosineHyde: hydeVec ? sH : null,
    };
  });
  sem.sort((a, b) => b.cosine - a.cosine);
  const semRank = new Map<string, number>(sem.map((r, i) => [r.pointId, i]));

  // ─── Fuse (RRF over semantic + BM25 ranks) ───
  const fused = sem.map((s) => {
    const rs = semRank.get(s.pointId) ?? -1;
    const rb = bm25Rank.get(s.pointId) ?? -1;
    return { ...s, bm25Rank: rb, fused: rrf([rs, rb]) };
  });
  fused.sort((a, b) => b.fused - a.fused);
  const top = fused.slice(0, limit);

  const results = top.map((s) => {
    const point = idx.pointById.get(s.pointId);
    const work = idx.workById.get(s.workId);
    return {
      pointId: s.pointId,
      workId: s.workId,
      workTitle: work?.title ?? "Unknown",
      author: work?.author ?? "Unknown",
      sourceLanguage: work?.sourceLanguage,
      translator: point?.translator ?? null,
      year: point?.year ?? null,
      era: point?.era ?? null,
      language: point?.language ?? null,
      kind: point?.kind ?? null,
      previewText: point?.previewText ?? "",
      similarity: s.cosine,
      similarityQuery: s.cosineQuery,
      similarityHyde: s.cosineHyde,
      matchPercent: matchPercent(s.cosine),
      band: band(s.cosine),
      lexicalHit: s.bm25Rank >= 0,
      lexicalRank: s.bm25Rank >= 0 ? s.bm25Rank + 1 : null,
      fusedScore: s.fused,
    };
  });

  return Response.json({
    query: q,
    hyde: hydeText,
    usedHyde: hydeVec !== null,
    results,
  });
}
