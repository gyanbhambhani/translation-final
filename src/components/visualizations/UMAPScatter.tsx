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
    ctx.fillStyle = "#0b0b0a";
    ctx.fillRect(0, 0, dims.width, dims.height);

    // Faint grid — barely visible, suggests a coordinate plane
    ctx.strokeStyle = "#1c1b19";
    ctx.lineWidth = 1;
    const gridSteps = 6;
    for (let i = 1; i < gridSteps; i++) {
      const gx = padding + ((dims.width - padding * 2) * i) / gridSteps;
      const gy = padding + ((dims.height - padding * 2) * i) / gridSteps;
      ctx.beginPath();
      ctx.moveTo(gx, padding);
      ctx.lineTo(gx, dims.height - padding);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(padding, gy);
      ctx.lineTo(dims.width - padding, gy);
      ctx.stroke();
    }

    for (const point of points) {
      const cx = xScale(point.x);
      const cy = yScale(point.y);
      const color = ERA_COLORS[point.era] ?? "#e8c179";
      const shape = getShape(point.language);
      const size = point.isUserSubmission ? SHAPE_SIZE + 3 : SHAPE_SIZE;

      ctx.fillStyle = color + "cc";
      ctx.strokeStyle = point.isUserSubmission ? "#f4f1ea" : color;
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
        className="cursor-crosshair border border-rule"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip(null)}
      />

      {tooltip && (
        <div
          className="fixed z-50 bg-bg-card border border-ink-faint p-4 shadow-2xl pointer-events-none max-w-xs"
          style={{ left: tooltip.x + 12, top: tooltip.y - 10 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span
              className="w-2.5 h-2.5 inline-block shrink-0"
              style={{
                background: ERA_COLORS[tooltip.point.era] ?? "#e8c179",
              }}
            />
            <span className="font-display text-ink text-[14px]">
              {tooltip.point.translator ?? "Original"}
            </span>
          </div>
          <p className="small-caps text-ink-muted text-[10.5px] tracking-[0.16em]">
            {tooltip.point.language}{" "}
            <span className="text-ink-faint">·</span>{" "}
            <span className="tabular">{tooltip.point.year}</span>{" "}
            <span className="text-ink-faint">·</span> {tooltip.point.era}
          </p>
          <p className="font-display italic text-ink-soft text-[12.5px] mt-2 leading-[1.55]">
            {tooltip.point.previewText.slice(0, 110)}…
          </p>
        </div>
      )}

      <Legend />
    </div>
  );
}

function Legend() {
  const eras = Object.entries(ERA_COLORS).slice(0, 10);
  return (
    <div className="mt-5 grid gap-3">
      <div>
        <p className="small-caps text-ink-muted text-[10.5px] tracking-[0.18em] mb-2">
          Era
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
          {eras.map(([era, color]) => (
            <div key={era} className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 shrink-0"
                style={{ background: color }}
              />
              <span className="text-ink-muted text-[11.5px] tabular">
                {era}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <p className="small-caps text-ink-muted text-[10.5px] tracking-[0.18em] mb-2">
          Language
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-ink-muted text-[11.5px]">
          <span>● English</span>
          <span>■ Hindi</span>
          <span>▲ French</span>
          <span>◆ German</span>
          <span>+ Spanish</span>
          <span>★ Persian</span>
        </div>
      </div>
    </div>
  );
}
