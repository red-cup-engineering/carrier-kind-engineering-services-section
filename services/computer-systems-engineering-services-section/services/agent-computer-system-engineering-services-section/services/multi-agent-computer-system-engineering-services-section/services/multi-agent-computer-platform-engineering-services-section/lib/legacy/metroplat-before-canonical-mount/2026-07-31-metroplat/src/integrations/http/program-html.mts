
/**
 * program-html projections - generated HTML views of program surfaces and manifolds.
 *
 * These functions produce HTML presentation renderings from package apex material.
 * They do not route requests or bind sockets; `src/presentation` consumes them when a
 * request asks for a human-readable face.
 */
import type { ProgramDiscovery, ProgramEndpoint, ProjectedSurface } from "../../presentation/surface.mts";
import type { PackageOperationsManifold } from "../../presentation/manifold.mts";
import { articulate, mark, utterance } from "../../lib/records/utterance/utterance.mts";
import { predicate } from "../../lib/logic/predicating/predication.mts";
import { posit } from "../../lib/logic/predicating/evidence/fiber.mts";
import { fixedPoints } from "../../lib/fixpoint/fixed-point.mts";
import { documentOfFixedPoint } from "../../lib/fixpoint/document.mts";
import { completeGraphWeights } from "../../lib/math/graphs/coloring.mts";
import { schemaNodePath } from "../../lib/schema/site.mts";
import type { JsonValue } from "../../lib/codecs/json/core.mts";
import {
  htmlCarrierOf,
  buildHtmlDocumentPlan,
  renderHtmlDocument,
  type HtmlValue,
  type HtmlCarrierNode,
  type RenderProfile,
} from "@red-cup-engineering/html-document-render-service";
import type { CssClassFactorMap, CssDeclaration, CssSystem } from "@red-cup-engineering/html-structural-projection-service";

export interface ProjectionMount {
  readonly name: string;
  readonly induced: ProjectedSurface;
}

type ProgramIndexManifold = Pick<PackageOperationsManifold, "apex" | "extrema">;
type ProgramIndexExtremum = ProgramIndexManifold["extrema"]["domains"][number];
type ProgramIndexEdge = ProgramIndexManifold["extrema"]["edges"][number];

const ACTION_HTML_COMPLETION = "ordinal.closure.regime.finite" as const;

const operationHtmlProfile: RenderProfile = Object.freeze({
  kind: "rendering.profile" as const,
  name: "metroplat-program-html",
  allowedElements: Object.freeze([
    "a",
    "button",
    "code",
    "fieldset",
    "form",
    "h1",
    "h2",
    "header",
    "input",
    "label",
    "legend",
    "li",
    "main",
    "nav",
    "ol",
    "option",
    "p",
    "section",
    "select",
    "small",
    "span",
    "textarea",
  ]),
  allowedStyleBehavior: Object.freeze(["static"] as const),
  allowedCompletionRegimes: Object.freeze([ACTION_HTML_COMPLETION]),
  obligations: Object.freeze(["same-program-surface", "manual-call-boundary", "no-sidecar-renderer"]),
  preservationLaws: Object.freeze([
    "preserve-addresses",
    "preserve-order",
    "preserve-references",
    "preserve-valuation-sites",
    "carrier-not-document",
    "css-settles",
  ] as const),
});

type ProgramHtmlNode = Omit<HtmlCarrierNode, "kind" | "semanticAddress" | "valuationSite">;

const operationDecl = (nodeId: string, property: string, value: string, sourceOrder: number): CssDeclaration => Object.freeze({
  kind: "rendering.css.declaration" as const,
  nodeId,
  property,
  value,
  sourceOrder,
});

function operationClassFactorMap(nodes: readonly HtmlCarrierNode[]): CssClassFactorMap {
  return Object.freeze({
    kind: "rendering.css.classFactorMap" as const,
    constraintGraph: completeGraphWeights(nodes.length),
    nodeIds: Object.freeze(nodes.map((node) => node.nodeId)),
    classes: Object.freeze(nodes.map((_node, index) => index)),
    alphabet: Object.freeze(nodes.map((node, index) => `rel-action-${node.element}-${index}`)),
  });
}

function operationDocument(token: string, claim: string): ReturnType<typeof documentOfFixedPoint> {
  return documentOfFixedPoint(
    fixedPoints(posit(predicate(articulate(utterance(mark(token), mark(claim)))))),
  );
}

