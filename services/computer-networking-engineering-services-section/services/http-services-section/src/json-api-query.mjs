/**
 * json-api-query — one read of a JSON HTTP API described as data
 * (`json-api-query.schema.json`): expand its RFC 6570 template with the
 * query's shared variables and the call's own, fetch it as JSON, and read the
 * result list and total count at their RFC 6901 pointers.
 */
import { validateSchemaInstance } from "@red-cup-engineering/json-schema-services-section/validate-schema-instance";
import { resolveJsonPointer } from "@red-cup-engineering/json-services-section/resolve-json-pointer";
import { expandUriTemplate } from "@red-cup-engineering/uri-services-section/uri-template";
import { fetchJson } from "../scripts/fetch-json.mjs";
import querySchema from "./json-api-query.schema.json" with { type: "json" };

export { querySchema };

/** Admit a JSON API query: `{ ok: true, value }` or `{ ok: false, errors }`. */
export function admitJsonApiQuery(query) {
  const { ok, errors } = validateSchemaInstance({ schema: querySchema, instance: query });
  return ok ? Object.freeze({ ok, value: query }) : Object.freeze({ ok, errors });
}

/**
 * Run one admitted query.
 *
 * @param {object} query - a JSON API query
 * @param {Record<string, string|number>} [variables] - this call's template variables
 * @param {object} [options] - forwarded to fetchJson (timeoutMs, signal, ...)
 * @returns {Promise<{ uri: string, count: (number|undefined), results: unknown[] }>}
 * @throws {TypeError} when the query is refused or the response has no result array at its pointer
 */
export async function queryJsonApi(query, variables = {}, options = {}) {
  const admitted = admitJsonApiQuery(query);
  if (!admitted.ok) throw new TypeError(`queryJsonApi: query refused: ${admitted.errors.map((e) => `${e.pointer} ${e.message}`).join("; ")}`);
  const merged = Object.fromEntries(Object.entries({ ...query.variables, ...variables }).map(([name, value]) => [name, String(value)]));
  const { uri } = expandUriTemplate({ template: query.template, variables: merged });
  const body = await fetchJson(uri, { ...options, headers: { accept: "application/json", ...query.headers, ...options.headers } });
  const results = resolveJsonPointer(body, query.results);
  if (!Array.isArray(results)) throw new TypeError(`queryJsonApi: ${uri} has no result array at ${query.results}`);
  const count = query.count === undefined ? undefined : Number(resolveJsonPointer(body, query.count));
  return Object.freeze({ uri, count: Number.isFinite(count) ? count : undefined, results });
}
