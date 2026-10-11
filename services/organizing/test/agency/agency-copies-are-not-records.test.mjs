import assert from "node:assert/strict";
import test from "node:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { readAgency } from "../../src/agency/index.mjs";

// A section that vendors a package carries a copy of the records the package's own section
// authors. The copy is not agency: reading it seats the same office twice.
test("agency records under a vendor directory are not read", (t) => {
  const root = mkdtempSync(path.join(tmpdir(), "agency-vendor-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const office = JSON.stringify({ id: "librarian", name: "Librarian", kind: "office" });
  for (const section of ["corpus-section", "news-section/vendor/runtime/pkg/corpus-section"]) {
    const dir = path.join(root, section, "lib", "agency", "offices");
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, "librarian.json"), office);
  }
  const agency = readAgency(root, { acts: [] });
  assert.equal(agency.byId.offices.get("librarian").length, 1);
  assert.deepEqual([...agency.offices.keys()], ["corpus-section#librarian"]);
});
