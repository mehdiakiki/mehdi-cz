import { getRustFailureEvidence } from "./rust-failure-evidence.mjs";

// A case is featured when its evidence runner does more than one rustc invocation
// or one `cargo check` (`rustFailureSystemsRunners`), or when it is listed with a
// reason in `rustFailureCuratedSystemsCases`. Every other record is the reference
// layer.

// How each evidence runner exercises a case. Every runner checks that the failing
// fixture fails with the recorded output and that the repaired fixture passes.
export const rustFailureRunners = {
  rustc: {
    label: "Compiler evidence",
    method:
      "Compiles one file with rustc. The failing file must produce the recorded diagnostic and the repaired file must compile and run.",
  },
  "rustc-run": {
    label: "Runtime evidence",
    method:
      "Compiles and runs one file. The failing program must exit with the recorded output and the repaired program must exit cleanly.",
  },
  "rustc-link": {
    label: "Linker evidence",
    method:
      "Compiles and links one file. The failing file must stop at the final link with the recorded error and the repaired file must link and run.",
  },
  "rustc-symbol-matrix": {
    label: "Native symbol-matrix evidence",
    method:
      "Builds a Rust staticlib with and without thin LTO, reads both symbol tables with nm, and links a C host against the result.",
  },
  "rustc-link-resource-matrix": {
    label: "Link resource-matrix evidence",
    method:
      "Links the same Rust objects with ld.lld under a normal and a capped memory limit, then with ld.bfd under the same cap.",
  },
  "rustc-native-target-matrix": {
    label: "Native target-matrix evidence",
    method:
      "Runs the build script with HOST and TARGET set for a cross build and reads the machine type of the produced object with readelf.",
  },
  "rustc-native-discovery": {
    label: "Native discovery evidence",
    method:
      "Builds two installations of one native library and runs the build script with header and library discovery pointing at different installations.",
  },
  "rustc-native-owner": {
    label: "Native ownership evidence",
    method:
      "Builds two versions of a native library, links a Rust consumer, and reads the final link map to see which versions were linked.",
  },
  "rustc-allocator-sanitizer": {
    label: "Allocator sanitizer evidence",
    method:
      "Links a Rust staticlib into a C host built with clang AddressSanitizer, which reports a free through the wrong allocator.",
  },
  "rustc-invariant-matrix": {
    label: "Invariant matrix evidence",
    method: "Builds the program at opt-level 0 and 3 and runs each build with and without logging.",
  },
  cargo: {
    label: "Cargo workspace evidence",
    method:
      "Runs Cargo on a small package or workspace. The failing project must fail with the recorded output and the repaired project must pass.",
  },
  "cargo-rebuild": {
    label: "Cargo rebuild evidence",
    method:
      "Runs the package twice with a different environment value and compares the generated output.",
  },
  "cargo-runtime-env": {
    label: "Cargo runtime-boundary evidence",
    method:
      "Runs the binary through cargo run and then directly, and compares what it reads from its environment.",
  },
  "cargo-package": {
    label: "Cargo package-boundary evidence",
    method:
      "Checks the package inside the workspace, then runs cargo package to build it the way a registry consumer would.",
  },
  "cargo-profile-pair": {
    label: "Cargo profile-pair evidence",
    method: "Runs the same package under the dev and release profiles and compares the results.",
  },
  "cargo-test-surfaces": {
    label: "Cargo test-surface evidence",
    method: "Runs the library unit tests and the doctests of the same package separately.",
  },
  "cargo-suite-isolation": {
    label: "Cargo suite-isolation evidence",
    method: "Runs each test on its own, then the whole suite under a timeout.",
  },
  "cargo-subprocess": {
    label: "Cargo deadline-isolated evidence",
    method: "Builds the binary and runs it as a subprocess with a deadline.",
  },
};

// Runners that need more than one rustc invocation or one `cargo check`: a
// linker under a memory cap, a C host, nm, readelf, a link map, a sanitizer, a
// profile pair, a second build, a subprocess deadline, or separate test runs.
export const rustFailureSystemsRunners = [
  "rustc-link",
  "rustc-symbol-matrix",
  "rustc-link-resource-matrix",
  "rustc-native-target-matrix",
  "rustc-native-discovery",
  "rustc-native-owner",
  "rustc-allocator-sanitizer",
  "rustc-invariant-matrix",
  "cargo-rebuild",
  "cargo-runtime-env",
  "cargo-package",
  "cargo-profile-pair",
  "cargo-test-surfaces",
  "cargo-suite-isolation",
  "cargo-subprocess",
];

