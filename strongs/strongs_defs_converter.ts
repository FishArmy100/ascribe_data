import fs from "fs-extra";
import path from "path";
import { raw_text_to_html_text } from "../free_use_bible/process/text_processing";

function parseCsvLine(line: string): string[] {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
        const char = line[i];

        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i += 1;
            } else {
                inQuotes = !inQuotes;
            }
            continue;
        }

        if (char === "," && !inQuotes) {
            values.push(current);
            current = "";
            continue;
        }

        current += char;
    }

    values.push(current);
    return values;
}

async function run() {
    const inputPath = process.argv[2]
        ? path.resolve(process.argv[2])
        : path.resolve(__dirname, "strongs_def.csv");
    const outputPath = path.resolve(__dirname, "strongs_defs.jsonl");

    const csvText = await fs.readFile(inputPath, "utf8");
    const lines = csvText.split(/\r?\n/).filter((line) => line.trim().length > 0);

    if (lines.length < 2) {
        throw new Error("No CSV rows found.");
    }

    const rows = lines.slice(1).map((line) => parseCsvLine(line));
    const jsonlRecords = rows.map((row, index) => {
        if (row.length !== 5) {
            console.warn(`Row ${index + 2} has ${row.length} columns`);
        }

        const defs = row[3] && raw_text_to_html_text(row[3]);
        const deriv = row[4] && raw_text_to_html_text(row[4]);
        const definition = `<h2><b>Definitions:</b></h2><p>${defs ?? ""}</p><br><h2><b>Derivation:</b></h2><p>${deriv ?? ""}</p>`;
        const record = {
            strongs_ref: row[0] ?? "",
            definition,
            word: row[1] ?? "",
            id: index,
        };
        
        return record;
    });

    const prefixOrder: Record<string, number> = {
        H: 0,
        G: 1,
    };

    jsonlRecords.sort((a, b) => {
        const prefixDiff = prefixOrder[a.strongs_ref[0]] - prefixOrder[b.strongs_ref[0]];
        if (prefixDiff !== 0) return prefixDiff;

        return Number(a.strongs_ref.slice(1)) - Number(b.strongs_ref.slice(1));
    })

    const jsonlLines = jsonlRecords.map(r => JSON.stringify(r));

    await fs.outputFile(outputPath, `${jsonlLines.join("\n")}\n`);
    console.log(`Wrote ${jsonlLines.length} entries to ${path.relative(process.cwd(), outputPath)}`);
}

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
