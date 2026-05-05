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
      <p className="font-display italic text-ink-muted text-[15px]">
        Full text is not available for this work in the catalog.
      </p>
    );
  }

  const leftLines = left?.text?.split("\n") ?? [];
  const rightLines = right?.text?.split("\n") ?? [];
  const maxLen = Math.max(leftLines.length, rightLines.length);

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 gap-6">
        <TranslationSelector
          translations={withText}
          selected={leftId}
          onChange={setLeftId}
          label="Left column"
        />
        <TranslationSelector
          translations={withText}
          selected={rightId}
          onChange={setRightId}
          label="Right column"
        />
      </div>

      <div className="grid grid-cols-2 border border-rule">
        <ColumnHeader translation={left} />
        <ColumnHeader translation={right} bordered />

        {Array.from({ length: maxLen }).map((_, i) => {
          const l = leftLines[i] ?? "";
          const r = rightLines[i] ?? "";
          return (
            <div key={i} className="contents">
              <div className="px-5 py-1.5 font-display text-ink-soft text-[15px] leading-[1.7] hover:bg-bg-soft transition-colors">
                {l || <span className="text-ink-faint">—</span>}
              </div>
              <div className="px-5 py-1.5 border-l border-rule font-display text-ink-soft text-[15px] leading-[1.7] hover:bg-bg-soft transition-colors">
                {r || <span className="text-ink-faint">—</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ColumnHeader({
  translation,
  bordered,
}: {
  translation?: TranslationText;
  bordered?: boolean;
}) {
  if (!translation) {
    return (
      <div
        className={`px-5 py-3 border-b border-rule ${bordered ? "border-l" : ""}`}
      />
    );
  }
  const eraColor = ERA_COLORS[translation.era] ?? "#e8c179";
  return (
    <div
      className={`px-5 py-3 border-b border-rule bg-bg-soft ${
        bordered ? "border-l" : ""
      }`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-ink text-[1.05rem] leading-tight truncate">
            {translation.translator ?? "Original"}
          </p>
          <p className="text-ink-muted text-[11.5px] mt-0.5 tabular">
            {translation.language} · {translation.year}
          </p>
        </div>
        <span
          className="small-caps text-[10px] tracking-[0.16em] shrink-0"
          style={{ color: eraColor }}
        >
          {translation.era}
        </span>
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
    <div>
      <label className="block small-caps text-ink-muted text-[11px] tracking-[0.18em] mb-2">
        {label}
      </label>
      <div className="relative">
        <select
          value={selected}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none bg-transparent border border-rule focus:border-ink transition-colors px-3 py-2.5 pr-9 text-ink text-[14px] focus:outline-none cursor-pointer"
        >
          {translations.map((t) => (
            <option
              key={t.id}
              value={t.id}
              className="bg-bg-card text-ink"
            >
              {t.translator ?? "Original"} ({t.language}, {t.year})
            </option>
          ))}
        </select>
        <span
          className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-ink-muted font-display italic text-[14px]"
          aria-hidden
        >
          ▾
        </span>
      </div>
    </div>
  );
}
