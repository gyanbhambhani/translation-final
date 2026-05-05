"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";
import type { EmbeddingPoint } from "@/lib/types";
import { ERA_COLORS } from "@/lib/types";

interface Props {
  points: EmbeddingPoint[];
}

function cosineSim(a: EmbeddingPoint, b: EmbeddingPoint): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  return Math.max(0, 1 - dist / 8);
}

export default function SimilarityHeatmap({ points }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || points.length === 0) return;

    const n = points.length;
    const cellSize = Math.min(40, Math.floor(560 / n));
    const margin = { top: 120, right: 20, bottom: 20, left: 120 };
    const innerW = cellSize * n;
    const innerH = cellSize * n;
    const totalW = margin.left + innerW + margin.right;
    const totalH = margin.top + innerH + margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    svg.attr("viewBox", `0 0 ${totalW} ${totalH}`).attr("width", "100%");

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const colorScale = d3
      .scaleSequential(d3.interpolateRdYlGn)
      .domain([0, 1]);

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const sim = i === j ? 1 : cosineSim(points[i], points[j]);
        g.append("rect")
          .attr("x", j * cellSize)
          .attr("y", i * cellSize)
          .attr("width", cellSize)
          .attr("height", cellSize)
          .attr("fill", colorScale(sim))
          .attr("stroke", "#09090b")
          .attr("stroke-width", 0.5)
          .append("title")
          .text(
            `${points[i].translator ?? "Original"} × ${points[j].translator ?? "Original"}: ${sim.toFixed(2)}`
          );
      }
    }

    const label = (d: EmbeddingPoint) =>
      d.translator ? `${d.translator.split(" ").slice(-1)[0]} '${String(d.year).slice(-2)}` : `Orig.`;

    g.selectAll(".col-label")
      .data(points)
      .enter()
      .append("text")
      .attr("class", "col-label")
      .attr("x", (_, i) => i * cellSize + cellSize / 2)
      .attr("y", -8)
      .attr("text-anchor", "end")
      .attr("transform", (_, i) =>
        `rotate(-45, ${i * cellSize + cellSize / 2}, -8)`
      )
      .attr("font-size", Math.min(11, cellSize - 2))
      .attr("fill", (d) => ERA_COLORS[d.era] ?? "#a1a1aa")
      .text(label);

    g.selectAll(".row-label")
      .data(points)
      .enter()
      .append("text")
      .attr("class", "row-label")
      .attr("x", -6)
      .attr("y", (_, i) => i * cellSize + cellSize / 2 + 4)
      .attr("text-anchor", "end")
      .attr("font-size", Math.min(11, cellSize - 2))
      .attr("fill", (d) => ERA_COLORS[d.era] ?? "#a1a1aa")
      .text(label);

    const legendW = 160;
    const legendH = 10;
    const lx = innerW - legendW;
    const ly = innerH + 16;

    const defs = svg.append("defs");
    const grad = defs
      .append("linearGradient")
      .attr("id", "heatmap-grad")
      .attr("x1", "0%")
      .attr("x2", "100%");

    [0, 0.25, 0.5, 0.75, 1].forEach((t) => {
      grad
        .append("stop")
        .attr("offset", `${t * 100}%`)
        .attr("stop-color", colorScale(t));
    });

    g.append("rect")
      .attr("x", lx)
      .attr("y", ly)
      .attr("width", legendW)
      .attr("height", legendH)
      .attr("fill", "url(#heatmap-grad)")
      .attr("rx", 2);

    g.append("text")
      .attr("x", lx)
      .attr("y", ly + legendH + 14)
      .attr("font-size", 10)
      .attr("fill", "#71717a")
      .text("0 (dissimilar)");

    g.append("text")
      .attr("x", lx + legendW)
      .attr("y", ly + legendH + 14)
      .attr("text-anchor", "end")
      .attr("font-size", 10)
      .attr("fill", "#71717a")
      .text("1 (identical)");
  }, [points]);

  return (
    <div className="w-full overflow-x-auto">
      <svg ref={svgRef} className="w-full" />
    </div>
  );
}
