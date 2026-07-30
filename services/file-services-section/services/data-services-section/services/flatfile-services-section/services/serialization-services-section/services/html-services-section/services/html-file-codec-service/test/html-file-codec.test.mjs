import assert from "node:assert/strict";
import test from "node:test";
import {
  attrs,
  classes,
  el,
  escapeAttr,
  escapeHtml,
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

test("preserves the microformat string-rendering wire contract", () => {
  assert.equal(escapeHtml(null), "");
  assert.equal(escapeHtml(`A'B&<\"`), "A&#39;B&amp;&lt;&quot;");
  assert.equal(attrs({ disabled: true, title: "A'B&<", omit: false }),
    ' disabled title="A&#39;B&amp;&lt;"');
  assert.equal(classes("h-entry alpha", "alpha beta"), "h-entry alpha beta");
  assert.equal(el("img", { alt: "A&B" }), '<img alt="A&amp;B" />');
  assert.equal(el("span", { class: "p-name" }, ["A", "B"]), '<span class="p-name">AB</span>');
});
