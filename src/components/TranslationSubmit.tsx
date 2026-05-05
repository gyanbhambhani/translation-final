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

export default function TranslationSubmit({ workId, workTitle, onNewPoint }: Props) {
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
        body: JSON.stringify({ text: text.trim(), workId, label: label.trim() }),
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
    <div className="space-y-4">
      <p className="text-sm text-zinc-400 leading-relaxed">
        Paste your own translation of <em>{workTitle}</em> to see where it lands
        in semantic space relative to existing translations.
      </p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs text-zinc-500 mb-1">
            Your name or label (optional)
          </label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. My 2024 translation"
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs text-zinc-500 mb-1">
            Your translation
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste your translation here…"
            rows={8}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 resize-y font-mono leading-relaxed"
          />
        </div>

        {error && (
          <p className="text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !text.trim()}
          className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-700 disabled:cursor-not-allowed rounded-lg text-sm font-medium text-white transition-colors"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Embedding…
            </span>
          ) : (
            "Plot my translation"
          )}
        </button>
      </form>

      {result && (
        <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 space-y-3">
          <h4 className="text-sm font-semibold text-zinc-200">Results</h4>

          <div className="flex items-center gap-2 p-3 bg-zinc-800 rounded-lg">
            <span
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{
                background:
                  ERA_COLORS[result.closestMatch.era] ?? "#6366f1",
              }}
            />
            <div>
              <p className="text-xs text-zinc-400">Closest match</p>
              <p className="text-sm font-medium text-zinc-200">
                {result.closestMatch.translator ?? "Original"} (
                {result.closestMatch.year})
              </p>
              <p className="text-xs text-zinc-500">
                Similarity:{" "}
                {(result.closestMatch.similarity * 100).toFixed(1)}%
              </p>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">
              All similarities
            </p>
            {result.similarities.map((s) => (
              <div
                key={s.pointId}
                className="flex items-center gap-2 text-xs"
              >
                <div
                  className="h-1.5 rounded-full flex-shrink-0"
                  style={{
                    width: `${s.similarity * 100}%`,
                    maxWidth: "100%",
                    background: ERA_COLORS[s.era] ?? "#6366f1",
                  }}
                />
                <span className="text-zinc-400 whitespace-nowrap">
                  {s.translator ?? "Original"} {s.year}:{" "}
                  {(s.similarity * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>

          <p className="text-xs text-zinc-600 italic">
            Your translation has been plotted on the scatter chart above. Look
            for the highlighted point.
          </p>
        </div>
      )}
    </div>
  );
}
