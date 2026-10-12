/**
 * @packageDocumentation
 *
 * sites - package ingress and boundary sites.
 */
import {
  projectRootDescriptorContract,
  rootRouteProjectorDescriptorContract,
  rootRouteProjectorRegistryContract,
  type ProjectRootDescriptor,
  type RootRouteProjectorDescriptor,
  type RootRouteProjectorRegistry,
} from "../integrations/federation/boundary-utterance-site/schema.mts";
import {
  leanProjectTheoremMapContract,
  type LeanProjectTheoremMap,
} from "@red-cup-engineering/lean-system-services-section";
import { alexandrovSiteForm } from "@lenticule-science/metrologic/models/topology/alexandrov-site";
import { dframeSiteForm } from "@lenticule-science/metrologic/models/order/d-frame-site";
import { enrichedSiteForm } from "@lenticule-science/metrologic/models/topology/quantale-enriched-site";
import { HOLE_FEED, holeRouteOwner, holeSiteForm } from "./hole/route.mts";
import { settlingSiteForm } from "@lenticule-science/metrologic/models/topology/settling-site";

export * from "@lenticule-science/metrologic/models/topology/alexandrov-site";
export * from "@lenticule-science/metrologic/models/order/d-frame-site";
export * from "@lenticule-science/metrologic/models/topology/quantale-enriched-site";
export * from "./hole/route.mts";
export * from "@lenticule-science/metrologic/models/topology/settling-site";
export * as alexandrov from "@lenticule-science/metrologic/models/topology/alexandrov-site";
export * as dframe from "@lenticule-science/metrologic/models/order/d-frame-site";
export * as enriched from "@lenticule-science/metrologic/models/topology/quantale-enriched-site";
export * as hole from "./hole/route.mts";
export * as siteSettling from "@lenticule-science/metrologic/models/topology/settling-site";
export * from "./article/index.mts";
export * from "./page/index.mts";
export * from "./static-website/content.mts";
export * from "./static-website/generator/index.mts";
export * from "./static-website/generator/digital-garden.mts";
export * from "./static-website/generator/professional-blog.mts";
export * from "./static-website/generator/semantic-website.mts";
export * from "./static-website/generator/taxonomy.mts";
export * from "./static-website/service.mts";
export * as staticWebsite from "./static-website/generator/index.mts";

export function holeRouteProjectorDescriptor(): RootRouteProjectorDescriptor {
  const owner = holeRouteOwner();
  return rootRouteProjectorDescriptorContract.assert(Object.freeze({
    kind: "metroplat.settlements.route-projector" as const,
    id: "metroplat.settlements.hole.root-route-projector",
    settlement: owner.id,
    projector: "src/sites/hole/route:holeRootRoute",
    routes: Object.freeze([
      Object.freeze({
        route: "settlement" as const,
        method: "GET" as const,
        path: owner.path,
        address: "metroplat/settlements/hole/surface",
      }),
      Object.freeze({
        route: "root-observation" as const,
        method: "POST" as const,
        path: owner.path,
        address: "metroplat/settlements/hole/observation",
        statementLog: `metroplat/witness/eavt-log:${HOLE_FEED}`,
      }),
    ]),
    evidence: Object.freeze(["src/sites/hole/route:holeRootRoute", "src/presentation/serving:rootRouteProjectionContract"]),
  }), "hole route projector descriptor") as RootRouteProjectorDescriptor;
}

export function rootRouteProjectorRegistry(packageName = "@red-cup-engineering/metroplat"): RootRouteProjectorRegistry {
  const projectors = Object.freeze([holeRouteProjectorDescriptor()]);
  return rootRouteProjectorRegistryContract.assert(Object.freeze({
    kind: "metroplat.settlements.route-projector-registry" as const,
    package: packageName,
    projectors,
    evidence: Object.freeze(projectors.map((projector) => projector.id)),
  }), "settlement route projector registry") as RootRouteProjectorRegistry;
}

function siteTheoremLinks(): LeanProjectTheoremMap["links"] {
  const forms = Object.freeze([
    settlingSiteForm(),
    alexandrovSiteForm(),
    dframeSiteForm(),
    enrichedSiteForm(),
    holeSiteForm(),
  ]);
  return Object.freeze(forms.map((form) => Object.freeze({
    surface: form.id,
    theorem: form.theoremReference ?? "unlinked",
    proofStatus: form.proofStatus,
    frontier: Object.freeze([...form.frontier]),
    evidence: Object.freeze([`sites/${form.id.split("/").at(-1)}/index.mts`, `core/site:siteForm:${form.id}`]),
  })));
}

/** Project-root theorem map from Node-carried site forms to upstream Obsmetrologia theorem names. */
export function projectRootLeanTheoremMap(packageName = "@red-cup-engineering/metroplat"): LeanProjectTheoremMap {
  const links = siteTheoremLinks();
  return leanProjectTheoremMapContract.assert(Object.freeze({
    kind: "metroplat.lean.project-theorem-map" as const,
    package: packageName,
    rootModule: "Obsmetrologia",
    links,
    openFrontier: Object.freeze(links.flatMap((link) => [...link.frontier])),
    evidence: Object.freeze([
      "sites/index.mts:projectRootLeanTheoremMap",
      "@red-cup-engineering/lean-system-services-section:leanProjectTheoremMapContract",
      "src/core/math/topology/settling-site.mts",
      "src/core/math/topology/alexandrov-site.mts",
      "src/core/math/order/d-frame-site.mts",
      "src/core/math/topology/quantale-enriched-site.mts",
      "src/sites/hole/route.mts",
    ]),
    mediaType: "application/vnd.metroplat.lean.project-theorem-map+json",
  }), "project-root Lean theorem map") as LeanProjectTheoremMap;
}

