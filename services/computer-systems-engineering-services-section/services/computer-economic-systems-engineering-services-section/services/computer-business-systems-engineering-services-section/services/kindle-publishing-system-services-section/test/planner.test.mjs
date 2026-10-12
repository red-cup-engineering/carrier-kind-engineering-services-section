import test from "node:test";
import assert from "node:assert/strict";
import { planKindleBook } from "../src/planner.mjs";

const candidate = { seriesPlan: { name: "Harbor Hearts", books: [{ number: 1, promise: "first" }], readthrough: "Each side character leads the next book." }, storyBible: { type: "StoryBible", version: 1, work: "harbor-one", premise: "Two rivals restore a ferry.", theme: "Care requires speech.", signature: { characters: [{ id: "a", name: "Ana", pov: true }, { id: "b", name: "Ben", pov: true }], places: [], lexicon: [] }, arc: ["setup", "turn", "together"], knowledge: [{ id: "secret", holder: "a", learner: "b", fact: "Ana owns the dock." }], refusals: [], locales: { povAlternates: true }, retired: [] }, ebook: { slug: "harbor-one", title: "Harbor One", author: "561 Group", date: "2026-09-29", bookDir: ".", distDir: "../../../data/state/editions/harbor-one", profile: "fiction", storyBible: "story-bible.json", description: "A harbor romance.", keywords: ["harbor romance"], subjects: ["FIC027020"], marks: [] }, outline: [{ chapter: 1, title: "Arrival", pov: "a", when: "2027-01-01", beat: "setup", summary: "Ana arrives.", reveals: [] }, { chapter: 2, title: "Turn", pov: "b", when: "2027-01-02", beat: "turn", summary: "Ben decides.", reveals: [] }, { chapter: 3, title: "Truth", pov: "a", when: "2027-01-03", beat: "together", summary: "Ana speaks.", reveals: ["secret"] }] };

test("planner uses dispatch provenance and the existing fiction lint as its gate", async () => {
  const dispatch = async () => ({ outcome: "candidate-pending-customer-acceptance", candidate, workLot: "lot", provider: "fixture-provider", model: "fixture-model", receipt: { id: "ni:///sha-256;fixture" } });
  const result = await planKindleBook({ opportunity: { niche: "harbor romance", evidenceId: "ni:///sha-256;market" }, customerActor: "fixture" }, { dispatch });
  assert.equal(result.status, "planned");
  assert.equal(result.receipt.content.lint.ok, true);
  assert.equal(result.receipt.content.inference.provider, "fixture-provider");
});
