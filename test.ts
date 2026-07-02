#!/usr/bin/env -S npx tsx
/**
 * bible.ts — Command-line Bible lookup using the Free Use Bible API
 * (https://bible.helloao.org/api), which is free, keyless, and covers
 * 1000+ translations across hundreds of languages.
 *
 * Usage:
 *   tsx bible.ts <reference> [options]
 *
 * Examples:
 *   tsx bible.ts "Psalm 49"                     # chapter info (incl. Hebrew subtitle check)
 *   tsx bible.ts "Genesis 1:1"                   # a single verse
 *   tsx bible.ts "PSA 23:1" --bible WEB          # specific translation by id
 *   tsx bible.ts "Psalm 3" --lang spa            # first Spanish translation found
 *   tsx bible.ts --list-translations --lang heb  # see what's available in a language
 *   tsx bible.ts "Genesis 1:1" --json            # raw JSON output
 *
 * No API key needed. No dependencies beyond Node's built-ins.
 */

import process from "node:process";
import { parseArgs } from "node:util";

// Note: the API's own link fields (e.g. listOfBooksApiLink) already include
// the "/api" prefix, so the root here deliberately omits it.
const API_ROOT = "https://bible.helloao.org";


// ---------- Types (mirroring the API's documented shapes) ----------

interface TranslationSummary {
  id: string;
  name: string;
  englishName: string;
  shortName: string;
  language: string;
  languageName: string;
  languageEnglishName: string;
  textDirection: "ltr" | "rtl";
  numberOfBooks: number;
  totalNumberOfChapters: number;
  totalNumberOfVerses: number;
  listOfBooksApiLink: string;
}

interface AvailableTranslationsResponse {
  translations: TranslationSummary[];
}

interface BookSummary {
  id: string; // USFM-style code, e.g. "GEN", "PSA"
  name: string;
  commonName: string;
  title: string;
  order: number;
  numberOfChapters: number;
  totalNumberOfVerses: number;
  firstChapterApiLink: string;
  lastChapterApiLink: string;
}

interface BooksResponse {
  translation: TranslationSummary;
  books: BookSummary[];
}

type InlineNode =
  | string
  | { text: string; poem?: number; wordsOfJesus?: boolean } // FormattedText
  | { heading: string } // InlineHeading
  | { lineBreak: true } // InlineLineBreak
  | { noteId: number }; // VerseFootnoteReference

interface ChapterHeading {
  type: "heading";
  content: string[];
}
interface ChapterLineBreak {
  type: "line_break";
}
interface ChapterHebrewSubtitle {
  type: "hebrew_subtitle";
  content: InlineNode[];
}
interface ChapterVerse {
  type: "verse";
  number: number;
  content: InlineNode[];
}
type ChapterContent =
  | ChapterHeading
  | ChapterLineBreak
  | ChapterHebrewSubtitle
  | ChapterVerse;

interface ChapterFootnote {
  noteId: number;
  text: string;
  reference?: { chapter: number; verse: number };
}

interface ChapterResponse {
  translation: TranslationSummary;
  book: BookSummary;
  chapter: {
    number: number;
    content: ChapterContent[];
    footnotes: ChapterFootnote[];
  };
  numberOfVerses: number;
}

// ---------- Small helpers ----------

