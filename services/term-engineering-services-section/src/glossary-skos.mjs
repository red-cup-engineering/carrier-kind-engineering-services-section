import { SCHEMA_ORG_CONTEXT, SKOS_NAMESPACE, definedTermJsonLd, definedTermSetJsonLd } from "@red-cup-engineering/rdf-data-model-services-section/schema-org";
import { RELATION_PREDICATE_RANGES } from "./term-carrier.mjs";

const SCHEMA = "computer-glossary-skos.v2";
/** Where the 561 Group names its knowledge; concept IRIs are `<base><scheme path>/<identity>`. */
export const DEFAULT_KNOWLEDGE_BASE = "https://561.group/knowledge/";
/** House relation predicates, as IRIs in the same `/ns/predicate/<name>` shape GEODE serves. */
export const TERM_VOCABULARY = "https://561.group/ns/predicate/";
/** Who a projection is for, under the house surface policy: the public sees only terms whose own carrier says `visibility: public`. */
export const GLOSSARY_AUDIENCES = Object.freeze(["public", "authenticated"]);
/** The scheme path of a glossary carried directly at the indexed root. */
const ROOT_SCHEME_PATH = "561-group";
/** Carrier predicates whose object is the subject's genus or whole (SKOS hierarchical, upward). */
const BROADER = new Set(["subtype-of", "instance-of", "part-of", "component-of"]);
/** Carrier predicates whose object is the subject's species or part (SKOS hierarchical, downward). */
const NARROWER = new Set(["types", "components", "composed-of", "contains", "includes"]);

const CONTEXT = Object.freeze([SCHEMA_ORG_CONTEXT, Object.freeze({ skos: SKOS_NAMESPACE, dct: "http://purl.org/dc/terms/", term: TERM_VOCABULARY })]);

/**
 * The IRI path of a concept scheme, from its section path alone (the `services/` connectors
 * dropped), so a concept's IRI never depends on which other sections were indexed with it.
 * @param {string} scheme root-relative section directory, `""` for the root
 * @returns {string}
 */
export function schemeIriPath(scheme) {
  if (scheme === "") return ROOT_SCHEME_PATH;
  return scheme.split("/").filter((segment) => segment !== "services" && segment !== "").join("/");
}

function schemeName(scheme) {
  const section = scheme === "" ? ROOT_SCHEME_PATH : scheme.split("/").pop();
  const words = section.replace(/-services?(?:-section)?$/u, "").replace(/-/gu, " ");
  return `${words.charAt(0).toUpperCase()}${words.slice(1)} glossary`;
}

function list(value) { return Array.isArray(value) ? value : [value]; }
function withoutContext({ "@context": _context, ...node }) { return node; }

/**
 * Whether a term may appear in a projection for `audience`. A term stating any `consent-status`
 * is gated and never projected; the public sees a term only when its carrier opted in.
 * @param {{visibility?: string, "consent-status"?: string}} record
 * @param {"public"|"authenticated"} audience
 */
export function glossaryAudienceAdmits(record, audience) {
  if (record["consent-status"] !== undefined) return false;
  return audience === "authenticated" || record.visibility === "public";
}

/**
 * Project a glossary index (`computer-glossary-index.v1`) into a SKOS vocabulary serialized as
 * JSON-LD: one concept scheme per owning section and one concept per admitted term the audience
 * may see, each a schema.org `DefinedTermSet` / `DefinedTerm` as well, so both SKOS and
 * schema.org consumers read it. Names become `prefLabel`, aliases `altLabel`, the body the
 * definition, the description the schema.org `description`, the identity the notation.
 * Carrier-range relations resolve to the nearest concept in the section tree among those
 * projected; hierarchical predicates map to `skos:broader`/`skos:narrower`, every other one to
 * `skos:related`, and each also stays under its own house predicate (`term:<predicate>`).
 * Keywords (a compound term's constituents) map to `skos:broader`. Pure and deterministic: the
 * same index yields byte-identical output.
 * @param {{records: readonly object[]}} index
 * @param {{base?: string, audience?: "public"|"authenticated", pageOf?: (record: object) => string|undefined}} [options]
 *   `pageOf` names the page that presents a term, when one is published.
 * @returns {Readonly<{schema: string, audience: string, "@context": readonly unknown[], "@graph": object[], accounting: object}>}
 */
