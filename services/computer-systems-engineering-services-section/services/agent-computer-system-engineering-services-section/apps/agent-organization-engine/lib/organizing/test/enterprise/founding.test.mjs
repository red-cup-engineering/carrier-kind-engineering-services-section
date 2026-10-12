import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { readAgency } from "../../src/agency/index.mjs";
import { readAgencyActs } from "../../src/agency/acts.mjs";
import { agencyPools } from "../../src/agency/index.mjs";
import { enterpriseRecord, incumbentsOf } from "../../src/agency/governing.mjs";
import { playerOfAct } from "../../src/agency/cast.mjs";
import { foundByDemand, foundingDemandOf, verifierSeatingRefusalsOf } from "../../src/enterprise/founding.mjs";

// A fixture agency: one micro-enterprise, acme, listing a producer office and the only verifier
// office it has (black), which is also the producer of the delivery that awaits verification.
const put = (root, section, pool, record) => {
  const dir = path.join(root, section, "lib", "agency", pool);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, `${record.id}.json`), `${JSON.stringify(record, null, 2)}\n`);
};
function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), "founding-"));
  put(root, "acme", "skills", { id: "assure", name: "Assure", "requires-capabilities": [], method: "Examine the delivery against its conditions." });
  put(root, "acme", "offices", { id: "lead", name: "Lead", kind: "office", jurisdiction: "engineering", "bears-duty": [], "provides-skill": ["assure"], "deontic-profile": {}, "normative-structure": "Leads." });
  put(root, "acme", "offices", { id: "assurer", name: "Assurer", kind: "office", jurisdiction: "engineering", "bears-duty": [], "provides-skill": ["assure"], "deontic-profile": {}, verifies: "black", "normative-structure": "Examines." });
  put(root, "acme", "enterprises", { id: "acme", name: "Acme", kind: "micro-enterprise", offices: ["lead", "assurer"], head: "lead" });
  return root;
}
const delivered = (producer, extra = {}) => ({ threads: [{ id: "ni:///sha-256;demand-one", home: "acme", standing: "delivered", opening: { move: "request", need: "Ship it.", ...extra }, deliveries: [{ player: producer, at: "2026-10-03T00:00:00.000Z" }] }] });
const TURN = playerOfAct(undefined, { player: { by: "acme", bearer: "acme", hand: "bare-cedar-fog:enterprise-loop" } });

test("a verifier refusal at home with an enterprise is founding demand; it is the refusal that states it", () => {
  const root = fixture();
  try {
    const agency = readAgency(root, { acts: [], pools: agencyPools(root) });
    const acme = enterpriseRecord(agency, "acme");
    const [refusal] = verifierSeatingRefusalsOf(agency, acme, delivered("acme#assurer"));
    assert.equal(refusal.role, "black");
    assert.match(refusal.reason, /acme#assurer's own/u);
    assert.deepEqual(verifierSeatingRefusalsOf(agency, acme, delivered("acme#lead")), [], "a distinct producer leaves nothing to found");
    assert.deepEqual(foundingDemandOf(agency, acme, { board: delivered("acme#lead") }).map((d) => d.charge), []);
  } finally { rmSync(root, { recursive: true }); }
});

test("the enterprise's own turn founds the missing verifier office by act, once, with its player and evidence, and seats no one", () => {
  const root = fixture();
  const log = path.join(root, "acts.jsonl");
  const read = () => readAgency(root, { acts: readAgencyActs(log), pools: agencyPools(root) });
  const board = delivered("acme#assurer");
  try {
    const first = foundByDemand({ root, read, enterprise: "acme", board, player: TURN, at: "2026-10-03T12:00:00.000Z", log });
    assert.deepEqual(first.map((entry) => [entry.office, entry.charge]), [["acme#acme-black-verifier", "verifies:black"]]);
    const agency = read();
    const office = agency.offices.get("acme#acme-black-verifier");
    assert.equal(office.authored.verifies, "black");
    assert.equal(office.authored["reports-to"], "lead");
    assert.ok(agency.duties.has("acme#acme-black-verifier") && agency.works.has("acme#acme-black-verifier"));
    assert.ok(enterpriseRecord(agency, "acme").authored.offices.includes("acme-black-verifier"), "the enterprise lists what it founded");
    const act = office.authored["last-governance-act"];
    assert.equal(act.kind, "enterprise-found");
    assert.equal(act.rule, "demand");
    assert.deepEqual(act.player, { by: "acme", bearer: "acme", hand: "bare-cedar-fog:enterprise-loop" });
    assert.ok(act.evidence.includes("ni:///sha-256;demand-one"), "the demand's thread is the evidence");
    assert.equal(act.authority, "decision:acme");
    // Founded, not seated: no incumbency was told, the seat is open until someone does its work.
    assert.equal(agency.incumbencies.size, 0);
    assert.deepEqual(incumbentsOf(agency, enterpriseRecord(agency, "acme")).find((o) => o.id === "acme-black-verifier").seated, []);
    // A second turn finds the demand answered and founds nothing twice.
    const actsBefore = readAgencyActs(log).length;
    assert.deepEqual(foundByDemand({ root, read, enterprise: "acme", board, player: TURN, at: "2026-10-03T12:10:00.000Z", log }), []);
    assert.equal(readAgencyActs(log).length, actsBefore);
    assert.deepEqual(verifierSeatingRefusalsOf(read(), enterpriseRecord(read(), "acme"), board), [], "the refusal is gone once a distinct office is listed");
  } finally { rmSync(root, { recursive: true }); }
});

test("unhomed ground that names a verifier colour the enterprise lacks founds that colour, the same way", () => {
  const root = fixture();
  const log = path.join(root, "acts.jsonl");
  const read = () => readAgency(root, { acts: readAgencyActs(log), pools: agencyPools(root) });
  try {
    const ground = [{ id: "ni:///sha-256;ground-one", opening: { move: "request", need: "A blue review of the release.", verifiers: ["blue"] } }];
    const founded = foundByDemand({ root, read, enterprise: "acme", board: { threads: [] }, ground, player: TURN, at: "2026-10-03T12:00:00.000Z", log });
    assert.deepEqual(founded.map((entry) => entry.charge), ["verifies:blue"]);
    assert.ok(read().offices.get("acme#acme-blue-verifier").authored["last-governance-act"].evidence.includes("ni:///sha-256;ground-one"));
  } finally { rmSync(root, { recursive: true }); }
});
