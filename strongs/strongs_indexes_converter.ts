import fs from "fs-extra";
import path from "path";

const regex = /^(?:(?<prefix>I+\s+)?(?<book>[A-Za-z][A-Za-z\s]*[A-Za-z])\s+(?<chapter>\d+):(?<verse>\d+):\s+(?<content>.+)?)$/;

const bookConvertMap: Record<string, string> = {
    Genesis: "Gen",
    Exodus: "Exod",
    Leviticus: "Lev",
    Numbers: "Num",
    Deuteronomy: "Deut",
    Joshua: "Josh",
    Judges: "Judg",
    Ruth: "Ruth",
    "I Samuel": "1Sam",
    "II Samuel": "2Sam",
    "I Kings": "1Kgs",
    "II Kings": "2Kgs",
    "I Chronicles": "1Chr",
    "II Chronicles": "2Chr",
    Ezra: "Ezra",
    Nehemiah: "Neh",
    Esther: "Esth",
    Job: "Job",
    Psalms: "Ps",
    Proverbs: "Prov",
    Ecclesiastes: "Eccl",
    "Song of Solomon": "Song",
    Isaiah: "Isa",
    Jeremiah: "Jer",
    Lamentations: "Lam",
    Ezekiel: "Ezek",
    Daniel: "Dan",
    Hosea: "Hos",
    Joel: "Joel",
    Amos: "Amos",
    Obadiah: "Obad",
    Jonah: "Jonah",
    Micah: "Mic",
    Nahum: "Nah",
    Habakkuk: "Hab",
    Zephaniah: "Zeph",
    Haggai: "Hag",
    Zechariah: "Zech",
    Malachi: "Mal",
    Matthew: "Matt",
    Mark: "Mark",
    Luke: "Luke",
    John: "John",
    Acts: "Acts",
    Romans: "Rom",
    "I Corinthians": "1Cor",
    "II Corinthians": "2Cor",
    Galatians: "Gal",
    Ephesians: "Eph",
    Philippians: "Phil",
    Colossians: "Col",
    "I Thessalonians": "1Thess",
    "II Thessalonians": "2Thess",
    "I Timothy": "1Tim",
    "II Timothy": "2Tim",
    Titus: "Titus",
    Philemon: "Phlm",
    Hebrews: "Heb",
    James: "Jas",
    "I Peter": "1Pet",
    "II Peter": "2Pet",
    "I John": "1John",
    "II John": "2John",
    "III John": "3John",
    Jude: "Jude",
    "Revelation of John": "Rev",
};

const newTestamentBooks = ["Matt", "Mark", "Luke", "John", "Acts", "Rom", "1Cor", "2Cor", "Gal", "Eph", "Phil", "Col", "1Thess", "2Thess", "1Tim", "2Tim", "Titus", "Phlm", "Heb", "Jas", "1Pet", "2Pet", "1John", "2John", "3John", "Jude", "Rev"];

type XmlNode = {
    tag: string;
    attrs: Record<string, string>;
    children: XmlNode[];
    text?: string;
    tail?: string;
};

type VerseJson = {
    id: number;
    verse_id: string;
    words: Array<{ strongs: string[]; range: string }>;
};

type VerseData = {
    id: number;
    verse_id: string;
    words: Array<{ text: string }>;
};

