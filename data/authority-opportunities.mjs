// Article backlog: identifiers, clusters, working titles, evidence plans, and approval state.

export const rustOpportunities = [
  {
    "id": "RUST-001",
    "cluster": "rust-under-the-hood",
    "subcluster": "compiler-tooling",
    "workingTitle": "DefId vs HirId: How rustc Gives Meaning an Identity",
    "evidencePlan": "source-to-ID walkthrough",
    "stage": "upgrade",
    "slug": "rustc-defid-vs-hirid",
    "validation": "pending",
    "publishDecision": "hold"
  },
  {
    "id": "RUST-002",
    "cluster": "rust-under-the-hood",
    "subcluster": "compiler-tooling",
    "workingTitle": "From TypeScript Call to Rust Function Inside Deno",
    "evidencePlan": "traced call path",
    "stage": "upgrade",
    "slug": "deno_files",
    "validation": "pending",
    "publishDecision": "hold"
  },
  {
    "id": "RUST-003",
    "cluster": "rust-under-the-hood",
    "subcluster": "compiler-tooling",
    "workingTitle": "Rust Macro Hygiene: What $crate, Spans, and Call Sites Actually Control",
    "evidencePlan": "expansion experiments",
    "stage": "draft",
    "slug": "rust-macro-hygiene-spans",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://doc.rust-lang.org/reference/macros-by-example.html#hygiene",
      "https://doc.rust-lang.org/reference/procedural-macros.html",
      "https://doc.rust-lang.org/proc_macro/struct.Span.html"
    ]
  },
  {
    "id": "RUST-004",
    "cluster": "rust-under-the-hood",
    "subcluster": "compiler-tooling",
    "workingTitle": "How rust-analyzer Finds a Definition Through Macros and Modules",
    "evidencePlan": "source navigation trace",
    "stage": "draft",
    "slug": "semantics-rust-analyzer",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://rust-analyzer.github.io/book/contributing/architecture.html",
      "https://rust-analyzer.github.io/book/contributing/syntax.html",
      "https://rust-analyzer.github.io/book/features.html#go-to-definition",
      "https://github.com/rust-lang/rust-analyzer/blob/master/crates/hir/src/semantics.rs"
    ]
  },
  {
    "id": "RUST-005",
    "cluster": "rust-under-the-hood",
    "subcluster": "compiler-tooling",
    "workingTitle": "How to Inspect Rust's AST Without Mistaking It for the Program",
    "evidencePlan": "rustc commands and output",
    "stage": "upgrade",
    "slug": "rust-ast-display",
    "validation": "pending",
    "publishDecision": "hold"
  },
  {
    "id": "RUST-006",
    "cluster": "rust-under-the-hood",
    "subcluster": "compiler-tooling",
    "workingTitle": "How macro_rules Matches Tokens Before Rust Parses Expressions",
    "evidencePlan": "token-tree experiments",
    "stage": "upgrade",
    "slug": "macro_rules-rust",
    "validation": "pending",
    "publishDecision": "hold"
  },
  {
    "id": "RUST-007",
    "cluster": "rust-under-the-hood",
    "subcluster": "compiler-tooling",
    "workingTitle": "Why Procedural Macro Errors Point at the Wrong Code",
    "evidencePlan": "span comparison harness",
    "stage": "draft",
    "slug": "why-procedural-macro-errors-point-at-the-wrong-code",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://doc.rust-lang.org/reference/procedural-macros.html",
      "https://doc.rust-lang.org/proc_macro/struct.Span.html",
      "https://docs.rs/syn/latest/syn/struct.Error.html",
      "https://docs.rs/quote/latest/quote/macro.quote_spanned.html"
    ]
  },
  {
    "id": "RUST-008",
    "cluster": "rust-under-the-hood",
    "subcluster": "compiler-tooling",
    "workingTitle": "HIR, THIR, and MIR: The Same Rust Function at Three Compiler Stages",
    "evidencePlan": "side-by-side compiler output",
    "stage": "draft",
    "slug": "hir-thir-and-mir-the-same-rust-function-at-three-compiler-stages",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://rustc-dev-guide.rust-lang.org/hir.html",
      "https://rustc-dev-guide.rust-lang.org/thir.html",
      "https://rustc-dev-guide.rust-lang.org/mir/index.html"
    ]
  },
  {
    "id": "RUST-009",
    "cluster": "rust-under-the-hood",
    "subcluster": "compiler-tooling",
    "workingTitle": "rustc's Query System: Why the Compiler Computes Facts on Demand",
    "evidencePlan": "query dependency diagram",
    "stage": "draft",
    "slug": "rustc-query-system-why-the-compiler-computes-facts-on-demand",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://rustc-dev-guide.rust-lang.org/queries/query-evaluation-model-in-detail.html",
      "https://rustc-dev-guide.rust-lang.org/queries/incremental-compilation.html"
    ]
  },
  {
    "id": "RUST-010",
    "cluster": "rust-under-the-hood",
    "subcluster": "compiler-tooling",
    "workingTitle": "How Rust Turns a Trait Bound Into Solver Obligations",
    "evidencePlan": "diagnostic derivation",
    "stage": "draft",
    "slug": "how-rust-turns-a-trait-bound-into-solver-obligations",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://rustc-dev-guide.rust-lang.org/traits/resolution.html",
      "https://rustc-dev-guide.rust-lang.org/solve/trait-solving.html",
      "https://doc.rust-lang.org/reference/trait-bounds.html"
    ]
  },
  {
    "id": "RUST-011",
    "cluster": "rust-under-the-hood",
    "subcluster": "compiler-tooling",
    "workingTitle": "Where Rust Monomorphization Happens and Why Codegen Units Matter",
    "evidencePlan": "binary and timing experiment",
    "stage": "draft",
    "slug": "where-rust-monomorphization-happens-and-why-codegen-units-matter",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://rustc-dev-guide.rust-lang.org/backend/monomorph.html",
      "https://rustc-dev-guide.rust-lang.org/backend/lowering-mir.html",
      "https://rustc-dev-guide.rust-lang.org/backend/codegen.html"
    ]
  },
  {
    "id": "RUST-012",
    "cluster": "rust-under-the-hood",
    "subcluster": "compiler-tooling",
    "workingTitle": "Rust's v0 Symbol Mangling: What Changed in Rust 1.97",
    "evidencePlan": "nm and demangler comparison",
    "stage": "brief",
    "slug": "rust-s-v0-symbol-mangling-what-changed-in-rust-1-97",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://blog.rust-lang.org/2026/07/09/Rust-1.97.0/",
      "https://doc.rust-lang.org/rustc/symbol-mangling/index.html",
      "https://doc.rust-lang.org/rustc/symbol-mangling/v0.html"
    ]
  },
  {
    "id": "RUST-013",
    "cluster": "rust-under-the-hood",
    "subcluster": "compiler-tooling",
    "workingTitle": "Why Cargo Build Scripts Rerun and How to Make Them Predictable",
    "evidencePlan": "rebuild matrix",
    "stage": "brief",
    "slug": "why-cargo-build-scripts-rerun-and-how-to-make-them-predictable",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://doc.rust-lang.org/cargo/reference/build-scripts.html",
      "https://doc.rust-lang.org/cargo/reference/build-script-examples.html"
    ]
  },
  {
    "id": "RUST-014",
    "cluster": "rust-under-the-hood",
    "subcluster": "compiler-tooling",
    "workingTitle": "Cargo Resolver 3: How MSRV Changes Dependency Selection",
    "evidencePlan": "resolution fixtures",
    "stage": "brief",
    "slug": "cargo-resolver-3-how-msrv-changes-dependency-selection",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://doc.rust-lang.org/cargo/reference/resolver.html#rust-version",
      "https://doc.rust-lang.org/cargo/reference/rust-version.html",
      "https://doc.rust-lang.org/edition-guide/rust-2024/cargo-resolver.html"
    ]
  },
  {
    "id": "RUST-015",
    "cluster": "rust-under-the-hood",
    "subcluster": "compiler-tooling",
    "workingTitle": "Cargo Feature Unification Across Workspaces, Host Tools, and Targets",
    "evidencePlan": "dependency graph experiment",
    "stage": "brief",
    "slug": "cargo-feature-unification-across-workspaces-host-tools-and-targets",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://doc.rust-lang.org/cargo/reference/resolver.html#feature-resolver-version-2",
      "https://doc.rust-lang.org/cargo/reference/features.html#feature-resolver-version-2",
      "https://doc.rust-lang.org/cargo/reference/features.html#dependency-features"
    ]
  },
  {
    "id": "RUST-016",
    "cluster": "rust-under-the-hood",
    "subcluster": "compiler-tooling",
    "workingTitle": "Denying Rust Warnings Without Throwing Away the Cargo Cache",
    "evidencePlan": "CI timing comparison",
    "stage": "brief",
    "slug": "denying-rust-warnings-without-throwing-away-the-cargo-cache",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://blog.rust-lang.org/2026/07/09/Rust-1.97.0/#cargo-support-for-denying-warnings",
      "https://doc.rust-lang.org/cargo/reference/config.html#buildwarnings",
      "https://doc.rust-lang.org/nightly/releases.html#version-1970-2026-07-09"
    ]
  },
  {
    "id": "RUST-017",
    "cluster": "rust-under-the-hood",
    "subcluster": "compiler-tooling",
    "workingTitle": "Rust 1.97 Linker Messages: Which Warnings Belong to rustc?",
    "evidencePlan": "cross-linker examples",
    "stage": "brief",
    "slug": "rust-1-97-linker-messages-which-warnings-belong-to-rustc",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://blog.rust-lang.org/2026/07/09/Rust-1.97.0/#linker-output-no-longer-hidden-by-default",
      "https://doc.rust-lang.org/nightly/releases.html#version-1970-2026-07-09",
      "https://doc.rust-lang.org/nightly/nightly-rustc/rustc_lint_defs/builtin/static.LINKER_INFO.html"
    ]
  },
  {
    "id": "RUST-018",
    "cluster": "rust-under-the-hood",
    "subcluster": "compiler-tooling",
    "workingTitle": "What Invalidates Rust's Incremental Compilation Cache",
    "evidencePlan": "incremental rebuild trace",
    "stage": "brief",
    "slug": "what-invalidates-rusts-incremental-compilation-cache",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://rustc-dev-guide.rust-lang.org/queries/incremental-compilation-in-detail.html",
      "https://rustc-dev-guide.rust-lang.org/queries/incremental-compilation.html",
      "https://doc.rust-lang.org/cargo/reference/profiles.html#incremental"
    ]
  },
  {
    "id": "RUST-019",
    "cluster": "rust-under-the-hood",
    "subcluster": "compiler-tooling",
    "workingTitle": "Macro Expansion and Name Resolution: Rust's Compiler Feedback Loop",
    "evidencePlan": "minimal expansion cases",
    "stage": "brief",
    "slug": "macro-expansion-and-name-resolution-rusts-compiler-feedback-loop",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://rustc-dev-guide.rust-lang.org/macro-expansion.html",
      "https://rustc-dev-guide.rust-lang.org/name-resolution.html",
      "https://doc.rust-lang.org/reference/names/name-resolution.html",
      "https://doc.rust-lang.org/reference/macros-by-example.html#scoping-exporting-and-importing"
    ]
  },
  {
    "id": "RUST-020",
    "cluster": "rust-under-the-hood",
    "subcluster": "compiler-tooling",
    "workingTitle": "How rust-analyzer Recomputes Only What an Edit Invalidates",
    "evidencePlan": "dependency invalidation trace",
    "stage": "brief",
    "slug": "how-rust-analyzer-recomputes-only-what-an-edit-invalidates",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://rust-analyzer.github.io/book/contributing/architecture.html",
      "https://rust-analyzer.github.io/book/contributing/guide.html",
      "https://github.com/rust-lang/rust-analyzer"
    ]
  },
  {
    "id": "RUST-021",
    "cluster": "rust-under-the-hood",
    "subcluster": "compiler-tooling",
    "workingTitle": "Why rust-analyzer Uses Immutable Green Trees for Broken Code",
    "evidencePlan": "incremental parse example",
    "stage": "brief",
    "slug": "why-rust-analyzer-uses-immutable-green-trees-for-broken-code",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://rust-analyzer.github.io/book/contributing/syntax.html",
      "https://rust-analyzer.github.io/book/contributing/architecture.html",
      "https://github.com/rust-lang/rust-analyzer/blob/master/docs/book/src/contributing/syntax.md"
    ]
  },
  {
    "id": "RUST-022",
    "cluster": "rust-under-the-hood",
    "subcluster": "compiler-tooling",
    "workingTitle": "Reading rustc Self-Profile Data to Find a Slow Crate",
    "evidencePlan": "measured compile profile",
    "stage": "brief",
    "slug": "reading-rustc-self-profile-data-to-find-a-slow-crate",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://doc.rust-lang.org/cargo/reference/timings.html",
      "https://rustc-dev-guide.rust-lang.org/profiling.html",
      "https://github.com/rust-lang/measureme"
    ]
  },
  {
    "id": "RUST-023",
    "cluster": "rust-under-the-hood",
    "subcluster": "compiler-tooling",
    "workingTitle": "How a Rust Function Becomes LLVM IR Without Losing the Plot",
    "evidencePlan": "source-to-IR walkthrough",
    "stage": "brief",
    "slug": "how-a-rust-function-becomes-llvm-ir-without-losing-the-plot",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://doc.rust-lang.org/rustc/command-line-arguments.html#--emit-specifies-the-types-of-output-files-to-generate",
      "https://rustc-dev-guide.rust-lang.org/backend/codegen.html",
      "https://llvm.org/docs/LangRef.html"
    ]
  },
  {
    "id": "RUST-024",
    "cluster": "rust-under-the-hood",
    "subcluster": "compiler-tooling",
    "workingTitle": "What Deno's op2 Macro Generates at the JavaScript–Rust Boundary",
    "evidencePlan": "expanded binding and benchmark",
    "stage": "brief",
    "slug": "what-denos-op2-macro-generates-at-the-javascript-rust-boundary",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://github.com/denoland/deno_core/blob/main/ops/op2/mod.rs",
      "https://github.com/denoland/deno_core/blob/main/ops/op2/README.md",
      "https://github.com/denoland/deno_core/blob/main/ops/op2/dispatch_slow.rs",
      "https://github.com/denoland/deno_core/blob/main/ops/op2/valid_args.md"
    ]
  },
  {
    "id": "RUST-025",
    "cluster": "rust-under-the-hood",
    "subcluster": "compiler-tooling",
    "workingTitle": "Rust Coherence: What the Orphan Rule Protects Across Crates",
    "evidencePlan": "conflicting-impl matrix",
    "stage": "upgrade",
    "slug": "orphan-rule-rust",
    "validation": "pending",
    "publishDecision": "hold"
  },
  {
    "id": "RUST-026",
    "cluster": "rust-under-the-hood",
    "subcluster": "async-concurrency",
    "workingTitle": "Why Rust Async Futures Get So Large",
    "evidencePlan": "layout measurements",
    "stage": "draft",
    "slug": "rust-async-future-size",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://doc.rust-lang.org/reference/expressions/block-expr.html#async-blocks",
      "https://doc.rust-lang.org/nightly/nightly-rustc/rustc_abi/layout/coroutine/index.html"
    ]
  },
  {
    "id": "RUST-027",
    "cluster": "rust-under-the-hood",
    "subcluster": "async-concurrency",
    "workingTitle": "Why a Rust Future Is Not Send Across .await",
    "evidencePlan": "compiler-state reconstruction",
    "stage": "draft",
    "slug": "rust-future-send-across-await",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://doc.rust-lang.org/reference/expressions/block-expr.html#async-blocks",
      "https://doc.rust-lang.org/std/marker/trait.Send.html",
      "https://docs.rs/tokio/latest/tokio/task/fn.spawn.html"
    ]
  },
  {
    "id": "RUST-028",
    "cluster": "rust-under-the-hood",
    "subcluster": "async-concurrency",
    "workingTitle": "Cancellation Safety in Async Rust, Explained",
    "evidencePlan": "interruption test matrix",
    "stage": "draft",
    "slug": "rust-async-cancellation-safety",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://docs.rs/tokio/latest/tokio/macro.select.html",
      "https://rust-lang.github.io/async-book/part-guide/more-async-await.html#cancellation"
    ]
  },
  {
    "id": "RUST-029",
    "cluster": "rust-under-the-hood",
    "subcluster": "async-concurrency",
    "workingTitle": "Structural Pinning in Rust: Which Fields Are Actually Pinned?",
    "evidencePlan": "soundness cases",
    "stage": "draft",
    "slug": "rust-pin-projection-structural-pinning",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://doc.rust-lang.org/std/pin/",
      "https://doc.rust-lang.org/std/marker/trait.Unpin.html"
    ]
  },
  {
    "id": "RUST-030",
    "cluster": "rust-under-the-hood",
    "subcluster": "async-concurrency",
    "workingTitle": "Lending Async Callbacks With Rust's AsyncFn Traits",
    "evidencePlan": "lifetime comparison",
    "stage": "draft",
    "slug": "rust-asyncfn-lending-callbacks",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://doc.rust-lang.org/std/ops/trait.AsyncFnMut.html",
      "https://doc.rust-lang.org/reference/expressions/closure-expr.html#async-closure-expression",
      "https://rust-lang.github.io/rfcs/3668-async-closures.html"
    ]
  },
  {
    "id": "RUST-031",
    "cluster": "rust-under-the-hood",
    "subcluster": "async-concurrency",
    "workingTitle": "Behind #[tokio::main]: The Runtime That the Attribute Builds",
    "evidencePlan": "macro expansion and runtime trace",
    "stage": "upgrade",
    "slug": "tokio-main-deep-dive",
    "validation": "pending",
    "publishDecision": "hold"
  },
  {
    "id": "RUST-032",
    "cluster": "rust-under-the-hood",
    "subcluster": "async-concurrency",
    "workingTitle": "Building a Correct Async Oneshot Channel From a State Machine",
    "evidencePlan": "loom-tested implementation",
    "stage": "upgrade",
    "slug": "oneshot-channel-rust",
    "validation": "pending",
    "publishDecision": "hold"
  },
  {
    "id": "RUST-033",
    "cluster": "rust-under-the-hood",
    "subcluster": "async-concurrency",
    "workingTitle": "spawn, spawn_blocking, and block_on: Three Different Scheduling Promises",
    "evidencePlan": "thread and latency trace",
    "stage": "upgrade",
    "slug": "runtime-async",
    "validation": "pending",
    "publishDecision": "hold"
  },
  {
    "id": "RUST-034",
    "cluster": "rust-under-the-hood",
    "subcluster": "async-concurrency",
    "workingTitle": "What Actually Differs Between Tokio, async-std, and smol",
    "evidencePlan": "same workload comparison",
    "stage": "upgrade",
    "slug": "async-rust-libraries",
    "validation": "pending",
    "publishDecision": "hold"
  },
  {
    "id": "RUST-035",
    "cluster": "rust-under-the-hood",
    "subcluster": "async-concurrency",
    "workingTitle": "Why Iterator::map Cannot Await and Which Rewrite Preserves Concurrency",
    "evidencePlan": "ordering and concurrency tests",
    "stage": "upgrade",
    "slug": "await-rust-iterator",
    "validation": "pending",
    "publishDecision": "hold"
  },
  {
    "id": "RUST-036",
    "cluster": "rust-under-the-hood",
    "subcluster": "async-concurrency",
    "workingTitle": "Acquire and Release Ordering Through One Shared State Machine",
    "evidencePlan": "loom counterexamples",
    "stage": "upgrade",
    "slug": "acquire-release-rust",
    "validation": "pending",
    "publishDecision": "hold"
  },
  {
    "id": "RUST-037",
    "cluster": "rust-under-the-hood",
    "subcluster": "async-concurrency",
    "workingTitle": "When Relaxed Atomics Are Enough—and What They Never Guarantee",
    "evidencePlan": "litmus tests",
    "stage": "brief",
    "slug": "when-relaxed-atomics-are-enough-and-what-they-never-guarantee",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://doc.rust-lang.org/std/sync/atomic/enum.Ordering.html",
      "https://doc.rust-lang.org/nomicon/atomics.html",
      "https://docs.rs/loom/latest/loom/"
    ]
  },
  {
    "id": "RUST-038",
    "cluster": "rust-under-the-hood",
    "subcluster": "async-concurrency",
    "workingTitle": "Release Sequences in Rust: The Rule Behind a Surprising Acquire Load",
    "evidencePlan": "memory-model timeline",
    "stage": "brief",
    "slug": "release-sequences-in-rust-the-rule-behind-a-surprising-acquire-load",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://doc.rust-lang.org/std/sync/atomic/enum.Ordering.html",
      "https://doc.rust-lang.org/nomicon/arc-mutex/arc-drop.html",
      "https://doc.rust-lang.org/nomicon/atomics.html"
    ]
  },
  {
    "id": "RUST-039",
    "cluster": "rust-under-the-hood",
    "subcluster": "async-concurrency",
    "workingTitle": "Atomic Fences in Rust Without Hand-Waving",
    "evidencePlan": "paired-fence litmus tests",
    "stage": "brief",
    "slug": "atomic-fences-in-rust-without-hand-waving",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://doc.rust-lang.org/std/sync/atomic/fn.fence.html",
      "https://doc.rust-lang.org/std/sync/atomic/fn.compiler_fence.html",
      "https://doc.rust-lang.org/nomicon/arc-mutex/arc-drop.html"
    ]
  },
  {
    "id": "RUST-040",
    "cluster": "rust-under-the-hood",
    "subcluster": "async-concurrency",
    "workingTitle": "How an AtomicWaker Avoids the Check-Then-Sleep Race",
    "evidencePlan": "race interleaving harness",
    "stage": "brief",
    "slug": "how-an-atomicwaker-avoids-the-check-then-sleep-race",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://docs.rs/futures/latest/futures/task/struct.AtomicWaker.html",
      "https://github.com/rust-lang/futures-rs/blob/master/futures-task/src/atomic_waker.rs"
    ]
  },
  {
    "id": "RUST-041",
    "cluster": "rust-under-the-hood",
    "subcluster": "async-concurrency",
    "workingTitle": "Bounded Channels Are a Capacity Contract, Not Just a Queue Size",
    "evidencePlan": "load and saturation benchmark",
    "stage": "brief",
    "slug": "bounded-channels-are-a-capacity-contract-not-just-a-queue-size",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://docs.rs/tokio/latest/tokio/sync/mpsc/index.html",
      "https://docs.rs/tokio/latest/tokio/sync/mpsc/struct.Sender.html"
    ]
  },
  {
    "id": "RUST-042",
    "cluster": "rust-under-the-hood",
    "subcluster": "async-concurrency",
    "workingTitle": "What tokio::select! Cancels at Every Loop Iteration",
    "evidencePlan": "poll interruption trace",
    "stage": "brief",
    "slug": "what-tokio-select-cancels-at-every-loop-iteration",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://docs.rs/tokio/latest/tokio/macro.select.html",
      "https://docs.rs/tokio/latest/tokio/io/trait.AsyncBufReadExt.html#method.read_line"
    ]
  },
  {
    "id": "RUST-043",
    "cluster": "rust-under-the-hood",
    "subcluster": "async-concurrency",
    "workingTitle": "How One Blocking Function Stalls an Async Rust Executor",
    "evidencePlan": "scheduler latency benchmark",
    "stage": "brief",
    "slug": "how-one-blocking-function-stalls-an-async-rust-executor",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://docs.rs/tokio/latest/tokio/#cpu-bound-tasks-and-blocking-code",
      "https://docs.rs/tokio/latest/tokio/runtime/#detailed-runtime-behavior",
      "https://docs.rs/tokio/latest/tokio/task/fn.spawn_blocking.html"
    ]
  },
  {
    "id": "RUST-044",
    "cluster": "rust-under-the-hood",
    "subcluster": "async-concurrency",
    "workingTitle": "Tokio's Cooperative Budget: Why a Ready Future Must Still Yield",
    "evidencePlan": "task fairness trace",
    "stage": "brief",
    "slug": "tokio-s-cooperative-budget-why-a-ready-future-must-still-yield",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://docs.rs/tokio/latest/tokio/runtime/#detailed-runtime-behavior",
      "https://docs.rs/tokio/latest/tokio/task/coop/index.html",
      "https://tokio.rs/blog/2020-04-preemption"
    ]
  },
  {
    "id": "RUST-045",
    "cluster": "rust-under-the-hood",
    "subcluster": "async-concurrency",
    "workingTitle": "Graceful Shutdown in Async Rust Starts With Task Ownership",
    "evidencePlan": "reference task-tree implementation",
    "stage": "brief",
    "slug": "graceful-shutdown-in-async-rust-starts-with-task-ownership",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://tokio.rs/tokio/topics/shutdown",
      "https://docs.rs/tokio-util/latest/tokio_util/sync/struct.CancellationToken.html",
      "https://docs.rs/tokio-util/latest/tokio_util/task/task_tracker/struct.TaskTracker.html"
    ]
  },
  {
    "id": "RUST-046",
    "cluster": "rust-under-the-hood",
    "subcluster": "types-memory",
    "workingTitle": "PhantomData: Variance, Auto Traits, and Drop Check in One Type",
    "evidencePlan": "compile-pass matrix",
    "stage": "draft",
    "slug": "rust-phantomdata-variance-drop-check",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://doc.rust-lang.org/std/marker/struct.PhantomData.html",
      "https://doc.rust-lang.org/nomicon/phantom-data.html",
      "https://doc.rust-lang.org/nomicon/subtyping.html",
      "https://doc.rust-lang.org/nomicon/dropck.html"
    ]
  },
  {
    "id": "RUST-047",
    "cluster": "rust-under-the-hood",
    "subcluster": "types-memory",
    "workingTitle": "Rust Strict Provenance: Why a Pointer Is More Than an Address",
    "evidencePlan": "Miri experiments",
    "stage": "draft",
    "slug": "rust-strict-provenance-pointer-address",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://doc.rust-lang.org/std/ptr/index.html#provenance",
      "https://doc.rust-lang.org/std/primitive.pointer.html",
      "https://doc.rust-lang.org/std/ptr/fn.with_exposed_provenance.html",
      "https://github.com/rust-lang/miri"
    ]
  },
  {
    "id": "RUST-048",
    "cluster": "rust-under-the-hood",
    "subcluster": "types-memory",
    "workingTitle": "Rust Enum Niches: How Option<T> Can Cost No Extra Byte",
    "evidencePlan": "layout measurements",
    "stage": "draft",
    "slug": "rust-enum-niche-optimization",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://doc.rust-lang.org/std/option/index.html#representation",
      "https://doc.rust-lang.org/reference/type-layout.html",
      "https://doc.rust-lang.org/nomicon/repr-rust.html",
      "https://doc.rust-lang.org/nomicon/other-reprs.html"
    ]
  },
  {
    "id": "RUST-049",
    "cluster": "rust-under-the-hood",
    "subcluster": "types-memory",
    "workingTitle": "Where a Rust String Literal Lives From Object File to Process Memory",
    "evidencePlan": "binary section inspection",
    "stage": "upgrade",
    "slug": "rust-string-literal-under-the-hood",
    "validation": "pending",
    "publishDecision": "hold"
  },
  {
    "id": "RUST-050",
    "cluster": "rust-under-the-hood",
    "subcluster": "types-memory",
    "workingTitle": "Sized and ?Sized: The Implicit Bound Behind Most Rust Generics",
    "evidencePlan": "type and layout cases",
    "stage": "upgrade",
    "slug": "sized-vs-unsized-in-rust",
    "validation": "pending",
    "publishDecision": "hold"
  },
  {
    "id": "RUST-051",
    "cluster": "rust-under-the-hood",
    "subcluster": "types-memory",
    "workingTitle": "Why T: ?Sized Does Not Automatically Become dyn Trait",
    "evidencePlan": "coercion cases",
    "stage": "upgrade",
    "slug": "generic-unsized-to-trait-object",
    "validation": "pending",
    "publishDecision": "hold"
  },
  {
    "id": "RUST-052",
    "cluster": "rust-under-the-hood",
    "subcluster": "types-memory",
    "workingTitle": "Why dyn Read + Write Needs a New Supertrait",
    "evidencePlan": "object-safety matrix",
    "stage": "upgrade",
    "slug": "multi-trait-object-rust",
    "validation": "pending",
    "publishDecision": "hold"
  },
  {
    "id": "RUST-053",
    "cluster": "rust-under-the-hood",
    "subcluster": "types-memory",
    "workingTitle": "What a Rust Trait Object Carries in Its Data and Vtable Pointers",
    "evidencePlan": "raw representation inspection",
    "stage": "upgrade",
    "slug": "trait-object-ramblings",
    "validation": "pending",
    "publishDecision": "hold"
  },
  {
    "id": "RUST-054",
    "cluster": "rust-under-the-hood",
    "subcluster": "types-memory",
    "workingTitle": "UnsafeCell, Cell, and RefCell: Where Rust Moves the Borrow Check",
    "evidencePlan": "runtime borrow experiments",
    "stage": "upgrade",
    "slug": "cell-refcell-rust",
    "validation": "pending",
    "publishDecision": "hold"
  },
  {
    "id": "RUST-055",
    "cluster": "rust-under-the-hood",
    "subcluster": "types-memory",
    "workingTitle": "A Rust FFI Boundary Is More Than repr(C)",
    "evidencePlan": "C harness and ABI checklist",
    "stage": "draft",
    "slug": "rust-ffi-guide",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://doc.rust-lang.org/reference/type-layout.html",
      "https://doc.rust-lang.org/nomicon/ffi.html",
      "https://doc.rust-lang.org/nomicon/other-reprs.html",
      "https://microsoft.github.io/rust-guidelines/guidelines/ffi/index.html"
    ]
  },
  {
    "id": "RUST-056",
    "cluster": "rust-under-the-hood",
    "subcluster": "types-memory",
    "workingTitle": "Rust Drop Order for Fields, Locals, Temporaries, and Captures",
    "evidencePlan": "observable destructor trace",
    "stage": "brief",
    "slug": "rust-drop-order-for-fields-locals-temporaries-and-captures",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://doc.rust-lang.org/reference/destructors.html",
      "https://doc.rust-lang.org/std/mem/fn.drop.html"
    ]
  },
  {
    "id": "RUST-057",
    "cluster": "rust-under-the-hood",
    "subcluster": "types-memory",
    "workingTitle": "What repr(transparent) Guarantees—and What It Leaves Unspecified",
    "evidencePlan": "ABI comparison",
    "stage": "brief",
    "slug": "what-repr-transparent-guaranteesand-what-it-leaves-unspecified",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://doc.rust-lang.org/reference/type-layout.html#the-transparent-representation",
      "https://doc.rust-lang.org/nomicon/other-reprs.html#reprtransparent"
    ]
  },
  {
    "id": "RUST-058",
    "cluster": "rust-under-the-hood",
    "subcluster": "types-memory",
    "workingTitle": "Slice, str, and dyn Trait Metadata Through ptr::metadata",
    "evidencePlan": "pointer inspection",
    "stage": "brief",
    "slug": "slice-str-and-dyn-trait-metadata-through-ptr-metadata",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://doc.rust-lang.org/std/ptr/fn.metadata.html",
      "https://doc.rust-lang.org/std/ptr/struct.DynMetadata.html",
      "https://doc.rust-lang.org/reference/type-layout.html#pointers-and-references-layout"
    ]
  },
  {
    "id": "RUST-059",
    "cluster": "rust-under-the-hood",
    "subcluster": "types-memory",
    "workingTitle": "Initializing Arrays With MaybeUninit Without Leaking Partial Progress",
    "evidencePlan": "panic-safe implementation",
    "stage": "brief",
    "slug": "initializing-arrays-with-maybeuninit-without-leaking-partial-progress",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://doc.rust-lang.org/std/mem/union.MaybeUninit.html",
      "https://doc.rust-lang.org/nomicon/unchecked-uninit.html"
    ]
  },
  {
    "id": "RUST-060",
    "cluster": "rust-under-the-hood",
    "subcluster": "types-memory",
    "workingTitle": "The ManuallyDrop<Box<T>> Rule Rust 1.98 Finally Documents",
    "evidencePlan": "versioned documentation and Miri reproduction",
    "stage": "brief",
    "slug": "the-manuallydrop-box-t-rule-rust-1-98-finally-documents",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://doc.rust-lang.org/releases.html#version-1980-2026-08-20",
      "https://doc.rust-lang.org/std/mem/struct.ManuallyDrop.html",
      "https://doc.rust-lang.org/nightly/clippy/development/miri/index.html"
    ]
  },
  {
    "id": "RUST-061",
    "cluster": "rust-under-the-hood",
    "subcluster": "stable-changes",
    "workingTitle": "Rust 2024 Temporary Scopes: When Values Are Dropped",
    "evidencePlan": "edition comparison",
    "stage": "draft",
    "slug": "rust-2024-temporary-lifetime-drop-scopes",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://doc.rust-lang.org/reference/destructors.html",
      "https://doc.rust-lang.org/edition-guide/rust-2024/temporary-if-let-scope.html",
      "https://doc.rust-lang.org/edition-guide/rust-2024/temporary-tail-expr-scope.html"
    ]
  },
  {
    "id": "RUST-062",
    "cluster": "rust-under-the-hood",
    "subcluster": "stable-changes",
    "workingTitle": "Rust 1.98 Algebraic Float Operations: Faster Math With Different Answers",
    "evidencePlan": "numeric and vectorization benchmark",
    "stage": "brief",
    "slug": "rust-1-98-algebraic-float-operations-faster-math-with-different-answers",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://doc.rust-lang.org/releases.html#version-1980-2026-08-20",
      "https://doc.rust-lang.org/stable/std/primitive.f32.html#algebraic-operators",
      "https://doc.rust-lang.org/stable/std/primitive.f64.html#method.algebraic_add"
    ]
  },
  {
    "id": "RUST-063",
    "cluster": "rust-under-the-hood",
    "subcluster": "stable-changes",
    "workingTitle": "Replacing itoa With Rust 1.98's NumBuffer and format_into",
    "evidencePlan": "formatting benchmark",
    "stage": "brief",
    "slug": "replacing-itoa-with-rust-1-98-s-numbuffer-and-format-into",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://doc.rust-lang.org/releases.html#version-1980-2026-08-20",
      "https://doc.rust-lang.org/stable/core/fmt/struct.NumBuffer.html",
      "https://doc.rust-lang.org/stable/core/primitive.u64.html#method.format_into"
    ]
  },
  {
    "id": "RUST-064",
    "cluster": "rust-under-the-hood",
    "subcluster": "stable-changes",
    "workingTitle": "Why Rust Added New Copy Range Types Without Changing 0..10 Yet",
    "evidencePlan": "type and API migration examples",
    "stage": "brief",
    "slug": "why-rust-added-new-copy-range-types-without-changing-0-10-yet",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://doc.rust-lang.org/releases.html#version-1960-2026-05-28",
      "https://doc.rust-lang.org/stable/core/range/index.html",
      "https://doc.rust-lang.org/stable/std/range/struct.Range.html"
    ]
  },
  {
    "id": "RUST-065",
    "cluster": "rust-under-the-hood",
    "subcluster": "stable-changes",
    "workingTitle": "assert_matches! in Rust 1.96: Better Failure Output for Pattern Tests",
    "evidencePlan": "failure-output comparison",
    "stage": "brief",
    "slug": "assert-matches-in-rust-1-96-better-failure-output-for-pattern-tests",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://doc.rust-lang.org/releases.html#version-1960-2026-05-28",
      "https://doc.rust-lang.org/stable/std/macro.assert_matches.html",
      "https://doc.rust-lang.org/stable/std/macro.debug_assert_matches.html"
    ]
  },
  {
    "id": "RUST-066",
    "cluster": "rust-under-the-hood",
    "subcluster": "stable-changes",
    "workingTitle": "cfg_select! in Rust 1.95 as a Compile-Time Match",
    "evidencePlan": "cross-target fixture",
    "stage": "brief",
    "slug": "cfg-select-in-rust-1-95-as-a-compile-time-match",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://doc.rust-lang.org/releases.html#version-1950-2026-03-05",
      "https://doc.rust-lang.org/stable/std/macro.cfg_select.html",
      "https://doc.rust-lang.org/reference/conditional-compilation.html"
    ]
  },
  {
    "id": "RUST-067",
    "cluster": "rust-under-the-hood",
    "subcluster": "stable-changes",
    "workingTitle": "if let Guards in Rust 1.95 and the Exhaustiveness Detail That Matters",
    "evidencePlan": "pattern matrix",
    "stage": "brief",
    "slug": "if-let-guards-in-rust-1-95-and-the-exhaustiveness-detail-that-matters",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://doc.rust-lang.org/releases.html#version-1950-2026-03-05",
      "https://doc.rust-lang.org/reference/expressions/match-expr.html#match-guards"
    ]
  },
  {
    "id": "RUST-068",
    "cluster": "rust-under-the-hood",
    "subcluster": "stable-changes",
    "workingTitle": "array_windows in Rust 1.94: Const-Sized Windows and Inferred Patterns",
    "evidencePlan": "bounds-check codegen comparison",
    "stage": "brief",
    "slug": "array-windows-in-rust-1-94-const-sized-windows-and-inferred-patterns",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://doc.rust-lang.org/releases.html#version-1940-2026-03-05",
      "https://doc.rust-lang.org/stable/std/primitive.slice.html#method.array_windows",
      "https://doc.rust-lang.org/stable/std/slice/struct.ArrayWindows.html"
    ]
  },
  {
    "id": "RUST-069",
    "cluster": "rust-under-the-hood",
    "subcluster": "stable-changes",
    "workingTitle": "Why Rust 1.96 Stopped Turning Undefined WebAssembly Symbols Into Imports",
    "evidencePlan": "linker reproduction",
    "stage": "brief",
    "slug": "why-rust-1-96-stopped-turning-undefined-webassembly-symbols-into-imports",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://doc.rust-lang.org/releases.html#version-1960-2026-05-28",
      "https://github.com/rust-lang/rust/pull/149868",
      "https://doc.rust-lang.org/reference/items/external-blocks.html"
    ]
  },
  {
    "id": "RUST-070",
    "cluster": "rust-under-the-hood",
    "subcluster": "stable-changes",
    "workingTitle": "What Rust 1.93's musl Upgrade Changed for Static Network Binaries",
    "evidencePlan": "containerized DNS tests",
    "stage": "brief",
    "slug": "what-rust-1-93-s-musl-upgrade-changed-for-static-network-binaries",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://blog.rust-lang.org/2025/12/05/Updating-musl-1.2.5/",
      "https://doc.rust-lang.org/releases.html#version-1930-2026-01-22",
      "https://github.com/rust-lang/rust/pull/142682"
    ]
  }
];

