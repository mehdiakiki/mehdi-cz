const FORCED_REFLOW_THRESHOLD_US = 30_000;

function isJavaScriptInvocation(event) {
  return (
    [
      "RunMicrotasks",
      "FunctionCall",
      "EvaluateScript",
      "v8.evaluateModule",
      "EventDispatch",
      "V8.Execute",
      "V8Console::runTask",
    ].includes(event.name) ||
    event.name.startsWith("v8") ||
    event.name.startsWith("V8")
  );
}

function isReflow(event) {
  return event.name === "Layout" || event.name === "UpdateLayoutTree";
}

function accommodate(event, stack, push = true) {
  let enclosing = stack.at(-1);
  while (enclosing && event.ts > enclosing.ts + (enclosing.dur || 0)) {
    stack.pop();
    enclosing = stack.at(-1);
  }
  if (push) stack.push(event);
}

function emptyThreadState() {
  return {
    allEventsStack: [],
    jsInvokeStack: [],
    taskReflowEvents: [],
  };
}

function processEvent(event, state, warnings) {
  accommodate(event, state.allEventsStack);
  accommodate(event, state.jsInvokeStack, isJavaScriptInvocation(event));

  if (state.jsInvokeStack.length && isReflow(event)) {
    state.taskReflowEvents.push(event);
    return;
  }

  if (state.allEventsStack.length === 1) {
    const totalDuration = state.taskReflowEvents.reduce(
      (duration, reflow) => duration + (reflow.dur || 0),
      0
    );
    if (totalDuration >= FORCED_REFLOW_THRESHOLD_US) {
      warnings.push(...state.taskReflowEvents);
    }
    state.taskReflowEvents.length = 0;
  }
}

export function detectWithGlobalStacks(events) {
  const state = emptyThreadState();
  const warnings = [];
  for (const event of events) processEvent(event, state, warnings);
  return warnings;
}

export function detectWithPerThreadStacks(events) {
  const states = new Map();
  const warnings = [];

  for (const event of events) {
    const key = `${event.pid}:${event.tid}`;
    let state = states.get(key);
    if (!state) {
      state = emptyThreadState();
      states.set(key, state);
    }
    processEvent(event, state, warnings);
  }

  return warnings;
}

export function summarize(events) {
  const current = detectWithGlobalStacks(events);
  const proposed = detectWithPerThreadStacks(events);
  const result = (warnings) => ({
    count: warnings.length,
    durationUs: warnings.reduce((duration, event) => duration + (event.dur || 0), 0),
    names: warnings.map((event) => event.name),
  });

  return { current: result(current), proposed: result(proposed) };
}
