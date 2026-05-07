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
import type { ProvenanceKind, SearchResult } from "@/lib/types";
import { ProvenancePill } from "./Provenance";

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
  kind?: ProvenanceKind;
  previewText: string;
  similarity: number;
  similarityQuery?: number;
  similarityHyde?: number | null;
  matchPercent?: number;
  band?: "strong" | "close" | "related" | "loose";
  lexicalHit?: boolean;
  lexicalRank?: number | null;
  fusedScore?: number;
}

const BAND_LABEL: Record<NonNullable<SemanticHit["band"]>, string> = {
  strong: "strong",
  close: "close",
  related: "related",
  loose: "loose",
};

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
  const [hydeText, setHydeText] = useState<string | null>(null);
  const [usedHyde, setUsedHyde] = useState(false);
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
      setHydeText(null);
      setUsedHyde(false);
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
          setHydeText(null);
          setUsedHyde(false);
          return;
        }
        const data = await res.json();
        setError(null);
        setHits(data.results ?? []);
        setHydeText(data.hyde ?? null);
        setUsedHyde(Boolean(data.usedHyde));
      } catch {
        if (myReq !== reqId.current) return;
        setError("Search failed. Check your connection.");
        setHits([]);
        setHydeText(null);
        setUsedHyde(false);
      }
    });
  }, []);

  // Slightly longer debounce — the search now also runs HyDE + a lexical
  // pass behind the scenes, so we wait for the user to actually pause.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(query), 480);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, runSearch]);

  const mode: Mode = query.trim() ? "search" : "browse";

  return (
    <div className="space-y-10">
      <div>
        <SearchBar
          query={query}
          setQuery={setQuery}
          isPending={isPending}
          placeholder={placeholder}
        />
        {mode === "browse" && <SearchHint />}
      </div>

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
        <SearchResults
          hits={hits}
          query={query}
          hydeText={hydeText}
          usedHyde={usedHyde}
        />
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

/* ─── Standing nudge under the bar ───────────────────────────────────── */

function SearchHint() {
  return (
    <div className="mt-3 sm:mt-4 ml-1 flex items-start gap-2 sm:gap-3">
      <svg
        viewBox="0 0 70 70"
        className="w-14 h-14 sm:w-[68px] sm:h-[68px] text-accent/70 shrink-0 -mt-2 -ml-1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        {/* hand-drawn arrow curving up to the search bar */}
        <path d="M 56 60 C 40 68, 6 52, 16 14" />
        <path d="M 16 14 L 9 23" />
        <path d="M 16 14 L 25 17" />
      </svg>

      <div className="pt-1.5 sm:pt-2">
        <p className="font-display italic text-ink text-[16px] sm:text-[18px] leading-[1.3]">
          describe what it feels like
        </p>
        <p className="font-display italic text-ink-muted text-[14px] sm:text-[15.5px] leading-[1.3] mt-0.5">
          — not what it&rsquo;s called.
        </p>
      </div>
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
  hydeText,
  usedHyde,
}: {
  hits: SemanticHit[] | null;
  query: string;
  hydeText: string | null;
  usedHyde: boolean;
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

  const topFused =
    Math.max(...hits.map((h) => h.fusedScore ?? h.similarity ?? 0)) || 1;
  return (
    <div className="space-y-4">
      {usedHyde && hydeText && <HydeAnnotation text={hydeText} />}
      <ol className="grid gap-3">
        {hits.map((h, i) => (
          <li key={h.pointId}>
            <PassageResult
              hit={h}
              rank={i + 1}
              topFused={topFused}
              query={query}
            />
          </li>
        ))}
      </ol>
    </div>
  );
}

function HydeAnnotation({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const preview = text.length > 140 ? text.slice(0, 140).trimEnd() + "…" : text;
  return (
    <div className="border-l-2 border-accent/40 pl-4 py-1">
      <p className="small-caps text-ink-faint text-[10.5px] tracking-[0.18em] mb-1">
        we also searched for a passage like this
      </p>
      <p className="font-display italic text-ink-soft text-[14.5px] leading-[1.55]">
        {open ? text : preview}
      </p>
      {text.length > 140 && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="mt-1 small-caps text-[10.5px] tracking-[0.16em] text-ink-muted hover:text-ink"
        >
          {open ? "less" : "more"}
        </button>
      )}
    </div>
  );
}

function PassageResult({
  hit,
  rank,
  topFused,
  query,
}: {
  hit: SemanticHit;
  rank: number;
  topFused: number;
  query: string;
}) {
  const fused = hit.fusedScore ?? hit.similarity ?? 0;
  const barPct = Math.max(0.04, fused / Math.max(0.0001, topFused));
  const match = hit.matchPercent ?? Math.round((hit.similarity ?? 0) * 100);
  const bandKey = hit.band ?? "related";
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
        <div className="flex flex-col items-start gap-1.5 min-w-16">
          <span className="font-display text-ink text-[1.85rem] leading-none tabular group-hover:text-accent transition-colors">
            {match}
          </span>
          <span className="small-caps text-ink-faint text-[10px] tracking-[0.18em]">
            {BAND_LABEL[bandKey]}
          </span>
          <span className="small-caps text-ink-faint text-[10px] tracking-[0.18em] tabular mt-1">
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
            {hit.lexicalHit && (
              <span
                className="small-caps text-[10px] tracking-[0.16em] text-accent border border-accent/40 px-1.5 py-px"
                title="also a direct keyword match"
              >
                exact
              </span>
            )}
          </div>
          <div className="mt-1 text-[11.5px] text-ink-muted small-caps tracking-[0.14em] flex flex-wrap items-center gap-x-3 gap-y-0.5">
            {hit.translator && <span>tr. {hit.translator}</span>}
            {hit.year && <span className="tabular">{hit.year}</span>}
            {hit.language && <span>{hit.language}</span>}
            {hit.era && hit.era !== "original" && (
              <span className="text-ink-faint">· {hit.era}</span>
            )}
            <ProvenancePill kind={hit.kind} />
          </div>
        </div>

        <div className="flex items-center self-stretch text-ink-muted group-hover:text-accent transition-colors">
          <span className="font-display italic text-[20px] -mt-1">→</span>
        </div>
      </div>

      {/* Fused-score bar — relative to the strongest hit in this result set */}
      <div className="h-px bg-rule">
        <div
          className="h-full bg-accent/70 group-hover:bg-accent transition-all"
          style={{ width: `${(barPct * 100).toFixed(1)}%` }}
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
