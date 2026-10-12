import test from "node:test";
import assert from "node:assert/strict";
import {
  candidateCarrierPaths, dischargeOfCarrierRepair, formCarrierSectionReplacementDemand, isWritableCarrierPath,
  parseCarrierFalsehoodDutyText, sectionReplacementFailures, smallestEnclosingMarkdownSection, spliceMarkdownSection,
} from "../src/carrier-falsehood-duty.mjs";

function dutyText({ carrier, observed, expected }) {
  return `${carrier} states ${JSON.stringify(observed)} but on disk ${expected}. Repair: replace the falsehood at its owner with the truth; never annotate it.`;
}

test("parseCarrierFalsehoodDutyText reads carrier, observed, and expected off admit-friction's exact template, un-escaping observed", () => {
  const text = dutyText({ carrier: "lib/emsenn/services/some-section", observed: 'it says "hi" and stops.', expected: "it says something else" });
  assert.deepEqual(parseCarrierFalsehoodDutyText(text), {
    carrier: "lib/emsenn/services/some-section",
    observed: 'it says "hi" and stops.',
    expected: "it says something else",
  });
});

test("parseCarrierFalsehoodDutyText refuses text with no repair suffix or no states marker", () => {
  assert.equal(parseCarrierFalsehoodDutyText("some other kind of duty text"), null);
  assert.equal(parseCarrierFalsehoodDutyText("x states not-json but on disk y. Repair: replace the falsehood at its owner with the truth; never annotate it."), null);
  assert.equal(parseCarrierFalsehoodDutyText(undefined), null);
});

test("candidateCarrierPaths offers the path itself, its README.md, and a .md sibling, in order", () => {
  const candidates = candidateCarrierPaths({ carrier: "lib/a/some-section", repositoryRoot: "/repo" });
  assert.deepEqual(candidates, ["/repo/lib/a/some-section", "/repo/lib/a/some-section/README.md", "/repo/lib/a/some-section.md"]);
  assert.deepEqual(candidateCarrierPaths({ carrier: "lib/a/note.md", repositoryRoot: "/repo" }), ["/repo/lib/a/note.md"]);
  assert.deepEqual(candidateCarrierPaths({ carrier: "", repositoryRoot: "/repo" }), []);
});

test("isWritableCarrierPath admits a Markdown file under lib outside legacy, and refuses everything else", () => {
  assert.equal(isWritableCarrierPath({ path: "/repo/lib/a/README.md", repositoryRoot: "/repo" }), true);
  assert.equal(isWritableCarrierPath({ path: "/repo/lib/legacy/a/README.md", repositoryRoot: "/repo" }), false);
  assert.equal(isWritableCarrierPath({ path: "/repo/scripts/a.mjs", repositoryRoot: "/repo" }), false);
  assert.equal(isWritableCarrierPath({ path: "/repo/lib/a/build.mjs", repositoryRoot: "/repo" }), false);
});

const CARRIER_TEXT = [
  "# Some Section",
  "",
  "Intro text.",
  "",
  "## Seating",
  "",
  "the section has no README.md, so it could not register its child.",
  "",
  "## Other",
  "",
  "unrelated text.",
  "",
].join("\n");

