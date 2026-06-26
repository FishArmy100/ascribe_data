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
    "Philemon": { osis: "Phlm", aliases: [ "Phlm" ] },
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
    book_raw: string,
    chapter_start: number,
    chapter_end?: number,
    verse_start?: number,
    verse_end?: number,
}

export function replace_verses(text: string, replacer: (found: FoundVerse[]) => string): string 
{
    const verses = find_all_references(text).map(([start, _], _i, all_references) => {
        return parse_verses(text, start, all_references);
    });

    const ordered = verses.sort((a, b) => Math.max(...b.map(b => b.text_start)) - Math.max(...a.map(a => a.text_start)));
    let output = text;

    ordered.forEach(o => {
        const replacement = replacer(o);
        const start = Math.min(...o.map(o => o.text_start));
        const end = Math.max(...o.map(o => o.text_end));
        output = output.slice(0, start) + replacement + output.slice(end)
    });

    return output;
}

export function find_verses(text: string): FoundVerse[]
{
    return find_all_references(text).map(([start, _], _i, all_references) => {
        return parse_verses(text, start, all_references);
    }).flatMap(x => x);
}

const CHAPTER_REGEX_STR         = `\\b(${build_all_book_regex_str()})\\.?\\s+(\\d+)(?=\\s|$|[^\\d:.,])`;
const CHAPTER_OSIS_REGEX_STR    = `\\b(${build_all_book_regex_str()}).(\\d+)\\b`;
const CHAPTER_RANGE_REGEX_STR   = `\\b(${build_all_book_regex_str()})\\.?\\s+(\\d+)\\s*-\\s*(\\d+)\\b`;
const VERSE_REGEX_STR           = `\\b(${build_all_book_regex_str()})\\.?\\s+(\\d+)\\s*(?::|\s)\\s*(\\d+)(?=\\s|$|[^\\d])`;
const VERSE_OSIS_REGEX_STR      = `\\b(${build_all_book_regex_str()})\\.(\\d+)\\.(\\d+)\\b`;
const VERSE_RANGE_REGEX_STR     = `\\b(${build_all_book_regex_str()})\\.?\\s+(\\d+)\\s*(:|\\s)\\s*(\\d+)\\s*-\\s*(\\d+)\\b`;
const REFERENCE_REGEX = RegExp(`(${VERSE_RANGE_REGEX_STR}|${VERSE_OSIS_REGEX_STR}|${VERSE_REGEX_STR}|${CHAPTER_RANGE_REGEX_STR}|${CHAPTER_OSIS_REGEX_STR}|${CHAPTER_REGEX_STR})`, "g");

const make_comma_verse_regex = () => /,\s+(\d+)/y;
const make_comma_verse_range_regex = () => /,\s+(\d+)\s*-\s*(\d+)/y;
const make_chapter_verse_regex = () => /;\s+(\d+)\s*:\s*(\d+)/y;
const make_chapter_verse_range_regex = () => /;\s+(\d+)\s*:\s*(\d+)\s*-\s*(\d+)/y;

function find_all_references(text: string): [number, number][]
{
    return Array.from(text.matchAll(REFERENCE_REGEX)).map(v => {
        const start = v.index;
        const end = start + v[0].length;
        return [start, end]
    });
}

