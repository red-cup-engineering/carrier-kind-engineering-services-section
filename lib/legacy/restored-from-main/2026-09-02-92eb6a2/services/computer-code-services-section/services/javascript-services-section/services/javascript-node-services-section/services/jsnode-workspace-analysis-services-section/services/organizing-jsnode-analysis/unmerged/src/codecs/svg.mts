/**
 * svg — the workspace dependency DAG as a self-describing, clickable SVG.
 *
 * A thin caller of the shared categorical-diagram renderer
 * (`./diagramming.mjs`): it maps each `DependencyGraphNode` onto a
 * `DiagramNode` coloured by its stratum and each dependency edge onto a
 * `DiagramEdge`, then hands the graph to `graphDiagramSvg`, which lays it out and
 * projects it through relating's relational SVG codec. This package contributes
 * only the *vocabulary* (the per-stratum palette); the geometry and the markup
 * live upstream, once.
 */
import type {
  DependencyGraphNode,
  WorkspaceDependencyGraph,
} from "../organizing/workspaces/graph.mjs";
import {
  graphDiagramSvg,
  type DiagramEdge,
  type DiagramNode,
  type DiagramPaletteEntry,
} from "./diagramming.mjs";
import type { JSNodeLayer } from "../organizing/packages/carrier.mjs";

/** Rendering projection controls for a dependency graph derived from
 *  `JSNodeWorkspace` utterances. These parameters affect only SVG layout and
 *  links; they are not graph facts admitted to the carrier. */
export interface SvgRenderOptions {
  /** Node box width/height in px. */
  readonly nodeWidth?: number;
  readonly nodeHeight?: number;
  /** Horizontal gap between nodes in a layer; vertical gap between layers. */
  readonly hGap?: number;
  readonly vGap?: number;
  /** Document margin in px. */
  readonly margin?: number;
  /** Number of barycenter ordering sweeps. More = fewer crossings, slower. */
  readonly sweeps?: number;
  /** Maps a node to its click target. Returns undefined to leave it unlinked. */
  readonly href?: (node: DependencyGraphNode) => string | undefined;
  /** Document title (the SVG's <title>). */
  readonly title?: string;
  /** Name of a package to render as the focus: a brighter outline marks it. */
  readonly focus?: string;
}

// Per-stratum fill/stroke. The four repo strata get four hues; an unknown layer
// falls back to the lib palette. Each stratum is a rounded box.
const STRATUM_PALETTE: Readonly<Record<JSNodeLayer, DiagramPaletteEntry>> = {
  lib: { fill: "#1b3a4b", stroke: "#3f7d9c" },
  apps: { fill: "#4b1b3a", stroke: "#9c3f7d" },
  services: { fill: "#3a4b1b", stroke: "#7d9c3f" },
  sites: { fill: "#4b3a1b", stroke: "#9c7d3f" },
  ops: { fill: "#3a3a3a", stroke: "#7d7d7d" },
};

/** Render the dependency graph to a clickable, self-describing SVG string. */
export function dependencyGraphSvg(
  graph: WorkspaceDependencyGraph,
  opts: SvgRenderOptions = {},
): string {
  const nodes: DiagramNode[] = graph.nodes.map((node) => ({
    id: node.name,
    label: node.name,
    group: node.layer,
    title: node.description ? `${node.name} — ${node.description}` : node.name,
    data: { layer: node.layer, deps: node.dependencies.length },
    ...(opts.focus !== undefined && node.name === opts.focus ? { focus: true } : {}),
    ...(hrefOf(opts.href, node)),
  }));
  const edges: DiagramEdge[] = graph.edges.map((edge) => ({ from: edge.from, to: edge.to, kind: "dependency" }));

  return graphDiagramSvg(
    { nodes, edges },
    {
      title: opts.title ?? "workspace dependency DAG",
      palette: STRATUM_PALETTE,
      defaultColor: STRATUM_PALETTE.lib,
      ...geometry(opts),
    },
  );
}

function hrefOf(
  href: SvgRenderOptions["href"],
  node: DependencyGraphNode,
): { href: string } | Record<string, never> {
  const target = href?.(node);
  return target === undefined ? {} : { href: target };
}

function geometry(opts: SvgRenderOptions): Record<string, number> {
  const out: Record<string, number> = {};
  if (opts.nodeWidth !== undefined) out["nodeWidth"] = opts.nodeWidth;
  if (opts.nodeHeight !== undefined) out["nodeHeight"] = opts.nodeHeight;
  if (opts.hGap !== undefined) out["hGap"] = opts.hGap;
  if (opts.vGap !== undefined) out["vGap"] = opts.vGap;
  if (opts.margin !== undefined) out["margin"] = opts.margin;
  if (opts.sweeps !== undefined) out["sweeps"] = opts.sweeps;
  return out;
}
