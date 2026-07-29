/**
 * symbol-svg — one package's symbol graph as a self-describing, shaped SVG.
 *
 * A thin caller of the shared categorical-diagram renderer
 * (`./diagramming.mjs`). It contributes the vocabulary that makes
 * the picture legible before any text is read — *shape denotes kind* — by mapping
 * each symbol kind to a shape morphism and each relation to an edge style:
 *
 *   ▭  class        (sharp rectangle)
 *   ▢  interface    (rounded, dashed — abstract)
 *   ▱  type alias   (parallelogram)
 *   ⬭  function     (stadium / pill — a morphism)
 *
 * Edges:  type → function (param)  ·  function → type (returns)
 *         subtype → base (extends, dashed, hollow triangle — UML generalization)
 *
 * The geometry, the markup, and the shapes themselves live upstream (the layout
 * in the diagramming codec, the shape builders in relating's SVG codec); this
 * file only names which kind is which shape.
 */
import type { PackageSymbolGraph, SymbolNode } from "../organizing/workspaces/analysis/symbol-graph.mjs";
import {
  graphDiagramSvg,
  type DiagramEdge,
  type DiagramNode,
  type DiagramPaletteEntry,
  type EdgeStyle,
} from "./diagramming.mjs";

/** Rendering projection controls for a package symbol graph. The graph is read
 *  from package/API carriers; these options only affect SVG geometry. */
export interface SymbolSvgOptions {
  readonly nodeWidth?: number;
  readonly nodeHeight?: number;
  readonly hGap?: number;
  readonly vGap?: number;
  readonly margin?: number;
  readonly sweeps?: number;
  /** Document <title>. Defaults to "<pkg> — symbol graph". */
  readonly title?: string;
}

// Shape-as-morphism: four kinds, four shapes, four hues — distinct from the
// dependency graph's stratum palette so the two pictures never read alike.
const KIND_PALETTE: Readonly<Record<string, DiagramPaletteEntry>> = {
  class: { shape: "rect", fill: "#16324a", stroke: "#4493c8" },
  interface: { shape: "rounded", fill: "#143a2e", stroke: "#3fae7d", dash: "5 3" },
  "type-alias": { shape: "parallelogram", fill: "#3a2e14", stroke: "#c89a44" },
  function: { shape: "stadium", fill: "#2e163a", stroke: "#a96fd0" },
};

// Edge styles: parameter / return / generalization. `extends` terminates in the
// hollow-triangle marker the SVG codec defines.
const EDGE_STYLES: Readonly<Record<string, EdgeStyle>> = {
  param: { stroke: "#4f7da0" },
  returns: { stroke: "#7d6fa9" },
  extends: { stroke: "#8b949e", dash: "5 3", marker: "svg-extends" },
};

const titleOf = (node: SymbolNode): string =>
  node.kind === "function" ? (node.signature ?? `${node.name}()`) : `${node.name} — ${node.kind}`;

/** Render a package's symbol graph to a self-describing, shaped SVG string. */
export function symbolGraphSvg(graph: PackageSymbolGraph, opts: SymbolSvgOptions = {}): string {
  const nodes: DiagramNode[] = graph.nodes.map((node) => ({
    id: node.id,
    label: node.name,
    group: node.kind,
    title: titleOf(node),
  }));
  const edges: DiagramEdge[] = graph.edges.map((edge) => ({ from: edge.from, to: edge.to, kind: edge.kind }));

  const byKind = graph.nodes.reduce<Record<string, number>>((acc, node) => ((acc[node.kind] = (acc[node.kind] ?? 0) + 1), acc), {});
  const description =
    `${graph.nodes.length} symbols, ${graph.edges.length} relations. ` +
    `By kind: ${Object.entries(byKind).map(([kind, count]) => `${kind} ${count}`).join(", ")}. ` +
    `Shapes: rectangle = class, rounded-dashed = interface, parallelogram = type alias, ` +
    `pill = function. Edges: type→function = parameter, function→type = return, ` +
    `dashed = subtype extends base.`;

  return graphDiagramSvg(
    { nodes, edges },
    {
      title: opts.title ?? `${graph.pkg} — symbol graph`,
      description,
      palette: KIND_PALETTE,
      edgeStyles: EDGE_STYLES,
      edgeColor: "#5a6472",
      nodeWidth: opts.nodeWidth ?? 150,
      nodeHeight: opts.nodeHeight ?? 30,
      hGap: opts.hGap ?? 26,
      vGap: opts.vGap ?? 64,
      ...(opts.margin === undefined ? {} : { margin: opts.margin }),
      ...(opts.sweeps === undefined ? {} : { sweeps: opts.sweeps }),
    },
  );
}
