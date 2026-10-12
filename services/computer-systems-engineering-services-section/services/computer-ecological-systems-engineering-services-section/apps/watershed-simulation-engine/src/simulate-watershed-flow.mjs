const TERMINAL_SINKS = new Set(["ocean", "endorheic"]);

function requireNonEmptyString(value, name) {
  if (typeof value !== "string" || value.length === 0) throw new TypeError(`${name} must be a non-empty string`);
}

function requireNonNegativeNumber(value, name) {
  if (!Number.isFinite(value) || value < 0) throw new TypeError(`${name} must be a finite non-negative number`);
}

function indexTopology(watersheds) {
  const byId = new Map();
  for (const watershed of watersheds) {
    requireNonEmptyString(watershed?.id, "watershed.id");
    requireNonEmptyString(watershed?.drainsTo, "watershed.drainsTo");
    if (byId.has(watershed.id)) throw new TypeError(`duplicate watershed id: ${watershed.id}`);
    byId.set(watershed.id, watershed);
  }
  return byId;
}

function indexWatersheds(watersheds) {
  const byId = indexTopology(watersheds);
  if (byId.refused) return byId;
  for (const watershed of watersheds) {
    if (!Number.isFinite(watershed.releaseFraction) || watershed.releaseFraction < 0 || watershed.releaseFraction > 1) {
      throw new TypeError("watershed.releaseFraction must be between 0 and 1");
    }
    if (!TERMINAL_SINKS.has(watershed.drainsTo) && !byId.has(watershed.drainsTo)) {
      return { refused: true, reason: "dangling-drains-to" };
    }
  }
  return byId;
}

function drainageOrder(byId) {
  const state = new Map();
  const order = [];
  function visit(id) {
    const current = state.get(id);
    if (current === "visiting") return false;
    if (current === "visited") return true;
    state.set(id, "visiting");
    const downstream = byId.get(id).drainsTo;
    if (!TERMINAL_SINKS.has(downstream) && !visit(downstream)) return false;
    state.set(id, "visited");
    order.push(id);
    return true;
  }
  for (const id of [...byId.keys()].sort()) if (!visit(id)) return { refused: true, reason: "drainage-cycle" };
  return order;
}

function upstreamOf(id, byId) {
  const upstream = new Set();
  let frontier = [id];
  while (frontier.length > 0) {
    const next = [];
    for (const watershed of byId.values()) {
      if (frontier.includes(watershed.drainsTo) && !upstream.has(watershed.id)) {
        upstream.add(watershed.id);
        next.push(watershed.id);
      }
    }
    frontier = next;
  }
  return [...upstream].sort();
}

function downstreamOf(id, byId) {
  const downstream = [];
  const visited = new Set([id]);
  let cursor = byId.get(id).drainsTo;
  while (!TERMINAL_SINKS.has(cursor)) {
    if (visited.has(cursor)) return { refused: true, reason: "drainage-cycle" };
    const nextWatershed = byId.get(cursor);
    if (nextWatershed === undefined) return { refused: true, reason: "dangling-drains-to" };
    visited.add(cursor);
    downstream.push(cursor);
    cursor = nextWatershed.drainsTo;
  }
  return { downstream, sink: cursor };
}

/** Read the drainage context a simulation needs for one watershed. */
export function deriveWatershedCausalOrder(request) {
  if (!Array.isArray(request?.watersheds)) throw new TypeError("watersheds must be an array");
  requireNonEmptyString(request?.id, "id");
  const byId = indexTopology(request.watersheds);
  if (byId.refused) return byId;
  if (!byId.has(request.id)) return { refused: true, reason: "unknown-watershed" };
  const flow = downstreamOf(request.id, byId);
  if (flow.refused) return flow;
  return Object.freeze({
    type: "WatershedCausalOrder",
    version: 1,
    id: request.id,
    past: upstreamOf(request.id, byId),
    future: flow.downstream,
    sink: flow.sink,
    divides: [...byId.values()]
      .filter((watershed) => watershed.id !== request.id && watershed.drainsTo === byId.get(request.id).drainsTo)
      .map((watershed) => watershed.id)
      .sort(),
  });
}

