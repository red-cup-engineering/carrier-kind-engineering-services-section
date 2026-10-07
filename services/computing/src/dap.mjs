/**
 * dap - computing's IN-face temporal protocol over SEN reduction.
 *
 * Debug Adapter Protocol is the time-shaped sibling of LSP: a client does not
 * ask for another machine to execute code, it drives the relating SEN evaluator.
 * `next` reads `step(term)`, `continue` reads `evaluate(term)`, the stack is the
 * focused evaluation context, and variables expose the de-Bruijn environment at
 * that focus.
 */
import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { tmCarrier } from "@red-cup-engineering/relating";
import { SEN_FORMS, mapSenImmediate } from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation";
import { evaluate, step } from "@red-cup-engineering/computer-code-engineering-services-section/semiotic-expression-notation/eval";

export const DAP_JSONRPC_VERSION = "2.0";

export const DAP_METHODS = Object.freeze({
  initialize: "initialize",
  launch: "launch",
  setBreakpoints: "setBreakpoints",
  stackTrace: "stackTrace",
  scopes: "scopes",
  variables: "variables",
  next: "next",
  stepIn: "stepIn",
  stepOut: "stepOut",
  continue: "continue",
  disconnect: "disconnect",
});

export const dapRequestEnvelopeSchema = {
  $id: "computing/dap/request",
  title: "DapRequestEnvelope",
  description: "A dependency-free JSON-RPC request envelope for the computing DAP projection.",
  type: "object",
  required: ["jsonrpc", "id", "method", "params"],
  additionalProperties: false,
  properties: {
    jsonrpc: { const: DAP_JSONRPC_VERSION },
    id: { type: ["string", "number"] },
    method: { enum: Object.values(DAP_METHODS) },
    params: {},
  },
};

export const dapResponseEnvelopeSchema = {
  $id: "computing/dap/response",
  title: "DapResponseEnvelope",
  description: "A dependency-free JSON-RPC response envelope for the computing DAP projection.",
  type: "object",
  required: ["jsonrpc", "id", "result"],
  additionalProperties: false,
  properties: {
    jsonrpc: { const: DAP_JSONRPC_VERSION },
    id: { type: ["string", "number"] },
    result: {},
  },
};

export const dapDebugSessionSchema = {
  $id: "computing/dap/session",
  title: "DapDebugSession",
  description: "A DAP-visible cursor over an SEN term reduction.",
  type: "object",
  required: ["kind", "sessionId", "stage", "term", "normal"],
  additionalProperties: false,
  properties: {
    kind: { const: "computing.dap.session" },
    sessionId: { type: "string" },
    stage: { type: "integer", minimum: 0 },
    term: { $ref: tmCarrier.id },
    normal: { type: "boolean" },
  },
};

export const dapRequestEnvelopeCarrier = schemaFrom(dapRequestEnvelopeSchema);
export const dapResponseEnvelopeCarrier = schemaFrom(dapResponseEnvelopeSchema);
export const dapDebugSessionCarrier = schemaFrom(dapDebugSessionSchema);

const ROOT_PATH = Object.freeze([]);

function pathKey(path) {
  return path.length === 0 ? "/" : `/${path.join("/")}`;
}

function children(term) {
  const result = [];
  mapSenImmediate(term, (child, slot, index) => {
    result.push({ path: index === undefined ? [slot] : [slot, index], term: child });
    return child;
  });
  return result;
}

function nextChild(term, path) {
  const child = children(term).find((entry) => entry.path.every((segment, index) => path[index] === segment));
  if (!child) throw new RangeError(`DAP path ${pathKey(path)} is not a term child of ${term[0]}`);
  return child;
}

function termAt(term, path) {
  if (path.length === 0) return term;
  const child = nextChild(term, path);
  return termAt(child.term, path.slice(child.path.length));
}

function replaceTermAt(term, path, replacement) {
  if (path.length === 0) return replacement;
  const child = nextChild(term, path);
  return Object.freeze(mapSenImmediate(term, (value, slot, index) =>
    slot === child.path[0] && index === child.path[1]
      ? replaceTermAt(value, path.slice(child.path.length), replacement)
      : value));
}

