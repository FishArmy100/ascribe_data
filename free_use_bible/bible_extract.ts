import * as bible from "./interop";
import minimist from "minimist";
import fs from "fs-extra";
import { OsisBook, range } from "./utils";
import * as toml from "@iarna/toml";

type WordJson = {
    red?: boolean,
    italics?: boolean,
    begin_punc?: string,
    end_punc?: string,
    text: string,
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
    name?: string,
    lang?: string,
    op?: string,
}

async function run()
{
    const args = minimist<Args>(process.argv.slice(2));
    
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
    let id = 0;

    return Promise.all(books.books.filter(b => !b.isApocryphal).map(async b => {
        const book_verses = Promise.all(range(1, b.numberOfChapters + 1).map(async c => {
            const chapter = await bible.fetch_chapter_in_translation(translation, b.id, c);
            return chapter.chapter.content
                .filter(c => c.type === "verse")
                .map(c => {
                    const book_name = bible.get_osis(b.id as bible.BibleBook);
                    const chapter_number = chapter.chapter.number;
                    return convert_verse(book_name, chapter_number, c, id++);
                });
        }));
        console.log(`Completed book ${b.name}`);
        return book_verses;
    })).then(p => p.flatMap(x => x).flatMap(x => x))
}

async function convert_config(translation: bible.Translation): Promise<BibleConfig>
{
    const books = await bible.fetch_books_in_translation(translation.id);
    return {
        name: translation.name,
        books: Object.fromEntries(books.books.map(b => [bible.get_osis(b.id as bible.BibleBook), b.name]))
    }
}

function convert_verse(book: string, chapter: number, verse: bible.ChapterVerse, id: number): VerseJson
{
    const words = verse.content.filter(c => typeof c === "string" || (c as any).text !== undefined).map(v => {
        const text = typeof v === "string" ? 
            v : 
            (v as any).text as string;
        
        const red = (v as any).wordsOfJesus;

        const words = text.split(/\s/).map((w): WordJson => {
            const [begin_punc, word, end_punc] = split_punctuated_word(w);
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
    const match = text.match(/^(\W*)(\w+)(\W*)$/);
    
    let beginPunc: string | null;
    let word: string;
    let endPunc: string | null;

    if (match) {
        beginPunc = match[1] || null;
        word = match[2];
        endPunc = match[3] || null;
    } else {
        // If the text doesn't contain any word characters
        beginPunc = null;
        word = text;
        endPunc = null;
    }

    return [beginPunc, word, endPunc];
}


run()