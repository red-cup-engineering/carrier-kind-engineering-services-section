/** HTML carrier validation; SHP serialization is owned by the shared HTML codec. */
export * from "@red-cup-engineering/html-structural-projection-service";
import { escapeText, escapeAttr, type HtmlValue } from "@red-cup-engineering/html-structural-projection-service";
import type { Matrix } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/analysis/exact-number";
import type { ColoringFactorMapJudgment } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/analysis/coloring";
import type { FormatRegime } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/analysis/formats-four";
import { html_is_carrier_not_document, type Document, type DocumentAddress, type DocumentOrder,
  type DocumentReference, type DocumentValuationSite, type HtmlIsCarrierNotDocumentWitness
} from "@lenticule-science/metrologic/articulation/predicating/positing/settling/document";
import { checkClassMapsValid as css_classes_are_factor_maps, resolveNodeStyles as cssVisualValuation
} from "@red-cup-engineering/css-style-resolution-service";
export { css_classes_are_factor_maps, cssVisualValuation };

/* ── carrier / CSS valuation / profile fiber ───────────────────────────── */

export interface HtmlCarrierNode {
  readonly kind: "rendering.htmlCarrier.node";
  readonly nodeId: string;
  readonly element: string;
  readonly semanticAddress: string;
  readonly valuationSite?: string;
  readonly attributes?: Readonly<Record<string, HtmlValue>>;
  readonly text?: HtmlValue;
  readonly children?: readonly string[];
}

export interface HtmlCarrierOf<D extends Document = Document> {
  readonly kind: "rendering.htmlCarrier";
  readonly document: D;
  readonly nodes: readonly HtmlCarrierNode[];
  readonly carriedAddresses: readonly DocumentAddress[];
  readonly carriedOrder: readonly DocumentOrder[];
  readonly carriedReferences: readonly DocumentReference[];
  readonly carriedValuationSites: readonly DocumentValuationSite[];
  readonly carrierNotDocument: HtmlIsCarrierNotDocumentWitness;
}

export interface HtmlCarrierObstruction {
  readonly kind: "rendering.htmlCarrier-obstruction";
  readonly reason:
    | "missing-address"
    | "missing-order"
    | "missing-reference"
    | "missing-valuation-site"
    | "duplicate-node";
  readonly key: string;
}

export type HtmlCarrierJudgment<D extends Document = Document> = HtmlCarrierOf<D> | HtmlCarrierObstruction;

const nodeIdSet = (nodes: readonly HtmlCarrierNode[]): Set<string> => new Set(nodes.map((node) => node.nodeId));
const addressSet = (nodes: readonly HtmlCarrierNode[]): Set<string> => new Set(nodes.map((node) => node.semanticAddress));

const firstDuplicate = (values: readonly string[]): string | undefined => {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) return value;
    seen.add(value);
  }
  return undefined;
};

const carrierObstruction = (reason: HtmlCarrierObstruction["reason"], key: string): HtmlCarrierObstruction =>
  Object.freeze({ kind: "rendering.htmlCarrier-obstruction" as const, reason, key });

/** Admit HTML only as a semantic carrier of the settled document spine. */
export function htmlCarrierOf<D extends Document>(
  document: D,
  nodes: readonly HtmlCarrierNode[],
): HtmlCarrierJudgment<D> {
  const duplicate = firstDuplicate(nodes.map((node) => node.nodeId));
  if (duplicate !== undefined) return carrierObstruction("duplicate-node", duplicate);
  const addresses = addressSet(nodes);
  for (const address of document.addresses) {
    if (!addresses.has(address.key)) return carrierObstruction("missing-address", address.key);
  }
  for (const edge of document.order) {
    if (!addresses.has(edge.before) || !addresses.has(edge.after)) {
      return carrierObstruction("missing-order", `${edge.before}->${edge.after}`);
    }
  }
  for (const reference of document.references) {
    if (!addresses.has(reference.from) || !addresses.has(reference.to)) {
      return carrierObstruction("missing-reference", `${reference.from}->${reference.to}`);
    }
  }
  const valuationSites = new Set(nodes.map((node) => node.valuationSite ?? node.semanticAddress));
  for (const site of document.valuationSites) {
    if (!valuationSites.has(site.address)) return carrierObstruction("missing-valuation-site", site.address);
  }
  return Object.freeze({
    kind: "rendering.htmlCarrier" as const,
    document,
    nodes: Object.freeze([...nodes]),
    carriedAddresses: document.addresses,
    carriedOrder: document.order,
    carriedReferences: document.references,
    carriedValuationSites: document.valuationSites,
    carrierNotDocument: html_is_carrier_not_document(document, "rendering.htmlCarrier"),
  });
}

