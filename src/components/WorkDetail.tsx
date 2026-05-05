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

const TABS: { id: Tab; label: string; subtitle: string }[] = [
  { id: "scatter", label: "Semantic space", subtitle: "UMAP scatter" },
  { id: "heatmap", label: "Similarity", subtitle: "Pairwise heatmap" },
  { id: "align", label: "Alignment", subtitle: "Line by line" },
  { id: "submit", label: "Submit", subtitle: "Plot your own" },
];

export default function WorkDetail({
  work,
  translations,
  embeddingPoints,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("scatter");
  const [livePoints, setLivePoints] = useState<EmbeddingPoint[]>(embeddingPoints);

  const handleNewPoint = (point: EmbeddingPoint) => {
    setLivePoints((prev) => [...prev, point]);
    setActiveTab("scatter");
  };

  return (
    <div className="space-y-16">
      <TranslationList translations={translations} />

      <section>
        <SectionTitle
          eyebrow="Visualizations"
          title="See the geometry"
          right="Switch views"
        />

        <div className="border border-rule">
          <div className="flex border-b border-rule overflow-x-auto">
            {TABS.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex-1 min-w-[140px] text-left px-5 py-4 transition-colors ${
                    active
                      ? "text-ink bg-bg-soft"
                      : "text-ink-muted hover:text-ink hover:bg-bg-soft/50"
                  }`}
                >
                  <span className="block font-display text-[1.05rem] leading-tight">
                    {tab.label}
                  </span>
                  <span className="block small-caps text-[10.5px] tracking-[0.16em] mt-1 text-ink-faint">
                    {tab.subtitle}
                  </span>
                  {active && (
                    <span className="absolute inset-x-5 bottom-0 h-px bg-accent" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="p-6 sm:p-8 min-h-80">
            {activeTab === "scatter" && (
              <div className="space-y-4">
                <p className="text-ink-muted text-[13px] leading-relaxed max-w-2xl">
                  Each point is one translation in vector space after UMAP.
                  Color encodes era; shape encodes language. Points near each
                  other are semantically closer.
                </p>
                {livePoints.length > 0 ? (
                  <UMAPScatter points={livePoints} />
                ) : (
                  <EmptyState message="No embeddings available. Run npm run embed with your OPENAI_API_KEY." />
                )}
              </div>
            )}

            {activeTab === "heatmap" && (
              <div className="space-y-4">
                <p className="text-ink-muted text-[13px] leading-relaxed max-w-2xl">
                  Pairwise similarity between translations. Brighter cells
                  indicate translations whose embeddings sit closer together.
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
      </section>
    </div>
  );
}

function SectionTitle({
  eyebrow,
  title,
  right,
}: {
  eyebrow: string;
  title: string;
  right?: string;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-8 pb-5 border-b border-rule">
      <div>
        <p className="small-caps text-ink-muted text-[12px] tracking-[0.18em] mb-2">
          {eyebrow}
        </p>
        <h2 className="font-display text-ink text-[2rem] sm:text-[2.5rem] leading-none">
          {title}
        </h2>
      </div>
      {right && (
        <p className="small-caps text-ink-faint text-[11px] tracking-[0.16em]">
          {right}
        </p>
      )}
    </div>
  );
}

function TranslationList({ translations }: { translations: TranslationText[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <section>
      <SectionTitle
        eyebrow="The texts"
        title="Translations in this work"
        right={`${translations.length} text${translations.length === 1 ? "" : "s"}`}
      />
      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-rule border border-rule">
        {translations.map((t) => {
          const isOpen = expanded === t.id;
          const eraColor = ERA_COLORS[t.era] ?? "#e8c179";
          return (
            <li key={t.id} className="bg-bg">
              <button
                type="button"
                onClick={() => setExpanded(isOpen ? null : t.id)}
                className="w-full text-left p-4 hover:bg-bg-soft transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-ink text-[1.1rem] leading-tight truncate">
                      {t.translator ?? "Original"}
                    </p>
                    <p className="text-ink-muted text-[12.5px] mt-0.5">
                      {t.language} · <span className="tabular">{t.year}</span>
                    </p>
                  </div>
                  <span
                    className="shrink-0 small-caps text-[10px] tracking-[0.16em] px-2 py-1 border"
                    style={{ color: eraColor, borderColor: eraColor + "55" }}
                  >
                    {t.era}
                  </span>
                </div>

                {t.register && (
                  <p className="font-display italic text-ink-muted text-[13px] mt-2">
                    {t.register}
                  </p>
                )}

                {isOpen && (t.text || t.previewText) && (
                  <p className="mt-3 pt-3 border-t border-rule font-display italic text-ink-soft text-[14px] leading-[1.6] whitespace-pre-wrap">
                    {t.text ?? t.previewText}
                  </p>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-48 text-ink-muted text-[14px] italic font-display">
      {message}
    </div>
  );
}
