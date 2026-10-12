import { stableId } from "./cognition.mjs";
import { writeTrace } from "./events.mjs";
import { agentCapabilities, officeNameFor } from "./offices.mjs";

function slug(value) {
  return String(value).replace(/[^a-zA-Z0-9:-]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
}

export function playerIdFor(agent) {
  return `player:${agent.name}`;
}

export function defaultHandedness(agent) {
  const office = officeNameFor(agent);
  return {
    recv: `trace:agents/${agent.name}/inbox`,
    send: `trace:agents/${agent.name}/outbox`,
    actuate: agentCapabilities(agent).length ? `capability:${agentCapabilities(agent).join("+")}` : "capability:none",
    observe: `frontier:${office}:memory+work+governance`,
  };
}

function cgsEvents(agent, prompt, tracePaths, options = {}) {
  const playerId = playerIdFor(agent);
  const base = stableId([agent.name, prompt, options.now ?? ""], "cgs");
  const observe = `evt:observe-frontier:${agent.name}:${base}`;
  const governance = `evt:governance-check:${agent.name}:${base}`;
  const append = `evt:trace-append:${agent.name}:${base}`;
  return [
    {
      id: observe,
      kind: "observe-frontier",
      polarity: "opponent",
      actor: playerId,
      frontier: ["prompt", "memory", "work", "governance"],
      evidence: tracePaths.length ? tracePaths : ["prompt"],
    },
    {
      id: governance,
      kind: "governance-check",
      polarity: "opponent",
      actor: `governance:${officeNameFor(agent)}`,
      causes: [observe],
      evidence: tracePaths.length ? tracePaths : ["governance:office-capability"],
    },
    {
      id: append,
      kind: "trace-append",
      polarity: "player",
      actor: playerId,
      causes: [observe, governance],
      traceRows: tracePaths,
      evidence: tracePaths.length ? tracePaths : ["trace:pending"],
    },
  ];
}

export function buildPlayerTuple(root, agent, prompt, options = {}) {
  const now = options.now ?? new Date().toISOString();
  const office = officeNameFor(agent);
  const playerId = playerIdFor(agent);
  const tracePaths = [...new Set((options.tracePaths ?? []).filter(Boolean))];
  const handedness = { ...defaultHandedness(agent), ...(agent.handedness ?? {}) };
  const events = cgsEvents(agent, prompt, tracePaths, options);
  const actionEvent = events.find((event) => event.polarity === "player");
  const observationEvents = events.filter((event) => event.polarity === "opponent").map((event) => event.id);

  return {
    kind: "swarm.playerTuple",
    id: stableId([agent.name, prompt, tracePaths, now], "player-tuple"),
    agent: agent.name,
    office,
    externalPlayerRef: `external:${agent.name}`,
    modeledPlayerRef: playerId,
    characterRef: `character:${agent.name}`,
    personaRef: `persona:${agent.name}`,
    roleRefs: [`role:${office}`],
    skillRefs: agentCapabilities(agent).map((capability) => `skill:${capability}`),
    methodOrToolSurface: agent.provider === "local" ? "runtime:local-office" : `provider:${agent.provider}`,
    inbox: handedness.recv,
    outbox: handedness.send,
    localSettling: `local-settling:${agent.name}`,
    actionBound: handedness.actuate,
    observationFrontier: handedness.observe,
    capabilityFiber: `capability-fiber:${agent.name}`,
    governance: `governance:${office}`,
    handedness,
    cgs: {
      profileRef: `cgs:${agent.name}`,
      strategyRef: `strategy:${agent.name}`,
      strategyClass: "concurrent",
      events,
      observes: observationEvents,
      acts: actionEvent ? [actionEvent.id] : [],
      polarityNotIdentity: true,
      opponentEventsFromObservations: true,
      playerEventsFromActions: true,
      arenaFormula: "A^perp || B",
    },
    tracePaths,
    root,
    created: now,
  };
}

export function writePlayerTuple(root, agent, prompt, options = {}) {
  const tuple = buildPlayerTuple(root, agent, prompt, options);
  const term = `players/${slug(agent.name)}/tuples/${tuple.id}`;
  return writeTrace(root, term, tuple, options);
}
