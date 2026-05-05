import { Suspense } from "react";
import SearchSection from "@/components/SearchSection";
import {
  getFeaturedWorks,
  getCorpus,
  getCatalog,
  getEmbeddings,
} from "@/lib/data";
import type { EmbeddingPoint } from "@/lib/types";

export default function Home() {
  const featured = getFeaturedWorks();
  const corpus = getCorpus();
  const catalog = getCatalog();
  const embeddings = getEmbeddings();

  const allTranslations = [
    ...corpus.works.flatMap((w) => w.texts),
    ...catalog.works.flatMap((w) => w.translations),
  ];
  const languages = new Set(allTranslations.map((t) => t.language));
  const eras = new Set(allTranslations.map((t) => t.era));
  const totalWorks = corpus.works.length + catalog.works.length;

  const stats: Stat[] = [
    { value: totalWorks, label: "Works" },
    { value: allTranslations.length, label: "Translations" },
    { value: languages.size, label: "Languages" },
    { value: eras.size, label: "Eras" },
  ];

  return (
    <main className="relative">
      <Masthead />
      <Hero points={embeddings.points} />
      <Stats stats={stats} />
      <Method />
      <Catalog>
        <Suspense fallback={<SearchSkeleton />}>
          <SearchSection featured={featured} />
        </Suspense>
      </Catalog>
      <Footer />
    </main>
  );
}

/* ─── Masthead ────────────────────────────────────────────────────────── */

function Masthead() {
  return (
    <header className="px-6 sm:px-10 lg:px-16 pt-7 pb-6">
      <div className="mx-auto max-w-[1180px] flex items-center justify-between text-[12.5px]">
        <div className="flex items-center gap-2.5 text-ink">
          <span className="dot-accent font-display italic text-[17px] leading-none">
            Semantic Drift
          </span>
        </div>
        <nav className="flex items-center gap-6 text-ink-muted">
          <span className="hidden sm:inline">CW 107 · Spring 2026</span>
          <span className="text-ink-faint hidden sm:inline">/</span>
          <a
            href="https://github.com/gyanbhambhani/translation-final"
            target="_blank"
            rel="noopener noreferrer"
            className="link"
            aria-label="View source on GitHub"
          >
            Source
          </a>
        </nav>
      </div>
    </header>
  );
}

/* ─── Hero ────────────────────────────────────────────────────────────── */

function Hero({ points }: { points: EmbeddingPoint[] }) {
  return (
    <section className="relative px-6 sm:px-10 lg:px-16 pt-16 sm:pt-24 lg:pt-32 pb-24 sm:pb-32">
      <PointField points={points} />

      <div className="relative mx-auto max-w-[1180px]">
        <p className="rise rise-1 small-caps text-ink-muted text-[12.5px] tracking-[0.2em] mb-8">
          A final&nbsp;project · Spring&nbsp;2026
        </p>

        <h1 className="rise rise-2 font-display text-ink leading-[0.92] text-[clamp(3.25rem,9vw,8.5rem)] max-w-[18ch]">
          Every translation
          <br />
          is a&nbsp;
          <em className="italic text-accent">political</em> act.
        </h1>

        <p className="rise rise-3 mt-10 max-w-2xl text-ink-soft text-[18px] sm:text-[19px] leading-[1.55]">
          <span className="font-display italic text-ink">Semantic Drift</span>{" "}
          embeds two centuries of translations into a shared vector space and
          plots them with UMAP. Translators who agreed on a strategy cluster.
          Those who chose differently drift. The geometry, in the end, is
          the&nbsp;argument.
        </p>

        <a
          href="#catalog"
          className="rise rise-4 mt-12 inline-flex items-center gap-3 text-ink hover:text-accent transition-colors group"
        >
          <span className="small-caps text-[12.5px] tracking-[0.18em]">
            Browse the catalog
          </span>
          <span className="font-display italic text-[20px] transition-transform group-hover:translate-x-1">
            ↓
          </span>
        </a>
      </div>
    </section>
  );
}

/* The hero background — the project's own embedding cloud, rendered quietly. */

