// Record once, replay forever.
//
//   node experiments/ai-evals/agent-replay.mjs
//
// The script records a cassette from a simulated live run, replays it with
// zero live calls, measures both, then shows what a code change looks like
// when the recorded trajectory no longer matches.

import path from "node:path";
import { fileURLToPath } from "node:url";

import { createHarness, DivergenceError, loadCassette, saveCassette } from "./cassette.mjs";
import { createLiveDecider, runTriageAgent, SAMPLE_TICKET } from "./triage-agent.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
export const CASSETTE_DIR = path.join(here, "cassettes");
export const CASSETTE_NAME = "refund-within-order-total";

// The recording stamp is pinned on purpose. A wall clock value would make
// the committed cassette change on every rerecord and hide the real diff.
export const RECORDED_AT = "2026-11-18T09:12:44.000Z";

export async function record({ directory = CASSETTE_DIR } = {}) {
  const live = createLiveDecider();
  const ctx = createHarness({
    mode: "record",
    name: CASSETTE_NAME,
    live,
    agentVersion: "triage-agent@1",
    recordedAt: RECORDED_AT,
  });

  const started = performance.now();
  const outcome = await runTriageAgent(SAMPLE_TICKET, ctx);
  const elapsedMs = performance.now() - started;

  const cassette = ctx.finishRecording({
    answer: outcome.answer,
    tools: outcome.transcript.map((entry) => entry.tool),
  });
  saveCassette(directory, cassette);

  return { cassette, elapsedMs, stats: ctx.stats, outcome };
}

export async function replay({ directory = CASSETTE_DIR, agentOptions = {} } = {}) {
  const cassette = loadCassette(directory, CASSETTE_NAME);
  const ctx = createHarness({ mode: "replay", name: CASSETTE_NAME, cassette });

  const started = performance.now();
  const outcome = await runTriageAgent(SAMPLE_TICKET, ctx, agentOptions);
  const elapsedMs = performance.now() - started;

  return { cassette, elapsedMs, stats: ctx.stats, outcome };
}

export async function hybrid({ directory = CASSETTE_DIR } = {}) {
  const cassette = loadCassette(directory, CASSETTE_NAME);
  const ctx = createHarness({
    mode: "hybrid",
    name: CASSETTE_NAME,
    live: createLiveDecider(),
    cassette,
  });

  const started = performance.now();
  const outcome = await runTriageAgent(SAMPLE_TICKET, ctx);
  const elapsedMs = performance.now() - started;

  return { elapsedMs, stats: ctx.stats, outcome };
}

function ms(value) {
  return `${value.toFixed(1)} ms`;
}

async function main() {
  const recorded = await record();
  console.log("[record] one simulated live run");
  console.log(`  wall clock: ${ms(recorded.elapsedMs)}`);
  console.log(
    `  live decisions: ${recorded.stats.liveDecisions}, ` +
      `live tool calls: ${recorded.stats.liveToolCalls}`
  );
  console.log(`  cassette steps: ${recorded.cassette.steps.length}`);
  console.log(`  trajectory: ${recorded.cassette.final.tools.join(" -> ")}`);
  console.log("");

  const replayed = await replay();
  console.log("[replay] same code, cassette only");
  console.log(`  wall clock: ${ms(replayed.elapsedMs)}`);
  console.log(
    `  live decisions: ${replayed.stats.liveDecisions}, ` +
      `live tool calls: ${replayed.stats.liveToolCalls}`
  );
  console.log(
    `  replayed decisions: ${replayed.stats.replayedDecisions}, ` +
      `replayed tool calls: ${replayed.stats.replayedToolCalls}`
  );

  // One replay is too fast to time honestly, so measure a batch.
  const batch = 200;
  const batchStart = performance.now();
  for (let i = 0; i < batch; i += 1) await replay();
  const batchMs = performance.now() - batchStart;
  console.log(
    `  ${batch} replays including cassette parsing: ${ms(batchMs)} total, ` +
      `${(batchMs / batch).toFixed(2)} ms each`
  );
  console.log(
    `  one live run buys ${Math.floor(recorded.elapsedMs / (batchMs / batch))} replays`
  );
  console.log("");

  const mixed = await hybrid();
  console.log("[hybrid] decisions replayed, tools executed for real");
  console.log(`  wall clock: ${ms(mixed.elapsedMs)}`);
  console.log(
    `  live decisions: ${mixed.stats.liveDecisions}, live tool calls: ${mixed.stats.liveToolCalls}`
  );
  console.log("");

  console.log("[divergence] the eligibility check is removed from the agent code");
  try {
    await replay({ agentOptions: { requireEligibilityCheck: false } });
    console.log("  no divergence reported (this would be a bug in the harness)");
  } catch (error) {
    if (!(error instanceof DivergenceError)) throw error;
    console.log(
      error.message
        .split("\n")
        .map((line) => `  ${line}`)
        .join("\n")
    );
  }
  console.log("");

  console.log("[divergence] the refund cap is removed, so only the arguments change");
  try {
    await replay({ agentOptions: { capRefundToOrderTotal: false } });
    console.log("  no divergence reported (this would be a bug in the harness)");
  } catch (error) {
    if (!(error instanceof DivergenceError)) throw error;
    console.log(
      error.message
        .split("\n")
        .map((line) => `  ${line}`)
        .join("\n")
    );
  }
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
