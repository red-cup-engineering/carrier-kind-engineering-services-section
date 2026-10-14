import { declareDiscoveryExtension } from "@red-cup-engineering/x402-services-section/server";
import { inspectSchema, schemaCorpus, validateInstance } from "@red-cup-engineering/json-schema-services-section";

/** The Base mainnet CAIP-2 network id, the only network default this package ever supplies on its own -- the x402 payto decision record (x402-services-section data/logs) fixes the facilitator and payTo per deployment, never here. */
export const DEFAULT_NETWORK = "eip155:8453";

const MEASURE_ID = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/u;
const USD_PRICE = /^(?:0|[1-9][0-9]*)\.[0-9]{2}$/u;
const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/u;
const EVM_ADDRESS = /^0x[0-9a-fA-F]{40}$/u;
const EVM_NETWORK = /^eip155:[1-9][0-9]*$/u;

function nonEmptyString(value, name) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} must be a nonempty string`);
  return value;
}

function requireObject(value, name) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${name} must be an object`);
  return value;
}

function requireNode(value) {
  const node = requireObject(value, "catalog.node");
  return Object.freeze({
    id: nonEmptyString(node.id, "catalog.node.id"),
    title: nonEmptyString(node.title, "catalog.node.title"),
    description: nonEmptyString(node.description, "catalog.node.description"),
  });
}

function requireSchemaPair(value, name) {
  const pair = requireObject(value, name);
  const schema = requireObject(pair.schema, `${name}.schema`);
  if (!("example" in pair)) throw new TypeError(`${name}.example is required`);
  const inspection = inspectMeasureSchema(schema);
  if (!inspection.ok) {
    const reasons = inspection.errors.map((error) => `${error.pointer} ${error.keyword}: ${error.message}`).join("; ");
    throw new TypeError(`${name}.schema is not an admitted draft 2020-12 schema: ${reasons}`);
  }
  const exampleCheck = validateInstance(pair.example, schema, schemaCorpus([schema]));
  if (!exampleCheck.ok) {
    const reasons = exampleCheck.errors.map((error) => `${error.pointer} ${error.keyword}: ${error.message}`).join("; ");
    throw new TypeError(`${name}.example does not satisfy ${name}.schema: ${reasons}`);
  }
  return Object.freeze({ schema: Object.freeze(schema), example: pair.example });
}

function requireEvidence(value, name) {
  const evidence = requireObject(value, name);
  nonEmptyString(evidence.status, `${name}.status`);
  if (!Array.isArray(evidence.citations)) throw new TypeError(`${name}.citations must be an array`);
  const citations = evidence.citations.map((citation, index) => {
    const entry = requireObject(citation, `${name}.citations[${index}]`);
    nonEmptyString(entry.title, `${name}.citations[${index}].title`);
    if (entry.doi !== undefined) nonEmptyString(entry.doi, `${name}.citations[${index}].doi`);
    if (entry.url !== undefined) nonEmptyString(entry.url, `${name}.citations[${index}].url`);
    return Object.freeze({ title: entry.title, ...(entry.doi === undefined ? {} : { doi: entry.doi }), ...(entry.url === undefined ? {} : { url: entry.url }) });
  });
  return Object.freeze({ status: evidence.status, citations: Object.freeze(citations) });
}

function requireCompute(value, name) {
  const compute = requireObject(value, name);
  nonEmptyString(compute.package, `${name}.package`);
  if (compute.subpath !== undefined) nonEmptyString(compute.subpath, `${name}.subpath`);
  const computeExport = nonEmptyString(compute.export, `${name}.export`);
  if (!IDENTIFIER.test(computeExport)) throw new TypeError(`${name}.export must be a valid JS export identifier`);
  if (compute.marshal !== undefined) {
    const marshal = nonEmptyString(compute.marshal, `${name}.marshal`);
    if (!IDENTIFIER.test(marshal)) throw new TypeError(`${name}.marshal must be a valid JS export identifier`);
  }
  return Object.freeze({
    package: compute.package,
    ...(compute.subpath === undefined ? {} : { subpath: compute.subpath }),
    export: compute.export,
    ...(compute.marshal === undefined ? {} : { marshal: compute.marshal }),
  });
}

