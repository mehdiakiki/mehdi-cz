import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { brotliCompressSync, gzipSync } from "node:zlib";
import postcss from "postcss";
import selectorParser from "postcss-selector-parser";
import tailwind from "@tailwindcss/postcss";

const root = process.cwd();
const experiment = path.join(root, "experiments", "route-css-graph");
const sourcesDir = path.join(experiment, "sources");
const resultsDir = path.join(experiment, "results");
const familyNames = ["core", "writing", "rust", "editor"];
const codeExtensions = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".mts", ".mdx"];

async function walk(directory, predicate = () => true) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(absolute, predicate)));
    else if (predicate(absolute)) files.push(absolute);
  }
  return files;
}

const codeFiles = (
  await Promise.all(
    ["app", "components", "layouts", "lib", "data"].map(async (directory) => {
      const absolute = path.join(root, directory);
      try {
        return await walk(absolute, (file) => codeExtensions.includes(path.extname(file)));
      } catch {
        return [];
      }
    })
  )
).flat();
const codeFileSet = new Set(codeFiles);

function resolveImport(importer, specifier) {
  let base;
  if (specifier.startsWith("@/")) base = path.join(root, specifier.slice(2));
  else if (specifier.startsWith(".")) base = path.resolve(path.dirname(importer), specifier);
  else return null;

  const candidates = [
    base,
    ...codeExtensions.map((extension) => `${base}${extension}`),
    ...codeExtensions.map((extension) => path.join(base, `index${extension}`)),
  ];
  return candidates.find((candidate) => codeFileSet.has(candidate)) ?? null;
}

