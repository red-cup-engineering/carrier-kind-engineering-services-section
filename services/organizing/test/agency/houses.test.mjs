import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { agencyPools, readAgency } from "../../src/agency/index.mjs";
import { addressFrom, crossHouseEdges, estateRootOf, houseReference, houseResolver, reciprocates } from "../../src/agency/houses.mjs";

// The estate as the 561 Group's agency names it: the Group's firm pool, and the engineering and science
// houses its chief engineering officer and chief science officer name across houses.
const GROUP = "emsenn/services/561-group/services/561-group-services-section";
const ENGINEERING = "emsenn/services/561-group/services/engineering-services-section";
const SCIENCE = "emsenn/services/561-group/services/science-services-section";

async function seat(root, pool, id, body = {}) {
  const dir = path.join(root, "lib", "agency", pool);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, `${id}.json`), JSON.stringify({ id, name: id, ...body }));
}

async function estate({ mountScience = false } = {}) {
  const lib = await mkdtemp("/var/tmp/houses-");
  await seat(path.join(lib, GROUP), "offices", "chief-engineering-officer", { kind: "office" });
  await seat(path.join(lib, GROUP), "offices", "chief-science-officer", { kind: "office" });
  for (const office of ["senior-engineer", "engineering-lead"]) await seat(path.join(lib, ENGINEERING), "offices", office, { kind: "office" });
  await seat(path.join(lib, ENGINEERING), "duties", "operating-engineering-repository-intake", { authority: "founder", claim: "chief-technology-officer", work: "operating-engineering-repository-intake" });
  if (mountScience) await seat(path.join(lib, SCIENCE), "offices", "research-analyst", { kind: "office" });
  const root = path.join(lib, GROUP);
  return { lib, firm: readAgency(root, { acts: [], pools: agencyPools(root) }) };
}

test("a house reference names a house path and a record id; a plain id or a pool key is not one", () => {
  assert.deepEqual({ ...houseReference(`${ENGINEERING}#senior-engineer`) }, { house: ENGINEERING, id: "senior-engineer" });
  assert.equal(houseReference("senior-engineer"), undefined);
  assert.equal(houseReference("#senior-engineer"), undefined);
});

test("a record in a mounted house resolves through that house's own pool, offices and duties alike", async () => {
  const { lib, firm } = await estate();
  const across = houseResolver(lib);
  const office = across(firm, "offices", `${ENGINEERING}#senior-engineer`);
  assert.equal(office.reading, "resolved"); assert.equal(office.house, ENGINEERING); assert.equal(office.record.id, "senior-engineer");
  const duty = across(firm, "duties", `${ENGINEERING}#operating-engineering-repository-intake`);
  assert.equal(duty.reading, "resolved"); assert.equal(duty.record.id, "operating-engineering-repository-intake");
});

test("a house that is not mounted reads house-not-mounted, never a missing record", async () => {
  const { lib, firm } = await estate();
  assert.deepEqual({ ...houseResolver(lib)(firm, "offices", `${SCIENCE}#research-analyst`) }, { reading: "house-not-mounted", house: SCIENCE });
});

test("the same reference resolves once the house is mounted", async () => {
  const { lib, firm } = await estate({ mountScience: true });
  const reading = houseResolver(lib)(firm, "offices", `${SCIENCE}#research-analyst`);
  assert.equal(reading.reading, "resolved"); assert.equal(reading.house, SCIENCE);
});

test("a mounted house that does not seat the record reads unresolved; this pool's own records resolve locally first", async () => {
  const { lib, firm } = await estate();
  const across = houseResolver(lib);
  assert.deepEqual({ ...across(firm, "offices", `${ENGINEERING}#engineering-release-engineer`) }, { reading: "unresolved", house: ENGINEERING, reason: "the house does not seat it" });
  const local = across(firm, "offices", "chief-science-officer");
  assert.equal(local.reading, "resolved"); assert.equal(local.house, null);
  assert.deepEqual({ ...across(firm, "offices", "nobody") }, { reading: "unresolved", reason: "not seated in this pool" });
});

