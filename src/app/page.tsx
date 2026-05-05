import { Suspense } from "react";
import SearchSection from "@/components/SearchSection";
import { getFeaturedWorks } from "@/lib/data";

export default function Home() {
  const featured = getFeaturedWorks();

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-5xl mx-auto px-6 py-16">
        <header className="mb-16 text-center">
          <h1 className="text-5xl font-bold tracking-tight text-white mb-4">
            Semantic Drift
          </h1>
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Every translation is a political act. Map how meaning shifts across
            languages, eras, and cultural moments — visible in geometry.
          </p>
        </header>

        <Suspense fallback={<SearchSkeleton />}>
          <SearchSection featured={featured} />
        </Suspense>

        <footer className="mt-24 pt-8 border-t border-zinc-800 text-center text-sm text-zinc-600">
          <p>
            Seed corpus: A.K. Ramanujan's poems with era-specific Hindi
            translations. Embeddings via OpenAI text-embedding-3-small.
            Visualization via UMAP + D3.
          </p>
        </footer>
      </div>
    </main>
  );
}

function SearchSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-12 bg-zinc-800 rounded-xl" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-36 bg-zinc-800 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
