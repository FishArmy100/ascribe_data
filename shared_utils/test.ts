import { group } from "console"
import { OsisBook, range } from "."

type BookInfo = {
    aliases?: string[],
    osis: OsisBook
}

const BOOK_ARRAY: { [name: string]: BookInfo } = {
    "Genesis": { osis: "Gen", aliases: [ "Gns" ] },
    "Exodus": { osis: "Exod" },
    "Leviticus": { osis: "Lev" },
    "Numbers": { osis: "Num" },
    "Deuteronomy": { osis: "Deut", aliases: [ "Dt", ] },
    "Joshua": { osis: "Josh" },
    "Judges": { osis: "Judg", aliases: [ "Jdg", "Jdgs" ] },
    "Ruth": { osis: "Ruth" },
    "1 Samuel": { osis: "1Sam" },
    "2 Samuel": { osis: "2Sam" },
    "1 Kings": { osis: "1Kgs", aliases: [ "Kng", "Kngs", "Kg" ] },
    "2 Kings": { osis: "2Kgs", aliases: [ "Kng", "Kngs", "Kg" ] },
    "1 Chronicles": { osis: "1Chr" },
    "2 Chronicles": { osis: "2Chr" },
    "Ezra": { osis: "Ezra" },
    "Nehemiah": { osis: "Neh" },
    "Esther": { osis: "Esth" },
    "Job": { osis: "Job" },
    "Psalms": { osis: "Ps" },
    "Proverbs": { osis: "Prov" },
    "Ecclesiastes": { osis: "Eccl" },
    "Song of Solomon": { osis: "Song", aliases: [ "sos", "ss" ] },
    "Isaiah": { osis: "Isa" },
    "Jeremiah": { osis: "Jer" },
    "Lamentations": { osis: "Lam" },
    "Ezekiel": { osis: "Ezek" },
    "Daniel": { osis: "Dan" },
    "Hosea": { osis: "Hos" },
    "Joel": { osis: "Joel" },
    "Amos": { osis: "Amos" },
    "Obadiah": { osis: "Obad", aliases: [ "Obd" ] },
    "Jonah": { osis: "Jonah" },
    "Micah": { osis: "Mic" },
    "Nahum": { osis: "Nah" },
    "Habakkuk": { osis: "Hab" },
    "Zephaniah": { osis: "Zeph" },
    "Haggai": { osis: "Hag" },
    "Zechariah": { osis: "Zech" },
    "Malachi": { osis: "Mal" },
    "Matthew": { osis: "Matt" },
    "Mark": { osis: "Mark" },
    "Luke": { osis: "Luke" },
    "John": { osis: "John", aliases: [ "Jn" ] },
    "Acts": { osis: "Acts" },
    "Romans": { osis: "Rom" },
    "1 Corinthians": { osis: "1Cor" },
    "2 Corinthians": { osis: "2Cor" },
    "Galatians": { osis: "Gal" },
    "Ephesians": { osis: "Eph" },
    "Philippians": { osis: "Phil" },
    "Colossians": { osis: "Col" },
    "1 Thessalonians": { osis: "1Thess" },
    "2 Thessalonians": { osis: "2Thess" },
    "1 Timothy": { osis: "1Tim" },
    "2 Timothy": { osis: "2Tim" },
    "Titus": { osis: "Titus" },
    "Philemon": { osis: "Phil", aliases: [ "Phlm" ] },
    "Hebrews": { osis: "Heb" },
    "James": { osis: "Jas" },
    "1 Peter": { osis: "1Pet" },
    "2 Peter": { osis: "2Pet" },
    "1 John": { osis: "1John", aliases: [ "Jn" ] },
    "2 John": { osis: "2John", aliases: [ "Jn" ] },
    "3 John": { osis: "3John", aliases: [ "Jn" ] },
    "Jude": { osis: "Jude" },
    "Revelation": { osis: "Rev", aliases: [ "Rvs" ] },
}