test("a key naming a section of this pool stays local: an unseated record there is unresolved, not a missing house", async () => {
  const { lib } = await estate();
  const root = path.join(lib, GROUP);
  await seat(path.join(root, "services", "bookkeeping-section"), "offices", "clerk", { kind: "office" });
  const firm = readAgency(root, { acts: [], pools: agencyPools(root) });
  const across = houseResolver(lib);
  assert.equal(across(firm, "offices", "services/bookkeeping-section#clerk").reading, "resolved");
  assert.deepEqual({ ...across(firm, "offices", "services/bookkeeping-section#ghost") }, { reading: "unresolved", reason: "the section does not seat it" });
});

test("each house's registry is read once per resolver", async () => {
  const { lib, firm } = await estate();
  let reads = 0;
  const across = houseResolver(lib, { read: (root) => { reads += 1; return readAgency(root, { acts: [], pools: agencyPools(root) }); } });
  across(firm, "offices", `${ENGINEERING}#senior-engineer`); across(firm, "offices", `${ENGINEERING}#engineering-lead`);
  assert.equal(reads, 1);
});

test("a cross-house presides-over edge grants only when the other house's record names the presider back", async () => {
  const lib = path.join(await mkdtemp("/var/tmp/houses-"), "lib");
  const root = path.join(lib, GROUP);
  await seat(root, "offices", "chief-engineering-officer", { kind: "office", "presides-over": [`${ENGINEERING}#senior-engineer`, `${ENGINEERING}#engineering-lead`] });
  await seat(path.join(lib, ENGINEERING), "offices", "senior-engineer", { kind: "office", "reports-to": `${GROUP}#chief-engineering-officer` });
  await seat(path.join(lib, ENGINEERING), "offices", "engineering-lead", { kind: "office" });
  const firm = readAgency(root, { acts: [], pools: agencyPools(root) });
  assert.equal(estateRootOf(root), lib);
  const cengo = [...firm.offices.values()].find((o) => o.id === "chief-engineering-officer");
  assert.equal(addressFrom(lib, firm, cengo), `${GROUP}#chief-engineering-officer`);
  assert.equal(reciprocates({ authored: { "reports-to": `${GROUP}#chief-engineering-officer` } }, "presides-over", `${GROUP}#chief-engineering-officer`), true);
  assert.equal(reciprocates({ authored: { "served-by": [`${GROUP}#x`] } }, "serves", `${GROUP}#x`), true);
  assert.equal(reciprocates({ authored: {} }, "presides-over", `${GROUP}#chief-engineering-officer`), false);
  const edges = crossHouseEdges(firm);
  assert.deepEqual(edges.map(({ to, reading, grants }) => ({ to, reading, grants })), [
    { to: `${ENGINEERING}#senior-engineer`, reading: "resolved", grants: true },
    { to: `${ENGINEERING}#engineering-lead`, reading: "resolved", grants: false },
  ]);
});

test("the estate is the configured root when one is set, else the repository's own lib even under a /var/lib-style path", async () => {
  const top = await mkdtemp("/var/tmp/houses-");
  const checkout = path.join(top, "var", "lib", "checkout");
  const lib = path.join(checkout, "lib");
  const root = path.join(lib, GROUP, "lib", "agency");
  await mkdir(root, { recursive: true });
  await mkdir(path.join(checkout, ".git"));
  assert.equal(estateRootOf(root, { configured: "" }), lib);
  assert.equal(estateRootOf(root, { configured: lib }), lib);
  assert.equal(estateRootOf(root, { configured: path.join(top, "elsewhere") }), undefined);
  assert.equal(estateRootOf(root, { configured: "", exists: () => false }), path.join(top, "var", "lib"));
});
