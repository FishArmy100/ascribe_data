export * from "./translations.ts";
export * from "./books.ts";
export * from "./chapter.ts"
export * from "./commentaries.ts";

export const BASE_URL = "https://bible.helloao.org/api"; 

export async function fetch_json<T>(url: string): Promise<T>
{
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
    }

    return (await res.json()) as T;
}