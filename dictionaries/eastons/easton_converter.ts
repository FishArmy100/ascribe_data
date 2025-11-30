import fs from "fs-extra";
import * as toml from "@iarna/toml";
import * as shared from "../../shared_utils";

type EastonRawEntry = {
    term: string,
    definitions: string[]
}

const EBD_ALIAS = "ebd";
const EASTON_CONFIG = {
    name: "Easton's Bible Dictionary",
    short_name: "Easton's",
    id: "eastons_bible_dictionary",
    authors: [ "Matthew George Easton" ],
    language: "eng",
    description: `
        <h1>Easton's Bible Dictionary</h1>

        <p><strong><em>Easton's Bible Dictionary</em></strong> is a classic, concise reference work for students and readers of the Bible. It provides short, accessible entries on people, places, customs, doctrines, and terms found in the Old and New Testaments.</p>

        <h2>Background</h2>
        <p><em>Easton's</em> was compiled by a 19th-century scholar and minister and has been widely reprinted and used because of its clear, summary style. Over time it became popular as a readily available biblical reference for lay readers, pastors, and students.</p>

        <h3>Key characteristics</h3>
        <ul>
            <li><strong>Alphabetical entries:</strong> Arranged like a traditional dictionary for quick lookup.</li>
            <li><strong>Concise explanations:</strong> Short articles that summarize historical, geographical, and theological points.</li>
            <li><strong>Scriptural references:</strong> Entries commonly cite Bible verses to guide further reading.</li>
            <li><strong>Intended audience:</strong> General readers, Bible study groups, and those seeking a quick reference rather than in-depth scholarly analysis.</li>
        </ul>

        <h2>Typical contents</h2>
        <p>The dictionary includes entries on:</p>
        <ul>
            <li>People (patriarchs, prophets, apostles, rulers)</li>
            <li>Places (ancient cities, regions, geographic features)</li>
            <li>Customs and institutions (religious practices, social customs)</li>
            <li>Doctrinal and theological terms (key Christian ideas and terminology)</li>
        </ul>

        <h2>Usage and availability</h2>
        <p><em>Easton's</em> is often used as a starting point for Bible study. Because it is an older work it is commonly found in public-domain reprints and online editions, which makes it easy to access. Readers should bear in mind that scholarship has advanced since the dictionary was written, so for current academic research it is best paired with more recent reference works.</p>

        <h3>Quick summary</h3>
        <p><strong>Easton's Bible Dictionary</strong> = <em>handy, succinct, historically popular</em> — ideal for quick lookups and introductory Bible study, but not a substitute for up-to-date scholarly commentaries when modern critical detail is required.</p>
    `,
    data_source: "https://huggingface.co/datasets/JWBickel/BibleDictionaries/raw/main/Easton's%20Bible%20Dictionary.jsonl",
    license: "Public Domain",
    external: {
        aliases: {
            "eastons_bible_dictionary": EBD_ALIAS
        }
    }
}

type DictionaryEntry = {
    term: string,
    aliases?: string[],
    definition: string,
    id: number,
}

async function run()
{
    const file = await fs.readFile("./Easton's Bible Dictionary.jsonl");
    const raw_entries = file.toString()
        .split("\n")
        .filter(l => l.length > 0)
        .map(e => JSON.parse(e) as EastonRawEntry);

    const entry_map = new Map<string, number>(raw_entries.map((e, i) => [e.term.toLocaleLowerCase(), i]));

    console.log(process_text("Here is some text Gen 1:5, 12; 4:5", new Map()));

    const converted_entries = raw_entries.map((e, i, arr) => {
        console.log((i / arr.length) * 100);
        return convert_entry(e, i, entry_map);
    });

    const src = converted_entries.map(v => JSON.stringify(v)).join("\n");
    const src_path = `out/easton_bible_dictionary.jsonl`;
    await fs.outputFile(src_path, src);

    const config_src = toml.stringify(EASTON_CONFIG);
    const config_path = `out/easton_bible_dictionary.toml`;
    await fs.outputFile(config_path, config_src);

    console.log("Converted Eastons!");
}

function convert_entry(entry: EastonRawEntry, index: number, id_map: Map<string, number>): DictionaryEntry
{
    const definition = process_definitions(entry.definitions, id_map);

    return {
        term: entry.term,
        definition,
        aliases: [],
        id: index,
    }
}

function process_definitions(definitions: string[], id_map: Map<string, number>): string 
{
    return definitions.map(d => process_text(d, id_map)).map(d => `<p>${d}</p>`).join(`<br/>`);
}

function process_text(text: string, id_map: Map<string, number>): string 
{
    text = shared.verse_find.replace_verses(text, f => (
        ` <a href="${f.ref_id}">${f.raw}</a> `
    ))

    const inner_reference_regex = /\[(\d+)\](\w+)/g;
    text = text.replaceAll(inner_reference_regex, (_, _num, term_raw) => {
        let term = (term_raw as string).toLocaleLowerCase();
        const term_id = id_map.get(term);
        
        term = term.charAt(0).toLocaleUpperCase() + term.slice(1);
        if (term_id !== undefined)
        {
            return ` <a href="${EBD_ALIAS}:${term_id}">${term}</a> `  
        }
        else 
        {
            return term
        }
    })


    return text;
}

run()
