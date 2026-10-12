import assert from "node:assert/strict";
import test from "node:test";

import { htmlElement } from "@red-cup-engineering/html-structural-projection-service/document-nodes";
import { programFormHtml } from "@red-cup-engineering/computer-web-server/platform-http/program-html";
import {
  renderStaticWebsiteHtmlPresentation,
  staticWebsiteBodyAttributes,
} from "@red-cup-engineering/static-site-publisher/sites/static-website/render/html-presentation";

test("program form renders typed controls through the current HTML projection API", () => {
  const html = programFormHtml({
    name: "bounded<operation>",
    href: "/bounded-operation",
    method: "POST",
    input: "application/json",
    output: "application/json",
    summary: "Run <safely> & visibly",
    description: "A quoted \"description\"",
    domainSchema: Object.freeze({
      type: "object",
      required: Object.freeze(["count"]),
      properties: Object.freeze({
        count: Object.freeze({ type: "integer" }),
        enabled: Object.freeze({ type: "boolean" }),
        mode: Object.freeze({ enum: Object.freeze(["fast", "careful"]) }),
      }),
    }),
  }, "/actions");

  assert.match(html, /^<!doctype html>/iu);
  assert.match(html, /action="\/actions\/bounded%3Coperation%3E\?input-format=form"/u);
  assert.match(html, /name="count"[^>]*required/u);
  assert.match(html, /name="enabled"/u);
  assert.match(html, /value="careful"/u);
  assert.match(html, /Run &lt;safely&gt; &amp; visibly/u);
  assert.equal(html.includes("<safely>"), false);
});

test("static presentation preserves head fragments and escapes body attributes and text", () => {
  const html = renderStaticWebsiteHtmlPresentation({
    title: "A <page>",
    token: "page:test",
    claim: "renders-test-page",
    lang: "en",
    head: Object.freeze([htmlElement("meta", { name: "description", content: "head & evidence" })]),
    bodyAttributes: Object.freeze({
      ...staticWebsiteBodyAttributes({ lens: "test-lens" }),
      "data-hostile": "quote\" <tag>",
    }),
    roots: Object.freeze(["main"]),
    nodes: Object.freeze([
      Object.freeze({ nodeId: "main", element: "main", children: Object.freeze(["title"]) }),
      Object.freeze({ nodeId: "title", element: "h1", text: "Hello <script>alert(1)</script>" }),
    ]),
  });

  assert.match(html, /^<!doctype html>/iu);
  assert.match(html, /<html lang="en">/u);
  assert.match(html, /<meta name="description" content="head &amp; evidence">/u);
  assert.match(html, /<body[^>]*data-hostile="quote&quot; &lt;tag&gt;"/u);
  assert.match(html, /Hello &lt;script&gt;alert\(1\)&lt;\/script&gt;/u);
  assert.equal(html.includes("<script>alert(1)</script>"), false);
});
