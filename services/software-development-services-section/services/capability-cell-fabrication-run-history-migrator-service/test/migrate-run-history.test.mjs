import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  mkdtempSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { semanticBytes, semanticId } from "@red-cup-engineering/rmn-semantic-conformance";
import { relationalRwilDocument } from "@lenticule-science/witness-journal-rdf-projection-service/client";
import { createProofPoreJournal } from "@red-cup-engineering/acceptance-capsule-procurement-service/proof-pore-journal";
import { migrateFabricationRunHistory } from "../src/migrate-run-history.mjs";
import {
  migrateAcceptanceAssayCarrierObstructions,
  migrateAcceptancePulseProofPore,
} from "../src/migrate-acceptance-pulse-proof-pore.mjs";

const run = "11111111-1111-4111-8111-111111111111";

function legacyEvent(sequence, body, prior) {
  const eventBody = {
    run,
    sequence,
    at: `2026-07-25T00:00:0${sequence}.000Z`,
    previous: prior.at(-1)?.id ?? null,
    ...body,
  };
  return {
    id: `ni:///sha-256;${createHash("sha256")
      .update(JSON.stringify(eventBody))
      .digest("base64url")}`,
    ...eventBody,
  };
}

test("writes canonical replacement histories and a full identity mapping without changing source", () => {
  const root = mkdtempSync(join(tmpdir(), "fabrication-run-migration-"));
  const source = join(root, "legacy-runs");
  const target = join(root, "canonical");
  const receipt = join(root, "receipts", "migration.json");
  mkdirSync(source);
  const events = [];
  events.push(legacyEvent(0, { type: "demand-submitted", demand: { capability: "test" } }, events));
  events.push(legacyEvent(1, {
    type: "customer-invocation-recovered",
    stage: "execute",
    resultUrl: "https://example.test/result/1",
  }, events));
  const sourceBytes = `${events.map((event) => JSON.stringify(event)).join("\n")}\n`;
  writeFileSync(join(source, `${run}.jsonl`), sourceBytes);

  const result = migrateFabricationRunHistory({
    sourceRuns: source,
    targetRoot: target,
    receiptPath: receipt,
    migratedAt: "2026-07-25T00:01:00.000Z",
  });
  assert.equal(readFileSync(join(source, `${run}.jsonl`), "utf8"), sourceBytes);
  assert.equal(result.runs[0].headBefore, events[1].id);
  assert.notEqual(result.runs[0].headAfter, events[1].id);
  assert.equal(result.runs[0].events.length, 2);
  const migrated = readFileSync(join(target, "runs", `${run}.jsonl`), "utf8")
    .trim().split("\n").map(JSON.parse);
  for (const [index, event] of migrated.entries()) {
    const { id, ...body } = event;
    assert.equal(id, semanticId(relationalRwilDocument(body)));
    assert.equal(event.previous, index === 0 ? null : migrated[index - 1].id);
    const carrierIdentity = result.runs[0].carriers[index].carrier;
    assert.equal(carrierIdentity, semanticId(relationalRwilDocument(event)));
    const digest = carrierIdentity.slice("ni:///sha-256;".length);
    const carrier = readFileSync(join(target, "rmn", "sha-256", digest.slice(0, 2), `${digest}.rmn.cbor`));
    assert.deepEqual(carrier, semanticBytes(relationalRwilDocument(event)));
  }
  assert.equal(result.runs[0].carriers.length, 2);
  assert.equal(result.runs[0].carriers[1].event, result.runs[0].headAfter);
  assert.equal(JSON.parse(readFileSync(receipt, "utf8")).id, result.id);
  const { id: _receiptId, ...receiptBody } = result;
  assert.equal(result.id, semanticId(relationalRwilDocument(receiptBody)));
  assert.throws(() => migrateFabricationRunHistory({
    sourceRuns: source,
    targetRoot: target,
    receiptPath: receipt,
    migratedAt: "2026-07-25T00:02:00.000Z",
  }), /target already exists/u);
});

test("applies only exact expected-before data corrections and receipts them", () => {
  const root = mkdtempSync(join(tmpdir(), "fabrication-run-correction-"));
  const source = join(root, "source"), target = join(root, "target"), receiptPath = join(root, "receipt.json");
  mkdirSync(source);
  const events = [];
  events.push(legacyEvent(0, {
    type: "demand-submitted",
    demand: { fabricationMission: { verifyCommand: "node --test \\\"quoted words\\\"" } },
  }, events));
  writeFileSync(join(source, `${run}.jsonl`), `${JSON.stringify(events[0])}\n`);
  const corrections = [{
    run,
    sequence: 0,
    path: ["demand", "fabricationMission", "verifyCommand"],
    expected: "node --test \\\"quoted words\\\"",
    replacement: "node --test \"quoted words\"",
  }];
  const receipt = migrateFabricationRunHistory({
    sourceRuns: source,
    targetRoot: target,
    receiptPath,
    migratedAt: "2026-07-25T00:03:00.000Z",
    corrections,
  });
  const migrated = JSON.parse(readFileSync(join(target, "runs", `${run}.jsonl`), "utf8"));
  assert.equal(migrated.demand.fabricationMission.verifyCommand, "node --test \"quoted words\"");
  assert.deepEqual(receipt.corrections, corrections);
});

