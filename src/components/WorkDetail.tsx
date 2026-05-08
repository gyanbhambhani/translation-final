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
              <div className="space-y-6">
                <ViewHint
                  headline="every translation is one dot."
                  caption="dots that sit close together feel similar."
                  footnote="Each point is one translation in vector space after UMAP. Color encodes era, shape encodes language."
                />
                {livePoints.length > 0 ? (
                  <UMAPScatter points={livePoints} />
                ) : (
                  <EmptyState message="No embeddings available. Run npm run embed with your OPENAI_API_KEY." />
                )}
              </div>
            )}

            {activeTab === "drift" && (
              <div className="space-y-6">
                <ViewHint
                  headline="two ways of telling the same poem,"
                  caption="drawn as two paths — when they split, the translator made a choice."
                  footnote="X-axis is running word count, Y-axis is emotional weight per line. The gap between paths is the argument."
                />
                <ParallelDrift
                  translations={translations}
                  weights={weights}
                />
              </div>
            )}

            {activeTab === "align" && (
              <div className="space-y-6">
                <ViewHint
                  headline="the same passage, side by side."
                  caption="read across the row to see what each translator did with the same line."
                  footnote="Pick any two translators below. Lines are matched by position, not by meaning — divergence in length is itself informative."
                />
                <LineAlignment translations={translations} />
              </div>
            )}

            {activeTab === "submit" && (
              <div className="space-y-6">
                <ViewHint
                  headline="paste your own translation,"
                  caption="and watch where it lands in the geometry."
                  footnote="Your text is embedded live and dropped onto the scatter as a new dot. Nothing is saved — it lives only in your session."
                />
                <TranslationSubmit
                  workId={work.id}
                  workTitle={work.title}
                  onNewPoint={handleNewPoint}
                />
              </div>
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

/* ─── ViewHint ────────────────────────────────────────────────────────
 *
 * A friendly, plain-language explainer that sits at the top of every
 * visualization panel. Mirrors the SearchHint pattern on the home page:
 * a hand-drawn arrow points down at the chart, with a two-line italic
 * blurb to its right. The technical caption is preserved as a small
 * "footnote" line underneath, for anyone who wants the precise reading.
 */
function ViewHint({
  headline,
  caption,
  footnote,
}: {
  headline: string;
  caption: string;
  footnote: string;
}) {
  return (
    <div className="flex items-start gap-3 sm:gap-4">
      <svg
        viewBox="0 0 70 80"
        className="w-12 sm:w-14 h-14 sm:h-16 text-accent/70 shrink-0 mt-1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        {/* hand-drawn arrow curving from upper-left down to the chart */}
        <path d="M 8 8 C 12 30, 38 24, 56 70" />
        <path d="M 56 70 L 48 64" />
        <path d="M 56 70 L 60 60" />
      </svg>

      <div className="pt-0.5 max-w-[60ch]">
        <p className="font-display italic text-ink text-[16px] sm:text-[18.5px] leading-[1.3]">
          {headline}
        </p>
        <p className="font-display italic text-ink-muted text-[14px] sm:text-[15.5px] leading-[1.35] mt-0.5">
          {caption}
        </p>
        <p className="text-ink-faint text-[11.5px] leading-[1.55] mt-2 max-w-[58ch]">
          {footnote}
        </p>
      </div>
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
