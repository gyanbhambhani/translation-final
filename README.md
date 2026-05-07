# Semantic Drift

**Every translation is a political act.**
Semantic Drift maps how meaning shifts across languages, eras, and cultural
moments — and makes that shift visible in geometry.

Built around a corpus of five A.K. Ramanujan poems carried into Hindi across
six decades, the project embeds every line of every translation in a shared
high-dimensional vector space and surfaces the structure with a UMAP scatter,
a parallel-drift viewer that plots every translation as a path through
(cumulative word count × per-line emotional weight), a line-by-line alignment
view, and a hybrid-retrieval semantic search. The argument the whole assembly makes is
that translation is not a transparent operation — that decade, register,
ideology, and the translator's hand all leave traces that a model trained on
human meaning can detect.

> CW 107 · Spring 2026 · Final project · Gyan Bhambhani

---

## What this project actually is

The project begins from a discovery: **there is no formally published Hindi
translation of A.K. Ramanujan's English poetry.** The Sahitya Akademi catalog
holds nothing. Bharatiya Jnanpith's Rashtrabharati Granthamala — their
inter-Indian translation imprint — holds nothing. Vani Prakashan and Rajkamal
Prakashan, the two largest Hindi publishers, hold nothing. The closest thing
to an exception is two unrelated poems ("दो अंडे" and "एक छाता और एक घड़ी")
translated by Dr. Madhavi S. Bhandari and posted to a Kannada-Hindi literary
blog in November 2010. None of the five poems in this corpus appear in any
Hindi rendering anywhere I have been able to locate.

That silence is where the project starts. **Because no published Hindi
translations exist, every Hindi text in this corpus is written by the
project author** — five Hindi versions per poem, each composed deliberately
in a different decade's literary register: the Sanskritized *nayi kavita*
of the early 1970s, the post-liberalization register of the 1990s, the
urban-colloquial register of the 2000s, a contemporary 2020s register,
and a present-day, diasporic, code-mixed 2026 voice. The four pre-2026
versions are *register studies* — not attributed to any historical
translator, not claiming to be "what someone in 1973 would have written,"
but a single hand running an exercise: what does this poem sound like if
the translator's voice is held constant and the decade is allowed to vary?

The result is **six versions of each poem** (one English source + five
Hindi register studies / translations by the same hand), 30 texts total,
every one of them embedded and projected into the same vector space.

The web application is the analytical instrument: it lets you read a poem
across all its versions, see which renderings cluster and which drift
apart, watch a single line travel through time, and search the whole
corpus by feeling rather than by name.

---

## The corpus

| Poem | English source (Ramanujan) | Hindi versions (all by Gyan Bhambhani) |
|------|----------------------------|----------------------------------------|
| **A River** | *The Striders* (1966) | 1973 study · 1994 study · 2005 study · 2021 study · 2026 |
| **Self Portrait** | *The Striders* (1966) | 1973 study · 1994 study · 2005 study · 2021 study · 2026 |
| **Extended Family** | *Relations* (1971) | 1973 study · 1994 study · 2005 study · 2021 study · 2026 |
| **Small-Scale Reflections on a Great House** | *Relations* (1971) | 1973 study · 1994 study · 2005 study · 2021 study · 2026 |
| **Chicago Zen** | *Second Sight* (1986) | 1973 study · 1994 study · 2005 study · 2021 study · 2026 |

In `data/corpus.json` every text carries a typed `kind` field
(`"original" | "register-study" | "project-author"`), a free-form
`provenance` string explaining exactly what the text is, and — where one
exists — a `sourceUrl`. The English originals are in copyright (Ramanujan
estate / OUP); no authoritative free online edition exists, so verification
runs through the print citation rather than a URL. The four register
studies have no external source by design; the `provenance` field for
each says so, in those words. The 2026 versions are tagged
`project-author` and labelled `code-mixed-diasporic`.

Every UI surface in the application — work detail page, search result
card, scatter-plot tooltip, line-alignment column header, parallel-drift
legend — surfaces a typed provenance pill so the reader can never confuse
a register study with a published translation.

