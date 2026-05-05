"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { TranslationText, EmbeddingPoint } from "@/lib/types";
import { ERA_COLORS } from "@/lib/types";
import TranslationSubmit from "./TranslationSubmit";

const UMAPScatter = dynamic(
  () => import("./visualizations/UMAPScatter"),
  { ssr: false }
);
const SimilarityHeatmap = dynamic(
  () => import("./visualizations/SimilarityHeatmap"),
  { ssr: false }
);
const LineAlignment = dynamic(
  () => import("./visualizations/LineAlignment"),
  { ssr: false }
);

type Tab = "scatter" | "heatmap" | "align" | "submit";

interface Props {
  work: {
    id: string;
    title: string;
    author: string;
    sourceLanguage: string;
  };
  translations: TranslationText[];
  embeddingPoints: EmbeddingPoint[];
}

const TABS: { id: Tab; label: string }[] = [
  { id: "scatter", label: "Semantic Space" },
  { id: "heatmap", label: "Similarity Heatmap" },
  { id: "align", label: "Line Alignment" },
  { id: "submit", label: "Submit Translation" },
];

export default function WorkDetail({ work, translations, embeddingPoints }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("scatter");
  const [livePoints, setLivePoints] = useState<EmbeddingPoint[]>(embeddingPoints);

  const handleNewPoint = (point: EmbeddingPoint) => {
    setLivePoints((prev) => [...prev, point]);
    setActiveTab("scatter");
  };

  return (
    <div className="space-y-6">
      <TranslationList translations={translations} />

      <div className="border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="flex border-b border-zinc-800 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? "text-indigo-300 border-b-2 border-indigo-500 bg-zinc-900/50"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6 bg-zinc-950 min-h-80">
          {activeTab === "scatter" && (
            <div className="space-y-3">
              <p className="text-xs text-zinc-500">
                Each point is one text in vector space after UMAP. Color = era,
                shape = source language. Points near each other are semantically
                closer.
              </p>
              {livePoints.length > 0 ? (
                <UMAPScatter points={livePoints} />
              ) : (
                <EmptyState message="No embeddings available. Run npm run embed with your OPENAI_API_KEY." />
              )}
            </div>
          )}

          {activeTab === "heatmap" && (
            <div className="space-y-3">
              <p className="text-xs text-zinc-500">
                Pairwise cosine similarity between translations. Darker green =
                more similar.
              </p>
              {livePoints.length > 0 ? (
                <SimilarityHeatmap points={livePoints} />
              ) : (
                <EmptyState message="No embeddings available." />
              )}
            </div>
          )}

          {activeTab === "align" && (
            <LineAlignment translations={translations} />
          )}

          {activeTab === "submit" && (
            <TranslationSubmit
              workId={work.id}
              workTitle={work.title}
              onNewPoint={handleNewPoint}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function TranslationList({ translations }: { translations: TranslationText[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const grouped = translations.reduce<Record<string, TranslationText[]>>(
    (acc, t) => {
      const key = t.era;
      if (!acc[key]) acc[key] = [];
      acc[key].push(t);
      return acc;
    },
    {}
  );

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
        {translations.length} texts
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {translations.map((t) => (
          <div
            key={t.id}
            className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 cursor-pointer hover:border-zinc-600 transition-colors"
            onClick={() => setExpanded(expanded === t.id ? null : t.id)}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-200 truncate">
                  {t.translator ?? "Original"}
                </p>
                <p className="text-xs text-zinc-500">
                  {t.language} · {t.year}
                </p>
              </div>
              <span
                className="flex-shrink-0 text-xs px-2 py-0.5 rounded-full"
                style={{
                  background: (ERA_COLORS[t.era] ?? "#6366f1") + "33",
                  color: ERA_COLORS[t.era] ?? "#6366f1",
                }}
              >
                {t.era}
              </span>
            </div>

            {t.register && (
              <p className="text-xs text-zinc-600 mt-1 italic">{t.register}</p>
            )}

            {expanded === t.id && (t.text || t.previewText) && (
              <div className="mt-3 pt-3 border-t border-zinc-800">
                <p className="text-xs text-zinc-400 font-mono leading-relaxed whitespace-pre-wrap">
                  {t.text ?? t.previewText}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-48 text-zinc-600 text-sm italic">
      {message}
    </div>
  );
}