function PointField({ points }: { points: EmbeddingPoint[] }) {
  if (points.length === 0) return null;

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);
  const xRange = xMax - xMin || 1;
  const yRange = yMax - yMin || 1;

  const W = 1600;
  const H = 900;
  const PAD = 40;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      className="point-field absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden
    >
      <defs>
        <radialGradient id="hero-fade" cx="35%" cy="55%" r="75%">
          <stop offset="0%" stopColor="rgba(11,11,10,0)" />
          <stop offset="55%" stopColor="rgba(11,11,10,0.55)" />
          <stop offset="100%" stopColor="rgba(11,11,10,0.95)" />
        </radialGradient>
      </defs>

      {points.map((p, i) => {
        const x = PAD + ((p.x - xMin) / xRange) * (W - PAD * 2);
        const y = PAD + ((p.y - yMin) / yRange) * (H - PAD * 2);
        const r = 1.4 + ((i * 37) % 7) * 0.35;
        return (
          <circle
            key={p.id}
            cx={x}
            cy={y}
            r={r}
            fill="#c8c3b8"
            style={{ animationDelay: `${(i * 113) % 8000}ms` }}
          />
        );
      })}

      <rect width={W} height={H} fill="url(#hero-fade)" />
    </svg>
  );
}

/* ─── Stats — one ruled line ──────────────────────────────────────────── */

interface Stat {
  value: number;
  label: string;
}

function Stats({ stats }: { stats: Stat[] }) {
  return (
    <section className="px-6 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-[1180px] border-t border-rule">
        <dl className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-rule">
          {stats.map((s) => (
            <div key={s.label} className="py-7 sm:py-8 sm:px-8 first:sm:pl-0">
              <dt className="small-caps text-ink-muted text-[12px] tracking-[0.18em] mb-2">
                {s.label}
              </dt>
              <dd className="font-display text-ink text-[2.5rem] sm:text-[3rem] leading-none tabular">
                {s.value.toLocaleString()}
              </dd>
            </div>
          ))}
        </dl>
        <div className="border-b border-rule" />
      </div>
    </section>
  );
}

/* ─── Catalog wrapper ─────────────────────────────────────────────────── */

function Catalog({ children }: { children: React.ReactNode }) {
  return (
    <section
      id="catalog"
      className="px-6 sm:px-10 lg:px-16 pt-24 sm:pt-32 pb-24 scroll-mt-8 border-t border-rule"
    >
      <div className="mx-auto max-w-[1180px]">
        <h2 className="font-display text-ink text-[2.25rem] sm:text-[2.75rem] leading-none mb-10">
          <em className="italic text-accent">Search</em> the catalog
        </h2>
        {children}
      </div>
    </section>
  );
}

/* ─── Method ──────────────────────────────────────────────────────────── */

