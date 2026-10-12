/**
 * @packageDocumentation
 *
 * sites/hole - finite no-readout settlement boundary.
 *
 * Moved here from `sites/hole` (that directory is ruled dead, and this is
 * squarely "the kernel executing its actions" per `dev/placement-rulings.md`,
 * 2026-07-06): `holeRootRoute` is the kernel's own root action, mounted at
 * `/` on the running process. This is the executable package surface for the
 * Obsmetrologia hole boundary theorem, built on `src/kernel`'s admissibility grading. A
 * hole is computed from a finite causal substrate and a chosen readout
 * region: events that cannot causally reach readout form the interior,
 * readout-reaching events form the exterior, the shroud is the interior side
 * adjacent to the exterior, and effects originate on that shroud. Its bulk
 * projection (state/record/content, the SSE stream) lives alongside it in the
 * journal projection system.
 */
import { boundaryEvidencePolicy } from "@red-cup-engineering/signchain/contracts/instrument";
import { contractExposure, contractExposureReport, materialContext, relationalContract, relationalMove, relationalPredicate } from "@red-cup-engineering/signchain/contracts/contract";
import { observationalLens } from "@red-cup-engineering/signchain/contracts/observation-lens";
import { phaseEnergeticObligation } from "@red-cup-engineering/signchain/contracts/energetics";
import { strictFinitePhase } from "@red-cup-engineering/signchain/contracts/phase";
import {
  settleCausalSet,

} from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/analysis/causal";
import { siteForm } from "@red-cup-engineering/metrologic/settling/schema/site";
import { parse, requireJsonValue } from "@red-cup-engineering/json-services-section";

import { routeOwnerDescriptorContract } from "@red-cup-engineering/metroplat/presentation/serving";

export const HOLE_ROUTE_ID = "metroplat/settlements/hole";
export const HOLE_FEED = "hole";
export const HOLE_THEOREM_REFERENCE = "Obsmetrologia.Relational.Spacetime.Boundary.Hole";

function nonempty(value, label) {
  const text = value.trim();
  if (text.length === 0) throw new TypeError(`${label}: expected non-empty string`);
  return text;
}

function sourceSubject(source) {
  return source.replace(/^@/, "").replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "external";
}

function uniqueStrings(values, label) {
  const out = [];
  const seen = new Set();
  for (const value of values) {
    const clean = nonempty(value, label);
    if (!seen.has(clean)) {
      seen.add(clean);
      out.push(clean);
    }
  }
  return Object.freeze(out);
}

function cleanLinks(links, eventSet) {
  return Object.freeze(links.map((link) => Object.freeze({
    from: nonempty(link.from, "hole causal link from"),
    to: nonempty(link.to, "hole causal link to"),
  })).filter((link, index, all) =>
    eventSet.has(link.from)
    && eventSet.has(link.to)
    && all.findIndex((candidate) => candidate.from === link.from && candidate.to === link.to) === index));
}

function linkKey(link) {
  return `${link.from}\u0000${link.to}`;
}

function linkSet(links) {
  return new Set(links.map(linkKey));
}

function causalLe(closure, from, to) {
  return from === to || closure.has(linkKey({ from, to }));
}

function reachesReadout(closure, readout, event) {
  for (const target of readout) {
    if (causalLe(closure, event, target)) return true;
  }
  return false;
}

function causalAdjacent(closure, left, right) {
  return causalLe(closure, left, right) || causalLe(closure, right, left);
}

function canonicalEffects(
  events,
  closure,
  shroud,
) {
  const rows = [];
  for (const from of shroud) {
    for (const to of events) {
      if (causalAdjacent(closure, from, to)) rows.push(Object.freeze({ from, to }));
    }
  }
  return Object.freeze(rows);
}

function cleanInput(input) {
  const events = uniqueStrings(input.causalSet.events, "hole event");
  const eventSet = new Set(events);
  const readout = uniqueStrings(input.readout, "hole readout").filter((event) => eventSet.has(event));
  const causalSet = Object.freeze({
    events,
    links: cleanLinks(input.causalSet.links, eventSet),
  });
  return Object.freeze({
    source: nonempty(input.source, "hole source"),
    observedAt: requireJsonValue(input.observedAt, "hole observedAt"),
    causalSet,
    readout: Object.freeze(readout),
    ...(input.effects === undefined ? {} : {
      effects: Object.freeze(input.effects.map((effect) => Object.freeze({
        from: nonempty(effect.from, "hole effect from"),
        to: nonempty(effect.to, "hole effect to"),
      })).filter((effect) => eventSet.has(effect.from) && eventSet.has(effect.to))),
    }),
  });
}

