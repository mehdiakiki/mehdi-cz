import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { rustFailureEvidenceCases } from "../data/rust-failure-evidence.mjs";

const repositoryRoot = path.resolve(import.meta.dirname, "..");
const temporaryRoot = mkdtempSync(path.join(tmpdir(), "rust-failure-evidence-"));
const fromArgument = process.argv.indexOf("--from");
const fromCaseId = fromArgument === -1 ? null : process.argv[fromArgument + 1];
const onlyArgument = process.argv.indexOf("--only");
const onlyCaseId = onlyArgument === -1 ? null : process.argv[onlyArgument + 1];

if (fromArgument !== -1 && !fromCaseId) {
  throw new Error("--from requires a case ID such as RFA-603");
}
if (onlyArgument !== -1 && !onlyCaseId) {
  throw new Error("--only requires a case ID such as RFA-031");
}
if (fromCaseId && onlyCaseId) {
  throw new Error("pass either --from or --only, not both");
}

const firstEvidenceIndex = fromCaseId
  ? rustFailureEvidenceCases.findIndex((evidence) => evidence.id === fromCaseId)
  : 0;

if (firstEvidenceIndex === -1) {
  throw new Error(`unknown --from case ID ${JSON.stringify(fromCaseId)}`);
}

const selectedEvidenceCases = onlyCaseId
  ? rustFailureEvidenceCases.filter((evidence) => evidence.id === onlyCaseId)
  : rustFailureEvidenceCases.slice(firstEvidenceIndex);

if (onlyCaseId && selectedEvidenceCases.length === 0) {
  throw new Error(`unknown --only case ID ${JSON.stringify(onlyCaseId)}`);
}

function run(
  command,
  arguments_,
  {
    cwd = repositoryRoot,
    environment: environmentOverrides = {},
    unsetEnvironment = [],
    timeout,
  } = {}
) {
  const environment = { ...process.env, ...environmentOverrides, LC_ALL: "C" };
  for (const name of unsetEnvironment) delete environment[name];

  return spawnSync(command, arguments_, {
    cwd,
    encoding: "utf8",
    env: environment,
    timeout,
  });
}