test("smallestEnclosingMarkdownSection finds the nearest heading at or before the match and stops at the next same-or-shallower heading", () => {
  const section = smallestEnclosingMarkdownSection(CARRIER_TEXT, "the section has no README.md, so it could not register its child.");
  assert.equal(section.heading, "Seating");
  assert.equal(section.level, 2);
  assert.match(section.sectionText, /^## Seating\n/);
  assert.ok(!section.sectionText.includes("## Other"));
});

test("smallestEnclosingMarkdownSection returns null when the needle is absent", () => {
  assert.equal(smallestEnclosingMarkdownSection(CARRIER_TEXT, "not present anywhere"), null);
});

test("spliceMarkdownSection replaces exactly the located section, leaving the rest untouched", () => {
  const section = smallestEnclosingMarkdownSection(CARRIER_TEXT, "the section has no README.md");
  const spliced = spliceMarkdownSection(CARRIER_TEXT, section, "## Seating\n\na README.md in section form registering its child.\n");
  assert.match(spliced, /## Seating\n\na README\.md in section form registering its child\.\n\n## Other/);
  assert.ok(!spliced.includes("could not register"));
});

test("sectionReplacementFailures passes a heading-matching, falsehood-free replacement and fails otherwise", () => {
  const section = { heading: "Seating" };
  assert.deepEqual(sectionReplacementFailures({ section, replacementText: "## Seating\n\nthe truth.\n", observed: "the falsehood" }), []);
  assert.deepEqual(sectionReplacementFailures({ section, replacementText: "", observed: "the falsehood" }), ["REPLACEMENT_EMPTY"]);
  assert.deepEqual(sectionReplacementFailures({ section, replacementText: "## Wrong Heading\n\ntext\n", observed: "the falsehood" }), ["HEADING_MISMATCH"]);
  assert.deepEqual(sectionReplacementFailures({ section, replacementText: "## Seating\n\nstill has the falsehood here\n", observed: "the falsehood" }), ["FALSEHOOD_STILL_PRESENT"]);
});

test("formCarrierSectionReplacementDemand binds the carrier, the section, and the expected truth, feeding back a refusal", () => {
  const section = { heading: "Seating", sectionText: "## Seating\n\nold text.\n" };
  const demand = formCarrierSectionReplacementDemand({ carrier: "lib/a/some-section", section, expected: "new truth" });
  assert.match(demand.context, /## Current section\n## Seating/u);
  assert.match(demand.context, /## Expected truth\nnew truth/u);
  assert.equal(demand.workType, "inquiry");
  assert.equal(demand.outputSchema, undefined);
  const withRefusal = formCarrierSectionReplacementDemand({ carrier: "lib/a/some-section", section, expected: "new truth", refusal: { code: "HEADING_MISMATCH" } });
  assert.match(withRefusal.context, /Previous attempt was refused.*\n\{"code":"HEADING_MISMATCH"\}/su);
  assert.throws(() => formCarrierSectionReplacementDemand({ carrier: "", section, expected: "x" }), /carrier is required/u);
  assert.throws(() => formCarrierSectionReplacementDemand({ carrier: "c", section, expected: "" }), /expected is required/u);
});

test("dischargeOfCarrierRepair names the repaired carrier and the links checked as evidence", () => {
  const discharge = dischargeOfCarrierRepair({
    duty: { scope: "task:friction-carrier-falsehood-x-1", intent: "i1" },
    producer: { id: "@red-cup-engineering/agent-work-computer-system-engineering-services-section", revision: "0.2.0" },
    carrierPath: "/repo/lib/a/README.md",
    linksChecked: 3,
  });
  assert.equal(discharge.kind, "metroplat.work.discharge");
  assert.equal(discharge.id, "discharge-task:friction-carrier-falsehood-x-1");
  assert.deepEqual(discharge.evidence, ["carrier:/repo/lib/a/README.md", "links-checked:3"]);
});

test("section selection uses canonical headings while retaining original offsets and bytes", () => {
  const prefix = "---\r\nsummary: |\r\n  # False metadata heading\r\n---\r\n";
  const sectionText = "Actual section\r\n==============\n\n~~~~md\r\n# Example heading\r\nwrong claim\r\n~~~~\n\n";
  const text = prefix + sectionText + "Next section\r\n============\r\nOther.\r\n";
  const section = smallestEnclosingMarkdownSection(text, "wrong claim");
  assert.equal(section.heading, "Actual section");
  assert.equal(section.startOffset, prefix.length);
  assert.equal(section.sectionText, sectionText);
  assert.equal(text.slice(section.startOffset, section.endOffset), sectionText);
  assert.equal(smallestEnclosingMarkdownSection(text, "False metadata heading"), null);
  assert.deepEqual(sectionReplacementFailures({ section, replacementText: "Actual section\n==============\nCorrect.\n", observed: "wrong claim" }), []);
  assert.deepEqual(sectionReplacementFailures({ section, replacementText: "```md\n# Actual section\n```", observed: "wrong claim" }), ["HEADING_MISMATCH"]);
});
