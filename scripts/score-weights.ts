#!/usr/bin/env tsx
/**
 * Scores every line of every translation in data/corpus.json on a 0-1
 * "emotional weight" scale — 0 = restrained / observational, 1 = loaded /
 * emotionally charged. Used by the parallel-drift visualization on each
 * work page.
 *
 * Output: data/emotional-weights.json
 *
 * Idempotent: re-running only scores text-ids that aren't already in the
 * cache. Pass --refresh to re-score everything.
 *
 * Model selection:
 *   Default model is `o4-mini` — a small reasoning model that does
 *   noticeably better than gpt-4o-mini on nuanced literary judgments.
 *   Override with the MODEL env var (e.g. `o3`, `gpt-4o-mini`,
 *   `gpt-4.1-mini`) and tune reasoning depth with REASONING_EFFORT
 *   (`minimal` | `low` | `medium` | `high`). Concurrency via CONCURRENCY
 *   (default 3) speeds up reasoning runs since each call can take 5-15s.
 *
 * Usage:
 *   npm run weights
 *   npm run weights -- --refresh
 *   MODEL=o3 REASONING_EFFORT=high npm run weights -- --refresh
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import OpenAI from "openai";

const DATA_DIR = join(process.cwd(), "data");
const CORPUS_PATH = join(DATA_DIR, "corpus.json");
const CATALOG_PATH = join(DATA_DIR, "works-catalog.json");
const OUT_PATH = join(DATA_DIR, "emotional-weights.json");

const MODEL = process.env.MODEL ?? "o4-mini";
const REASONING_EFFORT =
  (process.env.REASONING_EFFORT as
    | "minimal"
    | "low"
    | "medium"
    | "high"
    | undefined) ?? "medium";
const CONCURRENCY = Math.max(1, Number(process.env.CONCURRENCY ?? "3"));

/** Treat any o-series or gpt-5 model as a reasoning model. */
function isReasoningModel(name: string): boolean {
  return /^(o\d|gpt-5)/i.test(name);
}

interface TranslationText {
  id: string;
  workId: string;
  language: string;
  translator: string | null;
  text?: string;
  previewText?: string;
}

interface CorpusFile {
  works: { id: string; title: string; texts: TranslationText[] }[];
}

interface CatalogFile {
  works: { id: string; title: string; translations: TranslationText[] }[];
}

interface ScoredLine {
  index: number;
  text: string;
  wordCount: number;
  weight: number;
}

interface ScoredText {
  id: string;
  workId: string;
  totalLines: number;
  totalWordCount: number;
  scoredAt: string;
  lines: ScoredLine[];
}

interface WeightsFile {
  _meta: {
    model: string;
    scale: string;
    generatedAt: string;
    note: string;
  };
  texts: Record<string, ScoredText>;
}

const SYSTEM_PROMPT = [
  "You are scoring lines of poetry on a 0-1 emotional-weight scale.",
  "0 means restrained, observational, neutral — a line that just describes",
  "or names a thing without affective charge. 1 means highly loaded —",
  "a line carrying intense emotion, violence, longing, sublimity, grief,",
  "rapture, or any other charged interior state. Mid-range values are",
  "common; reserve 0.85+ for genuinely intense lines and 0.15- for purely",
  "denotative ones.",
  "",
  "Return STRICT JSON with the shape:",
  '  { "weights": [<number>, <number>, ...] }',
  "with one weight per input line, in order. No prose, no markdown.",
  "Values are floats in [0, 1].",
].join("\n");

function splitLines(text: string): string[] {
  // First split on hard line breaks. For poetry corpora this gives us
  // verse lines. For prose previews (catalog works pulled from Project
  // Gutenberg), each paragraph still ends up as one "line" — typically
  // one long sentence punctuated with semicolons (especially in 18th-
  // and 19th-century English translations). To get usable granularity
  // for the drift path on those, we sentence-split anything over the
  // word threshold, and if that doesn't help we fall back to splitting
  // on strong clause boundaries (`;` and `:` count too).
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

function wordCount(line: string): number {
  return line.split(/\s+/).filter(Boolean).length;
}

async function scoreText(
  openai: OpenAI,
  textId: string,
  rawText: string
): Promise<ScoredText | null> {
  const lines = splitLines(rawText);
  if (lines.length === 0) return null;

  const numbered = lines.map((l, i) => `${i + 1}. ${l}`).join("\n");
  const userContent =
    `Lines (${lines.length} total — return exactly ${lines.length} weights):\n` +
    `${numbered}\n\nReturn the JSON.`;

  const reasoning = isReasoningModel(MODEL);

  // Reasoning models reject `temperature`. Chat models accept `temperature: 0`
  // for determinism. We assemble the body as `any` so the union of fields
  // (some only valid for one model class) typechecks across SDK versions.
  const params: Record<string, unknown> = {
    model: MODEL,
    stream: false,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userContent },
    ],
  };
  if (reasoning) {
    params.reasoning_effort = REASONING_EFFORT;
  } else {
    params.temperature = 0;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await openai.chat.completions.create(params as any);

  const content = res.choices[0]?.message?.content ?? "";
  let parsed: { weights?: unknown };
  try {
    parsed = JSON.parse(content);
  } catch (err) {
    console.error(`  parse error on ${textId}: ${(err as Error).message}`);
    return null;
  }

  const w = Array.isArray(parsed.weights) ? parsed.weights : [];
  if (w.length !== lines.length) {
    console.warn(
      `  ${textId}: model returned ${w.length} weights for ${lines.length} lines — padding/truncating`
    );
  }

  const scored: ScoredLine[] = lines.map((line, i) => {
    const raw = typeof w[i] === "number" ? (w[i] as number) : 0.5;
    const weight = Math.max(0, Math.min(1, raw));
    return {
      index: i,
      text: line,
      wordCount: wordCount(line),
      weight,
    };
  });

  const totalWordCount = scored.reduce((s, l) => s + l.wordCount, 0);

  return {
    id: textId,
    workId: "",
    totalLines: scored.length,
    totalWordCount,
    scoredAt: new Date().toISOString(),
    lines: scored,
  };
}

