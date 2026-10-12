import { leanCapabilityAuthorityReportContract, leanCapabilityClaimContract, leanCapabilityClaimIndexContract, leanCapabilitySurfaceContract, leanDeclarationCatalogContract, leanFormalizationClaimContract, leanFormalizationReportContract, leanImportGraphContract, leanObligationCoverageContract, leanTheoremReferenceCoverageContract, leanTheoremReferenceIndexContract, leanTheoremSpineContract, } from "./schema.mjs";
import { causalHeightStrata, dependencyCycles } from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/analysis/causal";
import { graphFirstBettiNumberOfEdgeList } from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/analysis/laplacian";
import { moduleGraphCarrier } from "@red-cup-engineering/computing/host-neutral-carriers";
export function leanImportGraph(input) {
    const modules = isLeanEnvironment(input) ? input.modules : input;
    const moduleById = new Map(modules.map((module) => [module.id, module]));
    const ids = new Set();
    for (const module of modules) {
        ids.add(module.id);
        for (const imported of module.imports)
            ids.add(imported);
    }
    const edges = modules.flatMap((module) => module.imports.map((imported) => Object.freeze({
        from: module.id,
        to: imported,
        relationship: "import",
        resolvedBy: "lean-import",
    })));
    const nodes = [...ids].sort((left, right) => left.localeCompare(right)).map((id) => {
        const module = moduleById.get(id);
        return Object.freeze({
            id,
            ...(module?.path === undefined ? {} : { path: module.path }),
            workspaceMember: module !== undefined,
        });
    });
    return leanImportGraphContract.assert({
        kind: "metroplat.lean.import-graph",
        nodes: Object.freeze(nodes),
        edges: Object.freeze(edges.sort((left, right) => left.from.localeCompare(right.from) || left.to.localeCompare(right.to))),
        cycles: dependencyCycles(nodes.map((node) => node.id), edges),
        h1: graphCycleRank(nodes.map((node) => node.id), edges),
        mediaType: "application/vnd.metroplat.lean.import-graph+json",
    }, "Lean import graph");
}
export function leanDeclarationCatalog(input) {
    const modules = isLeanEnvironment(input) ? input.modules : input;
    const rootModule = isLeanEnvironment(input) ? input.rootModule : "Lean";
    const entries = modules.flatMap((module) => module.declarations.map((decl) => Object.freeze({
        module: module.id,
        name: decl.name,
        kind: decl.kind,
        ...(decl.namespace === undefined ? {} : { namespace: decl.namespace }),
        ...(decl.line === undefined ? {} : { line: decl.line }),
        ...(decl.proofStatus === undefined ? {} : { proofStatus: decl.proofStatus }),
    })));
    return leanDeclarationCatalogContract.assert({
        kind: "metroplat.lean.declaration-catalog",
        rootModule,
        entries: Object.freeze(entries.sort((left, right) => left.module.localeCompare(right.module) || left.name.localeCompare(right.name))),
        mediaType: "application/vnd.metroplat.lean.declaration-catalog+json",
    }, "Lean declaration catalog");
}
/** A Lean import DAG is a finite causal set (an import edge is "imported
 *  precedes importer"), so module tiering is the causal HEIGHT STRATIFICATION,
 *  read by the carried kinematics rather than a hand Kahn walk. An import
 *  cycle surfaces as the closed-timelike-curve obstruction instead of its
 *  members silently vanishing from every tier. */
