/**
 * rpc/induce — module → surface: the coproduct apex of a module's operations,
 * resources, and prompts.
 *
 * This is the inverse of the manifest→carrier arrow elsewhere in the workspace
 * (which reads `package.json#bin`). `induceSurface` reads a module's registered
 * actions, resources, and prompts and yields the discovery carrier — the
 * coproduct apex into which each leg injects — plus a bound dispatch. CLI,
 * OpenAPI, MCP (tools + resources + prompts), and web UX are projected from this
 * one carrier as functorial images; none invents a second ontology.
 *
 * Resources and prompts are derived from what the package already declares: each
 * action's input/output JSON Schema and the discovery carrier itself project as
 * MCP resources, and each action projects as a guided MCP prompt — so the three
 * standard knowledge-vault primitives come for free, with packages free to
 * register richer resources/prompts via `resource()`/`prompt()`.
 */

import { fact, isOperation, operationUtterances, schemasOfOperations } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { readProgramContractStanding } from "./contract.mjs";
import { wireCodec } from "@red-cup-engineering/computer-system-engine/wire";
import { dispatch, dispatchAsync, } from "./verb-dispatch.mjs";
import {
  isResource,
  resource,
  resourceDescriptor,
  resourceUtterances,

} from "./resource.mjs";
import {
  actionPrompt,
  isPrompt,
  promptDescriptor,
  promptUtterances,

} from "./prompt.mjs";
import { operationsManifoldResource } from "./manifold.mjs";

/** One action projected as a POST endpoint over the stdio process boundary. */

/** The discovery carrier: the coproduct apex of a package's legs. */

/** What `induceSurface` returns: the carrier, a bound dispatch, the legs. */

/** Options for inducing a surface. */

function joinPath(basePath, leaf) {
  const base = basePath.replace(/\/+$/, "");
  return `${base}/${encodeURIComponent(leaf)}`;
}

/** Keep only the operations out of a module namespace (or accept a list directly). */
export function collectOperations(source) {
  return Object.freeze(collectValues(source).filter(isOperation));
}

/** Keep only the resources out of a module namespace (or accept a list directly). */
export function collectResources(source) {
  return Object.freeze(collectValues(source).filter(isResource));
}

/** Keep only the prompts out of a module namespace (or accept a list directly). */
export function collectPrompts(source) {
  return Object.freeze(collectValues(source).filter(isPrompt));
}

function collectValues(source) {
  return Symbol.iterator in Object(source)
    ? [...(source)]
    : Object.values(source);
}

/** Project an operation into its transport-neutral endpoint: its path, media types, inline
 *  schemas, SEN body, and its program contract standing (the given standing, else the one the
 *  operation's contract evidence reads). */
export function surfaceEndpointOf(operation, basePath = "", standing) {
  const contract = standing ?? readProgramContractStanding(operation);
  return Object.freeze({
    name: operation.verb,
    href: joinPath(basePath, operation.verb),
    method: "POST",
    input: wireCodec(operation.inputFormat).mediaType,
    output: wireCodec(operation.outputFormat).mediaType,
    ...(operation.summary === undefined ? {} : { summary: operation.summary }),
    ...(operation.description === undefined ? {} : { description: operation.description }),
    ...(operation.domain === undefined ? {} : { domainSchema: operation.domain.schema }),
    ...(operation.codomain === undefined ? {} : { codomainSchema: operation.codomain.schema }),
    ...(operation.runTerm === undefined ? {} : { runTerm: operation.runTerm }),
    contract,
    settlement: contract.contract.settlement,
  });
}

/** The URI of an action's input/output schema resource. */
function schemaUri(packageName, verb, side, scheme = "operations") {
  return `${scheme}://${encodeURIComponent(packageName)}/schema/${encodeURIComponent(verb)}/${side}`;
}

/** The schema resources an operation family carries: each of its schemas, and each operation's
 *  input and output schema under the caller's scheme. */
export function surfaceSchemaResources(operations, packageName, scheme = "operations") {
  const resources = [];
  for (const declared of schemasOfOperations(operations)) {
    const schema = declared.schema;
    resources.push(resource({
      uri: `${declared.id}.json`,
      name: `${declared.id} schema`,
      description: `JSON Schema ${declared.id}.`,
      read: () => `${JSON.stringify(schema, null, 2)}\n`,
    }));
  }
  for (const act of operations) {
    if (act.domain !== undefined) {
      const schema = act.domain.schema;
      resources.push(resource({
        uri: schemaUri(packageName, act.verb, "input", scheme),
        name: `${act.verb} input schema`,
        description: `JSON Schema of the ${act.inputFormat} input carrier for ${act.verb}.`,
        read: () => `${JSON.stringify(schema, null, 2)}\n`,
      }));
    }
    if (act.codomain !== undefined) {
      const schema = act.codomain.schema;
      resources.push(resource({
        uri: schemaUri(packageName, act.verb, "output", scheme),
        name: `${act.verb} output schema`,
        description: `JSON Schema of the ${act.outputFormat} output carrier for ${act.verb}.`,
        read: () => `${JSON.stringify(schema, null, 2)}\n`,
      }));
    }
  }
  return Object.freeze(resources);
}