The five poems were chosen because they sit on the seam Ramanujan spent his
life thinking through: South Indian temple-town to Mysore home to Chicago
classroom, ritual to anthropology, Sanskrit/Tamil/Kannada to English. They
are the texts where the question *what survives a translation across
fifty years and ten thousand miles* has the most to say.

A second, smaller layer of curated catalog works (built from Project
Gutenberg sources via `scripts/build-catalog.ts`) extends the corpus with
adjacent texts — Tagore, Goethe, Catullus, Dante — used as background
for the embedding visualizations.

---

## The interface

### Browse
The home page is a quiet typographic catalog. Each work card opens a
dedicated detail page.

### Semantic search
The search bar is not a name-lookup. The hint underneath it says it
plainly: *describe what it feels like — not what it's called.*

Behind the bar runs a three-stage pipeline:

1. **HyDE (Hypothetical Document Embedding).** Before searching, an LLM
   drafts a brief literary passage that *would* answer your query. Both
   the raw query and this hypothetical passage are embedded with
   `text-embedding-3-small`, and per-document cosine similarity takes the
   max of the two. This dramatically closes the asymmetry between a
   short query and a long poem; abstract queries like *"what does
   loneliness sound like in 1972?"* become matchable.
2. **BM25 lexical pass** runs in parallel over title + author +
   translator + language + era + previewText, so entity queries like
   *"Rilke german"* surface lexical hits even when the embedding doesn't
   know about them.
3. **Reciprocal Rank Fusion (Cormack et al. 2009)** merges the semantic
   and lexical rankings.

Results are displayed with a **perceptual match score** (a sigmoid
calibration of cosine similarity into a 0–100 scale that matches human
intuition about closeness), a qualitative band (*strong / close /
related / loose*), and an "exact" badge if the lexical pass also fired.
Above the result list, the HyDE passage appears as a small italic
annotation: *"we also searched for a passage like this…"* — making the
search behavior transparent and debuggable.

A 200-entry server-side LRU cache memoizes HyDE per query, so warm-path
latency is ~270ms. Cold path with HyDE generation is ~2–5s.

### Per-work visualizations
Each work detail page renders three views:

- **UMAP scatter** of every translation in the corpus projected to 2D.
  Color encodes era; shape encodes language. The translations of the
  current work are highlighted; the rest of the corpus sits in the
  background as context.
- **Parallel drift viewer** — every translation is plotted as a path
  through the same coordinate space. The x-axis is cumulative word count
  (so a translator who uses more words drifts further right). The y-axis
  is emotional weight per line, scored line-by-line by `o4-mini` (a
  reasoning model, run at `medium` effort) on a 0-1 scale where 0 is
  restrained / observational and 1 is loaded / charged. Scores are
  cached in `data/emotional-weights.json`. The English original is the
  reference path; every other translation traces its own arc through the
  same poem. Where two paths split, that's where a translator made a
  choice — the gap *is* the argument. Toggle individual paths in the
  legend, hover any point to read the actual line.
- **Line-by-line alignment** view, mapping each English line to its
  closest counterpart in each Hindi translation, with a per-pair
  similarity score.

### Submit your own translation
On any work detail page you can paste a Hindi (or English, or anything)
rendering. `POST /api/embed` embeds the new text live with
`text-embedding-3-small`, computes cosine similarity against every
existing translation of that work, places the new point next to its
closest neighbor on the UMAP plot, and returns the ranked similarities.
The translation does not persist — it lives in your session.

---

## How it works under the hood

```
                 ┌─────────────────────────────────────────────────┐
                 │  data/corpus.json     ←  hand-curated 5 poems    │
                 │  data/works-catalog.json  ←  Gutenberg + extras  │
                 └────────────────────────┬────────────────────────┘
                                          │
                          npm run embed   │
                                          ▼
              ┌───────────────────────────────────────────────┐
              │  OpenAI text-embedding-3-small (1536 dims)    │
              │  L2-normalized, one vector per passage        │
              └────────────────────────┬──────────────────────┘
                                       │
                       ┌───────────────┼───────────────┐
                       ▼               ▼               ▼
               data/vectors.json   UMAP fit     data/embeddings.json
                (full vectors)    (2D coords)   (points + 2D + meta)
                       │               │               │
                       └───────────────┼───────────────┘
                                       ▼
                  ┌──────────────────────────────────────┐
                  │  Next.js 16 App Router (React 19)    │
                  │                                      │
                  │  /             home + browse + search│
                  │  /work/[id]    detail + 3 viz panels │
                  │  /api/semantic-search   hybrid + HyDE│
                  │  /api/embed             user submit  │
                  └──────────────────────────────────────┘
```

