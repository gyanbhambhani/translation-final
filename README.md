# Semantic Drift

**Every translation is a political act.** Semantic Drift maps how meaning shifts
across languages, eras, and cultural moments — visible in geometry.

Translations are embedded with OpenAI's `text-embedding-3-small`, projected to
2D with UMAP, and rendered with D3. Translations from the same era tend to
cluster; renderings that prioritize political meaning diverge from those that
prioritize sonic fidelity. The geometry makes the politics legible.

## Features

- **Search** a curated catalog of works and a seed corpus (A.K. Ramanujan
  poems with era-specific Hindi translations).
- **Per-work visualizations**:
  - **UMAP scatter** of every translation in vector space, colored by era
    and shaped by language.
  - **Similarity heatmap** of pairwise cosine distances between translations.
  - **Line-by-line alignment** view across translators.
- **Submit your own translation** — it gets embedded live, compared against
  the existing translations of that work, and dropped onto the map next to
  its closest neighbor.

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router) + React 19
- TypeScript
- Tailwind CSS v4
- [OpenAI](https://platform.openai.com/) embeddings (`text-embedding-3-small`)
- [umap-js](https://github.com/PAIR-code/umap-js) for dimensionality reduction
- [D3](https://d3js.org/) for visualizations

## Getting started

### 1. Install

```bash
npm install
```

### 2. Configure your OpenAI key

Create a `.env.local` in the project root:

```bash
OPENAI_API_KEY=sk-...
```

The key is required to (a) regenerate embeddings and (b) embed user-submitted
translations from the work detail page.

### 3. (Optional) Regenerate embeddings

A pre-computed `data/embeddings.json` is checked in, so the app runs without
hitting the API. To rebuild it from `data/corpus.json` and
`data/works-catalog.json`:

```bash
OPENAI_API_KEY=sk-... npm run embed
```

This embeds every translation, runs UMAP to project to 2D, and writes the
result back to `data/embeddings.json`.

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project layout

```
data/
  corpus.json          Seed corpus (full texts, used to generate embeddings)
  works-catalog.json   Curated catalog of works with translation previews
  embeddings.json      Pre-computed UMAP-projected embeddings

scripts/
  generate-embeddings.ts   Embeds corpus + catalog and runs UMAP

src/
  app/
    page.tsx                Home / search
    work/[id]/page.tsx      Per-work detail + visualizations
    api/
      search/route.ts       Title/author/tag search
      embed/route.ts        Embed a user translation, return similarities
      translations/[id]/    Per-work translation API
  components/
    SearchSection.tsx
    WorkDetail.tsx
    TranslationSubmit.tsx
    visualizations/
      UMAPScatter.tsx
      SimilarityHeatmap.tsx
      LineAlignment.tsx
  lib/
    data.ts               Loaders for corpus / catalog / embeddings
    types.ts              Shared types + era color / language shape maps
```

## Scripts

| Command           | What it does                                       |
| ----------------- | -------------------------------------------------- |
| `npm run dev`     | Start the Next.js dev server                       |
| `npm run build`   | Production build                                   |
| `npm run start`   | Run the production build                           |
| `npm run lint`    | Lint with ESLint                                   |
| `npm run embed`   | Regenerate `data/embeddings.json` via OpenAI + UMAP |

## How a user submission works

1. The user pastes a translation on a work detail page.
2. `POST /api/embed` embeds the new text and the existing translations of
   that work via `text-embedding-3-small`.
3. Cosine similarity is computed against every existing translation.
4. The new point is placed near its closest neighbor on the UMAP plot, and
   the ranked similarities are returned to the client.

## Notes

- This is a research/teaching artifact, not a translation service. The
  corpus is small and intentionally curated.
- Era color and language shape mappings live in `src/lib/types.ts`.
- The UMAP projection is deterministic (seeded `random`) so the layout is
  stable across runs.