function requireMeasure(value, index) {
  const measure = requireObject(value, `catalog.measures[${index}]`);
  const id = nonEmptyString(measure.id, `catalog.measures[${index}].id`);
  if (!MEASURE_ID.test(id)) throw new TypeError(`catalog.measures[${index}].id must be lower-kebab-case`);
  const path = nonEmptyString(measure.path, `catalog.measures[${index}].path`);
  if (path !== `/v1/${id}`) throw new TypeError(`catalog.measures[${index}].path must be /v1/${id}`);
  const title = nonEmptyString(measure.title, `catalog.measures[${index}].title`);
  const description = nonEmptyString(measure.description, `catalog.measures[${index}].description`);
  const price = requireObject(measure.price, `catalog.measures[${index}].price`);
  const usd = nonEmptyString(price.usd, `catalog.measures[${index}].price.usd`);
  if (!USD_PRICE.test(usd) || Number(usd) <= 0) throw new TypeError(`catalog.measures[${index}].price.usd must be a positive "0.00"-shaped USD string`);
  const input = requireSchemaPair(measure.input, `catalog.measures[${index}].input`);
  const output = requireSchemaPair(measure.output, `catalog.measures[${index}].output`);
  const evidence = requireEvidence(measure.evidence, `catalog.measures[${index}].evidence`);
  const compute = requireCompute(measure.compute, `catalog.measures[${index}].compute`);
  return Object.freeze({ id, path, title, description, price: Object.freeze({ usd }), input, output, evidence, compute });
}

/** Validate a schema against the house's fixed draft 2020-12 vocabulary, without requiring pool-wide `$id` uniqueness this catalog has no stake in. */
function inspectMeasureSchema(schema) {
  const poolIds = typeof schema.$id === "string" ? new Set([schema.$id]) : new Set();
  return inspectSchema(schema, poolIds);
}

/**
 * Validate one paid-measure catalog: unique measure ids and paths, positive
 * USD prices, and input/output schemas that admit under the house's
 * draft-2020-12 evaluator and validate their own declared examples.
 *
 * @param {unknown} catalog
 * @returns {{node: {id: string, title: string, description: string}, measures: readonly object[]}}
 * @throws {TypeError} if any structural, price, or schema/example rule is violated
 */
export function validateMeasureCatalog(catalog) {
  const source = requireObject(catalog, "catalog");
  const node = requireNode(source.node);
  if (!Array.isArray(source.measures) || source.measures.length === 0) {
    throw new TypeError("catalog.measures must be a nonempty array");
  }
  const seenIds = new Set();
  const seenPaths = new Set();
  const measures = source.measures.map((measure, index) => {
    const validated = requireMeasure(measure, index);
    if (seenIds.has(validated.id)) throw new TypeError(`duplicate measure id ${validated.id}`);
    if (seenPaths.has(validated.path)) throw new TypeError(`duplicate measure path ${validated.path}`);
    seenIds.add(validated.id);
    seenPaths.add(validated.path);
    return validated;
  });
  return Object.freeze({ node, measures: Object.freeze(measures) });
}

/**
 * Build one validate-input -> compute -> JSON handler per measure, shared
 * verbatim by the fetch/Workers and Express transports.
 *
 * @param {unknown} catalog
 * @param {Record<string, (input: unknown) => Promise<unknown>>} resolvers - measure id -> async compute function
 * @returns {Map<string, {measure: object, validateInput: (body: unknown) => unknown, compute: (body: unknown) => Promise<unknown>}>}
 * @throws {TypeError} if the catalog is invalid or a measure has no matching resolver
 */