The same `text-embedding-3-small` model powers (a) the offline embedding
of the corpus, (b) the live embedding of search queries, (c) the live
embedding of HyDE-generated hypothetical passages, and (d) the live
embedding of user-submitted translations. Everything sits in one shared
1536-dimensional space, which is what makes cross-language similarity
meaningful.

---

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router) + React 19
- TypeScript strict mode
- Tailwind CSS v4
- [OpenAI](https://platform.openai.com/) `text-embedding-3-small`
  (embeddings), `gpt-4o-mini` (HyDE generation), and `o4-mini` (per-line
  emotional-weight scoring for the parallel-drift viz)
- [umap-js](https://github.com/PAIR-code/umap-js) for dimensionality reduction
- [D3](https://d3js.org/) for the scatter plot, parallel-drift viewer, and
  alignment view
- BM25 + Reciprocal Rank Fusion implemented inline in
  `src/app/api/semantic-search/route.ts`

---

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

The key is required to (a) regenerate embeddings, (b) run semantic
search (live query embedding + HyDE), and (c) embed user-submitted
translations on the work detail pages.

### 3. (Optional) Regenerate embeddings

A pre-computed `data/embeddings.json` and `data/vectors.json` are checked
in, so the visualizations work without hitting the API. To rebuild from
`data/corpus.json` and `data/works-catalog.json` — for example after
editing a translation or adding a new one:

```bash
npm run embed
```

This embeds every passage, runs UMAP to project to 2D, and writes both
files. Costs roughly $0.001–$0.01 depending on corpus size.

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project layout

```
data/
  corpus.json              The five Ramanujan poems with all 6 translations each
  works-catalog.json       Curated catalog (Gutenberg-derived works + extras)
  embeddings.json          Pre-computed UMAP-projected points (display data)
  vectors.json             Full 1536-dim vectors (search/similarity data)
  emotional-weights.json   Per-line 0-1 emotional weights for the drift viz

scripts/
  generate-embeddings.ts   Embeds corpus + catalog via OpenAI, fits UMAP
  score-weights.ts         Scores per-line emotional weight via gpt-4o-mini
  build-catalog.ts         Builds works-catalog.json from a Gutenberg manifest

src/
  app/
    page.tsx                          Home: masthead, hero scatter, search, browse
    layout.tsx                        Root layout, fonts, metadata
    globals.css                       Tailwind v4 setup + custom typography
    work/[id]/page.tsx                Per-work detail + 3 visualization panels
    api/
      semantic-search/route.ts        Hybrid BM25 + cosine + HyDE search
      embed/route.ts                  User-submitted translation embedding
  components/
    SearchSection.tsx                 Search bar, hint, results, browse grid
    WorkDetail.tsx                    Work header + tabbed visualization panels
    TranslationSubmit.tsx             User submission form
    visualizations/
      UMAPScatter.tsx                 D3 scatter plot of all embeddings
      ParallelDrift.tsx               Per-line emotional-weight drift paths
      LineAlignment.tsx               Line-by-line cross-translation alignment
  lib/
    data.ts                           Loaders for corpus / catalog / embeddings
    types.ts                          Shared types, era colors, language shapes
```

---

## Scripts

| Command            | What it does                                               |
| ------------------ | ---------------------------------------------------------- |
| `npm run dev`      | Start the Next.js dev server                               |
| `npm run build`    | Production build                                           |
| `npm run start`    | Run the production build                                   |
| `npm run lint`     | Lint with ESLint                                           |
| `npm run embed`    | Regenerate `data/embeddings.json` + `data/vectors.json`    |
| `npm run weights`  | Score per-line emotional weight for the parallel-drift viz (writes `data/emotional-weights.json`). Defaults to `o4-mini` reasoning model at `medium` effort; override with `MODEL=` and `REASONING_EFFORT=`. Pass `-- --refresh` to re-score everything. |
| `npm run build-catalog` | Rebuild `data/works-catalog.json` from the Gutenberg manifest |

---

## Theoretical framework

The project sits in dialogue with translation theory across two
traditions.

**Western:**
- Walter Benjamin, "The Task of the Translator" (1923) — translation as
  the afterlife of the original.
- Lawrence Venuti, *The Translator's Invisibility* (1995) — domestication
  vs. foreignization, and the political stakes of fluency.
- Mona Baker, *In Other Words: A Coursebook on Translation* (1992) — the
  taxonomy of equivalence at word, grammar, and pragmatic levels.

**Indian / postcolonial:**
- Tejaswini Niranjana, *Siting Translation: History, Post-Structuralism,
  and the Colonial Context* (UC Press, 1992) — translation as a
  technology of colonial power, and the case for re-translating from a
  postcolonial position. **The single most important framework text for
  this project's central claim.**
- G.N. Devy, *After Amnesia: Tradition and Change in Indian Literary
  Criticism* (1992).
- Sujit Mukherjee, *Translation as Discovery* (1981/1994).
- Gayatri Chakravorty Spivak, "The Politics of Translation" in
  *Outside in the Teaching Machine* (1993).

**Ramanujan on translation (primary sources):**
- "On Translating a Tamil Poem," in *The Collected Essays of
  A.K. Ramanujan*, ed. Vinay Dharwadker, OUP, 1999.
- "Three Hundred Rāmāyaṇas," same volume.
- "Is There an Indian Way of Thinking? An Informal Essay,"
  *Contributions to Indian Sociology* 23/1 (1989): 41–58.
- The afterword to his translation of U.R. Ananthamurthy's *Samskara*
  (OUP, 1976) — translation criticism in real time.

**Period reading for register research (decade-anchored Hindi voice):**
- 1970s *nayi kavita* — Sarveshwar Dayal Saxena's *Pratinidhi
  Kavitayen*; Raghuvir Sahay's *Hanso Hanso Jaldi Hanso* and
  *Atmahatya Ke Viruddh*.
- 1990s — Manglesh Dabral's *Ham Jo Dekhte Hain* (1995, Sahitya Akademi
  Award 2000); Arun Kamal's *Naye Ilake Mein* (1996, Sahitya Akademi
  Award 1998).
- *Indian Literature*, Sahitya Akademi, vol. 37 no. 4 (1994) — memorial
  issue on Ramanujan.

---

## Archive research

A research visit to the **A.K. Ramanujan Papers, 1944–1995** at the
University of Chicago's Hanna Holborn Gray Special Collections Research
Center (housed in Regenstein Library, 1100 East 57th Street) is part of
the project's evidence-gathering. The collection is 36.25 linear feet
across 71 boxes, organized into 8 series. The most likely places to
surface evidence of Hindi reception (or to confirm its absence) are:

- **Series II — Correspondence** (1958–1993). Some letters are in South
  Asian languages.
- **Series IV — Research, Translations and Writings** (1952–1995).
  Manuscripts, drafts, translation theory.
- **Series V — Personal** (1959–1992). Diaries and notecards.

Whether the archive surfaces a previously unknown Hindi correspondence
or confirms the institutional silence, the result becomes a finding the
project can report. Access: `scrc-reference@uchicago.edu`.
Citation format required:
`Ramanujan, A.K. Papers, [Box #, Folder #], Hanna Holborn Gray Special Collections Research Center, University of Chicago Library`

---

## Bibliography & sources

Citations follow a loose Chicago author-date convention; URLs are
provided where the source is digital-first or where the print edition is
inconvenient to obtain. Access dates apply to web sources only.

### Primary corpus — Ramanujan's English poetry

- Ramanujan, A.K. *The Striders.* London: Oxford University Press, 1966.
  *(Source of "A River" and "Self Portrait.")*
- Ramanujan, A.K. *Relations.* London: Oxford University Press, 1971.
  *(Source of "Extended Family" and "Small-Scale Reflections on a Great
  House.")*
- Ramanujan, A.K. *Second Sight.* New York: Oxford University Press,
  1986. *(Source of "Chicago Zen.")*
- Ramanujan, A.K. *The Collected Poems of A.K. Ramanujan.* Edited by
  Vinay Dharwadker. New Delhi: Oxford University Press, 1995. *(Single
  authoritative collected edition; Sahitya Akademi Award 1999,
  posthumous.)*

### Ramanujan on translation (primary)

- Ramanujan, A.K. "On Translating a Tamil Poem." In *The Collected
  Essays of A.K. Ramanujan*, edited by Vinay Dharwadker, with
  introductions by Stuart H. Blackburn et al. New Delhi: Oxford
  University Press, 1999. Section II, Essay 11.
- Ramanujan, A.K. "Three Hundred Rāmāyaṇas: Five Examples and Three
  Thoughts on Translation." In *The Collected Essays of A.K. Ramanujan.*
  *(Removed from the Delhi University history syllabus in 2011 — useful
  as a worked example of translation as political act.)*
- Ramanujan, A.K. "Is There an Indian Way of Thinking? An Informal
  Essay." *Contributions to Indian Sociology* 23, no. 1 (1989): 41–58.
  *(Originally circulated as a 1980 University of Chicago "Workshop on
  the Hindu Person" paper.)*
- Ramanujan, A.K. "Translator's Note" / Afterword to U.R. Ananthamurthy,
  *Samskara: A Rite for a Dead Man.* Translated from the Kannada by
  A.K. Ramanujan. New Delhi: Oxford University Press, 1976.

### Translation theory & criticism

**Western:**
- Benjamin, Walter. "The Task of the Translator." 1923. In *Illuminations*,
  edited by Hannah Arendt, translated by Harry Zohn. New York: Schocken,
  1968.
- Venuti, Lawrence. *The Translator's Invisibility: A History of
  Translation.* London: Routledge, 1995. *(2nd ed. 2008.)*
- Baker, Mona. *In Other Words: A Coursebook on Translation.* London:
  Routledge, 1992. *(3rd ed. 2018.)*

**Indian / postcolonial:**
- Niranjana, Tejaswini. *Siting Translation: History, Post-Structuralism,
  and the Colonial Context.* Berkeley: University of California Press,
  1992. <https://www.ucpress.edu/books/siting-translation/epub-pdf>
  *(The single most important framework text for this project's
  central claim.)*
- Devy, G.N. *After Amnesia: Tradition and Change in Indian Literary
  Criticism.* Hyderabad: Orient Longman, 1992.
- Mukherjee, Sujit. *Translation as Discovery and Other Essays on
  Indian Literature in English Translation.* Hyderabad: Orient Longman,
  1981. *(2nd ed., New Delhi: Orient Longman, 1994.)*
- Spivak, Gayatri Chakravorty. "The Politics of Translation." In
  *Outside in the Teaching Machine.* New York: Routledge, 1993.

### Period reading — Hindi register research

**1970s — *nayi kavita*:**
- Saxena, Sarveshwar Dayal. *Pratinidhi Kavitayen.* New Delhi: Rajkamal
  Prakashan. *(Representative-poems volume covering his 1960s–70s work.)*
- Saxena, Sarveshwar Dayal. *Kavitayen* (2 vols.). New Delhi: Rajkamal
  Prakashan, 2002.
- Sahay, Raghuvir. *Hanso Hanso Jaldi Hanso* (हँसो हँसो जल्दी हँसो).
  New Delhi: Rajkamal Prakashan. *(Canonical 1970s collection.)*
- Sahay, Raghuvir. *Atmahatya Ke Viruddh.* New Delhi: Rajkamal
  Prakashan, 1967.

**1990s — post-liberalization:**
- Dabral, Manglesh. *Ham Jo Dekhte Hain* (हम जो देखते हैं). New Delhi,
  1995. *(Sahitya Akademi Award, 2000.)*
- Dabral, Manglesh. *Ek Bar Iowa.* 1996. *(Travel diary from his Iowa
  Writing Program fellowship — directly relevant: a Hindi poet writing
  about America, the same axis as Ramanujan in reverse.)*
- Kamal, Arun. *Naye Ilake Mein* (नये इलाके में). New Delhi: Vani
  Prakashan, 1996. *(Sahitya Akademi Award, 1998.)*
- Kamal, Arun. *Saboot.* New Delhi: Vani Prakashan, 1989.

**Memorial / contemporaneous reception:**
- *Indian Literature*, vol. 37, no. 4 (1994). New Delhi: Sahitya
  Akademi. *(Memorial issue on Ramanujan; includes Prayag Shukla,
  "On Translating Shankha Ghosh into Hindi," and other essays on
  translation practice from the year after Ramanujan's death. Full
  text via the Internet Archive's Digital Library of India mirror:
  <https://archive.org/details/in.ernet.dli.2015.140076>.)*

### Archival

- *Guide to the A.K. Ramanujan Papers, 1944–1995.* Hanna Holborn Gray
  Special Collections Research Center, University of Chicago Library.
  © 2010 University of Chicago Library. 36.25 linear feet, 71 boxes,
  8 series. Finding aid:
  <https://www.lib.uchicago.edu/e/scrc/findingaids/view.php?eadid=ICU.SPCL.RAMANUJANAK>
  (accessed May 2026).

### Hindi translation evidence (the project's foundational claim)

The following sources were consulted to test the claim that "no formal
Hindi translation of Ramanujan's English poetry exists." Each is listed
with the result.

- **Sahitya Akademi catalog** (<https://sahitya-akademi.gov.in/>).
  Searched for Ramanujan as both author and subject in the
  English-to-Hindi translation listings. *Result: no Hindi translations
  of Ramanujan's English poetry are listed.*
- **Bharatiya Jnanpith / Rashtrabharati Granthamala** (their flagship
  inter-Indian translation imprint, <https://jnanpith.net/>). *Result:
  Ramanujan does not appear in the Granthamala catalog.*
- **Vani Prakashan** and **Rajkamal Prakashan** (the two largest Hindi
  literary publishers) catalogs. *Result: neither lists a Hindi
  translation of any Ramanujan English poem.*
- **Bhandari, Madhavi S., trans.** "ए. के. रामानुजन की दो कविताएँ"
  ("Two poems of A.K. Ramanujan"): "दो अंडे" ("Two Eggs") and "एक छाता
  और एक घड़ी" ("An Umbrella and a Watch"). Posted by Muraleedhara
  Upadhya Hiriadka, *muraleedhara upadhya hiriadka* (blog), November
  2010.
  <http://mupadhyahiri.blogspot.com/2010/11/ak-ramanujan-two-poems-hindi.html>
  (accessed May 2026). *Mirrored at*
  <https://udupiratha.blogspot.com/2010/11/ak-ramanujan-two-poems-hindi.html>.
  *The only Hindi translations of Ramanujan English poems located in
  any source. Both poems are unrelated to the five in this project's
  corpus.*

### Sources consulted in compiling this README and project statement

These are the secondary and digital sources that informed the framing,
verification, and bibliography above. They are not part of the project's
intellectual canon but are listed for transparency and reproducibility.

- Daniyal, Shoaib. "Reading the Small Print: The Literary Legacy of an
  Indian Modernist." *The Caravan*, August 1, 2013.
  <https://caravanmagazine.in/reportage/reading-small-print>
  *(Source for the description of the AKR Papers as "meticulously
  preserved and catalogued"; for biographical context on the Ananthamurthy
  / Samskara translation; for the literary-executor relationship of
  Vinay Dharwadker and Molly Daniels-Ramanujan.)*
- "A.K. Ramanujan." *Poetry Foundation.*
  <https://www.poetryfoundation.org/poets/a-k-ramanujan>
  *(Biographical and bibliographic baseline.)*
- "A.K. Ramanujan Book Prize for Translation." Association for Asian
  Studies, South Asia Council.
  *(Cited as evidence of the institutional recognition of Ramanujan's
  translation practice.)*
- "Manglesh Dabral." *Wikipedia.*
  <https://en.wikipedia.org/wiki/Manglesh_Dabral>
  *(Cross-referenced for collection years and Sahitya Akademi Award date.)*
- "Raghuvir Sahay." *Wikipedia.*
  <https://en.wikipedia.org/wiki/Raghuvir_Sahay>
  *(Cross-referenced for biographical dates and collection list.)*
- *Hindwi.org* and *Rekhta.org* — Hindi/Urdu literary archives consulted
  for primary-source poems by Saxena, Sahay, Dabral, and Kamal.
  <https://www.hindwi.org/> · <https://www.rekhta.org/>
- "Naye Ilake Mein." *Outlook India*, profile of Arun Kamal.
  <https://www.outlookindia.com/books/interview-with-the-poet-and-author-arun-kamal>
  *(Source for the 1998 Sahitya Akademi Award date and the *Khadi Boli*
  cadence description.)*
- Pande, Vasudha. "A.K. Ramanujan, *Is There an Indian Way of
  Thinking?* — An Informal Essay." Personal scholarly blog, 2016.
  <https://vasudhapande.com/2016/07/25/a-k-ramanujan-is-there-an-indian-way-of-thinking-an-informal-essay/>
  *(Used to confirm the essay's central context-sensitive vs.
  context-free argument and 1989 publication in *Contributions to
  Indian Sociology*.)*

### A note on web sources

Where this bibliography cites Wikipedia or a personal blog, that source
is doing one of two jobs: (1) confirming a date or publisher already
attested in print, or (2) providing access to a primary text (a poem,
an essay) whose canonical print edition is harder to obtain. No claim
in the project statement rests on a web source alone; everything either
has a print referent or is itself the primary digital evidence (as with
the Bhandari translations, where the blog *is* the publication).

---

## Notes and caveats

- This is a research and teaching artifact, not a translation service.
  The corpus is small and intentionally curated.
- Every cosine similarity in the project is over OpenAI
  `text-embedding-3-small` (1536 dimensions, L2-normalized). Raw cosine
  values for this model occupy a compressed range — unrelated text sits
  near 0.10–0.20 and identical text near 0.85–0.95 — so the displayed
  match score is a perceptual remapping (sigmoid centered at cos=0.28),
  not the raw cosine. The raw cosine is no longer surfaced in the UI but
  is still computed and returned in the JSON for anyone who wants it.
- The UMAP projection is deterministic (seeded `random`) so the layout is
  stable across runs.
- HyDE generation uses `gpt-4o-mini` and can be disabled per request via
  `?hyde=0` on the search endpoint, useful for benchmarking.
- **The "emotional weight" axis on the parallel-drift viewer is a
  model-as-rater judgment, not an objective measurement.** Every line in
  every translation was scored by `o4-mini` (OpenAI's small reasoning
  model) at `reasoning_effort=medium` with the same single rubric prompt
  (see `scripts/score-weights.ts`), so the scores are reproducible and use
  a consistent rubric across all 30 texts — but they remain one rater's
  reading. The model is configurable: pass `MODEL=o3` (or `gpt-4o-mini`,
  `gpt-4.1-mini`, etc.) and `REASONING_EFFORT=high|medium|low|minimal` to
  the script. Reasoning models use the dynamic range of the scale much
  more aggressively than chat models do — `gpt-4o-mini` clusters most
  scores in 0.30-0.50, while `o4-mini` reserves the high end for
  genuinely intense lines and the low end for purely denotative ones,
  which makes the drift between paths much more visible. The cache file
  `data/emotional-weights.json` is hand-editable; if a particular line's
  score feels wrong, override the number directly. Re-running
  `npm run weights -- --refresh` re-scores everything from scratch.
- The home page shows live counts (works / translations / languages /
  eras) computed at request time from the corpus + catalog.

---

## Author

**Gyan Bhambhani** — University of California, Berkeley Colwrit 107
("Translation Theory and Practice"), Spring 2026.

Every Hindi text in the corpus is by the project author. The four
pre-2026 Hindi versions of each poem are *register studies* — composed
deliberately to evoke a specific decade's Hindi literary register
(1970s *nayi-kavita*, 1990s post-liberalization, 2000s urban-colloquial,
2020s contemporary). They are not attributed to any historical translator
and are not pulled from any published source; no published Hindi
translation of any of these five Ramanujan poems exists. The 2026 version
of each poem is the present-day translation, written in a code-mixed
diasporic register.
