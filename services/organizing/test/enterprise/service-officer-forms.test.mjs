import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { readAgency, officeReading } from "../../src/agency/index.mjs";
import { foundingOf, governingRight } from "../../src/agency/governing.mjs";
import { enactAgencyRecords } from "../../src/agency/records.mjs";
import { instantiateAgencyForm } from "../../src/agency/forms.mjs";

const sourceForms = path.resolve("lib/emsenn/services/561-group/services/561-group-services-section/lib/agency/forms");
const put = (root, section, pool, id, record) => {
  const dir = path.join(root, section, "lib/agency", pool);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, id + ".json"), JSON.stringify({ id, name: id, ...record }));
};
function fixture() {
  const root = mkdtempSync(path.join(os.tmpdir(), "coesite-officers-"));
  for (const rank of ["senior", "junior"]) put(root, "coesite-section", "forms", rank + "-service-officer",
    JSON.parse(readFileSync(path.join(sourceForms, rank + "-service-officer.json"))));
  for (const section of ["engineering-services-section", "science-services-section"]) {
    put(root, section, "offices", "lead", { kind: "office", jurisdiction: section, "normative-structure": "Accountable line office", "deontic-profile": {} });
    put(root, section, "skills", "method", { "requires-capabilities": [], method: "The section's actual specialized method." });
    put(root, section, "enterprises", "enterprise", { offices: ["lead"], head: "lead" });
  }
  return root;
}
function found(root, section, rank, id, reportsTo) {
  const agency = readAgency(root, { acts: [] }), enterprise = agency.enterprises.get(section + "#enterprise");
  const entries = foundingOf(agency, enterprise, {
    office: { id, name: id, rank, "reports-to": reportsTo, "normative-structure": "Specialized " + section + " transformation." },
    duty: { "receiver-condition": "A distinct qualified " + section + " receiver observes the consumer." },
    work: { from: "An authorized allocation for " + section, to: "Witnessed " + section + " outcome", cost: "Its admitted resource units" },
    skill: section + "#method",
  });
  assert.deepEqual(entries.map((entry) => entry.pool), ["duties", "offices", "enterprises"]);
  enactAgencyRecords({ root, entries, log: undefined, act: { kind: "enterprise-found", at: "2026-10-04T20:00:00Z", evidence: ["fixture:allocated-contract"] },
    authorize: ({ agency, ...entry }) => governingRight(agency, agency.enterprises.get(enterprise.key), entry, { bearer: "doer", doers: ["doer"] }) });
  return readAgency(root, { acts: [] });
}

test("Coesite forms Senior and Junior across sections through the governing carrier, preserving separate contracts and creating no seats", () => {
  const root = fixture();
  try {
    found(root, "engineering-services-section", "senior", "senior");
    found(root, "science-services-section", "senior", "senior");
    const agency = found(root, "engineering-services-section", "junior", "junior", "engineering-services-section#senior");
    const engineering = officeReading(agency, "engineering-services-section#senior");
    const science = officeReading(agency, "science-services-section#senior");
    const junior = officeReading(agency, "engineering-services-section#junior");
    assert.equal(engineering.formation.form, science.formation.form);
    assert.notEqual(engineering.works[0].to, science.works[0].to);
    assert.equal(junior.relationships["reports-to"][0].office, engineering.office);
    assert.deepEqual(engineering.unresolved, []);
    assert.deepEqual(science.unresolved, []);
    assert.equal(agency.incumbencies.size, 0);
    assert.equal(agency.works.get("engineering-services-section#senior").derivedFrom, "engineering-services-section#senior");
    assert.equal(agency.problems.length, 0);
    const revision = agency.revision;
    const form = JSON.parse(readFileSync(path.join(root, "coesite-section/lib/agency/forms/senior-service-officer.json")));
    form.offices["normative-structure"].$join.unshift("A corrected common Senior obligation.");
    put(root, "coesite-section", "forms", form.id, form);
    const changed = readAgency(root, { acts: [] });
    for (const section of ["engineering-services-section", "science-services-section"]) {
      const reading = officeReading(changed, section + "#senior");
      assert.ok(reading.normativeStructure.startsWith("A corrected common Senior obligation."));
      assert.equal(reading.works[0].to, officeReading(agency, section + "#senior").works[0].to);
    }
    assert.notEqual(changed.revision, revision);
  } finally { rmSync(root, { recursive: true }); }
});

test("a form cannot bypass the enterprise's grants or found a Junior under a nonexistent Senior", () => {
  const root = fixture();
  try {
    const agency = found(root, "engineering-services-section", "senior", "senior");
    const enterprise = agency.enterprises.get("engineering-services-section#enterprise");
    const binding = structuredClone(agency.offices.get("engineering-services-section#senior").authored);
    binding.parameters.positions = { "appoint-anyone": "deontic-power" };
    assert.throws(() => governingRight(agency, enterprise, {
      pool: "offices", source: "engineering-services-section/lib/agency/offices/senior.json",
      record: instantiateAgencyForm(agency, "offices", binding, "engineering-services-section"),
    }, { bearer: "doer", doers: ["doer"] }), /conveys duties only/);
    assert.throws(() => found(root, "science-services-section", "junior", "junior", "engineering-services-section#senior"), /own section/);
    binding.parameters.scope = 23;
    put(root, "engineering-services-section", "offices", "senior", binding);
    const invalid = readAgency(root, { acts: [] });
    assert.equal(invalid.offices.has("engineering-services-section#senior"), false);
    assert.ok(invalid.problems.some((problem) => problem.reason.includes("parameter scope")));
  } finally { rmSync(root, { recursive: true }); }
});