export interface CssDeclaration {
  readonly kind: "rendering.css.declaration";
  readonly nodeId: string;
  readonly property: string;
  readonly value: string;
  readonly priority?: number;
  readonly sourceOrder?: number;
}

export interface CssClassFactorMap {
  readonly kind: "rendering.css.classFactorMap";
  readonly constraintGraph: Matrix;
  readonly nodeIds: readonly string[];
  readonly classes: readonly number[];
  readonly alphabet: readonly string[];
}

export interface CssSystem<H extends HtmlCarrierOf = HtmlCarrierOf> {
  readonly kind: "rendering.css.system";
  readonly carrier: H;
  readonly completionRegime: FormatRegime;
  readonly declarations: readonly CssDeclaration[];
  readonly classFactorMap?: CssClassFactorMap;
}

export interface CssVisualSite {
  readonly kind: "rendering.css.visualSite";
  readonly nodeId: string;
  readonly property: string;
  readonly value: string;
  readonly declaration: CssDeclaration;
}

export interface CssVisualValuation<H extends HtmlCarrierOf = HtmlCarrierOf> {
  readonly kind: "rendering.css.visualValuation";
  readonly carrier: H;
  readonly completionRegime: FormatRegime;
  readonly sites: readonly CssVisualSite[];
}

export interface CssSettleWitness<H extends HtmlCarrierOf = HtmlCarrierOf> {
  readonly kind: "rendering.css_settles_to_valuation:witness";
  readonly system: CssSystem<H>;
  readonly valuation: CssVisualValuation<H>;
  readonly cascadeClosed: true;
  readonly idempotent: true;
}

export interface CssClassFactorMapWitness {
  readonly kind: "rendering.css_classes_are_factor_maps:witness";
  readonly classes: CssClassFactorMap;
  readonly factorMap: ColoringFactorMapJudgment & { readonly kind: "meme-analysis.coloring.factorMap:witness" };
  readonly finiteAlphabet: true;
}

export interface CssClassFactorMapObstruction {
  readonly kind: "rendering.css_classes_are_factor_maps-obstruction";
  readonly classes: CssClassFactorMap;
  readonly reason:
    | "length-mismatch"
    | "matrix-size-mismatch"
    | "non-finite-alphabet"
    | "class-outside-alphabet"
    | "not-factor-map";
  readonly key: string;
  readonly factorMap?: ColoringFactorMapJudgment;
}

export type CssClassFactorMapJudgment = CssClassFactorMapWitness | CssClassFactorMapObstruction;

const declarationRank = (decl: CssDeclaration): readonly [number, number] =>
  Object.freeze([decl.priority ?? 0, decl.sourceOrder ?? 0] as const);

const declarationKey = (decl: CssDeclaration): string => `${decl.nodeId}\u0000${decl.property}`;

const chooseDeclaration = (left: CssDeclaration, right: CssDeclaration): CssDeclaration => {
  const [leftPriority, leftOrder] = declarationRank(left);
  const [rightPriority, rightOrder] = declarationRank(right);
  if (rightPriority > leftPriority) return right;
  if (rightPriority < leftPriority) return left;
  return rightOrder >= leftOrder ? right : left;
};



