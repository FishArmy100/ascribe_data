import minimist from "minimist";
import * as interop from "./interop";

type CommentaryConfig = {

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

run()