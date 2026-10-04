import { readFile } from "node:fs/promises";

import { summarize } from "./model.mjs";

const scenarios = JSON.parse(await readFile(new URL("./scenarios.json", import.meta.url), "utf8"));

for (const [name, events] of Object.entries(scenarios)) {
  console.log(`${name}: ${JSON.stringify(summarize(events))}`);
}
