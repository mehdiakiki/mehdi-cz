import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { articleStyleRequirements } from "../lib/article-style-requirements.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("compiled MDX markers select only the styles that will be rendered", () => {
  assert.deepEqual(
    articleStyleRequirements(
      '(0,x.jsx)(a.code,{className:"language-rust code-highlight"});' +
        '(0,x.jsx)(a.span,{className:"katex"})'
    ),
    { prism: true, katex: true }
  );
  assert.deepEqual(articleStyleRequirements("ordinary prose"), { prism: false, katex: false });
  assert.deepEqual(articleStyleRequirements(null), { prism: false, katex: false });
});

test("content-addressed article style assets match their sources and manifest", () => {
  const result = spawnSync(
    process.execPath,
    ["scripts/generate-article-style-assets.mjs", "--check"],
    { cwd: repositoryRoot, encoding: "utf8" }
  );

  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /Article style assets verified \(20 WOFF2 fonts\)\./);
});
