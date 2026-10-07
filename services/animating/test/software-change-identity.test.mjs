import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { witnessSoftwareWork } from "../src/becoming/doing/working/software-change.mjs";
import { relocateWorkspace } from "../src/becoming/doing/working/software-change/workspace-relocation.mjs";

test("moving unchanged source preserves its SignCell identity and witnesses both locations", () => {
  const evidence = witnessSoftwareWork({
    intent: { operation: "workspace-relocation", actor: "test-actor", request: {} },
    inputs: [{ path: "old/source.mjs", kind: "source-file", digest: "same-bytes", length: 12 }],
    outputs: [{ path: "new/source.mjs", kind: "source-file", digest: "same-bytes", length: 12 }],
    applied: true,
  });
  const artifacts = evidence.cells.filter((cell) => cell.type === "aoe.software.artifact.v2");
  assert.equal(artifacts.length, 1);
  assert.deepEqual(artifacts[0].content, { digest: "same-bytes", kind: "source-file", length: 12 });
  const locations = new Map(evidence.cells.filter((cell) => cell.type === "aoe.software.location.v1").map((cell) => [cell.id, cell.content.path]));
  const edges = evidence.graph.edges.map(({ edge }) => edge);
  assert.equal(locations.get(edges.find((edge) => edge.predicate === "aoe.software.located-before").object.id), "old/source.mjs");
  assert.equal(locations.get(edges.find((edge) => edge.predicate === "aoe.software.located-after").object.id), "new/source.mjs");
  assert.equal(edges.find((edge) => edge.predicate === "aoe.software.consumes").object.id, artifacts[0].id);
  assert.equal(edges.find((edge) => edge.predicate === "aoe.software.produced").object.id, artifacts[0].id);
});

test("AOE relocation plan gives unchanged moved directory one artifact identity", async (t) => {
  const repositoryRoot = await mkdtemp(path.join(tmpdir(), "aoe-identity-"));
  t.after(() => rm(repositoryRoot, { recursive: true, force: true }));
  await mkdir(path.join(repositoryRoot, "declared-owner"));
  await writeFile(path.join(repositoryRoot, "declared-owner/package.json"),
    JSON.stringify({ name: "example after", softwareKind: "component" }));
  await mkdir(path.join(repositoryRoot, "before"));
  await writeFile(path.join(repositoryRoot, "before", "file.mjs"), "export const value = 1;\n");
  const result = await relocateWorkspace({
    action: "plan", actor: "test-actor", repositoryRoot,
    journalPath: path.join(repositoryRoot, "relocation.jsonl"),
    placement: { capability: "example-value", effect: "consumer reads the exported value",
      carrier: "JavaScript module", ownerBefore: "example before", ownerBeforeKind: "component",
      ownerAfter: "example after", ownerAfterKind: "component",
      reason: "the after package owns the value", consumers: [], observation: "import the new module" },
    replacements: [{ from: "before", to: "after" }], files: [],
  });
  assert.equal(result.moves, 1);
  assert.equal(result.evidence.cells.filter((cell) => cell.type === "aoe.software.artifact.v2").length, 2);
  assert.deepEqual(result.evidence.cells.filter((cell) => cell.type === "aoe.software.location.v1").map((cell) => cell.content.path).sort(),
    ["after", "before", "declared-owner/package.json"]);
  assert.equal(result.evidence.settlement.outputReadings[0], "potential");
});