function operationHtmlFiber(
  title: string,
  token: string,
  claim: string,
  nodeInputs: readonly ProgramHtmlNode[],
  declarations: readonly CssDeclaration[],
  roots: readonly string[],
): string {
  const document = operationDocument(token, claim);
  if (document.kind !== "settledDocument.fixedPoint") {
    throw new TypeError(`operationHtmlFiber: document did not settle: ${document.reason}`);
  }
  const address = document.addresses[0]?.key;
  const valuationSite = document.valuationSites[0]?.address;
  if (address === undefined || valuationSite === undefined) {
    throw new TypeError("operationHtmlFiber: document settled without an address");
  }
  const nodes: readonly HtmlCarrierNode[] = Object.freeze(nodeInputs.map((node) => Object.freeze({
    ...node,
    kind: "rendering.htmlCarrier.node" as const,
    semanticAddress: address,
    valuationSite,
  })));
  const carrier = htmlCarrierOf(document, nodes);
  if (carrier.kind !== "rendering.htmlCarrier") {
    throw new TypeError(`operationHtmlFiber: carrier obstructed: ${carrier.reason}:${carrier.key}`);
  }
  const system: CssSystem<typeof carrier> = Object.freeze({
    kind: "rendering.css.system" as const,
    carrier,
    completionRegime: ACTION_HTML_COMPLETION,
    declarations: Object.freeze(declarations),
    classFactorMap: operationClassFactorMap(nodes),
  });
  const fiber = buildHtmlDocumentPlan(operationHtmlProfile, carrier, system, "static");
  if (fiber.kind !== "rendering.profile_forms_render_fiber:witness") {
    throw new TypeError(`operationHtmlFiber: profile obstructed: ${fiber.reason}:${fiber.key}`);
  }
  return renderHtmlDocument(fiber, {
    title,
    roots,
    metadata: Object.freeze({ "render-domain": "metroplat.projections.actions" }),
  }).html;
}

function operationChrome(nodeIds: {
  readonly main: string;
  readonly header: string;
  readonly title: string;
  readonly nav: string;
}): CssDeclaration[] {
  let order = 0;
  const add = (nodeId: string, property: string, value: string): CssDeclaration =>
    operationDecl(nodeId, property, value, order++);
  return [
    add(nodeIds.main, "box-sizing", "border-box"),
    add(nodeIds.main, "max-width", "980px"),
    add(nodeIds.main, "margin", "0 auto"),
    add(nodeIds.main, "padding", "40px 24px 56px"),
    add(nodeIds.main, "font-family", "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"),
    add(nodeIds.main, "color", "#16201d"),
    add(nodeIds.main, "line-height", "1.5"),
    add(nodeIds.header, "border-bottom", "1px solid #d7ded9"),
    add(nodeIds.header, "padding-bottom", "18px"),
    add(nodeIds.header, "margin-bottom", "24px"),
    add(nodeIds.title, "font-size", "clamp(1.65rem, 3vw, 2.4rem)"),
    add(nodeIds.title, "line-height", "1.08"),
    add(nodeIds.title, "margin", "0 0 12px"),
    add(nodeIds.title, "font-weight", "680"),
    add(nodeIds.nav, "display", "flex"),
    add(nodeIds.nav, "flex-wrap", "wrap"),
    add(nodeIds.nav, "gap", "10px"),
    add(nodeIds.nav, "align-items", "center"),
    add(nodeIds.nav, "font-size", "0.94rem"),
  ];
}

function schemaPath(schema: string): string {
  return schemaNodePath(schema);
}

function extremumReadoutNodes(
  prefix: string,
  title: string,
  extrema: readonly ProgramIndexExtremum[],
  role: string,
): ProgramHtmlNode[] {
  const titleId = `${prefix}-title`;
  const listId = `${prefix}-list`;
  if (extrema.length === 0) {
    return [
      { nodeId: titleId, element: "h2", text: title },
      { nodeId: listId, element: "ol", children: [`${prefix}-none`] },
      { nodeId: `${prefix}-none`, element: "li", text: "none" },
    ];
  }
  const items = extrema.flatMap((extremum, index): ProgramHtmlNode[] => {
    const item = `${prefix}-${index}`;
    const link = `${item}-link`;
    const code = `${item}-code`;
    const small = `${item}-small`;
    return [
      { nodeId: item, element: "li", children: [link, small] },
      { nodeId: link, element: "a", attributes: { href: schemaPath(extremum.schema) }, children: [code] },
      { nodeId: code, element: "code", text: extremum.schema },
      { nodeId: small, element: "small", text: ` ${role}: ${extremum.operations.join(", ")}` },
    ];
  });
  return [
    { nodeId: titleId, element: "h2", text: title },
    { nodeId: listId, element: "ol", children: extrema.map((_extremum, index) => `${prefix}-${index}`) },
    ...items,
  ];
}

