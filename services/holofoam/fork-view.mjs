const NS = "http://www.w3.org/2000/svg";
const color = (lineage) => `hsl(${Number(lineage) * 47 % 360} 68% 58%)`;
const element = (name, attributes = {}) => {
  const node = document.createElementNS(NS, name);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
  return node;
};

function panel(label, checkpoint, selectedId) {
  const world = checkpoint?.reading;
  const svg = element("svg", { viewBox: "0 0 220 150", role: "img", "aria-label": `${label} at tick ${world?.tick ?? "unknown"}` });
  svg.append(element("rect", { width: 220, height: 150, fill: "#101820", rx: 5 }));
  const title = element("text", { x: 8, y: 16, fill: "#eef5f7", "font-size": 11 });
  title.textContent = `${label} · tick ${Number.isFinite(world?.tick) ? world.tick : "?"}`;
  svg.append(title);
  if (!world || !Number.isFinite(world.width) || !Number.isFinite(world.height)) return svg;
  for (const organism of Array.isArray(world.organisms) ? world.organisms : []) {
    if (!Number.isFinite(organism.x) || !Number.isFinite(organism.y)) continue;
    const x = 8 + organism.x / world.width * 204;
    const y = 28 + organism.y / world.height * 114;
    svg.append(element("circle", { cx: x, cy: y, r: 3, fill: color(organism.lineage) }));
    if (organism.id === selectedId) svg.append(element("circle", { cx: x, cy: y, r: 6, fill: "none", stroke: "#fff", "stroke-width": 1.5 }));
  }
  return svg;
}

export function renderForkComparison(container, result, selectedId) {
  if (!container?.replaceChildren) throw new TypeError("fork comparison requires a DOM container");
  const baseline = result?.baseline?.checkpoint;
  const variation = result?.variation?.checkpoint;
  const wrapper = document.createElement("div");
  wrapper.className = "fork-comparison";
  wrapper.append(panel("Baseline", baseline, selectedId), panel("Variation", variation, selectedId));
  container.replaceChildren(wrapper);
  return wrapper;
}