function contextFrames(term, path) {
  const frames = [];
  let current = term;
  let cursor = [];
  let depth = 0;
  frames.push(Object.freeze({ term: current, path: ROOT_PATH, binderDepth: depth }));
  while (cursor.length < path.length) {
    const child = nextChild(current, path.slice(cursor.length));
    if (SEN_FORMS[current[0]]?.binders?.includes(child.path[0])) depth += 1;
    current = child.term;
    cursor = [...cursor, ...child.path];
    frames.push(Object.freeze({ term: current, path: Object.freeze([...cursor]), binderDepth: depth }));
  }
  return Object.freeze(frames);
}

function boundEnvironment(term, path) {
  const frames = contextFrames(term, path);
  const bindings = [];
  frames.forEach((frame, index) => {
    const parent = frames[index - 1];
    if (parent && frame.binderDepth > parent.binderDepth) {
      bindings.unshift(Object.freeze({ name: `$${bindings.length}`, binderPath: parent.path }));
    }
  });
  return Object.freeze(bindings);
}

function findReducibleDescendant(term, path = ROOT_PATH) {
  const current = termAt(term, path);
  for (const child of children(current)) {
    const found = findReducibleDescendant(term, Object.freeze([...path, ...child.path]));
    if (found !== null) return found;
  }
  return step(current).length === 0 ? null : path;
}

function sessionCarrier(sessionId, stage, term) {
  return dapDebugSessionCarrier.assert(Object.freeze({
    kind: "computing.dap.session",
    sessionId,
    stage,
    term,
    normal: step(term).length === 0,
  }));
}

function breakpointFromLine(line) {
  return Object.freeze({
    verified: true,
    line,
    message: `SEN settling stage ${line}`,
  });
}

function stopped(
  sessionId,
  stage,
  term,
  focusPath,
  reason,
  reducts,
) {
  return Object.freeze({
    kind: "computing.dap.stopped",
    session: sessionCarrier(sessionId, stage, term),
    reason,
    focusPath,
    currentTerm: termAt(term, focusPath),
    reducts: Object.freeze([...reducts]),
  });
}

