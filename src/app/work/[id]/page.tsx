import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getWorkById,
  getTranslationsForWork,
  getEmbeddingPointsForWork,
} from "@/lib/data";
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
  const year = work.year ?? work.originalYear;

  return (
    <main className="relative">
      <Masthead />

      <article className="px-6 sm:px-10 lg:px-16 pt-12 sm:pt-16 pb-24">
        <div className="mx-auto max-w-[1180px]">
          <Link
            href="/"
            className="inline-flex items-baseline gap-2 mb-12 text-ink-muted hover:text-accent transition-colors group"
          >
            <span className="font-display italic text-[18px] -mb-0.5 transition-transform group-hover:-translate-x-1">
              ←
            </span>
            <span className="small-caps text-[12px] tracking-[0.18em]">
              Back to&nbsp;catalog
            </span>
          </Link>

          <header className="grid gap-x-12 gap-y-8 lg:grid-cols-12 mb-16">
            <div className="lg:col-span-8">
              <p className="small-caps text-ink-muted text-[12px] tracking-[0.2em] mb-4">
                {work.collection ? `from ${work.collection}` : "A work in the catalog"}
              </p>
              <h1 className="font-display text-ink leading-[0.95] text-[clamp(2.5rem,6vw,5rem)]">
                {work.title}
              </h1>
              <p className="mt-4 font-display italic text-ink-soft text-[1.5rem] sm:text-[1.75rem] leading-tight">
                {work.author}
              </p>
            </div>

            <aside className="lg:col-span-4 lg:pt-3">
              <dl className="border-t border-rule pt-4 grid grid-cols-2 gap-x-6 gap-y-4 text-[13px]">
                {work.sourceLanguage && (
                  <div>
                    <dt className="small-caps text-ink-muted text-[11px] tracking-[0.16em] mb-1">
                      Original
                    </dt>
                    <dd className="text-ink font-display italic text-[16px]">
                      {work.sourceLanguage}
                    </dd>
                  </div>
                )}
                {year && (
                  <div>
                    <dt className="small-caps text-ink-muted text-[11px] tracking-[0.16em] mb-1">
                      Year
                    </dt>
                    <dd className="text-ink font-display italic text-[16px] tabular">
                      {year}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="small-caps text-ink-muted text-[11px] tracking-[0.16em] mb-1">
                    Translations
                  </dt>
                  <dd className="text-ink font-display italic text-[16px] tabular">
                    {translations.length}
                  </dd>
                </div>
                <div>
                  <dt className="small-caps text-ink-muted text-[11px] tracking-[0.16em] mb-1">
                    Embedded
                  </dt>
                  <dd className="text-ink font-display italic text-[16px] tabular">
                    {embeddingPoints.length}
                  </dd>
                </div>
              </dl>
            </aside>
          </header>

          {work.description && (
            <p className="font-display italic text-ink-soft text-[1.15rem] sm:text-[1.25rem] leading-[1.55] max-w-3xl mb-16 border-l border-accent pl-6">
              {work.description}
            </p>
          )}

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
      </article>
    </main>
  );
}

function Masthead() {
  return (
    <header className="px-6 sm:px-10 lg:px-16 pt-7 pb-6 border-b border-rule">
      <div className="mx-auto max-w-[1180px] flex items-center justify-between text-[12.5px]">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-ink hover:text-accent transition-colors"
        >
          <span className="dot-accent font-display italic text-[17px] leading-none">
            Semantic Drift
          </span>
        </Link>
        <nav className="flex items-center gap-6 text-ink-muted">
          <span className="hidden sm:inline">CW 107 · Spring 2026</span>
          <span className="text-ink-faint hidden sm:inline">/</span>
          <a
            href="https://github.com/gyanbhambhani/translation-final"
            target="_blank"
            rel="noopener noreferrer"
            className="link"
          >
            Source
          </a>
        </nav>
      </div>
    </header>
  );
}
