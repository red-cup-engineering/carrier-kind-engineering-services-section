import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { specificationReadout, specificationRequirementsXml } from "@red-cup-engineering/specification-engineering-services-section/specification-readout";
import { runSpecificationWorkbench } from "../src/integrations/filesystem/services/specification-workbench.mjs";
import { defaultFilesystemBinding } from "../src/integrations/filesystem/services/read-write.mjs";

const SPECIFICATION = `# MetroPlat protocol

The key words in this document are to be interpreted as described in BCP 14,
RFC 2119, and RFC 8174.

## Admission

An implementation MUST check every claim.
It SHOULD retain an obstruction as data.
An implementation MAY expose the result over HTTP.
Ordinary prose must remain ordinary prose.
The literal \`MUST\` is mentioned as syntax, not imposed as a requirement.

\`\`\`text
An example MUST NOT be indexed as a requirement.
\`\`\`
`;

test("specificationReadout applies RFC 8174 uppercase semantics", () => {
  const readout = specificationReadout(SPECIFICATION);
  assert.equal(readout.bcp14.rfc2119, true);
  assert.equal(readout.bcp14.rfc8174, true);
  assert.deepEqual(readout.bcp14.requirements.map((requirement) => requirement.keyword), ["MUST", "SHOULD", "MAY"]);
  assert.deepEqual(readout.bcp14.requirements.map((requirement) => requirement.level), ["absolute", "recommendation", "optional"]);
  assert.equal(readout.issues.length, 0);
  assert.ok(!readout.bcp14.requirements.some((requirement) => requirement.text.includes("must remain")));
});

test("specificationReadout addresses a specification larger than one identity string envelope", () => {
  const large = `${SPECIFICATION}\n${"Non-normative context.\n".repeat(14_000)}`;
  assert.ok(Buffer.byteLength(large, "utf8") > 262_144);
  const readout = specificationReadout(large);
  assert.equal(readout.source, specificationReadout(large).source);
  assert.equal(readout.bcp14.requirements.length, 3);
});

test("specification requirements project to well-formed XML interchange", () => {
  const xml = specificationRequirementsXml(specificationReadout(SPECIFICATION));
  assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>/u);
  assert.match(xml, /<requirement[^>]+keyword="MUST"[^>]+level="absolute"/u);
  assert.match(xml, /An implementation MUST check every claim\./u);
});

test("specification workbench returns BCP 14 issues without mutating the file", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "metroplat-specification-"));
  try {
    const specificationPath = path.join(root, "specification.md");
    writeFileSync(specificationPath, "# Protocol\n\nA client MUST authenticate.\n", "utf8");
    const result = await runSpecificationWorkbench(defaultFilesystemBinding(root, { now: () => "2026-07-12T12:00:00.000Z" }), {
      path: specificationPath,
      includeXml: true,
    });
    assert.equal(result.changed, false);
    assert.equal(result.persisted, false);
    assert.deepEqual(result.specification.issues.map((issue) => issue.rule), [
      "bcp14-boilerplate-missing-rfc2119",
      "bcp14-boilerplate-missing-rfc8174",
    ]);
    assert.match(result.requirementsXml, /specification-requirements/u);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("specification workbench dry-runs and journal-persists structured requirements", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "metroplat-specification-write-"));
  try {
    const specificationPath = path.join(root, "specification.md");
    writeFileSync(specificationPath, SPECIFICATION, "utf8");
    const binding = defaultFilesystemBinding(root, { now: () => "2026-07-12T12:00:00.000Z" });
    const operation = Object.freeze({
      operation: "replace-section",
      heading: "Admission",
      level: 2,
      body: "A conforming implementation MUST check every candidate claim before admission.\n",
      required: true,
    });
    const dryRun = await runSpecificationWorkbench(binding, { path: specificationPath, operations: [operation] });
    assert.equal(dryRun.changed, true);
    assert.equal(dryRun.persisted, false);
    assert.match(readFileSync(specificationPath, "utf8"), /An implementation MUST check every claim/u);

    const written = await runSpecificationWorkbench(binding, { path: specificationPath, operations: [operation], write: true });
    assert.equal(written.changed, true);
    assert.equal(written.persisted, true);
    assert.equal(written.writeReceipt.kind, "metroplat.filesystem.write-receipt");
    assert.match(readFileSync(specificationPath, "utf8"), /conforming implementation MUST check every candidate claim/u);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
