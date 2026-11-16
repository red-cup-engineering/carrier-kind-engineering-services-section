import test from "node:test";
import assert from "node:assert/strict";
import { compileJsonSchema } from "@red-cup-engineering/json-schema-engineering-services-section/validation";
import TERM from "@red-cup-engineering/term-engineering-services-section/term.schema.json" with {type:"json"};
import { admitCarrierFrontmatter } from "@red-cup-engineering/carrier-kind-engineering-services-section";
const base={title:"Source note",description:"A witness to a source condition.","date-created":"2026-11-16"};
const admit=provenance=>admitCarrierFrontmatter("note",{...base,provenance});
const term=compileJsonSchema({$schema:"https://json-schema.org/draft/2020-12/schema",$ref:"glossary/terms/term#/properties/provenance"},{references:[TERM]});

test("note provenance preserves strict shared custody and witnesses typed note-origin fields",()=>{
  const custody = {
    "date-created":"2026-11-16","date-modified":"2026-11-17","date-updated":"2026-11-17",
    sources:["Known repository"],authors:["Recorded author"],tags:["research"],id:"note-id",
    domain:"research",scheme:"notes",status:"recorded",utterances:["ni:///sha-256;"+"A".repeat(43)],
  };
  const observation = {
    "source-date":"2000-02-29","user-source-date":"2024-02-29",question:"An authored question?",
    "exact-leader-utterance":"Exact authored words.","subsequent-leader-utterance":"Subsequent words.","latest-leader-utterance":"Latest words.",
    "associated-work":"https://example.org/issues/23","related-science":"https://example.org/issues/19",
    "receiving-engineering-work":"https://example.org/issues/4",
    "original-science-concept":"content/text/glossary/concepts/example.md","source-measurement":"content/text/documents/articles/notes/example.md",
  };
  assert.equal(admit(custody).admitted,true);
  assert.equal(term.validate(custody).valid,true);
  assert.equal(admit({...custody,...observation}).admitted,true);
  assert.equal(term.validate(observation).valid,false);
  assert.equal(admit({}).admitted,true);
});

test("note-origin variants refuse untyped evidence, invented locators and calendar overflows",()=>{
  const refused=[
    "A historical scalar note.",
    {"source-date":"1900-02-29"}, {"source-date":"2026-04-31"},
    {"user-source-date":"June 2026"}, {"source-date":"wrong"},
    {question:["text"]}, {"exact-leader-utterance":"  "},
    {"related-science":"javascript:alert(1)"}, {"associated-work":"not a locator"}, {"receiving-engineering-work":{url:"https://example.org"}},
    {"source-measurement":"/absolute/local.md"},{"source-measurement":"content/../outside.md"},
    {"original-science-concept":"https://example.org/external.md"},
    {utterances:["verbatim text is not a custody address"]}, {untyped:true},
  ];
  for(const p of refused) assert.equal(admit(p).admitted,false,JSON.stringify(p));
  assert.equal(admit({"source-date":"2400-02-29"}).admitted,true);
});

test("note attribution and timed source citations do not relax the shared utterance contract",()=>{
  const id="ni:///sha-256;"+"M".repeat(43);
  const source={
    office:"Recorded office and pass",
    "written-by":"Recorded writing attribution",
    authors:["Recorded author"],
    request:"https://example.org/issues/7",
    question:"Different authored question",
    "see-also":["A contextual cross-reference"],
    "utterance-index":"Context from a dated source index",
    utterances:[id],
    "utterance-citations":[{address:id,"source-day":"2024-02-29","utc-minute":"23:59Z"}],
  };
  assert.equal(admit(source).admitted,true);
  assert.equal(term.validate(source).valid,false);
  assert.equal(term.validate({authors:source.authors,utterances:[id]}).valid,true);
  for(const patch of [{address:"context, not an address"},{"source-day":"2025-02-29"},
    {"utc-minute":"24:00Z"},{"utc-minute":"23:59:00Z"},{untyped:"text"}]){
    const bad={...source,"utterance-citations":[{...source["utterance-citations"][0],...patch}]};
    assert.equal(admit(bad).admitted,false,JSON.stringify(patch));
  }
  for(const patch of [{utterances:id+" (2024-02-29T23:59Z)"},{utterances:[id+" (2024-02-29T23:59Z)"]},
    {request:"not a work locator"},{"see-also":[" "]},{"utterance-index":[]}])
    assert.equal(admit({...source,...patch}).admitted,false,JSON.stringify(patch));
});
