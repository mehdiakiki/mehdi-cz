import { readFile } from "node:fs/promises";
import { selectAffected } from "./affected-tests.mjs";

const [graphPath, changesPath] = process.argv.slice(2);
if (!graphPath || !changesPath)
  throw new Error("usage: select-affected.mjs GRAPH.json CHANGED.json");
const graph = JSON.parse(await readFile(graphPath, "utf8"));
const changed = JSON.parse(await readFile(changesPath, "utf8"));
console.log(JSON.stringify(selectAffected(graph, changed), null, 2));
