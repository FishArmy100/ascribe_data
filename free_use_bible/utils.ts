import path from "path";
import { fileURLToPath } from "url";


export function is_main(meta: ImportMeta): boolean
{
    const current_file = fileURLToPath(meta.url);
    const entry_file = process.argv[1];
    return path.resolve(current_file) === path.resolve(entry_file);
}