function edgeReadoutNodes(
  prefix: string,
  title: string,
  edges: readonly ProgramIndexEdge[],
): ProgramHtmlNode[] {
  const titleId = `${prefix}-title`;
  const listId = `${prefix}-list`;
  if (edges.length === 0) {
    return [
      { nodeId: titleId, element: "h2", text: title },
      { nodeId: listId, element: "ol", children: [`${prefix}-none`] },
      { nodeId: `${prefix}-none`, element: "li", text: "none" },
    ];
  }
  const items = edges.flatMap((edge, index): ProgramHtmlNode[] => {
    const item = `${prefix}-${index}`;
    const link = `${item}-link`;
    const code = `${item}-code`;
    const small = `${item}-small`;
    return [
      { nodeId: item, element: "li", children: [link, small] },
      { nodeId: link, element: "a", attributes: { href: schemaPath(edge.schema) }, children: [code] },
      { nodeId: code, element: "code", text: edge.schema },
      { nodeId: small, element: "small", text: ` ${edge.from} -> ${edge.to}; ${edge.relation}; ${edge.ok ? "accepted" : "rejected"}` },
    ];
  });
  return [
    { nodeId: titleId, element: "h2", text: title },
    { nodeId: listId, element: "ol", children: edges.map((_edge, index) => `${prefix}-${index}`) },
    ...items,
  ];
}

/* ── schema-walked form controls ──────────────────────────────────────────
 *
 * A second interpreter of the same schema literal the schema contract validator
 * walks (schema/contract.mts's `validateAgainst`): here the literal
 * drives typed HTML input/select/fieldset generation and the inverse decode
 * of posted form entries back into the input value shape, instead of a
 * validate/reject judgment. A shape the walk cannot type (array, external
 * ref, anyOf/oneOf) degrades to a per-property
 * JSON textarea rather than failing the whole form.
 */

type PlainSchemaNode = Record<string, unknown>;

type SchemaFormControlKind = "string" | "number" | "boolean" | "enum" | "object" | "unsupported";

interface SchemaFormControl {
  readonly propertyName: string;
  readonly propertyPath: string;
  readonly required: boolean;
  readonly kind: SchemaFormControlKind;
  readonly enumValues?: readonly JsonValue[];
  readonly controls?: readonly SchemaFormControl[];
}

/** Resolve one schema node's `$ref`: local `#`/`#/$defs/X` against `root`, a
 *  cross-schema address through the catalog — the same delegation
 *  `resolveRefRuntime` performs for validation. Undefined when the address is
 *  outside the package surface (the loose-slot convention has no literal to
 *  walk here, so the property degrades to unsupported). */
function resolveSchemaNode(node: PlainSchemaNode, root: PlainSchemaNode): PlainSchemaNode | undefined {
  const ref = node["$ref"];
  if (typeof ref !== "string") return node;
  if (ref === "#") return root;
  if (ref.startsWith("#/$defs/")) {
    const defs = root["$defs"];
    const sub = typeof defs === "object" && defs !== null ? (defs as PlainSchemaNode)[ref.slice("#/$defs/".length)] : undefined;
    return typeof sub === "object" && sub !== null ? resolveSchemaNode(sub as PlainSchemaNode, root) : undefined;
  }
  return undefined;
}

function schemaFormControlKind(node: PlainSchemaNode): { readonly kind: SchemaFormControlKind; readonly enumValues?: readonly JsonValue[] } {
  if (Array.isArray(node["enum"])) return { kind: "enum", enumValues: node["enum"] as JsonValue[] };
  const type = node["type"];
  if (type === "string") return { kind: "string" };
  if (type === "number" || type === "integer") return { kind: "number" };
  if (type === "boolean") return { kind: "boolean" };
  if (type === "object" && typeof node["properties"] === "object" && node["properties"] !== null) return { kind: "object" };
  return { kind: "unsupported" };
}

/** Walk one object schema's top-level properties into typed control
 *  descriptors, recursing into nested objects. Undefined when `schema` is not
 *  itself an object schema with properties — the caller's signal to fall back
 *  to the single free-form textarea. */
function schemaFormControls(schema: PlainSchemaNode, root: PlainSchemaNode, prefix = ""): readonly SchemaFormControl[] | undefined {
  if (schema["type"] !== "object" || typeof schema["properties"] !== "object" || schema["properties"] === null) return undefined;
  const properties = schema["properties"] as PlainSchemaNode;
  const required = new Set(Array.isArray(schema["required"]) ? (schema["required"] as string[]) : []);
  const controls: SchemaFormControl[] = [];
  for (const [key, rawProp] of Object.entries(properties)) {
    const path = prefix === "" ? key : `${prefix}.${key}`;
    const prop = typeof rawProp === "object" && rawProp !== null ? (rawProp as PlainSchemaNode) : {};
    const resolved = resolveSchemaNode(prop, root);
    if (resolved === undefined) {
      controls.push({ propertyName: key, propertyPath: path, required: required.has(key), kind: "unsupported" });
      continue;
    }
    const { kind, enumValues } = schemaFormControlKind(resolved);
    if (kind === "object") {
      const nested = schemaFormControls(resolved, root, path);
      controls.push(nested === undefined
        ? { propertyName: key, propertyPath: path, required: required.has(key), kind: "unsupported" }
        : { propertyName: key, propertyPath: path, required: required.has(key), kind: "object", controls: nested });
      continue;
    }
    controls.push({ propertyName: key, propertyPath: path, required: required.has(key), kind, ...(enumValues === undefined ? {} : { enumValues }) });
  }
  return controls;
}

