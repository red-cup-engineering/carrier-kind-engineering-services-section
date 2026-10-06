/** Reduce canonical RPC evidence rows to the admitted steps used by recurrence analysis. */

function record(value) {
  if (value === undefined || value === null || typeof value !== "object" || Array.isArray(value)) return undefined;
  return value;
}

function inputShape(value) {
  const input = record(value);
  return Object.freeze(input === undefined ? [] : Object.keys(input).sort());
}

/** Pair attempts and outcomes even when a content-identity scan encounters the
 * outcome first. Attempts without successful outcomes remain invalid evidence. */
export function rpcAdmittedStepCollector() {
  const steps = [];
  const pending = new Map();
  const earlyOutcomes = new Map();
  const push = (row) => {
    const attribute = record(row[1]);
    const evidence = record(row[2]);
    const kind = attribute?.["kind"];
    if (kind === "metroplat.rpc.attempt") {
      const invocation = record(evidence?.["invocation"]);
      const id = invocation?.["id"];
      const actor = invocation?.["subject"];
      const verb = invocation?.["verb"];
      if (typeof id !== "string" || typeof actor !== "string" || typeof verb !== "string") return;
      const index = steps.push({
        actor,
        verb,
        argShape: inputShape(invocation?.["input"]),
        validated: false,
      }) - 1;
      const outcomes = earlyOutcomes.get(id);
      if (outcomes !== undefined && outcomes.length > 0) {
        steps[index].validated = outcomes.pop();
        if (outcomes.length === 0) earlyOutcomes.delete(id);
        return;
      }
      const occurrences = pending.get(id);
      if (occurrences === undefined) pending.set(id, [index]);
      else occurrences.push(index);
      return;
    }
    if (kind !== "metroplat.rpc.outcome") return;
    const id = evidence?.["invocation"];
    const receipt = record(evidence?.["receipt"]);
    if (typeof id !== "string" || typeof receipt?.["ok"] !== "boolean") return;
    const occurrences = pending.get(id);
    if (occurrences === undefined) {
      const outcomes = earlyOutcomes.get(id);
      if (outcomes === undefined) earlyOutcomes.set(id, [receipt["ok"]]);
      else outcomes.push(receipt["ok"]);
      return;
    }
    const index = occurrences.pop();
    if (index === undefined) return;
    steps[index].validated = receipt["ok"];
    if (occurrences.length === 0) pending.delete(id);
  };
  return Object.freeze({
    push,
    read: () => Object.freeze(steps.map((step) => Object.freeze({ ...step }))),
  });
}

/** The part of one RPC evidence row the step collector reads, or undefined for a row it ignores:
 * a reader of a whole day of RPC evidence holds these, never the evidence itself. */
export function rpcStepRowOf(row) {
  const kind = record(row[1])?.["kind"];
  const evidence = record(row[2]);
  if (kind === "metroplat.rpc.attempt") {
    const invocation = record(evidence?.["invocation"]);
    const input = record(invocation?.["input"]);
    return Object.freeze([row[0], Object.freeze({ kind }), Object.freeze({ invocation: Object.freeze({
      id: invocation?.["id"],
      subject: invocation?.["subject"],
      verb: invocation?.["verb"],
      input: input === undefined ? undefined : Object.freeze(Object.fromEntries(Object.keys(input).map((key) => [key, null]))),
    }) }), row[3]]);
  }
  if (kind === "metroplat.rpc.outcome") {
    const receipt = record(evidence?.["receipt"]);
    return Object.freeze([row[0], Object.freeze({ kind }), Object.freeze({
      invocation: evidence?.["invocation"],
      receipt: receipt === undefined ? undefined : Object.freeze({ ok: receipt["ok"] }),
    }), row[3]]);
  }
  return undefined;
}

export function rpcAdmittedStepsOfRows(rows) {
  const collector = rpcAdmittedStepCollector();
  for (const row of rows) collector.push(row);
  return collector.read();
}
