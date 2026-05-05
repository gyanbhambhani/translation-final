import { type NextRequest } from "next/server";
import OpenAI from "openai";
import { getEmbeddingPointsForWork } from "@/lib/data";
import type { EmbeddingPoint } from "@/lib/types";

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "OPENAI_API_KEY is not configured" },
      { status: 503 }
    );
  }

  let body: { text: string; workId: string; label?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { text, workId, label } = body;
  if (!text?.trim() || !workId?.trim()) {
    return Response.json(
      { error: "Both text and workId are required" },
      { status: 400 }
    );
  }

  const openai = new OpenAI({ apiKey });

  const [userResponse, existingPoints] = await Promise.all([
    openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text.trim(),
    }),
    Promise.resolve(getEmbeddingPointsForWork(workId)),
  ]);

  if (existingPoints.length === 0) {
    return Response.json({ error: "No existing embeddings for this work" }, { status: 404 });
  }

  const userVec = userResponse.data[0].embedding;

  const existingTexts = existingPoints.map((p) => p.previewText);
  const batchResponse = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: existingTexts,
  });

  const similarities = existingPoints.map((point, i) => ({
    pointId: point.id,
    translator: point.translator,
    year: point.year,
    era: point.era,
    similarity: cosineSimilarity(userVec, batchResponse.data[i].embedding),
  }));

  similarities.sort((a, b) => b.similarity - a.similarity);

  const closest = similarities[0];
  const xSum = existingPoints.reduce((s, p) => s + p.x, 0);
  const ySum = existingPoints.reduce((s, p) => s + p.y, 0);
  const centroidX = xSum / existingPoints.length;
  const centroidY = ySum / existingPoints.length;

  const closestPoint = existingPoints.find((p) => p.id === closest.pointId)!;
  const newPoint: EmbeddingPoint = {
    id: `user-${Date.now()}`,
    workId,
    x: closestPoint.x + (Math.random() - 0.5) * 0.4,
    y: closestPoint.y + (Math.random() - 0.5) * 0.4,
    language: "User",
    languageCode: "xx",
    translator: label || "Your translation",
    year: new Date().getFullYear(),
    era: "2020s",
    register: "user",
    previewText: text.slice(0, 120) + (text.length > 120 ? "…" : ""),
    isUserSubmission: true,
    userLabel: label,
  };

  return Response.json({
    point: newPoint,
    similarities,
    centroid: { x: centroidX, y: centroidY },
    closestMatch: {
      ...closest,
      point: closestPoint,
    },
  });
}