const sameVisualValuation = (left: CssVisualValuation, right: CssVisualValuation): boolean =>
  JSON.stringify(left.sites.map(({ nodeId, property, value }) => [nodeId, property, value]))
  === JSON.stringify(right.sites.map(({ nodeId, property, value }) => [nodeId, property, value]));

/** The cascade settles to an idempotent visual valuation over carrier nodes. */
export function css_settles_to_valuation<H extends HtmlCarrierOf>(system: CssSystem<H>): CssSettleWitness<H> {
  const valuation = cssVisualValuation(system);
  const declarations = Object.freeze(valuation.sites.map((site, sourceOrder) => Object.freeze({
    kind: "rendering.css.declaration" as const,
    nodeId: site.nodeId,
    property: site.property,
    value: site.value,
    priority: 0,
    sourceOrder,
  })));
  const closedSystem: CssSystem<H> = system.classFactorMap === undefined
    ? Object.freeze({
      kind: "rendering.css.system" as const,
      carrier: system.carrier,
      completionRegime: system.completionRegime,
      declarations,
    })
    : Object.freeze({
      kind: "rendering.css.system" as const,
      carrier: system.carrier,
      completionRegime: system.completionRegime,
      declarations,
      classFactorMap: system.classFactorMap,
    });
  if (!sameVisualValuation(valuation, cssVisualValuation(closedSystem))) {
    throw new TypeError("css_settles_to_valuation: cascade closure is not idempotent");
  }
  return Object.freeze({
    kind: "rendering.css_settles_to_valuation:witness" as const,
    system,
    valuation,
    cascadeClosed: true as const,
    idempotent: true as const,
  });
}

const cssClassFactorMapObstruction = (
  classes: CssClassFactorMap,
  reason: CssClassFactorMapObstruction["reason"],
  key: string,
  factorMap?: ColoringFactorMapJudgment,
): CssClassFactorMapObstruction => factorMap === undefined
  ? Object.freeze({ kind: "rendering.css_classes_are_factor_maps-obstruction" as const, classes, reason, key })
  : Object.freeze({ kind: "rendering.css_classes_are_factor_maps-obstruction" as const, classes, reason, key, factorMap });



export type StyleBehavior = "none" | "static" | "settled-interactive";
export type PreservationLaw =
  | "preserve-addresses"
  | "preserve-order"
  | "preserve-references"
  | "preserve-valuation-sites"
  | "carrier-not-document"
  | "css-settles";

export interface RenderProfile {
  readonly kind: "rendering.profile";
  readonly name: string;
  readonly allowedElements: readonly string[];
  readonly allowedStyleBehavior: readonly StyleBehavior[];
  readonly allowedCompletionRegimes: readonly FormatRegime[];
  readonly obligations: readonly string[];
  readonly preservationLaws: readonly PreservationLaw[];
}

export interface RenderFiber<H extends HtmlCarrierOf = HtmlCarrierOf> {
  readonly kind: "rendering.profile.fiber";
  readonly profile: RenderProfile;
  readonly carrier: H;
  readonly system: CssSystem<H>;
  readonly valuation: CssVisualValuation<H>;
  readonly styleBehavior: StyleBehavior;
}

export interface RenderFiberWitness<H extends HtmlCarrierOf = HtmlCarrierOf> {
  readonly kind: "rendering.profile_forms_render_fiber:witness";
  readonly fiber: RenderFiber<H>;
  readonly cssSettled: CssSettleWitness<H>;
  readonly carrierPreservesDocument: true;
  readonly profileConstrainsFiber: true;
}

export interface RenderFiberObstruction {
  readonly kind: "rendering.profile_forms_render_fiber-obstruction";
  readonly reason:
    | "carrier-system-mismatch"
    | "element-not-allowed"
    | "style-behavior-not-allowed"
    | "completion-regime-not-allowed"
    | "missing-preservation-law"
    | "class-factor-map-carrier-mismatch"
    | "class-factor-map-obstructed";
  readonly key: string;
}

