import assert from "node:assert/strict";
import test from "node:test";
import {
  escapeAttr,
  fromSection,
  lint,
  markup,
  project,
} from "../dist/html/index.mjs";
import {
  htmlElement,
  renderHtmlDocument,
  renderHtmlNode,
} from "../dist/html/document-nodes.mjs";

test("projects and reads a finite SHP carrier with escaped coordinates", () => {
  const dataform = fromSection({
    affirmed: [{ predicate: "says", object: "<safe & readable>", citation: "source" }],
  }, { subject: "subject & value", title: "SHP <packet>" });
  const html = project(dataform);

  assert.match(html, /data-e="subject &amp; value"/);
  assert.match(html, /&lt;safe &amp; readable&gt;/);
  assert.deepEqual(markup(html).map(({ cell }) => cell), [{
    subject: "subject & value",
    predicate: "says",
    object: "<safe & readable>",
  }]);
  assert.deepEqual(lint(html).violations.filter(({ severity }) => severity === "error"), []);
});

test("assembles HTML documents through the canonical escaped node tree", () => {
  assert.equal(escapeAttr('"<&'), "&quot;&lt;&amp;");
  assert.equal(renderHtmlNode(htmlElement("a", { href: "?q=<safe>" }, ["safe & readable"])),
    '<a href="?q=&lt;safe&gt;">safe &amp; readable</a>');
  assert.match(renderHtmlDocument({ head: [], body: [htmlElement("main", {}, ["<body>"])] }), /<main>&lt;body&gt;<\/main>/);
});
