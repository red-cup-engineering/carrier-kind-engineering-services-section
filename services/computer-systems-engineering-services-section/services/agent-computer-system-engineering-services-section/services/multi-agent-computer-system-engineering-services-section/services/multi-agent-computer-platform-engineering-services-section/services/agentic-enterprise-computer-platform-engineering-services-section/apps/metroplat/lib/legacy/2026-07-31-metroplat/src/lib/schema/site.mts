/**
 * site - local-to-global schema incidence law.
 *
 * A package operation surface can be read as a finite schema site: legs consume and
 * produce schema addresses, extrema are schemas at the boundary, and local
 * edges are exactly produced-schema/consumed-schema matches. This module owns
 * that incidence law without knowing actions, HTTP, MCP, registries, or routes.
 */
import type { FromSchema, SchemaContract } from "./contract.mts";

export interface SchemaSiteLeg {
  readonly id: string;
  readonly domain?: string;
  readonly codomain?: string;
}

export interface SchemaSiteExtremum {
  readonly schema: string;
  readonly legs: readonly string[];
}

export interface SchemaSiteEdge {
  readonly from: string;
  readonly to: string;
  readonly schema: string;
  readonly relation: "codomain-domain";
}

/** One schema object as a node in the package namespace site. */
export interface SchemaSiteNode {
  /** Bare schema address. The address itself is the descent path. */
  readonly id: string;
  /** URL path for the schema node. */
  readonly path: string;
  /** Nearest visible schema prefix, when the supplied schema universe contains one. */
  readonly parent?: string;
  /** Visible child schema prefixes in the supplied schema universe. */
  readonly children: readonly string[];
  /** Slash depth of the bare address. */
  readonly depth: number;
}

export interface SchemaSiteIncidence {
  readonly domains: readonly SchemaSiteExtremum[];
  readonly codomains: readonly SchemaSiteExtremum[];
  readonly incoming: readonly SchemaSiteExtremum[];
  readonly outgoing: readonly SchemaSiteExtremum[];
  readonly edges: readonly SchemaSiteEdge[];
}

export interface SchemaReference {
  readonly from: string;
  readonly ref: string;
  readonly target: string;
  readonly location: string;
  readonly scope: "local" | "external";
  readonly resolved: boolean;
}

export interface SchemaReferenceIncidence {
  readonly schemas: readonly string[];
  readonly references: readonly SchemaReference[];
  readonly unresolved: readonly SchemaReference[];
}

export type SiteBoundaryKind =
  | "schema"
  | "codec"
  | "file"
  | "protocol"
  | "route"
  | "evidence";

export const siteBulkBoundarySchema = {
  $id: "metroplat/site/site-bulk-boundary",
  type: "object",
  required: ["id", "kind"],
  properties: {
    id: { type: "string" },
    kind: { enum: ["schema", "codec", "file", "protocol", "route", "evidence"] },
    address: { type: "string" },
    codec: { type: "string" },
    protocol: { type: "string" },
    method: { type: "string" },
    href: { type: "string" },
    description: { type: "string" },
  },
  additionalProperties: false,
  title: "SiteBulkBoundary",
  description: "One boundary of a site bulk: its kind and the address material it carries.",
} as const;

export type SiteBulkBoundary = FromSchema<typeof siteBulkBoundarySchema>;

export interface SiteBulk {
  readonly id: string;
  readonly boundaries: readonly SiteBulkBoundary[];
  readonly constraints: readonly string[];
}

export type SiteFormComplexity = "minimal" | "bounded" | "rich" | "complete";
export type SiteFormKind =
  | "grothendieck-site"
  | "bounded-subsite"
  | "enriched-site"
  | "package-boundary";
export type SiteProofStatus =
  | "lean-proved"
  | "runtime-finite-receipt"
  | "documented-frontier";

export interface SiteForm {
  readonly kind: "metroplat.site.form";
  readonly id: string;
  readonly name: string;
  readonly siteKind: SiteFormKind;
  readonly complexity: SiteFormComplexity;
  readonly proofStatus: SiteProofStatus;
  readonly theoremReference?: string;
  readonly objects: readonly string[];
  readonly morphisms: readonly string[];
  readonly covers: readonly string[];
  readonly bulk: SiteBulk;
  readonly frontier: readonly string[];
}

export function schemaSiteLeg(spec: SchemaSiteLeg): SchemaSiteLeg {
  return Object.freeze({
    id: spec.id,
    ...(spec.domain === undefined ? {} : { domain: spec.domain }),
    ...(spec.codomain === undefined ? {} : { codomain: spec.codomain }),
  });
}

/** Read the schema address carried by a direct `$ref` or inline `$id` operation slot.
 * Richer schema structure remains schema data and does not become an
 * incidence edge merely because it contains nested references. */
export function schemaSlotRef(schema: Record<string, unknown> | undefined): string | undefined {
  const ref = schema?.["$ref"];
  if (typeof ref === "string") return ref;
  const id = schema?.["$id"];
  return typeof id === "string" ? id : undefined;
}

