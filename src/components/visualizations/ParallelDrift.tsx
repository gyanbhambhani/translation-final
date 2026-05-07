"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import type { ProvenanceKind, ScoredText, TranslationText } from "@/lib/types";
import { ERA_COLORS } from "@/lib/types";
import { ProvenancePill } from "../Provenance";

interface Props {
  translations: TranslationText[];
  weights: Record<string, ScoredText>;
}

interface SeriesPoint {
  lineIndex: number;
  cumWords: number;
  weight: number;
  text: string;
  wordCount: number;
}

interface Series {
  textId: string;
  translator: string;
  era: string;
  language: string;
  year: number;
  kind?: ProvenanceKind;
  isOriginal: boolean;
  isUser: boolean;
  color: string;
  points: SeriesPoint[];
  totalWords: number;
}

const USER_TRANSLATOR_MARKER = "this project";

function buildSeries(
  translations: TranslationText[],
  weights: Record<string, ScoredText>
): Series[] {
  const series: Series[] = [];
  for (const t of translations) {
    const scored = weights[t.id];
    if (!scored) continue;
    let cum = 0;
    const points: SeriesPoint[] = scored.lines.map((line) => {
      const start = cum;
      cum += line.wordCount;
      return {
        lineIndex: line.index,
        // Plot the point at the midpoint of the line so a line "occupies"
        // its word range rather than starting at zero.
        cumWords: start + line.wordCount / 2,
        weight: line.weight,
        text: line.text,
        wordCount: line.wordCount,
      };
    });
    const isOriginal = t.translator === null || t.era === "original";
    // After the corpus rename, every Hindi translation in the
    // Ramanujan set is the project author. We prefer `kind` to detect
    // it, falling back to the legacy translator-name marker so old
    // catalog entries still light up the user-submission styling.
    const isUser =
      t.kind === "project-author" ||
      (t.translator ?? "").includes(USER_TRANSLATOR_MARKER);
    series.push({
      textId: t.id,
      translator: t.translator ?? "Original",
      era: t.era,
      language: t.language,
      year: t.year,
      kind: t.kind,
      isOriginal,
      isUser,
      color: ERA_COLORS[t.era] ?? "#807b71",
      points,
      totalWords: cum,
    });
  }
  // Original first, then chronological, then user last so it draws on top.
  series.sort((a, b) => {
    if (a.isOriginal && !b.isOriginal) return -1;
    if (!a.isOriginal && b.isOriginal) return 1;
    if (a.isUser && !b.isUser) return 1;
    if (!a.isUser && b.isUser) return -1;
    return a.year - b.year;
  });
  return series;
}

interface HoverState {
  seriesId: string;
  point: SeriesPoint;
  x: number;
  y: number;
}

