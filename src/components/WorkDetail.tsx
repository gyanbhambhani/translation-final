"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type {
  TranslationText,
  EmbeddingPoint,
  ScoredText,
} from "@/lib/types";
import { ERA_COLORS } from "@/lib/types";
import TranslationSubmit from "./TranslationSubmit";
import { ProvenancePill, ProvenanceLine } from "./Provenance";

const UMAPScatter = dynamic(
  () => import("./visualizations/UMAPScatter"),
  { ssr: false }
);
const ParallelDrift = dynamic(
  () => import("./visualizations/ParallelDrift"),
  { ssr: false }
);
const LineAlignment = dynamic(
  () => import("./visualizations/LineAlignment"),
  { ssr: false }
);

type Tab = "scatter" | "drift" | "align" | "submit";

interface Props {
  work: {
    id: string;
    title: string;
    author: string;
    sourceLanguage: string;
  };
  translations: TranslationText[];
  embeddingPoints: EmbeddingPoint[];
  weights: Record<string, ScoredText>;
}

const TABS: { id: Tab; label: string; subtitle: string }[] = [
  { id: "scatter", label: "Semantic space", subtitle: "UMAP scatter" },
  { id: "drift", label: "Parallel drift", subtitle: "Line emotion vs. position" },
  { id: "align", label: "Alignment", subtitle: "Line by line" },
  { id: "submit", label: "Submit", subtitle: "Plot your own" },
];

export default function WorkDetail({
  work,
  translations,
  embeddingPoints,
  weights,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("scatter");
  const [livePoints, setLivePoints] = useState<EmbeddingPoint[]>(embeddingPoints);

  const handleNewPoint = (point: EmbeddingPoint) => {
    setLivePoints((prev) => [...prev, point]);
    setActiveTab("scatter");
  };

  return (
    <div className="space-y-16">
      <CorpusDisclosure translations={translations} />
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

            {activeTab === "drift" && (
              <div className="space-y-4">
                <p className="text-ink-muted text-[13px] leading-relaxed max-w-2xl">
                  Each translation is a path through the same coordinate
                  space — running word count on the x-axis, emotional
                  weight per line on the y-axis. Where the paths diverge,
                  a translator made a choice. The gap is the argument.
                </p>
                <ParallelDrift
                  translations={translations}
                  weights={weights}
                />
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

                <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                  {t.register && (
                    <span className="font-display italic text-ink-muted text-[13px]">
                      {t.register}
                    </span>
                  )}
                  <ProvenancePill kind={t.kind} />
                </div>

                {isOpen && (t.text || t.previewText) && (
                  <p className="mt-3 pt-3 border-t border-rule font-display italic text-ink-soft text-[14px] leading-[1.6] whitespace-pre-wrap">
                    {t.text ?? t.previewText}
                  </p>
                )}

                {isOpen && (t.kind || t.provenance) && (
                  <ProvenanceLine
                    kind={t.kind}
                    provenance={t.provenance}
                    sourceUrl={t.sourceUrl}
                  />
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

/**
 * Inline disclosure block on every work detail page. If any translation
 * in this work is a register study, surface that loudly at the top so
 * the reader can never confuse a composed exercise with a published
 * historical translation. If no register studies are present (i.e.,
 * Gutenberg-only catalog work), this collapses to nothing.
 */
function CorpusDisclosure({
  translations,
}: {
  translations: TranslationText[];
}) {
  const studies = translations.filter((t) => t.kind === "register-study");
  const author = translations.filter((t) => t.kind === "project-author");
  if (studies.length === 0 && author.length === 0) return null;

  return (
    <aside
      className="border border-accent/35 bg-accent/4 px-5 sm:px-7 py-5 sm:py-6"
      role="note"
      aria-label="About these translations"
    >
      <div className="flex items-baseline gap-3 mb-2">
        <span className="small-caps text-accent text-[10.5px] tracking-[0.2em]">
          About these translations
        </span>
      </div>
      <p className="text-ink-soft text-[13.5px] leading-[1.7] max-w-[68ch]">
        No formally published Hindi translation of this poem exists in
        the catalogues of the Sahitya Akademi, Bharatiya Jnanpith, Vani
        Prakashan, or Rajkamal Prakashan. The Hindi versions you see
        here are{" "}
        <strong className="text-accent not-italic">
          register studies
        </strong>{" "}
        and one present-day translation, all written by the project
        author (Gyan Bhambhani). Each non-2026 Hindi text is composed
        deliberately to evoke a specific decade&rsquo;s Hindi literary
        register — Sanskritic <em className="italic">nayi-kavita</em>{" "}
        for the 1970s, Dabral / Kamal-period post-liberalization Hindi
        for the 1990s, urban-colloquial Hindi for the 2000s, and a
        contemporary 2020s register. They are not attributed to any
        historical translator.
      </p>
      <p className="text-ink-muted text-[12.5px] leading-[1.65] mt-3 max-w-[68ch]">
        Expanding any translation below shows the full provenance line.
        The English original is in copyright (Ramanujan estate / OUP);
        no authoritative free online edition exists, so verification
        runs through the print citation, not a URL.
      </p>
    </aside>
  );
}
