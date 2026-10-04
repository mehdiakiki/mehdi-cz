export const rustFailureAreas = [
  {
    slug: "diagnostics-macros",
    label: "Language and diagnostics",
    description:
      "Ownership, lifetimes, traits, inference, expressions, and macros can make the reported location different from the real cause.",
  },
  {
    slug: "cargo-dependencies",
    label: "Cargo and dependencies",
    description: "The build changes with features, MSRV, cached inputs, or workspace position.",
  },
  {
    slug: "async-runtime",
    label: "Async and runtime",
    description:
      "The failure depends on a suspension point, cancellation, scheduling, or shutdown.",
  },
  {
    slug: "concurrency-memory",
    label: "Runtime, memory, and library APIs",
    description:
      "The code compiles, but a library contract, state transition, ordering, ownership rule, or unsafe invariant is incomplete.",
  },
  {
    slug: "ffi-targets",
    label: "FFI and targets",
    description: "The host, target, linker, ABI, or libc changes the result.",
  },
  {
    slug: "upgrades-compatibility",
    label: "Upgrades and compatibility",
    description: "A toolchain or edition upgrade exposes a hidden assumption.",
  },
];

// The route stays locally previewable while the first case files publish. It
// enters navigation and crawl surfaces only after the initial ten-case set is live.
export const rustFailureAtlasLaunch = "2026-09-04T21:00:00+01:00";

export function isRustFailureAtlasLaunched(now = new Date()) {
  const launch = new Date(rustFailureAtlasLaunch);
  return !Number.isNaN(now.getTime()) && now.getTime() >= launch.getTime();
}

export const rustFailureAtlasEntries = [
  {
    id: "RFA-001",
    area: "diagnostics-macros",
    symptom: "A procedural-macro error underlines the invocation instead of the invalid token.",
    likelyCause:
      "The macro replaced or discarded the input span while parsing, validating, or generating the failing code.",
    firstCheck:
      "Compare the span attached to the parsed input with the span used for the diagnostic.",
    searchTerms: [
      "procedural macro error wrong line",
      "proc macro span call site",
      "syn spanned error",
    ],
    evidence: ["minimal macro crate", "compile-fail fixture", "span comparison"],
    articleSlug: "why-procedural-macro-errors-point-at-the-wrong-code",
  },
  {
    id: "RFA-002",
    area: "diagnostics-macros",
    symptom:
      "A macro resolves a name in the caller or definition crate when I expected the other one.",
    likelyCause:
      "Declarative macros use mixed-site hygiene, while captured tokens, literal tokens, and `$crate` do not share one lookup context.",
    firstCheck:
      "Reduce the expansion to one captured name, one literal name, and one `$crate` path.",
    searchTerms: [
      "Rust macro hygiene wrong crate",
      "$crate macro resolution",
      "macro call site span",
    ],
    evidence: ["two-crate fixture", "expanded tokens", "resolution matrix"],
    articleSlug: "rust-macro-hygiene-spans",
  },
  {
    id: "RFA-003",
    area: "diagnostics-macros",
    symptom:
      "`Iterator::map` rejects `.await`, or the obvious rewrite accidentally becomes sequential.",
    likelyCause:
      "The iterator closure is synchronous; choosing a loop, buffered stream, or joined futures also chooses the concurrency semantics.",
    firstCheck: "Decide whether each item may overlap before choosing the syntactic rewrite.",
    searchTerms: [
      "await inside map Rust",
      "async iterator map cannot await",
      "Rust map async closure",
    ],
    evidence: ["compile failure", "three runnable rewrites", "concurrency comparison"],
    articleSlug: "await-rust-iterator",
  },
  {
    id: "RFA-004",
    area: "cargo-dependencies",
    symptom: "A build script reruns even though the source code did not change.",
    likelyCause:
      "Cargo is tracking an undeclared or overly broad file, environment, generated output, or default package input.",
    firstCheck: "Enable Cargo fingerprint logging on the build that unexpectedly reruns.",
    searchTerms: [
      "Cargo build script reruns every time",
      "why build.rs rerun",
      "Cargo fingerprint dirty",
    ],
    evidence: ["fingerprint log", "input manifest", "second-build assertion"],
    articleSlug: "why-cargo-build-scripts-rerun-and-how-to-make-them-predictable",
  },
  {
    id: "RFA-005",
    area: "cargo-dependencies",
    symptom:
      "The same lockfile selects or rejects a dependency after changing the Rust version or resolver.",
    likelyCause:
      "Resolver 3 uses dependency `rust-version` information during selection, exposing missing, permissive, or inconsistent MSRV declarations.",
    firstCheck:
      "Record Cargo, rustc, resolver, workspace `rust-version`, and the selected dependency graph together.",
    searchTerms: [
      "Cargo resolver 3 MSRV dependency selection",
      "Rust version changes lockfile",
      "incompatible rust-version resolver",
    ],
    evidence: ["toolchain matrix", "lockfile diff", "dependency graph"],
    articleSlug: "cargo-resolver-3-how-msrv-changes-dependency-selection",
  },
  {
    id: "RFA-006",
    area: "cargo-dependencies",
    symptom:
      "A feature exists for the application build but disappears in a build script, proc macro, or cross target.",
    likelyCause:
      "Cargo resolves features in dependency graphs separated by workspace, host, target, and dependency kind boundaries.",
    firstCheck:
      "Inspect the feature graph with target and edge information instead of reading one manifest in isolation.",
    searchTerms: [
      "Cargo feature enabled but not available",
      "Cargo host target feature unification",
      "build dependency feature missing",
    ],
    evidence: ["workspace fixture", "host-target matrix", "cargo tree feature edges"],
    articleSlug: "cargo-feature-unification-across-workspaces-host-tools-and-targets",
  },
  {
    id: "RFA-007",
    area: "cargo-dependencies",
    symptom: "Changing warnings to errors causes much more recompilation than expected.",
    likelyCause:
      "Flags that affect compiler output participate in Cargo's compilation identity, and global `RUSTFLAGS` can invalidate dependency artifacts too.",
    firstCheck:
      "Compare the exact rustc flags for workspace crates and dependencies before deleting the cache.",
    searchTerms: [
      "Rust deny warnings rebuild dependencies",
      "RUSTFLAGS invalidates Cargo cache",
      "Cargo warnings CI cache",
    ],
    evidence: ["clean/warm build matrix", "rustc invocation diff", "artifact count"],
    articleSlug: "denying-rust-warnings-without-throwing-away-the-cargo-cache",
  },
  {
    id: "RFA-008",
    area: "cargo-dependencies",
    symptom: "A small edit invalidates a surprisingly large part of incremental compilation.",
    likelyCause:
      "The edit changed exported metadata, code-generation inputs, profile flags, environment, or a dependency node shared by many downstream units.",
    firstCheck:
      "Capture a self-profile or fingerprint log for one warm build before trying cache folklore.",
    searchTerms: [
      "Rust incremental compilation cache invalidated",
      "Cargo rebuild after small change",
      "rustc incremental cache miss",
    ],
    evidence: ["fingerprint log", "red-green query model", "controlled edit matrix"],
    articleSlug: "what-invalidates-rusts-incremental-compilation-cache",
  },
  {
    id: "RFA-009",
    area: "cargo-dependencies",
    symptom:
      "One crate dominates compile time, but changing a popular Cargo setting does not help.",
    likelyCause:
      "The bottleneck may be front-end queries, monomorphization, code generation, linking, or a build script; elapsed time alone does not identify it.",
    firstCheck: "Record rustc self-profile data for the exact slow target and profile.",
    searchTerms: [
      "find slow Rust crate self profile",
      "rustc self-profile compile time",
      "Rust build slow query",
    ],
    evidence: ["self-profile trace", "query table", "before/after measurement"],
    articleSlug: "reading-rustc-self-profile-data-to-find-a-slow-crate",
  },
  {
    id: "RFA-010",
    area: "async-runtime",
    symptom:
      "A future is not `Send`, although the value named in the error looks local or already dropped.",
    likelyCause:
      "A non-`Send` value remains part of the generated future state across an `.await` suspension point.",
    firstCheck:
      "Put the value in a smaller lexical scope and inspect the exact await across which it remains live.",
    searchTerms: [
      "future cannot be sent between threads safely",
      "Rust not Send across await",
      "MutexGuard await Send error",
    ],
    evidence: ["minimal compile failure", "future state sketch", "Send-bound assertion"],
    articleSlug: "rust-future-send-across-await",
  },
  {
    id: "RFA-011",
    area: "async-runtime",
    symptom: "An async future becomes unexpectedly large after adding one local value.",
    likelyCause:
      "Every value live across a suspension point can become stored state, and alternative branches contribute to the generated state-machine layout.",
    firstCheck:
      "Measure `size_of_val` after moving the large local before, after, and across the await.",
    searchTerms: [
      "Rust future size too large",
      "async future stack size",
      "why Rust async future grows",
    ],
    evidence: ["size measurements", "controlled source changes", "state-machine layout"],
    articleSlug: "rust-async-future-size",
  },
  {
    id: "RFA-012",
    area: "async-runtime",
    symptom:
      "Dropping or timing out a future loses progress or leaves an external operation ambiguous.",
    likelyCause:
      "Cancellation can happen at an await boundary after local or remote effects but before the caller records their outcome.",
    firstCheck: "Enumerate every await and classify the state immediately before and after it.",
    searchTerms: [
      "Rust async cancellation safety",
      "tokio timeout loses message",
      "future dropped partial progress",
    ],
    evidence: ["await-boundary table", "forced cancellation test", "state invariant"],
    articleSlug: "rust-async-cancellation-safety",
  },
  {
    id: "RFA-013",
    area: "async-runtime",
    symptom: "A `tokio::select!` loop repeatedly restarts work or loses partial progress.",
    likelyCause:
      "Each losing branch future is dropped, and constructing it again on the next loop iteration restarts any non-durable state it held.",
    firstCheck:
      "Mark which branch futures are recreated and which operations are cancellation-safe.",
    searchTerms: [
      "tokio select cancels future loop",
      "tokio select lost progress",
      "select branch cancellation safety",
    ],
    evidence: ["forced branch schedule", "drop trace", "stateful rewrite"],
    articleSlug: "what-tokio-select-cancels-at-every-loop-iteration",
  },
  {
    id: "RFA-014",
    area: "async-runtime",
    symptom:
      "An async service stops making progress while CPU usage and request volume look modest.",
    likelyCause:
      "A blocking call occupies an executor worker, possibly all workers, so unrelated futures cannot be polled.",
    firstCheck: "Capture task poll latency and thread stacks before increasing worker counts.",
    searchTerms: [
      "Tokio runtime stalls blocking function",
      "async Rust no progress",
      "Tokio worker blocked",
    ],
    evidence: ["runtime trace", "blocking reproduction", "offload comparison"],
    articleSlug: "how-one-blocking-function-stalls-an-async-rust-executor",
  },
  {
    id: "RFA-015",
    area: "async-runtime",
    symptom: "A task that awaits continuously can still starve unrelated Tokio tasks.",
    likelyCause:
      "Its operations remain immediately ready, so `.await` does not necessarily yield until the runtime's cooperative budget intervenes.",
    firstCheck: "Count polls and ready operations between actual scheduler yields.",
    searchTerms: [
      "Tokio task starvation always ready future",
      "Tokio cooperative budget",
      "await does not yield Rust",
    ],
    evidence: ["poll counter", "ready-future loop", "scheduler trace"],
    articleSlug: "tokio-s-cooperative-budget-why-a-ready-future-must-still-yield",
  },
  {
    id: "RFA-016",
    area: "async-runtime",
    symptom:
      "Shutdown hangs forever or returns while important async work is still unaccounted for.",
    likelyCause:
      "The process has cancellation signals but no explicit ownership tree, completion protocol, or deadline for spawned tasks.",
    firstCheck: "Inventory every spawned task and identify who waits for, cancels, or abandons it.",
    searchTerms: [
      "Tokio graceful shutdown hangs",
      "Rust spawned task shutdown",
      "async task ownership shutdown",
    ],
    evidence: ["task ownership tree", "forced signal test", "deadline trace"],
    articleSlug: "graceful-shutdown-in-async-rust-starts-with-task-ownership",
  },
  {
    id: "RFA-017",
    area: "concurrency-memory",
    symptom:
      "A thread observes an atomic flag but not the ordinary data that was meant to accompany it.",
    likelyCause:
      "The chosen relaxed operations provide atomicity without the happens-before relationship needed to publish other memory.",
    firstCheck:
      "Draw the required synchronizes-with edge before changing orderings by trial and error.",
    searchTerms: [
      "Rust relaxed atomic stale data",
      "atomic flag data not visible",
      "Rust Acquire Release publication",
    ],
    evidence: ["state-machine proof", "happens-before graph", "loom-style schedule"],
    articleSlug: "when-relaxed-atomics-are-enough-and-what-they-never-guarantee",
  },
  {
    id: "RFA-018",
    area: "concurrency-memory",
    symptom:
      "A hand-written future occasionally sleeps forever even though another thread signalled it.",
    likelyCause:
      "The producer notification raced with the consumer's check-and-register sequence, creating a missed wakeup.",
    firstCheck:
      "Force the producer to run between the first readiness check and waker registration.",
    searchTerms: [
      "AtomicWaker missed wakeup",
      "Rust future never wakes race",
      "check then sleep race waker",
    ],
    evidence: ["adversarial interleaving", "atomic state trace", "modelled invariant"],
    articleSlug: "how-an-atomicwaker-avoids-the-check-then-sleep-race",
  },
  {
    id: "RFA-019",
    area: "concurrency-memory",
    symptom:
      "Adding or changing `PhantomData` unexpectedly changes variance, `Send`, `Sync`, or drop checking.",
    likelyCause:
      "The marker tells the compiler a form of ownership or reference relationship that affects several independent analyses.",
    firstCheck:
      "Write down the exact relationship the type claims before selecting a marker spelling.",
    searchTerms: [
      "PhantomData not Send variance",
      "Rust PhantomData drop check",
      "PhantomData marker table",
    ],
    evidence: ["compile-time assertions", "variance probes", "drop-check case"],
    articleSlug: "rust-phantomdata-variance-drop-check",
  },
  {
    id: "RFA-020",
    area: "concurrency-memory",
    symptom:
      "Pointer code works as an integer-address round trip until optimization or a stricter tool changes the result.",
    likelyCause:
      "An address is not the complete provenance needed to justify which allocation and bytes a pointer may access.",
    firstCheck:
      "Separate address manipulation from provenance-preserving pointer operations and run the smallest case under Miri.",
    searchTerms: [
      "Rust pointer address provenance",
      "integer to pointer undefined behavior Rust",
      "strict provenance Miri",
    ],
    evidence: ["Miri case", "allocation diagram", "API comparison"],
    articleSlug: "rust-strict-provenance-pointer-address",
  },
  {
    id: "RFA-021",
    area: "concurrency-memory",
    symptom:
      "Partially initialized array code leaks initialized elements or drops memory that was never initialized.",
    likelyCause:
      "The unsafe path does not track exactly how many elements became valid before an early return or panic.",
    firstCheck: "Inject failure after every initialization step and count destructors.",
    searchTerms: [
      "MaybeUninit array partial initialization leak",
      "Rust initialize array panic safety",
      "MaybeUninit drop initialized elements",
    ],
    evidence: ["failure-at-each-index test", "drop counter", "Miri run"],
    articleSlug: "initializing-arrays-with-maybeuninit-without-leaking-partial-progress",
  },
  {
    id: "RFA-022",
    area: "concurrency-memory",
    symptom:
      "A `ManuallyDrop<Box<T>>` wrapper becomes unsound after manually dropping the box and then moving the wrapper.",
    likelyCause:
      "`ManuallyDrop` suppresses automatic destruction but does not make every post-drop byte pattern safe to move or expose through a public generic API.",
    firstCheck:
      "List every safe operation callers can perform after the manual drop, including moves and derived trait calls.",
    searchTerms: [
      "ManuallyDrop Box move undefined behavior",
      "Rust ManuallyDrop public field unsound",
      "ManuallyDrop Box rule",
    ],
    evidence: ["Miri reproduction", "safe-API audit", "drop-state model"],
    articleSlug: "the-manuallydrop-box-t-rule-rust-1-98-finally-documents",
  },
  {
    id: "RFA-023",
    area: "ffi-targets",
    symptom: "An FFI struct has `repr(C)` but values are still corrupted across the boundary.",
    likelyCause:
      "Layout is only one part of the ABI contract; integer widths, enums, booleans, ownership, callbacks, panic behavior, and allocator identity may still disagree.",
    firstCheck:
      "Compare size, alignment, offsets, calling convention, and ownership on both sides for the deployed target.",
    searchTerms: ["Rust repr C still FFI crash", "Rust FFI ABI mismatch", "repr C not enough"],
    evidence: ["two-language fixture", "layout assertions", "sanitizer boundary test"],
    articleSlug: "rust-ffi-guide",
  },
  {
    id: "RFA-024",
    area: "ffi-targets",
    symptom:
      "A WebAssembly build starts failing on an undefined symbol that previously became an import.",
    likelyCause:
      "Rust 1.96 stopped allowing undeclared undefined wasm symbols; real host capabilities now need an explicit import module or interface.",
    firstCheck:
      "Decide whether the symbol is a host import, a missing native object, target leakage, or a typo.",
    searchTerms: [
      "Rust wasm undefined symbol 1.96",
      "wasm allow undefined removed",
      "wasm_import_module linker error",
    ],
    evidence: ["failing linker fixture", "explicit-import repair", "wasm import inspection"],
    articleSlug: "why-rust-1-96-stopped-turning-undefined-webassembly-symbols-into-imports",
  },
  {
    id: "RFA-025",
    area: "ffi-targets",
    symptom:
      "A static musl build fails on `open64`, or DNS behavior changes after a Rust toolchain upgrade.",
    likelyCause:
      "Rust 1.93 updated bundled musl to 1.2.5, which improves resolver behavior and removes compatibility symbols still referenced by old dependency versions.",
    firstCheck:
      "Confirm the target and inspect the selected `libc` and `getrandom` versions before changing linker flags.",
    searchTerms: [
      "Rust musl open64 undefined reference",
      "Rust 1.93 musl DNS",
      "musl 1.2.5 static Rust",
    ],
    evidence: ["static link check", "dependency graph", "DNS test matrix"],
    articleSlug: "what-rust-1-93-s-musl-upgrade-changed-for-static-network-binaries",
  },
  {
    id: "RFA-026",
    area: "upgrades-compatibility",
    symptom:
      "Rust 2024 drops a temporary earlier, making code fail to compile or changing destructor timing.",
    likelyCause:
      "The edition narrows temporary lifetime extension in selected expression contexts to avoid values living through the end of a larger statement.",
    firstCheck: "Name the temporary explicitly and record its drop point under both editions.",
    searchTerms: [
      "Rust 2024 temporary lifetime error",
      "edition 2024 temporary drop scope",
      "if let temporary dropped Rust 2024",
    ],
    evidence: ["edition pair", "drop trace", "migration rewrite"],
    articleSlug: "rust-2024-temporary-lifetime-drop-scopes",
  },
  {
    id: "RFA-027",
    area: "upgrades-compatibility",
    symptom: "An algebraic float optimization changes results, NaN behavior, or reproducibility.",
    likelyCause:
      "The explicitly algebraic operation permits transformations that do not preserve every IEEE 754 result or evaluation detail.",
    firstCheck:
      "Compare exceptional values and error bounds, not only throughput on ordinary inputs.",
    searchTerms: [
      "Rust algebraic float different result",
      "Rust 1.98 algebraic float operations",
      "fast math Rust NaN",
    ],
    evidence: ["edge-value table", "assembly comparison", "error-bound benchmark"],
    articleSlug: "rust-1-98-algebraic-float-operations-faster-math-with-different-answers",
  },
  {
    id: "RFA-028",
    area: "upgrades-compatibility",
    symptom:
      "Platform-specific code selects the host configuration while cross-compiling for another target.",
    likelyCause:
      "A build script used its own compile-time `cfg!` instead of Cargo's target `CARGO_CFG_*` environment, or branch order encoded the wrong precedence.",
    firstCheck:
      "Print `HOST`, `TARGET`, and the relevant `CARGO_CFG_*` inputs in a controlled cross-target build.",
    searchTerms: [
      "Rust build script cfg wrong target",
      "Cargo HOST TARGET cross compile",
      "cfg_select cross compilation",
    ],
    evidence: ["cross-target fixture", "configuration trace", "branch matrix"],
    articleSlug: "cfg-select-in-rust-1-95-as-a-compile-time-match",
  },
  {
    id: "RFA-029",
    area: "async-runtime",
    symptom:
      "A Tokio test uses paused time, awaits a timer, and never advances to the registered deadline.",
    likelyCause:
      "Paused time advances automatically only when the runtime has no other work, and a running blocking task deliberately inhibits that jump.",
    firstCheck:
      "Record Tokio and wall-clock elapsed time, then remove active `spawn_blocking` work and rerun the same timer.",
    searchTerms: [
      "tokio test start_paused hangs",
      "tokio paused time not advancing",
      "tokio time pause spawn_blocking",
    ],
    evidence: ["dual-clock trace", "task-removal comparison", "explicit time advance"],
    caseSlug: "tokio-paused-time-never-advances",
  },
  {
    id: "RFA-030",
    area: "async-runtime",
    symptom:
      "A Rust process finishes its async work but does not exit when the Tokio runtime is dropped.",
    likelyCause:
      "A started `spawn_blocking` closure cannot be aborted, so runtime shutdown waits for the synchronous operation to return.",
    firstCheck:
      "Bracket runtime destruction with wall-clock events and trace every blocking closure from start through finish.",
    searchTerms: [
      "tokio runtime shutdown hangs",
      "spawn_blocking cannot abort",
      "tokio process will not exit",
    ],
    evidence: ["runtime-drop timing trace", "blocking-task lifecycle", "cooperative stop fixture"],
    caseSlug: "spawn-blocking-keeps-runtime-shutdown-alive",
  },
  {
    id: "RFA-031",
    area: "ffi-targets",
    symptom:
      "Reading a `repr(packed)` field by value compiles, but printing or borrowing it fails with E0793.",
    likelyCause:
      "Formatting and borrowing create a reference whose alignment promise cannot be satisfied by a potentially unaligned packed field.",
    firstCheck:
      "Copy the field into an aligned local before formatting; if needed, compare that with `addr_of!` plus `read_unaligned`.",
    searchTerms: [
      "Rust E0793 println packed field",
      "reference to packed field is unaligned",
      "repr packed read_unaligned",
    ],
    evidence: ["compile-fail example", "layout check", "copy and raw-pointer repairs"],
    caseSlug: "repr-packed-implicit-unaligned-reference",
  },
  {
    id: "RFA-032",
    area: "cargo-dependencies",
    symptom:
      "A Rust crate builds in its workspace but `cargo package` fails because files or dependencies are absent from the distributable crate.",
    likelyCause:
      "The local build consumes repository and path inputs which packaging excludes, rewrites, or resolves differently for a registry consumer.",
    firstCheck:
      "Compare `cargo package --list` and the normalized packaged manifest with every input used by source and build scripts.",
    searchTerms: [
      "cargo package missing file",
      "crate builds locally fails after publish",
      "cargo package list include exclude",
    ],
    evidence: ["package file-list diff", "extracted archive build", "normalized manifest"],
    caseSlug: "cargo-package-missing-files",
  },
  {
    id: "RFA-033",
    area: "async-runtime",
    symptom:
      "A Rust test passes alone but hangs when the full test suite runs with normal parallelism.",
    likelyCause:
      "Tests share a process, threads, environment, ports, or global runtime state, and one interleaving leaves another test waiting for a resource or signal.",
    firstCheck:
      "Run the same test serially, then bisect the smallest companion test set that makes the hang appear.",
    searchTerms: [
      "Rust test passes alone hangs suite",
      "cargo test parallel deadlock",
      "Rust tests interfere shared state",
    ],
    evidence: ["test-set bisection", "thread and task dump", "serialized fixture"],
    caseSlug: "test-hangs-only-in-full-suite",
  },
  {
    id: "RFA-034",
    area: "concurrency-memory",
    symptom:
      "A mutex remains usable even though the operation protected by it returned an error or an async task failed.",
    likelyCause:
      "Standard mutex poisoning is tied to a panic while a guard is held, not to ordinary Result errors, cancelled futures, or every panic context.",
    firstCheck:
      "Record whether a panic actually unwound through the guard's destructor instead of assuming any failed operation poisons the lock.",
    searchTerms: [
      "Rust mutex not poisoned after error",
      "Mutex poison async task panic",
      "Rust lock poisoning conditions",
    ],
    evidence: ["panic-boundary fixture", "guard drop trace", "invariant assertion"],
    caseSlug: "mutex-not-poisoned-after-failure",
  },
  {
    id: "RFA-035",
    area: "async-runtime",
    symptom:
      "A Rust channel receiver reports closure while a sender still appears to exist in the application.",
    likelyCause:
      "The visible sender may belong to another channel generation, sit inside already-dropped state, or never have reached the receiver because ownership moved across a replacement boundary.",
    firstCheck:
      "Assign the channel generation an identity and trace creation, clone, move, and drop events for every sender of that exact generation.",
    searchTerms: [
      "Rust channel closed sender still exists",
      "tokio mpsc receiver closed unexpectedly",
      "channel sender ownership drop trace",
    ],
    evidence: [
      "generation-labelled ownership trace",
      "sender-count checkpoints",
      "replacement fixture",
    ],
    caseSlug: "channel-closed-sender-seemed-alive",
  },
  {
    id: "RFA-036",
    area: "async-runtime",
    symptom:
      "A hand-written Stream returns Pending and is never polled again after new data becomes available.",
    likelyCause:
      "The implementation returned Pending without arranging a future wake, registered the waker after checking state, or retained a stale waker from another task.",
    firstCheck:
      "Force data arrival between the readiness check and waker registration while counting every registration and wake call.",
    searchTerms: [
      "Rust Stream Pending never wakes",
      "custom Stream not polled again",
      "waker registration race Rust",
    ],
    evidence: ["forced interleaving", "waker lifecycle trace", "poll-contract fixture"],
    caseSlug: "stream-pending-never-wakes",
  },
  {
    id: "RFA-037",
    area: "upgrades-compatibility",
    symptom:
      "Integer arithmetic panics in a debug build but wraps or produces a different result in a release build.",
    likelyCause:
      "Overflow checks are profile-controlled for ordinary integer operators, while explicit checked, wrapping, saturating, and overflowing methods keep their chosen semantics.",
    firstCheck:
      "Run the smallest arithmetic input under both profiles and inspect the effective overflow-check setting before changing types.",
    searchTerms: [
      "Rust overflow debug release different",
      "integer overflow checks Cargo profile",
      "Rust release build wraps overflow",
    ],
    evidence: ["profile-paired fixture", "effective profile config", "boundary-value table"],
    caseSlug: "integer-overflow-debug-release",
  },
  {
    id: "RFA-038",
    area: "concurrency-memory",
    symptom:
      "A release-only Rust crash disappears when a log statement, assertion, or unrelated local variable is added.",
    likelyCause:
      "The observation changed timing or optimized layout, exposing a race, invalid unsafe assumption, uninitialized state, or other behavior whose result was never guaranteed.",
    firstCheck:
      "Preserve the failing artifact and vary optimization, debuginfo, scheduling, and instrumentation independently rather than treating logging as a repair.",
    searchTerms: [
      "Rust release crash disappears with println",
      "Rust heisenbug optimization logging",
      "release only undefined behavior Rust",
    ],
    evidence: [
      "2x2 optimization and logging matrix",
      "checked stale-identity model",
      "tooling escalation path",
    ],
    caseSlug: "release-crash-disappears-with-logging",
  },
  {
    id: "RFA-039",
    area: "ffi-targets",
    symptom:
      "A Rust function which appeared in a no-LTO symbol table disappears under LTO, and a foreign host reports that its expected entry point is undefined.",
    likelyCause:
      "The no-LTO linker artifact exposed a mangled implementation item, but the exact foreign name was never defined or rooted; LTO only made that missing ABI contract more visible.",
    firstCheck:
      "Search the final symbol table for the exact foreign name with LTO on and off, then make a foreign host resolve and call that same artifact.",
    searchTerms: [
      "Rust LTO removes FFI symbol",
      "undefined symbol only with lto Rust",
      "Rust exported symbol garbage collected",
    ],
    evidence: ["paired symbol tables", "exact-name check", "foreign static-link and call fixture"],
    caseSlug: "lto-removes-ffi-symbol",
  },
  {
    id: "RFA-040",
    area: "cargo-dependencies",
    symptom:
      "The linker is killed for a release build while debug builds of the same Rust workspace complete successfully.",
    likelyCause:
      "Release code generation, debug information, monomorphization, LTO, or parallel native linking raises peak memory beyond the available limit.",
    firstCheck:
      "Measure peak resident memory and capture the exact linker invocation before reducing jobs or changing release profile settings.",
    searchTerms: [
      "Rust linker killed release build memory",
      "cargo build release ld killed",
      "Rust LTO linker out of memory",
    ],
    evidence: ["peak-memory trace", "profile comparison", "linker invocation"],
    caseSlug: "linker-killed-release-build",
  },
  {
    id: "RFA-041",
    area: "ffi-targets",
    symptom:
      "A native dependency compiles successfully during cross-compilation but produces code for the build host instead of the Rust target.",
    likelyCause:
      "A build script invokes a C compiler or generator without forwarding Cargo's HOST, TARGET, compiler, archiver, and target-specific environment correctly.",
    firstCheck:
      "Log `HOST`, `TARGET`, selected compiler, compiler flags, and output object format from the build script in one cross-target build.",
    searchTerms: [
      "Rust build script compiles C for host",
      "cc crate wrong target cross compile",
      "Cargo HOST TARGET native dependency",
    ],
    evidence: [
      "build-script environment trace",
      "object-header inspection",
      "cross-target fixture",
    ],
    caseSlug: "native-dependency-built-for-host",
  },
  {
    id: "RFA-042",
    area: "cargo-dependencies",
    symptom:
      "A Rust sys crate discovers the wrong native library installation or links headers and binaries from different versions.",
    likelyCause:
      "Environment overrides, pkg-config paths, vendored features, and platform discovery rules select different installations at compile and link time.",
    firstCheck:
      "Capture every emitted `cargo:rustc-link-*` directive and discovery environment variable, then resolve each path to one installation.",
    searchTerms: [
      "openssl-sys wrong installation Rust",
      "pkg-config Rust links wrong library",
      "cargo sys crate native library path",
    ],
    evidence: [
      "build-script directive log",
      "header and library version trace",
      "dynamic-loader inspection",
    ],
    caseSlug: "sys-crate-wrong-native-library",
  },
  {
    id: "RFA-043",
    area: "cargo-dependencies",
    symptom:
      "A Rust binary fails to link or crashes because two dependencies bring incompatible copies of one native library.",
    likelyCause:
      "Cargo can model Rust packages but cannot always reconcile global native symbols, allocator state, or singleton runtime assumptions across two native versions.",
    firstCheck:
      "Trace every native link directive and final resolved library, then map each one back to the Rust dependency that introduced it.",
    searchTerms: [
      "Rust two versions native library link",
      "Cargo links duplicate C library",
      "links field conflict sys crate",
    ],
    evidence: ["Cargo dependency graph", "final link map", "runtime loader trace"],
    caseSlug: "incompatible-native-library-copies",
  },
  {
    id: "RFA-044",
    area: "ffi-targets",
    symptom:
      "A Rust enum passed through C works until a new variant is added or another compiler chooses a different representation.",
    likelyCause:
      "The boundary relies on a representation, numeric range, or exhaustiveness assumption that was not fixed as part of the foreign ABI contract.",
    firstCheck:
      "Record the exact integer representation and test unknown discriminants on both sides instead of comparing only familiar variants.",
    searchTerms: [
      "Rust enum C FFI new variant break",
      "repr C enum ABI Rust",
      "Rust FFI invalid enum discriminant",
    ],
    evidence: ["two-language ABI fixture", "size and discriminant table", "unknown-value test"],
    caseSlug: "ffi-enum-new-variant",
  },
  {
    id: "RFA-045",
    area: "ffi-targets",
    symptom:
      "A panic reaches an extern boundary and the process aborts or enters behavior the caller cannot safely recover from.",
    likelyCause:
      "The function's ABI and panic strategy do not permit unwinding through foreign frames, and a Rust panic was not contained before returning control.",
    firstCheck:
      "Identify the exact ABI and panic setting, then force a panic in a two-language fixture while observing whether unwinding crosses the boundary.",
    searchTerms: [
      "Rust panic across extern C boundary",
      "panic in FFI callback abort",
      "catch_unwind Rust C ABI",
    ],
    evidence: ["ABI and panic matrix", "forced-panic fixture", "error-channel repair"],
    caseSlug: "panic-crosses-extern-boundary",
  },
  {
    id: "RFA-046",
    area: "ffi-targets",
    symptom:
      "Memory allocated by Rust or a native library corrupts the heap when the other side releases it.",
    likelyCause:
      "Allocation and deallocation cross different allocator instances, runtimes, layouts, or ownership conventions even though the raw pointer type appears compatible.",
    firstCheck:
      "Trace each allocation to its allocator and require the same component to expose the matching destroy operation.",
    searchTerms: [
      "Rust FFI free different allocator",
      "heap corruption Rust C ownership",
      "CString foreign free allocator mismatch",
    ],
    evidence: ["allocator ownership trace", "boundary API audit", "sanitizer fixture"],
    caseSlug: "ffi-memory-freed-wrong-allocator",
  },
  {
    id: "RFA-047",
    area: "concurrency-memory",
    symptom:
      "A self-referential Rust value works in place but its internal pointer becomes invalid after the value moves.",
    likelyCause:
      "The pointer targets storage inside the same value, while ordinary Rust moves may relocate that storage without rewriting the pointer.",
    firstCheck:
      "Log the value and pointee addresses before and after every ownership transfer, container insertion, and return boundary.",
    searchTerms: [
      "Rust self referential struct move invalid pointer",
      "Pin self reference address changes",
      "Rust internal pointer after move",
    ],
    evidence: ["address trace", "move-forcing fixture", "pinning invariant"],
    caseSlug: "self-referential-value-moved",
  },
  {
    id: "RFA-048",
    area: "concurrency-memory",
    symptom:
      "A raw pointer into a Vec becomes invalid after an unrelated push, reserve, or extension of the vector.",
    likelyCause:
      "Growing the vector may reallocate its buffer, so pointers and references into the old allocation no longer identify live elements.",
    firstCheck:
      "Record pointer, capacity, and allocation address before and after the operation that can grow the vector.",
    searchTerms: [
      "Rust pointer into Vec invalid after push",
      "Vec reallocation dangling pointer Rust",
      "Rust reserve invalidates references",
    ],
    evidence: ["capacity and address trace", "forced-reallocation fixture", "index-based repair"],
    caseSlug: "vec-pointer-invalid-after-push",
  },
  {
    id: "RFA-049",
    area: "concurrency-memory",
    symptom:
      "Dropping a very large recursive Rust structure overflows the thread stack even though construction and traversal succeeded.",
    likelyCause:
      "Automatically generated destruction follows recursive ownership depth and keeps one destructor frame per nested node.",
    firstCheck:
      "Sweep structure depth while separating traversal from destruction, then observe whether the overflow occurs at scope exit.",
    searchTerms: [
      "Rust drop recursive list stack overflow",
      "Box linked list destructor stack overflow",
      "iterative drop Rust tree",
    ],
    evidence: ["depth sweep", "drop-only fixture", "iterative destruction repair"],
    caseSlug: "recursive-drop-stack-overflow",
  },
  {
    id: "RFA-050",
    area: "diagnostics-macros",
    symptom:
      "A Rust doctest sees different cfg values, crate structure, or imports from a normal unit or integration test.",
    likelyCause:
      "rustdoc extracts examples into generated test crates and invokes compilation with a context that is not identical to the library's ordinary test target.",
    firstCheck:
      "Capture rustdoc and rustc invocations, then print the relevant cfg values from an extracted minimal doctest and a normal test.",
    searchTerms: [
      "Rust doctest cfg different",
      "rustdoc test cfg doctest",
      "doctest passes unit test fails Rust",
    ],
    evidence: ["invocation comparison", "cfg printout", "extracted doctest fixture"],
    caseSlug: "doctest-different-cfg",
  },
  {
    id: "RFA-051",
    area: "diagnostics-macros",
    symptom:
      "Rust reports a borrow of a partially moved value after one owned field was extracted from a struct.",
    likelyCause:
      "Moving a non-Copy field makes that field unavailable and prevents operations which need to borrow the complete struct, even while its other fields remain usable.",
    firstCheck:
      "Find the first by-value field access and change only that access to a borrow to confirm whether a partial move created the later failure.",
    searchTerms: [
      "Rust borrow of partially moved value E0382",
      "use struct after moving field Rust",
      "partial move borrow whole value",
    ],
    evidence: ["Rust 1.98.1 compile failure", "field-state table", "borrowed-field repair"],
    caseSlug: "partial-move-borrows-whole-value",
  },
  {
    id: "RFA-052",
    area: "diagnostics-macros",
    symptom:
      "Assigning through `values[values.len() - 1]` fails because the same vector is borrowed as mutable and immutable.",
    likelyCause:
      "Index assignment must create a mutable indexing borrow while evaluation of the index expression also calls `len` through an immutable borrow of the same vector.",
    firstCheck:
      "Store the computed index in a local before the assignment and recompile without changing the collection or the mutation itself.",
    searchTerms: [
      "Rust cannot borrow vector immutable mutable same line E0502",
      "values values len index borrow error",
      "Rust vec last element assignment borrow",
    ],
    evidence: ["Rust 1.98.1 compile failure", "evaluation-order reduction", "local-index repair"],
    caseSlug: "indexing-vec-borrows-it-twice",
  },
  {
    id: "RFA-053",
    area: "diagnostics-macros",
    symptom:
      "A function returning `HashMap::get_mut` from one branch cannot insert and borrow the map again in the other branch.",
    likelyCause:
      "Returning the first mutable reference requires its borrow to remain valid for the function's output lifetime, so the later mutation conflicts even on a branch that looks disjoint.",
    firstCheck:
      "Replace the lookup-then-insert control flow with one `entry` operation and check whether the returned reference now comes from a single map borrow.",
    searchTerms: [
      "HashMap get_mut then insert E0499 Rust",
      "cannot borrow map mutable more than once return",
      "Rust get or insert mutable reference borrow checker",
    ],
    evidence: ["Rust 1.98.1 compile failure", "borrow-lifetime trace", "Entry API repair"],
    caseSlug: "hashmap-get-mut-then-insert-borrow",
  },
  {
    id: "RFA-054",
    area: "diagnostics-macros",
    symptom:
      "A function cannot return `&str` created from a local `String`, even when the requested lifetime is written as `'static`.",
    likelyCause:
      "A lifetime annotation describes a relationship but does not extend storage; the local String is dropped before any returned reference could be used.",
    firstCheck:
      "Change the return type to owned `String` without changing how the text is built and confirm that moving ownership across the boundary compiles.",
    searchTerms: [
      "Rust cannot return value referencing local variable E0515",
      "return str from local String Rust",
      "static lifetime does not make value live longer",
    ],
    evidence: ["Rust 1.98.1 compile failure", "owner-lifetime timeline", "owned return repair"],
    caseSlug: "return-reference-to-local-string",
  },
  {
    id: "RFA-055",
    area: "diagnostics-macros",
    symptom:
      "Borrowing from a constructed value in one `let` statement produces E0716: temporary value dropped while borrowed.",
    likelyCause:
      "The owned temporary is normally destroyed at the end of the statement, while the derived reference is stored and used by a later statement.",
    firstCheck:
      "Give the temporary owner its own local binding, borrow from that binding on the next line, and compare the resulting drop scope.",
    searchTerms: [
      "Rust E0716 temporary value dropped while borrowed",
      "String as_bytes temporary lifetime",
      "consider using a let binding longer lived value",
    ],
    evidence: ["Rust 1.98.1 compile failure", "temporary-scope timeline", "owner-binding repair"],
    caseSlug: "temporary-value-dropped-while-borrowed",
  },
  {
    id: "RFA-056",
    area: "diagnostics-macros",
    symptom:
      "The `?` operator rejects an inner error even though both the called function and its caller return `Result`.",
    likelyCause:
      "Question-mark propagation converts the residual error into the caller's error type, and no `From` conversion connects the two concrete error types.",
    firstCheck:
      "Write the equivalent `match` and attempt `ServiceError::from(error)` explicitly to expose the exact missing conversion contract.",
    searchTerms: [
      "Rust question mark couldn't convert error E0277",
      "trait From error not implemented question mark",
      "Rust Result different error types question mark",
    ],
    evidence: [
      "Rust 1.98.1 compile failure",
      "desugared propagation",
      "From implementation repair",
    ],
    caseSlug: "question-mark-cannot-convert-error",
  },
  {
    id: "RFA-057",
    area: "diagnostics-macros",
    symptom:
      "Calling `.into()` produces E0283 because several destination types can be constructed from the same source type.",
    likelyCause:
      "`Into` leaves its destination as an inference variable, and the surrounding expression supplies no use that selects one of the available `From` implementations.",
    firstCheck:
      "Annotate the receiving local or name the destination with `Destination::from(value)` and confirm that only the missing output type was ambiguous.",
    searchTerms: [
      "Rust into type annotations needed E0283",
      "multiple impls satisfying From into ambiguous",
      "cannot infer type for into Rust",
    ],
    evidence: [
      "Rust 1.98.1 compile failure",
      "candidate-type inventory",
      "two explicit-type repairs",
    ],
    caseSlug: "into-needs-type-annotations",
  },
  {
    id: "RFA-058",
    area: "diagnostics-macros",
    symptom:
      "Rust says a method does not exist even though a visible trait implements that method for the receiver type.",
    likelyCause:
      "Trait-provided methods participate in method lookup only when the trait is in scope, unless another path such as a prelude already imports it.",
    firstCheck:
      "Call the method with fully qualified trait syntax or import the trait directly, without adding another inherent method or changing the receiver.",
    searchTerms: [
      "Rust method not found trait implemented E0599",
      "trait implemented but not in scope method",
      "items from traits can only be used if trait is in scope",
    ],
    evidence: ["Rust 1.98.1 compile failure", "method-candidate comparison", "trait-import repair"],
    caseSlug: "trait-method-not-found-import",
  },
  {
    id: "RFA-059",
    area: "diagnostics-macros",
    symptom:
      "A trait works as a generic bound but Rust rejects `&dyn Trait` because a method has its own type parameter.",
    likelyCause:
      "A trait object calls through one runtime vtable, while a generic method would require an open-ended family of monomorphized entries that the vtable cannot contain.",
    firstCheck:
      "Replace the generic method with one method using a concrete erased input or output and check whether the trait then becomes dyn compatible.",
    searchTerms: [
      "Rust trait is not dyn compatible E0038 generic method",
      "trait cannot be made into an object vtable",
      "Rust object safety method has generic type parameters",
    ],
    evidence: ["Rust 1.98.1 compile failure", "vtable-slot model", "object-safe interface repair"],
    caseSlug: "trait-not-dyn-compatible-generic-method",
  },
  {
    id: "RFA-060",
    area: "diagnostics-macros",
    symptom:
      "A function returning `impl Iterator` rejects `if` branches that each return a valid iterator with the same item type.",
    likelyCause:
      "Return-position `impl Trait` hides one concrete type for the whole function; equal trait implementations and item types do not make two iterator structs identical.",
    firstCheck:
      "Name both concrete iterator types from the diagnostic, then erase them behind one boxed trait object to confirm the hidden-type mismatch.",
    searchTerms: [
      "Rust impl Iterator if else incompatible types E0308",
      "impl Trait different concrete types branches",
      "expected Range found IntoIter Rust",
    ],
    evidence: ["Rust 1.98.1 compile failure", "concrete-type comparison", "boxed iterator repair"],
    caseSlug: "impl-trait-branches-different-types",
  },
  {
    id: "RFA-061",
    area: "diagnostics-macros",
    symptom:
      "A returned closure receives E0373 because it borrows a local value owned by the function that creates it.",
    likelyCause:
      "Without `move`, the closure capture is a reference into the creator's stack frame, but the returned closure can be called after that frame has ended.",
    firstCheck:
      "Add `move` to the closure and confirm that ownership of the captured value, rather than a reference to the local, crosses the return boundary.",
    searchTerms: [
      "Rust E0373 closure may outlive current function",
      "return closure borrows local variable",
      "move closure owned value Rust",
    ],
    evidence: ["Rust 1.98.1 compile failure", "capture-mode comparison", "move closure repair"],
    caseSlug: "returned-closure-borrows-local-value",
  },
  {
    id: "RFA-062",
    area: "diagnostics-macros",
    symptom:
      "Adding an explicit `&str` type to a closure parameter triggers E0521 because the borrowed argument escapes into an outer vector.",
    likelyCause:
      "The parameter annotation introduces an independently quantified reference lifetime, while storing the value outside the closure requires a relationship the annotation does not provide.",
    firstCheck:
      "Remove only the closure parameter annotation and let the surrounding vector and call sites infer the reference relationship before redesigning ownership.",
    searchTerms: [
      "Rust E0521 borrowed data escapes outside closure",
      "closure parameter type annotation lifetime escapes",
      "Vec reference closure value escapes",
    ],
    evidence: [
      "Rust 1.98.1 compile failure",
      "inferred-lifetime comparison",
      "annotation removal repair",
    ],
    caseSlug: "closure-parameter-reference-escapes",
  },
  {
    id: "RFA-063",
    area: "diagnostics-macros",
    symptom:
      "An `impl Iterator` return gets E0700 because its hidden iterator type captures an input lifetime not named in the return bounds.",
    likelyCause:
      "The concrete iterator stores a slice iterator borrowing the input, while the opaque return contract does not explicitly capture that lifetime under the selected edition rules.",
    firstCheck:
      "Add a precise `use<'a>` capture to the opaque return and verify that the iterator cannot then outlive the borrowed slice.",
    searchTerms: [
      "Rust E0700 hidden type captures lifetime impl Iterator",
      "impl Trait lifetime does not appear in bounds",
      "Rust use lifetime precise capture iterator",
    ],
    evidence: ["Rust 1.98.1 compile failure", "hidden-type expansion", "precise-capture repair"],
    caseSlug: "impl-iterator-hidden-type-captures-lifetime",
  },
  {
    id: "RFA-064",
    area: "diagnostics-macros",
    symptom:
      "Rust rejects `dyn Source` with E0191 because the trait's associated `Item` type was not fixed at the object boundary.",
    likelyCause:
      "Dynamic dispatch needs one concrete method signature in the vtable, but `next` has a different return type for each possible associated Item choice.",
    firstCheck:
      "Specify `dyn Source<Item = ConcreteType>` at the first trait-object boundary and check whether all implementations crossing it share that item type.",
    searchTerms: [
      "Rust E0191 associated type must be specified dyn Trait",
      "value of associated type Item must be specified",
      "trait object associated type Rust",
    ],
    evidence: [
      "Rust 1.98.1 compile failure",
      "vtable-signature comparison",
      "associated-type binding repair",
    ],
    caseSlug: "dyn-trait-associated-type-must-be-specified",
  },
  {
    id: "RFA-065",
    area: "diagnostics-macros",
    symptom:
      "`Iterator::chain` produces E0271 when one iterator yields `&u8` and the next yields owned `u8` values.",
    likelyCause:
      "A chained iterator has one Item type, and borrowing with `iter()` versus consuming with `into_iter()` creates distinct reference and value item types.",
    firstCheck:
      "Write the Item type of both iterators and apply `copied` or `cloned` deliberately to the borrowed side before chaining them.",
    searchTerms: [
      "Rust Iterator chain expected reference found value E0271",
      "chain iter into_iter item type mismatch",
      "IntoIter Item equals reference Rust error",
    ],
    evidence: ["Rust 1.98.1 compile failure", "associated-item table", "copied iterator repair"],
    caseSlug: "iterator-chain-reference-value-item-mismatch",
  },
  {
    id: "RFA-066",
    area: "diagnostics-macros",
    symptom:
      "Trait solving ends with E0275 and an enormous nested type after a recursive blanket implementation was added.",
    likelyCause:
      "Proving the trait for `T` requires the same trait for `Vec<T>`, which requires it for `Vec<Vec<T>>` and creates no decreasing base case.",
    firstCheck:
      "Expand three solver obligations by hand and check whether each step reaches a smaller structural component or constructs a larger type again.",
    searchTerms: [
      "Rust E0275 overflow evaluating requirement recursive trait",
      "huge nested Vec trait solver overflow",
      "recursion_limit does not fix trait overflow",
    ],
    evidence: [
      "Rust 1.98.1 compile failure",
      "obligation expansion",
      "structurally decreasing repair",
    ],
    caseSlug: "trait-solver-overflow-recursive-blanket-impl",
  },
  {
    id: "RFA-067",
    area: "diagnostics-macros",
    symptom:
      "A concrete trait implementation conflicts with a blanket implementation even though its current where-clause is not satisfied.",
    likelyCause:
      "Coherence must remain valid when upstream crates add implementations in future releases, so a foreign type may enter the blanket set later.",
    firstCheck:
      "Identify which trait and self types are local, then test the concrete behavior behind a local newtype that upstream crates cannot change.",
    searchTerms: [
      "Rust E0119 conflicting implementations upstream crates may add impl",
      "blanket impl conflicts with specific impl future",
      "Rust coherence newtype overlap",
    ],
    evidence: ["Rust 1.98.1 compile failure", "future-overlap proof", "local-newtype repair"],
    caseSlug: "blanket-impl-conflicts-with-specific-impl",
  },
  {
    id: "RFA-068",
    area: "diagnostics-macros",
    symptom:
      "An inherent `impl<T>` receives E0207 because the type parameter appears only inside one method body or return expression.",
    likelyCause:
      "The implementation block does not identify which instance of the self type it belongs to, so `Marker::method` cannot select one value for T.",
    firstCheck:
      "Move `T` onto the method or add it to the self type, then check whether type selection belongs to each call or to each constructed value.",
    searchTerms: [
      "Rust E0207 unconstrained type parameter inherent impl",
      "type parameter T not constrained by impl self type",
      "move generic parameter from impl to method",
    ],
    evidence: [
      "Rust 1.98.1 compile failure",
      "selection-boundary comparison",
      "generic-method repair",
    ],
    caseSlug: "unconstrained-type-parameter-in-impl",
  },
  {
    id: "RFA-069",
    area: "diagnostics-macros",
    symptom:
      "Implementing `From<LocalWrapper<T>> for T` fails with E0210 even though the wrapper in the trait arguments is local.",
    likelyCause:
      "In the ordered foreign-trait implementation header, the uncovered parameter T appears as Self before the first local type covers it.",
    firstCheck:
      "Read the impl header in Self-then-trait-argument order and locate every uncovered parameter before the first local nominal type.",
    searchTerms: [
      "Rust E0210 type parameter must be covered local type From Wrapper",
      "uncovered type parameter before first local type",
      "Rust orphan rule From local generic wrapper",
    ],
    evidence: [
      "Rust 1.98.1 compile failure",
      "impl-header ordering",
      "local-target conversion repair",
    ],
    caseSlug: "foreign-trait-uncovered-type-parameter-order",
  },
  {
    id: "RFA-070",
    area: "diagnostics-macros",
    symptom:
      "Moving an owned field out of a consumed struct fails with E0509 only after the struct receives a `Drop` implementation.",
    likelyCause:
      "The destructor must run on the complete value and may observe or act on its fields, so safe code cannot leave one non-Copy field moved before `drop` executes.",
    firstCheck:
      "Wrap the field in `Option` and use `take` through `&mut self` to leave a valid replacement state for the later destructor.",
    searchTerms: [
      "Rust E0509 cannot move out type implements Drop",
      "move field out of struct with destructor",
      "Option take field Drop type Rust",
    ],
    evidence: ["Rust 1.98.1 compile failure", "destructor-state model", "Option take repair"],
    caseSlug: "cannot-move-field-out-of-drop-type",
  },
  {
    id: "RFA-071",
    area: "diagnostics-macros",
    symptom:
      "A closure that changes a captured variable is rejected because the receiving API requires `Fn` instead of `FnMut`.",
    likelyCause:
      "Mutation needs exclusive access to the captured environment, while an `Fn` bound promises calls through a shared reference to the closure.",
    firstCheck:
      "Change only the callback bound and local parameter to `FnMut`, then verify whether the API can honestly provide exclusive access for every call.",
    searchTerms: [
      "Rust E0594 cannot assign captured variable Fn closure",
      "expected Fn instead of FnMut callback",
      "closure mutate captured variable trait bound",
    ],
    evidence: ["Rust 1.98.1 compile failure", "closure receiver model", "FnMut bound repair"],
    caseSlug: "closure-mutates-capture-but-api-requires-fn",
  },
  {
    id: "RFA-072",
    area: "diagnostics-macros",
    symptom:
      "A closure passed as `FnMut` cannot move and consume one captured String even when the API currently calls it only once.",
    likelyCause:
      "The `FnMut` contract permits repeated calls, but consuming a non-Copy capture removes the value needed to execute the same closure body again.",
    firstCheck:
      "Change the receiver contract to `FnOnce` and confirm whether consuming the callback and its captured state matches the real call-count guarantee.",
    searchTerms: [
      "Rust E0507 cannot move captured variable FnMut closure",
      "FnMut closure consume captured String",
      "change callback to FnOnce Rust",
    ],
    evidence: ["Rust 1.98.1 compile failure", "call-trait comparison", "FnOnce repair"],
    caseSlug: "fnmut-closure-cannot-consume-captured-value",
  },
  {
    id: "RFA-073",
    area: "diagnostics-macros",
    symptom:
      "A directly recursive async function fails with E0733 because its generated future would need to contain itself.",
    likelyCause:
      "Each async call stores the child future as part of its state, so direct recursion creates an infinitely expanding concrete future type without indirection.",
    firstCheck:
      "Box the future at the recursive function boundary and verify that each state now stores a fixed-size pointer rather than another inline copy.",
    searchTerms: [
      "Rust E0733 recursion in async fn requires boxing",
      "recursive async function infinitely sized future",
      "Box pin recursive future Rust",
    ],
    evidence: ["Rust 1.98.1 compile failure", "future-size expansion", "boxed-future repair"],
    caseSlug: "recursive-async-fn-requires-boxing",
  },
  {
    id: "RFA-074",
    area: "diagnostics-macros",
    symptom:
      "Using `.await` inside an ordinary function produces E0728 even when the awaited expression is itself an async block.",
    likelyCause:
      "Await suspends the surrounding state machine, and a synchronous function body has no generated Future state or polling context to suspend.",
    firstCheck:
      "Mark the containing boundary async and follow its returned Future to the executor or caller instead of modifying only the inner expression.",
    searchTerms: [
      "Rust E0728 await only allowed inside async function",
      "cannot await async block in normal fn",
      "where to call await Rust executor boundary",
    ],
    evidence: [
      "Rust 1.98.1 compile failure",
      "surrounding-state-machine model",
      "async-boundary repair",
    ],
    caseSlug: "await-needs-an-async-containing-function",
  },
  {
    id: "RFA-075",
    area: "concurrency-memory",
    symptom:
      "A generic helper using `transmute<T, U>` fails with E0512 even though callers intend to choose equal-sized types.",
    likelyCause:
      "The generic function must be valid for every permitted T and U at definition time, but their sizes have no type-level equality relationship in the signature.",
    firstCheck:
      "Replace the generic representation conversion with one concrete, documented conversion and compare size, validity, alignment, and endianness separately.",
    searchTerms: [
      "Rust E0512 generic transmute dependently sized types",
      "cannot transmute T to U same size caller",
      "generic transmute size equality Rust",
    ],
    evidence: [
      "Rust 1.98.1 compile failure",
      "validity-contract audit",
      "typed byte conversion repair",
    ],
    caseSlug: "generic-transmute-has-no-size-equality-proof",
  },
  {
    id: "RFA-076",
    area: "concurrency-memory",
    symptom:
      "Casting a `*const str` directly to `usize` fails with E0606 because the raw string-slice pointer is wide.",
    likelyCause:
      "A pointer to `str` contains both a data address and length metadata, while one integer can represent only the thin data-address component.",
    firstCheck:
      "Obtain the byte data pointer with `as_ptr` and keep the length separately before converting only that thin pointer to an address value.",
    searchTerms: [
      "Rust E0606 casting const str pointer as usize invalid",
      "cast through thin pointer first Rust",
      "fat pointer str address metadata",
    ],
    evidence: [
      "Rust 1.98.1 compile failure",
      "pointer-component model",
      "thin data-pointer repair",
    ],
    caseSlug: "wide-str-pointer-cannot-cast-to-usize",
  },
  {
    id: "RFA-077",
    area: "diagnostics-macros",
    symptom:
      "A constant expression fails the build with E0080 when evaluation reaches an operation that would panic at runtime.",
    likelyCause:
      "Required const evaluation executes during compilation, and an invalid operation such as division by zero makes the constant impossible to produce.",
    firstCheck:
      "Move the operation into a const function returning `Option` or `Result` and inspect the invalid case without forcing a panicking value.",
    searchTerms: [
      "Rust E0080 evaluation of constant failed divide by zero",
      "const evaluation panic compile time Rust",
      "attempt to divide by zero constant",
    ],
    evidence: ["Rust 1.98.1 compile failure", "const evaluation trace", "checked const repair"],
    caseSlug: "constant-evaluation-failed-on-invalid-operation",
  },
  {
    id: "RFA-078",
    area: "diagnostics-macros",
    symptom:
      "A constant initializer receives E0015 because it calls an ordinary function that happens to return a compile-time-friendly value.",
    likelyCause:
      "Const contexts accept only operations in the stable const subset, and an ordinary function does not promise that its body remains valid for compile-time interpretation.",
    firstCheck:
      "Mark the smallest pure helper `const fn` and let the compiler validate each operation in its body before widening the compile-time API.",
    searchTerms: [
      "Rust E0015 cannot call non const function in constants",
      "function result known but const initializer fails",
      "make helper const fn Rust",
    ],
    evidence: ["Rust 1.98.1 compile failure", "const-context boundary", "const fn repair"],
    caseSlug: "constant-cannot-call-ordinary-function",
  },
  {
    id: "RFA-079",
    area: "concurrency-memory",
    symptom:
      "A Rust union containing `String` fails with E0740 because a union field may not run automatic drop glue.",
    likelyCause:
      "The active union field is not tracked by the type system at runtime, so automatic destruction cannot know whether the String is initialized and must be dropped.",
    firstCheck:
      "Wrap the field in `ManuallyDrop` and write down the active-variant invariant and exact initialization-to-destruction path before using the union.",
    searchTerms: [
      "Rust E0740 union field must implement Copy ManuallyDrop",
      "String field in Rust union",
      "union active field manual drop safety",
    ],
    evidence: ["Rust 1.98.1 compile failure", "active-field invariant", "ManuallyDrop repair"],
    caseSlug: "union-string-field-needs-manuallydrop",
  },
  {
    id: "RFA-080",
    area: "concurrency-memory",
    symptom:
      "Rust 2024 code denies a raw-pointer dereference inside `unsafe fn` until the operation receives its own unsafe block.",
    likelyCause:
      "An unsafe function places obligations on its caller but does not make every operation in its body implicitly approved under the unsafe-op lint model.",
    firstCheck:
      "Wrap only the raw dereference in an unsafe block and record the local safety argument that connects caller obligations to that operation.",
    searchTerms: [
      "Rust E0133 unsafe op in unsafe fn 2024",
      "raw pointer dereference requires unsafe block inside unsafe function",
      "unsafe_op_in_unsafe_fn deny migration",
    ],
    evidence: [
      "Rust 1.98.1 edition-2024 failure",
      "unsafe-boundary audit",
      "documented unsafe block repair",
    ],
    caseSlug: "unsafe-function-body-still-needs-unsafe-block",
  },
  {
    id: "RFA-081",
    area: "upgrades-compatibility",
    symptom:
      "A variable or method named `gen` compiles before an edition migration and becomes a reserved-keyword parse error in Rust 2024.",
    likelyCause:
      "The 2024 edition reserves `gen` for future language syntax, so an identifier that was ordinary in an older edition now needs renaming or raw-identifier syntax.",
    firstCheck:
      "Compile the smallest occurrence with edition 2024 and decide whether `r#gen` is required for compatibility or a domain name is clearer.",
    searchTerms: [
      "Rust 2024 gen reserved keyword compile error",
      "expected identifier found reserved keyword gen",
      "cargo fix edition gen keyword raw identifier",
    ],
    evidence: ["Rust 1.98.1 edition-2024 failure", "edition comparison", "identifier repair"],
    caseSlug: "gen-keyword-breaks-2024-edition-build",
  },
  {
    id: "RFA-082",
    area: "upgrades-compatibility",
    symptom:
      "Rust 2024 rejects `#[no_mangle]` with 'unsafe attribute used without unsafe' even though the function body is safe.",
    likelyCause:
      "The attribute participates in the process-wide symbol namespace, where collisions and incorrect declarations can violate assumptions outside the function body.",
    firstCheck:
      "Wrap the attribute as `#[unsafe(no_mangle)]`, then audit symbol ownership, uniqueness, ABI, and signature instead of treating the wrapper as syntax only.",
    searchTerms: [
      "Rust unsafe attribute used without unsafe no_mangle",
      "Rust 2024 unsafe no_mangle migration",
      "wrap attribute in unsafe no_mangle",
    ],
    evidence: ["Rust 1.98.1 edition-2024 failure", "symbol invariant", "unsafe-attribute repair"],
    caseSlug: "unsafe-attribute-required-for-no-mangle",
  },
  {
    id: "RFA-083",
    area: "upgrades-compatibility",
    symptom:
      'An `extern "C"` declaration block fails in Rust 2024 because the block is not marked unsafe.',
    likelyCause:
      "Writing foreign signatures creates an unchecked contract with code outside Rust, and edition 2024 makes the declaration-side proof obligation explicit.",
    firstCheck:
      "Add `unsafe extern`, then compare every declared function, static, ABI, and platform type against the authoritative foreign header.",
    searchTerms: [
      "Rust 2024 extern blocks must be unsafe",
      "unsafe extern C migration Rust",
      "missing unsafe on extern block",
    ],
    evidence: ["Rust 1.98.1 edition-2024 failure", "declaration audit", "unsafe-extern repair"],
    caseSlug: "extern-block-must-be-unsafe-in-rust-2024",
  },
  {
    id: "RFA-084",
    area: "upgrades-compatibility",
    symptom:
      "A previously ordinary call to `std::env::set_var` requires an unsafe block after moving the crate to edition 2024.",
    likelyCause:
      "Process environment mutation can race with environment reads performed by other threads or foreign libraries, and the safety condition cannot be checked locally.",
    firstCheck:
      "Move environment configuration before any thread can exist; if that cannot be proven, replace mutation with explicit configuration passed through the program.",
    searchTerms: [
      "Rust 2024 set_var unsafe E0133",
      "std env set_var now unsafe",
      "environment mutation multithreaded Rust safety",
    ],
    evidence: [
      "Rust 1.98.1 edition-2024 failure",
      "thread-lifecycle invariant",
      "documented unsafe repair",
    ],
    caseSlug: "set-var-is-unsafe-in-rust-2024",
  },
  {
    id: "RFA-085",
    area: "upgrades-compatibility",
    symptom:
      "A pattern such as `let [mut value] = &[41]` stops compiling in Rust 2024 because it mixes an implicit borrow with an explicit binding mode.",
    likelyCause:
      "The pattern uses match ergonomics to skip a reference while also requesting a by-value mutable binding, an ambiguity the 2024 rules reserve.",
    firstCheck:
      "Write the reference part of the pattern explicitly, then inspect the inferred binding type before copying the migration mechanically.",
    searchTerms: [
      "Rust 2024 cannot mutably bind by value implicitly borrowing pattern",
      "match ergonomics reservation mut binding",
      "binding modifier not allowed when implicitly borrowing",
    ],
    evidence: [
      "Rust 1.98.1 edition-2024 failure",
      "binding-mode trace",
      "fully explicit pattern repair",
    ],
    caseSlug: "match-ergonomics-mut-binding-rust-2024",
  },
  {
    id: "RFA-086",
    area: "async-runtime",
    symptom:
      "An async function becomes a non-Send future because an `Rc` value remains live across an await point.",
    likelyCause:
      "The suspended future stores every value needed after the await, and `Rc` cannot be transferred safely if an executor moves that future to another thread.",
    firstCheck:
      "Inspect the compiler's 'used across an await' note and shorten the `Rc` scope before changing the whole data model to `Arc`.",
    searchTerms: [
      "Rust future cannot be sent Rc across await",
      "future is not Send value used across await",
      "Tokio spawn Rc not Send scope",
    ],
    evidence: ["Rust 1.98.1 compile failure", "future-state boundary", "scope-shortening repair"],
    caseSlug: "rc-across-await-makes-future-not-send",
  },
  {
    id: "RFA-087",
    area: "async-runtime",
    symptom:
      "Holding `std::sync::MutexGuard` across `.await` makes the enclosing future fail a Send requirement.",
    likelyCause:
      "The guard becomes stored state at suspension, but the standard-library guard is deliberately not Send and also keeps a blocking mutex locked while other work runs.",
    firstCheck:
      "Copy or extract the required data inside a lexical guard scope and let the guard disappear before the first await.",
    searchTerms: [
      "Rust MutexGuard across await future not Send",
      "std sync mutex guard Tokio spawn Send",
      "future cannot be sent MutexGuard await",
    ],
    evidence: [
      "Rust 1.98.1 compile failure",
      "suspension-state inspection",
      "pre-await unlock repair",
    ],
    caseSlug: "mutex-guard-across-await-makes-future-not-send",
  },
  {
    id: "RFA-088",
    area: "async-runtime",
    symptom:
      "`Pin::new(&mut future)` rejects an async block with E0277 because its anonymous future is not Unpin.",
    likelyCause:
      "The safe `Pin::new` constructor requires a pointer target that may already move, while an async future may become self-referential after polling.",
    firstCheck:
      "Use `Box::pin` for an owned future or `pin!` for a local future, then keep the resulting pinned handle instead of moving the original value.",
    searchTerms: [
      "Rust async block cannot be unpinned Pin new E0277",
      "Box pin future not Unpin",
      "Pin new requires Unpin async future",
    ],
    evidence: ["Rust 1.98.1 compile failure", "pinning contract", "Box::pin repair"],
    caseSlug: "async-block-cannot-be-unpinned-with-pin-new",
  },
  {
    id: "RFA-089",
    area: "async-runtime",
    symptom:
      "A thread spawned inside a function rejects a borrowed `&str` because the reference escapes and would need to be `'static`.",
    likelyCause:
      "The spawned thread may outlive the function call, so its closure cannot retain a reference into the caller's stack without a scoped lifetime guarantee.",
    firstCheck:
      "Choose explicitly between transferring owned data to `thread::spawn` and using scoped threads when borrowing is part of the intended design.",
    searchTerms: [
      "Rust E0521 borrowed data escapes thread spawn",
      "thread spawn closure requires static str",
      "move borrowed value into Rust thread",
    ],
    evidence: ["Rust 1.98.1 compile failure", "thread lifetime boundary", "owned-transfer repair"],
    caseSlug: "thread-spawn-borrowed-value-escapes",
  },
  {
    id: "RFA-090",
    area: "async-runtime",
    symptom:
      "Returning an async block fails with E0373 because the block borrows a local String that is destroyed when the factory function returns.",
    likelyCause:
      "A plain async block captures by reference when possible, but the returned future outlives the stack frame that owns the captured value.",
    firstCheck:
      "Add `async move` and verify which values become owned future state rather than adding a lifetime to a value that cannot outlive the return.",
    searchTerms: [
      "Rust returned async block may outlive borrowed value E0373",
      "async move local String future",
      "impl Future borrows local variable",
    ],
    evidence: ["Rust 1.98.1 compile failure", "capture-state model", "async-move repair"],
    caseSlug: "returned-async-block-borrows-local-value",
  },
  {
    id: "RFA-091",
    area: "concurrency-memory",
    symptom:
      "A global `static Cell<u64>` fails E0277 because `Cell` cannot be shared between threads safely.",
    likelyCause:
      "Every shared static must implement Sync, while Cell performs unsynchronized interior mutation and can create a data race under concurrent access.",
    firstCheck:
      "Name the operation the global state needs, then choose an atomic with documented ordering or a lock instead of only searching for a Sync wrapper.",
    searchTerms: [
      "Rust static Cell cannot be shared between threads safely E0277",
      "shared static must implement Sync",
      "replace Cell static with AtomicU64",
    ],
    evidence: ["Rust 1.98.1 compile failure", "Sync requirement", "atomic counter repair"],
    caseSlug: "cell-in-static-does-not-implement-sync",
  },
  {
    id: "RFA-092",
    area: "concurrency-memory",
    symptom:
      "Calling a mutating `Vec` method through `Arc<Vec<T>>` fails E0596 because Arc does not provide mutable access.",
    likelyCause:
      "Arc shares ownership, not mutation rights; multiple owners prevent producing the unique `&mut Vec<T>` required by `push`.",
    firstCheck:
      "Decide whether mutation happens only before sharing, through copy-on-write, or concurrently behind synchronization before selecting the repair.",
    searchTerms: [
      "Rust cannot borrow data in Arc as mutable E0596",
      "Arc Vec push mutation",
      "Arc Mutex shared mutable vector",
    ],
    evidence: [
      "Rust 1.98.1 compile failure",
      "ownership-versus-mutation matrix",
      "Arc Mutex repair",
    ],
    caseSlug: "arc-does-not-provide-mutable-access",
  },
  {
    id: "RFA-093",
    area: "concurrency-memory",
    symptom:
      "`Arc<RefCell<T>>` still cannot enter `thread::spawn` because RefCell is not Sync despite the atomic reference count.",
    likelyCause:
      "Arc makes ownership-count updates thread-safe but does not change the synchronization properties of the value stored inside it.",
    firstCheck:
      "Check Send and Sync layer by layer; replace RefCell with a thread-safe synchronization primitive only if the value is genuinely shared across threads.",
    searchTerms: [
      "Rust Arc RefCell cannot be shared between threads safely",
      "RefCell not Sync thread spawn E0277",
      "Arc does not make inner type thread safe",
    ],
    evidence: ["Rust 1.98.1 compile failure", "Send Sync composition", "Arc Mutex repair"],
    caseSlug: "arc-refcell-cannot-cross-thread",
  },
  {
    id: "RFA-094",
    area: "ffi-targets",
    symptom:
      "Taking a reference to a field of `#[repr(packed)]` produces E0793 even inside unsafe code.",
    likelyCause:
      "Packing can place the field at an address below its required alignment, and merely creating a misaligned Rust reference is undefined behavior.",
    firstCheck:
      "Copy the field by value when it is Copy, or form a raw pointer without an intermediate reference and use an unaligned read when needed.",
    searchTerms: [
      "Rust E0793 reference to packed field is unaligned",
      "repr packed println field error",
      "read unaligned packed struct field",
    ],
    evidence: [
      "Rust 1.98.1 compile failure",
      "alignment calculation",
      "by-value field copy repair",
    ],
    caseSlug: "reference-to-packed-field-is-unaligned",
  },
  {
    id: "RFA-095",
    area: "ffi-targets",
    symptom:
      "Reading a Rust union field fails E0133 because the compiler cannot know which field currently contains valid data.",
    likelyCause:
      "A union overlays storage without tracking an active variant, so interpreting the bytes as a selected field requires a validity proof from the programmer.",
    firstCheck:
      "Identify who records the active representation and prove that every bit pattern is valid for the field being read before adding the unsafe block.",
    searchTerms: [
      "Rust E0133 access to union field is unsafe",
      "read Rust union field unsafe block",
      "union active field validity invariant",
    ],
    evidence: [
      "Rust 1.98.1 compile failure",
      "active-field invariant",
      "narrow unsafe read repair",
    ],
    caseSlug: "union-field-access-requires-unsafe",
  },
  {
    id: "RFA-096",
    area: "ffi-targets",
    symptom: 'Calling an `unsafe extern "C" fn` from ordinary Rust code produces E0133.',
    likelyCause:
      "The ABI describes the calling convention, while `unsafe` declares extra preconditions that the Rust type checker cannot establish at the call site.",
    firstCheck:
      "Read the callee's safety contract and document why the concrete pointers, lengths, ownership, and lifetime at this call satisfy it.",
    searchTerms: [
      "Rust E0133 call to unsafe extern function",
      "unsafe extern C fn requires unsafe block",
      "FFI call site safety contract",
    ],
    evidence: [
      "Rust 1.98.1 compile failure",
      "call-site precondition audit",
      "documented unsafe call repair",
    ],
    caseSlug: "unsafe-extern-function-call-requires-unsafe-block",
  },
  {
    id: "RFA-097",
    area: "ffi-targets",
    symptom:
      "A C-variadic declaration using the Rust ABI fails E0045 because that calling convention does not support variadic arguments.",
    likelyCause:
      "Variadic argument layout and promotions belong to specific platform ABIs, while Rust's native ABI provides no compatible C-varargs contract.",
    firstCheck:
      "Match the declaration to the foreign header and use a supported ABI such as C only when the target platform and promoted argument types agree.",
    searchTerms: [
      "Rust E0045 C variadic Rust calling convention not supported",
      "C variadic function compatible ABI Rust",
      "extern C varargs declaration",
    ],
    evidence: [
      "Rust 1.98.1 compile failure",
      "ABI compatibility check",
      "extern-C declaration repair",
    ],
    caseSlug: "c-variadic-function-needs-compatible-abi",
  },
  {
    id: "RFA-098",
    area: "cargo-dependencies",
    symptom:
      'A function exists in the source but calls fail E0425 because `#[cfg(feature = "fast")]` removed it from the compiled crate.',
    likelyCause:
      "Conditional compilation deletes non-matching items before later name resolution, so a disabled feature means the function is absent rather than dormant.",
    firstCheck:
      "Inspect the active Cargo feature graph and add an explicit fallback or gate the caller under the same complete condition.",
    searchTerms: [
      "Rust E0425 item gated behind feature function not found",
      "cfg feature removes function from scope",
      "Cargo feature disabled missing item",
    ],
    evidence: [
      "Rust 1.98.1 compile failure",
      "cfg branch inventory",
      "fallback implementation repair",
    ],
    caseSlug: "cfg-feature-removes-required-item",
  },
  {
    id: "RFA-099",
    area: "cargo-dependencies",
    symptom:
      '`env!("RFA_BUILD_SHA")` aborts compilation when the build environment does not define the variable.',
    likelyCause:
      "The `env!` macro reads during compilation and intentionally treats absence as an error, unlike runtime environment lookup or `option_env!`.",
    firstCheck:
      "Decide whether the value is required, optional, or runtime configuration, then enforce that contract in the build pipeline instead of relying on a developer shell.",
    searchTerms: [
      "Rust environment variable not defined at compile time env macro",
      "env macro missing build variable",
      "option_env optional compile time variable",
    ],
    evidence: ["Rust 1.98.1 compile failure", "build-environment contract", "option_env repair"],
    caseSlug: "env-macro-missing-build-variable",
  },
  {
    id: "RFA-100",
    area: "cargo-dependencies",
    symptom:
      "`include_str!` cannot find a file that exists relative to the repository root because the macro resolves its path from the Rust source file.",
    likelyCause:
      "The macro embeds bytes at compile time and interprets a relative path from the file containing the invocation, not from the shell or workspace root.",
    firstCheck:
      "Resolve the path from the invoking `.rs` file and ensure the asset is packaged and tracked as a real compile-time input.",
    searchTerms: [
      "Rust include_str couldn't read file relative path",
      "include_str path relative to source file",
      "Cargo embed file at compile time missing",
    ],
    evidence: ["Rust 1.98.1 compile failure", "source-relative path check", "tracked-file repair"],
    caseSlug: "include-str-path-resolves-from-source-file",
  },
  {
    id: "RFA-101",
    area: "cargo-dependencies",
    symptom:
      "Rust reports that one crate type differs from an identically named type because two versions of its defining package are present.",
    likelyCause:
      "A Rust type includes its resolved crate instance, so version 0.1 and version 0.2 define nominally distinct types even when their source shape matches.",
    firstCheck:
      "Run `cargo tree -d` and inverse trees for both versions, then locate the dependency type crossing between them.",
    searchTerms: [
      "Rust multiple versions same crate mismatched types",
      "expected type found different same type Rust",
      "cargo tree duplicate crate versions",
    ],
    evidence: [
      "Cargo 1.98.1 workspace failure",
      "duplicate crate identity",
      "single-version repair",
    ],
    caseSlug: "duplicate-crate-versions-create-different-rust-types",
  },
  {
    id: "RFA-102",
    area: "cargo-dependencies",
    symptom:
      "A mutually exclusive feature guard fires even though no single dependency declaration explicitly enables both features.",
    likelyCause:
      "Two dependency paths request different features for the same package instance, and Cargo combines those requests into one additive feature set.",
    firstCheck:
      "Inspect the inverse feature tree for the package and identify every edge, including defaults, that activates each feature.",
    searchTerms: [
      "Cargo mutually exclusive features enabled together",
      "Cargo feature unification compile_error",
      "why are both Rust crate features enabled",
    ],
    evidence: [
      "Cargo 1.98.1 workspace failure",
      "transitive feature union",
      "additive-feature repair",
    ],
    caseSlug: "cargo-feature-unification-enables-mutually-exclusive-features",
  },
  {
    id: "RFA-103",
    area: "cargo-dependencies",
    symptom:
      "Rust cannot resolve a crate that appears in Cargo.toml because the dependency is optional and inactive for this build.",
    likelyCause:
      "No active Cargo feature includes the optional dependency, so Cargo omits it from the graph and rustc receives no extern crate mapping.",
    firstCheck:
      "Find the feature that activates the optional dependency and verify that all code mentioning it uses the same complete condition.",
    searchTerms: [
      "Rust optional dependency unresolved crate",
      "Cargo optional dependency feature not enabled",
      "use of unresolved module optional dependency",
    ],
    evidence: ["Cargo 1.98.1 E0433 failure", "inactive path dependency", "feature-gated repair"],
    caseSlug: "optional-dependency-disabled-but-rust-code-imports-it",
  },
  {
    id: "RFA-104",
    area: "cargo-dependencies",
    symptom:
      "Cargo rejects the dependency graph because more than one package claims the same value in its links manifest key.",
    likelyCause:
      "Two sys crates independently claim ownership of one native library, which could produce competing link directives and incompatible ABIs.",
    firstCheck:
      "Find both packages declaring the repeated links value and trace the inverse dependency path that introduces each one.",
    searchTerms: [
      "Cargo more than one crate with links",
      "Rust links conflict native library",
      "Cargo sys crate links same library conflict",
    ],
    evidence: [
      "Cargo 1.98.1 resolver failure",
      "duplicate native ownership",
      "shared-sys-crate repair",
    ],
    caseSlug: "cargo-links-conflict-native-library",
  },
  {
    id: "RFA-105",
    area: "cargo-dependencies",
    symptom:
      "Cargo reports that package A depends on itself through package B and stops before compiling either crate.",
    likelyCause:
      "Normal package dependencies must form an acyclic graph because each crate needs completed metadata from its dependencies before it can compile.",
    firstCheck:
      "Draw the exact cycle from Cargo's cause chain and label the types, traits, helpers, or orchestration crossing every edge.",
    searchTerms: [
      "Cargo cyclic package dependency depends on itself",
      "Rust crates circular dependency",
      "break Cargo dependency cycle",
    ],
    evidence: ["Cargo 1.98.1 resolution failure", "two-package cycle", "one-direction repair"],
    caseSlug: "cyclic-cargo-package-dependency",
  },
  {
    id: "RFA-106",
    area: "cargo-dependencies",
    symptom:
      "Cargo refuses to build a package because its declared rust-version is newer than the selected rustc toolchain.",
    likelyCause:
      "The package's explicit minimum-supported-Rust contract is not satisfied by the compiler selected through rustup, CI, or repository configuration.",
    firstCheck:
      "Record the actual rustc and Cargo versions, then identify whether the named package is direct, transitive, or pinned in the lockfile.",
    searchTerms: [
      "rustc is not supported package requires newer rustc",
      "Cargo rust-version MSRV error",
      "dependency requires Rust newer compiler",
    ],
    evidence: [
      "Cargo 1.98.1 version failure",
      "Rust 1.99 package contract",
      "verified MSRV repair",
    ],
    caseSlug: "package-rust-version-newer-than-compiler",
  },
  {
    id: "RFA-107",
    area: "diagnostics-macros",
    symptom:
      "A proc-macro library is rejected because it exports a public helper that is not one of the three procedural macro entry forms.",
    likelyCause:
      "A proc-macro target is a compiler-loaded plugin artifact whose external exports are restricted to function-like, derive, and attribute macro entry points.",
    firstCheck:
      "List public root items in the proc-macro crate and separate private expansion helpers from consumer-facing runtime API.",
    searchTerms: [
      "proc-macro crate cannot export items",
      "Rust proc macro public helper error",
      "proc-macro crate types currently cannot export",
    ],
    evidence: ["Cargo 1.98.1 compile failure", "ordinary public export", "private-helper repair"],
    caseSlug: "proc-macro-crate-cannot-export-ordinary-items",
  },
  {
    id: "RFA-108",
    area: "diagnostics-macros",
    symptom:
      "A procedural macro fails when applied inside the same proc-macro crate that defines it.",
    likelyCause:
      "The compiler must finish and load the proc-macro artifact before expansion, so it cannot use that artifact during its own compilation.",
    firstCheck:
      "Move the expansion fixture into a separate consumer crate while keeping parser and token-generation unit tests internal.",
    searchTerms: [
      "can't use procedural macro from same crate",
      "Rust proc macro same crate defines it",
      "test proc macro separate crate",
    ],
    evidence: ["Cargo 1.98.1 self-use failure", "compiler-stage boundary", "two-crate repair"],
    caseSlug: "procedural-macro-cannot-be-used-in-defining-crate",
  },
  {
    id: "RFA-109",
    area: "cargo-dependencies",
    symptom:
      "Cargo cannot parse a feature containing dep:helper because helper is declared as an unconditional dependency.",
    likelyCause:
      "The dep: syntax is specifically an activation edge for an optional dependency, while a mandatory dependency is already present in every build.",
    firstCheck:
      "Decide whether the dependency is genuinely conditional, then either mark it optional or remove the meaningless dep: activation.",
    searchTerms: [
      "Cargo dep feature not optional dependency",
      "feature includes dep dependency is not optional",
      "Rust dep colon feature syntax",
    ],
    evidence: [
      "Cargo 1.98.1 manifest failure",
      "invalid dep activation",
      "optional-dependency repair",
    ],
    caseSlug: "dep-feature-requires-optional-dependency",
  },
  {
    id: "RFA-110",
    area: "cargo-dependencies",
    symptom:
      "A workspace member cannot inherit edition.workspace because the root has no workspace.package.edition value.",
    likelyCause:
      "A member's workspace=true field references a matching value in a specific root table; it does not request Cargo's default value.",
    firstCheck:
      "Use Cargo metadata to identify the actual workspace root, then inspect the exact dotted root key named in the cause chain.",
    searchTerms: [
      "Cargo error inheriting edition workspace package not defined",
      "workspace.package.edition was not defined",
      "Cargo workspace true inheritance missing",
    ],
    evidence: [
      "Cargo 1.98.1 manifest failure",
      "missing root policy",
      "explicit inheritance repair",
    ],
    caseSlug: "workspace-package-inheritance-missing-root-key",
  },
  {
    id: "RFA-111",
    area: "concurrency-memory",
    symptom:
      "A receiver consumes every current message but times out instead of observing disconnection because one Sender remains alive.",
    likelyCause:
      "Channel disconnection is triggered only after every sender capability is dropped, regardless of whether the remaining handle will ever send.",
    firstCheck:
      "Trace the original Sender and every clone through structs, callbacks, queues, and coordinator scope before investigating scheduling.",
    searchTerms: [
      "Rust channel never closes sender still alive",
      "mpsc receiver hangs after all messages",
      "recv_timeout timeout instead of disconnected",
    ],
    evidence: ["Rust 1.98.1 runtime failure", "live-sender state", "explicit-drop repair"],
    caseSlug: "rust-channel-never-disconnects-sender-still-alive",
  },
  {
    id: "RFA-112",
    area: "concurrency-memory",
    symptom:
      "try_send reports Full on sync_channel(0) even though the channel stores no buffered messages.",
    likelyCause:
      "A zero-capacity channel is a rendezvous with no storage slot, so a nonblocking send succeeds only when a receiver is already waiting.",
    firstCheck:
      "Confirm the channel capacity and distinguish a live Receiver handle from a thread currently blocked in a receive operation.",
    searchTerms: [
      "Rust sync_channel zero try_send Full",
      "zero capacity channel no room rendezvous",
      "TrySendError Full sync_channel 0",
    ],
    evidence: ["Rust 1.98.1 runtime failure", "zero-capacity rendezvous", "blocking-send repair"],
    caseSlug: "zero-capacity-sync-channel-try-send-is-full",
  },
  {
    id: "RFA-113",
    area: "concurrency-memory",
    symptom:
      "A second OnceLock::set returns Err with the rejected value, and an unconditional unwrap turns it into a panic.",
    likelyCause:
      "OnceLock preserves the first published value and cannot decide whether a later candidate is equivalent, erroneous, or intended as a reload.",
    firstCheck:
      "Find every initialization path and decide whether the cell has one owner, competing equivalent initializers, or a reloadable lifecycle.",
    searchTerms: [
      "OnceLock set twice panic unwrap",
      "OnceLock set returns Err value",
      "Rust global initialized more than once",
    ],
    evidence: ["Rust 1.98.1 runtime panic", "second-set rejection", "handled-result repair"],
    caseSlug: "oncelock-second-set-returns-error",
  },
  {
    id: "RFA-114",
    area: "concurrency-memory",
    symptom:
      "RefCell::borrow_mut panics because an earlier RefMut guard remains alive when another exclusive borrow begins.",
    likelyCause:
      "RefCell enforces Rust's shared-or-exclusive borrowing rule at runtime, and the guard keeps the dynamic exclusive state active.",
    firstCheck:
      "Get a backtrace, name the first guard, and inspect callbacks or temporaries that extend it across the second borrow.",
    searchTerms: [
      "Rust RefCell already borrowed panic",
      "BorrowMutError second mutable borrow",
      "RefCell borrow_mut runtime panic",
    ],
    evidence: ["Rust 1.98.1 runtime panic", "overlapping RefMut guards", "scoped-guard repair"],
    caseSlug: "refcell-second-mutable-borrow-panics",
  },
  {
    id: "RFA-115",
    area: "concurrency-memory",
    symptom:
      "Arc::try_unwrap returns Err after work appears complete because another strong Arc owner is still alive.",
    likelyCause:
      "Unwrapping requires exactly one strong owner at the atomic operation; inactivity, joined work, and absence of borrows do not imply unique ownership.",
    firstCheck:
      "Trace every Arc clone through containers and task results, then handle try_unwrap directly instead of relying on a prior strong_count check.",
    searchTerms: [
      "Arc try_unwrap failed strong reference remains",
      "Rust cannot unwrap Arc multiple owners",
      "Arc strong_count try_unwrap race",
    ],
    evidence: ["Rust 1.98.1 runtime failure", "remaining strong owner", "final-owner repair"],
    caseSlug: "arc-try-unwrap-fails-strong-clone-remains",
  },
  {
    id: "RFA-116",
    area: "ffi-targets",
    symptom:
      "Calling a function annotated with an extra CPU target feature produces E0133 at an ordinary call site.",
    likelyCause:
      "The specialized function may contain instructions unsupported by the runtime processor, while the caller has not established feature availability.",
    firstCheck:
      "List the callee's required CPU features and compare them with runtime detection and the deployment CPU baseline.",
    searchTerms: [
      "Rust target_feature call unsafe E0133",
      "call function with target_feature requires unsafe",
      "is_x86_feature_detected AVX2 dispatch",
    ],
    evidence: ["Rust 1.98.1 E0133", "AVX2 safety boundary", "runtime-dispatch repair"],
    caseSlug: "target-feature-function-call-requires-unsafe",
  },
  {
    id: "RFA-117",
    area: "ffi-targets",
    symptom:
      "A struct using both packed and align representation modifiers fails E0587 with conflicting hints.",
    likelyCause:
      "Packed representation lowers alignment while align(N) raises it, so one type is being asked to satisfy opposing memory-layout policies.",
    firstCheck:
      "Separate the external byte-layout requirement from the in-memory alignment requirement before choosing which representation belongs on the type.",
    searchTerms: [
      "Rust E0587 conflicting packed align representation",
      "repr packed align together",
      "type conflicting representation hints Rust",
    ],
    evidence: ["Rust 1.98.1 E0587", "layout-contract conflict", "single-policy repair"],
    caseSlug: "repr-packed-and-align-conflict",
  },
  {
    id: "RFA-118",
    area: "ffi-targets",
    symptom:
      "A repr(transparent) wrapper with two stored numeric fields fails E0690 because both fields contribute non-zero size.",
    likelyCause:
      "Transparent representation needs one carrier whose layout and ABI the wrapper preserves, but the second stored field creates new representation.",
    firstCheck:
      "Identify the intended transparent carrier and decide whether additional state belongs outside the boundary type.",
    searchTerms: [
      "Rust E0690 transparent struct non-trivial fields",
      "repr transparent multiple fields",
      "transparent struct needs at most one non-zero field",
    ],
    evidence: ["Rust 1.98.1 E0690", "two storage fields", "single-carrier repair"],
    caseSlug: "repr-transparent-multiple-nonzero-fields",
  },
  {
    id: "RFA-119",
    area: "upgrades-compatibility",
    symptom:
      "Edition 2024 denies creating a shared reference to a mutable static even when the expression is inside unsafe.",
    likelyCause:
      "A Rust reference immediately asserts aliasing guarantees that untracked global mutation makes difficult to prove, so static_mut_refs is deny-by-default.",
    firstCheck:
      "Expand implicit borrows and replace the global with an atomic, lock, OnceLock, or owned context matching its actual operations.",
    searchTerms: [
      "Rust 2024 shared reference to mutable static",
      "static_mut_refs deny by default",
      "creating reference to static mut error",
    ],
    evidence: ["Rust 1.98.1 edition failure", "invalid reference creation", "atomic-global repair"],
    caseSlug: "rust-2024-static-mut-reference-denied",
  },
  {
    id: "RFA-120",
    area: "diagnostics-macros",
    symptom:
      "Assigning an incoming string reference through a mutable slot fails because the incoming lifetime may be shorter than the slot promises.",
    likelyCause:
      "After mutation, future reads use the slot's stored-reference lifetime, so the replacement reference must outlive that entire promised lifetime.",
    firstCheck:
      "Name the mutable borrow, stored reference, and incoming reference lifetimes separately, then follow the incoming owner to its drop point.",
    searchTerms: [
      "Rust assignment requires lifetime must outlive mutable reference",
      "replace reference through &mut lifetime",
      "lifetime may not live long enough incoming stored",
    ],
    evidence: [
      "Rust 1.98.1 lifetime failure",
      "mutable replacement model",
      "valid-outlives repair",
    ],
    caseSlug: "mutable-reference-lifetime-assignment-requires-outlives",
  },
  {
    id: "RFA-121",
    area: "diagnostics-macros",
    symptom:
      "An identity-looking closure is not general enough for a for<'a> Fn(&'a str) -> &'a str bound.",
    likelyCause:
      "The higher-ranked bound requires one input-output lifetime relation for every caller-chosen lifetime, while closure inference produced a narrower relation.",
    firstCheck:
      "Expand the bound as a universal contract and try a named function whose signature explicitly ties its returned borrow to the input.",
    searchTerms: [
      "Rust closure not general enough lifetime",
      "one type is more general than the other Fn",
      "for a closure lifetime may not live long enough",
    ],
    evidence: ["Rust 1.98.1 E0308", "higher-ranked callback", "function-item repair"],
    caseSlug: "closure-not-general-enough-for-higher-ranked-bound",
  },
  {
    id: "RFA-122",
    area: "diagnostics-macros",
    symptom:
      "A lending-style generic associated type is rejected because its declaration lacks the required where Self: 'a bound.",
    likelyCause:
      "The associated type may borrow from its implementing value, so forming Item<'a> requires the implementing Self type to remain valid for 'a.",
    firstCheck:
      "Find methods projecting the associated type from a self borrow and add the required outlives condition on the GAT declaration.",
    searchTerms: [
      "Rust GAT missing required bound Self a",
      "generic associated type where Self outlives lifetime",
      "LendingIterator Item where Self a",
    ],
    evidence: ["Rust 1.98.1 required-bound failure", "lending type family", "Self-outlives repair"],
    caseSlug: "gat-missing-required-self-outlives-bound",
  },
  {
    id: "RFA-123",
    area: "concurrency-memory",
    symptom:
      "A wrapper with an integer and PhantomData<*const T> cannot cross thread::spawn because the phantom raw pointer affects Send.",
    likelyCause:
      "PhantomData contributes no storage but declares a logical type relationship used for variance, drop checking, and automatic Send and Sync derivation.",
    firstCheck:
      "Assert Send for the entire wrapper, then choose the marker shape from the resource's real ownership and thread-affinity contract.",
    searchTerms: [
      "PhantomData raw pointer not Send Rust",
      "wrapper cannot be sent between threads PhantomData",
      "PhantomData affects Send Sync",
    ],
    evidence: ["Rust 1.98.1 E0277", "whole-wrapper transfer", "owned-marker repair"],
    caseSlug: "phantomdata-raw-pointer-makes-wrapper-not-send",
  },
  {
    id: "RFA-124",
    area: "ffi-targets",
    symptom:
      "A const assertion expects a repr(C) u8-plus-u32 structure to use five bytes, but target alignment makes it eight.",
    likelyCause:
      "The size calculation omitted internal padding before the u32 and final rounding required so array elements remain properly aligned.",
    firstCheck:
      "Record the target triple and calculate field offsets by rounding each offset to the next field's alignment.",
    searchTerms: [
      "Rust const size_of assertion failed padding",
      "repr C struct u8 u32 size 8",
      "E0080 struct layout assert",
    ],
    evidence: ["Rust 1.98.1 E0080", "repr(C) padding calculation", "target-layout repair"],
    caseSlug: "const-layout-assertion-fails-padding",
  },
  {
    id: "RFA-125",
    area: "ffi-targets",
    symptom:
      "An unsafe extern function declaration type-checks, but final linking fails with an undefined native symbol.",
    likelyCause:
      "The extern block declares an assumed ABI contract but no linked object or library actually exports the symbol with the required spelling.",
    firstCheck:
      "Copy the exact undefined name, inspect exports in the intended library, and compare them with the final linker command and target architecture.",
    searchTerms: [
      "Rust undefined symbol extern function linker",
      "linking with cc failed missing extern C symbol",
      "Rust extern declaration does not link library",
    ],
    evidence: ["Rust 1.98.1 link failure", "undefined native symbol", "supplied-symbol repair"],
    caseSlug: "extern-function-compiles-but-linker-symbol-missing",
  },
  {
    id: "RFA-126",
    area: "diagnostics-macros",
    symptom:
      "A Drop implementation requires T: Display, but the generic structure itself permits every T and rustc rejects the mismatch with E0367.",
    likelyCause:
      "Drop must be available for every instantiation allowed by the type declaration, so its implementation cannot introduce a bound that the structure did not require.",
    firstCheck:
      "Compare the bounds on the type declaration with the bounds on its Drop implementation and decide whether every value truly needs the constrained destructor.",
    searchTerms: [
      "Rust E0367 Drop impl requires bound struct does not",
      "Drop implementation bound not on struct Rust",
      "Rust conditional Drop generic type",
    ],
    evidence: ["Rust 1.98.1 E0367", "generic destructor contract", "type-level-bound repair"],
    caseSlug: "drop-impl-bound-must-match-struct",
  },
  {
    id: "RFA-127",
    area: "diagnostics-macros",
    symptom:
      "A function tries to return a boxed trait object containing a borrowed value, but rustc says that the borrow must outlive 'static.",
    likelyCause:
      "Outside expressions, an omitted trait-object lifetime follows default object lifetime rules, and Box<dyn Trait> selects 'static when no containing lifetime supplies another bound.",
    firstCheck:
      "Expand the return type mentally from Box<dyn Trait> to Box<dyn Trait + 'static>, then attach the borrow lifetime explicitly if ownership is not intended.",
    searchTerms: [
      "Box dyn Trait borrowed value must outlive static Rust",
      "Rust default trait object lifetime Box static",
      "return boxed trait object with lifetime",
    ],
    evidence: [
      "Rust 1.98.1 lifetime failure",
      "default object lifetime",
      "explicit-object-lifetime repair",
    ],
    caseSlug: "boxed-trait-object-defaults-to-static",
  },
  {
    id: "RFA-128",
    area: "diagnostics-macros",
    symptom:
      "Deriving Default for a generic marker type prevents Marker<NoDefault> from using default even though PhantomData<T> itself is always defaultable.",
    likelyCause:
      "The built-in derive generates an implementation with a conservative T: Default bound from the generic field syntax rather than proving the weaker bound accepted by PhantomData.",
    firstCheck:
      "Expand or inspect the derived implementation, identify which generic bounds it introduced, and compare them with the actual requirements of constructing every field.",
    searchTerms: [
      "Rust derive Default PhantomData unnecessary T Default bound",
      "derived Default generic type overconstrained",
      "PhantomData default without generic Default",
    ],
    evidence: ["Rust 1.98.1 E0277", "derive-added generic bound", "manual-Default repair"],
    caseSlug: "derive-default-adds-unneeded-generic-bound",
  },
  {
    id: "RFA-129",
    area: "diagnostics-macros",
    symptom:
      "Deriving Clone for a generic wrapper around Arc<T> makes Shared<NoClone>::clone unavailable although cloning an Arc does not clone its T.",
    likelyCause:
      "The generated Clone implementation places a conservative Clone bound on the generic parameter, which is stronger than the field operation actually needs.",
    firstCheck:
      "Compare the bound generated by derive with the field type's own Clone implementation before adding Clone to a domain type that should not need it.",
    searchTerms: [
      "Rust derive Clone Arc T unnecessary Clone bound",
      "derived Clone generic wrapper overconstrained",
      "Arc clone without T Clone manual impl",
    ],
    evidence: ["Rust 1.98.1 E0599", "derive-added Clone bound", "manual-Clone repair"],
    caseSlug: "derive-clone-adds-unneeded-generic-bound",
  },
  {
    id: "RFA-130",
    area: "diagnostics-macros",
    symptom:
      "Two helper functions both return impl Iterator<Item = u8>, but selecting between their results fails because the opaque return types are distinct.",
    likelyCause:
      "Each return-position impl Trait occurrence defines its own hidden concrete type identity, even when the visible trait bounds and item types are identical.",
    firstCheck:
      "Locate every separate function that introduces impl Trait and determine whether control flow is trying to unify opaque values originating from different definitions.",
    searchTerms: [
      "Rust distinct uses of impl Trait different opaque types",
      "if branches two functions return impl Iterator mismatch",
      "return position impl Trait type identity",
    ],
    evidence: ["Rust 1.98.1 E0308", "distinct opaque identities", "boxed-iterator repair"],
    caseSlug: "separate-impl-trait-functions-return-distinct-opaque-types",
  },
  {
    id: "RFA-131",
    area: "concurrency-memory",
    symptom:
      "Writing into BufWriter succeeds because bytes enter memory, then dropping the writer silently discards an error raised while flushing them downstream.",
    likelyCause:
      "BufWriter attempts to flush its buffer during Drop, but destructors cannot return Result and the standard type documents that errors during this automatic flush are ignored.",
    firstCheck:
      "Find the last explicit flush or into_inner call on every important buffered output path and verify that its Result is handled before the writer is dropped.",
    searchTerms: [
      "Rust BufWriter drop ignores flush error",
      "BufWriter write_all succeeds data not written error",
      "Rust buffered writer explicit flush before drop",
    ],
    evidence: ["Rust 1.98.1 runtime failure", "ignored drop-time error", "explicit-flush repair"],
    caseSlug: "bufwriter-drop-ignores-write-error",
  },
  {
    id: "RFA-132",
    area: "concurrency-memory",
    symptom:
      "A HashMap contains a key, but looking it up by the key's new visible value returns None after interior mutability changed its hash and equality state.",
    likelyCause:
      "HashMap placed the entry according to the original hash; mutating fields used by Hash or Eq breaks the collection's required key-stability invariant without relocating the entry.",
    firstCheck:
      "Audit every map key for Cell, RefCell, atomics, shared mutable state, or custom Hash and Eq implementations whose observed values can change while inserted.",
    searchTerms: [
      "Rust HashMap mutate key after insertion unreachable",
      "interior mutable HashMap key logic error",
      "Hash Eq changes while key in HashMap",
    ],
    evidence: [
      "Rust 1.98.1 runtime failure",
      "broken hash-key invariant",
      "remove-and-reinsert repair",
    ],
    caseSlug: "hashmap-key-mutated-after-insertion",
  },
  {
    id: "RFA-133",
    area: "concurrency-memory",
    symptom:
      "A BinaryHeap item becomes the largest value through interior mutation, but peek still returns the old root because the heap was never reorganized.",
    likelyCause:
      "BinaryHeap establishes ordering when values enter or leave; changing an inserted item's Ord-visible state violates its invariant and does not trigger reheapification.",
    firstCheck:
      "Inspect heap element types for interior-mutability or externally shared state used by Ord, and rebuild or remove-and-reinsert values when priority changes.",
    searchTerms: [
      "Rust BinaryHeap mutate priority after push",
      "BinaryHeap interior mutability ordering logic error",
      "Rust heap item changed but peek wrong",
    ],
    evidence: [
      "Rust 1.98.1 runtime failure",
      "broken heap-order invariant",
      "rebuild-after-change repair",
    ],
    caseSlug: "binaryheap-order-mutated-after-push",
  },
  {
    id: "RFA-134",
    area: "concurrency-memory",
    symptom:
      "A Once initializer panics, and a later ordinary call_once intended as a retry panics immediately because the Once remains poisoned.",
    likelyCause:
      "Once records a panicking initialization as poison and propagates that state through later call_once calls instead of treating the initialization as never attempted.",
    firstCheck:
      "Capture the first initializer panic and identify whether recovery should use call_once_force, replace the primitive, or make initialization failure an explicit Result.",
    searchTerms: [
      "Rust Once poisoned initializer panic retry",
      "Once instance has previously been poisoned call_once",
      "call_once_force recover poisoned Once",
    ],
    evidence: ["Rust 1.98.1 runtime panic", "persistent Once poison", "call_once_force repair"],
    caseSlug: "once-poisoned-after-initializer-panic",
  },
  {
    id: "RFA-135",
    area: "concurrency-memory",
    symptom:
      "A Mutex remains locked after its guard is passed to mem::forget, so a later try_lock reports that the lock would block indefinitely.",
    likelyCause:
      "Unlocking is performed by MutexGuard's destructor; mem::forget is safe and deliberately prevents that destructor from running, leaving the logical lock acquired.",
    firstCheck:
      "Search lock-owning paths for mem::forget, ManuallyDrop, leaks, or non-returning control flow that can prevent the guard's destructor from executing.",
    searchTerms: [
      "Rust mem forget MutexGuard lock never unlocked",
      "forgotten MutexGuard keeps mutex locked",
      "Rust safe mem forget resource leak lock",
    ],
    evidence: ["Rust 1.98.1 runtime failure", "suppressed guard destructor", "lexical-drop repair"],
    caseSlug: "forgotten-mutexguard-keeps-lock-held",
  },
  {
    id: "RFA-136",
    area: "diagnostics-macros",
    symptom:
      "Deriving Copy for a small token fails with E0184 after the type receives a Drop implementation, even though all of its fields are copyable.",
    likelyCause:
      "Copy duplicates values implicitly while Drop gives every value an observable cleanup action, so allowing both would make the number and ownership of destructor calls incoherent.",
    firstCheck:
      "Find the type's Drop implementation and decide whether callers need explicit Clone semantics or whether cleanup ownership belongs in a separate non-Copy guard.",
    searchTerms: [
      "Rust E0184 Copy type has destructor",
      "Copy not allowed on types with Drop Rust",
      "derive Copy fails after implementing Drop",
    ],
    evidence: ["Rust 1.98.1 E0184", "implicit-copy lifecycle conflict", "explicit-Clone repair"],
    caseSlug: "copy-cannot-be-implemented-for-drop-type",
  },
  {
    id: "RFA-137",
    area: "diagnostics-macros",
    symptom:
      "mem::take cannot move a non-Default Session out through a mutable reference, although the caller has a valid replacement value available.",
    likelyCause:
      "take must leave the borrowed place initialized by constructing T::default, so its signature requires T: Default even when a domain type has no honest default state.",
    firstCheck:
      "Read the take signature and decide whether the empty state is semantically valid; otherwise pass an explicit replacement to mem::replace.",
    searchTerms: [
      "Rust mem take requires Default use replace",
      "move field out mutable reference non Default",
      "std mem take trait bound Default not satisfied",
    ],
    evidence: ["Rust 1.98.1 E0277", "replacement-initialization contract", "mem-replace repair"],
    caseSlug: "mem-take-requires-default-use-replace",
  },
  {
    id: "RFA-138",
    area: "concurrency-memory",
    symptom:
      "catch_unwind rejects a closure that mutably borrows local state because &mut T is not considered safe to cross the unwind boundary automatically.",
    likelyCause:
      "A panic may interrupt the mutation after an invariant changes, so the UnwindSafe bound asks the boundary owner to consider whether later code can observe a broken state.",
    firstCheck:
      "List every mutation before the possible panic and establish a recovery invariant before using AssertUnwindSafe around the narrow closure.",
    searchTerms: [
      "Rust catch_unwind mutable reference not UnwindSafe",
      "&mut may not be safely transferred across unwind boundary",
      "AssertUnwindSafe mutable closure Rust",
    ],
    evidence: ["Rust 1.98.1 E0277", "mutable unwind boundary", "narrow AssertUnwindSafe repair"],
    caseSlug: "catch-unwind-mutable-reference-not-unwindsafe",
  },
  {
    id: "RFA-139",
    area: "diagnostics-macros",
    symptom:
      "A generic helper calling TypeId::of::<T>() fails with E0310 because its unconstrained T may contain a non-static borrowed lifetime.",
    likelyCause:
      "TypeId currently identifies only types satisfying 'static, which excludes type identities whose concrete form depends on a shorter borrowed lifetime.",
    firstCheck:
      "Inspect TypeId::of's T: 'static bound and decide whether the registry truly operates on owned or otherwise static type identities.",
    searchTerms: [
      "Rust TypeId T may not live long enough E0310",
      "TypeId of requires static generic bound",
      "std any TypeId borrowed lifetime",
    ],
    evidence: ["Rust 1.98.1 E0310", "TypeId static requirement", "explicit-static-bound repair"],
    caseSlug: "typeid-of-requires-static-generic-type",
  },
  {
    id: "RFA-140",
    area: "diagnostics-macros",
    symptom:
      "A macro captures the literal 3 as an expr and forwards it, but a second macro cannot match that forwarded fragment with its literal (3) arm.",
    likelyCause:
      "Forwarded fragments are opaque AST nodes to the receiving macro except for ident, lifetime, and tt fragments, which may still be matched by literal tokens.",
    firstCheck:
      "Inspect the outer fragment specifier and change it to tt only when the inner macro intentionally needs token-level literal matching.",
    searchTerms: [
      "Rust macro no rules expected expr metavariable forwarding",
      "macro_rules forwarded expr cannot match literal",
      "opaque AST fragment tt exception Rust macro",
    ],
    evidence: ["Rust 1.98.1 macro diagnostic", "opaque expr forwarding", "tt-fragment repair"],
    caseSlug: "macro-forwarded-expr-cannot-match-literal",
  },
  {
    id: "RFA-141",
    area: "cargo-dependencies",
    symptom:
      "An integration test cannot import a public helper behind cfg(test), even though unit tests in the same library can see and call that helper.",
    likelyCause:
      "Each integration test is a separate crate linked against the library's ordinary dependency build, while cfg(test) applies to the test target currently being compiled.",
    firstCheck:
      "Confirm whether the failing test lives under tests/ and inspect the library artifact as a dependency rather than assuming its unit-test configuration is reused.",
    searchTerms: [
      "Rust integration test cannot import cfg test function",
      "cfg(test) not enabled for library integration tests",
      "Cargo integration test separate crate configured out",
    ],
    evidence: ["Cargo test E0432", "separate integration-test crate", "public test-support repair"],
    caseSlug: "integration-test-cannot-import-cfg-test-library-item",
  },
  {
    id: "RFA-142",
    area: "concurrency-memory",
    symptom:
      "Arc::get_mut returns None even though only one strong Arc remains, because an apparently harmless Weak observer still points to the allocation.",
    likelyCause:
      "get_mut requires the allocation to have neither other strong owners nor Weak pointers so it can return an exclusive reference without invalidating observable access paths.",
    firstCheck:
      "Record both Arc::strong_count and Arc::weak_count, then locate every surviving downgrade result before assuming strong uniqueness is sufficient.",
    searchTerms: [
      "Rust Arc get_mut None only one strong count Weak",
      "Weak pointer prevents Arc get_mut",
      "Arc get_mut requires no Weak pointers",
    ],
    evidence: ["Rust 1.98.1 runtime assertion", "surviving Weak observer", "drop-Weak repair"],
    caseSlug: "arc-get-mut-fails-while-weak-pointer-exists",
  },
  {
    id: "RFA-143",
    area: "concurrency-memory",
    symptom:
      "Upgrading the Weak pointer inside Arc::new_cyclic's construction closure returns None instead of the Arc currently being created.",
    likelyCause:
      "new_cyclic allocates first but writes the completed T and establishes the strong Arc only after the closure returns, so no initialized value exists to upgrade inside it.",
    firstCheck:
      "Store a clone of the provided Weak pointer in the new value and delay upgrade until Arc::new_cyclic has returned successfully.",
    searchTerms: [
      "Rust Arc new_cyclic weak upgrade returns None",
      "cannot upgrade Weak inside new_cyclic closure",
      "Arc self reference construction weak pointer",
    ],
    evidence: [
      "Rust 1.98.1 runtime assertion",
      "pre-construction Weak state",
      "post-construction-upgrade repair",
    ],
    caseSlug: "arc-new-cyclic-weak-cannot-upgrade-inside-closure",
  },
  {
    id: "RFA-144",
    area: "concurrency-memory",
    symptom:
      "A mutex acquired only in a while let condition remains locked inside the loop body, so an immediate try_lock reports WouldBlock.",
    likelyCause:
      "The temporary MutexGuard created by the pattern-matching while condition has a scope covering the consequent loop body rather than ending after the pop expression.",
    firstCheck:
      "Bind the condition result in a separate statement or inner block and verify the guard drops before entering code that may lock the mutex again.",
    searchTerms: [
      "Rust while let mutex guard held through loop body",
      "temporary lifetime while let lock deadlock",
      "Mutex try_lock WouldBlock inside while let",
    ],
    evidence: [
      "Rust 1.98.1 deterministic WouldBlock",
      "while-let temporary scope",
      "separate-statement repair",
    ],
    caseSlug: "while-let-mutex-guard-lives-through-loop-body",
  },
  {
    id: "RFA-145",
    area: "concurrency-memory",
    symptom:
      "A process aborts while unwinding because a Drop implementation panics during cleanup of the original panic, so catch boundaries never receive control.",
    likelyCause:
      "The thread cannot continue two simultaneous unwinds; a second non-contained panic from a destructor during stack cleanup is converted into process termination.",
    firstCheck:
      "Audit every destructor reached by the first panic for unwrap, indexing, assertions, callbacks, allocation assumptions, and other operations that can panic.",
    searchTerms: [
      "Rust panic in destructor during cleanup abort",
      "thread caused non-unwinding panic Drop",
      "double panic while unwinding Rust process abort",
    ],
    evidence: [
      "Rust 1.98.1 aborting runtime case",
      "second destructor panic",
      "infallible-cleanup repair",
    ],
    caseSlug: "panic-in-drop-during-unwind-aborts-process",
  },
  {
    id: "RFA-146",
    area: "concurrency-memory",
    symptom:
      "Forgetting a Vec::Drain iterator leaves the source vector missing more elements than the requested range instead of preserving the undrained tail.",
    likelyCause:
      "Drain repairs the vector and moves its tail during destructor cleanup; mem::forget deliberately prevents that destructor from running, and the documented result may include leaked elements.",
    firstCheck:
      "Search for mem::forget, ManuallyDrop, cycles, or other paths that can prevent the Drain value from reaching its destructor.",
    searchTerms: [
      "Rust mem forget Vec Drain loses tail",
      "forgetting Drain leaks vector elements",
      "Vec drain destructor not called result",
    ],
    evidence: ["Rust 1.98.1 runtime assertion", "forgotten Drain iterator", "explicit-drop repair"],
    caseSlug: "forgetting-vec-drain-leaves-vector-in-partial-state",
  },
  {
    id: "RFA-147",
    area: "concurrency-memory",
    symptom:
      "Calling next again after map_while returns None unexpectedly produces another item, even though downstream code treated the first None as permanent exhaustion.",
    likelyCause:
      "Iterator::map_while stops one call when its closure returns None but does not implement the fused guarantee that every later call must also return None.",
    firstCheck:
      "Call next at least once after the first None in a minimal reproduction and inspect whether the adapter implements FusedIterator.",
    searchTerms: [
      "Rust map_while returns Some after None",
      "map_while iterator not fused",
      "Iterator fuse after map_while None",
    ],
    evidence: ["Rust 1.98.1 runtime assertion", "post-None next call", "Iterator::fuse repair"],
    caseSlug: "map-while-is-not-fused-after-none",
  },
  {
    id: "RFA-148",
    area: "concurrency-memory",
    symptom:
      "Mutex::get_mut returns PoisonError despite having an exclusive mutable reference to the mutex and no possibility of another thread holding the lock.",
    likelyCause:
      "Exclusive access removes synchronization contention but does not clear the poison flag recorded when a previous guard was dropped during a panic.",
    firstCheck:
      "Check is_poisoned separately, inspect the protected value through PoisonError::into_inner, and decide how its invariant will be repaired before clearing poison.",
    searchTerms: [
      "Rust Mutex get_mut PoisonError exclusive reference",
      "get_mut does not clear mutex poison",
      "clear_poison after Mutex get_mut repair",
    ],
    evidence: ["Rust 1.98.1 caught panic", "persistent poison flag", "validate-and-clear repair"],
    caseSlug: "mutex-get-mut-still-reports-poison",
  },
  {
    id: "RFA-149",
    area: "concurrency-memory",
    symptom:
      "Pin::get_mut rejects a pinned value containing PhantomPinned even though the caller only wants an ordinary mutable reference to update one field.",
    likelyCause:
      "Safe get_mut is available only when the pointee implements Unpin, because otherwise returning unrestricted &mut T would allow operations that move a structurally pinned value.",
    firstCheck:
      "Find the field that makes the type !Unpin, then define which fields are structurally pinned and which operations can be exposed through a Pin receiver.",
    searchTerms: [
      "Rust Pin get_mut PhantomPinned E0277",
      "cannot get mutable reference pinned Unpin",
      "safe field update Pin PhantomPinned",
    ],
    evidence: ["Rust 1.98.1 E0277", "PhantomPinned negative auto trait", "Pin receiver repair"],
    caseSlug: "pin-get-mut-requires-unpin",
  },
  {
    id: "RFA-150",
    area: "diagnostics-macros",
    symptom:
      "A macro_rules expansion fails because one metavariable repeats twice while another repeats once, although both lists matched the macro input successfully.",
    likelyCause:
      "Metavariables used in the same repetition must preserve compatible nesting, repetition count, and repetition kind; separate flat lists do not imply pairwise zip semantics.",
    firstCheck:
      "Draw the repetition nesting for every metavariable in the transcriber and compare it with the matcher rather than counting tokens by eye.",
    searchTerms: [
      "Rust macro variable repeats different number times",
      "macro_rules zip two repetitions",
      "metavariable repetition count mismatch",
    ],
    evidence: ["Rust 1.98.1 macro diagnostic", "two-versus-one repetition", "paired-input repair"],
    caseSlug: "macro-repetition-metavariables-repeat-different-times",
  },
  {
    id: "RFA-151",
    area: "cargo-dependencies",
    symptom:
      "cargo test fails while compiling a stale example even though every library unit test passes and the example is never executed as a test.",
    likelyCause:
      "By default Cargo builds examples during cargo test so they remain compilation-checked, which makes an invalid example part of the package test result.",
    firstCheck:
      "Read the target name in Cargo's error output and compare cargo test with cargo test --lib before changing library test code.",
    searchTerms: [
      "cargo test compiles examples by default",
      "Rust unit tests fail broken example",
      "cargo test example compiled not run",
    ],
    evidence: ["Cargo 1.98.1 E0432", "healthy library test", "repaired example target"],
    caseSlug: "cargo-test-compiles-examples-by-default",
  },
  {
    id: "RFA-152",
    area: "concurrency-memory",
    symptom:
      "Binding a MutexGuard with let underscore either fails the let_underscore_lock lint or silently ends the critical section before the following work.",
    likelyCause:
      "The wildcard pattern does not create a binding, so the synchronization guard is dropped immediately instead of living to the end of the scope.",
    firstCheck:
      "Look for let _ assignments whose right side returns a lock or condition-variable guard and decide whether the intended operation is hold or explicit drop.",
    searchTerms: [
      "Rust let underscore lock immediately dropped",
      "let_underscore_lock lint MutexGuard",
      "non-binding let synchronization lock error",
    ],
    evidence: ["Rust 1.98.1 deny-by-default lint", "immediate guard drop", "named-binding repair"],
    caseSlug: "let-underscore-lock-drops-guard-immediately",
  },
  {
    id: "RFA-153",
    area: "concurrency-memory",
    symptom:
      "Read::read_to_string leaves an old prefix in the destination, producing concatenated text where the caller expected the new input to replace existing contents.",
    likelyCause:
      "The method appends bytes to the supplied String and preserves all existing valid UTF-8 contents; it does not clear or replace the destination first.",
    firstCheck:
      "Inspect the destination String immediately before the read and confirm whether it is empty, newly allocated, reused, or partially populated from an earlier attempt.",
    searchTerms: [
      "Rust read_to_string appends existing String",
      "Read read_to_string does not clear buffer",
      "Rust reused String prefix duplicate input",
    ],
    evidence: ["Rust 1.98.1 runtime assertion", "pre-populated String", "clear-before-read repair"],
    caseSlug: "read-to-string-appends-instead-of-replacing",
  },
  {
    id: "RFA-154",
    area: "concurrency-memory",
    symptom:
      "HashMap::insert updates the value for an equal key but get_key_value still returns the original stored key rather than the replacement key supplied to insert.",
    likelyCause:
      "The insert contract deliberately preserves the existing key object when an equal key is found and replaces only the associated value.",
    firstCheck:
      "Use get_key_value to inspect the key physically stored in the map, especially when equality and hashing ignore descriptive key fields.",
    searchTerms: [
      "Rust HashMap insert keeps old key",
      "HashMap equal key replace value not key",
      "get_key_value returns original key Rust",
    ],
    evidence: [
      "Rust 1.98.1 runtime assertion",
      "identity-only equality",
      "remove-then-insert repair",
    ],
    caseSlug: "hashmap-insert-equal-key-keeps-original-key",
  },
  {
    id: "RFA-155",
    area: "concurrency-memory",
    symptom:
      "String::truncate panics for an index smaller than the string length because that byte index falls inside a multi-byte UTF-8 character.",
    likelyCause:
      "String length and truncation positions are byte offsets, but truncate additionally requires the new length to be a valid UTF-8 character boundary.",
    firstCheck:
      "Print the byte length and char_indices boundaries, then test the proposed offset with is_char_boundary before mutating the String.",
    searchTerms: [
      "Rust String truncate panics char boundary",
      "truncate byte index inside UTF-8 character",
      "String is_char_boundary safe truncate",
    ],
    evidence: [
      "Rust 1.98.1 runtime panic",
      "multi-byte leading character",
      "char_indices boundary repair",
    ],
    caseSlug: "string-truncate-panics-not-char-boundary",
  },
  {
    id: "RFA-156",
    area: "concurrency-memory",
    symptom:
      "HashSet::replace stores a new value equal to an existing member, while code expected the set to retain its original canonical representative.",
    likelyCause:
      "Unlike insert, HashSet::replace deliberately swaps the stored equal value and returns the previous representative, even though set membership remains unchanged.",
    firstCheck:
      "Construct two distinct values that compare equal and inspect the stored representative with get after calling insert and replace separately.",
    searchTerms: [
      "Rust HashSet replace equal value keeps which",
      "HashSet insert versus replace canonical value",
      "HashSet replace stores new equal element",
    ],
    evidence: ["Rust 1.98.1 runtime assertion", "identity-only equality", "HashSet::insert repair"],
    caseSlug: "hashset-replace-stores-new-equal-value",
  },
  {
    id: "RFA-157",
    area: "concurrency-memory",
    symptom:
      "Option::take_if returns None but mutations made inside its predicate remain in the Some value left behind.",
    likelyCause:
      "take_if passes &mut T to the predicate before deciding whether to take the value, and a false result does not roll back mutations already performed through that reference.",
    firstCheck:
      "Make the predicate return false in a minimal case and inspect the inner value afterward instead of checking only whether the returned Option is None.",
    searchTerms: [
      "Rust Option take_if mutation remains false",
      "take_if predicate mutates value not taken",
      "Option take_if rollback mutation",
    ],
    evidence: [
      "Rust 1.98.1 runtime assertion",
      "false mutating predicate",
      "separate-decision repair",
    ],
    caseSlug: "option-take-if-keeps-predicate-mutation",
  },
  {
    id: "RFA-158",
    area: "concurrency-memory",
    symptom:
      "Peekable::peek triggers an observable pull from the underlying iterator even though it does not consume the item from the Peekable adapter.",
    likelyCause:
      "The adapter must call the underlying next method once to populate its private cache; peek is non-consuming only from the adapter consumer's perspective.",
    firstCheck:
      "Instrument the underlying Iterator::next call count and compare the first peek, repeated peeks, and the following next call.",
    searchTerms: [
      "Rust Peekable peek advances underlying iterator",
      "peek calls next side effects Rust iterator",
      "Peekable first peek fills cache",
    ],
    evidence: ["Rust 1.98.1 counted next calls", "first-peek cache fill", "cache-aware repair"],
    caseSlug: "peekable-peek-advances-underlying-iterator",
  },
  {
    id: "RFA-159",
    area: "concurrency-memory",
    symptom:
      "After collecting a prefix with take_while on an iterator borrowed by_ref, the first item that failed the predicate is missing from the remaining iterator.",
    likelyCause:
      "take_while must pull an item before it can test the predicate, so the first rejected item has already been consumed when the adapter returns None.",
    firstCheck:
      "Read the first value from the original iterator after take_while completes and compare it with the predicate boundary value.",
    searchTerms: [
      "Rust take_while consumes first false item",
      "iterator by_ref take_while missing boundary",
      "preserve rejected item after take_while",
    ],
    evidence: ["Rust 1.98.1 runtime assertion", "consumed boundary item", "Peekable loop repair"],
    caseSlug: "take-while-consumes-first-rejected-item",
  },
  {
    id: "RFA-160",
    area: "concurrency-memory",
    symptom:
      "An atomic load using Ordering::Release fails the invalid_atomic_ordering lint even though Release is a valid Ordering variant.",
    likelyCause:
      "Release constrains stores, while a pure load performs no store operation; atomic loads accept only Relaxed, Acquire, or SeqCst.",
    firstCheck:
      "Classify the atomic operation as load, store, or read-modify-write before choosing an ordering from the enum.",
    searchTerms: [
      "Rust atomic loads cannot have Release ordering",
      "invalid_atomic_ordering AtomicUsize load",
      "Ordering Release not valid for load",
    ],
    evidence: ["Rust 1.98.1 invalid_atomic_ordering", "pure-load operation", "Acquire load repair"],
    caseSlug: "atomic-load-cannot-use-release-ordering",
  },
  {
    id: "RFA-161",
    area: "concurrency-memory",
    symptom:
      "compare_exchange rejects Ordering::Release for its failure ordering while accepting release semantics in the success ordering.",
    likelyCause:
      "A failed comparison performs only a load and no write, so its ordering can be Relaxed, Acquire, or SeqCst but cannot carry Release semantics.",
    firstCheck:
      "Separate the success read-modify-write path from the failure load-only path and justify each ordering independently.",
    searchTerms: [
      "Rust compare_exchange failure ordering Release error",
      "failed compare exchange no write ordering",
      "invalid_atomic_ordering compare_exchange failure",
    ],
    evidence: [
      "Rust 1.98.1 compiler diagnostic",
      "failed-path load semantics",
      "Acquire failure repair",
    ],
    caseSlug: "compare-exchange-failure-ordering-cannot-be-release",
  },
  {
    id: "RFA-162",
    area: "concurrency-memory",
    symptom:
      "A Weak pointer stops upgrading after Arc::make_mut even though no strong Arc was explicitly dropped by the application.",
    likelyCause:
      "When only Weak pointers share the allocation, make_mut can dissociate them instead of cloning T, leaving the mutated Arc as the sole owner of its allocation.",
    firstCheck:
      "Record strong_count and weak_count immediately before make_mut, then decide whether observers need the old snapshot, the current identity, or only best-effort access.",
    searchTerms: [
      "Rust Arc make_mut Weak upgrade None",
      "Arc make_mut dissociates Weak pointers",
      "Weak invalid after clone on write Arc",
    ],
    evidence: [
      "Rust 1.98.1 runtime assertion",
      "one-strong one-weak allocation",
      "retained-snapshot repair",
    ],
    caseSlug: "arc-make-mut-dissociates-weak-pointers",
  },
  {
    id: "RFA-163",
    area: "concurrency-memory",
    symptom:
      "A worker continues to completion after its JoinHandle is dropped, while the caller expected dropping the handle to cancel the thread.",
    likelyCause:
      "Dropping JoinHandle detaches the associated thread; the handle represents observation and joining, not ownership of a cancellation capability.",
    firstCheck:
      "Add deterministic start, release, and completion signals around the worker and observe it after dropping the handle without relying on sleeps.",
    searchTerms: [
      "Rust dropping JoinHandle does not cancel thread",
      "JoinHandle drop detaches worker",
      "how to cancel std thread Rust",
    ],
    evidence: [
      "Rust 1.98.1 channel coordination",
      "detached worker completion",
      "explicit-join repair",
    ],
    caseSlug: "dropping-joinhandle-detaches-instead-of-cancelling",
  },
  {
    id: "RFA-164",
    area: "concurrency-memory",
    symptom:
      "One successful Write::write call stores only a prefix of the input and silently leaves the remaining bytes unwritten.",
    likelyCause:
      "The Write contract permits any successful count from zero through the input length; a short write is progress, not an error.",
    firstCheck:
      "Compare the returned byte count with the input length and reproduce with a writer that deliberately accepts only a small prefix per call.",
    searchTerms: [
      "Rust Write write short partial write",
      "write returns fewer bytes without error Rust",
      "Write write versus write_all",
    ],
    evidence: [
      "Rust 1.98.1 deterministic short writer",
      "three-byte write limit",
      "write_all repair",
    ],
    caseSlug: "write-may-succeed-after-writing-only-a-prefix",
  },
  {
    id: "RFA-165",
    area: "ffi-targets",
    symptom:
      "CStr::from_bytes_with_nul rejects a byte slice containing a valid early NUL terminator because additional bytes follow that terminator.",
    likelyCause:
      "from_bytes_with_nul validates that the slice contains exactly one NUL and that it is the final byte, rather than parsing only the first C string in a larger buffer.",
    firstCheck:
      "Locate every NUL byte and decide whether the slice is exactly one C string or a larger buffer whose first terminated string should be extracted.",
    searchTerms: [
      "Rust CStr from_bytes_with_nul trailing bytes",
      "FromBytesWithNulError InteriorNul after terminator",
      "from_bytes_until_nul versus with_nul",
    ],
    evidence: [
      "Rust 1.98.1 InteriorNul error",
      "trailing buffer bytes",
      "from_bytes_until_nul repair",
    ],
    caseSlug: "cstr-from-bytes-with-nul-rejects-trailing-data",
  },
  {
    id: "RFA-166",
    area: "concurrency-memory",
    symptom:
      "Vec::dedup_by passes a later element as the first closure argument and its earlier neighbour as the second, reversing code that named them left and right.",
    likelyCause:
      "The method's removal algorithm exposes mutable arguments in the documented later-then-earlier order, which is observable when the closure mutates or records them.",
    firstCheck:
      "Record both arguments from the first closure call using distinct input values, then rename them by role instead of spatial intuition.",
    searchTerms: [
      "Rust Vec dedup_by arguments reversed",
      "dedup_by closure argument order later earlier",
      "Vec dedup_by removes which element",
    ],
    evidence: [
      "Rust 1.98.1 callback trace",
      "two distinct adjacent values",
      "role-named closure repair",
    ],
    caseSlug: "vec-dedup-by-arguments-are-reversed",
  },
  {
    id: "RFA-167",
    area: "concurrency-memory",
    symptom:
      "Writing through Cursor::new over a populated Vec replaces its first bytes instead of appending after the existing contents.",
    likelyCause:
      "A newly constructed Cursor always begins at position zero even when the wrapped buffer already has a non-zero length.",
    firstCheck:
      "Compare Cursor::position with the wrapped buffer length before the first write and state whether overwrite or append is intended.",
    searchTerms: [
      "Rust Cursor new Vec overwrites beginning",
      "Cursor Vec append starts position zero",
      "set Cursor position to end before write",
    ],
    evidence: ["Rust 1.98.1 runtime assertion", "pre-populated byte vector", "set_position repair"],
    caseSlug: "cursor-new-starts-at-position-zero",
  },
  {
    id: "RFA-168",
    area: "concurrency-memory",
    symptom:
      "RwLock::is_poisoned remains false after a panic while a read guard is held, contrary to code expecting every guard panic to poison the lock.",
    likelyCause:
      "The standard RwLock becomes poisoned only when a panic occurs while it is locked exclusively for writing, not while any number of readers hold shared guards.",
    firstCheck:
      "Reproduce reader and writer panics separately and record which guard type was live when unwinding began.",
    searchTerms: [
      "Rust RwLock reader panic not poisoned",
      "RwLock poisoning only writer panic",
      "is_poisoned false after read guard panic",
    ],
    evidence: [
      "Rust 1.98.1 caught reader panic",
      "shared read guard",
      "non-poison expectation repair",
    ],
    caseSlug: "rwlock-reader-panic-does-not-poison",
  },
  {
    id: "RFA-169",
    area: "concurrency-memory",
    symptom:
      "thread::scope panics after its closure returns because a scoped child panicked and its JoinHandle was left for automatic joining.",
    likelyCause:
      "Scope automatically joins unjoined scoped threads before returning and propagates a panic if any automatically joined child panicked.",
    firstCheck:
      "Keep each ScopedJoinHandle and join it explicitly to distinguish a handled worker panic from automatic scope-level propagation.",
    searchTerms: [
      "Rust thread scope panics child automatically joined",
      "scoped thread panic propagation join handle",
      "catch panic from std thread scope",
    ],
    evidence: ["Rust 1.98.1 caught scope panic", "unjoined scoped child", "explicit-join repair"],
    caseSlug: "thread-scope-propagates-unjoined-child-panic",
  },
  {
    id: "RFA-170",
    area: "diagnostics-macros",
    symptom:
      "An exported macro using $crate resolves its helper in the defining crate but still fails with E0603 because that helper is private to downstream callers.",
    likelyCause:
      "$crate provides a hygienic path to the defining crate; it does not bypass Rust visibility rules at the macro invocation site.",
    firstCheck:
      "Expand the macro path mentally or with tooling, then verify the visibility of every definition referenced through $crate from an external crate.",
    searchTerms: [
      "Rust exported macro $crate private function E0603",
      "$crate does not bypass privacy macro_rules",
      "macro helper private downstream crate",
    ],
    evidence: ["Cargo 1.98.1 two-crate E0603", "$crate helper path", "public hidden-helper repair"],
    caseSlug: "exported-macro-cannot-access-private-item-through-crate",
  },
  {
    id: "RFA-171",
    area: "ffi-targets",
    symptom:
      "Path::join with an absolute candidate discards the intended base on Unix, producing /etc/passwd instead of a path beneath the application directory.",
    likelyCause:
      "Path joining follows platform path semantics: pushing an absolute path replaces the accumulated path rather than treating it as a relative child.",
    firstCheck:
      "Check candidate.is_absolute before joining and inspect path components instead of assuming join provides containment.",
    searchTerms: [
      "Rust Path join absolute replaces base",
      "PathBuf join user path escapes root",
      "Rust safe join relative path containment",
    ],
    evidence: [
      "Rust 1.98.1 x86_64 Linux assertion",
      "absolute Unix candidate",
      "reject-absolute repair",
    ],
    caseSlug: "path-join-absolute-component-replaces-base",
  },
  {
    id: "RFA-172",
    area: "concurrency-memory",
    symptom:
      "str::find returns index 2 for the visually second character in éclair because the returned position counts UTF-8 bytes rather than Unicode scalar values.",
    likelyCause:
      "Rust string ranges use byte offsets so the result can be used directly for valid slicing at the matched boundary.",
    firstCheck:
      "Compare the find result with char_indices and state whether the consumer needs a byte offset, scalar-value index, or grapheme position.",
    searchTerms: [
      "Rust str find returns byte index",
      "String find Unicode character position Rust",
      "convert UTF-8 byte offset to char index",
    ],
    evidence: [
      "Rust 1.98.1 UTF-8 assertion",
      "two-byte leading character",
      "prefix-char-count repair",
    ],
    caseSlug: "str-find-returns-byte-offset",
  },
  {
    id: "RFA-173",
    area: "ffi-targets",
    symptom:
      "Command::output returns Ok(Output) for a child that exits with status 7, while application code interpreted Ok as command success.",
    likelyCause:
      "The Result reports whether the child was spawned and waited on successfully; the program's exit outcome is stored separately in Output::status.",
    firstCheck:
      "Inspect status.success, status.code, stderr, and target-specific termination information before accepting a completed child process.",
    searchTerms: [
      "Rust Command output Ok nonzero exit status",
      "std process Command check exit code",
      "Command output Result does not mean success",
    ],
    evidence: [
      "Rust 1.98.1 Unix child exit 7",
      "successful process transport",
      "explicit-status repair",
    ],
    caseSlug: "command-output-ok-nonzero-exit-status",
  },
  {
    id: "RFA-174",
    area: "concurrency-memory",
    symptom:
      "OnceLock::get returns None while another thread is inside get_or_init, although the value will become initialized moments later.",
    likelyCause:
      "get is deliberately non-blocking and treats in-progress initialization as unavailable; wait is the operation that blocks until initialization completes.",
    firstCheck:
      "Coordinate inside the initializer and call get before releasing it, separating uninitialized, initializing, and initialized states without sleeps.",
    searchTerms: [
      "Rust OnceLock get None during initialization",
      "OnceLock get does not wait get_or_init",
      "OnceLock wait for another thread initializer",
    ],
    evidence: [
      "Rust 1.98.1 channel-coordinated initialization",
      "non-blocking get",
      "OnceLock::wait repair",
    ],
    caseSlug: "oncelock-get-does-not-wait-during-initialization",
  },
  {
    id: "RFA-175",
    area: "concurrency-memory",
    symptom:
      "Arc::try_unwrap succeeds while a Weak pointer exists, then that observer can no longer upgrade after the final strong owner is consumed.",
    likelyCause:
      "try_unwrap requires exactly one strong reference but deliberately ignores weak reference count because Weak does not keep the inner value alive.",
    firstCheck:
      "Record strong and weak counts separately, then decide whether extracting T is allowed to invalidate all weak observers.",
    searchTerms: [
      "Rust Arc try_unwrap succeeds with Weak pointer",
      "Arc try_unwrap ignores weak count",
      "Weak upgrade None after try_unwrap",
    ],
    evidence: [
      "Rust 1.98.1 runtime assertion",
      "one strong plus one weak",
      "clone-with-owner repair",
    ],
    caseSlug: "arc-try-unwrap-ignores-weak-pointers",
  },
  {
    id: "RFA-176",
    area: "concurrency-memory",
    symptom:
      "A binary search over sorted duplicate values returns a later matching index although application code expected the first occurrence.",
    likelyCause:
      "Slice binary_search deliberately permits any matching duplicate and its deterministic choice may change between Rust versions.",
    firstCheck:
      "Run the search on several equal adjacent values and decide whether the caller needs any match, the lower bound, or the upper bound.",
    searchTerms: [
      "Rust binary_search duplicate first occurrence",
      "slice binary_search returns which duplicate",
      "Rust partition_point lower bound equal values",
    ],
    evidence: [
      "Rust 1.98.1 duplicate slice",
      "returned index 3 instead of 1",
      "partition_point lower-bound repair",
    ],
    caseSlug: "slice-binary-search-duplicate-match-not-first",
  },
  {
    id: "RFA-177",
    area: "ffi-targets",
    symptom:
      "BufRead::read_line preserves old String contents and appends the next line, producing prefix:hello instead of replacing the buffer.",
    likelyCause:
      "The method is designed for buffer reuse and appends bytes through the newline or EOF without clearing data supplied by the caller.",
    firstCheck:
      "Seed the destination String before one read_line call and inspect both the returned byte count and the complete resulting buffer.",
    searchTerms: [
      "Rust read_line appends to String",
      "BufRead read_line clear buffer",
      "Rust read_line does not replace contents",
    ],
    evidence: ["Rust 1.98.1 Cursor fixture", "pre-populated String", "explicit clear repair"],
    caseSlug: "bufread-read-line-appends-to-string",
  },
  {
    id: "RFA-178",
    area: "ffi-targets",
    symptom:
      "Read::read_exact returns UnexpectedEof after changing part of the destination buffer that application code expected to remain untouched.",
    likelyCause:
      "read_exact may complete several underlying reads before an error and documents the destination contents as unspecified whenever it returns Err.",
    firstCheck:
      "Use a reader that yields one byte and then EOF, prefill the destination with a sentinel, and inspect it after the error.",
    searchTerms: [
      "Rust read_exact buffer after error unspecified",
      "read_exact UnexpectedEof partial buffer",
      "transactional fixed length read Rust",
    ],
    evidence: [
      "Rust 1.98.1 controlled short reader",
      "sentinel-buffer mutation",
      "staging-buffer repair",
    ],
    caseSlug: "read-exact-error-leaves-buffer-unspecified",
  },
  {
    id: "RFA-179",
    area: "ffi-targets",
    symptom:
      "Opening an existing file with File::create reduces its length to zero before the application writes replacement data.",
    likelyCause:
      "File::create is equivalent to a write-only open with create and truncate enabled, so successful opening is already destructive.",
    firstCheck:
      "Write a known payload, call File::create without writing through the returned handle, and inspect metadata length immediately.",
    searchTerms: [
      "Rust File create truncates existing file",
      "File create data lost before write Rust",
      "OpenOptions write without truncate Rust",
    ],
    evidence: [
      "Rust 1.98.1 temporary file",
      "zero-length observation after open",
      "explicit OpenOptions repair",
    ],
    caseSlug: "file-create-truncates-existing-file",
  },
  {
    id: "RFA-180",
    area: "ffi-targets",
    symptom:
      "Path::exists returns false for a path whose existence cannot be determined because resolving a self-referential symlink fails.",
    likelyCause:
      "exists is a convenience query that converts filesystem metadata errors to false, merging confirmed absence with indeterminate access.",
    firstCheck:
      "Compare exists with try_exists on the same failing metadata lookup and retain the Result instead of treating every false as NotFound.",
    searchTerms: [
      "Rust Path exists hides errors false",
      "Path try_exists permission error Rust",
      "Rust exists false symlink loop",
    ],
    evidence: ["Rust 1.98.1 Unix symlink loop", "FilesystemLoop error", "try_exists Result repair"],
    caseSlug: "path-exists-coerces-errors-to-false",
  },
  {
    id: "RFA-181",
    area: "concurrency-memory",
    symptom:
      "VecDeque::as_slices returns live elements across two slices after front removals and back insertions wrap its ring storage.",
    likelyCause:
      "Logical deque order is contiguous but its ring-buffer representation may cross the allocation boundary at an implementation-defined split point.",
    firstCheck:
      "Compare deque length with the combined slice lengths and call make_contiguous before requiring one physical slice.",
    searchTerms: [
      "Rust VecDeque as_slices second slice not empty",
      "VecDeque wrapped storage contiguous slice",
      "VecDeque make_contiguous allocation",
    ],
    evidence: ["Rust 1.98.1 capacity-four wrap", "two-slice layout", "make_contiguous repair"],
    caseSlug: "vecdeque-as-slices-may-split-storage",
  },
  {
    id: "RFA-182",
    area: "concurrency-memory",
    symptom:
      "Arc::into_inner returns None for one clone and then Some for the final clone, although code assumed all cloned attempts would fail.",
    likelyCause:
      "Every failed into_inner consumes and drops its Arc, and calling it on every clone guarantees exactly one successful extraction.",
    firstCheck:
      "Record every into_inner outcome across the complete clone set and count Some values instead of interpreting the first None alone.",
    searchTerms: [
      "Rust Arc into_inner exactly one Some",
      "Arc into_inner called on every clone",
      "difference Arc into_inner try_unwrap ok",
    ],
    evidence: [
      "Rust 1.98.1 two-clone fixture",
      "first None then final Some",
      "one-winner assertion repair",
    ],
    caseSlug: "arc-into-inner-exactly-one-clone-succeeds",
  },
  {
    id: "RFA-183",
    area: "concurrency-memory",
    symptom:
      "HashMap::get_disjoint_mut panics when the query array contains the same key twice instead of returning one Some and one None.",
    likelyCause:
      "The safe API must prevent overlapping mutable references and treats duplicate or equivalent query keys as a caller contract violation.",
    firstCheck:
      "Validate the requested keys for equality before borrowing and distinguish duplicate inputs from independently missing keys.",
    searchTerms: [
      "Rust HashMap get_disjoint_mut duplicate keys panic",
      "get_disjoint_mut overlapping keys",
      "multiple mutable HashMap values safely Rust",
    ],
    evidence: ["Rust 1.98.1 duplicate-key panic", "two equal queries", "distinct-key repair"],
    caseSlug: "hashmap-get-disjoint-mut-panics-duplicate-keys",
  },
  {
    id: "RFA-184",
    area: "concurrency-memory",
    symptom:
      "BTreeMap::range panics for a dynamic range whose start is greater than its end instead of yielding an empty iterator.",
    likelyCause:
      "An inverted ordered range is invalid input to BTreeMap::range; emptiness describes a valid range containing no keys, not malformed bounds.",
    firstCheck:
      "Log the resolved start and end bounds before constructing the iterator and test equal included, equal excluded, and inverted cases separately.",
    searchTerms: [
      "Rust BTreeMap range start greater end panic",
      "BTreeMap range invalid bounds empty",
      "validate dynamic RangeBounds Rust",
    ],
    evidence: [
      "Rust 1.98.1 inverted integer range",
      "documented runtime panic",
      "pre-validation repair",
    ],
    caseSlug: "btreemap-range-panics-invalid-bounds",
  },
  {
    id: "RFA-185",
    area: "concurrency-memory",
    symptom:
      "Duration::new with 1 second and 1.5 billion nanoseconds produces 2.5 seconds rather than preserving the supplied fields.",
    likelyCause:
      "The constructor normalizes excess nanoseconds by carrying whole billions into the seconds component and panics only if that carry overflows.",
    firstCheck:
      "Inspect as_secs and subsec_nanos separately, then decide whether external input should be normalized or rejected as non-canonical.",
    searchTerms: [
      "Rust Duration new nanoseconds greater one billion",
      "Duration new normalizes nanoseconds",
      "Rust reject non canonical duration fields",
    ],
    evidence: [
      "Rust 1.98.1 1.5-billion-nanosecond input",
      "2.5-second normalized result",
      "canonical-input repair",
    ],
    caseSlug: "duration-new-normalizes-excess-nanoseconds",
  },
  {
    id: "RFA-186",
    area: "ffi-targets",
    symptom:
      "Two consecutive BufRead::fill_buf calls return the same unread bytes although application code expected the second call to advance the stream.",
    likelyCause:
      "fill_buf only exposes currently available buffered data; the reader advances after the caller explicitly marks accepted bytes with consume.",
    firstCheck:
      "Call fill_buf twice without consume, record both slices, then repeat while consuming the exact first-slice length between calls.",
    searchTerms: [
      "Rust fill_buf returns same bytes",
      "BufRead fill_buf consume example",
      "fill_buf does not advance reader Rust",
    ],
    evidence: [
      "Rust 1.98.1 three-byte BufReader",
      "repeated abc observation",
      "consume-before-refill repair",
    ],
    caseSlug: "bufread-fill-buf-repeats-until-consume",
  },
  {
    id: "RFA-187",
    area: "concurrency-memory",
    symptom:
      "After one item is taken from Vec::extract_if and the iterator is dropped, later matching values remain in the original vector.",
    likelyCause:
      "extract_if visits and removes lazily, and its drop behaviour deliberately retains elements that iteration has not yet examined.",
    firstCheck:
      "Count predicate calls and yielded values, then inspect the original vector after a single next call and after full collection.",
    searchTerms: [
      "Rust Vec extract_if iterator not exhausted",
      "dropping ExtractIf keeps elements",
      "Vec extract_if only removes first match",
    ],
    evidence: [
      "Rust 1.98.1 partial iteration",
      "unvisited even values retained",
      "collect-to-exhaust repair",
    ],
    caseSlug: "vec-extract-if-stops-removing-when-iterator-dropped",
  },
  {
    id: "RFA-188",
    area: "concurrency-memory",
    symptom:
      "Receiver::try_iter returns None after draining current messages although a live sender publishes another message immediately afterward.",
    likelyCause:
      "try_iter is a nonblocking drain of currently pending values, so it stops on temporary emptiness as well as permanent channel disconnection.",
    firstCheck:
      "Keep one sender alive, exhaust try_iter, then compare try_recv returning Empty before a later send and Disconnected after the sender is dropped.",
    searchTerms: [
      "Rust mpsc try_iter empty disconnected",
      "Receiver try_iter stops before later messages",
      "try_recv Empty vs Disconnected Rust",
    ],
    evidence: [
      "Rust 1.98.1 channel state timeline",
      "live sender after temporary emptiness",
      "explicit TryRecvError repair",
    ],
    caseSlug: "mpsc-try-iter-empty-does-not-mean-disconnected",
  },
  {
    id: "RFA-189",
    area: "concurrency-memory",
    symptom:
      "HashMap Entry::or_insert constructs and immediately drops an expensive default although the requested key is already occupied.",
    likelyCause:
      "Rust evaluates ordinary function arguments before the call, while or_insert accepts an already-built value rather than deferred construction logic.",
    firstCheck:
      "Instrument construction or Drop on the default value and compare an occupied entry under or_insert with the closure-based or_insert_with method.",
    searchTerms: [
      "Rust HashMap or_insert eager evaluation",
      "Entry or_insert expensive default called",
      "or_insert vs or_insert_with lazy",
    ],
    evidence: ["Rust 1.98.1 occupied entry", "atomic Drop counter", "closure-based repair"],
    caseSlug: "hashmap-entry-or-insert-eagerly-evaluates-default",
  },
  {
    id: "RFA-190",
    area: "concurrency-memory",
    symptom:
      "slice::sort_by_key invokes an expensive key function many more times than the number of elements being sorted.",
    likelyCause:
      "sort_by_key computes keys while comparing elements and does not cache them, so one element's key may be requested repeatedly during the sort.",
    firstCheck:
      "Count key-function calls around sort_by_key, then repeat with sort_by_cached_key on the same input and verify the sorted output separately.",
    searchTerms: [
      "Rust sort_by_key called multiple times",
      "sort_by_key expensive closure repeated",
      "sort_by_cached_key versus sort_by_key",
    ],
    evidence: ["Rust 1.98.1 six-element slice", "counted key evaluations", "cached-key repair"],
    caseSlug: "slice-sort-by-key-recomputes-keys",
  },
  {
    id: "RFA-191",
    area: "concurrency-memory",
    symptom:
      "After zip ends because its second general iterator is exhausted, the first iterator has unexpectedly lost one unpaired item.",
    likelyCause:
      "A general Zip probes the first iterator before the second on its terminating next call, although exact-size specializations may avoid that extra pull.",
    firstCheck:
      "Borrow the first non-exact iterator with by_ref, exhaust zip against a shorter second iterator, then inspect the first iterator's next value.",
    searchTerms: [
      "Rust Iterator zip consumes extra element",
      "zip loses item from longer iterator Rust",
      "recover remainder after Iterator zip",
    ],
    evidence: [
      "Rust 1.98.1 non-exact iterator",
      "one unpaired item consumed",
      "shorter-first repair",
    ],
    caseSlug: "iterator-zip-consumes-extra-left-item",
  },
  {
    id: "RFA-192",
    area: "concurrency-memory",
    symptom:
      "Reading one character from String::drain and dropping the iterator removes every character in the selected range.",
    likelyCause:
      "The range defines the mutation, while iteration only controls which removed characters the caller receives before Drain performs cleanup on drop.",
    firstCheck:
      "Drain a multi-character range, call next once, drop the iterator in a nested scope, and inspect the original String afterward.",
    searchTerms: [
      "Rust String drain dropped before consumed",
      "String drain removes whole range",
      "partial iteration String Drain behavior",
    ],
    evidence: [
      "Rust 1.98.1 ASCII boundary fixture",
      "single yielded character",
      "range-sized repair",
    ],
    caseSlug: "string-drain-removes-range-when-dropped",
  },
  {
    id: "RFA-193",
    area: "concurrency-memory",
    symptom:
      "BinaryHeap::into_sorted_vec returns the smallest value first although repeatedly calling pop on the same max-heap returns the largest first.",
    likelyCause:
      "The conversion performs an in-place heap sort whose documented result is ascending, while the priority-queue pop operation exposes max-heap order.",
    firstCheck:
      "Compare into_sorted_vec with a vector collected from repeated pop calls on identical BinaryHeap inputs.",
    searchTerms: [
      "Rust BinaryHeap into_sorted_vec ascending",
      "BinaryHeap sorted vec reverse pop order",
      "max heap into_sorted_vec order Rust",
    ],
    evidence: [
      "Rust 1.98.1 four-element heap",
      "ascending conversion result",
      "pop-order alternative",
    ],
    caseSlug: "binaryheap-into-sorted-vec-is-ascending",
  },
  {
    id: "RFA-194",
    area: "ffi-targets",
    symptom:
      "Path::starts_with returns false for /srv/application-cache against /srv/application although the raw text begins with that string.",
    likelyCause:
      "Path prefix checks compare normalized path components rather than arbitrary character prefixes inside a filename component.",
    firstCheck:
      "Compare the components of the candidate and base, then test a real child component and a same-text sibling name separately.",
    searchTerms: [
      "Rust Path starts_with component not string",
      "Path starts_with returns false textual prefix",
      "Rust path prefix directory containment",
    ],
    evidence: [
      "Rust 1.98.1 lexical path fixture",
      "sibling-name rejection",
      "child-component repair",
    ],
    caseSlug: "path-starts-with-compares-components",
  },
  {
    id: "RFA-195",
    area: "ffi-targets",
    symptom:
      "Reading two bytes through a File returned by try_clone begins at byte three rather than at the start of the file.",
    likelyCause:
      "File::try_clone creates another Rust handle to the same underlying open file description, so reads, writes, and seeks affect shared cursor state.",
    firstCheck:
      "Read through the original handle, then immediately read through its clone and compare that with a separately opened File.",
    searchTerms: [
      "Rust File try_clone shared cursor",
      "try_clone file offset changed",
      "independent file cursor Rust",
    ],
    evidence: ["Rust 1.98.1 temporary file", "shared sequential reads", "second-open repair"],
    caseSlug: "file-try-clone-shares-cursor",
  },
  {
    id: "RFA-196",
    area: "ffi-targets",
    symptom:
      "OpenOptions configured with truncate and create still refuses an existing file and leaves its original bytes unchanged.",
    likelyCause:
      "Setting create_new(true) requests exclusive atomic creation and explicitly makes the create and truncate options irrelevant.",
    firstCheck:
      "Inspect every OpenOptions flag, reproduce against an existing file, and record both the error kind and contents after the failed open.",
    searchTerms: [
      "Rust OpenOptions create_new truncate ignored",
      "create_new existing file not truncated",
      "OpenOptions create truncate create_new precedence",
    ],
    evidence: [
      "Rust 1.98.1 temporary file",
      "AlreadyExists without truncation",
      "explicit overwrite repair",
    ],
    caseSlug: "openoptions-create-new-overrides-truncate",
  },
  {
    id: "RFA-197",
    area: "concurrency-memory",
    symptom:
      "After one removed value is read from Vec::splice, dropping the iterator removes the whole selected range and inserts every replacement.",
    likelyCause:
      "Splice uses iteration to yield removed values, but its destructor completes range removal and consumes the replacement iterator to repair the vector.",
    firstCheck:
      "Call next once on a Splice in a nested scope, let it drop, then inspect both the retained tail and all inserted replacements.",
    searchTerms: [
      "Rust Vec splice dropped before consumed",
      "Vec Splice removes full range on drop",
      "splice replacement iterator consumed when dropped",
    ],
    evidence: [
      "Rust 1.98.1 four-element vector",
      "partial removed-value iteration",
      "range-sized repair",
    ],
    caseSlug: "vec-splice-completes-replacement-on-drop",
  },
  {
    id: "RFA-198",
    area: "concurrency-memory",
    symptom:
      "BTreeMap::append replaces an existing configuration value with the conflicting value from the other map.",
    likelyCause:
      "append is a move-and-merge operation with a defined other-map-wins conflict rule, not a union that preserves values already in self.",
    firstCheck:
      "Put one duplicate key in both maps, append the other map, then inspect the conflict value and confirm that the other map is empty.",
    searchTerms: [
      "Rust BTreeMap append duplicate key value",
      "BTreeMap append overwrite conflict",
      "merge BTreeMap keep existing value",
    ],
    evidence: ["Rust 1.98.1 duplicate-key maps", "other-map value wins", "Entry-based repair"],
    caseSlug: "btreemap-append-overwrites-conflicting-values",
  },
  {
    id: "RFA-199",
    area: "ffi-targets",
    symptom:
      "Path::parent returns Some containing an empty path for config.toml instead of returning None for the one-component relative path.",
    likelyCause:
      "Removing the final component of a one-component relative path leaves a valid empty relative path; only its next parent is absent.",
    firstCheck:
      "Inspect parent, its OsStr length, and one additional parent call instead of using Option presence as a test for a useful directory name.",
    searchTerms: [
      "Rust Path parent returns empty path",
      "Path parent Some empty string",
      "one component relative path parent Rust",
    ],
    evidence: ["Rust 1.98.1 relative path", "Some empty parent", "current-directory normalization"],
    caseSlug: "path-parent-one-component-is-empty",
  },
  {
    id: "RFA-200",
    area: "ffi-targets",
    symptom:
      "Splitting a newline-terminated string with str::lines produces no final empty item, so a record count is one smaller than expected.",
    likelyCause:
      "The Lines iterator treats a final line ending as a terminator for the preceding line, not as evidence of another empty line after it.",
    firstCheck:
      "Compare lines with split on the newline character for inputs with no terminator, one final terminator, two final terminators, and an empty string.",
    searchTerms: [
      "Rust str lines trailing empty line",
      "str lines final newline omitted",
      "Rust lines versus split newline",
    ],
    evidence: ["Rust 1.98.1 terminated string", "omitted final empty item", "split-based repair"],
    caseSlug: "str-lines-omits-trailing-empty-line",
  },
  {
    id: "RFA-201",
    area: "concurrency-memory",
    symptom:
      "BTreeMap::split_off places the requested boundary key in the returned map although the caller expected that key to stay in the original map.",
    likelyCause:
      "The operation divides the map into keys below the boundary and keys greater than or equal to it, making the boundary inclusive on the returned side.",
    firstCheck:
      "Use three ordered keys, split at the middle key, and inspect both key sets before changing the comparison or computing a successor key.",
    searchTerms: [
      "Rust BTreeMap split_off boundary key",
      "BTreeMap split_off inclusive or exclusive",
      "split BTreeMap keep key on left",
    ],
    evidence: [
      "Rust 1.98.1 three-key map",
      "inclusive returned boundary",
      "explicit partition repair",
    ],
    caseSlug: "btreemap-split-off-moves-boundary-key",
  },
  {
    id: "RFA-202",
    area: "ffi-targets",
    symptom:
      "After File::set_len shrinks a file, stream_position still reports the old end and the cursor is now beyond the new file length.",
    likelyCause:
      "set_len changes the underlying file size but deliberately does not reposition the logical cursor stored by the open file handle.",
    firstCheck:
      "Record metadata length and stream position before and after set_len, then seek explicitly to the position required by the next operation.",
    searchTerms: [
      "Rust File set_len cursor unchanged",
      "file cursor past EOF after truncate Rust",
      "set_len stream_position Rust",
    ],
    evidence: ["Rust 1.98.1 temporary file", "cursor beyond new EOF", "explicit seek repair"],
    caseSlug: "file-set-len-leaves-cursor-unchanged",
  },
  {
    id: "RFA-203",
    area: "ffi-targets",
    symptom:
      "A write through an append-mode File lands at the end even after the handle was successfully seeked to byte zero.",
    likelyCause:
      "OpenOptions::append guarantees that every write is positioned at the current end of file; seeking still affects reads but cannot select the write offset.",
    firstCheck:
      "Record the open flags, seek to the start, write one byte, and inspect the complete file before deciding whether the operation needs append or ordinary write access.",
    searchTerms: [
      "Rust append mode seek ignored write",
      "OpenOptions append writes at EOF after seek",
      "Rust overwrite file byte append false",
    ],
    evidence: ["Rust 1.98.1 temporary file", "seek followed by EOF write", "write-mode repair"],
    caseSlug: "openoptions-append-writes-at-eof-after-seek",
  },
  {
    id: "RFA-204",
    area: "concurrency-memory",
    symptom:
      "Vec::resize creates several new elements with the same logical identity although the caller expected a fresh identifier for every slot.",
    likelyCause:
      "resize extends the vector by cloning one supplied prototype value, while resize_with calls a generator separately for every new element.",
    firstCheck:
      "Give the resized element an observable identity, collect every resulting identifier, and compare resize with resize_with on an initially empty vector.",
    searchTerms: [
      "Rust Vec resize clones same value",
      "Vec resize fresh value each element",
      "resize versus resize_with Rust",
    ],
    evidence: [
      "Rust 1.98.1 three-slot vector",
      "repeated prototype identity",
      "per-slot closure repair",
    ],
    caseSlug: "vec-resize-clones-one-prototype",
  },
  {
    id: "RFA-205",
    area: "concurrency-memory",
    symptom:
      "Option::insert replaces an already configured value with a fallback although the caller intended to insert only when the Option was None.",
    likelyCause:
      "insert unconditionally stores the supplied value and drops any old contents, whereas get_or_insert_with preserves Some and computes a default only for None.",
    firstCheck:
      "Run the operation on both Some and None, inspect the final value, and count whether construction of the fallback closure actually occurs.",
    searchTerms: [
      "Rust Option insert replaces existing value",
      "Option insert versus get_or_insert_with",
      "insert Option only if None Rust",
    ],
    evidence: ["Rust 1.98.1 occupied Option", "unconditional replacement", "lazy fallback repair"],
    caseSlug: "option-insert-replaces-existing-value",
  },
  {
    id: "RFA-206",
    area: "concurrency-memory",
    symptom:
      "Collecting an iterator into Result<Vec<_>, _> returns the first error while later input records remain completely unvisited.",
    likelyCause:
      "Result's FromIterator implementation short-circuits on the first Err instead of exhausting the source and accumulating all successes and failures.",
    firstCheck:
      "Borrow the source iterator with by_ref, collect into Result, then call next on the original iterator to reveal whether a later record remains.",
    searchTerms: [
      "Rust collect Result stops first error",
      "collect all errors iterator Rust",
      "Result FromIterator short circuit remaining items",
    ],
    evidence: [
      "Rust 1.98.1 three-item iterator",
      "unvisited post-error value",
      "exhaustive loop repair",
    ],
    caseSlug: "result-collect-stops-at-first-error",
  },
  {
    id: "RFA-207",
    area: "concurrency-memory",
    symptom:
      "HashMap::drain removes every entry but the empty map still reports a large capacity and keeps its previous allocation.",
    likelyCause:
      "drain is designed to yield all entries while retaining storage for efficient reuse; empty logical contents do not imply zero allocated capacity.",
    firstCheck:
      "Record len and capacity before and after exhausting drain, then compare with replacing the whole map using mem::take.",
    searchTerms: [
      "Rust HashMap drain keeps capacity",
      "HashMap drain release memory Rust",
      "empty HashMap still allocated after drain",
    ],
    evidence: ["Rust 1.98.1 reserved map", "retained empty capacity", "mem::take ownership repair"],
    caseSlug: "hashmap-drain-retains-capacity",
  },
  {
    id: "RFA-208",
    area: "concurrency-memory",
    symptom:
      "After select_nth_unstable finds the correct nth value, the surrounding slice is still not globally sorted.",
    likelyCause:
      "The linear-time selection operation guarantees only that lower-side elements compare below the pivot and upper-side elements compare above it; both sides remain unsorted.",
    firstCheck:
      "Verify the selected value and both partition inequalities separately, then test is_sorted only if the caller truly requires a complete ordering.",
    searchTerms: [
      "Rust select_nth_unstable does not sort",
      "select_nth_unstable partition guarantee",
      "Rust nth element slice still unsorted",
    ],
    evidence: [
      "Rust 1.98.1 twenty-value slice",
      "correct pivot with unsorted sides",
      "sort-or-partition repair",
    ],
    caseSlug: "select-nth-unstable-does-not-sort-slice",
  },
  {
    id: "RFA-209",
    area: "concurrency-memory",
    symptom:
      "Iterator::max_by_key chooses the last candidate among equal maximum scores although the caller expected the earliest winner.",
    likelyCause:
      "The iterator contract deliberately resolves equal maxima in favor of the last element, so encounter order becomes an implicit tie-breaker.",
    firstCheck:
      "Place two labeled candidates at the same maximum with a lower value between them, then record which label max_by_key returns.",
    searchTerms: [
      "Rust max_by_key tie last element",
      "Iterator max_by_key equal values order",
      "Rust keep first maximum iterator",
    ],
    evidence: [
      "Rust 1.98.1 tied candidates",
      "last-maximum selection",
      "explicit first-wins reduction",
    ],
    caseSlug: "max-by-key-returns-last-equal-maximum",
  },
  {
    id: "RFA-210",
    area: "concurrency-memory",
    symptom:
      "Flattening an iterator of Result values produces only successful values and silently removes every error from the output.",
    likelyCause:
      "Result implements IntoIterator as one item for Ok and zero items for Err, so Iterator::flatten treats an error like an empty inner iterator.",
    firstCheck:
      "Keep the unflattened outcomes or count both variants before and after flatten, then decide whether errors should stop, accumulate, or be intentionally ignored.",
    searchTerms: [
      "Rust iterator flatten Result drops errors",
      "Result into_iter Err empty iterator",
      "Rust flatten keep errors",
    ],
    evidence: [
      "Rust 1.98.1 mixed outcomes",
      "error removed by flatten",
      "explicit outcome partition",
    ],
    caseSlug: "result-flatten-drops-errors",
  },
  {
    id: "RFA-211",
    area: "ffi-targets",
    symptom:
      "str::match_indices finds the first aba in ababa but does not report the equally valid overlapping match beginning at byte two.",
    likelyCause:
      "The standard string matcher yields disjoint matches and resumes searching after the complete previous match rather than at its next possible start.",
    firstCheck:
      "Use a self-overlapping pattern, record returned byte positions, and compare ordinary matching with a scan over every valid UTF-8 boundary.",
    searchTerms: [
      "Rust match_indices overlapping matches",
      "str match_indices skips overlap",
      "find overlapping substring positions Rust",
    ],
    evidence: ["Rust 1.98.1 ababa fixture", "only byte zero reported", "boundary scan repair"],
    caseSlug: "str-match-indices-skips-overlapping-matches",
  },
  {
    id: "RFA-212",
    area: "ffi-targets",
    symptom:
      "BufWriter::get_ref returns an empty underlying Vec immediately after write_all accepted three bytes into the writer.",
    likelyCause:
      "Small writes remain in BufWriter's internal buffer, while get_ref exposes only the wrapped writer and does not flush or combine both storage layers.",
    firstCheck:
      "Compare buffer(), get_ref(), and get_ref() after an explicit flush using a buffer capacity larger than the sample write.",
    searchTerms: [
      "Rust BufWriter get_ref missing bytes",
      "BufWriter underlying Vec empty before flush",
      "BufWriter buffer versus get_ref",
    ],
    evidence: [
      "Rust 1.98.1 in-memory writer",
      "three internally buffered bytes",
      "explicit flush repair",
    ],
    caseSlug: "bufwriter-get-ref-excludes-buffered-bytes",
  },
  {
    id: "RFA-213",
    area: "ffi-targets",
    symptom:
      "A Drop implementation that writes a cleanup marker runs when main returns but never runs when the child calls process::exit.",
    likelyCause:
      "process::exit terminates immediately without unwinding or running destructors on the current stack or other thread stacks.",
    firstCheck:
      "Run the cleanup type in a child process, compare process::exit with returning ExitCode, and observe an external marker from the parent.",
    searchTerms: [
      "Rust process exit does not run Drop",
      "destructor skipped std process exit",
      "Rust clean shutdown return ExitCode",
    ],
    evidence: ["Rust 1.98.1 parent-child fixture", "missing Drop marker", "ExitCode return repair"],
    caseSlug: "process-exit-skips-destructors",
  },
  {
    id: "RFA-214",
    area: "concurrency-memory",
    symptom:
      "Duration::as_millis returns one for a duration of 1,999 microseconds although timeout code expected the value to round up to two.",
    likelyCause:
      "as_millis reports the total number of whole milliseconds, discarding a remaining fractional millisecond rather than rounding to the nearest or upward.",
    firstCheck:
      "Inspect as_nanos together with as_millis at values just below and above a millisecond boundary, then name the required rounding policy.",
    searchTerms: [
      "Rust Duration as_millis rounds down",
      "as_millis truncates microseconds Rust",
      "round Duration up milliseconds",
    ],
    evidence: [
      "Rust 1.98.1 1999-microsecond duration",
      "whole-millisecond truncation",
      "integer ceiling repair",
    ],
    caseSlug: "duration-as-millis-truncates-fraction",
  },
  {
    id: "RFA-215",
    area: "ffi-targets",
    symptom:
      "Uppercasing one Rust char produces two output chars, breaking code that reserved or validated exactly one scalar value per input scalar.",
    likelyCause:
      "Unicode case mapping is not always one-to-one, so char::to_uppercase returns an iterator that can yield up to several scalar values.",
    firstCheck:
      "Collect the uppercase iterator for a known expanding scalar such as sharp s, then compare output char count, byte length, and ASCII-only mapping.",
    searchTerms: [
      "Rust char to_uppercase multiple characters",
      "uppercase sharp s Rust iterator",
      "Unicode uppercase expands string Rust",
    ],
    evidence: [
      "Rust 1.98.1 sharp-s fixture",
      "one-to-two scalar expansion",
      "String output repair",
    ],
    caseSlug: "char-to-uppercase-can-expand",
  },
  {
    id: "RFA-216",
    area: "ffi-targets",
    symptom:
      "str::trim removes ideographic spaces surrounding a token although the parser intended to strip only ASCII protocol whitespace.",
    likelyCause:
      "trim uses Unicode's White_Space derived property, which includes non-ASCII scalar values that trim_ascii deliberately preserves.",
    firstCheck:
      "Place U+3000 at both boundaries and compare trim with trim_ascii instead of testing only ordinary spaces and tabs.",
    searchTerms: [
      "Rust str trim Unicode whitespace",
      "trim removes ideographic space Rust",
      "trim_ascii versus trim Rust",
    ],
    evidence: ["Rust 1.98.1 U+3000 fixture", "Unicode boundary removal", "ASCII-only repair"],
    caseSlug: "str-trim-removes-unicode-whitespace",
  },
  {
    id: "RFA-217",
    area: "ffi-targets",
    symptom:
      "Path::extension returns None for .env and only gz for archive.tar.gz, contradicting a parser that treated every suffix after the first dot as an extension.",
    likelyCause:
      "A single leading dot does not create an extension, and ordinary multi-dot names expose only the portion after the final dot.",
    firstCheck:
      "Inspect extension, file_stem, and file_prefix for a dotfile, a multi-suffix archive, a trailing dot, and a name with no dot.",
    searchTerms: [
      "Rust Path extension dotfile None",
      "Path extension tar gz final suffix",
      "Rust file_stem multiple extensions",
    ],
    evidence: [
      "Rust 1.98.1 lexical paths",
      "dotfile and final-suffix rules",
      "stem-extension repair",
    ],
    caseSlug: "path-extension-dotfile-and-final-suffix",
  },
  {
    id: "RFA-218",
    area: "concurrency-memory",
    symptom:
      "Iterating over chunks_exact(2) for a five-element slice visits only four values and silently leaves the fifth outside the iterator.",
    likelyCause:
      "ChunksExact yields only full fixed-size chunks and stores the shorter tail for separate access through remainder instead of yielding it.",
    firstCheck:
      "Assert the conservation equation full_chunks_times_size plus remainder length equals input length, then inspect remainder before consuming the iterator.",
    searchTerms: [
      "Rust chunks_exact missing remainder",
      "slice chunks_exact last elements omitted",
      "ChunksExact remainder Rust",
    ],
    evidence: [
      "Rust 1.98.1 five-element slice",
      "one omitted tail value",
      "remainder-chain repair",
    ],
    caseSlug: "chunks-exact-omits-remainder",
  },
  {
    id: "RFA-219",
    area: "ffi-targets",
    symptom:
      "fs::copy succeeds when the destination already exists and replaces its old bytes instead of returning AlreadyExists.",
    likelyCause:
      "The path-level copy API has an overwrite contract; it does not open the destination with exclusive create-new semantics.",
    firstCheck:
      "Create source and destination files with distinct contents, call fs::copy, then inspect the complete destination and returned byte count.",
    searchTerms: [
      "Rust fs copy overwrites destination",
      "copy file without overwrite Rust",
      "fs copy AlreadyExists create_new",
    ],
    evidence: [
      "Rust 1.98.1 temporary files",
      "existing bytes replaced",
      "exclusive-create copy repair",
    ],
    caseSlug: "fs-copy-overwrites-destination",
  },
  {
    id: "RFA-220",
    area: "concurrency-memory",
    symptom:
      "Iterator::position reports one for a value at source index two after one element was consumed.",
    likelyCause:
      "position starts its zero-based count at the iterator's current frontier and consumes through the matching item rather than retaining an original-source coordinate.",
    firstCheck:
      "Consume a known prefix, call position, and compare the remaining-stream index with a source index carried before iteration changed shape.",
    searchTerms: [
      "Rust Iterator position wrong index after next",
      "Iterator position relative current state Rust",
      "find original index consumed iterator Rust",
    ],
    evidence: [
      "Rust 1.98.1 stateful iterator",
      "one consumed prefix item",
      "explicit source-offset repair",
    ],
    caseSlug: "iterator-position-is-relative-to-current-state",
  },
  {
    id: "RFA-221",
    area: "ffi-targets",
    symptom:
      "Splitting a two-character string with an empty pattern returns four fields instead of two.",
    likelyCause:
      "The empty string pattern separates every character together with the beginning and end of the string, so both outside boundaries produce empty fields.",
    firstCheck:
      "Compare split on an empty pattern with chars and char_indices using a non-ASCII string and inspect both edge fields.",
    searchTerms: [
      "Rust split empty string leading trailing empty",
      "str split empty pattern extra fields",
      "split string into Unicode characters Rust",
    ],
    evidence: [
      "Rust 1.98.1 UTF-8 string",
      "leading and trailing empty fields",
      "chars traversal repair",
    ],
    caseSlug: "str-split-empty-pattern-adds-boundary-fields",
  },
  {
    id: "RFA-222",
    area: "ffi-targets",
    symptom: "A character passes is_numeric but to_digit(10) returns None during parsing.",
    likelyCause:
      "is_numeric recognizes several Unicode numeric general categories, while to_digit converts only ASCII alphanumeric characters accepted by its radix grammar.",
    firstCheck:
      "Test the validator and converter with a circled number, a non-ASCII decimal digit, and an ASCII digit instead of using ASCII-only fixtures.",
    searchTerms: [
      "Rust is_numeric to_digit returns None",
      "char Unicode numeric parse digit Rust",
      "circled digit to_digit Rust",
    ],
    evidence: [
      "Rust 1.98.1 circled digit",
      "Unicode classification versus radix parsing",
      "ASCII parsing repair",
    ],
    caseSlug: "char-is-numeric-does-not-imply-to-digit",
  },
  {
    id: "RFA-223",
    area: "concurrency-memory",
    symptom:
      "u8::MAX.checked_shl(1) returns Some(254) although the mathematical result does not fit in u8.",
    likelyCause:
      "checked_shl validates whether the shift distance is below the integer width; it does not report non-zero high bits discarded by an otherwise valid shift.",
    firstCheck:
      "Test a valid distance that loses a high bit and a distance equal to the type width, then widen the value before shifting.",
    searchTerms: [
      "Rust checked_shl still overflows value",
      "checked shift left lost high bits Rust",
      "u8 checked_shl Some 254",
    ],
    evidence: [
      "Rust 1.98.1 u8 maximum",
      "valid shift distance with discarded bit",
      "widen-and-convert repair",
    ],
    caseSlug: "checked-shl-checks-distance-not-bit-loss",
  },
  {
    id: "RFA-224",
    area: "ffi-targets",
    symptom:
      "Writing one byte at cursor position five over a two-byte Vec creates three zero bytes before the new byte.",
    likelyCause:
      "Cursor position is independent from the wrapped Vec length, and the growable Write implementation pads an unwritten gap with zeros before extending at that position.",
    firstCheck:
      "Record the Vec length and cursor position before writing, then assert the complete output bytes rather than only write success.",
    searchTerms: [
      "Rust Cursor write past end zero fills",
      "Cursor Vec set_position beyond length",
      "Rust in memory sparse write zeros",
    ],
    evidence: [
      "Rust 1.98.1 in-memory cursor",
      "position beyond Vec length",
      "append-position repair",
    ],
    caseSlug: "cursor-write-past-end-zero-fills-gap",
  },
  {
    id: "RFA-225",
    area: "concurrency-memory",
    symptom:
      "Removing the item at index two with swap_remove_front changes the order of the first two remaining queue items.",
    likelyCause:
      "swap_remove_front earns constant-time arbitrary removal by moving the front element into the hole, explicitly giving up preservation of logical order.",
    firstCheck:
      "Assert the full survivor sequence after middle removal and compare swap_remove_front with the order-preserving remove method.",
    searchTerms: [
      "Rust VecDeque swap_remove_front order changed",
      "remove VecDeque item preserve order Rust",
      "swap_remove_front result order",
    ],
    evidence: [
      "Rust 1.98.1 four-item deque",
      "constant-time replacement from front",
      "stable remove repair",
    ],
    caseSlug: "vecdeque-swap-remove-front-changes-order",
  },
  {
    id: "RFA-226",
    area: "concurrency-memory",
    symptom:
      "Sender::send returns Ok, but the receiver is dropped with the queued job still unprocessed.",
    likelyCause:
      "An asynchronous channel send confirms only that the receiver was connected at the send decision; it supplies no application-level receipt or processing acknowledgement.",
    firstCheck:
      "Pause or drop the receiver after send succeeds but before processing, then observe a separate completion marker rather than the send result.",
    searchTerms: [
      "Rust mpsc send Ok message not received",
      "Sender send success not processed Rust",
      "Rust channel application acknowledgement",
    ],
    evidence: [
      "Rust 1.98.1 asynchronous channel",
      "successful enqueue before receiver drop",
      "explicit receive-and-process repair",
    ],
    caseSlug: "mpsc-send-ok-does-not-mean-processed",
  },
  {
    id: "RFA-227",
    area: "concurrency-memory",
    symptom:
      "Sorting zero and negative zero with total_cmp reverses their bit-pattern order even though ordinary equality considers them equal.",
    likelyCause:
      "total_cmp implements the IEEE total-order relation, which distinguishes signed zeros and NaN representations that ordinary PartialEq and PartialOrd do not treat alike.",
    firstCheck:
      "Compare to_bits before and after total_cmp sorting because ordinary float equality cannot reveal the signed-zero ordering difference.",
    searchTerms: [
      "Rust f64 total_cmp negative zero order",
      "total_cmp differs PartialEq signed zero",
      "sort floats Rust negative zero NaN",
    ],
    evidence: [
      "Rust 1.98.1 signed-zero bit patterns",
      "IEEE total order",
      "domain normalization repair",
    ],
    caseSlug: "f64-total-cmp-orders-negative-zero-first",
  },
  {
    id: "RFA-228",
    area: "concurrency-memory",
    symptom: "A constructor with side effects runs even though false.then_some returns None.",
    likelyCause:
      "then_some accepts an already evaluated value, so ordinary method-argument evaluation runs its expression before the boolean chooses Some or None.",
    firstCheck:
      "Replace the value expression with a counted constructor and compare false.then_some with false.then receiving a closure.",
    searchTerms: [
      "Rust then_some evaluates when false",
      "bool then_some eager versus then lazy",
      "conditional Option construction Rust side effect",
    ],
    evidence: [
      "Rust 1.98.1 Cell counter",
      "false condition with eager argument",
      "lazy closure repair",
    ],
    caseSlug: "bool-then-some-evaluates-eagerly",
  },
  {
    id: "RFA-229",
    area: "ffi-targets",
    symptom:
      "Calling elapsed on a SystemTime one hour in the future returns SystemTimeError instead of a negative or zero duration.",
    likelyCause:
      "Duration has no negative representation and SystemTime is an adjustable wall-clock coordinate, so elapsed reports the opposite time direction as an error.",
    firstCheck:
      "Construct a future SystemTime deterministically, inspect SystemTimeError::duration, and compare the use case with monotonic Instant timing.",
    searchTerms: [
      "Rust SystemTime elapsed future returns error",
      "SystemTimeError elapsed clock went backwards",
      "SystemTime versus Instant elapsed Rust",
    ],
    evidence: [
      "Rust 1.98.1 future wall-clock value",
      "direction-bearing SystemTimeError",
      "monotonic Instant repair",
    ],
    caseSlug: "systemtime-elapsed-fails-for-future-time",
  },
  {
    id: "RFA-230",
    area: "concurrency-memory",
    symptom:
      "After nth(2) returns the third value, the next iterator call returns the fourth value rather than the second.",
    likelyCause:
      "Iterator::nth advances through every skipped item and consumes the selected item it returns, leaving the iterator positioned after that answer.",
    firstCheck:
      "Call next immediately after nth on a four-item iterator and compare observation through a slice with advancement through the iterator.",
    searchTerms: [
      "Rust Iterator nth consumes items",
      "what remains after nth Rust",
      "peek nth item without consuming iterator",
    ],
    evidence: [
      "Rust 1.98.1 four-item iterator",
      "nth followed by next",
      "slice observation repair",
    ],
    caseSlug: "iterator-nth-consumes-through-selected-item",
  },
  {
    id: "RFA-231",
    area: "concurrency-memory",
    symptom:
      "Rotating a three-item VecDeque left by four panics instead of wrapping around by one position.",
    likelyCause:
      "VecDeque rotation accepts an amount no greater than its current length and deliberately does not infer modulo normalization for larger values.",
    firstCheck:
      "Test zero, length, and one-past-length rotation amounts, then decide whether the domain permits explicit cyclic normalization.",
    searchTerms: [
      "VecDeque rotate_left panics amount greater length",
      "Rust deque rotate modulo length",
      "rotate empty VecDeque safely",
    ],
    evidence: [
      "Rust 1.98.1 three-item deque",
      "out-of-range rotation panic",
      "explicit modulo repair",
    ],
    caseSlug: "vecdeque-rotate-left-panics-past-length",
  },
  {
    id: "RFA-232",
    area: "ffi-targets",
    symptom:
      "Parsing the text TRUE as bool returns ParseBoolError although a human reads it as true.",
    likelyCause:
      "The standard bool FromStr grammar contains exactly the lowercase strings true and false and does not perform case, whitespace, or alias normalization.",
    firstCheck:
      "Build an accepted-and-rejected input table containing exact lowercase words, uppercase, whitespace, numeric aliases, and empty input.",
    searchTerms: [
      "Rust parse bool TRUE error",
      "bool FromStr accepted values Rust",
      "parse case insensitive boolean Rust",
    ],
    evidence: [
      "Rust 1.98.1 FromStr parser",
      "uppercase rejected input",
      "opt-in ASCII normalization repair",
    ],
    caseSlug: "bool-from-str-accepts-only-lowercase",
  },
  {
    id: "RFA-233",
    area: "concurrency-memory",
    symptom:
      "Constructing Duration from negative floating-point seconds panics instead of returning a value or Result.",
    likelyCause:
      "Duration is non-negative and from_secs_f64 is a panicking convenience constructor when input is negative, non-finite, overflowing, or otherwise outside its domain.",
    firstCheck:
      "Compare from_secs_f64 with try_from_secs_f64 for negative, NaN, infinite, valid fractional, and above-policy values.",
    searchTerms: [
      "Rust Duration from_secs_f64 negative panic",
      "convert float seconds to Duration without panic",
      "Duration try_from_secs_f64 NaN",
    ],
    evidence: [
      "Rust 1.98.1 negative float",
      "captured constructor panic",
      "fallible conversion repair",
    ],
    caseSlug: "duration-from-secs-f64-panics-invalid-input",
  },
  {
    id: "RFA-234",
    area: "concurrency-memory",
    symptom:
      "Three threads all leave a Barrier, but only one BarrierWaitResult reports is_leader as true.",
    likelyCause:
      "Barrier rendezvous releases every participant but assigns the leader result to exactly one arbitrary participant in each generation.",
    firstCheck:
      "Count is_leader results across every participant and generation without asserting which named or numbered thread receives the role.",
    searchTerms: [
      "Rust Barrier is_leader exactly one thread",
      "BarrierWaitResult leader arbitrary",
      "run once after Barrier Rust",
    ],
    evidence: [
      "Rust 1.98.1 three-thread rendezvous",
      "atomic leader count",
      "exactly-one invariant repair",
    ],
    caseSlug: "barrier-wait-elects-one-leader",
  },
  {
    id: "RFA-235",
    area: "concurrency-memory",
    symptom:
      "JoinHandle::is_finished becomes true for a worker that panicked, so completion is mistaken for success.",
    likelyCause:
      "is_finished exposes only nonblocking completion state and cannot carry the worker return value, panic payload, or application-level outcome supplied by join.",
    firstCheck:
      "Poll a deliberately panicking worker until is_finished is true, then inspect the join result instead of treating the boolean as success.",
    searchTerms: [
      "Rust JoinHandle is_finished thread panicked",
      "is_finished versus join Rust",
      "check thread completed successfully without blocking",
    ],
    evidence: ["Rust 1.98.1 panicking worker", "true completion state", "join-result repair"],
    caseSlug: "joinhandle-is-finished-does-not-report-success",
  },
  {
    id: "RFA-236",
    area: "concurrency-memory",
    symptom:
      "Two unpark calls made before two park calls release the first park, but the second park still waits.",
    likelyCause:
      "Each Rust thread stores one present-or-absent park token, so repeated unpark calls coalesce instead of accumulating like permits in a counting semaphore.",
    firstCheck:
      "Issue two unparks before parking twice and bound the second wait, while excluding other synchronization that could consume the same token.",
    searchTerms: [
      "Rust unpark called twice one token",
      "thread park unpark tokens accumulate",
      "lost wakeup park unpark Rust",
    ],
    evidence: ["Rust 1.98.1 current-thread token", "bounded second park", "fresh-unpark repair"],
    caseSlug: "thread-unpark-tokens-do-not-accumulate",
  },
  {
    id: "RFA-237",
    area: "ffi-targets",
    symptom:
      "The mapped address ::ffff:127.0.0.1 returns false from Ipv6Addr::is_loopback even though its embedded IPv4 address is loopback.",
    likelyCause:
      "Ipv6Addr::is_loopback recognizes native IPv6 loopback ::1 and does not recursively apply IPv4 properties to an embedded mapped representation.",
    firstCheck:
      "Compare the mapped address before and after to_ipv4_mapped or to_canonical, while separately testing native IPv6 loopback.",
    searchTerms: [
      "Rust IPv4 mapped IPv6 loopback false",
      "ffff 127.0.0.1 is_loopback Rust",
      "canonicalize IpAddr mapped address",
    ],
    evidence: [
      "Rust 1.98.1 mapped localhost",
      "family-specific loopback predicate",
      "to_canonical repair",
    ],
    caseSlug: "ipv4-mapped-loopback-needs-canonicalization",
  },
  {
    id: "RFA-238",
    area: "ffi-targets",
    symptom:
      "A String reserved for two units grows when two non-ASCII characters are pushed into it.",
    likelyCause:
      "String length and capacity are measured in UTF-8 bytes, so two Unicode scalar values can require more than two bytes of backing storage.",
    firstCheck:
      "Compare input.len(), input.chars().count(), and capacity before and after appending non-ASCII text.",
    searchTerms: [
      "Rust String capacity bytes or characters",
      "with_capacity Unicode characters Rust",
      "preallocate String UTF-8 length",
    ],
    evidence: [
      "Rust 1.98.1 two-scalar UTF-8 text",
      "two-byte reservation growth",
      "byte-length reservation repair",
    ],
    caseSlug: "string-capacity-counts-bytes-not-characters",
  },
  {
    id: "RFA-239",
    area: "ffi-targets",
    symptom:
      "String::from_utf8_lossy returns Cow::Borrowed for valid bytes although caller code expected an owned String.",
    likelyCause:
      "Lossy decoding needs replacement allocation only for invalid UTF-8, so the valid fast path can expose the original slice through Cow::Borrowed.",
    firstCheck:
      "Match the Cow variant for valid and invalid byte slices separately, then identify the exact boundary that truly requires owned text.",
    searchTerms: [
      "Rust from_utf8_lossy Cow Borrowed valid input",
      "does from_utf8_lossy allocate",
      "convert Cow str into owned String Rust",
    ],
    evidence: [
      "Rust 1.98.1 valid and invalid byte slices",
      "Cow variant comparison",
      "explicit ownership repair",
    ],
    caseSlug: "from-utf8-lossy-borrows-valid-input",
  },
  {
    id: "RFA-240",
    area: "ffi-targets",
    symptom:
      "str::get returns None for byte offset 1 in a non-empty string even though the offset is below len.",
    likelyCause:
      "A valid string range must satisfy ordinary byte bounds and place both endpoints on UTF-8 character boundaries.",
    firstCheck:
      "Log the requested byte range, string byte length, and is_char_boundary result for both endpoints.",
    searchTerms: [
      "Rust str get returns None in bounds",
      "string slice get UTF-8 character boundary",
      "safe substring byte index Rust",
    ],
    evidence: ["Rust 1.98.1 multibyte text", "in-bounds non-boundary range", "char_indices repair"],
    caseSlug: "str-get-returns-none-at-non-char-boundary",
  },
  {
    id: "RFA-241",
    area: "concurrency-memory",
    symptom:
      "copy_from_slice panics when copying a two-byte source into a three-byte destination instead of copying the available prefix.",
    likelyCause:
      "The method is an exact whole-slice replacement operation and requires source and destination to have identical runtime lengths.",
    firstCheck:
      "Record both slice lengths and decide whether mismatch means rejection, prefix preservation, or explicit truncation.",
    searchTerms: [
      "Rust copy_from_slice source destination length mismatch",
      "copy shorter slice into larger slice Rust",
      "slice copy_from_slice panics",
    ],
    evidence: [
      "Rust 1.98.1 fixed arrays",
      "captured unequal-length panic",
      "explicit destination-window repair",
    ],
    caseSlug: "slice-copy-from-slice-requires-equal-lengths",
  },
  {
    id: "RFA-242",
    area: "ffi-targets",
    symptom:
      "char::from_u32 returns None for 0xD800 even though the number is below char::MAX and occurs in UTF-16 data.",
    likelyCause:
      "Rust char represents Unicode scalar values, which deliberately exclude the UTF-16 surrogate code-point interval.",
    firstCheck:
      "Classify the source as code points or UTF-16 code units, then test the surrogate interval independently from char::MAX.",
    searchTerms: [
      "Rust char from_u32 surrogate returns None",
      "convert UTF-16 u16 to char Rust",
      "Unicode scalar value surrogate Rust",
    ],
    evidence: [
      "Rust 1.98.1 surrogate input",
      "safe conversion rejection",
      "valid scalar comparison",
    ],
    caseSlug: "char-from-u32-rejects-surrogate-code-points",
  },
  {
    id: "RFA-243",
    area: "upgrades-compatibility",
    symptom:
      "u32::saturating_div panics with a zero divisor although the method name suggests every invalid result will saturate.",
    likelyCause:
      "Saturation handles a mathematical result outside the integer range, while division by zero has no quotient to clamp.",
    firstCheck:
      "Separate zero-divisor validation from representability overflow and compare saturating_div with checked_div.",
    searchTerms: [
      "Rust saturating_div division by zero panic",
      "does saturating division handle zero Rust",
      "u32 safe division checked_div",
    ],
    evidence: [
      "Rust 1.98.1 unsigned division",
      "captured zero-divisor panic",
      "explicit domain validation repair",
    ],
    caseSlug: "saturating-div-still-panics-on-zero",
  },
  {
    id: "RFA-244",
    area: "upgrades-compatibility",
    symptom:
      "f64::clamp panics when the minimum bound is NaN, while a NaN value being clamped is returned as NaN.",
    likelyCause:
      "The bounds configure an ordered interval and cannot be NaN or reversed, whereas the input value is data that may remain NaN.",
    firstCheck:
      "Test is_nan on both bounds and compare their order before deciding how NaN input values should be represented.",
    searchTerms: [
      "Rust f64 clamp NaN panic",
      "float clamp returns NaN or panics Rust",
      "validate floating point clamp bounds",
    ],
    evidence: [
      "Rust 1.98.1 NaN lower bound",
      "captured invalid-interval panic",
      "checked-boundary repair",
    ],
    caseSlug: "f64-clamp-panics-on-nan-bound",
  },
  {
    id: "RFA-245",
    area: "diagnostics-macros",
    symptom:
      "Result::map_or calls an expensive or state-changing default expression even when the Result is Ok and the default is discarded.",
    likelyCause:
      "The default is an ordinary eager call argument that must be evaluated before map_or can inspect the Result variant.",
    firstCheck:
      "Count fallback calls on both Ok and Err, then compare passing a value to map_or with a closure to map_or_else.",
    searchTerms: [
      "Rust Result map_or evaluates default eagerly",
      "map_or vs map_or_else Result",
      "lazy fallback for Result Rust",
    ],
    evidence: ["Rust 1.98.1 Ok result", "atomic fallback call count", "map_or_else repair"],
    caseSlug: "result-map-or-evaluates-default-eagerly",
  },
  {
    id: "RFA-246",
    area: "concurrency-memory",
    symptom:
      "Vec::truncate with length three leaves a one-element vector unchanged instead of extending it to three elements.",
    likelyCause:
      "Truncate only removes initialized suffix values and receives no value or constructor with which to initialize growth.",
    firstCheck:
      "Compare requested and current lengths, then choose resize, resize_with, or extend when growth is intended.",
    searchTerms: [
      "Rust Vec truncate larger length does nothing",
      "set vector length and fill Rust",
      "Vec truncate versus resize",
    ],
    evidence: ["Rust 1.98.1 one-element vector", "larger truncate no-op", "resize growth repair"],
    caseSlug: "vec-truncate-does-not-grow-vector",
  },
  {
    id: "RFA-247",
    area: "ffi-targets",
    symptom:
      "starts_with returns true for banana with the char slice ['a', 'b'], although banana does not begin with the sequence ab.",
    likelyCause:
      "A character-slice Pattern matches any one character contained in the slice rather than concatenating its elements.",
    firstCheck:
      "Compare the same input using a string literal, one char, and a character-slice Pattern to expose the intended grammar.",
    searchTerms: [
      "Rust starts_with char slice any character",
      "str Pattern slice of char meaning",
      "starts_with multiple characters Rust",
    ],
    evidence: [
      "Rust 1.98.1 banana input",
      "char-slice Pattern result",
      "string-pattern comparison",
    ],
    caseSlug: "str-starts-with-char-slice-means-any-character",
  },
  {
    id: "RFA-248",
    area: "upgrades-compatibility",
    symptom:
      "0_u32.pow(0) returns 1 when application code expected the ambiguous zero-to-zero case to return zero or fail.",
    likelyCause:
      "Integer exponentiation follows the empty-product convention, making every base to exponent zero equal one.",
    firstCheck:
      "Test zero base and zero exponent independently, then state whether the application domain rejects their intersection.",
    searchTerms: [
      "Rust zero pow zero result",
      "0u32 pow 0 equals 1",
      "checked integer exponentiation domain Rust",
    ],
    evidence: [
      "Rust 1.98.1 integer exponentiation",
      "zero-exponent assertion",
      "domain-validation wrapper",
    ],
    caseSlug: "integer-zero-pow-zero-is-one",
  },
  {
    id: "RFA-249",
    area: "upgrades-compatibility",
    symptom:
      "u32::MAX.checked_next_power_of_two returns None although the input itself is a valid u32 value.",
    likelyCause:
      "The smallest qualifying power requires 33 bits, so no next power greater than or equal to the input fits in u32.",
    firstCheck:
      "Test the largest representable power of two and the next integer before widening or changing the capacity policy.",
    searchTerms: [
      "Rust checked_next_power_of_two returns None",
      "u32 max next power of two overflow",
      "round capacity to power of two Rust",
    ],
    evidence: [
      "Rust 1.98.1 u32 maximum",
      "checked overflow result",
      "representable-boundary comparison",
    ],
    caseSlug: "checked-next-power-of-two-returns-none-on-overflow",
  },
  {
    id: "RFA-250",
    area: "concurrency-memory",
    symptom:
      "Calling slice::chunks with a size of zero panics instead of yielding no chunks or one empty chunk.",
    likelyCause:
      "A zero-sized chunk cannot advance through the source, so it cannot define a finite progressing partition iterator.",
    firstCheck:
      "Validate the dynamic chunk width before constructing the iterator, separately from checking whether the input is empty.",
    searchTerms: [
      "Rust slice chunks zero panics",
      "chunks chunk_size must be nonzero Rust",
      "split slice dynamic chunk size safely",
    ],
    evidence: ["Rust 1.98.1 three-byte slice", "captured zero-size panic", "validated-size repair"],
    caseSlug: "slice-chunks-panics-on-zero-size",
  },
  {
    id: "RFA-251",
    area: "ffi-targets",
    symptom:
      "str::splitn with n equal to zero returns an empty iterator instead of one unsplit copy of the original string.",
    likelyCause:
      "The n argument limits returned substrings rather than separator matches, so zero permits no output items at all.",
    firstCheck:
      "Compare limits zero, one, and two while naming whether the application setting counts fields or separators.",
    searchTerms: [
      "Rust splitn zero result",
      "str splitn limit means fields or separators",
      "split string at most n parts Rust",
    ],
    evidence: [
      "Rust 1.98.1 colon-delimited input",
      "zero-field result",
      "one-and-two limit comparison",
    ],
    caseSlug: "str-splitn-zero-yields-no-substrings",
  },
  {
    id: "RFA-252",
    area: "concurrency-memory",
    symptom:
      "Iterator::step_by panics for a dynamic step of zero instead of repeating the current element or returning an empty iterator.",
    likelyCause:
      "A zero stride cannot make progress through a general iterator and the adapter cannot reproduce an arbitrary moved item.",
    firstCheck:
      "Validate that the step is positive, then test starting offset separately from the distance between yielded items.",
    searchTerms: [
      "Rust Iterator step_by zero panic",
      "step_by step must be nonzero Rust",
      "validate dynamic iterator stride",
    ],
    evidence: ["Rust 1.98.1 integer range", "captured zero-step panic", "positive-step repair"],
    caseSlug: "iterator-step-by-panics-on-zero",
  },
  {
    id: "RFA-253",
    area: "diagnostics-macros",
    symptom:
      "Option::xor discards both present operands and returns None when code expected it to prefer the first Some value.",
    likelyCause:
      "Exclusive-or accepts exactly one present operand, making both-present and both-absent collapse to the same None result.",
    firstCheck:
      "Write the four-case presence table and decide whether the policy is exclusive validation, precedence, or conflict reporting.",
    searchTerms: [
      "Rust Option xor both Some returns None",
      "select exactly one Option Rust",
      "Option xor loses conflict information",
    ],
    evidence: [
      "Rust 1.98.1 two present strings",
      "both-Some result",
      "explicit conflict Result repair",
    ],
    caseSlug: "option-xor-both-some-returns-none",
  },
  {
    id: "RFA-254",
    area: "diagnostics-macros",
    symptom:
      "Result::and runs the expression producing its second Result even when the first Result is already Err.",
    likelyCause:
      "The method receives an already-evaluated Result value, so ordinary argument evaluation happens before variant selection.",
    firstCheck:
      "Count second-operation calls for an initial Err and compare passing the result value to and with a closure to and_then.",
    searchTerms: [
      "Rust Result and evaluates second argument on Err",
      "Result and vs and_then eager",
      "short circuit fallible operations Rust",
    ],
    evidence: ["Rust 1.98.1 initial Err", "atomic second-operation count", "and_then repair"],
    caseSlug: "result-and-evaluates-second-argument-eagerly",
  },
  {
    id: "RFA-255",
    area: "concurrency-memory",
    symptom:
      "A value passed to Box::leak never runs its Drop implementation even after the returned reference is no longer used.",
    likelyCause:
      "Box::leak consumes the unique owner and deliberately leaves no automatic owner to destroy the value or reclaim its allocation.",
    firstCheck:
      "Count destructor calls and bound how many process-lifetime allocations can reach the leak path across reloads or requests.",
    searchTerms: [
      "Rust Box leak does Drop run",
      "Box::leak memory reclaimed",
      "create static reference Box leak safely",
    ],
    evidence: [
      "Rust 1.98.1 tracked destructor",
      "zero observed drops",
      "ordinary Box ownership repair",
    ],
    caseSlug: "box-leak-prevents-drop-and-deallocation",
  },
  {
    id: "RFA-256",
    area: "ffi-targets",
    symptom:
      "char::encode_utf8 panics when encoding an accented scalar into a one-byte destination buffer.",
    likelyCause:
      "One Unicode scalar occupies between one and four UTF-8 bytes, and the method cannot return a partially encoded valid str.",
    firstCheck:
      "Compare the destination length with char::len_utf8 and pass onward only the encoded subslice returned by the method.",
    searchTerms: [
      "Rust char encode_utf8 buffer too small panic",
      "how large buffer for encode_utf8",
      "char MAX_LEN_UTF8 Rust",
    ],
    evidence: [
      "Rust 1.98.1 accented scalar",
      "captured short-buffer panic",
      "maximum-width buffer repair",
    ],
    caseSlug: "char-encode-utf8-panics-short-buffer",
  },
  {
    id: "RFA-257",
    area: "upgrades-compatibility",
    symptom:
      "Zero checked_ilog2 returns None while code expected zero as the bit position or bucket for a zero value.",
    likelyCause:
      "Zero has no finite integer logarithm, while returning zero would collide with the valid base-two logarithm of one.",
    firstCheck:
      "Test zero separately from one and values around powers of two before defining an application-specific empty bucket.",
    searchTerms: [
      "Rust checked_ilog2 zero None",
      "ilog2 zero panic Rust",
      "integer log2 bucket zero value",
    ],
    evidence: ["Rust 1.98.1 unsigned zero", "checked domain result", "positive boundary table"],
    caseSlug: "checked-ilog2-zero-returns-none",
  },
  {
    id: "RFA-258",
    area: "upgrades-compatibility",
    symptom:
      "u32::is_multiple_of returns true for zero and zero instead of panicking or returning false for every zero divisor.",
    likelyCause:
      "The method defines a total classification predicate where zero is a multiple of zero but nonzero values are not.",
    firstCheck:
      "Test zero-zero and nonzero-zero independently, then keep a separate nonzero guard before any division or remainder.",
    searchTerms: [
      "Rust zero is_multiple_of zero true",
      "does is_multiple_of panic divisor zero Rust",
      "0 multiple of 0 Rust integer API",
    ],
    evidence: ["Rust 1.98.1 zero pair", "total predicate result", "zero-and-nonzero comparison"],
    caseSlug: "is-multiple-of-zero-special-case",
  },
  {
    id: "RFA-259",
    area: "upgrades-compatibility",
    symptom:
      "Two point five rounded as f64 becomes three instead of the even integer two, while negative two point five becomes negative three.",
    likelyCause:
      "f64::round uses a halfway-away-from-zero tie policy rather than the ties-to-even policy expected by the caller.",
    firstCheck:
      "Test positive and negative exact halves with round and round_ties_even before checking decimal representation issues.",
    searchTerms: [
      "Rust f64 round ties away from zero",
      "bankers rounding Rust round_ties_even",
      "why 2.5 round is 3 Rust",
    ],
    evidence: [
      "Rust 1.98.1 positive and negative halves",
      "tie-policy comparison",
      "round_ties_even repair",
    ],
    caseSlug: "f64-round-breaks-ties-away-from-zero",
  },
  {
    id: "RFA-260",
    area: "concurrency-memory",
    symptom:
      "Collecting an iterator of Result returns the first Err while later items remain unvisited in the borrowed iterator.",
    likelyCause:
      "The Result FromIterator implementation short-circuits at the first error rather than exhausting or accumulating the source.",
    firstCheck:
      "Borrow a small iterator with by_ref, place an error in the middle, and inspect the next item after collection returns.",
    searchTerms: [
      "Rust collect Result stops first error iterator remainder",
      "collect Result Vec short circuit Rust",
      "what happens to iterator after collect Err",
    ],
    evidence: [
      "Rust 1.98.1 three-result iterator",
      "first error collection",
      "unvisited trailing item",
    ],
    caseSlug: "collect-result-stops-at-first-error-leaves-remainder",
  },
  {
    id: "RFA-261",
    area: "concurrency-memory",
    symptom:
      "Iterator::all returns false at the first rejected element and leaves later elements unvisited through by_ref.",
    likelyCause:
      "One counterexample determines the universal boolean result, so all deliberately stops pulling the source at the first false predicate.",
    firstCheck:
      "Count predicate calls and inspect the iterator remainder after placing one false item before the final element.",
    searchTerms: [
      "Rust Iterator all short circuits remainder",
      "does iterator all visit every item",
      "all predicate stops first false Rust",
    ],
    evidence: ["Rust 1.98.1 three-number iterator", "first-false stop", "visible remaining item"],
    caseSlug: "iterator-all-short-circuits-leaves-remainder",
  },
  {
    id: "RFA-262",
    area: "ffi-targets",
    symptom:
      "Parsing the two-byte ASCII string ab as char returns an error, while one multibyte scalar such as accented e succeeds.",
    likelyCause:
      "FromStr for char requires exactly one Unicode scalar value, independently from its one-to-four-byte UTF-8 width.",
    firstCheck:
      "Compare byte length, chars count, and any grapheme requirement for empty, multibyte, and multi-scalar inputs.",
    searchTerms: [
      "Rust parse string to char exactly one character",
      "parse char multibyte Unicode Rust",
      "ParseCharError empty multiple characters",
    ],
    evidence: ["Rust 1.98.1 ASCII pair", "single accented scalar", "empty-and-multiple rejection"],
    caseSlug: "parse-char-requires-one-unicode-scalar",
  },
  {
    id: "RFA-263",
    area: "ffi-targets",
    symptom:
      "Stripping prefix aa from aaaa returns aa instead of removing every repeated copy and returning an empty string.",
    likelyCause:
      "str::strip_prefix recognizes and removes exactly one occurrence, leaving repetition policy to the caller.",
    firstCheck:
      "Test no match, one match, repeated matches, and an empty pattern before writing a repeated-removal loop.",
    searchTerms: [
      "Rust strip_prefix removes only once",
      "remove repeated string prefix Rust",
      "strip_prefix loop empty prefix",
    ],
    evidence: ["Rust 1.98.1 repeated prefix", "single removal result", "progressing loop repair"],
    caseSlug: "str-strip-prefix-removes-exactly-once",
  },
  {
    id: "RFA-264",
    area: "upgrades-compatibility",
    symptom:
      "Taking abs of i32::MIN overflows: checked builds panic while unchecked-overflow optimized builds can keep the negative minimum.",
    likelyCause:
      "Two's-complement i32 has one more negative value than positive values, so the exact positive magnitude does not fit in i32.",
    firstCheck:
      "Exercise i32::MIN under the deployed overflow policy and compare checked_abs, unsigned_abs, and widening before abs.",
    searchTerms: [
      "Rust i32 MIN abs panic release negative",
      "absolute value integer minimum overflow Rust",
      "checked_abs vs unsigned_abs",
    ],
    evidence: [
      "Rust 1.98.1 checked-overflow execution",
      "captured minimum panic",
      "checked and unsigned repairs",
    ],
    caseSlug: "i32-abs-min-overflows",
  },
  {
    id: "RFA-265",
    area: "concurrency-memory",
    symptom:
      "Iterator::is_sorted returns false after the first descending pair and leaves later items unvisited through by_ref.",
    likelyCause:
      "One inversion proves the sequence is not sorted, so the query stops immediately after consuming both values in that pair.",
    firstCheck:
      "Place one inversion before a trailing sentinel, call is_sorted through by_ref, and inspect the next remaining value.",
    searchTerms: [
      "Rust Iterator is_sorted short circuit remainder",
      "does is_sorted consume whole iterator",
      "is_sorted stops first inversion Rust",
    ],
    evidence: [
      "Rust 1.98.1 four-number iterator",
      "first inversion detection",
      "visible trailing item",
    ],
    caseSlug: "iterator-is-sorted-short-circuits-leaves-remainder",
  },
  {
    id: "RFA-266",
    area: "concurrency-memory",
    symptom:
      "Receiver::recv returns a queued message after the final Sender is dropped and reports disconnection only after draining it.",
    likelyCause:
      "Disconnection prevents future sends but does not revoke messages already accepted into the channel buffer.",
    firstCheck:
      "Send one message, drop every Sender clone before receiving, and record the first and second receive results separately.",
    searchTerms: [
      "Rust mpsc recv buffered messages after disconnect",
      "Receiver recv when Sender dropped queue",
      "channel disconnect drain pending messages Rust",
    ],
    evidence: [
      "Rust 1.98.1 buffered channel",
      "sender drop before receive",
      "message-then-RecvError sequence",
    ],
    caseSlug: "mpsc-recv-drains-buffer-before-disconnected",
  },
  {
    id: "RFA-267",
    area: "ffi-targets",
    symptom:
      "Reading from a Cursor positioned beyond its buffer returns zero bytes and leaves the position beyond the end.",
    likelyCause:
      "Cursor position is independent u64 state, and a read beyond current content observes EOF without clamping or extending the buffer.",
    firstCheck:
      "Record backing length, cursor position, destination length, read count, and position after the read.",
    searchTerms: [
      "Rust Cursor read position beyond end returns zero",
      "Cursor set_position past buffer EOF",
      "does Cursor clamp position Rust",
    ],
    evidence: [
      "Rust 1.98.1 vector Cursor",
      "position ten over length three",
      "zero-byte read and unchanged position",
    ],
    caseSlug: "cursor-read-past-end-returns-zero",
  },
  {
    id: "RFA-268",
    area: "ffi-targets",
    symptom:
      "Path::components normalizes an internal current-directory marker but still yields ParentDir for a parent marker.",
    likelyCause:
      "Component iteration performs limited lexical cleanup while preserving parent traversal whose meaning can depend on filesystem state.",
    firstCheck:
      "Inspect Component values directly and decide whether the application needs lexical parsing or filesystem canonicalization.",
    searchTerms: [
      "Rust Path components dot dot not normalized",
      "Path components preserves ParentDir",
      "lexically normalize path Rust without filesystem",
    ],
    evidence: [
      "Rust 1.98.1 relative path",
      "removed internal CurDir",
      "preserved ParentDir component",
    ],
    caseSlug: "path-components-preserves-parent-directory",
  },
  {
    id: "RFA-269",
    area: "concurrency-memory",
    symptom:
      "After Vec::append, all source elements appear in the destination and the source vector has length zero.",
    likelyCause:
      "Append uses the mutable source borrow to move every element into the destination without cloning or sharing ownership.",
    firstCheck:
      "Inspect both vectors after append and decide whether the application requires movement, duplication, or borrowed views.",
    searchTerms: [
      "Rust Vec append source becomes empty",
      "does Vec append move or clone elements",
      "keep second vector after append Rust",
    ],
    evidence: ["Rust 1.98.1 two small vectors", "destination concatenation", "empty source state"],
    caseSlug: "vec-append-empties-source",
  },
  {
    id: "RFA-270",
    area: "concurrency-memory",
    symptom:
      "Vec::split_off at index two leaves only indices below two in the original vector and puts the boundary element in the returned vector.",
    likelyCause:
      "The method partitions using half-open ranges [0, at) and [at, len), so the supplied index begins the newly allocated suffix.",
    firstCheck:
      "Write the two half-open ranges beside the call and assert which output owns the exact element at the boundary index.",
    searchTerms: [
      "Rust Vec split_off boundary element",
      "Vec split_off inclusive or exclusive index",
      "which vector contains split_off index Rust",
    ],
    evidence: [
      "Rust 1.98.1 four-element vector",
      "split at index two",
      "two explicit half-open ranges",
    ],
    caseSlug: "vec-split-off-boundary-starts-returned-vector",
  },
  {
    id: "RFA-271",
    area: "ffi-targets",
    symptom:
      "char::from_digit returns Option for an invalid digit value but panics when the caller supplies a radix greater than 36.",
    likelyCause:
      "None represents a numeric value outside a supported digit alphabet, while radix above 36 violates a separate method precondition.",
    firstCheck:
      "Validate the external radix independently, then test the largest valid digit and first invalid digit inside a supported base.",
    searchTerms: [
      "Rust char from_digit radix 37 panic",
      "char from_digit None versus panic",
      "maximum radix char from_digit Rust",
    ],
    evidence: [
      "Rust 1.98.1 caught radix-37 panic",
      "out-of-range digit returns None",
      "explicit radix validation repair",
    ],
    caseSlug: "char-from-digit-panics-above-radix-36",
  },
  {
    id: "RFA-272",
    area: "ffi-targets",
    symptom:
      "u32::from_str_radix panics for radix one even though malformed digits and overflow are returned through ParseIntError.",
    likelyCause:
      "Result covers failures in text parsed under a supported grammar, but the radix selector itself must already lie in 2 through 36.",
    firstCheck:
      "Range-check a dynamic radix before parsing and distinguish unsupported-base errors from invalid digits in a valid base.",
    searchTerms: [
      "Rust from_str_radix invalid radix panic",
      "from_str_radix radix 1 ParseIntError",
      "validate dynamic integer base Rust",
    ],
    evidence: [
      "Rust 1.98.1 caught radix-one panic",
      "ordinary invalid digit ParseIntError",
      "2-through-36 validation wrapper",
    ],
    caseSlug: "from-str-radix-invalid-base-panics-before-parse-error",
  },
  {
    id: "RFA-273",
    area: "upgrades-compatibility",
    symptom:
      "For negative seven divided by four, slash returns negative one while i32::div_euclid returns negative two with remainder one.",
    likelyCause:
      "Signed slash truncates the quotient toward zero, while Euclidean division chooses the quotient paired with a least nonnegative remainder.",
    firstCheck:
      "Test one inexact negative dividend and assert both the reconstruction identity and the required sign range of the remainder.",
    searchTerms: [
      "Rust div_euclid versus division negative",
      "why -7 / 4 differs div_euclid",
      "Euclidean integer division Rust remainder",
    ],
    evidence: [
      "Rust 1.98.1 negative dividend",
      "slash and Euclidean quotient comparison",
      "quotient-remainder identity repair",
    ],
    caseSlug: "div-euclid-differs-from-slash-for-negative-values",
  },
  {
    id: "RFA-274",
    area: "upgrades-compatibility",
    symptom:
      "Calling leading_zeros on zero u32 returns 32, while code using the count as a logarithm or empty-value sentinel expected zero.",
    likelyCause:
      "The primitive counts zeros in a fixed-width representation, and every one of the 32 representation bits is zero for numeric zero.",
    firstCheck:
      "Compare zero, one, powers of two, and their neighbors while naming whether the consumer needs padding count or significant width.",
    searchTerms: [
      "Rust leading_zeros zero returns 32",
      "u32 zero bit length Rust stable",
      "leading_zeros calculate bit width zero",
    ],
    evidence: ["Rust 1.98.1 zero u32", "full 32-bit zero count", "stable width calculation"],
    caseSlug: "leading-zeros-of-zero-equals-integer-width",
  },
  {
    id: "RFA-275",
    area: "ffi-targets",
    symptom:
      "Truncating a Cursor's backing Vec through get_mut changes its length from three to one but leaves the independent cursor position at three.",
    likelyCause:
      "Cursor stores its position separately and cannot infer how arbitrary structural changes to the exposed underlying value should transform it.",
    firstCheck:
      "Record position and backing length before and after get_mut, then run the next real read or write under an explicit repair policy.",
    searchTerms: [
      "Rust Cursor get_mut position after truncate",
      "Cursor position past buffer after get_mut",
      "mutate Cursor Vec reset position Rust",
    ],
    evidence: [
      "Rust 1.98.1 Vec-backed Cursor",
      "buffer truncated through get_mut",
      "explicit position clamp repair",
    ],
    caseSlug: "cursor-get-mut-can-leave-position-past-new-length",
  },
  {
    id: "RFA-276",
    area: "ffi-targets",
    symptom:
      "OpenOptions with read and create enabled fails with InvalidInput because create does not implicitly grant write or append access.",
    likelyCause:
      "Creation behavior and handle capabilities are separate flags, and creating a file requires an explicitly writable or appendable handle.",
    firstCheck:
      "Print the complete final option set and test missing and existing targets while recording the returned io::ErrorKind.",
    searchTerms: [
      "Rust OpenOptions create without write InvalidInput",
      "create true read true OpenOptions fails",
      "OpenOptions create requires write append Rust",
    ],
    evidence: [
      "Rust 1.98.1 unique temporary path",
      "InvalidInput open failure",
      "explicit read-write creation repair",
    ],
    caseSlug: "openoptions-create-needs-write-or-append-access",
  },
  {
    id: "RFA-277",
    area: "ffi-targets",
    symptom:
      "After three bytes are read through take(4), the next three-byte read returns only one byte and following reads report EOF.",
    likelyCause:
      "The Take adapter maintains one remaining byte budget across its lifetime instead of applying a fresh per-call maximum.",
    firstCheck:
      "Log every returned read count and Take::limit after each call, then inspect whether the underlying reader still contains bytes.",
    searchTerms: [
      "Rust Read take limit cumulative",
      "does Read take reset each read call",
      "Take reader remaining limit EOF Rust",
    ],
    evidence: [
      "Rust 1.98.1 six-byte slice reader",
      "three-plus-one bounded reads",
      "zero remaining limit assertion",
    ],
    caseSlug: "read-take-limit-is-cumulative-across-calls",
  },
  {
    id: "RFA-278",
    area: "ffi-targets",
    symptom:
      "Popping accented e from a Rust String shortens len by two because pop removes one char while String::len reports UTF-8 bytes.",
    likelyCause:
      "The removed Unicode scalar occupies two UTF-8 code units, while pop and len deliberately operate in different text units.",
    firstCheck:
      "Record the returned char, its len_utf8 value, and the String byte length before and after popping a multibyte scalar.",
    searchTerms: [
      "Rust String pop Unicode bytes length",
      "does String pop remove char or byte",
      "String len decreases by two after pop Rust",
    ],
    evidence: [
      "Rust 1.98.1 a-plus-accented-e string",
      "one scalar and two-byte removal",
      "len_utf8 repair assertion",
    ],
    caseSlug: "string-pop-removes-one-scalar-not-one-byte",
  },
  {
    id: "RFA-279",
    area: "ffi-targets",
    symptom:
      "After set_extension removes gz from archive.tar.gz, Path::extension returns tar because the earlier dotted suffix becomes the new final extension.",
    likelyCause:
      "Extension is recalculated from the current final filename and set_extension performs one suffix update rather than removing every dotted part.",
    firstCheck:
      "Assert the complete resulting PathBuf and its newly observed extension for single-suffix, multi-suffix, and dotfile inputs.",
    searchTerms: [
      "Rust set_extension empty archive tar gz",
      "PathBuf remove all extensions",
      "set_extension empty extension still Some Rust",
    ],
    evidence: [
      "Rust 1.98.1 multi-suffix PathBuf",
      "single final-suffix removal",
      "repeated explicit removal repair",
    ],
    caseSlug: "pathbuf-empty-extension-can-reveal-earlier-suffix",
  },
  {
    id: "RFA-280",
    area: "ffi-targets",
    symptom:
      "Read::chain permanently switches to its second reader after the first reader returns Ok(0), even if that reader would produce data on a later call.",
    likelyCause:
      "The Read contract uses a zero-byte successful read to signal current EOF, and Chain treats that signal as the permanent boundary between its two sources.",
    firstCheck:
      "Log every read result from the first source and verify that temporary unavailability is represented by WouldBlock or Pending rather than Ok(0).",
    searchTerms: [
      "Rust Read chain first reader temporary EOF",
      "Read chain switches after Ok 0",
      "Rust custom Reader returns zero then data chain",
    ],
    evidence: [
      "Rust 1.98.1 controlled two-stage reader",
      "first Ok(0) transition",
      "second reader output only",
    ],
    caseSlug: "read-chain-switches-permanently-after-first-eof",
  },
  {
    id: "RFA-281",
    area: "ffi-targets",
    symptom:
      "write_all through Cursor<&mut [u8]> writes the fitting prefix, then returns WriteZero when the cursor reaches the fixed slice boundary.",
    likelyCause:
      "Cursor supplies position semantics but cannot grow borrowed slice storage, while write_all requires continued progress until every byte is accepted.",
    firstCheck:
      "Record cursor position, slice length, requested length, partially written prefix, and the final io::ErrorKind.",
    searchTerms: [
      "Rust Cursor fixed slice write_all WriteZero",
      "Cursor mut slice cannot grow Rust",
      "write_all partially writes before error fixed buffer",
    ],
    evidence: [
      "Rust 1.98.1 two-byte mutable slice",
      "three-byte write_all",
      "WriteZero after partial prefix",
    ],
    caseSlug: "cursor-fixed-slice-write-all-returns-write-zero",
  },
  {
    id: "RFA-282",
    area: "ffi-targets",
    symptom:
      "split_inclusive on a string ending with its separator attaches that separator to the preceding item and does not return a final empty item.",
    likelyCause:
      "Inclusive splitting assigns each matched separator to the item it terminates rather than treating the separator as a boundary around a following empty field.",
    firstCheck:
      "Assert the exact returned strings for leading, repeated, absent, and trailing separators instead of checking only the item count.",
    searchTerms: [
      "Rust split_inclusive trailing delimiter empty string",
      "split inclusive final separator no empty tail",
      "Rust split_inclusive versus split trailing delimiter",
    ],
    evidence: [
      "Rust 1.98.1 comma-terminated text",
      "two inclusive pieces",
      "ordinary split empty tail contrast",
    ],
    caseSlug: "split-inclusive-trailing-separator-has-no-empty-tail",
  },
  {
    id: "RFA-283",
    area: "upgrades-compatibility",
    symptom:
      "Range::is_empty returns true for a floating-point range whose endpoint is NaN, grouping incomparable endpoints with non-increasing ranges.",
    likelyCause:
      "Floating-point values have a partial order, and the range method defines emptiness when the start is not strictly less than the end.",
    firstCheck:
      "Validate endpoint finiteness separately before using is_empty to decide whether an application range is acceptable.",
    searchTerms: [
      "Rust Range is_empty NaN true",
      "floating point range NaN empty Rust",
      "Range f64 incomparable endpoints is_empty",
    ],
    evidence: ["Rust 1.98.1 Range f64", "NaN endpoint", "explicit finite-bound validation"],
    caseSlug: "range-is-empty-treats-nan-as-incomparable",
  },
  {
    id: "RFA-284",
    area: "concurrency-memory",
    symptom:
      "Calling Cow::to_mut on borrowed text changes an owned clone while the original borrowed source remains unchanged.",
    likelyCause:
      "Clone-on-write must preserve the immutable borrow, so mutable access transitions the Cow from Borrowed to Owned before applying changes.",
    firstCheck:
      "Assert the source, Cow contents, and Borrowed or Owned variant before and after the first mutable access.",
    searchTerms: [
      "Rust Cow to_mut clones borrowed data",
      "Cow mutation original string unchanged",
      "when does Cow become Owned Rust",
    ],
    evidence: [
      "Rust 1.98.1 borrowed Cow str",
      "uppercase owned result",
      "unchanged borrowed source",
    ],
    caseSlug: "cow-to-mut-clones-borrowed-data-before-mutation",
  },
  {
    id: "RFA-285",
    area: "concurrency-memory",
    symptom:
      "HashSet::take with an equal query returns the concrete stored value, including payload fields ignored by equality, and removes it from the set.",
    likelyCause:
      "The query only identifies an equality class; the set owns and therefore returns its existing representative of that class.",
    firstCheck:
      "Create equal values with visibly different non-key fields and assert which representative get, take, and replace expose.",
    searchTerms: [
      "Rust HashSet take returns stored value",
      "HashSet equal values different fields take",
      "retrieve owned representative HashSet Rust",
    ],
    evidence: [
      "Rust 1.98.1 custom equality by id",
      "different query and stored labels",
      "stored representative removed",
    ],
    caseSlug: "hashset-take-returns-stored-equal-value",
  },
  {
    id: "RFA-286",
    area: "upgrades-compatibility",
    symptom:
      "Iterator::product over an empty iterator of u32 values returns one rather than zero or an absence marker.",
    likelyCause:
      "The standard integer Product implementation folds from the multiplicative identity one, which is also the complete result when no factors exist.",
    firstCheck:
      "Decide whether emptiness means a neutral transform, missing input, or invalid input before choosing product, reduce, or explicit validation.",
    searchTerms: [
      "Rust empty iterator product returns one",
      "Iterator product empty u32 Rust",
      "preserve empty product as None Rust",
    ],
    evidence: [
      "Rust 1.98.1 typed empty u32 iterator",
      "product identity one",
      "reduce returns None contrast",
    ],
    caseSlug: "empty-u32-iterator-product-is-one",
  },
  {
    id: "RFA-287",
    area: "upgrades-compatibility",
    symptom:
      "f64::fract on negative 3.6 returns approximately negative 0.6 instead of a normalized positive value between zero and one.",
    likelyCause:
      "fract subtracts truncation toward zero, preserving the sign of a negative fractional component rather than applying Euclidean wrapping.",
    firstCheck:
      "Test paired positive and negative inputs and name whether the required result is signed displacement or a phase in a nonnegative interval.",
    searchTerms: [
      "Rust f64 fract negative result",
      "positive fractional part negative float Rust",
      "fract versus rem_euclid Rust",
    ],
    evidence: [
      "Rust 1.98.1 negative floating value",
      "approximately negative 0.6 fract",
      "approximately positive 0.4 Euclidean remainder",
    ],
    caseSlug: "f64-fract-keeps-negative-sign",
  },
  {
    id: "RFA-288",
    area: "upgrades-compatibility",
    symptom:
      "Duration::checked_div with divisor zero returns None, so immediately unwrapping the checked operation still panics.",
    likelyCause:
      "Checked division represents an invalid divisor through Option instead of inventing a zero or infinite Duration.",
    firstCheck:
      "Trace where the divisor came from, reject zero with domain context, and keep valid zero-duration results distinct from invalid division.",
    searchTerms: [
      "Rust Duration checked_div zero None",
      "divide Duration by zero without panic",
      "Duration checked division Option Rust",
    ],
    evidence: [
      "Rust 1.98.1 five-second Duration",
      "zero divisor returns None",
      "domain error wrapper",
    ],
    caseSlug: "duration-checked-div-zero-returns-none",
  },
  {
    id: "RFA-289",
    area: "ffi-targets",
    symptom:
      "Parsing ::1:8080 as SocketAddrV6 fails even though its intended IPv6 host and port are individually valid.",
    likelyCause:
      "IPv6 addresses already contain colons, so socket text requires brackets around the address to make the following port delimiter unambiguous.",
    firstCheck:
      "Parse [::1]:8080 as a socket address, or parse the IPv6 address and u16 port separately and construct the typed endpoint.",
    searchTerms: [
      "Rust parse IPv6 socket address brackets",
      "SocketAddrV6 unbracketed parse error",
      "IPv6 address with port Rust syntax",
    ],
    evidence: [
      "Rust 1.98.1 IPv6 loopback",
      "unbracketed parse failure",
      "bracketed socket endpoint repair",
    ],
    caseSlug: "ipv6-socket-address-parser-requires-brackets",
  },
  {
    id: "RFA-290",
    area: "ffi-targets",
    symptom:
      "BufRead::skip_until on abc| returns four, although code treated the count as the three-byte payload length before the delimiter.",
    likelyCause:
      "The method reports total stream progress through the delimiter and includes that delimiter byte when it is found.",
    firstCheck:
      "Test delimiter-first, delimiter-last, and delimiter-absent inputs while asserting both the count and exact unread remainder.",
    searchTerms: [
      "Rust BufRead skip_until includes delimiter",
      "skip_until returned byte count Rust",
      "skip NUL terminated field BufRead",
    ],
    evidence: [
      "Rust 1.98.1 Cursor input",
      "three payload bytes plus delimiter",
      "remaining stream assertion",
    ],
    caseSlug: "bufread-skip-until-count-includes-delimiter",
  },
  {
    id: "RFA-291",
    area: "upgrades-compatibility",
    symptom:
      "A first iterator that returns None once and Some later loses that later value when it is placed before another iterator with chain.",
    likelyCause:
      "Chain uses the first None as an irreversible sequence boundary and polls only the second iterator after making that transition.",
    firstCheck:
      "Record the custom iterator's next trace past its first None and decide whether temporary absence needs a separate item state.",
    searchTerms: [
      "Rust Iterator chain first None permanent",
      "chain non fused iterator loses later Some",
      "Iterator None temporary unavailable Rust",
    ],
    evidence: [
      "Rust 1.98.1 custom reviving iterator",
      "first-call None",
      "only second-side value collected",
    ],
    caseSlug: "iterator-chain-abandons-first-after-none",
  },
  {
    id: "RFA-292",
    area: "upgrades-compatibility",
    symptom:
      "After RangeInclusive is iterated to exhaustion, comparing start and end does not reliably reveal that no values remain.",
    likelyCause:
      "The inclusive range carries exhaustion state beyond its endpoints, whose exposed values are documented as unspecified after iteration ends.",
    firstCheck:
      "Use is_empty for remaining state and preserve a clone before iteration when the original bounds must remain available.",
    searchTerms: [
      "Rust RangeInclusive start end after iteration",
      "exhausted inclusive range endpoints unspecified",
      "RangeInclusive is_empty after collect",
    ],
    evidence: ["Rust 1.98.1 inclusive integer range", "complete exhaustion", "is_empty repair"],
    caseSlug: "range-inclusive-endpoints-unspecified-after-exhaustion",
  },
  {
    id: "RFA-293",
    area: "concurrency-memory",
    symptom:
      "catch_unwind returns Err for a panic, but a configured panic hook has already observed and reported that panic.",
    likelyCause:
      "Panic hooks run when the panic begins, before stack unwinding reaches the catch boundary.",
    firstCheck:
      "Install a counting hook in a serialized minimal test, restore the previous hook, and assert both hook calls and catch result.",
    searchTerms: [
      "Rust catch_unwind still prints panic",
      "panic hook runs before catch_unwind",
      "silence expected caught panic Rust test",
    ],
    evidence: ["Rust 1.98.1 custom panic hook", "caught unwind payload", "exactly one hook call"],
    caseSlug: "catch-unwind-runs-panic-hook-before-catching",
  },
  {
    id: "RFA-294",
    area: "concurrency-memory",
    symptom:
      "RefCell::swap panics when the same cell is supplied as both receiver and argument instead of treating self-swap as a no-op.",
    likelyCause:
      "Runtime-checked interior mutation requires two distinct unborrowed cells, and the method explicitly rejects identical allocation identity.",
    firstCheck:
      "Compare the two RefCell references with ptr::eq before swapping and check whether either still has an active borrow guard.",
    searchTerms: [
      "Rust RefCell swap same cell panic",
      "RefCell swap with itself",
      "avoid RefCell self swap ptr eq",
    ],
    evidence: ["Rust 1.98.1 single RefCell", "caught self-swap panic", "pointer-identity guard"],
    caseSlug: "refcell-swap-with-itself-panics",
  },
  {
    id: "RFA-295",
    area: "concurrency-memory",
    symptom:
      "Writing a second resource-owning value into initialized MaybeUninit storage causes only the second value to be dropped later.",
    likelyCause:
      "MaybeUninit::write performs initialization without reading or dropping prior bytes because its destination is expected to be uninitialized.",
    firstCheck:
      "Track initialization state and destructor calls, then use mem::replace or explicit assume_init_drop before reinitializing a live slot.",
    searchTerms: [
      "Rust MaybeUninit write does not drop old value",
      "overwrite initialized MaybeUninit leak",
      "MaybeUninit reinitialize resource safely",
    ],
    evidence: [
      "Rust 1.98.1 drop-counted values",
      "second write into live slot",
      "one leaked destructor obligation",
    ],
    caseSlug: "maybeuninit-write-overwrites-without-dropping-old-value",
  },
  {
    id: "RFA-296",
    area: "diagnostics-macros",
    symptom:
      "Calling type_id directly on Box<dyn Any> does not match TypeId::of::<u32>() even though the contained value is a u32.",
    likelyCause:
      "Method resolution can invoke Any for the concrete smart-pointer container rather than dispatching through the dyn Any target.",
    firstCheck:
      "Bind &*boxed to an explicit &dyn Any receiver and compare its type_id or use the safe is and downcast helpers.",
    searchTerms: [
      "Rust Box dyn Any type_id wrong type",
      "Any type_id smart pointer container",
      "get contained TypeId Box dyn Any",
    ],
    evidence: [
      "Rust 1.98.1 boxed u32",
      "direct receiver mismatch",
      "dereferenced trait-object match",
    ],
    caseSlug: "any-type-id-on-box-reports-container-type",
  },
  {
    id: "RFA-297",
    area: "concurrency-memory",
    symptom:
      "Vec::swap_remove deletes a middle value but moves the final value into its index, changing the remaining sequence order.",
    likelyCause:
      "Constant-time removal fills the hole with the last element instead of shifting every following element left.",
    firstCheck:
      "Assert the entire remaining vector and update any external index associated with the element moved from the final slot.",
    searchTerms: [
      "Rust Vec swap_remove changes order",
      "swap_remove last element moves to index",
      "Vec constant time removal preserve order",
    ],
    evidence: ["Rust 1.98.1 four-element Vec", "middle removal", "last element moved into hole"],
    caseSlug: "vec-swap-remove-does-not-preserve-order",
  },
  {
    id: "RFA-298",
    area: "ffi-targets",
    symptom:
      "A child launched with Command::output reads immediate EOF from stdin instead of inheriting input from its parent.",
    likelyCause:
      "The convenience method captures stdout and stderr but deliberately does not inherit stdin unless its configuration is overridden.",
    firstCheck:
      "Inspect all three Stdio settings and use spawn with piped stdin when the parent must write input before waiting for output.",
    searchTerms: [
      "Rust Command output stdin closed",
      "send stdin with Command output",
      "Command spawn piped stdin wait_with_output Rust",
    ],
    evidence: [
      "Rust 1.98.1 self-spawned process",
      "default child stdin EOF",
      "explicit piped input repair",
    ],
    caseSlug: "command-output-closes-child-stdin-by-default",
  },
  {
    id: "RFA-299",
    area: "ffi-targets",
    symptom:
      "str::lines splits CRLF but keeps a lone carriage return inside the surrounding line instead of treating it as a boundary.",
    likelyCause:
      "The method recognizes LF and the paired CRLF sequence; an unpaired carriage return is documented as retained content.",
    firstCheck:
      "Assert exact slices containing visible escaped control characters and state whether the input grammar accepts, rejects, or normalizes lone CR.",
    searchTerms: [
      "Rust str lines lone carriage return",
      "lines splits CRLF but not CR Rust",
      "normalize old Mac line endings Rust",
    ],
    evidence: [
      "Rust 1.98.1 mixed line endings",
      "lone CR retained",
      "ordered normalization repair",
    ],
    caseSlug: "str-lines-preserves-lone-carriage-return",
  },
  {
    id: "RFA-300",
    area: "concurrency-memory",
    symptom:
      "Vec::with_capacity for a zero-sized element reports usize::MAX instead of the requested capacity, despite making no enormous allocation.",
    likelyCause:
      "Zero-sized elements need no backing element storage, so Vec represents their effective capacity as usize::MAX rather than retaining a physical allocation boundary.",
    firstCheck:
      "Inspect size_of::<T>(), length, and capacity separately before treating a generic Vec capacity as allocated element bytes.",
    searchTerms: [
      "Rust Vec zero sized type capacity usize MAX",
      "Vec unit capacity huge no allocation",
      "with_capacity ZST ignores requested capacity",
    ],
    evidence: [
      "Rust 1.98.1 Vec<()> fixture",
      "requested capacity eight",
      "growth without element allocation",
    ],
    caseSlug: "vec-zero-sized-type-capacity-is-usize-max",
  },
  {
    id: "RFA-301",
    area: "concurrency-memory",
    symptom:
      "Wrapping NonNull in UnsafeCell preserves the direct inner size but makes an enclosing Option larger on a 64-bit target.",
    likelyCause:
      "UnsafeCell preserves its inner representation but prevents the outer Option from reusing NonNull's invalid null representation as its discriminant niche.",
    firstCheck:
      "Measure the complete outer type on the supported target and identify whether the layout fact is documented or merely observed.",
    searchTerms: [
      "Rust UnsafeCell Option size niche optimization",
      "Option UnsafeCell NonNull 16 bytes",
      "UnsafeCell memory layout outer enum niche",
    ],
    evidence: ["Rust 1.98.1 64-bit layout", "plain NonNull Option", "UnsafeCell-wrapped Option"],
    caseSlug: "unsafecell-disables-outer-niche-optimization",
  },
  {
    id: "RFA-302",
    area: "concurrency-memory",
    symptom:
      "A caught panic payload is resumed and caught again, but the configured panic hook does not observe a second panic event.",
    likelyCause:
      "resume_unwind continues an existing unwind with its captured payload and deliberately bypasses the hook instead of beginning a new panic.",
    firstCheck:
      "Count hook calls around the original panic and resumed payload separately, restoring the process-global hook after the test.",
    searchTerms: [
      "Rust resume_unwind panic hook not called",
      "panic hook catch_unwind resume payload",
      "resume_unwind logging missing Rust",
    ],
    evidence: [
      "Rust 1.98.1 custom hook",
      "caught original payload",
      "zero hook calls while resuming",
    ],
    caseSlug: "resume-unwind-bypasses-panic-hook",
  },
  {
    id: "RFA-303",
    area: "upgrades-compatibility",
    symptom:
      "A value with observable Clone identity appears after its clones when iter::repeat_n is collected rather than appearing first.",
    likelyCause:
      "repeat_n avoids one unnecessary clone by cloning the first n minus one outputs and moving its owned original into the final output.",
    firstCheck:
      "Use a Clone implementation with recorded identities and test zero, one, and several outputs before relying on construction order.",
    searchTerms: [
      "Rust repeat_n clone order original last",
      "iter repeat_n Clone side effects",
      "repeat_n value cloning semantics",
    ],
    evidence: [
      "Rust 1.98.1 stateful Clone",
      "three repeated outputs",
      "clone-clone-original order",
    ],
    caseSlug: "repeat-n-yields-original-value-last",
  },
  {
    id: "RFA-304",
    area: "upgrades-compatibility",
    symptom:
      "Calling isqrt on a negative signed integer panics instead of returning an integer sentinel or floating-point-style NaN.",
    likelyCause:
      "The direct signed integer square-root method requires a non-negative operand and uses a panic to report input outside that mathematical domain.",
    firstCheck:
      "Exercise the negative, zero, square-boundary, and maximum inputs and use checked_isqrt when negativity can arrive as data.",
    searchTerms: [
      "Rust i32 isqrt negative panic",
      "checked_isqrt negative returns None",
      "integer square root signed input Rust",
    ],
    evidence: [
      "Rust 1.98.1 signed integer",
      "negative-one unwind",
      "checked square-boundary results",
    ],
    caseSlug: "signed-isqrt-panics-on-negative-input",
  },
  {
    id: "RFA-305",
    area: "ffi-targets",
    symptom:
      "Metadata queried for a symbolic link reports a regular file type because the query describes the link destination.",
    likelyCause:
      "fs::metadata follows the final symbolic link, whereas fs::symlink_metadata describes the directory entry at the supplied path.",
    firstCheck:
      "Query the same controlled link with both metadata functions and state whether the policy concerns the entry or its destination.",
    searchTerms: [
      "Rust metadata follows symlink",
      "symlink_metadata file_type is_symlink",
      "check symbolic link without following Rust",
    ],
    evidence: [
      "Rust 1.98.1 Unix directory",
      "relative symbolic link",
      "followed and unfollowed file types",
    ],
    caseSlug: "metadata-follows-symlink-symlink-metadata-does-not",
  },
  {
    id: "RFA-306",
    area: "ffi-targets",
    symptom:
      "A second logical process request built from the same Command retains the argument configured for the first request.",
    likelyCause:
      "Command is reusable mutable configuration, and each arg call appends to its stored argument vector rather than replacing prior invocation state.",
    firstCheck:
      "Inspect get_args before every spawn and construct a fresh builder when arguments or environment belong to one invocation.",
    searchTerms: [
      "Rust Command reuse arguments accumulate",
      "Command arg replace existing args",
      "std process Command builder reused state",
    ],
    evidence: ["Rust 1.98.1 Command builder", "two arg mutations", "fresh builder per request"],
    caseSlug: "command-builder-reuse-accumulates-arguments",
  },
  {
    id: "RFA-307",
    area: "upgrades-compatibility",
    symptom:
      "A String retain predicate runs fewer times than String::len for input containing a multibyte Unicode scalar value.",
    likelyCause:
      "String::len counts UTF-8 bytes while retain invokes its predicate exactly once for each Unicode scalar value in original order.",
    firstCheck:
      "Record visited chars and compare the byte length, chars count, and complete retained string using a known multibyte fixture.",
    searchTerms: [
      "Rust String retain called per char or byte",
      "String retain Unicode predicate order",
      "retain UTF-8 multibyte character Rust",
    ],
    evidence: [
      "Rust 1.98.1 a-é-b string",
      "four bytes and three chars",
      "ordered retain visitation",
    ],
    caseSlug: "string-retain-visits-unicode-scalars-not-bytes",
  },
  {
    id: "RFA-308",
    area: "upgrades-compatibility",
    symptom:
      "Calling f64::signum on negative zero returns negative one even though negative zero compares equal to positive zero.",
    likelyCause:
      "Floating-point zero retains an IEEE sign bit, and signum observes that encoded sign rather than classifying zero only through numeric comparison.",
    firstCheck:
      "Test both signed zeros, NaN, infinities, and subnormal values and state whether the domain preserves or canonicalizes zero sign.",
    searchTerms: [
      "Rust f64 signum negative zero",
      "minus zero signum returns minus one",
      "f64 sign bit zero equality Rust",
    ],
    evidence: ["Rust 1.98.1 f64", "both signed zeros", "signum and NaN behavior"],
    caseSlug: "f64-signum-distinguishes-negative-zero",
  },
  {
    id: "RFA-309",
    area: "upgrades-compatibility",
    symptom:
      "split_once with an empty delimiter returns a successful pair containing an empty edge instead of reporting no delimiter.",
    likelyCause:
      "An empty string pattern matches zero-width UTF-8 boundaries, so forward and reverse searches select the first and final boundaries respectively.",
    firstCheck:
      "Test empty input and delimiter explicitly, then reject an empty delimiter when the application grammar requires consumed separator text.",
    searchTerms: [
      "Rust split_once empty string result",
      "empty delimiter matches string boundary Rust",
      "rsplit_once empty pattern behavior",
    ],
    evidence: [
      "Rust 1.98.1 string pattern",
      "first and final empty boundary",
      "non-empty validation wrapper",
    ],
    caseSlug: "split-once-empty-pattern-matches-string-boundary",
  },
  {
    id: "RFA-310",
    area: "upgrades-compatibility",
    symptom:
      "A scan adapter returns None for one input but produces another value when next is called again manually.",
    likelyCause:
      "scan forwards its closure result for each call without storing permanent exhaustion, and the adapter does not implement the stronger fused guarantee.",
    firstCheck:
      "Call next beyond the first None and apply fuse to the scan output when the public contract requires permanent exhaustion.",
    searchTerms: [
      "Rust Iterator scan Some after None",
      "scan iterator not fused",
      "Iterator scan closure None resume",
    ],
    evidence: ["Rust 1.98.1 three-item scan", "middle None", "fused permanent exhaustion"],
    caseSlug: "iterator-scan-can-resume-after-none",
  },
  {
    id: "RFA-311",
    area: "upgrades-compatibility",
    symptom:
      "After try_fold rejects one item, continuing the iterator starts at the following item rather than revisiting the rejected one.",
    likelyCause:
      "The iterator has already moved the triggering item into the closure before that closure can produce its short-circuiting residual.",
    firstCheck:
      "Put the rejected item and partial accumulator into the residual, then assert the exact first unvisited item remaining afterward.",
    searchTerms: [
      "Rust try_fold iterator after error",
      "try_fold consumes failing item",
      "continue iterator after try_fold short circuit",
    ],
    evidence: ["Rust 1.98.1 four-item range", "error on item three", "item four remains"],
    caseSlug: "try-fold-consumes-short-circuiting-item",
  },
  {
    id: "RFA-312",
    area: "concurrency-memory",
    symptom:
      "Iterating a BinaryHeap starts with its maximum but does not produce every later value in descending priority order.",
    likelyCause:
      "A binary heap maintains only parent-child ordering, and iter visits its underlying vector without repeatedly repairing and removing the root.",
    firstCheck:
      "Compare the arbitrary iteration trace with repeated pop from a clone and state whether the caller needs membership or priority order.",
    searchTerms: [
      "Rust BinaryHeap iter not sorted",
      "BinaryHeap iteration priority order",
      "iterate heap descending Rust",
    ],
    evidence: [
      "Rust 1.98.1 four-element heap",
      "underlying iteration order",
      "repeated-pop priority order",
    ],
    caseSlug: "binaryheap-iter-is-not-priority-order",
  },
  {
    id: "RFA-313",
    area: "concurrency-memory",
    symptom:
      "Forgetting a mutably dereferenced BinaryHeap PeekMut leaves a valid heap but can reduce its visible length by more than one element.",
    likelyCause:
      "The guard temporarily owns restoration and reheapification state, and its leak-safe design may hide and leak other elements when Drop never runs.",
    firstCheck:
      "Let the guard leave a narrow scope normally, then assert both length and sorted contents after increasing or decreasing the root.",
    searchTerms: [
      "Rust BinaryHeap PeekMut mem forget leaks elements",
      "leak PeekMut heap length",
      "BinaryHeap peek_mut guard must drop",
    ],
    evidence: [
      "Rust 1.98.1 four-element heap",
      "forgotten mutated guard",
      "normal Drop restoration",
    ],
    caseSlug: "leaking-binaryheap-peekmut-can-leak-elements",
  },
  {
    id: "RFA-314",
    area: "concurrency-memory",
    symptom:
      "Reducing a Vec length with unsafe set_len causes destructor counters to omit the resource-owning values hidden in the old tail.",
    likelyCause:
      "set_len changes only the vector's logical initialized boundary and performs neither element destruction nor initialization work.",
    firstCheck:
      "Use drop-counted values and replace downward set_len with truncate or clear unless manual destruction is part of a complete unsafe proof.",
    searchTerms: [
      "Rust Vec set_len smaller does not drop",
      "set_len memory leak Drop elements",
      "Vec truncate versus unsafe set_len",
    ],
    evidence: ["Rust 1.98.1 drop-counted values", "length reduction", "truncate destructor repair"],
    caseSlug: "vec-set-len-downward-does-not-drop-elements",
  },
  {
    id: "RFA-315",
    area: "concurrency-memory",
    symptom:
      "A HashSet intersection item carries ignored metadata from the other set even though intersection was invoked on self.",
    likelyCause:
      "Intersection represents equality classes and may iterate whichever side is cheaper, so the contract permits a reference from either equal stored value.",
    firstCheck:
      "Give equal values different non-key metadata and iterate the required source set explicitly when representative provenance matters.",
    searchTerms: [
      "Rust HashSet intersection which value returned",
      "intersection equal elements either set",
      "HashSet representative metadata intersection",
    ],
    evidence: ["Rust 1.98.1 unequal set sizes", "ID-only equality", "explicit left representative"],
    caseSlug: "hashset-intersection-may-yield-either-representative",
  },
  {
    id: "RFA-316",
    area: "ffi-targets",
    symptom:
      "Clearing the portable readonly flag on a Unix file changes mode 0444 to 0666 instead of restoring only owner write permission.",
    likelyCause:
      "The Boolean abstraction maps writable to all owner, group, and other Unix write bits and cannot reconstruct a previously intended exact mode.",
    firstCheck:
      "Read masked mode bits on an isolated fixture and use Unix PermissionsExt to apply the complete permission policy explicitly.",
    searchTerms: [
      "Rust set_readonly false world writable Unix",
      "Permissions set_readonly chmod a+w",
      "restore owner writable Rust permissions",
    ],
    evidence: ["Rust 1.98.1 Unix file", "0444 starting mode", "0666 versus explicit 0644"],
    caseSlug: "permissions-set-readonly-false-enables-all-unix-write-bits",
  },
  {
    id: "RFA-317",
    area: "ffi-targets",
    symptom:
      "DirEntry metadata identifies a symbolic link while fs::metadata on the same entry path identifies its regular-file destination.",
    likelyCause:
      "DirEntry::metadata follows no-final-symlink semantics even though the similarly named free metadata function follows symbolic links.",
    firstCheck:
      "Create a controlled link and query entry metadata, entry file_type, and followed path metadata as three explicit observations.",
    searchTerms: [
      "Rust DirEntry metadata follows symlink",
      "read_dir entry metadata is symlink",
      "DirEntry metadata versus fs metadata",
    ],
    evidence: [
      "Rust 1.98.1 Unix directory",
      "relative link DirEntry",
      "entry and target type comparison",
    ],
    caseSlug: "direntry-metadata-does-not-follow-symlink",
  },
  {
    id: "RFA-318",
    area: "ffi-targets",
    symptom:
      "BufWriter::into_inner delivers its buffered bytes but a wrapped probe records no call to the underlying flush method.",
    likelyCause:
      "Unwrapping writes out the buffer owned by BufWriter, whereas Write::flush additionally invokes the completion contract of the immediate writer.",
    firstCheck:
      "Use a probe that counts write and flush separately, then explicitly flush before unwrapping when the lower layer must be completed.",
    searchTerms: [
      "Rust BufWriter into_inner calls flush",
      "into_inner underlying writer flush not called",
      "BufWriter flush versus into_inner",
    ],
    evidence: [
      "Rust 1.98.1 counting writer",
      "buffered bytes delivered",
      "explicit lower flush repair",
    ],
    caseSlug: "bufwriter-into-inner-does-not-flush-underlying-writer",
  },
  {
    id: "RFA-319",
    area: "ffi-targets",
    symptom:
      "A child aborts and produces an unsuccessful ExitStatus, but code returns None rather than a shell-style integer exit code.",
    likelyCause:
      "Unix signal termination is a distinct wait status rather than a value passed to exit, so the portable code accessor remains optional.",
    firstCheck:
      "Branch on success and code, then inspect Unix ExitStatusExt::signal and retain any separate supervisor termination reason.",
    searchTerms: [
      "Rust ExitStatus code None signal",
      "child process exit code 134 None Rust",
      "ExitStatusExt signal process abort",
    ],
    evidence: ["Rust 1.98.1 self-spawned child", "abort signal", "None code with Some signal"],
    caseSlug: "exitstatus-code-is-none-after-unix-signal",
  },
  {
    id: "RFA-320",
    area: "upgrades-compatibility",
    symptom:
      "Taking the minimum of a numeric float and NaN returns the number rather than propagating the invalid floating-point value.",
    likelyCause:
      "f64::min intentionally returns the non-NaN operand when exactly one operand is NaN, leaving missing-value or invalid-data policy to the caller.",
    firstCheck:
      "Evaluate a numeric value against NaN in both operand orders and decide whether the domain requires skipping, rejecting, propagating, or ordering NaN.",
    searchTerms: [
      "Rust f64 min NaN returns number",
      "does f64 min propagate NaN",
      "Rust minimum ignore NaN",
    ],
    evidence: [
      "Rust 1.98.1 numeric and NaN pair",
      "both operand orders",
      "explicit NaN propagation repair",
    ],
    caseSlug: "f64-min-ignores-one-nan-operand",
  },
  {
    id: "RFA-321",
    area: "upgrades-compatibility",
    symptom:
      "A fused multiply-add returns a small nonzero residual where the source-equivalent separate multiplication and addition return zero.",
    likelyCause:
      "mul_add rounds only the combined result, while separate operators round the product and then round the addition, making cancellation observably different.",
    firstCheck:
      "Run the epsilon cancellation example and specify whether the numerical contract requires fused semantics, separate operations, or only a documented tolerance.",
    searchTerms: [
      "Rust mul_add different result",
      "f64 mul_add rounding example",
      "fused multiply add versus multiply then add Rust",
    ],
    evidence: [
      "Rust 1.98.1 epsilon example",
      "fused single-round result",
      "separate double-round result",
    ],
    caseSlug: "f64-mul-add-rounds-once",
  },
  {
    id: "RFA-322",
    area: "upgrades-compatibility",
    symptom:
      "A signed midpoint across a negative odd sum selects the integer nearer zero rather than the lower mathematical integer.",
    likelyCause:
      "Signed midpoint behaves like sufficiently wide addition followed by signed division by two, which rounds a half-integer toward zero.",
    firstCheck:
      "Test a negative odd sum, extrema, adjacent endpoints, and both operand orders against the interval algorithm's required tie direction.",
    searchTerms: [
      "Rust integer midpoint negative rounding",
      "i32 midpoint rounds toward zero",
      "signed midpoint floor Rust",
    ],
    evidence: [
      "Rust 1.98.1 negative odd sum",
      "symmetric operand order",
      "full-range overflow-safe midpoint",
    ],
    caseSlug: "signed-midpoint-rounds-toward-zero",
  },
  {
    id: "RFA-323",
    area: "upgrades-compatibility",
    symptom:
      "Rounding an integer to the next configured multiple panics when the configured divisor is zero.",
    likelyCause:
      "next_multiple_of must produce a representable multiple and defines zero as an invalid divisor, unlike a nearby total Boolean predicate.",
    firstCheck:
      "Validate zero separately and exercise checked_next_multiple_of for both the zero-divisor and representability-overflow None results.",
    searchTerms: [
      "Rust next_multiple_of zero panic",
      "checked_next_multiple_of returns None",
      "round up alignment zero Rust",
    ],
    evidence: [
      "Rust 1.98.1 zero divisor panic",
      "checked zero result",
      "checked arithmetic overflow result",
    ],
    caseSlug: "next-multiple-of-zero-panics",
  },
  {
    id: "RFA-324",
    area: "upgrades-compatibility",
    symptom:
      "Case-insensitive comparison succeeds for ASCII letters but rejects corresponding uppercase and lowercase non-ASCII characters.",
    likelyCause:
      "char::eq_ignore_ascii_case deliberately implements only ASCII case equivalence and is not Unicode normalization or case folding.",
    firstCheck:
      "Compare one ASCII pair and one non-ASCII pair, then state whether the field is an ASCII protocol token or a Unicode identity.",
    searchTerms: [
      "Rust char eq_ignore_ascii_case Unicode",
      "case insensitive non ASCII Rust char",
      "Rust Unicode case folding standard library",
    ],
    evidence: [
      "Rust 1.98.1 ASCII comparison",
      "non-ASCII uppercase lowercase pair",
      "explicit limited lowercase transformation",
    ],
    caseSlug: "char-eq-ignore-ascii-case-is-not-unicode-folding",
  },
  {
    id: "RFA-325",
    area: "upgrades-compatibility",
    symptom:
      "Replacing a String range selected with a display-oriented position panics at an endpoint inside a multi-byte UTF-8 scalar.",
    likelyCause:
      "String mutation ranges use byte offsets and require every bounded endpoint to lie on a UTF-8 character boundary.",
    firstCheck:
      "Name the offset unit, validate both endpoints with is_char_boundary, and derive byte spans from the same string revision being edited.",
    searchTerms: [
      "Rust String replace_range char boundary panic",
      "replace_range byte index UTF-8 Rust",
      "String replacement multi byte character Rust",
    ],
    evidence: [
      "Rust 1.98.1 a-é-b string",
      "interior UTF-8 byte endpoint",
      "find and len_utf8 boundary repair",
    ],
    caseSlug: "string-replace-range-needs-char-boundaries",
  },
  {
    id: "RFA-326",
    area: "ffi-targets",
    symptom:
      "A valid Unix operating-system string cannot be borrowed as str because one of its bytes is not valid UTF-8.",
    likelyCause:
      "Unix OsString preserves operating-system byte sequences while Rust str requires valid UTF-8, so to_str is necessarily fallible.",
    firstCheck:
      "Keep the value as OsStr through OS operations and test exact bytes, optional UTF-8, and deliberately lossy presentation as separate paths.",
    searchTerms: [
      "Rust OsStr to_str returns None Unix",
      "non UTF-8 filename Rust",
      "OsString invalid UTF-8 bytes",
    ],
    evidence: [
      "Rust 1.98.1 Unix OsString",
      "explicit invalid UTF-8 byte",
      "lossy display and exact-byte recovery",
    ],
    caseSlug: "osstr-to-str-can-return-none-on-unix",
  },
  {
    id: "RFA-327",
    area: "concurrency-memory",
    symptom:
      "Once::is_completed reports false after an initializer definitely ran but panicked before successful completion.",
    likelyCause:
      "The Boolean reports successful completion rather than execution history, and never-called, running, and poisoned states all map to false.",
    firstCheck:
      "Capture the panic on a worker, inspect is_completed, then use call_once_force only when an explicit recovery closure can restore the invariant.",
    searchTerms: [
      "Rust Once is_completed false poisoned",
      "Once initializer panic recovery",
      "call_once_force is_poisoned Rust",
    ],
    evidence: [
      "Rust 1.98.1 panicking initializer thread",
      "false completion after poison",
      "call_once_force recovery state",
    ],
    caseSlug: "once-is-completed-false-after-poison",
  },
  {
    id: "RFA-328",
    area: "concurrency-memory",
    symptom:
      "A later RwLock reader receives PoisonError after a writer changes protected state and panics while its guard remains alive.",
    likelyCause:
      "Panic during exclusive write access can interrupt a logical mutation, so the standard lock records poison for subsequent readers and writers.",
    firstCheck:
      "Bind the write guard across the panic, recover the error's guard, validate the domain invariant, and clear poison only after repair.",
    searchTerms: [
      "Rust RwLock writer panic poisoned",
      "recover data from poisoned RwLock",
      "RwLock clear_poison after write panic",
    ],
    evidence: [
      "Rust 1.98.1 writer thread panic",
      "partially changed protected integer",
      "PoisonError recovery and clear_poison",
    ],
    caseSlug: "rwlock-writer-panic-poisons-lock",
  },
  {
    id: "RFA-329",
    area: "concurrency-memory",
    symptom:
      "Consuming a uniquely owned Mutex with into_inner still returns PoisonError after an earlier guarded worker panic.",
    likelyCause:
      "Unique ownership removes the need for synchronization but does not prove that interrupted mutation left the protected value consistent.",
    firstCheck:
      "Separate Arc ownership recovery from mutex poison, retrieve the owned value from PoisonError, and validate it with domain knowledge.",
    searchTerms: [
      "Rust Mutex into_inner PoisonError",
      "recover owned value poisoned Mutex",
      "does into_inner ignore mutex poison",
    ],
    evidence: [
      "Rust 1.98.1 worker panic",
      "consumed uniquely owned Mutex",
      "owned value recovered from PoisonError",
    ],
    caseSlug: "mutex-into-inner-preserves-poison-error",
  },
  {
    id: "RFA-330",
    area: "ffi-targets",
    symptom:
      "After one logical byte is consumed and BufReader is unwrapped, the returned inner reader is already at end of input.",
    likelyCause:
      "BufReader read ahead into private memory, and into_inner discards that unread buffer without rewinding an underlying source that may not support seeking.",
    firstCheck:
      "Use a source smaller than the buffer, consume one byte, inspect buffer(), and compare the logical remaining bytes with the inner reader position.",
    searchTerms: [
      "Rust BufReader into_inner loses bytes",
      "BufReader underlying reader position ahead",
      "unread buffer discarded into_inner Rust",
    ],
    evidence: [
      "Rust 1.98.1 Cursor source",
      "one consumed byte with five buffered",
      "complete buffered read repair",
    ],
    caseSlug: "bufreader-into-inner-loses-unread-buffered-bytes",
  },
  {
    id: "RFA-331",
    area: "ffi-targets",
    symptom:
      "A direct write through BufWriter::get_mut appears before older output still held in the wrapper's pending buffer.",
    likelyCause:
      "get_mut exposes the current underlying writer without first draining BufWriter's logically earlier buffered bytes.",
    firstCheck:
      "Write a short prefix through BufWriter, confirm the inner sink is unchanged, then compare byte order with and without an explicit flush before direct access.",
    searchTerms: [
      "Rust BufWriter get_mut reorders writes",
      "write underlying BufWriter before buffer flush",
      "BufWriter direct write ordering",
    ],
    evidence: [
      "Rust 1.98.1 Vec writer",
      "pending buffered prefix",
      "explicit flush before direct write",
    ],
    caseSlug: "bufwriter-get-mut-can-reorder-output",
  },
  {
    id: "RFA-332",
    area: "concurrency-memory",
    symptom:
      "Every later force of a LazyLock panics after its one-shot initialization closure panics on the first access.",
    likelyCause:
      "LazyLock poison is intentionally unrecoverable because its FnOnce initializer failed without producing the value promised for publication.",
    firstCheck:
      "Catch a first initializer panic only in an isolated fixture, force again, and move expected fallibility into an explicit Result or retry-capable state machine.",
    searchTerms: [
      "Rust LazyLock poison unrecoverable",
      "LazyLock initializer panic retry",
      "LazyLock force always panics after poison",
    ],
    evidence: [
      "Rust 1.98.1 local LazyLock",
      "first initializer panic",
      "second force poison panic and OnceLock contrast",
    ],
    caseSlug: "lazylock-poison-is-unrecoverable",
  },
  {
    id: "RFA-333",
    area: "upgrades-compatibility",
    symptom:
      "Calling duration_since in reversed Instant order returns zero and makes an instrumentation bug resemble a zero-latency operation.",
    likelyCause:
      "Current Instant subtraction saturates reversed or monotonicity-violating order to zero, while the checked method preserves the state as None.",
    firstCheck:
      "Derive two ordered instants without sleeping and test both receiver-argument orders with checked_duration_since before recording a metric.",
    searchTerms: [
      "Rust Instant duration_since reversed zero",
      "Instant subtraction wrong order no panic",
      "checked_duration_since None Rust",
    ],
    evidence: [
      "Rust 1.98.1 derived later instant",
      "reversed saturating zero",
      "checked direction-sensitive repair",
    ],
    caseSlug: "instant-duration-since-reversed-saturates-zero",
  },
  {
    id: "RFA-334",
    area: "upgrades-compatibility",
    symptom:
      "A Duration round-trip through total nanoseconds becomes much smaller after its u128 total is narrowed to u64.",
    likelyCause:
      "The complete Duration range needs u128 total nanoseconds, while from_nanos accepts u64 and an as cast silently discards high bits.",
    firstCheck:
      "Compare as_nanos with u64::MAX and preserve seconds plus subsecond nanoseconds or use checked narrowing at the destination boundary.",
    searchTerms: [
      "Rust Duration as_nanos u64 truncation",
      "from_nanos as_nanos round trip large duration",
      "Duration nanoseconds overflow u64",
    ],
    evidence: [
      "Rust 1.98.1 Duration maximum seconds",
      "u128 to u64 narrowing",
      "seconds and subsecond reconstruction",
    ],
    caseSlug: "duration-as-nanos-narrowing-loses-large-values",
  },
  {
    id: "RFA-335",
    area: "upgrades-compatibility",
    symptom:
      "Casting 300.0 to u8 produces 255 instead of the wrapped low-byte value familiar from integer narrowing.",
    likelyCause:
      "Rust float-to-integer as casts truncate fractional parts, saturate out-of-range values, and map NaN to zero under a distinct numeric-cast rule.",
    firstCheck:
      "Exercise fractional, upper-range, lower-range, infinite, and NaN values and validate before casting when the collapsed states have different meaning.",
    searchTerms: [
      "Rust float as u8 saturates",
      "NaN as integer Rust zero",
      "f64 to integer cast overflow Rust",
    ],
    evidence: [
      "Rust 1.98.1 f64 to u8 casts",
      "upper and lower saturation",
      "NaN and fractional truncation",
    ],
    caseSlug: "float-to-integer-as-cast-saturates",
  },
  {
    id: "RFA-336",
    area: "upgrades-compatibility",
    symptom:
      "An ASCII-only string containing vertical tab stays one field under split_ascii_whitespace but splits under Unicode split_whitespace.",
    likelyCause:
      "Rust's deliberate ASCII-whitespace definition excludes U+000B, while the Unicode Whitespace property used by split_whitespace includes it.",
    firstCheck:
      "Test each separator named by the actual grammar, including vertical tab, rather than inferring equivalence from the input being ASCII.",
    searchTerms: [
      "Rust split_ascii_whitespace vertical tab",
      "split_whitespace difference ASCII string Rust",
      "U+000B whitespace Rust parser",
    ],
    evidence: [
      "Rust 1.98.1 ASCII vertical-tab input",
      "ASCII splitter single field",
      "Unicode splitter two fields",
    ],
    caseSlug: "split-ascii-whitespace-excludes-vertical-tab",
  },
  {
    id: "RFA-337",
    area: "ffi-targets",
    symptom:
      "UTF-8 validation reports a valid prefix but no invalid-sequence length when a chunk ends partway through a possible scalar value.",
    likelyCause:
      "Utf8Error uses error_len None to distinguish unexpected end of input from a byte sequence already proven invalid.",
    firstCheck:
      "Retain the suffix beginning at valid_up_to when error_len is None, append the next chunk, and resolve any remainder explicitly at final EOF.",
    searchTerms: [
      "Rust Utf8Error error_len None",
      "incomplete UTF-8 chunk valid_up_to",
      "stream UTF-8 sequence across chunks Rust",
    ],
    evidence: [
      "Rust 1.98.1 truncated euro-sign bytes",
      "valid two-byte ASCII prefix",
      "suffix completed by next byte",
    ],
    caseSlug: "utf8error-error-len-none-means-incomplete-suffix",
  },
  {
    id: "RFA-338",
    area: "ffi-targets",
    symptom:
      "CString::new rejects bytes containing zero instead of treating the first zero as a terminator and silently ignoring the suffix.",
    likelyCause:
      "CString guarantees one appended trailing NUL and no interior NUL so Rust's stored length cannot disagree with the length observed by C.",
    firstCheck:
      "Inspect NulError::nul_position and recover its input bytes, then choose an API matching whether the supplied representation already includes a terminator.",
    searchTerms: [
      "Rust CString new interior NUL",
      "NulError nul_position into_vec",
      "CString first zero terminator error",
    ],
    evidence: [
      "Rust 1.98.1 interior-zero input",
      "reported byte position",
      "original bytes recovered and valid CString built",
    ],
    caseSlug: "cstring-new-rejects-interior-nul",
  },
  {
    id: "RFA-339",
    area: "concurrency-memory",
    symptom:
      "A sorted VecDeque successfully finds an item with binary search even though its ring allocation is split into two slices.",
    likelyCause:
      "VecDeque search follows its front-to-back logical index space and handles the mapping across wrapped physical storage internally.",
    firstCheck:
      "Assert the logical iteration order and both physical slices separately, then search targets around the wrap boundary without making the deque contiguous.",
    searchTerms: [
      "Rust VecDeque binary_search split storage",
      "binary search wrapped ring buffer Rust",
      "VecDeque make_contiguous before binary_search",
    ],
    evidence: [
      "Rust 1.98.1 capacity-eight wrapped deque",
      "two physical slices",
      "logical index four search result",
    ],
    caseSlug: "vecdeque-binary-search-uses-logical-order",
  },
  {
    id: "RFA-340",
    area: "ffi-targets",
    symptom:
      "BufReader reports logical position one, yet the seekable reader returned by into_inner exposes position six after read-ahead.",
    likelyCause:
      "stream_position observes the buffered reader's logical position without promising to reconcile the underlying source position before the wrapper is consumed.",
    firstCheck:
      "Force read-ahead with a small read, compare stream_position with the inner position, and explicitly seek to the current logical position before handoff.",
    searchTerms: [
      "Rust BufReader stream_position into_inner",
      "BufReader logical position underlying position",
      "rewind BufReader before into_inner",
    ],
    evidence: [
      "Rust 1.98.1 Cursor source",
      "logical position one and physical position six",
      "SeekFrom Current zero reconciliation",
    ],
    caseSlug: "bufreader-stream-position-does-not-rewind-into-inner",
  },
  {
    id: "RFA-341",
    area: "upgrades-compatibility",
    symptom:
      "A custom iterator produces Some after None, but that later value disappears when the iterator is wrapped with fuse.",
    likelyCause:
      "The Iterator contract permits resumption after None, while Fuse deliberately records the first None and makes every later result None.",
    firstCheck:
      "Call next explicitly across a Some-None-Some source sequence and represent temporary absence as an item state rather than iterator termination.",
    searchTerms: [
      "Rust iterator Some after None fuse",
      "Iterator fuse loses later values",
      "FusedIterator first None permanent",
    ],
    evidence: [
      "Rust 1.98.1 custom resumable iterator",
      "Some None Some source sequence",
      "explicit Pending item repair",
    ],
    caseSlug: "iterator-fuse-makes-first-none-permanent",
  },
  {
    id: "RFA-342",
    area: "upgrades-compatibility",
    symptom:
      "Calling i32::wrapping_shl with shift count 32 returns the original value instead of zero.",
    likelyCause:
      "wrapping_shl masks the right-hand count modulo the integer bit width rather than performing an infinite-precision shift followed by truncation.",
    firstCheck:
      "Build a boundary table for counts 31, 32, and 33, then use checked_shl when a count outside the type width must remain invalid.",
    searchTerms: [
      "Rust wrapping_shl shift 32 returns same number",
      "wrapping shift masks count Rust",
      "checked_shl vs wrapping_shl",
    ],
    evidence: [
      "Rust 1.98.1 i32 operations",
      "32 and 33 bit shift counts",
      "checked shift rejection",
    ],
    caseSlug: "wrapping-shl-masks-the-shift-count",
  },
  {
    id: "RFA-343",
    area: "upgrades-compatibility",
    symptom:
      "The wrapping absolute value of i32::MIN remains negative and violates an assumed non-negative postcondition.",
    likelyCause:
      "The exact positive magnitude of the signed minimum is outside the i32 range, so wrapping negation returns the same minimum bit pattern.",
    firstCheck:
      "Exercise MIN explicitly and choose checked_abs, saturating_abs, or unsigned_abs according to whether failure, clipping, or exact magnitude is required.",
    searchTerms: [
      "Rust wrapping_abs i32 MIN negative",
      "absolute value minimum integer Rust",
      "checked_abs saturating_abs unsigned_abs difference",
    ],
    evidence: [
      "Rust 1.98.1 i32 minimum",
      "four absolute-value policies",
      "exact unsigned magnitude",
    ],
    caseSlug: "wrapping-abs-keeps-signed-minimum-negative",
  },
  {
    id: "RFA-344",
    area: "concurrency-memory",
    symptom:
      "recv_timeout returns Disconnected immediately instead of waiting until the requested receive deadline.",
    likelyCause:
      "After all senders are dropped and buffered messages are exhausted, future delivery is impossible and the receiver can report disconnection without waiting.",
    firstCheck:
      "Compare a dropped-sender channel with a live empty channel and match Timeout and Disconnected as different lifecycle states.",
    searchTerms: [
      "Rust recv_timeout returns Disconnected immediately",
      "mpsc timeout vs disconnected",
      "Receiver recv_timeout sender dropped",
    ],
    evidence: [
      "Rust 1.98.1 standard mpsc channel",
      "all senders dropped before receive",
      "live empty channel zero timeout contrast",
    ],
    caseSlug: "recv-timeout-disconnects-before-the-deadline",
  },
  {
    id: "RFA-345",
    area: "ffi-targets",
    symptom:
      "A file opens and its bytes are readable, but fs::read_to_string fails when one stored byte is not valid UTF-8.",
    likelyCause:
      "read_to_string combines filesystem I/O with the stronger String invariant that the entire file content must be valid UTF-8.",
    firstCheck:
      "Read the file as bytes, distinguish I/O from decoding, and apply strict, lossy, legacy-encoding, or binary handling according to the format contract.",
    searchTerms: [
      "Rust fs read_to_string invalid UTF-8",
      "file valid bytes but read_to_string fails",
      "Rust read file lossy UTF-8",
    ],
    evidence: [
      "Rust 1.98.1 temporary file",
      "ASCII prefix followed by byte FF",
      "byte read and explicit lossy conversion",
    ],
    caseSlug: "fs-read-to-string-rejects-invalid-utf8",
  },
  {
    id: "RFA-346",
    area: "ffi-targets",
    symptom:
      "Reading a Unix symlink through an absolute path returns target.txt rather than the absolute target path.",
    likelyCause:
      "read_link exposes the path stored in the symlink, and a relative target gains its resolution context from the symlink's parent only when followed.",
    firstCheck:
      "Keep the link path and stored target separate, join a relative target to the link parent, and canonicalize only when current resolved identity is required.",
    searchTerms: [
      "Rust read_link returns relative path",
      "resolve relative symlink target Rust",
      "read_link vs canonicalize Rust",
    ],
    evidence: [
      "Rust 1.98.1 Unix temporary symlink",
      "stored target.txt path",
      "parent join and canonicalize repair",
    ],
    caseSlug: "read-link-returns-the-stored-relative-target",
  },
  {
    id: "RFA-347",
    area: "ffi-targets",
    symptom:
      "decode_utf16 yields an error for an unpaired surrogate and then continues to yield later valid characters.",
    likelyCause:
      "The decoder is an iterator of per-scalar Result values, so a malformed unit is an item-level error rather than mandatory whole-iterator termination.",
    firstCheck:
      "Collect the complete Ok-Err-Ok result sequence, inspect unpaired_surrogate, and make strict rejection or replacement an explicit consumer policy.",
    searchTerms: [
      "Rust decode_utf16 continues after error",
      "unpaired surrogate DecodeUtf16 iterator",
      "decode UTF-16 strict vs lossy Rust",
    ],
    evidence: [
      "Rust 1.98.1 three-code-unit input",
      "Ok Err Ok output sequence",
      "replacement-character repair policy",
    ],
    caseSlug: "decode-utf16-continues-after-an-unpaired-surrogate",
  },
  {
    id: "RFA-348",
    area: "upgrades-compatibility",
    symptom:
      "Two enum values with different payload data produce equal values from mem::discriminant.",
    likelyCause:
      "A discriminant represents only enum variant identity and deliberately excludes the fields carried by values of that variant.",
    firstCheck:
      "Compare same-variant values with different fields and use PartialEq or pattern matching when the payload belongs to the identity decision.",
    searchTerms: [
      "Rust mem discriminant ignores enum data",
      "compare enum variant without payload Rust",
      "Discriminant same variant different fields",
    ],
    evidence: [
      "Rust 1.98.1 payload enum",
      "equal same-variant discriminants",
      "derived value equality contrast",
    ],
    caseSlug: "mem-discriminant-ignores-enum-payloads",
  },
  {
    id: "RFA-349",
    area: "diagnostics-macros",
    symptom:
      "A return expression inside a closure ends the closure call while the lexically enclosing function continues execution.",
    likelyCause:
      "A closure has its own call and output location, so return targets that current closure activation rather than a surrounding function frame.",
    firstCheck:
      "Put a distinct value after the closure call, then carry the closure result into explicit outer control flow or use a short-circuiting adaptor.",
    searchTerms: [
      "Rust return inside closure outer function",
      "early return from enclosing function closure Rust",
      "closure return control flow Rust",
    ],
    evidence: [
      "Rust 1.98.1 nested closure",
      "inner return one and outer result two",
      "explicit result propagation repair",
    ],
    caseSlug: "return-inside-a-closure-returns-from-the-closure",
  },
  {
    id: "RFA-350",
    area: "concurrency-memory",
    symptom:
      "After mem::take returns the previous value, the destination contains a valid custom default state rather than the domain-empty state the caller expected.",
    likelyCause:
      "mem::take installs T::default(), while the Default trait does not promise an empty, neutral, inactive, or zero-like domain value.",
    firstCheck:
      "Inspect the type's Default implementation and use mem::replace with a named value when the replacement is a protocol state.",
    searchTerms: [
      "Rust mem take uses Default",
      "mem take value not empty",
      "mem take vs mem replace Rust",
    ],
    evidence: [
      "Rust 1.98.1 custom Default implementation",
      "ready value replaced by warming",
      "explicit empty value installed with mem::replace",
    ],
    caseSlug: "mem-take-installs-default-not-domain-empty",
  },
  {
    id: "RFA-351",
    area: "concurrency-memory",
    symptom:
      "After the greatest BinaryHeap item is lowered through PeekMut, another item becomes the root as soon as the guard leaves scope.",
    likelyCause:
      "PeekMut permits a temporary root edit and restores the BinaryHeap ordering invariant on drop, which can move the edited value down.",
    firstCheck:
      "End the PeekMut borrow in a small scope, then verify logical priority with peek or repeated pop rather than assuming the root's position is stable.",
    searchTerms: [
      "Rust BinaryHeap peek_mut drop repair",
      "BinaryHeap change maximum value",
      "PeekMut value no longer heap root",
    ],
    evidence: [
      "Rust 1.98.1 three-item BinaryHeap",
      "root changed from nine to one",
      "eight promoted after PeekMut drop",
    ],
    caseSlug: "binaryheap-peek-mut-repairs-order-on-drop",
  },
  {
    id: "RFA-352",
    area: "ffi-targets",
    symptom:
      "Calling char::escape_debug on printable non-ASCII text keeps the Unicode scalar visible instead of producing a hexadecimal escape.",
    likelyCause:
      "escape_debug targets readable Rust-style diagnostics, while escape_default and escape_unicode provide stronger escaping policies for other consumers.",
    firstCheck:
      "Compare one printable Unicode scalar, a control character, and ordinary ASCII across escape_debug, escape_default, and escape_unicode.",
    searchTerms: [
      "Rust char escape_debug Unicode not escaped",
      "escape_debug vs escape_default Rust",
      "force Unicode escape char Rust",
    ],
    evidence: [
      "Rust 1.98.1 e-acute scalar",
      "visible debug escape result",
      "default and Unicode escape contrast",
    ],
    caseSlug: "char-escape-debug-keeps-printable-unicode",
  },
  {
    id: "RFA-353",
    area: "upgrades-compatibility",
    symptom:
      "A secondary comparison with visible work runs even though Ordering::Less already determines the combined comparison result.",
    likelyCause:
      "Ordering::then selects between two Ordering values, but ordinary Rust argument evaluation computes the other value before the method runs.",
    firstCheck:
      "Attach a call counter to the secondary comparison and replace then with then_with when that work must happen only for Equal.",
    searchTerms: [
      "Rust Ordering then eager evaluation",
      "Ordering then vs then_with",
      "secondary comparison called when first not equal Rust",
    ],
    evidence: [
      "Rust 1.98.1 atomic call counter",
      "Less result with secondary call count one",
      "then_with skips and invokes closure according to equality",
    ],
    caseSlug: "ordering-then-evaluates-fallback-eagerly",
  },
  {
    id: "RFA-354",
    area: "ffi-targets",
    symptom:
      "After three bytes are read through a five-byte Take adapter, set_limit(5) permits five more bytes rather than only two.",
    likelyCause:
      "Take stores a remaining byte allowance, and set_limit replaces that counter without considering bytes already read or the previous cap.",
    firstCheck:
      "Inspect limit() after every read and distinguish an original cumulative cap from the allowance that may be read from the current position.",
    searchTerms: [
      "Rust Take set_limit remaining bytes",
      "Read take reset limit",
      "set_limit exceeds original Take limit Rust",
    ],
    evidence: [
      "Rust 1.98.1 Cursor behind Take",
      "three-byte read leaves limit two",
      "set_limit five permits bytes d through h",
    ],
    caseSlug: "read-take-set-limit-replaces-remaining-budget",
  },
  {
    id: "RFA-355",
    area: "ffi-targets",
    symptom:
      "BufReader::buffer returns an empty slice immediately after construction even though the underlying reader contains bytes.",
    likelyCause:
      "buffer() only observes bytes already cached and deliberately does not fill an empty buffer by reading from the wrapped source.",
    firstCheck:
      "Compare buffer() before I/O with fill_buf(), which may consult the source and can distinguish an unfilled cache from EOF at that moment.",
    searchTerms: [
      "Rust BufReader buffer empty not EOF",
      "BufReader buffer does not fill",
      "buffer vs fill_buf Rust",
    ],
    evidence: [
      "Rust 1.98.1 in-memory Cursor source",
      "empty buffer immediately after construction",
      "fill_buf exposes ready and later confirms EOF",
    ],
    caseSlug: "bufreader-buffer-empty-does-not-prove-eof",
  },
  {
    id: "RFA-356",
    area: "concurrency-memory",
    symptom:
      "Builder::spawn panics for a configured thread name containing an interior NUL instead of returning an io::Error.",
    likelyCause:
      "Rust String permits U+0000, but named-thread creation has a documented no-NUL precondition enforced as a panic at spawn time.",
    firstCheck:
      "Validate untrusted names before Builder::name, then handle configuration rejection, OS spawn errors, and joined worker panics separately.",
    searchTerms: [
      "Rust thread name null byte panic",
      "Builder spawn NUL thread name",
      "thread Builder spawn io Result still panics",
    ],
    evidence: [
      "Rust 1.98.1 named thread Builder",
      "interior NUL accepted by String",
      "spawn panic separated from OS io::Result",
    ],
    caseSlug: "thread-builder-name-interior-nul-panics-on-spawn",
  },
  {
    id: "RFA-357",
    area: "concurrency-memory",
    symptom:
      "A second OnceLock::set returns Err containing the second owned value while the first value remains stored.",
    likelyCause:
      "Only one initialization can win, and set preserves ownership of a rejected candidate by returning it when the cell is already initialized.",
    firstCheck:
      "Perform two deterministic sets, inspect the Err payload and current cell value, and decide explicitly how losing resources are handled.",
    searchTerms: [
      "Rust OnceLock set returns Err value",
      "OnceLock second set recover candidate",
      "OnceLock set already initialized semantics",
    ],
    evidence: [
      "Rust 1.98.1 local OnceLock",
      "first value retained",
      "second String recovered from Err",
    ],
    caseSlug: "oncelock-set-returns-the-rejected-value",
  },
  {
    id: "RFA-358",
    area: "concurrency-memory",
    symptom:
      "thread::scope panics after the scope closure finishes because an automatically joined child thread panicked.",
    likelyCause:
      "A scope owns completion of all borrowed child threads and propagates a panic from any child that was left for automatic joining.",
    firstCheck:
      "Compare an ignored scoped handle with a manually joined handle and choose whether the parent propagates or translates each child failure.",
    searchTerms: [
      "Rust thread scope child panic propagates",
      "scoped thread automatically joined panic",
      "handle panic inside thread scope",
    ],
    evidence: [
      "Rust 1.98.1 scoped child thread",
      "unjoined panic propagated by scope",
      "manual join observes failure",
    ],
    caseSlug: "thread-scope-propagates-unjoined-child-panics",
  },
  {
    id: "RFA-359",
    area: "concurrency-memory",
    symptom:
      "Receiver::try_iter yields None while a channel is empty and then yields Some after its still-connected sender publishes.",
    likelyCause:
      "TryIter represents current non-blocking availability as iterator termination and does not promise that its first None is permanent.",
    firstCheck:
      "Observe None before a deterministic send, call next again, and use try_recv when Empty versus Disconnected affects lifecycle decisions.",
    searchTerms: [
      "Rust Receiver try_iter Some after None",
      "mpsc try_iter empty not disconnected",
      "TryIter resumable iterator Rust",
    ],
    evidence: [
      "Rust 1.98.1 live channel",
      "None then send then Some seven",
      "try_recv Empty and Disconnected distinction",
    ],
    caseSlug: "receiver-try-iter-can-resume-after-none",
  },
  {
    id: "RFA-360",
    area: "concurrency-memory",
    symptom:
      "After one value is taken from BinaryHeap::drain and the iterator is dropped, the heap contains zero elements rather than the two unvisited values.",
    likelyCause:
      "drain commits to clearing the complete heap, and its iterator owns and drops every removed value that the caller does not consume.",
    firstCheck:
      "Consume one drain item in a small scope, inspect the heap afterward, and use pop instead when the unvisited priority queue must survive.",
    searchTerms: [
      "Rust BinaryHeap drain dropped early",
      "BinaryHeap drain removes all elements",
      "keep remainder after draining heap",
    ],
    evidence: [
      "Rust 1.98.1 three-item BinaryHeap",
      "one Drain item consumed",
      "empty heap after iterator drop and pop contrast",
    ],
    caseSlug: "binaryheap-drain-drops-unconsumed-elements",
  },
  {
    id: "RFA-361",
    area: "ffi-targets",
    symptom:
      "String::split_off(1) panics on éclair because byte one lies inside the two-byte UTF-8 encoding of é.",
    likelyCause:
      "split_off accepts a byte offset while both owned results must preserve String's valid UTF-8 invariant at the partition boundary.",
    firstCheck:
      "Name the coordinate unit, validate with is_char_boundary, or derive the byte offset from char_indices when the requirement is a scalar position.",
    searchTerms: [
      "Rust String split_off char boundary panic",
      "split String at character index Rust",
      "String split_off UTF-8 byte index",
    ],
    evidence: [
      "Rust 1.98.1 éclair input",
      "byte offset one inside é",
      "char_indices derives byte offset two",
    ],
    caseSlug: "string-split-off-needs-a-utf8-boundary",
  },
  {
    id: "RFA-362",
    area: "concurrency-memory",
    symptom:
      "A BTreeMap retain predicate observes keys 1, 2, 3 even though the entries were inserted in the order 3, 1, 2.",
    likelyCause:
      "BTreeMap::retain explicitly traverses entries in ascending K::Ord order and does not store insertion history as an ordering dimension.",
    firstCheck:
      "Insert keys in a deliberately scrambled sequence and record callback visits before relying on a stateful retention rule.",
    searchTerms: [
      "Rust BTreeMap retain order",
      "BTreeMap retain ascending key order",
      "retain predicate insertion order Rust",
    ],
    evidence: [
      "Rust 1.98.1 BTreeMap",
      "insertion sequence three one two",
      "predicate visit sequence one two three",
    ],
    caseSlug: "btreemap-retain-visits-ascending-keys",
  },
  {
    id: "RFA-363",
    area: "upgrades-compatibility",
    symptom:
      "Calling 42_i32.unbounded_shl(32) returns zero rather than masking the count to zero and returning 42.",
    likelyCause:
      "unbounded_shl preserves an excessive shift distance, so every bit leaves the fixed-width result once the count reaches i32::BITS.",
    firstCheck:
      "Build a boundary table at 31, 32, and 33 and compare unbounded, checked, wrapping, and strict policies before choosing one.",
    searchTerms: [
      "Rust unbounded_shl shift count 32",
      "unbounded shift vs wrapping shift Rust",
      "large integer shift returns zero Rust",
    ],
    evidence: [
      "Rust 1.98.1 i32 operations",
      "counts at 31 32 and 33",
      "checked and wrapping policy contrast",
    ],
    caseSlug: "unbounded-shl-shifts-out-large-counts",
  },
  {
    id: "RFA-364",
    area: "upgrades-compatibility",
    symptom:
      "i32::MIN.overflowing_div(-1) returns (i32::MIN, true), not a zero placeholder or a representable positive quotient.",
    likelyCause:
      "The mathematical quotient is one beyond i32::MAX, so overflowing_div returns the wrapped dividend plus an overflow flag.",
    firstCheck:
      "Test MIN divided by negative one separately from a zero divisor, because overflowing_div reports the first but still panics on the second.",
    searchTerms: [
      "Rust overflowing_div MIN minus one",
      "overflowing division returns MIN true",
      "does overflowing_div panic on zero",
    ],
    evidence: [
      "Rust 1.98.1 i32 operations",
      "MIN divided by negative one",
      "checked division and zero-divisor contrast",
    ],
    caseSlug: "overflowing-div-min-minus-one-returns-min",
  },
  {
    id: "RFA-365",
    area: "ffi-targets",
    symptom:
      "After Child::wait returns, child.stdin is None because Rust took and closed the piped handle before blocking for process exit.",
    likelyCause:
      "wait closes its stored ChildStdin to prevent a cycle where the child waits for EOF while the parent waits for child exit.",
    firstCheck:
      "Write complete input, decide who owns and closes every pipe, and remember that a separately taken ChildStdin is no longer closed by Child::wait.",
    searchTerms: [
      "Rust Child wait closes stdin",
      "child stdin None after wait Rust",
      "process deadlock waiting for stdin EOF",
    ],
    evidence: [
      "Rust 1.98.1 self-spawned evidence process",
      "piped ChildStdin present before wait",
      "EOF-driven child exit and absent handle afterward",
    ],
    caseSlug: "child-wait-closes-piped-stdin",
  },
  {
    id: "RFA-366",
    area: "ffi-targets",
    symptom:
      "Collecting env::vars panics after the process environment contains a Unix byte sequence that is not valid Unicode.",
    likelyCause:
      "env::vars converts platform OS strings into String during iteration and uses panic rather than a per-entry Result when conversion fails.",
    firstCheck:
      "Enumerate with vars_os, validate only values whose application contract requires Unicode, and isolate process-global mutation in tests.",
    searchTerms: [
      "Rust env vars panic invalid Unicode",
      "environment variable non UTF-8 Rust",
      "env vars vs vars_os",
    ],
    evidence: [
      "Rust 1.98.1 Unix OsString",
      "value bytes 6f 6b ff",
      "vars panic and vars_os byte recovery",
    ],
    caseSlug: "env-vars-panics-on-non-unicode-unix",
  },
  {
    id: "RFA-367",
    area: "ffi-targets",
    symptom:
      "After String::from_utf8 rejects one invalid byte, FromUtf8Error still exposes and can return the complete owned input vector.",
    likelyCause:
      "Owned UTF-8 validation can reuse the Vec allocation on success and preserves that ownership inside FromUtf8Error on failure.",
    firstCheck:
      "Inspect utf8_error before consuming the error, then call into_bytes when strict failure still needs exact input recovery or alternate decoding.",
    searchTerms: [
      "Rust String from_utf8 recover original Vec",
      "FromUtf8Error into_bytes",
      "invalid UTF-8 ownership Rust",
    ],
    evidence: [
      "Rust 1.98.1 owned byte vector",
      "invalid FF at byte two",
      "Utf8Error inspection and exact Vec recovery",
    ],
    caseSlug: "from-utf8-error-preserves-original-vector",
  },
  {
    id: "RFA-368",
    area: "diagnostics-macros",
    symptom:
      "Writing dyn Read + Write produces E0225 because both Read and Write are non-auto traits in one trait-object bound list.",
    likelyCause:
      "A trait object has one dyn-compatible base trait plus permitted auto traits and a lifetime, rather than synthesizing several ordinary method sets.",
    firstCheck:
      "Choose static generic dispatch or define one local supertrait with a blanket implementation when the runtime object must expose both capabilities.",
    searchTerms: [
      "Rust E0225 dyn Read Write",
      "only auto traits additional trait object",
      "combine two traits in dyn Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0225",
      "dyn Read plus Write rejection",
      "local supertrait and blanket implementation repair",
    ],
    caseSlug: "dyn-trait-object-allows-one-non-auto-trait",
  },
  {
    id: "RFA-369",
    area: "diagnostics-macros",
    symptom:
      "A trait containing async fn compiles for static dispatch but produces E0038 when code tries to create &dyn HealthCheck.",
    likelyCause:
      "Each async implementation returns a hidden future type, while one ordinary vtable slot needs a common dynamically dispatchable return representation.",
    firstCheck:
      "Keep generic dispatch when types are known, or return an explicit pinned boxed dyn Future when runtime heterogeneity justifies type erasure.",
    searchTerms: [
      "Rust async fn trait not dyn compatible E0038",
      "async trait object vtable",
      "Box dyn async trait method Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0038",
      "async method hidden Future diagnostic",
      "Pin Box dyn Future repair",
    ],
    caseSlug: "async-trait-method-is-not-dyn-compatible",
  },
  {
    id: "RFA-370",
    area: "diagnostics-macros",
    symptom:
      "Adding an associated constant to a trait makes `&dyn Trait` fail even though every implementation supplies the constant.",
    likelyCause:
      "A dyn-compatible trait cannot contain associated constants because a trait-object value has no supported value-level dispatch operation for selecting that implementation constant.",
    firstCheck:
      "Reduce the trait to the constant and one ordinary receiver method, then decide whether the value belongs in a dispatchable method or a separate static trait.",
    searchTerms: [
      "Rust associated const trait object E0038",
      "dyn trait associated constant not compatible",
      "replace associated const for dynamic dispatch",
    ],
    evidence: [
      "Rust 1.98.1 E0038 compile failure",
      "associated MAX constant",
      "object-safe receiver method repair",
    ],
    caseSlug: "associated-constant-makes-trait-not-dyn-compatible",
  },
  {
    id: "RFA-371",
    area: "diagnostics-macros",
    symptom:
      "A method returning Self prevents creating a trait object although another receiver method could be dispatched safely.",
    likelyCause:
      "The concrete Self type is erased behind dyn Trait, so a dispatchable method cannot promise to return that unknown concrete type by value.",
    firstCheck:
      "Mark the concrete-only method `where Self: Sized`, then verify that ordinary receiver methods remain callable through the trait object.",
    searchTerms: [
      "Rust trait method return Self dyn compatible",
      "E0038 references Self return type",
      "where Self Sized object safe method",
    ],
    evidence: [
      "Rust 1.98.1 E0038 compile failure",
      "Self return method",
      "Self Sized dispatch exclusion repair",
    ],
    caseSlug: "method-returning-self-needs-a-sized-dispatch-boundary",
  },
  {
    id: "RFA-372",
    area: "diagnostics-macros",
    symptom:
      "An explicitly numbered enum variant collides with an earlier implicit zero and rustc reports E0081.",
    likelyCause:
      "Unnumbered variants still receive discriminants, starting at zero or continuing from the previous value, so an explicit value can duplicate an implicit assignment.",
    firstCheck:
      "Write down every effective discriminant, including implicit ones, and give protocol-facing variants unique explicit values.",
    searchTerms: [
      "Rust E0081 duplicate enum discriminant implicit",
      "enum variant same discriminant Rust",
      "explicit enum value collides with implicit zero",
    ],
    evidence: [
      "Rust 1.98.1 E0081 compile failure",
      "implicit zero and explicit zero",
      "unique repr u8 values repair",
    ],
    caseSlug: "explicit-enum-discriminant-can-collide-with-implicit-zero",
  },
  {
    id: "RFA-373",
    area: "diagnostics-macros",
    symptom:
      "A repr(u8) enum variant after an explicit value of 255 fails with E0370 instead of wrapping to zero.",
    likelyCause:
      "An implicit discriminant is the preceding discriminant plus one, and that value must remain representable by the enum's primitive representation.",
    firstCheck:
      "Inspect the variant immediately before the reported one and calculate its successor inside the declared repr range.",
    searchTerms: [
      "Rust E0370 enum discriminant overflow",
      "repr u8 enum after 255",
      "implicit enum discriminant does not wrap",
    ],
    evidence: [
      "Rust 1.98.1 E0370 compile failure",
      "repr u8 value 255 followed by implicit variant",
      "254 and 255 repair",
    ],
    caseSlug: "implicit-enum-discriminant-does-not-wrap-after-u8-max",
  },
  {
    id: "RFA-374",
    area: "ffi-targets",
    symptom:
      "Adding repr(C) to an empty Rust enum produces E0084 instead of creating a C-compatible uninhabited type.",
    likelyCause:
      "The C representation is unsupported for a zero-variant enum because C has no corresponding by-value enum representation with no valid values.",
    firstCheck:
      "Separate the Rust need for an uninhabited type from the FFI need for an opaque handle or a concrete tagged representation.",
    searchTerms: [
      "Rust E0084 zero variant enum repr C",
      "repr C empty enum unsupported",
      "Rust uninhabited type FFI opaque",
    ],
    evidence: [
      "Rust 1.98.1 E0084 compile failure",
      "zero-variant repr C enum",
      "Rust-only uninhabited enum repair",
    ],
    caseSlug: "repr-c-does-not-support-a-zero-variant-enum",
  },
  {
    id: "RFA-375",
    area: "diagnostics-macros",
    symptom:
      "A generic type alias that expands to u64 fails with E0091 because its type parameter is absent from the aliased type.",
    likelyCause:
      "A type alias creates another name for its right-hand type and cannot preserve a compile-time distinction through a parameter that does not occur there.",
    firstCheck:
      "Expand the alias mentally and either remove the unused parameter or introduce a real wrapper carrying PhantomData.",
    searchTerms: [
      "Rust E0091 unused type parameter type alias",
      "generic type alias parameter never used",
      "typed ID alias PhantomData Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0091 compile failure",
      "CacheKey T alias to u64",
      "newtype with PhantomData repair",
    ],
    caseSlug: "type-alias-cannot-carry-an-unused-generic-identity",
  },
  {
    id: "RFA-376",
    area: "diagnostics-macros",
    symptom:
      "A local variable annotation using impl Iterator fails with E0562 even though the same impl Trait syntax works in a function return type.",
    likelyCause:
      "Stable impl Trait introduces opaque types only in supported function argument and return positions, not as a general placeholder in local type annotations.",
    firstCheck:
      "Remove the local annotation to use inference, name the concrete type, or choose a trait object when runtime type erasure is actually required.",
    searchTerms: [
      "Rust E0562 impl Trait variable binding",
      "impl Iterator local variable type",
      "impl Trait only arguments return types",
    ],
    evidence: [
      "Rust 1.98.1 E0562 compile failure",
      "local impl Iterator annotation",
      "inference and Box dyn repairs",
    ],
    caseSlug: "impl-trait-is-not-a-local-variable-type-placeholder",
  },
  {
    id: "RFA-377",
    area: "upgrades-compatibility",
    symptom:
      "Calling unbounded_shr on a negative i32 with count 32 returns minus one rather than zero.",
    likelyCause:
      "Right shift of a signed negative integer is arithmetic and extends the sign bit, so an unbounded shift that removes every original bit leaves all one bits.",
    firstCheck:
      "Compare positive, negative, checked, and unsigned right shifts at exactly i32::BITS before choosing the required signedness policy.",
    searchTerms: [
      "Rust unbounded_shr negative returns -1",
      "signed right shift 32 Rust",
      "arithmetic vs logical unbounded shift Rust",
    ],
    evidence: [
      "Rust 1.98.1 signed integer operations",
      "negative i32 shifted by 32",
      "checked and unsigned policy contrast",
    ],
    caseSlug: "unbounded-shr-sign-extends-negative-integers",
  },
  {
    id: "RFA-378",
    area: "upgrades-compatibility",
    symptom:
      "i32::MIN.overflowing_rem(-1) returns numerical remainder zero together with an overflow flag of true.",
    likelyCause:
      "The remainder belongs to the exceptional signed division pair whose quotient is not representable, and the overflowing API reports that arithmetic overflow even though zero itself fits.",
    firstCheck:
      "Exercise the MIN and minus-one pair explicitly and choose whether checked rejection or the overflowing result-and-flag contract matches the caller.",
    searchTerms: [
      "Rust overflowing_rem MIN -1 true",
      "integer remainder overflow flag zero Rust",
      "checked_rem i32 MIN minus one",
    ],
    evidence: [
      "Rust 1.98.1 i32 operations",
      "MIN remainder minus one yields zero true",
      "ordinary and checked remainder contrast",
    ],
    caseSlug: "overflowing-rem-reports-the-min-minus-one-pair",
  },
  {
    id: "RFA-379",
    area: "ffi-targets",
    symptom:
      "env::join_paths returns JoinPathsError when one Unix path contains a colon instead of escaping the colon.",
    likelyCause:
      "A platform path-list format has no quoting or escaping layer in this API, so an element containing the platform separator cannot be represented losslessly.",
    firstCheck:
      "Run join_paths on each untrusted element and preserve the structured list until the final environment-variable boundary.",
    searchTerms: [
      "Rust join_paths colon JoinPathsError",
      "env join_paths path separator error",
      "Rust PATH element contains colon",
    ],
    evidence: [
      "Rust 1.98.1 Unix env path list",
      "colon inside one element",
      "split_paths round-trip repair",
    ],
    caseSlug: "join-paths-rejects-an-element-containing-the-list-separator",
  },
  {
    id: "RFA-380",
    area: "diagnostics-macros",
    symptom:
      "A trait containing only an ordinary receiver method cannot become dyn Trait because Sized is declared as a supertrait.",
    likelyCause:
      "Every trait object is dynamically sized, while a Sized supertrait requires every implementer and every use of Self to have a compile-time known size.",
    firstCheck:
      "Remove the trait-wide Sized bound and apply `where Self: Sized` only to operations that genuinely require a concrete sized implementer.",
    searchTerms: [
      "Rust Sized supertrait not dyn compatible",
      "E0038 trait requires Self Sized",
      "move Sized bound from trait to method",
    ],
    evidence: [
      "Rust 1.98.1 E0038 compile failure",
      "trait-wide Sized supertrait",
      "method-local Sized repair",
    ],
    caseSlug: "sized-supertrait-excludes-all-trait-objects",
  },
  {
    id: "RFA-381",
    area: "diagnostics-macros",
    symptom:
      "A trait associated function with no self receiver prevents creating a trait object even though dynamic code never calls that function.",
    likelyCause:
      "A receiver-free function gives a trait object no value through which to choose an implementation, unless the function is explicitly excluded from dynamic dispatch.",
    firstCheck:
      "Decide whether the function needs a receiver; otherwise add `where Self: Sized` and call it through a concrete implementation type.",
    searchTerms: [
      "Rust trait associated function no self E0038",
      "static trait method not dyn compatible",
      "associated function where Self Sized trait object",
    ],
    evidence: [
      "Rust 1.98.1 E0038 compile failure",
      "receiver-free version function",
      "Self Sized exclusion repair",
    ],
    caseSlug: "receiver-free-trait-function-needs-self-sized-for-dyn",
  },
  {
    id: "RFA-382",
    area: "diagnostics-macros",
    symptom:
      "A trait method returning impl Iterator works generically but makes the trait unavailable as dyn Trait.",
    likelyCause:
      "Return-position impl Trait creates an opaque concrete return type selected by each implementation, which the trait object's dispatch surface cannot name as one result type.",
    firstCheck:
      "Replace the opaque return with a boxed trait object, an associated type for static use, or a concrete iterator representation according to the API boundary.",
    searchTerms: [
      "Rust impl Trait return method not dyn compatible",
      "E0038 RPITIT trait object",
      "trait method impl Iterator Box dyn Iterator",
    ],
    evidence: [
      "Rust 1.98.1 E0038 compile failure",
      "receiver method returning impl Iterator",
      "boxed iterator repair",
    ],
    caseSlug: "return-position-impl-trait-method-is-not-dyn-compatible",
  },
  {
    id: "RFA-383",
    area: "diagnostics-macros",
    symptom:
      "Using Self as a type argument of a supertrait makes an otherwise empty trait fail dyn compatibility.",
    likelyCause:
      "The supertrait instantiation depends on the erased concrete Self type, so one dyn Trait interface cannot name the required inherited trait relationship.",
    firstCheck:
      "Reduce the supertrait argument to Self, then redesign the relationship so the dynamic supertrait does not depend on the erased implementer type.",
    searchTerms: [
      "Rust dyn trait Self type argument supertrait",
      "E0038 uses Self as type parameter",
      "trait object generic supertrait Self",
    ],
    evidence: [
      "Rust 1.98.1 E0038 compile failure",
      "Tagged Self supertrait",
      "non-generic dyn-compatible supertrait repair",
    ],
    caseSlug: "self-as-supertrait-type-argument-breaks-dyn-compatibility",
  },
  {
    id: "RFA-384",
    area: "diagnostics-macros",
    symptom:
      "A trait method receiving self as Rc<Box<Self>> makes the trait not dyn compatible although Rc<Self> is supported.",
    likelyCause:
      "Dyn dispatch supports a defined set of receiver forms and transparent Pin wrapping, but arbitrary nesting such as Rc<Box<Self>> cannot locate the trait-object metadata correctly.",
    firstCheck:
      "Flatten the receiver to a supported form such as Rc<Self>, Box<Self>, a reference, or Pin around one supported pointer shape.",
    searchTerms: [
      "Rust Rc Box Self receiver not dyn compatible",
      "E0038 self parameter cannot be dispatched",
      "trait object supported receiver types Rc Self",
    ],
    evidence: [
      "Rust 1.98.1 E0038 compile failure",
      "nested Rc Box Self receiver",
      "direct Rc Self repair",
    ],
    caseSlug: "nested-rc-box-self-receiver-cannot-be-dyn-dispatched",
  },
  {
    id: "RFA-385",
    area: "diagnostics-macros",
    symptom:
      "Method-call syntax reports E0034 when two implemented traits contribute the same method name and receiver signature.",
    likelyCause:
      "The receiver type satisfies both trait candidates, while method-call syntax contains no information selecting which trait's behavior the caller intends.",
    firstCheck:
      "Read every candidate in the diagnostic and use trait-qualified or fully qualified syntax at the semantic choice point.",
    searchTerms: [
      "Rust E0034 multiple applicable items method",
      "two traits same method name disambiguate",
      "fully qualified syntax trait method Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0034 compile failure",
      "Left and Right label methods",
      "two explicit trait selections",
    ],
    caseSlug: "two-traits-with-the-same-method-need-explicit-selection",
  },
  {
    id: "RFA-386",
    area: "diagnostics-macros",
    symptom:
      "Calling a receiver-free function as Trait::create reports E0790 even when only one implementation currently exists.",
    likelyCause:
      "A trait declaration defines a family of implementation functions, and the bare trait path does not select which implementing type owns the call.",
    firstCheck:
      "Supply the implementation with `<Type as Trait>::function()` or move genuinely universal behavior into a free function.",
    searchTerms: [
      "Rust E0790 cannot call associated function on trait",
      "Trait create specify impl type",
      "fully qualified trait static method",
    ],
    evidence: [
      "Rust 1.98.1 E0790 compile failure",
      "one existing Factory implementation",
      "fully qualified implementation path repair",
    ],
    caseSlug: "bare-trait-path-cannot-select-an-associated-function-implementation",
  },
  {
    id: "RFA-387",
    area: "diagnostics-macros",
    symptom:
      "Self::Item is ambiguous inside a trait inheriting two supertraits that both define an Item associated type.",
    likelyCause:
      "Associated-type names occupy separate trait namespaces, and the short projection does not identify whether Left::Item or Right::Item is intended.",
    firstCheck:
      "List every trait defining the associated name and write the projection explicitly as `<Self as ChosenTrait>::Item`.",
    searchTerms: [
      "Rust E0221 ambiguous associated type supertraits",
      "Self Item two traits same associated type",
      "fully qualified associated type projection",
    ],
    evidence: [
      "Rust 1.98.1 E0221 compile failure",
      "two Item supertrait declarations",
      "qualified Left and Right projections",
    ],
    caseSlug: "same-named-supertrait-associated-types-need-qualified-projections",
  },
  {
    id: "RFA-388",
    area: "upgrades-compatibility",
    symptom:
      "overflowing_shr with count 32 returns the original i32 value and an overflow flag rather than shifting every bit out.",
    likelyCause:
      "The overflowing shift masks the count to compute its value like wrapping_shr, while its boolean separately reports that the original count exceeded the width.",
    firstCheck:
      "Assert both tuple fields at counts around i32::BITS and compare checked, wrapping, unbounded, and overflowing policies.",
    searchTerms: [
      "Rust overflowing_shr count 32 original value",
      "overflowing shift masks count and true",
      "checked wrapping unbounded overflowing shr",
    ],
    evidence: [
      "Rust 1.98.1 i32 operations",
      "negative value shifted by width",
      "four shift policy comparison",
    ],
    caseSlug: "overflowing-shr-masks-the-count-and-reports-it",
  },
  {
    id: "RFA-389",
    area: "ffi-targets",
    symptom:
      "OsString::into_string returns Err with the original owned value when Unix bytes are not valid UTF-8.",
    likelyCause:
      "Operating-system strings can represent platform-native data outside Rust String's UTF-8 invariant, so strict conversion must preserve ownership on failure.",
    firstCheck:
      "Match the Result, retain the Err OsString for native operations, and use lossy rendering only when replacement is acceptable for display.",
    searchTerms: [
      "Rust OsString into_string returns original Err",
      "convert OsString invalid UTF-8 preserve",
      "OsString into String failure Unix",
    ],
    evidence: [
      "Rust 1.98.1 Unix OsString bytes",
      "invalid FF suffix",
      "Err ownership and lossy display contrast",
    ],
    caseSlug: "osstring-into-string-preserves-the-value-on-utf8-failure",
  },
  {
    id: "RFA-390",
    area: "concurrency-memory",
    symptom:
      "An overlapping slice copy produces memmove-style output instead of repeatedly copying values already overwritten earlier in the loop.",
    likelyCause:
      "slice::copy_within defines overlap-safe copying as if through temporary storage, so source identity is preserved across the complete operation.",
    firstCheck:
      "Draw source and destination ranges on the original slice and compare the result with memmove semantics rather than a hand-written forward loop.",
    searchTerms: [
      "Rust slice copy_within overlapping ranges",
      "copy_within memmove semantics Rust",
      "overlap copy produces unexpected array",
    ],
    evidence: [
      "Rust 1.98.1 five-element array",
      "overlapping zero-to-three copy at index two",
      "original-source result assertion",
    ],
    caseSlug: "slice-copy-within-uses-memmove-overlap-semantics",
  },
  {
    id: "RFA-391",
    area: "concurrency-memory",
    symptom:
      "Vec::extend_from_within appends one clone of the selected range and does not recursively include elements appended during the operation.",
    likelyCause:
      "The source range is resolved against the vector's pre-extension contents, then those selected elements are cloned into a newly appended suffix.",
    firstCheck:
      "Write down the original indexed range and expected final length before interpreting appended items as part of the source.",
    searchTerms: [
      "Rust Vec extend_from_within source range",
      "extend_from_within recursive append",
      "clone Vec range to end Rust",
    ],
    evidence: [
      "Rust 1.98.1 three-element Vec",
      "source range zero through two",
      "single two-element cloned suffix",
    ],
    caseSlug: "vec-extend-from-within-clones-the-original-range-once",
  },
  {
    id: "RFA-392",
    area: "upgrades-compatibility",
    symptom:
      "skip_while keeps a later value that satisfies the original skip predicate and stops invoking the predicate after its first false result.",
    likelyCause:
      "skip_while models one prefix boundary: once a value ends the skipped prefix, the adaptor becomes a pass-through iterator for every remaining item.",
    firstCheck:
      "Count predicate calls on a true-false-true sequence and use filter when the condition must be applied globally.",
    searchTerms: [
      "Rust skip_while predicate stops called",
      "skip_while later matching value kept",
      "skip_while versus filter Rust",
    ],
    evidence: [
      "Rust 1.98.1 three-item iterator",
      "true false true predicate sequence",
      "two predicate calls and filter contrast",
    ],
    caseSlug: "iterator-skip-while-tests-only-one-prefix",
  },
  {
    id: "RFA-393",
    area: "upgrades-compatibility",
    symptom:
      "Peekable::next_if returns None for a rejected predicate but the same next element appears on the following next call.",
    likelyCause:
      "next_if conditionally consumes the peeked element only on acceptance; rejection leaves iterator state unchanged after the internal peek.",
    firstCheck:
      "Call peek and next immediately after a rejected next_if before assuming None means the item was discarded.",
    searchTerms: [
      "Rust Peekable next_if rejected item",
      "next_if returns None does it consume",
      "conditional consume iterator Rust",
    ],
    evidence: [
      "Rust 1.98.1 two-item Peekable",
      "predicate rejects first value",
      "first value remains then next_if_eq consumes second",
    ],
    caseSlug: "peekable-next-if-leaves-a-rejected-item-in-place",
  },
  {
    id: "RFA-394",
    area: "concurrency-memory",
    symptom:
      "Drop counters remain zero immediately after mem::replace even though one value was removed and another installed.",
    likelyCause:
      "mem::replace moves the old value out and the new value into the destination without dropping either; destruction follows their later ownership paths.",
    firstCheck:
      "Give both values visible destructors and observe the counter before replacement, after replacement, and after dropping each owner.",
    searchTerms: [
      "Rust mem replace does not drop values",
      "mem replace Drop timing",
      "replace old value destructor Rust",
    ],
    evidence: [
      "Rust 1.98.1 custom Drop counter",
      "zero drops during replacement",
      "separate old and destination destruction",
    ],
    caseSlug: "mem-replace-moves-without-dropping-either-value",
  },
  {
    id: "RFA-395",
    area: "upgrades-compatibility",
    symptom:
      "array::from_fn invokes its stateful closure for indices zero through length-minus-one rather than in reverse or unspecified order.",
    likelyCause:
      "The standard function documents forward ascending construction order, allowing later elements to depend on state produced for earlier indices.",
    firstCheck:
      "Record every supplied index and assert both the visit sequence and final array rather than inferring order from output alone.",
    searchTerms: [
      "Rust array from_fn order",
      "array from_fn calls closure ascending",
      "stateful array construction Rust",
    ],
    evidence: [
      "Rust 1.98.1 four-element array",
      "recorded closure indices",
      "zero one two three visit order",
    ],
    caseSlug: "array-from-fn-calls-the-closure-in-ascending-index-order",
  },
  {
    id: "RFA-396",
    area: "concurrency-memory",
    symptom:
      "sort_by_cached_key calls an observable key function three times for three elements instead of repeating it during comparisons.",
    likelyCause:
      "Unlike sort_by_key, the cached variant computes at most one key per element, stores those keys temporarily, and sorts using the cached results.",
    firstCheck:
      "Count key-function calls separately from comparison results and include key allocation cost in the choice of sorting API.",
    searchTerms: [
      "Rust sort_by_cached_key called once",
      "sort_by_key versus cached key calls",
      "expensive sort key Rust",
    ],
    evidence: [
      "Rust 1.98.1 three-element Vec",
      "shared key-call counter",
      "three calls and sorted result",
    ],
    caseSlug: "sort-by-cached-key-evaluates-each-key-at-most-once",
  },
  {
    id: "RFA-397",
    area: "upgrades-compatibility",
    symptom:
      "Iterator::cmp determines ordering at the first unequal pair and leaves later items unconsumed in both borrowed iterators.",
    likelyCause:
      "Lexicographic comparison short-circuits as soon as ordering is known, consuming the decisive pair but not traversing irrelevant suffixes.",
    firstCheck:
      "Compare through by_ref and inspect both iterator remainders after placing a mismatch before visible sentinel values.",
    searchTerms: [
      "Rust Iterator cmp stops early remainder",
      "iterator lexicographic comparison consumes",
      "Iterator cmp short circuit Rust",
    ],
    evidence: [
      "Rust 1.98.1 paired iterators",
      "mismatch at second pair",
      "third values remain on both sides",
    ],
    caseSlug: "iterator-cmp-leaves-suffixes-after-the-first-mismatch",
  },
  {
    id: "RFA-398",
    area: "upgrades-compatibility",
    symptom:
      "Iterator::next_chunk produces E0658 on stable Rust 1.98.1 even though its documentation describes partial-item preservation.",
    likelyCause:
      "The API remains behind the iter_next_chunk feature gate on this stable toolchain; documentation presence does not imply stable availability.",
    firstCheck:
      "Check the stability badge for the pinned toolchain and replace the call with take plus Vec-to-array conversion when stable support is required.",
    searchTerms: [
      "Rust next_chunk unstable E0658 1.98",
      "iter_next_chunk stable alternative",
      "collect iterator fixed array preserve partial",
    ],
    evidence: [
      "Rust 1.98.1 E0658 compile failure",
      "iter_next_chunk feature gate",
      "stable take and Vec conversion helper",
    ],
    caseSlug: "iterator-next-chunk-remains-unstable-on-rust-1-98",
  },
  {
    id: "RFA-399",
    area: "upgrades-compatibility",
    symptom:
      "Iterator::advance_by produces E0658 on stable Rust 1.98.1 despite appearing in current standard-library documentation.",
    likelyCause:
      "The method is documented but still guarded by iter_advance_by, so stable code must express advancement and shortfall with existing Iterator::next operations.",
    firstCheck:
      "Read the stability marker for the exact toolchain and implement a small next loop when the remaining shortfall must be reported portably.",
    searchTerms: [
      "Rust advance_by unstable E0658 1.98",
      "iter_advance_by stable replacement",
      "advance iterator report remaining steps",
    ],
    evidence: [
      "Rust 1.98.1 E0658 compile failure",
      "iter_advance_by feature gate",
      "stable explicit-next loop",
    ],
    caseSlug: "iterator-advance-by-remains-unstable-on-rust-1-98",
  },
  {
    id: "RFA-400",
    area: "diagnostics-macros",
    symptom:
      "Implementing Drop only for one concrete instantiation of a generic wrapper fails with E0366 even though no other Drop implementation exists.",
    likelyCause:
      "Drop is part of the generic type's lifecycle contract and cannot be specialized for Wrapper<Special>; its implementation must use the same generic parameter sequence as the type declaration.",
    firstCheck:
      "Compare the self type in the Drop impl with the generic type declaration and decide whether every instantiation should drop or the special owner needs a separate nominal type.",
    searchTerms: [
      "Rust E0366 Drop impls cannot be specialized",
      "implement Drop for one generic type parameter",
      "Drop Wrapper Special same generic parameters",
    ],
    evidence: [
      "Rust 1.98.1 E0366 compile failure",
      "concrete generic instantiation",
      "uniform generic Drop repair",
    ],
    caseSlug: "drop-impl-cannot-be-specialized-for-one-generic-instantiation",
  },
  {
    id: "RFA-401",
    area: "ffi-targets",
    symptom:
      "A packed outer structure fails with E0588 because one nested field type declares repr(align(8)).",
    likelyCause:
      "Packing applies transitively to field placement while an aligned child requires stronger alignment, so Rust rejects the contradictory layout even when the aligned type is nested rather than annotated on the outer type.",
    firstCheck:
      "Walk every field type transitively for repr(align), then separate byte-level packed storage from the naturally aligned in-memory representation.",
    searchTerms: [
      "Rust E0588 packed type transitively repr align",
      "packed struct contains aligned type",
      "repr packed nested repr align Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0588 compile failure",
      "nested align-eight field",
      "repr C aligned repair",
    ],
    caseSlug: "packed-type-cannot-transitively-contain-repr-align",
  },
  {
    id: "RFA-402",
    area: "ffi-targets",
    symptom:
      "An enum mixing an explicit discriminant with a data-carrying variant fails E0732 until an integer representation is specified.",
    likelyCause:
      "Explicit discriminants on an enum that also has non-unit variants require a concrete primitive representation so the compiler has an unambiguous tag layout contract.",
    firstCheck:
      "Check whether any non-unit variant and any explicit discriminant coexist, then add an intentional repr integer or remove numeric discriminants if no layout contract needs them.",
    searchTerms: [
      "Rust E0732 repr inttype explicit discriminant non-unit variant",
      "data carrying enum explicit discriminant",
      "enum tuple variant discriminant repr u8",
    ],
    evidence: [
      "Rust 1.98.1 E0732 compile failure",
      "unit and tuple variants with explicit values",
      "repr u8 repair",
    ],
    caseSlug: "data-carrying-enum-explicit-discriminants-need-an-integer-repr",
  },
  {
    id: "RFA-403",
    area: "concurrency-memory",
    symptom:
      "Calling drop on a shared reference leaves the referenced value alive and its destructor counter unchanged.",
    likelyCause:
      "drop consumes exactly the value passed to it; consuming a Copy reference ends only that reference value and does not take ownership of or destroy the referent.",
    firstCheck:
      "Inspect the argument's inferred type and move the owned guard or resource into drop when immediate destruction is actually required.",
    searchTerms: [
      "Rust drop reference does nothing",
      "dropping references lint referent not dropped",
      "force destructor through shared reference Rust",
    ],
    evidence: ["Rust 1.98.1 Drop counter", "shared-reference drop call", "owned-value drop repair"],
    caseSlug: "dropping-a-reference-does-not-drop-its-referent",
  },
  {
    id: "RFA-404",
    area: "concurrency-memory",
    symptom:
      "Arc::unwrap_or_clone increments the inner Clone counter when another strong Arc owner still exists.",
    likelyCause:
      "The method moves the inner value out only for unique strong ownership; otherwise it must clone the payload so the other Arc can retain its own valid shared value.",
    firstCheck:
      "Count strong owners at the ownership boundary and test both unique and shared branches with an observable Clone implementation.",
    searchTerms: [
      "Rust Arc unwrap_or_clone when does it clone",
      "Arc unwrap_or_clone strong count",
      "extract Arc value clone only if shared",
    ],
    evidence: [
      "Rust 1.98.1 custom Clone counter",
      "two strong owners clone branch",
      "unique owner move branch",
    ],
    caseSlug: "arc-unwrap-or-clone-clones-only-when-ownership-is-shared",
  },
  {
    id: "RFA-405",
    area: "concurrency-memory",
    symptom:
      "Vec::reserve(9) reallocates a length-two vector with capacity ten although nine looks smaller than the current capacity.",
    likelyCause:
      "The additional argument is measured from current length, not current capacity, so the postcondition requires capacity for eleven total elements rather than nine total or nine spare slots.",
    firstCheck:
      "Calculate len plus additional and compare that required total with capacity before reasoning about whether allocation is necessary.",
    searchTerms: [
      "Rust Vec reserve additional relative to length",
      "Vec reserve reallocates despite spare capacity",
      "reserve argument capacity or length Rust",
    ],
    evidence: [
      "Rust 1.98.1 length-two capacity-ten Vec",
      "nine additional elements request",
      "capacity at least eleven assertion",
    ],
    caseSlug: "vec-reserve-additional-is-relative-to-length-not-capacity",
  },
  {
    id: "RFA-406",
    area: "upgrades-compatibility",
    symptom:
      "The expression (f64::MAX + f64::MAX) / 2 is infinity while f64::MAX.midpoint(f64::MAX) remains finite.",
    likelyCause:
      "The direct average overflows during its intermediate addition, whereas midpoint uses an algorithm designed to avoid overflow when the mathematical midpoint is representable.",
    firstCheck:
      "Test large same-sign operands and small opposite-sign operands before replacing midpoint with the visually simpler add-then-divide formula.",
    searchTerms: [
      "Rust f64 midpoint avoids overflow",
      "floating point average max infinity Rust",
      "f64 midpoint versus a plus b over two",
    ],
    evidence: [
      "Rust 1.98.1 f64 MAX operands",
      "infinite naive intermediate",
      "finite midpoint result",
    ],
    caseSlug: "f64-midpoint-avoids-intermediate-addition-overflow",
  },
  {
    id: "RFA-407",
    area: "ffi-targets",
    symptom:
      "Seeking a BufWriter causes the wrapped writer to receive its buffered write before it receives the seek operation.",
    likelyCause:
      "BufWriter's Seek implementation flushes buffered output before changing the underlying position so delayed bytes cannot later be written at the new offset.",
    firstCheck:
      "Instrument the inner Write and Seek calls and treat seek as a fallible flush boundary rather than only a cursor update.",
    searchTerms: [
      "Rust BufWriter seek flushes buffer",
      "BufWriter Seek write before seek",
      "buffered writer seek error flush Rust",
    ],
    evidence: [
      "Rust 1.98.1 instrumented writer",
      "buffered one-byte write",
      "write-before-seek event trace",
    ],
    caseSlug: "bufwriter-seek-flushes-buffered-bytes-before-moving",
  },
  {
    id: "RFA-408",
    area: "ffi-targets",
    symptom:
      "BufRead::read_until leaves an existing prefix in the destination and appends bytes through and including the delimiter.",
    likelyCause:
      "read_until is an accumulating buffered-read operation: its byte count covers newly appended data and includes the delimiter when one is found.",
    firstCheck:
      "Record the destination length before the call and inspect both the appended range and remaining buffered input instead of treating the method as replacement.",
    searchTerms: [
      "Rust BufRead read_until appends includes delimiter",
      "read_until does not clear Vec Rust",
      "read_until returned count delimiter byte",
    ],
    evidence: [
      "Rust 1.98.1 Cursor input",
      "prepopulated destination Vec",
      "delimiter-inclusive append and remaining suffix",
    ],
    caseSlug: "bufread-read-until-appends-and-includes-the-delimiter",
  },
  {
    id: "RFA-409",
    area: "concurrency-memory",
    symptom:
      "A Vec with capacity thirty-two returns from an into_boxed_slice and into_vec round trip with capacity equal to its three-element length.",
    likelyCause:
      "Converting Vec into Box<[T]> removes excess capacity because a boxed slice represents exactly its initialized slice rather than a growable allocation contract.",
    firstCheck:
      "Capture length and capacity before conversion, then decide whether compact fixed ownership or preservation of spare capacity is the actual requirement.",
    searchTerms: [
      "Rust Vec into_boxed_slice removes excess capacity",
      "Box slice into Vec capacity equals length",
      "Vec capacity lost boxed slice conversion",
    ],
    evidence: [
      "Rust 1.98.1 capacity-thirty-two Vec",
      "three initialized elements",
      "boxed-slice round-trip capacity three",
    ],
    caseSlug: "vec-into-boxed-slice-removes-excess-capacity",
  },
  {
    id: "RFA-410",
    area: "concurrency-memory",
    symptom:
      "Two slices begin at the same byte address but ptr::eq returns false because their lengths differ.",
    likelyCause:
      "Slice references are wide pointers and ptr::eq compares both the data address and pointer metadata; addr_eq deliberately ignores metadata when only allocation position matters.",
    firstCheck:
      "Compare addresses and metadata as separate facts, using addr_eq for the former and lengths or the full wide-pointer equality for the latter.",
    searchTerms: [
      "Rust ptr eq slices same address different length",
      "ptr addr_eq ignores metadata",
      "wide pointer equality slice metadata",
    ],
    evidence: [
      "Rust 1.98.1 shared array storage",
      "same first-element address",
      "different slice lengths and pointer equality",
    ],
    caseSlug: "ptr-eq-on-slices-compares-length-metadata-too",
  },
  {
    id: "RFA-411",
    area: "concurrency-memory",
    symptom:
      "size_of_val on a three-element u32 slice reports twelve bytes rather than one element or the size of the fat reference.",
    likelyCause:
      "The function measures the dynamically sized referent described by the reference, so slice length metadata determines how many element sizes contribute.",
    firstCheck:
      "Distinguish size_of_val(slice) from size_of_val(&slice), then assert the dynamic length-times-element-size relationship.",
    searchTerms: [
      "Rust size_of_val slice dynamic length",
      "size_of_val fat pointer or pointed data",
      "size bytes unsized slice Rust",
    ],
    evidence: [
      "Rust 1.98.1 three-u32 slice",
      "twelve-byte dynamic value",
      "reference-size contrast",
    ],
    caseSlug: "size-of-val-on-a-slice-uses-its-dynamic-length",
  },
  {
    id: "RFA-412",
    area: "concurrency-memory",
    symptom:
      "needs_drop reports false for ManuallyDrop<Tracked> even though Tracked has an observable Drop implementation.",
    likelyCause:
      "ManuallyDrop suppresses automatic drop glue for its inner value, and needs_drop describes compiler-run destruction for the queried outer type rather than resources hidden inside it.",
    firstCheck:
      "Query the exact outer type and audit the explicit initialization-state protocol that decides whether ManuallyDrop::drop must be called.",
    searchTerms: [
      "Rust needs_drop ManuallyDrop false",
      "ManuallyDrop suppresses drop glue",
      "needs_drop inner type implements Drop",
    ],
    evidence: [
      "Rust 1.98.1 custom Drop type",
      "false outer needs_drop result",
      "explicit ManuallyDrop destruction counter",
    ],
    caseSlug: "needs-drop-is-false-for-manuallydrop-of-a-drop-type",
  },
  {
    id: "RFA-413",
    area: "concurrency-memory",
    symptom:
      "NonNull::<u64>::dangling produces an aligned nonzero address instead of a null sentinel.",
    likelyCause:
      "NonNull promises non-nullness, so dangling constructs a well-aligned placeholder with no allocation behind it; the pointer is suitable only for states that never dereference it.",
    firstCheck:
      "Separate non-null and aligned representation from dereference validity, and store an explicit state flag or Option when initialization must be represented.",
    searchTerms: [
      "Rust NonNull dangling address nonzero",
      "NonNull dangling valid to dereference",
      "dangling pointer sentinel may equal valid address",
    ],
    evidence: [
      "Rust 1.98.1 NonNull u64",
      "nonzero aligned address",
      "no dereference in repaired fixture",
    ],
    caseSlug: "nonnull-dangling-is-aligned-and-non-null-but-not-dereferenceable",
  },
  {
    id: "RFA-414",
    area: "ffi-targets",
    symptom:
      "BufRead::split over a,b, yields a and b without commas and without a final empty field.",
    likelyCause:
      "The adaptor uses the delimiter as a terminator, removes it from each yielded Vec, and stops when EOF supplies zero further bytes rather than synthesizing a post-terminator field.",
    firstCheck:
      "Test leading, repeated, and trailing delimiters and choose read_until or a string splitting API if delimiter retention or trailing empty fields carry meaning.",
    searchTerms: [
      "Rust BufRead split removes delimiter trailing empty",
      "BufRead split final delimiter no empty field",
      "binary fields split delimiter Rust",
    ],
    evidence: [
      "Rust 1.98.1 Cursor a comma b comma",
      "two delimiter-free fields",
      "no synthetic trailing item",
    ],
    caseSlug: "bufread-split-removes-delimiters-and-omits-a-trailing-empty-field",
  },
  {
    id: "RFA-415",
    area: "ffi-targets",
    symptom:
      "LineWriter keeps an unterminated abc buffered but sends abc plus newline to its inner writer as soon as the newline arrives.",
    likelyCause:
      "LineWriter is line-buffered: completed newline-terminated output is forwarded promptly while an incomplete trailing line may remain buffered until more data or an explicit flush.",
    firstCheck:
      "Inspect the inner writer before and after the newline and flush the final unterminated suffix explicitly when completion must be reported.",
    searchTerms: [
      "Rust LineWriter flush newline behavior",
      "LineWriter buffers partial line",
      "line buffered writer newline inner output Rust",
    ],
    evidence: [
      "Rust 1.98.1 Vec inner writer",
      "partial line remains buffered",
      "newline forwards complete line",
    ],
    caseSlug: "linewriter-forwards-complete-lines-but-buffers-the-tail",
  },
  {
    id: "RFA-416",
    area: "ffi-targets",
    symptom:
      "BufReader::seek to its current logical position empties two unread bytes from the internal buffer, yet the next read still returns the correct byte.",
    likelyCause:
      "The Seek implementation restores the underlying reader to the logical position and discards cached lookahead so buffer contents cannot disagree with the new cursor.",
    firstCheck:
      "Record logical position, inner lookahead, and buffer length before and after seek; use seek_relative only when its buffer-preserving contract fits.",
    searchTerms: [
      "Rust BufReader seek discards buffer",
      "BufReader seek current zero clears buffer",
      "seek_relative preserve internal buffer Rust",
    ],
    evidence: [
      "Rust 1.98.1 capacity-four BufReader",
      "two consumed and two buffered bytes",
      "empty buffer followed by correct reread",
    ],
    caseSlug: "bufreader-seek-discards-lookahead-after-restoring-position",
  },
  {
    id: "RFA-417",
    area: "upgrades-compatibility",
    symptom:
      "u32::ilog(1) panics before returning a result because an integer logarithm base must be at least two.",
    likelyCause:
      "The total ilog method has preconditions for both a positive value and a valid base, while checked_ilog encodes invalid input as None instead of panicking.",
    firstCheck:
      "Treat both value and base as input constraints and use checked_ilog when either can come from data rather than a proven invariant.",
    searchTerms: [
      "Rust ilog base one panic",
      "base of integer logarithm must be at least 2",
      "checked_ilog invalid base returns None",
    ],
    evidence: ["Rust 1.98.1 u32 ilog panic", "base-one input", "checked_ilog None repair"],
    caseSlug: "integer-ilog-panics-when-the-base-is-below-two",
  },
  {
    id: "RFA-418",
    area: "diagnostics-macros",
    symptom:
      "A let-else statement whose else block evaluates to zero fails E0308 because the else branch does not diverge.",
    likelyCause:
      "Successful matching continues with newly bound variables, so a failed let-else pattern must leave the surrounding control-flow path through return, break, continue, or panic.",
    firstCheck:
      "Decide where failure should transfer control and write that divergence explicitly, or use match when both alternatives should produce values.",
    searchTerms: [
      "Rust let else clause does not diverge E0308",
      "let else expected never type found integer",
      "let else return or match Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0308 compile failure",
      "non-diverging integer else block",
      "early-return repair",
    ],
    caseSlug: "let-else-requires-a-diverging-else-branch",
  },
  {
    id: "RFA-419",
    area: "diagnostics-macros",
    symptom:
      "Breaking with value seven from while true fails E0571 even though the loop condition never becomes false.",
    likelyCause:
      "Only loop expressions and labeled breakable blocks can produce a value through break; while and for loops use break solely as a control exit without a payload.",
    firstCheck:
      "Use loop when break should construct the expression result, or assign outside and use a valueless break for conditional iteration.",
    searchTerms: [
      "Rust E0571 break with value from while loop",
      "break value only inside loop Rust",
      "while true break return value",
    ],
    evidence: [
      "Rust 1.98.1 E0571 compile failure",
      "while true with break payload",
      "loop expression repair",
    ],
    caseSlug: "break-with-a-value-is-not-allowed-in-a-while-loop",
  },
  {
    id: "RFA-420",
    area: "diagnostics-macros",
    symptom:
      "A trait method accepts every T, but one implementation adds T: Copy and fails with E0276 instead of becoming a specialised implementation.",
    likelyCause:
      "Every implementation must honour the callable contract visible through the trait; adding a bound would make one implementor reject calls that generic code is entitled to make.",
    firstCheck:
      "Compare the trait and impl bounds, then decide whether the capability is universal, removable from the algorithm, or belongs on a different method or trait parameter.",
    searchTerms: [
      "Rust E0276 impl has stricter requirements than trait",
      "impl has extra requirement T Copy",
      "trait implementation cannot add where bound",
    ],
    evidence: [
      "Rust 1.98.1 E0276 compile failure",
      "generic Copy bound added only in impl",
      "shared trait-bound repair",
    ],
    caseSlug: "impl-method-cannot-add-a-stricter-generic-bound",
  },
  {
    id: "RFA-421",
    area: "diagnostics-macros",
    symptom:
      "A trait declares a u16 input but its implementation accepts i16, producing E0053 even though the implementation could cast the value internally.",
    likelyCause:
      "Generic and dynamic callers compile against one trait signature, so each implementation must preserve its receiver and parameter types and perform representation conversions behind that boundary.",
    firstCheck:
      "Place the declaration and implementation side by side, expand aliases, and compare receiver, parameter, lifetime, generic, safety, ABI, and return types.",
    searchTerms: [
      "Rust E0053 method has incompatible type for trait",
      "trait impl expected u16 found i16",
      "trait method signature must match implementation",
    ],
    evidence: [
      "Rust 1.98.1 E0053 compile failure",
      "u16 trait versus i16 implementation",
      "exact-signature repair",
    ],
    caseSlug: "trait-method-parameter-types-must-match-the-declaration",
  },
  {
    id: "RFA-422",
    area: "diagnostics-macros",
    symptom:
      "A trait declares flush without a self receiver, but an implementation adds &self and fails with E0185 rather than receiving an instance automatically.",
    likelyCause:
      "Receiver presence distinguishes an associated function from a method and changes what identity and access capability callers must supply, so implementations cannot make that choice independently.",
    firstCheck:
      "Decide whether the operation belongs to a concrete instance, then make the receiver form match in the trait and every implementation.",
    searchTerms: [
      "Rust E0185 method has self declaration in impl not trait",
      "trait associated function implementation add self",
      "Rust static trait function versus method",
    ],
    evidence: [
      "Rust 1.98.1 E0185 compile failure",
      "receiver-free trait declaration",
      "matching associated-function repair",
    ],
    caseSlug: "trait-associated-function-cannot-become-an-instance-method",
  },
  {
    id: "RFA-423",
    area: "concurrency-memory",
    symptom:
      "A struct named Handle<T> stores only a numeric ID, so rustc reports E0392 because T does not participate in the type's fields.",
    likelyCause:
      "A generic parameter must affect representation or static semantics such as variance, ownership, auto traits, and drop checking; a name alone communicates none of these relationships.",
    firstCheck:
      "Determine whether T is accidental or whether the type owns, borrows, points to, produces, or consumes T before selecting a precise PhantomData form.",
    searchTerms: [
      "Rust E0392 type parameter T is never used",
      "unused generic parameter PhantomData",
      "typed ID generic marker Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0392 compile failure",
      "generic typed handle without T field",
      "PhantomData marker repair",
    ],
    caseSlug: "unused-generic-parameter-needs-phantomdata-or-removal",
  },
  {
    id: "RFA-424",
    area: "diagnostics-macros",
    symptom:
      "An argument written as impl Contains<impl Token> fails with E0666 because one anonymous impl Trait is nested inside another.",
    likelyCause:
      "Argument-position impl Trait introduces an anonymous generic parameter, but the inner type must be named when another generic relationship needs to refer to it.",
    firstCheck:
      "Name the inner type parameter and express the outer bound in terms of it, then decide whether a trait parameter or associated type models the relationship better.",
    searchTerms: [
      "Rust E0666 nested impl Trait is not allowed",
      "impl Trait inside generic argument",
      "impl Contains impl Token named generic",
    ],
    evidence: [
      "Rust 1.98.1 E0666 compile failure",
      "nested argument-position impl Trait",
      "named inner generic repair",
    ],
    caseSlug: "nested-impl-trait-in-argument-position-needs-a-named-generic",
  },
  {
    id: "RFA-425",
    area: "async-runtime",
    symptom:
      "An async function taking Content without writing its lifetime argument fails with E0726 even though a similar-looking ordinary function may permit elision.",
    likelyCause:
      "The anonymous future stores the lifetime-bearing argument across the interval between creation and completion, so the container's borrow relationship must be explicit in the signature.",
    firstCheck:
      "Write Content<'_> for a local anonymous relationship or name and propagate the lifetime when outputs or escaping futures depend on it.",
    searchTerms: [
      "Rust E0726 implicit elided lifetime not allowed async fn",
      "async function Content expected lifetime parameter",
      "lifetime-bearing struct async argument underscore",
    ],
    evidence: [
      "Rust 1.98.1 E0726 compile failure",
      "lifetime omitted from async container argument",
      "Content underscore lifetime repair",
    ],
    caseSlug: "async-function-argument-needs-explicit-container-lifetime",
  },
  {
    id: "RFA-426",
    area: "diagnostics-macros",
    symptom:
      "A function returning dyn Label fails with E0746 because the trait object's concrete value has no statically known size or inline return layout.",
    likelyCause:
      "Dynamic type erasure removes the concrete size, so dyn Trait must live behind pointer indirection while impl Trait keeps one hidden sized concrete return type.",
    firstCheck:
      "Identify who chooses the implementation and who owns it, then select impl Trait, a pointer to dyn Trait, a generic, or a closed enum deliberately.",
    searchTerms: [
      "Rust E0746 return type cannot be trait object without pointer indirection",
      "cannot return dyn Trait by value",
      "impl Trait versus Box dyn Trait return",
    ],
    evidence: [
      "Rust 1.98.1 E0746 compile failure",
      "bare dyn Label return type",
      "single concrete impl Trait repair",
    ],
    caseSlug: "bare-dyn-trait-cannot-be-returned-by-value",
  },
  {
    id: "RFA-427",
    area: "upgrades-compatibility",
    symptom:
      "A reference written as &Label fails with E0782 in edition 2024 because a trait used as an erased object type must be written &dyn Label.",
    likelyCause:
      "Bare trait-object syntax became a hard error in edition 2021 so dynamic dispatch is visibly distinguished from generic bounds and opaque static types.",
    firstCheck:
      "Confirm that runtime erasure was intended, add dyn behind suitable pointer indirection, and separately verify lifetimes and dyn compatibility.",
    searchTerms: [
      "Rust E0782 expected a type found a trait",
      "trait objects must include dyn keyword",
      "edition 2024 reference trait without dyn",
    ],
    evidence: [
      "Rust 1.98.1 E0782 compile failure",
      "bare trait behind shared reference",
      "explicit dyn trait-object repair",
    ],
    caseSlug: "trait-object-types-require-the-dyn-keyword",
  },
  {
    id: "RFA-428",
    area: "concurrency-memory",
    symptom:
      "Deriving Copy for a record containing Vec<u8> fails with E0204 because bitwise implicit duplication would create two owners of one allocation.",
    likelyCause:
      "Copy is an implicit bitwise-duplication contract requiring every field to be Copy and no destructor; Vec carries exclusive heap ownership and only supports deliberate cloning.",
    firstCheck:
      "Inspect every field's ownership and destruction semantics, then keep Clone, move the value, or define a distinct borrowed view rather than forcing shallow copying.",
    searchTerms: [
      "Rust E0204 trait Copy cannot be implemented field Vec",
      "derive Copy field does not implement Copy",
      "why Vec is Clone but not Copy Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0204 compile failure",
      "Vec field inside Copy derive",
      "explicit Clone repair",
    ],
    caseSlug: "copy-cannot-be-derived-when-a-field-is-not-copy",
  },
  {
    id: "RFA-429",
    area: "concurrency-memory",
    symptom:
      "Casting *const u8 directly to *const [u8] fails with E0607 because the source address contains no slice-length metadata.",
    likelyCause:
      "A slice pointer is wide and carries both an address and element count, while a thin element pointer supplies only the address and a cast cannot invent trustworthy metadata.",
    firstCheck:
      "Locate the authoritative length and prove allocation, alignment, initialization, lifetime, and aliasing invariants before constructing a raw slice pointer explicitly.",
    searchTerms: [
      "Rust E0607 cannot cast thin pointer to wide pointer",
      "convert const u8 pointer to const slice",
      "slice_from_raw_parts pointer length metadata",
    ],
    evidence: [
      "Rust 1.98.1 E0607 compile failure",
      "thin u8 pointer cast to wide slice pointer",
      "slice_from_raw_parts metadata construction",
    ],
    caseSlug: "thin-pointer-cannot-be-cast-directly-to-a-slice-pointer",
  },
  {
    id: "RFA-430",
    area: "diagnostics-macros",
    symptom:
      "Buffer<T, const N: T> fails with E0770 because the type of const parameter N refers to the preceding generic type T.",
    likelyCause:
      "Stable const parameters require an independently known concrete type so rustc can validate their values and use them as part of type identity.",
    firstCheck:
      "Give N a supported concrete type such as usize, then model any relationship to T through the trait, fields, associated constants, or constructors.",
    searchTerms: [
      "Rust E0770 type const parameters depend on generic",
      "const N T generic parameter Rust",
      "const generic value type from type parameter",
    ],
    evidence: [
      "Rust 1.98.1 E0770 compile failure",
      "const N typed by generic T",
      "concrete usize const parameter repair",
    ],
    caseSlug: "const-parameter-type-cannot-depend-on-another-generic",
  },
  {
    id: "RFA-431",
    area: "diagnostics-macros",
    symptom:
      "A trait method uses an impl Iterator parameter while its implementation spells the parameter as a named generic I, causing E0643 despite similar bounds.",
    likelyCause:
      "Argument-position impl Trait creates an anonymous parameter whose declaration form participates in exact trait item signature matching.",
    firstCheck:
      "Choose named generics or impl Trait at the trait boundary and repeat the same generic parameter structure in every implementation.",
    searchTerms: [
      "Rust E0643 expected impl Trait found generic parameter",
      "trait impl impl Trait signature mismatch",
      "named generic versus impl Trait trait method",
    ],
    evidence: [
      "Rust 1.98.1 E0643 compile failure",
      "anonymous trait parameter versus named impl generic",
      "matching named-generic repair",
    ],
    caseSlug: "trait-impl-must-match-impl-trait-parameter-form",
  },
  {
    id: "RFA-432",
    area: "diagnostics-macros",
    symptom:
      "Calling saturating_add on a binding initialised as 2 fails with E0689 because several integer types provide that method and no context selects one.",
    likelyCause:
      "Unsuffixed literals participate in inference, while method resolution needs a concrete receiver before integer fallback can settle this otherwise unconstrained expression.",
    firstCheck:
      "Annotate the binding or literal with the domain's deliberate width and signedness, then confirm that saturation is the intended overflow policy.",
    searchTerms: [
      "Rust E0689 cannot call method on ambiguous numeric type",
      "saturating_add ambiguous integer literal",
      "numeric method requires type annotation Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0689 compile failure",
      "unsuffixed integer method call",
      "explicit u8 binding repair",
    ],
    caseSlug: "numeric-method-call-needs-a-concrete-literal-type",
  },
  {
    id: "RFA-433",
    area: "concurrency-memory",
    symptom:
      "Writing unsafe impl Ready for Job fails with E0199 because Ready is a safe trait and places no unchecked safety obligation on implementors.",
    likelyCause:
      "unsafe impl acknowledges invariants declared by an unsafe trait; it is not a general warning marker for an implementation body that happens to contain difficult or unsafe code.",
    firstCheck:
      "Remove unsafe for a safe trait and audit local unsafe blocks, or document a real soundness invariant before deliberately redesigning the trait as unsafe.",
    searchTerms: [
      "Rust E0199 implementing trait is not unsafe",
      "unsafe impl safe trait error",
      "when should Rust trait be unsafe",
    ],
    evidence: [
      "Rust 1.98.1 E0199 compile failure",
      "safe Ready trait with unsafe impl",
      "ordinary safe impl repair",
    ],
    caseSlug: "safe-trait-implementation-cannot-be-marked-unsafe",
  },
  {
    id: "RFA-434",
    area: "concurrency-memory",
    symptom:
      "Implementing unsafe trait TrustedBytes with an ordinary impl fails with E0200 because the implementation has not explicitly acknowledged the trait's unchecked invariants.",
    likelyCause:
      "Safe consumers may rely on every implementation's extra-language guarantees, so the implementor must accept that proof obligation at an explicit unsafe impl boundary.",
    firstCheck:
      "Read the trait's Safety contract, audit every field, constructor, mutation, generic and auto-trait effect, then add unsafe impl only with a specific justification.",
    searchTerms: [
      "Rust E0200 trait requires unsafe impl declaration",
      "implement unsafe trait add unsafe",
      "unsafe trait safety contract implementation",
    ],
    evidence: [
      "Rust 1.98.1 E0200 compile failure",
      "ordinary impl of unsafe trait",
      "documented unsafe impl repair",
    ],
    caseSlug: "unsafe-trait-requires-an-unsafe-impl-declaration",
  },
  {
    id: "RFA-435",
    area: "diagnostics-macros",
    symptom:
      "A function declared inside outer<T> uses T in its parameter and fails with E0401 because nested items do not inherit outer generic parameters.",
    likelyCause:
      "Lexical nesting limits visibility but a nested fn remains an independent item, so unlike a closure it captures neither local values nor the enclosing generic environment.",
    firstCheck:
      "Give the inner item its own generic parameters, move reusable logic to an associated helper, or use a closure when capture is intended.",
    searchTerms: [
      "Rust E0401 can't use generic parameters from outer item",
      "nested fn use outer T",
      "inner function generic scope Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0401 compile failure",
      "inner fn refers to outer T",
      "independent inner generic repair",
    ],
    caseSlug: "nested-function-cannot-capture-an-outer-generic-parameter",
  },
  {
    id: "RFA-436",
    area: "diagnostics-macros",
    symptom:
      "Putting #[derive(Clone)] on a trait's associated type declaration fails with E0774 because derive generates implementations for concrete data declarations, not type requirements.",
    likelyCause:
      "The associated type has no fields, variants, or concrete identity at the trait declaration, so the macro has no data type for which it could generate Clone.",
    firstCheck:
      "Put Clone on the associated-type bound when universal, or on one consumer's where clause, and derive Clone on each concrete data type where declared.",
    searchTerms: [
      "Rust E0774 derive associated type",
      "derive may only apply struct enum union",
      "require associated type Clone trait",
    ],
    evidence: [
      "Rust 1.98.1 E0774 compile failure",
      "derive attribute on associated type",
      "Clone associated-type bound repair",
    ],
    caseSlug: "derive-cannot-be-applied-to-an-associated-type",
  },
  {
    id: "RFA-437",
    area: "diagnostics-macros",
    symptom:
      "Inside trait Convert<T>, declaring fn convert<T> introduces a second T and fails with E0403 because associated-item generics cannot shadow containing generics.",
    likelyCause:
      "The outer T already names the implementation-level choice, while redeclaration would hide whether the method reuses that type or introduces an independent call-level type.",
    firstCheck:
      "Remove the inner parameter when sameness is intended, or rename it and document who chooses each type when it is independent.",
    searchTerms: [
      "Rust E0403 name T already used generic parameter",
      "method generic shadows trait generic",
      "associated item duplicate generic name Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0403 compile failure",
      "trait T shadowed by method T",
      "renamed independent method generic repair",
    ],
    caseSlug: "associated-item-generic-cannot-shadow-the-traits-parameter",
  },
  {
    id: "RFA-438",
    area: "upgrades-compatibility",
    symptom:
      "Declaring const fn version inside a trait fails with E0379 on Rust 1.98.1 because stable trait function declarations cannot carry const.",
    likelyCause:
      "Const-callability and trait polymorphism are separate contracts, and ordinary stable trait syntax does not promise that an implementation can be invoked by the const evaluator.",
    firstCheck:
      "Choose an associated const for fixed data, a normal method for runtime dispatch, or a concrete inherent const fn for compile-time callers.",
    searchTerms: [
      "Rust E0379 functions in traits cannot be const",
      "const fn trait method stable Rust",
      "associated const versus const trait function",
    ],
    evidence: [
      "Rust 1.98.1 E0379 compile failure",
      "const trait function declaration",
      "ordinary associated-function repair",
    ],
    caseSlug: "trait-methods-cannot-be-declared-const-on-stable-rust",
  },
  {
    id: "RFA-439",
    area: "concurrency-memory",
    symptom:
      "Writing impl Sized for Record fails with E0322 because Sized is a compiler-known trait whose implementations follow type layout automatically.",
    likelyCause:
      "Known size is a representation fact used by code generation, so user code cannot assert it independently of the compiler's layout analysis.",
    firstCheck:
      "Remove the impl, use implicit Sized bounds normally, or write T: ?Sized behind pointer indirection when dynamically sized referents must be accepted.",
    searchTerms: [
      "Rust E0322 explicit impl Sized not permitted",
      "cannot implement Sized manually",
      "compiler automatically implements Sized trait",
    ],
    evidence: [
      "Rust 1.98.1 E0322 compile failure",
      "explicit Sized impl for record",
      "implicit compiler implementation repair",
    ],
    caseSlug: "sized-is-implemented-by-the-compiler-not-user-code",
  },
  {
    id: "RFA-440",
    area: "diagnostics-macros",
    symptom:
      "A match over State handles Ready but not Failed, so rustc emits E0004 even when today's caller happens to construct only Ready.",
    likelyCause:
      "Rust proves coverage from every value admitted by the scrutinee type; observed call paths do not remove variants from that set.",
    firstCheck:
      "List every enum variant and decide whether each deserves an explicit arm or a deliberate observable fallback.",
    searchTerms: [
      "Rust E0004 non-exhaustive patterns enum variant not covered",
      "match must cover every enum variant",
      "Rust pattern State Failed not covered",
    ],
    evidence: [
      "Rust 1.98.1 E0004 compile failure",
      "Ready-only match over two-state enum",
      "explicit Failed arm repair",
    ],
    caseSlug: "match-must-cover-every-possible-enum-variant",
  },
  {
    id: "RFA-441",
    area: "diagnostics-macros",
    symptom:
      "Writing let Some(number) = value fails with E0005 because value can be None and a plain let binding has no failure branch.",
    likelyCause:
      "Some is a refutable Option pattern, while an ordinary let statement requires a pattern that succeeds for every possible value of its expression.",
    firstCheck:
      "Use let-else for required presence, if let for optional work, match for distinct outcomes, or change the type when absence is impossible.",
    searchTerms: [
      "Rust E0005 refutable pattern in local binding",
      "let Some value pattern None not covered",
      "plain let requires irrefutable pattern Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0005 compile failure",
      "Some pattern over Option value",
      "diverging let-else repair",
    ],
    caseSlug: "plain-let-binding-requires-an-irrefutable-pattern",
  },
  {
    id: "RFA-442",
    area: "diagnostics-macros",
    symptom:
      "Matching Event::Move(x) fails with E0023 because the tuple variant was declared with two fields and the pattern supplies only one position.",
    likelyCause:
      "A tuple-variant pattern mirrors the positional product declared by its constructor, so omitted positions must be represented explicitly.",
    firstCheck:
      "Compare the pattern arity with the variant declaration, then bind each value, use underscore, or use a deliberate rest pattern.",
    searchTerms: [
      "Rust E0023 pattern has one field tuple variant has two",
      "enum tuple variant wrong number fields pattern",
      "ignore tuple variant fields Rust pattern",
    ],
    evidence: [
      "Rust 1.98.1 E0023 compile failure",
      "one-position pattern for two-field Move",
      "two-field destructuring repair",
    ],
    caseSlug: "tuple-variant-pattern-must-use-the-right-number-of-fields",
  },
  {
    id: "RFA-443",
    area: "diagnostics-macros",
    symptom:
      "A Point pattern writes x: horizontal and x: vertical, producing E0025 because the same source field is selected twice.",
    likelyCause:
      "Names left of pattern colons select source fields; two different local bindings do not permit that source field to be destructured twice.",
    firstCheck:
      "Expand shorthand, verify every left-side field name, and bind each source field only once before deriving any extra values.",
    searchTerms: [
      "Rust E0025 field bound multiple times pattern",
      "struct pattern same field twice",
      "rename struct fields while destructuring Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0025 compile failure",
      "two local names for source field x",
      "x and y field repair",
    ],
    caseSlug: "struct-field-can-be-bound-only-once-in-a-pattern",
  },
  {
    id: "RFA-444",
    area: "diagnostics-macros",
    symptom:
      "A Point pattern uses { x, z } hoping z renames y, but rustc emits E0026 because shorthand asks for a real field literally named z.",
    likelyCause:
      "Struct-pattern shorthand uses the same identifier as source field and local binding; renaming instead requires declared_field: local_name.",
    firstCheck:
      "Read the current struct declaration and put the declared field before the colon and the desired local name after it.",
    searchTerms: [
      "Rust E0026 struct does not have field named z pattern",
      "rename field destructuring y z Rust",
      "struct pattern field before colon binding after",
    ],
    evidence: [
      "Rust 1.98.1 E0026 compile failure",
      "nonexistent z shorthand field",
      "y colon z rename repair",
    ],
    caseSlug: "renamed-struct-pattern-field-goes-before-the-colon",
  },
  {
    id: "RFA-445",
    area: "diagnostics-macros",
    symptom:
      "Destructuring Record { id } fails with E0027 because payload is neither matched nor covered by an explicit rest pattern.",
    likelyCause:
      "A struct pattern must account for its complete field shape unless .. explicitly states that all remaining fields are irrelevant.",
    firstCheck:
      "Decide whether omitted fields should be reviewed individually or deliberately ignored, then bind them, use field: _, or add one rest pattern.",
    searchTerms: [
      "Rust E0027 pattern does not mention field",
      "struct destructure missing field use dot dot",
      "ignore remaining struct fields pattern Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0027 compile failure",
      "Record id pattern missing payload",
      "explicit rest-pattern repair",
    ],
    caseSlug: "struct-pattern-must-mention-fields-or-use-rest",
  },
  {
    id: "RFA-446",
    area: "diagnostics-macros",
    symptom:
      "The match arm 10..=5 fails with E0030 because an inclusive range pattern must have a lower bound no greater than its upper bound.",
    likelyCause:
      "A range pattern denotes scalar set membership rather than descending traversal, and reversed bounds describe no valid compile-time interval.",
    firstCheck:
      "Write the semantic minimum before the maximum and add tests at both boundaries and immediately outside them.",
    searchTerms: [
      "Rust E0030 lower bound range pattern larger than upper",
      "reversed inclusive range in match Rust",
      "range pattern must be non-empty",
    ],
    evidence: [
      "Rust 1.98.1 E0030 compile failure",
      "reversed 10 through 5 pattern",
      "ordered 5 through 10 repair",
    ],
    caseSlug: "range-pattern-lower-bound-cannot-exceed-upper-bound",
  },
  {
    id: "RFA-447",
    area: "diagnostics-macros",
    symptom:
      "Writing Event::new() on the left side of a match arm fails with E0164 because a function call is an expression, not a tuple variant or tuple-struct pattern.",
    likelyCause:
      "Patterns inspect supported structural forms without running arbitrary code, whereas an associated function computes and returns a value.",
    firstCheck:
      "Determine whether the name is a real variant or tuple struct; otherwise match public structure, use a constant, or put computation in a guard.",
    searchTerms: [
      "Rust E0164 expected tuple struct found associated function",
      "fn calls are not allowed in patterns",
      "match against constructor function Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0164 compile failure",
      "associated function call in arm pattern",
      "enum variant pattern repair",
    ],
    caseSlug: "function-call-syntax-cannot-be-used-as-a-match-pattern",
  },
  {
    id: "RFA-448",
    area: "diagnostics-macros",
    symptom:
      "Matching an f32 with [left, right] fails with E0529 because bracket patterns destructure arrays and slices, not arbitrary values or numeric representations.",
    likelyCause:
      "Pattern syntax follows the scrutinee's structural type, and a scalar floating-point value has no array or slice elements for bracket syntax to expose.",
    firstCheck:
      "Inspect the scrutinee type and choose array, slice, tuple, enum, or conversion operations that reflect its actual public structure.",
    searchTerms: [
      "Rust E0529 expected array or slice found type",
      "slice pattern cannot match f32",
      "bracket destructuring pattern Rust type",
    ],
    evidence: [
      "Rust 1.98.1 E0529 compile failure",
      "two-element slice pattern over f32",
      "two-element array repair",
    ],
    caseSlug: "slice-pattern-requires-an-array-or-slice-scrutinee",
  },
  {
    id: "RFA-449",
    area: "diagnostics-macros",
    symptom:
      "Using LIMIT as a match arm pattern fails with E0530 when LIMIT names a static, because it cannot become either a permitted static-value pattern or a new shadowing binding.",
    likelyCause:
      "A bare identifier pattern resolves as a constant path or introduces a binding, but a static item is runtime storage and cannot be shadowed at that pattern position.",
    firstCheck:
      "Use a const for a structural fixed value, qualify constant paths, or choose a different binding name and compare against static data in a guard.",
    searchTerms: [
      "Rust E0530 match bindings cannot shadow statics",
      "static name in match pattern Rust",
      "const versus static pattern matching",
    ],
    evidence: [
      "Rust 1.98.1 E0530 compile failure",
      "LIMIT static used as bare arm pattern",
      "LIMIT const path-pattern repair",
    ],
    caseSlug: "match-binding-cannot-shadow-a-static-item",
  },
  {
    id: "RFA-450",
    area: "diagnostics-macros",
    symptom:
      "Combining Message::Data(value) and Message::Empty with | fails with E0408 because value does not exist for every alternative sharing the arm body.",
    likelyCause:
      "Every route through an or-pattern enters one body with one statically known binding environment, but Empty cannot initialise Data's payload binding.",
    firstCheck:
      "List the bindings produced by every alternative and split arms whenever one variant does not carry an equivalent value.",
    searchTerms: [
      "Rust E0408 variable not bound in all patterns",
      "or pattern Some value or None binding",
      "match alternatives must bind same variables",
    ],
    evidence: [
      "Rust 1.98.1 E0408 compile failure",
      "Data value missing from Empty alternative",
      "separate match-arm repair",
    ],
    caseSlug: "or-pattern-alternatives-must-bind-the-same-variables",
  },
  {
    id: "RFA-451",
    area: "diagnostics-macros",
    symptom:
      "An or-pattern binds value with ref in one tuple alternative and by value in the other, producing E0409 because the shared body would receive inconsistent types and ownership.",
    likelyCause:
      "The shared arm body is type-checked once, while ref and by-value binding modes give the same name different types and ownership relationships.",
    firstCheck:
      "Write the inferred binding type for each alternative, then borrow consistently, move consistently, or split ownership policies into separate arms.",
    searchTerms: [
      "Rust E0409 variable bound inconsistently or pattern",
      "ref binding different across alternatives",
      "or pattern same binding mode Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0409 compile failure",
      "ref versus by-value alternatives",
      "consistent ref binding repair",
    ],
    caseSlug: "or-pattern-bindings-must-use-the-same-mode",
  },
  {
    id: "RFA-452",
    area: "diagnostics-macros",
    symptom:
      "The tuple pattern (value, value) fails with E0416 because a single pattern cannot introduce the same local identifier for two different positions.",
    likelyCause:
      "Identifier patterns create locals rather than logical unification variables, so repeating a name cannot express equality between two independently owned places.",
    firstCheck:
      "Give each position a unique binding and express equality with a small guard or an ordinary comparison after destructuring.",
    searchTerms: [
      "Rust E0416 identifier bound more than once pattern",
      "match tuple same variable equality",
      "repeated variable name pattern Rust guard",
    ],
    evidence: [
      "Rust 1.98.1 E0416 compile failure",
      "duplicate value tuple binding",
      "unique bindings plus guard repair",
    ],
    caseSlug: "a-pattern-cannot-bind-the-same-identifier-twice",
  },
  {
    id: "RFA-453",
    area: "diagnostics-macros",
    symptom:
      "Destructuring with Packet(value) fails with E0531 when Packet is not a tuple struct or tuple variant visible in the current scope.",
    likelyCause:
      "Parenthesised pattern syntax requires a resolvable tuple constructor, but spelling, imports, cfg state, or declaration shape does not provide one here.",
    firstCheck:
      "Navigate to the intended declaration, verify it is tuple-shaped, and use its explicit current path rather than accepting an unrelated import.",
    searchTerms: [
      "Rust E0531 cannot find tuple struct or tuple variant",
      "tuple struct pattern not in scope",
      "import enum variant for destructuring Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0531 compile failure",
      "unresolved Packet tuple pattern",
      "declared tuple-struct repair",
    ],
    caseSlug: "tuple-struct-pattern-name-must-resolve-in-scope",
  },
  {
    id: "RFA-454",
    area: "diagnostics-macros",
    symptom:
      "Matching State::Failed as if it were a unit variant fails with E0532 because Failed was declared with a String payload.",
    likelyCause:
      "A bare path describes unit shape, while the resolved variant is tuple-shaped and requires its positional payload to be bound or explicitly ignored.",
    firstCheck:
      "Read the enum declaration and mirror unit, tuple, or struct constructor form before deciding how each payload affects behaviour.",
    searchTerms: [
      "Rust E0532 expected unit variant found tuple variant",
      "match enum variant ignore payload",
      "tuple variant pattern parentheses Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0532 compile failure",
      "Failed String variant matched as unit",
      "payload destructuring repair",
    ],
    caseSlug: "tuple-variant-pattern-must-destructure-its-payload",
  },
  {
    id: "RFA-455",
    area: "diagnostics-macros",
    symptom:
      "Using Parser::default_code without parentheses as a match pattern fails with E0533 because the path names an associated function item, not a unit value or structural constant.",
    likelyCause:
      "The path identifies callable code rather than the u8 produced by executing that code, and patterns do not implicitly perform calls.",
    firstCheck:
      "Use an associated const when fixed data is the real contract, or evaluate once and compare in a guard when runtime computation is intentional.",
    searchTerms: [
      "Rust E0533 associated function match pattern",
      "expected unit struct variant or constant found function",
      "match value returned by method Rust guard",
    ],
    evidence: [
      "Rust 1.98.1 E0533 compile failure",
      "associated function item used as path pattern",
      "guarded function-call comparison repair",
    ],
    caseSlug: "an-associated-function-item-is-not-a-value-pattern",
  },
  {
    id: "RFA-456",
    area: "diagnostics-macros",
    symptom:
      "Destructuring a four-element array with [first, second] fails with E0527 because that fixed pattern describes exactly two elements.",
    likelyCause:
      "Array length is part of the type, and a bracket pattern without a rest component claims an exact arity rather than a prefix.",
    firstCheck:
      "Compare the array's N with explicit pattern positions, then preserve exactness or add .. only when remaining elements are semantically irrelevant.",
    searchTerms: [
      "Rust E0527 pattern requires elements array has",
      "destructure array wrong length",
      "match first elements fixed array dot dot",
    ],
    evidence: [
      "Rust 1.98.1 E0527 compile failure",
      "two-element pattern over four-element array",
      "prefix plus rest-pattern repair",
    ],
    caseSlug: "fixed-array-pattern-must-match-the-array-length",
  },
  {
    id: "RFA-457",
    area: "diagnostics-macros",
    symptom:
      "The pattern [first, second, third, ..] fails with E0528 against a two-element array because it requires at least three positions.",
    likelyCause:
      "A rest pattern can match zero or more remaining elements but cannot manufacture any explicit prefix or suffix positions absent from the fixed array.",
    firstCheck:
      "Count all explicit positions around .. and decide whether the input type or the algorithm's minimum-length requirement is wrong.",
    searchTerms: [
      "Rust E0528 pattern requires at least elements array has",
      "array pattern too many elements dot dot",
      "slice prefix match minimum length Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0528 compile failure",
      "three-position minimum over two-element array",
      "two-element exact-pattern repair",
    ],
    caseSlug: "array-pattern-cannot-require-more-elements-than-exist",
  },
  {
    id: "RFA-458",
    area: "diagnostics-macros",
    symptom:
      "A bare Get pattern triggers E0170 under the bindings_with_variant_name lint because it creates a catch-all binding instead of matching Method::Get.",
    likelyCause:
      "Enum variants remain qualified unless imported, so the unresolved short identifier is parsed as a new irrefutable binding rather than a variant path.",
    firstCheck:
      "Qualify the variant with its enum, check removed imports and unreachable arms, and deny the lint where a mistaken catch-all affects policy.",
    searchTerms: [
      "Rust E0170 pattern binding named same as enum variant",
      "bare enum variant pattern catch all",
      "qualify enum variant in match Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0170 denied lint failure",
      "bare Get creates pattern binding",
      "Method-qualified exhaustive repair",
    ],
    caseSlug: "enum-variant-patterns-should-use-qualified-paths",
  },
  {
    id: "RFA-459",
    area: "upgrades-compatibility",
    symptom:
      "In edition 2024, let [mut value] = &array fails because the outer reference makes the pattern implicitly borrow and mut cannot reset that default binding mode to a by-value mutable binding.",
    likelyCause:
      "Edition 2024 reserves explicit binding modifiers for move mode so an inner mut can no longer silently reverse ownership established by outer match ergonomics.",
    firstCheck:
      "Write the full scrutinee and binding types, then remove mut for reading, match the outer reference explicitly for Copy values, or provide &mut input for mutation.",
    searchTerms: [
      "Rust 2024 mut binding modifier not allowed implicitly borrowing",
      "cannot mutably bind by value within implicitly-borrowing pattern",
      "edition 2024 match ergonomics binding modes",
    ],
    evidence: [
      "Rust 1.98.1 edition-2024 compile failure",
      "mut binding under implicit shared borrow",
      "borrowed binding repair",
    ],
    caseSlug: "edition-2024-disallows-mut-inside-an-implicitly-borrowing-pattern",
  },
  {
    id: "RFA-460",
    area: "diagnostics-macros",
    symptom:
      "Writing impl Encode for Packet fails with E0404 when Encode resolves to a struct, because the position after impl expects a trait contract.",
    likelyCause:
      "The name resolves in Rust's type namespace, but the resolved item kind describes concrete data rather than an implementable behavioural interface.",
    firstCheck:
      "Navigate to the resolved declaration and either use the intended trait path, accept the concrete type directly, or define a real contract around caller needs.",
    searchTerms: [
      "Rust E0404 expected trait found struct",
      "impl name is not a trait",
      "type used in trait bound Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0404 compile failure",
      "Encode struct used in impl header",
      "Encode trait implementation repair",
    ],
    caseSlug: "a-trait-position-must-name-a-trait-not-a-struct",
  },
  {
    id: "RFA-461",
    area: "diagnostics-macros",
    symptom:
      "Writing impl Encodable for Packet fails with E0405 when no trait named Encodable is visible in the module containing the implementation.",
    likelyCause:
      "Trait identities are resolved through module scope rather than inferred structurally from method bodies, and the intended declaration or import is absent here.",
    firstCheck:
      "Identify the owning crate and public trait path, then verify module imports, feature cfg, version, and orphan-rule eligibility before implementing it.",
    searchTerms: [
      "Rust E0405 cannot find trait in this scope",
      "trait impl missing import Rust",
      "implement external trait explicit path",
    ],
    evidence: [
      "Rust 1.98.1 E0405 compile failure",
      "unresolved Encodable impl trait",
      "local trait declaration repair",
    ],
    caseSlug: "a-trait-impl-requires-the-trait-to-be-in-scope",
  },
  {
    id: "RFA-462",
    area: "diagnostics-macros",
    symptom:
      "Defining save inside impl Store for Memory fails with E0407 because Store declares only load and the extra method is not one of that trait's associated items.",
    likelyCause:
      "A trait implementation proves exactly one declared interface; it is not a general namespace for all methods supported by the concrete type.",
    firstCheck:
      "Compare the current trait declaration, then move concrete helpers to an inherent impl or define a second capability trait when other implementors should expose them.",
    searchTerms: [
      "Rust E0407 method is not a member of trait",
      "extra method inside trait impl",
      "move method to inherent impl Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0407 compile failure",
      "save absent from Store trait",
      "separate inherent implementation repair",
    ],
    caseSlug: "extra-methods-do-not-belong-inside-a-trait-impl",
  },
  {
    id: "RFA-463",
    area: "diagnostics-macros",
    symptom:
      "A free function returning Self fails with E0411 because no enclosing trait, implementation, or type definition establishes what the Self type means.",
    likelyCause:
      "Capital-S Self is a contextual current-type parameter rather than inferred shorthand for a nearby concrete return expression.",
    firstCheck:
      "Name the concrete return type, move a true constructor into its inherent impl, or introduce an explicit generic parameter with a construction contract.",
    searchTerms: [
      "Rust E0411 Self only available impl trait type definitions",
      "free function return Self Rust",
      "cannot find type Self in this scope",
    ],
    evidence: [
      "Rust 1.98.1 E0411 compile failure",
      "free create function returns Self",
      "explicit Job return type repair",
    ],
    caseSlug: "self-type-needs-an-enclosing-trait-impl-or-type",
  },
  {
    id: "RFA-464",
    area: "diagnostics-macros",
    symptom:
      "Declaring fn merge(value: u8, value: u8) fails with E0415 because both parameters try to introduce the same local binding in one function body.",
    likelyCause:
      "Function parameters are simultaneous bindings in one lexical scope, and Rust does not select or shadow one duplicate name.",
    firstCheck:
      "Rename inputs by semantic role, review positional call-site risks, and use standalone underscore only for values that intentionally need no binding.",
    searchTerms: [
      "Rust E0415 identifier bound more than once parameter list",
      "duplicate function parameter name Rust",
      "two parameters same name compile error",
    ],
    evidence: [
      "Rust 1.98.1 E0415 compile failure",
      "duplicate value u8 parameters",
      "left and right role-name repair",
    ],
    caseSlug: "function-parameter-names-must-be-unique",
  },
  {
    id: "RFA-465",
    area: "diagnostics-macros",
    symptom:
      "Constructing Packet { id: 7 } fails with E0422 when no struct, struct variant, or union type named Packet resolves in the current scope.",
    likelyCause:
      "Brace construction requires a declared nominal named-field identity; matching field labels cannot create or infer an anonymous record type.",
    firstCheck:
      "Resolve the intended current public path and shape, checking imports and cfg boundaries before declaring any new look-alike type.",
    searchTerms: [
      "Rust E0422 cannot find struct variant or union type",
      "struct literal type not in scope Rust",
      "Packet brace constructor unresolved",
    ],
    evidence: [
      "Rust 1.98.1 E0422 compile failure",
      "undefined Packet struct literal",
      "declared Packet named-field repair",
    ],
    caseSlug: "struct-literal-syntax-needs-a-resolvable-struct-type",
  },
  {
    id: "RFA-466",
    area: "diagnostics-macros",
    symptom:
      "Calling Config() fails with E0423 because Config is a named-field struct type, not a function, tuple-struct constructor, or tuple variant in the value namespace.",
    likelyCause:
      "Named-field structs use brace literals and do not introduce the callable constructor item created for tuple structs and tuple variants.",
    firstCheck:
      "Read the declaration kind and use braces, tuple parentheses, a unit value, Default, or a validating associated factory according to the real construction contract.",
    searchTerms: [
      "Rust E0423 expected function tuple struct found struct",
      "named field struct cannot call parentheses",
      "Config struct constructor syntax Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0423 compile failure",
      "Config named struct called as function",
      "brace literal construction repair",
    ],
    caseSlug: "a-named-field-struct-is-not-callable-with-parentheses",
  },
  {
    id: "RFA-467",
    area: "diagnostics-macros",
    symptom:
      "An associated function current() tries to read self.0 and fails with E0424 because its parameter list contains no self receiver value.",
    likelyCause:
      "Impl placement associates a function with a type, but only a self receiver supplies the concrete instance available through lowercase self.",
    firstCheck:
      "Decide whether the operation reads, mutates, consumes, or does not need an instance, then select &self, &mut self, self, or explicit ordinary parameters.",
    searchTerms: [
      "Rust E0424 self value only available methods",
      "associated function does not have self parameter",
      "expected value found module self Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0424 compile failure",
      "current associated function reads self field",
      "shared receiver method repair",
    ],
    caseSlug: "lowercase-self-needs-a-method-receiver",
  },
  {
    id: "RFA-468",
    area: "diagnostics-macros",
    symptom:
      "Writing break 'outer fails with E0426 when no enclosing loop or labelled block declares the 'outer label in scope.",
    likelyCause:
      "Labels are lexical control-flow declarations in their own namespace and cannot target a removed, misspelled, or non-enclosing construct.",
    firstCheck:
      "Locate the intended enclosing operation and decide whether control should break, continue, return, or propagate a result before declaring the exact label.",
    searchTerms: [
      "Rust E0426 use of undeclared label",
      "break outer loop label syntax Rust",
      "continue label not in scope",
    ],
    evidence: [
      "Rust 1.98.1 E0426 compile failure",
      "break targets undeclared outer label",
      "declared enclosing-loop label repair",
    ],
    caseSlug: "break-and-continue-labels-must-be-declared-on-an-enclosing-loop",
  },
  {
    id: "RFA-469",
    area: "diagnostics-macros",
    symptom:
      "Declaring two functions named decode in one module fails with E0428 because both create the same value-namespace name and Rust does not overload free functions by signature.",
    likelyCause:
      "One scope needs one resolvable item identity, while both declarations or simultaneously active cfg branches compete for the same namespace entry.",
    firstCheck:
      "Find both producers, compare behaviour and history, then remove a stale duplicate or separate legitimate policies by name, type path, trait, or exclusive cfg.",
    searchTerms: [
      "Rust E0428 name defined multiple times",
      "duplicate function definition same module Rust",
      "Rust does not overload functions by signature",
    ],
    evidence: [
      "Rust 1.98.1 E0428 compile failure",
      "two decode function definitions",
      "role-specific function-name repair",
    ],
    caseSlug: "items-cannot-be-defined-twice-in-the-same-namespace",
  },
  {
    id: "RFA-470",
    area: "diagnostics-macros",
    symptom:
      "Importing first::run and second::run into one module fails with E0252 because both functions claim the same local value-namespace name.",
    likelyCause:
      "Each use declaration creates a local alias from its final path component, leaving run unable to resolve to one item before call type checking.",
    firstCheck:
      "Keep paths qualified or alias imports by domain responsibility, and inspect glob imports and public re-exports before choosing the stable local name.",
    searchTerms: [
      "Rust E0252 name defined multiple times import",
      "import two functions same name Rust",
      "use as alias duplicate import",
    ],
    evidence: [
      "Rust 1.98.1 E0252 compile failure",
      "first and second run import collision",
      "role-preserving alias repair",
    ],
    caseSlug: "two-imports-cannot-claim-the-same-local-name",
  },
  {
    id: "RFA-471",
    area: "diagnostics-macros",
    symptom:
      "After extern crate core, importing helpers::core fails with E0254 because the current module already uses core as an external-crate name.",
    likelyCause:
      "External crate declarations and ordinary imports both establish path roots in the module, so two unrelated items cannot own core there.",
    firstCheck:
      "Check whether legacy extern syntax is required, then preserve distinct identities with a domain name, qualification, alias, or anonymous trait import.",
    searchTerms: [
      "Rust E0254 extern crate already imported name",
      "use item conflicts with extern crate",
      "rename import that shadows crate Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0254 compile failure",
      "helpers core import collides with core crate",
      "distinct CoreCapability trait repair",
    ],
    caseSlug: "an-import-cannot-reuse-an-extern-crate-name",
  },
  {
    id: "RFA-472",
    area: "diagnostics-macros",
    symptom:
      "Importing helpers::run into a module that also declares fn run fails with E0255 because both functions define the same local value-namespace name.",
    likelyCause:
      "A use alias and a directly declared module item participate in the same namespace without declaration-order shadowing or signature overloading.",
    firstCheck:
      "Decide which name owns the public or orchestration role, then qualify or semantically alias the helper and review whether the local wrapper still adds policy.",
    searchTerms: [
      "Rust E0255 name defined multiple times use local function",
      "import conflicts with function in module",
      "alias imported function Rust as",
    ],
    evidence: [
      "Rust 1.98.1 E0255 compile failure",
      "helpers run conflicts with local run",
      "run_helper alias repair",
    ],
    caseSlug: "an-import-cannot-redefine-a-local-item-name",
  },
  {
    id: "RFA-473",
    area: "cargo-dependencies",
    symptom:
      "Declaring extern crate core and extern crate std as core fails with E0259 because two external crates receive the same local crate-root name.",
    likelyCause:
      "A source alias identifies one external crate throughout its path tree, so sharing it would make every core-prefixed lookup ambiguous.",
    firstCheck:
      "Inspect Cargo package, crate, alias, and version identities, remove obsolete declarations, or choose stable role/version names for an intentional dual dependency.",
    searchTerms: [
      "Rust E0259 external crate name defined multiple times",
      "extern crate alias conflict",
      "two dependencies same crate name Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0259 compile failure",
      "std aliased to existing core name",
      "distinct standard alias repair",
    ],
    caseSlug: "two-external-crates-cannot-share-one-local-alias",
  },
  {
    id: "RFA-474",
    area: "diagnostics-macros",
    symptom:
      "After extern crate core, declaring struct core fails with E0260 because the local item conflicts with the external crate root already named core.",
    likelyCause:
      "Dependency roots are source-level names and the local type attempts to claim the same relevant module namespace entry.",
    firstCheck:
      "Preserve conventional dependency identity and rename the local concept by domain role unless a real package collision justifies a contained crate alias.",
    searchTerms: [
      "Rust E0260 name conflicts with external crate",
      "struct same name as crate Rust",
      "local module shadows extern crate",
    ],
    evidence: [
      "Rust 1.98.1 E0260 compile failure",
      "core struct conflicts with core crate",
      "CoreMarker local-name repair",
    ],
    caseSlug: "a-local-item-cannot-reuse-an-external-crate-name",
  },
  {
    id: "RFA-475",
    area: "diagnostics-macros",
    symptom:
      "Writing pub use connect as public_connect fails with E0364 when connect itself is private and therefore cannot support the promised external visibility.",
    likelyCause:
      "A re-export creates another accessible path but cannot widen the privacy of the item to which that path resolves.",
    firstCheck:
      "Decide whether the helper is supported API, then make the underlying item sufficiently public or restrict/remove the re-export and expose a safe wrapper.",
    searchTerms: [
      "Rust E0364 private item cannot be re-exported",
      "pub use private function",
      "re-export function from private module Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0364 compile failure",
      "private connect function under pub use",
      "public underlying function repair",
    ],
    caseSlug: "a-private-item-cannot-be-publicly-reexported",
  },
  {
    id: "RFA-476",
    area: "diagnostics-macros",
    symptom:
      "Writing pub use engine as public_engine fails with E0365 when the engine module is private to the crate and cannot itself become an externally reachable module alias.",
    likelyCause:
      "Re-exporting the module exposes its namespace topology, but the source module's visibility does not permit that external path.",
    firstCheck:
      "Choose whether module layout is public API; make it public when intentional or selectively re-export only supported public items through the façade.",
    searchTerms: [
      "Rust E0365 private module cannot be re-exported",
      "pub use private module alias",
      "re-export module versus items Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0365 compile failure",
      "private engine module public alias",
      "public module repair",
    ],
    caseSlug: "a-private-module-cannot-be-publicly-reexported-as-a-module",
  },
  {
    id: "RFA-477",
    area: "diagnostics-macros",
    symptom:
      "Using ..current while constructing Schedule::Daily fails with E0436 because functional record update accepts a struct base, not a struct-like enum variant value.",
    likelyCause:
      "Named-field enum variants share brace syntax with structs but remain alternatives of one enum rather than standalone struct types eligible for update.",
    firstCheck:
      "Narrow the variant, destructure fields that survive, and reconstruct it explicitly or extract independently meaningful shared data into a real struct.",
    searchTerms: [
      "Rust E0436 functional record update requires a struct",
      "struct update syntax enum variant",
      "dot dot base enum named fields Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0436 compile failure",
      "enum Daily variant used as update base",
      "explicit variant-field reconstruction repair",
    ],
    caseSlug: "struct-update-syntax-does-not-apply-to-enum-variants",
  },
  {
    id: "RFA-478",
    area: "diagnostics-macros",
    symptom:
      "Declaring pub Ready inside a public enum fails with E0449 because enum variants always share the visibility of their containing enum.",
    likelyCause:
      "Variants are components of the enum's single public contract and do not receive independent access qualifiers.",
    firstCheck:
      "Remove the qualifier and, if individual states need construction control, redesign around an opaque wrapper or private internal enum instead of per-variant visibility.",
    searchTerms: [
      "Rust E0449 visibility qualifiers not permitted enum variant",
      "pub enum variant syntax error",
      "hide individual enum variant Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0449 compile failure",
      "pub qualifier on Ready variant",
      "enum-level visibility repair",
    ],
    caseSlug: "enum-variants-cannot-have-their-own-visibility-qualifier",
  },
  {
    id: "RFA-479",
    area: "diagnostics-macros",
    symptom:
      "Constructing model::Config with its private secret field fails with E0451 even though Config and its name field are public.",
    likelyCause:
      "Direct struct literals name representation fields individually, and this caller lacks access to one field required for construction.",
    firstCheck:
      "Use or add a checked public constructor or builder, making the field public only if arbitrary caller mutation and representation coupling are intended API.",
    searchTerms: [
      "Rust E0451 field of struct is private constructor",
      "construct public struct private fields",
      "public new function for private fields Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0451 compile failure",
      "external literal sets private secret field",
      "public Config new constructor repair",
    ],
    caseSlug: "private-struct-fields-require-a-public-constructor-boundary",
  },
  {
    id: "RFA-480",
    area: "diagnostics-macros",
    symptom:
      "A nested fn inner reads outer's offset and fails with E0434 because function items do not capture values from the dynamic enclosing stack frame.",
    likelyCause:
      "Lexical nesting limits visibility but a fn item has no generated environment storing locals from one invocation of its enclosing function.",
    firstCheck:
      "Use a closure for intentional capture or pass the dependency as an explicit parameter when the helper should remain an independent reusable function.",
    searchTerms: [
      "Rust E0434 can't capture dynamic environment fn item",
      "nested function use outer variable Rust",
      "closure versus inner fn capture",
    ],
    evidence: [
      "Rust 1.98.1 E0434 compile failure",
      "inner function reads local offset",
      "capturing closure repair",
    ],
    caseSlug: "nested-functions-cannot-capture-local-values",
  },
  {
    id: "RFA-481",
    area: "diagnostics-macros",
    symptom:
      "Using a local let binding as [u8; width] fails with E0435 because fixed-array length is part of the type and must be evaluable at compile time.",
    likelyCause:
      "An immutable let still creates runtime storage, while rustc needs the array's usize length during type checking and layout.",
    firstCheck:
      "Use a named const or const generic for a true static invariant, or use Vec and slices when the length arrives during execution.",
    searchTerms: [
      "Rust E0435 non-constant value in constant array length",
      "let variable cannot be array size Rust",
      "const versus let fixed array length",
    ],
    evidence: [
      "Rust 1.98.1 E0435 compile failure",
      "local width used in array type",
      "WIDTH const repair",
    ],
    caseSlug: "array-lengths-need-compile-time-constants-not-let-values",
  },
  {
    id: "RFA-482",
    area: "diagnostics-macros",
    symptom:
      "Defining type Error inside impl Decode for Packet fails with E0437 when the Decode trait never declares an associated type named Error.",
    likelyCause:
      "Trait implementations fill associated slots in one declared contract and cannot add an implementation-specific type to that trait namespace.",
    firstCheck:
      "Decide whether every implementor needs the type; declare it on an owned trait, use a separate capability, or keep a concrete alias at module scope.",
    searchTerms: [
      "Rust E0437 type is not a member of trait",
      "associated type only in impl not trait",
      "trait impl extra type alias Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0437 compile failure",
      "Decode impl invents Error type",
      "trait-declared associated type repair",
    ],
    caseSlug: "a-trait-impl-cannot-invent-an-associated-type",
  },
  {
    id: "RFA-483",
    area: "diagnostics-macros",
    symptom:
      "Defining const CAPACITY inside impl Window for Buffer fails with E0438 when Window does not declare that associated constant.",
    likelyCause:
      "An impl may select values only for constant slots promised by the trait; backend-specific metadata does not enter that contract automatically.",
    firstCheck:
      "Choose trait constant for universal type-level policy, inherent constant for concrete metadata, or an instance method for runtime-varying capacity.",
    searchTerms: [
      "Rust E0438 const is not a member of trait",
      "extra associated const in trait impl",
      "inherent const versus trait const Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0438 compile failure",
      "Window impl invents CAPACITY",
      "trait-declared constant repair",
    ],
    caseSlug: "a-trait-impl-cannot-invent-an-associated-constant",
  },
  {
    id: "RFA-484",
    area: "diagnostics-macros",
    symptom:
      "The projection <D as Decoder>::Error fails with E0576 because Decoder declares Output but no associated type named Error.",
    likelyCause:
      "Fully qualified syntax selects an item from a named existing trait contract; it cannot search other traits or manufacture a missing type slot.",
    firstCheck:
      "Inspect the exact versioned trait and item kind, then use its declared projection or qualify the supertrait that actually owns the intended item.",
    searchTerms: [
      "Rust E0576 cannot find associated type in trait",
      "fully qualified associated item not found",
      "Trait Error type missing projection Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0576 compile failure",
      "Decoder Error projection absent from trait",
      "declared Output projection repair",
    ],
    caseSlug: "fully-qualified-projection-must-name-a-real-associated-item",
  },
  {
    id: "RFA-485",
    area: "diagnostics-macros",
    symptom:
      "A Source method returning &Self::Error fails with E0220 because the trait declares Item but never declares an associated type named Error.",
    likelyCause:
      "Self exposes only associated items proven by the current trait, its supertraits, and explicit bounds; naming convention alone proves no Error projection.",
    firstCheck:
      "Add a meaningful trait-level Error choice, correct a stale item name, or qualify the other trait whose contract actually supplies the type.",
    searchTerms: [
      "Rust E0220 associated type Error not found for Self",
      "Self associated type not declared trait",
      "trait method missing associated type declaration",
    ],
    evidence: [
      "Rust 1.98.1 E0220 compile failure",
      "Source uses undeclared Self Error",
      "trait Error declaration repair",
    ],
    caseSlug: "self-associated-type-must-be-declared-by-the-trait",
  },
  {
    id: "RFA-486",
    area: "diagnostics-macros",
    symptom:
      "Writing dyn BoxCar<Color = C> fails with E0222 because both Vehicle and Container supertraits declare an associated type named Color.",
    likelyCause:
      "Supertrait composition preserves the declaring identity of both projections and same spelling does not merge them or prove equality.",
    firstCheck:
      "Expand both qualified projections, decide whether their concepts truly equal, and state separate declaring-trait bounds through a concrete generic type.",
    searchTerms: [
      "Rust E0222 ambiguous associated type in bounds",
      "two supertraits same associated type name",
      "constrain both associated types where clause Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0222 compile failure",
      "Vehicle and Container both define Color",
      "explicit dual supertrait bounds repair",
    ],
    caseSlug: "ambiguous-supertrait-associated-types-need-separate-bounds",
  },
  {
    id: "RFA-487",
    area: "diagnostics-macros",
    symptom:
      "Using Source::Item as a standalone type fails with E0223 because the trait declaration does not choose one concrete Item without an implementing type.",
    likelyCause:
      "An associated type is selected by each trait implementation relationship rather than stored as one module-like member on the trait itself.",
    firstCheck:
      "Name a concrete implementor or add T: Source, then project <T as Source>::Item so both sides of the relationship are explicit.",
    searchTerms: [
      "Rust E0223 ambiguous associated type Trait Item",
      "use trait associated type without implementor",
      "fully qualified associated type projection Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0223 compile failure",
      "standalone Source Item type",
      "Bytes implementation projection repair",
    ],
    caseSlug: "a-trait-associated-type-needs-an-implementing-type",
  },
  {
    id: "RFA-488",
    area: "diagnostics-macros",
    symptom:
      "The alias dyn Read + 'a + 'b fails with E0226 because one trait object type cannot carry two separate explicit object lifetime bounds.",
    likelyCause:
      "The erased concrete contents need one coherent outlives requirement; multiple source lifetimes must relate to one chosen object lifetime outside the dyn bound.",
    firstCheck:
      "Identify references hidden in the implementor, introduce one object lifetime, and state how each source outlives it rather than listing two object bounds.",
    searchTerms: [
      "Rust E0226 only single explicit lifetime bound trait object",
      "dyn Trait plus two lifetimes",
      "trait object lifetime bound choose one",
    ],
    evidence: [
      "Rust 1.98.1 E0226 compile failure",
      "Read object with a and b bounds",
      "single object-lifetime alias repair",
    ],
    caseSlug: "a-trait-object-allows-only-one-explicit-lifetime-bound",
  },
  {
    id: "RFA-489",
    area: "diagnostics-macros",
    symptom:
      "Writing <I as Source<Item = u8>>::Item fails with E0229 because associated item equality constraints are not allowed inside that qualified projection path.",
    likelyCause:
      "Projection syntax names an item while equality syntax restricts admissible implementations, and Rust assigns those roles to different grammar contexts.",
    firstCheck:
      "Project <I as Source>::Item and move I: Source<Item = u8> to the parameter bounds or where clause, then confirm I remains inferable.",
    searchTerms: [
      "Rust E0229 associated item constraints not allowed here",
      "associated type binding inside qualified path",
      "move associated type equality to where clause",
    ],
    evidence: [
      "Rust 1.98.1 E0229 compile failure",
      "Item equality embedded in projection",
      "where-clause equality repair",
    ],
    caseSlug: "associated-type-equality-belongs-in-a-bound-not-a-projection",
  },
  {
    id: "RFA-490",
    area: "diagnostics-macros",
    symptom:
      "Implementing Reporter for HealthCheck with an empty impl fails with E0046 because the required report method has no implementation or default.",
    likelyCause:
      "Naming a trait in an impl creates a full contract obligation, and every non-default method, associated type, constant, and function slot must be supplied.",
    firstCheck:
      "Read the exact resolved trait definition and the compiler's missing-item list, then implement real behaviour or reconsider whether this type should promise the trait.",
    searchTerms: [
      "Rust E0046 not all trait items implemented",
      "missing trait method implementation Rust",
      "required associated items trait impl",
    ],
    evidence: [
      "Rust 1.98.1 E0046 compile failure",
      "Reporter impl missing report",
      "required method implementation repair",
    ],
    caseSlug: "a-trait-impl-must-provide-every-required-item",
  },
  {
    id: "RFA-491",
    area: "diagnostics-macros",
    symptom:
      "Implementing generic Convert::convert with a concrete u32 parameter fails with E0049 because the impl method removes the trait method's type parameter.",
    likelyCause:
      "The trait lets each caller choose any admitted T, while the concrete impl signature narrows that caller-selected family to one input type.",
    firstCheck:
      "Compare method-level type and const parameters separately from trait parameters, then preserve their count and bounds or redesign where the type choice belongs.",
    searchTerms: [
      "Rust E0049 method wrong number type parameters",
      "trait method generic parameter mismatch Rust",
      "implement generic trait method concrete type",
    ],
    evidence: [
      "Rust 1.98.1 E0049 compile failure",
      "Convert impl removes generic T",
      "matching generic method repair",
    ],
    caseSlug: "a-trait-method-impl-must-keep-the-generic-parameter-list",
  },
  {
    id: "RFA-492",
    area: "diagnostics-macros",
    symptom:
      "Implementing Window::contains with only &self fails with E0050 because the trait declaration also requires a value parameter.",
    likelyCause:
      "Trait calls use one shared arity across implementations, and an implementation may ignore an input but cannot remove it from the callable contract.",
    firstCheck:
      "Count the receiver and ordinary parameters on both declarations before comparing their types, then restore or explicitly ignore every required input.",
    searchTerms: [
      "Rust E0050 method wrong number parameters",
      "trait impl missing function argument Rust",
      "trait method parameter count mismatch",
    ],
    evidence: [
      "Rust 1.98.1 E0050 compile failure",
      "Window contains omits value parameter",
      "matching parameter-list repair",
    ],
    caseSlug: "a-trait-method-impl-must-keep-the-function-parameter-list",
  },
  {
    id: "RFA-493",
    area: "diagnostics-macros",
    symptom:
      "Implementing Reset::reset without its &mut self receiver fails with E0186 because the trait declares an instance method but the impl declares an associated function.",
    likelyCause:
      "Removing self changes the associated item's call identity and disconnects it from the instance state promised by the trait method.",
    firstCheck:
      "Compare the exact receiver form first, restore the instance relationship, and keep any useful static helper as a separately named inherent function.",
    searchTerms: [
      "Rust E0186 method has self trait but not impl",
      "trait method implemented as associated function",
      "missing self receiver in trait impl Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0186 compile failure",
      "Reset impl omits mutable receiver",
      "matching &mut self receiver repair",
    ],
    caseSlug: "a-trait-method-cannot-be-implemented-as-a-static-function",
  },
  {
    id: "RFA-494",
    area: "diagnostics-macros",
    symptom:
      "Implementing Choose::choose without the declared 'long: 'short relationship fails with E0195 because the impl accepts a different set of lifetime relationships.",
    likelyCause:
      "Lifetime parameters quantify the borrow relationships admitted at each call, so removing or strengthening an outlives bound changes the method contract.",
    firstCheck:
      "Expand elided lifetimes, write each outlives relationship in plain language, and make the impl's quantified bounds equivalent to the trait declaration.",
    searchTerms: [
      "Rust E0195 lifetime parameters do not match trait",
      "trait impl lifetime bounds mismatch",
      "lifetime parameters bounds method trait declaration",
    ],
    evidence: [
      "Rust 1.98.1 E0195 compile failure",
      "Choose impl omits long outlives short bound",
      "matching lifetime relationship repair",
    ],
    caseSlug: "trait-method-lifetime-bounds-must-match-the-declaration",
  },
  {
    id: "RFA-495",
    area: "diagnostics-macros",
    symptom:
      "Defining Encode::encode twice inside one trait impl fails with E0201 because both method bodies claim the same associated-item identity.",
    likelyCause:
      "Rust does not overload associated items by argument types or bodies, leaving one impl namespace unable to assign two meanings to the same identifier.",
    firstCheck:
      "Find every same-named associated item, compare their intended semantics, and merge, rename, split traits, or correct mutually exclusive generation conditions.",
    searchTerms: [
      "Rust E0201 duplicate definitions associated item",
      "duplicate method in trait impl Rust",
      "Rust no function overloading impl methods",
    ],
    evidence: [
      "Rust 1.98.1 E0201 compile failure",
      "duplicate Encode encode methods",
      "single associated method repair",
    ],
    caseSlug: "an-impl-cannot-define-the-same-associated-item-twice",
  },
  {
    id: "RFA-496",
    area: "diagnostics-macros",
    symptom:
      "Declaring T with ?Sized twice fails with E0203 because Rust permits only one relaxation of the implicit Sized bound.",
    likelyCause:
      "The first ?Sized already removes the default Sized requirement, so a second copy adds no supported semantic change and remains duplicate special syntax.",
    firstCheck:
      "Inspect expanded bounds for repeated ?Sized, keep exactly one only when unsized callers are intentional, and validate storage and method operations for DST support.",
    searchTerms: [
      "Rust E0203 duplicate relaxed Sized bounds",
      "T question Sized repeated Rust",
      "what does ?Sized mean Rust generic",
    ],
    evidence: [
      "Rust 1.98.1 E0203 compile failure",
      "duplicate ?Sized bounds on T",
      "single relaxed bound repair",
    ],
    caseSlug: "a-type-parameter-can-relax-sized-only-once",
  },
  {
    id: "RFA-497",
    area: "diagnostics-macros",
    symptom:
      "Implementing the Limits constant MAX_RETRIES as fn MAX_RETRIES fails with E0324 because a method cannot fill an associated-constant slot.",
    likelyCause:
      "A constant promises a path-addressable value while a function promises callable behaviour, and matching names do not erase that item-kind difference.",
    firstCheck:
      "Inspect the declaration's keyword and intended runtime semantics, then implement a constant value or redesign the trait and every caller around a function.",
    searchTerms: [
      "Rust E0324 associated method does not match trait",
      "implement trait const as function Rust",
      "trait associated constant versus method",
    ],
    evidence: [
      "Rust 1.98.1 E0324 compile failure",
      "Limits constant implemented as method",
      "associated-constant syntax repair",
    ],
    caseSlug: "a-trait-associated-constant-cannot-be-implemented-as-a-method",
  },
  {
    id: "RFA-498",
    area: "diagnostics-macros",
    symptom:
      "Implementing the Limits constant MAX_RETRIES with type MAX_RETRIES = u8 fails with E0325 because an associated type cannot fill an associated-constant slot.",
    likelyCause:
      "An associated type selects a type and an associated constant selects a value, so their similar qualified paths still occupy incompatible grammatical roles.",
    firstCheck:
      "Label the trait item as type, value, or callable behaviour, then use the matching impl syntax and confirm callers use the name in the corresponding position.",
    searchTerms: [
      "Rust E0325 associated type does not match trait",
      "trait const implemented as type Rust",
      "associated type versus associated constant",
    ],
    evidence: [
      "Rust 1.98.1 E0325 compile failure",
      "Limits constant implemented as associated type",
      "associated-constant value repair",
    ],
    caseSlug: "a-trait-associated-constant-cannot-be-implemented-as-a-type",
  },
  {
    id: "RFA-499",
    area: "diagnostics-macros",
    symptom:
      "Implementing FeatureFlag::ENABLED as u8 fails with E0326 because the trait requires that associated constant to have type bool.",
    likelyCause:
      "An implementation chooses a value inside the trait's declared domain and cannot substitute an integer representation for the promised boolean type.",
    firstCheck:
      "Compare the exact declared and implemented types, convert and validate external representations at their boundary, and preserve the domain type in the trait impl.",
    searchTerms: [
      "Rust E0326 implemented const incompatible type trait",
      "associated constant type mismatch Rust",
      "expected bool found u8 trait const",
    ],
    evidence: [
      "Rust 1.98.1 E0326 compile failure",
      "FeatureFlag ENABLED uses u8 instead of bool",
      "matching boolean constant repair",
    ],
    caseSlug: "an-associated-constant-type-must-match-its-trait",
  },
  {
    id: "RFA-500",
    area: "diagnostics-macros",
    symptom:
      "Casting 1_u8 with as bool fails with E0054 because Rust does not define an integer-to-boolean cast.",
    likelyCause:
      "A numeric cast changes representation while a boolean conversion chooses a domain predicate, and Rust requires that truth rule to remain explicit.",
    firstCheck:
      "Identify whether the input is a count, exact protocol flag, status, or bit field, then compare or validate precisely instead of assuming non-zero truthiness.",
    searchTerms: [
      "Rust E0054 cannot cast u8 as bool",
      "convert integer to bool Rust",
      "Rust no truthy values",
    ],
    evidence: [
      "Rust 1.98.1 E0054 compile failure",
      "u8 as bool rejected",
      "explicit non-zero comparison repair",
    ],
    caseSlug: "numbers-cannot-be-cast-directly-to-bool-in-rust",
  },
  {
    id: "RFA-501",
    area: "diagnostics-macros",
    symptom:
      "Calling schedule with only the task argument fails with E0061 because the function signature also requires a retry count.",
    likelyCause:
      "Ordinary Rust functions have fixed arity, so a missing policy argument cannot be silently supplied as an optional or default parameter.",
    firstCheck:
      "Compare the selected declaration's exact parameter count, then decide whether the caller, a wrapper, an Option value, or a builder should own the missing policy.",
    searchTerms: [
      "Rust E0061 function takes arguments supplied",
      "optional function arguments Rust",
      "wrong number arguments function call Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0061 compile failure",
      "schedule call omits retries",
      "two-argument call repair",
    ],
    caseSlug: "rust-function-calls-require-the-exact-argument-count",
  },
  {
    id: "RFA-502",
    area: "diagnostics-macros",
    symptom:
      "Constructing Limits with two retries fields fails with E0062 because one struct expression cannot provide two values for the same field.",
    likelyCause:
      "Struct construction has one initializer per field rather than map-like overwrite semantics, leaving the duplicate values as an unresolved policy conflict.",
    firstCheck:
      "Trace each candidate value and any shorthand or macro expansion, resolve precedence before construction, and emit the final field exactly once.",
    searchTerms: [
      "Rust E0062 field specified more than once",
      "duplicate field struct initializer Rust",
      "struct literal same field twice",
    ],
    evidence: [
      "Rust 1.98.1 E0062 compile failure",
      "Limits retries field duplicated",
      "single field initializer repair",
    ],
    caseSlug: "a-struct-literal-cannot-set-the-same-field-twice",
  },
  {
    id: "RFA-503",
    area: "diagnostics-macros",
    symptom:
      "Constructing Limits with retries but no timeout_ms fails with E0063 because the named-field struct value would be incomplete.",
    likelyCause:
      "Rust does not invent field defaults during literal construction, and safe ordinary struct values must have every field initialised before use.",
    firstCheck:
      "Find the resolved type's complete field list, choose the missing value by domain meaning, or use an explicit valid base, constructor, or builder.",
    searchTerms: [
      "Rust E0063 missing field initializer",
      "struct literal missing fields Rust",
      "default remaining struct fields Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0063 compile failure",
      "Limits initializer omits timeout_ms",
      "complete field initializer repair",
    ],
    caseSlug: "a-struct-literal-must-initialize-every-required-field",
  },
  {
    id: "RFA-504",
    area: "diagnostics-macros",
    symptom:
      "Writing 12 += 1 fails with E0067 because the left operand is a literal value rather than a mutable place that can store the result.",
    likelyCause:
      "Compound assignment reads and writes back through one storage location, while a literal or computed value provides no caller-visible destination for the update.",
    firstCheck:
      "Identify which owner should retain the result, bind or access its mutable place once, and separately verify mutability, borrowing, and operator support.",
    searchTerms: [
      "Rust E0067 invalid left hand side assignment",
      "literal plus equals Rust error",
      "place expression compound assignment Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0067 compile failure",
      "integer literal used with +=",
      "mutable local place repair",
    ],
    caseSlug: "compound-assignment-needs-a-place-not-a-temporary-value",
  },
  {
    id: "RFA-505",
    area: "diagnostics-macros",
    symptom:
      "Assigning RETRIES = 4 fails with E0070 because RETRIES resolves to a const value, not a mutable storage location.",
    likelyCause:
      "A const is a named compile-time value that may be inlined, so it does not identify runtime storage into which assignment can write.",
    firstCheck:
      "Determine whether changing state belongs in a local, field, or synchronized shared owner, while keeping immutable defaults separate from current configuration.",
    searchTerms: [
      "Rust E0070 invalid left hand side assignment const",
      "cannot assign to const Rust",
      "place expression assignment Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0070 compile failure",
      "assignment targets RETRIES const",
      "mutable local storage repair",
    ],
    caseSlug: "assignment-cannot-write-to-a-constant-item",
  },
  {
    id: "RFA-506",
    area: "diagnostics-macros",
    symptom:
      "Writing Counter { value: 4 } fails with E0071 when Counter is only an alias for u64 rather than a named-field struct type.",
    likelyCause:
      "A type alias preserves its underlying type's shape and constructor rules, so an uppercase domain name does not manufacture a field or nominal constructor.",
    firstCheck:
      "Resolve the path before the braces, then initialise the underlying alias normally or define a real newtype with the intended fields and invariants.",
    searchTerms: [
      "Rust E0071 expected struct variant union type",
      "type alias struct literal Rust",
      "cannot construct u64 with braces Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0071 compile failure",
      "u64 alias used with named-field braces",
      "scalar alias initializer repair",
    ],
    caseSlug: "struct-literal-syntax-requires-a-struct-variant-or-union-type",
  },
  {
    id: "RFA-507",
    area: "concurrency-memory",
    symptom:
      "Defining Chain::Link with another Chain stored directly fails with E0072 because computing the enum's layout recurses without a finite size.",
    likelyCause:
      "The recursive variant contains its own complete inline layout, producing an equation whose size grows with every expansion and never reaches a fixed value.",
    firstCheck:
      "Locate the cycle and put a suitable fixed-size Box, shared pointer, reference, or arena index on one natural edge based on the real ownership model.",
    searchTerms: [
      "Rust E0072 recursive type infinite size",
      "recursive enum needs Box Rust",
      "why recursive struct cannot contain itself Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0072 compile failure",
      "Chain variant stores Chain inline",
      "Box recursive edge repair",
    ],
    caseSlug: "recursive-rust-types-need-an-indirection-boundary",
  },
  {
    id: "RFA-508",
    area: "concurrency-memory",
    symptom:
      "Declaring struct View with text: &str fails with E0106 because a stored reference needs a named lifetime relationship on the containing type.",
    likelyCause:
      "The View value depends on storage owned elsewhere, and without a lifetime parameter its type does not record that it must stop being used before the text owner.",
    firstCheck:
      "Identify the data owner and desired flow, then declare the borrow lifetime or choose owned/shared storage rather than reaching for static as an escape hatch.",
    searchTerms: [
      "Rust E0106 missing lifetime specifier struct",
      "struct field reference needs lifetime Rust",
      "store str reference in struct Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0106 compile failure",
      "View stores &str without lifetime",
      "named struct lifetime repair",
    ],
    caseSlug: "reference-fields-must-declare-who-keeps-the-data-alive",
  },
  {
    id: "RFA-509",
    area: "diagnostics-macros",
    symptom:
      "Using Envelope<u8, u16> fails with E0107 because Envelope declares one type parameter but the use supplies two generic arguments.",
    likelyCause:
      "Generic arguments instantiate the resolved item's declared lifetime, type, and const parameter list rather than acting as an open collection of hints.",
    firstCheck:
      "Resolve the exact item or alias, align arguments with its parameter kinds and defaults, and confirm removing an argument does not discard intended modelling.",
    searchTerms: [
      "Rust E0107 wrong number generic arguments",
      "struct takes one generic argument two supplied",
      "generic parameter count Rust type",
    ],
    evidence: [
      "Rust 1.98.1 E0107 compile failure",
      "Envelope receives two type arguments",
      "single generic argument repair",
    ],
    caseSlug: "generic-arguments-must-match-the-items-parameter-list",
  },
  {
    id: "RFA-510",
    area: "diagnostics-macros",
    symptom:
      "Writing u64<u8> fails with E0109 because the builtin integer type declares no generic parameters that could receive u8.",
    likelyCause:
      "Generic angle brackets fill slots from one resolved declaration and cannot attach units, conversion sources, or other metadata to an already concrete builtin type.",
    firstCheck:
      "Resolve the path and identify what the extra argument meant, then remove it, move it to the proper conversion, or introduce a real generic wrapper.",
    searchTerms: [
      "Rust E0109 type arguments not allowed",
      "generic arguments builtin type Rust",
      "u64 type parameter Rust error",
    ],
    evidence: [
      "Rust 1.98.1 E0109 compile failure",
      "u64 receives unsupported u8 argument",
      "plain builtin type repair",
    ],
    caseSlug: "non-generic-types-cannot-receive-generic-arguments",
  },
  {
    id: "RFA-511",
    area: "diagnostics-macros",
    symptom:
      "Defining an inherent impl on Vec<u8> fails with E0116 because Vec is owned by the standard library crate rather than the current crate.",
    likelyCause:
      "The defining crate exclusively owns a type's inherent namespace so downstream dependencies cannot inject colliding methods into it.",
    firstCheck:
      "Choose a local extension trait, free function, or newtype according to whether the behaviour is optional utility, algorithm, or owned domain identity.",
    searchTerms: [
      "Rust E0116 inherent impl outside crate",
      "add method to Vec Rust extension trait",
      "cannot impl foreign type inherent methods",
    ],
    evidence: [
      "Rust 1.98.1 E0116 compile failure",
      "inherent checksum method on Vec",
      "local extension trait repair",
    ],
    caseSlug: "inherent-methods-can-only-be-added-to-local-types",
  },
  {
    id: "RFA-512",
    area: "diagnostics-macros",
    symptom:
      "Writing impl<T> T fails with E0118 because an unconstrained type parameter is not a nominal struct, enum, union, or trait-object self type.",
    likelyCause:
      "No local nominal declaration owns the universe represented by T, so a blanket inherent impl would inject methods across unrelated types and crates.",
    firstCheck:
      "Use an intentionally scoped local trait for generic capability or a local Wrapper<T> for representation and invariants, reviewing blanket-impl overlap.",
    searchTerms: [
      "Rust E0118 no nominal type inherent implementation",
      "impl T for all types Rust",
      "blanket inherent impl Rust not allowed",
    ],
    evidence: [
      "Rust 1.98.1 E0118 compile failure",
      "blanket inherent impl over T",
      "blanket local trait repair",
    ],
    caseSlug: "inherent-impls-need-a-nominal-self-type",
  },
  {
    id: "RFA-513",
    area: "concurrency-memory",
    symptom:
      "Implementing Drop for &mut Resource fails with E0120 because Drop may be implemented only for local structs, enums, and unions.",
    likelyCause:
      "A reference owns only a borrow handle and ending it must not define destruction behaviour for the referent owned by another value.",
    firstCheck:
      "Put final cleanup on a local owner or scoped cleanup on a local RAII guard, keeping fallible work in an explicit close or finish method.",
    searchTerms: [
      "Rust E0120 Drop implemented for reference",
      "implement Drop for &mut T Rust",
      "RAII guard cleanup borrowed resource Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0120 compile failure",
      "Drop impl targets mutable reference",
      "local guard Drop repair",
    ],
    caseSlug: "drop-behaviour-belongs-to-an-owned-wrapper-not-a-reference",
  },
  {
    id: "RFA-514",
    area: "ffi-targets",
    symptom:
      "Destructuring a tuple in an extern C function declaration fails with E0130 because foreign declarations accept parameter names and types, not Rust body patterns.",
    likelyCause:
      "An external declaration describes a symbol's ABI without a local Rust body in which destructuring could execute, and tuple layout is not an implicit C contract.",
    firstCheck:
      "Match the authoritative foreign signature with FFI-safe named representations, then destructure and validate inside a Rust wrapper after the boundary.",
    searchTerms: [
      "Rust E0130 patterns foreign function declaration",
      "destructure parameter extern C Rust",
      "FFI parameter pattern not allowed",
    ],
    evidence: [
      "Rust 1.98.1 E0130 compile failure",
      "tuple pattern in foreign declaration",
      "repr C named parameter repair",
    ],
    caseSlug: "foreign-function-parameters-cannot-use-destructuring-patterns",
  },
  {
    id: "RFA-515",
    area: "diagnostics-macros",
    symptom:
      "Declaring fn main<T>() fails with E0131 because the executable entry point cannot require a caller to choose generic arguments.",
    likelyCause:
      "Runtime startup invokes one concrete entry symbol rather than a monomorphised family, leaving no Rust call site that could select T.",
    firstCheck:
      "Keep main concrete as the composition root and delegate reusable generic work to a run function after selecting concrete adapters and configuration.",
    searchTerms: [
      "Rust E0131 main generic parameters",
      "can main be generic Rust",
      "generic Rust program entry point",
    ],
    evidence: [
      "Rust 1.98.1 E0131 compile failure",
      "main declares generic T",
      "generic helper called from concrete main",
    ],
    caseSlug: "the-rust-main-function-cannot-have-generic-parameters",
  },
  {
    id: "RFA-516",
    area: "diagnostics-macros",
    symptom:
      "Matching on P::ACTIVE fails with E0158 because a constant pattern cannot depend on a generic policy parameter during generic type checking.",
    likelyCause:
      "Different implementations may select different constant values after the generic match structure and exhaustiveness must already have been validated.",
    firstCheck:
      "Bind the candidate and compare it in a guard or policy predicate, then retain structurally exhaustive fallback arms and verify equality semantics.",
    searchTerms: [
      "Rust E0158 constant pattern generic parameter",
      "associated const in match pattern Rust",
      "match guard generic associated constant",
    ],
    evidence: [
      "Rust 1.98.1 E0158 compile failure",
      "P ACTIVE used as constant pattern",
      "guard comparison repair",
    ],
    caseSlug: "generic-associated-constants-cannot-be-used-directly-as-patterns",
  },
  {
    id: "RFA-517",
    area: "concurrency-memory",
    symptom:
      "Calling a self-by-value Consume method through Box<dyn Consume> fails with E0161 because the erased dyn value has no compile-time-known inline size to move.",
    likelyCause:
      "Plain self requests movement of the concrete referent out of its sized pointer while dynamic dispatch deliberately erased that referent's layout.",
    firstCheck:
      "Choose a borrowed receiver, a supported owning pointer receiver such as self: Box<Self>, or sized static dispatch according to real consumption semantics.",
    searchTerms: [
      "Rust E0161 cannot move dyn trait value",
      "trait object method takes self by value",
      "Box dyn Trait consuming method Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0161 compile failure",
      "Box dyn Consume calls self receiver",
      "borrowed receiver repair",
    ],
    caseSlug: "a-by-value-trait-method-cannot-move-an-unsized-dyn-value",
  },
  {
    id: "RFA-518",
    area: "diagnostics-macros",
    symptom:
      "Writing &'a dyn Send + Sync fails with an ambiguous-plus diagnostic because it is unclear whether Sync belongs inside the referenced trait object type.",
    likelyCause:
      "Low-precedence bound composition and the outer reference create two type layers whose grouping cannot be recovered safely from whitespace.",
    firstCheck:
      "Parenthesise the complete dyn referent, then verify its principal, auto-trait, and lifetime bounds reflect how the object is actually stored and shared.",
    searchTerms: [
      "Rust ambiguous plus in a type",
      "reference dyn Trait Send Sync parentheses",
      "Rust E0178 trait object plus precedence",
    ],
    evidence: [
      "Rust 1.98.1 ambiguous-plus compile failure",
      "Send plus Sync after borrowed dyn type",
      "parenthesised trait-object bound repair",
    ],
    caseSlug: "trait-object-bounds-behind-a-reference-need-parentheses",
  },
  {
    id: "RFA-519",
    area: "upgrades-compatibility",
    symptom:
      "Manually implementing FnOnce for Increment fails on stable Rust with E0183 and related E0658 diagnostics because the implementation ABI and fn_traits support remain experimental.",
    likelyCause:
      "Stable Rust exposes compiler-generated Fn implementations for closure types but does not stabilise the manual rust-call ABI as a user implementation surface.",
    firstCheck:
      "Use a closure, impl Fn return, boxed callable, or ordinary named trait unless a pinned nightly experiment is an explicit compatibility choice.",
    searchTerms: [
      "Rust E0183 manual FnOnce implementation experimental",
      "implement Fn trait stable Rust",
      "rust-call ABI fn_traits unstable",
    ],
    evidence: [
      "Rust 1.98.1 E0183 plus E0658 compile failure",
      "manual FnOnce and rust-call ABI",
      "compiler-generated closure repair",
    ],
    caseSlug: "manual-implementations-of-fn-traits-remain-unstable",
  },
  {
    id: "RFA-520",
    area: "diagnostics-macros",
    symptom:
      "Writing unsafe impl Counter fails with E0197 because an inherent impl is not an unsafe-trait implementation.",
    likelyCause:
      "Unsafe marks a proof boundary on operations or trait contracts, while an inherent impl is only a container for associated items with no shared safety assertion.",
    firstCheck:
      "Remove unsafe from the impl and place precise caller obligations on unsafe functions or justified operations inside local unsafe blocks.",
    searchTerms: [
      "Rust E0197 inherent impl cannot be unsafe",
      "unsafe impl struct methods Rust",
      "where to put unsafe on impl",
    ],
    evidence: [
      "Rust 1.98.1 E0197 compile failure",
      "unsafe inherent Counter impl",
      "ordinary impl block repair",
    ],
    caseSlug: "inherent-impl-blocks-cannot-be-marked-unsafe",
  },
  {
    id: "RFA-521",
    area: "upgrades-compatibility",
    symptom:
      "Writing unsafe impl !Send for Local fails with E0198 because a negative implementation cannot carry unsafe.",
    likelyCause:
      "Unsafe positive implementations promise invariants that safe callers rely on, while denying a capability grants no such operation and has separate stability restrictions.",
    firstCheck:
      "Remove the invalid safety marker and verify whether stable field composition, a compile-fail assertion, or an explicitly pinned nightly feature expresses the real auto-trait intent.",
    searchTerms: [
      "Rust E0198 negative impl cannot be unsafe",
      "unsafe impl not Send Rust",
      "negative trait implementations stable Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0198 compile failure",
      "unsafe negative Send impl",
      "stable type without unsafe negative impl",
    ],
    caseSlug: "negative-trait-impls-cannot-be-marked-unsafe",
  },
  {
    id: "RFA-522",
    area: "diagnostics-macros",
    symptom:
      "Writing Vec(&str) in a type position fails with E0214 because ordinary generic type arguments use angle brackets.",
    likelyCause:
      "Parentheses normally form calls or tuples and have special Fn-family notation, whereas Vec declares an ordinary type parameter instantiated with angle brackets.",
    firstCheck:
      "Determine whether the source position describes a type, tuple, call, or Fn signature, then rebuild the syntax tree with each delimiter serving that role.",
    searchTerms: [
      "Rust E0214 parenthesized type parameters",
      "Vec parentheses instead of angle brackets Rust",
      "generic type syntax Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0214 compile failure",
      "Vec receives parenthesized str type",
      "Vec angle-bracket repair",
    ],
    caseSlug: "generic-types-use-angle-brackets-not-parentheses",
  },
  {
    id: "RFA-523",
    area: "concurrency-memory",
    symptom:
      "A dyn Transfer trait object deriving both source and target lifetime bounds fails with E0227 because no unique object lifetime can be inferred.",
    likelyCause:
      "The erased implementor must satisfy several supertrait lifetime obligations, but default trait-object lifetime rules cannot select one bound from independent candidates.",
    firstCheck:
      "Introduce one explicit object lifetime, map every supertrait relationship, and verify the object lifetime outlives each required lifetime with non-static scope tests.",
    searchTerms: [
      "Rust E0227 ambiguous lifetime bound trait object",
      "multiple trait object lifetime bounds Rust",
      "explicit dyn Trait object lifetime",
    ],
    evidence: [
      "Rust 1.98.1 E0227 compile failure",
      "Transfer derives source and target bounds",
      "explicit object lifetime repair",
    ],
    caseSlug: "trait-objects-with-multiple-derived-lifetimes-need-an-explicit-bound",
  },
  {
    id: "RFA-524",
    area: "concurrency-memory",
    symptom:
      "Writing impl View<'a> without impl<'a> fails with E0261 because the lifetime name is not declared in the impl scope.",
    likelyCause:
      "The struct declaration and separate impl item have independent generic scopes, so using a lifetime argument does not itself declare that name.",
    firstCheck:
      "Separate the impl's parameter declaration from the self type's arguments, introduce each used lifetime, and keep method-only borrows in narrower method scopes.",
    searchTerms: [
      "Rust E0261 undeclared lifetime impl",
      "impl struct lifetime parameter syntax Rust",
      "use of undeclared lifetime name",
    ],
    evidence: [
      "Rust 1.98.1 E0261 compile failure",
      "View impl uses undeclared a",
      "impl lifetime declaration repair",
    ],
    caseSlug: "an-impl-block-must-declare-the-lifetimes-it-uses",
  },
  {
    id: "RFA-525",
    area: "concurrency-memory",
    symptom:
      "Declaring fn borrow<'static> fails with E0262 because 'static is a reserved built-in lifetime and cannot be introduced as a generic parameter.",
    likelyCause:
      "Static already denotes program-duration validity, while a generic lifetime parameter is a caller-selected relationship that needs another declared name.",
    firstCheck:
      "Identify the real owner and use a generic lifetime for ordinary borrows, reserving static references or bounds for genuine program-long or ownership-free requirements.",
    searchTerms: [
      "Rust E0262 invalid lifetime parameter static",
      "cannot name lifetime parameter static Rust",
      "generic lifetime versus static",
    ],
    evidence: [
      "Rust 1.98.1 E0262 compile failure",
      "function declares built-in static name",
      "generic a lifetime repair",
    ],
    caseSlug: "static-is-a-built-in-lifetime-not-a-parameter-name",
  },
  {
    id: "RFA-526",
    area: "diagnostics-macros",
    symptom:
      "Using break inside a closure with no loop in that closure fails with E0267 because the closure is a separate control-flow body.",
    likelyCause:
      "Closures capture environment values but not an enclosing loop's jump target, and they may be stored or invoked after that target has disappeared.",
    firstCheck:
      "Return a ControlFlow, Result, or domain signal for caller-owned traversal, or put the loop inside the closure when the closure genuinely owns iteration.",
    searchTerms: [
      "Rust E0267 break inside closure",
      "break outer loop from closure Rust",
      "closure cannot break loop",
    ],
    evidence: [
      "Rust 1.98.1 E0267 compile failure",
      "break has no loop inside closure",
      "closure-local loop repair",
    ],
    caseSlug: "break-inside-a-closure-cannot-target-an-outer-loop",
  },
  {
    id: "RFA-527",
    area: "diagnostics-macros",
    symptom:
      "Using break directly inside a function fails with E0268 because there is no enclosing loop or labelled breakable block to receive control.",
    likelyCause:
      "Break transfers control to one lexical construct rather than acting as a synonym for returning from the function boundary.",
    firstCheck:
      "Name the intended control owner, use return when the function is finished, and remember only loop or labelled blocks—not for or while—carry break values.",
    searchTerms: [
      "Rust E0268 break outside loop",
      "break from function Rust",
      "break needs loop or labeled block",
    ],
    evidence: [
      "Rust 1.98.1 E0268 compile failure",
      "function-level break with no target",
      "early return from iteration repair",
    ],
    caseSlug: "break-needs-an-enclosing-loop-or-breakable-block",
  },
  {
    id: "RFA-528",
    area: "diagnostics-macros",
    symptom:
      "Binding Vec::new without later element use fails with E0282 because inference has no evidence for the vector's element type.",
    likelyCause:
      "An empty generic constructor creates an unconstrained T, and variable names, capacity, or human expectation do not supply a type-system equation.",
    firstCheck:
      "Find the unresolved parameter and add the smallest annotation at the binding, constructor, collection, or return boundary that actually owns the domain choice.",
    searchTerms: [
      "Rust E0282 type annotations needed Vec new",
      "empty Vec cannot infer type Rust",
      "where to add Rust type annotation",
    ],
    evidence: [
      "Rust 1.98.1 E0282 compile failure",
      "unused Vec new has unknown element",
      "local Vec u8 annotation repair",
    ],
    caseSlug: "an-empty-generic-collection-needs-enough-type-context",
  },
  {
    id: "RFA-529",
    area: "diagnostics-macros",
    symptom:
      "Adding u64 and u32.into() fails with E0284 because both Into's output and Add's right-hand type remain generic enough to admit multiple candidates.",
    likelyCause:
      "The final addition result does not uniquely determine a shared intermediate type across two independent trait parameter relationships.",
    firstCheck:
      "Name the conversion destination with a typed intermediate or Target::from/TryFrom, then apply the operator after validation and unit meaning are explicit.",
    searchTerms: [
      "Rust E0284 type annotations needed into add",
      "ambiguous Into conversion result Rust",
      "intermediate type generic conversion Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0284 compile failure",
      "u32 into result underconstrained before u64 addition",
      "typed u64 intermediate repair",
    ],
    caseSlug: "generic-conversions-may-need-an-intermediate-result-type",
  },
  {
    id: "RFA-530",
    area: "diagnostics-macros",
    symptom:
      "Declaring an inherent method with self: &Scheduler inside impl Cache fails with E0307 because the receiver does not lead back to Cache.",
    likelyCause:
      "The self parameter carries method ownership and lookup identity, so it cannot be replaced by an unrelated dependency type.",
    firstCheck:
      "Identify the type owning the impl, choose a supported receiver rooted in Self, and pass unrelated collaborators as ordinary parameters.",
    searchTerms: [
      "Rust E0307 invalid self parameter type",
      "custom self receiver Rust",
      "method receiver must dereference to Self",
    ],
    evidence: [
      "Rust 1.98.1 E0307 compile failure",
      "Cache method receives Scheduler as self",
      "ordinary shared Cache receiver repair",
    ],
    caseSlug: "rust-method-receivers-must-lead-back-to-self",
  },
  {
    id: "RFA-531",
    area: "concurrency-memory",
    symptom:
      "A Snapshot field using <T as Project<'a>>::Output fails with E0309 because the applicable implementation requires T: 'a but the struct does not promise it.",
    likelyCause:
      "Associated-type projection imports the selected implementation's well-formedness bounds, while the container currently admits shorter borrowed types.",
    firstCheck:
      "Inspect the projected trait implementation, translate its outlives requirement, and state the smallest honest bound on the container that fundamentally needs it.",
    searchTerms: [
      "Rust E0309 parameter type may not live long enough",
      "associated type projection T outlives a",
      "struct generic lifetime bound Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0309 compile failure",
      "associated Project output requires T outlive a",
      "Snapshot where T a repair",
    ],
    caseSlug: "projected-associated-types-can-require-an-explicit-outlives-bound",
  },
  {
    id: "RFA-532",
    area: "concurrency-memory",
    symptom:
      "A function with elided input and output lifetimes calls a helper requiring T: 'a and fails with E0311 because its generic T has no matching outlives promise.",
    likelyCause:
      "Elision creates a real caller-chosen lifetime, but nothing in the outer inputs implies that unrelated generic T remains valid for it.",
    firstCheck:
      "Expand the elided signature, find which helper introduces T: 'a, and either expose that named relationship or remove an unnecessary downstream bound.",
    searchTerms: [
      "Rust E0311 parameter type may not live long enough",
      "elided lifetime generic T outlives",
      "explicit lifetime fixes E0311 Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0311 compile failure",
      "elided token lifetime lacks T outlives relation",
      "named lifetime and T bound repair",
    ],
    caseSlug: "lifetime-elision-can-hide-a-missing-generic-outlives-bound",
  },
  {
    id: "RFA-533",
    area: "diagnostics-macros",
    symptom:
      "A where predicate written as for<'a> &'a T: for<'b> Relates<'a, 'b> fails with E0316 because it nests one higher-ranked lifetime quantifier inside another.",
    likelyCause:
      "The two binders split the quantification of one logical predicate into an unsupported nested syntax.",
    firstCheck:
      "State the capability aloud as for every lifetime, gather all lifetimes for that predicate into one for binder, and verify their intended independence.",
    searchTerms: [
      "Rust E0316 nested quantification lifetimes",
      "for a b higher ranked trait bound",
      "HRTB nested for lifetime Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0316 compile failure",
      "nested for a and for b predicate",
      "single for a b binder repair",
    ],
    caseSlug: "higher-ranked-lifetime-bounds-use-one-quantifier-per-predicate",
  },
  {
    id: "RFA-534",
    area: "diagnostics-macros",
    symptom:
      "Credits supports the + operator through Add but total += Credits(3) fails with E0368 because AddAssign is a separate trait obligation.",
    likelyCause:
      "Producing a new output and updating an existing mutable place admit different types and semantics, so Rust does not derive one operator trait from the other.",
    firstCheck:
      "Map the compound operator to its exact Assign trait, verify the left side is writable, and decide whether in-place mutation is a truthful domain contract.",
    searchTerms: [
      "Rust E0368 Add but not AddAssign",
      "implement plus equals custom type Rust",
      "Add does not imply AddAssign Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0368 compile failure",
      "Credits implements Add without AddAssign",
      "explicit AddAssign implementation repair",
    ],
    caseSlug: "add-does-not-automatically-provide-addassign",
  },
  {
    id: "RFA-535",
    area: "diagnostics-macros",
    symptom:
      "Comparing two Version values with > fails with E0369 because the struct has fields but no PartialOrd implementation defining how whole values are ordered.",
    likelyCause:
      "Comparable fields do not give a containing domain type one automatic or necessarily meaningful global order.",
    firstCheck:
      "Map the operator to PartialOrd, decide whether the domain has a partial or total order, and derive only when declaration-order comparison is correct.",
    searchTerms: [
      "Rust E0369 binary operation cannot be applied custom struct",
      "compare custom structs greater than Rust",
      "derive PartialOrd field order Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0369 compile failure",
      "Version greater-than without PartialOrd",
      "derived total lexicographic ordering repair",
    ],
    caseSlug: "comparison-operators-require-an-ordering-contract",
  },
  {
    id: "RFA-536",
    area: "diagnostics-macros",
    symptom:
      "Implementing Observable for dyn Service fails with E0371 because Service declares Observable as a supertrait and every Service trait object already carries that obligation.",
    likelyCause:
      "A subtrait includes its supertrait contract, so the dyn subtrait cannot receive a competing duplicate implementation.",
    firstCheck:
      "Implement both required contracts on the concrete type, use inherited methods through dyn Service, and introduce a wrapper for genuinely different erased behaviour.",
    searchTerms: [
      "Rust E0371 trait object automatically implements supertrait",
      "impl supertrait for dyn subtrait Rust",
      "trait object call supertrait method",
    ],
    evidence: [
      "Rust 1.98.1 E0371 compile failure",
      "Observable redundantly implemented for dyn Service",
      "concrete Api implements both contracts repair",
    ],
    caseSlug: "a-trait-object-already-satisfies-its-supertraits",
  },
  {
    id: "RFA-537",
    area: "diagnostics-macros",
    symptom:
      "Returning address after assigning it only inside the production branch fails with E0381 because the false path reaches the use with no initialized value.",
    likelyCause:
      "A declaration supplies a binding and type but no default value, leaving one reachable control-flow path unable to prove definite initialization.",
    firstCheck:
      "Trace every path to the first read and use an if or match expression, Option, Result, or complete branch assignments to produce one valid value.",
    searchTerms: [
      "Rust E0381 possibly uninitialized binding",
      "initialize variable in if branches Rust",
      "Rust definite initialization control flow",
    ],
    evidence: [
      "Rust 1.98.1 E0381 compile failure",
      "endpoint address missing false-branch initialization",
      "if expression initializes one value repair",
    ],
    caseSlug: "every-control-flow-path-must-initialize-a-value-before-use",
  },
  {
    id: "RFA-538",
    area: "diagnostics-macros",
    symptom:
      "Assigning a second value to retries fails with E0384 because let bindings are immutable unless their declaration explicitly opts into mutation.",
    likelyCause:
      "The code uses one immutable identity for two sequential values without deciding whether this is evolving state or a transformation stage.",
    firstCheck:
      "Use a small mut binding for genuine evolving state, or preserve semantic stages with distinct immutable names or deliberate short shadowing.",
    searchTerms: [
      "Rust E0384 cannot assign twice immutable variable",
      "mut versus shadowing Rust",
      "reassignment of immutable binding Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0384 compile failure",
      "retries reassigned after immutable initialization",
      "separate configured and effective values repair",
    ],
    caseSlug: "reassignment-needs-an-explicit-mutability-or-transformation-choice",
  },
  {
    id: "RFA-539",
    area: "diagnostics-macros",
    symptom:
      "Declaring Reads: Writes and Writes: Reads fails with E0391 because computing either trait's supertrait obligations recursively requires the other.",
    likelyCause:
      "Mutual prerequisite edges have no foundational predicate from which trait well-formedness can be established.",
    firstCheck:
      "Draw the dependency graph, extract a real shared base, or compose independent capabilities with A + B at the use site.",
    searchTerms: [
      "Rust E0391 cycle detected super predicates",
      "cyclic supertraits Rust",
      "mutually dependent traits Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0391 compile failure",
      "Reads and Writes cyclic supertrait predicates",
      "shared Resource base trait repair",
    ],
    caseSlug: "cyclic-supertraits-have-no-foundational-contract",
  },
  {
    id: "RFA-540",
    area: "diagnostics-macros",
    symptom:
      "Writing impl u64 with a retry-budget method fails with E0390 because a crate cannot add inherent items to a primitive type it does not define.",
    likelyCause:
      "Inherent method namespaces belong to the defining type and cannot accept competing additions from arbitrary downstream crates.",
    firstCheck:
      "Choose a local extension trait for opt-in syntax, a newtype for domain identity and invariants, or an ordinary free function.",
    searchTerms: [
      "Rust E0390 cannot define inherent impl primitive type",
      "add method to u64 Rust extension trait",
      "newtype versus extension trait Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0390 compile failure",
      "inherent retry-budget method on u64",
      "local extension trait implementation repair",
    ],
    caseSlug: "inherent-methods-cannot-be-added-directly-to-primitive-types",
  },
  {
    id: "RFA-541",
    area: "concurrency-memory",
    symptom:
      "A closure captures events mutably while an earlier reference to events[0] is still used, producing E0500 because both borrows would be live together.",
    likelyCause:
      "Closure construction stores the required unique access before invocation, overlapping a later-used shared reference into the same vector.",
    firstCheck:
      "Locate the earlier reference's last use, finish observation before closure creation, or pass state into the closure for a shorter call-scoped borrow.",
    searchTerms: [
      "Rust E0500 closure requires unique access already borrowed",
      "closure mutable capture existing immutable borrow Vec",
      "borrow ends before closure creation Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0500 compile failure",
      "Vec element borrow overlaps mutating closure capture",
      "finish read before closure construction repair",
    ],
    caseSlug: "a-closure-cannot-mutate-while-an-earlier-borrow-is-still-used",
  },
  {
    id: "RFA-542",
    area: "concurrency-memory",
    symptom:
      "Using events directly after a closure has captured it for mutation fails with E0501 because the closure is called later and still owns the unique borrow.",
    likelyCause:
      "A stored mutable closure capture reserves access across surrounding statements until the closure's last use or destruction.",
    firstCheck:
      "Reorder only if semantics permit, end or define the closure in a narrower phase, or make caller-owned state an explicit closure parameter.",
    searchTerms: [
      "Rust E0501 previous closure requires unique access",
      "mutable variable already captured by closure",
      "closure parameter instead of mutable capture Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0501 compile failure",
      "captured Vec used directly before later closure call",
      "non-capturing closure parameter repair",
    ],
    caseSlug: "a-mutable-closure-capture-reserves-access-until-the-closure-is-finished",
  },
  {
    id: "RFA-543",
    area: "concurrency-memory",
    symptom:
      "Reading count directly after creating &mut count fails with E0503 because the mutable reference is used later and therefore keeps exclusive access active.",
    likelyCause:
      "The mutable reference temporarily becomes the only valid access path, and its later use extends that interval across the direct read.",
    firstCheck:
      "Find the mutable borrow's creation and final use, operate through that reference, or snapshot data before granting unique access.",
    searchTerms: [
      "Rust E0503 cannot use because mutably borrowed",
      "read value while mutable reference live Rust",
      "last use mutable borrow Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0503 compile failure",
      "direct count read before later mutable-reference use",
      "update through reference then direct read repair",
    ],
    caseSlug: "a-value-cannot-be-used-directly-while-its-mutable-borrow-remains-live",
  },
  {
    id: "RFA-544",
    area: "concurrency-memory",
    symptom:
      "Moving payload into archive fails with E0505 because event_id borrows its string storage and is used after the ownership transfer.",
    likelyCause:
      "The consuming call may relocate, retain, or drop the owner, which would leave the later-used slice without valid backing storage.",
    firstCheck:
      "Finish borrowed work before handoff, change the callee to borrow if it does not need ownership, or own the smallest derived data that must survive.",
    searchTerms: [
      "Rust E0505 cannot move out because borrowed",
      "move String while str slice still used",
      "finish borrow before ownership transfer Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0505 compile failure",
      "string slice used after payload move",
      "finish event-id observation before archive repair",
    ],
    caseSlug: "ownership-cannot-move-while-a-later-borrow-still-needs-the-value",
  },
  {
    id: "RFA-545",
    area: "concurrency-memory",
    symptom:
      "Assigning a new String to endpoint fails with E0506 because selected still borrows the old string and is read after the replacement.",
    likelyCause:
      "Whole-value assignment removes the previous allocation while a live slice still depends on its bytes.",
    firstCheck:
      "End the observation before replacement, or create independent owned data when old and new states must remain available together.",
    searchTerms: [
      "Rust E0506 cannot assign because borrowed",
      "replace String while str reference alive",
      "end borrow before reassignment Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0506 compile failure",
      "str view remains live across String replacement",
      "observation scope ends before assignment repair",
    ],
    caseSlug: "replacing-a-value-would-invalidate-a-live-borrow",
  },
  {
    id: "RFA-546",
    area: "concurrency-memory",
    symptom:
      "Binding workers[0] as an owned String fails with E0508 because indexing provides a place inside the still-whole array and String is not Copy.",
    likelyCause:
      "An indexed move would leave an unrepresented uninitialized hole in a fixed-size array that remains in scope.",
    firstCheck:
      "Borrow or clone intentionally, consume the complete array through a pattern or iterator, or replace the slot with another valid value.",
    searchTerms: [
      "Rust E0508 cannot move out non-copy array",
      "move String out of array by index Rust",
      "destructure array move elements Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0508 compile failure",
      "indexed move from String array",
      "whole-array destructuring move repair",
    ],
    caseSlug: "array-indexing-cannot-move-out-a-non-copy-element",
  },
  {
    id: "RFA-547",
    area: "diagnostics-macros",
    symptom:
      "Assigning state = None inside a guard while matching state fails with E0510 because the guard would change the value whose arm selection is still in progress.",
    likelyCause:
      "A guard refines a candidate pattern without restarting the match, so mutating its subject could invalidate earlier exhaustiveness decisions.",
    firstCheck:
      "Keep the guard observational and perform the state transition before matching or inside the selected arm body.",
    searchTerms: [
      "Rust E0510 cannot assign in match guard",
      "mutate matched value inside guard Rust",
      "match guard side effects exhaustiveness",
    ],
    evidence: [
      "Rust 1.98.1 E0510 compile failure",
      "Option state assigned during its match guard",
      "mutation moved into selected arm repair",
    ],
    caseSlug: "match-guards-cannot-mutate-the-value-being-classified",
  },
  {
    id: "RFA-548",
    area: "concurrency-memory",
    symptom:
      "Creating reserve and commit closures that both capture total for mutation fails with E0524 because both closure values would hold unique access at once.",
    likelyCause:
      "Sequential invocation does not prevent the two stored closure environments from simultaneously containing exclusive paths to one place.",
    firstCheck:
      "Pass state at invocation, end one closure before constructing the next, split truly disjoint fields, or choose explicit shared-state machinery.",
    searchTerms: [
      "Rust E0524 two closures require unique access",
      "multiple closures capture same mutable reference",
      "pass mutable state into closure Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0524 compile failure",
      "reserve and commit both capture mutable total",
      "call-scoped mutable parameters repair",
    ],
    caseSlug: "two-live-closures-cannot-both-capture-one-mutable-reference",
  },
  {
    id: "RFA-549",
    area: "diagnostics-macros",
    symptom:
      "Passing a closure that drops its captured String to run_twice fails with E0525 because consuming the capture permits only one call, while the function requires Fn.",
    likelyCause:
      "The first invocation moves the payload out of the closure environment, leaving no value for a second invocation.",
    firstCheck:
      "Classify the callback as observer, updater, or consumer, then borrow for Fn, retain mutable state for FnMut, or expose one-shot FnOnce.",
    searchTerms: [
      "Rust E0525 closure FnOnce not Fn",
      "closure consumes captured String cannot call twice",
      "Fn FnMut FnOnce capture behaviour Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0525 compile failure",
      "drop consumes captured payload in closure",
      "borrow-only repeated callback repair",
    ],
    caseSlug: "consuming-a-capture-makes-a-closure-fnonce-not-fn",
  },
  {
    id: "RFA-550",
    area: "diagnostics-macros",
    symptom:
      "Writing &dyn Convert when Convert<T = Self> fails with E0393 because erasing Self also removes the concrete value needed by that default.",
    likelyCause:
      "Each implementor substitutes a different Self-based trait parameter, while a trait object needs one shared fully determined callable interface.",
    firstCheck:
      "Specify the object parameter explicitly, or redesign heterogeneous outputs with an associated type constraint, enum, generic boundary, or deliberate erasure.",
    searchTerms: [
      "Rust E0393 type parameter must be explicitly specified dyn trait",
      "trait default generic Self trait object",
      "dyn Trait generic parameter default Self",
    ],
    evidence: [
      "Rust 1.98.1 E0393 compile failure",
      "Convert T defaults to erased Self",
      "explicit dyn Convert usize repair",
    ],
    caseSlug: "self-based-generic-defaults-must-be-explicit-on-trait-objects",
  },
  {
    id: "RFA-551",
    area: "diagnostics-macros",
    symptom:
      "A public Decode implementation exposes private InternalRecord as its associated Record type and fails with E0446 because downstream callers could name the public projection but not its result.",
    likelyCause:
      "The selected associated type has narrower visibility than the public type-level contract through which it is exposed.",
    firstCheck:
      "Publish a stable wrapper or type when it is real API, narrow the trait's visibility for internal plumbing, or redesign operations to hide representation.",
    searchTerms: [
      "Rust E0446 private type in public interface",
      "public trait associated type private struct",
      "visibility associated type projection Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0446 compile failure",
      "Decode Record aliases private InternalRecord",
      "public associated record repair",
    ],
    caseSlug: "a-public-associated-type-cannot-reveal-a-private-type",
  },
  {
    id: "RFA-552",
    area: "diagnostics-macros",
    symptom:
      'Writing allow(non_snake_case = "legacy protocol name") fails with E0452 because a lint name is an identifier, not a key accepting a string value.',
    likelyCause:
      "The attribute confuses a lint path with the separate reason name-value meta item accepted by lint attributes.",
    firstCheck:
      "List lint paths directly, write one `reason =` item, keep the scope narrow, and verify syntax on the project's oldest supported compiler.",
    searchTerms: [
      "Rust E0452 malformed lint attribute input",
      "allow lint with reason syntax Rust",
      "Rust lint reason attribute",
    ],
    evidence: [
      "Rust 1.98.1 E0452 compile failure",
      "string assigned directly to non_snake_case",
      "reason meta item repair",
    ],
    caseSlug: "lint-reasons-use-reason-not-an-assignment-to-the-lint-name",
  },
  {
    id: "RFA-553",
    area: "diagnostics-macros",
    symptom:
      "An item-level allow(non_snake_case) under crate-level forbid(non_snake_case) fails with E0453 because forbid deliberately prevents weaker inner overrides.",
    likelyCause:
      "Forbid is an inherited non-overridable policy rather than only another spelling for deny-level severity.",
    firstCheck:
      "Find the outer source or command-line policy, satisfy it, or change forbid to deny only when reviewed scoped exceptions are intentionally allowed.",
    searchTerms: [
      "Rust E0453 allow incompatible previous forbid",
      "difference between deny and forbid Rust lint",
      "override forbidden lint attribute Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0453 compile failure",
      "inner allow conflicts with crate forbid",
      "code follows locked lint policy repair",
    ],
    caseSlug: "forbid-is-a-lint-policy-that-inner-allow-cannot-override",
  },
  {
    id: "RFA-554",
    area: "concurrency-memory",
    symptom:
      "Defining an associated type as &'outer Handler<'inner> fails with E0491 because Handler may carry data valid for less time than the outer reference.",
    likelyCause:
      "The nested borrowed relationships of the referent are unconstrained and may expire before the reference promising access to that referent.",
    firstCheck:
      "Identify outer and nested roles, require the inner lifetime to outlive the outer, or shorten/redesign the returned projection.",
    searchTerms: [
      "Rust E0491 reference longer lifetime than data",
      "inner lifetime must outlive outer reference Rust",
      "associated type nested lifetime outlives",
    ],
    evidence: [
      "Rust 1.98.1 E0491 compile failure",
      "outer reference to Handler carrying unconstrained inner lifetime",
      "inner outlives outer bound repair",
    ],
    caseSlug: "the-data-inside-a-reference-must-outlive-the-reference",
  },
  {
    id: "RFA-555",
    area: "concurrency-memory",
    symptom:
      "Borrowing a const AtomicUsize into a static reference fails with E0492 because const use denotes a value expression rather than one stable shared storage location.",
    likelyCause:
      "Interior mutation exposes allocation identity, but a const does not promise one unique address shared by all uses.",
    firstCheck:
      "Use a Sync static or explicit owner for shared mutable identity, then review atomic ordering or lock invariants separately.",
    searchTerms: [
      "Rust E0492 borrow const interior mutability",
      "const AtomicUsize reference create static instead",
      "Rust const versus static address identity",
    ],
    evidence: [
      "Rust 1.98.1 E0492 compile failure",
      "static reference borrows const AtomicUsize temporary",
      "shared static atomic repair",
    ],
    caseSlug: "a-const-with-interior-mutability-has-no-single-address-to-borrow",
  },
  {
    id: "RFA-556",
    area: "diagnostics-macros",
    symptom:
      "Selecting tuple element .1 in a static initializer fails with E0493 because the unselected Guard must be dropped during const evaluation and Guard has a custom runtime destructor.",
    likelyCause:
      "Tuple projection creates a destructor-bearing temporary that cannot escape into the final static and would require arbitrary Drop code at compile time.",
    firstCheck:
      "Construct the final value directly, inspect hidden temporary cleanup, or move resource initialization and lifecycle to runtime.",
    searchTerms: [
      "Rust E0493 destructor cannot be evaluated at compile time",
      "Drop type static initializer tuple const eval",
      "custom destructor const context Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0493 compile failure",
      "tuple creates discarded Guard during static initialization",
      "direct Guard construction repair",
    ],
    caseSlug: "const-evaluation-cannot-discard-a-value-with-a-runtime-destructor",
  },
  {
    id: "RFA-557",
    area: "diagnostics-macros",
    symptom:
      "A method declares its own 'a inside impl<'a> View<'a> and fails with E0496 because the inner lifetime name would shadow the stored-data lifetime.",
    likelyCause:
      "Two independently owned generic scopes reuse one visible lifetime identifier and make later relationships unable to refer unambiguously to the outer parameter.",
    firstCheck:
      "Classify the inner relation as independent, identical, or elidable, then rename it, reuse the outer parameter, or rely on correct elision.",
    searchTerms: [
      "Rust E0496 lifetime name shadows lifetime in scope",
      "method lifetime same name as impl lifetime",
      "rename nested lifetime parameters Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0496 compile failure",
      "method redeclares impl lifetime a",
      "stored and input lifetime names repair",
    ],
    caseSlug: "nested-generic-scopes-cannot-redeclare-the-same-lifetime-name",
  },
  {
    id: "RFA-558",
    area: "ffi-targets",
    symptom:
      "Annotating Header with repr(network) fails with E0539 because network is not a representation hint understood by rustc.",
    likelyCause:
      "The builtin repr attribute has a closed language vocabulary for selected memory-layout guarantees, not domain-specific encoding names.",
    firstCheck:
      "Use only a supported hint for its documented layout promise and implement byte order, framing, and validation through explicit serialization.",
    searchTerms: [
      "Rust E0539 malformed repr attribute input",
      "repr network Rust byte order",
      "repr C does not serialize protocol Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0539 compile failure",
      "unknown network representation hint",
      "supported repr C layout repair",
    ],
    caseSlug: "repr-accepts-layout-hints-not-domain-format-names",
  },
  {
    id: "RFA-559",
    area: "diagnostics-macros",
    symptom:
      "Constructing Limits with timeout_ms fails with E0560 because the resolved Limits definition declares only retries.",
    likelyCause:
      "Named-field construction follows the exact resolved type schema and cannot add map-like keys outside its definition.",
    firstCheck:
      "Confirm the fully qualified type and feature set, then fix spelling, evolve the owned schema deliberately, or translate external data at a boundary.",
    searchTerms: [
      "Rust E0560 struct has no field named",
      "unknown field in struct initializer Rust",
      "resolved struct definition field mismatch",
    ],
    evidence: [
      "Rust 1.98.1 E0560 compile failure",
      "Limits initializer includes undeclared timeout_ms",
      "type definition includes intended field repair",
    ],
    caseSlug: "a-struct-literal-cannot-invent-a-field-outside-the-type-definition",
  },
  {
    id: "RFA-560",
    area: "diagnostics-macros",
    symptom:
      "A function pointer alias written as fn(mut value: u32) fails with E0561 because mut is a binding pattern, while a function type describes only the callable signature.",
    likelyCause:
      "Implementation-local binding behaviour has been placed in a type that records only values crossing the call boundary.",
    firstCheck:
      "Keep only parameter types or simple names in the pointer alias and put mutability or destructuring in each concrete function definition.",
    searchTerms: [
      "Rust E0561 patterns not allowed function pointer types",
      "mut parameter in fn type alias Rust",
      "function pointer parameter names Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0561 compile failure",
      "mut pattern placed in Update fn alias",
      "mutation kept in function definition repair",
    ],
    caseSlug: "function-pointer-parameter-names-cannot-carry-binding-patterns",
  },
  {
    id: "RFA-561",
    area: "ffi-targets",
    symptom:
      "Annotating Status with repr(u16, u32) fails with E0566 because one enum cannot promise two incompatible discriminant representations simultaneously.",
    likelyCause:
      "Representation hints are concrete layout requirements rather than ordered fallbacks, and these two integer widths cannot both describe one discriminant.",
    firstCheck:
      "Select the one ABI width actually required or make target conditions exhaustive and mutually exclusive, then validate external discriminants safely.",
    searchTerms: [
      "Rust E0566 conflicting representation hints",
      "repr u16 u32 same enum Rust",
      "conditional enum repr cfg_attr Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0566 compile failure",
      "Status declares u16 and u32 repr",
      "single u16 representation repair",
    ],
    caseSlug: "an-enum-cannot-have-two-conflicting-integer-representations",
  },
  {
    id: "RFA-562",
    area: "diagnostics-macros",
    symptom:
      "Declaring a function return type as State::Ready fails with E0573 because Ready is a variant value in the State type, not its own type.",
    likelyCause:
      "A path resolving in the value namespace has been used where the signature requires a type defining the full set of values.",
    firstCheck:
      "Return the enclosing enum for runtime alternatives, or introduce a real marker/newtype only when callers need compile-time proof of one state.",
    searchTerms: [
      "Rust E0573 expected type found variant",
      "enum variant as return type Rust",
      "State Ready is not a type Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0573 compile failure",
      "State Ready placed in return type position",
      "enclosing State return type repair",
    ],
    caseSlug: "an-enum-variant-is-a-value-constructor-not-a-return-type",
  },
  {
    id: "RFA-563",
    area: "diagnostics-macros",
    symptom:
      "Using protocol { version: 1 } fails with E0574 because protocol resolves to a module, while record construction requires a struct, struct-like variant, or union.",
    likelyCause:
      "The path stops at a namespace container rather than reaching the constructible item whose fields define the value.",
    firstCheck:
      "Follow or import the exact type or variant path, then address its field visibility, invariants, and generated-code boundary separately.",
    searchTerms: [
      "Rust E0574 expected struct found module",
      "construct struct inside module Rust path",
      "module used as struct literal Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0574 compile failure",
      "protocol module used with record literal",
      "protocol Header path repair",
    ],
    caseSlug: "a-module-path-must-name-the-struct-being-constructed",
  },
  {
    id: "RFA-564",
    area: "diagnostics-macros",
    symptom:
      "Writing pub(in crate::Boundary) where Boundary is an enum fails with E0577 because a restricted visibility scope must resolve to an ancestor module.",
    likelyCause:
      "Rust privacy follows lexical module ancestry and cannot use an arbitrary type as a friend-like access scope.",
    firstCheck:
      "Place the item under the module owning its invariant and restrict it to self, super, crate, or another valid ancestor path.",
    searchTerms: [
      "Rust E0577 expected module visibility scope",
      "pub in path must be ancestor module Rust",
      "restricted visibility enum path Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0577 compile failure",
      "enum Boundary used as visibility scope",
      "ancestor boundary module repair",
    ],
    caseSlug: "restricted-visibility-paths-must-name-ancestor-modules",
  },
  {
    id: "RFA-565",
    area: "diagnostics-macros",
    symptom:
      "The match pattern 0..0 fails with E0579 because an exclusive range includes its lower bound but excludes the identical upper bound, leaving no possible value.",
    likelyCause:
      "The compile-time category is an empty half-open interval, often exposing a boundary or generated-threshold mistake.",
    firstCheck:
      "Choose ordered exclusive bounds, inclusive syntax when both endpoints belong, or remove a category that is intentionally unreachable.",
    searchTerms: [
      "Rust E0579 lower bound range pattern less than upper",
      "empty exclusive range match pattern Rust",
      "0 dot dot 0 pattern Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0579 compile failure",
      "empty 0 through 0 exclusive pattern",
      "0 through 1 single-value range repair",
    ],
    caseSlug: "exclusive-range-patterns-must-contain-at-least-one-value",
  },
  {
    id: "RFA-566",
    area: "diagnostics-macros",
    symptom:
      "Declaring main(port: u16) fails with E0580 because the runtime entry point cannot receive arbitrary typed parameters from the operating system.",
    likelyCause:
      "The special process entry has a language-defined call signature rather than ordinary caller-selected Rust arguments.",
    firstCheck:
      "Keep main on an accepted signature, parse raw process input explicitly, and pass validated typed configuration into a testable ordinary run function.",
    searchTerms: [
      "Rust E0580 main function wrong type",
      "Rust main cannot take arguments",
      "parse command line port in main Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0580 compile failure",
      "typed port parameter added to main",
      "zero-argument main parses environment repair",
    ],
    caseSlug: "main-has-a-fixed-entry-signature-and-reads-inputs-from-the-environment",
  },
  {
    id: "RFA-567",
    area: "concurrency-memory",
    symptom:
      "The type for<'a> fn() -> &'a str fails with E0581 because callers could choose any return lifetime while no input connects that choice to valid storage.",
    likelyCause:
      "The higher-ranked signature promises an arbitrary borrowed output without any lifetime-bearing provenance in its input tuple.",
    firstCheck:
      "Tie output to an input lifetime, return genuinely static data, or return owned/shared storage whose lifetime the caller controls.",
    searchTerms: [
      "Rust E0581 return lifetime not constrained fn input",
      "for a fn return reference no arguments Rust",
      "function pointer borrowed output lifetime source",
    ],
    evidence: [
      "Rust 1.98.1 E0581 compile failure",
      "higher-ranked lifetime appears only in fn return",
      "static provider return repair",
    ],
    caseSlug: "a-function-pointer-cannot-return-a-reference-for-any-unconstrained-lifetime",
  },
  {
    id: "RFA-568",
    area: "concurrency-memory",
    symptom:
      "Requiring F: for<'a> Fn(u32) -> Option<&'a str> fails with E0582 because 'a appears only in the associated Output binding and no callback input constrains it.",
    likelyCause:
      "Fn arrow syntax hides an associated output projection whose borrowed lifetime lacks a real per-call input source.",
    firstCheck:
      "Put the lifetime on a reference input that owns the returned view, or choose an explicit static or owned output contract.",
    searchTerms: [
      "Rust E0582 associated Output lifetime not in trait inputs",
      "for a Fn returns reference lifetime input",
      "higher ranked closure output borrowed from argument",
    ],
    evidence: [
      "Rust 1.98.1 E0582 compile failure",
      "Fn Output reference lifetime absent from u32 input",
      "borrowed input and output lifetime repair",
    ],
    caseSlug: "a-higher-ranked-output-lifetime-must-be-tied-to-an-input",
  },
  {
    id: "RFA-569",
    area: "ffi-targets",
    symptom:
      "Annotating CacheLine with repr(align(24)) fails with E0589 because explicit alignment must be a supported power of two.",
    likelyCause:
      "Payload size was mistaken for an address divisibility requirement, but Rust represents explicit alignment through bounded powers of two.",
    firstCheck:
      "Choose a legal power of two only for a measured hardware or ABI need, then inspect padding, allocators, containing layouts, and target coverage.",
    searchTerms: [
      "Rust E0589 repr align not power of two",
      "repr align 24 invalid Rust",
      "Rust explicit alignment size padding",
    ],
    evidence: [
      "Rust 1.98.1 E0589 compile failure",
      "CacheLine requests alignment 24",
      "supported alignment 32 repair",
    ],
    caseSlug: "repr-align-values-must-be-supported-powers-of-two",
  },
  {
    id: "RFA-570",
    area: "diagnostics-macros",
    symptom:
      "Using an unlabeled break inside a while condition fails with E0590 even though the condition is lexically inside that loop.",
    likelyCause:
      "The condition decides whether the loop body begins, so that special position cannot use the loop as an implicit unlabeled control-flow destination.",
    firstCheck:
      "Name the intended destination explicitly or restructure the state machine as an ordinary loop whose body contains its exits.",
    searchTerms: [
      "Rust E0590 break while condition",
      "unlabeled break in while condition",
      "Rust labeled loop condition",
    ],
    evidence: [
      "Rust 1.98.1 E0590 compile failure",
      "unlabeled break inside condition block",
      "explicit search-loop repair",
    ],
    caseSlug: "break-in-a-while-condition-needs-an-explicit-loop-target",
  },
  {
    id: "RFA-571",
    area: "ffi-targets",
    symptom:
      "Transmuting a named function directly to fn() fails with E0591 because its function-item type is zero-sized and is not the function-pointer value.",
    likelyCause:
      "Compile-time function identity was mistaken for the runtime address representation produced by the language's normal function-item coercion.",
    firstCheck:
      "Assign the function item to an explicitly typed function pointer and verify signature, safety, ABI, and library lifetime before low-level use.",
    searchTerms: [
      "Rust E0591 transmute function item",
      "can't transmute zero sized function type",
      "function item coercion fn pointer Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0591 compile failure",
      "named callback passed directly to transmute",
      "safe fn-pointer coercion repair",
    ],
    caseSlug: "a-function-item-must-coerce-before-pointer-level-conversion",
  },
  {
    id: "RFA-572",
    area: "diagnostics-macros",
    symptom:
      "Two inherent impl blocks define Client::connect and fail with E0592 even when their source locations or bodies differ.",
    likelyCause:
      "Separate inherent implementation blocks extend one associated-item namespace rather than creating overload scopes from which Rust selects by signature.",
    firstCheck:
      "Find every inherent definition, decide which operation owns the contract, and give genuinely different policies distinct semantic names.",
    searchTerms: [
      "Rust E0592 duplicate definitions method",
      "same method in two impl blocks",
      "Rust inherent method overloading",
    ],
    evidence: [
      "Rust 1.98.1 E0592 compile failure",
      "connect repeated across Client impl blocks",
      "distinct connect and reconnect repair",
    ],
    caseSlug: "inherent-method-names-must-be-unique-across-impl-blocks",
  },
  {
    id: "RFA-573",
    area: "diagnostics-macros",
    symptom:
      "Passing a zero-argument closure where F: Fn(u32) -> u32 is required fails with E0593 because the callable contract supplies one argument.",
    likelyCause:
      "The closure body was treated as enough to define compatibility, while its parameter tuple is also part of the required callable protocol.",
    firstCheck:
      "Read the exact Fn bound and iterator item shape, then accept every supplied argument explicitly even when one is deliberately ignored.",
    searchTerms: [
      "Rust E0593 closure expected take argument",
      "closure takes 0 arguments expected 1 Rust",
      "Fn trait closure arity mismatch",
    ],
    evidence: [
      "Rust 1.98.1 E0593 compile failure",
      "zero-argument closure passed to Fn(u32)",
      "one-parameter transformation repair",
    ],
    caseSlug: "closure-arity-must-match-the-required-fn-contract",
  },
  {
    id: "RFA-574",
    area: "concurrency-memory",
    symptom:
      "Saving response.as_str() outside the block that owns response fails with E0597 because the String is dropped before the saved view is used.",
    likelyCause:
      "The reference binding has wider lexical scope than the allocation it borrows, and moving a view does not carry or extend its owner.",
    firstCheck:
      "Identify the concrete owner and last use, then widen ownership, return owned storage, or keep the borrow and its use inside the shorter scope.",
    searchTerms: [
      "Rust E0597 value does not live long enough",
      "String dropped while str borrowed block",
      "borrow local variable outside scope Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0597 compile failure",
      "str view escapes response owner block",
      "owner moved to enclosing scope repair",
    ],
    caseSlug: "a-borrow-cannot-outlive-the-local-value-backing-it",
  },
  {
    id: "RFA-575",
    area: "diagnostics-macros",
    symptom:
      "Applying ! to Enabled fails with E0600 because a boolean-looking wrapper does not automatically implement the Not operator.",
    likelyCause:
      "The inner field's representation was assumed to grant behaviour to a distinct domain type whose operator contract has not been declared.",
    firstCheck:
      "Decide whether negation has one lawful meaning, then implement Not with tests or retain a named method when the operation is contextual or fallible.",
    searchTerms: [
      "Rust E0600 cannot apply unary operator",
      "implement Not for custom type Rust",
      "unary exclamation newtype Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0600 compile failure",
      "Not absent for Enabled wrapper",
      "explicit Not implementation repair",
    ],
    caseSlug: "unary-operators-require-their-own-trait-contract",
  },
  {
    id: "RFA-576",
    area: "cargo-dependencies",
    symptom:
      "Compiling a source file as a binary fails with E0601 when it defines worker logic but no crate-level main function.",
    likelyCause:
      "Useful library-like functions were compiled under an executable target contract that requires a language-recognised process entrypoint.",
    firstCheck:
      "Confirm the Cargo or rustc crate type and active cfg, then add a thin main or move reusable logic to the intended library target.",
    searchTerms: [
      "Rust E0601 main function not found",
      "binary crate needs main Rust",
      "Cargo bin target missing main",
    ],
    evidence: [
      "Rust 1.98.1 E0601 compile failure",
      "binary source defines only run_worker",
      "crate-level main calls worker repair",
    ],
    caseSlug: "a-rust-binary-crate-needs-a-main-entrypoint",
  },
  {
    id: "RFA-577",
    area: "diagnostics-macros",
    symptom:
      "Casting a u32 code point directly to char fails with E0604 because not every u32 is a valid Unicode scalar value.",
    likelyCause:
      "Equal storage width was mistaken for equal validity domains, ignoring surrogate values and integers above Unicode's maximum scalar.",
    firstCheck:
      "Use char::from_u32 at the input boundary and decide explicitly whether invalid values are rejected, reported, or visibly replaced.",
    searchTerms: [
      "Rust E0604 u32 as char",
      "convert Unicode code point to char Rust",
      "char from_u32 invalid scalar value",
    ],
    evidence: [
      "Rust 1.98.1 E0604 compile failure",
      "u32 crab code point cast with as",
      "char from_u32 validation repair",
    ],
    caseSlug: "u32-to-char-needs-unicode-scalar-validation",
  },
  {
    id: "RFA-578",
    area: "diagnostics-macros",
    symptom:
      "Casting u8 to Vec<u8> with as fails with E0605 because as handles specified primitive casts and coercions, not allocation or collection construction.",
    likelyCause:
      "Representation-level casting syntax was used for a semantic choice involving collection length, ownership, and possible allocation.",
    firstCheck:
      "State the intended collection shape and choose an explicit constructor, From or TryFrom conversion, or iterator collection path.",
    searchTerms: [
      "Rust E0605 non primitive cast",
      "u8 as Vec u8 invalid Rust",
      "as cast versus From conversion Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0605 compile failure",
      "u8 cast directly to Vec u8",
      "explicit one-element vector repair",
    ],
    caseSlug: "as-casts-do-not-run-collection-conversions",
  },
  {
    id: "RFA-579",
    area: "diagnostics-macros",
    symptom:
      "Writing point[0] fails with E0608 because a struct does not become positionally indexable merely because it stores multiple fields.",
    likelyCause:
      "Field layout was mistaken for a public sequence contract, but bracket syntax requires built-in indexing or an explicit Index implementation.",
    firstCheck:
      "Decide whether the value is a named record or true collection, then use fields, checked get access, array storage, or a deliberate Index contract.",
    searchTerms: [
      "Rust E0608 cannot index into type",
      "implement Index for struct Rust",
      "struct square bracket indexing Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0608 compile failure",
      "Point indexed without Index implementation",
      "explicit x and y field repair",
    ],
    caseSlug: "square-bracket-indexing-requires-an-index-contract",
  },
  {
    id: "RFA-580",
    area: "diagnostics-macros",
    symptom:
      "Reading metrics.errors fails with E0609 because the resolved Metrics struct defines requests but no errors field.",
    likelyCause:
      "Code relied on a remembered or external schema rather than the exact type definition selected under the active imports, features, and generator version.",
    firstCheck:
      "Navigate to the resolved type, verify its active fields and domain meaning, then use an existing member or evolve the owned schema deliberately.",
    searchTerms: [
      "Rust E0609 no field on type",
      "unknown struct field access Rust",
      "available fields rustc diagnostic",
    ],
    evidence: [
      "Rust 1.98.1 E0609 compile failure",
      "Metrics has requests but code reads errors",
      "declared requests field repair",
    ],
    caseSlug: "field-access-must-match-the-resolved-struct-definition",
  },
  {
    id: "RFA-581",
    area: "diagnostics-macros",
    symptom:
      "Reading timeout_ms.value fails with E0610 because u64 is a primitive numeric type and has no named fields.",
    likelyCause:
      "A descriptive binding name was mistaken for declared record structure on a primitive value whose representation is fixed by the language.",
    firstCheck:
      "Use the numeric value directly or introduce a domain type when units, validation, and non-interchangeability justify real structure.",
    searchTerms: [
      "Rust E0610 primitive type no fields",
      "u64 field access Rust",
      "newtype for milliseconds Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0610 compile failure",
      "value field requested from u64",
      "named Timeout struct repair",
    ],
    caseSlug: "primitive-values-do-not-have-user-defined-fields",
  },
  {
    id: "RFA-582",
    area: "concurrency-memory",
    symptom:
      "Writing *attempts fails with E0614 because attempts is already a u32 value rather than a reference or a type implementing Deref.",
    likelyCause:
      "The code assumed an indirection layer that an earlier iterator, pattern, signature, or refactor no longer places in the expression type.",
    firstCheck:
      "Write down the exact receiver type, then remove the star or obtain and use a real borrow according to the intended ownership boundary.",
    searchTerms: [
      "Rust E0614 type cannot be dereferenced",
      "cannot dereference u32 Rust",
      "Deref operator expression type",
    ],
    evidence: [
      "Rust 1.98.1 E0614 compile failure",
      "star applied directly to u32",
      "reference then dereference repair",
    ],
    caseSlug: "dereference-needs-a-pointer-like-value-not-the-value-itself",
  },
  {
    id: "RFA-583",
    area: "diagnostics-macros",
    symptom:
      "Reading queue.pending without parentheses fails with E0615 because pending resolves to a method, not a stored field value.",
    likelyCause:
      "Member-selection syntax was expected to execute behaviour or produce a bound method even though Rust requires an explicit call expression.",
    firstCheck:
      "Determine whether the member is a field or method and whether work should run now, then add parentheses or refer to a callable item deliberately.",
    searchTerms: [
      "Rust E0615 attempted take value of method",
      "method used like field Rust",
      "add parentheses call method Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0615 compile failure",
      "Queue pending method selected as field",
      "pending method invocation repair",
    ],
    caseSlug: "a-method-name-needs-parentheses-to-perform-the-call",
  },
  {
    id: "RFA-584",
    area: "diagnostics-macros",
    symptom:
      "Reading Balance.cents outside its defining module fails with E0616 because the struct is public but its representation field remains private.",
    likelyCause:
      "Type visibility was assumed to expose the full representation, while Rust checks every field according to the owning module's privacy boundary.",
    firstCheck:
      "Use or add the smallest stable accessor or domain operation, making the field public only when direct representation access is intended API.",
    searchTerms: [
      "Rust E0616 field is private",
      "public struct private field getter Rust",
      "module privacy struct fields Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0616 compile failure",
      "external access to private Balance cents",
      "public cents accessor repair",
    ],
    caseSlug: "private-fields-protect-the-owning-modules-invariants",
  },
  {
    id: "RFA-585",
    area: "ffi-targets",
    symptom:
      "Passing f32 through printf's variadic arguments fails with E0617 because the C variadic ABI expects the promoted double representation.",
    likelyCause:
      "The ellipsis was treated as accepting arbitrary Rust values, ignoring default argument promotions and the external format/type agreement.",
    firstCheck:
      "Check the authoritative C declaration and promote every variadic argument to the required C ABI type while keeping format metadata consistent.",
    searchTerms: [
      "Rust E0617 variadic f32 c_double",
      "C variadic default argument promotions Rust",
      "printf f32 f64 FFI Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0617 compile failure",
      "f32 passed through C variadic ellipsis",
      "f64 promoted representation repair",
    ],
    caseSlug: "c-variadic-calls-require-default-argument-promotions",
  },
  {
    id: "RFA-586",
    area: "diagnostics-macros",
    symptom:
      "Writing retries() fails with E0618 after a local u8 named retries shadows the intended callable name.",
    likelyCause:
      "The expression before parentheses resolves to already computed data rather than a function item, pointer, closure, or callable constructor.",
    firstCheck:
      "Resolve and type the callee expression first, then remove the call or rename and select the intended operation according to execution timing.",
    searchTerms: [
      "Rust E0618 expected function found value",
      "call expression requires function Rust",
      "local variable shadows function Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0618 compile failure",
      "u8 value followed by call parentheses",
      "named retries function repair",
    ],
    caseSlug: "call-syntax-requires-a-callable-value",
  },
  {
    id: "RFA-587",
    area: "concurrency-memory",
    symptom:
      "Casting an array reference to bare [usize] fails with E0620 because a slice type has no compile-time size and cannot exist as a local by-value result.",
    likelyCause:
      "The runtime-sized sequence was separated from the pointer whose metadata carries its length and connects it to owned backing storage.",
    firstCheck:
      "Use normal coercion to a slice reference or choose an owning pointer such as Box of slice when independent ownership is required.",
    searchTerms: [
      "Rust E0620 cast to unsized type",
      "array reference as bare slice Rust",
      "dynamically sized type behind pointer",
    ],
    evidence: [
      "Rust 1.98.1 E0620 compile failure",
      "reference cast to bare usize slice",
      "borrowed slice coercion repair",
    ],
    caseSlug: "unsized-values-must-stay-behind-a-pointer",
  },
  {
    id: "RFA-588",
    area: "concurrency-memory",
    symptom:
      "A function promises to return only left's lifetime but may return right, so rustc emits E0621 and asks for an explicit matching lifetime.",
    likelyCause:
      "One conditional return source has an independent possibly shorter borrow that the function's public output relationship does not cover.",
    firstCheck:
      "Trace every return branch to its owner, then connect all possible sources to the output or change the body or ownership contract.",
    searchTerms: [
      "Rust E0621 explicit lifetime required parameter",
      "return reference from either argument Rust",
      "function signature lifetime data flow mismatch",
    ],
    evidence: [
      "Rust 1.98.1 E0621 compile failure",
      "right branch returns unrelated borrowed input",
      "shared input and output lifetime repair",
    ],
    caseSlug: "returned-borrow-lifetimes-must-match-every-possible-source",
  },
  {
    id: "RFA-589",
    area: "concurrency-memory",
    symptom:
      "A conversion promises an output borrow under an unrelated lifetime and fails with E0623 because input is not known to outlive output.",
    likelyCause:
      "Two named lifetime roles were assumed to be ordered even though no bound states that the input remains valid throughout the output region.",
    firstCheck:
      "Map the owners and uses, then add the precise input-outlives-output edge, unify identical roles, or return owned data.",
    searchTerms: [
      "Rust E0623 lifetime mismatch",
      "input lifetime must outlive output Rust",
      "lifetime outlives bound conversion",
    ],
    evidence: [
      "Rust 1.98.1 E0623 compile failure",
      "unrelated input and output lifetimes in Relation",
      "input outlives output bound repair",
    ],
    caseSlug: "outlives-bounds-must-connect-input-and-output-lifetimes",
  },
  {
    id: "RFA-590",
    area: "diagnostics-macros",
    symptom:
      "Calling Token::rotate outside its defining module fails with E0624 because the method is private even though Token and new are public.",
    likelyCause:
      "Reachability of the type and constructor was assumed to grant access to a separate method whose visibility remains module-private.",
    firstCheck:
      "Decide what capability external callers need, then expose a policy-preserving wrapper or mark the method public only as an intentional API promise.",
    searchTerms: [
      "Rust E0624 method is private",
      "call private method outside module Rust",
      "public struct private method",
    ],
    evidence: [
      "Rust 1.98.1 E0624 compile failure",
      "external call to private Token rotate",
      "explicit public capability repair",
    ],
    caseSlug: "private-methods-need-a-public-capability-boundary",
  },
  {
    id: "RFA-591",
    area: "diagnostics-macros",
    symptom:
      "A closure annotated to accept &str is passed to F: Fn(i32), producing E0631 because the caller supplies an integer.",
    likelyCause:
      "An explicit closure annotation contradicts the parameter type in the caller-owned callback protocol despite matching its arity.",
    firstCheck:
      "Read the exact callback bound and iterator item type, then remove the annotation for inference or translate the supplied type deliberately.",
    searchTerms: [
      "Rust E0631 type mismatch closure arguments",
      "expected closure i32 found str",
      "closure parameter type annotation Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0631 compile failure",
      "str closure given to integer callback",
      "matching i32 parameter repair",
    ],
    caseSlug: "closure-parameter-types-must-match-the-caller",
  },
  {
    id: "RFA-592",
    area: "ffi-targets",
    symptom:
      "Combining repr(packed) with repr(packed(2)) fails with E0634 because one type cannot promise two packing constraints.",
    likelyCause:
      "Representation hints were treated as ordered refinements even though each active packed hint imposes a conflicting concrete field-alignment rule.",
    firstCheck:
      "Inspect cfg-expanded attributes and choose one packing value only from an authoritative ABI, then audit all unaligned field access.",
    searchTerms: [
      "Rust E0634 conflicting packed representation",
      "repr packed packed 2 conflict",
      "Rust packed alignment unaligned field",
    ],
    evidence: [
      "Rust 1.98.1 E0634 compile failure",
      "two packed hints on Header",
      "single repr C packed 2 repair",
    ],
    caseSlug: "a-type-can-have-only-one-packed-alignment-contract",
  },
  {
    id: "RFA-593",
    area: "concurrency-memory",
    symptom:
      "Declaring fn choose<'_> fails with E0637 because '_ is reserved for an inferred anonymous lifetime, not a bindable generic parameter name.",
    likelyCause:
      "Placeholder syntax intended for an inferred type position was mistaken for a reusable lifetime identity that could connect inputs and output.",
    firstCheck:
      "Trace borrowed sources and use a real named lifetime for shared relationships, leaving anonymous inference only in positions that permit it.",
    searchTerms: [
      "Rust E0637 underscore lifetime cannot be used",
      "declare anonymous lifetime generic Rust",
      "explicit lifetime required associated type reference",
    ],
    evidence: [
      "Rust 1.98.1 E0637 compile failure",
      "reserved underscore lifetime declared in generics",
      "named shared lifetime repair",
    ],
    caseSlug: "anonymous-lifetime-cannot-be-declared-as-a-generic-name",
  },
  {
    id: "RFA-594",
    area: "ffi-targets",
    symptom:
      "Casting zero to *const _ fails with E0641 because no context tells rustc what kind of pointee the raw pointer addresses.",
    likelyCause:
      "A numeric address was treated as a complete pointer value even though pointee type governs arithmetic, alignment, and valid dereference.",
    firstCheck:
      "Identify the real foreign object or byte region and state its pointee type explicitly, then prove pointer validity separately.",
    searchTerms: [
      "Rust E0641 pointer unknown kind",
      "integer as const pointer underscore Rust",
      "raw pointer cast needs type information",
    ],
    evidence: [
      "Rust 1.98.1 E0641 compile failure",
      "zero integer cast to pointer with inferred pointee",
      "explicit const u8 pointer repair",
    ],
    caseSlug: "raw-pointer-casts-need-a-concrete-pointee-type",
  },
  {
    id: "RFA-595",
    area: "diagnostics-macros",
    symptom:
      "Destructuring a tuple in a trait method declaration without a body fails with E0642 because patterns belong to implementations, not abstract signatures.",
    likelyCause:
      "Implementation-local binding behaviour was placed in an interface declaration that only needs to specify the parameter's complete type.",
    firstCheck:
      "Bind or ignore the whole parameter in the trait, then destructure it inside each implementation body according to that implementation's work.",
    searchTerms: [
      "Rust E0642 patterns trait methods",
      "tuple destructuring trait function declaration",
      "patterns not allowed function without body Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0642 compile failure",
      "tuple pattern in bodyless trait declaration",
      "whole parameter declaration and impl pattern repair",
    ],
    caseSlug: "trait-method-declarations-use-parameter-names-not-patterns",
  },
  {
    id: "RFA-596",
    area: "diagnostics-macros",
    symptom:
      "Implementing a trait's impl Iterator parameter as an explicit named I fails with E0643 because the generic parameter shapes do not match.",
    likelyCause:
      "Argument-position impl Trait's anonymous generic contract was treated as freely interchangeable with a newly declared named method parameter.",
    firstCheck:
      "Align trait and implementation syntax exactly, then decide at the trait boundary who chooses the concrete type and whether dynamic dispatch is needed.",
    searchTerms: [
      "Rust E0643 impl Trait generic mismatch",
      "trait method impl trait named generic implementation",
      "incompatible signature anonymous parameter Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0643 compile failure",
      "trait anonymous iterator parameter implemented as I",
      "matching impl Trait syntax repair",
    ],
    caseSlug: "impl-trait-in-trait-methods-is-not-a-named-generic-parameter",
  },
  {
    id: "RFA-597",
    area: "cargo-dependencies",
    symptom:
      "Adding a where clause to main fails with E0646 because the runtime entrypoint is not a caller-instantiated generic function.",
    likelyCause:
      "A reusable generic constraint was attached to the fixed process entry contract instead of an ordinary helper whose call selects concrete types.",
    firstCheck:
      "Move parameterised logic and bounds into a run function, leaving main to compose concrete dependencies and manage process concerns.",
    searchTerms: [
      "Rust E0646 main where clause",
      "main cannot be generic Rust",
      "move generic bounds out of main",
    ],
    evidence: [
      "Rust 1.98.1 E0646 compile failure",
      "Copy bound attached to main",
      "generic run helper called by fixed main repair",
    ],
    caseSlug: "main-cannot-have-a-where-clause",
  },
  {
    id: "RFA-598",
    area: "ffi-targets",
    symptom:
      "An export_name containing an embedded NUL fails with E0648 because object-file and linker symbol naming cannot preserve that requested identity.",
    likelyCause:
      "Runtime C-string termination was confused with a source-level global symbol name that linkers must store and resolve without embedded nulls.",
    firstCheck:
      "Use the exact valid ABI name without a terminator, then verify uniqueness, calling convention, layouts, and the final exported artifact.",
    searchTerms: [
      "Rust E0648 export_name null character",
      "export_name NUL symbol Rust",
      "unsafe export_name edition 2024",
    ],
    evidence: [
      "Rust 1.98.1 E0648 compile failure",
      "embedded NUL in service export identity",
      "valid service_entry symbol repair",
    ],
    caseSlug: "exported-symbol-names-cannot-contain-nul-bytes",
  },
  {
    id: "RFA-599",
    area: "diagnostics-macros",
    symptom:
      "Re-exporting primary::* and fallback::* makes dispatch::run ambiguous and produces E0659 because both functions claim the same path.",
    likelyCause:
      "Glob re-exports imported future and existing names without preserving their source namespaces, creating two candidates under one public identity.",
    firstCheck:
      "Trace every candidate import and preserve qualified module paths or explicit semantic aliases and façade exports.",
    searchTerms: [
      "Rust E0659 name ambiguous glob imports",
      "two glob reexports same function",
      "ambiguous public reexport Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0659 compile failure",
      "primary and fallback run glob collision",
      "qualified module paths repair",
    ],
    caseSlug: "glob-reexports-can-create-an-ambiguous-public-name",
  },
  {
    id: "RFA-600",
    area: "diagnostics-macros",
    symptom:
      "Deriving Default for Mode fails with E0665 because rustc cannot choose between Active and Passive without an explicitly marked variant.",
    likelyCause:
      "Enum alternatives require a domain policy choice, while derive has no structural rule that can identify which complete value is the useful baseline.",
    firstCheck:
      "Decide whether a true context-free default exists, then mark one unit variant or implement payload construction manually.",
    searchTerms: [
      "Rust E0665 derive Default enum",
      "enum default variant attribute Rust",
      "manual Default payload enum",
    ],
    evidence: [
      "Rust 1.98.1 E0665 compile failure",
      "Mode has no selected default variant",
      "Passive default marker repair",
    ],
    caseSlug: "derived-default-for-an-enum-needs-one-explicit-variant",
  },
  {
    id: "RFA-601",
    area: "diagnostics-macros",
    symptom:
      "Writing impl Envelope<impl Payload> fails with E0666 because an anonymous impl Trait cannot be nested inside another anonymous impl Trait.",
    likelyCause:
      "The inner caller-selected type participates in the outer generic relationship and therefore needs an identity that the signature can name.",
    firstCheck:
      "Declare the inner payload as a named generic parameter and use that same name in the outer trait's generic argument.",
    searchTerms: [
      "Rust E0666 nested impl Trait",
      "impl Trait inside generic argument Rust",
      "name inner type parameter impl trait",
    ],
    evidence: [
      "Rust 1.98.1 E0666 compile failure",
      "Payload impl Trait nested inside Envelope",
      "named payload type parameter repair",
    ],
    caseSlug: "nested-impl-trait-needs-a-named-inner-type-parameter",
  },
  {
    id: "RFA-602",
    area: "diagnostics-macros",
    symptom:
      "Calling sqrt on an unconstrained floating literal fails with E0689 because rustc cannot select the f32 or f64 inherent method set.",
    likelyCause:
      "Literal syntax admits multiple numeric types, while method resolution needs a concrete receiver before surrounding context selects precision.",
    firstCheck:
      "Choose width and precision from the domain or external API and state it with a binding annotation or literal suffix.",
    searchTerms: [
      "Rust E0689 ambiguous numeric type sqrt",
      "can't call method on ambiguous float",
      "specify f32 or f64 Rust literal",
    ],
    evidence: [
      "Rust 1.98.1 E0689 compile failure",
      "sqrt called on unconstrained float binding",
      "explicit f64 type repair",
    ],
    caseSlug: "numeric-method-calls-need-a-concrete-number-type",
  },
  {
    id: "RFA-603",
    area: "ffi-targets",
    symptom:
      "A transparent Measurement containing f32 and unconstrained U fails with E0690 because U could be a second non-zero-sized field.",
    likelyCause:
      "A generic value intended only as a type marker was stored at runtime, leaving no single unambiguous field whose layout the wrapper delegates.",
    firstCheck:
      "Use PhantomData with reviewed variance when metadata is type-only, or remove transparency when the second value is real runtime state.",
    searchTerms: [
      "Rust E0690 transparent struct two fields",
      "repr transparent generic PhantomData",
      "transparent wrapper one non zero sized field",
    ],
    evidence: [
      "Rust 1.98.1 E0690 compile failure",
      "generic unit field may have runtime size",
      "PhantomData unit marker repair",
    ],
    caseSlug: "repr-transparent-needs-one-non-zero-sized-representation-field",
  },
  {
    id: "RFA-604",
    area: "ffi-targets",
    symptom:
      "Annotating RequestId with repr(transparent, C) fails with E0692 because transparent delegation and C struct layout are incompatible representation contracts.",
    likelyCause:
      "Representation hints were stacked as confidence markers even though they select different authorities for the type's layout and ABI.",
    firstCheck:
      "Determine whether the foreign side expects the inner scalar or a C record, choose that one model, and verify real cross-language calls.",
    searchTerms: [
      "Rust E0692 transparent C repr",
      "repr transparent incompatible hints",
      "transparent newtype FFI ABI Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0692 compile failure",
      "transparent and C applied to RequestId",
      "single transparent representation repair",
    ],
    caseSlug: "repr-transparent-cannot-be-combined-with-repr-c",
  },
  {
    id: "RFA-605",
    area: "ffi-targets",
    symptom:
      "Writing repr(align = 16) fails with E0539 because the alignment hint requires nested-list syntax align(16).",
    likelyCause:
      "A name-value attribute form was used where repr's grammar expects an alignment hint carrying a parenthesized integer argument.",
    firstCheck:
      "Write align(N), verify N is supported, then justify and test the stronger address contract across allocations and targets.",
    searchTerms: [
      "Rust E0539 repr align syntax",
      "repr align equals 16 invalid",
      "Rust align attribute parentheses",
    ],
    evidence: [
      "Rust 1.98.1 E0539 compile failure",
      "name-value align representation hint",
      "align 16 list-syntax repair",
    ],
    caseSlug: "repr-align-uses-list-syntax-not-name-value-syntax",
  },
  {
    id: "RFA-606",
    area: "diagnostics-macros",
    symptom:
      "An unlabeled break inside a labelled block nested in a loop fails with E0695 because the block interrupts implicit loop targeting.",
    likelyCause:
      "The bare exit could mean leaving the new one-shot block or crossing it to terminate an outer loop, so Rust requires the destination.",
    firstCheck:
      "Name the block or enclosing loop by semantic role and use an explicit labelled break, preferably returning a typed outcome.",
    searchTerms: [
      "Rust E0695 unlabeled break labeled block",
      "break inside labelled block Rust",
      "labelled block return value Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0695 compile failure",
      "bare break crosses labelled decision block",
      "explicit decision-block value repair",
    ],
    caseSlug: "break-inside-a-labelled-block-must-name-its-destination",
  },
  {
    id: "RFA-607",
    area: "diagnostics-macros",
    symptom:
      "Writing continue 'decision for a labelled block fails with E0696 because a one-shot block has no next iteration.",
    likelyCause:
      "A label was mistaken for sufficient repetition semantics even though only loop expressions define another iteration to continue.",
    firstCheck:
      "Use a labelled break for one-shot early exit or introduce a real loop with progress and termination evidence when retrying is intended.",
    searchTerms: [
      "Rust E0696 continue labeled block",
      "continue can only target loop Rust",
      "labeled block versus labeled loop",
    ],
    evidence: [
      "Rust 1.98.1 E0696 compile failure",
      "continue targets one-shot decision block",
      "explicit retry-loop repair",
    ],
    caseSlug: "continue-can-target-only-a-loop-not-a-labelled-block",
  },
  {
    id: "RFA-608",
    area: "concurrency-memory",
    symptom:
      "In edition 2021, an impl Trait return hides Cell<&'data u32> without capturing 'data in its bounds, so rustc emits E0700.",
    likelyCause:
      "Opaque syntax hid concrete type identity but was assumed to hide the lifetime of a reference physically stored inside that type.",
    firstCheck:
      "Inspect the hidden type and edition capture rules, then declare the real lifetime capture precisely and avoid unrelated over-capture.",
    searchTerms: [
      "Rust E0700 hidden type captures lifetime",
      "impl Trait return captured lifetime edition 2021",
      "opaque type use capture Rust",
    ],
    evidence: [
      "Rust 1.98.1 edition-2021 E0700 compile failure",
      "Cell return captures undeclared data lifetime",
      "explicit data lifetime bound repair",
    ],
    caseSlug: "opaque-return-types-must-declare-captured-lifetimes",
  },
  {
    id: "RFA-609",
    area: "ffi-targets",
    symptom:
      "Declaring extern service fails with E0703 because service is a domain label, not a calling convention recognised by rustc.",
    likelyCause:
      "The extern ABI string was mistaken for a free-form protocol or library name rather than a machine-level calling convention selector.",
    firstCheck:
      "Read the authoritative foreign declaration and choose one rustc-supported ABI for the exact target, then verify types and calls end to end.",
    searchTerms: [
      "Rust E0703 invalid ABI",
      "rustc supported calling conventions",
      "extern C versus system Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0703 compile failure",
      "domain word service used as ABI",
      "supported C ABI repair",
    ],
    caseSlug: "extern-functions-must-use-a-supported-abi-name",
  },
  {
    id: "RFA-610",
    area: "diagnostics-macros",
    symptom:
      "Writing pub(storage) fails with E0704 because a module path restriction needs the in keyword and an allowed ancestor path.",
    likelyCause:
      "A custom module name was placed in shorthand visibility syntax even though Rust privacy follows explicit lexical ancestor scopes.",
    firstCheck:
      "Choose private, crate, parent, or one valid ancestor scope and spell a custom restriction as pub(in path).",
    searchTerms: [
      "Rust E0704 incorrect visibility restriction",
      "pub in module path syntax Rust",
      "pub storage invalid visibility",
    ],
    evidence: [
      "Rust 1.98.1 E0704 compile failure",
      "module name written directly inside pub",
      "pub in crate storage repair",
    ],
    caseSlug: "restricted-visibility-paths-require-pub-in-syntax",
  },
  {
    id: "RFA-611",
    area: "diagnostics-macros",
    symptom:
      "Writing clipp::needless_return fails with E0710 because clipp is not a known lint tool namespace.",
    likelyCause:
      "A tool-qualified lint path contains a misspelled or unregistered provider identity, so rustc cannot resolve which lint vocabulary owns it.",
    firstCheck:
      "Verify the tool namespace, invocation, lint spelling, and pinned version before deciding whether to fix or narrowly suppress the finding.",
    searchTerms: [
      "Rust E0710 unknown tool name scoped lint",
      "misspelled clippy lint namespace",
      "register_tool scoped lint Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0710 compile failure",
      "unknown clipp namespace",
      "known clippy namespace repair",
    ],
    caseSlug: "scoped-lints-need-a-registered-tool-name",
  },
  {
    id: "RFA-612",
    area: "concurrency-memory",
    symptom:
      "Returning a mutable borrow from a consumed Guard fails with E0713 because Guard::drop still needs exclusive access to that same data.",
    likelyCause:
      "Moving the wrapper into the function was assumed to bypass cleanup, but its destructor still receives mutable access before the returned loan could end.",
    firstCheck:
      "Keep access scoped through a borrow or callback on the guard, or design an explicit consuming completion operation that returns owned state.",
    searchTerms: [
      "Rust E0713 borrow may still be in use destructor",
      "return mutable reference from Drop type",
      "Drop needs exclusive access borrowed field",
    ],
    evidence: [
      "Rust 1.98.1 E0713 compile failure",
      "consumed Guard returns borrow to data",
      "borrowed Guard signature repair",
    ],
    caseSlug: "a-drop-implementation-keeps-exclusive-access-until-destruction",
  },
  {
    id: "RFA-613",
    area: "concurrency-memory",
    symptom:
      "Borrowing a temporary String through identity and saving its str view fails with E0716 because the owner is dropped after the let statement.",
    likelyCause:
      "A helper call hid that the returned reference still points into an unnamed temporary whose ordinary destruction scope is the statement.",
    firstCheck:
      "Name the owner before borrowing it, or return owned data when the view must cross the owner's enclosing scope.",
    searchTerms: [
      "Rust helper returns borrow of temporary String E0716",
      "String temporary borrowed through function",
      "let binding longer lived temporary Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0716 compile failure",
      "temporary String view saved after statement",
      "named owner local repair",
    ],
    caseSlug: "a-borrowed-temporary-usually-dies-at-the-end-of-the-statement",
  },
  {
    id: "RFA-614",
    area: "diagnostics-macros",
    symptom:
      "Writing dyn Iterator<Item = u32, Item = u32> fails with E0719 because the same associated type is specified twice.",
    likelyCause:
      "Merged or generated object bounds created two claims for one implementation-selected associated type instead of one coherent erased interface.",
    firstCheck:
      "Trace the duplicate bound sources and retain exactly one authoritative value for each associated type in the trait object.",
    searchTerms: [
      "Rust E0719 associated type specified twice",
      "dyn Iterator duplicate Item",
      "trait object associated type binding Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0719 compile failure",
      "Iterator Item rebound twice",
      "single Item binding repair",
    ],
    caseSlug: "a-trait-object-associated-type-can-be-bound-only-once",
  },
  {
    id: "RFA-615",
    area: "concurrency-memory",
    symptom:
      "A recursive iterator function returning impl Iterator fails with E0720 because its hidden concrete chain type contains itself indefinitely.",
    likelyCause:
      "Opaque return syntax was mistaken for dynamic erasure even though rustc must still construct one finite statically sized hidden type.",
    firstCheck:
      "Expand the hidden type equation, then use an iterative state machine, explicit stack, finite enum, or measured pointer indirection.",
    searchTerms: [
      "Rust E0720 recursive opaque type",
      "recursive impl Iterator return type",
      "box recursive iterator Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0720 compile failure",
      "iterator Chain recursively contains same opaque type",
      "boxed iterator indirection repair",
    ],
    caseSlug: "a-recursive-opaque-return-type-has-no-finite-concrete-shape",
  },
  {
    id: "RFA-616",
    area: "async-runtime",
    symptom:
      "Awaiting an async block inside an ordinary fn fails with E0728 because only an async state machine can suspend and later resume that code.",
    likelyCause:
      "Await was treated as a blocking result accessor instead of a suspension point that changes the containing function into a Future-producing operation.",
    firstCheck:
      "Make and propagate the operation async to one deliberate executor boundary, then review values held across suspension and cancellation.",
    searchTerms: [
      "Rust E0728 await outside async",
      "await only allowed async function Rust",
      "propagate async versus block_on",
    ],
    evidence: [
      "Rust 1.98.1 E0728 compile failure",
      "await used in ordinary prepare function",
      "async function context repair",
    ],
    caseSlug: "await-is-legal-only-inside-an-async-context",
  },
  {
    id: "RFA-617",
    area: "diagnostics-macros",
    symptom:
      "Matching [7, ..] against [u8; N] fails with E0730 because the generic length is not one fixed pattern shape during type checking.",
    likelyCause:
      "A prefix pattern assumes at least one element while the const-generic function admits every N, including zero, as a distinct array shape.",
    firstCheck:
      "Use a fixed array for a compile-time length invariant or borrow as a slice for runtime prefix and length classification.",
    searchTerms: [
      "Rust E0730 const generic array pattern",
      "cannot pattern match array without fixed length",
      "slice pattern const N Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0730 compile failure",
      "prefix pattern against generic array length N",
      "slice-pattern repair",
    ],
    caseSlug: "const-generic-arrays-cannot-use-length-sensitive-patterns",
  },
  {
    id: "RFA-618",
    area: "ffi-targets",
    symptom:
      "Applying repr(transparent) to Status with Ready and Failed fails with E0731 because representation cannot delegate through two alternatives.",
    likelyCause:
      "A real state enum requiring discriminant information was modelled as a single-path wrapper whose ABI must come from exactly one variant.",
    firstCheck:
      "Preserve genuine alternatives under an enum representation or explicit wire conversion, using transparency only for one permanent wrapper variant.",
    searchTerms: [
      "Rust E0731 transparent enum variants",
      "repr transparent enum exactly one variant",
      "FFI status enum transparent invalid",
    ],
    evidence: [
      "Rust 1.98.1 E0731 compile failure",
      "two variants under transparent representation",
      "single Ready wrapper variant repair",
    ],
    caseSlug: "a-transparent-enum-must-have-exactly-one-variant",
  },
  {
    id: "RFA-619",
    area: "ffi-targets",
    symptom:
      "Combining an explicit Empty = 0 discriminant with Data(u8) fails with E0732 until the enum declares an integer representation.",
    likelyCause:
      "Numeric tag assignments were added to a data-carrying enum without selecting the integer type needed to define its tagged representation.",
    firstCheck:
      "Choose repr width from the actual ABI or remove incidental numeric tags, then validate every raw discriminant before enum construction.",
    searchTerms: [
      "Rust E0732 enum discriminant non unit variant",
      "repr u8 data carrying enum",
      "explicit discriminants enum payload Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0732 compile failure",
      "unit discriminant mixed with Data payload",
      "explicit repr u8 repair",
    ],
    caseSlug: "data-carrying-enum-discriminants-need-an-integer-repr",
  },
  {
    id: "RFA-620",
    area: "async-runtime",
    symptom:
      "A directly recursive async function fails with E0733 because its generated future would otherwise contain itself without a finite size.",
    likelyCause:
      "Async syntax hid a concrete state-machine return type whose recursive call creates an infinitely nested layout without pointer indirection.",
    firstCheck:
      "Expand the future-type recursion, then box one edge or replace recursion with an explicit bounded work stack.",
    searchTerms: [
      "Rust E0733 recursion async fn requires boxing",
      "recursive async function Box pin",
      "async recursion future size Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0733 compile failure",
      "direct await of recursive descend call",
      "Box pin indirection repair",
    ],
    caseSlug: "recursive-async-functions-need-an-indirection-point",
  },
  {
    id: "RFA-621",
    area: "diagnostics-macros",
    symptom:
      "A struct default such as T = Box<Self> fails with E0735 because a type parameter default cannot refer to the type currently being defined.",
    likelyCause:
      "Argument omission was defined in terms of the completed Self even though selecting that missing argument is necessary to form Self in the first place.",
    firstCheck:
      "Use an independent semantic default, move recursion into an explicit field, or name a preferred concrete composition with an alias.",
    searchTerms: [
      "Rust E0735 generic default Self",
      "type parameter defaults cannot use Self",
      "recursive generic default Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0735 compile failure",
      "Box Self used as struct parameter default",
      "independent unit default repair",
    ],
    caseSlug: "generic-parameter-defaults-cannot-be-defined-in-terms-of-self",
  },
  {
    id: "RFA-622",
    area: "ffi-targets",
    symptom:
      "Applying track_caller to an extern C function fails with E0737 because the implicit caller-location argument belongs to the Rust ABI.",
    likelyCause:
      "A Rust-specific hidden diagnostic input was attached to a foreign calling convention whose callers know only the declared C signature.",
    firstCheck:
      "Keep the exported ABI exact and move caller tracking into an ordinary Rust wrapper, using explicit error context across FFI.",
    searchTerms: [
      "Rust E0737 track caller requires Rust ABI",
      "track_caller extern C function",
      "caller location FFI wrapper Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0737 compile failure",
      "track caller applied to extern C function",
      "foreign attribute removal repair",
    ],
    caseSlug: "track-caller-cannot-cross-a-non-rust-abi",
  },
  {
    id: "RFA-623",
    area: "ffi-targets",
    symptom:
      "Putting String directly in a union fails with E0740 because Rust cannot know which overlapping field needs destruction.",
    likelyCause:
      "Shared storage was given an owning field without an active-variant protocol capable of selecting one correct automatic destructor.",
    firstCheck:
      "Prefer an enum, or wrap the field in ManuallyDrop and centralise tag validation, access, replacement, and exactly-once destruction.",
    searchTerms: [
      "Rust E0740 union field ManuallyDrop",
      "union field must implement Copy",
      "drop String inside Rust union",
    ],
    evidence: [
      "Rust 1.98.1 E0740 compile failure",
      "String placed directly in union storage",
      "ManuallyDrop field repair",
    ],
    caseSlug: "union-fields-with-drop-glue-need-manual-ownership",
  },
  {
    id: "RFA-624",
    area: "diagnostics-macros",
    symptom:
      "An item inside land cannot use pub(in crate::sea) because sea is a sibling rather than an ancestor, producing E0742.",
    likelyCause:
      "Restricted visibility was treated as an arbitrary friend grant even though Rust uses one lexical ancestor subtree as the audience.",
    firstCheck:
      "Move the item under its real owner or expose one narrow operation through the smallest common ancestor instead of widening to the crate.",
    searchTerms: [
      "Rust E0742 visibility ancestor module",
      "pub in sibling module invalid",
      "Rust friend module visibility",
    ],
    evidence: [
      "Rust 1.98.1 E0742 compile failure",
      "visibility restricted from land to sibling sea",
      "item moved beneath named ancestor",
    ],
    caseSlug: "restricted-visibility-can-name-only-an-ancestor-module",
  },
  {
    id: "RFA-625",
    area: "concurrency-memory",
    symptom:
      "Taking a raw address of the temporary integer 2 fails with E0745 because the temporary has no storage lifetime suitable for the pointer.",
    likelyCause:
      "Raw-pointer syntax was assumed to create or extend backing storage even though it only changes how an existing place is borrowed.",
    firstCheck:
      "Identify and bind the real owner, then prove lifetime, stability, alignment, validity, and aliasing at every later pointer use.",
    searchTerms: [
      "Rust E0745 cannot take address temporary",
      "raw const pointer temporary value",
      "raw pointer backing storage lifetime Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0745 compile failure",
      "raw address taken from integer temporary",
      "named local backing storage repair",
    ],
    caseSlug: "raw-pointers-still-need-stable-backing-storage",
  },
  {
    id: "RFA-626",
    area: "concurrency-memory",
    symptom:
      "Returning dyn Transport directly fails with E0746 because a by-value function result must have a statically known size.",
    likelyCause:
      "Dynamic type erasure was mistaken for a complete value representation even though an erased pointee still needs a sized pointer carrier.",
    firstCheck:
      "Choose one concrete impl Trait, a finite enum, an owned Box or Arc, or a borrow according to variation and ownership.",
    searchTerms: [
      "Rust E0746 return dyn Trait without Box",
      "return trait object pointer indirection",
      "impl Trait versus Box dyn Trait return",
    ],
    evidence: [
      "Rust 1.98.1 E0746 compile failure",
      "unboxed dyn Transport return type",
      "Box dyn Transport repair",
    ],
    caseSlug: "a-dyn-trait-return-value-needs-pointer-indirection",
  },
  {
    id: "RFA-627",
    area: "diagnostics-macros",
    symptom:
      "Supplying a type where Borrowed expects its lifetime first fails with E0747 because generic arguments must correspond to declared parameter kinds.",
    likelyCause:
      "Lifetime and type arguments were reordered as if angle-bracket inputs were named rather than one positional multi-kind signature.",
    firstCheck:
      "Open the declaration or generated docs, align each lifetime, type, and const argument, then verify its semantic meaning.",
    searchTerms: [
      "Rust E0747 type provided lifetime expected",
      "generic arguments wrong order Rust",
      "lifetime type const parameter order",
    ],
    evidence: [
      "Rust 1.98.1 E0747 compile failure",
      "type argument supplied before static lifetime",
      "declaration-order argument repair",
    ],
    caseSlug: "generic-arguments-must-follow-parameter-kind-order",
  },
  {
    id: "RFA-628",
    area: "diagnostics-macros",
    symptom:
      "Opening a raw string with two hash marks and closing it with one fails with E0748 because the lexer cannot find the matching delimiter.",
    likelyCause:
      "A raw literal fence was edited or generated asymmetrically, so later Rust tokens are consumed as part of an unterminated string.",
    firstCheck:
      "Count the opening hashes, close with exactly the same count, and use the smallest fence sequence absent from the payload.",
    searchTerms: [
      "Rust E0748 unterminated raw string",
      "raw string hash count delimiter",
      "Rust r sharp string literal close",
    ],
    evidence: [
      "Rust 1.98.1 E0748 lexer failure",
      "two opening hashes and one closing hash",
      "matching two-hash delimiter repair",
    ],
    caseSlug: "raw-string-delimiters-must-close-with-the-same-hash-count",
  },
  {
    id: "RFA-629",
    area: "async-runtime",
    symptom:
      "Declaring async fn main fails with E0752 because the operating-system entry contract does not provide a Rust task context that can poll the returned future.",
    likelyCause:
      "The first future was declared without selecting the runtime and synchronous owner responsible for polling, startup, and shutdown.",
    firstCheck:
      "Keep fn main synchronous and use a runtime macro or explicit builder to drive one top-level async application future.",
    searchTerms: [
      "Rust E0752 main function async",
      "async fn main runtime Rust",
      "Rust synchronous main block_on future",
    ],
    evidence: [
      "Rust 1.98.1 E0752 compile failure",
      "program main declared directly async",
      "ordinary synchronous main repair",
    ],
    caseSlug: "the-program-entry-point-must-remain-synchronous",
  },
  {
    id: "RFA-630",
    area: "diagnostics-macros",
    symptom:
      "An inner //! comment placed after an item fails with E0753 because it can no longer attach to the enclosing module before that module's contents.",
    likelyCause:
      "Documentation punctuation was treated as formatting even though inner and outer comments attach explanations to different syntax owners.",
    firstCheck:
      "Decide whether the text documents the container or next item, then place //! at the start or /// directly before its item.",
    searchTerms: [
      "Rust E0753 expected outer doc comment",
      "inner doc comment invalid context",
      "Rust slash bang versus triple slash docs",
    ],
    evidence: [
      "Rust 1.98.1 E0753 compile failure",
      "inner module documentation placed after a function",
      "outer item documentation repair",
    ],
    caseSlug: "inner-documentation-comments-belong-before-the-enclosing-items",
  },
  {
    id: "RFA-631",
    area: "cargo-dependencies",
    symptom:
      "Declaring mod transport fails with E0761 when both transport.rs and transport/mod.rs are present as candidate module sources.",
    likelyCause:
      "A layout migration or generator left two filesystem conventions claiming the same semantic module identity.",
    firstCheck:
      "Compare both candidates, choose one canonical source, and update child declarations, generated paths, and clean builds deliberately.",
    searchTerms: [
      "Rust E0761 module file found at both",
      "module rs and module mod rs ambiguity",
      "Rust out of line module file layout",
    ],
    evidence: [
      "Rust 1.98.1 E0761 compile failure",
      "transport rs and transport mod rs both present",
      "explicit path selects canonical source",
    ],
    caseSlug: "an-out-of-line-module-must-have-one-canonical-source-file",
  },
  {
    id: "RFA-632",
    area: "diagnostics-macros",
    symptom:
      "A closure tries to break an outer labelled loop and fails with E0767 because labels are unreachable through callable and suspension boundaries.",
    likelyCause:
      "Lexical nesting was assumed to permit a non-local jump even though the closure is a separately callable body that must return an outcome.",
    firstCheck:
      "Return bool, Option, Result, or ControlFlow from the inner computation and let the code owning the loop break.",
    searchTerms: [
      "Rust E0767 unreachable label closure",
      "labelled break cannot cross closure boundary",
      "ControlFlow closure early exit",
    ],
    evidence: [
      "Rust 1.98.1 E0767 compile failure",
      "closure attempts break to outer records label",
      "closure returns decision to labelled loop",
    ],
    caseSlug: "loop-labels-do-not-cross-closure-or-async-boundaries",
  },
  {
    id: "RFA-633",
    area: "diagnostics-macros",
    symptom:
      "Matching tuple variant Message(String) with a named-field struct pattern fails with E0769 because construction and destructuring shapes disagree.",
    likelyCause:
      "A local binding name was mistaken for a declared field name, or a tuple-to-struct refactor updated only one side.",
    firstCheck:
      "Inspect the variant declaration and mirror its unit, parenthesized tuple, or named-field shape while reviewing move versus borrow.",
    searchTerms: [
      "Rust E0769 tuple variant written struct variant",
      "enum tuple pattern named field",
      "match tuple struct as struct Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0769 compile failure",
      "Message tuple variant matched with text field",
      "parenthesized tuple pattern repair",
    ],
    caseSlug: "pattern-syntax-must-match-a-variants-declared-shape",
  },
  {
    id: "RFA-634",
    area: "diagnostics-macros",
    symptom:
      "Declaring const CAPACITY: T beside generic T fails with E0770 because a const parameter's type cannot depend on another generic parameter.",
    likelyCause:
      "Type selection and compile-time value selection were collapsed into one dependent parameter domain unsupported by Rust const generics.",
    firstCheck:
      "Choose a concrete const type such as usize and move type-dependent policy into an associated const, marker type, or runtime value.",
    searchTerms: [
      "Rust E0770 const parameter type generic T",
      "const generic type depends on generic parameter",
      "Rust const capacity usize generic",
    ],
    evidence: [
      "Rust 1.98.1 E0770 compile failure",
      "CAPACITY const type depends on T",
      "concrete usize const type repair",
    ],
    caseSlug: "const-parameter-types-cannot-depend-on-another-generic-parameter",
  },
  {
    id: "RFA-635",
    area: "diagnostics-macros",
    symptom:
      "Applying derive(Clone) to a function fails with E0774 because derive macros generate trait implementations for structs, enums, or unions.",
    likelyCause:
      "A refactor, cfg branch, or generated token sequence left the attribute attached to a non-data item after its intended target moved.",
    firstCheck:
      "Inspect the next expanded item, move derive only to the data type that owns the trait, or remove it when no such contract exists.",
    searchTerms: [
      "Rust E0774 derive function",
      "derive attribute attached to function after refactor",
      "Rust attribute attached wrong item",
    ],
    evidence: [
      "Rust 1.98.1 E0774 compile failure",
      "Clone derive attached to refresh function",
      "derive moved to Refresh data type",
    ],
    caseSlug: "derive-applies-to-data-types-not-functions-or-associated-items",
  },
  {
    id: "RFA-636",
    area: "concurrency-memory",
    symptom:
      "Using &Store as a trait object in edition 2024 fails with E0782 because trait-object types require the explicit dyn keyword.",
    likelyCause:
      "Older bare-trait syntax hid whether the interface wanted runtime erasure or a caller-selected concrete generic type.",
    firstCheck:
      "Choose dynamic dispatch deliberately and write &dyn Trait, or preserve concrete identity with impl Trait or a named generic.",
    searchTerms: [
      "Rust E0782 expected type found trait",
      "trait objects must include dyn",
      "dyn Trait versus impl Trait generic Rust",
    ],
    evidence: [
      "Rust 1.98.1 edition-2024 E0782 compile failure",
      "Store trait used as a bare reference type",
      "explicit reference to dyn Store repair",
    ],
    caseSlug: "trait-objects-need-the-explicit-dyn-marker",
  },
  {
    id: "RFA-637",
    area: "ffi-targets",
    symptom:
      "Constructing a union with both integer and float fields fails with E0784 because all fields overlap and one expression must select exactly one interpretation to initialise.",
    likelyCause:
      "Union syntax was treated like struct construction even though the named fields are alternative views over the same storage.",
    firstCheck:
      "Initialise one field only, then track and validate its meaning with an external tag before any unsafe read or replacement.",
    searchTerms: [
      "Rust E0784 union expression exactly one field",
      "initialize two Rust union fields",
      "Rust union active field tag",
    ],
    evidence: [
      "Rust 1.98.1 E0784 compile failure",
      "integer and float supplied in one union expression",
      "single integer field initialization",
    ],
    caseSlug: "a-union-constructor-must-initialise-exactly-one-field",
  },
  {
    id: "RFA-638",
    area: "diagnostics-macros",
    symptom:
      "Calling Identifier::zero without a receiver or implementing type fails with E0790 because the trait can have several different implementations.",
    likelyCause:
      "A trait declaration was mistaken for one concrete namespace even though its receiver-free function may differ for every implementation.",
    firstCheck:
      "Name the implementing type directly or with fully qualified syntax, or expose that choice as a generic parameter.",
    searchTerms: [
      "Rust E0790 cannot call associated function on trait",
      "fully qualified trait associated function Rust",
      "trait static method implementation type",
    ],
    evidence: [
      "Rust 1.98.1 E0790 compile failure",
      "Identifier zero called without implementation",
      "fully qualified UserId implementation repair",
    ],
    caseSlug: "a-trait-associated-function-call-needs-a-concrete-implementation",
  },
  {
    id: "RFA-639",
    area: "ffi-targets",
    symptom:
      "Formatting a u32 field from a packed header fails with E0793 even though the source contains no visible ampersand.",
    likelyCause:
      "The formatting machinery borrows its argument, which implicitly attempts to create a possibly unaligned reference to the packed field.",
    firstCheck:
      "Force a by-value copy into an aligned temporary before formatting, then inspect other method calls and macros for the same hidden borrow.",
    searchTerms: [
      "format_args implicitly borrows packed field E0793",
      "println packed struct field unaligned Rust",
      "copy packed field before formatting",
    ],
    evidence: [
      "Rust 1.98.1 E0793 compile failure",
      "formatting creates an implicit packed-field borrow",
      "by-value formatting expression repair",
    ],
    caseSlug: "a-packed-field-cannot-be-borrowed-at-insufficient-alignment",
  },
  {
    id: "RFA-640",
    area: "diagnostics-macros",
    symptom:
      "Opening a block comment without a closing delimiter fails with E0758 because the lexer treats every later token as comment text.",
    likelyCause:
      "A hand edit or generated fragment broke lexical nesting, hiding the remainder of the source before parsing and type checking.",
    firstCheck:
      "Repair the earliest unmatched comment boundary, count nested delimiters, and compile generated output with delimiter-heavy fixtures.",
    searchTerms: [
      "Rust E0758 unterminated block comment",
      "unclosed multiline comment Rust",
      "nested block comments generated Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0758 lexer failure",
      "migration note lacks closing star slash",
      "explicit closing delimiter repair",
    ],
    caseSlug: "an-unterminated-block-comment-can-hide-the-rest-of-a-source-file",
  },
  {
    id: "RFA-641",
    area: "diagnostics-macros",
    symptom:
      "Writing the binary prefix 0b with no following digits fails with E0768 because the token does not contain an integer value.",
    likelyCause:
      "A numeric literal template emitted its base selector even though its value fragment was empty.",
    firstCheck:
      "Restore at least one valid digit, then verify base, integer width, mask meaning, and the generator's empty-input policy.",
    searchTerms: [
      "Rust E0768 no valid digits number",
      "binary literal 0b missing digits",
      "Rust hexadecimal octal literal syntax",
    ],
    evidence: [
      "Rust 1.98.1 E0768 lexer failure",
      "binary prefix emitted without digits",
      "typed binary value repair",
    ],
    caseSlug: "a-prefixed-integer-literal-still-needs-at-least-one-valid-digit",
  },
  {
    id: "RFA-642",
    area: "concurrency-memory",
    symptom:
      "Trying to instantiate identity with an explicit static lifetime fails with E0794 because its input-linked lifetime is late-bound for every call.",
    likelyCause:
      "A universally borrow-polymorphic function was mistaken for an item whose lifetime is selected once with turbofish syntax.",
    firstCheck:
      "Remove the explicit lifetime and let each call choose, using for<'a> when the callable relationship must be named.",
    searchTerms: [
      "Rust E0794 late bound lifetime explicit",
      "cannot specify lifetime arguments late bound",
      "for a function pointer lifetime Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0794 compile failure",
      "static supplied explicitly to identity function item",
      "higher-ranked function pointer repair",
    ],
    caseSlug: "late-bound-lifetimes-are-chosen-at-the-call-site",
  },
  {
    id: "RFA-643",
    area: "diagnostics-macros",
    symptom:
      "Writing Settings { retries: 3, .. } fails with E0797 because omitted fields need a concrete base expression to supply their values.",
    likelyCause:
      "Struct update punctuation was mistaken for an implicit default rather than a field transfer from a named value.",
    firstCheck:
      "Choose and name the real base or call Default explicitly, then review non-Copy moves and cross-field invariants.",
    searchTerms: [
      "Rust E0797 base expression required struct update",
      "struct literal double dot without default",
      "Rust struct update partial move",
    ],
    evidence: [
      "Rust 1.98.1 E0797 compile failure",
      "settings update lacks expression after dots",
      "named defaults base repair",
    ],
    caseSlug: "struct-update-syntax-needs-a-real-base-value",
  },
  {
    id: "RFA-644",
    area: "concurrency-memory",
    symptom:
      "Putting the function item main inside an opaque return use bound fails with E0799 because precise capture lists accept generic parameters rather than arbitrary names.",
    likelyCause:
      "The list was treated as runtime dependency metadata instead of a type-level declaration of generic identities retained by a hidden type.",
    firstCheck:
      "Expand the hidden concrete type and list only its declared lifetime, type, and const parameter dependencies.",
    searchTerms: [
      "Rust E0799 precise capturing use bound",
      "impl Trait use function name invalid",
      "Rust use bound generic parameters only",
    ],
    evidence: [
      "Rust 1.98.1 E0799 compile failure",
      "main function item named in use capture",
      "declared type parameter capture repair",
    ],
    caseSlug: "precise-capture-lists-can-name-only-generic-parameters",
  },
  {
    id: "RFA-645",
    area: "concurrency-memory",
    symptom:
      "Writing use<T> on a function with no T parameter fails with E0800 because the opaque return capture list references no generic in scope.",
    likelyCause:
      "A rename, refactor, nested scope, or generator left a capture identity disconnected from the item's actual generic declaration.",
    firstCheck:
      "Determine whether the hidden type really needs T, then declare the dependency, correct the name, or remove the stale capture.",
    searchTerms: [
      "Rust E0800 capture type parameter not scope",
      "impl Trait use T missing generic",
      "precise capture stale generic name",
    ],
    evidence: [
      "Rust 1.98.1 E0800 compile failure",
      "use T without generic declaration",
      "declared T parameter repair",
    ],
    caseSlug: "a-precise-capture-name-must-be-declared-in-the-current-generics",
  },
  {
    id: "RFA-646",
    area: "diagnostics-macros",
    symptom:
      "Declaring self: R where R is a method generic Deref target fails with E0801 because receiver type must have a concrete supported form.",
    likelyCause:
      "Arbitrary wrapper polymorphism was placed in the special receiver slot which method lookup needs to relate structurally to Self.",
    firstCheck:
      "Choose a concrete ownership receiver such as self, a borrow, Box, Rc, Arc, or Pin, or use an ordinary wrapper parameter.",
    searchTerms: [
      "Rust E0801 invalid generic self receiver",
      "generic method receiver Deref Self",
      "Rust self Rc Self receiver",
    ],
    evidence: [
      "Rust 1.98.1 E0801 compile failure",
      "method generic R used as self type",
      "concrete Rc Self receiver repair",
    ],
    caseSlug: "a-method-receiver-cannot-be-an-arbitrary-method-generic",
  },
  {
    id: "RFA-647",
    area: "concurrency-memory",
    symptom:
      "Implementing DataAccess<&f64> for a borrowed container fails with E0803 because the trait argument and method return do not say how their lifetimes relate to self.",
    likelyCause:
      "Lifetime elision created independent choices inside a generic trait identity and method output where one borrowing contract was intended.",
    firstCheck:
      "Identify what owns the returned data and bind trait, receiver, and output lifetimes explicitly or model per-borrow lending with a GAT.",
    searchTerms: [
      "Rust E0803 trait implementation reference lifetime",
      "generic trait return reference self lifetime",
      "DataAccess get_ref lifetime mismatch Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0803 compile failure",
      "reference type argument omits relation to container lifetime",
      "explicit trait receiver and output lifetime repair",
    ],
    caseSlug: "a-generic-trait-reference-return-needs-an-explicit-lifetime-contract",
  },
  {
    id: "RFA-648",
    area: "concurrency-memory",
    symptom:
      "Casting *const dyn Any to *const (dyn Any + Send) fails with E0804 because a pointer cast cannot prove the erased concrete type implements the added auto trait.",
    likelyCause:
      "A semantic thread-transfer guarantee was erased and later treated as a pointer metadata bit that could be restored without concrete type evidence.",
    firstCheck:
      "Require Send when coercing the known concrete value and preserve it through every registry, pointer, and task boundary.",
    searchTerms: [
      "Rust E0804 cannot add Send dyn pointer cast",
      "cast dyn Trait to dyn Trait Send",
      "trait object auto trait vtable pointer Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0804 compile failure",
      "Send added after Any pointer erasure",
      "Send preserved during original trait-object coercion",
    ],
    caseSlug: "a-pointer-cast-cannot-add-send-to-an-erased-trait-object",
  },
  {
    id: "RFA-649",
    area: "diagnostics-macros",
    symptom:
      "Writing inline() with empty parentheses fails with E0805 because inline accepts no input as #[inline] or one recognised argument.",
    likelyCause:
      "A built-in attribute was treated as a free-form annotation or a generator rendered an empty option list with invalid meta-item syntax.",
    firstCheck:
      "Use the documented word or single-argument form, inspect expanded placement, and retain optimisation hints only with measured evidence.",
    searchTerms: [
      "Rust E0805 malformed inline attribute",
      "inline attribute invalid arguments Rust",
      "Rust built in attribute grammar",
    ],
    evidence: [
      "Rust 1.98.1 E0805 compile failure",
      "inline attribute has empty list input",
      "bare inline attribute repair",
    ],
    caseSlug: "built-in-attributes-have-exact-argument-grammars",
  },
  {
    id: "RFA-650",
    area: "concurrency-memory",
    symptom:
      "Creating and immediately dropping Vec::drain still removes the range, contrary to the assumption that only yielded elements are deleted.",
    likelyCause:
      "The returned iterator was mistaken for an observational view even though it owns an already-started collection mutation completed on Drop.",
    firstCheck:
      "Decide whether removal is intended, then assert both yielded values and vector post-state or use a slice for observation.",
    searchTerms: [
      "Rust Vec drain dropped without consume",
      "does Vec drain remove all elements",
      "Vec drain iterator side effects",
    ],
    evidence: [
      "Rust 1.98.1 runtime assertion",
      "drain 1 through 3 dropped immediately",
      "vector retains only elements outside range",
    ],
    caseSlug: "dropping-a-vec-drain-still-removes-the-selected-range",
  },
  {
    id: "RFA-651",
    area: "concurrency-memory",
    symptom:
      "Calling split_off(4) on a three-element vector panics because the split index must be no greater than the current length.",
    likelyCause:
      "An external or stale element boundary was used without checking the inclusive upper split bound against current initialized length.",
    firstCheck:
      "Validate at <= len on the same snapshot and choose error, clamp, or panic according to whether the boundary is trusted.",
    searchTerms: [
      "Rust Vec split_off index panic",
      "split_off at equals len Rust",
      "checked split vector at index",
    ],
    evidence: [
      "Rust 1.98.1 runtime panic",
      "split index four exceeds length three",
      "checked optional split repair",
    ],
    caseSlug: "vec-split-off-requires-an-index-at-or-before-len",
  },
  {
    id: "RFA-652",
    area: "concurrency-memory",
    symptom:
      "Truncating éclair at byte index one panics because that index falls inside the two-byte UTF-8 encoding of é.",
    likelyCause:
      "A byte-indexed String API received a character or display limit without converting it to a valid UTF-8 scalar boundary.",
    firstCheck:
      "Define whether the limit means bytes, scalars, graphemes, or columns, then derive and validate the corresponding byte boundary.",
    searchTerms: [
      "Rust String truncate char boundary panic",
      "truncate UTF-8 string by characters Rust",
      "is_char_boundary String byte index",
    ],
    evidence: [
      "Rust 1.98.1 runtime panic",
      "byte one falls inside accented character",
      "char-boundary checked truncation repair",
    ],
    caseSlug: "string-truncate-takes-a-utf8-byte-boundary-not-a-character-count",
  },
  {
    id: "RFA-653",
    area: "concurrency-memory",
    symptom:
      "Inserting running for an existing job key returns Some(queued), not None, because HashMap::insert replaces and yields the old value.",
    likelyCause:
      "The returned Option was interpreted as general success rather than replacement history from an upsert operation.",
    firstCheck:
      "Name the result previous and use Entry when occupied and vacant keys require different validation or lifecycle behaviour.",
    searchTerms: [
      "Rust HashMap insert return old value",
      "HashMap insert replace existing key",
      "Rust Entry API insert if absent",
    ],
    evidence: [
      "Rust 1.98.1 runtime assertion",
      "second insert for job returns queued",
      "new value stored and previous value checked",
    ],
    caseSlug: "hashmap-insert-replaces-and-returns-the-previous-value",
  },
  {
    id: "RFA-654",
    area: "concurrency-memory",
    symptom:
      "Inserting key 2 before key 1 still iterates as 1 then 2 because BTreeMap traversal is ordered by Ord rather than insertion time.",
    likelyCause:
      "The word ordered was assumed to mean chronological even though the collection is a sorted key index.",
    firstCheck:
      "Define the required order and encode it in an immutable key with a tie-breaker or choose an insertion-ordered sequence.",
    searchTerms: [
      "Rust BTreeMap insertion order",
      "BTreeMap iteration sorted key order",
      "ordered map chronological Rust",
    ],
    evidence: [
      "Rust 1.98.1 runtime assertion",
      "keys inserted two then one",
      "iterator yields ascending one then two",
    ],
    caseSlug: "btreemap-iteration-follows-key-order-not-insertion-order",
  },
  {
    id: "RFA-655",
    area: "diagnostics-macros",
    symptom:
      "After nth(1) returns 20, next returns 30 because nth advances past one element and consumes the selected element too.",
    likelyCause:
      "A stateful relative cursor operation was mistaken for non-mutating absolute random access.",
    firstCheck:
      "Inspect the iterator's current position and use slice get or enumerate when independent original positions are required.",
    searchTerms: [
      "Rust Iterator nth consumes elements",
      "what does next return after nth",
      "Iterator nth versus slice get Rust",
    ],
    evidence: [
      "Rust 1.98.1 runtime assertion",
      "nth one yields twenty",
      "slice get preserves later access",
    ],
    caseSlug: "iterator-nth-consumes-the-prefix-and-the-returned-item",
  },
  {
    id: "RFA-656",
    area: "diagnostics-macros",
    symptom:
      "Collecting an iterator of Result values stops after visiting the first Err, so later elements and their mapping work are not evaluated.",
    likelyCause:
      "A fail-fast FromIterator destination was used where complete validation or all-item side effects were expected.",
    firstCheck:
      "Choose first-error, accumulated-error, or per-item outcome semantics before composing the lazy pipeline.",
    searchTerms: [
      "Rust collect Result skips later map closures",
      "iterator side effects after Err do not run",
      "FromIterator Result visit count short circuit",
    ],
    evidence: [
      "Rust 1.98.1 runtime assertion",
      "mapping counter stops at third item",
      "first error and visited count asserted",
    ],
    caseSlug: "collecting-result-short-circuits-at-the-first-error",
  },
  {
    id: "RFA-657",
    area: "concurrency-memory",
    symptom:
      "After Arc::make_mut changes one of two strong owners, the Arcs no longer point to the same allocation because the inner Vec was cloned.",
    likelyCause:
      "Clone-on-write snapshot mutation was mistaken for synchronized mutation visible through every shared owner.",
    firstCheck:
      "Decide whether readers keep old snapshots or observe one shared state, then choose make_mut or synchronization accordingly.",
    searchTerms: [
      "Rust Arc make_mut clones shared",
      "Arc copy on write ptr_eq",
      "Arc make_mut versus Mutex",
    ],
    evidence: [
      "Rust 1.98.1 runtime assertion",
      "two strong owners before mutation",
      "owners diverge with independent vector values",
    ],
    caseSlug: "arc-make-mut-uses-clone-on-write-when-ownership-is-shared",
  },
  {
    id: "RFA-658",
    area: "concurrency-memory",
    symptom:
      "A Weak handle cannot upgrade after the final strong Arc is dropped because the allocation no longer contains a live value.",
    likelyCause:
      "A non-owning observer was treated as a liveness promise rather than an optional opportunity to acquire new strong ownership.",
    firstCheck:
      "Upgrade at each use, hold the resulting Arc for the operation, and handle None as explicit shutdown or cache state.",
    searchTerms: [
      "Rust Weak upgrade returns None",
      "last strong Arc dropped Weak",
      "Arc Weak lifecycle cache",
    ],
    evidence: [
      "Rust 1.98.1 runtime assertion",
      "last strong owner dropped before upgrade",
      "Some while live and None after destruction",
    ],
    caseSlug: "weak-upgrade-returns-none-after-the-last-strong-arc-is-gone",
  },
  {
    id: "RFA-659",
    area: "concurrency-memory",
    symptom:
      "Unwrapping a mutex lock panics after another thread panicked while holding the guard because the mutex is marked poisoned.",
    likelyCause:
      "PoisonError was treated as lock acquisition failure rather than evidence that protected application invariants may be incomplete.",
    firstCheck:
      "Choose propagation, reset, reload, or validated recovery, and clear poison only after the invariant is restored.",
    searchTerms: [
      "Rust Mutex poison recover into_inner",
      "lock unwrap PoisonError Rust",
      "mutex poisoned after thread panic",
    ],
    evidence: [
      "Rust 1.98.1 runtime panic",
      "worker panics while mutex guard is live",
      "PoisonError into_inner recovery",
    ],
    caseSlug: "a-poisoned-mutex-reports-a-panic-it-does-not-make-the-data-unreachable",
  },
  {
    id: "RFA-660",
    area: "concurrency-memory",
    symptom:
      "Growing a vector with Vec::resize creates several Arc values, but changing one element appears to change every element.",
    likelyCause:
      "The fill value's Clone implementation preserves shared Arc allocation identity rather than constructing independent inner state for each slot.",
    firstCheck:
      "Decide whether repeated positions are independent identities or shared handles, then use resize_with or deliberate cloning to encode that model.",
    searchTerms: [
      "Rust Vec resize clone shared Arc",
      "Vec resize independent values",
      "resize_with versus resize Rust",
    ],
    evidence: [
      "Rust 1.98.1 runtime assertion",
      "Arc fill values share one atomic allocation",
      "resize_with constructs independent allocations",
    ],
    caseSlug: "vec-resize-clones-a-value-it-does-not-create-independent-state",
  },
  {
    id: "RFA-661",
    area: "concurrency-memory",
    symptom:
      "Removing one vector element with swap_remove leaves the right elements but unexpectedly changes their order.",
    likelyCause:
      "The constant-time removal fills the hole with the final vector element instead of shifting the remaining suffix left.",
    firstCheck:
      "Determine whether relative order and external indices are contractual, then choose remove or update every index affected by the tail move.",
    searchTerms: [
      "Rust swap_remove changes order",
      "Vec remove versus swap_remove",
      "constant time vector removal Rust",
    ],
    evidence: [
      "Rust 1.98.1 runtime assertion",
      "last element moves into removed index",
      "Vec remove preserves relative order",
    ],
    caseSlug: "swap-remove-trades-vector-order-for-constant-time-removal",
  },
  {
    id: "RFA-662",
    area: "concurrency-memory",
    symptom:
      "Calling dedup leaves repeated values in a vector when equal values are separated by another element.",
    likelyCause:
      "Vec::dedup compares consecutive retained neighbours and does not keep a global set of every value already observed.",
    firstCheck:
      "Choose run compression or global uniqueness, then sort before dedup or retain through explicit seen-state if stable order matters.",
    searchTerms: [
      "Rust Vec dedup still has duplicates",
      "dedup only consecutive Rust",
      "remove all duplicate vector values Rust",
    ],
    evidence: [
      "Rust 1.98.1 runtime assertion",
      "separated equal values remain",
      "sort then dedup produces global uniqueness",
    ],
    caseSlug: "vec-dedup-removes-consecutive-duplicates-not-global-duplicates",
  },
  {
    id: "RFA-663",
    area: "concurrency-memory",
    symptom:
      "copy_from_slice panics when copying a short source into a larger destination buffer even though enough capacity is available.",
    likelyCause:
      "The receiver slice denotes the complete region to replace and the method requires exact source and destination length equality.",
    firstCheck:
      "Validate the input length and select the precise destination prefix or return a domain error before performing the exact copy.",
    searchTerms: [
      "Rust copy_from_slice length mismatch panic",
      "copy shorter slice into buffer Rust",
      "source destination slice lengths Rust",
    ],
    evidence: [
      "Rust 1.98.1 runtime panic",
      "two-byte source and three-byte destination",
      "destination prefix with equal length repairs copy",
    ],
    caseSlug: "copy-from-slice-requires-equal-source-and-destination-lengths",
  },
  {
    id: "RFA-664",
    area: "concurrency-memory",
    symptom:
      "Rotating a three-element slice left by four panics instead of wrapping the distance around automatically.",
    likelyCause:
      "rotate_left accepts a structural split boundary no greater than length, not an arbitrary cyclic distance normalised by the API.",
    firstCheck:
      "Define cyclic semantics, handle an empty slice, and reduce an arbitrary distance modulo the current length before rotating.",
    searchTerms: [
      "Rust rotate_left panics mid greater len",
      "rotate slice modulo length Rust",
      "empty slice cyclic rotation",
    ],
    evidence: [
      "Rust 1.98.1 runtime panic",
      "rotation distance exceeds three-element length",
      "non-empty modulo normalization repair",
    ],
    caseSlug: "rotate-left-takes-a-distance-no-larger-than-the-slice",
  },
  {
    id: "RFA-665",
    area: "concurrency-memory",
    symptom:
      "chunks_exact_mut updates every full chunk but leaves the final mutable elements unchanged unless its remainder is recovered.",
    likelyCause:
      "The iterator separates an incomplete mutable tail to keep every yielded chunk fixed-width, and consuming the loop does not consume that tail.",
    firstCheck:
      "Call into_remainder after full-chunk mutation and decide whether to update, reject, preserve, or carry the returned mutable tail.",
    searchTerms: [
      "Rust chunks_exact_mut into_remainder unchanged tail",
      "mutate incomplete chunk remainder Rust",
      "ChunksExactMut recover mutable remainder",
    ],
    evidence: [
      "Rust 1.98.1 runtime assertion",
      "four of five values mutated through exact chunks",
      "into_remainder repairs the mutable tail",
    ],
    caseSlug: "chunks-exact-keeps-the-incomplete-remainder-outside-iteration",
  },
  {
    id: "RFA-666",
    area: "concurrency-memory",
    symptom:
      "Calling entry(key).or_insert(fallback) leaves the old map value in place when the key already exists.",
    likelyCause:
      "or_insert is a vacant-entry defaulting operation whose occupied branch returns the existing mutable value rather than replacing it.",
    firstCheck:
      "Classify the operation as default, replace, or update, then use or_insert, insert, or and_modify to state that conflict policy.",
    searchTerms: [
      "Rust or_insert not replacing value",
      "HashMap entry overwrite existing",
      "or_insert versus insert Rust",
    ],
    evidence: [
      "Rust 1.98.1 runtime assertion",
      "occupied entry retains ready state",
      "HashMap insert performs replacement",
    ],
    caseSlug: "hashmap-entry-or-insert-does-not-replace-an-existing-value",
  },
  {
    id: "RFA-667",
    area: "concurrency-memory",
    symptom:
      "After appending one vector into another through a mutable reference, the source vector unexpectedly has length zero.",
    likelyCause:
      "Vec::append transfers ownership of every source element while preserving only the now-empty source collection object for reuse.",
    firstCheck:
      "Decide whether elements should move, clone, or become shared, then assert both source and destination postconditions.",
    searchTerms: [
      "Rust Vec append empties source",
      "append versus extend_from_slice Rust",
      "move all elements between vectors",
    ],
    evidence: [
      "Rust 1.98.1 runtime assertion",
      "source vector becomes empty after append",
      "extend_from_slice retains source values",
    ],
    caseSlug: "vec-append-moves-elements-and-empties-the-source-vector",
  },
  {
    id: "RFA-668",
    area: "concurrency-memory",
    symptom:
      "Calling make_contiguous on a wrapped VecDeque rearranges its backing storage but iteration still returns exactly the previous order.",
    likelyCause:
      "The method linearises physical ring-buffer storage while preserving the deque's separate public logical front-to-back sequence.",
    firstCheck:
      "Distinguish logical queue order from backing slices and call make_contiguous only at a consumer boundary that requires one slice.",
    searchTerms: [
      "Rust VecDeque make_contiguous order",
      "VecDeque wrapped storage as_slices",
      "linearise ring buffer Rust",
    ],
    evidence: [
      "Rust 1.98.1 runtime assertion",
      "wrapped deque order measured before and after",
      "one returned contiguous mutable slice",
    ],
    caseSlug: "vecdeque-make-contiguous-changes-layout-not-logical-order",
  },
  {
    id: "RFA-669",
    area: "concurrency-memory",
    symptom:
      "Converting a max-heap with into_sorted_vec returns ascending values while repeatedly popping the same values returns descending order.",
    likelyCause:
      "Priority removal and conventional sorted conversion are separate views with explicitly opposite ordering contracts for a max-heap.",
    firstCheck:
      "Name the required order and use repeated pop for greatest-first priority or into_sorted_vec for ascending total output.",
    searchTerms: [
      "Rust BinaryHeap into_sorted_vec order",
      "BinaryHeap pop descending sorted vector ascending",
      "iterate heap in priority order Rust",
    ],
    evidence: [
      "Rust 1.98.1 runtime assertion",
      "same max-heap consumed by two APIs",
      "ascending and descending expectations asserted separately",
    ],
    caseSlug: "binaryheap-sorted-vector-order-is-the-opposite-of-pop-order",
  },
  {
    id: "RFA-670",
    area: "concurrency-memory",
    symptom:
      "Inserting into an Option that is already Some drops the previous resource before later code expects to recover it.",
    likelyCause:
      "Option::insert is unconditional replacement and returns a reference only to the new value, so ownership of the previous value is destroyed.",
    firstCheck:
      "Choose whether the old value needs inspection, explicit retirement, or rollback, then use replace when its ownership must be returned.",
    searchTerms: [
      "Rust Option insert drops old value",
      "Option insert versus replace",
      "recover previous Some value Rust",
    ],
    evidence: [
      "Rust 1.98.1 runtime assertion",
      "Drop counter advances during insert",
      "Option replace returns old value before drop",
    ],
    caseSlug: "option-insert-drops-and-replaces-an-existing-some-value",
  },
  {
    id: "RFA-671",
    area: "diagnostics-macros",
    symptom:
      "A Result remains Err after inspect_err logs the error, so a later success assertion or question-mark return still fails.",
    likelyCause:
      "inspect_err is a pass-through observation hook receiving a borrowed error, not a recovery or transformation operation.",
    firstCheck:
      "Separate evidence collection from outcome policy, then choose or_else, map_err, a fallback, matching, or propagation explicitly.",
    searchTerms: [
      "Rust inspect_err does not handle error",
      "Result inspect_err versus or_else",
      "log and recover Result Rust",
    ],
    evidence: [
      "Rust 1.98.1 runtime assertion",
      "error logging closure executes",
      "unwrap_or supplies explicit fallback",
    ],
    caseSlug: "result-inspect-err-observes-an-error-it-does-not-recover-it",
  },
  {
    id: "RFA-672",
    area: "concurrency-memory",
    symptom:
      "After mem::replace, a destructor counter has not advanced because the previous value was returned rather than dropped.",
    likelyCause:
      "The operation performs ownership moves into and out of the destination while leaving destruction timing to owners of both resulting values.",
    firstCheck:
      "Capture the returned old value and make its cleanup point explicit instead of assuming replacement has already run its destructor.",
    searchTerms: [
      "Rust mem replace drop old value",
      "mem replace destructor timing",
      "move value out of mutable reference Rust",
    ],
    evidence: [
      "Rust 1.98.1 runtime assertion",
      "Drop counter remains zero after replacement",
      "explicit drops establish both destructor points",
    ],
    caseSlug: "mem-replace-returns-the-old-value-without-dropping-it",
  },
  {
    id: "RFA-673",
    area: "concurrency-memory",
    symptom:
      "After mem::take returns the current state, the original place contains State::default rather than its previous generation.",
    likelyCause:
      "Moving a value out through a mutable reference requires a valid replacement, and take deliberately chooses the type's Default value.",
    firstCheck:
      "Confirm Default is valid on every early-exit path or use replace to install an explicit successor that preserves the outer invariant.",
    searchTerms: [
      "Rust mem take leaves default",
      "mem take versus replace",
      "move struct field out mutable reference Rust",
    ],
    evidence: [
      "Rust 1.98.1 runtime assertion",
      "generation becomes derived default zero",
      "mem replace installs explicit next generation",
    ],
    caseSlug: "mem-take-replaces-state-with-its-default-value",
  },
  {
    id: "RFA-674",
    area: "concurrency-memory",
    symptom:
      "A byte range that was valid for éclair makes replace_range panic after one ASCII character is inserted before it.",
    likelyCause:
      "Numeric UTF-8 offsets were reused across String revisions even though an earlier insertion shifted every later scalar boundary.",
    firstCheck:
      "Attach ranges to a source revision or recompute them from the current string immediately before mutation, especially after length-changing edits.",
    searchTerms: [
      "String stale byte range after insert replace_range panic",
      "Rust UTF-8 offsets invalid after mutation",
      "apply multiple String edits reverse byte order",
    ],
    evidence: [
      "Rust 1.98.1 runtime panic",
      "previously valid range shifted inside accented scalar",
      "current-revision char_indices repair",
    ],
    caseSlug: "string-replace-range-requires-utf8-character-boundaries",
  },
  {
    id: "RFA-675",
    area: "concurrency-memory",
    symptom:
      "Calling get(0..1) on éclair returns None even though byte index one is less than the string's total byte length.",
    likelyCause:
      "Checked string access validates UTF-8 character boundaries as well as allocation bounds and refuses to create an invalid str slice.",
    firstCheck:
      "Identify whether coordinates are bytes, scalars, or graphemes and derive a valid byte boundary from the unchanged source.",
    searchTerms: [
      "Rust str get returns None UTF-8",
      "string get valid index None",
      "safe Unicode substring Rust",
    ],
    evidence: [
      "Rust 1.98.1 runtime assertion",
      "in-bounds byte endpoint is not char boundary",
      "char_indices creates valid two-byte prefix",
    ],
    caseSlug: "str-get-returns-none-for-a-range-inside-a-utf8-character",
  },
  {
    id: "RFA-676",
    area: "ffi-targets",
    symptom:
      "CString::new returns NulError for bytes containing zero before the end instead of preserving the complete Rust byte sequence.",
    likelyCause:
      "C uses the first zero as a string terminator, so an interior NUL would make Rust and the foreign consumer observe different values.",
    firstCheck:
      "Reject or deliberately transform the input, or choose a pointer-plus-length foreign interface when arbitrary bytes are valid.",
    searchTerms: [
      "Rust CString new interior nul error",
      "convert bytes with zero to C string",
      "NulError CString FFI Rust",
    ],
    evidence: [
      "Rust 1.98.1 runtime assertion",
      "embedded zero between alpha and omega",
      "valid CString has one trailing terminator",
    ],
    caseSlug: "cstring-new-rejects-interior-nul-bytes",
  },
  {
    id: "RFA-677",
    area: "ffi-targets",
    symptom:
      "The extension of archive.tar.gz is gz rather than tar.gz, so a compound-format check does not match.",
    likelyCause:
      "Path::extension reports the final structural suffix and has no domain registry telling it which multi-part formats are meaningful.",
    firstCheck:
      "Inspect the final file name and apply a longest-first explicit compound-suffix policy, then validate actual content separately.",
    searchTerms: [
      "Rust Path extension tar gz",
      "compound file extension Rust",
      "Path extension last dot behaviour",
    ],
    evidence: [
      "Rust 1.98.1 runtime assertion",
      "archive.tar.gz yields gz",
      "explicit full-name compound suffix extraction",
    ],
    caseSlug: "path-extension-returns-only-the-final-suffix",
  },
  {
    id: "RFA-678",
    area: "concurrency-memory",
    symptom:
      "Subtracting five seconds from a two-second Duration panics because Duration cannot represent a negative result.",
    likelyCause:
      "Operator subtraction assumes a proven left-greater-than-or-equal invariant on a non-negative time span type.",
    firstCheck:
      "Select checked subtraction for validation or saturating subtraction only when zero is an honest documented domain floor.",
    searchTerms: [
      "Rust Duration subtraction overflow panic",
      "Duration checked_sub negative",
      "saturating duration subtraction Rust",
    ],
    evidence: [
      "Rust 1.98.1 runtime panic",
      "five seconds subtracted from two",
      "checked_sub exposes None underflow",
    ],
    caseSlug: "duration-subtraction-panics-on-underflow",
  },
  {
    id: "RFA-679",
    area: "concurrency-memory",
    symptom:
      "Calling earlier.duration_since(later) returns zero rather than the one-second magnitude expected from the two instants.",
    likelyCause:
      "duration_since is directed self-minus-argument subtraction and its saturating behaviour hides reversed order as zero.",
    firstCheck:
      "Name start and end roles, put the later instant in self position, and use checked_duration_since when inversion must remain observable.",
    searchTerms: [
      "Rust Instant duration_since returns zero",
      "Instant operands reversed duration",
      "checked_duration_since Rust",
    ],
    evidence: [
      "Rust 1.98.1 runtime assertion",
      "earlier asks duration since later",
      "correct order plus checked inversion",
    ],
    caseSlug: "instant-duration-since-saturates-when-operands-are-reversed",
  },
  {
    id: "RFA-680",
    area: "concurrency-memory",
    symptom:
      "A second OnceLock::set returns Err with the rejected value and the cell continues to contain its first value.",
    likelyCause:
      "The one-time publication primitive was treated as reloadable storage even though initialization permanently selects one winning value.",
    firstCheck:
      "Inspect every set result, retire a rejected owner deliberately, and choose mutable synchronized state when reload is a real requirement.",
    searchTerms: [
      "Rust OnceLock set twice Err value",
      "replace value in OnceLock",
      "OnceLock first initialization wins",
    ],
    evidence: [
      "Rust 1.98.1 runtime assertion",
      "two sequential set attempts",
      "rejected replacement and retained primary value",
    ],
    caseSlug: "oncelock-set-rejects-later-values-without-replacing-the-first",
  },
  {
    id: "RFA-681",
    area: "concurrency-memory",
    symptom:
      "A closure passed to the second get_or_init call never runs because the OnceLock already contains a value.",
    likelyCause:
      "The closure is a lazy candidate for one-time construction rather than a callback executed during every access.",
    firstCheck:
      "Move per-call work outside initialization and ensure the one-time constructor is idempotent across panic retries and free from reentrant cycles.",
    searchTerms: [
      "Rust OnceLock get_or_init closure once",
      "get_or_init later closure not called",
      "OnceLock concurrent initializer",
    ],
    evidence: [
      "Rust 1.98.1 runtime assertion",
      "atomic counts initializer calls",
      "second closure skipped after publication",
    ],
    caseSlug: "oncelock-get-or-init-runs-only-the-winning-initializer",
  },
  {
    id: "RFA-682",
    area: "concurrency-memory",
    symptom:
      "Dropping the original Sender does not disconnect the receiver because another Sender clone is still alive.",
    likelyCause:
      "Channel closure follows lifetime of the complete sending capability set, not one familiar variable returned at construction.",
    firstCheck:
      "Trace ownership of every Sender clone and ensure all producers drop before the consumer is joined or expected to finish draining.",
    searchTerms: [
      "Rust mpsc channel not disconnecting",
      "receiver waits sender clone alive",
      "drop all Sender clones Rust",
    ],
    evidence: [
      "Rust 1.98.1 runtime assertion",
      "original sender dropped with clone retained",
      "dropping every sender yields Disconnected",
    ],
    caseSlug: "an-mpsc-channel-remains-connected-while-any-sender-clone-lives",
  },
  {
    id: "RFA-683",
    area: "concurrency-memory",
    symptom:
      "try_send on sync_channel(0) returns Full when no receiver is waiting because the channel has no buffering slot.",
    likelyCause:
      "A zero bound was mistaken for one pending item even though it changes transfer into a direct producer-consumer rendezvous.",
    firstCheck:
      "Decide whether direct blocking handoff is intended, then handle Full ownership or choose a positive capacity with measured backpressure.",
    searchTerms: [
      "Rust sync_channel zero capacity",
      "try_send Full zero bound channel",
      "rendezvous channel Rust std",
    ],
    evidence: [
      "Rust 1.98.1 runtime assertion",
      "try_send without waiting receiver returns Full",
      "blocking send completes with receiver rendezvous",
    ],
    caseSlug: "a-zero-capacity-sync-channel-is-a-rendezvous",
  },
  {
    id: "RFA-684",
    area: "concurrency-memory",
    symptom:
      "Reading an RwLock with unwrap panics after another thread panicked while holding its write guard.",
    likelyCause:
      "The writer may have stopped midway through a protected invariant, so the lock returns advisory PoisonError on later acquisition.",
    firstCheck:
      "Choose propagation, reset, reload, or validated recovery and treat guard access as distinct from proof that state is correct.",
    searchTerms: [
      "Rust RwLock poisoned writer panic",
      "recover PoisonError RwLock read",
      "RwLock write guard panic",
    ],
    evidence: [
      "Rust 1.98.1 runtime panic",
      "worker panics while write guard lives",
      "PoisonError exposes read guard for chosen recovery",
    ],
    caseSlug: "a-writer-panic-poisons-an-rwlock",
  },
  {
    id: "RFA-685",
    area: "concurrency-memory",
    symptom:
      "A reader mutates an AtomicU8 behind an RwLock read guard and then panics, but the outer RwLock remains unpoisoned.",
    likelyCause:
      "RwLock poisoning observes the outer guard mode, not logical mutation performed through interior synchronization hidden inside T.",
    firstCheck:
      "Inventory interior-mutable fields reachable from readers and give their multi-step invariants an independent recovery or validity signal.",
    searchTerms: [
      "RwLock interior mutability reader panic no poison",
      "Atomic inside RwLock read guard panic",
      "outer RwLock poison does not track atomic mutation",
    ],
    evidence: [
      "Rust 1.98.1 runtime assertion",
      "AtomicU8 changed under shared read guard",
      "mutation survives while outer lock stays unpoisoned",
    ],
    caseSlug: "a-reader-panic-does-not-poison-a-standard-rwlock",
  },
  {
    id: "RFA-686",
    area: "concurrency-memory",
    symptom:
      "Four threads pass a Barrier together, but only one BarrierWaitResult reports is_leader true.",
    likelyCause:
      "The barrier releases a completed cohort and issues one unspecified per-round coordination token rather than naming every participant a leader.",
    firstCheck:
      "Count one leader without assuming identity and add another synchronization point if peers depend on work performed after leader selection.",
    searchTerms: [
      "Rust Barrier is_leader exactly one",
      "BarrierWaitResult leader thread",
      "reusable Barrier rounds Rust",
    ],
    evidence: [
      "Rust 1.98.1 four-thread runtime assertion",
      "all participants complete one wait",
      "leader count equals one",
    ],
    caseSlug: "barrier-selects-exactly-one-leader-per-round",
  },
  {
    id: "RFA-687",
    area: "concurrency-memory",
    symptom:
      "Atomic compare_exchange returns Err(5), not Err(4), when the expected value 4 is stale and the atomic currently contains 5.",
    likelyCause:
      "CAS failure reports the newly observed actual state so a caller can reconsider its transition instead of returning the already-known expectation.",
    firstCheck:
      "Update the observation, recompute desired state, and justify both memory orderings and retry progress before attempting again.",
    searchTerms: [
      "Rust compare_exchange Err current value",
      "atomic CAS failure return value",
      "compare_exchange retry loop ordering Rust",
    ],
    evidence: [
      "Rust 1.98.1 runtime assertion",
      "expected four while atomic contains five",
      "retry uses returned observation and succeeds",
    ],
    caseSlug: "compare-exchange-failure-returns-the-actual-atomic-value",
  },
  {
    id: "RFA-688",
    area: "concurrency-memory",
    symptom:
      "After a call_once initializer panics, a later ordinary call_once panics again instead of running a replacement closure.",
    likelyCause:
      "Once preserves evidence that an arbitrary one-time action began and failed because its external or unsafe state may be incomplete.",
    firstCheck:
      "Fail the process or use call_once_force with a recovery closure capable of rebuilding and validating the entire affected invariant.",
    searchTerms: [
      "Rust Once poisoned call_once panic",
      "retry poisoned Once initialization",
      "call_once_force is_poisoned",
    ],
    evidence: [
      "Rust 1.98.1 caught initializer panic",
      "second call_once panics on poison",
      "call_once_force observes poison and completes",
    ],
    caseSlug: "once-call-once-remains-poisoned-after-an-initializer-panic",
  },
  {
    id: "RFA-689",
    area: "concurrency-memory",
    symptom:
      "After get_or_init panics, OnceLock::get returns None and a later initializer can successfully publish a value.",
    likelyCause:
      "OnceLock publishes only a fully returned contained value and deliberately stays uninitialized rather than poisoned after constructor unwind.",
    firstCheck:
      "Confirm external initializer effects are retry-safe even though local publication did not occur, then bound retry and startup latency policy.",
    searchTerms: [
      "Rust OnceLock panic not poisoned",
      "get_or_init panic retry",
      "Once versus OnceLock poisoning",
    ],
    evidence: [
      "Rust 1.98.1 caught initializer panic",
      "cell remains None after unwind",
      "later initializer publishes seven",
    ],
    caseSlug: "oncelock-remains-uninitialized-after-an-initializer-panic",
  },
  {
    id: "RFA-690",
    area: "concurrency-memory",
    symptom:
      "Rc::get_mut returns None even with one strong owner because a Weak pointer to the same allocation is still alive.",
    likelyCause:
      "Unique mutation requires the complete alias contract to exclude both other strong owners and weak allocation observers.",
    firstCheck:
      "Trace Rc and Weak handles, then drop observers deliberately, use make_mut for snapshots, or choose explicit shared mutation.",
    searchTerms: [
      "Rust Rc get_mut None weak pointer",
      "Rc get_mut strong count one",
      "weak_count prevents Rc mutation",
    ],
    evidence: [
      "Rust 1.98.1 runtime assertion",
      "one strong owner plus one Weak observer",
      "dropping Weak enables unique mutation",
    ],
    caseSlug: "rc-get-mut-requires-no-other-strong-or-weak-pointers",
  },
  {
    id: "RFA-691",
    area: "concurrency-memory",
    symptom:
      "Arc::try_unwrap returns the inner value despite a live Weak pointer because no other strong owner keeps that value alive.",
    likelyCause:
      "Weak retains allocation metadata for liveness observation but does not own the contained T or prevent its extraction by the sole strong owner.",
    firstCheck:
      "Distinguish strong value ownership from weak allocation identity and choose try_unwrap or into_inner according to the multi-owner result protocol.",
    searchTerms: [
      "Rust Arc try_unwrap with Weak",
      "does Weak prevent Arc try_unwrap",
      "Arc weak pointer after inner value moved",
    ],
    evidence: [
      "Rust 1.98.1 runtime assertion",
      "one strong owner plus live Weak",
      "inner value recovered and later upgrade returns None",
    ],
    caseSlug: "arc-try-unwrap-can-succeed-while-weak-pointers-exist",
  },
  {
    id: "RFA-692",
    area: "cargo-dependencies",
    symptom:
      "A custom cfg emitted by build.rs fails under deny(unexpected_cfgs) even though Cargo passes the cfg to rustc.",
    likelyCause:
      "cargo::rustc-cfg activates a condition but does not register its name as expected; the build script omitted the separate cargo::rustc-check-cfg declaration.",
    firstCheck:
      "Run Cargo with the unexpected_cfgs lint denied, then pair every possible custom condition with an unconditional rustc-check-cfg instruction.",
    searchTerms: [
      "Cargo build.rs unexpected cfg condition name",
      "rustc-check-cfg custom build script",
      "cargo rustc-cfg unexpected_cfgs deny",
    ],
    evidence: [
      "Cargo 1.98.1 workspace fixture",
      "custom has_fast_path cfg rejected",
      "unconditional rustc-check-cfg repair",
    ],
    caseSlug: "build-script-custom-cfg-needs-rustc-check-cfg",
  },
  {
    id: "RFA-693",
    area: "cargo-dependencies",
    symptom:
      "Using env!(TARGET) in build.rs fails while Cargo says TARGET will be available to the build script.",
    likelyCause:
      "Cargo supplies TARGET when the compiled build-script executable runs, not while rustc is compiling build.rs, and env! reads only at compilation time.",
    firstCheck:
      "Separate compile-time inputs from the build script's process environment and read TARGET with std::env::var inside main.",
    searchTerms: [
      "build.rs TARGET not defined at compile time",
      "Cargo build script env TARGET std env var",
      "env macro build script environment variables",
    ],
    evidence: [
      "Cargo 1.98.1 build-script compile failure",
      "TARGET absent during build.rs compilation",
      "runtime environment lookup repair",
    ],
    caseSlug: "cargo-build-script-target-is-a-runtime-environment-variable",
  },
  {
    id: "RFA-694",
    area: "cargo-dependencies",
    symptom:
      "An application build script cannot read DEP_RFA_NATIVE_INCLUDE although a transitive sys crate emitted that metadata.",
    likelyCause:
      "Cargo exposes links metadata only to immediate dependent build scripts, so DEP_* values do not cross an intermediate wrapper automatically.",
    firstCheck:
      "Draw the package edges, locate the first build script receiving the DEP_* value, and forward only the metadata contract the next dependent really needs.",
    searchTerms: [
      "Cargo DEP environment variable transitive dependency",
      "build script metadata immediate dependents only",
      "forward DEP links metadata Cargo",
    ],
    evidence: [
      "Cargo 1.98.1 three-package workspace",
      "transitive DEP variable absent",
      "wrapper links metadata forwarding repair",
    ],
    caseSlug: "cargo-dep-metadata-does-not-cross-transitive-dependencies",
  },
  {
    id: "RFA-695",
    area: "ffi-targets",
    symptom:
      "A no_std executable with an entry symbol still fails because no #[panic_handler] function exists in its dependency graph.",
    likelyCause:
      "Removing std also removes its panic runtime; an entrypoint and panic strategy do not provide the one required function that handles PanicInfo.",
    firstCheck:
      "Inspect the complete final dependency graph for exactly one panic handler and verify its non-returning behaviour for the actual target and failure policy.",
    searchTerms: [
      "no_std panic_handler function required not found",
      "Rust embedded missing panic handler",
      "no_std entrypoint panic abort handler",
    ],
    evidence: [
      "Rust 1.98.1 no_std Linux binary",
      "missing panic_handler compile failure",
      "non-returning PanicInfo handler repair",
    ],
    caseSlug: "a-no-std-binary-needs-exactly-one-panic-handler",
  },
  {
    id: "RFA-696",
    area: "ffi-targets",
    symptom:
      "Vec is unavailable in a no_std library even though slices, Option, and other core types still compile.",
    likelyCause:
      "no_std selects core, while Vec is an allocation-backed type provided by the separate alloc crate and is not in the core prelude.",
    firstCheck:
      "Decide whether heap allocation belongs on this target, then import alloc explicitly or redesign the boundary around caller-owned fixed storage.",
    searchTerms: [
      "cannot find Vec no_std Rust alloc crate",
      "use alloc Vec without std",
      "no_std collections global allocator boundary",
    ],
    evidence: [
      "Rust 1.98.1 no_std library",
      "Vec missing from core prelude",
      "extern crate alloc and explicit Vec import",
    ],
    caseSlug: "vec-in-no-std-comes-from-the-alloc-crate",
  },
  {
    id: "RFA-697",
    area: "cargo-dependencies",
    symptom:
      "Changing an environment variable used by build.rs leaves the generated Rust constant at its previous value.",
    likelyCause:
      "The build script narrowed Cargo's change detection without declaring the environment input through cargo::rerun-if-env-changed, so Cargo reused its old output.",
    firstCheck:
      "Build twice in the same target directory with different input values, then add rerun-if-env-changed and assert that the embedded output changes on the second build.",
    searchTerms: [
      "Cargo build.rs environment change not rebuilding",
      "rerun-if-env-changed generated file stale",
      "build script cached environment variable old value",
    ],
    evidence: [
      "Cargo 1.98.1 two-build sequence",
      "unchanged target directory and changed RFA_BUILD_MODE",
      "tracked environment repair regenerates output",
    ],
    caseSlug: "build-script-environment-inputs-need-rerun-if-env-changed",
  },
  {
    id: "RFA-698",
    area: "cargo-dependencies",
    symptom:
      "include! cannot find generated.rs under OUT_DIR even though build.rs successfully wrote a file with that name.",
    likelyCause:
      "The build script wrote relative to its package working directory while the Rust source deliberately looked in Cargo's package-specific generated-output directory.",
    firstCheck:
      "Log the complete destination path without secrets, write generated artifacts under OUT_DIR, and include the exact same path through concat!(env!(OUT_DIR), ...).",
    searchTerms: [
      "Cargo include OUT_DIR generated file not found",
      "build.rs writes generated.rs wrong directory",
      "couldn't read OUT_DIR generated Rust file",
    ],
    evidence: [
      "Cargo 1.98.1 generated-source fixture",
      "successful write to package root but missing OUT_DIR file",
      "shared OUT_DIR path repair",
    ],
    caseSlug: "build-script-generated-files-belong-under-out-dir",
  },
  {
    id: "RFA-699",
    area: "concurrency-memory",
    symptom:
      "slice::subslice_range returns None for a separate slice containing exactly the values visible inside the original slice.",
    likelyCause:
      "The Rust 1.98 API recovers where a borrowed view came from by address and alignment; it does not search the parent slice for equal elements.",
    firstCheck:
      "Check whether the argument was sliced from the same allocation, and use windows plus position when the requirement is value search instead of origin recovery.",
    searchTerms: [
      "Rust subslice_range returns None equal slice",
      "subslice_range does not compare elements",
      "find range of borrowed subslice Rust 1.98",
    ],
    evidence: [
      "Rust 1.98.1 runtime assertion",
      "equal values from a different array return None",
      "same-allocation derived subslice returns its range",
    ],
    caseSlug: "slice-subslice-range-tracks-origin-not-equal-values",
  },
  {
    id: "RFA-700",
    area: "concurrency-memory",
    symptom:
      "str::substr_range returns None for equal text stored in another String instead of locating its matching byte range.",
    likelyCause:
      "substr_range converts a substring already borrowed from the parent into offsets using provenance-like address containment; it is not a text search operation.",
    firstCheck:
      "Establish whether the &str was derived from the same owner, then choose substr_range for origin recovery or find and match_indices for content search.",
    searchTerms: [
      "Rust substr_range returns None equal String",
      "str substr_range versus find Rust 1.98",
      "substring byte range same allocation Rust",
    ],
    evidence: [
      "Rust 1.98.1 runtime assertion",
      "equal copied text returns None",
      "derived UTF-8 substring returns its byte range",
    ],
    caseSlug: "str-substr-range-tracks-origin-not-equal-text",
  },
  {
    id: "RFA-701",
    area: "upgrades-compatibility",
    symptom:
      "Formatting a second integer into one NumBuffer fails with E0499 while the first returned &str is still used later.",
    likelyCause:
      "format_into writes into caller-owned storage and returns a view borrowing that mutable buffer, so another write cannot coexist with the earlier live view.",
    firstCheck:
      "Locate the last use of every formatted view, then consume it before reuse or copy it into owned storage when multiple results must coexist.",
    searchTerms: [
      "Rust NumBuffer format_into borrow E0499",
      "reuse NumBuffer while formatted str alive",
      "integer format_into returned str lifetime Rust 1.98",
    ],
    evidence: [
      "Rust 1.98.1 E0499 compile failure",
      "two live format_into views share one mutable buffer",
      "sequential consumption repair without allocation",
    ],
    caseSlug: "integer-format-into-result-borrows-num-buffer",
  },
  {
    id: "RFA-702",
    area: "upgrades-compatibility",
    symptom:
      "String::from_utf16le returns FromUtf16Error with OddBytes when a byte stream ends halfway through one UTF-16 code unit.",
    likelyCause:
      "The endian-aware decoder consumes two bytes per u16 before validating surrogate structure, so a trailing single byte is structurally incomplete input.",
    firstCheck:
      "Validate or frame the byte count before decoding, then keep strict and lossy handling as explicit policies for incomplete and invalid code units.",
    searchTerms: [
      "Rust from_utf16le OddBytes error",
      "UTF-16LE odd byte length String 1.98",
      "truncated UTF16 byte stream Rust decoder",
    ],
    evidence: [
      "Rust 1.98.1 runtime error",
      "one trailing byte produces OddBytes",
      "complete little-endian code units decode to AB",
    ],
    caseSlug: "string-from-utf16le-rejects-an-odd-byte-tail",
  },
  {
    id: "RFA-703",
    area: "concurrency-memory",
    symptom:
      "slice::strip_circumfix returns None even though the slice starts with the prefix and ends with the suffix.",
    likelyCause:
      "The matched prefix and suffix overlap inside the slice, while the API promises one remaining subslice only when both matches occupy disjoint regions.",
    firstCheck:
      "Add both marker lengths and compare them with the input length, then decide whether overlap means invalid framing or needs a different parser.",
    searchTerms: [
      "Rust strip_circumfix overlap returns None",
      "slice prefix suffix both match but None",
      "strip_circumfix non overlapping markers 1.98",
    ],
    evidence: [
      "Rust 1.98.1 runtime panic",
      "individually matching markers overlap at one element",
      "disjoint frame markers return the body",
    ],
    caseSlug: "strip-circumfix-rejects-overlapping-prefix-and-suffix",
  },
  {
    id: "RFA-704",
    area: "concurrency-memory",
    symptom:
      "After AtomicU8::from_mut_slice creates an atomic view, assigning through the original byte slice fails with E0506.",
    likelyCause:
      "The conversion safely reinterprets storage because its mutable borrow is exclusive; mixing non-atomic access before that borrow ends would violate the access model.",
    firstCheck:
      "Draw a scope around the atomic phase, perform all concurrent access through the atomic view, and resume ordinary access only after its last use.",
    searchTerms: [
      "Rust AtomicU8 from_mut_slice borrow error",
      "atomic_from_mut original slice E0506",
      "mix atomic and non atomic access mutable slice Rust 1.98",
    ],
    evidence: [
      "Rust 1.98.1 E0506 compile failure",
      "ordinary assignment while atomic view remains live",
      "scoped atomic phase and later byte assertion",
    ],
    caseSlug: "atomic-from-mut-slice-exclusively-borrows-the-original-slice",
  },
  {
    id: "RFA-705",
    area: "cargo-dependencies",
    symptom:
      "A variable emitted with cargo::rustc-env exists under cargo run but is missing when the built executable is started directly.",
    likelyCause:
      "The instruction embeds a compile-time value for env! and Cargo also supplies it to child processes as a convenience that standalone deployment does not reproduce.",
    firstCheck:
      "Run the same artifact once through Cargo and once directly with a clean environment, then move build identity reads to env! or pass runtime configuration explicitly.",
    searchTerms: [
      "cargo rustc-env missing standalone executable",
      "cargo run environment different direct binary",
      "rustc-env compile time env macro runtime variable",
    ],
    evidence: [
      "Cargo 1.98.1 paired execution fixture",
      "Cargo-run and direct-process output differ",
      "compile-time env value produces identical output",
    ],
    caseSlug: "cargo-rustc-env-is-not-a-portable-runtime-environment-variable",
  },
  {
    id: "RFA-706",
    area: "ffi-targets",
    symptom:
      "An extern C function returning core::ffi::c_void triggers c_void_returns even though the intent was to model a C function returning void.",
    likelyCause:
      "Rust's c_void is an opaque FFI data type rather than Rust's spelling for an absent return value, while C void return semantics map to the unit type ().",
    firstCheck:
      "Inspect every extern declaration returning c_void and distinguish a C void return from a pointer to void before replacing only the return type with ().",
    searchTerms: [
      "Rust c_void_returns lint extern C void",
      "c_void is not C void return type Rust",
      "Rust FFI function returning c_void use unit",
    ],
    evidence: [
      "Rust 1.98.1 c_void_returns diagnostic",
      "extern C function returning c_void rejected under deny",
      "unit return type repair preserves C void intent",
    ],
    caseSlug: "c-void-is-not-a-c-void-return-type",
  },
  {
    id: "RFA-707",
    area: "ffi-targets",
    symptom:
      "A no_mangle function named memset is rejected even though the Rust function itself is syntactically valid and has an extern C ABI.",
    likelyCause:
      "The exported name collides with a runtime symbol rustc and the standard library may call using a fixed ABI, but the definition has an incompatible signature.",
    firstCheck:
      "Inspect the complete unmangled export name and signature, then rename ordinary application exports instead of shadowing a runtime primitive accidentally.",
    searchTerms: [
      "Rust invalid_runtime_symbol_definitions memset",
      "invalid definition runtime memset symbol Rust",
      "no_mangle memset wrong signature rustc lint",
    ],
    evidence: [
      "Rust 1.98.1 deny-by-default runtime-symbol lint",
      "zero-argument memset export conflicts with required ABI",
      "application-specific symbol name compiles without collision",
    ],
    caseSlug: "runtime-symbol-definitions-must-match-rusts-abi",
  },
  {
    id: "RFA-708",
    area: "upgrades-compatibility",
    symptom:
      "A repr(transparent) wrapper that previously ignored an empty repr(C) marker now fails with E0690 after upgrading to Rust 1.98.",
    likelyCause:
      "Rust can ignore only fields with a guaranteed trivial one-aligned layout, and repr(C) does not guarantee that an empty marker remains zero-sized on every target.",
    firstCheck:
      "List every extra wrapper field and its representation attributes, then remove the unnecessary repr(C) marker or redesign the public layout deliberately.",
    searchTerms: [
      "Rust 1.98 repr transparent repr C zero sized field E0690",
      "repr transparent field not guaranteed zero sized all targets",
      "empty repr C marker transparent wrapper rejected",
    ],
    evidence: [
      "Rust 1.98.1 E0690 compatibility diagnostic",
      "empty repr(C) marker is not a guaranteed trivial field",
      "ordinary zero-sized marker restores transparent wrapper",
    ],
    caseSlug: "repr-transparent-c-marker-is-not-a-trivial-zst",
  },
  {
    id: "RFA-709",
    area: "upgrades-compatibility",
    symptom:
      "A correctly wrapped unsafe(link_section) attribute is still rejected when the crate sets deny(unsafe_code).",
    likelyCause:
      "The unsafe(...) wrapper acknowledges the attribute's obligation, while the unsafe_code lint is a separate project policy that Rust 1.98 applies consistently to unsafe attributes.",
    firstCheck:
      "Separate edition syntax from lint policy, identify why the custom section is necessary, and remove it or create a narrowly audited exception at the owning item.",
    searchTerms: [
      "Rust deny unsafe_code unsafe link_section attribute",
      "unsafe attribute rejected despite unsafe wrapper Rust 1.98",
      "usage of unsafe link_section attribute lint",
    ],
    evidence: [
      "Rust 1.98.1 unsafe_code lint diagnostic",
      "correct unsafe(link_section) syntax remains policy-rejected",
      "ordinary used static compiles under deny unsafe_code",
    ],
    caseSlug: "deny-unsafe-code-also-rejects-unsafe-attributes",
  },
  {
    id: "RFA-710",
    area: "upgrades-compatibility",
    symptom:
      "Moving std::env::vars() into thread::spawn fails with E0277 because VarsOs cannot be sent between threads safely.",
    likelyCause:
      "Rust 1.98 removed Send and Sync from the lazy process-environment iterators because their platform-backed traversal state is not a transferable concurrency boundary.",
    firstCheck:
      "Find whether the iterator itself crosses the spawn boundary, then consume it on the creating thread and move an owned snapshot into the worker.",
    searchTerms: [
      "Rust std env Vars cannot be sent between threads E0277",
      "VarsOs not Send thread spawn Rust 1.98",
      "collect environment variables before spawning thread Rust",
    ],
    evidence: [
      "Rust 1.98.1 E0277 compile failure",
      "lazy environment iterator moved into thread closure",
      "owned Vec snapshot crosses thread boundary successfully",
    ],
    caseSlug: "std-env-vars-cannot-be-sent-between-threads",
  },
  {
    id: "RFA-711",
    area: "upgrades-compatibility",
    symptom:
      "A wrapper deriving both PartialOrd and Ord changes comparison results on Rust 1.98 when its field implements those two traits inconsistently.",
    likelyCause:
      "Rust 1.98 can derive the wrapper's PartialOrd by delegating to its derived Ord implementation, exposing a field type which violated the required ordering relationship.",
    firstCheck:
      "Compare partial_cmp with Some(cmp) for representative field values and repair the field's trait contract instead of depending on derive expansion details.",
    searchTerms: [
      "Rust 1.98 derive PartialOrd uses Ord cmp changed result",
      "derived PartialOrd Ord inconsistent field implementation",
      "partial_cmp differs from cmp wrapper after Rust upgrade",
    ],
    evidence: [
      "Rust 1.98.1 runtime assertion",
      "derived wrapper returns Ord result through PartialOrd",
      "consistent field implementation restores one ordering",
    ],
    caseSlug: "derived-partialord-can-delegate-to-derived-ord",
  },
  {
    id: "RFA-712",
    area: "upgrades-compatibility",
    symptom:
      "Transmuting a repr(align(16)) wrapper around a generic raw pointer back into that pointer fails with E0512 on Rust 1.98.",
    likelyCause:
      "The explicit alignment can add padding and the pointer width depends on pointee metadata, so the wrapper and pointer are not guaranteed to have equal sizes for every T: ?Sized.",
    firstCheck:
      "Inspect representation attributes and unsized metadata, then extract the public tuple field normally instead of asking transmute to erase the wrapper.",
    searchTerms: [
      "Rust repr align pointer transmute E0512",
      "OverAligned raw pointer size Pointee Metadata transmute",
      "cannot transmute aligned wrapper to generic pointer Rust 1.98",
    ],
    evidence: [
      "Rust 1.98.1 E0512 compile failure",
      "repr(align(16)) generic pointer wrapper has conditional size",
      "ordinary field extraction preserves fat-pointer metadata",
    ],
    caseSlug: "overaligned-pointer-wrapper-cannot-be-transmuted-away",
  },
  {
    id: "RFA-713",
    area: "upgrades-compatibility",
    symptom:
      "Passing pin!(&mut_value) where Pin<&mut T> is expected now produces Pin<&mut &mut T> and fails with E0308.",
    likelyCause:
      "Rust 1.97 stopped the pin! macro from deref-coercing its input, so pinning a mutable reference pins the reference value rather than silently pinning its pointee.",
    firstCheck:
      "Write the macro input's exact type, decide whether the reference or its pointee must be pinned, and use Pin::new for an Unpin pointee or pin the owned value directly.",
    searchTerms: [
      "Rust pin macro &mut gives Pin &mut &mut E0308",
      "pin macro no deref coercion Rust 1.97",
      "expected Pin mut T found Pin mut reference",
    ],
    evidence: [
      "Rust 1.98.1 E0308 compile failure",
      "pinning &mut String preserves reference layer",
      "explicit Pin::new repair for Unpin String",
    ],
    caseSlug: "pin-macro-pins-a-mutable-reference-without-deref-coercion",
  },
  {
    id: "RFA-714",
    area: "cargo-dependencies",
    symptom:
      "cargo check fails on an ordinary dead_code warning after build.warnings is set to deny in Cargo configuration.",
    likelyCause:
      "Cargo 1.97 and later can raise adjustable lint warnings for local packages to errors through build.warnings, independently of source-level lint attributes.",
    firstCheck:
      "Inspect merged Cargo configuration and CARGO_BUILD_WARNINGS, then identify whether the message is an adjustable lint from a local package before changing code or policy.",
    searchTerms: [
      "Cargo build.warnings deny local package lint error",
      "Cargo config warnings deny could not compile dead_code",
      "CARGO_BUILD_WARNINGS warn allow deny Rust 1.97",
    ],
    evidence: [
      "Cargo 1.98.1 local package fixture",
      "build.warnings deny promotes dead_code to build failure",
      "warning-free source compiles under unchanged deny policy",
    ],
    caseSlug: "cargo-build-warnings-can-promote-local-lints-to-errors",
  },
  {
    id: "RFA-715",
    area: "concurrency-memory",
    symptom:
      "Converting an exhausted legacy RangeInclusive into the new std::range::RangeInclusive panics instead of producing an empty bounds value.",
    likelyCause:
      "The legacy inclusive range combines original bounds with iterator exhaustion state, while the new range value cannot portably reconstruct meaningful bounds after that state is consumed.",
    firstCheck:
      "Call is_empty before conversion and preserve the original bounds before iteration when later code needs a range value rather than only remaining iterator state.",
    searchTerms: [
      "Rust convert exhausted legacy RangeInclusive panic",
      "attempted to convert from exhausted legacy RangeInclusive",
      "std range RangeInclusive from legacy empty conversion",
    ],
    evidence: [
      "Rust 1.98.1 documented conversion panic",
      "single-element legacy iterator exhausted before From",
      "is_empty guard avoids reconstructing consumed bounds",
    ],
    caseSlug: "exhausted-legacy-range-inclusive-may-panic-on-conversion",
  },
  {
    id: "RFA-716",
    area: "upgrades-compatibility",
    symptom:
      "A function signature using T::Ty<'r, dyn Inner> fails with E0228 because Rust cannot deduce the trait object's lifetime bound from that associated-type context.",
    likelyCause:
      "A fully elided trait-object bound inside a generic associated-type projection has more than one plausible public lifetime contract, so Rust 1.98 reserves the choice instead of silently applying an item-level fallback.",
    firstCheck:
      "Read the GAT parameter bounds, decide which owner limits the erased value, and write dyn Trait + 'r or dyn Trait + 'static explicitly rather than adding 'static by reflex.",
    searchTerms: [
      "Rust E0228 GAT dyn Trait lifetime bound",
      "cannot deduce lifetime bound associated type trait object",
      "T associated type dyn Trait explicit lifetime Rust 1.98",
    ],
    evidence: [
      "Rust 1.98.1 E0228 compile failure",
      "fully elided dyn Inner inside a GAT projection",
      "explicit dyn Inner plus 'r repair",
    ],
    caseSlug: "gat-trait-objects-need-an-explicit-lifetime-bound",
  },
  {
    id: "RFA-717",
    area: "upgrades-compatibility",
    symptom:
      "A repr(transparent) wrapper around u64 and a dependency's zero-sized marker fails with E0690 because the marker type has private fields.",
    likelyCause:
      "The dependency retains freedom to add storage behind its private fields, so a downstream crate cannot turn today's zero-size observation into a permanent transparent-layout promise.",
    firstCheck:
      "Locate the extra field type's owning crate and decide whether the wrapper stores a real capability or only needs a type tag before using PhantomData or abandoning transparent representation.",
    searchTerms: [
      "Rust E0690 repr transparent private fields dependency",
      "private marker could become non zero sized repr transparent",
      "downstream zero sized type transparent wrapper Rust 1.98",
    ],
    evidence: [
      "Rust 1.98.1 two-crate Cargo failure",
      "dependency marker has a private unit field",
      "PhantomData repair keeps type information without storing the dependency type",
    ],
    caseSlug: "downstream-private-marker-is-not-transparent-layout-trivia",
  },
  {
    id: "RFA-718",
    area: "upgrades-compatibility",
    symptom:
      "A repr(transparent) wrapper around u64 and a dependency's non_exhaustive unit struct fails with E0690 even though the marker is zero-sized today.",
    likelyCause:
      "The non_exhaustive attribute explicitly reserves the dependency's right to add fields, which conflicts with a downstream promise that the marker can always be ignored for layout.",
    firstCheck:
      "Inspect the external marker for non_exhaustive, then separate a type-only relationship into PhantomData or keep a required marker value outside the transparent wrapper.",
    searchTerms: [
      "Rust E0690 repr transparent non_exhaustive marker",
      "non exhaustive zero sized field could become non zero sized",
      "repr transparent dependency FutureMarker Rust 1.98",
    ],
    evidence: [
      "Rust 1.98.1 two-crate Cargo failure",
      "non_exhaustive unit marker is rejected as an ignorable field",
      "PhantomData repair separates type tagging from stored layout",
    ],
    caseSlug: "non-exhaustive-marker-cannot-be-transparent-layout-trivia",
  },
  {
    id: "RFA-719",
    area: "upgrades-compatibility",
    symptom:
      "Code using #[inline(always(extra))] fails with E0539 on Rust 1.98 even though an older compiler appeared to accept the attribute.",
    likelyCause:
      "The inline attribute accepts no input, always, or never; Rust 1.98 validates the complete nested meta item instead of leaving meaningless extra tokens unconsumed.",
    firstCheck:
      "Compare the complete attribute against the Reference, remove arguments nested inside always, and benchmark separately whether the valid inlining hint helps.",
    searchTerms: [
      "Rust E0539 inline always extra malformed attribute",
      "inline always does not accept arguments Rust 1.98",
      "valid forms inline always never attribute",
    ],
    evidence: [
      "Rust 1.98.1 E0539 compile failure",
      "nested tokens inside inline(always(...)) are rejected",
      "plain inline(always) repair compiles",
    ],
    caseSlug: "inline-always-does-not-accept-nested-arguments",
  },
  {
    id: "RFA-720",
    area: "ffi-targets",
    symptom:
      "An exported extern C function named strlen is rejected under deny(suspicious_runtime_symbol_definitions) because it accepts *mut f32 instead of *const c_char.",
    likelyCause:
      "Matching pointer width and calling convention do not establish the pointee, constness, termination, or safety contract expected by a well-known runtime symbol.",
    firstCheck:
      "Identify who owns the global symbol name and compare the complete native declaration before renaming an application export or auditing an intentional runtime implementation.",
    searchTerms: [
      "Rust suspicious_runtime_symbol_definitions strlen pointer type",
      "suspicious definition runtime strlen symbol Rust 1.98",
      "no_mangle strlen expected const i8 found mut f32",
    ],
    evidence: [
      "Rust 1.98.1 suspicious runtime-symbol diagnostic",
      "extern C strlen has matching pointer width but wrong pointee semantics",
      "application-specific exported name removes the accidental runtime collision",
    ],
    caseSlug: "runtime-symbol-signatures-can-be-abi-shaped-but-semantically-wrong",
  },
  {
    id: "RFA-721",
    area: "upgrades-compatibility",
    symptom:
      "NonZeroU32::from_str_radix(\"0\", 10).unwrap() panics even though zero is valid decimal syntax and fits inside u32.",
    likelyCause:
      "The parser validates both the radix grammar and the destination type, and zero cannot inhabit NonZeroU32, so it returns ParseIntError with IntErrorKind::Zero before unwrap turns that error into a panic.",
    firstCheck:
      "Inspect ParseIntError::kind, distinguish a valid zero from invalid digits or an unsupported radix, and decide whether zero is forbidden or represents a separate domain state.",
    searchTerms: [
      "Rust NonZeroU32 from_str_radix zero ParseIntError",
      "IntErrorKind Zero nonzero integer parsing",
      "NonZero from_str_radix valid digits but error",
    ],
    evidence: [
      "Rust 1.98.1 runtime panic after unwrapping zero",
      "ParseIntError reports IntErrorKind::Zero",
      "repaired parser preserves a domain-specific zero message and accepts twelve",
    ],
    caseSlug: "nonzero-from-str-radix-rejects-zero",
  },
  {
    id: "RFA-722",
    area: "upgrades-compatibility",
    symptom:
      "true.ok_or(build_error()) returns Ok(()), but build_error still runs and can allocate, mutate state, log, or perform other unnecessary work.",
    likelyCause:
      "Method arguments are evaluated before the call, so bool::ok_or receives an error value which already exists; only bool::ok_or_else can defer construction behind a closure.",
    firstCheck:
      "Instrument the error constructor and test true and false separately, then use ok_or_else when construction is expensive or observable and an explicit branch when side effects are policy.",
    searchTerms: [
      "Rust bool ok_or eager error construction",
      "true ok_or still evaluates error expression",
      "bool ok_or versus ok_or_else Rust 1.98",
    ],
    evidence: [
      "Rust 1.98.1 runtime assertion after eager error construction",
      "true.ok_or returns Ok but increments the construction counter",
      "ok_or_else skips construction for true and invokes it once for false",
    ],
    caseSlug: "bool-ok-or-constructs-its-error-eagerly",
  },
];

export function getRustFailureArea(slug) {
  return rustFailureAreas.find((area) => area.slug === slug);
}
