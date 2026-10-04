import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const experimentDir = path.resolve(scriptDir, "..");
const root = path.resolve(experimentDir, "../..");
const buildRoot = path.join(root, ".next-perf050", "server", "app");
const blogRoot = path.join(buildRoot, "blog");
const rustRoot = path.join(buildRoot, "rust", "failures");
const resultsDir = path.join(experimentDir, "results");
const artifactsDir = path.join(experimentDir, "artifacts");
const workDir = path.join(experimentDir, "work");
const responseDir = path.join(artifactsDir, "responses");
const generator = path.join(experimentDir, "tools", "dictionary_generator");
const brotli = "/usr/bin/brotli";
const dictionarySizes = [65_536, 131_072];
const dcbMagic = Buffer.from([0xff, 0x44, 0x43, 0x42]);

for (const directory of [resultsDir, artifactsDir, workDir, responseDir]) {
  mkdirSync(directory, { recursive: true });
}

function sha256(data) {
  return createHash("sha256").update(data).digest("hex");
}

function sha256File(file) {
  return sha256(readFileSync(file));
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: options.encoding,
    input: options.input,
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const stderr = Buffer.isBuffer(result.stderr)
      ? result.stderr.toString("utf8")
      : result.stderr;
    throw new Error(
      `${command} exited ${result.status}: ${stderr || "no stderr"}`,
    );
  }
  return result;
}

function commandText(command, args) {
  return run(command, args, { encoding: "utf8" }).stdout.trim();
}

function directHtmlFiles(directory) {
  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".html"))
    .map((entry) => path.join(directory, entry.name))
    .sort();
}

function recursiveHtmlFiles(directory) {
  const files = [];
  const visit = (current) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else if (entry.isFile() && entry.name.endsWith(".html")) files.push(absolute);
    }
  };
  visit(directory);
  return files.sort();
}

function relativeBuildPath(file) {
  return path.relative(buildRoot, file).split(path.sep).join("/");
}

function pathRank(file) {
  return sha256(Buffer.from(relativeBuildPath(file)));
}

function routeRecord(file) {
  const body = readFileSync(file);
  return {
    path: relativeBuildPath(file),
    bytes: body.length,
    sha256: sha256(body),
    selectionSha256: pathRank(file),
  };
}

