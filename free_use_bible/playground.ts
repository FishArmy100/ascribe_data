import * as bible from "./interop/index.ts";

async function run() 
{
    const translations = (await bible.fetch_available_translations()).filter(t => t.language === "eng");
    
    console.log(translations.map(t => t.shortName))

    const translation_to_find = "KJAV"
    const translation = translations.find(t => t.shortName === translation_to_find)?.id ?? null;

    if (!translation)
    {
        console.log(`${translation_to_find} does not exist`);
        return;
    }

    console.log(translation);
    
    const books = await bible.fetch_books_in_translation(translation);
    const book = books.books[0].commonName;

    const chapter = await bible.fetch_chapter_in_translation(translation, book, 1);
    
    
    console.log(chapter.chapter.footnotes);
}

run();