export function createMeasureHandlers(catalog, resolvers) {
  const validated = validateMeasureCatalog(catalog);
  const resolverMap = requireObject(resolvers, "resolvers");
  const handlers = new Map();
  for (const measure of validated.measures) {
    const resolve = resolverMap[measure.id];
    if (typeof resolve !== "function") throw new TypeError(`resolvers.${measure.id} must be an async (input) => output function`);
    const corpus = schemaCorpus([measure.input.schema]);
    handlers.set(measure.id, Object.freeze({
      measure,
      validateInput(body) {
        const result = validateInstance(body, measure.input.schema, corpus);
        if (!result.ok) {
          const reasons = result.errors.map((error) => `${error.pointer} ${error.keyword}: ${error.message}`).join("; ");
          throw new TypeError(`invalid input for measure ${measure.id}: ${reasons}`);
        }
        return body;
      },
      async compute(body) {
        return await resolve(body);
      },
    }));
  }
  return handlers;
}

/**
 * Project one measure's declared input/output schemas and examples into an
 * `@x402/extensions/bazaar` discovery extension.
 *
 * @param {{input: {schema: object, example: unknown}, output: {schema: object, example: unknown}}} measure
 * @returns {object} the Bazaar discovery extension
 */
export function discoveryFor(measure) {
  return declareDiscoveryExtension({
    method: "POST",
    bodyType: "json",
    input: measure.input.example,
    inputSchema: measure.input.schema,
    output: { schema: measure.output.schema, example: measure.output.example },
  });
}

/**
 * Normalize the one defaults record `routeTableFor` and `expressRoutesFor`
 * share: an explicit EVM CAIP-2 network (falling back to Base mainnet), and
 * a facilitator and payTo the caller must supply from its own environment
 * -- this package never carries either as a source constant.
 *
 * @param {{network?: string, facilitatorUrl?: string, facilitatorClient?: object, payTo: string}} defaults
 * @returns {{network: string, facilitatorUrl: (string|undefined), facilitatorClient: (object|undefined), payTo: string}}
 * @throws {TypeError} if network is malformed, payTo is missing, or neither facilitatorUrl nor facilitatorClient is supplied
 */
export function measureEndpointDefaults(defaults) {
  const { network = DEFAULT_NETWORK, facilitatorUrl, facilitatorClient, payTo } = requireObject(defaults, "defaults");
  if (!EVM_NETWORK.test(network)) throw new TypeError("defaults.network must be one explicit EVM CAIP-2 identifier");
  if (facilitatorClient === undefined && (typeof facilitatorUrl !== "string" || facilitatorUrl === "")) {
    throw new TypeError("defaults.facilitatorUrl is required (from env) unless defaults.facilitatorClient is supplied; no default facilitator is provided on purpose");
  }
  if (!EVM_ADDRESS.test(payTo ?? "")) {
    throw new TypeError("defaults.payTo is required (from env) and must be one public EVM address; no default is provided on purpose");
  }
  return Object.freeze({ network, facilitatorUrl, facilitatorClient, payTo: payTo.toLowerCase() });
}

function routeEntry(measure, handler, defaults) {
  return Object.freeze({
    accepts: { scheme: "exact", price: `$${measure.price.usd}`, network: defaults.network, payTo: defaults.payTo },
    description: measure.description,
    mimeType: "application/json",
    serviceName: measure.id,
    extensions: discoveryFor(measure),
    validateInput: handler.validateInput,
    compute: handler.compute,
  });
}

function requireHandler(handlers, id) {
  const handler = handlers?.get?.(id);
  if (handler === undefined) throw new TypeError(`handlers has no entry for measure ${id} (build it with createMeasureHandlers)`);
  return handler;
}

/**
 * Build the `routes` table for the fetch/Workers x402 boundary
 * (`createExactEvmFetchPaymentBoundary`'s `routes` argument), one entry per
 * measure, each carrying its own `validateInput`/`compute` so a stateless
 * dispatcher can run the shared validate -> payment -> compute -> JSON cycle
 * by path lookup alone.
 *
 * @param {unknown} catalog
 * @param {Map<string, object>} handlers - from `createMeasureHandlers`
 * @param {{network?: string, facilitatorUrl?: string, facilitatorClient?: object, payTo: string}} defaults
 * @returns {Readonly<Record<string, object>>} keyed by `"POST <path>"`
 */