export default function ParallelDrift({ translations, weights }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<HoverState | null>(null);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());

  const series = useMemo(
    () => buildSeries(translations, weights),
    [translations, weights]
  );

  const visibleSeries = useMemo(
    () => series.filter((s) => !hiddenIds.has(s.textId)),
    [series, hiddenIds]
  );

  useEffect(() => {
    if (!svgRef.current || series.length === 0) return;

    const margin = { top: 24, right: 22, bottom: 56, left: 56 };
    const width = 880;
    const height = 460;
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    svg
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("width", "100%")
      .attr("preserveAspectRatio", "xMidYMid meet");

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const maxWords = d3.max(series, (s) => s.totalWords) ?? 100;

    const x = d3
      .scaleLinear()
      .domain([0, maxWords])
      .range([0, innerW])
      .nice();
    const y = d3.scaleLinear().domain([0, 1]).range([innerH, 0]);

    /* ─ gridlines ─ */
    const gridG = g.append("g").attr("class", "grid").attr("opacity", 0.35);
    y.ticks(5).forEach((tick) => {
      gridG
        .append("line")
        .attr("x1", 0)
        .attr("x2", innerW)
        .attr("y1", y(tick))
        .attr("y2", y(tick))
        .attr("stroke", "#232220")
        .attr("stroke-dasharray", tick === 0 || tick === 1 ? "none" : "2 4");
    });
    x.ticks(8).forEach((tick) => {
      gridG
        .append("line")
        .attr("x1", x(tick))
        .attr("x2", x(tick))
        .attr("y1", 0)
        .attr("y2", innerH)
        .attr("stroke", "#1c1b19")
        .attr("stroke-dasharray", "2 5");
    });

    /* ─ axes ─ */
    const axisStyle = (sel: d3.Selection<SVGGElement, unknown, null, undefined>) => {
      sel.selectAll("path,line").attr("stroke", "#3a3733");
      sel
        .selectAll("text")
        .attr("fill", "#807b71")
        .attr("font-family", "var(--font-sans), sans-serif")
        .attr("font-size", 10.5)
        .attr("letter-spacing", "0.06em");
    };

    const xAxis = g
      .append("g")
      .attr("transform", `translate(0,${innerH})`)
      .call(d3.axisBottom(x).ticks(8).tickSizeOuter(0));
    axisStyle(xAxis);

    const yAxis = g
      .append("g")
      .call(
        d3
          .axisLeft(y)
          .ticks(5)
          .tickFormat((d) => d3.format(".1f")(d as number))
          .tickSizeOuter(0)
      );
    axisStyle(yAxis);

    /* ─ axis titles ─ */
    g.append("text")
      .attr("x", innerW / 2)
      .attr("y", innerH + 42)
      .attr("text-anchor", "middle")
      .attr("font-family", "var(--font-sans), sans-serif")
      .attr("font-size", 10.5)
      .attr("letter-spacing", "0.18em")
      .attr("fill", "#807b71")
      .text("CUMULATIVE WORD COUNT  →");

    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -innerH / 2)
      .attr("y", -40)
      .attr("text-anchor", "middle")
      .attr("font-family", "var(--font-sans), sans-serif")
      .attr("font-size", 10.5)
      .attr("letter-spacing", "0.18em")
      .attr("fill", "#807b71")
      .text("EMOTIONAL WEIGHT  →");

    g.append("text")
      .attr("x", -40)
      .attr("y", y(0) + 4)
      .attr("font-family", "var(--font-sans), sans-serif")
      .attr("font-size", 9.5)
      .attr("fill", "#807b71")
      .attr("font-style", "italic")
      .text("restrained");
    g.append("text")
      .attr("x", -40)
      .attr("y", y(1) + 4)
      .attr("font-family", "var(--font-sans), sans-serif")
      .attr("font-size", 9.5)
      .attr("fill", "#807b71")
      .attr("font-style", "italic")
      .text("loaded");

    /* ─ paths ─ */
    const line = d3
      .line<SeriesPoint>()
      .x((d) => x(d.cumWords))
      .y((d) => y(d.weight))
      .curve(d3.curveCatmullRom.alpha(0.5));

    const pathsG = g.append("g").attr("class", "paths");

    for (const s of visibleSeries) {
      const path = pathsG
        .append("path")
        .datum(s.points)
        .attr("fill", "none")
        .attr("stroke", s.color)
        .attr(
          "stroke-width",
          s.isOriginal ? 2.4 : s.isUser ? 1.9 : 1.3
        )
        .attr("stroke-opacity", s.isOriginal ? 0.95 : 0.78)
        .attr("stroke-linecap", "round")
        .attr("stroke-linejoin", "round")
        .attr(
          "stroke-dasharray",
          s.isOriginal ? "none" : s.isUser ? "1 0" : "none"
        )
        .attr("d", line);

      if (s.isOriginal) {
        // A faint glow under the original to mark it as the reference path.
        pathsG
          .insert("path", () => path.node())
          .datum(s.points)
          .attr("fill", "none")
          .attr("stroke", s.color)
          .attr("stroke-width", 7)
          .attr("stroke-opacity", 0.12)
          .attr("d", line);
      }

      pathsG
        .selectAll<SVGCircleElement, SeriesPoint>(`.dot-${s.textId}`)
        .data(s.points)
        .enter()
        .append("circle")
        .attr("class", `dot-${s.textId}`)
        .attr("cx", (d) => x(d.cumWords))
        .attr("cy", (d) => y(d.weight))
        .attr("r", s.isOriginal ? 3 : s.isUser ? 2.6 : 2.2)
        .attr("fill", "#0b0b0a")
        .attr("stroke", s.color)
        .attr("stroke-width", s.isOriginal ? 1.6 : 1.1)
        .style("cursor", "pointer")
        .on("mouseenter", function (event, d) {
          d3.select(this).attr("r", 5).attr("fill", s.color);
          const [mx, my] = d3.pointer(event, svgRef.current);
          setHover({ seriesId: s.textId, point: d, x: mx, y: my });
        })
        .on("mouseleave", function () {
          d3.select(this)
            .attr("r", s.isOriginal ? 3 : s.isUser ? 2.6 : 2.2)
            .attr("fill", "#0b0b0a");
          setHover(null);
        });
    }
  }, [visibleSeries, series]);

  if (series.length === 0) {
    return (
      <div className="border border-dashed border-rule py-12 px-6 text-center">
        <p className="font-display italic text-ink text-[1.4rem] mb-2">
          No emotional-weight data yet.
        </p>
        <p className="text-ink-muted text-[13.5px]">
          Run <code className="text-ink">npm run weights</code> to score
          every line in the corpus. Requires <code>OPENAI_API_KEY</code>.
        </p>
      </div>
    );
  }

  const hovered = hover && series.find((s) => s.textId === hover.seriesId);

  return (
    <div className="space-y-4">
      <Legend
        series={series}
        hiddenIds={hiddenIds}
        onToggle={(id) => {
          setHiddenIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
          });
        }}
      />

      <div className="relative">
        <svg ref={svgRef} className="w-full" />
        {hover && hovered && (
          <HoverCard
            x={hover.x}
            y={hover.y}
            label={hovered.translator}
            era={hovered.era}
            year={hovered.year}
            kind={hovered.kind}
            line={hover.point.text}
            weight={hover.point.weight}
            wordCount={hover.point.wordCount}
            color={hovered.color}
          />
        )}
      </div>

      <p className="text-ink-muted text-[12.5px] leading-relaxed max-w-3xl">
        Each path traces one translation line by line, left to right.{" "}
        Horizontal position is the running word count at that line — a more
        verbose translation drifts further right. Vertical position is how{" "}
        emotionally loaded that line is, scored 0 (restrained) to 1 (loaded).{" "}
        Where the paths split, that&rsquo;s where a translator made a choice.
      </p>
    </div>
  );
}

