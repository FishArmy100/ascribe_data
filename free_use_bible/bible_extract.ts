import * as bible from "./interop";
import minimist from "minimist";
import fs from "fs-extra";
import { OsisBook, range } from "./utils";
import * as toml from "@iarna/toml";
import * as interop from "./interop";

type WordJson = {
    red?: boolean,
    italics?: boolean,
    begin_punc?: string,
    end_punc?: string,
    text: string,
    heb_sub?: boolean,
    poem?: boolean
}

type VerseJson = {
    id: number,
    verse_id: string,
    words: WordJson[]
}

type BibleConfig = {
    name: string,
    authors?: string[],
    language?: string,
    description?: string,
    data_source?: string,
    license?: string,
    books: { [i: string]: string },
}

type Args = {
    display?: boolean,
    langs?: boolean,
    name?: string,
    lang?: string,
    op?: string,
}

async function run()
{
    const args = minimist<Args>(process.argv.slice(2));

    if (args.langs)
    {
        const languages = [...new Set((await interop.fetch_available_translations()).map(t => t.language))];
        console.log("Languages");
        languages.forEach(l => {
            console.log(` - ${l}`)
        });
        return;
    }

    if (args.display)
    {
        const translations = (await interop.fetch_available_translations())
            .filter(t => args.lang ? args.lang === t.language : true);

        console.log("Translations:");
        translations.forEach(t => {
            console.log(` - ${t.name} (${t.shortName})`);
        });
        return;
    }
    
    if (!args.name)
    {
        console.error("[ERROR]: Bible extractor requires a name");
        return;
    }

    if (!args.op)
    {
        console.error("[ERROR]: Bible extractor needs an out path");
        return;
    }
    
    const translation = (await bible.fetch_available_translations())
        .filter(t => args.lang ? args.lang === t.language : true)
        .find(t => t.shortName === args.name)

    if (translation === undefined)
    {
        console.error(`[ERROR]: Unknown book ${args.name}`);
        return;
    }
    
    const converted_bible = await convert_bible(translation.id);
    const bible_src = converted_bible.map(v => JSON.stringify(v)).join("\n");
    const bible_path = `${args.op}/${args.name}.jsonl`;
    const p1 = fs.outputFile(bible_path, bible_src);

    const config = await convert_config(translation);
    const config_src = toml.stringify(JSON.parse(JSON.stringify(config)));
    const config_path = `${args.op}/${args.name}.toml`;
    const p2 = fs.outputFile(config_path, config_src);

    Promise.all([p1, p2]).then(_ => {
        console.log(`Done!:\n - SRC = ${bible_path}\n - CONFIG = ${config_path}`);
    })
}

async function convert_bible(translation: string): Promise<VerseJson[]>
{
    const books = await bible.fetch_books_in_translation(translation);

    const verses =  await Promise.all(books.books.filter(b => !b.isApocryphal).map(async b => {
        const book_verses = Promise.all(range(1, b.numberOfChapters + 1).map(async c => {
            const chapter = await bible.fetch_chapter_in_translation(translation, b.id, c);
            const verses = chapter.chapter.content
                .filter(c => c.type === "verse")
                .map(c => {
                    const book_name = bible.get_osis(b.id as bible.BibleBook);
                    const chapter_number = chapter.chapter.number;
                    return convert_verse(book_name, chapter_number, c, 0);
                });

            const subtitles = chapter.chapter.content.filter(c => c.type === "hebrew_subtitle");
            if (subtitles.length > 0)
            {
                const converted = convert_subtitle(subtitles[0])
                verses[0].words = [ ...converted, ...verses[0].words];
            }

            return verses;
        }));
        console.log(`Completed book ${b.name}`);
        return book_verses;
    })).then(p => p.flatMap(x => x).flatMap(x => x));

    const filled = fill_verse_gaps(verses);

    filled.forEach((v, i) => {
        v.id = i;
    })

    return filled;
}

