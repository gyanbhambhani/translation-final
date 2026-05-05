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
  {
    id: "virgil-aeneid",
    title: "The Aeneid",
    author: "Virgil",
    sourceLanguage: "Latin",
    originalYear: -19,
    description:
      "Virgil's epic of Aeneas's flight from Troy. Three English translations across "
      + "two centuries, plus the Latin original.",
    tags: ["epic", "classical", "latin"],
    translations: [
      {
        id: "aeneid-la-source",
        language: "Latin",
        languageCode: "la",
        translator: null,
        year: -19,
        era: "original",
        register: "classical-latin-hexameter",
        gutenbergId: 227,
        anchor: "ARMA virumque cano, Troiae qui primus ab oris",
        lines: 6,
      },
      {
        id: "aeneid-en-dryden-1697",
        language: "English",
        languageCode: "en",
        translator: "John Dryden",
        year: 1697,
        era: "1600s",
        register: "restoration-heroic-couplet",
        gutenbergId: 228,
        anchor: "Arms, and the man I sing, who, forc",
        lines: 6,
      },
      {
        id: "aeneid-en-mackail-1885",
        language: "English",
        languageCode: "en",
        translator: "J. W. Mackail",
        year: 1885,
        era: "1880s",
        register: "victorian-rhythmic-prose",
        gutenbergId: 22456,
        anchor: "I sing of arms and the man who of old",
        lines: 5,
      },
    ],
  },
  {
    id: "dante-inferno",
    title: "Inferno (Divine Comedy I)",
    author: "Dante Alighieri",
    sourceLanguage: "Italian",
    originalYear: 1320,
    description:
      "Dante's descent into Hell. The famous \"midway upon the journey of our life\" "
      + "opening, in two English translations and the Italian original.",
    tags: ["epic", "italian", "medieval", "afterlife"],
    translations: [
      {
        id: "inferno-it-source",
        language: "Italian",
        languageCode: "it",
        translator: null,
        year: 1320,
        era: "original",
        register: "trecento-italian-terza-rima",
        gutenbergId: 997,
        anchor: "Nel mezzo del cammin di nostra vita",
        lines: 6,
      },
      {
        id: "inferno-en-cary-1814",
        language: "English",
        languageCode: "en",
        translator: "Henry Francis Cary",
        year: 1814,
        era: "1800s",
        register: "miltonic-blank-verse",
        gutenbergId: 1005,
        anchor: "In the midway of this our mortal life",
        lines: 7,
      },
      {
        id: "inferno-en-longfellow-1867",
        language: "English",
        languageCode: "en",
        translator: "Henry Wadsworth Longfellow",
        year: 1867,
        era: "1860s",
        register: "fireside-poet-blank-verse",
        gutenbergId: 1001,
        anchor: "Midway upon the journey of our life",
        lines: 6,
      },
    ],
  },
  {
    id: "cervantes-quixote",
    title: "Don Quixote, opening",
    author: "Miguel de Cervantes",
    sourceLanguage: "Spanish",
    originalYear: 1605,
    description:
      "The opening of Don Quixote (\"En un lugar de la Mancha…\") in the Spanish "
      + "original and two English renderings.",
    tags: ["novel", "spanish", "early-modern", "satire"],
    translations: [
      {
        id: "quixote-es-source",
        language: "Spanish",
        languageCode: "es",
        translator: null,
        year: 1605,
        era: "original",
        register: "early-modern-spanish",
        gutenbergId: 2000,
        anchor: "En un lugar de la Mancha, de cuyo nombre no quiero acordarme",
        lines: 5,
      },
      {
        id: "quixote-en-anonymous-1842",
        language: "English",
        languageCode: "en",
        translator: "Anonymous (revised from Motteux)",
        year: 1842,
        era: "1840s",
        register: "victorian-revised-prose",
        gutenbergId: 35993,
        anchor: "In a certain village in La Mancha, in the kingdom of Arragon",
        lines: 5,
      },
      {
        id: "quixote-en-ormsby-1885",
        language: "English",
        languageCode: "en",
        translator: "John Ormsby",
        year: 1885,
        era: "1880s",
        register: "late-victorian-plain-prose",
        gutenbergId: 5921,
        anchor: "In a village of La Mancha, the name of which I have no desire",
        lines: 5,
      },
    ],
  },
  {
    id: "goethe-faust-zueignung",
    title: "Faust — Zueignung (Dedication)",
    author: "Johann Wolfgang von Goethe",
    sourceLanguage: "German",
    originalYear: 1808,
    description:
      "The opening dedication of Faust Part I (\"Ihr naht euch wieder, schwankende "
      + "Gestalten\") in the German original and two English verse translations.",
    tags: ["drama", "german", "romantic", "verse"],
    translations: [
      {
        id: "faust-de-source",
        language: "German",
        languageCode: "de",
        translator: null,
        year: 1808,
        era: "original",
        register: "weimar-classicism",
        gutenbergId: 21000,
        anchor: "Ihr naht euch wieder, schwankende Gestalten",
        lines: 6,
      },
      {
        id: "faust-en-brooks-1856",
        language: "English",
        languageCode: "en",
        translator: "Charles Timothy Brooks",
        year: 1856,
        era: "1850s",
        register: "transcendentalist-verse",
        gutenbergId: 14460,
        anchor: "Once more ye waver dreamily before me",
        lines: 6,
      },
      {
        id: "faust-en-bayard-taylor-1870",
        language: "English",
        languageCode: "en",
        translator: "Bayard Taylor",
        year: 1870,
        era: "1870s",
        register: "metrical-faithful-verse",
        gutenbergId: 14591,
        anchor: "Again ye come, ye hovering Forms",
        lines: 6,
      },
    ],
  },
  {
    id: "khayyam-rubaiyat",
    title: "Rubáiyát of Omar Khayyám",
    author: "Omar Khayyám",
    sourceLanguage: "Persian",
    originalYear: 1100,
    description:
      "FitzGerald's two English versions of the same opening — first edition (1859) "
      + "and final fifth edition (1889) — show one translator drifting from himself "
      + "across thirty years.",
    tags: ["persian", "quatrains", "victorian", "wisdom"],
    translations: [
      {
        id: "rubaiyat-en-fitzgerald-1859",
        language: "English",
        languageCode: "en",
        translator: "Edward FitzGerald (1st edition)",
        year: 1859,
        era: "1860s",
        register: "victorian-orientalist-verse",
        gutenbergId: 246,
        anchor: "Awake! for Morning in the Bowl of Night",
        lines: 4,
      },
      {
        id: "rubaiyat-en-fitzgerald-1889",
        language: "English",
        languageCode: "en",
        translator: "Edward FitzGerald (5th edition)",
        year: 1889,
        era: "1880s",
        register: "late-victorian-revised-verse",
        gutenbergId: 246,
        anchor: "WAKE! For the Sun, who scatter'd into flight",
        lines: 4,
      },
    ],
  },
  {
    id: "marcus-aurelius-meditations",
    title: "Meditations, Book I",
    author: "Marcus Aurelius",
    sourceLanguage: "Koine Greek",
    originalYear: 175,
    description:
      "The opening of Marcus Aurelius's Stoic notebooks, in two English translations "
      + "from Project Gutenberg.",
    tags: ["philosophy", "stoic", "greek", "antiquity"],
    translations: [
      {
        id: "meditations-en-long-1862",
        language: "English",
        languageCode: "en",
        translator: "George Long",
        year: 1862,
        era: "1860s",
        register: "victorian-philosophical-prose",
        gutenbergId: 2680,
        anchor: "I\\. Of my grandfather Verus I have learned",
        lines: 6,
      },
      {
        id: "meditations-en-chrystal-1902",
        language: "English",
        languageCode: "en",
        translator: "George W. Chrystal",
        year: 1902,
        era: "1900s",
        register: "edwardian-philosophical-prose",
        gutenbergId: 55317,
        anchor: "I learned from my grandfather, Verus",
        lines: 6,
      },
    ],
  },
  {
    id: "kjv-psalm-23",
    title: "Psalm 23 (KJV)",
    author: "Anonymous (Hebrew Bible)",
    sourceLanguage: "Biblical Hebrew",
    originalYear: -500,
    description:
      "The Shepherd Psalm in the King James Version (1611), sourced from Project "
      + "Gutenberg. One of the most translated and quoted texts in the world.",
    tags: ["bible", "psalms", "hebrew", "wisdom", "lyric"],
    translations: [
      {
        id: "psalm23-en-kjv-1611",
        language: "English",
        languageCode: "en",
        translator: "King James translators",
        year: 1611,
        era: "1600s",
        register: "early-modern-liturgical",
        gutenbergId: 8019,
        anchor: "19:023:001 The LORD is my shepherd",
        lines: 14,
      },
    ],
  },
  {
    id: "beowulf-opening",
    title: "Beowulf, opening (\"Hwæt!\")",
    author: "Anonymous (Anglo-Saxon)",
    sourceLanguage: "Old English",
    originalYear: 1000,
    description:
      "The famous opening exclamation of Beowulf (\"Hwæt!\"), in two Victorian "
      + "modernizations: J. Lesslie Hall's alliterative verse and William Morris's "
      + "archaizing rendering.",
    tags: ["epic", "old-english", "medieval", "alliterative"],
    translations: [
      {
        id: "beowulf-en-hall-1892",
        language: "English",
        languageCode: "en",
        translator: "J. Lesslie Hall",
        year: 1892,
        era: "1880s",
        register: "victorian-alliterative-verse",
        gutenbergId: 16328,
        anchor: "Lo! the Spear-Danes",
        lines: 6,
      },
      {
        id: "beowulf-en-morris-1895",
        language: "English",
        languageCode: "en",
        translator: "William Morris & A.J. Wyatt",
        year: 1895,
        era: "1880s",
        register: "pre-raphaelite-archaizing",
        gutenbergId: 20431,
        anchor: "What! we of the Spear-Danes of yore days",
        lines: 6,
      },
    ],
  },
  {
    id: "confucius-analects",
    title: "Analects of Confucius, Book I",
    author: "Confucius (attr.)",
    sourceLanguage: "Classical Chinese",
    originalYear: -500,
    description:
      "James Legge's 1893 English translation of the Analects, sourced from Project "
      + "Gutenberg.",
    tags: ["philosophy", "chinese", "ethics", "wisdom"],
    translations: [
      {
        id: "analects-en-legge-1893",
        language: "English",
        languageCode: "en",
        translator: "James Legge",
        year: 1893,
        era: "1880s",
        register: "victorian-sinology",
        gutenbergId: 3330,
        anchor: "The Master said, 'Is it not pleasant to learn",
        lines: 5,
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
  const raw = await res.text();
  if (raw.includes("404 | Project Gutenberg")) {
    throw new Error(`PG#${id} returned 404 page`);
  }
  const text = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
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
  let blankRun = 0;
  for (let i = start; i < file.lines.length && collected < lines; i++) {
    const ln = file.lines[i].trim();
    if (ln.length === 0) {
      blankRun++;
      if (blankRun >= 2 && collected > 0) break;
      continue;
    }
    blankRun = 0;
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
