export type BibleReference = {
    osis: string;       // e.g. "Gen.1.1", "John.3.16-18"
    book_osis: string;   // "Gen", "1Chr", "Song"
    chapter_start: number;
    verse_start?: number;
    chapter_end?: number;
    verse_end?: number;
    raw: string;
    start: number;      // character index
    end: number;        // character index
};

// --------------------------------------------
// BOOK NAME MAP → OSIS
// (expanded + abbreviations)
// --------------------------------------------
const BOOK_MAP: Record<string, string> = {
    // Pentateuch
    "genesis": "Gen","gen": "Gen","ge": "Gen","gn": "Gen",
    "exodus": "Exod","exo": "Exod","ex": "Exod",
    "leviticus": "Lev","lev": "Lev",
    "numbers": "Num","num": "Num","nm": "Num",
    "deuteronomy": "Deut","deut": "Deut","dt": "Deut",

    // History
    "joshua": "Josh","jos": "Josh","jsh": "Josh",
    "judges": "Judg","judg": "Judg","jdg": "Judg","jg": "Judg",
    "ruth": "Ruth","ru": "Ruth",

    "1samuel":"1Sam","1sam":"1Sam","1sa":"1Sam","1sm":"1Sam","sam1":"1Sam",
    "2samuel":"2Sam","2sam":"2Sam","2sa":"2Sam","2sm":"2Sam","sam2":"2Sam",

    "1kings":"1Kgs","1kgs":"1Kgs","1ki":"1Kgs","kg1":"1Kgs",
    "2kings":"2Kgs","2kgs":"2Kgs","2ki":"2Kgs","kg2":"2Kgs",

    "1chronicles":"1Chr","1chr":"1Chr","1ch":"1Chr","chr1":"1Chr",
    "2chronicles":"2Chr","2chr":"2Chr","2ch":"2Chr","chr2":"2Chr",

    "ezra": "Ezra","ezr": "Ezra",
    "nehemiah":"Neh","neh":"Neh",
    "esther":"Esth","est":"Esth",

    // Poetry & Wisdom
    "job":"Job",
    "psalms":"Ps","psalm":"Ps","ps":"Ps","psa":"Ps","psm":"Ps",
    "proverbs":"Prov","pro":"Prov","prov":"Prov","pr":"Prov",
    "ecclesiastes":"Eccl","eccl":"Eccl","ecc":"Eccl",
    "songofsolomon":"Song","song":"Song","sos":"Song","ss":"Song",

    // Major Prophets
    "isaiah":"Isa","isa":"Isa",
    "jeremiah":"Jer","jer":"Jer","jr":"Jer",
    "lamentations":"Lam","lam":"Lam",
    "ezekiel":"Ezek","eze":"Ezek","ezk":"Ezek",
    "daniel":"Dan","dan":"Dan","dn":"Dan",

    // Minor Prophets
    "hosea":"Hos","hos":"Hos",
    "joel":"Joel","jl":"Joel",
    "amos":"Amos","amo":"Amos",
    "obadiah":"Obad","obad":"Obad","oba":"Obad","ob":"Obad",
    "jonah":"Jonah","jon":"Jonah",
    "micah":"Mic","mic":"Mic","mi":"Mic",
    "nahum":"Nah","nah":"Nah",
    "habakkuk":"Hab","hab":"Hab",
    "zephaniah":"Zeph","zep":"Zeph","zeph":"Zeph",
    "haggai":"Hag","hag":"Hag",
    "zechariah":"Zech","zec":"Zech","zech":"Zech",
    "malachi":"Mal","mal":"Mal",

    // Gospels & Acts
    "matthew":"Matt","matt":"Matt","mt":"Matt",
    "mark":"Mark","mar":"Mark","mk":"Mark","mrk":"Mark",
    "luke":"Luke","luk":"Luke","lk":"Luke",
    "john":"John","jhn":"John","joh":"John","jn":"John",
    "acts":"Acts","act":"Acts","ac":"Acts",

    // Pauline Epistles
    "romans":"Rom","rom":"Rom","ro":"Rom",
    "1corinthians":"1Cor","1cor":"1Cor","1co":"1Cor","cor1":"1Cor",
    "2corinthians":"2Cor","2cor":"2Cor","2co":"2Cor","cor2":"2Cor",

    "galatians":"Gal","gal":"Gal",
    "ephesians":"Eph","eph":"Eph",
    "philippians":"Phil","phi":"Phil","phil":"Phil",
    "colossians":"Col","col":"Col",

    "1thessalonians":"1Thess","1thess":"1Thess","1th":"1Thess","th1":"1Thess",
    "2thessalonians":"2Thess","2thess":"2Thess","2th":"2Thess","th2":"2Thess",

    // Pastoral letters (FULL)
    "1timothy":"1Tim","1tim":"1Tim","1ti":"1Tim","ti1":"1Tim","1tm":"1Tim",
    "2timothy":"2Tim","2tim":"2Tim","2ti":"2Tim","ti2":"2Tim","2tm":"2Tim",

    "titus":"Titus","tit":"Titus",
    "philemon":"Phlm","phm":"Phlm",

    // General Epistles
    "hebrews":"Heb","heb":"Heb",
    "james":"Jas","jam":"Jas","jas":"Jas",

    "1peter":"1Pet","1pet":"1Pet","1pe":"1Pet","pe1":"1Pet",
    "2peter":"2Pet","2pet":"2Pet","2pe":"2Pet","pe2":"2Pet",

    "1john":"1John","1jn":"1John","1j":"1John","john1":"1John",
    "2john":"2John","2jn":"2John","2j":"2John","john2":"2John",
    "3john":"3John","3jn":"3John","3j":"3John","john3":"3John",

    "jude":"Jude","jud":"Jude",

    // Revelation
    "revelation":"Rev","rev":"Rev","re":"Rev"
};

