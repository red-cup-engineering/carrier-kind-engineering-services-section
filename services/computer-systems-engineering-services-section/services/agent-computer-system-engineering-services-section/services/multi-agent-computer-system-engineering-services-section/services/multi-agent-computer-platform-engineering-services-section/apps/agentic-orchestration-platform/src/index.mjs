import { induceSurface } from "@red-cup-engineering/computer-system-engine/rpc/induce";
import { serve as serveActions, serveManifold } from "@red-cup-engineering/computer-web-server/platform-http/operation-serving";
import { filesystemInvocationWitness, filesystemInvocationLogReader } from "@red-cup-engineering/feltos/invocation-log";
import { actions as relationActions } from "@red-cup-engineering/relating/actions";
import { actions as knowledgeActions } from "@red-cup-engineering/knowing/actions";
import { actions as playActions } from "@red-cup-engineering/playing/actions";
import { actions as communicationActions } from "@red-cup-engineering/communicating";
import { actions as animationActions } from "@red-cup-engineering/animating/actions";
import { actions } from "@red-cup-engineering/computing/actions";
const computation = Object.freeze({ actions });
import { actions as gameActions } from "@red-cup-engineering/gaming";
import { actions as socializationActions } from "@red-cup-engineering/socializing";
import { actions as organizationActions } from "@red-cup-engineering/organizing";

const modules = {
  relation: { actions: relationActions },
  knowledge: { actions: knowledgeActions },
  play: { actions: playActions },
  communication: { actions: communicationActions },
  animation: { actions: animationActions },
  computation,
  game: { actions: gameActions },
  socialization: { actions: socializationActions },
  organization: { actions: organizationActions },
};
export const engineNames = Object.freeze(Object.keys(modules));
const induced = new Map();

/** Discover and invoke an engine through its declared action carriers. */
export function engine(name) {
  if (!Object.hasOwn(modules, name)) throw new TypeError(`Unknown engine: ${String(name)}`);
  if (!induced.has(name)) {
    const registry = modules[name].actions;
    induced.set(name, induceSurface(typeof registry === "function" ? registry() : registry, {
      packageName: `@red-cup-engineering/agentic-${name}-engine`,
    }));
  }
  return induced.get(name);
}

/** Bind successful invocations to the selected engine's dated EAVT log. */
export function invocationOptions(name, { dataRoot, now = () => new Date().toISOString(), ...options } = {}) {
  const namespace = engine(name).discovery.package;
  return {
    ...options,
    ...(dataRoot === undefined ? {} : {
      now,
      onInvocation: filesystemInvocationWitness(dataRoot, namespace),
      witnessLog: filesystemInvocationLogReader(dataRoot, namespace, now),
    }),
  };
}

export function dispatch(name, argv, stdin, options = {}) {
  return engine(name).dispatchAsync(argv, stdin, invocationOptions(name, options));
}

/** Serve one engine, or the whole family through the existing action manifold. */
export function serve({ name, dataRoot, now, ...options } = {}) {
  if (name !== undefined) {
    const induced = engine(name);
    return serveActions(induced.operations, { ...invocationOptions(name, { dataRoot, now, ...options }), induced });
  }
  return serveManifold(engineNames.map((name) => ({
    name,
    induced: engine(name),
    options: invocationOptions(name, { dataRoot, now }),
  })), options);
}
