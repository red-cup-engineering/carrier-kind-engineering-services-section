import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { observeNoteMastheadDate as read } from "@red-cup-engineering/carrier-kind-engineering-services-section/note-masthead-date";

test("witnesses an introductory memo date and its exact byte revision, not replaced or later dates", () => {
  const doc=Buffer.from("---\r\ndescription: Date: not the masthead\r\n---\r\n# Memo\r\n\r\n**To:** Steward\r\n**Date:** 14 June 2026\r\n**Scope:** a body of research\r\n\r\n## History\r\n\r\nDate: 2026-08-20\r\n");
  // Quote the source field: this tests document parsing, not YAML failure.
  const bytes=Buffer.from(doc.toString().replace("description: Date: not the masthead",'description: "Date: not the masthead"'));
  assert.deepEqual(read(bytes),{sourceRevision:"sha256:"+createHash("sha256").update(bytes).digest("hex"),
    status:"document-date-observed",evidence:[{line:7,date:"2026-06-14"}]});
});

test("refuses borrowed dates and preserves ambiguous or unsupported observations", () => {
  const memo=(s)=>read(Buffer.from("# Memo\n\n"+s));
  for (const text of ["**Access date:** 2026-06-14","Some prose first.\n\nDate: 2026-06-14",
    "```md\nDate: 2026-06-14\n```","    Date: 2026-06-14","- Date: 2026-06-14",
    "## Subheading\nDate: 2026-06-14"]) assert.equal(memo(text).status,"no-supported-masthead-date");
  assert.equal(memo("**Date**: June 2026").status,"unresolved-document-date");
  assert.equal(memo("Date: 2026-02-30").status,"unresolved-document-date");
  const disputed=memo("Date: 2026-06-14\n**Date:** June 15, 2026");
  assert.equal(disputed.status,"conflicting-document-dates");
  assert.deepEqual(disputed.evidence.map(e=>e.date),["2026-06-14","2026-06-15"]);
});
