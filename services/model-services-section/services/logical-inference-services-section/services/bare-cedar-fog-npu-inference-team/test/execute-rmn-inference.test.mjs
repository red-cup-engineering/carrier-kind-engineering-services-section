import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test, { after, before } from "node:test";
import { serveContractedAgent } from "@red-cup-engineering/a2a-contracted-agent-service";
import { ephemeralAgentCardSigning } from "@red-cup-engineering/a2a-agent-card-key-service/testing";
import { assay, semanticBytes, semanticId } from "@red-cup-engineering/rmn-semantic-conformance";
import { ACCOUNT, LAW, OPERATION_TYPE, acquireNpuCapacity, executeMessage, releaseNpuCapacity } from "../src/execute-rmn-inference.mjs";

const CUSTOMER_ACCOUNT = "eip155:31337:0x3333333333333333333333333333333333333333";

const id = (label) => `ni:///sha-256;${createHash("sha256").update(label).digest("base64url")}`;
const RMN_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../relational-model-services-section/services/relational-model-notation-services-section/services/rmn-conformance-service");
const WITNESS_JOURNAL_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../../../../../lenticule-science/services/obsmetrological-services-section/services/witness-journal-rdf-projection-service");
const WIT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../../../../../lenticule-science/services/obsmetrological-services-section/services/wit-transition-assay");
const { startWitTransitionAssayProcess } = await import(`${WIT_ROOT}/src/test-provider.mjs`);
let rmnServer, witnessJournalServer, witServer;

function invoke(term, expectedType) {
  const result = assay({ term, expectedType, fuel: 0 });
  return { term: semanticId(result.normalizedTerm), canonicalBytesBase64: semanticBytes(result.normalizedTerm).toString("base64") };
}

before(async () => {
  const socket = createServer(); await new Promise((accept) => socket.listen(0, "127.0.0.1", accept));
  const port = socket.address().port; await new Promise((accept) => socket.close(accept));
  const baseUrl = `http://127.0.0.1:${port}`;
  rmnServer = await serveContractedAgent({ port, host: "127.0.0.1", baseUrl,
    agentCard: resolve(RMN_ROOT, "content/agent-cards/rmn-semantic-conformance.json"),
    executor: process.execPath, executorArgs: [resolve(RMN_ROOT, "bin/execute-a2a-task.mjs")], timeoutMs: 10_000,
    ...ephemeralAgentCardSigning(baseUrl, "npu-rmn-test") });
  process.env.RMN_CONFORMANCE_AGENT = `${baseUrl}/.well-known/agent-card.json`;
  const witnessJournalSocket = createServer(); await new Promise((accept) => witnessJournalSocket.listen(0, "127.0.0.1", accept));
  const witnessJournalPort = witnessJournalSocket.address().port; await new Promise((accept) => witnessJournalSocket.close(accept));
  const witnessJournalBase = `http://127.0.0.1:${witnessJournalPort}`;
  witnessJournalServer = await serveContractedAgent({ port: witnessJournalPort, host: "127.0.0.1", baseUrl: witnessJournalBase,
    agentCard: resolve(WITNESS_JOURNAL_ROOT, "content/agent-cards/witness-journal-rdf.json"),
    executor: process.execPath, executorArgs: [resolve(WITNESS_JOURNAL_ROOT, "bin/execute-a2a-task.mjs")], timeoutMs: 10_000,
    ...ephemeralAgentCardSigning(witnessJournalBase, "npu-witness-journal-test") });
  process.env.WITNESS_JOURNAL_RDF_AGENT = `${witnessJournalBase}/.well-known/agent-card.json`;
  witServer = await startWitTransitionAssayProcess({ witnessJournalAgentUrl: process.env.WITNESS_JOURNAL_RDF_AGENT });
  process.env.WIT_TRANSITION_ASSAY_AGENT = witServer.agentCardUrl;
});
after(async () => { delete process.env.RMN_CONFORMANCE_AGENT; delete process.env.WITNESS_JOURNAL_RDF_AGENT; delete process.env.WIT_TRANSITION_ASSAY_AGENT; await witServer.close(); await new Promise((accept) => witnessJournalServer.server.close(accept)); await new Promise((accept) => rmnServer.server.close(accept)); });

