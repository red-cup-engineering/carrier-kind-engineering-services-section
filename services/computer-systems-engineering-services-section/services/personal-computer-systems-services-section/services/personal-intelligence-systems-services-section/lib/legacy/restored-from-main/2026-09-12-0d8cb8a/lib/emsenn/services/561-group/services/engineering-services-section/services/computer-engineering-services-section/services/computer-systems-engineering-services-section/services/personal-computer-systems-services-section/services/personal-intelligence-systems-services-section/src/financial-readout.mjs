import {
  buildHtmlDocumentPlan,
  htmlCarrierOf,
  renderHtmlDocument,
} from "@red-cup-engineering/html-document-render-service";

const PROFILE = Object.freeze({
  kind: "rendering.profile",
  name: "private-financial-readout",
  allowedElements: ["main", "h1", "p", "section", "h2", "dl", "dt", "dd"],
  allowedStyleBehavior: ["static"],
  allowedCompletionRegimes: ["ordinal.closure.regime.finite"],
  obligations: ["preserve-observation-identity", "preserve-observation-time", "preserve-unknowns"],
  preservationLaws: ["preserve-addresses", "preserve-order", "preserve-references", "preserve-valuation-sites", "carrier-not-document", "css-settles"],
});

function requireText(value, label) {
  if (typeof value !== "string" || value.length === 0) throw new TypeError(`${label} must be a nonempty string`);
  return value;
}

function jsonText(value) {
  return typeof value === "string" ? value : JSON.stringify(value);
}

/**
 * Render a private readout from caller-owned dated observations. This function
 * accepts no credentials and performs no access decision; its host must make
 * the receiver authenticated before it calls this renderer.
 * @param {{ title: string, asOf: string, observations: readonly { id: string, observedAt: string, label: string, value: unknown, status: "observed"|"unknown" }[] }} input
 * @returns {{ kind: "PrivateFinancialReadout", html: string, observationIds: readonly string[] }}
 */
export function renderPrivateFinancialReadout(input) {
  const title = requireText(input?.title, "title");
  const asOf = requireText(input?.asOf, "asOf");
  if (!Array.isArray(input?.observations)) throw new TypeError("observations must be an array");
  const nodes = [
    { kind: "rendering.htmlCarrier.node", nodeId: "readout", element: "main", semanticAddress: "readout", children: ["title", "as-of", "observations"] },
    { kind: "rendering.htmlCarrier.node", nodeId: "title", element: "h1", semanticAddress: "title", text: title },
    { kind: "rendering.htmlCarrier.node", nodeId: "as-of", element: "p", semanticAddress: "as-of", text: `As of ${asOf}` },
    { kind: "rendering.htmlCarrier.node", nodeId: "observations", element: "section", semanticAddress: "observations", children: input.observations.map((_, index) => `observation-${index}`) },
  ];
  for (const [index, observation] of input.observations.entries()) {
    const id = requireText(observation?.id, `observations[${index}].id`);
    const observedAt = requireText(observation?.observedAt, `observations[${index}].observedAt`);
    const label = requireText(observation?.label, `observations[${index}].label`);
    if (observation.status !== "observed" && observation.status !== "unknown") throw new TypeError(`observations[${index}].status must be observed or unknown`);
    const root = `observation-${index}`;
    nodes.push(
      { kind: "rendering.htmlCarrier.node", nodeId: root, element: "section", semanticAddress: root, children: [`${root}-title`, `${root}-terms`] },
      { kind: "rendering.htmlCarrier.node", nodeId: `${root}-title`, element: "h2", semanticAddress: `${root}-title`, text: label },
      { kind: "rendering.htmlCarrier.node", nodeId: `${root}-terms`, element: "dl", semanticAddress: `${root}-terms`, children: [`${root}-id-key`, `${root}-id-value`, `${root}-time-key`, `${root}-time-value`, `${root}-status-key`, `${root}-status-value`, `${root}-value-key`, `${root}-value-value`] },
      { kind: "rendering.htmlCarrier.node", nodeId: `${root}-id-key`, element: "dt", semanticAddress: `${root}-id-key`, text: "Source" },
      { kind: "rendering.htmlCarrier.node", nodeId: `${root}-id-value`, element: "dd", semanticAddress: `${root}-id-value`, text: id },
      { kind: "rendering.htmlCarrier.node", nodeId: `${root}-time-key`, element: "dt", semanticAddress: `${root}-time-key`, text: "Observed" },
      { kind: "rendering.htmlCarrier.node", nodeId: `${root}-time-value`, element: "dd", semanticAddress: `${root}-time-value`, text: observedAt },
      { kind: "rendering.htmlCarrier.node", nodeId: `${root}-status-key`, element: "dt", semanticAddress: `${root}-status-key`, text: "Status" },
      { kind: "rendering.htmlCarrier.node", nodeId: `${root}-status-value`, element: "dd", semanticAddress: `${root}-status-value`, text: observation.status },
      { kind: "rendering.htmlCarrier.node", nodeId: `${root}-value-key`, element: "dt", semanticAddress: `${root}-value-key`, text: "Reading" },
      { kind: "rendering.htmlCarrier.node", nodeId: `${root}-value-value`, element: "dd", semanticAddress: `${root}-value-value`, text: jsonText(observation.value) },
    );
  }
  const document = {
    kind: "private-financial-readout.document",
    addresses: nodes.map(({ nodeId }) => ({ key: nodeId })),
    order: [], references: [],
    valuationSites: nodes.map(({ nodeId }) => ({ address: nodeId })),
  };
  const carrier = htmlCarrierOf(document, nodes);
  if (carrier.kind !== "rendering.htmlCarrier") throw new TypeError(`financial readout carrier obstructed: ${carrier.reason}`);
  const system = { kind: "rendering.css.system", carrier, completionRegime: "ordinal.closure.regime.finite", declarations: [] };
  const fiber = buildHtmlDocumentPlan(PROFILE, carrier, system, "static");
  if (fiber.kind !== "rendering.profile_forms_render_fiber:witness") throw new TypeError(`financial readout render obstructed: ${fiber.reason}`);
  return Object.freeze({ kind: "PrivateFinancialReadout", html: renderHtmlDocument(fiber, { title }).html, observationIds: Object.freeze(input.observations.map(({ id }) => id)) });
}

/**
 * Serve one renderer result through a host-owned authentication decision.
 * The caller supplies both boundaries so this reusable receiver neither
 * accepts credentials nor decides which record a principal may read.
 * @param {Request} request
 * @param {{ authorize: (request: Request) => Promise<boolean>|boolean, read: () => Promise<{ title: string, asOf: string, observations: readonly object[] }>|{ title: string, asOf: string, observations: readonly object[] } }} dependencies
 * @returns {Promise<Response>}
 */
export async function handlePrivateFinancialReadout(request, { authorize, read } = {}) {
  if (!(request instanceof Request)) throw new TypeError("request must be a Request");
  if (typeof authorize !== "function" || typeof read !== "function") throw new TypeError("authorize and read must be functions");
  if (!(await authorize(request))) return new Response(null, { status: 401, headers: { "cache-control": "no-store" } });
  const rendered = renderPrivateFinancialReadout(await read());
  return new Response(rendered.html, {
    status: 200,
    headers: { "cache-control": "private, no-store", "content-type": "text/html; charset=utf-8" },
  });
}
