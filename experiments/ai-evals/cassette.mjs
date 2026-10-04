// A record-and-replay harness for agent tests.
//
// Three modes:
//   record  -> the live decision source and the live tools run, and every
//              decision and every tool result is written to a cassette.
//   replay  -> nothing live runs. Decisions come from the cassette and tool
//              results come from the cassette. Any tool call that does not
//              match the recorded one raises a DivergenceError.
//   hybrid  -> decisions come from the cassette, tools run for real. Use it
//              when the tool contract changed but the reasoning did not.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export const CASSETTE_VERSION = 1;

export class DivergenceError extends Error {
  constructor(message, details) {
    super(message);
    this.name = "DivergenceError";
    this.details = details;
  }
}

function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(",")}}`;
}

/** A readable, line oriented diff of two argument objects. */
export function diffArgs(expected, actual) {
  const keys = [...new Set([...Object.keys(expected ?? {}), ...Object.keys(actual ?? {})])].sort();
  const lines = [];
  for (const key of keys) {
    const before = stableStringify(expected?.[key]);
    const after = stableStringify(actual?.[key]);
    if (before === after) lines.push(`   ${key}: ${before}`);
    else {
      lines.push(`  -${key}: ${before ?? "(absent)"}`);
      lines.push(`  +${key}: ${after ?? "(absent)"}`);
    }
  }
  return lines.join("\n");
}

export function cassettePath(directory, name) {
  return path.join(directory, `${name}.json`);
}

export function loadCassette(directory, name) {
  const raw = readFileSync(cassettePath(directory, name), "utf8");
  const cassette = JSON.parse(raw);
  if (cassette.version !== CASSETTE_VERSION) {
    throw new Error(
      `cassette ${name} has version ${cassette.version}, this harness reads ${CASSETTE_VERSION}`
    );
  }
  return cassette;
}

export function saveCassette(directory, cassette) {
  mkdirSync(directory, { recursive: true });
  writeFileSync(
    cassettePath(directory, cassette.name),
    `${JSON.stringify(cassette, null, 2)}\n`,
    "utf8"
  );
}

/**
 * Build the context object the agent under test is given.
 *
 * live.decide(state)      -> { intent, ... }
 * live.callTool(name,args)-> { result, latencyMs }
 */
export function createHarness({
  mode,
  name,
  live,
  cassette,
  agentVersion = "unversioned",
  recordedAt = "1970-01-01T00:00:00.000Z",
}) {
  if (!["record", "replay", "hybrid"].includes(mode)) {
    throw new Error(`unknown harness mode: ${mode}`);
  }
  if (mode !== "record" && !cassette) throw new Error(`mode ${mode} needs a cassette`);

  const stats = { liveDecisions: 0, liveToolCalls: 0, replayedDecisions: 0, replayedToolCalls: 0 };
  const recordedSteps = [];
  let decisionIndex = 0;
  let toolIndex = 0;

  const ctx = {
    mode,
    stats,

    async decide(state) {
      if (mode === "record") {
        const decision = await live.decide(state);
        stats.liveDecisions += 1;
        recordedSteps.push({ kind: "decision", index: decisionIndex, decision });
        decisionIndex += 1;
        return decision;
      }

      const entry = cassette.steps.filter((s) => s.kind === "decision")[decisionIndex];
      if (!entry) {
        throw new DivergenceError(
          `the agent asked for decision ${decisionIndex} but the cassette "${cassette.name}" ` +
            `recorded only ${cassette.steps.filter((s) => s.kind === "decision").length}`,
          { decisionIndex }
        );
      }
      stats.replayedDecisions += 1;
      decisionIndex += 1;
      return entry.decision;
    },

    async callTool(toolName, args) {
      if (mode === "record" || mode === "hybrid") {
        const started = toolIndex;
        const { result, latencyMs } = await live.callTool(toolName, args);
        stats.liveToolCalls += 1;
        if (mode === "record") {
          recordedSteps.push({
            kind: "tool",
            index: started,
            name: toolName,
            args,
            result,
            latencyMs,
          });
        }
        toolIndex += 1;
        return result;
      }

      const calls = cassette.steps.filter((s) => s.kind === "tool");
      const entry = calls[toolIndex];
      if (!entry) {
        throw new DivergenceError(
          `divergence at tool call ${toolIndex}\n` +
            `  cassette "${cassette.name}" recorded ${calls.length} tool calls\n` +
            `  the code under test asked for one more: ${toolName}`,
          { toolIndex, expected: null, actual: { name: toolName, args } }
        );
      }
      if (entry.name !== toolName) {
        throw new DivergenceError(
          `divergence at tool call ${toolIndex}\n` +
            `  expected tool: ${entry.name}\n` +
            `  actual tool:   ${toolName}\n` +
            `  recorded args: ${stableStringify(entry.args)}\n` +
            `  actual args:   ${stableStringify(args)}`,
          { toolIndex, expected: entry, actual: { name: toolName, args } }
        );
      }
      if (stableStringify(entry.args) !== stableStringify(args)) {
        throw new DivergenceError(
          `divergence at tool call ${toolIndex} (${toolName})\n${diffArgs(entry.args, args)}`,
          { toolIndex, expected: entry, actual: { name: toolName, args } }
        );
      }
      stats.replayedToolCalls += 1;
      toolIndex += 1;
      return entry.result;
    },

    finishRecording(final) {
      return {
        version: CASSETTE_VERSION,
        name,
        agentVersion,
        recordedAt,
        steps: recordedSteps,
        final,
      };
    },

    /** Fail a replay that used fewer tool calls than the cassette holds. */
    assertFullyConsumed() {
      if (mode !== "replay") return;
      const calls = cassette.steps.filter((s) => s.kind === "tool");
      if (toolIndex !== calls.length) {
        throw new DivergenceError(
          `divergence at the end of the run\n` +
            `  cassette recorded ${calls.length} tool calls\n` +
            `  the code under test made ${toolIndex}\n` +
            `  first unused: ${calls[toolIndex]?.name ?? "(none)"}`,
          { toolIndex, expected: calls[toolIndex] ?? null, actual: null }
        );
      }
    },
  };

  return ctx;
}