export type RenderFiberJudgment<H extends HtmlCarrierOf = HtmlCarrierOf> = RenderFiberWitness<H> | RenderFiberObstruction;

const requiredLaws: readonly PreservationLaw[] = Object.freeze([
  "preserve-addresses",
  "preserve-order",
  "preserve-references",
  "preserve-valuation-sites",
  "carrier-not-document",
  "css-settles",
]);

const renderFiberObstruction = (
  reason: RenderFiberObstruction["reason"],
  key: string,
): RenderFiberObstruction => Object.freeze({ kind: "rendering.profile_forms_render_fiber-obstruction" as const, reason, key });

/** A profile selects the valid fiber of carrier/CSS-system pairs for a use regime. */
export function profile_forms_render_fiber<H extends HtmlCarrierOf>(
  profile: RenderProfile,
  carrier: H,
  system: CssSystem<H>,
  styleBehavior: StyleBehavior,
): RenderFiberJudgment<H> {
  if (system.carrier !== carrier) return renderFiberObstruction("carrier-system-mismatch", system.carrier.kind);
  const allowedElements = new Set(profile.allowedElements);
  for (const node of carrier.nodes) {
    if (!allowedElements.has(node.element)) return renderFiberObstruction("element-not-allowed", node.element);
  }
  if (!profile.allowedStyleBehavior.includes(styleBehavior)) {
    return renderFiberObstruction("style-behavior-not-allowed", styleBehavior);
  }
  if (!profile.allowedCompletionRegimes.includes(system.completionRegime)) {
    return renderFiberObstruction("completion-regime-not-allowed", system.completionRegime);
  }
  for (const law of requiredLaws) {
    if (!profile.preservationLaws.includes(law)) return renderFiberObstruction("missing-preservation-law", law);
  }
  if (system.classFactorMap !== undefined) {
    const carrierNodes = nodeIdSet(carrier.nodes);
    for (const nodeId of system.classFactorMap.nodeIds) {
      if (!carrierNodes.has(nodeId)) return renderFiberObstruction("class-factor-map-carrier-mismatch", nodeId);
    }
    const factor = css_classes_are_factor_maps(system.classFactorMap);
    if (factor.kind !== "rendering.css_classes_are_factor_maps:witness") {
      return renderFiberObstruction("class-factor-map-obstructed", factor.reason);
    }
  }
  const cssSettled = css_settles_to_valuation(system);
  return Object.freeze({
    kind: "rendering.profile_forms_render_fiber:witness" as const,
    fiber: Object.freeze({
      kind: "rendering.profile.fiber" as const,
      profile,
      carrier,
      system,
      valuation: cssSettled.valuation,
      styleBehavior,
    }),
    cssSettled,
    carrierPreservesDocument: true as const,
    profileConstrainsFiber: true as const,
  });
}

/* ── projector ──────────────────────────────────────────────────────────── */

export interface HtmlFiberDocumentOptions {
  readonly title?: HtmlValue;
  readonly lang?: string;
  readonly roots?: readonly string[];
  readonly metadata?: Readonly<Record<string, HtmlValue>>;
}

export interface HtmlFiberDocument<H extends HtmlCarrierOf = HtmlCarrierOf> {
  readonly kind: "rendering.htmlFiber.document";
  readonly fiber: RenderFiberWitness<H>;
  readonly html: string;
}

function classByNodeId(classes: CssClassFactorMap | undefined): ReadonlyMap<string, string> {
  if (classes === undefined) return new Map();
  return new Map(classes.nodeIds.map((nodeId, index) => [
    nodeId,
    classes.alphabet[classes.classes[index] ?? 0] ?? "render-node",
  ] as const));
}