/** Resolve an endpoint's `domainSchema` (a bare `$ref`, or an inline literal)
 *  to the concrete schema it addresses, then its top-level control walk —
 *  undefined when unresolvable or not an object schema. */
function endpointSchemaFormControls(domainSchema: Record<string, unknown> | undefined): readonly SchemaFormControl[] | undefined {
  if (domainSchema === undefined) return undefined;
  const root = resolveSchemaNode(domainSchema, domainSchema);
  return root === undefined ? undefined : schemaFormControls(root, root);
}

/** The inverse of the control walk: coerce one posted string value to the type
 *  its control descriptor declares. Numbers/booleans that fail to coerce are
 *  left as the raw string so the schema contract validator produces the rejection,
 *  rather than swallowing the error here. */
function coerceSchemaFormValue(control: SchemaFormControl, raw: string): JsonValue {
  if (control.kind === "number") {
    const value = Number(raw);
    return Number.isFinite(value) ? value : raw;
  }
  if (control.kind === "boolean") return raw === "true";
  if (control.kind === "enum" && control.enumValues !== undefined) {
    return control.enumValues.find((value) => String(value) === raw) ?? raw;
  }
  return raw;
}

function decodeSchemaFormValue(controls: readonly SchemaFormControl[], params: URLSearchParams): Record<string, JsonValue> {
  const out: { [key: string]: JsonValue } = {};
  for (const control of controls) {
    if (control.kind === "object" && control.controls !== undefined) {
      const nested = decodeSchemaFormValue(control.controls, params);
      if (Object.keys(nested).length > 0) out[control.propertyName] = nested;
      continue;
    }
    const raw = params.get(control.propertyPath);
    if (raw === null) continue;
    if (control.kind === "unsupported") {
      try {
        out[control.propertyName] = parseJsonValue(raw);
      } catch {
        out[control.propertyName] = raw;
      }
      continue;
    }
    out[control.propertyName] = coerceSchemaFormValue(control, raw);
  }
  return out;
}

function parseJsonValue(text: string): JsonValue {
  return JSON.parse(text) as JsonValue;
}

/**
 * Decode a posted `application/x-www-form-urlencoded` body back into the
 * input value shape `endpoint.domainSchema` declares, name-path property by
 * name-path property. Returns `undefined` when the schema does not resolve to a
 * walkable object shape, signalling the caller to leave the wire untouched
 * (the schema-less/free-form textarea path posts the whole input value as one
 * `body` control already handled upstream).
 */
export function decodeSchemaFormEntries(domainSchema: Record<string, unknown> | undefined, formBody: string): JsonValue | undefined {
  const controls = endpointSchemaFormControls(domainSchema);
  if (controls === undefined) return undefined;
  return decodeSchemaFormValue(controls, new URLSearchParams(formBody));
}

function inputTypeFor(kind: SchemaFormControlKind): string {
  return kind === "number" ? "number" : "text";
}

function controlAttributes(
  control: SchemaFormControl,
  controlId: string,
  extra: Readonly<Record<string, HtmlValue>> = {},
): Readonly<Record<string, HtmlValue>> {
  const base = { id: controlId, name: control.propertyPath, ...extra };
  return control.required ? { ...base, required: "" } : base;
}

interface SchemaControlNodes {
  readonly nodes: ProgramHtmlNode[];
  readonly rowIds: readonly string[];
  readonly controlIds: readonly string[];
  readonly labelIds: readonly string[];
}

/** Render one control level to presentation nodes: a labeled input/select per
 *  primitive, a legended fieldset recursing into a nested object, a bare
 *  textarea for a shape the walk could not type. */
