/**
 * actions - computing's public operation apex.
 *
 * The core OUT-face actions remain in `core-actions.mts`. This wrapper adds the
 * IN-face actions that let the manifold describe itself as LSP and step SEN as
 * DAP, while keeping both routes ordinary carrier-to-carrier boundaries.
 */
import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { tmCarrier } from "@red-cup-engineering/relating";
import { tm } from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation";
import {
  coreActions,
  computeAction,
  composeAction,
  relayAction,
  bangAction,
  classifyWorkAction,
  decideCapabilitiesAction,
  decideAction,
  reconstructFromHashesAction,
  diffFromBoundaryHashesAction,
  foldTraceAction,
  deriveProvenanceAction,
  coordinateHolographicComputeAction,
  ecosystemInfoTilingAction,
  regulateEcosystemCausalWidthAction,
  stabilizeEcosystemCausalWidthAction,
  ecosystemRecursiveControlAction,
  ecosystemRecursiveUnitAction,
  reconstructEcosystemConeAction,
  diffEcosystemConesAction,
  aperiodicPatchAction,
  aperiodicSelfOrganizeAction,
  aperiodicTheoryAtlasAction,
  aperiodicBridgePlanAction,
  eventualConsistencyAction,
} from "./core-actions.mjs";
import {
  lspRequestEnvelopeCarrier,
  lspResponseEnvelopeCarrier,
  projectLsp,

} from "./lsp.mjs";
import {
  dapRequestEnvelopeCarrier,
  dapResponseEnvelopeCarrier,
  projectDap,

} from "./dap.mjs";
import { jsonResource } from "@red-cup-engineering/json-services-section";

export {
  computeAction,
  composeAction,
  relayAction,
  bangAction,
  classifyWorkAction,
  decideCapabilitiesAction,
  decideAction,
  reconstructFromHashesAction,
  diffFromBoundaryHashesAction,
  foldTraceAction,
  deriveProvenanceAction,
  coordinateHolographicComputeAction,
  ecosystemInfoTilingAction,
  regulateEcosystemCausalWidthAction,
  stabilizeEcosystemCausalWidthAction,
  ecosystemRecursiveControlAction,
  ecosystemRecursiveUnitAction,
  reconstructEcosystemConeAction,
  diffEcosystemConesAction,
  aperiodicPatchAction,
  aperiodicSelfOrganizeAction,
  aperiodicTheoryAtlasAction,
  aperiodicBridgePlanAction,
  eventualConsistencyAction,
};
export {
  eventualConsistency,
  stochasticConvergenceReceipt,

} from "./core-actions.mjs";

function admitJsonActionInput(input, verb) {
  return jsonResource(input, `${verb} input`);
}

export const lspAction = operation({
  verb: "lsp",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Answer one dependency-free JSON-RPC request against computing's LSP projection.",
  description: "Domain: computing/lsp/request. Codomain: computing/lsp/response. The handler reads the same carrier/action apex served by the kernel, so hover, definition, references, and diagnostics are reflections of the live manifold rather than a second code model.",
  domain: lspRequestEnvelopeCarrier,
  codomain: lspResponseEnvelopeCarrier,
  run: (input) => {
    const request = lspRequestEnvelopeCarrier.assert(admitJsonActionInput(input, "lsp"));
    const response = projectLsp({ actions }).handle(request);
    return jsonResource(response, "lsp-response");
  },
});

const defaultDapTerm = tm.app(tm.lam(tm.var(0)), tm.reading("denied"));
const dapSessions = new Map();

function requestParams(request) {
  return typeof request.params === "object" && request.params !== null && !Array.isArray(request.params)
    ? request.params
    : Object.freeze({});
}

function dapSessionId(request) {
  const params = requestParams(request);
  return typeof params["sessionId"] === "string" && params["sessionId"].trim() !== ""
    ? params["sessionId"]
    : "computing-dap";
}

function dapTerm(request) {
  const params = requestParams(request);
  const candidate = params["term"];
  return candidate === undefined ? undefined : tmCarrier.assert(candidate);
}

function dapProjection(request) {
  const sessionId = dapSessionId(request);
  const existing = dapSessions.get(sessionId);
  if (existing !== undefined) return existing;
  const projection = projectDap({ sessionId, term: dapTerm(request) ?? defaultDapTerm });
  dapSessions.set(sessionId, projection);
  return projection;
}

export const dapAction = operation({
  verb: "dap",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Answer one dependency-free JSON-RPC request against computing's DAP projection.",
  description: "Domain: computing/dap/request. Codomain: computing/dap/response. The handler keeps per-session SEN reduction cursors and delegates initialize, launch, next, stepIn, stepOut, continue, stack, scopes, variables, breakpoints, and disconnect to projectDap().handle.",
  domain: dapRequestEnvelopeCarrier,
  codomain: dapResponseEnvelopeCarrier,
  run: (input) => {
    const request = dapRequestEnvelopeCarrier.assert(admitJsonActionInput(input, "dap"));
    const response = dapProjection(request).handle(request);
    return jsonResource(response, "dap-response");
  },
});

export const actions = Object.freeze([
  ...coreActions,
  lspAction,
  dapAction,
]);
