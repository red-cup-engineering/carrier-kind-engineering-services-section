import type { ActionDiscovery, ActionEndpoint, InducedBins } from "../running/induce.mjs";
import { fromSection, ref } from "@red-cup-engineering/html-structural-projection-service";
import { renderTuftePacket } from "@red-cup-engineering/web-tufte-gui-services-section";
import { isJsonRecord, jsonResource } from "../codecs/text/json/index.mjs";

/** The discovery fields required to render and invoke an operation. */
export type ActionFormEndpoint = Pick<ActionEndpoint, "name" | "input" | "output" | "summary" | "description">;

/** A named module mounted in the current action manifold. */
export interface ProjectionMount {
  readonly name: string;
  readonly induced: InducedBins;
}

const operationPath = (base: string, name: string): string => `${base.replace(/\/+$/, "")}/${encodeURIComponent(name)}`;

/**
 * Compose one operation's source reading and native invocation form as a TUFTE packet.
 * @param endpoint - Operation discovery fields.
 * @param base - Local mount path.
 * @returns A complete SHP HTML document rendered by TUFTE.
 */
export function actionFormHtml(endpoint: ActionFormEndpoint, base: string): string {
  const subject = `action:${endpoint.name}`;
  const source = jsonResource(endpoint, "action endpoint");
  if (!isJsonRecord(source)) throw new TypeError("actionFormHtml: endpoint must be an object");
  const reading = fromSection({ affirmed: Object.entries(source).map(([predicate, object]) => ({
    predicate, object, citation: subject,
  })) }, { subject });
  return renderTuftePacket(reading, { source, evidence: { base, subject } }, {
    title: endpoint.name,
    subtitle: endpoint.summary ?? "",
    tiles: [
      { id: "navigation", title: "Operations", links: [{ href: base || "/", label: "All operations" }], span: 12 },
      ...(endpoint.description ? [{ id: "description", title: "Description", content: endpoint.description, span: 12 }] : []),
      { id: "contract", title: "Input and output", table: {
        columns: ["Input", "Output"], rows: [[endpoint.input, endpoint.output]],
      }, span: 12 },
      { id: "invocation", title: "Run operation", span: 12, form: {
        id: "operation-input", action: operationPath(base, endpoint.name), method: "post",
        fields: [{ id: "body", name: "body", kind: "textarea", label: "Input carrier" }],
        submitters: [{ label: "Run", kind: "submit" }],
      } },
    ],
  }).html;
}

/**
 * Compose operation discovery and machine entry points as one TUFTE packet.
 * @param discovery - The action family's current discovery carrier.
 * @param base - Local mount path.
 * @returns A complete SHP HTML document with navigable operation references.
 */
export function actionIndexHtml(discovery: ActionDiscovery, base: string): string {
  const subject = `package:${discovery.package}`;
  const references = new Map(discovery.bins.map((endpoint) => [`action:${endpoint.name}`, operationPath(base, endpoint.name)]));
  const reading = fromSection({ affirmed: discovery.bins.map((endpoint) => ({
    predicate: "operation", object: ref(`action:${endpoint.name}`), citation: subject,
  })) }, { subject });
  return renderTuftePacket(reading, {
    source: jsonResource(discovery, "action discovery"), evidence: { base, subject },
    resolveHref: (identity) => references.get(identity),
  }, {
    title: discovery.package,
    tiles: [
      { id: "interfaces", title: "Interfaces", links: [
        { href: `${base}/openapi.json`, label: "OpenAPI" },
        { href: `${base}/discovery`, label: "Discovery" },
        { href: `${base}/health`, label: "Health" },
      ], span: 8 },
      { id: "mcp", title: "MCP", content: `POST ${base}/mcp`, span: 4 },
      { id: "operations", title: "Operations", span: 12, table: {
        columns: ["Operation", "Summary", "Input", "Output"],
        rows: discovery.bins.map((endpoint) => [
          { href: operationPath(base, endpoint.name), text: endpoint.name },
          endpoint.summary ?? "", endpoint.input, endpoint.output,
        ]),
      } },
    ],
  }).html;
}

/**
 * Compose mounted module discovery and navigation as a TUFTE packet.
 * @param mounts - The currently induced module mounts.
 * @param paths - Resolved local mount paths.
 * @returns A complete SHP HTML document with navigable module references.
 */
export function actionManifoldIndexHtml(mounts: readonly ProjectionMount[], paths: ReadonlyMap<string, string>): string {
  const entries = mounts.map(({ name, induced }) => ({
    name, path: paths.get(name) ?? `/${name}`, discovery: induced.discovery, operations: induced.actions.length,
  }));
  const references = new Map(entries.map(({ name, path }) => [`mount:${name}`, path]));
  const reading = fromSection({ affirmed: entries.map(({ name }) => ({
    predicate: "mount", object: ref(`mount:${name}`), citation: "manifold",
  })) }, { subject: "manifold" });
  return renderTuftePacket(reading, {
    source: jsonResource(entries, "action manifold mounts"), evidence: { subject: "manifold" },
    resolveHref: (identity) => references.get(identity),
  }, {
    title: "manifold",
    tiles: [{ id: "mounts", title: "Mounts", span: 12, table: {
      columns: ["Mount", "Package", "Operations"],
      rows: entries.map(({ path, discovery, operations }) => [
        { href: path, text: path }, discovery.package, String(operations),
      ]),
    } }],
  }).html;
}