export function cssTextFromVisualValuation(
  valuation: CssVisualValuation,
  classes?: CssClassFactorMap,
): string {
  const classNames = classByNodeId(classes);
  return valuation.sites
    .map((site) => {
      const className = classNames.get(site.nodeId);
      const selector = className === undefined ? `[data-render-node="${escapeAttr(site.nodeId)}"]` : `.${className}`;
      return `${selector}{${site.property}:${site.value}}`;
    })
    .join("\n");
}

const renderHtmlAttr = ([key, value]: readonly [string, HtmlValue]): string =>
  value === "" ? ` ${key}` : ` ${key}="${escapeAttr(value)}"`;

function renderCarrierNode(
  node: HtmlCarrierNode,
  byId: ReadonlyMap<string, HtmlCarrierNode>,
  classNames: ReadonlyMap<string, string>,
  seen: ReadonlySet<string>,
): string {
  if (seen.has(node.nodeId)) throw new TypeError(`renderHtmlFiber: cyclic carrier node ${node.nodeId}`);
  const nextSeen = new Set(seen);
  nextSeen.add(node.nodeId);
  const className = classNames.get(node.nodeId);
  const ownClass = node.attributes?.class;
  const attributes: Record<string, HtmlValue> = {
    ...(node.attributes ?? {}),
    "data-render-node": node.nodeId,
    ...(className === undefined
      ? {}
      : { class: ownClass === undefined || ownClass === "" ? className : `${ownClass} ${className}` }),
  };
  const body = `${node.text === undefined ? "" : escapeText(node.text)}${(node.children ?? []).map((childId) => {
    const child = byId.get(childId);
    if (child === undefined) throw new TypeError(`renderHtmlFiber: missing child carrier node ${childId}`);
    return renderCarrierNode(child, byId, classNames, nextSeen);
  }).join("")}`;
  return `<${node.element}${Object.entries(attributes).map(renderHtmlAttr).join("")}>${body}</${node.element}>`;
}

function rootNodeIds(nodes: readonly HtmlCarrierNode[], requested: readonly string[] | undefined): readonly string[] {
  if (requested !== undefined) return requested;
  const childIds = new Set(nodes.flatMap((node) => node.children ?? []));
  return Object.freeze(nodes.filter((node) => !childIds.has(node.nodeId)).map((node) => node.nodeId));
}

/** Serialize the single admitted render codomain: a profile fiber over an HTML carrier and settled CSS valuation. */
export function renderHtmlFiber<H extends HtmlCarrierOf>(
  fiber: RenderFiberWitness<H>,
  options: HtmlFiberDocumentOptions = {},
): HtmlFiberDocument<H> {
  const byId = new Map(fiber.fiber.carrier.nodes.map((node) => [node.nodeId, node] as const));
  const roots = rootNodeIds(fiber.fiber.carrier.nodes, options.roots);
  const classes = fiber.fiber.system.classFactorMap;
  const classNames = classByNodeId(classes);
  const body = roots.map((rootId) => {
    const root = byId.get(rootId);
    if (root === undefined) throw new TypeError(`renderHtmlFiber: missing root carrier node ${rootId}`);
    return renderCarrierNode(root, byId, classNames, new Set());
  }).join("\n");
  const metadata = Object.entries(options.metadata ?? {})
    .map(([key, value]) => `    <meta name="${escapeAttr(key)}" content="${escapeAttr(value)}">`)
    .join("\n");
  const css = cssTextFromVisualValuation(fiber.fiber.valuation, classes);
  const title = options.title ?? fiber.fiber.profile.name;
  const html = `<!DOCTYPE html>
<html lang="${escapeAttr(options.lang ?? "en")}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="render-profile" content="${escapeAttr(fiber.fiber.profile.name)}">${metadata ? "\n" + metadata : ""}
    <title>${escapeText(title)}</title>
    <style>${css}</style>
</head>
<body>
${body}
</body>
</html>
`;
  return Object.freeze({
    kind: "rendering.htmlFiber.document" as const,
    fiber,
    html,
  });
}