function schemaControlNodes(controls: readonly SchemaFormControl[]): SchemaControlNodes {
  const nodes: ProgramHtmlNode[] = [];
  const rowIds: string[] = [];
  const controlIds: string[] = [];
  const labelIds: string[] = [];
  for (const control of controls) {
    const rowId = `control-${control.propertyPath}`;
    const labelId = `${rowId}-label`;
    const controlId = `${rowId}-control`;
    if (control.kind === "object" && control.controls !== undefined) {
      const nested = schemaControlNodes(control.controls);
      nodes.push(
        { nodeId: rowId, element: "fieldset", children: [`${rowId}-legend`, ...nested.rowIds] },
        { nodeId: `${rowId}-legend`, element: "legend", text: control.propertyName },
        ...nested.nodes,
      );
      rowIds.push(rowId);
      controlIds.push(...nested.controlIds);
      labelIds.push(`${rowId}-legend`, ...nested.labelIds);
      continue;
    }
    nodes.push(
      { nodeId: rowId, element: "p", children: [labelId, controlId] },
      { nodeId: labelId, element: "label", text: control.propertyName + (control.required ? " *" : ""), attributes: { for: controlId } },
    );
    if (control.kind === "enum" && control.enumValues !== undefined) {
      const optionIds = control.enumValues.map((_, index) => `${controlId}-opt-${index}`);
      nodes.push({ nodeId: controlId, element: "select", attributes: controlAttributes(control, controlId), children: optionIds });
      control.enumValues.forEach((value, index) => {
        nodes.push({ nodeId: optionIds[index]!, element: "option", text: String(value), attributes: { value: String(value) } });
      });
    } else if (control.kind === "boolean") {
      nodes.push(
        { nodeId: controlId, element: "select", attributes: controlAttributes(control, controlId), children: [`${controlId}-true`, `${controlId}-false`] },
        { nodeId: `${controlId}-true`, element: "option", text: "true", attributes: { value: "true" } },
        { nodeId: `${controlId}-false`, element: "option", text: "false", attributes: { value: "false" } },
      );
    } else if (control.kind === "unsupported") {
      nodes.push({ nodeId: controlId, element: "textarea", attributes: { id: controlId, name: control.propertyPath, rows: "4", placeholder: "JSON value" } });
    } else {
      nodes.push({ nodeId: controlId, element: "input", attributes: controlAttributes(control, controlId, { type: inputTypeFor(control.kind) }) });
    }
    rowIds.push(rowId);
    controlIds.push(controlId);
    labelIds.push(labelId);
  }
  return { nodes, rowIds, controlIds, labelIds };
}

function schemaControlDeclarations(controls: SchemaControlNodes, startOrder: number): CssDeclaration[] {
  let order = startOrder;
  const declarations: CssDeclaration[] = [];
  for (const labelId of controls.labelIds) declarations.push(operationDecl(labelId, "font-weight", "640", order++));
  for (const controlId of controls.controlIds) {
    declarations.push(
      operationDecl(controlId, "box-sizing", "border-box", order++),
      operationDecl(controlId, "width", "100%", order++),
      operationDecl(controlId, "padding", "8px 10px", order++),
      operationDecl(controlId, "border", "1px solid #b8c4bd", order++),
      operationDecl(controlId, "font", "0.95rem ui-monospace, SFMono-Regular, Consolas, monospace", order++),
    );
  }
  return declarations;
}

/** Project one action endpoint into the canonical render fiber codomain. */
export function programFormHtml(endpoint: ProgramEndpoint, base: string): string {
  const operationPath = base + "/" + endpoint.name;
  const schemaControls = endpointSchemaFormControls(endpoint.domainSchema);
  const schemaWalked = schemaControls !== undefined;
  const controlRender = schemaWalked ? schemaControlNodes(schemaControls) : undefined;
  const nodes: ProgramHtmlNode[] = [
    { nodeId: "main", element: "main", children: ["header", "meta", "form"] },
    { nodeId: "header", element: "header", children: ["title", "nav"] },
    { nodeId: "title", element: "h1", children: ["title-code"] },
    { nodeId: "title-code", element: "code", text: endpoint.name },
    { nodeId: "nav", element: "nav", children: ["all-link"] },
    { nodeId: "all-link", element: "a", text: "All operations", attributes: { href: base || "/" } },
    {
      nodeId: "meta",
      element: "section",
      children: [
        ...(endpoint.summary === undefined ? [] : ["summary"]),
        ...(endpoint.description === undefined ? [] : ["description"]),
        "wire",
      ],
    },
    ...(endpoint.summary === undefined ? [] : [{ nodeId: "summary", element: "p", text: endpoint.summary } satisfies ProgramHtmlNode]),
    ...(endpoint.description === undefined ? [] : [{ nodeId: "description", element: "p", children: ["description-small"] } satisfies ProgramHtmlNode]),
    ...(endpoint.description === undefined ? [] : [{ nodeId: "description-small", element: "small", text: endpoint.description } satisfies ProgramHtmlNode]),
    { nodeId: "wire", element: "p", children: ["wire-small"] },
    { nodeId: "wire-small", element: "small", children: ["input-label", "input-code", "wire-separator", "output-label", "output-code"] },
    { nodeId: "input-label", element: "span", text: "input: " },
    { nodeId: "input-code", element: "code", text: endpoint.input },
    { nodeId: "wire-separator", element: "span", text: " / " },
    { nodeId: "output-label", element: "span", text: "output: " },
    { nodeId: "output-code", element: "code", text: endpoint.output },
    schemaWalked
      ? { nodeId: "form", element: "form", attributes: { method: "post", action: `${operationPath}?input-format=form` }, children: [...controlRender!.rowIds, "actions"] }
      : { nodeId: "form", element: "form", attributes: { method: "post", action: operationPath, enctype: "text/plain" }, children: ["body-label", "body-textarea", "actions"] },
    ...(schemaWalked ? controlRender!.nodes : [
      { nodeId: "body-label", element: "label", text: "Input value", attributes: { for: "body" } } satisfies ProgramHtmlNode,
      { nodeId: "body-textarea", element: "textarea", attributes: { id: "body", name: "body", rows: "10", placeholder: "the input value on stdin" } } satisfies ProgramHtmlNode,
    ]),
    { nodeId: "actions", element: "p", children: ["run-button"] },
    { nodeId: "run-button", element: "button", text: "Run", attributes: { type: "submit" } },
  ];
  const declarations = operationChrome({ main: "main", header: "header", title: "title", nav: "nav" });
  let order = declarations.length;
  declarations.push(
    operationDecl("meta", "margin-bottom", "22px", order++),
    operationDecl("form", "display", "grid", order++),
    operationDecl("form", "gap", "12px", order++),
  );
  order = declarations.length;
  if (schemaWalked) {
    declarations.push(...schemaControlDeclarations(controlRender!, order));
  } else {
    declarations.push(
      operationDecl("body-label", "font-weight", "640", order++),
      operationDecl("body-textarea", "box-sizing", "border-box", order++),
      operationDecl("body-textarea", "width", "100%", order++),
      operationDecl("body-textarea", "min-height", "220px", order++),
      operationDecl("body-textarea", "padding", "12px", order++),
      operationDecl("body-textarea", "border", "1px solid #b8c4bd", order++),
      operationDecl("body-textarea", "font", "0.95rem ui-monospace, SFMono-Regular, Consolas, monospace", order++),
    );
  }
  order = declarations.length;
  declarations.push(
    operationDecl("run-button", "width", "fit-content", order++),
    operationDecl("run-button", "padding", "9px 16px", order++),
    operationDecl("run-button", "border", "1px solid #235244", order++),
    operationDecl("run-button", "background", "#235244", order++),
    operationDecl("run-button", "color", "white", order++),
    operationDecl("run-button", "font-weight", "650", order++),
  );
  return operationHtmlFiber(endpoint.name, "action:" + endpoint.name, "renders-action-form", nodes, declarations, ["main"]);
}