/* ─── legend ──────────────────────────────────────────────────────── */

function Legend({
  series,
  hiddenIds,
  onToggle,
}: {
  series: Series[];
  hiddenIds: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-2 text-[12px]">
      {series.map((s) => {
        const hidden = hiddenIds.has(s.textId);
        return (
          <li key={s.textId}>
            <button
              type="button"
              onClick={() => onToggle(s.textId)}
              className={`flex items-center gap-2 transition-opacity ${
                hidden ? "opacity-35" : "opacity-100"
              }`}
              title={hidden ? "Show" : "Hide"}
            >
              <span
                className="inline-block"
                style={{
                  width: s.isOriginal ? 22 : 18,
                  height: s.isOriginal ? 3 : 2,
                  background: s.color,
                  borderRadius: 2,
                }}
              />
              <span className="font-display text-ink text-[13px]">
                {s.translator}
              </span>
              <span className="small-caps text-ink-faint text-[10px] tracking-[0.16em] tabular">
                {s.era === "original" ? "orig." : s.era} · {s.year}
              </span>
              <ProvenancePill kind={s.kind} />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/* ─── hover card ──────────────────────────────────────────────────── */

function HoverCard({
  x,
  y,
  label,
  era,
  year,
  kind,
  line,
  weight,
  wordCount,
  color,
}: {
  x: number;
  y: number;
  label: string;
  era: string;
  year: number;
  kind?: ProvenanceKind;
  line: string;
  weight: number;
  wordCount: number;
  color: string;
}) {
  const left = Math.min(Math.max(x + 14, 8), 700);
  const top = Math.max(y - 10, 8);
  return (
    <div
      className="pointer-events-none absolute z-10 max-w-[320px] bg-bg/95 border px-4 py-3 shadow-lg backdrop-blur-sm"
      style={{ left, top, borderColor: color + "55" }}
    >
      <p className="small-caps text-ink-faint text-[10px] tracking-[0.18em] mb-1.5">
        <span style={{ color }}>{label}</span>
        <span className="text-ink-faint"> · {era === "original" ? "orig." : era} · </span>
        <span className="tabular">{year}</span>
      </p>
      {kind && (
        <div className="mb-2">
          <ProvenancePill kind={kind} />
        </div>
      )}
      <p className="font-display italic text-ink text-[14.5px] leading-[1.45]">
        {line}
      </p>
      <p className="mt-2 text-[11px] text-ink-muted tabular">
        weight {weight.toFixed(2)} · {wordCount} word{wordCount === 1 ? "" : "s"}
      </p>
    </div>
  );
}