test("the provider enforces its one-lot capacity locally without queueing", () => {
  const prior = process.env.NPU_CAPACITY_LOCK;
  const root = mkdtempSync(join(tmpdir(), "npu-capacity-"));
  process.env.NPU_CAPACITY_LOCK = join(root, "execution.lock");
  const lease = acquireNpuCapacity();
  try { assert.throws(() => acquireNpuCapacity(), /concurrency bound is occupied/u); }
  finally {
    releaseNpuCapacity(lease);
    if (prior === undefined) delete process.env.NPU_CAPACITY_LOCK; else process.env.NPU_CAPACITY_LOCK = prior;
    rmSync(root, { recursive: true, force: true });
  }
});

test("dry-run settles one typed local-silicon effect as an exact positive FOUR cover", async () => {
  const input = JSON.stringify({ workType: "classification", context: { suppliedContext: "A finite input" }, executionBounds: { maximumOutputTokens: 64, sourceMeasures: { words: 3, characters: 14 } }, outputContract: { format: "json" } });
  const operation = ["pair", ["mark", "Classify briefly."], ["pair", ["mark", input], ["pair", ["mark", "qwen3:1.7b"], ["mark", "dry-run"]]]];
  const op = invoke(operation, OPERATION_TYPE);
  const cell = { law: LAW, caller: CUSTOMER_ACCOUNT, provider: ACCOUNT, precondition: id("pre"), operation: op.term, postcondition: id("post"), refusal: id("refusal"), evidenceRoot: id("bottom"), outcome: { positiveEvidence: false, negativeEvidence: false }, measures: [], parent: null };
  const bundle = ["pair", ["effect", cell], operation];
  const receipt = invoke(bundle, ["product", ["effect"], OPERATION_TYPE]);
  const prior = process.env.NPU_WITNESS_JOURNAL_ROOT; process.env.NPU_WITNESS_JOURNAL_ROOT = mkdtempSync(join(tmpdir(), "npu-witness-journal-"));
  try {
    const result = await executeMessage({ messageId: "m", role: "ROLE_USER", parts: [{ raw: receipt.canonicalBytesBase64, metadata: { ni: receipt.term }, filename: "proposal.rmn.cbor", mediaType: "application/rmn+cbor" }], metadata: {} });
    assert.equal(result.role, "ROLE_AGENT"); assert.equal(result.metadata.disposition, "completion");
    assert.equal(result.parts.find((part) => part.mediaType === "text/plain").text, "ready");
    assert.match(result.metadata.witnessNi, /^ni:\/\/\/sha-256;/u);
  } finally { if (prior === undefined) delete process.env.NPU_WITNESS_JOURNAL_ROOT; else process.env.NPU_WITNESS_JOURNAL_ROOT = prior; }
});

test("unsupported model is a witnessed refusal rather than an untyped crash", async () => {
  const operation = ["pair", ["mark", "Classify."], ["pair", ["mark", "input"], ["pair", ["mark", "not-offered"], ["mark", "dry-run"]]]];
  const op = invoke(operation, OPERATION_TYPE);
  const cell = { law: LAW, caller: CUSTOMER_ACCOUNT, provider: ACCOUNT, precondition: id("pre2"), operation: op.term, postcondition: id("post2"), refusal: id("refusal2"), evidenceRoot: id("bottom2"), outcome: { positiveEvidence: false, negativeEvidence: false }, measures: [], parent: null };
  const receipt = invoke(["pair", ["effect", cell], operation], ["product", ["effect"], OPERATION_TYPE]);
  const prior = process.env.NPU_WITNESS_JOURNAL_ROOT; process.env.NPU_WITNESS_JOURNAL_ROOT = mkdtempSync(join(tmpdir(), "npu-refusal-witness-journal-"));
  try { const result = await executeMessage({ messageId: "m2", role: "ROLE_USER", parts: [{ raw: receipt.canonicalBytesBase64, metadata: { ni: receipt.term }, mediaType: "application/rmn+cbor" }], metadata: {} }); assert.equal(result.metadata.disposition, "refused"); }
  finally { if (prior === undefined) delete process.env.NPU_WITNESS_JOURNAL_ROOT; else process.env.NPU_WITNESS_JOURNAL_ROOT = prior; }
});
