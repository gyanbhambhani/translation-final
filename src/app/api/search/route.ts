import { type NextRequest } from "next/server";
import { searchWorks, getFeaturedWorks } from "@/lib/data";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q");

  if (!query || query.trim().length === 0) {
    const featured = getFeaturedWorks();
    return Response.json({ results: featured, query: "" });
  }

  const results = searchWorks(query.trim());
  return Response.json({ results, query });
}
