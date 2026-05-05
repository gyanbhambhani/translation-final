"use client";

import {
  useState,
  useTransition,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from "react";
import Link from "next/link";
import type { SearchResult } from "@/lib/types";

interface Props {
  featured: SearchResult[];
}

interface SemanticHit {
  pointId: string;
  workId: string;
  workTitle: string;
  author: string;
  sourceLanguage?: string;
  translator: string | null;
  year: number | null;
  era: string | null;
  language: string | null;
  previewText: string;
  similarity: number;
}

type Mode = "browse" | "search";

const PLACEHOLDERS = [
  "the river that dries every summer…",
  "a city of temples and poets…",
  "exile, longing, return…",
  "the death of God…",
  "what does loneliness sound like in 1972?",
];

export default function SearchSection({ featured }: Props) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SemanticHit[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  // Deterministic for SSR; randomized after mount to avoid hydration mismatch.
  const [placeholder, setPlaceholder] = useState(PLACEHOLDERS[0]);

  const reqId = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Typewriter — types each prompt out, holds, deletes, then moves on.
  // Pauses entirely while the user is typing their own query. Driven by
  // setTimeouts (not synchronous setState in effect body) so the React
  // effect-purity lint stays happy.
  useEffect(() => {
    if (query) return;
    const CARET = "▍";
    let phraseIdx = 0;
    let charIdx = PLACEHOLDERS[0].length;
    let phase: "hold" | "delete" | "pause" | "type" = "hold";
    let blinkCount = 0;
    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      const phrase = PLACEHOLDERS[phraseIdx];
      if (phase === "hold") {
        // Blink the caret a few times before backspacing.
        const showCaret = blinkCount % 2 === 0;
        setPlaceholder(phrase + (showCaret ? CARET : " "));
        blinkCount += 1;
        if (blinkCount >= 5) {
          blinkCount = 0;
          phase = "delete";
        }
        timer = setTimeout(tick, 480);
        return;
      }
      if (phase === "delete") {
        charIdx = Math.max(0, charIdx - 1);
        setPlaceholder(phrase.slice(0, charIdx) + CARET);
        if (charIdx === 0) {
          phraseIdx = (phraseIdx + 1) % PLACEHOLDERS.length;
          phase = "pause";
          timer = setTimeout(tick, 320);
          return;
        }
        timer = setTimeout(tick, 22 + Math.random() * 14);
        return;
      }
      if (phase === "pause") {
        phase = "type";
        timer = setTimeout(tick, 60);
        return;
      }
      // phase === "type"
      const next = PLACEHOLDERS[phraseIdx];
      charIdx = Math.min(next.length, charIdx + 1);
      setPlaceholder(next.slice(0, charIdx) + CARET);
      if (charIdx === next.length) {
        phase = "hold";
        timer = setTimeout(tick, 1900);
        return;
      }
      timer = setTimeout(tick, 42 + Math.random() * 38);
    };

    timer = setTimeout(tick, 1400);
    return () => clearTimeout(timer);
  }, [query]);

  const runSearch = useCallback((q: string) => {
    if (!q.trim()) {
      setHits(null);
      setError(null);
      return;
    }
    const myReq = ++reqId.current;
    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/semantic-search?q=${encodeURIComponent(q.trim())}&limit=18`
        );
        if (myReq !== reqId.current) return;
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error ?? `Search failed (${res.status})`);
          setHits([]);
          return;
        }
        const data = await res.json();
        setError(null);
        setHits(data.results ?? []);
      } catch {
        if (myReq !== reqId.current) return;
        setError("Search failed. Check your connection.");
        setHits([]);
      }
    });
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(query), 280);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, runSearch]);

  const mode: Mode = query.trim() ? "search" : "browse";

  return (
    <div className="space-y-10">
      <SearchBar
        query={query}
        setQuery={setQuery}
        isPending={isPending}
        placeholder={placeholder}
      />

      <p className="small-caps text-ink-faint text-[11.5px] tracking-[0.16em] tabular text-right -mt-4">
        {mode === "search"
          ? hits
            ? `${hits.length} result${hits.length === 1 ? "" : "s"}`
            : "…"
          : `${featured.length} works`}
      </p>

      {error && mode === "search" && (
        <div className="border border-rule px-5 py-4 text-[13.5px] text-ink-soft">
          <span className="text-accent font-display italic mr-2">!</span>
          {error}
          {error.toLowerCase().includes("openai_api_key") && (
            <span className="block mt-1 text-ink-muted text-[12.5px]">
              Add <code className="text-ink">OPENAI_API_KEY</code> to{" "}
              <code className="text-ink">.env.local</code> to enable semantic
              search.
            </span>
          )}
        </div>
      )}

      {mode === "browse" ? (
        <BrowseGrid works={featured} />
      ) : (
        <SearchResults hits={hits} query={query} />
      )}
    </div>
  );
}

/* ─── Search bar ──────────────────────────────────────────────────────── */

function SearchBar({
  query,
  setQuery,
  isPending,
  placeholder,
}: {
  query: string;
  setQuery: (q: string) => void;
  isPending: boolean;
  placeholder: string;
}) {
  return (
    <div className="relative border-b border-rule focus-within:border-ink transition-colors pb-2">
      <input
        id="semantic-search"
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent text-ink font-display italic text-[22px] sm:text-[28px] leading-tight placeholder:text-ink-faint placeholder:italic focus:outline-none py-1 pr-10"
        autoComplete="off"
        spellCheck={false}
        aria-label="Search the catalog"
      />
      <span className="absolute right-1 bottom-2.5 select-none" aria-hidden>
        {isPending ? (
          <span className="block w-3.5 h-3.5 border border-accent border-t-transparent rounded-full animate-spin" />
        ) : (
          <span className="font-display italic text-ink-muted text-[22px]">
            ⌕
          </span>
        )}
      </span>
    </div>
  );
}

/* ─── Browse mode — work cards ────────────────────────────────────────── */

function BrowseGrid({ works }: { works: SearchResult[] }) {
  return (
    <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-rule border border-rule">
      {works.map((work) => (
        <li key={work.id} className="bg-bg">
          <WorkCard work={work} />
        </li>
      ))}
    </ul>
  );
}

function WorkCard({ work }: { work: SearchResult }) {
  const sourceLabel = work.source === "corpus" ? "Seed" : "Curated";
  return (
    <Link
      href={`/work/${work.id}`}
      className="group block p-6 h-full hover:bg-bg-soft transition-colors"
    >
      <div className="flex items-center justify-between mb-6 text-[11.5px]">
        <span className="small-caps text-ink-muted tracking-[0.16em]">
          {sourceLabel}
        </span>
        {work.originalYear && (
          <span className="text-ink-faint tabular tracking-wider">
            {work.originalYear}
          </span>
        )}
      </div>
      <h3 className="font-display text-ink text-[1.75rem] leading-[1.05] group-hover:text-accent transition-colors">
        {work.title}
      </h3>
      <p className="mt-1.5 text-ink-soft italic font-display text-[16px]">
        {work.author}
      </p>
      {work.description && (
        <p className="mt-4 text-ink-muted text-[14px] leading-[1.55] line-clamp-2">
          {work.description}
        </p>
      )}
      <div className="mt-6 pt-4 border-t border-rule flex items-center justify-between text-[11.5px] text-ink-muted">
        <span className="tabular">
          {work.translationCount} translation
          {work.translationCount !== 1 ? "s" : ""}
        </span>
        <span className="text-ink-faint truncate ml-3 text-right">
          {work.languages.slice(0, 3).join(" · ")}
          {work.languages.length > 3 ? " · …" : ""}
        </span>
      </div>
    </Link>
  );
}

/* ─── Search mode — semantic passage results ─────────────────────────── */

function SearchResults({
  hits,
  query,
}: {
  hits: SemanticHit[] | null;
  query: string;
}) {
  if (hits === null) {
    return <ResultsSkeleton />;
  }
  if (hits.length === 0) {
    return (
      <div className="border border-dashed border-rule py-16 text-center">
        <p className="font-display italic text-ink text-[1.75rem] mb-2">
          Nothing close to that.
        </p>
        <p className="text-ink-muted text-[14px]">
          The corpus is small — try a different image, a single word, or a
          shorter phrase.
        </p>
      </div>
    );
  }

  const topScore = hits[0]?.similarity ?? 1;
  return (
    <ol className="grid gap-3">
      {hits.map((h, i) => (
        <li key={h.pointId}>
          <PassageResult hit={h} rank={i + 1} topScore={topScore} query={query} />
        </li>
      ))}
    </ol>
  );
}

function PassageResult({
  hit,
  rank,
  topScore,
  query,
}: {
  hit: SemanticHit;
  rank: number;
  topScore: number;
  query: string;
}) {
  const pct = Math.max(0.04, hit.similarity / Math.max(0.0001, topScore));
  const shown = useMemo(
    () => highlight(hit.previewText, query),
    [hit.previewText, query]
  );
  return (
    <Link
      href={`/work/${hit.workId}`}
      className="group block border border-rule hover:border-ink-faint hover:bg-bg-soft transition-colors relative overflow-hidden"
    >
      <div className="grid grid-cols-[auto_1fr_auto] gap-5 sm:gap-8 px-5 sm:px-6 py-5">
        <div className="flex flex-col items-start gap-2 min-w-14">
          <span className="font-display text-ink text-[1.65rem] leading-none tabular group-hover:text-accent transition-colors">
            {hit.similarity.toFixed(3)}
          </span>
          <span className="small-caps text-ink-faint text-[10.5px] tracking-[0.18em] tabular">
            #{rank.toString().padStart(2, "0")}
          </span>
        </div>

        <div className="min-w-0">
          <p className="font-display italic text-ink-soft text-[16.5px] leading-[1.55] line-clamp-3">
            {shown}
          </p>
          <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[13px]">
            <span className="text-ink font-display text-[16px]">
              {hit.workTitle}
            </span>
            <span className="text-ink-muted italic">{hit.author}</span>
          </div>
          <div className="mt-1 text-[11.5px] text-ink-muted small-caps tracking-[0.14em] flex flex-wrap gap-x-3 gap-y-0.5">
            {hit.translator && <span>tr. {hit.translator}</span>}
            {hit.year && <span className="tabular">{hit.year}</span>}
            {hit.language && <span>{hit.language}</span>}
            {hit.era && hit.era !== "original" && (
              <span className="text-ink-faint">· {hit.era}</span>
            )}
          </div>
        </div>

        <div className="flex items-center self-stretch text-ink-muted group-hover:text-accent transition-colors">
          <span className="font-display italic text-[20px] -mt-1">→</span>
        </div>
      </div>

      {/* Similarity bar — relative to the top hit */}
      <div className="h-px bg-rule">
        <div
          className="h-full bg-accent/70 group-hover:bg-accent transition-all"
          style={{ width: `${(pct * 100).toFixed(1)}%` }}
        />
      </div>
    </Link>
  );
}

function ResultsSkeleton() {
  return (
    <div className="grid gap-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="border border-rule h-[110px] animate-pulse bg-bg-soft/40"
        />
      ))}
    </div>
  );
}

/* Lightweight word-overlap highlight — visual cue, not a real diff */
function highlight(text: string, query: string): React.ReactNode {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 3) return text;
  const words = Array.from(
    new Set(
      trimmed
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 3)
    )
  );
  if (words.length === 0) return text;
  const re = new RegExp(`(${words.map(escapeRe).join("|")})`, "gi");
  const parts = text.split(re);
  return parts.map((p, i) =>
    re.test(p) ? (
      <span key={i} className="text-ink not-italic">
        {p}
      </span>
    ) : (
      <span key={i}>{p}</span>
    )
  );
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
