import { BASE_URL, fetch_json } from ".";

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
     * Complete commentaries should have the same number of verses as the Bible (around 31,102 - some commentaries exclude verses based on the aparent likelyhood of existing in the original source texts).
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

export async function fetch_available_commentaries(): Promise<Commentary[]>
{
    const url = `${BASE_URL}/available_commentaries.json`;
    const data = await fetch_json<AvailableCommentaries>(url);
    return data.commentaries;
}