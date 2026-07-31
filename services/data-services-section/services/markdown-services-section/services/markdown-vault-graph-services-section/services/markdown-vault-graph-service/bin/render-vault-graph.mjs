#!/usr/bin/env node
import { deriveMarkdownVaultGraph, renderMarkdownVaultGraphDot } from "../src/vault-graph.mjs";

function option(name, { required = true } = {}) {
  const index = process.argv.indexOf(name);
  if (index < 0 || !process.argv[index + 1]) {
    if (!required) return undefined;
    throw new Error(`${name} is required`);
  }
  return process.argv[index + 1];
}

const vault = option("--vault");
const graph = await deriveMarkdownVaultGraph({ vault });
const format = option("--format", { required: false }) ?? "summary";
if (format === "json") {
  process.stdout.write(`${JSON.stringify(graph, null, 2)}\n`);
} else if (format === "dot") {
  process.stdout.write(renderMarkdownVaultGraphDot(graph, { tier: option("--tier", { required: false }) ?? "link" }));
} else if (format === "edges") {
  const tier = option("--tier", { required: false }) ?? "link";
  for (const edge of graph.tiers[tier]?.edges ?? []) {
    process.stdout.write(`${edge.from}\t${edge.relation}\t${edge.to}\n`);
  }
} else if (format === "summary") {
  const defectsByKind = {};
  for (const defect of graph.defects) defectsByKind[defect.kind] = (defectsByKind[defect.kind] ?? 0) + 1;
  process.stdout.write(`${JSON.stringify({
    type: graph.type,
    vault: graph.vault,
    vaultManifestSha256: graph.vaultManifestSha256,
    nodes: graph.nodes.length,
    linkEdges: graph.tiers.link.edges.length,
    frontmatterEdges: graph.tiers.frontmatter.edges.length,
    externalEdges: graph.tiers.external.edges.length,
    defects: graph.defects.length,
    defectsByKind,
  }, null, 2)}\n`);
} else {
  throw new Error(`unknown --format: ${format}`);
}
if (graph.defects.length > 0) {
  for (const defect of graph.defects) {
    if (defect.kind === "slug-collision") {
      process.stderr.write(`markdown vault graph defect: slug-collision ${defect.slug} -> ${defect.paths.join(", ")}\n`);
    } else {
      process.stderr.write(`markdown vault graph defect: ${defect.kind} ${defect.from} -> ${defect.to} (${defect.relation})\n`);
    }
  }
  process.exitCode = 1;
}