/** Read every nested `$ref` in an explicit schema-contract universe. This is
 * incidence evidence, not a resolver or registry: local references are checked
 * against their own root `$defs`, and an external arrow is resolved only when
 * its declaring contract explicitly carries the target contract. Merely having
 * both objects somewhere in the surrounding universe does not compose them. */
export function schemaReferenceIncidence(
  contracts: readonly SchemaContract[],
): SchemaReferenceIncidence {
  const byId = new Map(contracts.map((contract) => [contract.id, contract]));
  const references: SchemaReference[] = [];
  const visit = (value: unknown, contract: SchemaContract, location: string): void => {
    if (Array.isArray(value)) {
      value.forEach((item, index) => visit(item, contract, `${location}/${index}`));
      return;
    }
    if (value === null || typeof value !== "object") return;
    const record = value as Readonly<Record<string, unknown>>;
    const ref = record["$ref"];
    if (typeof ref === "string") {
      const local = ref.startsWith("#");
      const localName = ref.startsWith("#/$defs/") ? ref.slice("#/$defs/".length) : undefined;
      const defs = contract.schema["$defs"];
      const explicitTargets = new Set(contract.references.map((reference) => reference.id));
      const resolved = local
        ? ref === "#" || (localName !== undefined && defs !== null && typeof defs === "object"
          && !Array.isArray(defs) && localName in defs)
        : explicitTargets.has(ref.split("#", 1)[0]!);
      references.push(Object.freeze({
        from: contract.id,
        ref,
        target: local ? contract.id : ref.split("#", 1)[0]!,
        location: location === "" ? "/" : location,
        scope: local ? "local" as const : "external" as const,
        resolved,
      }));
    }
    for (const [key, child] of Object.entries(record)) {
      if (key !== "$ref") visit(child, contract, `${location}/${key}`);
    }
  };
  for (const contract of [...contracts].sort((left, right) => left.id.localeCompare(right.id))) {
    visit(contract.schema, contract, "");
  }
  const ordered = Object.freeze(references.sort((left, right) =>
    left.from.localeCompare(right.from) || left.location.localeCompare(right.location) || left.ref.localeCompare(right.ref)));
  return Object.freeze({
    schemas: Object.freeze([...byId.keys()].sort()),
    references: ordered,
    unresolved: Object.freeze(ordered.filter((reference) => !reference.resolved)),
  });
}

export function siteBulkBoundary(spec: SiteBulkBoundary): SiteBulkBoundary {
  const id = nonempty(spec.id, "siteBulkBoundary id");
  const kind = spec.kind;
  return Object.freeze({
    id,
    kind,
    ...(spec.address === undefined ? {} : { address: nonempty(spec.address, `${id} address`) }),
    ...(spec.codec === undefined ? {} : { codec: nonempty(spec.codec, `${id} codec`) }),
    ...(spec.protocol === undefined ? {} : { protocol: nonempty(spec.protocol, `${id} protocol`) }),
    ...(spec.method === undefined ? {} : { method: nonempty(spec.method, `${id} method`) }),
    ...(spec.href === undefined ? {} : { href: nonempty(spec.href, `${id} href`) }),
    ...(spec.description === undefined ? {} : { description: nonempty(spec.description, `${id} description`) }),
  });
}

export function siteBulk(spec: SiteBulk): SiteBulk {
  const boundaries = spec.boundaries.map(siteBulkBoundary);
  if (boundaries.length === 0) throw new TypeError("siteBulk: expected at least one boundary");
  return Object.freeze({
    id: nonempty(spec.id, "siteBulk id"),
    boundaries: Object.freeze(boundaries),
    constraints: frozenNonemptyStrings(spec.constraints, "siteBulk constraint"),
  });
}

export function siteForm(spec: SiteForm): SiteForm {
  return Object.freeze({
    kind: "metroplat.site.form" as const,
    id: schemaNodeId(spec.id),
    name: nonempty(spec.name, "siteForm name"),
    siteKind: spec.siteKind,
    complexity: spec.complexity,
    proofStatus: spec.proofStatus,
    ...(spec.theoremReference === undefined ? {} : { theoremReference: nonempty(spec.theoremReference, `${spec.id} theoremReference`) }),
    objects: frozenNonemptyStrings(spec.objects, `${spec.id} object`),
    morphisms: frozenNonemptyStrings(spec.morphisms, `${spec.id} morphism`),
    covers: frozenNonemptyStrings(spec.covers, `${spec.id} cover`),
    bulk: siteBulk(spec.bulk),
    frontier: Object.freeze(spec.frontier.map((item) => nonempty(item, `${spec.id} frontier`))),
  });
}

export function siteFormBoundaryKinds(form: SiteForm): readonly SiteBoundaryKind[] {
  return Object.freeze([...new Set(form.bulk.boundaries.map((boundary) => boundary.kind))].sort());
}