/** De-duplicate resources by URI, keeping the first occurrence. */
export function dedupeSurfaceResources(resources) {
  const seen = new Set();
  const kept = [];
  for (const res of resources) {
    if (seen.has(res.uri)) continue;
    seen.add(res.uri);
    kept.push(res);
  }
  return Object.freeze(kept);
}

/** De-duplicate prompts by name, keeping the first occurrence. */
export function dedupeSurfacePrompts(prompts) {
  const seen = new Set();
  const kept = [];
  for (const pr of prompts) {
    if (seen.has(pr.name)) continue;
    seen.add(pr.name);
    kept.push(pr);
  }
  return Object.freeze(kept);
}

/**
 * Induce the bin surface for a module's legs.
 *
 * The input can be a module namespace object or a list. Actions, resources, and
 * prompts are collected, schema resources and action prompts are derived, and the
 * result is one discovery carrier plus a bound dispatcher. HTTP, OpenAPI, MCP,
 * forms, and CLI code consume this induced apex rather than re-declaring the
 * operation surface.
 */
export function induceSurface(
  source,
  options = {},
) {
  const operations = collectOperations(source);
  const packageName = options.packageName ?? "@red-cup-engineering/computer-system-engine";
  const scheme = options.scheme ?? "operations";
  const basePath = options.basePath ?? "";
  const term = `operation-host.package.${packageName}`;
  const programs = operations.map((operation) => surfaceEndpointOf(operation, basePath));

  // Registered prompts come first so they win de-duplication over derived ones.
  const registeredPrompts = [...collectPrompts(source), ...(options.prompts ?? [])];
  const derivedPrompts = options.derivePrompts === false ? [] : operations.map(actionPrompt);
  const prompts = dedupeSurfacePrompts([...registeredPrompts, ...derivedPrompts]);

  // Registered resources come first; auto-derived schema + discovery resources follow.
  const registeredResources = [...collectResources(source), ...(options.resources ?? [])];
  const schemaResources = options.deriveSchemaResources === false ? [] : surfaceSchemaResources(operations, packageName, scheme);

  const utterances = [
    fact(term, "operation-host.package.has-name", packageName),
    fact(term, "operation-host.package.speaks-protocol", "stdio"),
  ];
  for (const act of operations) {
    utterances.push(fact(term, "operation-host.package.has-operation", act.verb));
    for (const u of operationUtterances(act)) utterances.push(u);
  }

  // The discovery carrier is itself a resource; its read thunk closes over the
  // assembled descriptors so the artifact is always the live apex.
  let discoveryRef;
  const discoveryResource = resource({
    uri: `${scheme}://${encodeURIComponent(packageName)}/discovery`,
    name: `${packageName} discovery`,
    description: "The package's coproduct apex: its operations, resources, and prompts.",
    read: () => `${JSON.stringify(discoveryRef, null, 2)}\n`,
  });
  const manifoldResource = operationsManifoldResource(packageName, () => discoveryRef, scheme);

  const resources = dedupeSurfaceResources([...registeredResources, ...schemaResources, discoveryResource, manifoldResource]);
  for (const res of resources) {
    utterances.push(fact(term, "operation-host.package.has-resource", res.uri));
    for (const u of resourceUtterances(res)) utterances.push(u);
  }
  for (const pr of prompts) {
    utterances.push(fact(term, "operation-host.package.has-prompt", pr.name));
    for (const u of promptUtterances(pr)) utterances.push(u);
  }

  discoveryRef = Object.freeze({
    kind: "operation-host.discovery",
    scheme,
    package: packageName,
    protocol: "stdio",
    programs: Object.freeze(programs),
    resources: Object.freeze(resources.map(resourceDescriptor)),
    prompts: Object.freeze(prompts.map(promptDescriptor)),
    utterances: Object.freeze(utterances),
  });

  return Object.freeze({
    discovery: discoveryRef,
    operations,
    resources,
    prompts,
    dispatch: (argv, stdin, dispatchOptions = {}) =>
      dispatch(operations, argv, stdin, dispatchOptions),
    dispatchAsync: (argv, stdin, dispatchOptions = {}) =>
      dispatchAsync(operations, argv, stdin, dispatchOptions),
  });
}
