import type { Context } from "@red-cup-engineering/http-server";
import { escapeHtml as htmlEscape } from "@red-cup-engineering/html-file-codec-service/string-rendering";

export { htmlEscape };

export function row(cells: readonly string[]): string {
  return `<tr>${cells.map((cell) => `<td>${cell}</td>`).join("")}</tr>`;
}

export function codeList(values: readonly string[]): string {
  if (values.length === 0) return "";
  return values.map((value) => `<code>${htmlEscape(value)}</code>`).join(" ");
}

export function summaryMetaItems(summary: Readonly<Record<string, string | number | null | undefined>>): string {
  return Object.entries(summary)
    .map(([label, value]) => `<span><strong>${htmlEscape(label)}</strong>${htmlEscape(value)}</span>`)
    .join("");
}

export type FunctionInterfaceSummary = Readonly<{
  bin: string;
  purpose: string;
  params: unknown;
}>;

export function functionInterfaceRows(interfaces: readonly FunctionInterfaceSummary[]): string {
  return interfaces.map((item) => row([
    `<a href="/${htmlEscape(item.bin)}">${htmlEscape(item.bin)}</a>`,
    htmlEscape(item.purpose),
    `<code>${htmlEscape(JSON.stringify(item.params))}</code>`,
  ])).join("");
}

export type ObjectCarrierSummary = Readonly<{
  id: string;
  kind: string;
}>;

export type ObjectRelationSummary = Readonly<{
  from: string;
  to: string;
}>;

export function routeQueryHref(route: string, query: Readonly<Record<string, string>>): string {
  return `${route}?${new URLSearchParams(query).toString()}`;
}

export function objectPageHref(route: string, query: Readonly<Record<string, string>>, id: string): string {
  return routeQueryHref(route, { ...query, id });
}

export function selectedObjectCarrier<Carrier extends ObjectCarrierSummary>(
  ctx: Pick<Context, "url">,
  carriers: readonly Carrier[],
  preferredKind: string,
): Carrier {
  const id = ctx.url.searchParams.get("id");
  const carrier = id === null ? undefined : carriers.find((item) => item.id === id);
  return carrier ?? carriers.find((item) => item.kind === preferredKind) ?? carriers[0]!;
}

export function adjacentObjectRelations<Relation extends ObjectRelationSummary>(
  relations: readonly Relation[],
  carrierId: string,
): readonly Relation[] {
  return Object.freeze(relations.filter((relation) => relation.from === carrierId || relation.to === carrierId));
}

export function neighborObjectCarriers<Carrier extends Pick<ObjectCarrierSummary, "id">, Relation extends ObjectRelationSummary>(
  carriers: readonly Carrier[],
  centerId: string,
  relations: readonly Relation[],
): readonly Carrier[] {
  const ids = new Set([centerId, ...relations.flatMap((relation) => [relation.from, relation.to])]);
  return Object.freeze(carriers.filter((item) => ids.has(item.id)));
}

export type SvgPoint = Readonly<{
  x: number;
  y: number;
}>;

export type RadialGraphLayout = Readonly<{
  centerX: number;
  centerY: number;
  radiusX: number;
  radiusY: number;
}>;

export type LabeledObjectRelationSummary = ObjectRelationSummary & Readonly<{
  kind: string;
}>;

export function radialGraphPositions(centerId: string | undefined, satelliteIds: readonly string[], layout: RadialGraphLayout): ReadonlyMap<string, SvgPoint> {
  const positions = new Map<string, SvgPoint>();
  if (centerId !== undefined) positions.set(centerId, { x: layout.centerX, y: layout.centerY });
  satelliteIds.forEach((id, index) => {
    const angle = (-Math.PI / 2) + (index / Math.max(1, satelliteIds.length)) * Math.PI * 2;
    positions.set(id, {
      x: layout.centerX + Math.cos(angle) * layout.radiusX,
      y: layout.centerY + Math.sin(angle) * layout.radiusY,
    });
  });
  return positions;
}

export function svgRelationLines(relations: readonly LabeledObjectRelationSummary[], positions: ReadonlyMap<string, SvgPoint>, strokeWidth = "1.2"): string {
  return relations
    .filter((relation) => positions.has(relation.from) && positions.has(relation.to))
    .map((relation) => {
      const from = positions.get(relation.from)!;
      const to = positions.get(relation.to)!;
      return `<line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" stroke="#48554e" stroke-width="${htmlEscape(strokeWidth)}"><title>${htmlEscape(relation.kind)}</title></line>`;
    }).join("");
}

export function svgShortLabel(value: string, options: Readonly<{ max?: number; pathTail?: boolean }> = {}): string {
  const max = options.max ?? 18;
  const source = options.pathTail === true ? value.split("/").at(-1) ?? value : value;
  return source.length <= max ? source : `${source.slice(0, Math.max(0, max - 3))}...`;
}