export function siteBulkHasBoundary(form: SiteForm, kind: SiteBoundaryKind): boolean {
  return form.bulk.boundaries.some((boundary) => boundary.kind === kind);
}

/** Normalize a schema address into the bare descent path form used as `$id`. */
export function schemaNodeId(id: string): string {
  const normalized = id.trim().replace(/^\/+|\/+$/g, "").replace(/\/{2,}/g, "/");
  if (normalized === "") throw new TypeError("schemaNodeId: schema node id is empty");
  return normalized;
}

/** Project a schema `$id` to its namespace path. The `$id` is the path. */
export function schemaNodePath(id: string): string {
  return `/${schemaNodeId(id)}`;
}

/** Return the nearest visible prefix-node of `id`, if one is present. */
export function schemaNodeParent(id: string, universe: ReadonlySet<string>): string | undefined {
  const parts = schemaNodeId(id).split("/");
  for (let size = parts.length - 1; size > 0; size -= 1) {
    const candidate = parts.slice(0, size).join("/");
    if (universe.has(candidate)) return candidate;
  }
  return undefined;
}

/**
 * Materialize schema `$id`s as a namespace tree.
 *
 * The site is the prefix order over schema addresses. This function does not
 * invent route names or module tails: each node's location is exactly its bare
 * schema `$id`, exposed as `/${id}` for URL projections.
 */
export function schemaSiteNodes(ids: Iterable<string>): readonly SchemaSiteNode[] {
  const normalized = new Set<string>();
  for (const id of ids) normalized.add(schemaNodeId(id));

  const children = new Map<string, string[]>();
  const parents = new Map<string, string>();
  for (const id of normalized) {
    const parent = schemaNodeParent(id, normalized);
    if (parent === undefined) continue;
    parents.set(id, parent);
    const bucket = children.get(parent);
    if (bucket === undefined) children.set(parent, [id]);
    else bucket.push(id);
  }

  return Object.freeze([...normalized]
    .sort((left, right) => left.localeCompare(right))
    .map((id) => {
      const parent = parents.get(id);
      return Object.freeze({
        id,
        path: schemaNodePath(id),
        ...(parent === undefined ? {} : { parent }),
        children: Object.freeze([...(children.get(id) ?? [])].sort()),
        depth: id.split("/").length,
      });
    }));
}

export function schemaSiteIncidence(legs: readonly SchemaSiteLeg[]): SchemaSiteIncidence {
  const normalized = legs.map(schemaSiteLeg);
  const domains = siteExtrema(normalized, "domain");
  const codomains = siteExtrema(normalized, "codomain");
  const domainSchemas = new Set(domains.map((extremum) => extremum.schema));
  const codomainSchemas = new Set(codomains.map((extremum) => extremum.schema));
  return Object.freeze({
    domains,
    codomains,
    incoming: Object.freeze(domains.filter((extremum) => !codomainSchemas.has(extremum.schema))),
    outgoing: Object.freeze(codomains.filter((extremum) => !domainSchemas.has(extremum.schema))),
    edges: siteEdges(normalized),
  });
}

export function siteExtrema(
  legs: readonly SchemaSiteLeg[],
  side: "domain" | "codomain",
): readonly SchemaSiteExtremum[] {
  const bySchema = new Map<string, string[]>();
  for (const leg of legs) {
    const schema = leg[side];
    if (schema === undefined) continue;
    const at = bySchema.get(schema);
    if (at === undefined) bySchema.set(schema, [leg.id]);
    else at.push(leg.id);
  }
  return Object.freeze([...bySchema.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([schema, ids]) => Object.freeze({ schema, legs: Object.freeze([...ids].sort()) })));
}

export function siteEdges(legs: readonly SchemaSiteLeg[]): readonly SchemaSiteEdge[] {
  const domains = siteExtrema(legs, "domain");
  const codomains = siteExtrema(legs, "codomain");
  const domainBySchema = new Map(domains.map((extremum) => [extremum.schema, extremum.legs] as const));
  const edges: SchemaSiteEdge[] = [];
  for (const codomain of codomains) {
    const tos = domainBySchema.get(codomain.schema);
    if (tos === undefined) continue;
    for (const from of codomain.legs) {
      for (const to of tos) {
        edges.push(Object.freeze({ from, to, schema: codomain.schema, relation: "codomain-domain" as const }));
      }
    }
  }
  return Object.freeze(edges.sort((left, right) =>
    left.schema.localeCompare(right.schema)
    || left.from.localeCompare(right.from)
    || left.to.localeCompare(right.to)));
}

function nonempty(value: string, label: string): string {
  const text = value.trim();
  if (text.length === 0) throw new TypeError(`${label}: expected non-empty string`);
  return text;
}

function frozenNonemptyStrings(values: readonly string[], label: string): readonly string[] {
  if (values.length === 0) throw new TypeError(`${label}: expected at least one entry`);
  return Object.freeze(values.map((value) => nonempty(value, label)));
}
