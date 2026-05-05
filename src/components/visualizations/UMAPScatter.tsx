"use client";

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import type { EmbeddingPoint } from "@/lib/types";
import { ERA_COLORS } from "@/lib/types";

interface Props {
  points: EmbeddingPoint[];
  width?: number;
  height?: number;
}

const SHAPE_SIZE = 7;

function getShape(language: string): string {
  switch (language) {
    case "Hindi": return "square";
    case "French": return "triangle";
    case "German": return "diamond";
    case "Spanish": return "cross";
    case "Persian": return "star";
    case "User": return "star";
    default: return "circle";
  }
}

function drawShape(
  ctx: CanvasRenderingContext2D,
  shape: string,
  cx: number,
  cy: number,
  size: number
) {
  ctx.beginPath();
  switch (shape) {
    case "circle":
      ctx.arc(cx, cy, size, 0, Math.PI * 2);
      break;
    case "square":
      ctx.rect(cx - size, cy - size, size * 2, size * 2);
      break;
    case "triangle":
      ctx.moveTo(cx, cy - size);
      ctx.lineTo(cx + size, cy + size);
      ctx.lineTo(cx - size, cy + size);
      ctx.closePath();
      break;
    case "diamond":
      ctx.moveTo(cx, cy - size);
      ctx.lineTo(cx + size, cy);
      ctx.lineTo(cx, cy + size);
      ctx.lineTo(cx - size, cy);
      ctx.closePath();
      break;
    default:
      ctx.arc(cx, cy, size, 0, Math.PI * 2);
  }
}

export default function UMAPScatter({ points, width = 600, height = 400 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    point: EmbeddingPoint;
  } | null>(null);
  const [dims, setDims] = useState({ width, height });

  useEffect(() => {
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const w = entry.contentRect.width;
        setDims({ width: w, height: Math.round(w * 0.6) });
      }
    });
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || points.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = dims.width * dpr;
    canvas.height = dims.height * dpr;
    ctx.scale(dpr, dpr);

    const padding = 40;
    const xExtent = d3.extent(points, (p) => p.x) as [number, number];
    const yExtent = d3.extent(points, (p) => p.y) as [number, number];

    const xScale = d3
      .scaleLinear()
      .domain([xExtent[0] - 0.5, xExtent[1] + 0.5])
      .range([padding, dims.width - padding]);

    const yScale = d3
      .scaleLinear()
      .domain([yExtent[0] - 0.5, yExtent[1] + 0.5])
      .range([dims.height - padding, padding]);

    ctx.clearRect(0, 0, dims.width, dims.height);
    ctx.fillStyle = "#09090b";
    ctx.fillRect(0, 0, dims.width, dims.height);

    for (const point of points) {
      const cx = xScale(point.x);
      const cy = yScale(point.y);
      const color = ERA_COLORS[point.era] ?? "#6366f1";
      const shape = getShape(point.language);
      const size = point.isUserSubmission ? SHAPE_SIZE + 3 : SHAPE_SIZE;

      ctx.fillStyle = color + "cc";
      ctx.strokeStyle = point.isUserSubmission ? "#fff" : color;
      ctx.lineWidth = point.isUserSubmission ? 2 : 1;

      drawShape(ctx, shape, cx, cy, size);
      ctx.fill();
      ctx.stroke();
    }

    (canvas as HTMLCanvasElement & { _xScale: typeof xScale; _yScale: typeof yScale })._xScale = xScale;
    (canvas as HTMLCanvasElement & { _xScale: typeof xScale; _yScale: typeof yScale })._yScale = yScale;
  }, [points, dims]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const xScale = (canvas as HTMLCanvasElement & { _xScale?: d3.ScaleLinear<number, number> })._xScale;
    const yScale = (canvas as HTMLCanvasElement & { _yScale?: d3.ScaleLinear<number, number> })._yScale;
    if (!xScale || !yScale) return;

    let closest: EmbeddingPoint | null = null;
    let minDist = Infinity;

    for (const p of points) {
      const cx = xScale(p.x);
      const cy = yScale(p.y);
      const dist = Math.hypot(mx - cx, my - cy);
      if (dist < minDist) {
        minDist = dist;
        closest = p;
      }
    }

    if (closest && minDist < 20) {
      setTooltip({ x: e.clientX, y: e.clientY, point: closest });
    } else {
      setTooltip(null);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <canvas
        ref={canvasRef}
        style={{ width: dims.width, height: dims.height }}
        className="rounded-lg cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip(null)}
      />

      {tooltip && (
        <div
          className="fixed z-50 bg-zinc-800 border border-zinc-700 rounded-lg p-3 shadow-xl pointer-events-none max-w-xs"
          style={{ left: tooltip.x + 12, top: tooltip.y - 10 }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span
              className="w-3 h-3 rounded-sm inline-block flex-shrink-0"
              style={{ background: ERA_COLORS[tooltip.point.era] ?? "#6366f1" }}
            />
            <span className="text-xs font-semibold text-zinc-200">
              {tooltip.point.translator ?? "Original"}
            </span>
          </div>
          <p className="text-xs text-zinc-400">
            {tooltip.point.language} · {tooltip.point.year} · {tooltip.point.era}
          </p>
          <p className="text-xs text-zinc-500 mt-1 italic leading-relaxed">
            {tooltip.point.previewText.slice(0, 100)}…
          </p>
        </div>
      )}

      <Legend />
    </div>
  );
}

function Legend() {
  const eras = Object.entries(ERA_COLORS).slice(0, 8);
  return (
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
      {eras.map(([era, color]) => (
        <div key={era} className="flex items-center gap-1.5">
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ background: color }}
          />
          <span className="text-xs text-zinc-500 capitalize">{era}</span>
        </div>
      ))}
      <div className="flex items-center gap-1.5 ml-4">
        <span className="text-xs text-zinc-500">● English</span>
        <span className="text-xs text-zinc-500">■ Hindi</span>
        <span className="text-xs text-zinc-500">▲ French</span>
      </div>
    </div>
  );
}