test("separates overloaded stage laws by observed behavior and preserves unresolved plans", () => {
  const root = mkdtempSync(join(tmpdir(), "fabrication-run-stage-law-"));
  const source = join(root, "source"), target = join(root, "target"), receiptPath = join(root, "receipt.json");
  mkdirSync(source);
  const events = [];
  events.push(legacyEvent(0, { type: "demand-submitted", demand: { capability: "test" } }, events));
  events.push(legacyEvent(1, {
    type: "stage-completed",
    stage: "fabrication-plan",
    result: {
      stages: ["fabrication-plan", "public-package"],
      priorKnowledge: [{
        obstruction: "public-package:absent",
        evidence: { url: "https://registry.npmjs.org/%40scope%2Fcell/0.1.0", status: 404 },
      }],
    },
  }, events));
  events.push(legacyEvent(2, { type: "stage-started", stage: "public-package" }, events));
  events.push(legacyEvent(3, {
    type: "stage-obstructed",
    stage: "public-package",
    obstruction: "public-package:absent",
    evidence: { observation: { url: "https://registry.npmjs.org/%40scope%2Fcell/0.1.0", status: 404 } },
  }, events));
  events.push(legacyEvent(4, {
    type: "trajectory-learned",
    stage: "public-package",
    knowledge: {
      obstruction: "public-package:absent",
      evidence: { url: "https://registry.npmjs.org/%40scope%2Fcell/0.1.0", status: 404 },
    },
  }, events));
  events.push(legacyEvent(5, { type: "stage-started", stage: "public-package" }, events));
  events.push(legacyEvent(6, {
    type: "stage-completed",
    stage: "public-package",
    result: { observation: { package: "@scope/cell", version: "0.1.0", entrypoints: ["./bin/run.mjs"], missing: [] } },
  }, events));
  writeFileSync(join(source, `${run}.jsonl`), `${events.map(JSON.stringify).join("\n")}\n`);
  const stageLawMigrations = [
    {
      from: "public-package",
      to: "npm-registry-package-observation",
      unresolvedTo: "historical-public-package-law-unresolved",
      when: { observationUrlPrefix: "https://registry.npmjs.org/" },
    },
    {
      from: "public-package",
      to: "runnable-package-assay",
      unresolvedTo: "historical-public-package-law-unresolved",
      when: { requiredObservationFields: ["package", "version", "entrypoints", "missing"] },
    },
  ];
  const receipt = migrateFabricationRunHistory({
    sourceRuns: source,
    targetRoot: target,
    receiptPath,
    migratedAt: "2026-07-25T00:04:00.000Z",
    stageLawMigrations,
  });
  const migrated = readFileSync(join(target, "runs", `${run}.jsonl`), "utf8")
    .trim().split("\n").map(JSON.parse);
  assert.deepEqual(migrated[1].result.stages, ["fabrication-plan", "historical-public-package-law-unresolved"]);
  assert.equal(migrated[1].result.priorKnowledge[0].obstruction, "npm-registry-package-observation:absent");
  assert.equal(migrated[2].stage, "npm-registry-package-observation");
  assert.equal(migrated[3].stage, "npm-registry-package-observation");
  assert.equal(migrated[3].obstruction, "npm-registry-package-observation:absent");
  assert.equal(migrated[4].stage, "npm-registry-package-observation");
  assert.equal(migrated[4].knowledge.obstruction, "npm-registry-package-observation:absent");
  assert.equal(migrated[5].stage, "runnable-package-assay");
  assert.equal(migrated[6].stage, "runnable-package-assay");
  assert.deepEqual(receipt.stageLawMigrations, stageLawMigrations);
});

test("migrates a stage whose behavioral evidence is the direct result carrier", () => {
  const root = mkdtempSync(join(tmpdir(), "fabrication-run-direct-result-law-"));
  const source = join(root, "source"), target = join(root, "target"), receiptPath = join(root, "receipt.json");
  mkdirSync(source);
  const events = [];
  events.push(legacyEvent(0, { type: "demand-submitted", demand: { capability: "test" } }, events));
  events.push(legacyEvent(1, { type: "stage-started", stage: "capability-extraction" }, events));
  events.push(legacyEvent(2, {
    type: "stage-completed",
    stage: "capability-extraction",
    result: { package: "@scope/cell", version: "1.0.0", operation: "test" },
  }, events));
  events.push(legacyEvent(3, {
    type: "stage-completed",
    stage: "fabrication-plan",
    result: { stages: ["capability-extraction", "fabrication-plan"] },
  }, events));
  writeFileSync(join(source, `${run}.jsonl`), `${events.map(JSON.stringify).join("\n")}\n`);
  migrateFabricationRunHistory({
    sourceRuns: source,
    targetRoot: target,
    receiptPath,
    migratedAt: "2026-07-25T00:05:00.000Z",
    stageLawMigrations: [{
      from: "capability-extraction",
      to: "capability-law-assay",
      unresolvedTo: "historical-capability-extraction-law-unresolved",
      when: { requiredObservationFields: ["package", "version", "operation"] },
    }],
  });
  const migrated = readFileSync(join(target, "runs", `${run}.jsonl`), "utf8")
    .trim().split("\n").map(JSON.parse);
  assert.equal(migrated[1].stage, "capability-law-assay");
  assert.equal(migrated[2].stage, "capability-law-assay");
  assert.deepEqual(migrated[3].result.stages, ["capability-law-assay", "fabrication-plan"]);
});

