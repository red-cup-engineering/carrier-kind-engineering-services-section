export type LayoutEdge = Readonly<{ from: string; to: string }>;

export type LayoutGeometry = Readonly<{
  nodeWidth: number;
  nodeHeight: number;
  hGap: number;
  vGap: number;
  margin: number;
  sweeps?: number;
}>;

export type PlacedPoint = Readonly<{
  id: string;
  cx: number;
  cy: number;
  layer: number;
  order: number;
}>;

export type GraphGeometry = Readonly<{
  width: number;
  height: number;
  points: ReadonlyMap<string, PlacedPoint>;
}>;

export const LAYOUT_DEFAULTS: LayoutGeometry = Object.freeze({
  nodeWidth: 160,
  nodeHeight: 64,
  hGap: 48,
  vGap: 92,
  margin: 24,
  sweeps: 2,
});

export type DiagramNode = Readonly<{
  id: string;
  label: string;
  group?: string;
  focus?: boolean;
  href?: string;
  title?: string;
  data?: unknown;
}>;

export type DiagramEdge = Readonly<{
  from: string;
  to: string;
  kind?: string;
  label?: string;
}>;

export type DiagramPaletteEntry = Readonly<{
  fill: string;
  stroke: string;
  shape?: "rect" | "rounded" | "parallelogram" | "stadium";
  dash?: string;
}>;

export type EdgeStyle = Readonly<{
  stroke: string;
  dash?: string;
  marker?: string;
}>;

export type DiagramGraph = Readonly<{
  nodes: readonly DiagramNode[];
  edges: readonly DiagramEdge[];
}>;

export type DiagramRenderOptions = Partial<LayoutGeometry> & Readonly<{
  title?: string;
  description?: string;
  palette?: Readonly<Record<string, DiagramPaletteEntry>>;
  defaultColor?: DiagramPaletteEntry;
  edgeStyles?: Readonly<Record<string, EdgeStyle>>;
  edgeColor?: string;
}>;

export function layoutGraph(
  nodeIds: readonly string[],
  edges: readonly LayoutEdge[],
  opts: Partial<LayoutGeometry> = {},
): GraphGeometry {
  const geometry = { ...LAYOUT_DEFAULTS, ...opts };
  const indegree = new Map<string, number>(nodeIds.map((id) => [id, 0]));
  for (const edge of edges) indegree.set(edge.to, (indegree.get(edge.to) ?? 0) + 1);

  const depth = new Map<string, number>();
  for (const id of nodeIds) depth.set(id, indegree.get(id) === 0 ? 0 : 1);
  for (let pass = 0; pass < nodeIds.length; pass += 1) {
    for (const edge of edges) {
      depth.set(edge.to, Math.max(depth.get(edge.to) ?? 0, (depth.get(edge.from) ?? 0) + 1));
    }
  }

  const layers = new Map<number, string[]>();
  for (const id of nodeIds) {
    const layer = depth.get(id) ?? 0;
    const bucket = layers.get(layer) ?? [];
    bucket.push(id);
    layers.set(layer, bucket);
  }

  const layerEntries = [...layers.entries()].sort((a, b) => a[0] - b[0]);
  let maxLayerWidth = 1;
  for (const [, ids] of layerEntries) maxLayerWidth = Math.max(maxLayerWidth, ids.length);

  const points = new Map<string, PlacedPoint>();
  for (const [layer, ids] of layerEntries) {
    ids.sort((a, b) => nodeIds.indexOf(a) - nodeIds.indexOf(b));
    for (let order = 0; order < ids.length; order += 1) {
      const id = ids[order]!;
      points.set(id, Object.freeze({
        id,
        layer,
        order,
        cx: geometry.margin + geometry.nodeWidth / 2 + order * (geometry.nodeWidth + geometry.hGap),
        cy: geometry.margin + geometry.nodeHeight / 2 + layer * (geometry.nodeHeight + geometry.vGap),
      }));
    }
  }

  return Object.freeze({
    width: geometry.margin * 2 + maxLayerWidth * geometry.nodeWidth + Math.max(0, maxLayerWidth - 1) * geometry.hGap,
    height: geometry.margin * 2 + layerEntries.length * geometry.nodeHeight + Math.max(0, layerEntries.length - 1) * geometry.vGap,
    points,
  });
}

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrap(label: string, max = 18): readonly string[] {
  const words = label.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words.length === 0 ? [label] : words) {
    if (current.length === 0) current = word;
    else if ((current.length + 1 + word.length) <= max) current = `${current} ${word}`;
    else {
      lines.push(current);
      current = word;
    }
  }
  if (current.length > 0) lines.push(current);
  return Object.freeze(lines.slice(0, 3));
}