async function fetchJson<T>(path: string): Promise<T> {
  // Accepts either a full URL, an "/api/..." link straight from the API's
  // response bodies, or a bare path like "available_translations.json".
  let url: string;
  if (path.startsWith("http")) {
    url = path;
  } else if (path.startsWith("/")) {
    url = `${API_ROOT}${path}`;
  } else {
    url = `${API_ROOT}/api/${path}`;
  }
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Request failed (${res.status}) for ${url}`);
  }
  return (await res.json()) as T;
}

/** Flattens verse/subtitle inline content into plain readable text. */
function inlineToText(nodes: InlineNode[]): string {
  const parts: string[] = [];
  for (const node of nodes) {
    if (typeof node === "string") {
      parts.push(node);
    } else if ("text" in node) {
      parts.push(node.text);
    } else if ("heading" in node) {
      parts.push(`[${node.heading}]`);
    }
    // lineBreak and footnote-reference nodes contribute no text
  }
  return parts.join(" ").replace(/\s+([,.;:!?])/g, "$1").trim();
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Handles a few common alternate spellings that don't exactly match API names. */
const BOOK_ALIASES: Record<string, string> = {
  psalm: "psalms",
  song: "songofsolomon",
  songofsongs: "songofsolomon",
  canticles: "songofsolomon",
  revelations: "revelation",
  apocalypse: "revelation",
};

function resolveBook(query: string, books: BookSummary[]): BookSummary {
  const key = normalize(query);
  const aliased = BOOK_ALIASES[key] ?? key;

  const candidates = books.map((b) => ({
    book: b,
    keys: [b.id, b.name, b.commonName, b.title].map(normalize),
  }));

  // Exact match against id/name/commonName/title first
  for (const { book, keys } of candidates) {
    if (keys.includes(key) || keys.includes(aliased)) return book;
  }

  // Fall back to "starts with" (e.g. "Rev" -> "Revelation")
  for (const { book, keys } of candidates) {
    if (keys.some((k) => k.startsWith(key) || k.startsWith(aliased))) {
      return book;
    }
  }

  throw new Error(
    `Could not find a book matching "${query}". Try a full name (e.g. "Psalms") or USFM code (e.g. "PSA").`,
  );
}

/** Parses references like "Genesis 1:1", "1 Samuel 2", "PSA 49:3". */
function parseReference(
  ref: string,
): { book: string; chapter: number; verse: number | null } {
  const match = ref.trim().match(/^(.+?)\s+(\d+)(?::(\d+))?$/);
  if (!match) {
    throw new Error(
      `Could not parse reference "${ref}". Expected something like "Genesis 1:1" or "Psalm 49".`,
    );
  }
  const [, book, chapterStr, verseStr] = match;
  return {
    book: book.trim(),
    chapter: parseInt(chapterStr, 10),
    verse: verseStr ? parseInt(verseStr, 10) : null,
  };
}

async function resolveTranslation(opts: {
  bible?: string;
  lang?: string;
}): Promise<TranslationSummary> {
  const { translations } = await fetchJson<AvailableTranslationsResponse>(
    "/api/available_translations.json",
  );

  if (opts.bible) {
    const byId = translations.find(
      (t) => t.id.toLowerCase() === opts.bible!.toLowerCase(),
    );
    if (byId) return byId;
    throw new Error(
      `No translation found with id "${opts.bible}". Use --list-translations to browse.`,
    );
  }

  if (opts.lang) {
    const langKey = opts.lang.toLowerCase();
    const matches = translations.filter(
      (t) =>
        t.language.toLowerCase() === langKey ||
        normalize(t.languageEnglishName) === normalize(opts.lang!) ||
        normalize(t.languageName) === normalize(opts.lang!),
    );
    if (matches.length === 0) {
      throw new Error(
        `No translations found for language "${opts.lang}". Use --list-translations to browse.`,
      );
    }
    // Prefer a well-known translation id if present, else just take the first.
    const preferred = matches.find((t) =>
      ["BSB", "WEB", "ENGWEBP"].includes(t.id),
    );
    return preferred ?? matches[0];
  }

  // Default: Berean Standard Bible (English, public domain, modern)
  const bsb = translations.find((t) => t.id === "BSB");
  if (bsb) return bsb;
  return translations[0];
}

async function listTranslations(lang?: string) {
  const { translations } = await fetchJson<AvailableTranslationsResponse>(
    "/api/available_translations.json",
  );
  const filtered = lang
    ? translations.filter(
        (t) =>
          t.language.toLowerCase() === lang.toLowerCase() ||
          normalize(t.languageEnglishName) === normalize(lang),
      )
    : translations;

  if (filtered.length === 0) {
    console.log(`No translations found${lang ? ` for language "${lang}"` : ""}.`);
    return;
  }

  console.log(
    `${filtered.length} translation(s)${lang ? ` for "${lang}"` : ""}:\n`,
  );
  for (const t of filtered) {
    console.log(
      `  ${t.id.padEnd(10)} ${t.englishName} (${t.languageEnglishName}, ${t.textDirection})`,
    );
  }
}

// ---------- Output formatting ----------

function printChapterInfo(data: ChapterResponse) {
  const { translation, book, chapter, numberOfVerses } = data;

  const hebrewSubtitleNode = chapter.content.find(
    (c): c is ChapterHebrewSubtitle => c.type === "hebrew_subtitle",
  );
  const headings = chapter.content.filter(
    (c): c is ChapterHeading => c.type === "heading",
  );

  console.log(`${book.commonName} ${chapter.number}  (${translation.englishName} — ${translation.id})`);
  console.log("-".repeat(60));
  console.log(`Verses:               ${numberOfVerses}`);
  console.log(`Has Hebrew subtitle:  ${hebrewSubtitleNode ? "Yes" : "No"}`);
  if (hebrewSubtitleNode) {
    console.log(`  → "${inlineToText(hebrewSubtitleNode.content)}"`);
  }
  console.log(`Headings:             ${headings.length}`);
  for (const h of headings) {
    console.log(`  → ${h.content.join(" ")}`);
  }
  console.log(`Footnotes:            ${chapter.footnotes.length}`);
}

function printVerseInfo(data: ChapterResponse, verseNumber: number) {
  const { translation, book, chapter } = data;
  const verseNode = chapter.content.find(
    (c): c is ChapterVerse => c.type === "verse" && c.number === verseNumber,
  );

  if (!verseNode) {
    throw new Error(
      `Verse ${verseNumber} not found in ${book.commonName} ${chapter.number} (${translation.id}).`,
    );
  }

  console.log(`${book.commonName} ${chapter.number}:${verseNumber}  (${translation.englishName} — ${translation.id})`);
  console.log("-".repeat(60));
  console.log(inlineToText(verseNode.content));
}

// ---------- Main ----------

async function main() {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    allowPositionals: true,
    options: {
      bible: { type: "string", short: "b" },
      lang: { type: "string", short: "l" },
      verse: { type: "string", short: "v" },
      json: { type: "boolean", default: false },
      "list-translations": { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
  });

  if (values.help || (positionals.length === 0 && !values["list-translations"])) {
    console.log(`
Bible chapter/verse lookup (Free Use Bible API)

Usage:
  tsx bible.ts <reference> [options]

Arguments:
  <reference>            e.g. "Genesis 1:1", "Psalm 49", "PSA 23:1"

Options:
  -b, --bible <id>       Translation id, e.g. BSB, WEB (default: BSB, or first match for --lang)
  -l, --lang <code>      Language code or name, e.g. eng, hbo, "Spanish"
  -v, --verse <n>        Verse number (alternative to "book chapter:verse" syntax)
  --json                 Print raw JSON instead of formatted text
  --list-translations    List available translations (optionally filtered by --lang)
  -h, --help             Show this help

Examples:
  tsx bible.ts "Psalm 49"
  tsx bible.ts "Genesis 1:1" --bible WEB
  tsx bible.ts "Psalm 3" --lang spa
  tsx bible.ts --list-translations --lang heb
`);
    return;
  }

  if (values["list-translations"]) {
    await listTranslations(values.lang);
    return;
  }

  const refString = positionals.join(" ");
  const { book: bookQuery, chapter, verse: verseFromRef } = parseReference(refString);
  const verse = verseFromRef ?? (values.verse ? parseInt(values.verse, 10) : null);

  const translation = await resolveTranslation({
    bible: values.bible,
    lang: values.lang,
  });

  const { books } = await fetchJson<BooksResponse>(translation.listOfBooksApiLink);
  const book = resolveBook(bookQuery, books);

  if (chapter < 1 || chapter > book.numberOfChapters) {
    throw new Error(
      `${book.commonName} only has ${book.numberOfChapters} chapter(s); chapter ${chapter} is out of range.`,
    );
  }

  const chapterData = await fetchJson<ChapterResponse>(
    `/api/${translation.id}/${book.id}/${chapter}.json`,
  );

  if (values.json) {
    console.log(JSON.stringify(chapterData, null, 2));
    return;
  }

  if (verse !== null) {
    printVerseInfo(chapterData, verse);
  } else {
    printChapterInfo(chapterData);
  }
}

main().catch((err) => {
  console.error(`Error: ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});