export function holeRouteDescriptor() {
  return Object.freeze({
    kind: "metroplat.settlements.hole",
    id: HOLE_ROUTE_ID,
    path: "/",
    observationSchema: "metroplat/settlements/hole/observation",
    statementLogSchema: "metroplat/witness/eavt-log",
    feed: HOLE_FEED,
  });
}

function rootPath(root) {
  if (root === undefined || root.trim() === "") return "/";
  return root.endsWith("/") ? root : `${root}/`;
}

function joinRoot(root, suffix) {
  return `${root.replace(/\/+$/, "")}${suffix}`.replace(/\/+/g, "/") || "/";
}

export function holeSurface(input) {
  const root = rootPath(input.root);
  return Object.freeze({
    kind: "metroplat.settlements.hole.surface",
    settlement: holeRouteDescriptor(),
    package: input.package,
    root,
    observation: Object.freeze({
      method: "POST",
      href: root,
      schema: "metroplat/settlements/hole/observation",
      statementLog: "metroplat/witness/eavt-log",
    }),
    projections: Object.freeze({
      actions: Object.freeze((input.actions ?? []).map((endpoint) => Object.freeze({
        name: endpoint.name,
        href: joinRoot(root, endpoint.href),
        domain: endpoint.domain,
        codomain: endpoint.codomain,
        phase: endpoint.settlement.regime,
      }))),
      discovery: joinRoot(root, "/discovery"),
      openapi: joinRoot(root, "/openapi.json"),
      mcp: joinRoot(root, "/mcp"),
      feed: joinRoot(root, "/feed"),
      health: joinRoot(root, "/health"),
    }),
  });
}

export function holeRouteOwner() {
  const settlement = holeRouteDescriptor();
  return routeOwnerDescriptorContract.assert(Object.freeze({ id: settlement.id, path: settlement.path }), "hole route settlement descriptor");
}

function jsonResponse(body, status = 200) {
  return Object.freeze({
    status,
    type: "application/json; charset=utf-8",
    body: `${JSON.stringify(body)}\n`,
  });
}

