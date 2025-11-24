import { fetch, Agent } from "undici";

export * from "./translations.ts";
export * from "./books.ts";
export * from "./chapter.ts"
export * from "./commentaries.ts";

export const BASE_URL = "https://bible.helloao.org/api"; 

const agent = new Agent({
    connect: {
        timeout: 60_000,
    },
    bodyTimeout: 0,
    headersTimeout: 0,
})

export async function fetch_json<T>(url: string, retries = 5): Promise<T> {
    for (let attempt = 1; attempt <= retries; attempt++) 
    {
        try 
        {
            const res = await fetch(url, { dispatcher: agent });

            if (!res.ok) 
            {
                throw new Error(`HTTP error ${res.status} on ${url}`);
            }

            return (await res.json()) as T;
        } 
        catch (err: any) 
        {
            const is_last_attempt = attempt === retries;

            // These are transient errors — retry
            if (
                err?.cause?.code === "UND_ERR_SOCKET" ||
                err?.cause?.code === "UND_ERR_CONNECT_TIMEOUT" ||
                err?.code === "ECONNRESET"
            ) {
                if (is_last_attempt) throw err;

                // small delay with exponential backoff
                const delay = 300 * attempt;
                await new Promise(r => setTimeout(r, delay));
                continue;
            }

            // Other errors → do not retry
            throw err;
        }
    }

    // Should never reach here
    throw new Error(`Failed to fetch ${url} after ${retries} retries`);
}

export type BibleBook = 
    | "GEN" | "EXO" | "LEV" | "NUM" | "DEU" | "JOS" | "JDG" | "RUT"
    | "1SA" | "2SA" | "1KI" | "2KI" | "1CH" | "2CH" | "EZR" | "NEH"
    | "EST" | "JOB" | "PSA" | "PRO" | "ECC" | "SNG" | "ISA" | "JER"
    | "LAM" | "EZK" | "DAN" | "HOS" | "JOL" | "AMO" | "OBA" | "JON"
    | "MIC" | "NAM" | "HAB" | "ZEP" | "HAG" | "ZEC" | "MAL"
    | "MAT" | "MRK" | "LUK" | "JHN" | "ACT" | "ROM"
    | "1CO" | "2CO" | "GAL" | "EPH" | "PHP" | "COL"
    | "1TH" | "2TH" | "1TI" | "2TI" | "TIT" | "PHM" | "HEB"
    | "JAS" | "1PE" | "2PE" | "1JN" | "2JN" | "3JN" | "JUD" | "REV";

const OSIS_MAP: Record<BibleBook, string> = {
    "GEN": "Gen",
    "EXO": "Exod",
    "LEV": "Lev",
    "NUM": "Num",
    "DEU": "Deut",
    "JOS": "Josh",
    "JDG": "Judg",
    "RUT": "Ruth",
    "1SA": "1Sam",
    "2SA": "2Sam",
    "1KI": "1Kgs",
    "2KI": "2Kgs",
    "1CH": "1Chr",
    "2CH": "2Chr",
    "EZR": "Ezra",
    "NEH": "Neh",
    "EST": "Esth",
    "JOB": "Job",
    "PSA": "Ps",
    "PRO": "Prov",
    "ECC": "Eccl",
    "SNG": "Song",
    "ISA": "Isa",
    "JER": "Jer",
    "LAM": "Lam",
    "EZK": "Ezek",
    "DAN": "Dan",
    "HOS": "Hos",
    "JOL": "Joel",
    "AMO": "Amos",
    "OBA": "Obad",
    "JON": "Jonah",
    "MIC": "Mic",
    "NAM": "Nah",
    "HAB": "Hab",
    "ZEP": "Zeph",
    "HAG": "Hag",
    "ZEC": "Zech",
    "MAL": "Mal",
    "MAT": "Matt",
    "MRK": "Mark",
    "LUK": "Luke",
    "JHN": "John",
    "ACT": "Acts",
    "ROM": "Rom",
    "1CO": "1Cor",
    "2CO": "2Cor",
    "GAL": "Gal",
    "EPH": "Eph",
    "PHP": "Phil",
    "COL": "Col",
    "1TH": "1Thess",
    "2TH": "2Thess",
    "1TI": "1Tim",
    "2TI": "2Tim",
    "TIT": "Titus",
    "PHM": "Phlm",
    "HEB": "Heb",
    "JAS": "Jas",
    "1PE": "1Pet",
    "2PE": "2Pet",
    "1JN": "1John",
    "2JN": "2John",
    "3JN": "3John",
    "JUD": "Jude",
    "REV": "Rev",
};

export function get_osis(book: BibleBook): string {
    return OSIS_MAP[book];
}