export const dataOpportunities = [
  {
    "id": "DATA-001",
    "cluster": "reliable-data-integrations",
    "subcluster": "synchronization",
    "workingTitle": "Why Every API Integration Needs a Stable Internal Model",
    "evidencePlan": "mapping reference implementation",
    "stage": "draft",
    "slug": "stable-internal-model-api-integrations",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://learn.microsoft.com/en-us/azure/architecture/patterns/anti-corruption-layer"
    ]
  },
  {
    "id": "DATA-002",
    "cluster": "reliable-data-integrations",
    "subcluster": "synchronization",
    "workingTitle": "Designing Data Synchronization for Partial Failure",
    "evidencePlan": "failure-state matrix",
    "stage": "draft",
    "slug": "data-synchronization-partial-failure",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://learn.microsoft.com/en-us/azure/architecture/patterns/retry",
      "https://learn.microsoft.com/en-us/azure/architecture/best-practices/transient-faults"
    ]
  },
  {
    "id": "DATA-003",
    "cluster": "reliable-data-integrations",
    "subcluster": "synchronization",
    "workingTitle": "External APIs Will Change. Your Product Model Should Survive",
    "evidencePlan": "before-and-after schema migration",
    "stage": "draft",
    "slug": "external-schema-changes-product-model",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://spec.openapis.org/oas/latest.html",
      "https://learn.microsoft.com/en-us/azure/architecture/patterns/anti-corruption-layer"
    ]
  },
  {
    "id": "DATA-004",
    "cluster": "reliable-data-integrations",
    "subcluster": "synchronization",
    "workingTitle": "How to Keep Two Systems in Sync Without Pretending They Are One Database",
    "evidencePlan": "complete sync model",
    "stage": "upgrade",
    "slug": "reconciliation-cross-system-sync",
    "validation": "pending",
    "publishDecision": "hold"
  },
  {
    "id": "DATA-005",
    "cluster": "reliable-data-integrations",
    "subcluster": "synchronization",
    "workingTitle": "Identity Mapping Tables: The Small Data Structure Every Integration Needs",
    "evidencePlan": "schema and race tests",
    "stage": "draft",
    "slug": "identity-mapping-tables-the-small-data-structure-every-integration-needs",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://developers.google.com/workspace/cloud-search/docs/guides/identity-mapping",
      "https://www.postgresql.org/docs/current/ddl-constraints.html",
      "https://www.postgresql.org/docs/current/sql-insert.html",
      "https://www.rfc-editor.org/rfc/rfc9562.html"
    ]
  },
  {
    "id": "DATA-006",
    "cluster": "reliable-data-integrations",
    "subcluster": "synchronization",
    "workingTitle": "Define Field Ownership Before You Build Bidirectional Sync",
    "evidencePlan": "ownership matrix",
    "stage": "draft",
    "slug": "define-field-ownership-before-you-build-bidirectional-sync",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://learn.microsoft.com/en-us/entra/identity/multi-tenant-organizations/cross-tenant-synchronization-overview",
      "https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/concept-azure-ad-connect-sync-default-configuration"
    ]
  },
  {
    "id": "DATA-007",
    "cluster": "reliable-data-integrations",
    "subcluster": "synchronization",
    "workingTitle": "A Durable Cursor for Incremental API Synchronization",
    "evidencePlan": "checkpoint implementation",
    "stage": "draft",
    "slug": "a-durable-cursor-for-incremental-api-synchronization",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://developers.google.com/workspace/calendar/api/guides/sync",
      "https://kubernetes.io/docs/reference/using-api/api-concepts/"
    ]
  },
  {
    "id": "DATA-008",
    "cluster": "reliable-data-integrations",
    "subcluster": "synchronization",
    "workingTitle": "Webhooks, Polling, or Both? A Recovery-First Integration Design",
    "evidencePlan": "decision and failure matrix",
    "stage": "draft",
    "slug": "webhooks-polling-or-both-a-recovery-first-integration-design",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://docs.stripe.com/webhooks",
      "https://docs.stripe.com/webhooks/process-undelivered-events",
      "https://docs.github.com/en/webhooks/using-webhooks/best-practices-for-using-webhooks"
    ]
  },
  {
    "id": "DATA-009",
    "cluster": "reliable-data-integrations",
    "subcluster": "synchronization",
    "workingTitle": "How to Combine Full Snapshots and Incremental Deltas Safely",
    "evidencePlan": "state-machine walkthrough",
    "stage": "draft",
    "slug": "how-to-combine-full-snapshots-and-incremental-deltas-safely",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://kubernetes.io/docs/reference/using-api/api-concepts/",
      "https://debezium.io/documentation/reference/stable/connectors/postgresql.html",
      "https://debezium.io/blog/2021/10/07/incremental-snapshots/"
    ]
  },
  {
    "id": "DATA-010",
    "cluster": "reliable-data-integrations",
    "subcluster": "synchronization",
    "workingTitle": "Running a Backfill Without Racing the Live Data Stream",
    "evidencePlan": "dual-read timeline",
    "stage": "draft",
    "slug": "running-a-backfill-without-racing-the-live-data-stream",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://debezium.io/documentation/reference/stable/connectors/postgresql.html",
      "https://debezium.io/blog/2021/10/07/incremental-snapshots/"
    ]
  },
  {
    "id": "DATA-011",
    "cluster": "reliable-data-integrations",
    "subcluster": "synchronization",
    "workingTitle": "What Happens When API Data Changes While You Paginate",
    "evidencePlan": "mutation simulation",
    "stage": "draft",
    "slug": "what-happens-when-api-data-changes-while-you-paginate",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://kubernetes.io/docs/reference/using-api/api-concepts/",
      "https://developer.zendesk.com/documentation/api-basics/pagination/understanding-the-limitations-of-offset-pagination/",
      "https://www.palantir.com/docs/foundry/api/general/overview/paging"
    ]
  },
  {
    "id": "DATA-012",
    "cluster": "reliable-data-integrations",
    "subcluster": "synchronization",
    "workingTitle": "Adaptive Concurrency for APIs With Changing Rate Limits",
    "evidencePlan": "controller benchmark",
    "stage": "draft",
    "slug": "adaptive-concurrency-for-apis-with-changing-rate-limits",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://docs.aws.amazon.com/sdkref/latest/guide/feature-retry-behavior.html",
      "https://docs.aws.amazon.com/sdk-for-java/latest/developer-guide/retry-strategy.html",
      "https://docs.stripe.com/rate-limits",
      "https://www.rfc-editor.org/rfc/rfc9110.html#name-retry-after"
    ]
  },
  {
    "id": "DATA-013",
    "cluster": "reliable-data-integrations",
    "subcluster": "synchronization",
    "workingTitle": "Retries That Respect Retry-After, Deadlines, and a Retry Budget",
    "evidencePlan": "retry policy simulator",
    "stage": "draft",
    "slug": "retries-that-respect-retry-after-deadlines-and-a-retry-budget",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://www.rfc-editor.org/rfc/rfc9110.html#name-retry-after",
      "https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/",
      "https://docs.aws.amazon.com/sdkref/latest/guide/feature-retry-behavior.html"
    ]
  },
  {
    "id": "DATA-014",
    "cluster": "reliable-data-integrations",
    "subcluster": "synchronization",
    "workingTitle": "Preventing an OAuth Token Refresh Stampede",
    "evidencePlan": "concurrent refresh implementation",
    "stage": "draft",
    "slug": "preventing-an-oauth-token-refresh-stampede",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://www.rfc-editor.org/rfc/rfc6749.html#section-6",
      "https://www.rfc-editor.org/rfc/rfc9700.html"
    ]
  },
  {
    "id": "DATA-015",
    "cluster": "reliable-data-integrations",
    "subcluster": "synchronization",
    "workingTitle": "Webhook Signatures Need Replay Protection Too",
    "evidencePlan": "verification middleware and tests",
    "stage": "draft",
    "slug": "webhook-signatures-need-replay-protection-too",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://docs.stripe.com/webhooks?lang=node#preventing-replay-attacks",
      "https://docs.github.com/en/webhooks/testing-and-troubleshooting-webhooks/troubleshooting-webhooks"
    ]
  },
  {
    "id": "DATA-016",
    "cluster": "reliable-data-integrations",
    "subcluster": "synchronization",
    "workingTitle": "Provider Adapters Should Translate Behaviour, Not Only JSON",
    "evidencePlan": "adapter contract tests",
    "stage": "draft",
    "slug": "provider-adapters-should-translate-behaviour-not-only-json",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://learn.microsoft.com/en-us/azure/architecture/patterns/anti-corruption-layer",
      "https://docs.stripe.com/rate-limits",
      "https://developers.google.com/workspace/calendar/api/guides/sync"
    ]
  },
  {
    "id": "DATA-017",
    "cluster": "reliable-data-integrations",
    "subcluster": "synchronization",
    "workingTitle": "When a Canonical Model Loses Provider-Specific Meaning",
    "evidencePlan": "lossiness ledger",
    "stage": "draft",
    "slug": "when-a-canonical-model-loses-provider-specific-meaning",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://learn.microsoft.com/en-us/azure/architecture/patterns/anti-corruption-layer",
      "https://martinfowler.com/bliki/CanonicalDataModel.html"
    ]
  },
  {
    "id": "DATA-018",
    "cluster": "reliable-data-integrations",
    "subcluster": "synchronization",
    "workingTitle": "Conflict Resolution for Bidirectional Sync Beyond Last-Write-Wins",
    "evidencePlan": "policy comparison",
    "stage": "draft",
    "slug": "conflict-resolution-for-bidirectional-sync-beyond-last-write-wins",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://perso.lip6.fr/Marc.Shapiro/papers/2011/CRDTs_SSS-2011.pdf",
      "https://learn.microsoft.com/en-us/azure/architecture/patterns/compensating-transaction"
    ]
  },
  {
    "id": "DATA-019",
    "cluster": "reliable-data-integrations",
    "subcluster": "synchronization",
    "workingTitle": "Tombstones: How to Delete Data Across Systems",
    "evidencePlan": "deletion timeline",
    "stage": "upgrade",
    "slug": "tombstones-deleting-across-systems",
    "validation": "pending",
    "publishDecision": "hold"
  },
  {
    "id": "DATA-020",
    "cluster": "reliable-data-integrations",
    "subcluster": "synchronization",
    "workingTitle": "Why updated_at Is a Dangerous Synchronization Cursor",
    "evidencePlan": "clock-skew simulation",
    "stage": "draft",
    "slug": "why-updated-at-is-a-dangerous-synchronization-cursor",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://www.postgresql.org/docs/current/functions-datetime.html",
      "https://debezium.io/documentation/reference/stable/connectors/postgresql.html"
    ]
  },
  {
    "id": "DATA-021",
    "cluster": "reliable-data-integrations",
    "subcluster": "synchronization",
    "workingTitle": "High-Water Marks, Overlap Windows, and the Records Between Them",
    "evidencePlan": "window algorithm",
    "stage": "draft",
    "slug": "high-water-marks-overlap-windows-and-the-records-between-them",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://beam.apache.org/documentation/basics/",
      "https://docs.cloud.google.com/dataflow/docs/concepts/streaming-pipelines"
    ]
  },
  {
    "id": "DATA-022",
    "cluster": "reliable-data-integrations",
    "subcluster": "synchronization",
    "workingTitle": "Late-Arriving Records Without Rewinding the Whole Pipeline",
    "evidencePlan": "event-time examples",
    "stage": "draft",
    "slug": "late-arriving-records-without-rewinding-the-whole-pipeline",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://beam.apache.org/documentation/basics/",
      "https://docs.cloud.google.com/dataflow/docs/concepts/streaming-pipelines"
    ]
  },
  {
    "id": "DATA-023",
    "cluster": "reliable-data-integrations",
    "subcluster": "synchronization",
    "workingTitle": "Fair Scheduling for Multi-Tenant Integration Workers",
    "evidencePlan": "queue fairness benchmark",
    "stage": "brief",
    "slug": "fair-scheduling-for-multi-tenant-integration-workers",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://builder.aws.com/content/3Eupj3d2bo4fEvlzYbICMZNhQ3B/fairness-in-multi-tenant-systems",
      "https://docs.aws.amazon.com/wellarchitected/latest/saas-lens/foundations.html"
    ]
  },
  {
    "id": "DATA-024",
    "cluster": "reliable-data-integrations",
    "subcluster": "synchronization",
    "workingTitle": "When to Advance a Sync Checkpoint After Partial Success",
    "evidencePlan": "commit protocol comparison",
    "stage": "brief",
    "slug": "when-to-advance-a-sync-checkpoint-after-partial-success",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://kafka.apache.org/41/javadoc/org/apache/kafka/clients/consumer/KafkaConsumer.html",
      "https://nightlies.apache.org/flink/flink-docs-stable/docs/learn-flink/fault_tolerance/"
    ]
  },
  {
    "id": "DATA-025",
    "cluster": "reliable-data-integrations",
    "subcluster": "synchronization",
    "workingTitle": "Testing an API Integration Against Time, Retries, and Bad Pages",
    "evidencePlan": "fake-provider harness",
    "stage": "brief",
    "slug": "testing-an-api-integration-against-time-retries-and-bad-pages",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://learn.microsoft.com/en-us/azure/architecture/best-practices/transient-faults",
      "https://learn.microsoft.com/en-us/azure/architecture/patterns/retry",
      "https://www.rfc-editor.org/rfc/rfc9110#section-9.2.2"
    ]
  },
  {
    "id": "DATA-026",
    "cluster": "reliable-data-integrations",
    "subcluster": "synchronization",
    "workingTitle": "Contract Tests That Detect Provider Drift Before Production",
    "evidencePlan": "schema fixture suite",
    "stage": "brief",
    "slug": "contract-tests-that-detect-provider-drift-before-production",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://spec.openapis.org/oas/latest.html",
      "https://docs.pact.io/",
      "https://learn.microsoft.com/en-us/azure/architecture/patterns/anti-corruption-layer"
    ]
  },
  {
    "id": "DATA-027",
    "cluster": "reliable-data-integrations",
    "subcluster": "synchronization",
    "workingTitle": "Sharing One Provider Quota Across Many Customers",
    "evidencePlan": "token bucket simulation",
    "stage": "brief",
    "slug": "sharing-one-provider-quota-across-many-customers",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://docs.stripe.com/rate-limits",
      "https://builder.aws.com/content/3Eupj3d2bo4fEvlzYbICMZNhQ3B/fairness-in-multi-tenant-systems",
      "https://www.rfc-editor.org/rfc/rfc6585#section-4"
    ]
  },
  {
    "id": "DATA-028",
    "cluster": "reliable-data-integrations",
    "subcluster": "synchronization",
    "workingTitle": "Choosing a Batch Size When an API Can Fail Half the Batch",
    "evidencePlan": "throughput-failure benchmark",
    "stage": "brief",
    "slug": "choosing-a-batch-size-when-an-api-can-fail-half-the-batch",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://learn.microsoft.com/en-us/azure/architecture/patterns/retry",
      "https://learn.microsoft.com/en-us/azure/architecture/antipatterns/retry-storm/",
      "https://learn.microsoft.com/en-us/azure/architecture/best-practices/transient-faults"
    ]
  },
  {
    "id": "DATA-029",
    "cluster": "reliable-data-integrations",
    "subcluster": "synchronization",
    "workingTitle": "Resuming a Paginated Import After Page 417 Fails",
    "evidencePlan": "resume token design",
    "stage": "brief",
    "slug": "resuming-a-paginated-import-after-page-417-fails",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://docs.stripe.com/api/pagination",
      "https://learn.microsoft.com/en-us/azure/data-api-builder/keywords/after-rest",
      "https://learn.microsoft.com/en-us/rest/api/storageservices/query-timeout-and-pagination"
    ]
  },
  {
    "id": "DATA-030",
    "cluster": "reliable-data-integrations",
    "subcluster": "synchronization",
    "workingTitle": "Reliable File Imports Over SFTP Without Exactly-Once Delivery",
    "evidencePlan": "atomic pickup protocol",
    "stage": "brief",
    "slug": "reliable-file-imports-over-sftp-without-exactly-once-delivery",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://datatracker.ietf.org/doc/html/draft-ietf-secsh-filexfer-12#section-8.3",
      "https://datatracker.ietf.org/doc/html/draft-ietf-secsh-filexfer-13"
    ]
  },
  {
    "id": "DATA-031",
    "cluster": "reliable-data-integrations",
    "subcluster": "events-delivery",
    "workingTitle": "Why Exactly-Once Delivery Is a System Property, Not a Broker Setting",
    "evidencePlan": "failure timeline",
    "stage": "upgrade",
    "slug": "exactly-once-delivery-myth",
    "validation": "pending",
    "publishDecision": "hold"
  },
  {
    "id": "DATA-032",
    "cluster": "reliable-data-integrations",
    "subcluster": "events-delivery",
    "workingTitle": "What an Idempotency Key Must Remember",
    "evidencePlan": "storage implementation",
    "stage": "upgrade",
    "slug": "idempotency-key",
    "validation": "pending",
    "publishDecision": "hold"
  },
  {
    "id": "DATA-033",
    "cluster": "reliable-data-integrations",
    "subcluster": "events-delivery",
    "workingTitle": "Last-Write-Wins Is a Data-Loss Policy",
    "evidencePlan": "conflict counterexamples",
    "stage": "upgrade",
    "slug": "last-write-wins",
    "validation": "pending",
    "publishDecision": "hold"
  },
  {
    "id": "DATA-034",
    "cluster": "reliable-data-integrations",
    "subcluster": "events-delivery",
    "workingTitle": "The Outbox Pattern: Commit Data and Events Without Lying",
    "evidencePlan": "reference implementation",
    "stage": "upgrade",
    "slug": "outbox-pattern",
    "validation": "pending",
    "publishDecision": "hold"
  },
  {
    "id": "DATA-035",
    "cluster": "reliable-data-integrations",
    "subcluster": "events-delivery",
    "workingTitle": "Pub/Sub vs Message Queues: Delivery Semantics Before Product Names",
    "evidencePlan": "semantic comparison",
    "stage": "upgrade",
    "slug": "pub-sub-vs-message-queues",
    "validation": "pending",
    "publishDecision": "hold"
  },
  {
    "id": "DATA-036",
    "cluster": "reliable-data-integrations",
    "subcluster": "events-delivery",
    "workingTitle": "Kafka or RabbitMQ? Choose From the Recovery Model",
    "evidencePlan": "decision framework",
    "stage": "upgrade",
    "slug": "kafka-vs-rabbitmq",
    "validation": "pending",
    "publishDecision": "hold"
  },
  {
    "id": "DATA-037",
    "cluster": "reliable-data-integrations",
    "subcluster": "events-delivery",
    "workingTitle": "The Four Mechanisms That Make Kafka Fast",
    "evidencePlan": "disk and network benchmark",
    "stage": "upgrade",
    "slug": "why-kafka-is-fast",
    "validation": "pending",
    "publishDecision": "hold"
  },
  {
    "id": "DATA-038",
    "cluster": "reliable-data-integrations",
    "subcluster": "events-delivery",
    "workingTitle": "Designing a Control Plane That Can Recover From Partial Truth",
    "evidencePlan": "state-machine design",
    "stage": "upgrade",
    "slug": "design-control-plane-distributed-database",
    "validation": "pending",
    "publishDecision": "hold"
  },
  {
    "id": "DATA-039",
    "cluster": "reliable-data-integrations",
    "subcluster": "events-delivery",
    "workingTitle": "Sliding Windows: State, Watermarks, and Concurrent Updates",
    "evidencePlan": "reference processor",
    "stage": "upgrade",
    "slug": "sliding-window-system-design",
    "validation": "pending",
    "publishDecision": "hold"
  },
  {
    "id": "DATA-040",
    "cluster": "reliable-data-integrations",
    "subcluster": "events-delivery",
    "workingTitle": "The Inbox Pattern: Deduplicate Before Business Logic Runs",
    "evidencePlan": "database implementation",
    "stage": "brief",
    "slug": "the-inbox-pattern-deduplicate-before-business-logic-runs",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://www.postgresql.org/docs/18/sql-insert.html",
      "https://kafka.apache.org/documentation/#intro_concepts_and_terms",
      "https://learn.microsoft.com/en-us/azure/architecture/patterns/competing-consumers"
    ]
  },
  {
    "id": "DATA-041",
    "cluster": "reliable-data-integrations",
    "subcluster": "events-delivery",
    "workingTitle": "How Long Must a Consumer Remember Duplicate Messages?",
    "evidencePlan": "retention calculation",
    "stage": "brief",
    "slug": "how-long-must-a-consumer-remember-duplicate-messages",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://kafka.apache.org/documentation/#intro_concepts_and_terms",
      "https://docs.aws.amazon.com/lambda/latest/dg/concepts-application-design.html",
      "https://docs.aws.amazon.com/lambda/latest/dg/durable-execution-idempotency.html"
    ]
  },
  {
    "id": "DATA-042",
    "cluster": "reliable-data-integrations",
    "subcluster": "events-delivery",
    "workingTitle": "Ordering Exists Inside a Boundary: Choosing an Event Partition Key",
    "evidencePlan": "partition simulation",
    "stage": "brief",
    "slug": "ordering-exists-inside-a-boundary-choosing-an-event-partition-key",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://kafka.apache.org/41/javadoc/org/apache/kafka/clients/producer/KafkaProducer.html",
      "https://kafka.apache.org/documentation/#intro_concepts_and_terms"
    ]
  },
  {
    "id": "DATA-043",
    "cluster": "reliable-data-integrations",
    "subcluster": "events-delivery",
    "workingTitle": "A Dead-Letter Queue Is Evidence, Not a Disposal Bin",
    "evidencePlan": "operational workflow",
    "stage": "brief",
    "slug": "a-dead-letter-queue-is-evidence-not-a-disposal-bin",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html",
      "https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-configure-dead-letter-queue-redrive.html"
    ]
  },
  {
    "id": "DATA-044",
    "cluster": "reliable-data-integrations",
    "subcluster": "events-delivery",
    "workingTitle": "Retry Topics Change Ordering: Decide Whether That Is Acceptable",
    "evidencePlan": "sequence trace",
    "stage": "brief",
    "slug": "retry-topics-change-ordering-decide-whether-that-is-acceptable",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://docs.spring.io/spring-kafka/reference/retrytopic/how-the-pattern-works.html",
      "https://kafka.apache.org/41/javadoc/org/apache/kafka/clients/producer/KafkaProducer.html"
    ]
  },
  {
    "id": "DATA-045",
    "cluster": "reliable-data-integrations",
    "subcluster": "events-delivery",
    "workingTitle": "Where a Transaction Ends in a Message Consumer",
    "evidencePlan": "crash-point matrix",
    "stage": "brief",
    "slug": "where-a-transaction-ends-in-a-message-consumer",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://kafka.apache.org/41/javadoc/org/apache/kafka/clients/producer/KafkaProducer.html",
      "https://microservices.io/patterns/data/transactional-outbox.html"
    ]
  },
  {
    "id": "DATA-046",
    "cluster": "reliable-data-integrations",
    "subcluster": "events-delivery",
    "workingTitle": "Compensation Is a Business Operation, Not a Database Rollback",
    "evidencePlan": "saga state machine",
    "stage": "brief",
    "slug": "compensation-is-a-business-operation-not-a-database-rollback",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://learn.microsoft.com/en-us/azure/architecture/patterns/compensating-transaction",
      "https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/saga.html"
    ]
  },
  {
    "id": "DATA-047",
    "cluster": "reliable-data-integrations",
    "subcluster": "events-delivery",
    "workingTitle": "The CDC Snapshot-to-Stream Handoff Without a Missing-Event Gap",
    "evidencePlan": "offset timeline",
    "stage": "brief",
    "slug": "the-cdc-snapshot-to-stream-handoff-without-a-missing-event-gap",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://www.postgresql.org/docs/current/logicaldecoding-explanation.html",
      "https://debezium.io/documentation/reference/stable/connectors/postgresql.html#postgresql-snapshots"
    ]
  },
  {
    "id": "DATA-048",
    "cluster": "reliable-data-integrations",
    "subcluster": "events-delivery",
    "workingTitle": "Backward, Forward, and Full Compatibility With Concrete Events",
    "evidencePlan": "consumer-version matrix",
    "stage": "brief",
    "slug": "backward-forward-and-full-compatibility-with-concrete-events",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://avro.apache.org/docs/current/specification/#schema-resolution",
      "https://docs.confluent.io/platform/current/schema-registry/fundamentals/schema-evolution.html"
    ]
  },
  {
    "id": "DATA-049",
    "cluster": "reliable-data-integrations",
    "subcluster": "events-delivery",
    "workingTitle": "What a Consumer Rebalance Can Interrupt",
    "evidencePlan": "rebalance experiment",
    "stage": "brief",
    "slug": "what-a-consumer-rebalance-can-interrupt",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://kafka.apache.org/41/javadoc/org/apache/kafka/clients/consumer/KafkaConsumer.html",
      "https://kafka.apache.org/41/javadoc/org/apache/kafka/clients/consumer/ConsumerRebalanceListener.html"
    ]
  },
  {
    "id": "DATA-050",
    "cluster": "reliable-data-integrations",
    "subcluster": "events-delivery",
    "workingTitle": "Where Backpressure Goes When a Stream Processor Cannot Keep Up",
    "evidencePlan": "queue growth model",
    "stage": "brief",
    "slug": "where-backpressure-goes-when-a-stream-processor-cannot-keep-up",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://github.com/reactive-streams/reactive-streams-jvm",
      "https://kafka.apache.org/41/javadoc/org/apache/kafka/clients/consumer/KafkaConsumer.html"
    ]
  },
  {
    "id": "DATA-051",
    "cluster": "reliable-data-integrations",
    "subcluster": "events-delivery",
    "workingTitle": "Replaying Events Without Re-Sending Emails or Charging Cards",
    "evidencePlan": "effect ledger implementation",
    "stage": "brief",
    "slug": "replaying-events-without-re-sending-emails-or-charging-cards",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing",
      "https://docs.aws.amazon.com/lambda/latest/dg/concepts-application-design.html"
    ]
  },
  {
    "id": "DATA-052",
    "cluster": "reliable-data-integrations",
    "subcluster": "events-delivery",
    "workingTitle": "Why a Webhook Receiver Cannot Promise Exactly Once",
    "evidencePlan": "failure proof",
    "stage": "brief",
    "slug": "why-a-webhook-receiver-cannot-promise-exactly-once",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://docs.stripe.com/webhooks#handle-duplicate-events",
      "https://docs.github.com/en/webhooks/using-webhooks/best-practices-for-using-webhooks"
    ]
  },
  {
    "id": "DATA-053",
    "cluster": "reliable-data-integrations",
    "subcluster": "events-delivery",
    "workingTitle": "Acknowledge Before or After Processing? Enumerate the Crash Points",
    "evidencePlan": "delivery matrix",
    "stage": "brief",
    "slug": "acknowledge-before-or-after-processing-enumerate-the-crash-points",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://www.rabbitmq.com/docs/confirms",
      "https://kafka.apache.org/41/javadoc/org/apache/kafka/clients/consumer/KafkaConsumer.html"
    ]
  },
  {
    "id": "DATA-054",
    "cluster": "reliable-data-integrations",
    "subcluster": "events-delivery",
    "workingTitle": "Event Time, Processing Time, and Watermarks With Late Data",
    "evidencePlan": "timeline simulator",
    "stage": "brief",
    "slug": "event-time-processing-time-and-watermarks-with-late-data",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://nightlies.apache.org/flink/flink-docs-stable/docs/concepts/time/",
      "https://beam.apache.org/documentation/programming-guide/#watermarks-and-late-data"
    ]
  },
  {
    "id": "DATA-055",
    "cluster": "reliable-data-integrations",
    "subcluster": "events-delivery",
    "workingTitle": "When Sequence Numbers Fail and Version Vectors Become Useful",
    "evidencePlan": "concurrent update demo",
    "stage": "brief",
    "slug": "when-sequence-numbers-fail-and-version-vectors-become-useful",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf",
      "https://docs.riak.com/riak/kv/latest/learn/concepts/causal-context/index.html"
    ]
  },
  {
    "id": "DATA-056",
    "cluster": "reliable-data-integrations",
    "subcluster": "schema-semantics",
    "workingTitle": "An Ontology Is an Executable Data Contract, Not a Diagram",
    "evidencePlan": "synthetic domain model",
    "stage": "draft",
    "slug": "ontology-product-contract",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://www.w3.org/TR/shacl12-core/",
      "https://www.w3.org/TR/owl2-overview/"
    ]
  },
  {
    "id": "DATA-057",
    "cluster": "reliable-data-integrations",
    "subcluster": "schema-semantics",
    "workingTitle": "Centralizing API IDLs Without Creating Upgrade Gridlock",
    "evidencePlan": "dependency graph",
    "stage": "upgrade",
    "slug": "centralized-idl-api-versioning",
    "validation": "pending",
    "publishDecision": "hold"
  },
  {
    "id": "DATA-058",
    "cluster": "reliable-data-integrations",
    "subcluster": "schema-semantics",
    "workingTitle": "gRPC From the Ground Up: From HTTP/2 Frame to Protobuf Field",
    "evidencePlan": "wire capture",
    "stage": "upgrade",
    "slug": "grpc-from-the-ground-up",
    "validation": "pending",
    "publishDecision": "hold"
  },
  {
    "id": "DATA-059",
    "cluster": "reliable-data-integrations",
    "subcluster": "schema-semantics",
    "workingTitle": "What Schema Registry Compatibility Modes Actually Protect",
    "evidencePlan": "producer-consumer matrix",
    "stage": "brief",
    "slug": "what-schema-registry-compatibility-modes-actually-protect",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://docs.confluent.io/platform/current/schema-registry/fundamentals/schema-evolution.html",
      "https://docs.confluent.io/platform/current/schema-registry/fundamentals/schema-evolution.html#compatibility-types"
    ]
  },
  {
    "id": "DATA-060",
    "cluster": "reliable-data-integrations",
    "subcluster": "schema-semantics",
    "workingTitle": "An Added Field Can Still Be a Breaking Change",
    "evidencePlan": "realistic compatibility cases",
    "stage": "brief",
    "slug": "an-added-field-can-still-be-a-breaking-change",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://serde.rs/container-attrs.html#deny_unknown_fields",
      "https://json-schema.org/understanding-json-schema/reference/object#additional-properties"
    ]
  },
  {
    "id": "DATA-061",
    "cluster": "reliable-data-integrations",
    "subcluster": "schema-semantics",
    "workingTitle": "Unknown Fields Are the Quiet Engine of Protobuf Evolution",
    "evidencePlan": "round-trip experiment",
    "stage": "brief",
    "slug": "unknown-fields-are-the-quiet-engine-of-protobuf-evolution",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://protobuf.dev/programming-guides/proto3/#unknowns",
      "https://protobuf.dev/programming-guides/proto3/#updating"
    ]
  },
  {
    "id": "DATA-062",
    "cluster": "reliable-data-integrations",
    "subcluster": "schema-semantics",
    "workingTitle": "A Canonical ID Is an Internal Promise, Not a Provider ID",
    "evidencePlan": "identity schema",
    "stage": "brief",
    "slug": "a-canonical-id-is-an-internal-promise-not-a-provider-id",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://www.w3.org/TR/dwbp/#dataIdentifiers",
      "https://www.w3.org/TR/prov-o/"
    ]
  },
  {
    "id": "DATA-063",
    "cluster": "reliable-data-integrations",
    "subcluster": "schema-semantics",
    "workingTitle": "Entity Resolution Before Machine Learning: Exact, Normalized, and Reviewed Matches",
    "evidencePlan": "matching pipeline",
    "stage": "brief",
    "slug": "entity-resolution-before-machine-learning-exact-normalized-and-reviewed-matches",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://www.ncbi.nlm.nih.gov/books/NBK253312/",
      "https://www.w3.org/TR/prov-o/"
    ]
  },
  {
    "id": "DATA-064",
    "cluster": "reliable-data-integrations",
    "subcluster": "schema-semantics",
    "workingTitle": "Why Semantic Versioning Does Not Describe Data Compatibility",
    "evidencePlan": "change taxonomy",
    "stage": "brief",
    "slug": "why-semantic-versioning-does-not-describe-data-compatibility",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://semver.org/",
      "https://protobuf.dev/programming-guides/proto3/#updating",
      "https://json-schema.org/draft/2020-12/json-schema-core"
    ]
  },
  {
    "id": "DATA-065",
    "cluster": "reliable-data-integrations",
    "subcluster": "schema-semantics",
    "workingTitle": "Null, Missing, Empty, and Default Are Four Different Data States",
    "evidencePlan": "cross-format matrix",
    "stage": "brief",
    "slug": "null-missing-empty-and-default-are-four-different-data-states",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://www.rfc-editor.org/rfc/rfc8259",
      "https://spec.graphql.org/September2025/#sec-Input-Objects",
      "https://protobuf.dev/programming-guides/field_presence/"
    ]
  },
  {
    "id": "DATA-066",
    "cluster": "reliable-data-integrations",
    "subcluster": "schema-semantics",
    "workingTitle": "Units, Currency, and Time Zones Belong in the Type or Contract",
    "evidencePlan": "failure examples",
    "stage": "brief",
    "slug": "units-currency-and-time-zones-belong-in-the-type-or-contract",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://ucum.org/ucum",
      "https://unicode.org/reports/tr35/tr35-numbers.html",
      "https://www.iana.org/time-zones/theory"
    ]
  },
  {
    "id": "DATA-067",
    "cluster": "reliable-data-integrations",
    "subcluster": "schema-semantics",
    "workingTitle": "How an Unknown Enum Value Breaks an Otherwise Compatible Consumer",
    "evidencePlan": "versioned consumer tests",
    "stage": "brief",
    "slug": "how-an-unknown-enum-value-breaks-an-otherwise-compatible-consumer",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://protobuf.dev/programming-guides/editions/#enum",
      "https://protobuf.dev/programming-guides/proto3/#enum",
      "https://json-schema.org/understanding-json-schema/reference/enum"
    ]
  },
  {
    "id": "DATA-068",
    "cluster": "reliable-data-integrations",
    "subcluster": "schema-semantics",
    "workingTitle": "Record-Level Provenance: Explain Where a Normalized Field Came From",
    "evidencePlan": "lineage schema",
    "stage": "brief",
    "slug": "record-level-provenance-explain-where-a-normalized-field-came-from",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://www.w3.org/TR/prov-o/",
      "https://openlineage.io/docs/spec/facets/job-facets/lineage/",
      "https://openlineage.io/docs/spec/object-model/"
    ]
  },
  {
    "id": "DATA-069",
    "cluster": "reliable-data-integrations",
    "subcluster": "schema-semantics",
    "workingTitle": "Valid Time and System Time: Two Histories a Data Product May Need",
    "evidencePlan": "bitemporal example",
    "stage": "brief",
    "slug": "valid-time-and-system-time-two-histories-a-data-product-may-need",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://mariadb.com/docs/server/reference/sql-structure/temporal-tables/bitemporal-tables",
      "https://mariadb.com/docs/server/reference/sql-structure/temporal-tables/system-versioned-tables",
      "https://mariadb.com/docs/server/reference/sql-structure/temporal-tables/application-time-periods"
    ]
  },
  {
    "id": "DATA-070",
    "cluster": "reliable-data-integrations",
    "subcluster": "schema-semantics",
    "workingTitle": "Validating a Knowledge Graph at Its Product Boundary",
    "evidencePlan": "shape constraints",
    "stage": "brief",
    "slug": "validating-a-knowledge-graph-at-its-product-boundary",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://www.w3.org/TR/shacl12-core/",
      "https://www.w3.org/TR/shacl/",
      "https://www.w3.org/TR/rdf12-concepts/"
    ]
  },
  {
    "id": "DATA-071",
    "cluster": "reliable-data-integrations",
    "subcluster": "schema-semantics",
    "workingTitle": "Migrating an Ontology Without Rewriting Reality in Place",
    "evidencePlan": "versioned migration plan",
    "stage": "brief",
    "slug": "migrating-an-ontology-without-rewriting-reality-in-place",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://www.w3.org/TR/owl2-syntax/#Ontology_IRI_and_Version_IRI",
      "https://www.w3.org/TR/shacl12-core/",
      "https://www.w3.org/TR/prov-o/"
    ]
  },
  {
    "id": "DATA-072",
    "cluster": "reliable-data-integrations",
    "subcluster": "schema-semantics",
    "workingTitle": "A Valid Schema Can Still Represent an Impossible Business State",
    "evidencePlan": "invariant layers",
    "stage": "brief",
    "slug": "a-valid-schema-can-still-represent-an-impossible-business-state",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://json-schema.org/draft/2020-12/json-schema-validation",
      "https://www.postgresql.org/docs/current/ddl-constraints.html",
      "https://www.postgresql.org/docs/current/rangetypes.html#RANGETYPES-CONSTRAINT"
    ]
  },
  {
    "id": "DATA-073",
    "cluster": "reliable-data-integrations",
    "subcluster": "schema-semantics",
    "workingTitle": "The Anti-Corruption Layer as an Integration Boundary You Can Test",
    "evidencePlan": "adapter architecture",
    "stage": "brief",
    "slug": "the-anti-corruption-layer-as-an-integration-boundary-you-can-test",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://learn.microsoft.com/en-us/azure/architecture/patterns/anti-corruption-layer",
      "https://martinfowler.com/bliki/BoundedContext.html"
    ]
  },
  {
    "id": "DATA-074",
    "cluster": "reliable-data-integrations",
    "subcluster": "schema-semantics",
    "workingTitle": "Version Translation: Where Old and New API Meaning Coexist",
    "evidencePlan": "translation matrix",
    "stage": "brief",
    "slug": "version-translation-where-old-and-new-api-meaning-coexist",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://google.aip.dev/185",
      "https://protobuf.dev/programming-guides/proto3/#updating",
      "https://spec.openapis.org/oas/latest.html"
    ]
  },
  {
    "id": "DATA-075",
    "cluster": "reliable-data-integrations",
    "subcluster": "schema-semantics",
    "workingTitle": "Who Owns a Data Contract When Producer and Consumer Disagree?",
    "evidencePlan": "decision framework",
    "stage": "brief",
    "slug": "who-owns-a-data-contract-when-producer-and-consumer-disagree",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://protobuf.dev/programming-guides/proto3/#updating",
      "https://docs.pact.io/",
      "https://spec.openapis.org/oas/latest.html"
    ]
  },
  {
    "id": "DATA-076",
    "cluster": "reliable-data-integrations",
    "subcluster": "recovery-operations",
    "workingTitle": "System Design Building Blocks as Failure and Recovery Choices",
    "evidencePlan": "reference map",
    "stage": "upgrade",
    "slug": "system-design-building-blocks",
    "validation": "pending",
    "publishDecision": "hold"
  },
  {
    "id": "DATA-077",
    "cluster": "reliable-data-integrations",
    "subcluster": "recovery-operations",
    "workingTitle": "Optimistic Locking: What the Version Number Proves",
    "evidencePlan": "concurrency tests",
    "stage": "upgrade",
    "slug": "optimistic-locking-version-number",
    "validation": "pending",
    "publishDecision": "hold"
  },
  {
    "id": "DATA-078",
    "cluster": "reliable-data-integrations",
    "subcluster": "recovery-operations",
    "workingTitle": "Cursor vs Offset Pagination Under Concurrent Writes",
    "evidencePlan": "mutation experiment",
    "stage": "upgrade",
    "slug": "cursor-vs-offset-pagination",
    "validation": "pending",
    "publishDecision": "hold"
  },
  {
    "id": "DATA-079",
    "cluster": "reliable-data-integrations",
    "subcluster": "recovery-operations",
    "workingTitle": "Real-Time Counters: Throughput, Ordering, and Repair",
    "evidencePlan": "counter service model",
    "stage": "upgrade",
    "slug": "real-time-tweet-stat-update-system",
    "validation": "pending",
    "publishDecision": "hold"
  },
  {
    "id": "DATA-080",
    "cluster": "reliable-data-integrations",
    "subcluster": "recovery-operations",
    "workingTitle": "Define the Recovery Point of a Data Pipeline Before It Fails",
    "evidencePlan": "RPO calculation worksheet",
    "stage": "brief",
    "slug": "define-the-recovery-point-of-a-data-pipeline-before-it-fails",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://csrc.nist.gov/pubs/sp/800/34/r1/upd1/final",
      "https://nightlies.apache.org/flink/flink-docs-stable/docs/ops/state/checkpoints/"
    ]
  },
  {
    "id": "DATA-081",
    "cluster": "reliable-data-integrations",
    "subcluster": "recovery-operations",
    "workingTitle": "Reconciliation Is the Repair Loop of a Distributed System",
    "evidencePlan": "reference reconciler",
    "stage": "brief",
    "slug": "reconciliation-is-the-repair-loop-of-a-distributed-system",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://kubernetes.io/docs/concepts/architecture/controller/",
      "https://kubernetes.io/docs/concepts/extend-kubernetes/api-extension/custom-resources/"
    ]
  },
  {
    "id": "DATA-082",
    "cluster": "reliable-data-integrations",
    "subcluster": "recovery-operations",
    "workingTitle": "A Repair Queue Needs Ownership, Evidence, and an Exit",
    "evidencePlan": "repair lifecycle",
    "stage": "brief",
    "slug": "a-repair-queue-needs-ownership-evidence-and-an-exit",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html",
      "https://kubernetes.io/docs/concepts/architecture/controller/"
    ]
  },
  {
    "id": "DATA-083",
    "cluster": "reliable-data-integrations",
    "subcluster": "recovery-operations",
    "workingTitle": "What to Record Before You Can Safely Replay Data",
    "evidencePlan": "replay manifest",
    "stage": "brief",
    "slug": "what-to-record-before-you-can-safely-replay-data",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://kafka.apache.org/documentation/#semantics",
      "https://cloudevents.io/"
    ]
  },
  {
    "id": "DATA-084",
    "cluster": "reliable-data-integrations",
    "subcluster": "recovery-operations",
    "workingTitle": "Trace One Record Across a Data Pipeline Without Logging Its Secrets",
    "evidencePlan": "correlation design",
    "stage": "brief",
    "slug": "trace-one-record-across-a-data-pipeline-without-logging-its-secrets",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://www.w3.org/TR/trace-context/",
      "https://opentelemetry.io/docs/concepts/context-propagation/",
      "https://opentelemetry.io/docs/concepts/signals/baggage/"
    ]
  },
  {
    "id": "DATA-085",
    "cluster": "reliable-data-integrations",
    "subcluster": "recovery-operations",
    "workingTitle": "An SLO for Data Freshness Is Not an HTTP Availability SLO",
    "evidencePlan": "SLI definitions",
    "stage": "brief",
    "slug": "an-slo-for-data-freshness-is-not-an-http-availability-slo",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://sre.google/workbook/implementing-slos/",
      "https://sre.google/sre-book/service-level-objectives/"
    ]
  },
  {
    "id": "DATA-086",
    "cluster": "reliable-data-integrations",
    "subcluster": "recovery-operations",
    "workingTitle": "What Your Product Does While a Critical Provider Is Down",
    "evidencePlan": "degradation decision table",
    "stage": "brief",
    "slug": "what-your-product-does-while-a-critical-provider-is-down",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://learn.microsoft.com/en-us/azure/architecture/patterns/circuit-breaker",
      "https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/rel_mitigate_interaction_failure_limit_retries.html"
    ]
  },
  {
    "id": "DATA-087",
    "cluster": "reliable-data-integrations",
    "subcluster": "recovery-operations",
    "workingTitle": "Detecting Data Drift When the JSON Schema Has Not Changed",
    "evidencePlan": "invariant monitor",
    "stage": "brief",
    "slug": "detecting-data-drift-when-the-json-schema-has-not-changed",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://json-schema.org/draft/2020-12/json-schema-validation",
      "https://openlineage.io/docs/spec/"
    ]
  },
  {
    "id": "DATA-088",
    "cluster": "reliable-data-integrations",
    "subcluster": "recovery-operations",
    "workingTitle": "Checksums for Fast Reconciliation Without Comparing Every Row",
    "evidencePlan": "bucketed checksum implementation",
    "stage": "brief",
    "slug": "checksums-for-fast-reconciliation-without-comparing-every-row",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://www.rfc-editor.org/rfc/rfc8785",
      "https://csrc.nist.gov/pubs/fips/180-4/upd1/final",
      "https://www.postgresql.org/docs/current/transaction-iso.html"
    ]
  },
  {
    "id": "DATA-089",
    "cluster": "reliable-data-integrations",
    "subcluster": "recovery-operations",
    "workingTitle": "A Runbook for a Synchronization Job That Has Stopped Moving",
    "evidencePlan": "diagnostic decision tree",
    "stage": "brief",
    "slug": "a-runbook-for-a-synchronization-job-that-has-stopped-moving",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://sre.google/sre-book/monitoring-distributed-systems/",
      "https://sre.google/workbook/alerting-on-slos/"
    ]
  },
  {
    "id": "DATA-090",
    "cluster": "reliable-data-integrations",
    "subcluster": "recovery-operations",
    "workingTitle": "Fault Injection for Integrations: Timeouts, Duplicates, Reordering, and Drift",
    "evidencePlan": "fault proxy harness",
    "stage": "brief",
    "slug": "fault-injection-for-integrations-timeouts-duplicates-reordering-and-drift",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://github.com/Shopify/toxiproxy",
      "https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/"
    ]
  }
];