test("dries repeated pulse deliveries into one material proof-pore response and receipted ballast", () => {
  const root = mkdtempSync(join(tmpdir(), "acceptance-pulse-migration-"));
  const exchangeRoot = join(root, "services", "example-inference-team", "content", "exchanges");
  mkdirSync(exchangeRoot, { recursive: true });
  const subject = "urn:test:acceptance-subject";
  const path = "union-acceptance/example.test.mjs";
  const source = (pulse, recordedAt, text) => ({
    recordedAt,
    outcome: "completion",
    packet: { messages: [{ role: "system", content: "s" }, { role: "user", content: JSON.stringify({
      workLot: { id: `${subject}:acceptance-supplier:pulse:${pulse}` },
      outputContract: { format: "projected", projection: { type: "single-source-artifact", path } },
    }) }] },
    completion: { text: `\`\`\`js\n${text}\n\`\`\`` },
  });
  const late = join(exchangeRoot, "exchange-late.json"), early = join(exchangeRoot, "exchange-early.json");
  writeFileSync(late, JSON.stringify(source(2, "2026-07-25T00:00:02.000Z", "export const later = true;")));
  writeFileSync(early, JSON.stringify(source(1, "2026-07-25T00:00:01.000Z", "export const earlier = true;")));
  const receiptPath = join(root, "receipt.json"), targetRoot = join(root, "target");
  const receipt = migrateAcceptancePulseProofPore({
    subject,
    exchangePaths: [late, early],
    targetRoot,
    receiptPath,
    migratedAt: "2026-07-25T00:01:00.000Z",
  });
  assert.equal(receipt.sourceCount, "2");
  assert.equal(receipt.ballastSources.length, 1);
  const journalPath = readdirSync(join(targetRoot, "proof-pores")).map((name) => join(targetRoot, "proof-pores", name))[0];
  const events = readFileSync(journalPath, "utf8").trim().split("\n").map(JSON.parse);
  assert.deepEqual(events.map(({ transition }) => transition), [
    "supplier-demanded",
    "supplier-delivered",
    "legacy-supplier-delivered-ballast",
  ]);
  assert.match(events[1].supplied.artifact.text, /earlier/u);
  assert.throws(() => migrateAcceptancePulseProofPore({
    subject,
    exchangePaths: [early],
    targetRoot,
    receiptPath: join(root, "second-receipt.json"),
    migratedAt: "2026-07-25T00:02:00.000Z",
  }), /already contains material/u);
});

test("reclassifies only exact carrier obstructions without rewriting assay history", () => {
  const root = mkdtempSync(join(tmpdir(), "acceptance-assay-reclassification-"));
  const targetRoot = join(root, "target"), subject = "urn:test:acceptance:carrier-obstruction";
  const journal = createProofPoreJournal({ root: targetRoot, now: () => "2026-07-25T00:00:00.000Z" });
  const candidate = "ni:///sha-256;candidate";
  const source = journal.append(subject, {
    transitionKey: `assay-refused:${candidate}`,
    transition: "assay-refused",
    pore: "assay",
    polarity: "negative",
    candidate,
    residue: { reason: "unsupported RMN value [object Undefined]", oracleAssay: null },
  });
  const receipt = migrateAcceptanceAssayCarrierObstructions({
    subject,
    targetRoot,
    expectedRefusals: [{ candidate, reason: "unsupported RMN value [object Undefined]" }],
    receiptPath: join(root, "receipt.json"),
    migratedAt: "2026-07-25T00:01:00.000Z",
  });
  const history = journal.read(subject);
  assert.equal(history[0].id, source.id);
  assert.equal(history[0].transition, "assay-refused");
  assert.equal(history[1].transition, "assay-refusal-reclassified");
  assert.equal(history[1].source, source.id);
  assert.equal(receipt.migrated[0].successor, history[1].id);
  assert.throws(() => migrateAcceptanceAssayCarrierObstructions({
    subject,
    targetRoot,
    expectedRefusals: [{ candidate, reason: "a different failure" }],
    receiptPath: join(root, "wrong.json"),
    migratedAt: "2026-07-25T00:02:00.000Z",
  }), /does not match/u);
});