/** Project a program discovery object into the canonical render fiber codomain. */
export function programIndexHtml(discovery: ProgramDiscovery, base: string, manifold?: ProgramIndexManifold): string {
  const manifoldReadoutNodes = manifold === undefined ? [] : [
    ...extremumReadoutNodes("manifold-domains", "Domain extrema", manifold.extrema.domains, "consumed by"),
    ...extremumReadoutNodes("manifold-codomains", "Codomain extrema", manifold.extrema.codomains, "produced by"),
    ...extremumReadoutNodes("manifold-incoming", "Incoming frontier", manifold.extrema.incoming, "needs producer for"),
    ...extremumReadoutNodes("manifold-outgoing", "Outgoing frontier", manifold.extrema.outgoing, "needs consumer for"),
    ...edgeReadoutNodes("manifold-edges", "Local Hoare edges", manifold.extrema.edges),
    ...edgeReadoutNodes("manifold-rejected-edges", "Rejected local edges", manifold.extrema.rejectedEdges),
  ];
  const manifoldReadoutChildren = [
    "manifold-readout-title",
    "manifold-domains-title",
    "manifold-domains-list",
    "manifold-codomains-title",
    "manifold-codomains-list",
    "manifold-incoming-title",
    "manifold-incoming-list",
    "manifold-outgoing-title",
    "manifold-outgoing-list",
    "manifold-edges-title",
    "manifold-edges-list",
    "manifold-rejected-edges-title",
    "manifold-rejected-edges-list",
  ];
  const endpointNodes = discovery.programs.flatMap((endpoint, index): ProgramHtmlNode[] => {
    const item = "endpoint-" + index;
    const link = item + "-link";
    const code = item + "-code";
    const summary = item + "-summary";
    const meta = item + "-meta";
    const wire = item + "-wire";
    const contract = item + "-contract";
    const phase = item + "-phase";
    const evidence = item + "-evidence";
    const settlement = item + "-settlement";
    return [
      { nodeId: item, element: "li", children: endpoint.summary === undefined ? [link, meta] : [link, summary, meta] },
      { nodeId: link, element: "a", attributes: { href: base + "/" + endpoint.name }, children: [code] },
      { nodeId: code, element: "code", text: endpoint.name },
      ...(endpoint.summary === undefined ? [] : [{ nodeId: summary, element: "span", text: " - " + endpoint.summary }]),
      { nodeId: meta, element: "ol", children: [wire, contract, phase, evidence, settlement] },
      { nodeId: wire, element: "li", children: [`${wire}-small`] },
      { nodeId: `${wire}-small`, element: "small", text: `wire: ${endpoint.input} -> ${endpoint.output}` },
      { nodeId: contract, element: "li", children: [`${contract}-small`] },
      { nodeId: `${contract}-small`, element: "small", text: `contract: ${endpoint.contract.contract.id}; standing: ${endpoint.contract.charge}; price: ${endpoint.contract.price}` },
      { nodeId: phase, element: "li", children: [`${phase}-small`] },
      { nodeId: `${phase}-small`, element: "small", text: `regime: ${endpoint.contract.contract.settlement.regime}; coordination: ${endpoint.contract.contract.coordination.mode}` },
      { nodeId: evidence, element: "li", children: [`${evidence}-small`] },
      { nodeId: `${evidence}-small`, element: "small", text: `evidence: ${endpoint.contract.evidence.map((receipt) => `${receipt.source}:${receipt.charge}`).join(", ") || "none"}` },
      { nodeId: settlement, element: "li", children: [`${settlement}-small`] },
      { nodeId: `${settlement}-small`, element: "small", text: `settlement: ${endpoint.settlement.regime}; ${endpoint.settlement.transport}; ${endpoint.settlement.finality}` },
    ];
  });
  const readoutChildren = manifold === undefined
    ? ["readout-title", "readout-links"]
    : ["readout-title", "readout-links", "apex-counts", "extrema-counts", "frontier-counts", "edge-counts"];
  const nodes: ProgramHtmlNode[] = [
    { nodeId: "main", element: "main", children: ["header", "readout", ...(manifold === undefined ? [] : ["manifold-readout"]), "operations"] },
    { nodeId: "header", element: "header", children: ["title", "nav"] },
    { nodeId: "title", element: "h1", text: discovery.package },
    { nodeId: "nav", element: "nav", children: ["openapi", "discovery", "manifold", "feed", "mcp", "health"] },
    { nodeId: "openapi", element: "a", text: "OpenAPI", attributes: { href: base + "/openapi.json" } },
    { nodeId: "discovery", element: "a", text: "Discovery", attributes: { href: base + "/discovery" } },
    { nodeId: "manifold", element: "a", text: "Operations manifold", attributes: { href: base + "/operations-manifold" } },
    { nodeId: "feed", element: "a", text: "Journal feed", attributes: { href: base + "/feed" } },
    { nodeId: "mcp", element: "code", text: "POST " + base + "/mcp" },
    { nodeId: "health", element: "code", text: "GET " + base + "/health" },
    { nodeId: "readout", element: "section", children: readoutChildren },
    { nodeId: "readout-title", element: "h2", text: "Endpoint readout" },
    { nodeId: "readout-links", element: "p", children: ["readout-links-small"] },
    { nodeId: "readout-links-small", element: "small", text: "This path exposes its own HTML forms, OpenAPI document, MCP surface, discovery document, operations manifold, health route, and evidence feed." },
    ...(manifold === undefined ? [] : [
      { nodeId: "apex-counts", element: "p", children: ["apex-counts-small"] } satisfies ProgramHtmlNode,
      { nodeId: "apex-counts-small", element: "small", text: `apex: ${manifold.apex.programs.length} programs, ${manifold.apex.resources.length} resources, ${manifold.apex.prompts.length} prompts` } satisfies ProgramHtmlNode,
      { nodeId: "extrema-counts", element: "p", children: ["extrema-counts-small"] } satisfies ProgramHtmlNode,
      { nodeId: "extrema-counts-small", element: "small", text: `extrema: ${manifold.extrema.domains.length} domains, ${manifold.extrema.codomains.length} codomains` } satisfies ProgramHtmlNode,
      { nodeId: "frontier-counts", element: "p", children: ["frontier-counts-small"] } satisfies ProgramHtmlNode,
      { nodeId: "frontier-counts-small", element: "small", text: `frontier: ${manifold.extrema.incoming.length} incoming, ${manifold.extrema.outgoing.length} outgoing` } satisfies ProgramHtmlNode,
      { nodeId: "edge-counts", element: "p", children: ["edge-counts-small"] } satisfies ProgramHtmlNode,
      { nodeId: "edge-counts-small", element: "small", text: `local Hoare edges: ${manifold.extrema.edges.length} accepted, ${manifold.extrema.rejectedEdges.length} rejected` } satisfies ProgramHtmlNode,
    ]),
    ...(manifold === undefined ? [] : [
      { nodeId: "manifold-readout", element: "section", children: manifoldReadoutChildren } satisfies ProgramHtmlNode,
      { nodeId: "manifold-readout-title", element: "h2", text: "Composition frontier" } satisfies ProgramHtmlNode,
      ...manifoldReadoutNodes,
    ]),
    { nodeId: "operations", element: "section", children: ["operations-title", "operation-list"] },
    { nodeId: "operations-title", element: "h2", text: "Operations" },
    { nodeId: "operation-list", element: "ol", children: discovery.programs.map((_endpoint, index) => "endpoint-" + index) },
    ...endpointNodes,
  ];
  const declarations = operationChrome({ main: "main", header: "header", title: "title", nav: "nav" });
  let order = declarations.length;
  declarations.push(
    operationDecl("readout", "margin-bottom", "28px", order++),
    operationDecl("manifold-readout", "margin-bottom", "28px", order++),
    operationDecl("readout-title", "font-size", "1rem", order++),
    operationDecl("readout-title", "letter-spacing", "0", order++),
    operationDecl("manifold-readout-title", "font-size", "1rem", order++),
    operationDecl("manifold-readout-title", "letter-spacing", "0", order++),
    operationDecl("operations-title", "font-size", "1rem", order++),
    operationDecl("operations-title", "letter-spacing", "0", order++),
    ...manifoldReadoutNodes.filter((node) => node.element === "h2").map((node) => operationDecl(node.nodeId, "font-size", "0.95rem", order++)),
    ...manifoldReadoutNodes.filter((node) => node.element === "h2").map((node) => operationDecl(node.nodeId, "margin", "16px 0 6px", order++)),
    ...manifoldReadoutNodes.filter((node) => node.element === "ol").map((node) => operationDecl(node.nodeId, "padding-left", "1.4rem", order++)),
    ...manifoldReadoutNodes.filter((node) => node.element === "ol").map((node) => operationDecl(node.nodeId, "margin", "0 0 8px", order++)),
    operationDecl("operation-list", "display", "grid", order++),
    operationDecl("operation-list", "gap", "10px", order++),
    operationDecl("operation-list", "padding-left", "1.4rem", order++),
    ...endpointNodes.filter((node) => node.nodeId.endsWith("-meta")).map((node) => operationDecl(node.nodeId, "margin-top", "6px", order++)),
    ...endpointNodes.filter((node) => node.nodeId.endsWith("-meta")).map((node) => operationDecl(node.nodeId, "display", "grid", order++)),
    ...endpointNodes.filter((node) => node.nodeId.endsWith("-meta")).map((node) => operationDecl(node.nodeId, "gap", "4px", order++)),
    ...discovery.programs.map((_endpoint, index) => operationDecl("endpoint-" + index, "padding", "8px 0", order++)),
  );
  return operationHtmlFiber(discovery.package, "package:" + discovery.package, "renders-action-discovery", nodes, declarations, ["main"]);
}

