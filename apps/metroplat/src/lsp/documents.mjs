/** Inert virtual documents projected from program descriptors. Kept separate from semantic LSP
 * navigation so discovery does not load Lean, chronicles, or theorem analysis. */
const uri = (kind, id, scheme) => `${scheme}://${kind}/${encodeURIComponent(id)}${kind === "schema" ? ".schema" : ""}.json`;
const document = (kind, id, address, text) => Object.freeze({ kind, id, uri: address, get text() { return text(); } });

export function schemaDocument(schema, scheme) {
  return document("schema", schema.id, uri("schema", schema.id, scheme), () => `${JSON.stringify(schema.schema, null, 2)}\n`);
}

export function operationDocument(action, scheme, endpoint) {
  const face = Object.freeze({
    kind: action.kind, verb: action.verb, summary: action.summary, description: action.description,
    domain: action.domain?.id, codomain: action.codomain?.id, inputFormat: action.inputFormat, outputFormat: action.outputFormat,
    ...(endpoint === undefined ? {} : { endpoint: Object.freeze({ name: endpoint.name, href: endpoint.href, method: endpoint.method, input: endpoint.input, output: endpoint.output, settlement: endpoint.settlement, contract: endpoint.contract }) }),
  });
  return document("action", action.verb, uri("action", action.verb, scheme), () => `${JSON.stringify(face, null, 2)}\n`);
}

export function resourceDocument(descriptor, scheme) {
  const face = Object.freeze({ kind: "metroplat.resource.descriptor", uri: descriptor.uri, name: descriptor.name, mimeType: descriptor.mimeType, ...(descriptor.description === undefined ? {} : { description: descriptor.description }) });
  return document("resource", descriptor.uri, uri("resource", descriptor.uri, scheme), () => `${JSON.stringify(face, null, 2)}\n`);
}

export function promptDocument(descriptor, scheme) {
  const face = Object.freeze({ kind: "metroplat.prompt.descriptor", name: descriptor.name, ...(descriptor.description === undefined ? {} : { description: descriptor.description }), arguments: descriptor.arguments });
  return document("prompt", descriptor.name, uri("prompt", descriptor.name, scheme), () => `${JSON.stringify(face, null, 2)}\n`);
}

const unique = (items, key) => Object.freeze([...new Map(items.map((item) => [key(item), item])).values()]);
export const uniqueById = (items) => unique(items, (item) => item.id);
export const uniqueActionsByVerb = (items) => unique(items, (item) => item.verb);
export const uniqueResourcesByUri = (items) => unique(items, (item) => item.uri);
export const uniquePromptsByName = (items) => unique(items, (item) => item.name);

export function projectProgramDocuments(options = {}) {
  const scheme = options.scheme ?? "metroplat-lsp";
  const endpoints = new Map((options.endpoints ?? []).map((endpoint) => [endpoint.name, endpoint]));
  return Object.freeze([
    ...uniqueById(options.schemas ?? []).map((schema) => schemaDocument(schema, scheme)),
    ...uniqueActionsByVerb(options.operations ?? []).map((operation) => operationDocument(operation, scheme, endpoints.get(operation.verb))),
    ...uniqueResourcesByUri(options.resourceDescriptors ?? []).map((descriptor) => resourceDocument(descriptor, scheme)),
    ...uniquePromptsByName(options.promptDescriptors ?? []).map((descriptor) => promptDocument(descriptor, scheme)),
  ]);
}
