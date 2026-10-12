/**
 * acting/induce — module → carrier: the coproduct apex of a module's actions,
 * resources, and prompts.
 *
 * This is the inverse of the manifest→carrier arrow elsewhere in the workspace
 * (which reads `package.json#bin`). `induceBins` reads a module's registered
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

import { registeredCategory } from "./category.mjs";
import { actionUtterances, fact, isAction, } from "./action.mjs";
import { wireCodec } from "@red-cup-engineering/computer-system-engine/wire";
import { dispatch, dispatchAsync, } from "./dispatch.mjs";
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
import { actionSettlementSignature, } from "@red-cup-engineering/computer-systems-engineering-services-section/signcraft/settlement-signature";

/** One action projected as a POST endpoint over the stdio process boundary. */

/** The discovery carrier: the coproduct apex of a package's legs. */

/** What `induceBins` returns: the carrier, a bound dispatch, the legs. */

/** Options for inducing bins. */

function joinPath(basePath, leaf) {
  const base = basePath.replace(/\/+$/, "");
  return `${base}/${encodeURIComponent(leaf)}`;
}

/** Keep only the actions out of a module namespace (or accept a list directly). */
export function collectActions(source) {
  return Object.freeze(collectValues(source).filter(isAction));
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

/** Project an action into its endpoint. */
function endpointOf(act, basePath) {
  return Object.freeze({
    name: act.verb,
    href: joinPath(basePath, act.verb),
    method: "POST",
    input: wireCodec(act.inputFormat).mediaType,
    output: wireCodec(act.outputFormat).mediaType,
    ...(act.summary === undefined ? {} : { summary: act.summary }),
    ...(act.description === undefined ? {} : { description: act.description }),
    ...(act.domain === undefined ? {} : { domainSchema: { $ref: act.domain.id } }),
    ...(act.codomain === undefined ? {} : { codomainSchema: { $ref: act.codomain.id } }),
    ...(act.runTerm === undefined ? {} : { runTerm: act.runTerm }),
    settlement: actionSettlementSignature(act),
  });
}

/** The URI of an action's input/output schema resource. */
function schemaUri(packageName, verb, side) {
  return `relating://${encodeURIComponent(packageName)}/schema/${encodeURIComponent(verb)}/${side}`;
}

/** Auto-derive the schema resources a package already carries on its actions. */
function schemaResourcesOf(actions, packageName) {
  const resources = [];
  for (const carrier of registeredCategory.carriers()) {
    const schema = carrier.schema;
    resources.push(resource({
      uri: `${carrier.id}.json`,
      name: `${carrier.id} schema`,
      description: `JSON Schema for carrier ${carrier.id}.`,
      read: () => `${JSON.stringify(schema, null, 2)}\n`,
    }));
  }
  for (const act of actions) {
    if (act.domain !== undefined) {
      const schema = act.domain.schema;
      resources.push(resource({
        uri: schemaUri(packageName, act.verb, "input"),
        name: `${act.verb} input schema`,
        description: `JSON Schema of the ${act.inputFormat} input carrier for ${act.verb}.`,
        read: () => `${JSON.stringify(schema, null, 2)}\n`,
      }));
    }
    if (act.codomain !== undefined) {
      const schema = act.codomain.schema;
      resources.push(resource({
        uri: schemaUri(packageName, act.verb, "output"),
        name: `${act.verb} output schema`,
        description: `JSON Schema of the ${act.outputFormat} output carrier for ${act.verb}.`,
        read: () => `${JSON.stringify(schema, null, 2)}\n`,
      }));
    }
  }
  return Object.freeze(resources);
}

/** De-duplicate resources by URI, keeping the first occurrence. */
function dedupeResources(resources) {
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
function dedupePrompts(prompts) {
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
export function induceBins(
  source,
  options = {},
) {
  const actions = collectActions(source);
  const packageName = options.packageName ?? "@red-cup-engineering/relating";
  const basePath = options.basePath ?? "";
  const term = `relating.package.${packageName}`;
  const bins = actions.map((act) => endpointOf(act, basePath));

  // Registered prompts come first so they win de-duplication over derived ones.
  const registeredPrompts = [...collectPrompts(source), ...(options.prompts ?? [])];
  const derivedPrompts = options.derivePrompts === false ? [] : actions.map(actionPrompt);
  const prompts = dedupePrompts([...registeredPrompts, ...derivedPrompts]);

  // Registered resources come first; auto-derived schema + discovery resources follow.
  const registeredResources = [...collectResources(source), ...(options.resources ?? [])];
  const schemaResources = options.deriveSchemaResources === false ? [] : schemaResourcesOf(actions, packageName);

  const utterances = [
    fact(term, "relating.package.has-name", packageName),
    fact(term, "relating.package.speaks-protocol", "stdio"),
  ];
  for (const act of actions) {
    utterances.push(fact(term, "relating.package.has-action", act.verb));
    for (const u of actionUtterances(act)) utterances.push(u);
  }

  // The discovery carrier is itself a resource; its read thunk closes over the
  // assembled descriptors so the artifact is always the live apex.
  let discoveryRef;
  const discoveryResource = resource({
    uri: `relating://${encodeURIComponent(packageName)}/discovery`,
    name: `${packageName} discovery`,
    description: "The package's coproduct apex: its actions, resources, and prompts.",
    read: () => `${JSON.stringify(discoveryRef, null, 2)}\n`,
  });
  const manifoldResource = operationsManifoldResource(packageName, () => discoveryRef);

  const resources = dedupeResources([...registeredResources, ...schemaResources, discoveryResource, manifoldResource]);
  for (const res of resources) {
    utterances.push(fact(term, "relating.package.has-resource", res.uri));
    for (const u of resourceUtterances(res)) utterances.push(u);
  }
  for (const pr of prompts) {
    utterances.push(fact(term, "relating.package.has-prompt", pr.name));
    for (const u of promptUtterances(pr)) utterances.push(u);
  }

  discoveryRef = Object.freeze({
    kind: "relating.acting.discovery",
    package: packageName,
    protocol: "stdio",
    bins: Object.freeze(bins),
    resources: Object.freeze(resources.map(resourceDescriptor)),
    prompts: Object.freeze(prompts.map(promptDescriptor)),
    utterances: Object.freeze(utterances),
  });

  return Object.freeze({
    discovery: discoveryRef,
    actions,
    resources,
    prompts,
    dispatch: (argv, stdin, dispatchOptions = {}) =>
      dispatch(actions, argv, stdin, dispatchOptions),
    dispatchAsync: (argv, stdin, dispatchOptions = {}) =>
      dispatchAsync(actions, argv, stdin, dispatchOptions),
  });
}