export type FoundVerse = {
    raw: string,
    ref_id: string,
    text_start: number,
    text_end: number,

    book: OsisBook,
    chapter_start: number,
    chapter_end?: number,
    verse_start?: number,
    verse_end?: number,
}

/*
  New strategy:
   1) Find book-name occurrences with a deterministic book-name regex.
   2) For each book occurrence, take the substring until the next book occurrence (or end of text).
   3) Split that substring on semicolons (chapter breaks) while preserving offsets.
   4) In each semicolon-part, find chapter:verse tokens and trailing comma-separated verse tokens,
      also support simple ranges like 13-15.
   5) Emit FoundVerse entries with exact positions relative to the original text.
*/

export function find_verses(text: string): FoundVerse[] {
    const results: FoundVerse[] = [];

    // Step A: build a book-name regex that will capture the literal matched substring
    const bookNameRegex = RegExp(`\\b(${build_all_book_regex_str()})\\b`, "g");

    // Gather all book matches with positions
    interface BookMatch { bookText: string, index: number, length: number }
    const bookMatches: BookMatch[] = [];
    let m: RegExpExecArray | null;
    while ((m = bookNameRegex.exec(text)) !== null) {
        // m[1] is the captured (matched) text (as it appears in the text).
        bookMatches.push({ bookText: m[1], index: m.index, length: m[0].length });
        // continue searching from the end of this match
    }

    // If no book matches, return empty
    if (bookMatches.length === 0) return results;

    // For each book match, define a block end = next book match index (or end of text)
    for (let i = 0; i < bookMatches.length; i++) {
        const bm = bookMatches[i];
        const next = (i + 1 < bookMatches.length) ? bookMatches[i + 1].index : text.length;
        const blockStart = bm.index;
        const blockEnd = next; // exclusive
        const blockText = text.substring(blockStart, blockEnd);

        // Parse the block for semicolon-separated parts, preserving offsets relative to blockStart
        const parts: { raw: string, offset: number }[] = [];
        let partStart = 0;
        for (let j = 0; j < blockText.length; j++) {
            if (blockText[j] === ";") {
                parts.push({ raw: blockText.substring(partStart, j), offset: partStart });
                partStart = j + 1;
            }
        }
        parts.push({ raw: blockText.substring(partStart), offset: partStart });

        // We'll maintain inherited chapter across parts if not present explicitly
        let inheritedBookText = bm.bookText; // as in original string (e.g., "Rev." or "Rev")
        let inheritedChapter: string | null = null;

        // For robust mapping to OSIS, attempt to map inheritedBookText; if fails, attempt trimming punctuation
        let osisBook = map_book(inheritedBookText);
        if (!osisBook) {
            const cleaned = inheritedBookText.replace(/\.+$/,"").trim();
            osisBook = map_book(cleaned);
            if (osisBook) inheritedBookText = cleaned;
        }

        for (const part of parts) {
            const raw = part.raw;
            const rawTrimLeading = raw.replace(/^\s+/, "");
            const leadingTrimCount = raw.length - rawTrimLeading.length;
            const offsetInBlock = part.offset + leadingTrimCount;

            // Try find first explicit "chapter:verse" within this part
            // Accept verse tokens like "12", "12-14"
            const chapVerseRegex = /(\d+)\s*:\s*(\d+(?:-\d+)?)/;
            const mCV = chapVerseRegex.exec(rawTrimLeading);
            if (mCV && mCV.index !== undefined) {
                // found explicit chapter:verse
                const chapter = mCV[1];
                inheritedChapter = chapter;
                const vToken = mCV[2]; // could be "11" or "12-14"
                const localIndex = rawTrimLeading.indexOf(mCV[0]); // index in trimmed raw
                const absoluteStart = blockStart + offsetInBlock + localIndex;
                const absoluteEnd = absoluteStart + mCV[0].length - 1;
                // Build reference string as seen by parse_reference: "<Book> <chapter>:<verseToken>"
                const refText = `${inheritedBookText} ${chapter}:${vToken}`;
                const parsed = parse_reference(refText, absoluteStart, absoluteEnd);
                if (parsed) results.push(parsed);

                // Now find any following verse tokens in the remainder of this part (comma-separated)
                const remainder = rawTrimLeading.substring(localIndex + mCV[0].length);
                const verseTokenRegex = /(\d+(?:-\d+)?)/g;
                let vm: RegExpExecArray | null;
                while ((vm = verseTokenRegex.exec(remainder)) !== null) {
                    const token = vm[1];
                    const relIndex = localIndex + mCV[0].length + vm.index;
                    const absS = blockStart + offsetInBlock + relIndex;
                    const absE = absS + token.length - 1;
                    const refText2 = `${inheritedBookText} ${chapter}:${token}`;
                    const parsed2 = parse_reference(refText2, absS, absE);
                    if (parsed2) results.push(parsed2);
                }

                continue;
            }

            // If no explicit chapter:verse found, try "chapter" at start (e.g., "21" meaning chapter 21)
            const chapOnlyRegex = /^\s*(\d+)\b/;
            const mC = chapOnlyRegex.exec(raw);
            if (mC && mC.index !== undefined) {
                inheritedChapter = mC[1];
                // After chapter-only token, look for immediate verse tokens in same substring
                const after = raw.substring(mC.index + mC[0].length);
                const verseTokenRegex = /(\d+(?:-\d+)?)/g;
                let vm: RegExpExecArray | null;
                while ((vm = verseTokenRegex.exec(after)) !== null) {
                    const token = vm[1];
                    const relIndex = mC.index + mC[0].length + vm.index;
                    const absS = blockStart + part.offset + relIndex;
                    const absE = absS + token.length - 1;
                    const refText2 = `${inheritedBookText} ${inheritedChapter}:${token}`;
                    const parsed2 = parse_reference(refText2, absS, absE);
                    if (parsed2) results.push(parsed2);
                }
                continue;
            }

            // Otherwise the part likely contains only comma-separated verse tokens that inherit book+chapter
            if (inheritedChapter) {
                // find verse tokens and their positions in raw
                const verseTokenRegex = /(\d+(?:-\d+)?)/g;
                let vm: RegExpExecArray | null;
                while ((vm = verseTokenRegex.exec(raw)) !== null) {
                    const token = vm[1];
                    const relIndex = vm.index;
                    const absS = blockStart + part.offset + relIndex;
                    const absE = absS + token.length - 1;
                    const refText2 = `${inheritedBookText} ${inheritedChapter}:${token}`;
                    const parsed2 = parse_reference(refText2, absS, absE);
                    if (parsed2) results.push(parsed2);
                }
            }

            // If none matched, continue — could be text between punctuation, ignore
        }
    }

    return results;
}