export function topologicalSortLeanModules(input) {
    const graph = isLeanImportGraph(input) ? input : leanImportGraph(input);
    const events = graph.nodes.map((node) => node.id);
    const known = new Set(events);
    const links = graph.edges
        .filter((edge) => known.has(edge.from) && known.has(edge.to))
        .map((edge) => Object.freeze({ from: edge.to, to: edge.from }));
    const strata = causalHeightStrata(Object.freeze({ kind: "lorentzian.causalSet", events, links }));
    if (!Array.isArray(strata)) {
        const obstruction = strata;
        const location = obstruction.cycle.length > 0
            ? ` cycle ${obstruction.cycle.join(" -> ")}`
            : obstruction.offending === undefined ? "" : ` at ${obstruction.offending.from} -> ${obstruction.offending.to}`;
        throw new TypeError(`topologicalSortLeanModules: ${obstruction.reason}${location}`);
    }
    return strata;
}
export function leanTheoremSpine(input, names) {
    const modules = isLeanEnvironment(input) ? input.modules : input;
    const rootModule = isLeanEnvironment(input) ? input.rootModule : "Lean";
    const wanted = names === undefined ? undefined : new Set(names);
    const entries = modules.flatMap((module) => module.declarations
        .filter((decl) => decl.kind === "theorem" || decl.kind === "lemma")
        .filter((decl) => wanted === undefined || wanted.has(decl.name))
        .map((decl) => Object.freeze({
        module: module.id,
        name: decl.name,
        kind: decl.kind,
        ...(decl.line === undefined ? {} : { line: decl.line }),
        ...(decl.proofStatus === undefined ? {} : { proofStatus: decl.proofStatus }),
    })));
    return leanTheoremSpineContract.assert({
        kind: "metroplat.lean.theorem-spine",
        rootModule,
        entries: Object.freeze(entries.sort((left, right) => left.module.localeCompare(right.module) || left.name.localeCompare(right.name))),
        admitted: Object.freeze(entries.filter((entry) => entry.proofStatus === "admitted").map((entry) => entry.name).sort((left, right) => left.localeCompare(right))),
        mediaType: "application/vnd.metroplat.lean.theorem-spine+json",
    }, "Lean theorem spine");
}
export function leanObligationCoverage(spine, declarationIndex) {
    const declared = new Set(declarationIndex.declarations);
    const present = new Set(spine.entries.map((entry) => entry.name));
    return leanObligationCoverageContract.assert({
        kind: "metroplat.lean.obligation-coverage",
        declared: declared.size,
        present: [...declared].filter((name) => present.has(name)).length,
        missing: Object.freeze([...declared].filter((name) => !present.has(name)).sort((left, right) => left.localeCompare(right))),
        extra: Object.freeze([...present].filter((name) => !declared.has(name)).sort((left, right) => left.localeCompare(right))),
        admitted: spine.admitted,
        mediaType: "application/vnd.metroplat.lean.obligation-coverage+json",
    }, "Lean obligation coverage");
}
export function leanFormalizationClaim(input) {
    return leanFormalizationClaimContract.assert({
        kind: "metroplat.lean.formalization-claim",
        theorem: input.theorem,
        ...(input.source === undefined ? {} : { source: input.source }),
        ...(input.theoremMaturity === undefined ? {} : { theoremMaturity: input.theoremMaturity }),
        ...(input.environmentMaturity === undefined ? {} : { environmentMaturity: input.environmentMaturity }),
        obligations: Object.freeze([...(input.obligations ?? [])]),
        mediaType: "application/vnd.metroplat.lean.formalization-claim+json",
    }, "Lean formalization claim");
}
export function leanFormalizationClaimFromCertificate(certificate, source = "certificate.formalization") {
    const record = asRecord(certificate, "Lean formalization certificate");
    const formalization = asRecord(record["formalization"], "Lean formalization certificate.formalization");
    const theorem = stringField(formalization, "certificateTheorem");
    const theoremMaturity = optionalStringField(formalization, "certificateTheoremMaturity");
    const environmentMaturity = optionalStringField(formalization, "leanMaturity");
    const proof = recordValue(record["proof"]);
    const obligations = Array.isArray(proof?.["obligations"])
        ? proof["obligations"].flatMap((item) => {
            const obligation = recordValue(item)?.["obligation"];
            return typeof obligation === "string" && obligation !== "" ? [obligation] : [];
        })
        : [];
    return leanFormalizationClaim({
        theorem,
        source,
        ...(theoremMaturity === undefined ? {} : { theoremMaturity }),
        ...(environmentMaturity === undefined ? {} : { environmentMaturity }),
        obligations,
    });
}
export function leanFormalizationReport(claim, input) {
    const spine = isLeanTheoremSpine(input) ? input : leanTheoremSpine(input);
    const entry = spine.entries.find((candidate) => candidate.name === claim.theorem);
    const proofStatus = entry?.proofStatus ?? "unknown";
    const present = entry !== undefined;
    const proved = proofStatus === "proved";
    const missing = [
        ...(present ? [] : [`theorem:${claim.theorem}`]),
        ...(present && !proved ? [`proof-status:${proofStatus}`] : []),
    ];
    return leanFormalizationReportContract.assert({
        kind: "metroplat.lean.formalization-report",
        theorem: claim.theorem,
        ...(claim.source === undefined ? {} : { source: claim.source }),
        present,
        proved,
        accepted: present && proved,
        proofStatus,
        ...(claim.theoremMaturity === undefined ? {} : { theoremMaturity: claim.theoremMaturity }),
        ...(claim.environmentMaturity === undefined ? {} : { environmentMaturity: claim.environmentMaturity }),
        obligations: Object.freeze([...(claim.obligations ?? [])]),
        missing: Object.freeze(missing),
        evidence: Object.freeze([
            `spine:${spine.rootModule}`,
            ...(entry?.module === undefined ? [] : [`module:${entry.module}`]),
            `proof-status:${proofStatus}`,
        ]),
        mediaType: "application/vnd.metroplat.lean.formalization-report+json",
    }, "Lean formalization report");
}
export function leanCapabilitySurface(input) {
    return leanCapabilitySurfaceContract.assert({
        kind: "metroplat.lean.capability-surface",
        actions: [...new Set(input.actions ?? [])].sort(),
        schemas: [...new Set(input.schemas ?? [])].sort(),
        exports: [...new Set(input.exports ?? [])].sort(),
        mediaType: "application/vnd.metroplat.lean.capability-surface+json",
    }, "Lean capability surface");
}
export function leanCapabilitySurfaceFromOperations(actions, extra = {}) {
    const operationNames = actions.map((item) => item.verb);
    const schemaIds = actions.flatMap((item) => [
        ...(item.domain?.id === undefined ? [] : [item.domain.id]),
        ...(item.codomain?.id === undefined ? [] : [item.codomain.id]),
    ]);
    return leanCapabilitySurface({
        actions: operationNames,
        schemas: [...schemaIds, ...(extra.schemas ?? [])],
        ...(extra.exports === undefined ? {} : { exports: extra.exports }),
    });
}
export function leanCapabilitySurfaceFromPackageSurface(input) {
    const packageExports = [
        ...(input.packageSurface?.exports?.entries.map((entry) => entry.specifier) ?? []),
        ...(input.packageSurface?.commitments
            ?.filter((commitment) => commitment.face === "export")
            .map((commitment) => commitment.name) ?? []),
    ];
    return leanCapabilitySurface({
        ...(input.actions === undefined ? {} : { actions: input.actions.map((action) => action.verb) }),
        ...(input.schemas === undefined ? {} : { schemas: input.schemas.map((schema) => schema.id) }),
        exports: [...packageExports, ...(input.exports ?? [])],
    });
}
export function leanCapabilityClaim(input) {
    return leanCapabilityClaimContract.assert({
        kind: "metroplat.lean.capability-claim",
        theorem: input.theorem,
        ...(input.source === undefined ? {} : { source: input.source }),
        governs: Object.freeze([...input.governs].map((reference) => Object.freeze({ kind: reference.kind, id: reference.id }))),
        mediaType: "application/vnd.metroplat.lean.capability-claim+json",
    }, "Lean capability claim");
}
export function leanCapabilityClaimsFromText(text, source = "source", options = {}) {
    const knownTheorems = knownLeanTextNames(options);
    const claims = [];
    text.split(/\r?\n/u).forEach((line, index) => {
        const lower = line.toLowerCase();
        if (!lower.includes("governs") && !lower.includes("authority"))
            return;
        const theoremNames = knownTheorems.filter((name) => lineMentionsLeanName(line, name));
        if (theoremNames.length === 0)
            return;
        const governs = [...line.matchAll(/\b(action|schema|export):([^\s,;]+)/gu)]
            .map((match) => Object.freeze({
            kind: match[1],
            id: (match[2] ?? "").replace(/[.)\]}]+$/u, ""),
        }))
            .filter((reference) => reference.id.length > 0);
        if (governs.length === 0)
            return;
        for (const theorem of [...new Set(theoremNames)]) {
            claims.push(leanCapabilityClaim({
                theorem,
                source: `${source}:${index + 1}`,
                governs,
            }));
        }
    });
    return leanCapabilityClaimIndexContract.assert({
        kind: "metroplat.lean.capability-claim-index",
        source,
        claims: Object.freeze(claims),
        mediaType: "application/vnd.metroplat.lean.capability-claim-index+json",
    }, "Lean capability claim index");
}
export function mergeLeanCapabilityClaimIndexes(indexes, source = "merged") {
    return leanCapabilityClaimIndexContract.assert({
        kind: "metroplat.lean.capability-claim-index",
        source,
        claims: Object.freeze(indexes.flatMap((index) => [...index.claims])),
        mediaType: "application/vnd.metroplat.lean.capability-claim-index+json",
    }, "Lean capability claim index");
}
export function leanCapabilityAuthorityReport(claims, surface, input) {
    const spine = isLeanTheoremSpine(input) ? input : leanTheoremSpine(input);
    const byTheorem = new Map(spine.entries.map((entry) => [entry.name, entry]));
    const operationIds = new Set(surface.actions);
    const schemaIds = new Set(surface.schemas);
    const exportIds = new Set(surface.exports);
    const reportClaims = claims.map((claim) => {
        const theorem = byTheorem.get(claim.theorem);
        const proofStatus = theorem?.proofStatus ?? "unknown";
        const missingCapabilities = [...new Set(claim.governs.flatMap((reference) => capabilityReferencePresent(reference, operationIds, schemaIds, exportIds) ? [] : [`${reference.kind}:${reference.id}`]))].sort();
        return Object.freeze({
            theorem: claim.theorem,
            ...(claim.source === undefined ? {} : { source: claim.source }),
            theoremPresent: theorem !== undefined,
            theoremProved: proofStatus === "proved",
            proofStatus,
            governs: Object.freeze([...claim.governs]),
            missingCapabilities,
        });
    });
    const missingTheorems = [...new Set(reportClaims.filter((claim) => !claim.theoremPresent).map((claim) => claim.theorem))].sort();
    const unprovedTheorems = [...new Set(reportClaims
            .filter((claim) => claim.theoremPresent && !claim.theoremProved)
            .map((claim) => claim.theorem))].sort();
    const missingCapabilities = [...new Set(reportClaims.flatMap((claim) => claim.missingCapabilities))].sort();
    return leanCapabilityAuthorityReportContract.assert({
        kind: "metroplat.lean.capability-authority-report",
        accepted: missingTheorems.length === 0 && unprovedTheorems.length === 0 && missingCapabilities.length === 0,
        claims: Object.freeze(reportClaims),
        missingTheorems,
        unprovedTheorems,
        missingCapabilities,
        evidence: Object.freeze([
            `spine:${spine.rootModule}`,
            `claims:${claims.length}`,
            `actions:${surface.actions.length}`,
            `schemas:${surface.schemas.length}`,
            `exports:${surface.exports.length}`,
        ]),
        mediaType: "application/vnd.metroplat.lean.capability-authority-report+json",
    }, "Lean capability authority report");
}
export function leanTheoremReferencesFromText(text, source = "source", options = {}) {
    const knownTheorems = knownLeanTextNames(options);
    const references = [];
    text.split(/\r?\n/u).forEach((line, index) => {
        const seen = new Set();
        for (const theorem of knownTheorems) {
            if (!lineMentionsLeanName(line, theorem))
                continue;
            if (seen.has(theorem))
                continue;
            seen.add(theorem);
            references.push(Object.freeze({
                theorem,
                source,
                line: index + 1,
                context: line.trim().slice(0, 240),
            }));
        }
    });
    return leanTheoremReferenceIndexContract.assert({
        kind: "metroplat.lean.theorem-reference-index",
        source,
        references: Object.freeze(references),
        mediaType: "application/vnd.metroplat.lean.theorem-reference-index+json",
    }, "Lean theorem reference index");
}
export function mergeLeanTheoremReferenceIndexes(indexes, source = "merged") {
    return leanTheoremReferenceIndexContract.assert({
        kind: "metroplat.lean.theorem-reference-index",
        source,
        references: Object.freeze(indexes.flatMap((index) => [...index.references])),
        mediaType: "application/vnd.metroplat.lean.theorem-reference-index+json",
    }, "Lean theorem reference index");
}
export function leanTheoremReferenceCoverage(index, input) {
    const spine = isLeanTheoremSpine(input) ? input : leanTheoremSpine(input);
    const byName = new Map(spine.entries.map((entry) => [entry.name, entry]));
    const referenced = [...new Set(index.references.map((entry) => entry.theorem))].sort((left, right) => left.localeCompare(right));
    const missing = referenced.filter((name) => !byName.has(name));
    const unproved = referenced.filter((name) => {
        const entry = byName.get(name);
        return entry !== undefined && entry.proofStatus !== "proved";
    });
    return leanTheoremReferenceCoverageContract.assert({
        kind: "metroplat.lean.theorem-reference-coverage",
        referenced: referenced.length,
        present: referenced.length - missing.length,
        proved: referenced.length - missing.length - unproved.length,
        missing: Object.freeze(missing),
        unproved: Object.freeze(unproved),
        evidence: Object.freeze([
            `reference-index:${index.source}`,
            `spine:${spine.rootModule}`,
            `references:${index.references.length}`,
        ]),
        mediaType: "application/vnd.metroplat.lean.theorem-reference-coverage+json",
    }, "Lean theorem reference coverage");
}
export function isLeanEnvironment(input) {
    return !Array.isArray(input) && "modules" in input;
}
export function isLeanImportGraph(input) {
    return !Array.isArray(input) && "nodes" in input && "edges" in input;
}
export function isLeanTheoremSpine(input) {
    return !Array.isArray(input) && "entries" in input && "admitted" in input;
}
function capabilityReferencePresent(reference, actions, schemas, exports) {
    if (reference.kind === "action")
        return actions.has(reference.id);
    if (reference.kind === "schema")
        return schemas.has(reference.id);
    return exports.has(reference.id);
}
function knownLeanTextNames(options) {
    return [...new Set([
            ...(options.knownTheorems ?? []),
            ...(options.knownDeclarations ?? []),
        ])].sort();
}
function lineMentionsLeanName(line, name) {
    if (name === "")
        return false;
    let index = line.indexOf(name);
    while (index !== -1) {
        const before = index === 0 ? "" : line[index - 1] ?? "";
        const beforeBefore = index <= 1 ? "" : line[index - 2] ?? "";
        const after = line[index + name.length] ?? "";
        const afterAfter = line[index + name.length + 1] ?? "";
        const continuesFromNamespace = before === "." && isLeanNameCharacter(beforeBefore);
        const continuesIntoNamespace = after === "." && /^[A-Za-z_]$/u.test(afterAfter);
        if (!isLeanNameCharacter(before) && !isLeanNameCharacter(after) && !continuesFromNamespace && !continuesIntoNamespace) {
            return true;
        }
        index = line.indexOf(name, index + name.length);
    }
    return false;
}
function isLeanNameCharacter(value) {
    return /^[A-Za-z0-9_']$/u.test(value);
}
function recordValue(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value)
        ? value
        : undefined;
}
function asRecord(value, label) {
    const record = recordValue(value);
    if (record === undefined)
        throw new TypeError(`${label}: expected object`);
    return record;
}
function stringField(record, key) {
    const value = record[key];
    if (typeof value !== "string" || value === "")
        throw new TypeError(`Lean formalization ${key}: expected non-empty string`);
    return value;
}
function optionalStringField(record, key) {
    const value = record[key];
    return typeof value === "string" && value !== "" ? value : undefined;
}
/** The import graph's first Betti number (`h1`, its independent-cycle count) is the `E - V + C`
 *  union-find invariant, read by the sparse-graph-native `graphFirstBettiNumberOfEdgeList` — an
 *  import graph is large but sparse (`E = O(V)`), so this stays off the exact-integer dense-matrix
 *  path (`hodgeDecompositionOfWeights` + `weightsOfEdges`), whose `O(V³)` exact-integer rank/Smith
 *  reduction is fine for the small predication-cell relation graphs it was built for but is
 *  infeasible at Lean-module-import scale (hundreds of nodes OOM there). */