function waterByWatershed(values, name, watershedIds) {
  if (values === undefined) return new Map();
  if (!values || Array.isArray(values)) throw new TypeError(`${name} must be an object keyed by watershed id`);
  const result = new Map();
  for (const [id, amount] of Object.entries(values)) {
    if (!watershedIds.has(id)) throw new TypeError(`${name} names an unknown watershed: ${id}`);
    requireNonNegativeNumber(amount, `${name}.${id}`);
    result.set(id, amount);
  }
  return result;
}

function objectFromWater(values, orderedIds) {
  return Object.fromEntries(orderedIds.map((id) => [id, values.get(id) ?? 0]));
}

/**
 * Route abstract water quantities through a declared drainage network one edge per
 * step. `releaseFraction` is a caller-supplied calibration parameter; no physical
 * watershed properties are inferred from names, coordinates, or topology.
 */
export function simulateWatershedFlow(request) {
  if (!Array.isArray(request?.watersheds)) throw new TypeError("watersheds must be an array");
  if (!Number.isSafeInteger(request?.steps) || request.steps < 0) throw new TypeError("steps must be a non-negative integer");
  if (request.inflowByStep !== undefined && (!Array.isArray(request.inflowByStep) || request.inflowByStep.length > request.steps)) {
    throw new TypeError("inflowByStep must contain at most one watershed map per step");
  }

  const byId = indexWatersheds(request.watersheds);
  if (byId.refused) return byId;
  const orderedIds = [...byId.keys()].sort();
  const order = drainageOrder(byId);
  if (order.refused) return order;

  let stored = waterByWatershed(request.initialWaterByWatershed, "initialWaterByWatershed", byId);
  let totalInflow = [...stored.values()].reduce((sum, amount) => sum + amount, 0);
  const terminalOutflow = new Map([...TERMINAL_SINKS].map((sink) => [sink, 0]));
  const steps = [];

  for (let step = 0; step < request.steps; step += 1) {
    const rain = waterByWatershed(request.inflowByStep?.[step], `inflowByStep[${step}]`, byId);
    const next = new Map();
    const outflow = new Map([...TERMINAL_SINKS].map((sink) => [sink, 0]));
    for (const id of orderedIds) {
      const watershed = byId.get(id);
      const available = (stored.get(id) ?? 0) + (rain.get(id) ?? 0);
      totalInflow += rain.get(id) ?? 0;
      const released = available * watershed.releaseFraction;
      next.set(id, (next.get(id) ?? 0) + available - released);
      if (TERMINAL_SINKS.has(watershed.drainsTo)) {
        outflow.set(watershed.drainsTo, outflow.get(watershed.drainsTo) + released);
      } else {
        next.set(watershed.drainsTo, (next.get(watershed.drainsTo) ?? 0) + released);
      }
    }
    for (const sink of TERMINAL_SINKS) terminalOutflow.set(sink, terminalOutflow.get(sink) + outflow.get(sink));
    stored = next;
    steps.push(Object.freeze({
      step,
      inflowByWatershed: objectFromWater(rain, orderedIds),
      storedWaterByWatershed: objectFromWater(stored, orderedIds),
      terminalOutflowBySink: Object.fromEntries([...TERMINAL_SINKS].sort().map((sink) => [sink, outflow.get(sink)])),
    }));
  }

  const finalStoredWater = [...stored.values()].reduce((sum, amount) => sum + amount, 0);
  const totalTerminalOutflow = [...terminalOutflow.values()].reduce((sum, amount) => sum + amount, 0);
  return Object.freeze({
    type: "WatershedFlowSimulation",
    version: 1,
    units: "model-water-units",
    steps,
    finalStoredWaterByWatershed: objectFromWater(stored, orderedIds),
    cumulativeTerminalOutflowBySink: Object.fromEntries([...TERMINAL_SINKS].sort().map((sink) => [sink, terminalOutflow.get(sink)])),
    massBalance: { input: totalInflow, finalStoredWater, terminalOutflow: totalTerminalOutflow },
  });
}
