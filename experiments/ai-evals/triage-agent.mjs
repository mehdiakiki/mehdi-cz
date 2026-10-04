// The agent under test, plus a simulated live decision source and simulated
// live tools. No network, no model provider, no clock dependency beyond the
// artificial sleeps that make a "live" run feel like a live run.

export const MODEL_LATENCY_MS = 380;

export const TOOL_LATENCY_MS = {
  search_policy: 210,
  lookup_order: 180,
  check_refund_eligibility: 240,
  issue_refund: 520,
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * A stand in for the model. It is a deterministic policy with artificial
 * latency, so a "live" run costs real wall clock time without costing money.
 */
export function createLiveDecider({ latencyMs = MODEL_LATENCY_MS } = {}) {
  return {
    async decide(state) {
      await sleep(latencyMs);
      const seen = state.transcript.map((entry) => entry.tool);
      if (!seen.includes("search_policy")) {
        return { intent: "search_policy", query: state.ticket.topic };
      }
      if (state.ticket.wantsRefund && !seen.includes("lookup_order")) {
        return { intent: "lookup_order", orderId: state.ticket.orderId };
      }
      if (state.ticket.wantsRefund && !seen.includes("issue_refund")) {
        return { intent: "issue_refund", amountCents: state.ticket.requestedCents };
      }
      return { intent: "final_answer", text: "Handled the ticket." };
    },

    async callTool(name, args) {
      const latency = TOOL_LATENCY_MS[name] ?? 200;
      await sleep(latency);
      return { result: executeTool(name, args), latencyMs: latency };
    },
  };
}

/** The deterministic body of each simulated tool. */
export function executeTool(name, args) {
  switch (name) {
    case "search_policy":
      return { docId: "policy-07", snippet: `Refunds for ${args.query} within 30 days.` };
    case "lookup_order":
      return { orderId: args.orderId, totalCents: 14500, status: "delivered" };
    case "check_refund_eligibility":
      return { eligible: true, maxRefundCents: 14500 };
    case "issue_refund":
      return { refundId: `rf-${args.orderId}-1`, refundedCents: args.amountCents };
    default:
      throw new Error(`unknown tool: ${name}`);
  }
}

/**
 * The code under test. `options` exists so the demo can simulate a code
 * change and show what the harness reports.
 */
export async function runTriageAgent(ticket, ctx, options = {}) {
  const { requireEligibilityCheck = true, capRefundToOrderTotal = true, maxSteps = 8 } = options;

  const transcript = [];
  let orderTotalCents = null;

  for (let step = 0; step < maxSteps; step += 1) {
    const decision = await ctx.decide({ ticket, transcript });

    if (decision.intent === "final_answer") {
      if (typeof ctx.assertFullyConsumed === "function") ctx.assertFullyConsumed();
      return { answer: decision.text, transcript };
    }

    if (decision.intent === "search_policy") {
      const result = await ctx.callTool("search_policy", { query: decision.query });
      transcript.push({ tool: "search_policy", result });
      continue;
    }

    if (decision.intent === "lookup_order") {
      const result = await ctx.callTool("lookup_order", { orderId: decision.orderId });
      orderTotalCents = result.totalCents;
      transcript.push({ tool: "lookup_order", result });
      continue;
    }

    if (decision.intent === "issue_refund") {
      // The safety step lives in the code, not in the model decision.
      if (requireEligibilityCheck) {
        const check = await ctx.callTool("check_refund_eligibility", {
          orderId: ticket.orderId,
        });
        transcript.push({ tool: "check_refund_eligibility", result: check });
        if (!check.eligible) {
          transcript.push({ tool: "refund_blocked", result: { reason: "not_eligible" } });
          continue;
        }
      }

      const requested = decision.amountCents;
      const amountCents =
        capRefundToOrderTotal && orderTotalCents !== null
          ? Math.min(requested, orderTotalCents)
          : requested;

      const result = await ctx.callTool("issue_refund", {
        orderId: ticket.orderId,
        amountCents,
      });
      transcript.push({ tool: "issue_refund", result });
      continue;
    }

    throw new Error(`unknown intent: ${decision.intent}`);
  }

  throw new Error("agent did not finish inside maxSteps");
}

export const SAMPLE_TICKET = {
  id: "tk-4821",
  topic: "late delivery",
  orderId: "ord-99120",
  wantsRefund: true,
  requestedCents: 19000,
};