function parseXmlFragment(xml: string): XmlNode {
    const root: XmlNode = { tag: "__root__", attrs: {}, children: [] };
    const stack: XmlNode[] = [root];
    const tagRegex = /<\/?([A-Za-z0-9:_-]+)([^>]*)>/g;

    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = tagRegex.exec(xml)) !== null) {
        const text = xml.slice(lastIndex, match.index);
        if (text) {
            const parent = stack[stack.length - 1];
            if (parent.children.length > 0) {
                const lastChild = parent.children[parent.children.length - 1];
                lastChild.tail = (lastChild.tail ?? "") + text;
            } else {
                parent.text = (parent.text ?? "") + text;
            }
        }

        const fullTag = match[0];
        const name = match[1];
        const attrsText = match[2] ?? "";
        const isClosing = fullTag.startsWith("</");
        const isSelfClosing = fullTag.endsWith("/>");

        if (isClosing) {
            stack.pop();
        } else {
            const attrs = parseAttributes(attrsText);
            const node: XmlNode = { tag: name, attrs, children: [] };
            const parent = stack[stack.length - 1];
            parent.children.push(node);
            if (!isSelfClosing) {
                stack.push(node);
            }
        }

        lastIndex = tagRegex.lastIndex;
    }

    const trailingText = xml.slice(lastIndex);
    if (trailingText) {
        const parent = stack[stack.length - 1];
        if (parent.children.length > 0) {
            const lastChild = parent.children[parent.children.length - 1];
            lastChild.tail = (lastChild.tail ?? "") + trailingText;
        } else {
            parent.text = (parent.text ?? "") + trailingText;
        }
    }

    return root;
}

