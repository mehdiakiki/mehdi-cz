const stages = new Set(["first-review", "review-window", "author-rework", "dependency-wait"]);

export function summarizeQueue(records, nowMs) {
  if (!Array.isArray(records) || !Number.isSafeInteger(nowMs)) throw new Error("invalid snapshot");
  const ids = new Set();
  return records.flatMap((record) => {
    if (!record || typeof record.draft !== "boolean" || !Number.isSafeInteger(record.number) ||
      record.number < 1 || ids.has(record.number)) throw new Error("invalid request identity or draft state");
    ids.add(record.number);
    if (record.draft) return [];
    const enteredMs = Date.parse(record.stageEnteredAt);
    if (!stages.has(record.stage) ||
      !Number.isSafeInteger(enteredMs) || enteredMs > nowMs || typeof record.waitingFor !== "string") {
      throw new Error("invalid or stale stage record");
    }
    return [{ number: record.number, stage: record.stage, waitingFor: record.waitingFor,
      elapsedHours: (nowMs - enteredMs) / 3_600_000 }];
  }).sort((a, b) => b.elapsedHours - a.elapsedHours);
}