async function convert_config(translation: bible.Translation): Promise<BibleConfig>
{
    const books = await bible.fetch_books_in_translation(translation.id);
    return {
        name: translation.name,
        license: translation.licenseUrl,
        language: translation.language,
        books: Object.fromEntries(books.books.map(b => [bible.get_osis(b.id as bible.BibleBook), b.name]))
    }
}

function convert_subtitle(subtitle: bible.ChapterHebrewSubtitle): WordJson[]
{
    const words = subtitle.content.filter(c => typeof c === "string" || (c as any).text !== undefined).map(v => {
        const text = typeof v === "string" ? 
            v : 
            (v as any).text as string;
        
        const red = (v as any).wordsOfJesus;

        const words = text.split(/\s/).map((w): WordJson => {
            const [begin_punc, word, end_punc] = split_punctuated_word(w.replaceAll("¶", ""));
            return {
                begin_punc: begin_punc ?? undefined,
                text: word,
                end_punc: end_punc ?? undefined,
                red,
                heb_sub: true,
                italics: undefined,
            }
        });
        
        return words;
    }).flatMap(ws => ws);

    return words;
}

function convert_verse(book: string, chapter: number, verse: bible.ChapterVerse, id: number): VerseJson
{
    const words = verse.content.filter(c => typeof c === "string" || (c as any).text !== undefined).map(v => {
        const text = typeof v === "string" ? 
            v : 
            (v as any).text as string;
        
        const red = (v as any).wordsOfJesus;

        const words = text.split(/\s/).map((w): WordJson => {
            const [begin_punc, word, end_punc] = split_punctuated_word(w.replaceAll("¶", ""));
            return {
                begin_punc: begin_punc ?? undefined,
                text: word,
                end_punc: end_punc ?? undefined,
                red,
                italics: undefined,
            }
        });
        
        return words;
    }).flatMap(ws => ws);

    const verse_id = `${book}.${chapter}.${verse.number}`
    return {
        words,
        verse_id,
        id,
    };
}

function split_punctuated_word(text: string): [string | null, string, string | null] {
    // Match beginning punctuation, word text, and ending punctuation
    const match = text.match(/^([^\p{L}\p{N}]*)((?:[\p{L}\p{N}]+))([^\p{L}\p{N}]*)$/u);
    
    let begin_punc: string | null;
    let word: string;
    let end_punc: string | null;

    if (match) 
    {
        begin_punc = match[1] || null;
        word = match[2];
        end_punc = match[3] || null;
    } 
    else 
    {
        // If the text doesn't contain any word characters
        begin_punc = null;
        word = text;
        end_punc = null;
    }

    return [begin_punc, word, end_punc];
}

function fill_verse_gaps(verses: VerseJson[]): VerseJson[]
{
    const result: VerseJson[] = [];

    for (let i = 0; i < verses.length; i++)
    {
        result.push(verses[i]);

        if (i + 1 >= verses.length) continue;

        const current = parse_verse_id(verses[i].verse_id);
        const next = parse_verse_id(verses[i + 1].verse_id);

        if (!current || !next) continue;

        // Only fill gaps within the same book and chapter
        if (current.book === next.book && current.chapter === next.chapter)
        {
            for (let v = current.verse + 1; v < next.verse; v++)
            {
                result.push({
                    id: 0, // will be reassigned
                    verse_id: `${current.book}.${current.chapter}.${v}`,
                    words: [],
                });
            }
        }
    }

    return result;
}

function parse_verse_id(verse_id: string): { book: string; chapter: number; verse: number } | null
{
    const parts = verse_id.split(".");
    if (parts.length !== 3) return null;

    const chapter = parseInt(parts[1], 10);
    const verse = parseInt(parts[2], 10);

    if (isNaN(chapter) || isNaN(verse)) return null;

    return { book: parts[0], chapter, verse };
}


run()