/* ----------------------
   Helper parsing / regex from original file (kept and slightly adapted)
   ---------------------- */

const CHAPTER_REGEX_STR         = `\\b(${build_all_book_regex_str()})\\s+(\\d+)(?=\\s|$|[^\\d:.,])`;
const CHAPTER_OSIS_REGEX_STR    = `\\b(${build_all_book_regex_str()}).(\\d+)\\b`;
const CHAPTER_RANGE_REGEX_STR   = `\\b(${build_all_book_regex_str()})\\s+(\\d+)\\s*-\\s*(\\d+)\\b`;
const VERSE_REGEX_STR           = `\\b(${build_all_book_regex_str()})\\s+(\\d+)\\s*:?\\s*(\\d+)(?=\\s|$|[^\\d])`;
const VERSE_OSIS_REGEX_STR      = `\\b(${build_all_book_regex_str()})\\.(\\d+)\\.(\\d+)\\b`;
const VERSE_RANGE_REGEX_STR     = `\\b(${build_all_book_regex_str()})\\s+(\\d+)\\s*(:|\\s)\\s*(\\d+)\\s*-\\s*(\\d+)\\b`;
export const REFERENCE_REGEX = RegExp(`(${VERSE_RANGE_REGEX_STR}|${VERSE_OSIS_REGEX_STR}|${VERSE_REGEX_STR}|${CHAPTER_RANGE_REGEX_STR}|${CHAPTER_OSIS_REGEX_STR}|${CHAPTER_REGEX_STR})`, "g");

