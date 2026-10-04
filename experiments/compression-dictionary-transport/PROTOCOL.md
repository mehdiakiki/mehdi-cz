# PERF-054 preregistered protocol

Date locked: 2026-09-14, before inspecting any dictionary-compression result.

## Question

Can one reusable raw dictionary for the `/blog/*` document family repay its own
transfer by the third hard navigation while preserving an unconditional Brotli
fallback and byte-exact decoding?

RSC and every non-document response are out of scope until HTML passes. No
production route, middleware, or Cloudflare zone setting may be changed by this
experiment.

## Fixed artifact and corpus

- Source build: `.next-perf050`.
- Eligible documents: direct `*.html` children of
  `.next-perf050/server/app/blog/`; nested pagination and tag pages are excluded.
- The harness must record a sorted path/size/SHA-256 manifest and refuse to
  compare results if a later run does not match that manifest.
- Evaluation set: the 24 eligible paths with the lexicographically smallest
  SHA-256 of their build-relative path. This chooses routes without looking at
  their contents or sizes.
- Fixed-dictionary training set: every eligible document outside those 24.
- Three-page same-family journey: evaluation routes at hash ranks 1, 2, and 3.
- Cross-family negative controls: the first three hash-ranked HTML documents
  below `.next-perf050/server/app/rust/failures/`. The `/blog/*` dictionary must
  not match these URLs.

## Arms

1. `br`: independent Brotli at quality 11, with no external dictionary.
2. `dcb-64`: Brotli quality 11 with a raw dictionary capped at 65,536 bytes.
3. `dcb-128`: Brotli quality 11 with a raw dictionary capped at 131,072 bytes.

Generate raw dictionaries with Google Brotli `dictionary_generator --sieve`
pinned to commit `09e1ac6c7eea9d3b53f85bcdde6347358dbe1281` and 16-byte slices.
The tool source and built executable hashes must be recorded. Encode and decode
with the installed Google Brotli 1.2.0 CLI. A DCB body is the RFC 9842 four-byte
magic `ff 44 43 42`, the 32-byte SHA-256 digest of the raw dictionary, and the
Shared Brotli stream produced with that dictionary. The 36-byte DCB header is
included in all transfer comparisons.

Run two distinct evaluations:

- Leave one out: for each of the 24 evaluation documents, generate each
  dictionary size from the other 23 evaluation documents, then compare that
  held-out document with `br`. This is the generalization screen.
- Fixed held-out dictionary: generate one dictionary of each size from the 253
  non-evaluation documents. Use it for all 24 evaluation documents and for the
  three-page journey. No evaluated bytes may enter this dictionary.

The dictionary resource itself is transferred as independent Brotli quality 11.
Its compressed payload is the acquisition cost. Response headers are reported
separately because shared and per-arm transport headers differ, but the byte gate
uses response-body bytes consistently.

## Artifact and protocol gates

Select the smaller qualifying fixed dictionary; use 64 KiB to break a tie. It
qualifies only if all of these hold:

- Median fixed-dictionary primed response is at least 40% smaller than `br`,
  including the 36-byte DCB header, with no individual response larger than its
  `br` fallback.
- `br(page 1) + br(dictionary) + dcb(page 2) + dcb(page 3)` is at least 25%
  smaller than `br(page 1) + br(page 2) + br(page 3)`.
- Dictionary acquisition is repaid no later than page three. Page one never
  receives credit for dictionary compression.
- Stripping and validating the DCB header, then decoding with the advertised
  raw dictionary, reproduces every source byte and SHA-256 exactly.
- The response router returns DCB only when both `Accept-Encoding: dcb` and the
  exact Structured Field `Available-Dictionary` hash are present. Missing,
  malformed, stale, unknown, and cross-family cases return ordinary `br` (or
  `gzip`/identity by normal negotiation).
- Every cacheable document variant includes
  `Vary: Accept-Encoding, Available-Dictionary`. The dictionary is HTTPS-only,
  same-origin, cacheable, and advertises
  `Use-As-Dictionary: match="/blog/*", match-dest=("document"), type=raw`.

Failure of an artifact or protocol gate ends the experiment before browser
timing. It is still a valid rejection and no Cloudflare configuration is made.

## Browser and edge eligibility

Only a qualifying dictionary advances to a Chromium 130+ HTTPS run. Run at least
20 matched repetitions for control and dictionary journeys with hard document
navigations, a warm browser dictionary cache after page one, Slow 4G network
emulation, and 4x CPU slowdown. Record response encodings and transfer sizes,
LCP, load-event time, CLS, and trace evidence for decode work.

The browser arm passes only if:

- the fixed byte gates above reproduce through actual browser negotiation;
- no route median LCP or load-event regression exceeds 32 ms or 5%;
- no response-decode-related task exceeds 10 ms;
- unsupported negotiation, a stale hash, a new dictionary/deployment hash, and
  browser-cache separation all fall back or re-acquire correctly; and
- the decoded DOM source is byte-identical to the fixed artifact.

A local HTTPS run may prove browser behavior, but it cannot establish Cloudflare
cache separation. The final edge claim requires a non-production HTTPS zone with
Cloudflare shared-dictionary passthrough enabled, response rewriting disabled or
`Cache-Control: no-transform`, and the same origin router. Enabling that beta
zone setting is an explicit external deployment step and is not authorized by
this protocol.

## Decision rule

Retain only a dictionary that passes artifact, protocol, browser, and real-edge
gates. Otherwise reject PERF-054, preserve ordinary Brotli, and make no
production application change. Report unavailable edge authority separately
from a technical failure; it cannot be counted as a pass.

## Pre-measurement amendment

The first draft named the generator's default `durchschlag` engine. Before any
dictionary was generated or compressed result inspected, tool discovery showed
that engine requires an additional `divsufsort` dependency absent from the fixed
machine, whereas the same official generator's `sieve` engine is self-contained.
This protocol therefore locks `--sieve` for every arm rather than introducing an
unpinned library. No outcome data informed the amendment.

The first generator invocation then showed that `--sieve` can overshoot its
documented target-size limit. This happened before the corresponding response
was compressed or any compression outcome was inspected. The harness therefore
records the uncapped size and, on an overshoot, retains only the first 65,536 or
131,072 bytes, respectively. Smaller generator output is retained and its actual
size is reported. This deterministic cap preserves the preregistered ceilings.
