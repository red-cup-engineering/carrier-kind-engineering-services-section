import assert from "node:assert/strict";
import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import { loadAcceptanceCapsule, materializeAcceptanceCapsule, prepareAcceptanceCapsule, validateAcceptanceCapsule } from "../../../src/becoming/doing/working/software-change/mission/acceptance-capsule.mjs";

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "union-acceptance-capsule-test-"));
  writeFileSync(join(root, "calc.mjs"), "export const add = (a, b) => a - b;\n");
  return root;
}

const vector = { id: "addition-vector", given: ["two and three"], when: "add is invoked", then: ["five is returned"], forbidden: ["subtraction"] };
const testText = [
  'import test from "node:test";',
  'import assert from "node:assert/strict";',
  'import { add } from "../calc.mjs";',
  'test("addition-vector", () => assert.equal(add(2, 3), 5));',
  "",
].join("\n");

test("an assayed assertion-red artifact seals as a content-addressed protected capsule", async () => {
  const territory = fixture();
  const capsule = await prepareAcceptanceCapsule({
    id: "urn:test:acceptance:addition", objective: "Protect the addition oracle.", territory,
    focusPaths: ["calc.mjs"], command: "node --test union-acceptance/addition.test.mjs",
    testVectors: [vector], artifacts: [{ path: "union-acceptance/addition.test.mjs", text: testText }],
  }, { assayOracle: async () => ({ charge: { support: true, refutation: false }, failures: [] }), now: () => "2026-07-19T00:00:00.000Z" });

  assert.deepEqual(capsule.redWitness.charge, { support: false, refutation: true });
  assert.match(capsule.redWitness.output, /addition-vector/);
  assert.match(capsule.digest, /^ni:\/\/\/sha-256;/);
  assert.equal(existsSync(join(territory, "union-acceptance/addition.test.mjs")), false);
  assert.equal(validateAcceptanceCapsule(capsule, { territory }), capsule);
  materializeAcceptanceCapsule(territory, capsule);
  assert.equal(existsSync(join(territory, "union-acceptance/addition.test.mjs")), true);
});

test("capsule preparation refuses network, environment, and clock-dependent oracle source", async () => {
  const territory = fixture();
  for (const denied of ['import "node:http";\n', 'process.env.MODE;\n', 'Date.now();\n']) {
    await assert.rejects(prepareAcceptanceCapsule({
      id: "urn:test:acceptance:denied", objective: "deny authority", territory, focusPaths: ["calc.mjs"],
      command: "node --test union-acceptance/denied.test.mjs", testVectors: [vector],
      artifacts: [{ path: "union-acceptance/denied.test.mjs", text: denied }],
    }, { assayOracle: async () => ({ charge: { support: true, refutation: false } }) }), /denied nondeterministic or authority-bearing capability/);
  }
});

test("the assay receives exact deterministic carrier fields", async () => {
  const territory = fixture();
  let assayedManifest;
  await prepareAcceptanceCapsule({
    id: "urn:test:acceptance:exact-assay-carrier", objective: "carry exact deterministic assay material", territory,
    focusPaths: ["calc.mjs"], command: "node --test union-acceptance/addition.test.mjs",
    testVectors: [vector], artifacts: [{ path: "union-acceptance/addition.test.mjs", text: testText }],
  }, { assayOracle: async ({ manifest }) => { assayedManifest = manifest; return { charge: { support: true, refutation: false }, failures: [] }; } });
  assert.deepEqual(Object.keys(assayedManifest).sort(), ["constraints", "id", "objective", "sourceEvidence", "testVectors"]);
  assert.ok(assayedManifest.sourceEvidence.every(({ path, digest, bytes }) => path && digest && Number.isSafeInteger(bytes)));
});

test("capsule validation refuses stale source evidence", async () => {
  const territory = fixture();
  const capsule = await prepareAcceptanceCapsule({
    id: "urn:test:acceptance:stale", objective: "detect stale source", territory, focusPaths: ["calc.mjs"],
    command: "node --test union-acceptance/addition.test.mjs", testVectors: [vector],
    artifacts: [{ path: "union-acceptance/addition.test.mjs", text: testText }],
  }, { assayOracle: async () => ({ charge: { support: true, refutation: false } }) });
  writeFileSync(join(territory, "calc.mjs"), "export const add = (a, b) => a + b;\n");
  assert.throws(() => validateAcceptanceCapsule(capsule, { territory }), /source is stale/);
});

test("capsule loader admits the procurement settlement envelope without a lossy projection", async () => {
  const territory = fixture();
  const capsule = await prepareAcceptanceCapsule({
    id: "urn:test:acceptance:settlement", objective: "load the settled protected oracle", territory, focusPaths: ["calc.mjs"],
    command: "node --test union-acceptance/addition.test.mjs", testVectors: [vector],
    artifacts: [{ path: "union-acceptance/addition.test.mjs", text: testText }],
  }, { assayOracle: async () => ({ charge: { support: true, refutation: false } }) });
  const settlementPath = join(territory, "acceptance-settlement.json");
  writeFileSync(settlementPath, JSON.stringify({ type: "AcceptanceProcurementSettlement", id: capsule.id, capsule }));

  assert.deepEqual(loadAcceptanceCapsule(settlementPath, { territory }), capsule);
});
