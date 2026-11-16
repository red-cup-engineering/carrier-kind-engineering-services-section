import assert from "node:assert/strict";
import test from "node:test";
import { datedPathOf, descriptionOf, planNoteFrontmatterRepair } from "../src/note-repair.mjs";

const path = "content/text/documents/articles/notes/2026/11/12/2026-11-12-account.md";
const body = "# Source account\n\nThis prose records the history of the note without asserting when it was written.";

test("a path date and first-recorded date are observations, not authorship", () => {
  assert.equal(datedPathOf(path), "2026-11-12");
  const plan = planNoteFrontmatterRepair({ path, body, frontmatter: { date: "2026-11-11" }, firstRecorded: "2026-11-10" });
  assert.deepEqual(plan, {
    set: { title: "Source account", description: "This prose records the history of the note without asserting when it was written." },
    remove: [],
  });
});

test("normalization does not replace or discard authored source evidence to make admission pass", () => {
  const frontmatter = Object.freeze({
    title: "",
    description: null,
    "date-created": "date awaiting review",
    "science-owner": "source-science-services-section",
    "canonical-source": "https://example.org/original",
    references: Object.freeze({ originating: Object.freeze({ title: "An authored source", DOI: "10.0000/example", locator: "page 7" }) }),
    keywords: Object.freeze(["ABC words", "abc-words", "Δ"]),
    cites: Object.freeze(["Original citation"]),
  });
  assert.deepEqual(planNoteFrontmatterRepair({ path, body, frontmatter }), { set: {}, remove: [] });
  assert.equal(frontmatter.references.originating.locator, "page 7");
  assert.equal(frontmatter.keywords.length, 3);
});

test("uses a complete short source paragraph rather than a lead-in or a truncated claim", () => {
  const qualifying = "The note proposes an interpretation. The evidence qualifies it but does not establish it.";
  const crlf = String.fromCharCode(13, 10);
  const list = [
    "The introduction has the following two closely related parts:",
    "+ This is a list item ending with tempting prose and punctuation.",
    "1) This is also a list item with a long line of non-summary prose.",
    ["```example", "", "This text inside code looks much like an ordinary complete paragraph.", "", "```"].join(crlf),
    "This paragraph is over the threshold. ".repeat(14).trim(),
  ];
  assert.equal(descriptionOf([...list, qualifying].join(crlf + crlf)), qualifying);
  assert.equal(descriptionOf(list.join(crlf + crlf)), null);
});