export function projectGlossarySkos(index, { base = DEFAULT_KNOWLEDGE_BASE, audience = "public", pageOf = () => undefined } = {}) {
  if (!index || !Array.isArray(index.records)) throw new TypeError("index must be a projected glossary index");
  if (typeof base !== "string" || !/^https?:\/\/.+\/$/u.test(base)) throw new TypeError("base must be an http(s) IRI ending in /");
  if (!GLOSSARY_AUDIENCES.includes(audience)) throw new TypeError(`audience must be one of ${GLOSSARY_AUDIENCES.join(", ")}`);
  const placed = index.records.filter((record) => typeof record.scheme === "string");
  const records = placed.filter((record) => glossaryAudienceAdmits(record, audience));
  const schemes = [...new Set(records.map((record) => record.scheme))].sort();
  const schemeIri = (scheme) => `${base}${schemeIriPath(scheme)}`;
  const conceptIri = (record) => `${schemeIri(record.scheme)}/${record.identity}`;
  const byIdentity = new Map();
  for (const record of records) byIdentity.set(record.identity, [...(byIdentity.get(record.identity) ?? []), record]);
  const accounting = { concepts: records.length, schemes: schemes.length, withheld: placed.length - records.length, relations: 0, unresolvedRelations: 0 };

  /**
   * The concept a carrier-range assertion names, from the asserting record's point of view: the
   * candidate whose section is nearest in the section tree (fewest steps up then down, so the
   * asserting section itself first), refused when two candidates are equally near.
   */
  function resolve(from, identity) {
    const distance = (scheme) => {
      const left = from.scheme.split("/"), right = scheme.split("/");
      let shared = 0; while (shared < left.length && shared < right.length && left[shared] === right[shared]) shared += 1;
      return (left.length - shared) + (right.length - shared);
    };
    const ranked = (byIdentity.get(identity) ?? []).map((candidate) => ({ candidate, distance: distance(candidate.scheme) })).sort((left, right) => left.distance - right.distance);
    const target = ranked.length === 1 || (ranked.length > 1 && ranked[0].distance < ranked[1].distance) ? ranked[0].candidate : undefined;
    if (target) accounting.relations += 1; else accounting.unresolvedRelations += 1;
    return target && conceptIri(target);
  }

  const concepts = records.map((record) => {
    const links = { broader: new Set(), narrower: new Set(), related: new Set() };
    const house = {};
    for (const keyword of record.keywords ?? []) { const target = resolve(record, keyword); if (target) links.broader.add(target); }
    for (const [predicate, assertion] of Object.entries(record.relations ?? {}).sort(([left], [right]) => left.localeCompare(right))) {
      if (RELATION_PREDICATE_RANGES[predicate] !== "carrier") continue;
      const targets = list(assertion).map((identity) => resolve(record, identity)).filter(Boolean);
      if (targets.length === 0) continue;
      house[`term:${predicate}`] = targets.map((target) => ({ "@id": target }));
      const kind = BROADER.has(predicate) ? "broader" : NARROWER.has(predicate) ? "narrower" : "related";
      for (const target of targets) links[kind].add(target);
    }
    const concept = withoutContext(definedTermJsonLd({
      id: conceptIri(record), url: pageOf(record), name: record.name, aliases: record.aliases, codes: [record.identity],
      description: record.description, definition: record.body, set: schemeIri(record.scheme),
      broader: [...links.broader].sort(), narrower: [...links.narrower].sort(), related: [...links.related].sort(),
    }));
    return { ...concept, ...(record.type ? { "dct:type": record.type } : {}), ...house };
  });

  const sets = schemes.map((scheme) => withoutContext(definedTermSetJsonLd({ id: schemeIri(scheme), name: schemeName(scheme), codes: [scheme === "" ? ROOT_SCHEME_PATH : scheme] })));
  return Object.freeze({ schema: SCHEMA, audience, "@context": CONTEXT, "@graph": [...sets, ...concepts], accounting: Object.freeze(accounting) });
}
