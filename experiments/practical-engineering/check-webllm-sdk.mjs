import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { CreateMLCEngine, prebuiltAppConfig } from "@mlc-ai/web-llm";
import { MODEL_ID } from "./tagging.ts";

const metadata = JSON.parse(
  await readFile(new URL("./node_modules/@mlc-ai/web-llm/package.json", import.meta.url), "utf8")
);
assert.equal(metadata.version, "0.2.85");
assert.equal(typeof CreateMLCEngine, "function");
const record = prebuiltAppConfig.model_list.find((model) => model.model_id === MODEL_ID);
assert.ok(record, `Pinned SDK catalog is missing ${MODEL_ID}`);
assert.ok(record.model.startsWith("https://"));
assert.ok(record.model_lib.startsWith("https://"));
console.log(
  `Verified SDK ${metadata.version}, factory export, and catalog entry ${MODEL_ID}; no model or GPU initialized.`
);
