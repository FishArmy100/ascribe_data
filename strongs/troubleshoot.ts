import { spawnSync } from "child_process";

const result = spawnSync("diatheke.exe", ["--help"], { encoding: "utf8" });
console.log(result.status);
console.log(result.stdout);
console.log(result.stderr);
