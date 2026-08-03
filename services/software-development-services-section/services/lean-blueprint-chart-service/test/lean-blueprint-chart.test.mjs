import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  blueprintClaimGraphFindings,
  blueprintLeanWeldFindings,
  readLeanWorkspace,
} from "../src/lean-blueprint-chart.mjs";

test("charts Blueprint dependencies against namespaced Lean declarations", () => {
  const root = mkdtempSync(join(tmpdir(), "lean-blueprint-chart-"));
  mkdirSync(join(root, "Obsmetrologia"));
  mkdirSync(join(root, "docs", "blueprint", "src"), { recursive: true });
  writeFileSync(join(root, "Obsmetrologia", "Example.lean"), `namespace Obsmetrologia\ntheorem base : True := by trivial\ntheorem openClaim : True := by\n  sorry\nend Obsmetrologia\n`);
  writeFileSync(join(root, "docs", "blueprint", "src", "claims.tex"), String.raw`\begin{theorem}[Base]
\label{def:mark}
\lean{Obsmetrologia.base}
\leanok
\end{theorem}
\begin{theorem}[Open]
\label{thm:open}
\uses{def:mark}
\lean{Obsmetrologia.openClaim}
\notready
\end{theorem}
`);
  const workspace = readLeanWorkspace(root);
  const graph = workspace.texWorkspaceRead.blueprintClaimGraph;
  assert.equal(graph.nodes.length, 2);
  assert.equal(graph.edges.length, 1);
  assert.equal(workspace.declarationCatalog.entries.find((entry) => entry.name === "Obsmetrologia.openClaim").proofStatus, "admitted");
  assert.deepEqual(
    blueprintClaimGraphFindings(graph, { baseLabels: ["def:mark"] }).map((item) => item.code),
    ["label-kind-mismatch"],
  );
  assert.deepEqual(blueprintLeanWeldFindings(graph, workspace.declarationCatalog), []);
});

test("reports missing upstream labels and unmatched Lean witnesses", () => {
  const graph = {
    nodes: [{ id: "thm:x", source: "x.tex", line: 1, statementKind: "theorem", leanDeclarations: ["Missing.name"], status: "settled", dependencies: ["missing"] }],
    edges: [{ from: "thm:x", to: "missing", source: "x.tex", line: 1 }],
  };
  assert.deepEqual(blueprintClaimGraphFindings(graph).map((item) => item.code), ["missing-upstream", "unglued-node"]);
  assert.deepEqual(blueprintLeanWeldFindings(graph, { entries: [] }).map((item) => item.code), ["unmatched-lean-reference"]);
});