function textResponse(body, status) {
  return Object.freeze({
    status,
    type: "text/plain; charset=utf-8",
    body,
  });
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function holeInputFromRootRequest(
  body,
  query,
  now,
) {
  const parsed = parse(body);
  if (!isRecord(parsed)) throw new TypeError("hole observation expects a JSON object");
  return Object.freeze({
    ...parsed,
    source: typeof parsed["source"] === "string" ? parsed["source"] : query["source"] ?? "http:hole",
    observedAt: parsed["observedAt"] ?? now?.() ?? "0000-00-00T00:00:00.000Z",
  });
}

export function holeRootRoute(routeOptions = {}) {
  return ({ induced, request, path, basePath, options }) => {
    if (path !== "" && path !== "/") return undefined;
    const settlement = holeRouteOwner();
    if (request.method === "GET") {
      const root = basePath === "" ? "/" : `${basePath}/`.replace(/\/+/g, "/");
      return Object.freeze({
        route: "settlement",
        settlement,
        response: jsonResponse(holeSurface({
          package: induced.discovery.package,
          root,
          actions: induced.discovery.programs.map((endpoint) => Object.freeze({
            name: endpoint.name,
            href: endpoint.href,
            domain: typeof endpoint.domainSchema?.["$ref"] === "string" ? endpoint.domainSchema["$ref"] : endpoint.input,
            codomain: typeof endpoint.codomainSchema?.["$ref"] === "string" ? endpoint.codomainSchema["$ref"] : endpoint.output,
            settlement: endpoint.settlement,
          })),
        })),
      });
    }
    if (request.method !== "POST") return undefined;
    if (routeOptions.observation === undefined) {
      return Object.freeze({
        route: "root-observation",
        settlement,
        response: textResponse("hole root observation writer is not configured\n", 503),
      });
    }
    let input;
    try {
      input = holeInputFromRootRequest(request.body, request.query, options.now);
    } catch {
      return Object.freeze({
        route: "root-observation",
        settlement,
        response: textResponse("hole observation expects a JSON request body\n", 400),
      });
    }
    try {
      const caller = options.caller ?? Object.freeze({ transport: "http", route: "/" });
      const receipt = routeOptions.observation(input, { caller });
      return Object.freeze({
        route: "root-observation",
        settlement,
        response: jsonResponse({
          kind: "metroplat.settlements.hole.root-receipt",
          settlement: receipt.settlement,
          input: receipt.input,
          report: receipt.report,
          rows: receipt.append.rows,
          artifact: receipt.append.artifact,
          append: receipt.append,
          boundary: receipt.boundary,
          exposure: receipt.exposure,
          exposureReport: receipt.exposureReport,
        }),
      });
    } catch (error) {
      return Object.freeze({
        route: "root-observation",
        settlement,
        response: textResponse(`hole observation failed: ${error instanceof Error ? error.message : String(error)}\n`, 400),
      });
    }
  };
}

export function holeSiteForm() {
  return siteForm({
    kind: "metroplat.site.form",
    id: HOLE_ROUTE_ID,
    name: "hole",
    siteKind: "package-boundary",
    complexity: "complete",
    proofStatus: "runtime-finite-receipt",
    theoremReference: HOLE_THEOREM_REFERENCE,
    objects: Object.freeze(["finite causal event", "causal link", "readout region", "interior", "exterior", "shroud", "effect", "EAVT row"]),
    morphisms: Object.freeze([
      "causal reachability orders finite events",
      "observation ingress maps a causal/readout input to report or obstruction",
      "journal projection maps reports to append-only EAVT rows",
    ]),
    covers: Object.freeze([
      "readout reachability covers the finite causal set by exterior and no-readout interior",
      "shroud covers the interior boundary adjacent to the readout exterior",
      "statement rows cover the report boundary as theorem, causal set, region, effect, and law observations",
    ]),
    bulk: {
      id: "metroplat/settlements/hole/bulk",
      boundaries: Object.freeze([
        {
          id: "metroplat/settlements/hole/boundary/observation",
          kind: "schema",
          address: "metroplat/settlements/hole/observation",
          description: "Computed finite no-readout report or obstruction.",
        },
        {
          id: "metroplat/settlements/hole/boundary/eavt",
          kind: "evidence",
          address: "metroplat/witness/eavt-log",
          codec: "json/jsonl/eavt",
          description: "Exact append-only statement tuples for the observation report.",
        },
        {
          id: "metroplat/settlements/hole/boundary/http",
          kind: "protocol",
          protocol: "http",
          method: "POST",
          href: "/",
          description: "Root causal/readout observation ingress.",
        },
        {
          id: "metroplat/settlements/hole/boundary/discovery",
          kind: "route",
          href: "/discovery",
          description: "Operation discovery projection for the settlement surface.",
        },
        {
          id: "metroplat/settlements/hole/boundary/openapi",
          kind: "codec",
          codec: "json/openapi",
          href: "/openapi.json",
          description: "OpenAPI projection over the induced route family.",
        },
        {
          id: "metroplat/settlements/hole/boundary/mcp",
          kind: "protocol",
          protocol: "mcp",
          href: "/mcp",
          description: "MCP envelope projection over the induced operation family.",
        },
        {
          id: "metroplat/settlements/hole/boundary/feed",
          kind: "codec",
          codec: "json/feed",
          href: "/feed",
          description: "Observation feed projection for settlement statements.",
        },
      ]),
      constraints: Object.freeze([
        "events are finite string identifiers",
        "readout is a finite subset of admitted events",
        "interior is exactly non-reachability to readout",
        "effect sources are shrouded",
        "observation rows preserve the theorem reference and causal law report",
      ]),
    },
    frontier: Object.freeze([
      "the runtime form does not promote entropy, area, radiation, agency, or smooth horizon geometry",
    ]),
  });
}

export function holeReport(input) {
  const admitted = cleanInput(input);
  const causalSet = Object.freeze({
    kind: "lorentzian.causalSet",
    events: admitted.causalSet.events,
    links: admitted.causalSet.links,
  });
  const settled = settleCausalSet(causalSet);
  if (settled.kind !== "lorentzian.causalSettle:witness") {
    return Object.freeze({
      kind: "metroplat.settlements.hole.obstruction",
      settlement: HOLE_ROUTE_ID,
      source: admitted.source,
      observedAt: admitted.observedAt,
      theoremReference: HOLE_THEOREM_REFERENCE,
      causalSet,
      obstruction: settled,
    });
  }

  const closure = linkSet(settled.closure);
  const readout = new Set(admitted.readout);
  const exterior = Object.freeze(settled.events.filter((event) => reachesReadout(closure, readout, event)));
  const exteriorSet = new Set(exterior);
  const interior = Object.freeze(settled.events.filter((event) => !exteriorSet.has(event)));
  const interiorSet = new Set(interior);
  const shroud = Object.freeze(interior.filter((event) =>
    exterior.some((candidate) => causalAdjacent(closure, event, candidate))));
  const shroudSet = new Set(shroud);
  const effects = admitted.effects ?? canonicalEffects(settled.events, closure, shroud);
  const laws = Object.freeze({
    futureClosedInterior: interior.every((from) =>
      settled.events.every((to) => !causalLe(closure, from, to) || interiorSet.has(to))),
    pastClosedExterior: exterior.every((to) =>
      settled.events.every((from) => !causalLe(closure, from, to) || exteriorSet.has(from))),
    interiorExteriorDisjoint: interior.every((event) => !exteriorSet.has(event)),
    noInteriorFutureToExterior: interior.every((from) =>
      exterior.every((to) => !causalLe(closure, from, to))),
    shroudInsideInterior: shroud.every((event) => interiorSet.has(event)),
    shroudNotExterior: shroud.every((event) => !exteriorSet.has(event)),
    shroudHasExteriorPredecessor: shroud.every((event) =>
      exterior.some((candidate) => causalLe(closure, candidate, event))),
    effectSourceShrouded: effects.every((effect) => shroudSet.has(effect.from)),
    effectSourceInterior: effects.every((effect) => interiorSet.has(effect.from)),
    effectSourceNotExterior: effects.every((effect) => !exteriorSet.has(effect.from)),
  });

  return Object.freeze({
    kind: "metroplat.settlements.hole.observation",
    settlement: HOLE_ROUTE_ID,
    source: admitted.source,
    observedAt: admitted.observedAt,
    theoremReference: HOLE_THEOREM_REFERENCE,
    causalSet,
    settlementWitness: Object.freeze({
      kind: settled.kind,
      directLinks: settled.directLinks,
      closure: settled.closure,
      apexCount: settled.apexCount,
      orderedPairCount: settled.orderedPairCount,
      regime: settled.regime,
    }),
    readout: admitted.readout,
    interior,
    exterior,
    shroud,
    effects: Object.freeze(effects),
    laws,
  });
}

export function holeEavt(report) {
  const entity = Object.freeze([HOLE_ROUTE_ID, report.source]);
  const rows = [
    [entity, "theoremReference", report.theoremReference, report.observedAt],
    [entity, "causalSet", report.causalSet, report.observedAt],
    [entity, "kind", report.kind, report.observedAt],
  ];
  if (report.kind === "metroplat.settlements.hole.obstruction") {
    rows.push([entity, "obstruction", report.obstruction, report.observedAt]);
  } else {
    rows.push(
      [entity, "readout", report.readout, report.observedAt],
      [entity, "interior", report.interior, report.observedAt],
      [entity, "exterior", report.exterior, report.observedAt],
      [entity, "shroud", report.shroud, report.observedAt],
      [entity, "effects", report.effects, report.observedAt],
      [entity, "laws", report.laws, report.observedAt],
    );
  }
  return Object.freeze(rows.map((row) => Object.freeze(row)));
}

export function holeObservationContract(source = "external") {
  const subject = sourceSubject(source);
  const material = materialContext({
    id: `metroplat.material.sites.hole.observation.${subject}`,
    loci: Object.freeze(["finite-causal-set", "readout-region", "hole-region", "hole-shroud", "metroplat/witness/eavt-log"]),
    incidence: Object.freeze([
      "readout reachability partitions finite causal events into exterior and no-readout interior",
      "the shroud is the interior side causally adjacent to the readout exterior",
      "canonical effects originate on the shroud and never on the readout exterior",
    ]),
    fibers: Object.freeze(["causal event", "causal link", "readout event", "interior event", "exterior event", "shroud event", "effect source", "statement row"]),
    valueAlgebra: "finite causal set + readout region -> hole interior/exterior/shroud/effects -> EAVT",
    constraints: Object.freeze([
      "events are finite string identifiers",
      "causal links reference admitted events",
      "readout is a finite subset of admitted events",
      "interior is exactly non-reachability to readout",
      "shroud events are interior events adjacent to readout exterior",
      "effect sources are shrouded",
    ]),
    closure: Object.freeze(["settleCausalSet", "holeReport", "holeEavt", "observeHole"]),
    boundary: Object.freeze(["metroplat/settlements/hole", "metroplat/settlements/hole/observation", "metroplat/witness/eavt-log"]),
  });
  const lens = observationalLens({
    id: `metroplat.lens.sites.hole.observation.${subject}`,
    domain: "finite-causal-set+readout-region",
    boundary: "metroplat/settlements/hole/observation",
    preserves: Object.freeze(["source", "observed time", "causal closure", "readout", "interior", "exterior", "shroud", "effect source law", "EAVT tuple identity"]),
    hides: Object.freeze(["transport socket", "process stack", "unproved physical promotion"]),
    output: "metroplat/witness/eavt-log",
    evidenceRequired: true,
  });
  return relationalContract({
    id: `metroplat.contract.sites.hole.observation.${subject}`,
    material,
    precondition: relationalPredicate({
      id: `metroplat.predicate.sites.hole.observation.${subject}.causal-readout-present`,
      description: "A finite causal substrate and chosen readout region are present.",
      entails: Object.freeze(["finite-causal-set", "readout-region"]),
    }),
    move: relationalMove({
      id: `metroplat.move.sites.hole.observation.${subject}`,
      description: "Compute the finite no-readout hole region, shroud, and shroud-sourced effects.",
      domain: "finite-causal-set+readout-region",
      codomain: "metroplat/witness/eavt-log",
      partial: true,
      deterministic: true,
      effects: Object.freeze(["boundary", "evidence", "material"]),
    }),
    postcondition: relationalPredicate({
      id: `metroplat.predicate.sites.hole.observation.${subject}.recorded`,
      description: "The causal hole observation is represented as exact EAVT statement tuples.",
      entails: Object.freeze(["metroplat/settlements/hole/observation", "metroplat/witness/eavt-log"]),
    }),
    phase: strictFinitePhase,
    lens,
    evidencePolicy: boundaryEvidencePolicy,
    energetics: Object.freeze([
      phaseEnergeticObligation({
        id: `metroplat.energy.sites.hole.observation.${subject}`,
        phase: strictFinitePhase,
        source: `metroplat.predicate.sites.hole.observation.${subject}.causal-readout-present`,
        target: `metroplat.predicate.sites.hole.observation.${subject}.recorded`,
        invariant: "Finite observation spends closure and reachability work; it does not promote entropy, area, radiation, agency, or smooth horizon geometry.",
        measure: "one finite causal set and readout region to one hole report",
        evidenceRequired: true,
      }),
    ]),
    refinements: Object.freeze([
      Object.freeze({
        id: `metroplat.refinement.sites.hole.observation.${subject}.eavt`,
        implementation: "sites/hole:holeEavt",
        refines: "evidence",
        preserves: Object.freeze(["readout", "interior", "exterior", "shroud", "laws", boundaryEvidencePolicy.id]),
      }),
    ]),
  });
}

export function observeHole(
  input,
  options = {},
) {
  const admitted = cleanInput(input);
  const report = holeReport(admitted);
  const rows = holeEavt(report);
  const contract = holeObservationContract(admitted.source);
  const exposure = contractExposure(contract, {
    at: admitted.observedAt,
    ...(options.caller === undefined ? {} : { caller: options.caller }),
    materialState: report,
    boundary: Object.freeze({ settlement: report.settlement, source: report.source, rows: rows.length, kind: report.kind }),
  });
  return Object.freeze({
    kind: "metroplat.settlements.hole.exposure",
    settlement: holeRouteDescriptor(),
    input: admitted,
    report,
    rows,
    contract,
    exposure,
    exposureReport: contractExposureReport(contract, exposure),
  });
}

export function holeKeratinousBoundary(
  observation,
  append,
) {
  return Object.freeze({
    kind: "metroplat.settlements.hole.keratinous-boundary",
    settlement: observation.settlement,
    ingress: Object.freeze({
      protocol: "http",
      method: "POST",
      href: observation.settlement.path,
      schema: observation.settlement.observationSchema,
      statementLog: observation.settlement.statementLogSchema,
    }),
    observationSchema: observation.settlement.observationSchema,
    statementLogSchema: observation.settlement.statementLogSchema,
    feed: observation.settlement.feed,
    observation: observation.report,
    rows: observation.rows.length,
    append,
    exposure: observation.exposure,
    exposureReport: observation.exposureReport,
  });
}