function writeLockedManifest(file, value) {
  const serialized = `${JSON.stringify(value, null, 2)}\n`;
  try {
    const previous = readFileSync(file, "utf8");
    if (previous !== serialized) {
      throw new Error(`fixed corpus changed: ${path.relative(root, file)}`);
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    writeFileSync(file, serialized);
  }
}

function sizeLabel(size) {
  return size === 65_536 ? "64" : "128";
}

function buildDictionary(output, size, samples) {
  const args = [
    "--sieve",
    "--slice_len=16",
    `--target_dict_len=${size}`,
    output,
    ...samples,
  ];
  const result = run(generator, args, { encoding: "utf8" });
  const generated = readFileSync(output);
  if (generated.length > size) {
    writeFileSync(output, generated.subarray(0, size));
  }
  const bytes = statSync(output).size;
  if (bytes === 0) {
    throw new Error(`invalid ${bytes}-byte dictionary at ${output}`);
  }
  return {
    generatedBytes: generated.length,
    bytes,
    cappedToRequestedSize: generated.length > size,
    log: result.stderr.trim(),
  };
}

function encodeBrotli(file, dictionary) {
  const args = ["-q", "11"];
  if (dictionary) args.push("-D", dictionary);
  args.push("-c", file);
  return run(brotli, args).stdout;
}

function encodeBufferBrotli(buffer) {
  return run(brotli, ["-q", "11", "-c"], { input: buffer }).stdout;
}

function createDcb(sharedBrotli, dictionary) {
  const dictionaryDigest = createHash("sha256").update(dictionary).digest();
  return Buffer.concat([dcbMagic, dictionaryDigest, sharedBrotli]);
}

function decodeDcb(dcb, dictionaryFile) {
  if (!dcb.subarray(0, 4).equals(dcbMagic)) {
    throw new Error("DCB magic mismatch");
  }
  const dictionary = readFileSync(dictionaryFile);
  const expectedHash = createHash("sha256").update(dictionary).digest();
  if (!dcb.subarray(4, 36).equals(expectedHash)) {
    throw new Error("DCB dictionary hash mismatch");
  }
  return run(brotli, ["-d", "-D", dictionaryFile, "-c"], {
    input: dcb.subarray(36),
  }).stdout;
}

function percentSmaller(candidate, control) {
  return ((control - candidate) / control) * 100;
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function round(value, places = 4) {
  const scale = 10 ** places;
  return Math.round(value * scale) / scale;
}

function summarizeRows(rows) {
  const savings = rows.map((row) => row.savingsPercent);
  return {
    documents: rows.length,
    controlBytes: rows.reduce((total, row) => total + row.brBytes, 0),
    dcbBytes: rows.reduce((total, row) => total + row.dcbBytes, 0),
    medianSavingsPercent: round(median(savings)),
    meanSavingsPercent: round(
      savings.reduce((total, value) => total + value, 0) / savings.length,
    ),
    minSavingsPercent: round(Math.min(...savings)),
    maxSavingsPercent: round(Math.max(...savings)),
    responsesLargerThanControl: rows.filter((row) => row.dcbBytes > row.brBytes)
      .map((row) => row.path),
    exactDecodeCount: rows.filter((row) => row.exactDecode).length,
  };
}

function journeyFor(rows, dictionaryAcquisitionBytes) {
  const journey = rows.slice(0, 3);
  const controlByPage = [];
  const candidateByPage = [];
  let control = 0;
  let candidate = dictionaryAcquisitionBytes;
  let repaidByPage = null;

  for (let index = 0; index < journey.length; index += 1) {
    control += journey[index].brBytes;
    candidate += index === 0 ? journey[index].brBytes : journey[index].dcbBytes;
    controlByPage.push(control);
    candidateByPage.push(candidate);
    if (repaidByPage === null && candidate <= control) repaidByPage = index + 1;
  }

  return {
    paths: journey.map((row) => row.path),
    dictionaryAcquisitionBytes,
    controlByPage,
    candidateByPage,
    page3SavingsPercent: round(percentSmaller(candidate, control)),
    repaidByPage,
  };
}

function descriptiveFullJourney(rows, dictionaryAcquisitionBytes) {
  let control = 0;
  let candidate = dictionaryAcquisitionBytes;
  let repaidByPage = null;

  for (let index = 0; index < rows.length; index += 1) {
    control += rows[index].brBytes;
    candidate += index === 0 ? rows[index].brBytes : rows[index].dcbBytes;
    if (repaidByPage === null && candidate <= control) repaidByPage = index + 1;
  }

  return {
    note: "post-gate descriptive result; does not alter the preregistered page-three decision",
    pages: rows.length,
    repaidByPage,
    controlBytes: control,
    candidateBytes: candidate,
    savingsPercent: round(percentSmaller(candidate, control)),
  };
}

if (!statSync(generator).isFile()) {
  throw new Error("build tools/dictionary_generator before running analysis");
}

const blogFiles = directHtmlFiles(blogRoot);
const manifest = blogFiles.map(routeRecord);
writeLockedManifest(path.join(resultsDir, "corpus-manifest.json"), manifest);

const rankedBlog = [...blogFiles].sort((a, b) =>
  pathRank(a).localeCompare(pathRank(b)),
);
const evaluationFiles = rankedBlog.slice(0, 24);
const trainingFiles = rankedBlog.slice(24);
if (evaluationFiles.length !== 24 || trainingFiles.length !== 253) {
  throw new Error(
    `expected 24 evaluation and 253 training docs, got ${evaluationFiles.length} and ${trainingFiles.length}`,
  );
}

const crossFamilyFiles = recursiveHtmlFiles(rustRoot)
  .sort((a, b) => pathRank(a).localeCompare(pathRank(b)))
  .slice(0, 3);

const baseline = new Map();
for (const file of evaluationFiles) {
  const encoded = encodeBrotli(file);
  baseline.set(file, encoded);
  const slug = path.basename(file, ".html");
  writeFileSync(path.join(responseDir, `${slug}.br`), encoded);
}

const fixed = {};
for (const size of dictionarySizes) {
  const label = sizeLabel(size);
  const dictionaryFile = path.join(artifactsDir, `blog-${label}.dict`);
  const dictionaryBuild = buildDictionary(dictionaryFile, size, trainingFiles);
  const dictionary = readFileSync(dictionaryFile);
  const dictionaryBr = encodeBufferBrotli(dictionary);
  writeFileSync(path.join(artifactsDir, `blog-${label}.dict.br`), dictionaryBr);
  const dictionarySha256 = sha256(dictionary);
  const rows = [];

  for (const file of evaluationFiles) {
    const sharedBrotli = encodeBrotli(file, dictionaryFile);
    const dcb = createDcb(sharedBrotli, dictionary);
    const decoded = decodeDcb(dcb, dictionaryFile);
    const source = readFileSync(file);
    const slug = path.basename(file, ".html");
    writeFileSync(path.join(responseDir, `${slug}.dcb-${label}`), dcb);
    rows.push({
      path: relativeBuildPath(file),
      rawBytes: source.length,
      brBytes: baseline.get(file).length,
      sharedBrotliBytes: sharedBrotli.length,
      dcbHeaderBytes: 36,
      dcbBytes: dcb.length,
      savingsPercent: round(percentSmaller(dcb.length, baseline.get(file).length)),
      sourceSha256: sha256(source),
      decodedSha256: sha256(decoded),
      exactDecode: source.equals(decoded),
    });
  }

  const summary = summarizeRows(rows);
  const journey = journeyFor(rows, dictionaryBr.length);
  const gates = {
    medianPrimedSavingsAtLeast40Percent: summary.medianSavingsPercent >= 40,
    noPrimedResponseLargerThanControl:
      summary.responsesLargerThanControl.length === 0,
    page3CumulativeSavingsAtLeast25Percent:
      journey.page3SavingsPercent >= 25,
    acquisitionRepaidByPage3:
      journey.repaidByPage !== null && journey.repaidByPage <= 3,
    everyDecodeByteExact: summary.exactDecodeCount === rows.length,
  };
  fixed[label] = {
    requestedDictionaryBytes: size,
    dictionaryBytes: dictionary.length,
    dictionaryBrotliBytes: dictionaryBr.length,
    dictionarySha256,
    availableDictionary: `:${Buffer.from(dictionarySha256, "hex").toString("base64")}:`,
    dictionaryBuild,
    summary,
    journey,
    descriptiveFullEvaluationJourney: descriptiveFullJourney(
      rows,
      dictionaryBr.length,
    ),
    gates,
    qualifiesArtifactEconomics: Object.values(gates).every(Boolean),
    rows,
  };
}

const leaveOneOut = {};
for (const size of dictionarySizes) {
  const label = sizeLabel(size);
  const rows = [];
  for (const heldOut of evaluationFiles) {
    const slug = path.basename(heldOut, ".html");
    const dictionaryFile = path.join(workDir, `loo-${label}-${slug}.dict`);
    const samples = evaluationFiles.filter((file) => file !== heldOut);
    const dictionaryBuild = buildDictionary(dictionaryFile, size, samples);
    const dictionary = readFileSync(dictionaryFile);
    const sharedBrotli = encodeBrotli(heldOut, dictionaryFile);
    const dcb = createDcb(sharedBrotli, dictionary);
    const decoded = decodeDcb(dcb, dictionaryFile);
    const source = readFileSync(heldOut);
    rows.push({
      path: relativeBuildPath(heldOut),
      dictionaryBytes: dictionary.length,
      dictionaryBuildLog: dictionaryBuild.log,
      brBytes: baseline.get(heldOut).length,
      dcbBytes: dcb.length,
      savingsPercent: round(
        percentSmaller(dcb.length, baseline.get(heldOut).length),
      ),
      exactDecode: source.equals(decoded),
    });
  }
  leaveOneOut[label] = {
    summary: summarizeRows(rows),
    rows,
  };
}

const qualifying = dictionarySizes
  .map(sizeLabel)
  .filter((label) => fixed[label].qualifiesArtifactEconomics);
const selectedDictionary = qualifying[0] ?? null;

const analysis = {
  experiment: "PERF-054",
  generatedAt: new Date().toISOString(),
  protocolLockedBeforeMeasurements: true,
  sourceBuild: ".next-perf050",
  toolchain: {
    generatorCommit: "09e1ac6c7eea9d3b53f85bcdde6347358dbe1281",
    generatorSourceSha256:
      "414477886aa1cac94a2f665be682808c0abe1fadb83b72bca8ebd44faf444353",
    sieveSourceSha256:
      "cd8a3a4c3198672b2c4b284a3f97dd1d2e98ccd65c6f75b48b54831e7b48aa1a",
    generatorBinarySha256: sha256File(generator),
    generatorMode: "sieve",
    generatorSliceBytes: 16,
    compiler: commandText("g++", ["--version"]).split("\n")[0],
    brotliVersion: commandText(brotli, ["--version"]),
    brotliBinarySha256: sha256File(brotli),
    brotliQuality: 11,
  },
  corpus: {
    eligibleBlogDocuments: blogFiles.length,
    eligibleRawBytes: manifest.reduce((total, item) => total + item.bytes, 0),
    evaluationDocuments: evaluationFiles.map(relativeBuildPath),
    trainingDocuments: trainingFiles.length,
    crossFamilyNegativeControls: crossFamilyFiles.map(relativeBuildPath),
    manifest: "results/corpus-manifest.json",
  },
  fixed,
  leaveOneOut,
  selectedDictionary,
  browserEligible: selectedDictionary !== null,
  decision: selectedDictionary
    ? `advance dcb-${selectedDictionary} to protocol-router and HTTPS browser validation`
    : "reject before browser timing because no fixed dictionary passed every artifact gate",
};

writeFileSync(
  path.join(resultsDir, "analysis.json"),
  `${JSON.stringify(analysis, null, 2)}\n`,
);

console.log(
  JSON.stringify(
    {
      fixed64: fixed["64"].summary,
      journey64: fixed["64"].journey,
      fixed128: fixed["128"].summary,
      journey128: fixed["128"].journey,
      selectedDictionary,
      decision: analysis.decision,
    },
    null,
    2,
  ),
);
