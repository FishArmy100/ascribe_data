import * as verse_find from "./verse_find.ts";
import * as utils from "../utils.ts";
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

    text = text.replaceAll(/[HG]\d+/g, (strong_num) => {
        return `<a href="${strong_num}">${strong_num}</a>`;
    })

    return text;
}