function Method() {
  return (
    <section className="px-6 sm:px-10 lg:px-16 pb-32 border-t border-rule">
      <div className="mx-auto max-w-[1180px] pt-24 space-y-24">
        {/* Part 1 — the recipe */}
        <div className="grid gap-x-16 gap-y-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <p className="small-caps text-ink-muted text-[12px] tracking-[0.18em] mb-3">
              Method
            </p>
            <h2 className="font-display text-ink text-[2.25rem] leading-[1.05]">
              How a translation
              <br />
              becomes a <em className="italic text-accent">point</em>.
            </h2>
          </div>
          <ol className="lg:col-span-8 space-y-9">
            <Step
              n="01"
              title="Embed"
              body={
                <>
                  Each translation passes through OpenAI&rsquo;s{" "}
                  <code className="text-ink text-[14px]">
                    text-embedding-3-small
                  </code>
                  , returning a 1,536-dimensional vector. This particular model
                  was chosen for three reasons. It is{" "}
                  <em className="italic">multilingual in the same space</em> —
                  Persian, Sanskrit, Greek, Latin, German, Hindi, and English
                  all live on the same coordinates, so a Persian original and
                  a Victorian English crib can be compared directly. It is
                  cheap enough to embed the entire corpus on a personal API
                  budget, which means a student or a translator (not just a
                  lab) can run it. And it is widely available, so anyone can
                  re-run the script and verify the geometry instead of
                  trusting a screenshot.
                </>
              }
            />
            <Step
              n="02"
              title="Project"
              body={
                <>
                  UMAP collapses those 1,536 dimensions to two while preserving
                  local neighborhoods — translations the model reads as
                  similar stay close. The seed is fixed, so the same corpus
                  always lands in the same arrangement; the map is
                  reproducible. Distance between two points means{" "}
                  <em className="italic">
                    this particular AI reads these texts as expressing similar
                    things
                  </em>
                  . That is not the same as &ldquo;they say the same
                  thing&rdquo;: every reader is partial, and this one was
                  trained mostly on contemporary internet text. Modern English
                  sits near the centre of its world; Chapman&rsquo;s 1611
                  fourteeners and Sappho&rsquo;s Aeolic Greek drift outward.
                  The ruler is real, but it has an opinion.
                </>
              }
            />
            <Step
              n="03"
              title="Read"
              body={
                <>
                  D3 plots the points. Colour encodes era; shape encodes
                  language. Translations from the same decade tend to cluster;
                  translators who prioritised semantic fidelity drift one way,
                  those who prioritised sonic or political fidelity drift
                  another. The geometry does not say which is right. It shows
                  you the <em className="italic">shape of the choice</em>{" "}
                  — and once you can see the shape, you can ask the harder
                  question of why.
                </>
              }
            />
          </ol>
        </div>

        {/* Part 2 — what it argues */}
        <div className="grid gap-x-16 gap-y-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <p className="small-caps text-ink-muted text-[12px] tracking-[0.18em] mb-3">
              Stakes
            </p>
            <h2 className="font-display text-ink text-[2.25rem] leading-[1.05]">
              What it
              <br />
              <em className="italic text-accent">argues</em>.
            </h2>
          </div>
          <div className="lg:col-span-8 space-y-7 text-ink-soft text-[15.5px] leading-[1.7] max-w-[64ch]">
            <p>
              Translators have always been invisible labour — the better the
              translation, the less you notice the person who made it. The
              names on the spines drift toward the back matter; the choices
              they made about which word, which register, which culture to
              foreground vanish into the surface of the text. This project
              makes one slice of those choices visible.
            </p>
            <p>
              You can see Pope pulling the <em className="italic">Iliad</em>{" "}
              toward 18th-century courtly English. FitzGerald rewriting
              himself across thirty years of his own{" "}
              <em className="italic">Rubáiyát</em>, drifting away from the
              Persian he started with. The Hindi translators of Ramanujan
              each carrying the same English poem into a different
              decade&rsquo;s idiom — Sanskritic in 1973, post-liberalisation
              in 1994, urban-colloquial in 2005, Instagram-contemporary in
              2021. These are not failures of fidelity. They are evidence
              that translation is a place where languages meet, and that
              every meeting leaves a mark.
            </p>
            <p>
              None of this says any translation is &ldquo;correct&rdquo; or
              &ldquo;best.&rdquo; It says: every translation is a negotiation
              between worlds — between languages, between centuries, between
              a translator&rsquo;s political moment and the moment the
              original was written. For translators working today,
              especially those moving between under-resourced languages and
              a world that wants everything in English, the small claim
              here is that those negotiations can be{" "}
              <em className="italic">seen</em>, measured, and taken
              seriously as part of the work — not erased into a clean
              English surface.
            </p>
            <p>
              Translation isn&rsquo;t a neutral pipe. It has a shape, and
              the shape can be read.
            </p>
            <p className="pt-3 border-t border-rule text-ink-muted text-[13.5px] leading-[1.65]">
              <span className="small-caps tracking-[0.16em] text-ink-faint mr-2">
                Note
              </span>
              Every catalog excerpt is fetched at build time from Project
              Gutenberg with a verifiable{" "}
              <code className="text-ink-soft text-[13px]">sourceUrl</code>{" "}
              on each entry. No AI-generated translations. No fabricated
              attributions. When you see Chapman 1611, Voss 1793, or
              Saint-Remy 1905, that is a real human translator&rsquo;s
              labour, pulled live from a public-domain source.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Step({
  n,
  title,
  body,
}: {
  n: string;
  title: string;
  body: React.ReactNode;
}) {
  return (
    <li className="grid grid-cols-[auto_1fr] gap-6 items-baseline">
      <span className="font-display italic text-ink-muted text-[1.5rem] leading-none tabular">
        {n}
      </span>
      <div>
        <h3 className="font-display text-ink text-[1.5rem] leading-tight mb-2">
          {title}
        </h3>
        <p className="text-ink-soft text-[15.5px] leading-[1.7] max-w-[58ch]">
          {body}
        </p>
      </div>
    </li>
  );
}

/* ─── Footer ──────────────────────────────────────────────────────────── */

function Footer() {
  return (
    <footer className="px-6 sm:px-10 lg:px-16 border-t border-rule">
      <div className="mx-auto max-w-[1180px] py-10 flex flex-wrap items-center justify-between gap-4 text-[13px] text-ink-muted">
        <p>
          <span className="font-display italic text-ink">Semantic Drift</span>{" "}
          — a final project for CW 107.
        </p>
        <p className="text-ink-faint">
          Set in Instrument Serif &amp; Instrument Sans · Spring 2026
        </p>
      </div>
    </footer>
  );
}

function SearchSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 animate-pulse">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-32 border border-rule" />
      ))}
    </div>
  );
}