try {
  for (const evidence of selectedEvidenceCases) {
    const runner = evidence.runner || "rustc";
    const runOptions = { unsetEnvironment: evidence.unsetEnvironment };
    const fixtureRoot = path.join(
      repositoryRoot,
      "public",
      "rust-failure-atlas",
      "evidence",
      evidence.id
    );
    const failurePath = path.join(fixtureRoot, evidence.failureFile);
    const repairedPath = path.join(fixtureRoot, evidence.repairedFile);

    if (!existsSync(failurePath) || !existsSync(repairedPath)) {
      throw new Error(`${evidence.id}: evidence fixture is incomplete`);
    }

    const version = run("rustc", [`+${evidence.toolchain}`, "--version"], runOptions);
    if (version.status !== 0 || !version.stdout.includes(`rustc ${evidence.toolchain}`)) {
      throw new Error(
        `${evidence.id}: rustc ${evidence.toolchain} is unavailable\n${version.stderr}`
      );
    }

    let failure;
    let repaired;

    if (
      runner === "cargo" ||
      runner === "cargo-rebuild" ||
      runner === "cargo-runtime-env" ||
      runner === "cargo-package" ||
      runner === "cargo-profile-pair" ||
      runner === "cargo-test-surfaces" ||
      runner === "cargo-suite-isolation" ||
      runner === "cargo-subprocess"
    ) {
      if (!evidence.failureManifest || !evidence.repairedManifest) {
        throw new Error(`${evidence.id}: Cargo evidence is missing a manifest path`);
      }

      const copiedFixtureRoot = path.join(temporaryRoot, evidence.id, "fixture");
      cpSync(fixtureRoot, copiedFixtureRoot, { recursive: true });
      const failureManifest = path.join(copiedFixtureRoot, evidence.failureManifest);
      const repairedManifest = path.join(copiedFixtureRoot, evidence.repairedManifest);
      if (!existsSync(failureManifest) || !existsSync(repairedManifest)) {
        throw new Error(`${evidence.id}: Cargo evidence manifest is missing`);
      }
      const failureCargoConfig = evidence.failureCargoConfig
        ? path.join(copiedFixtureRoot, evidence.failureCargoConfig)
        : undefined;
      const repairedCargoConfig = evidence.repairedCargoConfig
        ? path.join(copiedFixtureRoot, evidence.repairedCargoConfig)
        : undefined;
      if (
        (failureCargoConfig && !existsSync(failureCargoConfig)) ||
        (repairedCargoConfig && !existsSync(repairedCargoConfig))
      ) {
        throw new Error(`${evidence.id}: Cargo evidence configuration is missing`);
      }

      if (runner === "cargo-subprocess") {
        const buildAndRunSubprocess = (
          manifest,
          targetDirectory,
          binaryName,
          timeoutMs,
          expectTimeout
        ) => {
          if (!binaryName || !timeoutMs) {
            throw new Error(`${evidence.id}: subprocess evidence is missing execution controls`);
          }

          const built = run(
            "cargo",
            [
              `+${evidence.toolchain}`,
              "build",
              "--quiet",
              "--manifest-path",
              manifest,
              "--target-dir",
              targetDirectory,
              "--offline",
              "--locked",
              "--color",
              "never",
            ],
            runOptions
          );
          const executed =
            built.status === 0
              ? run(path.join(targetDirectory, "debug", binaryName), [], {
                  ...runOptions,
                  timeout: timeoutMs,
                })
              : { status: 2, stdout: "", stderr: "", error: undefined };
          const timedOut = executed.error?.code === "ETIMEDOUT";
          const verified = built.status === 0 && (expectTimeout ? timedOut : executed.status === 0);
          const processState = timedOut
            ? "timed out"
            : executed.status === 0
              ? "completed"
              : "failed";
          const label = expectTimeout ? "failure" : "repaired";

          return {
            status: verified ? (expectTimeout ? 1 : 0) : 2,
            stdout: `${label} process: ${processState}\n${executed.stdout || ""}`,
            stderr: `${built.stderr || ""}\n${executed.stderr || ""}\n${executed.error?.message || ""}`,
          };
        };

        failure = buildAndRunSubprocess(
          failureManifest,
          path.join(temporaryRoot, `${evidence.id}-failure-target`),
          evidence.binaryNameFailure,
          evidence.failureTimeoutMs,
          true
        );
        repaired = buildAndRunSubprocess(
          repairedManifest,
          path.join(temporaryRoot, `${evidence.id}-repaired-target`),
          evidence.binaryNameRepaired,
          evidence.repairedTimeoutMs,
          false
        );
      } else if (runner === "cargo-suite-isolation") {
        const runSuiteIsolation = (manifest, targetDirectory, expectFullSuiteSuccess) => {
          const filters = evidence.isolatedTestFilters;
          const timeoutMs = evidence.suiteTimeoutMs;
          if (!filters || filters.length < 2 || !timeoutMs) {
            throw new Error(
              `${evidence.id}: suite-isolation evidence is missing its test controls`
            );
          }

          const commonArguments = [
            `+${evidence.toolchain}`,
            "test",
            "--quiet",
            "--manifest-path",
            manifest,
            "--target-dir",
            targetDirectory,
            "--offline",
            "--color",
            "never",
          ];
          const isolated = filters.map((filter) =>
            run("cargo", [...commonArguments, filter, "--", "--test-threads=1"], runOptions)
          );
          const fullSuite = run("cargo", [...commonArguments, "--", "--test-threads=1"], {
            ...runOptions,
            timeout: timeoutMs,
          });
          const isolatedPassed = isolated.every((result) => result.status === 0);
          const fullSuiteTimedOut = fullSuite.error?.code === "ETIMEDOUT";
          const verified =
            isolatedPassed && (expectFullSuiteSuccess ? fullSuite.status === 0 : fullSuiteTimedOut);
          const fullSuiteState = fullSuiteTimedOut
            ? "timed out"
            : fullSuite.status === 0
              ? "passed"
              : "failed";

          return {
            status: verified ? (expectFullSuiteSuccess ? 0 : 1) : 2,
            stdout: `isolated tests: ${isolatedPassed ? "passed" : "failed"}\nfull suite: ${fullSuiteState}\n${fullSuite.stdout || ""}`,
            stderr: `${isolated.map((result) => result.stderr || "").join("\n")}\n${fullSuite.stderr || ""}\n${fullSuite.error?.message || ""}`,
          };
        };

        failure = runSuiteIsolation(
          failureManifest,
          path.join(temporaryRoot, `${evidence.id}-failure-target`),
          false
        );
        repaired = runSuiteIsolation(
          repairedManifest,
          path.join(temporaryRoot, `${evidence.id}-repaired-target`),
          true
        );
      } else if (runner === "cargo-package") {
        const runPackageBoundary = (manifest, targetDirectory, expectPackageSuccess) => {
          const commonArguments = [
            `+${evidence.toolchain}`,
            "--manifest-path",
            manifest,
            "--target-dir",
            targetDirectory,
            "--offline",
            "--color",
            "never",
          ];
          const localCheck = run(
            "cargo",
            [commonArguments[0], "check", ...commonArguments.slice(1)],
            runOptions
          );
          const packaged = run(
            "cargo",
            [commonArguments[0], "package", ...commonArguments.slice(1), "--allow-dirty"],
            runOptions
          );
          const verified =
            localCheck.status === 0 &&
            (expectPackageSuccess ? packaged.status === 0 : packaged.status !== 0);

          return {
            status: verified ? (expectPackageSuccess ? 0 : 1) : 2,
            stdout: `local checkout check: ${localCheck.status === 0 ? "passed" : "failed"}\npackage verification: ${packaged.status === 0 ? "passed" : "failed"}\n${packaged.stdout || ""}`,
            stderr: `${localCheck.stderr || ""}\n${packaged.stderr || ""}`,
          };
        };

        failure = runPackageBoundary(
          failureManifest,
          path.join(temporaryRoot, `${evidence.id}-failure-target`),
          false
        );
        repaired = runPackageBoundary(
          repairedManifest,
          path.join(temporaryRoot, `${evidence.id}-repaired-target`),
          true
        );
      } else if (runner === "cargo-profile-pair") {
        const runProfilePair = (manifest, targetDirectory, expectSameResult) => {
          const commonArguments = [
            `+${evidence.toolchain}`,
            "run",
            "--quiet",
            "--manifest-path",
            manifest,
            "--target-dir",
            targetDirectory,
            "--offline",
            "--color",
            "never",
          ];
          const development = run("cargo", commonArguments, runOptions);
          const release = run(
            "cargo",
            [...commonArguments.slice(0, 3), "--release", ...commonArguments.slice(3)],
            runOptions
          );
          const developmentOutput = development.stdout.trim();
          const releaseOutput = release.stdout.trim();
          const sameResult =
            development.status === 0 && release.status === 0 && developmentOutput === releaseOutput;
          const expectedDivergence = development.status !== 0 && release.status === 0;
          const verified = expectSameResult ? sameResult : expectedDivergence;

          return {
            status: verified ? (expectSameResult ? 0 : 1) : 2,
            stdout: `development profile status: ${development.status}\ndevelopment profile output: ${developmentOutput}\nrelease profile status: ${release.status}\nrelease profile output: ${releaseOutput}`,
            stderr: `${development.stderr || ""}\n${release.stderr || ""}`,
          };
        };

        failure = runProfilePair(
          failureManifest,
          path.join(temporaryRoot, `${evidence.id}-failure-target`),
          false
        );
        repaired = runProfilePair(
          repairedManifest,
          path.join(temporaryRoot, `${evidence.id}-repaired-target`),
          true
        );
      } else if (runner === "cargo-test-surfaces") {
        const runTestSurfaces = (manifest, targetDirectory, expectDoctestSuccess) => {
          const commonArguments = [
            `+${evidence.toolchain}`,
            "test",
            "--quiet",
            "--manifest-path",
            manifest,
            "--target-dir",
            targetDirectory,
            "--offline",
            "--color",
            "never",
          ];
          const unit = run(
            "cargo",
            [...commonArguments.slice(0, 3), "--lib", ...commonArguments.slice(3)],
            runOptions
          );
          const documentation = run(
            "cargo",
            [...commonArguments.slice(0, 3), "--doc", ...commonArguments.slice(3)],
            runOptions
          );
          const verified =
            unit.status === 0 &&
            (expectDoctestSuccess ? documentation.status === 0 : documentation.status !== 0);

          return {
            status: verified ? (expectDoctestSuccess ? 0 : 1) : 2,
            stdout: `unit tests: ${unit.status === 0 ? "passed" : "failed"}\ndocumentation tests: ${documentation.status === 0 ? "passed" : "failed"}\n${documentation.stdout || ""}`,
            stderr: `${unit.stderr || ""}\n${documentation.stderr || ""}`,
          };
        };

        failure = runTestSurfaces(
          failureManifest,
          path.join(temporaryRoot, `${evidence.id}-failure-target`),
          false
        );
        repaired = runTestSurfaces(
          repairedManifest,
          path.join(temporaryRoot, `${evidence.id}-repaired-target`),
          true
        );
      } else if (runner === "cargo-rebuild") {
        const trackedEnvironment = evidence.trackedEnvironment;
        const firstValue = evidence.firstEnvironmentValue;
        const secondValue = evidence.secondEnvironmentValue;
        if (!trackedEnvironment || !firstValue || !secondValue) {
          throw new Error(`${evidence.id}: Cargo rebuild evidence is missing environment steps`);
        }

        const runRebuildPair = (manifest, targetDirectory, expectTrackedRebuild) => {
          const cargoArguments = [
            `+${evidence.toolchain}`,
            "run",
            "--quiet",
            "--manifest-path",
            manifest,
            "--target-dir",
            targetDirectory,
            "--offline",
            "--color",
            "never",
          ];
          const first = run("cargo", cargoArguments, {
            ...runOptions,
            environment: { [trackedEnvironment]: firstValue },
          });
          const second = run("cargo", cargoArguments, {
            ...runOptions,
            environment: { [trackedEnvironment]: secondValue },
          });
          const firstOutput = first.stdout.trim();
          const secondOutput = second.stdout.trim();
          const expectedFirst = `mode=${firstValue}`;
          const expectedSecond = `mode=${expectTrackedRebuild ? secondValue : firstValue}`;
          const commandsSucceeded = first.status === 0 && second.status === 0;
          const outputsMatch = firstOutput === expectedFirst && secondOutput === expectedSecond;

          return {
            status: expectTrackedRebuild
              ? commandsSucceeded && outputsMatch
                ? 0
                : 1
              : commandsSucceeded && outputsMatch
                ? 1
                : 2,
            stdout: `first output: ${firstOutput}\nsecond output: ${secondOutput}`,
            stderr: `${first.stderr || ""}\n${second.stderr || ""}`,
          };
        };

        failure = runRebuildPair(
          failureManifest,
          path.join(temporaryRoot, `${evidence.id}-failure-target`),
          false
        );
        repaired = runRebuildPair(
          repairedManifest,
          path.join(temporaryRoot, `${evidence.id}-repaired-target`),
          true
        );
      } else if (runner === "cargo-runtime-env") {
        const runEnvironmentBoundary = (manifest, targetDirectory, binaryName, expectSame) => {
          if (!binaryName) {
            throw new Error(`${evidence.id}: Cargo runtime evidence is missing a binary name`);
          }

          const commonArguments = [
            `+${evidence.toolchain}`,
            "--manifest-path",
            manifest,
            "--target-dir",
            targetDirectory,
            "--offline",
            "--color",
            "never",
          ];
          const built = run(
            "cargo",
            [commonArguments[0], "build", ...commonArguments.slice(1)],
            runOptions
          );
          const throughCargo = run(
            "cargo",
            [commonArguments[0], "run", "--quiet", ...commonArguments.slice(1)],
            runOptions
          );
          const directly = run(path.join(targetDirectory, "debug", binaryName), [], runOptions);
          const cargoOutput = throughCargo.stdout.trim();
          const directOutput = directly.stdout.trim();
          const commandsSucceeded =
            built.status === 0 && throughCargo.status === 0 && directly.status === 0;
          const outputsSame = cargoOutput === directOutput;
          const verified = commandsSucceeded && (expectSame ? outputsSame : !outputsSame);

          return {
            status: verified ? (expectSame ? 0 : 1) : 2,
            stdout: `cargo output: ${cargoOutput}\ndirect output: ${directOutput}`,
            stderr: `${built.stderr || ""}\n${throughCargo.stderr || ""}\n${directly.stderr || ""}`,
          };
        };

        failure = runEnvironmentBoundary(
          failureManifest,
          path.join(temporaryRoot, `${evidence.id}-failure-target`),
          evidence.binaryNameFailure,
          false
        );
        repaired = runEnvironmentBoundary(
          repairedManifest,
          path.join(temporaryRoot, `${evidence.id}-repaired-target`),
          evidence.binaryNameRepaired,
          true
        );
      } else {
        failure = run(
          "cargo",
          [
            `+${evidence.toolchain}`,
            evidence.failureAction || "check",
            "--manifest-path",
            failureManifest,
            "--target-dir",
            path.join(temporaryRoot, `${evidence.id}-failure-target`),
            "--offline",
            "--color",
            "never",
            ...(failureCargoConfig ? ["--config", failureCargoConfig] : []),
            ...(evidence.locked ? ["--locked"] : []),
          ],
          runOptions
        );
        repaired = run(
          "cargo",
          [
            `+${evidence.toolchain}`,
            evidence.repairedAction || "check",
            "--manifest-path",
            repairedManifest,
            "--target-dir",
            path.join(temporaryRoot, `${evidence.id}-repaired-target`),
            "--offline",
            "--color",
            "never",
            ...(repairedCargoConfig ? ["--config", repairedCargoConfig] : []),
            ...(evidence.locked ? ["--locked"] : []),
          ],
          runOptions
        );
      }
    } else if (runner === "rustc-link-resource-matrix") {
      if (
        !evidence.resourceRunnerFile ||
        !evidence.memoryLimitKiB ||
        !evidence.baselineLimitKiB ||
        !evidence.objectCopies
      ) {
        throw new Error(`${evidence.id}: link resource matrix is missing its controls`);
      }
      const resourceRunnerSource = path.join(fixtureRoot, evidence.resourceRunnerFile);
      if (!existsSync(resourceRunnerSource)) {
        throw new Error(`${evidence.id}: resource runner fixture is missing`);
      }

      const compilePayload = (source, label) => {
        const object = path.join(temporaryRoot, `${evidence.id}-${label}.o`);
        const compiled = run(
          "rustc",
          [
            `+${evidence.toolchain}`,
            `--edition=${evidence.edition}`,
            source,
            "--crate-name=rfa_040_payload",
            "--crate-type=lib",
            "--emit=obj",
            "-C",
            "opt-level=3",
            "-o",
            object,
          ],
          runOptions
        );
        const localized =
          compiled.status === 0
            ? run("objcopy", ["--localize-symbol=rfa_payload", object], runOptions)
            : { status: 2, stdout: "", stderr: "" };
        return { object, compiled, localized };
      };
      const failurePayload = compilePayload(failurePath, "failure-payload");
      const repairedPayload = compilePayload(repairedPath, "repaired-payload");
      if (
        failurePayload.compiled.status !== 0 ||
        failurePayload.localized.status !== 0 ||
        repairedPayload.compiled.status !== 0 ||
        repairedPayload.localized.status !== 0 ||
        !readFileSync(failurePayload.object).equals(readFileSync(repairedPayload.object))
      ) {
        throw new Error(`${evidence.id}: paired Rust workloads are not identical`);
      }

      const objectDirectory = path.join(temporaryRoot, `${evidence.id}-objects`);
      mkdirSync(objectDirectory, { recursive: true });
      const objectPaths = [];
      for (let index = 0; index < evidence.objectCopies; index += 1) {
        const object = path.join(objectDirectory, `payload-${String(index).padStart(3, "0")}.o`);
        cpSync(failurePayload.object, object);
        objectPaths.push(object);
      }

      const resourceRunner = path.join(temporaryRoot, `${evidence.id}-resource-runner`);
      const compiledResourceRunner = run(
        "cc",
        ["-O2", resourceRunnerSource, "-o", resourceRunner],
        runOptions
      );
      if (compiledResourceRunner.status !== 0) {
        throw new Error(
          `${evidence.id}: resource runner did not compile\n${compiledResourceRunner.stderr}`
        );
      }

      const cappedLink = (linker, limitKiB, label) => {
        const output = path.join(temporaryRoot, `${evidence.id}-${label}.so`);
        const result = run(
          resourceRunner,
          [String(limitKiB), linker, "-shared", "-o", output, ...objectPaths],
          { ...runOptions, timeout: 30000 }
        );
        return { output, result };
      };
      const baseline = cappedLink("ld.lld", evidence.baselineLimitKiB, "baseline");
      const constrained = cappedLink("ld.lld", evidence.memoryLimitKiB, "constrained");
      const failureVerified =
        baseline.result.status === 0 &&
        existsSync(baseline.output) &&
        constrained.result.status !== 0 &&
        constrained.result.stderr.includes("Cannot allocate memory");
      failure = {
        status: failureVerified ? 1 : 2,
        stdout: [
          `baseline linker under ${baseline.result.stdout.trim()}`,
          `constrained linker under ${constrained.result.stdout.trim()}`,
        ].join("\n"),
        stderr: `${baseline.result.stderr || ""}\n${constrained.result.stderr || ""}`,
      };

      const repairedLink = cappedLink("ld.bfd", evidence.memoryLimitKiB, "repaired");
      const repairVerified =
        repairedLink.result.status === 0 &&
        existsSync(repairedLink.output) &&
        statSync(repairedLink.output).size > 60_000_000;
      repaired = {
        status: repairVerified ? 0 : 2,
        stdout: `repaired linker under ${repairedLink.result.stdout.trim()}`,
        stderr: repairedLink.result.stderr,
      };
    } else if (runner === "rustc-allocator-sanitizer") {
      if (!evidence.allocatorFile) {
        throw new Error(`${evidence.id}: allocator evidence is missing its Rust owner`);
      }
      const allocatorPath = path.join(fixtureRoot, evidence.allocatorFile);
      if (!existsSync(allocatorPath)) {
        throw new Error(`${evidence.id}: Rust allocator fixture is missing`);
      }

      const allocatorLibrary = path.join(temporaryRoot, `${evidence.id}-allocator.a`);
      const compiledAllocator = run(
        "rustc",
        [
          `+${evidence.toolchain}`,
          `--edition=${evidence.edition}`,
          allocatorPath,
          "--crate-type=staticlib",
          "-C",
          "opt-level=1",
          "-C",
          "debuginfo=1",
          "-o",
          allocatorLibrary,
        ],
        runOptions
      );
      if (compiledAllocator.status !== 0) {
        throw new Error(
          `${evidence.id}: Rust allocator did not compile\n${compiledAllocator.stderr}`
        );
      }

      const compileSanitizedHost = (source, label) => {
        const executable = path.join(temporaryRoot, `${evidence.id}-${label}-asan`);
        const compiled = run(
          "clang",
          [
            "-fsanitize=address",
            "-fno-omit-frame-pointer",
            source,
            allocatorLibrary,
            "-ldl",
            "-lpthread",
            "-lm",
            "-o",
            executable,
          ],
          runOptions
        );
        const executed =
          compiled.status === 0
            ? run(executable, [], {
                ...runOptions,
                environment: {
                  ASAN_OPTIONS: "abort_on_error=1:detect_leaks=0:symbolize=0",
                },
                timeout: 5000,
              })
            : { status: 2, stdout: "", stderr: compiled.stderr };
        return { compiled, executed };
      };

      const failingHost = compileSanitizedHost(failurePath, "failure");
      failure = failingHost.executed;
      const repairedHost = compileSanitizedHost(repairedPath, "repaired");
      repaired = repairedHost.executed;
    } else if (runner === "rustc-invariant-matrix") {
      const runInvariantMatrix = (source, label, expectSuccess) => {
        const observations = [];
        const errors = [];
        let verified = true;

        for (const optimization of ["0", "3"]) {
          const executable = path.join(
            temporaryRoot,
            `${evidence.id}-${label}-opt-${optimization}`
          );
          const compiled = run(
            "rustc",
            [
              `+${evidence.toolchain}`,
              `--edition=${evidence.edition}`,
              source,
              "-C",
              `opt-level=${optimization}`,
              "-o",
              executable,
            ],
            runOptions
          );
          if (compiled.status !== 0) {
            verified = false;
            errors.push(compiled.stderr);
            continue;
          }

          for (const logging of [false, true]) {
            const executed = run(executable, [], {
              ...runOptions,
              environment: { RFA_LOG: logging ? "1" : "0" },
            });
            const output = `${executed.stdout || ""}\n${executed.stderr || ""}`;
            observations.push(
              `opt-level=${optimization} logging=${logging} status=${executed.status}\n${output}`
            );
            if (expectSuccess) {
              verified &&= executed.status === 0 && output.includes("current token accepted");
            } else {
              verified &&=
                executed.status !== 0 &&
                output.includes("checked invariant rejected stale token") &&
                output.includes(`logging=${logging}`);
            }
          }
        }

        return {
          status: verified ? (expectSuccess ? 0 : 1) : 2,
          stdout: observations.join("\n"),
          stderr: errors.filter(Boolean).join("\n"),
        };
      };

      failure = runInvariantMatrix(failurePath, "failure", false);
      repaired = runInvariantMatrix(repairedPath, "repaired", true);
    } else if (runner === "rustc-native-owner") {
      const nativeDirectory = path.join(fixtureRoot, "native");
      const libraryDirectory = path.join(temporaryRoot, `${evidence.id}-native-libraries`);
      mkdirSync(libraryDirectory, { recursive: true });

      const buildNativeOwner = (version) => {
        const object = path.join(libraryDirectory, `v${version}.o`);
        const library = path.join(libraryDirectory, `librfa_native_v${version}.a`);
        const compiled = run(
          "cc",
          ["-std=c11", "-O2", "-c", path.join(nativeDirectory, `v${version}.c`), "-o", object],
          runOptions
        );
        const archived =
          compiled.status === 0
            ? run("ar", ["crs", library, object], runOptions)
            : { status: 2, stdout: "", stderr: "" };
        const symbols =
          archived.status === 0
            ? run("nm", ["--defined-only", library], runOptions)
            : { status: 2, stdout: "", stderr: "" };
        return { library, compiled, archived, symbols };
      };
      const ownerV1 = buildNativeOwner(1);
      const ownerV2 = buildNativeOwner(2);
      if (
        ownerV1.compiled.status !== 0 ||
        ownerV1.archived.status !== 0 ||
        ownerV1.symbols.status !== 0 ||
        !ownerV1.symbols.stdout.includes("rfa_native_v1_create") ||
        ownerV2.compiled.status !== 0 ||
        ownerV2.archived.status !== 0 ||
        ownerV2.symbols.status !== 0 ||
        !ownerV2.symbols.stdout.includes("rfa_native_v2_read")
      ) {
        throw new Error(`${evidence.id}: native owner archives are incomplete`);
      }

      const compileRustConsumer = (source, label) => {
        const executable = path.join(temporaryRoot, `${evidence.id}-${label}`);
        const linkMap = path.join(temporaryRoot, `${evidence.id}-${label}.map`);
        const compiled = run(
          "rustc",
          [
            `+${evidence.toolchain}`,
            `--edition=${evidence.edition}`,
            source,
            "-L",
            `native=${libraryDirectory}`,
            "-C",
            `link-arg=-Wl,-Map=${linkMap}`,
            "-o",
            executable,
          ],
          runOptions
        );
        return { executable, linkMap, compiled };
      };

      const compiledFailure = compileRustConsumer(failurePath, "failure");
      if (compiledFailure.compiled.status !== 0 || !existsSync(compiledFailure.linkMap)) {
        throw new Error(
          `${evidence.id}: failure consumer did not link\n${compiledFailure.compiled.stderr}`
        );
      }
      const failureMap = readFileSync(compiledFailure.linkMap, "utf8");
      failure = run(compiledFailure.executable, [], runOptions);
      if (
        !failureMap.includes("librfa_native_v1.a") ||
        !failureMap.includes("librfa_native_v2.a")
      ) {
        failure = {
          status: 2,
          stdout: failure.stdout,
          stderr: `${failure.stderr}\nfinal link map did not contain both native owners`,
        };
      }

      const compiledRepair = compileRustConsumer(repairedPath, "repaired");
      if (compiledRepair.compiled.status !== 0 || !existsSync(compiledRepair.linkMap)) {
        throw new Error(
          `${evidence.id}: repaired consumer did not link\n${compiledRepair.compiled.stderr}`
        );
      }
      const repairedMap = readFileSync(compiledRepair.linkMap, "utf8");
      repaired = run(compiledRepair.executable, [], runOptions);
      if (
        !repairedMap.includes("librfa_native_v1.a") ||
        repairedMap.includes("librfa_native_v2.a")
      ) {
        repaired = {
          status: 2,
          stdout: repaired.stdout,
          stderr: `${repaired.stderr}\nrepaired link map did not prove one native owner`,
        };
      }
    } else if (runner === "rustc-native-discovery") {
      const copiedFixtureRoot = path.join(temporaryRoot, evidence.id, "fixture");
      cpSync(fixtureRoot, copiedFixtureRoot, { recursive: true });
      const copiedFailurePath = path.join(copiedFixtureRoot, evidence.failureFile);
      const copiedRepairedPath = path.join(copiedFixtureRoot, evidence.repairedFile);
      const installA = path.join(copiedFixtureRoot, "install-a");
      const installB = path.join(copiedFixtureRoot, "install-b");

      const buildInstallation = (installation) => {
        const object = path.join(installation, "lib", "widget.o");
        const library = path.join(installation, "lib", "libwidget.a");
        const compiled = run(
          "cc",
          [
            "-I",
            path.join(installation, "include"),
            "-c",
            path.join(installation, "src", "widget.c"),
            "-o",
            object,
          ],
          runOptions
        );
        const archived =
          compiled.status === 0
            ? run("ar", ["crs", library, object], runOptions)
            : { status: 2, stdout: "", stderr: "" };
        return { compiled, archived };
      };
      const installationA = buildInstallation(installA);
      const installationB = buildInstallation(installB);
      if (
        installationA.compiled.status !== 0 ||
        installationA.archived.status !== 0 ||
        installationB.compiled.status !== 0 ||
        installationB.archived.status !== 0
      ) {
        throw new Error(`${evidence.id}: could not build the hermetic native installations`);
      }

      const compileBuildScript = (source, label) => {
        const executable = path.join(temporaryRoot, `${evidence.id}-${label}-build-script`);
        const compiled = run(
          "rustc",
          [`+${evidence.toolchain}`, `--edition=${evidence.edition}`, source, "-o", executable],
          runOptions
        );
        return { compiled, executable };
      };

      const failingBuildScript = compileBuildScript(copiedFailurePath, "failure");
      const failureOutput = path.join(temporaryRoot, `${evidence.id}-failure-out`);
      mkdirSync(failureOutput, { recursive: true });
      failure =
        failingBuildScript.compiled.status === 0
          ? run(failingBuildScript.executable, [], {
              ...runOptions,
              cwd: copiedFixtureRoot,
              environment: {
                HEADER_PKG_CONFIG_PATH: path.join(installA, "lib", "pkgconfig"),
                LIB_PKG_CONFIG_PATH: path.join(installB, "lib", "pkgconfig"),
                OUT_DIR: failureOutput,
              },
              unsetEnvironment: [
                ...(runOptions.unsetEnvironment || []),
                "PKG_CONFIG_PATH",
                "PKG_CONFIG_LIBDIR",
                "PKG_CONFIG_SYSROOT_DIR",
              ],
            })
          : failingBuildScript.compiled;

      const repairedBuildScript = compileBuildScript(copiedRepairedPath, "repaired");
      const repairedOutput = path.join(temporaryRoot, `${evidence.id}-repaired-out`);
      mkdirSync(repairedOutput, { recursive: true });
      repaired =
        repairedBuildScript.compiled.status === 0
          ? run(repairedBuildScript.executable, [], {
              ...runOptions,
              cwd: copiedFixtureRoot,
              environment: {
                WIDGET_PKG_CONFIG_PATH: path.join(installA, "lib", "pkgconfig"),
                OUT_DIR: repairedOutput,
              },
              unsetEnvironment: [
                ...(runOptions.unsetEnvironment || []),
                "PKG_CONFIG_PATH",
                "PKG_CONFIG_LIBDIR",
                "PKG_CONFIG_SYSROOT_DIR",
              ],
            })
          : repairedBuildScript.compiled;
    } else if (runner === "rustc-native-target-matrix") {
      const matrixFields = [
        "hostTriple",
        "targetTriple",
        "nativeCompiler",
        "expectedHostMachine",
        "expectedTargetMachine",
      ];
      if (matrixFields.some((field) => !evidence[field])) {
        throw new Error(`${evidence.id}: native target matrix is missing its target controls`);
      }

      const compileAndRunBuildScript = (source, label) => {
        const executable = path.join(temporaryRoot, `${evidence.id}-${label}-build-script`);
        const outputDirectory = path.join(temporaryRoot, `${evidence.id}-${label}-out`);
        mkdirSync(outputDirectory, { recursive: true });
        const compiled = run(
          "rustc",
          [`+${evidence.toolchain}`, `--edition=${evidence.edition}`, source, "-o", executable],
          runOptions
        );
        const executed =
          compiled.status === 0
            ? run(executable, [], {
                ...runOptions,
                cwd: fixtureRoot,
                environment: {
                  HOST: evidence.hostTriple,
                  TARGET: evidence.targetTriple,
                  CC: evidence.nativeCompiler,
                  OUT_DIR: outputDirectory,
                },
              })
            : { status: 2, stdout: "", stderr: "" };
        const object = path.join(outputDirectory, "native.o");
        const header =
          executed.status === 0 && existsSync(object)
            ? run("readelf", ["-h", object], runOptions)
            : { status: 2, stdout: "", stderr: "" };
        return { compiled, executed, header };
      };

      const failingTargetBuild = compileAndRunBuildScript(failurePath, "failure");
      const failureVerified =
        failingTargetBuild.compiled.status === 0 &&
        failingTargetBuild.executed.status === 0 &&
        failingTargetBuild.header.status === 0 &&
        failingTargetBuild.header.stdout.includes(evidence.expectedHostMachine) &&
        !failingTargetBuild.header.stdout.includes(evidence.expectedTargetMachine);
      failure = {
        status: failureVerified ? 1 : 2,
        stdout: `${failingTargetBuild.executed.stdout}failure object machine: ${evidence.expectedHostMachine}; expected: ${evidence.expectedTargetMachine}`,
        stderr: [
          failingTargetBuild.compiled.stderr,
          failingTargetBuild.executed.stderr,
          failingTargetBuild.header.stderr,
        ]
          .filter(Boolean)
          .join("\n"),
      };

      const repairedTargetBuild = compileAndRunBuildScript(repairedPath, "repaired");
      const repairVerified =
        repairedTargetBuild.compiled.status === 0 &&
        repairedTargetBuild.executed.status === 0 &&
        repairedTargetBuild.header.status === 0 &&
        repairedTargetBuild.header.stdout.includes(evidence.expectedTargetMachine);
      repaired = {
        status: repairVerified ? 0 : 2,
        stdout: `${repairedTargetBuild.executed.stdout}repaired object machine: ${evidence.expectedTargetMachine}`,
        stderr: [
          repairedTargetBuild.compiled.stderr,
          repairedTargetBuild.executed.stderr,
          repairedTargetBuild.header.stderr,
        ]
          .filter(Boolean)
          .join("\n"),
      };
    } else if (runner === "rustc-symbol-matrix") {
      if (!evidence.hostFile) {
        throw new Error(`${evidence.id}: symbol-matrix evidence is missing its foreign host`);
      }

      const hostPath = path.join(fixtureRoot, evidence.hostFile);
      if (!existsSync(hostPath)) {
        throw new Error(`${evidence.id}: foreign host fixture is missing`);
      }

      const compileStaticLibrary = (source, label, lto) => {
        const artifact = path.join(temporaryRoot, `${evidence.id}-${label}-${lto}.a`);
        const compiled = run(
          "rustc",
          [
            `+${evidence.toolchain}`,
            `--edition=${evidence.edition}`,
            source,
            "--crate-type=staticlib",
            "-C",
            "opt-level=3",
            "-C",
            `lto=${lto}`,
            "-C",
            "link-dead-code=yes",
            "-o",
            artifact,
          ],
          runOptions
        );
        const symbols =
          compiled.status === 0
            ? run("nm", ["--defined-only", artifact], runOptions)
            : { status: 2, stdout: "", stderr: "" };
        return { artifact, compiled, symbols };
      };

      const symbolNames = (result) =>
        result.stdout
          .split("\n")
          .map((line) => line.trim().split(/\s+/).at(-1))
          .filter(Boolean);
      const hasExactExport = (result) => symbolNames(result).includes("plugin_initialize");
      const hasRelatedRustItem = (result) =>
        symbolNames(result).some((symbol) => symbol.includes("plugin_initialize"));
      const linkForeignHost = (library, label) => {
        const executable = path.join(temporaryRoot, `${evidence.id}-${label}-host`);
        const linked = run(
          "cc",
          [hostPath, library, "-ldl", "-lpthread", "-lm", "-o", executable],
          runOptions
        );
        const executed =
          linked.status === 0
            ? run(executable, [], runOptions)
            : { status: 2, stdout: "", stderr: "" };
        return { linked, executed };
      };

      const failureWithoutLto = compileStaticLibrary(failurePath, "failure", "off");
      const failureWithLto = compileStaticLibrary(failurePath, "failure", "thin");
      const failedForeignLink = linkForeignHost(failureWithoutLto.artifact, "failure");
      const failureVerified =
        failureWithoutLto.compiled.status === 0 &&
        failureWithLto.compiled.status === 0 &&
        failureWithoutLto.symbols.status === 0 &&
        failureWithLto.symbols.status === 0 &&
        hasRelatedRustItem(failureWithoutLto.symbols) &&
        !hasExactExport(failureWithoutLto.symbols) &&
        !hasRelatedRustItem(failureWithLto.symbols) &&
        failedForeignLink.linked.status !== 0;

      failure = {
        status: failureVerified ? 1 : 2,
        stdout: failureVerified
          ? [
              "No-LTO Rust item exists only under a mangled name",
              "thin-LTO removed the unrooted Rust item",
              "foreign link: undefined reference to plugin_initialize",
            ].join("\n")
          : "symbol matrix did not reproduce the expected boundary",
        stderr: [
          failureWithoutLto.compiled.stderr,
          failureWithLto.compiled.stderr,
          failureWithoutLto.symbols.stderr,
          failureWithLto.symbols.stderr,
          failedForeignLink.linked.stderr,
        ]
          .filter(Boolean)
          .join("\n"),
      };

      const repairWithoutLto = compileStaticLibrary(repairedPath, "repaired", "off");
      const repairWithLto = compileStaticLibrary(repairedPath, "repaired", "thin");
      const repairedForeignLink = linkForeignHost(repairWithLto.artifact, "repaired");
      const repairVerified =
        repairWithoutLto.compiled.status === 0 &&
        repairWithLto.compiled.status === 0 &&
        repairWithoutLto.symbols.status === 0 &&
        repairWithLto.symbols.status === 0 &&
        hasExactExport(repairWithoutLto.symbols) &&
        hasExactExport(repairWithLto.symbols) &&
        repairedForeignLink.linked.status === 0 &&
        repairedForeignLink.executed.status === 0 &&
        repairedForeignLink.executed.stdout.includes("foreign host observed status 39");

      repaired = {
        status: repairVerified ? 0 : 2,
        stdout: repairedForeignLink.executed.stdout,
        stderr: [
          repairWithoutLto.compiled.stderr,
          repairWithLto.compiled.stderr,
          repairWithoutLto.symbols.stderr,
          repairWithLto.symbols.stderr,
          repairedForeignLink.linked.stderr,
          repairedForeignLink.executed.stderr,
        ]
          .filter(Boolean)
          .join("\n"),
      };
    } else if (runner === "rustc-run") {
      const failingExecutable = path.join(temporaryRoot, `${evidence.id}-failure`);
      const compiledFailure = run(
        "rustc",
        [
          `+${evidence.toolchain}`,
          `--edition=${evidence.edition}`,
          failurePath,
          "-o",
          failingExecutable,
        ],
        runOptions
      );
      if (compiledFailure.status !== 0) {
        throw new Error(
          `${evidence.id}: runtime-failure fixture did not compile\n${compiledFailure.stderr}`
        );
      }
      failure = run(failingExecutable, [], runOptions);

      const repairedExecutable = path.join(temporaryRoot, `${evidence.id}-repaired`);
      const compiledRepair = run(
        "rustc",
        [
          `+${evidence.toolchain}`,
          `--edition=${evidence.edition}`,
          repairedPath,
          "-o",
          repairedExecutable,
        ],
        runOptions
      );
      if (compiledRepair.status !== 0) {
        throw new Error(
          `${evidence.id}: repaired fixture did not compile\n${compiledRepair.stderr}`
        );
      }
      repaired = run(repairedExecutable, [], runOptions);
    } else if (runner === "rustc-link") {
      failure = run(
        "rustc",
        [
          `+${evidence.toolchain}`,
          `--edition=${evidence.edition}`,
          failurePath,
          "-o",
          path.join(temporaryRoot, `${evidence.id}-failure`),
        ],
        runOptions
      );

      const executable = path.join(temporaryRoot, `${evidence.id}-repaired`);
      const compiledRepair = run(
        "rustc",
        [`+${evidence.toolchain}`, `--edition=${evidence.edition}`, repairedPath, "-o", executable],
        runOptions
      );
      if (compiledRepair.status !== 0) {
        throw new Error(
          `${evidence.id}: repaired fixture did not compile\n${compiledRepair.stderr}`
        );
      }
      repaired = run(executable, [], runOptions);
    } else if (runner === "rustc") {
      failure = run(
        "rustc",
        [
          `+${evidence.toolchain}`,
          `--edition=${evidence.edition}`,
          failurePath,
          "--emit=metadata",
          "-o",
          path.join(temporaryRoot, `${evidence.id}-failure.rmeta`),
        ],
        runOptions
      );

      const executable = path.join(temporaryRoot, `${evidence.id}-repaired`);
      const compiledRepair = run(
        "rustc",
        [`+${evidence.toolchain}`, `--edition=${evidence.edition}`, repairedPath, "-o", executable],
        runOptions
      );
      if (compiledRepair.status !== 0) {
        throw new Error(
          `${evidence.id}: repaired fixture did not compile\n${compiledRepair.stderr}`
        );
      }
      repaired = run(executable, [], runOptions);
    } else {
      throw new Error(`${evidence.id}: unsupported evidence runner ${JSON.stringify(runner)}`);
    }

    if (failure.status === 0) {
      throw new Error(`${evidence.id}: the failing fixture unexpectedly succeeded`);
    }

    const diagnostic = `${failure.stdout || ""}\n${failure.stderr || ""}`;
    for (const fragment of evidence.expectedDiagnostics) {
      if (!diagnostic.includes(fragment)) {
        throw new Error(
          `${evidence.id}: compiler output is missing ${JSON.stringify(fragment)}\n${diagnostic}`
        );
      }
    }

    if (repaired.status !== 0) {
      throw new Error(`${evidence.id}: repaired fixture failed verification\n${repaired.stderr}`);
    }

    // Reading both sources here makes an accidentally empty evidence file fail loudly.
    if (!readFileSync(failurePath, "utf8").trim() || !readFileSync(repairedPath, "utf8").trim()) {
      throw new Error(`${evidence.id}: evidence source is empty`);
    }

    console.log(
      `${evidence.id}: ${runner} failure reproduced and repair verified on ${version.stdout.trim()}`
    );
  }
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}