function graphCycleRank(nodes, edges) {
    const indexOf = new Map(nodes.map((node, index) => [node, index]));
    const pairs = [];
    for (const edge of edges) {
        const from = indexOf.get(edge.from);
        const to = indexOf.get(edge.to);
        if (from !== undefined && to !== undefined)
            pairs.push(Object.freeze([from, to]));
    }
    return graphFirstBettiNumberOfEdgeList(nodes.length, pairs);
}

/** Lean modules as the computing faculty's module graph: imports as static edges, declarations as exports (theorems and lemmas type-only). */
export function reflectLeanModuleGraph(modules, roots = []) {
  return moduleGraphCarrier.assert({
    kind: "computing.module-graph",
    modules: Object.freeze(modules.map((module) => Object.freeze({
      id: module.id,
      mediaType: "text/vnd.lean4",
      imports: Object.freeze(module.imports.map((specifier) => Object.freeze({
        specifier,
        phase: "static",
        optional: false,
      }))),
      exports: Object.freeze(module.declarations.map((decl) => Object.freeze({
        name: decl.name,
        typeOnly: decl.kind === "theorem" || decl.kind === "lemma",
      }))),
    }))),
    edges: Object.freeze(modules.flatMap((module) => module.imports.map((specifier) => Object.freeze({
      from: module.id,
      to: specifier,
      kind: "import",
      specifier,
    })))),
    roots: Object.freeze([...roots]),
  }, "Lean module graph");
}