export function routeTableFor(catalog, handlers, defaults) {
  const validated = validateMeasureCatalog(catalog);
  const normalizedDefaults = measureEndpointDefaults(defaults);
  const routes = {};
  for (const measure of validated.measures) {
    const handler = requireHandler(handlers, measure.id);
    routes[`POST ${measure.path}`] = routeEntry(measure, handler, normalizedDefaults);
  }
  return Object.freeze(routes);
}

/**
 * Build one Express-transport route descriptor per measure: the same
 * `routeEntry` used by `routeTableFor` (so an Express boundary and a fetch
 * boundary price and discover identically), plus `admit`/`respond`
 * middleware realizing the validate-before-payment, compute-after-payment
 * split `server.mjs`-shaped consumers wire around `payment.middleware`.
 *
 * @param {unknown} catalog
 * @param {Map<string, object>} handlers - from `createMeasureHandlers`
 * @param {{network?: string, facilitatorUrl?: string, facilitatorClient?: object, payTo: string}} defaults
 * @returns {readonly {path: string, route: object, admit: Function, respond: Function}[]}
 */
export function expressRoutesFor(catalog, handlers, defaults) {
  const validated = validateMeasureCatalog(catalog);
  const normalizedDefaults = measureEndpointDefaults(defaults);
  return Object.freeze(validated.measures.map((measure) => {
    const handler = requireHandler(handlers, measure.id);
    const route = routeEntry(measure, handler, normalizedDefaults);
    return Object.freeze({
      path: measure.path,
      route,
      admit(request, response, next) {
        try {
          handler.validateInput(request.body);
          next();
        } catch (error) {
          if (error instanceof TypeError || error instanceof RangeError) {
            response.status(422).json({ error: error.message });
            return;
          }
          next(error);
        }
      },
      async respond(request, response, next) {
        try {
          response.json(await handler.compute(request.body));
        } catch (error) {
          next(error);
        }
      },
    });
  }));
}

function atomicUnitsFromUsd(usd) {
  const [whole, cents] = usd.split(".");
  return (BigInt(whole) * 100n + BigInt(cents)) * 10_000n;
}

/**
 * Resolve one settled x402 amount (atomic-unit decimal string, or the
 * catalog's own `"$0.00"`-shaped price string) back to the measure id it
 * prices, generalizing the per-product hard-coded tier table.
 *
 * @param {unknown} catalog
 * @param {unknown} amount
 * @returns {string} the matching measure id, or `"undeclared"`
 */
export function tierFor(catalog, amount) {
  const validated = validateMeasureCatalog(catalog);
  const value = String(amount ?? "");
  for (const measure of validated.measures) {
    if (value === `$${measure.price.usd}`) return measure.id;
    if (value === atomicUnitsFromUsd(measure.price.usd).toString()) return measure.id;
  }
  return "undeclared";
}

/**
 * Build one pure settlement-witness projection generic over the catalog's
 * node id: given a settled x402 `afterSettle` context, return the small
 * carrier a consumer's own durable journal (e.g.
 * `@red-cup-engineering/witness-journal-document-service`) can append.
 * Performs no I/O itself -- persistence stays the consumer's concern.
 *
 * @param {unknown} catalog
 * @returns {(context: {result: {network: string, transaction: string, payer?: (string|null), amount?: unknown}, requirements?: {amount?: unknown}}) => object}
 */
export function settlementWitnessFor(catalog) {
  const validated = validateMeasureCatalog(catalog);
  return function projectMeasureSettlementWitness(context) {
    const result = requireObject(context, "context").result;
    const network = requireObject(result, "context.result").network;
    const transaction = result.transaction;
    if (typeof network !== "string" || network === "") throw new Error("settled x402 context omitted network");
    if (typeof transaction !== "string" || transaction === "") throw new Error("settled x402 context omitted transaction");
    const amount = result.amount ?? context.requirements?.amount;
    return Object.freeze({
      type: "X402MeasureSettlementWitness",
      nodeId: validated.node.id,
      tier: tierFor(validated, amount),
      payment: Object.freeze({ network, transaction, payer: result.payer ?? null, amount: String(amount ?? "") }),
    });
  };
}
