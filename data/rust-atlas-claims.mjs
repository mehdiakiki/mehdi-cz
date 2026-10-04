export const rustAtlasClaimStatuses = {
  verified: {
    label: "Executable check",
    description: "A deterministic fixture tests the claim against a pinned dependency.",
  },
  bounded: {
    label: "API or method bound",
    description:
      "The article states a documented constraint or a validation method, not a speed result.",
  },
  measurement: {
    label: "Measurement required",
    description:
      "The direction depends on machine and corpus, so the record defines a falsifier instead of inventing a universal result.",
  },
};

export const rustAtlasClaims = [
  {
    id: "RCL-001",
    articleSlug: "search-across-chunk-boundaries-rust-without-missing-matches",
    status: "verified",
    claim: "Changing reader chunk size must not change the ordered match IDs or absolute offsets.",
    falsifier: "Any read limit produces a different match tuple from one-shot search.",
    evidence: "chunk_partition_does_not_change_matches",
  },
  {
    id: "RCL-002",
    articleSlug: "why-aho-corasick-streaming-still-needs-buffer",
    status: "bounded",
    claim: "Compact recognition state does not remove bytes needed by a streaming output contract.",
    falsifier:
      "A replacement or delayed-match API can release unresolved bytes and still reproduce one-shot output for every split.",
    evidence: "Longest-match buffer bound plus split-point replacement oracle.",
  },
  {
    id: "RCL-003",
    articleSlug: "aho-corasick-match-kinds-standard-leftmost-rust",
    status: "verified",
    claim:
      "Standard, leftmost-first, and leftmost-longest select different valid results for one fixed input.",
    falsifier: "The pinned crate returns an identical tuple for all three configured match kinds.",
    evidence: "match_kinds_choose_different_documented_results",
  },
  {
    id: "RCL-004",
    articleSlug: "aho-corasick-dfa-or-nfa-rust",
    status: "verified",
    claim:
      "Automaton representation is a real observable build choice, not a synonym for Aho-Corasick.",
    falsifier: "Requesting a DFA does not produce a matcher reporting DFA kind.",
    evidence: "requested_dfa_kind_is_observable",
  },
  {
    id: "RCL-005",
    articleSlug: "why-more-patterns-can-slow-aho-corasick",
    status: "measurement",
    claim:
      "Linear input complexity does not imply constant per-byte time as the pattern corpus grows.",
    falsifier:
      "Nested pattern sets show invariant build cost, memory, selected strategy, and scan distributions across the declared workload matrix.",
    evidence:
      "Nested corpus benchmark with kind, memory, output count, and cache-sensitive inputs.",
  },
  {
    id: "RCL-006",
    articleSlug: "when-aho-corasick-prefilters-help-or-hurt",
    status: "measurement",
    claim: "Prefilter value changes with candidate density while logical output remains unchanged.",
    falsifier:
      "Enabled and disabled variants have indistinguishable distributions across both rare- and frequent-candidate corpora, or emit different outputs.",
    evidence: "prefilter_toggle_preserves_logical_output plus paired corpus benchmark.",
  },
  {
    id: "RCL-007",
    articleSlug: "pattern-shape-simd-search-performance-rust",
    status: "measurement",
    claim: "Pattern shape and haystack byte distribution predict more than pattern count alone.",
    falsifier:
      "Controlled corpora with equal counts but different rare bytes, prefixes, lengths, and alphabets show no material strategy or performance change.",
    evidence: "Five-corpus pattern-shape matrix with corpus hashes.",
  },
  {
    id: "RCL-008",
    articleSlug: "why-one-lookup-per-byte-can-be-latency-bound",
    status: "measurement",
    claim: "A loop-carried transition-state dependency can limit a small DFA loop.",
    falsifier:
      "Assembly and counters show no loop-carried address dependency or show another cost dominating the declared hot loop.",
    evidence: "Assembly inspection, cache-sized corpus variants, and hardware counters.",
  },
  {
    id: "RCL-009",
    articleSlug: "benchmark-streaming-scanner-rust",
    status: "bounded",
    claim:
      "A scanner comparison is valid only after output equivalence and workload symmetry are established.",
    falsifier:
      "Two variants with different matches or timed setup still answer the same stated benchmark question.",
    evidence: "Ordered match oracle, shared corpus hashes, and declared timed regions.",
  },
  {
    id: "RCL-010",
    articleSlug: "when-match-reporting-costs-more-than-search",
    status: "verified",
    claim: "A small prefix family can create more overlapping outputs than input bytes.",
    falsifier:
      "Searching four `a` bytes for `a`, `aa`, and `aaa` does not return nine overlapping matches.",
    evidence: "overlapping_prefix_family_has_nine_outputs",
  },
  {
    id: "RCL-011",
    articleSlug: "rust-bytes-are-not-text-utf8-scanners",
    status: "verified",
    claim:
      "An arbitrary byte pattern can match inside a valid UTF-8 scalar and yield a range unusable for string slicing.",
    falsifier: "The continuation-byte match begins at a valid `str` character boundary.",
    evidence: "arbitrary_byte_match_can_split_utf8_scalar",
  },
  {
    id: "RCL-012",
    articleSlug: "rust-bufread-slices-memory-mapping-copying",
    status: "bounded",
    claim:
      "Slices, buffered reads, and memory maps expose bytes through different ownership and materialization boundaries.",
    falsifier:
      "Tracing the declared boundary shows identical ownership, allocation, and source-lifetime behavior for all three inputs.",
    evidence: "Boundary trace plus cold and warm end-to-end I/O measurements.",
  },
  {
    id: "RCL-013",
    articleSlug: "reuse-compiled-aho-corasick-searchers-rust",
    status: "verified",
    claim:
      "One compiled matcher can be shared while independent searches keep local iterator state.",
    falsifier:
      "Scoped threads cannot borrow the matcher concurrently or their independent match counts interfere.",
    evidence: "compiled_matcher_is_shared_while_search_state_stays_local",
  },
  {
    id: "RCL-014",
    articleSlug: "test-streaming-algorithms-every-chunk-boundary",
    status: "verified",
    claim: "An oracle-and-partitions test can make chunk-boundary invariance executable.",
    falsifier:
      "A generated partition cannot be compared through the same ordered result representation.",
    evidence: "chunk_partition_does_not_change_matches",
  },
];

export function getRustAtlasClaim(articleSlug) {
  return rustAtlasClaims.find((claim) => claim.articleSlug === articleSlug);
}
