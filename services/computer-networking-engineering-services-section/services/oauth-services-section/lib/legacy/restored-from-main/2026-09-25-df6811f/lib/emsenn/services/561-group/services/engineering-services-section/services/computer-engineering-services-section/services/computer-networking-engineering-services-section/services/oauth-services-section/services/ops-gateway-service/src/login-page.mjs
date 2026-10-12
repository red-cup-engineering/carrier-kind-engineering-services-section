import { htmlCarrierOf, buildHtmlDocumentPlan, renderHtmlDocument } from "@red-cup-engineering/html-engineering-services-section/html-document-render";


/**
 * Render the gateway's trusted login fragment through the shared HTML and CSS owner.
 * @param {string} title Page title.
 * @param {string} html Gateway-authored markup with no unescaped user content.
 * @returns {string} Complete responsive HTML document.
 */
export function renderLoginPage(title, html) {
  const document = {
    kind: "ops-browser.login",
    addresses: [{ key: "login" }],
    order: [],
    references: [],
    valuationSites: [],
  };
  const carrier = htmlCarrierOf(document, [{
    kind: "rendering.htmlCarrier.node", nodeId: "login", semanticAddress: "login",
    element: "main", html,
  }]);
  const profile = {
    kind: "rendering.profile", name: "ops-browser.login", allowedElements: ["main"],
    allowedStyleBehavior: ["static"], allowedCompletionRegimes: ["ordinal.closure.regime.finite"],
    obligations: [], preservationLaws: [
      "preserve-addresses", "preserve-order", "preserve-references",
      "preserve-valuation-sites", "carrier-not-document", "css-settles",
    ],
  };
  const declarations = Object.entries({
    "font-family": "system-ui, sans-serif", "font-size": "1.1rem", "line-height": "1.6",
    "max-width": "34rem", margin: "8vh auto", padding: "2rem",
    color: "#18312c", background: "#f3f7f5", border: "1px solid #cadbd3",
    "border-radius": "1rem", "overflow-wrap": "anywhere",
  }).map(([property, value]) => ({ kind: "rendering.css.declaration", nodeId: "login", property, value }));
  const plan = buildHtmlDocumentPlan(profile, carrier, {
    kind: "rendering.css.system", carrier, completionRegime: "ordinal.closure.regime.finite", declarations,
  }, "static");
  return renderHtmlDocument(plan, { title }).html;
}
