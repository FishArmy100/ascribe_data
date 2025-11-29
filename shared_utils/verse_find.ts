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

export function find_verses(text: string): FoundVerse[]
{
    return find_all_references(text).map(([start, end]) => {
        const ref_text = text.substring(start, end + 1);
        return parse_reference(ref_text, start, end);
    }).filter(x => x !== null);
}

const CHAPTER_REGEX_STR         = `\\b(${build_all_book_regex_str()})\\.?\\s+(\\d+)(?=\\s|$|[^\\d:.,])`;
const CHAPTER_OSIS_REGEX_STR    = `\\b(${build_all_book_regex_str()}).(\\d+)\\b`;
const CHAPTER_RANGE_REGEX_STR   = `\\b(${build_all_book_regex_str()})\\.?\\s+(\\d+)\\s*-\\s*(\\d+)\\b`;
const VERSE_REGEX_STR           = `\\b(${build_all_book_regex_str()})\\.?\\s+(\\d+)\\s*:?\\s*(\\d+)(?=\\s|$|[^\\d])`;
const VERSE_OSIS_REGEX_STR      = `\\b(${build_all_book_regex_str()})\\.(\\d+)\\.(\\d+)\\b`;
const VERSE_RANGE_REGEX_STR     = `\\b(${build_all_book_regex_str()})\\.?\\s+(\\d+)\\s*(:|\\s)\\s*(\\d+)\\s*-\\s*(\\d+)\\b`;
export const REFERENCE_REGEX = RegExp(`(${VERSE_RANGE_REGEX_STR}|${VERSE_OSIS_REGEX_STR}|${VERSE_REGEX_STR}|${CHAPTER_RANGE_REGEX_STR}|${CHAPTER_OSIS_REGEX_STR}|${CHAPTER_REGEX_STR})`, "g");


export function find_all_references(text: string): [number, number][]
{
    const all_references = new Set(text.match(REFERENCE_REGEX) ?? [])
    return Array.from(all_references).map(v => {
        const start = text.indexOf(v);
        const end = start + v.length - 1;
        return [start, end]
    });
}

export function parse_reference(reference: string, text_start: number, text_end: number): FoundVerse | null
{
    function wrap(s: string): RegExp 
    {
        return RegExp(`^${s}$`);
    }

    let match = reference.match(wrap(CHAPTER_REGEX_STR)) || 
                reference.match(wrap(CHAPTER_OSIS_REGEX_STR))
    if (match)
    {
        const book = map_book(match[1])!;
        const chapter = parseInt(match[2]);
        const ref_id = `${book}.${chapter}`;
        return {
            raw: reference,
            book,
            chapter_start: chapter,
            ref_id,
            text_start,
            text_end,
        }
    }

    match = reference.match(wrap(CHAPTER_RANGE_REGEX_STR))
    if (match)
    {
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
    if (match)
    {
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

    return null;
}

function build_all_book_regex_str(): string
{
    let all_books = Object.entries(BOOK_ARRAY).map(([name, book]) => {
        return build_book_regex_str(name, book);
    }).join("|");
    
    return all_books;
}

function build_book_regex_str(name: string, book: BookInfo): string
{
    const match = name.match(/(\d+\s+)?(.+)/)!
    const prefix = match[1] ? parseInt(match[1]) : undefined
    const book_name = match[2]

    const permutations = get_book_permutations(book_name)
        .concat(book.aliases ?? [])

    if (prefix) 
    {
        let ordinal = ""
        if (prefix === 1) 
        {
            ordinal = "1st"
        }
        else if (prefix === 2) 
        {
            ordinal = "2nd"
        }
        else if (prefix === 3) 
        {
            ordinal = "3rd"
        }

        return permutations.map(p => [
                prefix + " " + p,
                p + prefix,
                "I".repeat(prefix) + " " + p,
                ordinal + " " + p
            ])
            .flatMap(x => x)
            .map(text_to_regex)
            .join("|")
    }

    return permutations
            .map(text_to_regex)
            .join("|")
}

function map_book(name: string): OsisBook | undefined
{
    return Object.entries(BOOK_ARRAY).find(([book_name, book]) => {
        const regex = RegExp(`^(${build_book_regex_str(book_name, book)})$`);
        return name.match(regex) !== null;
    })?.[1].osis;
}

function get_book_permutations(name: string): string[]
{
    const perms = [];
    for(let i = 1; i < name.length; i++)
    {
        perms.push(name.substring(0, i + 1));
    }

    return perms;
}

function text_to_regex(text: string): string 
{
    return range(0, text.length).map(i => letter_to_regex(text[i])).join("") ;
}

function letter_to_regex(letter: string): string 
{
    if (letter === " ")
    {
        return "\\s*";
    }

    return `[${letter.toLowerCase()}${letter.toUpperCase()}]`;
}

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

function test() 
{
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

    for (const s of samples) 
    {
        console.log("TEXT:", s);
        const found = find_verses(s).map(prettyPrintFound);
        console.log(JSON.stringify(found, null, 2));
        console.log("--------------------------------------------------");
    }
}

test()