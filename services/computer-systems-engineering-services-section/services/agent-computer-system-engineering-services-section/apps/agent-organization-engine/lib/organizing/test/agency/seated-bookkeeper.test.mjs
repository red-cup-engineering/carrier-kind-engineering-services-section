import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { agencyPools, readAgency } from "../../src/agency/index.mjs";

// The 561 Group's own agency, as the workflow engine reads it.
const root = fileURLToPath(new URL("../../../../../../../../../../../../../561-group-services-section", import.meta.url));
const agency = readAgency(root, { acts: [], pools: agencyPools(root) });
const byId = (pool, id) => [...agency[pool].values()].find((record) => record.id === id && record.sectionPath === "");

test("the bookkeeper office restored from the dissolved finance section is seated under the chief financial officer", () => {
  const office = byId("offices", "bookkeeper");
  assert.ok(office, "bookkeeper office is read");
  assert.equal(office.authored["reports-to"], "chief-financial-officer");
  assert.ok(byId("offices", "chief-financial-officer"), "the office it reports to exists");
  assert.equal(office.authored.jurisdiction, "561-group");
});

test("Bea Manucci holds the bookkeeper office by a recognized, inducted incumbency", () => {
  const seat = byId("incumbencies", "bea-manucci-as-bookkeeper");
  assert.ok(seat, "incumbency is read");
  assert.equal(seat.authored.office, "bookkeeper");
  assert.equal(seat.authored.holder, "bea-manucci");
  assert.ok(byId("characters", "bea-manucci"), "the holder is a character of the agency");
});

test("the seated records raise no registry problem", () => {
  const ours = agency.problems.filter(({ file }) => /\/(bookkeeper|bea-manucci|bea-manucci-as-bookkeeper)\.json$/u.test(file));
  assert.deepEqual(ours, []);
});
