import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const workflowPath = new URL("../.github/workflows/docker.yml", import.meta.url);
const dockerfilePath = new URL("../Dockerfile", import.meta.url);
const composePath = new URL("../docker-compose.yml", import.meta.url);
const packagePath = new URL("../package.json", import.meta.url);
const gitignorePath = new URL("../.gitignore", import.meta.url);
const tsconfigPath = new URL("../tsconfig.json", import.meta.url);

test("scheduled builds cannot reuse a time-stale Next.js layer", async () => {
  const [workflow, dockerfile] = await Promise.all([
    readFile(workflowPath, "utf8"),
    readFile(dockerfilePath, "utf8"),
  ]);

  assert.match(workflow, /PUBLICATION_BUILD_ID=\$\{\{ github\.run_id \}\}/);
  const argumentPosition = dockerfile.indexOf("ARG PUBLICATION_BUILD_ID");
  const buildPosition = dockerfile.indexOf("RUN yarn build");
  assert.ok(argumentPosition > -1 && argumentPosition < buildPosition);
});

test("production deployments are serialized and identify an immutable image", async () => {
  const [workflow, compose] = await Promise.all([
    readFile(workflowPath, "utf8"),
    readFile(composePath, "utf8"),
  ]);

  assert.match(workflow, /group: production-site-deployment/);
  assert.match(workflow, /cancel-in-progress: false/);
  assert.match(
    workflow,
    /mast2133\/mehdicz-site:\$\{\{ github\.sha \}\}-\$\{\{ github\.run_id \}\}-\$\{\{ github\.run_attempt \}\}/
  );
  assert.match(workflow, /docker pull "\$DEPLOY_IMAGE"/);
  assert.match(workflow, /--wait --wait-timeout 120/);
  assert.doesNotMatch(workflow, /code-playground/);
  assert.match(compose, /image: mast2133\/mehdicz-site:latest/);
});

test("an overdue campaign action makes the scheduled workflow visible as a failure", async () => {
  const workflow = await readFile(workflowPath, "utf8");

  assert.match(workflow, /steps\.publication\.outputs\.overdue == 'true'/);
  assert.match(workflow, /Fail on overdue campaign work/);
  assert.match(workflow, /steps\.publication\.outputs\.check_failed == 'true'/);
});

test("every production build runs both campaign audit and safety tests", async () => {
  const packageJson = JSON.parse(await readFile(packagePath, "utf8"));
  const build = packageJson.scripts.build;

  assert.match(packageJson.scripts.prebuild, /audit-authority-campaign/);
  assert.match(build, /^yarn prebuild &&/);

  // The safety suite reads generated output such as public/search.json, so it
  // runs after the content build and before Next.js builds the site.
  const contentBuild = build.indexOf("contentlayer2 build");
  const safetyTests = build.indexOf("yarn test:publication");
  const nextBuild = build.indexOf("next build");
  assert.ok(contentBuild >= 0 && contentBuild < safetyTests && safetyTests < nextBuild);
});

test("production content generation cannot expose preview-only search entries", async () => {
  const packageJson = JSON.parse(await readFile(packagePath, "utf8"));

  assert.match(packageJson.scripts.build, /NODE_ENV=production[^&]*contentlayer2 build/);
  assert.match(packageJson.scripts.analyze, /NODE_ENV=production[^&]*contentlayer2 build/);
});

test("production keeps the measured webpack bridge and Flight regression gate", async () => {
  const packageJson = JSON.parse(await readFile(packagePath, "utf8"));

  assert.match(packageJson.scripts.build, /next build --webpack/);
  assert.match(packageJson.scripts.build, /performance:flight:build/);
});

test("container installs include the Yarn configuration and reviewed package patches", async () => {
  const [dockerfile, packageSource, gitignore] = await Promise.all([
    readFile(dockerfilePath, "utf8"),
    readFile(packagePath, "utf8"),
    readFile(gitignorePath, "utf8"),
  ]);
  const patchCopyPosition = dockerfile.indexOf("COPY .yarn/patches ./.yarn/patches");
  const installPosition = dockerfile.indexOf("RUN yarn install --immutable");
  const patchFiles = [
    ...new Set(
      [...packageSource.matchAll(/\.yarn\/patches\/([A-Za-z0-9.-]+\.patch)/g)].map(
        (match) => match[1]
      )
    ),
  ];

  assert.match(dockerfile, /COPY package\.json yarn\.lock \.yarnrc\.yml \.\//);
  assert.ok(patchCopyPosition > -1 && patchCopyPosition < installPosition);
  assert.match(gitignore, /^!\/\.yarn\/patches\/$/m);
  assert.ok(patchFiles.length > 0, "the package manifest must name the reviewed patches");
  for (const patchFile of patchFiles) {
    await access(new URL(`../.yarn/patches/${patchFile}`, import.meta.url));
  }
});

test("production runner includes local modules required by Next config", async () => {
  const [dockerfile, nextConfig] = await Promise.all([
    readFile(dockerfilePath, "utf8"),
    readFile(new URL("../next.config.js", import.meta.url), "utf8"),
  ]);

  assert.match(nextConfig, /require\("\.\/lib\/next-supported-browser-polyfills-webpack\.js"\)/);
  assert.match(
    dockerfile,
    /COPY --from=build \/app\/lib\/next-supported-browser-polyfills-webpack\.js \.\/lib\//
  );
  assert.match(
    dockerfile,
    /COPY --from=build \/app\/lib\/next-supported-browser-polyfills\.js \.\/lib\//
  );
});

test("production TypeScript gate excludes intentionally invalid research fixtures", async () => {
  const tsconfig = JSON.parse(await readFile(tsconfigPath, "utf8"));

  assert.ok(tsconfig.exclude.includes("experiments"));
  assert.ok(tsconfig.include.includes("app") || tsconfig.include.includes("**/*.tsx"));
});

test("the code playground and its backend service are gone", async () => {
  const compose = await readFile(composePath, "utf8");

  assert.doesNotMatch(compose, /code-playground|PLAYGROUND_/);
  await assert.rejects(access(new URL("../app/api/playground", import.meta.url)));
  await assert.rejects(access(new URL("../js_go_rust_playground", import.meta.url)));
});

test("the analytics script asks Umami for Web Vitals and still loads after the page", async () => {
  const rootDocument = await readFile(new URL("../app/root-document.tsx", import.meta.url), "utf8");

  assert.match(rootDocument, /data-performance="true"/);
  assert.match(rootDocument, /strategy="lazyOnload"/);
});