export function find_all_references(text: string): [number, number][] {
    // keep compatible behavior (find textual matches using REFERENCE_REGEX),
    // but return exact positions (all occurrences)
    const matches = text.match(REFERENCE_REGEX) ?? [];
    const unique = Array.from(new Set(matches));
    const results: [number, number][] = [];

    for (const u of unique) {
        let startSearch = 0;
        while (true) {
            const idx = text.indexOf(u, startSearch);
            if (idx === -1) break;
            results.push([idx, idx + u.length - 1]);
            startSearch = idx + u.length;
        }
    }

    return results;
}

export function parse_reference(reference: string, text_start: number, text_end: number): FoundVerse | null {
    function wrap(s: string): RegExp {
        return RegExp(`^${s}$`);
    }

    let match = reference.match(wrap(CHAPTER_REGEX_STR)) ||
                reference.match(wrap(CHAPTER_OSIS_REGEX_STR))
    if (match) {
        const book = map_book(match[1])!;
        const chapter = parseInt(match[2]);
        const ref_id = `${book}.${chapter}`;
        return {
            raw: reference,
            book,
            chapter_start: chapter,
            ref_id,
            text_start,
            text_end
        }
    }

    match = reference.match(wrap(CHAPTER_RANGE_REGEX_STR))
    if (match) {
        const book = map_book(match[1])!;
        const chapter_start = parseInt(match[2]);
        const chapter_end = parseInt(match[3]);
        const ref_id = `${book}.${chapter_start}-${book}.${chapter_end}`;
        return {
            book: book,
            raw: reference,
            chapter_start,
            chapter_end,
            ref_id,
            text_start,
            text_end,
        }
    }

    match = reference.match(wrap(VERSE_OSIS_REGEX_STR)) || 
            reference.match(wrap(VERSE_REGEX_STR))
    if (match) {
        const book = map_book(match[1])!;
        const chapter = parseInt(match[2]);
        const verse = parseInt(match[3]);
        const ref_id = `${book}.${chapter}.${verse}`;
        return {
            book,
            text_end,
            text_start,
            ref_id,
            chapter_start: chapter,
            verse_start: verse,
            raw: reference,
        }
    }

    match = reference.match(wrap(VERSE_RANGE_REGEX_STR));
    if (match)
    {
        const book = map_book(match[1])!;
        const chapter = parseInt(match[2])
        const verse_start = parseInt(match[4]);
        const verse_end = parseInt(match[5]);
        const ref_id = `${book}.${chapter}.${verse_start}-${book}.${chapter}.${verse_end}`

        return {
            book,
            text_end,
            text_start,
            raw: reference,
            verse_start,
            verse_end,
            chapter_start: chapter,
            ref_id
        }
    }

    // extra fallback for strings like "Rev. 1:11" or "Rev 1:11" created by extractor
    const artificial = reference.match(/^([A-Za-z.\s]+?)\s+(\d+):(\d+(?:-\d+)?)$/);
    if (artificial) {
        const book = map_book(artificial[1])!;
        const chap = parseInt(artificial[2]);
        const v = artificial[3];
        if (v.includes("-")) {
            const [v1, v2] = v.split("-").map(x => parseInt(x));
            return {
                raw: reference,
                book,
                chapter_start: chap,
                verse_start: v1,
                verse_end: v2,
                ref_id: `${book}.${chap}.${v1}-${book}.${chap}.${v2}`,
                text_start,
                text_end
            }
        } else {
            const vi = parseInt(v);
            return {
                raw: reference,
                book,
                chapter_start: chap,
                verse_start: vi,
                ref_id: `${book}.${chap}.${vi}`,
                text_start,
                text_end
            }
        }
    }

    return null;
}