/** Project a schema namespace into the canonical render fiber codomain. */
export function operationManifoldIndexHtml(
  mounts: readonly ProjectionMount[],
  paths: ReadonlyMap<string, string>,
): string {
  const mountNodes = mounts.flatMap((m, index): ProgramHtmlNode[] => {
    const base = paths.get(m.name) ?? "/" + m.name;
    const item = "mount-" + index;
    const link = item + "-link";
    const code = item + "-code";
    const summary = item + "-summary";
    return [
      { nodeId: item, element: "li", children: [link, summary] },
      { nodeId: link, element: "a", attributes: { href: base }, children: [code] },
      { nodeId: code, element: "code", text: base },
      { nodeId: summary, element: "span", text: " - " + m.induced.discovery.package + " (" + m.induced.operations.length + " ops)" },
    ];
  });
  const nodes: ProgramHtmlNode[] = [
    { nodeId: "main", element: "main", children: ["header", "mounts"] },
    { nodeId: "header", element: "header", children: ["title", "nav"] },
    { nodeId: "title", element: "h1", text: "manifold" },
    { nodeId: "nav", element: "nav", text: "A mounted bundle of modules; each mounts at the tail of whatever produces its domain schema." },
    { nodeId: "mounts", element: "section", children: ["mounts-title", "mount-list"] },
    { nodeId: "mounts-title", element: "h2", text: "Mounts" },
    { nodeId: "mount-list", element: "ol", children: mountNodes.filter((node) => node.element === "li").map((node) => node.nodeId) },
    ...mountNodes,
  ];
  const declarations = operationChrome({ main: "main", header: "header", title: "title", nav: "nav" });
  let order = declarations.length;
  declarations.push(
    operationDecl("mounts-title", "font-size", "1rem", order++),
    operationDecl("mounts-title", "letter-spacing", "0", order++),
    operationDecl("mount-list", "display", "grid", order++),
    operationDecl("mount-list", "gap", "10px", order++),
    operationDecl("mount-list", "padding-left", "1.4rem", order++),
    ...mountNodes.filter((node) => node.element === "li").map((node) => operationDecl(node.nodeId, "padding", "8px 0", order++)),
  );
  return operationHtmlFiber("manifold", "manifold", "renders-manifold-index", nodes, declarations, ["main"]);
}