function parse_verses(full_text: string, text_start: number, all_references: [number, number][]): FoundVerse[]
{
    function wrap(s: string): RegExp 
    {
        return RegExp(`(?<=^.{${text_start}})${s}`, "g");
    }

    const verses = []

    let match = full_text.matchAll(wrap(VERSE_RANGE_REGEX_STR)).next().value;
    if (match && verses.length == 0)
    {
        const book = map_book(match[1])!;
        const chapter = parseInt(match[2])
        const verse_start = parseInt(match[4]);
        const verse_end = parseInt(match[5]);
        const ref_id = `${book}.${chapter}.${verse_start}-${book}.${chapter}.${verse_end}`
        const text_end = text_start + match[0].length

        verses.push({
            book,
            text_end,
            text_start,
            raw: full_text.substring(text_start, text_end),
            verse_start,
            verse_end,
            chapter_start: chapter,
            ref_id,
            book_raw: match[1]
        });
    }
    
    match = full_text.matchAll(wrap(VERSE_OSIS_REGEX_STR)).next().value || 
                full_text.matchAll(wrap(VERSE_REGEX_STR)).next().value
    if (match && verses.length == 0)
    {
        const book = map_book(match[1])!;
        const chapter = parseInt(match[2]);
        const verse = parseInt(match[3]);
        const ref_id = `${book}.${chapter}.${verse}`;
        const text_end = text_start + match[0].length

        verses.push({
            book,
            text_end,
            text_start,
            ref_id,
            chapter_start: chapter,
            verse_start: verse,
            raw: full_text.substring(text_start, text_end),
            book_raw: match[1]
        });
    }

    match = full_text.matchAll(wrap(CHAPTER_RANGE_REGEX_STR)).next().value
    if (match && verses.length == 0)
    {
        const book = map_book(match[1])!;
        const chapter_start = parseInt(match[2]);
        const chapter_end = parseInt(match[3]);
        const ref_id = `${book}.${chapter_start}-${book}.${chapter_end}`;
        const text_end = text_start + match[0].length

        verses.push({
            book: book,
            raw: full_text.substring(text_start, text_end),
            chapter_start,
            chapter_end,
            ref_id,
            text_start,
            text_end,
            book_raw: match[1]
        });
    }

    match = full_text.matchAll(wrap(CHAPTER_REGEX_STR)).next().value || 
            full_text.matchAll(wrap(CHAPTER_OSIS_REGEX_STR)).next().value

    if (match && verses.length == 0)
    {
        const book = map_book(match[1])!;
        const chapter = parseInt(match[2]);
        const ref_id = `${book}.${chapter}`;
        const text_end = text_start + match[0].length
        verses.push({
            raw: full_text.substring(text_start, text_end),
            book,
            chapter_start: chapter,
            ref_id,
            text_start,
            text_end,
            book_raw: match[1]
        })
    }

    if (verses.length > 0)
    {
        const comma_verse_regex = make_comma_verse_regex();
        const comma_verse_range_regex = make_comma_verse_range_regex();
        const chapter_verse_regex = make_chapter_verse_regex();
        const chapter_verse_range_regex = make_chapter_verse_range_regex();

        const regexes = [comma_verse_regex, comma_verse_range_regex, chapter_verse_regex, chapter_verse_range_regex];
        const set_indexes = (index: number) => regexes.forEach(r => r.lastIndex = index);

        let current_index = text_start + verses[0].raw.length;
        const book = verses[0].book;
        let current_chapter = verses[0].chapter_start
 
        while(true)
        {
            set_indexes(current_index);

            let match;
            if (match = comma_verse_range_regex.exec(full_text))
            {
                const new_current_index = current_index + match[0].length;
                if (all_references.find(([start, end]) => new_current_index >= start && new_current_index <= end))
                {
                    break;
                }

                const verse_start = parseInt(match[1]);
                const verse_end = parseInt(match[2]);
                const ref_id = `${book}.${current_chapter}.${verse_start}-${book}.${current_chapter}.${verse_end}`

                verses.push({
                    raw: match[0],
                    text_start: current_index,
                    text_end: current_index + match[0].length,
                    ref_id: ref_id,
                    book,
                    chapter_start: current_chapter,
                    verse_start,
                    verse_end,
                    book_raw: verses[0].book_raw,
                });
                current_index = new_current_index;
                continue;
            }


            if (match = comma_verse_regex.exec(full_text))
            {
                const new_current_index = current_index + match[0].length;
                if (all_references.find(([start, end]) => new_current_index >= start && new_current_index <= end))
                {
                    break;
                }

                const verse = parseInt(match[1]);
                const ref_id = `${book}.${current_chapter}.${verse}`;

                verses.push({
                    raw: match[0],
                    text_start: current_index,
                    text_end: current_index + match[0].length,
                    ref_id: ref_id,
                    book,
                    chapter_start: current_chapter,
                    verse_start: verse,
                    book_raw: verses[0].book_raw,
                });
                current_index = new_current_index;
                continue;
            }

            if (match = chapter_verse_range_regex.exec(full_text))
            {
                const new_current_index = current_index + match[0].length;
                if (all_references.find(([start, end]) => new_current_index >= start && new_current_index <= end))
                {
                    break;
                }

                current_chapter = parseInt(match[1]);
                const verse_start = parseInt(match[2]);
                const verse_end = parseInt(match[3]);
                const ref_id = `${book}.${current_chapter}.${verse_start}-${book}.${current_chapter}.${verse_end}`;
                verses.push({
                    raw: match[0],
                    text_start: current_index,
                    text_end: current_index + match[0].length,
                    chapter_start: current_chapter,
                    verse_start,
                    verse_end,
                    ref_id,
                    book,
                    book_raw: verses[0].book_raw,
                })

                current_index = new_current_index;
                continue;
            }

            if (match = chapter_verse_regex.exec(full_text))
            {
                const new_current_index = current_index + match[0].length;
                if (all_references.find(([start, end]) => new_current_index >= start && new_current_index <= end))
                {
                    break;
                }

                current_chapter = parseInt(match[1]);
                const verse = parseInt(match[2]);
                const ref_id = `${book}.${current_chapter}.${verse}`;
                verses.push({
                    raw: match[0],
                    text_start: current_index,
                    text_end: current_index + match[0].length,
                    chapter_start: current_chapter,
                    verse_start: verse,
                    ref_id,
                    book,
                    book_raw: verses[0].book_raw,
                })

                current_index = new_current_index;
                continue;
            }

            break;
        }
    }

    return verses;
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
        // "Rev. 1:8, 11; 21:6; 22:13",
        // "These letters occur in the text of Rev. 1:8, 11, 13-14; 21:6; 22:13-14, and are represented",
        // "John 3:16, 17, 18",
        // "Matt 5:1; 6:2, 3; 7:4",
        // "Genesis 1:1",
        // "Isa 53:4-6",
        // "Rev. 1:8,11",           // no spaces after comma
        // "Rev. 1:8, 11, 12-14",  // combined range after comma
        // "1 John 2:1, 2; 3:4",    // numbered book with inheritance
        // "Acts 2:1; 3:2, 4-6; 4:1", // more complex
        "1 Chr. 25:1, 2 Chr. 20:3",
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