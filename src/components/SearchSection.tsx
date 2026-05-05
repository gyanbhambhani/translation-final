"use client";

import { useState, useTransition, useCallback } from "react";
import Link from "next/link";
import type { SearchResult } from "@/lib/types";

interface Props {
  featured: SearchResult[];
}

const SOURCE_LABELS: Record<string, string> = {
  corpus: "Seed corpus",
  catalog: "Curated catalog",
};

const SOURCE_COLORS: Record<string, string> = {
  corpus: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
  catalog: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
};

export default function SearchSection({ featured }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSearch = useCallback(
    (q: string) => {
      setQuery(q);
      if (!q.trim()) {
        setResults(null);
        return;
      }
      startTransition(async () => {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(q.trim())}`
        );
        const data = await res.json();
        setResults(data.results);
      });
    },
    []
  );

  const displayed = results ?? featured;
  const isEmpty = displayed.length === 0;

  return (
    <div className="space-y-8">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search by title, author, or theme… (e.g. Homer, Rumi, Neruda)"
          className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-5 py-4 text-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-colors"
        />
        {isPending && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      <div>
        <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-4">
          {results ? `${results.length} results` : "Featured works"}
        </h2>

        {isEmpty ? (
          <div className="text-center py-16 text-zinc-500">
            <p className="text-lg">No works found for &ldquo;{query}&rdquo;</p>
            <p className="text-sm mt-2">
              Try searching for Homer, Baudelaire, Rumi, Neruda, or Ramanujan
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayed.map((work) => (
              <WorkCard key={work.id} work={work} />
            ))}
          </div>
        )}
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-zinc-300 mb-2">
          About the project
        </h3>
        <p className="text-sm text-zinc-500 leading-relaxed">
          Semantic Drift visualizes how literary translations cluster in vector
          space. Translations from the same era tend to group together;
          translations that prioritize political meaning diverge from those that
          prioritize sonic fidelity. The geometry makes the politics legible.
          Select a work to explore its translations, or paste your own
          translation to see where it lands.
        </p>
      </div>
    </div>
  );
}

function WorkCard({ work }: { work: SearchResult }) {
  return (
    <Link
      href={`/work/${work.id}`}
      className="group block bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-indigo-500/50 hover:bg-zinc-800/50 transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full border ${SOURCE_COLORS[work.source]}`}
        >
          {SOURCE_LABELS[work.source]}
        </span>
        {work.originalYear && (
          <span className="text-xs text-zinc-600">{work.originalYear}</span>
        )}
      </div>

      <h3 className="font-semibold text-zinc-100 group-hover:text-indigo-300 transition-colors leading-tight mb-1">
        {work.title}
      </h3>
      <p className="text-sm text-zinc-400 mb-3">{work.author}</p>

      {work.description && (
        <p className="text-xs text-zinc-600 mb-3 line-clamp-2">
          {work.description}
        </p>
      )}

      <div className="flex items-center gap-3 text-xs text-zinc-500">
        <span>
          {work.translationCount} translation
          {work.translationCount !== 1 ? "s" : ""}
        </span>
        <span>·</span>
        <span>{work.languages.slice(0, 3).join(", ")}</span>
      </div>
    </Link>
  );
}
