// Cross-layer conformance: does html-structural-projection-service's carrier
// codec (substrate) honour the settledDocument contract this sign layer
// defines? Moved here from html-structural-projection-service's own test
// suite, since importing the positing/settling document contract made that
// substrate package's test reach upward into sign-layer mathematics.
import assert from "node:assert/strict";
import test from "node:test";
import { cell } from "@red-cup-engineering/signcell/cell";
import { settleCells, documentOf } from "../src/settle.mjs";

test("carries trusted codec fragments and document chrome through a render fiber", async () => {
  const told = cell("page", "contains", "section", { for: [{ subject: "page", predicate: "contains", object: "section" }] });
  const document = documentOf(settleCells([told]));
  assert.equal(document.kind, "signcraft.document");
  const addresses = document.addresses.map((entry) => entry.key);
  assert.ok(addresses.length >= 1);
  const { htmlCarrierOf, buildHtmlDocumentPlan, renderHtmlDocument: renderHtmlDocumentFromPlan } = await import("@red-cup-engineering/html-structural-projection-service");
  const carrier = htmlCarrierOf(document, addresses.map((key) => ({
    kind: "rendering.htmlCarrier.node",
    nodeId: key,
    element: "main",
    semanticAddress: key,
    html: "<strong>trusted</strong>",
  })));
  assert.equal(carrier.kind, "rendering.htmlCarrier");
  assert.equal(carrier.carrierNotDocument.kind, "settledDocument.html_is_carrier_not_document:witness");
  assert.equal(carrier.carrierNotDocument.documentKind, "signcraft.document");
  const profile = {
    kind: "rendering.profile",
    name: "fixture",
    allowedElements: ["main"],
    allowedStyleBehavior: ["static"],
    allowedCompletionRegimes: ["strict"],
    obligations: [],
    preservationLaws: ["preserve-addresses", "preserve-order", "preserve-references", "preserve-valuation-sites", "carrier-not-document", "css-settles"],
  };
  const system = { kind: "rendering.css.system", carrier, declarations: [] };
  const fiber = buildHtmlDocumentPlan(profile, carrier, system, "static");
  assert.equal(fiber.kind, "rendering.profile_forms_render_fiber:witness");
  const rendered = renderHtmlDocumentFromPlan(fiber, {
    head: ['<meta name="fixture" content="yes">'],
    bodyAttributes: { class: "fixture", hidden: "" },
  }).html;
  assert.match(rendered, /<meta name="fixture" content="yes">/);
  assert.match(rendered, /<body class="fixture" hidden>/);
  assert.match(rendered, /<main data-render-node="[^"]+"><strong>trusted<\/strong><\/main>/);
});
