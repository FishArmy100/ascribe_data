import minimist from "minimist";
import * as interop from "./interop";
import { OsisBook } from "./utils";

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

function convert_footnote(book: OsisBook, chapter: number, footnote: interop.ChapterFootnote, id: number): CommentaryEntry
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