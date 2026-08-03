import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { createCarrierAdmissionReceipt, createModeledUnionDimension } from "../src/index.mjs";
import { induceCapabilityRepairDemand } from "../../../src/semiotic-exchange-demand-induction.mjs";
import { makeNiUri } from "@red-cup-engineering/ni-uri-services-section";

const ni = (value) => makeNiUri(Buffer.from(value, "utf8"));
const sha = (label) => `sha256:${createHash("sha256").update(label).digest("hex")}`;
const base = {
  type: "CodexToolInvocationObservationReceipt", version: 1, disposition: "observed",
  providerCell: "urn:ame:codex-session-activity-provider:tool-observation", operation: "observe-codex-tool-invocations",
  recordedAt: "2026-07-29T09:00:00.000Z", window: { fromExclusive: "2026-07-29T08:00:00.000Z", toInclusive: "2026-07-29T09:00:00.000Z" },
  observations: [{
    type: "CodexToolInvocationObservation", version: 1, occurredAt: "2026-07-29T08:30:00.000Z", sessionDigest: sha("session"),
    inferenceProcess: { kind: "codex-inference-process", address: `urn:sha256:${sha("session").slice(7)}`, authority: "inference-only" },
    providerCell: "urn:ame:codex-session-activity-provider:tool-observation", requestedTool: { transport: "custom_tool_call", name: "exec" },
    invocation: { callDigest: sha("call"), runtimeStatus: "completed" },
    actuator: { status: "not-bound-by-transcript-observation", reason: "Transcript observation has no authority or actuator binding." },
    disclosure: { transcriptText: false, reasoning: false, toolArguments: false, toolOutput: false, fileContents: false },
  }],
  evidence: [{ sessionDigest: sha("session"), observations: 1 }], refusals: [],
  authority: { observation: true, execution: false, restrictedMove: false, actuatorBinding: false, outcomeAssertion: false },
};

test("an observed Codex tool request becomes a MUD locus and an unbound SXC capability-market demand, never an actuator or move", () => {
  const admission = createCarrierAdmissionReceipt({ carrier: { type: base.type, value: base }, protocolVerificationReceiptNis: [ni("codex-transcript-sensor-protocol")] });
  const dimension = createModeledUnionDimension({ events: [], chainId: "eip155:5615610", exchange: "0x98bBC65824962b61dF876A47B5779C4EcBBD4939", carrierAdmissions: [admission] });
  const locus = dimension.codexToolObservations().loci[0];
  assert.equal(locus.type, "InferenceToolRequestLocus");
  assert.equal(locus.requestedTool.name, "exec");
  assert.equal(locus.inferenceProcess.authority, "inference-only");
  assert.equal(locus.actuator.status, "not-bound-by-transcript-observation");
  assert.equal(dimension.presentation().loci.some((value) => value.id === locus.id), true);
  assert.equal(dimension.restrictedArena("did:key:zInference").actions.length, 0);
  const moves = dimension.induceUnboundCodexToolBindingDemands({ raiser: "0x08E4B3bc9ef76b403879C0eC372d1Fd146E3a07B", induceDemand: induceCapabilityRepairDemand });
  assert.equal(moves.type, "UnboundCodexToolBindingDemandMoveSet");
  assert.equal(moves.demands.length, 1);
  assert.equal(moves.demands[0].market.operation, "bind-codex-tool-exec");
  const rebuilt = createModeledUnionDimension({ events: [], chainId: "eip155:5615610", exchange: "0x98bBC65824962b61dF876A47B5779C4EcBBD4939", carrierAdmissions: [admission], capabilityDemandInductionReceipts: moves.demands });
  const market = rebuilt.presentation().capabilityDemandMetabolism[0];
  assert.equal(market.phase, "ready-to-raise");
  assert.equal(market.obstruction.reason, "demand-not-yet-witnessed-on-chain");
});

test("the MUD refuses a transcript observation that fabricates an actuator binding", () => {
  const displaced = structuredClone(base); displaced.observations[0].actuator.status = "bound";
  const admission = createCarrierAdmissionReceipt({ carrier: { type: displaced.type, value: displaced }, protocolVerificationReceiptNis: [ni("codex-transcript-sensor-protocol")] });
  assert.throws(() => createModeledUnionDimension({ events: [], chainId: "eip155:5615610", exchange: "0x98bBC65824962b61dF876A47B5779C4EcBBD4939", carrierAdmissions: [admission] }), /falsely binds an actuator/u);
});
