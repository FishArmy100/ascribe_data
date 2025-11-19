import { BASE_URL, ChapterVerse, fetch_json } from ".";

export interface AvailableCommentaries {
    /**
     * The list of commentaries.
     */
    commentaries: Commentary[];
}

export interface Commentary {
    /**
     * The ID of the commentary.
     */
    id: string;

    /**
     * The name of the commentary.
     */
    name: string;

    /**
     * The website for the commentary.
     */
    website: string;

    /**
     * The URL that the license for the commentary can be found.
     */
    licenseUrl: string;

    /**
     * The english name for the commentary.
     */
    englishName: string;

    /**
     * The ISO 639 3-letter language tag that the translation is primarily in.
     */
    language: string;

    /**
     * The direction that the language is written in.
     * "ltr" indicates that the text is written from the left side of the page to the right.
     * "rtl" indicates that the text is written from the right side of the page to the left.
     */
    textDirection: 'ltr' | 'rtl';

    /**
     * The API link for the list of available books for this translation.
     */
    listOfBooksApiLink: string;

    /**
     * The available list of formats.
     */
    availableFormats: ('json' | 'usfm')[];

    /**
     * The number of books that are contained in this commentary.
     *
     * Complete commentaries should have the same number of books as the Bible (66).
     */
    numberOfBooks: number;

    /**
     * The total number of chapters that are contained in this translation.
     *
     * Complete commentaries should have the same number of chapters as the Bible (1,189).
     */
    totalNumberOfChapters: number;

    /**
     * The total number of verses that are contained in this commentary.
     *
     * Complete commentaries should have the same number of verses as the Bible (around 31,102 - some commentaries exclude verses based on the apparent likelihood of existing in the original source texts).
     */
    totalNumberOfVerses: number;

    /**
     * Gets the name of the language that the commentary is in.
     * Null or undefined if the name of the language is not known.
     */
    languageName?: string;

    /**
     * Gets the name of the language in English.
     * Null or undefined if the language doesn't have an english name.
     */
    languageEnglishName?: string;
}

export interface CommentaryBooks {
    /**
     * The commentary information for the books.
     */
    commentary: Commentary;

    /**
     * The list of books that are available for the commentary.
     */
    books: CommentaryBook[];
}

interface CommentaryBook {
    /**
     * The ID of the book.
     * Matches the ID of the corresponding book in the Bible (GEN, EXO, etc.).
     */
    id: string;

    /**
     * The name that the commentary provided for the book.
     */
    name: string;

    /**
     * The common name for the book.
     */
    commonName: string;

    /**
     * The commentary's introduction for the book.
     * Omitted if the commentary doesn't have an introduction for the book.
     */
    introduction?: string;

    /**
     * The order of the book in the Bible.
     */
    order: number;

    /**
     * The number of the first chapter in the book.
     *
     * Null if the commentary book has no chapters.
     */
    firstChapterNumber: number | null;

    /**
     * The link to the first chapter of the book.
     *
     * Null if the commentary book has no chapters.
     */
    firstChapterApiLink: string | null;

    /**
     * The number of the last chapter in the book.
     *
     * Null if the commentary book has no chapters.
     */
    lastChapterNumber: number | null;

    /**
     * The link to the last chapter of the book.
     *
     * Null if the commentary book has no chapters.
     */
    lastChapterApiLink: string | null;

    /**
     * The number of chapters that the book contains.
     */
    numberOfChapters: number;

    /**
     * The number of verses that the book contains.
     */
    totalNumberOfVerses: number;
}

export interface CommentaryBookChapter {
    /**
     * The commentary information for the book chapter.
     */
    commentary: Commentary;

    /**
     * The book information for the book chapter.
     */
    book: CommentaryBook;

    /**
     * The link to this chapter.
     */
    thisChapterLink: string;

    /**
     * The link to the next chapter.
     * Null if this is the last chapter in the commentary.
     */
    nextChapterApiLink: string | null;

    /**
     * The link to the previous chapter.
     * Null if this is the first chapter in the commentary.
     */
    previousChapterApiLink: string | null;

    /**
     * The number of verses that the chapter contains.
     */
    numberOfVerses: number;

    /**
     * The information for the chapter.
     */
    chapter: CommentaryChapterData;
}

interface CommentaryChapterData {
    /**
     * The number of the chapter.
     */
    number: number;

    /**
     * The introduction that the commentary provided to the chapter.
     * Not all commentaries provide an introduction to a chapter.
     */
    introduction?: string;

    /**
     * The content of the chapter.
     * This is the same type from the "Get a Chapter from a Translation" endpoint.
     */
    content: ChapterVerse[];
}

export async function fetch_available_commentaries(): Promise<Commentary[]>
{
    const url = `${BASE_URL}/available_commentaries.json`;
    const data = await fetch_json<AvailableCommentaries>(url);
    return data.commentaries;
}

export async function fetch_books_in_commentary(commentary: string): Promise<CommentaryBook[]>
{
    const url = `${BASE_URL}/c/${commentary}/books.json`;
    const data = await fetch_json<CommentaryBooks>(url);
    return data.books;
}

export async function fetch_commentary_book_chapter(commentary: string, book: string, chapter: number): Promise<CommentaryBookChapter>
{
    const url = `${BASE_URL}/c/${commentary}/${book}/${chapter}.json`;
    const data = await fetch_json<CommentaryBookChapter>(url);
    return data;
}