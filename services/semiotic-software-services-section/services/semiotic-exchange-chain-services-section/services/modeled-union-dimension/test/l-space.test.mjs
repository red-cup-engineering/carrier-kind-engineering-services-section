import assert from "node:assert/strict";
import test from "node:test";
import { EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/semantic-content-identify-service";
import { createCarrierAdmissionReceipt, createModeledUnionDimension, createNotebookLmLibraryQueryActuator, NOTEBOOK_PROVIDER } from "../src/index.mjs";
import { makeNiUri } from "@red-cup-engineering/ni-uri-services-section";

const ni = (value) => makeNiUri(Buffer.from(value, "utf8"));
const identify = (value) => identifyJsonSemanticContent({ objectKind: `modeled-union-dimension.${value?.type ?? "material"}`, value, witnessRoot: EMPTY_WITNESS_ROOT }).token;
const notebookRefNi = ni("private-provider-notebook-locator"), sourceSetNi = ni("notebook-source-set"), sourceA = ni("source-receipt-a"), sourceB = ni("source-receipt-b");
const catalogBody = Object.freeze({
  type: "NotebookLMLibraryCatalogReceipt", version: 1, provider: NOTEBOOK_PROVIDER,
  libraryReceiptNi: ni("live-library-observation"),
  notebooks: [{ notebookRefNi, sourceSetNi, sourceReceiptNis: [sourceA, sourceB], access: "query", witnessNis: [ni("notebook-observation")] }],
});
const catalog = Object.freeze({ id: identify(catalogBody), ...catalogBody });
const admission = createCarrierAdmissionReceipt({ carrier: { type: catalog.type, value: catalog }, protocolVerificationReceiptNis: [ni("notebook-catalog-protocol")] });
const ledger = { events: [], chainId: "eip155:5615610", exchange: "0x98bBC65824962b61dF876A47B5779C4EcBBD4939" };
const locus = `notebook:${notebookRefNi}`;

test("admitted notebook/library carriers project private, content-addressed L-space loci", () => {
  const dimension = createModeledUnionDimension({ ...ledger, carrierAdmissions: [admission] });
  const presentation = dimension.presentation();
  assert.equal(presentation.lSpace.loci[0].id, locus);
  assert.equal(presentation.lSpace.loci[0].sourceSetNi, sourceSetNi);
  assert.equal(presentation.lSpace.loci[0].sourceCount, 2);
  assert.equal(presentation.lSpace.authority.sourceContentsDisclosed, false);
  assert.doesNotMatch(JSON.stringify(presentation), /google\.com|providerNotebookId|credential|source contents/u);
});

test("a query move is restricted to a witnessed locus and unavailable with the exact provider obstruction", async () => {
  const dimension = createModeledUnionDimension({ ...ledger, carrierAdmissions: [admission], notebookQueryAvailability: { available: false, obstruction: "notebooklm-provider-credentials-unavailable" } });
  assert.equal(dimension.restrictedLSpaceArena("did:key:zResearcher", { locus: "notebook:absent", question: "What changed?" }).actions.length, 0);
  const action = dimension.restrictedLSpaceArena("did:key:zResearcher", { locus, question: "What changed?" }).actions[0];
  assert.equal(action.available, false);
  assert.equal(action.unavailability, "notebooklm-provider-credentials-unavailable");
  await assert.rejects(() => dimension.queryLSpace({ actor: "did:key:zResearcher", locus, question: "What changed?" }), (error) => error.code === "MUD_LSPACE_QUERY_UNAVAILABLE" && /credentials-unavailable/u.test(error.message));
});

test("the existing provider path settles a citation-bound advisory receipt whose evidence joins FOUR", async () => {
  const calls = [];
  const actuator = async (request) => {
    calls.push(request);
    return {
      provider: NOTEBOOK_PROVIDER, providerOperationReceiptNi: ni("notebooklm-live-ask-receipt"),
      answer: "The witnessed sources contain supporting and contradicting observations.",
      citations: [
        { sourceReceiptNi: sourceA, providerCitation: "provider-citation-1" },
        { sourceReceiptNi: sourceB, providerCitation: "provider-citation-2" },
      ],
      claims: [
        { polarity: "positive", statement: "support was observed", sourceReceiptNis: [sourceA] },
        { polarity: "negative", statement: "a contradiction was observed", sourceReceiptNis: [sourceB] },
      ],
    };
  };
  const live = createModeledUnionDimension({ ...ledger, carrierAdmissions: [admission], notebookQueryActuator: actuator });
  const action = live.restrictedLSpaceArena("did:key:zResearcher", { locus, question: "What does the source set support?" }).actions[0];
  assert.equal(action.available, true);
  const receipt = await live.queryLSpace({ actor: "did:key:zResearcher", locus, question: "What does the source set support?" });
  assert.equal(calls.length, 1);
  assert.equal(receipt.authority.truth, false);
  assert.equal(receipt.authority.mutation, false);
  assert.equal(receipt.sourceSetNi, sourceSetNi);
  assert.deepEqual(receipt.citations.map(({ sourceReceiptNi }) => sourceReceiptNi), [sourceA, sourceB]);
  const replay = createModeledUnionDimension({ ...ledger, carrierAdmissions: [admission], notebookQueryReceipts: [receipt] });
  assert.equal(replay.presentation().lSpace.loci[0].support.charge, "stable");
  assert.equal(replay.presentation().lSpace.loci[0].support.positiveEvidence.length, 1);
  assert.equal(replay.presentation().lSpace.loci[0].support.negativeEvidence.length, 1);
});

test("citation references cannot escape the admitted source set", async () => {
  const dimension = createModeledUnionDimension({ ...ledger, carrierAdmissions: [admission], notebookQueryActuator: async () => ({
    provider: NOTEBOOK_PROVIDER, providerOperationReceiptNi: ni("operation"), answer: "unsupported", citations: [{ sourceReceiptNi: ni("outside-source"), providerCitation: "citation" }], claims: [{ polarity: "positive", statement: "claim", sourceReceiptNis: [ni("outside-source")] }],
  }) });
  await assert.rejects(() => dimension.queryLSpace({ actor: "did:key:zResearcher", locus, question: "Escape?" }), /citation escapes the witnessed notebook source set/u);
});

test("the adapter invokes the inference team's existing live-library path without emitting private provider locators", async () => {
  const actuator = createNotebookLmLibraryQueryActuator({
    resolvePrivateBinding: async () => ({ notebookId: "provider-secret-notebook-id", sourceBindings: [{ providerReference: "source-1", sourceReceiptNi: sourceA }] }),
    askLiveNotebook: async ({ notebookId, question }) => {
      assert.equal(notebookId, "provider-secret-notebook-id"); assert.equal(question, "Cheap context query?");
      return { type: "NotebookLMLiveAnswer", authority: "source-grounded-provider-answer-not-execution-or-governance-authority", answer: { answer: "cited provider answer", references: ["source-1"] }, observedAt: "2026-07-29T00:00:00.000Z" };
    },
    classifyEvidence: ({ citations }) => [{ polarity: "positive", statement: "the source supports the answer", sourceReceiptNis: [citations[0].sourceReceiptNi] }],
  });
  const dimension = createModeledUnionDimension({ ...ledger, carrierAdmissions: [admission], notebookQueryActuator: actuator });
  const receipt = await dimension.queryLSpace({ actor: "did:key:zResearcher", locus, question: "Cheap context query?" });
  assert.equal(receipt.response.text, "cited provider answer");
  assert.doesNotMatch(JSON.stringify(receipt), /provider-secret-notebook-id|source-1/u);
});
