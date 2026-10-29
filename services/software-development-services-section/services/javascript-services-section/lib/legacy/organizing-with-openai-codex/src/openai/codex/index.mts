export {
  codexTerm,
  embodiesPredicate,
  runsPredicate,
  canonicalizeCodexAction,
  canonicalizeCodexTopologyAction,
  codex,
  induceCodexTopology,
  extendCodexTopology,
  induceCodexInstanceTopology,
  actions,
} from "./codex-topology.mjs";

export type {
  CodexInput,
  CodexCarrier,
  CodexTopologyCarrier,
  UtteranceCarrier,
} from "./codex-topology.mjs";

export * as cliHarness from "./cli-harness/index.mjs";
