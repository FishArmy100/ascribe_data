import * as verse_find from "./verse_find.ts";
import * as utils from "../utils.ts";
import fs from "fs-extra";

export function replace_verse_tags(whole_text: string, book: string, chapter: number): string 
{
    return whole_text.replaceAll(/(verse|v)\s+(\d+)/gi, t => {
        const v = t.match(/(verse|v)\s*(\d+)/gi)![1];
        return `<a href="${book}.${chapter}.${v}">${t}</a>`;
    })
}

export type TextToHtmlFlags = {
    ref_context?: { book: string, chapter: number }
}

export function raw_text_to_html_text(text: string, flags: TextToHtmlFlags): string 
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

    if (flags.ref_context)
    {
        text = replace_verse_tags(text, flags.ref_context.book, flags.ref_context.chapter);
    }

    return text;
}