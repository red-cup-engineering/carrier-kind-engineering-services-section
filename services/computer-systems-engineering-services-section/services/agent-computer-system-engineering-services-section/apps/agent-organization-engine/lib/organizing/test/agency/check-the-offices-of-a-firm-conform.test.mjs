import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { checkOfficesOfAFirm } from "../../scripts/check-the-offices-of-a-firm-conform.mjs";

const script = fileURLToPath(new URL("../../scripts/check-the-offices-of-a-firm-conform.mjs", import.meta.url));
const group = fileURLToPath(new URL("../../../../../../../../../../../../../561-group-services-section/", import.meta.url));
const record = (properties, required = ["id"]) => ({ $schema: "https://json-schema.org/draft/2020-12/schema", type: "object", additionalProperties: false, required, properties: Object.fromEntries(properties.map((key) => [key, {}])) });

async function agency({ offices = {}, duties = {}, works = {} }) {
  const root = await mkdtemp("/var/tmp/check-offices-");
  const schemas = path.join(root, "schema"); await mkdir(schemas);
  await writeFile(path.join(schemas, "office.schema.json"), JSON.stringify(record(["id", "reports-to", "presides-over", "peer-offices", "bears-duty"])));
  await writeFile(path.join(schemas, "duty.schema.json"), JSON.stringify(record(["id", "work", "from", "to"])));
  await writeFile(path.join(schemas, "work.schema.json"), JSON.stringify(record(["id"])));
  for (const [pool, records] of Object.entries({ offices, duties, works })) {
    await mkdir(path.join(root, "lib", "agency", pool), { recursive: true });
    for (const [id, body] of Object.entries(records)) await writeFile(path.join(root, "lib", "agency", pool, `${id}.json`), JSON.stringify({ id, ...body }));
  }
  return { agency: path.join(root, "lib", "agency"), schemas };
}

test("a pool whose edges, borne duties and owed works all resolve passes, and the command exits 0", async () => {
  const pool = await agency({
    offices: { chief: { "presides-over": ["clerk"] }, clerk: { "reports-to": "chief", "bears-duty": ["emsenn/duty/keep-books"] } },
    duties: { "keep-books": { work: "bookkeeping" }, "file-returns": { work: "filing", from: "a period closed", to: "a return filed" } },
    works: { bookkeeping: {} },
  });
  assert.deepEqual(checkOfficesOfAFirm(pool).failures, []);
  const run = spawnSync(process.execPath, [script, pool.agency, "--schemas", pool.schemas], { encoding: "utf8" });
  assert.equal(run.status, 0); assert.match(run.stdout, /^PASS — 2 office\(s\), 2 duty\(s\), 1 work\(s\)/u);
});

test("dangling edges, one-way hierarchy, unresolved duties and works are each a finding, and the command exits 1", async () => {
  const pool = await agency({
    offices: { chief: {}, clerk: { "reports-to": "chief", "peer-offices": ["ghost"], "bears-duty": ["emsenn/duty/absent"] } },
    duties: { orphan: { work: "nowhere" } },
  });
  const { failures } = checkOfficesOfAFirm(pool);
  assert.ok(failures.includes("clerk.json: peer-offices names 'ghost', which is not seated in this pool"));
  assert.ok(failures.includes("clerk.json: reports-to 'chief', but chief does not name it in presides-over"));
  assert.ok(failures.includes("clerk.json: bears-duty names 'emsenn/duty/absent', which resolves to no duty spec in the firm pool"));
  assert.ok(failures.includes("duties/orphan.json: work names 'nowhere', which resolves to no work spec"));
  const run = spawnSync(process.execPath, [script, pool.agency, "--schemas", pool.schemas], { encoding: "utf8" });
  assert.equal(run.status, 1); assert.match(run.stderr, /^FAIL — 4 finding\(s\)/u);
});

test("an edge resolves as the engine resolves it: a section's office by its key, and an address outside the firm pool is a finding", async () => {
  const pool = await agency({ offices: { chief: { "peer-offices": ["services/science#analyst", "services/science#ghost", "emsenn/services/elsewhere#analyst"] } } });
  const firm = path.dirname(path.dirname(pool.agency));
  await mkdir(path.join(firm, "services", "science", "lib", "agency", "offices"), { recursive: true });
  await writeFile(path.join(firm, "services", "science", "lib", "agency", "offices", "analyst.json"), JSON.stringify({ id: "analyst" }));
  assert.deepEqual(checkOfficesOfAFirm({ ...pool, graphOnly: true }).failures, [
    "chief.json: peer-offices names 'services/science#ghost', which no section of the firm pool seats",
    "chief.json: peer-offices names 'emsenn/services/elsewhere#analyst', whose house emsenn/services/elsewhere is not mounted here",
  ]);
});

