import { spawnSync } from "child_process";
import fs from "fs-extra";
import path from "path";

async function run() {
    const outputPath = path.resolve(__dirname, "strongs_word_indexes.txt");
    const result = spawnSync("diatheke", ["-b", "KJV", "-k", "Genesis 1:1", "-f", "OSIS"], {
        encoding: "utf8",
    });

    if (result.error) {
        throw result.error;
    }

    await fs.outputFile(outputPath, result.stdout ?? "");
    console.log(`Wrote Strong's index output to ${path.relative(process.cwd(), outputPath)}`);
}

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
