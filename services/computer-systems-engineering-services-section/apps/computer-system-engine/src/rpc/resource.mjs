/**
 * acting/resource - the addressable-artifact class: a resource is a cocone leg.
 *
 * Where an `action` injects a morphism into the package's call surface, a
 * `resource` injects an addressable artifact: a named, typed document the package
 * already holds or derives, such as a carrier JSON Schema, the discovery carrier,
 * or generated documentation. `induceSurface` collects resources alongside actions
 * into the one apex; the MCP transport projects them as `resources/list` and
 * `resources/read`, with no second ontology.
 */
import { fact } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { utterance } from "@red-cup-engineering/signcell/cell";

/**
 * Registered addressable artifact over an induced action family.
 *
 * A resource is the read side of the action knowledge-vault surface: a URI,
 * descriptor metadata, and a thunk that returns the current text content.
 * `induceSurface` carries these alongside action tools and prompt templates, then
 * the MCP projection exposes them through `resources/list` and `resources/read`.
 */

/**
 * Input accepted by `resource()`.
 *
 * Use this for artifacts that are known at package declaration time or can be
 * derived cheaply when read: guides, discovery documents, schema text, package
 * manifests, or other addressable context. The `read` thunk is intentionally
 * synchronous text; richer transport ownership belongs outside this carrier.
 */

/**
 * Pure resource metadata, without the resource body.
 *
 * This is the shape projected to MCP `resources/list`. Reading content remains a
 * separate step so clients can inspect the knowledge-vault map before pulling
 * artifact bytes.
 */

/**
 * Register an addressable artifact as a resource leg.
 *
 * The function validates the required URI, name, and read thunk, then freezes the
 * carrier. It does not read the resource immediately; the read happens later
 * when a projection such as MCP `resources/read` asks for the body.
 */
export function resource(spec) {
  if (!spec.uri || spec.uri.trim() === "") throw new TypeError("resource: uri is required");
  if (!spec.name || spec.name.trim() === "") throw new TypeError("resource: name is required");
  if (typeof spec.read !== "function") throw new TypeError("resource: read must be a function");
  return Object.freeze({
    kind: "relating.resource",
    uri: spec.uri,
    name: spec.name,
    mimeType: spec.mimeType ?? "application/json",
    ...(spec.description === undefined ? {} : { description: spec.description }),
    read: spec.read,
  });
}

/**
 * Test whether a value is a resource carrier.
 *
 * `collectResources` uses this guard when a module namespace is induced into an
 * apex, so custom resources can sit next to actions and prompts as ordinary
 * exported values.
 */
export function isResource(value) {
  return typeof value === "object" && value !== null && (value).kind === "relating.resource";
}

/**
 * Project a resource carrier to descriptor metadata.
 *
 * The descriptor contains no `read` thunk and no body text, matching the
 * discovery/list side of MCP resources.
 */
export function resourceDescriptor(res) {
  return Object.freeze({
    uri: res.uri,
    name: res.name,
    mimeType: res.mimeType,
    ...(res.description === undefined ? {} : { description: res.description }),
  });
}

/**
 * Project a resource into package utterance facts.
 *
 * These facts let the induced discovery carrier describe resource membership in
 * the same relational vocabulary as actions and prompts.
 */
export function resourceUtterances(res) {
  const term = `relating.resource.${res.uri}`;
  const facts = [
    fact(term, "relating.resource.has-uri", res.uri),
    fact(term, "relating.resource.has-name", res.name),
    fact(term, "relating.resource.has-media-type", res.mimeType),
  ];
  if (res.description !== undefined) facts.push(fact(term, "relating.resource.description", res.description));
  return Object.freeze(facts);
}

/**
 * Register a resource whose body is fixed text.
 *
 * This is the convenience path for small guides, examples, and derived context
 * snapshots. Use `resource()` directly when the content should be computed at
 * read time.
 */
export function literalResource(
  uri,
  name,
  text,
  options = {},
) {
  return resource({
    uri,
    name,
    ...(options.mimeType === undefined ? {} : { mimeType: options.mimeType }),
    ...(options.description === undefined ? {} : { description: options.description }),
    read: () => text,
  });
}

export { utterance };
