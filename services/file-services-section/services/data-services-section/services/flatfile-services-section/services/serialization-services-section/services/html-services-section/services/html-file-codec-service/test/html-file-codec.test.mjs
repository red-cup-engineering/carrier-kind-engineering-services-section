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
  ref,
  isRef,
  slug,
} from "../dist/html/index.mjs";
import { htmlDocumentBase, relTokens, scanHtmlStartTags } from "../dist/html/scan.mjs";
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

test("round-trips SHP entity references without degrading them to literals", () => {
  const html = project(fromSection({
    affirmed: [{ predicate: "depends-on", object: ref("arc42:5.8") }],
  }, { subject: "arc42:5.13a" }));
  const object = markup(html)[0]?.cell.object;
  assert.equal(isRef(object), true);
  assert.deepEqual(object, { ref: "arc42:5.8" });
  assert.match(html, /data-v="shp-ref:arc42:5\.8"/);
  assert.equal(slug("Crème brûlée"), "creme-brulee");
});

test("scans discovery tags without interpreting inert element bodies", () => {
  const html = '<base href="/root/"><script><a rel="bad"></a></script><a REL="Me alternate" href="u&#x2f;1">ok</a>';
  const tags = scanHtmlStartTags(html);
  assert.deepEqual(tags.map(({ name }) => name), ["base", "script", "a"]);
  assert.deepEqual(relTokens(tags[2].attrs), ["me", "alternate"]);
  assert.equal(tags[2].attrs.href, "u/1");
  assert.equal(htmlDocumentBase(html, "https://example.test/fallback"), "https://example.test/root/");
});

test("carries trusted codec fragments and document chrome through a render fiber", async () => {
  const source = await import("@lenticule-science/articulating/predicating/positing/settling/document");
  const document = Object.freeze({
    kind: "settledDocument.fixedPoint",
    source: {},
    fixedPoint: {},
    reading: {},
    addresses: Object.freeze([{ kind: "settledDocument.address", key: "root", cell: {} }]),
    order: Object.freeze([]),
    references: Object.freeze([]),
    valuationSites: Object.freeze([{ kind: "settledDocument.valuationSite", address: "root", value: "potential", meme: {} }]),
  });
  assert.equal(typeof source.html_is_carrier_not_document, "function");
  const { htmlCarrierOf, profile_forms_render_fiber, renderHtmlFiber } = await import("../dist/html/index.mjs");
  const carrier = htmlCarrierOf(document, [{
    kind: "rendering.htmlCarrier.node",
    nodeId: "root",
    element: "main",
    semanticAddress: "root",
    html: "<strong>trusted</strong>",
  }]);
  assert.equal(carrier.kind, "rendering.htmlCarrier");
  const profile = {
    kind: "rendering.profile",
    name: "fixture",
    allowedElements: ["main"],
    allowedStyleBehavior: ["static"],
    allowedCompletionRegimes: ["ordinal.closure.regime.finite"],
    obligations: [],
    preservationLaws: ["preserve-addresses", "preserve-order", "preserve-references", "preserve-valuation-sites", "carrier-not-document", "css-settles"],
  };
  const system = { kind: "rendering.css.system", carrier, completionRegime: "ordinal.closure.regime.finite", declarations: [] };
  const fiber = profile_forms_render_fiber(profile, carrier, system, "static");
  assert.equal(fiber.kind, "rendering.profile_forms_render_fiber:witness");
  const rendered = renderHtmlFiber(fiber, {
    head: ['<meta name="fixture" content="yes">'],
    bodyAttributes: { class: "fixture", hidden: "" },
  }).html;
  assert.match(rendered, /<meta name="fixture" content="yes">/);
  assert.match(rendered, /<body class="fixture" hidden>/);
  assert.match(rendered, /<main data-render-node="root"><strong>trusted<\/strong><\/main>/);
});