export function projectDap(options) {
  const sessionId = options.sessionId ?? "computing-dap";
  let currentTerm = options.term;
  let focusPath = ROOT_PATH;
  let stage = 0;
  const breakpoints = new Set();

  const currentSession = () => sessionCarrier(sessionId, stage, currentTerm);

  const initialize = () => Object.freeze({
    supportsConfigurationDoneRequest: false,
    supportsStepInTargetsRequest: true,
    supportsSetVariable: false,
  });

  const launch = (params) => {
    if (params.term !== undefined) currentTerm = tmCarrier.assert(params.term);
    focusPath = ROOT_PATH;
    stage = 0;
    return stopped(sessionId, stage, currentTerm, focusPath, "entry", step(currentTerm));
  };

  const setBreakpoints = (params) => {
    breakpoints.clear();
    const lines = params.breakpoints?.map((entry) => entry.line) ?? [];
    for (const line of lines) breakpoints.add(line);
    return Object.freeze({ breakpoints: Object.freeze(lines.map(breakpointFromLine)) });
  };

  const stackTrace = () => {
    const frames = [...contextFrames(currentTerm, focusPath)].reverse().map((frame, index) => Object.freeze({
      id: index + 1,
      name: `${frame.term[0]} ${pathKey(frame.path)}`,
      line: stage + 1,
      column: frame.binderDepth + 1,
      source: Object.freeze({ name: "SEN reduction", path: `sen://${sessionId}${pathKey(frame.path)}` }),
      term: frame.term,
      path: frame.path,
    }));
    return Object.freeze({ stackFrames: Object.freeze(frames), totalFrames: frames.length });
  };

  const scopes = (params) => Object.freeze({
    scopes: Object.freeze([Object.freeze({
      name: "SEN evaluation context",
      variablesReference: params.frameId,
      expensive: false,
    })]),
  });

  const variables = (params) => {
    const frames = [...contextFrames(currentTerm, focusPath)].reverse();
    const frame = frames[params.variablesReference - 1] ?? frames[0];
    const path = frame?.path ?? focusPath;
    const term = frame?.term ?? termAt(currentTerm, focusPath);
    const reducts = step(term);
    const env = boundEnvironment(currentTerm, path);
    const entries = [
      Object.freeze({ name: "term", value: JSON.stringify(term), type: "term", variablesReference: 0 }),
      Object.freeze({ name: "path", value: pathKey(path), type: "path", variablesReference: 0 }),
      Object.freeze({ name: "oneStepReducts", value: String(reducts.length), type: "number", variablesReference: 0 }),
      ...env.map((binding) => Object.freeze({
        name: binding.name,
        value: `bound at ${pathKey(binding.binderPath)}`,
        type: "binder",
        variablesReference: 0,
      })),
      ...reducts.map((reduct, index) => Object.freeze({
        name: `redex.${index}`,
        value: JSON.stringify(reduct),
        type: "redex",
        variablesReference: 0,
      })),
    ];
    return Object.freeze({ variables: Object.freeze(entries) });
  };

  const next = () => {
    const focused = termAt(currentTerm, focusPath);
    const reducts = step(focused);
    if (reducts.length === 0) return stopped(sessionId, stage, currentTerm, focusPath, "normal", reducts);
    const first = reducts[0];
    if (first === undefined) return stopped(sessionId, stage, currentTerm, focusPath, "normal", reducts);
    currentTerm = replaceTermAt(currentTerm, focusPath, first);
    stage += 1;
    const reason = breakpoints.has(stage) ? "breakpoint" : "step";
    return stopped(sessionId, stage, currentTerm, focusPath, reason, reducts);
  };

  const stepIn = () => {
    const found = findReducibleDescendant(currentTerm, focusPath);
    focusPath = found ?? focusPath;
    return stopped(sessionId, stage, currentTerm, focusPath, "stepIn", step(termAt(currentTerm, focusPath)));
  };

  const stepOut = () => {
    focusPath = contextFrames(currentTerm, focusPath).at(-2)?.path ?? ROOT_PATH;
    return stopped(sessionId, stage, currentTerm, focusPath, "stepOut", step(termAt(currentTerm, focusPath)));
  };

  const continueReduction = () => {
    currentTerm = evaluate(currentTerm);
    focusPath = ROOT_PATH;
    stage += 1;
    return Object.freeze({
      kind: "computing.dap.continued",
      session: currentSession(),
      normalForm: currentTerm,
    });
  };

  const disconnect = () => Object.freeze({
    kind: "computing.dap.disconnected",
    sessionId,
  });

  const handle = (request) => {
    const params = request.params;
    const result =
      request.method === DAP_METHODS.initialize ? initialize()
        : request.method === DAP_METHODS.launch ? launch(params)
          : request.method === DAP_METHODS.setBreakpoints ? setBreakpoints(params)
            : request.method === DAP_METHODS.stackTrace ? stackTrace()
              : request.method === DAP_METHODS.scopes ? scopes(params)
                : request.method === DAP_METHODS.variables ? variables(params)
                  : request.method === DAP_METHODS.next ? next()
                    : request.method === DAP_METHODS.stepIn ? stepIn()
                      : request.method === DAP_METHODS.stepOut ? stepOut()
                        : request.method === DAP_METHODS.continue ? continueReduction()
                          : disconnect();
    return dapResponseEnvelopeCarrier.assert(Object.freeze({
      jsonrpc: DAP_JSONRPC_VERSION,
      id: request.id,
      result,
    }));
  };

  return Object.freeze({
    session: currentSession,
    initialize,
    launch,
    setBreakpoints,
    stackTrace,
    scopes,
    variables,
    next,
    stepIn,
    stepOut,
    continue: continueReduction,
    disconnect,
    handle,
  });
}