function build_all_book_regex_str(): string {
    // build a case-insensitive-ish regex by using letter alternatives like original code
    // but ensure longer names come before shorter to avoid premature matches: sort by length desc
    const entries = Object.entries(BOOK_ARRAY)
        .sort((a,b) => b[0].length - a[0].length); // longer first

    return entries.map(([name, book]) => build_book_regex_str(name, book)).join("|");
}

function build_book_regex_str(name: string, book: BookInfo): string {
    const match = name.match(/(\d+\s+)?(.+)/)!;
    const prefix = match[1] ? parseInt(match[1]) : undefined;
    const book_name = match[2];

    const permutations = get_book_permutations(book_name)
        .concat(book.aliases ?? []);

    if (prefix) {
        let ordinal = "";
        if (prefix === 1) ordinal = "1st";
        if (prefix === 2) ordinal = "2nd";
        if (prefix === 3) ordinal = "3rd";

        return permutations.map(p => [
            prefix + " " + p,
            p + prefix,
            "I".repeat(prefix) + " " + p,
            ordinal + " " + p
        ])
        .flat()
        .map(text_to_regex)
        .join("|");
    }

    return permutations.map(text_to_regex).join("|");
}

function map_book(name: string): OsisBook | undefined {
    // name is the literal matched text (possibly with dots/periods/extra whitespace)
    // try it directly, then try cleaned versions
    const candidates = Object.entries(BOOK_ARRAY);
    for (const [book_name, book] of candidates) {
        const regex = RegExp(`^(${build_book_regex_str(book_name, book)})$`);
        if (regex.test(name)) return book.osis;
    }

    // try cleaning punctuation and whitespace
    const cleaned = name.replace(/\.+$/,"").trim();
    for (const [book_name, book] of candidates) {
        const regex = RegExp(`^(${build_book_regex_str(book_name, book)})$`);
        if (regex.test(cleaned)) return book.osis;
    }

    return undefined;
}

function get_book_permutations(name: string): string[] {
    const perms = [];
    for (let i = 1; i < name.length; i++) {
        perms.push(name.substring(0, i + 1));
    }
    return perms;
}

function text_to_regex(text: string): string {
    return range(0, text.length).map(i => letter_to_regex(text[i])).join("");
}

function letter_to_regex(letter: string): string {
    if (letter === " ") return "\\s*";
    return `[${letter.toLowerCase()}${letter.toUpperCase()}]`;
}

/* ============================================================
   TESTS
   Run test() manually to verify results
 ============================================================ */

function prettyPrintFound(f: FoundVerse) {
    return {
        raw: f.raw,
        ref_id: f.ref_id,
        start: f.text_start,
        end: f.text_end,
        book: f.book,
        chap: f.chapter_start,
        vs: f.verse_start,
        ve: f.verse_end
    };
}

function test() {
    const samples = [
        "Rev. 1:8, 11; 21:6; 22:13",
        "These letters occur in the text of Rev. 1:8, 11; 21:6; 22:13, and are represented",
        "John 3:16, 17, 18",
        "Matt 5:1; 6:2, 3; 7:4",
        "Genesis 1:1",
        "Isa 53:4-6",
        "Rev. 1:8,11",           // no spaces after comma
        "Rev. 1:8, 11, 12-14",  // combined range after comma
        "1 John 2:1, 2; 3:4",    // numbered book with inheritance
        "Acts 2:1; 3:2, 4-6; 4:1", // more complex
    ];

    for (const s of samples) {
        console.log("TEXT:", s);
        const found = find_verses(s).map(prettyPrintFound);
        console.log(JSON.stringify(found, null, 2));
        console.log("--------------------------------------------------");
    }
}

// Uncomment to run tests
test();