export const aiOpportunities = [
  {
    "id": "AI-001",
    "cluster": "reliable-ai-systems",
    "subcluster": "evaluation",
    "workingTitle": "RAG, Agents, or a Deterministic Workflow? Start From the Failure Budget",
    "evidencePlan": "decision framework",
    "stage": "upgrade",
    "slug": "rag-vs-agents-vs-workflow-automation-startups",
    "validation": "pending",
    "publishDecision": "hold"
  },
  {
    "id": "AI-002",
    "cluster": "reliable-ai-systems",
    "subcluster": "evaluation",
    "workingTitle": "When You Do Not Need an AI Agent",
    "evidencePlan": "counterexample catalogue",
    "stage": "upgrade",
    "slug": "when-you-dont-need-an-ai-agent",
    "validation": "pending",
    "publishDecision": "hold"
  },
  {
    "id": "AI-003",
    "cluster": "reliable-ai-systems",
    "subcluster": "evaluation",
    "workingTitle": "Turn Production Traces Into an Evaluation Set Without Copying User Data",
    "evidencePlan": "sanitized dataset pipeline",
    "stage": "draft",
    "slug": "turn-production-traces-into-an-evaluation-set-without-copying-user-data",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents",
      "https://www.nist.gov/publications/de-identification-personal-information",
      "https://tsapps.nist.gov/publication/get_pdf.cfm?pub_id=957451"
    ]
  },
  {
    "id": "AI-004",
    "cluster": "reliable-ai-systems",
    "subcluster": "evaluation",
    "workingTitle": "Golden Tests for Non-Deterministic AI Outputs",
    "evidencePlan": "graded assertion library",
    "stage": "draft",
    "slug": "golden-tests-for-non-deterministic-ai-outputs",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents",
      "https://www.anthropic.com/engineering/AI-resistant-technical-evaluations"
    ]
  },
  {
    "id": "AI-005",
    "cluster": "reliable-ai-systems",
    "subcluster": "evaluation",
    "workingTitle": "Calibrating an LLM Judge Against Human Disagreement",
    "evidencePlan": "agreement experiment",
    "stage": "draft",
    "slug": "calibrating-an-llm-judge-against-human-disagreement",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://aclanthology.org/2023.emnlp-main.153/",
      "https://arxiv.org/abs/2406.07791",
      "https://research.google/pubs/judging-with-confidence-calibrating-autoraters-to-preference-distributions/",
      "https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents"
    ]
  },
  {
    "id": "AI-006",
    "cluster": "reliable-ai-systems",
    "subcluster": "evaluation",
    "workingTitle": "Evaluate Retrieval Separately From Answer Generation",
    "evidencePlan": "retrieval benchmark",
    "stage": "draft",
    "slug": "evaluate-retrieval-separately-from-answer-generation",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://nlp.stanford.edu/IR-book/html/htmledition/evaluation-of-ranked-retrieval-results-1.html",
      "https://arxiv.org/abs/2104.08663",
      "https://arxiv.org/abs/2405.07437"
    ]
  },
  {
    "id": "AI-007",
    "cluster": "reliable-ai-systems",
    "subcluster": "evaluation",
    "workingTitle": "The Final Answer Can Be Right While the Tool Trajectory Is Unsafe",
    "evidencePlan": "trajectory grader",
    "stage": "draft",
    "slug": "the-final-answer-can-be-right-while-the-tool-trajectory-is-unsafe",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents",
      "https://arxiv.org/abs/2510.02837"
    ]
  },
  {
    "id": "AI-008",
    "cluster": "reliable-ai-systems",
    "subcluster": "evaluation",
    "workingTitle": "Regression Testing Across Prompt and Model Changes",
    "evidencePlan": "versioned eval matrix",
    "stage": "draft",
    "slug": "regression-testing-across-prompt-and-model-changes",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents",
      "https://arxiv.org/abs/2311.11123"
    ]
  },
  {
    "id": "AI-009",
    "cluster": "reliable-ai-systems",
    "subcluster": "evaluation",
    "workingTitle": "Offline Evals Predict; Online Signals Correct",
    "evidencePlan": "measurement architecture",
    "stage": "draft",
    "slug": "offline-evals-predict-online-signals-correct",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents",
      "https://developers.google.com/machine-learning/guides/rules-of-ml/"
    ]
  },
  {
    "id": "AI-010",
    "cluster": "reliable-ai-systems",
    "subcluster": "evaluation",
    "workingTitle": "Sampling AI Outputs for Human Review Without Only Seeing Easy Cases",
    "evidencePlan": "risk-weighted sampler",
    "stage": "brief",
    "slug": "sampling-ai-outputs-for-human-review-without-only-seeing-easy-cases",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://airc.nist.gov/airmf-resources/airmf/5-sec-core/",
      "https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-generative-artificial-intelligence"
    ]
  },
  {
    "id": "AI-011",
    "cluster": "reliable-ai-systems",
    "subcluster": "evaluation",
    "workingTitle": "Red-Team the Workflow, Not Only the Prompt",
    "evidencePlan": "attack surface map",
    "stage": "brief",
    "slug": "red-team-the-workflow-not-only-the-prompt",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://genai.owasp.org/llmrisk/llm062025-excessive-agency/",
      "https://genai.owasp.org/llmrisk/llm052025-improper-output-handling/",
      "https://openai.com/index/advancing-red-teaming-with-people-and-ai/",
      "https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-generative-artificial-intelligence"
    ]
  },
  {
    "id": "AI-012",
    "cluster": "reliable-ai-systems",
    "subcluster": "evaluation",
    "workingTitle": "A Failure Taxonomy for AI Features That Teams Can Actually Measure",
    "evidencePlan": "label schema",
    "stage": "brief",
    "slug": "a-failure-taxonomy-for-ai-features-that-teams-can-actually-measure",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://airc.nist.gov/airmf-resources/airmf/5-sec-core/",
      "https://airc.nist.gov/airmf-resources/playbook/measure/",
      "https://developers.openai.com/api/docs/guides/evaluation-best-practices",
      "https://developers.google.com/machine-learning/crash-course/production-ml-systems/monitoring"
    ]
  },
  {
    "id": "AI-013",
    "cluster": "reliable-ai-systems",
    "subcluster": "tool-safety",
    "workingTitle": "How to Build a Secure Internal AI Tool",
    "evidencePlan": "threat model",
    "stage": "upgrade",
    "slug": "how-to-build-secure-internal-ai-tool",
    "validation": "pending",
    "publishDecision": "hold"
  },
  {
    "id": "AI-014",
    "cluster": "reliable-ai-systems",
    "subcluster": "tool-safety",
    "workingTitle": "Give Every Agent Tool Call a Deadline",
    "evidencePlan": "timeout implementation",
    "stage": "upgrade",
    "slug": "agent-tool-call-deadline",
    "validation": "pending",
    "publishDecision": "hold"
  },
  {
    "id": "AI-015",
    "cluster": "reliable-ai-systems",
    "subcluster": "tool-safety",
    "workingTitle": "MCP Is an Integration Boundary: Treat Tools as Untrusted Dependencies",
    "evidencePlan": "protocol threat model",
    "stage": "upgrade",
    "slug": "model-context-protocol-mcp",
    "validation": "pending",
    "publishDecision": "hold"
  },
  {
    "id": "AI-016",
    "cluster": "reliable-ai-systems",
    "subcluster": "tool-safety",
    "workingTitle": "Carry User Authorization Through Every AI Tool Call",
    "evidencePlan": "authorization reference flow",
    "stage": "draft",
    "slug": "carry-user-authorization-through-every-ai-tool-call",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization",
      "https://www.rfc-editor.org/rfc/rfc9700.html",
      "https://www.rfc-editor.org/rfc/rfc8693.html"
    ]
  },
  {
    "id": "AI-017",
    "cluster": "reliable-ai-systems",
    "subcluster": "tool-safety",
    "workingTitle": "Validate Model-Generated Tool Arguments at the Boundary",
    "evidencePlan": "typed validation harness",
    "stage": "brief",
    "slug": "validate-model-generated-tool-arguments-at-the-boundary",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://genai.owasp.org/llmrisk/llm052025-improper-output-handling/",
      "https://json-schema.org/understanding-json-schema/reference/object",
      "https://developers.openai.com/api/docs/guides/function-calling"
    ]
  },
  {
    "id": "AI-018",
    "cluster": "reliable-ai-systems",
    "subcluster": "tool-safety",
    "workingTitle": "Make Retried Agent Actions Idempotent Before Adding Autonomy",
    "evidencePlan": "effect ledger",
    "stage": "brief",
    "slug": "make-retried-agent-actions-idempotent-before-adding-autonomy",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/",
      "https://learn.microsoft.com/en-us/azure/architecture/patterns/retry",
      "https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_prevent_interaction_failure_idempotent.html"
    ]
  },
  {
    "id": "AI-019",
    "cluster": "reliable-ai-systems",
    "subcluster": "tool-safety",
    "workingTitle": "Approval Boundaries for Expensive, External, and Irreversible AI Actions",
    "evidencePlan": "risk classification",
    "stage": "brief",
    "slug": "approval-boundaries-for-expensive-external-and-irreversible-ai-actions",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html",
      "https://openai.github.io/openai-agents-python/human_in_the_loop/",
      "https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final"
    ]
  },
  {
    "id": "AI-020",
    "cluster": "reliable-ai-systems",
    "subcluster": "tool-safety",
    "workingTitle": "Sandboxing Model-Generated Code Is a Systems Problem",
    "evidencePlan": "isolation threat model",
    "stage": "brief",
    "slug": "sandboxing-model-generated-code-is-a-systems-problem",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://developers.cloudflare.com/sandbox/concepts/security/",
      "https://developers.cloudflare.com/sandbox/guides/outbound-traffic/",
      "https://developers.cloudflare.com/sandbox/concepts/sandboxes/"
    ]
  },
  {
    "id": "AI-021",
    "cluster": "reliable-ai-systems",
    "subcluster": "tool-safety",
    "workingTitle": "Prompt Injection Becomes Serious When the Model Has Tools",
    "evidencePlan": "attack and defense harness",
    "stage": "brief",
    "slug": "prompt-injection-becomes-serious-when-the-model-has-tools",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://genai.owasp.org/llmrisk/llm01-prompt-injection/",
      "https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html"
    ]
  },
  {
    "id": "AI-022",
    "cluster": "reliable-ai-systems",
    "subcluster": "tool-safety",
    "workingTitle": "Recovering an Agent Workflow After the Process Dies",
    "evidencePlan": "durable state machine",
    "stage": "brief",
    "slug": "recovering-an-agent-workflow-after-the-process-dies",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://developers.cloudflare.com/agents/api-reference/durable-execution/",
      "https://developers.cloudflare.com/agents/api-reference/run-workflows/",
      "https://developers.cloudflare.com/agents/api-reference/retries/"
    ]
  },
  {
    "id": "AI-023",
    "cluster": "reliable-ai-systems",
    "subcluster": "retrieval-data",
    "workingTitle": "Why AI Systems Still Depend on Ordinary Data Engineering",
    "evidencePlan": "system boundary model",
    "stage": "draft",
    "slug": "why-ai-systems-still-depend-on-ordinary-data-engineering",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://doi.org/10.1145/3644815.3644954",
      "https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents"
    ]
  },
  {
    "id": "AI-024",
    "cluster": "reliable-ai-systems",
    "subcluster": "retrieval-data",
    "workingTitle": "What RAG Adds—and the Data Problems It Does Not Solve",
    "evidencePlan": "end-to-end reference path",
    "stage": "upgrade",
    "slug": "what-is-rag-for-startups",
    "validation": "pending",
    "publishDecision": "hold"
  },
  {
    "id": "AI-025",
    "cluster": "reliable-ai-systems",
    "subcluster": "retrieval-data",
    "workingTitle": "Vector Search for Code: What an Embedding Forgets",
    "evidencePlan": "retrieval benchmark",
    "stage": "upgrade",
    "slug": "vector-embeddings-code-search",
    "validation": "pending",
    "publishDecision": "hold"
  },
  {
    "id": "AI-026",
    "cluster": "reliable-ai-systems",
    "subcluster": "retrieval-data",
    "workingTitle": "Chunk Documents by Meaning Before Tuning Chunk Size",
    "evidencePlan": "chunking comparison",
    "stage": "brief",
    "slug": "chunk-documents-by-meaning-before-tuning-chunk-size",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://learn.microsoft.com/en-us/azure/search/vector-search-how-to-chunk-documents",
      "https://learn.microsoft.com/en-us/azure/search/retrieval-augmented-generation-overview"
    ]
  },
  {
    "id": "AI-027",
    "cluster": "reliable-ai-systems",
    "subcluster": "retrieval-data",
    "workingTitle": "Hybrid Retrieval: When Keywords Rescue Embeddings",
    "evidencePlan": "BM25-vector benchmark",
    "stage": "brief",
    "slug": "hybrid-retrieval-when-keywords-rescue-embeddings",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://www.elastic.co/docs/reference/elasticsearch/rest-apis/reciprocal-rank-fusion",
      "https://docs.opensearch.org/latest/vector-search/ai-search/hybrid-search/index/"
    ]
  },
  {
    "id": "AI-028",
    "cluster": "reliable-ai-systems",
    "subcluster": "retrieval-data",
    "workingTitle": "Spend the Reranking Budget Where Candidate Quality Changes",
    "evidencePlan": "quality-latency curve",
    "stage": "brief",
    "slug": "spend-the-reranking-budget-where-candidate-quality-changes",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://www.elastic.co/guide/en/elasticsearch/reference/current/semantic-reranking.html",
      "https://docs.cohere.com/docs/reranking-best-practices"
    ]
  },
  {
    "id": "AI-029",
    "cluster": "reliable-ai-systems",
    "subcluster": "retrieval-data",
    "workingTitle": "A Retrieval Index Needs an Invalidation Strategy",
    "evidencePlan": "freshness state machine",
    "stage": "brief",
    "slug": "a-retrieval-index-needs-an-invalidation-strategy",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://www.elastic.co/docs/manage-data/data-store/index-basics",
      "https://www.elastic.co/guide/en/elasticsearch/reference/current/aliases.html",
      "https://learn.microsoft.com/en-us/azure/search/search-howto-reindex"
    ]
  },
  {
    "id": "AI-030",
    "cluster": "reliable-ai-systems",
    "subcluster": "retrieval-data",
    "workingTitle": "Filter Before Retrieval: Permissions Are Part of Relevance",
    "evidencePlan": "multi-user security tests",
    "stage": "brief",
    "slug": "filter-before-retrieval-permissions-are-part-of-relevance",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://learn.microsoft.com/en-us/azure/search/vector-search-filters",
      "https://learn.microsoft.com/en-us/azure/search/search-document-level-access-overview",
      "https://www.elastic.co/guide/en/elasticsearch/reference/current/document-level-security.html"
    ]
  },
  {
    "id": "AI-031",
    "cluster": "reliable-ai-systems",
    "subcluster": "retrieval-data",
    "workingTitle": "Citations Need Claim-Level Provenance, Not Decorative Links",
    "evidencePlan": "provenance representation",
    "stage": "brief",
    "slug": "citations-need-claim-level-provenance-not-decorative-links",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://www.w3.org/TR/prov-o/",
      "https://www.w3.org/TR/annotation-model/"
    ]
  },
  {
    "id": "AI-032",
    "cluster": "reliable-ai-systems",
    "subcluster": "retrieval-data",
    "workingTitle": "Tenant Isolation in Vector Search Beyond a Metadata Filter",
    "evidencePlan": "failure and threat matrix",
    "stage": "brief",
    "slug": "tenant-isolation-in-vector-search-beyond-a-metadata-filter",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://docs.weaviate.io/weaviate/manage-collections/multi-tenancy",
      "https://docs.weaviate.io/deploy/configuration/backups",
      "https://learn.microsoft.com/en-us/azure/search/search-document-level-access-overview"
    ]
  },
  {
    "id": "AI-033",
    "cluster": "reliable-ai-systems",
    "subcluster": "operations",
    "workingTitle": "The Review Ratchet: How AI Can Quietly Lower a Codebase's Standard",
    "evidencePlan": "review-control framework",
    "stage": "upgrade",
    "slug": "the-review-ratchet-how-ai-is-quietly-eating-your-codebase-from-the-inside",
    "validation": "pending",
    "publishDecision": "hold"
  },
  {
    "id": "AI-034",
    "cluster": "reliable-ai-systems",
    "subcluster": "operations",
    "workingTitle": "Trace an AI Workflow Across Retrieval, Models, and Tools",
    "evidencePlan": "OpenTelemetry trace model",
    "stage": "brief",
    "slug": "trace-an-ai-workflow-across-retrieval-models-and-tools",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://opentelemetry.io/docs/concepts/context-propagation/",
      "https://opentelemetry.io/docs/specs/semconv/gen-ai/",
      "https://www.w3.org/TR/trace-context/"
    ]
  },
  {
    "id": "AI-035",
    "cluster": "reliable-ai-systems",
    "subcluster": "operations",
    "workingTitle": "Give an AI Task a Cost Budget Before Optimizing Tokens",
    "evidencePlan": "cost accounting model",
    "stage": "brief",
    "slug": "give-an-ai-task-a-cost-budget-before-optimizing-tokens",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://developers.openai.com/api/docs/guides/rate-limits",
      "https://developers.openai.com/api/reference/resources/responses/methods/create",
      "https://opentelemetry.io/docs/specs/semconv/gen-ai/"
    ]
  },
  {
    "id": "AI-036",
    "cluster": "reliable-ai-systems",
    "subcluster": "operations",
    "workingTitle": "Caching AI Results Requires an Identity and Freshness Model",
    "evidencePlan": "cache-key matrix",
    "stage": "brief",
    "slug": "caching-ai-results-requires-an-identity-and-freshness-model",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://developers.openai.com/api/docs/guides/prompt-caching",
      "https://www.rfc-editor.org/rfc/rfc9111"
    ]
  },
  {
    "id": "AI-037",
    "cluster": "reliable-ai-systems",
    "subcluster": "operations",
    "workingTitle": "Streaming an AI Response Moves Latency; It Does Not Remove It",
    "evidencePlan": "end-to-end latency trace",
    "stage": "brief",
    "slug": "streaming-an-ai-response-moves-latency-it-does-not-remove-it",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://developers.openai.com/api/docs/guides/streaming-responses",
      "https://streams.spec.whatwg.org/"
    ]
  },
  {
    "id": "AI-038",
    "cluster": "reliable-ai-systems",
    "subcluster": "operations",
    "workingTitle": "Design the Non-AI Path Before the Model Is Unavailable",
    "evidencePlan": "degradation state machine",
    "stage": "brief",
    "slug": "design-the-non-ai-path-before-the-model-is-unavailable",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://www.nist.gov/itl/ai-risk-management-framework",
      "https://airc.nist.gov/airmf-resources/airmf/5-sec-core/"
    ]
  },
  {
    "id": "AI-039",
    "cluster": "reliable-ai-systems",
    "subcluster": "operations",
    "workingTitle": "Model Routing Is a Policy Engine With Quality Consequences",
    "evidencePlan": "routing evaluation",
    "stage": "brief",
    "slug": "model-routing-is-a-policy-engine-with-quality-consequences",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://developers.openai.com/api/docs/models",
      "https://developers.openai.com/api/docs/guides/evaluation-best-practices",
      "https://www.nist.gov/itl/ai-risk-management-framework"
    ]
  },
  {
    "id": "AI-040",
    "cluster": "reliable-ai-systems",
    "subcluster": "operations",
    "workingTitle": "Capacity Planning for AI Workloads With Provider Rate Limits",
    "evidencePlan": "queueing model",
    "stage": "brief",
    "slug": "capacity-planning-for-ai-workloads-with-provider-rate-limits",
    "validation": "validated",
    "publishDecision": "approved",
    "canonicalSources": [
      "https://developers.openai.com/api/docs/guides/rate-limits",
      "https://developers.openai.com/api/docs/guides/latency-optimization"
    ]
  }
];

export const authorityOpportunities = [...rustOpportunities, ...dataOpportunities, ...aiOpportunities];
