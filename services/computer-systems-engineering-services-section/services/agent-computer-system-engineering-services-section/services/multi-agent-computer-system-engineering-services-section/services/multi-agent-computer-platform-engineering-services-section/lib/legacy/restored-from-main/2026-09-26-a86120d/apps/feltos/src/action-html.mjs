/**
 * action-html - the GUI-server (TUFTE) HTML form projection of relating's actions.
 *
 * relating (rank 0 of the relationality layer) imports nothing above itself; the
 * `serving` router projects to JSON by default and accepts `renderForm`,
 * `renderIndex`, and `renderManifoldIndex` options for anything HTML-shaped.
 * FeltOS, which already uses TUFTE (web-page-tiling-engine) as its web engine,
 * owns that rendering and supplies these three functions where it serves actions.
 */
import { fromSection, ref } from "@red-cup-engineering/html-structural-projection-service";
import { renderTuftePacket } from "@red-cup-engineering/web-page-tiling-engine";
import { isJsonRecord } from "@red-cup-engineering/json-services-section";
import { jsonResource } from "@red-cup-engineering/json-services-section";

/** The discovery fields required to render and invoke an operation. */

/** A named module mounted in the current action manifold. */

const operationPath = (base, name) => `${base.replace(/\/+$/, "")}/${encodeURIComponent(name)}`;

/**
 * Compose one operation's source reading and native invocation form as a TUFTE packet.
 * @param endpoint - Operation discovery fields.
 * @param base - Local mount path.
 * @returns A complete SHP HTML document rendered by TUFTE.
 */
export function actionFormHtml(endpoint, base) {
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
export function actionIndexHtml(discovery, base) {
  const subject = `package:${discovery.package}`;
  const references = new Map(discovery.programs.map((endpoint) => [`action:${endpoint.name}`, operationPath(base, endpoint.name)]));
  const reading = fromSection({ affirmed: discovery.programs.map((endpoint) => ({
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
        rows: discovery.programs.map((endpoint) => [
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
export function actionManifoldIndexHtml(mounts, paths) {
  const entries = mounts.map(({ name, induced }) => ({
    name, path: paths.get(name) ?? `/${name}`, discovery: induced.discovery, operations: induced.operations.length,
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