const importPattern =
  /(?:import|export)\s+(?:[\s\S]*?\s+from\s+)?["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)|require\(\s*["']([^"']+)["']\s*\)/g;
const dependencies = new Map();
const contents = new Map();
for (const file of codeFiles) {
  const content = await readFile(file, "utf8");
  contents.set(file, content);
  const resolved = new Set();
  for (const match of content.matchAll(importPattern)) {
    const dependency = resolveImport(file, match[1] ?? match[2] ?? match[3]);
    if (dependency) resolved.add(dependency);
  }
  dependencies.set(file, resolved);
}

const relative = (file) => path.relative(root, file).split(path.sep).join("/");
const appFiles = codeFiles.filter((file) => relative(file).startsWith("app/"));
const roots = {
  writing: appFiles.filter((file) => relative(file).startsWith("app/(site)/blog/")),
  rust: appFiles.filter((file) =>
    /^(?:app\/\(site\)\/rust(?:\/|\.)|app\/\(site\)\/rust-failure-atlas\/)/.test(relative(file))
  ),
  editor: appFiles.filter((file) => relative(file).startsWith("app/editor/")),
};
const familyRootSet = new Set([...roots.writing, ...roots.rust, ...roots.editor]);
roots.core = appFiles.filter((file) => !familyRootSet.has(file));

function reachableFrom(entrypoints) {
  const reached = new Set();
  const stack = [...entrypoints];
  while (stack.length) {
    const file = stack.pop();
    if (!file || reached.has(file)) continue;
    reached.add(file);
    stack.push(...(dependencies.get(file) ?? []));
  }
  return reached;
}

const reachable = Object.fromEntries(
  familyNames.map((family) => [family, reachableFrom(roots[family])])
);
const sourceOwners = new Map();
for (const file of codeFiles) {
  const owners = familyNames.filter((family) => reachable[family].has(file));
  const filePath = relative(file);
  if (filePath.startsWith("data/blog/") && filePath.endsWith(".mdx")) {
    sourceOwners.set(file, "writing");
  } else if (filePath.startsWith("data/rust-failures/") && filePath.endsWith(".mdx")) {
    sourceOwners.set(file, "rust");
  } else if (owners.length === 1) {
    sourceOwners.set(file, owners[0]);
  } else {
    // Shared, unreachable, or ambiguous sources stay in the conservative core.
    sourceOwners.set(file, "core");
  }
}

const tailwindInput = await readFile(path.join(root, "css", "tailwind.css"), "utf8");
const compiled = await postcss([tailwind({ base: root, optimize: { minify: true } })]).process(
  tailwindInput,
  {
    from: path.join(root, "css", "tailwind.css"),
    map: false,
  }
);
const compiledRoot = postcss.parse(compiled.css);

const classNames = new Set();
compiledRoot.walkRules((rule) => {
  try {
    selectorParser((selectors) =>
      selectors.walkClasses((classNode) => classNames.add(classNode.value))
    ).processSync(rule.selector);
  } catch {
    // Invalid or non-selector syntax is kept in core below.
  }
});

const ownerText = Object.fromEntries(familyNames.map((family) => [family, ""]));
for (const [file, owner] of sourceOwners) ownerText[owner] += `\n${contents.get(file)}`;
const classOwners = new Map();
for (const className of classNames) {
  const owners = familyNames.filter((family) => ownerText[family].includes(className));
  classOwners.set(className, owners);
}

function ruleOwner(rule) {
  const classes = [];
  try {
    selectorParser((selectors) =>
      selectors.walkClasses((classNode) => classes.push(classNode.value))
    ).processSync(rule.selector);
  } catch {
    return "core";
  }
  if (classes.length === 0) return "core";

  const owners = new Set();
  for (const className of classes) {
    const matches = classOwners.get(className) ?? [];
    if (matches.length !== 1 || matches[0] === "core") return "core";
    owners.add(matches[0]);
  }
  return owners.size === 1 ? [...owners][0] : "core";
}

function filteredClone(node, family) {
  if (node.type === "rule") return ruleOwner(node) === family ? node.clone() : null;
  if (!node.nodes) return family === "core" ? node.clone() : null;

  const clone = node.clone({ nodes: [] });
  for (const child of node.nodes) {
    const filtered = filteredClone(child, family);
    if (filtered) clone.append(filtered);
  }
  return clone.nodes.length ? clone : null;
}

function leafSignatures(cssRoot) {
  const signatures = [];
  cssRoot.walk((node) => {
    if (node.type === "rule" || (node.type === "atrule" && !node.nodes)) {
      signatures.push(`${node.type}:${node.toString()}`);
    }
  });
  return signatures.sort();
}

await mkdir(sourcesDir, { recursive: true });
await mkdir(resultsDir, { recursive: true });
const generated = {};
const generatedRoots = [];
for (const family of familyNames) {
  const outputRoot = postcss.root();
  for (const node of compiledRoot.nodes) {
    const filtered = filteredClone(node, family);
    if (filtered) outputRoot.append(filtered);
  }
  const css = outputRoot.toString();
  const file = path.join(sourcesDir, `${family}.css`);
  await writeFile(file, css);
  generatedRoots.push(outputRoot);
  generated[family] = {
    file: relative(file),
    rawBytes: Buffer.byteLength(css),
    gzipBytes: gzipSync(css, { level: 9 }).length,
    brotliBytes: brotliCompressSync(css).length,
    sha256: createHash("sha256").update(css).digest("hex"),
    ruleCount: (() => {
      let count = 0;
      outputRoot.walkRules(() => (count += 1));
      return count;
    })(),
  };
}

const inputLeaves = leafSignatures(compiledRoot);
const outputLeaves = generatedRoots.flatMap(leafSignatures).sort();
const sourceCounts = Object.fromEntries(
  familyNames.map((family) => [
    family,
    [...sourceOwners.values()].filter((owner) => owner === family).length,
  ])
);
const classCounts = Object.fromEntries(
  familyNames.map((family) => [
    family,
    [...classOwners.values()].filter((owners) => owners.length === 1 && owners[0] === family)
      .length,
  ])
);
const result = {
  capturedAt: new Date().toISOString(),
  method:
    "Static import reachability assigns source files. Rules unique to one route family move there; shared, ambiguous, structural, custom-property, and animation rules remain in core.",
  sourceCounts,
  classCounts,
  input: {
    rawBytes: Buffer.byteLength(compiled.css),
    gzipBytes: gzipSync(compiled.css, { level: 9 }).length,
    brotliBytes: brotliCompressSync(compiled.css).length,
    sha256: createHash("sha256").update(compiled.css).digest("hex"),
    leafCount: inputLeaves.length,
  },
  generated,
  partition: {
    outputLeafCount: outputLeaves.length,
    exactLeafMultiset: JSON.stringify(inputLeaves) === JSON.stringify(outputLeaves),
  },
};
await writeFile(
  path.join(resultsDir, "source-generation.json"),
  `${JSON.stringify(result, null, 2)}\n`
);
console.log(JSON.stringify(result, null, 2));

if (!result.partition.exactLeafMultiset) {
  throw new Error("Generated CSS does not preserve the compiled leaf-node multiset");
}
