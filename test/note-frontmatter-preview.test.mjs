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

test("recovers a witnessed TOML title by changing exactly one token in the original note", async () => {
  const { previewWitnessedNoteTitle } = await import("@red-cup-engineering/carrier-kind-engineering-services-section/note-frontmatter-preview");
  const encode = s => Buffer.from(s);
  const revision = rev;
  const a = '\uFEFF+++\r\nid = "paper"\r\ntitle = "Abstract"\r\ndescription = "Original description"\r\nauthors = ["Author"]\r\ndate-created = "2025-11-09"\r\n+++\r\n# Abstract\r\n\r\nOriginal body.\r\n';
  const b = a.replace('"Abstract"', () => '"On $& and cognition"').replace('date-created', 'date_created');
  const bytes=encode(a), witnessBytes=encode(b);
  const result=previewWitnessedNoteTitle({bytes,expectedRevision:revision(bytes),witnessBytes,expectedWitnessRevision:revision(witnessBytes)});
  assert.equal(result.text,a.replace('"Abstract"',()=>'"On $& and cognition"'));
});

test("title recovery refuses stale, wrong-body or mismatched author/date witnesses", async () => {
  const { previewWitnessedNoteTitle } = await import("@red-cup-engineering/carrier-kind-engineering-services-section/note-frontmatter-preview");
  const a = '+++\nid = "paper"\ntitle = "Abstract"\ndescription = "Original description"\nauthors = ["Author"]\ndate-created = "2025-11-09"\n+++\n# Abstract\n\nOriginal body.\n';
  const source=Buffer.from(a);
  const b = a.replace('"Abstract"', '"Witness"');
  const check=(other,expected)=>{ const bytes=Buffer.from(other); return previewWitnessedNoteTitle({bytes:source,expectedRevision:rev(source),witnessBytes:bytes,expectedWitnessRevision:expected??rev(bytes)}); };
  assert.throws(()=>check(b,"wrong"),/reviewed revisions/);
  assert.throws(()=>check(b.replace("Original body.","Different body.")),/same nonempty/);
  assert.throws(()=>check(b.replace('"Author"','"Other"')),/agree/);
  assert.throws(()=>check(b.replace("2025-11-09","2025-10-11")),/agree/);
  assert.throws(()=>check(b.replace('id = "paper"', 'id = "other"')),/agree/);
});

test("labels an exact reviewed abstract excerpt and changes only a witnessed draft header echo", async () => {
  const { previewNoteDescriptionExcerpt } = await import("@red-cup-engineering/carrier-kind-engineering-services-section/note-frontmatter-preview");
  const line = "This paper describes an original **model** without asserting that the result is proven.";
  const echo = '+++ id = "paper" title = "Abstract" authors = ["Author"] status = "draft" documenttype =…';
  const original = ['\uFEFF+++', 'id = "paper"', 'title = "Actual title"', "description = " + JSON.stringify(echo),
    'date-created = "2025-11-09"', 'status = "draft"', 'published = false', '+++', '# Abstract', '', line + '  ', '', '# Body', 'Retained body.', ''].join("\r\n");
  const bytes = Buffer.from(original);
  const got = previewNoteDescriptionExcerpt({bytes, expectedRevision:rev(bytes), excerpt:line});
  assert.equal(got.abstractBodyLine,3);
  assert.equal(got.text, original.replace(JSON.stringify(echo), JSON.stringify("Abstract excerpt: " + line)));
  assert.equal(got.candidateRevision,rev(got.text));
});

test("description preview refuses invented, fenced, cited, unrelated or already meaningful source", async () => {
  const { previewNoteDescriptionExcerpt } = await import("@red-cup-engineering/carrier-kind-engineering-services-section/note-frontmatter-preview");
  const line = "This paper describes a source model without a claim that the result is verified.";
  const echo = '+++ id = "paper" title = "Abstract" authors = ["Author"] status = "draft" documenttype =…';
  const header = ['+++','id = "paper"','title = "Actual title"',"description = " + JSON.stringify(echo),
    'date-created = "2025-11-09"','status = "draft"','published = false','+++'].join("\n") + "\n";
  const apply = (text, excerpt = line) => { const bytes=Buffer.from(text); return previewNoteDescriptionExcerpt({bytes,expectedRevision:rev(bytes),excerpt}); };
  assert.throws(()=>apply(header+"# Abstract\n\n```md\n"+line+"\n```\n"),/one exact prose/);
  assert.throws(()=>apply(header+"# Abstract\n\n"+line+"\n(NO_ITEM_DATA:missing)\n"),/one exact prose/);
  assert.throws(()=>apply(header+"# Abstract\n\n"+line+"\n", "An invented but otherwise plausible description that is not in the note."),/one exact prose/);
  assert.throws(()=>apply(header+"# Abstract\n\nDifferent source.\n\n# Later\n"+line+"\n"),/one exact prose/);
  assert.throws(()=>apply(header.replace(JSON.stringify(echo), '"An actual description."')+"# Abstract\n"+line+"\n"),/draft can be replaced/);
  assert.throws(()=>apply(header.replace('published = false','published = true')+"# Abstract\n"+line+"\n"),/draft can be replaced/);
  assert.throws(()=>apply(header+"# Abstract\n"+line+"\n",line+"(NO_ITEM_DATA:missing)."),/placeholder-free/);
});
