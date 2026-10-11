import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { agencyAt, coordinatingOffice } from "@red-cup-engineering/metroplat/offices";
import { agencyPools, readAgency } from "@red-cup-engineering/organizing/agency";
import { defaultFilesystemBinding } from "@red-cup-engineering/computer-system-engine/rpc/binding";
import { ANTIGRAVITY_DEFAULT_OFFICES, officeReach, servedOfficesOf } from "../src/agency-work.mjs";

// The house's own agency records, read from the repository this test lives in.
const here = path.dirname(fileURLToPath(import.meta.url));
const house = here.slice(0, here.indexOf(`${path.sep}services${path.sep}engineering-services-section`));
const agency = agencyAt(house);
const binding = defaultFilesystemBinding(mkdtempSync(path.join(tmpdir(), "carrier-reach-")));
const character = "actor:a-carrier-that-holds-no-seat";
const juniorKey = "services/engineering-services-section#junior-engineer";
const assuranceKey = "services/engineering-services-section#engineering-assurance-engineer";

test("a bounded carrier that holds no seat reaches nothing unless its deployment declares what it serves", () => {
  assert.deepEqual([...officeReach(binding, agency, character)], []);
});

test("the offices a carrier is declared to serve are its reach, so allocation can staff it for them", () => {
  const reach = officeReach(binding, agency, character, ANTIGRAVITY_DEFAULT_OFFICES);
  assert.ok(reach.has(juniorKey));
  assert.ok(reach.has(assuranceKey));
});

test("a served receiving office can receive an engineering delivery from the junior engineer without a seat or allocation", () => {
  assert.throws(() => coordinatingOffice(binding, character, "engineering-assurance-engineer", "work-discharge-admit"), /no held office/);
  const office = coordinatingOffice(binding, character, "engineering-assurance-engineer", "work-discharge-admit", binding, ANTIGRAVITY_DEFAULT_OFFICES);
  assert.ok(office.officeKey.endsWith(assuranceKey));
  assert.ok(office.receivesFrom.some((ref) => ref === "junior-engineer" || ref.endsWith(juniorKey)));
});

test("serving declares standing only for the offices named, and for the verbs they grant", () => {
  assert.throws(() => coordinatingOffice(binding, character, "junior-engineer", "work-discharge-admit", binding, ANTIGRAVITY_DEFAULT_OFFICES), /does not grant/);
  assert.throws(() => coordinatingOffice(binding, character, "engineering-assurance-engineer", "work-discharge-admit", binding, ["junior-engineer"]), /no held office/);
});

test("a carrier may serve offices by the role they bear: every verifier office, or those of one colour", () => {
  const verifiers = [...agency.offices.entries()].filter(([, office]) => typeof office.authored?.verifies === "string");
  assert.ok(verifiers.length > 0);
  assert.deepEqual([...servedOfficesOf(agency, ["verifies:*"])].sort(), verifiers.map(([key]) => key).sort());
  const black = servedOfficesOf(agency, ["verifies:black"]);
  assert.ok(black.some((key) => key.endsWith(assuranceKey)));
  assert.ok(!black.some((key) => key.endsWith(juniorKey)), "a role selects only offices bearing it");
  assert.deepEqual(servedOfficesOf(agency, ["verifies:no-such-colour"]), []);
  assert.ok(officeReach(binding, agency, character, ["verifies:black"]).has([...agency.offices.keys()].find((key) => key.endsWith(assuranceKey))));
});

test("served offices named by key resolve to themselves, so a resolved service reads the same again", () => {
  const keys = servedOfficesOf(agency, ANTIGRAVITY_DEFAULT_OFFICES);
  assert.deepEqual([...servedOfficesOf(agency, keys)].sort(), [...keys].sort());
});

test("an office in another house joins the reach only when that house's record names the edge back", () => {
  const lib = path.join(mkdtempSync(path.join(tmpdir(), "cross-house-reach-")), "lib");
  const GROUP = "emsenn/services/561-group/services/561-group-services-section";
  const ENGINEERING = "emsenn/services/561-group/services/engineering-services-section";
  const seat = (house, id, body) => { const dir = path.join(lib, house, "lib", "agency", "offices"); mkdirSync(dir, { recursive: true }); writeFileSync(path.join(dir, `${id}.json`), JSON.stringify({ id, name: id, kind: "office", ...body })); };
  seat(GROUP, "chief-engineering-officer", { "presides-over": [`${ENGINEERING}#senior-engineer`, `${ENGINEERING}#engineering-lead`] });
  seat(ENGINEERING, "senior-engineer", { "reports-to": `${GROUP}#chief-engineering-officer` });
  seat(ENGINEERING, "engineering-lead", {});
  const root = path.join(lib, GROUP);
  const firm = readAgency(root, { acts: [], pools: agencyPools(root) });
  const reach = officeReach(binding, firm, character, ["chief-engineering-officer"]);
  assert.ok(reach.has(`${ENGINEERING}#senior-engineer`), "named back in reports-to: reached");
  assert.ok(!reach.has(`${ENGINEERING}#engineering-lead`), "not named back: resolved, but grants nothing");
  assert.ok(!officeReach(binding, firm, character, [`${ENGINEERING}#engineering-lead`]).has(`${ENGINEERING}#engineering-lead`), "a cross-house serves entry with no office named back in served-by grants nothing");
});

test("a reached office in a section of the other house is keyed by its full address, section included", () => {
  const lib = path.join(mkdtempSync(path.join(tmpdir(), "cross-house-section-")), "lib");
  const GROUP = "emsenn/services/561-group/services/561-group-services-section";
  const ENGINEERING = "emsenn/services/561-group/services/engineering-services-section";
  const seat = (dir, id, body) => { mkdirSync(dir, { recursive: true }); writeFileSync(path.join(dir, `${id}.json`), JSON.stringify({ id, name: id, kind: "office", ...body })); };
  seat(path.join(lib, GROUP, "lib", "agency", "offices"), "chief-engineering-officer", { "presides-over": [`${ENGINEERING}/services/release-section#lead`] });
  seat(path.join(lib, ENGINEERING, "lib", "agency", "offices"), "lead", {});
  seat(path.join(lib, ENGINEERING, "services", "release-section", "lib", "agency", "offices"), "lead", { "reports-to": `${GROUP}#chief-engineering-officer` });
  const root = path.join(lib, GROUP);
  const reach = officeReach(binding, readAgency(root, { acts: [], pools: agencyPools(root) }), character, ["chief-engineering-officer"]);
  assert.ok(reach.has(`${ENGINEERING}/services/release-section#lead`));
  assert.ok(!reach.has(`${ENGINEERING}#lead`), "the same id at the house root is a different office, and it is not reached");
});