/** The package root read as one phase-bearing settlement over the existing Node compartments. */
export function metroplatProjectRootDescriptor(packageName = "@red-cup-engineering/metroplat"): ProjectRootDescriptor {
  return projectRootDescriptorContract.assert(Object.freeze({
    kind: "metroplat.settlements.project-root" as const,
    id: "metroplat/settlements/metroplat.emsenn.net/project-root",
    package: packageName,
    root: "sites/metroplat.emsenn.net",
    phase: "metroplat.phase.project-root.audit-2026-07-01",
    compartments: Object.freeze([
      Object.freeze({
        name: "lib" as const,
        root: "core/",
        role: "material-law" as const,
        owns: Object.freeze(["articulation", "calculus", "closure", "persistence", "site law"]),
        exposes: Object.freeze([]),
        evidence: Object.freeze(["core/site/index.mts", "core/closure/index.mts"]),
      }),
      Object.freeze({
        name: "src" as const,
        root: "src/",
        role: "package-realization" as const,
        owns: Object.freeze(["runtime schemas", "codecs", "pure projections", "running action/router vocabulary", "contract-verification lenses/evidence (runtime-coherence machinery, not derived math)"]),
        exposes: Object.freeze(["@red-cup-engineering/metroplat", "@red-cup-engineering/metroplat/core", "@red-cup-engineering/metroplat/sites"]),
        evidence: Object.freeze(["src/schema/index.mts", "src/core/codecs/projector/index.mts", "src/apps/infograph/builtins.mts", "src/core/index.mts"]),
      }),
      Object.freeze({
        name: "sites" as const,
        root: "sites/",
        role: "settlement-body" as const,
        owns: Object.freeze(["hole settlement", "bounded site forms", "settlement route-projector registry", "project-root settlement descriptor"]),
        exposes: Object.freeze(["@red-cup-engineering/metroplat/sites", "metroplat/settlements/project-root", "metroplat/settlements/route-projector-registry"]),
        evidence: Object.freeze(["sites/index.mts", "src/sites/hole/route.mts"]),
      }),
      Object.freeze({
        name: "scripts" as const,
        root: "scripts/",
        role: "procedure" as const,
        owns: Object.freeze(["dist asset copy procedure"]),
        exposes: Object.freeze(["dist/"]),
        evidence: Object.freeze(["scripts/copy-dist-assets.mjs"]),
      }),
      Object.freeze({
        name: "data" as const,
        root: "data/",
        role: "artifact-store" as const,
        owns: Object.freeze(["data/journals", "data/state", "data/record", "data/content"]),
        exposes: Object.freeze(["metroplat/stores/data-artifact-address", "metroplat/stores/data-artifact-descriptor"]),
        evidence: Object.freeze(["src/integrations/filesystem/src/index.mts", "services/filesystem-store/index.mts"]),
      }),
      Object.freeze({
        name: "publication" as const,
        root: "package.json",
        role: "publication-status" as const,
        owns: Object.freeze(["package exports", "bin entrypoints", "build scripts", "installable package projection shape", "release artifact proof", "release policy"]),
        exposes: Object.freeze(["package.json:exports", "package.json:bin", "package.json:files", "@red-cup-engineering/metroplat/publication-status", "metroplat/publication-status/release-policy"]),
        evidence: Object.freeze(["package.json", "src/workspace/exports/index.mts", "src/workspace/package-surface.mts", "src/workspace/publication-status.mts", "src/integrations/filesystem/services/workspace-scanner/service.mts"]),
      }),
    ]),
    registries: Object.freeze([
      Object.freeze({
        kind: "settlement-route-projector-registry" as const,
        id: "sites/index:rootRouteProjectorRegistry",
        address: "metroplat/settlements/route-projector-registry",
      }),
      Object.freeze({
        kind: "lean-project-theorem-map" as const,
        id: "sites/index:projectRootLeanTheoremMap",
        address: "metroplat/lean/project-theorem-map",
      }),
      Object.freeze({
        kind: "app-optic-registry" as const,
        id: "apps/index:appOpticRegistry",
        address: "metroplat/apps/optic-registry",
      }),
    ]),
    frontier: Object.freeze([
      "lifecycle records, feed, data/journals sink, and process/HTTP/MCP/WebSocket/Lean/TeX command wiring exist",
      "Lean project theorem map carries upstream Obsmetrologia theorem links and open frontier obligations without claiming Node-side proof",
      "publication-status proof checks export import/type targets, executable bin targets, package-files coverage, and native Node runtime target form through the workspace-scanner filesystem boundary",
    ]),
    evidence: Object.freeze([
      "sites/index.mts",
      "scripts/copy-dist-assets.mjs",
      "package.json",
    ]),
  }), "metroplat project-root settlement") as ProjectRootDescriptor;
}
