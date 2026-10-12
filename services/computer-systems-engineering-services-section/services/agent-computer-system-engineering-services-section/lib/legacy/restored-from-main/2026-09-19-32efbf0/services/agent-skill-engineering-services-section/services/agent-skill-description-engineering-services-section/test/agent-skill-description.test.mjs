import assert from "node:assert/strict";
import test from "node:test";
import { admitAgentSkillDescription } from "../src/agent-skill-description.mjs";

test("admits a bounded discovery description grounded in its skill body", () => {
  const admitted = admitAgentSkillDescription("  Writes a release note from verified package changes.  ", { body: "Inspect the package changes, verify them, and write the release note." });
  assert.equal(admitted.text, "Writes a release note from verified package changes.");
  assert.equal(admitted.consumer.kind, "agent-skill-discovery");
});

test("recognizes baseline action morphology without a closed verb inventory", () => {
  const admitted = admitAgentSkillDescription("Makes one widget from supplied material.", { body: "Inspect the material. Make the widget." });
  assert.equal(admitted.text, "Makes one widget from supplied material.");
});

test("grounds inflected action wording through shared body substance", () => {
  const admitted = admitAgentSkillDescription("Demonstrates a projected operation skill.", { body: "Echo the supplied value while demonstrating the body of an operation skill." });
  assert.equal(admitted.text, "Demonstrates a projected operation skill.");
});

test("does not impose a universal sentence-count law", () => {
  const admitted = admitAgentSkillDescription("Reviews a package when its ownership changes. Use for registry-backed JavaScript packages only.", { body: "Review package ownership before changing a registry-backed JavaScript package." });
  assert.equal(admitted.type, "Description");
});

test("refuses topic labels and unbounded body inventories", () => {
  assert.throws(() => admitAgentSkillDescription("Markdown", { body: "Write Markdown carriers." }), /work, effect, or artifact/u);
  assert.throws(() => admitAgentSkillDescription("Writes Markdown.", { body: "Write Markdown carriers." }), /trigger conditions|bounded scope/u);
});

test("refuses descriptions unfaithful to the skill body", () => {
  assert.throws(() => admitAgentSkillDescription("Publishes videos when a channel is selected.", { body: "Write a glossary term from cited evidence." }), /faithful/u);
});

test("refuses a description indistinguishable from a neighbor", () => {
  const description = "Writes a glossary term from cited evidence.";
  assert.throws(() => admitAgentSkillDescription(description, { body: "Write a glossary term from cited evidence.", neighborDescriptions: [description] }), /distinguish/u);
});

test("refuses every ECMAScript line separator", () => {
  for (const separator of ["\n", "\r", "\r\n", "\u2028", "\u2029"]) {
    assert.throws(() => admitAgentSkillDescription(`Writes a term${separator}from cited evidence.`, { body: "Write a term from cited evidence." }), /single-line/u);
  }
});
