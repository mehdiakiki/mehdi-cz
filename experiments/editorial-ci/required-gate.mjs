import { readFile } from "node:fs/promises";
import { requiredResult } from "./affected-tests.mjs";

const [reportPath] = process.argv.slice(2);
if (!reportPath) throw new Error("usage: required-gate.mjs REPORT.json");
const report = JSON.parse(await readFile(reportPath, "utf8"));
if (!requiredResult(report)) {
  console.error("required gate failed: selector or selected check did not succeed");
  process.exitCode = 1;
} else {
  console.log("required gate passed for the explicit selection");
}