function nodeShape(
  entry: DiagramPaletteEntry,
  x: number,
  y: number,
  width: number,
  height: number,
  focused: boolean,
): string {
  const stroke = focused ? "#f7d774" : entry.stroke;
  const dash = entry.dash === undefined ? "" : ` stroke-dasharray="${esc(entry.dash)}"`;
  const base = `fill="${esc(entry.fill)}" stroke="${esc(stroke)}" stroke-width="${focused ? 3 : 1.5}"${dash}`;
  if (entry.shape === "parallelogram") {
    const skew = Math.min(18, width / 6);
    return `<polygon points="${x + skew},${y} ${x + width},${y} ${x + width - skew},${y + height} ${x},${y + height}" ${base} />`;
  }
  if (entry.shape === "stadium") {
    return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${height / 2}" ${base} />`;
  }
  const rx = entry.shape === "rect" ? 2 : 6;
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${rx}" ${base} />`;
}

export function graphDiagramSvg(graph: DiagramGraph, options: DiagramRenderOptions = {}): string {
  const geometry = { ...LAYOUT_DEFAULTS, ...options };
  const placed = layoutGraph(graph.nodes.map((node) => node.id), graph.edges, geometry);
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
  const defaultColor = options.defaultColor ?? Object.freeze({ fill: "#263241", stroke: "#86a6c7" });
  const lines: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${placed.width} ${placed.height}" role="img">`,
    `<title>${esc(options.title ?? "Graph diagram")}</title>`,
  ];
  if (options.description !== undefined) lines.push(`<desc>${esc(options.description)}</desc>`);
  lines.push(`<defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="${esc(options.edgeColor ?? "#9aa7b2")}" /></marker></defs>`);
  lines.push(`<rect width="100%" height="100%" fill="#111820" />`);
  for (const edge of graph.edges) {
    const from = placed.points.get(edge.from);
    const to = placed.points.get(edge.to);
    if (from === undefined || to === undefined) continue;
    const style = options.edgeStyles?.[edge.kind ?? ""];
    const stroke = style?.stroke ?? options.edgeColor ?? "#9aa7b2";
    const dash = style?.dash === undefined ? "" : ` stroke-dasharray="${esc(style.dash)}"`;
    const x1 = from.cx;
    const y1 = from.cy + geometry.nodeHeight / 2;
    const x2 = to.cx;
    const y2 = to.cy - geometry.nodeHeight / 2;
    lines.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${esc(stroke)}" stroke-width="1.5"${dash} marker-end="url(#arrow)" />`);
  }
  for (const [id, point] of placed.points) {
    const node = nodeById.get(id);
    if (node === undefined) continue;
    const x = point.cx - geometry.nodeWidth / 2;
    const y = point.cy - geometry.nodeHeight / 2;
    const color = node.group === undefined ? defaultColor : (options.palette?.[node.group] ?? defaultColor);
    const text = wrap(node.label).map((line, index) =>
      `<text x="${point.cx}" y="${y + 28 + index * 16}" text-anchor="middle" fill="#f5f7fb" font-size="13">${esc(line)}</text>`
    ).join("\n");
    const body = `<g><title>${esc(node.title ?? node.label)}</title>${nodeShape(color, x, y, geometry.nodeWidth, geometry.nodeHeight, node.focus === true)}\n${text}</g>`;
    lines.push(node.href === undefined ? body : `<a href="${esc(node.href)}">${body}</a>`);
  }
  lines.push("</svg>");
  return lines.join("\n");
}
