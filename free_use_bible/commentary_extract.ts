import minimist from "minimist";
import * as interop from "./interop";
import { range } from "./utils";
import fs from "fs-extra"
import toml from "@iarna/toml"
import * as tp from "./process"
import pLimit from "p-limit";

type CommentaryConfig = {
    name: string,
    description?: string,
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
    display?: boolean,
    name?: string,
    lang?: string,
    op?: string,
    format?: boolean,
}

async function run()
{
    const args = minimist<Args>(process.argv.slice(2));

    if (args.display)
    {
        const commentaries = await interop.fetch_available_commentaries();
        console.log("Commentaries")
        commentaries.forEach(c => {
            console.log(`- ${c.name}: (${c.id})`)
        });

        return;
    }
            
    if (!args.name)
    {
        console.error("[ERROR]: Commentary extractor requires a name");
        return;
    }

    if (!args.op)
    {
        console.error("[ERROR]: Commentary extractor needs an out path");
        return;
    }

    if (args.format === undefined)
    {
        args.format = true;
    }

    const commentary_data = (await interop.fetch_available_commentaries())
        .filter(t => args.lang ? args.lang === t.language : true)
        .find(t => t.id === args.name)

    if (commentary_data === undefined)
    {
        console.error(`[ERROR]: No commentary found with name ${args.name}`);
        return;
    }

    const commentary = await convert_commentary(commentary_data, args.format);
    const commentary_src = commentary.map(v => JSON.stringify(v)).join("\n");
    const commentary_path = `${args.op}/${args.name.toLocaleLowerCase()}-commentary${!args.format ? "-unformatted" : ""}.jsonl`;
    const p1 = fs.outputFile(commentary_path, commentary_src);

    const config = convert_config(commentary_data);
    const config_src = toml.stringify(JSON.parse(JSON.stringify(config)));
    const config_path = `${args.op}/${args.name.toLocaleLowerCase()}-commentary.toml`;
    const p2 = fs.outputFile(config_path, config_src);

    Promise.all([p1, p2]).then(_ => {
        console.log(`Done!:\n - SRC = ${commentary_path}\n - CONFIG = ${config_path}`);
    })
}

async function convert_commentary(commentary: interop.Commentary, format: boolean,): Promise<CommentaryEntry[]>
{
    const books = await interop.fetch_books_in_commentary(commentary.id);
    const entries = (await Promise.all(books.map(async book => {
        const book_name = interop.get_osis(book.id as interop.BibleBook);

        const entries = (await Promise.all(range(1, book.numberOfChapters + 1).map(async i => {
            let chapter: interop.CommentaryChapterData;
            try 
            {
                chapter = (await interop.fetch_commentary_book_chapter(commentary.id, book.id, i)).chapter;        
            }
            catch 
            {
                console.error(`Error for ${book_name} ${i}`);
                return null;
            }
            
            const entries = chapter.content.map(v => {
                if (typeof(v.content[0]) === "string")
                {
                    const content = v.content[0];
                    return { references: [`${book_name}.${chapter.number}.${v.number}`], comment: content, id: 0 }
                }
                else 
                {
                    return null;
                }
            }).filter(v => v !== null);

            if (chapter.introduction)
            {
                const content = chapter.introduction;
                entries.push({ references: [`${book_name}.${chapter.number}`], comment: content, id: 0 })
            }

            return entries
        }))).flatMap(x => x)

        if (book.introduction)
        {
            entries.push({ references: [book_name], comment: book.introduction, id: 0 })
        }

        console.log(`Fetched book ${book.name}`);
        return entries;
    }))).flatMap(x => x).filter(e => e !== null);
    
    entries.forEach((e, i) => {
        e.id = i
    });

    console.log("Processing text....");
    if(format)
    {
        await Promise.all(
            entries.map(async (e, i) => {
                e.comment = tp.raw_text_to_html_text(e.comment);
                console.log(`Progress: %${(i / entries.length) * 100}`);
            })
        );
    }

    return entries
}

function convert_config(commentary: interop.Commentary): CommentaryConfig
{
    return {
        name: `${commentary.name}`,
        license: commentary.licenseUrl,
        language: commentary.language,
        data_source: commentary.website,
    }
}


run()