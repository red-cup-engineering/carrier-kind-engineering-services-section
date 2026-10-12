// FeltOS is a platform application. It mounts the core multi-agent world
// stack by its actual packages; their action registries remain the
// authoritative behavior. The stack stands above the semiotic engine tower
// and makes the organized-agent boundary where planning, working, and other
// agent applications may compose.
import * as animating from "@red-cup-engineering/agentic-animation-engine";
import * as communicating from "@red-cup-engineering/agentic-communication-engine";
import * as computing from "@red-cup-engineering/agentic-computation-engine";
import * as gaming from "@red-cup-engineering/agentic-game-engine";
import * as knowing from "@red-cup-engineering/agentic-knowledge-engine";
import * as organizing from "@red-cup-engineering/agentic-organization-engine";
import * as playing from "@red-cup-engineering/agentic-play-engine";
import * as relating from "@red-cup-engineering/agentic-relation-engine";
import * as socializing from "@red-cup-engineering/agentic-socialization-engine";

const APPLICATION_MODULES = Object.freeze({
  animating,
  communicating,
  computing,
  gaming,
  knowing,
  organizing,
  playing,
  relating,
  socializing,
});

export const APPLICATION_NAMES = Object.freeze(Object.keys(APPLICATION_MODULES));

/**
 * The dependency formation that makes a multi-agent world. A later layer
 * consumes the capability of every layer before it; sibling entries are
 * peers, not an ordering claim. Agent applications begin only beyond
 * organizing, never by bypassing this stack.
 */
export const CORE_MULTI_AGENT_WORLD_STACK = Object.freeze([
  Object.freeze({ layer: "relating", applications: Object.freeze(["relating"]) }),
  Object.freeze({ layer: "meme", applications: Object.freeze(["playing", "communicating", "knowing"]) }),
  Object.freeze({ layer: "animating", applications: Object.freeze(["animating"]) }),
  Object.freeze({ layer: "multi-agent", applications: Object.freeze(["gaming", "socializing", "computing"]) }),
  Object.freeze({ layer: "organizing", applications: Object.freeze(["organizing"]) }),
]);

/** The one composition boundary for planning, working, and later agent applications. */
export const ORGANIZED_AGENT_APPLICATION_BOUNDARY = Object.freeze({
  dependsOn: "organizing",
  examples: Object.freeze(["planning", "working"]),
});

export const APPLICATION_CAPABILITIES = Object.freeze({
  animating: Object.freeze(["perceive", "submit", "step"]),
  communicating: Object.freeze(["meme", "common-ground", "discourse"]),
  computing: Object.freeze(["settle", "snapshot", "receipt"]),
  gaming: Object.freeze(["game", "arena", "campaign"]),
  knowing: Object.freeze(["absorb", "cognize", "research"]),
  organizing: Object.freeze(["party", "guild", "governance"]),
  playing: Object.freeze(["design", "cut", "behavior"]),
  relating: Object.freeze(["action", "carrier", "projection"]),
  socializing: Object.freeze(["speech", "standing", "institution"]),
});

function fail(message) {
  throw new TypeError(message);
}

/** The live module namespace of a mounted platform application. */
export function applicationModule(name) {
  return APPLICATION_MODULES[name] ?? fail(`unknown application: ${String(name)}`);
}

/** The application's live action registry: records with a verb and a run function. */
export function applicationActions(name) {
  const module = applicationModule(name);
  const registry = typeof module.actions === "function" ? module.actions() : module.actions;
  if (!Array.isArray(registry) || registry.length === 0) fail(`application ${name} mounts no action registry`);
  for (const action of registry) {
    if (typeof action.verb !== "string" || typeof action.run !== "function") {
      fail(`application ${name} action registry is malformed`);
    }
  }
  return registry;
}

/** All verbs a mounted application answers to. */
export function applicationActionVerbs(name) {
  return Object.freeze(applicationActions(name).map((action) => action.verb));
}

/** One application action by verb, ready to run. */
export function applicationAction(name, verb) {
  const action = applicationActions(name).find((candidate) => candidate.verb === verb);
  return action ?? fail(`application ${name} has no action ${String(verb)}`);
}

export function bootstrapApplications() {
  const applications = {};
  for (const name of APPLICATION_NAMES) {
    applications[name] = Object.freeze({
      capabilities: APPLICATION_CAPABILITIES[name],
      verbs: applicationActionVerbs(name),
    });
  }
  return Object.freeze({
    kind: "feltos.platform-applications.v1",
    coreMultiAgentWorldStack: CORE_MULTI_AGENT_WORLD_STACK,
    organizedAgentApplicationBoundary: ORGANIZED_AGENT_APPLICATION_BOUNDARY,
    applications: Object.freeze(applications),
  });
}

export function applicationCapability(name, capability) {
  return APPLICATION_CAPABILITIES[name]?.includes(capability) ?? false;
}
