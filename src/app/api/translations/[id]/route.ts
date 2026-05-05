import { type NextRequest } from "next/server";
import { getWorkById, getTranslationsForWork, getEmbeddingPointsForWork } from "@/lib/data";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const work = getWorkById(id);
  if (!work) {
    return Response.json({ error: "Work not found" }, { status: 404 });
  }

  const translations = getTranslationsForWork(id);
  const embeddingPoints = getEmbeddingPointsForWork(id);

  return Response.json({ work, translations, embeddingPoints });
}
