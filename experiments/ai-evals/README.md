# AI evaluation fixtures

Plain Node ESM, zero dependencies, fully deterministic. Nothing here calls a
model provider or a network. Every "model" and every "tool" is a simulated
function driven by a seeded PRNG (`rng.mjs`, mulberry32), so a rerun on any
machine prints the same numbers.

These scripts produce the evidence quoted in three articles:

- `data/blog/what-evidence-an-ai-feature-needs-before-you-ship-it.mdx`
- `data/blog/eval-scores-move-between-runs-how-to-compare-two-versions-honestly.mdx`
- `data/blog/a-record-and-replay-harness-for-agent-tests.mdx`

## Files

| File | What it is |
| --- | --- |
| `rng.mjs` | mulberry32 PRNG plus named streams |
| `stats.mjs` | Wilson interval, bootstrap, paired bootstrap, McNemar, Cohen's kappa |
| `triage-dataset.mjs` | the invented support ticket triage feature and its 300 recorded items |
| `evidence.mjs` | one evidence artifact per failure class |
| `compare-versions.mjs` | run to run noise, CI width, paired vs unpaired power, repeated runs |
| `cassette.mjs` | the record and replay harness (record, replay, hybrid, divergence) |
| `triage-agent.mjs` | the agent under test plus simulated live decisions and tools |
| `agent-replay.mjs` | record, replay, hybrid, and two divergence demonstrations |
| `cassettes/` | the committed cassette used as a regression fixture |

## Commands

Run every script from the repository root.

```bash
# the recorded dataset itself
node experiments/ai-evals/triage-dataset.mjs

# evidence per failure class for the pillar article
node experiments/ai-evals/evidence.mjs

# run to run noise and honest version comparison
node experiments/ai-evals/compare-versions.mjs

# record once, replay, hybrid, and divergence diffs
node experiments/ai-evals/agent-replay.mjs
```

## Tests

The tests pin every number that appears in the three articles.

```bash
node --test experiments/ai-evals/*.test.mjs
```

On Node 22.4.1 the directory form `node --test experiments/ai-evals/` is not
expanded and fails with `MODULE_NOT_FOUND`, so the glob above is the command to
use. Newer Node versions that search directories accept the directory form too.

## What is simulated and what is not

Simulated: the model decision, the tool results, the tool latency, the human
labels, and the judge labels. The token price of `$4` per million tokens is an
invented round number, not a quote from any provider.

Not simulated: the statistics. Wilson intervals, the bootstrap, McNemar, and
Cohen's kappa are computed on the generated data with ordinary code, and the
wall clock timings printed by `agent-replay.mjs` are real measurements of real
`setTimeout` sleeps.