// --------------------------------------------
// BOOK LIST REGEX
// --------------------------------------------
const BOOK_REGEX =
    "(?:" +
    Object.keys(BOOK_MAP)
        .sort((a, b) => b.length - a.length)
        .map(k => k.replace(/\s+/g, "\\s*"))
        .join("|") +
    ")";

// --------------------------------------------
// REFERENCE REGEX
// --------------------------------------------
const REF_REGEX = new RegExp(
    `\\b(${BOOK_REGEX})[ \\t]*\\.?[ \\t]*(\\d+)` + 
    `(?:[.:](?![ \\t]*\\n)(\\d+))?` +
    `(?:[ \\t]*[-–][ \\t]*(\\d+)(?:[.:](?![ \\t]*\\n)(\\d+))?)?`,
    "gi"
);



// --------------------------------------------
// NORMALIZATION
// --------------------------------------------
function normalize_book(raw: string): string {
    const cleaned = raw
        .toLowerCase()
        .replace(/[^a-z0-9]/g, ""); // ← critical fix

    return BOOK_MAP[cleaned] || raw;
}

// --------------------------------------------
// MAIN FUNCTION
// --------------------------------------------
export function find_bible_refs(text: string): BibleReference[] {
    const results: BibleReference[] = [];
    let match: RegExpExecArray | null;

    while ((match = REF_REGEX.exec(text)) !== null) {
        const [
            raw,
            bookRaw,
            chapStart,
            verseStart,
            chapEnd,
            verseEnd
        ] = match;

        const bookOsis = normalize_book(bookRaw);
        const c1 = Number(chapStart);
        const v1 = verseStart ? Number(verseStart) : undefined;
        const c2 = chapEnd ? Number(chapEnd) : undefined;
        const v2 = verseEnd ? Number(verseEnd) : undefined;

        let osis = bookOsis + "." + c1;
        if (v1 !== undefined) osis += "." + v1;

        if (c2 !== undefined) {
            osis += "-";
            osis += bookOsis + "." + c2;
            if (v2 !== undefined) osis += "." + v2;
        }

        results.push({
            raw,
            osis,
            book_osis: bookOsis,
            chapter_start: c1,
            verse_start: v1,
            chapter_end: c2,
            verse_end: v2,
            start: match.index,
            end: match.index + raw.length
        });
    }

    return results;
}
