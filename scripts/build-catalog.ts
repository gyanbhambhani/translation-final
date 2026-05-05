#!/usr/bin/env tsx
/**
 * Builds data/works-catalog.json from a manifest of Project Gutenberg sources.
 *
 * Every translation entry has a verifiable `sourceUrl` pointing at a real
 * public-domain text. The script fetches each source, finds an anchor regex,
 * captures the next N lines, joins them into a single previewText, and writes
 * the result out. Entries that fail to fetch or anchor cleanly are reported
 * and skipped.
 *
 * Usage:
 *   npm run build-catalog
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

type Era = string;

interface ManifestTranslation {
  id: string;
  language: string;
  languageCode: string;
  translator: string | null;
  year: number;
  era: Era;
  register: string;
  gutenbergId: number;
  anchor: string; // regex
  lines: number; // how many subsequent lines to capture
}

interface ManifestWork {
  id: string;
  title: string;
  author: string;
  sourceLanguage: string;
  originalYear: number;
  description: string;
  tags: string[];
  translations: ManifestTranslation[];
}

const MANIFEST: ManifestWork[] = [
  {
    id: "homer-iliad",
    title: "The Iliad",
    author: "Homer",
    sourceLanguage: "Ancient Greek",
    originalYear: -800,
    description:
      "Homer's epic of the Trojan War. Seven English translations across four centuries, "
      + "all sourced from Project Gutenberg.",
    tags: ["epic", "classical", "greek"],
    translations: [
      {
        id: "homer-iliad-en-chapman-1611",
        language: "English",
        languageCode: "en",
        translator: "George Chapman",
        year: 1611,
        era: "1600s",
        register: "early-modern-fourteener",
        gutenbergId: 51355,
        anchor: "Achilles[''’] baneful wrath resound",
        lines: 6,
      },
      {
        id: "homer-iliad-en-pope-1715",
        language: "English",
        languageCode: "en",
        translator: "Alexander Pope",
        year: 1715,
        era: "1700s",
        register: "augustan-heroic-couplet",
        gutenbergId: 6130,
        anchor: "Achilles[''’] wrath, to Greece the direful spring",
        lines: 6,
      },
      {
        id: "homer-iliad-en-cowper-1791",
        language: "English",
        languageCode: "en",
        translator: "William Cowper",
        year: 1791,
        era: "1700s",
        register: "miltonic-blank-verse",
        gutenbergId: 16452,
        anchor: "Achilles sing, O Goddess",
        lines: 6,
      },
      {
        id: "homer-iliad-en-buckley-1860",
        language: "English",
        languageCode: "en",
        translator: "Theodore Alois Buckley",
        year: 1860,
        era: "1860s",
        register: "victorian-prose-literal",
        gutenbergId: 22382,
        anchor: "Sing, [Οο] goddess, the destructive wrath",
        lines: 6,
      },
      {
        id: "homer-iliad-en-derby-1864",
        language: "English",
        languageCode: "en",
        translator: "Edward, Earl of Derby",
        year: 1864,
        era: "1860s",
        register: "victorian-blank-verse",
        gutenbergId: 6150,
        anchor: "Of Peleus[''’] son, Achilles, sing, O Muse",
        lines: 6,
      },
      {
        id: "homer-iliad-en-lang-1882",
        language: "English",
        languageCode: "en",
        translator: "Lang, Leaf & Myers",
        year: 1882,
        era: "1880s",
        register: "victorian-archaizing-prose",
        gutenbergId: 3059,
        anchor: "Sing, goddess, the wrath of Achilles",
        lines: 4,
      },
      {
        id: "homer-iliad-en-butler-1898",
        language: "English",
        languageCode: "en",
        translator: "Samuel Butler",
        year: 1898,
        era: "1880s",
        register: "late-victorian-plain-prose",
        gutenbergId: 2199,
        anchor: "Sing, O goddess, the anger of Achilles",
        lines: 4,
      },
    ],
  },
  {
    id: "homer-odyssey",
    title: "The Odyssey",
    author: "Homer",
    sourceLanguage: "Ancient Greek",
    originalYear: -800,
    description:
      "Homer's poem of Odysseus's return. Two English translations from the Victorian era.",
    tags: ["epic", "classical", "greek"],
    translations: [
      {
        id: "homer-odyssey-en-butcher-1879",
        language: "English",
        languageCode: "en",
        translator: "Butcher & Lang",
        year: 1879,
        era: "1880s",
        register: "victorian-archaizing-prose",
        gutenbergId: 1728,
        anchor: "Tell me, Muse, of that man, so ready at need",
        lines: 4,
      },
      {
        id: "homer-odyssey-en-butler-1900",
        language: "English",
        languageCode: "en",
        translator: "Samuel Butler",
        year: 1900,
        era: "1900s",
        register: "late-victorian-plain-prose",
        gutenbergId: 1727,
        anchor: "Tell me, O Muse, of that ingenious hero",
        lines: 4,
      },
    ],
  },
  {
    id: "baudelaire-spleen",
    title: "Spleen LXXVIII (\"Quand le ciel bas et lourd\")",
    author: "Charles Baudelaire",
    sourceLanguage: "French",
    originalYear: 1857,
    description:
      "Baudelaire's most famous Spleen poem. The French original is in Project Gutenberg's "
      + "Les Fleurs du Mal.",
    tags: ["poetry", "symbolism", "french"],
    translations: [
      {
        id: "baudelaire-spleen-fr-source-1857",
        language: "French",
        languageCode: "fr",
        translator: null,
        year: 1857,
        era: "original",
        register: "symbolist-alexandrine",
        gutenbergId: 6099,
        anchor: "Quand le ciel bas et lourd pèse comme un couvercle",
        lines: 4,
      },
    ],
  },
  {
    id: "laozi-tao-te-ching",
    title: "Tao Te Ching, Chapter 1",
    author: "Laozi",
    sourceLanguage: "Classical Chinese",
    originalYear: -400,
    description:
      "The opening of the Daodejing. Legge's 1891 English translation, sourced from "
      + "Project Gutenberg.",
    tags: ["philosophy", "chinese", "daoism", "wisdom"],
    translations: [
      {
        id: "laozi-ch1-en-legge-1891",
        language: "English",
        languageCode: "en",
        translator: "James Legge",
        year: 1891,
        era: "1880s",
        register: "victorian-sinology",
        gutenbergId: 216,
        anchor: "1\\. The Tao that can be trodden",
        lines: 6,
      },
    ],
  },
  {
    id: "bhagavad-gita",
    title: "The Bhagavad-Gītā, Chapter 1",
    author: "Vyāsa (attr.)",
    sourceLanguage: "Sanskrit",
    originalYear: -200,
    description:
      "Edwin Arnold's 1885 verse translation \"The Song Celestial,\" sourced from "
      + "Project Gutenberg.",
    tags: ["hindu", "sanskrit", "philosophy", "epic"],
    translations: [
      {
        id: "gita-ch1-en-arnold-1885",
        language: "English",
        languageCode: "en",
        translator: "Sir Edwin Arnold",
        year: 1885,
        era: "1880s",
        register: "victorian-orientalist-verse",
        gutenbergId: 2388,
        anchor: "By Krishna and Prince Arjun held",
        lines: 8,
      },
    ],
  },
  {
    id: "tagore-gitanjali",
    title: "Gitanjali #1 (\"Thou hast made me endless\")",
    author: "Rabindranath Tagore",
    sourceLanguage: "Bengali",
    originalYear: 1910,
    description:
      "Tagore's own English self-translation of Gitanjali (1912), with Yeats's preface. "
      + "Won the 1913 Nobel.",
    tags: ["bengali", "lyric", "spiritual", "modernist"],
    translations: [
      {
        id: "tagore-gitanjali-1-en-self-1912",
        language: "English",
        languageCode: "en",
        translator: "Rabindranath Tagore (self)",
        year: 1912,
        era: "1910s",
        register: "edwardian-prose-poem",
        gutenbergId: 7164,
        anchor: "Thou hast made me endless, such is thy pleasure",
        lines: 6,
      },
    ],
  },
  {
    id: "sappho-fragments",
    title: "Sappho — selected fragments",
    author: "Sappho",
    sourceLanguage: "Ancient Greek",
    originalYear: -600,
    description:
      "Saint-Remy's 1905 French rendering of Sappho, sourced from Project Gutenberg.",
    tags: ["lyric", "greek", "antiquity", "love"],
    translations: [
      {
        id: "sappho-fr-saintremy-1905",
        language: "French",
        languageCode: "fr",
        translator: "Jules-Henry Rédarez Saint-Remy",
        year: 1905,
        era: "1900s",
        register: "belle-epoque-french",
        gutenbergId: 27308,
        anchor: "Il me semble l'égal des dieux",
        lines: 6,
      },
    ],
  },
  {
    id: "catullus-poems",
    title: "Catullus — selected poems",
    author: "Gaius Valerius Catullus",
    sourceLanguage: "Latin",
    originalYear: -55,
    description:
      "Robinson Ellis's 1871 English verse rendering of Catullus, sourced from "
      + "Project Gutenberg.",
    tags: ["latin", "lyric", "antiquity", "love"],
    translations: [
      {
        id: "catullus-en-ellis-1871",
        language: "English",
        languageCode: "en",
        translator: "Robinson Ellis",
        year: 1871,
        era: "1860s",
        register: "victorian-classical-verse",
        gutenbergId: 18867,
        anchor: "Living, Lesbia, we should e[''’]en be loving",
        lines: 6,
      },
    ],
  },
];

const PG = (id: number) => `https://www.gutenberg.org/cache/epub/${id}/pg${id}.txt`;
const DATA_DIR = join(process.cwd(), "data");

interface FetchedFile {
  id: number;
  text: string;
  lines: string[];
}

const cache = new Map<number, FetchedFile>();

async function fetchGutenberg(id: number): Promise<FetchedFile> {
  const cached = cache.get(id);
  if (cached) return cached;
  const url = PG(id);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`PG#${id} fetch failed: ${res.status}`);
  }
  const text = await res.text();
  if (text.includes("404 | Project Gutenberg")) {
    throw new Error(`PG#${id} returned 404 page`);
  }
  const file: FetchedFile = { id, text, lines: text.split("\n") };
  cache.set(id, file);
  return file;
}

function extractExcerpt(file: FetchedFile, anchor: string, lines: number): string {
  const re = new RegExp(anchor);
  let start = -1;
  for (let i = 0; i < file.lines.length; i++) {
    if (re.test(file.lines[i])) {
      start = i;
      break;
    }
  }
  if (start < 0) {
    throw new Error(`anchor /${anchor}/ not found in PG#${file.id}`);
  }
  const captured: string[] = [];
  let collected = 0;
  for (let i = start; i < file.lines.length && collected < lines; i++) {
    const ln = file.lines[i].trim();
    if (ln.length === 0) {
      if (collected > 0) break;
      continue;
    }
    captured.push(ln);
    collected++;
  }
  return captured.join(" ").replace(/\s+/g, " ").trim();
}

interface OutputTranslation {
  id: string;
  workId: string;
  language: string;
  languageCode: string;
  translator: string | null;
  year: number;
  era: string;
  register: string;
  source: "gutenberg";
  gutenbergTextId: string;
  sourceUrl: string;
  previewText: string;
}

interface OutputWork {
  id: string;
  title: string;
  author: string;
  sourceLanguage: string;
  originalYear: number;
  description: string;
  tags: string[];
  translations: OutputTranslation[];
}

async function main() {
  const works: OutputWork[] = [];
  const failures: string[] = [];

  for (const work of MANIFEST) {
    const outTrans: OutputTranslation[] = [];
    for (const t of work.translations) {
      try {
        const file = await fetchGutenberg(t.gutenbergId);
        const previewText = extractExcerpt(file, t.anchor, t.lines);
        if (previewText.length < 30) {
          throw new Error(`excerpt too short (${previewText.length} chars)`);
        }
        outTrans.push({
          id: t.id,
          workId: work.id,
          language: t.language,
          languageCode: t.languageCode,
          translator: t.translator,
          year: t.year,
          era: t.era,
          register: t.register,
          source: "gutenberg",
          gutenbergTextId: String(t.gutenbergId),
          sourceUrl: PG(t.gutenbergId),
          previewText,
        });
        console.log(`  ✓ ${t.id}  (${previewText.length} chars)`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`  ✗ ${t.id}: ${msg}`);
        failures.push(`${t.id}: ${msg}`);
      }
    }
    if (outTrans.length > 0) {
      works.push({
        id: work.id,
        title: work.title,
        author: work.author,
        sourceLanguage: work.sourceLanguage,
        originalYear: work.originalYear,
        description: work.description,
        tags: work.tags,
        translations: outTrans,
      });
    }
  }

  const out = { works };
  const outPath = join(DATA_DIR, "works-catalog.json");
  writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n");

  const totalT = works.reduce((s, w) => s + w.translations.length, 0);
  console.log(`\nWrote ${works.length} works, ${totalT} translations to ${outPath}`);
  if (failures.length > 0) {
    console.log(`\n${failures.length} failures:`);
    for (const f of failures) console.log(`  - ${f}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
