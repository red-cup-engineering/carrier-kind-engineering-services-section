/**
 * presentation/workspace - standard diagram and RDF faces of a workspace dependency graph.
 *
 * A generated face over `WorkspaceDependencyGraph` (`projections/workspace-graph`),
 * not an app: JSON-LD reuses `codecs/text/json/schema-org`'s generic `@graph`
 * wrapper and the `SoftwareSourceCode` schema.org type; Turtle reuses
 * `codecs/text/turtle`'s IRI/literal writers. Neither ports the quarry's
 * bespoke `codecs/rdf.mts` (packageTurtle/workspaceJsonLd/vocabulary/typeFlow)
 * — the same capability falls out of wiring this package's own graph records into
 * its own existing RDF primitives.
 */
import {
  entityGraphJsonLd,
  SCHEMA_ORG_CONTEXT,

} from "@red-cup-engineering/computer-triplet-serialized-content-engineering-services-section/schema-org";
import { iriRef, turtleLiteral } from "@red-cup-engineering/turtle-services-section/turtle";

import { presentedCategoryDiagram } from "@red-cup-engineering/signgraph/diagram";

/** Render the graph through the shared presented-category diagram carrier. */
export function workspaceDependencyGraphDiagram(graph) {
  const tierOf = new Map();
  if (graph.buildOrder.kind === "metroplat.workspace-graph.build-order") {
    graph.buildOrder.tiers.forEach((tier, index) => tier.forEach((name) => tierOf.set(name, index)));
  }
  return presentedCategoryDiagram({
    title: `workspace dependency graph: ${graph.root}`,
    description: `${graph.nodes.length} packages, ${graph.edges.length} internal dependency edges.`,
    diagramKind: "class",
    objects: graph.nodes.map((node) => ({
      id: node.name,
      kind: node.private ? "package-private" : "package",
      label: node.name,
      detail: tierOf.has(node.name) ? `build tier ${tierOf.get(node.name)}` : node.root,
    })),
    morphisms: graph.edges.map((edge) => ({
      from: edge.from,
      to: edge.to,
      kind: edge.resolved === true ? "resolved-dependency" : "dependency",
      label: "depends on",
    })),
  });
}

/** The URN this face addresses a workspace package by. Stable and reversible
 *  (`packageIri(name).slice("urn:pnpm:package:".length) === name`). */
export function packageIri(name) {
  return `urn:pnpm:package:${encodeURIComponent(name)}`;
}

/** Project a workspace dependency graph to a schema.org JSON-LD `@graph`
 *  document: each node is a `SoftwareSourceCode`, each internal dependency
 *  edge a `softwareRequirements` reference to the dependency's node. */
export function workspaceDependencyGraphJsonLd(graph) {
  const nodes = graph.nodes.map((node) => Object.freeze({
    "@id": packageIri(node.name),
    "@type": "SoftwareSourceCode",
    name: node.name,
    identifier: node.root,
    ...(node.dependencies.length === 0 ? {} : {
      softwareRequirements: Object.freeze(node.dependencies.map((dependency) => Object.freeze({ "@id": packageIri(dependency) }))),
    }),
  }));
  return entityGraphJsonLd(nodes);
}

/** Project a workspace dependency graph to Turtle triples over the same
 *  `SoftwareSourceCode`/`softwareRequirements` vocabulary as the JSON-LD face. */
export function workspaceDependencyGraphTurtle(graph) {
  const lines = [
    `@prefix schema: ${iriRef(`${SCHEMA_ORG_CONTEXT}/`)} .`,
    "",
  ];
  for (const node of graph.nodes) {
    const subject = iriRef(packageIri(node.name));
    lines.push(`${subject} a schema:SoftwareSourceCode ;`);
    lines.push(`  schema:name ${turtleLiteral(node.name)} ;`);
    lines.push(`  schema:identifier ${turtleLiteral(node.root)} .`);
  }
  lines.push("");
  for (const edge of graph.edges) {
    lines.push(`${iriRef(packageIri(edge.from))} schema:softwareRequirements ${iriRef(packageIri(edge.to))} .`);
  }
  return `${lines.join("\n")}\n`;
}
