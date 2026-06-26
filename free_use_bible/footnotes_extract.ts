import minimist from "minimist";
import * as interop from "./interop";
import { OsisBook, range } from "./utils";
import * as tp from "./process"
import fs from "fs-extra";
import toml from "@iarna/toml";

type CommentaryConfig = {
    name: string,
    description: string,
    bible: string,
    language: string,
    data_source: string,
    license: string,
}

type CommentaryEntry = {
    id: number,
    references: string[],
    comment: string,
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
        console.error("[ERROR]: Footnotes extractor requires a name");
        return;
    }

    if (!args.op)
    {
        console.error("[ERROR]: Footnotes extractor needs an out path");
        return;
    }
    
    const translation = (await interop.fetch_available_translations())
        .filter(t => args.lang ? args.lang === t.language : true)
        .find(t => t.shortName === args.name)

    if (translation === undefined)
    {
        console.error(`[ERROR]: Unknown book ${args.name}`);
        return;
    }

    const commentary = await convert_footnotes(translation);
    const commentary_src = commentary.map(v => JSON.stringify(v)).join("\n");
    const commentary_path = `${args.op}/${args.name.toLocaleLowerCase()}-footnotes.jsonl`;
    const p1 = fs.outputFile(commentary_path, commentary_src);

    const config = convert_config(translation);
    const config_src = toml.stringify(JSON.parse(JSON.stringify(config)));
    const config_path = `${args.op}/${args.name.toLocaleLowerCase()}-footnotes.toml`;
    const p2 = fs.outputFile(config_path, config_src);

    Promise.all([p1, p2]).then(_ => {
        console.log(`Done!:\n - SRC = ${commentary_path}\n - CONFIG = ${config_path}`);
    })
}

function convert_config(translation: interop.Translation): CommentaryConfig
{
    return {
        name: `${translation.name} Footnotes`,
        description: `Footnotes based on the "${translation.name}" Bible`,
        bible: translation.name,
        license: translation.licenseUrl,
        language: translation.language,
        data_source: translation.website,
    }
}

async function convert_footnotes(translation: interop.Translation): Promise<CommentaryEntry[]>
{
    let books = await interop.fetch_books_in_translation(translation.id);
    const entries = await Promise.all(books.books.map(async b => {
        const entries = await Promise.all(range(1, b.numberOfChapters + 1).map(async c => {
            const chapter = await interop.fetch_chapter_in_translation(translation.id, b.id, c);
            return chapter.chapter.footnotes.map(f => {
                const book_name = interop.get_osis(b.id as interop.BibleBook);
                return convert_footnote(book_name, c, f, 0);
            })
        }));
        console.log(`Completed book ${b.name}`);
        return entries
    }));

    console.log("Processing text....");

    return entries.flatMap(x => x).flatMap(x => x).map((e, i, a) => {
        e.id = i;
        e.comment = tp.raw_text_to_html_text(e.comment);
        console.log(`Progress: %${(i / a.length) * 100}`);
        return e;
    });
}

function convert_footnote(book: string, chapter: number, footnote: interop.ChapterFootnote, id: number): CommentaryEntry
{
    let references = footnote.reference ? 
        [`${book}.${chapter}.${footnote.reference.verse}`] : 
        [`${book}.${chapter}`];

    return {
        references,
        comment: footnote.text,
        id
    }
}

run()