export function queryParamsFromContext<Params extends Readonly<Record<string, string | undefined>>>(
  ctx: Pick<Context, "url">,
  keys: readonly string[],
): Params {
  const params: Record<string, string> = {};
  for (const key of keys) {
    const value = ctx.url.searchParams.get(key);
    if (value !== null && value.trim() !== "") params[key] = value;
  }
  return params as Params;
}

export function functionPanel(name: string, body: unknown): string {
  const serialized = JSON.stringify(body, null, 2);
  return `<section class="function">
<h2>${htmlEscape(name)}</h2>
<form method="post" action="/${htmlEscape(name)}" enctype="text/plain" data-carrier-form>
<label>domain JSON<textarea name="body" spellcheck="false">${htmlEscape(serialized)}</textarea></label>
<button type="submit">Run</button>
</form>
<pre data-carrier-result></pre>
</section>`;
}

export function carrierFormStyles(): string {
  return `.function{border:1px solid var(--line,#2c3732);border-radius:8px;padding:14px;background:var(--surface2,#141918);display:grid;gap:12px}
.function form{display:grid;gap:10px}
.function label{display:grid;gap:5px;color:var(--muted,#aeb9b2)}
.function textarea{width:100%;min-height:150px;box-sizing:border-box;resize:vertical;border:1px solid var(--line,#34413b);border-radius:6px;padding:9px;background:var(--field-bg,#0f1211);color:var(--text,#e7eee9);font:13px/1.45 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.function button{justify-self:start;border:1px solid var(--button-border,#96722f);border-radius:6px;background:var(--button-bg,#8a641d);color:var(--button-text,white);padding:8px 12px;font:inherit;cursor:pointer}
.function pre{margin:0;min-height:90px;max-height:420px;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere;border:1px solid var(--line,#34413b);border-radius:8px;padding:12px;background:var(--field-bg,#0f1211);color:var(--pre-text,var(--text,#b7c7bd))}`;
}

export type DensePageStyleOptions = Readonly<{
  maxWidth?: number;
  extraRootVars?: string;
  diagramMobileWidth?: number;
}>;

export function densePageStyles(options: DensePageStyleOptions = {}): string {
  const maxWidth = options.maxWidth ?? 1240;
  const extraRootVars = options.extraRootVars ?? "";
  const diagramMobile = options.diagramMobileWidth ?? 980;
  return `:root{color-scheme:dark;--bg:#0f1211;--surface:#151a18;--surface2:#18151a;--text:#eef4ed;--muted:#aab7ad;--line:#33413a;--link:#8fd3ff${extraRootVars}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);font:14px/1.45 ui-sans-serif,system-ui,-apple-system,Segoe UI,sans-serif}
main{max-width:${maxWidth}px;margin:0 auto;padding:24px;display:grid;gap:22px}
header{display:grid;gap:10px}
h1{font-size:25px;line-height:1.15;margin:0;font-weight:650;letter-spacing:0}
h2{font-size:16px;margin:0 0 10px;font-weight:650;letter-spacing:0}
p{margin:0;color:var(--muted)}
a{color:var(--link);text-decoration:none}
code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
nav,.meta{display:flex;flex-wrap:wrap;gap:8px}
nav a,.meta span{border:1px solid var(--line);border-radius:6px;padding:6px 9px;background:#121614}
.meta span{color:var(--muted)}
.meta strong{display:block;color:var(--text);font-size:12px}
.diagram{overflow:auto;border:1px solid var(--line);border-radius:8px;background:#0f1211}
.diagram svg{display:block;max-width:none}
.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;align-items:start}
${carrierFormStyles()}
table{width:100%;border-collapse:collapse;border:1px solid var(--line)}
th,td{padding:8px 10px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}
th{color:#dfe7df;background:#151a18;font-weight:650}
td{color:#dbe3dc}
@media(max-width:780px){main{padding:16px}.grid{grid-template-columns:1fr}table{display:block;overflow-x:auto;white-space:nowrap}.diagram svg{width:${diagramMobile}px;height:auto}}`;
}

export function carrierFormScript(): string {
  return `<script>
(() => {
  const forms = document.querySelectorAll("[data-carrier-form]");
  for (const form of forms) {
    const result = form.parentElement?.querySelector("[data-carrier-result]");
    if (!result) continue;
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const body = String(new FormData(form).get("body") ?? "");
      result.textContent = "running...";
      try {
        const response = await fetch(form.action, {
          method: "POST",
          headers: { "content-type": "text/plain; charset=utf-8", "accept": "text/plain, application/json;q=0.9" },
          body,
        });
        result.textContent = await response.text();
      } catch (error) {
        result.textContent = error instanceof Error ? error.message : String(error);
      }
    });
  }
})();
</script>`;
}