function parseAttributes(attrsText: string): Record<string, string> {
    const attrs: Record<string, string> = {};
    const attrRegex = /([A-Za-z0-9:_-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'))?/g;
    let match: RegExpExecArray | null;

    while ((match = attrRegex.exec(attrsText)) !== null) {
        const [, name, doubleQuoted, singleQuoted] = match;
        attrs[name] = doubleQuoted ?? singleQuoted ?? "";
    }

    return attrs;
}

function countWords(text: string | undefined): number {
    if (!text) {
        return 0;
    }

    return text
        .trim()
        .split(/\s+/)
        .filter((token) => /[\p{L}\p{N}]/u.test(token)).length;
}

function countAllTextWords(node: XmlNode): number {
    let count = countWords(node.text);
    for (const child of node.children) {
        count += countAllTextWords(child);
        count += countWords(child.tail);
    }
    return count;
}

function countTextWordsExcludingEmptyW(node: XmlNode): number {
    let count = countWords(node.text);

    for (const child of node.children) {
        if (child.tag === "w" && countAllTextWords(child) === 0) {
            continue;
        }

        count += countTextWordsExcludingEmptyW(child);
        count += countWords(child.tail);
    }

    return count;
}

function processElementForStrongs(node: XmlNode, offset: number, strongsWords: Array<{ strongs: string[]; range: string }>, line: number): number {
    if (node.text) {
        offset += countWords(node.text);
    }

    for (const child of node.children) {
        if (child.tag === "w") {
            const strongsAttr = child.attrs.savlm ?? "";
            const numsList = strongsAttr
                .split(/\s+/)
                .map((value) => value.split(":")[1])
                .filter(Boolean);

            const wWords = countAllTextWords(child);
            if (wWords === 0) {
                continue;
            }

            const start = offset;
            const end = start + wWords - 1;
            offset = end + 1;

            if (start > end) {
                throw new Error(`Error on line ${line}: the start word index is larger than the end word index`);
            }

            strongsWords.push({
                strongs: numsList,
                range: start === end ? `${start}` : `${start}-${end}`,
            });
        } else {
            offset = processElementForStrongs(child, offset, strongsWords, line);
        }

        if (child.tail) {
            offset += countWords(child.tail);
        }
    }

    return offset;
}

function isNewTestament(verseId: string): boolean {
    return newTestamentBooks.some((book) => verseId.startsWith(book));
}

function loadBible(biblePath: string): Record<string, VerseData> {
    const lines = fs.readFileSync(biblePath, "utf8").trim().split(/\r?\n/).filter(Boolean);
    return Object.fromEntries(lines.map((line) => {
        const verse = JSON.parse(line) as VerseData;
        return [verse.verse_id, verse];
    }));
}

function getStrongs(osis: string, content: XmlNode, bible: Record<string, VerseData>, line: number): VerseJson {
    const totalWords = countTextWordsExcludingEmptyW(content);
    const offset = bible[osis].words.length - totalWords + 1;
    if (offset < 0) {
        throw new Error(`Words in strongs more than in bible on line ${line}, s_word = ${totalWords}; b_word = ${bible[osis].words.length}; ref = ${osis}`);
    }

    const strongsWords: Array<{ strongs: string[]; range: string }> = [];
    const finalOffset = processElementForStrongs(content, offset, strongsWords, line);

    if (finalOffset - 1 !== bible[osis].words.length) {
        throw new Error(`Error on line ${line}, last strongs word index does not match bible word count (expected ${bible[osis].words.length}, got ${finalOffset - 1})`);
    }

    return {
        verse_id: osis,
        id: line - 1,
        words: strongsWords,
    };
}

function writeToFile(filePath: string, content: string) {
    fs.outputFileSync(filePath, content);
}

function validPath(value: string): string {
    if (!fs.existsSync(value)) {
        throw new Error(`Path does not exist: ${value}`);
    }
    return value;
}

function pruneNonVerseContent(node: XmlNode): void {
    node.children = node.children.filter(
        (child) => child.tag !== "div" && child.tag !== "chapter"
    );
}

async function run() {
    const args = process.argv.slice(2);
    const inputPath = args[0] ? validPath(path.resolve(args[0])) : undefined;
    const biblePath = args.find((arg, index) => (arg === "-b" || arg === "--bible") && args[index + 1])
        ? args[args.indexOf(args.find((arg) => arg === "-b" || arg === "--bible") ?? "") + 1]
        : undefined;
    const outPath = args.find((arg, index) => (arg === "-o" || arg === "--out") && args[index + 1])
        ? args[args.indexOf(args.find((arg) => arg === "-o" || arg === "--out") ?? "") + 1]
        : undefined;

    if (!inputPath || !biblePath || !outPath) {
        console.error("Usage: tsx strongs_indexes_converter.ts <input-path> -b <bible-path> -o <out-path>");
        process.exitCode = 1;
        return;
    }

    const resolvedBiblePath = validPath(path.resolve(biblePath));
    const resolvedOutPath = path.resolve(outPath);

    const bible = loadBible(resolvedBiblePath);
    const lines = (await fs.readFile(inputPath, "utf8")).split(/\r?\n/).filter((line) => line.trim().length > 0);
    const outLines: string[] = [];
    let errorCount = 0;

    for (const [index, line] of lines.entries()) {
        try {
            const matches = line.match(regex);
            if (!matches?.groups) {
                throw new Error(`File ${inputPath} is in an invalid format on line ${index + 1}.`);
            }

            const prefix = matches.groups.prefix?.trim();
            const bookName = matches.groups.book ?? "";
            const chapter = Number(matches.groups.chapter);
            const verse = Number(matches.groups.verse);
            const content = matches.groups.content;

            if (!content) {
                continue;
            }

            let book: string | undefined;
            if (prefix) {
                book = bookConvertMap[`${prefix} ${bookName}`];
            }
            if (!book) {
                book = bookConvertMap[bookName];
            }

            if (!book) {
                throw new Error(`Unknown book: ${bookName}`);
            }

            const osis = `${book}.${chapter}.${verse}`;
            const xml = `<content>${content}</content>`;
            const tree = parseXmlFragment(xml);
            const contentNode = tree.children[0] ?? tree;
            pruneNonVerseContent(contentNode)
            const entry = getStrongs(osis, contentNode, bible, index + 1);
            outLines.push(JSON.stringify(entry));
        } catch (error) {
            errorCount += 1;
            console.warn(error instanceof Error ? error.message : error);
        }
    }

    writeToFile(resolvedOutPath, outLines.join("\n"));
    console.log(`Wrote ${outLines.length} entries to ${path.relative(process.cwd(), resolvedOutPath)} (${errorCount} skipped)`);
}

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
