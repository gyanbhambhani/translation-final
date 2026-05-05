"use client";

import { useState } from "react";
import type { EmbeddingPoint } from "@/lib/types";
import { ERA_COLORS } from "@/lib/types";

interface SimilarityResult {
  pointId: string;
  translator: string | null;
  year: number;
  era: string;
  similarity: number;
}

interface EmbedResponse {
  point: EmbeddingPoint;
  similarities: SimilarityResult[];
  closestMatch: {
    similarity: number;
    translator: string | null;
    year: number;
    era: string;
    point: EmbeddingPoint;
  };
}

interface Props {
  workId: string;
  workTitle: string;
  onNewPoint: (point: EmbeddingPoint) => void;
}

export default function TranslationSubmit({
  workId,
  workTitle,
  onNewPoint,
}: Props) {
  const [text, setText] = useState("");
  const [label, setLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EmbedResponse | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/embed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text.trim(),
          workId,
          label: label.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }
      setResult(data as EmbedResponse);
      onNewPoint(data.point);
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <p className="font-display italic text-ink-soft text-[1.05rem] leading-[1.55] max-w-2xl">
        Paste your own translation of {workTitle} and we will embed it,
        compute similarity against every existing translation, and drop your
        point onto the scatter beside its closest neighbor.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Field label="Your name or label" optional>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. My 2026 translation"
            className="w-full bg-transparent border-b border-rule focus:border-ink transition-colors text-ink text-[16px] py-2 placeholder:text-ink-faint focus:outline-none"
          />
        </Field>

        <Field label="Your translation">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste your translation here…"
            rows={9}
            className="w-full bg-bg-soft border border-rule focus:border-ink transition-colors px-4 py-3 text-ink text-[15px] leading-[1.65] placeholder:text-ink-faint focus:outline-none resize-y font-display"
          />
        </Field>

        {error && (
          <p className="border border-rule px-4 py-3 text-[13.5px] text-ink-soft">
            <span className="text-accent font-display italic mr-2">!</span>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !text.trim()}
          className="group inline-flex items-center gap-3 border border-ink bg-ink text-bg px-6 py-3 hover:bg-accent hover:border-accent disabled:bg-transparent disabled:text-ink-faint disabled:border-rule disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <>
              <span className="block w-3.5 h-3.5 border border-bg/40 border-t-bg rounded-full animate-spin" />
              <span className="small-caps text-[12px] tracking-[0.18em]">
                Embedding…
              </span>
            </>
          ) : (
            <>
              <span className="small-caps text-[12px] tracking-[0.18em]">
                Plot my translation
              </span>
              <span className="font-display italic text-[18px] -mt-0.5 transition-transform group-hover:translate-x-1">
                →
              </span>
            </>
          )}
        </button>
      </form>

      {result && (
        <div className="border border-rule p-6 space-y-6">
          <div>
            <p className="small-caps text-ink-muted text-[11px] tracking-[0.18em] mb-3">
              Closest match
            </p>
            <div className="flex items-baseline gap-4">
              <span className="font-display text-accent text-[2.5rem] leading-none tabular">
                {result.closestMatch.similarity.toFixed(3)}
              </span>
              <div>
                <p className="font-display text-ink text-[1.2rem] leading-tight">
                  {result.closestMatch.translator ?? "Original"}
                </p>
                <p className="text-ink-muted text-[12.5px] tabular">
                  {result.closestMatch.year} ·{" "}
                  <span className="small-caps tracking-[0.14em]">
                    {result.closestMatch.era}
                  </span>
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2.5 pt-5 border-t border-rule">
            <p className="small-caps text-ink-muted text-[11px] tracking-[0.18em] mb-3">
              All similarities
            </p>
            {result.similarities.map((s) => {
              const c = ERA_COLORS[s.era] ?? "#e8c179";
              return (
                <div
                  key={s.pointId}
                  className="grid grid-cols-[5rem_1fr_auto] items-center gap-4 text-[12.5px]"
                >
                  <span className="font-display text-ink tabular text-right">
                    {s.similarity.toFixed(3)}
                  </span>
                  <div className="h-[3px] bg-rule">
                    <div
                      className="h-full"
                      style={{
                        width: `${Math.max(2, s.similarity * 100)}%`,
                        background: c,
                        opacity: 0.85,
                      }}
                    />
                  </div>
                  <span className="text-ink-muted truncate">
                    {s.translator ?? "Original"}{" "}
                    <span className="tabular text-ink-faint">{s.year}</span>
                  </span>
                </div>
              );
            })}
          </div>

          <p className="font-display italic text-ink-faint text-[13px] pt-2">
            Your translation is now plotted on the scatter — look for the
            highlighted point.
          </p>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  optional,
  children,
}: {
  label: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="flex items-baseline gap-2 small-caps text-ink-muted text-[11px] tracking-[0.18em] mb-2">
        {label}
        {optional && (
          <span className="text-ink-faint normal-case tracking-normal italic font-display text-[12.5px]">
            optional
          </span>
        )}
      </label>
      {children}
    </div>
  );
}
