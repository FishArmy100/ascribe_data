import * as verse_find from "./verse_find.ts";
import * as utils from "./utils.ts";
import fs from "fs-extra";

export function raw_text_to_html_text(text: string): string 
{
    text = text.split("\n").filter(t => t.length > 0).map(t => `<p>${t}</p>`).join("<br/>");

    const map = new Map<string, number>();
    text = text.replaceAll(verse_find.REFERENCE_REGEX, (sub) => {
        const pos = map.get(text) ?? 0;
        const start = text.indexOf(sub, pos);
        const end = start + sub.length - 1;
        const verse = verse_find.parse_reference(sub, start, end)!;
        map.set(sub, pos + 1);
        return `<a href="${verse.ref_id}">${sub}</a>`;
    });

    return text;
}

function test()
{
    const text = "Hello there! \n\n this is a test message to see if verses like Gen.1.1 and 1st Cor 1:5 also work.\n And here is another comment with some other stuff \n oh, here is another verse Hab 2:14-15"
    const html = raw_text_to_html_text(text);
    fs.outputFile("./test.html", html);
}

test();