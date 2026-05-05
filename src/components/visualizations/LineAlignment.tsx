"use client";

import { useState } from "react";
import type { TranslationText } from "@/lib/types";
import { ERA_COLORS } from "@/lib/types";

interface Props {
  translations: TranslationText[];
}

export default function LineAlignment({ translations }: Props) {
  const withText = translations.filter((t) => t.text);
  const [leftId, setLeftId] = useState(withText[0]?.id ?? "");
  const [rightId, setRightId] = useState(withText[1]?.id ?? "");

  const left = withText.find((t) => t.id === leftId);
  const right = withText.find((t) => t.id === rightId);

  if (withText.length < 2) {
    return (
      <p className="text-sm text-zinc-500 italic">
        Full text not available for this work in the catalog.
      </p>
    );
  }

  const leftLines = left?.text?.split("\n") ?? [];
  const rightLines = right?.text?.split("\n") ?? [];
  const maxLen = Math.max(leftLines.length, rightLines.length);

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <TranslationSelector
          translations={withText}
          selected={leftId}
          onChange={setLeftId}
          label="Left"
        />
        <TranslationSelector
          translations={withText}
          selected={rightId}
          onChange={setRightId}
          label="Right"
        />
      </div>

      <div className="grid grid-cols-2 gap-0 border border-zinc-800 rounded-xl overflow-hidden text-sm font-mono">
        <div
          className="px-4 py-3 border-b border-zinc-800 text-xs font-sans font-semibold"
          style={{ color: ERA_COLORS[left?.era ?? "original"] ?? "#a1a1aa" }}
        >
          {left?.translator ?? "Original"} ({left?.year})
        </div>
        <div
          className="px-4 py-3 border-b border-l border-zinc-800 text-xs font-sans font-semibold"
          style={{ color: ERA_COLORS[right?.era ?? "original"] ?? "#a1a1aa" }}
        >
          {right?.translator ?? "Original"} ({right?.year})
        </div>

        {Array.from({ length: maxLen }).map((_, i) => {
          const l = leftLines[i] ?? "";
          const r = rightLines[i] ?? "";
          const isEmpty = l.trim() === "" && r.trim() === "";

          return (
            <div key={i} className="contents">
              <div
                className={`px-4 py-1 border-zinc-800/50 leading-relaxed text-zinc-300 ${
                  isEmpty ? "border-b border-zinc-800/30" : ""
                } hover:bg-zinc-800/30`}
              >
                {l || <span className="text-zinc-700">—</span>}
              </div>
              <div
                className={`px-4 py-1 border-l border-zinc-800/50 leading-relaxed text-zinc-300 ${
                  isEmpty ? "border-b border-zinc-800/30" : ""
                } hover:bg-zinc-800/30`}
              >
                {r || <span className="text-zinc-700">—</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TranslationSelector({
  translations,
  selected,
  onChange,
  label,
}: {
  translations: TranslationText[];
  selected: string;
  onChange: (id: string) => void;
  label: string;
}) {
  return (
    <div className="flex-1">
      <label className="block text-xs text-zinc-500 mb-1">{label}</label>
      <select
        value={selected}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500"
      >
        {translations.map((t) => (
          <option key={t.id} value={t.id}>
            {t.translator ?? "Original"} ({t.language}, {t.year})
          </option>
        ))}
      </select>
    </div>
  );
}