// Plain fixtures whose mechanism is still below the application layer.
export const rustFailureCuratedSystemsCases = {
  "RFA-036":
    "A hand-written Stream must register its waker before it returns Pending, or no task is ever woken again.",
  "RFA-044":
    "An enum crossing a C boundary needs a fixed representation and a plan for values the Rust side does not know.",
  "RFA-045":
    "Whether a panic may unwind through foreign frames depends on the ABI string and the panic strategy.",
  "RFA-102":
    "Cargo merges feature requests from every path into one package instance, so exclusive features collide.",
  "RFA-104":
    "Cargo's links key is the one place where the build graph records ownership of a native library.",
  "RFA-145":
    "A second panic from a destructor during unwinding turns into a process abort before any catch boundary runs.",
  "RFA-301":
    "UnsafeCell keeps its inner layout but hides the null niche that Option would otherwise reuse.",
  "RFA-693":
    "TARGET is set when Cargo runs the compiled build script, not while rustc compiles build.rs.",
  "RFA-694":
    "DEP_* metadata from a links package reaches only immediate dependents, not the whole graph.",
  "RFA-695":
    "Without std there is no panic runtime, so a no_std binary must define exactly one panic handler.",
  "RFA-707":
    "Exporting a name such as memset defines a symbol the standard library itself calls with a fixed ABI.",
};

export const rustFailureFeaturedLayers = [
  {
    slug: "linking-symbols",
    label: "Linking and symbol export",
    description:
      "What the final artifact actually exports, which symbols survive LTO, and what the linker needs to finish.",
    caseIds: ["RFA-039", "RFA-125", "RFA-040", "RFA-707"],
  },
  {
    slug: "native-libraries-targets",
    label: "Native libraries and cross-compilation",
    description:
      "Which native library a build script finds, who owns it in the graph, and which machine its objects are built for.",
    caseIds: ["RFA-041", "RFA-042", "RFA-043", "RFA-104", "RFA-694"],
  },
  {
    slug: "ffi-ownership-unwinding",
    label: "FFI ownership, ABI, and unwinding",
    description:
      "Which side owns an allocation, what a value means on the other side of the boundary, and what a panic may cross.",
    caseIds: ["RFA-046", "RFA-044", "RFA-045", "RFA-145", "RFA-695"],
  },
  {
    slug: "build-profiles-harness",
    label: "Build scripts, profiles, and test harnesses",
    description:
      "When Cargo reruns a build script, what a profile changes, and how doctests and packaging see a different crate.",
    caseIds: ["RFA-050", "RFA-037", "RFA-032", "RFA-697", "RFA-705", "RFA-693", "RFA-102"],
  },
  {
    slug: "runtime-scheduling-layout",
    label: "Runtimes, scheduling, and layout",
    description:
      "Timers, blocking work, wakeups, shared test processes, and layout decisions that only show up when the program runs.",
    caseIds: ["RFA-029", "RFA-030", "RFA-033", "RFA-036", "RFA-038", "RFA-301"],
  },
];

const systemsRunners = new Set(rustFailureSystemsRunners);
const errorCodePattern = /^E\d{4}$/;

export function getRustFailureRunner(caseId) {
  const evidence = getRustFailureEvidence(caseId);
  if (!evidence) return undefined;
  const runner = evidence.runner || "rustc";
  return { id: runner, ...rustFailureRunners[runner] };
}

export function isRustFailureSystemsCase(caseId) {
  const evidence = getRustFailureEvidence(caseId);
  return (
    Boolean(evidence?.runner && systemsRunners.has(evidence.runner)) ||
    Object.hasOwn(rustFailureCuratedSystemsCases, caseId)
  );
}

export function getRustFailureTier(caseId) {
  return isRustFailureSystemsCase(caseId) ? "featured" : "reference";
}

// A case is keyed to a compiler error code when its failing fixture is expected
// to print one, for example `E0502`.
export function isRustFailureErrorCodeCase(caseId) {
  return Boolean(
    getRustFailureEvidence(caseId)?.expectedDiagnostics.some((line) => errorCodePattern.test(line))
  );
}

// Why a featured case is on the front page: the fixture method for data-selected
// cases, the curated reason otherwise.
export function getRustFailureFeatureNote(caseId) {
  return (
    rustFailureCuratedSystemsCases[caseId] ||
    (isRustFailureSystemsCase(caseId) ? getRustFailureRunner(caseId)?.method : undefined)
  );
}

// One case from each layer in turn, for short previews.
export function getRustFailureFeaturedPreviewIds(count) {
  const ids = [];
  const longestLayer = Math.max(...rustFailureFeaturedLayers.map((layer) => layer.caseIds.length));
  for (let index = 0; index < longestLayer && ids.length < count; index += 1) {
    for (const layer of rustFailureFeaturedLayers) {
      if (ids.length >= count) break;
      if (layer.caseIds[index]) ids.push(layer.caseIds[index]);
    }
  }
  return ids;
}