test("an edge to another house resolves through that house's own pool when it is mounted, and names it when the house does not seat it", async () => {
  const pool = await agency({ offices: { chief: { "served-by": ["emsenn/services/science#analyst", "emsenn/services/science#ghost"] } } });
  const lib = path.dirname(pool.agency);
  await mkdir(path.join(lib, "emsenn", "services", "science", "lib", "agency", "offices"), { recursive: true });
  await writeFile(path.join(lib, "emsenn", "services", "science", "lib", "agency", "offices", "analyst.json"), JSON.stringify({ id: "analyst" }));
  assert.deepEqual(checkOfficesOfAFirm({ ...pool, graphOnly: true }).failures, ["chief.json: served-by names 'emsenn/services/science#ghost', which its house emsenn/services/science does not seat"]);
});

test("an edge naming an office class resolves when the estate keeps that class schema", async () => {
  const pool = await agency({ offices: { chief: { "presides-over": ["emsenn/office/analysis-team"], "distinguished-from": ["emsenn/office/no-such-class"] } } });
  const estate = path.dirname(pool.agency);
  await mkdir(path.join(estate, "legacy", "offices"), { recursive: true });
  await writeFile(path.join(estate, "legacy", "offices", "analysis-team.schema.json"), JSON.stringify({ $id: "emsenn/office/analysis-team" }));
  assert.deepEqual(checkOfficesOfAFirm({ ...pool, graphOnly: true }).failures, ["chief.json: distinguished-from names the office class 'emsenn/office/no-such-class', which no class schema in the estate defines"]);
});

test("a borne duty seated in exactly one section of the firm pool resolves; one seated in two is ambiguous", async () => {
  const pool = await agency({ offices: { chief: { "bears-duty": ["emsenn/duty/keep-books", "emsenn/duty/file-returns"] } } });
  const firm = path.dirname(path.dirname(pool.agency));
  for (const section of ["finance", "tax", "audit"]) await mkdir(path.join(firm, "services", section, "lib", "agency", "duties"), { recursive: true });
  await writeFile(path.join(firm, "services", "finance", "lib", "agency", "duties", "keep-books.json"), JSON.stringify({ id: "keep-books", work: "bookkeeping" }));
  for (const section of ["tax", "audit"]) await writeFile(path.join(firm, "services", section, "lib", "agency", "duties", "file-returns.json"), JSON.stringify({ id: "file-returns", work: "filing" }));
  assert.deepEqual(checkOfficesOfAFirm({ ...pool, graphOnly: true }).failures, ["chief.json: bears-duty names 'emsenn/duty/file-returns', which 2 sections of the firm pool seat, so it resolves to none"]);
});

test("a schema finding names the property its schema does not admit; --graph leaves schemas out", async () => {
  const pool = await agency({ offices: { chief: { charter: "kept elsewhere" } } });
  assert.deepEqual(checkOfficesOfAFirm(pool).failures, ["chief.json: / admits no charter"]);
  assert.deepEqual(checkOfficesOfAFirm({ ...pool, graphOnly: true }).failures, []);
  const run = spawnSync(process.execPath, [script, pool.agency, "--schemas", pool.schemas, "--graph"], { encoding: "utf8" });
  assert.equal(run.status, 0);
});

test("a check that cannot read its schemas exits 2", async () => {
  const pool = await agency({});
  const run = spawnSync(process.execPath, [script, pool.agency, "--schemas", path.join(pool.schemas, "absent")], { encoding: "utf8" });
  assert.equal(run.status, 2);
});

test("in the 561 Group's agency the bookkeeper is named back by the chief financial officer it reports to", () => {
  const { failures } = checkOfficesOfAFirm({ agency: path.join(group, "lib/agency"), schemas: path.join(group, "data/records/schema"), graphOnly: true });
  assert.equal(failures.some((failure) => failure.startsWith("bookkeeper.json: reports-to")), false);
});
