import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { previewNoteFrontmatterAdditions } from "@red-cup-engineering/carrier-kind-engineering-services-section/note-frontmatter-preview";

const origin = Buffer.from("---\r\ntitle: Original # keep this\r\nauthor: Unchanged\r\n---\r\n\r\nBody\r\n");
const rev = source => "sha256:" + createHash("sha256").update(source).digest("hex");
const approved = { description: "Provenance note with an independently reviewed description.", "date-created": "2026-10-05" };

test("reviewed values are added to the exact YAML source without rewriting existing spelling or CRLF", () => {
  const expectedRevision=rev(origin);
  const outcome = previewNoteFrontmatterAdditions({bytes:origin,expectedRevision,additions:approved});
  assert.equal(outcome.sourceRevision,expectedRevision);
  assert.equal(outcome.candidateRevision,rev(outcome.text));
  assert.equal(outcome.text.replace(/^description: .*\r\n|^date-created: .*\r\n/gmu,""),origin.toString("utf8"));
  assert.notEqual(outcome.candidateRevision,expectedRevision);
});

test("stale source, mutation of original fields and failed admission refuse instead of returning a candidate", () => {
  const preview=(additions,bytes=origin,expectedRevision=rev(bytes))=>previewNoteFrontmatterAdditions({bytes,expectedRevision,additions});
  assert.throws(()=>preview(approved, Buffer.concat([origin,Buffer.from("changed")]),rev(origin)),/reviewed source revision/);
  assert.throws(()=>preview({...approved,title:"Overwritten"}),/preserving authored/);
  assert.throws(()=>preview({...approved,visibility:"public"}),/only reviewed/);
  assert.throws(()=>preview({ description: approved.description }),/required:date-created/);
  assert.throws(()=>preview({...approved,"date-created":"unproven"}),/admission/);
  const pointer=Buffer.from(origin.toString().replace("author:", "status: relocated-research-source\r\nauthor:"));
  assert.throws(()=>preview(approved,pointer),/relocation pointer/);
  const invalidUtf = Buffer.concat([origin,Buffer.from([0xff])]);
  assert.throws(()=>preview(approved,invalidUtf),TypeError);
  const accessor=Object.defineProperty({...approved},"title",{enumerable:true,get(){assert.fail("must not invoke getter");}});
  assert.throws(()=>preview(accessor),/only reviewed/);
});

test("a reviewed YAML boundary can recover already authored fields with one CRLF", async () => {
  const {previewNoteFrontmatterLineSplit: split}=await import("@red-cup-engineering/carrier-kind-engineering-services-section/note-frontmatter-preview");
  const text='---\r\ntitle: Observed\r\nabstract: "A preserved abstract."keywords:\r\n  - history\r\ndate-created: 2026-07-07\r\ndescription: A preserved document.\r\n---\r\n\r\nOriginal Body.\r\n';
  const bytes=Buffer.from(text);
  const opts={bytes,expectedRevision:rev(bytes),line:3,key:"keywords"};
  const result=split(opts);
  assert.equal(result.text,text.replace('."keywords:','."\r\nkeywords:'));
  assert.equal(result.candidateRevision,rev(result.text));
  assert.throws(()=>split({...opts,line:9}),/inside the original YAML/);
  assert.throws(()=>split({...opts,key:"other"}),/not a quoted scalar/);
  assert.throws(()=>split({...opts,expectedRevision:rev("different source")}),/source revision/);
  const fixed=Buffer.from(result.text);
  assert.throws(()=>split({...opts,bytes:fixed,expectedRevision:rev(fixed)}),/already valid/);
});
