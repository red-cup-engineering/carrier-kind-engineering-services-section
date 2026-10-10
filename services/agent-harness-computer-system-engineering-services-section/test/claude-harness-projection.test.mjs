import assert from "node:assert/strict";
import test from "node:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { projectClaudeHarness } from "../services/claude-code-harness-services-section/src/claude-harness-projection.mjs";

const write = (root, file, value) => {
  const target = path.join(root, file);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, typeof value === "string" ? value : JSON.stringify(value));
};

// A node's agency: sections `a` and `b` each hold an office `chief` that provides a skill and is
// seated at dignitas, and section `a` alone holds `clerk`.
function node(t) {
  const root = mkdtempSync(path.join(tmpdir(), "claude-harness-projection-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const agency = path.join(root, "lib");
  for (const section of ["a-section", "b-section"]) {
    const dir = `lib/${section}/lib/agency`;
    write(root, `${dir}/skills/work.json`, { id: "work", name: "Work", description: "Do the work.", method: "Do it." });
    write(root, `${dir}/offices/chief.json`, { id: "chief", name: `Chief of ${section}`, kind: "office", "provides-skill": ["work"], "normative-structure": `Chief of ${section}.` });
    write(root, `${dir}/characters/${section}-holder.json`, { id: `${section}-holder`, kind: "human" });
    write(root, `${dir}/incumbencies/chief-${section}.json`, { id: `chief-${section}`, office: "chief", holder: `${section}-holder`, recognition: "t", induction: "t", from: "2026-10-09" });
  }
  write(root, "lib/a-section/lib/agency/offices/clerk.json", { id: "clerk", name: "Clerk", kind: "office", "provides-skill": ["work"], "normative-structure": "Clerk of a-section." });
  write(root, "lib/a-section/lib/agency/incumbencies/clerk-a.json", { id: "clerk-a", office: "clerk", holder: "a-section-holder", recognition: "t", induction: "t", from: "2026-10-09" });
  return { root, agency };
}

test("an office id seated in two sections projects neither office, and a unique one projects", (t) => {
  const { root, agency } = node(t);
  const projection = projectClaudeHarness({ node: root, agencyRoot: agency, settlementRoot: root, hostResource: false });
  assert.ok(projection.files.has(".claude/agents/clerk.md"));
  assert.equal(projection.files.has(".claude/agents/chief.md"), false);
  const refused = projection.obstructions.filter((o) => /office id 'chief' is seated at dignitas in several sections/.test(o.reason ?? ""));
  assert.equal(refused.length, 2);
});