/** Run `worker` over `items` with at most `limit` in flight. */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      results[i] = await worker(items[i], i);
    }
  });
  await Promise.all(runners);
  return results;
}

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("ERROR: OPENAI_API_KEY environment variable is required.");
    process.exit(1);
  }

  const refresh = process.argv.includes("--refresh");

  const corpus: CorpusFile = JSON.parse(readFileSync(CORPUS_PATH, "utf-8"));
  const catalog: CatalogFile = JSON.parse(readFileSync(CATALOG_PATH, "utf-8"));

  let cache: WeightsFile;
  if (existsSync(OUT_PATH) && !refresh) {
    cache = JSON.parse(readFileSync(OUT_PATH, "utf-8")) as WeightsFile;
  } else {
    cache = {
      _meta: {
        model: MODEL,
        scale: "0=restrained, 1=loaded",
        generatedAt: new Date().toISOString(),
        note: "Per-line emotional weights for the parallel-drift viz.",
      },
      texts: {},
    };
  }

  const openai = new OpenAI({ apiKey });

  const todo: { textId: string; workId: string; raw: string }[] = [];

  // 1. Corpus works (full text per translation, line-broken).
  for (const work of corpus.works) {
    for (const t of work.texts) {
      const raw = t.text ?? t.previewText ?? "";
      if (!raw.trim()) continue;
      if (!refresh && cache.texts[t.id]) continue;
      todo.push({ textId: t.id, workId: work.id, raw });
    }
  }

  // 2. Catalog works (Project Gutenberg-derived; only `previewText` is
  //    present, and it's typically the opening paragraph rendered by
  //    each translator — perfect for the drift viz).
  for (const work of catalog.works) {
    for (const t of work.translations) {
      const raw = t.text ?? t.previewText ?? "";
      if (!raw.trim()) continue;
      if (!refresh && cache.texts[t.id]) continue;
      todo.push({ textId: t.id, workId: work.id, raw });
    }
  }

  if (todo.length === 0) {
    console.log("Nothing to score. (Use --refresh to re-score everything.)");
    return;
  }

  const reasoning = isReasoningModel(MODEL);
  const effortNote = reasoning ? ` (effort=${REASONING_EFFORT})` : "";
  console.log(
    `Scoring ${todo.length} text(s) with ${MODEL}${effortNote}, ` +
      `concurrency=${CONCURRENCY}...`
  );

  let done = 0;
  await mapWithConcurrency(todo, CONCURRENCY, async ({ textId, workId, raw }) => {
    const t0 = Date.now();
    let scored: ScoredText | null = null;
    try {
      scored = await scoreText(openai, textId, raw);
    } catch (err) {
      console.error(`  ${textId}: error — ${(err as Error).message}`);
    }
    done++;
    if (!scored) {
      console.log(`  [${done}/${todo.length}] ${textId}: skipped`);
      return;
    }
    scored.workId = workId;
    cache.texts[textId] = scored;
    const mean = (
      scored.lines.reduce((s, l) => s + l.weight, 0) / scored.totalLines
    ).toFixed(2);
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(
      `  [${done}/${todo.length}] ${textId}: ${scored.totalLines}L / ` +
        `${scored.totalWordCount}w / mean ${mean} (${elapsed}s)`
    );
  });

  cache._meta.model = MODEL;
  cache._meta.generatedAt = new Date().toISOString();
  cache._meta.note = reasoning
    ? `Per-line emotional weights for the parallel-drift viz. ` +
      `Reasoning model ${MODEL} at effort=${REASONING_EFFORT}.`
    : `Per-line emotional weights for the parallel-drift viz. Model ${MODEL}.`;
  writeFileSync(OUT_PATH, JSON.stringify(cache, null, 2));
  console.log(`\nWrote ${Object.keys(cache.texts).length} entries to ${OUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
