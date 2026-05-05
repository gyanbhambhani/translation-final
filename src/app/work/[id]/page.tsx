import { notFound } from "next/navigation";
import Link from "next/link";
import { getWorkById, getTranslationsForWork, getEmbeddingPointsForWork } from "@/lib/data";
import WorkDetail from "@/components/WorkDetail";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function WorkPage({ params }: Props) {
  const { id } = await params;

  const work = getWorkById(id);
  if (!work) notFound();

  const translations = getTranslationsForWork(id);
  const embeddingPoints = getEmbeddingPointsForWork(id);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 mb-8 transition-colors"
        >
          <span>←</span> Back to search
        </Link>

        <header className="mb-10">
          <h1 className="text-4xl font-bold text-white mb-2">{work.title}</h1>
          <p className="text-xl text-zinc-400">
            {work.author}
            {work.sourceLanguage && (
              <span className="text-zinc-600"> · {work.sourceLanguage}</span>
            )}
            {(work.year ?? work.originalYear) && (
              <span className="text-zinc-600"> · {work.year ?? work.originalYear}</span>
            )}
          </p>
          {work.description && (
            <p className="mt-3 text-zinc-500 max-w-2xl leading-relaxed">
              {work.description}
            </p>
          )}
          {(work.collection) && (
            <p className="mt-1 text-sm text-zinc-600 italic">
              From: {work.collection}
            </p>
          )}
        </header>

        <WorkDetail
          work={{
            id: work.id,
            title: work.title,
            author: work.author,
            sourceLanguage: work.sourceLanguage,
          }}
          translations={translations}
          embeddingPoints={embeddingPoints}
        />
      </div>
    </main>
  );
}
