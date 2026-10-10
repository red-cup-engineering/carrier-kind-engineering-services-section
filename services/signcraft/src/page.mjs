/**
 * SignCraft pages — a settled section's cells read under vantages and carried as hypertext.
 *
 * A page is a Chu space whose points are the section's cells and whose states are vantages
 * (contexts): a cell reads, from a vantage, as its knowledge reading when the vantage sees it and
 * absurd when it does not. A calm vantage selects what it reads potential or stable; an audit
 * vantage also selects what it reads active. The selected cells render as an article of subject
 * sections, a contested (stable) cell, or every cell under audit, carrying the witnesses on each side.
 */
import { knowledgeReading } from "@red-cup-engineering/signcell/cell";
import { at, chuSpace, settleRow } from "@red-cup-engineering/metrologic/chu";
import { escapeAttr, escapeText, slug } from "@red-cup-engineering/html-structural-projection-service";
import { canonical } from "@red-cup-engineering/json-services-section";
import { isConsistentReading, knowledgeBottom, knowledgeJoinReading, readingFamilies, readingOfSides, samePoint, sidesOfReading, truthBottom, truthJoinReading, truthMeetReading, truthTop } from "@red-cup-engineering/computer-data-engineering-services-section/four";

export const STANCE = Object.freeze({ CALM: "calm", AUDIT: "audit" });
/** The glyph of each knowledge point, in side order: told nothing, for only, against only, both. */
const GLYPHS = Object.freeze(["⊥", "+", "-", "⊤"]);
export const VALUE_MARK = Object.freeze(Object.fromEntries(readingFamilies.knowledge.map((name, index) => [name, GLYPHS[index]])));

/** A vantage: its name, its stance, and which cells it sees. */
export function context(name, options = {}) {
  return Object.freeze({
    name: String(name),
    stance: options.stance === STANCE.AUDIT ? STANCE.AUDIT : STANCE.CALM,
    visible: options.visible ?? (() => true),
  });
}

export const PUBLIC = context("public");
export const AUDIT = context("audit", { stance: STANCE.AUDIT });

/** A calm public vantage that does not see the given predicates. */
export function publicVantage(hiddenPredicates = [], name = "public") {
  const hidden = new Set(hiddenPredicates);
  return context(name, { visible: (cell) => !hidden.has(cell.predicate) });
}

const label = (value) => typeof value === "string" ? value : value === undefined || value === null ? "" : JSON.stringify(value);
const cellKey = (cell) => canonical([label(cell.subject), label(cell.predicate), cell.object === undefined ? null : cell.object]);

/** The page of settled cells (SignCell cells, told for and against) under `contexts` (public by default). */
export function pageOfCells(cells, options = {}) {
  const contexts = Object.freeze([...(options.contexts?.length ? options.contexts : [PUBLIC])]);
  const byKey = new Map();
  for (const at of cells) if (!byKey.has(cellKey(at))) byKey.set(cellKey(at), at);
  const byName = new Map(contexts.map((ctx) => [ctx.name, ctx]));
  const space = chuSpace([...byKey.keys()], contexts.map((ctx) => ctx.name), (point, state) => {
    const at = byKey.get(point), ctx = byName.get(state);
    return !at || !ctx || !ctx.visible(at) ? knowledgeBottom() : knowledgeReading(at);
  }, { absent: knowledgeBottom() });
  const subjects = [...new Set([...byKey.values()].map((at) => label(at.subject)))].sort();
  return Object.freeze({ kind: "signcraft.page", subject: options.subject ?? (subjects.length === 1 ? subjects[0] : null), contexts, cells: byKey, order: Object.freeze([...byKey.keys()]), space });
}

/** Stack pages sharing the same vantages into one: every cell, first seen first. */
export function stackPages(pages, options = {}) {
  if (pages.length === 0) throw new Error("stackPages: need at least one page");
  const names = pages[0].contexts.map((ctx) => ctx.name).sort().join("\u0000");
  if (pages.some((page) => page.contexts.map((ctx) => ctx.name).sort().join("\u0000") !== names)) throw new Error("stackPages: all pages must share vantages");
  return pageOfCells(pages.flatMap((page) => [...page.cells.values()]), { contexts: pages[0].contexts, subject: options.subject ?? null });
}

/** The cells a vantage selects: potential and stable when calm, active too under audit. */
export function selectForContext(page, contextName) {
  const stance = page.contexts.find((ctx) => ctx.name === contextName)?.stance ?? STANCE.CALM;
  return Object.freeze(page.order.flatMap((key) => {
    const value = at(page.space, key, contextName);
    const [forTold, againstTold] = sidesOfReading(value);
    if (!(forTold || (stance === STANCE.AUDIT && againstTold))) return [];
    return [Object.freeze({ key, cell: page.cells.get(key), value, contested: !isConsistentReading(value) })];
  }));
}

/** The cells a vantage reads potential: what it can broadcast uncontested. */
export function selectForBroadcast(page, contextName) {
  return Object.freeze(page.order.flatMap((key) => samePoint(at(page.space, key, contextName), truthTop())
    ? [Object.freeze({ key, cell: page.cells.get(key), value: truthTop(), contested: false })] : []));
}

/** A cell's presence across vantages: the knowledge join of its row. */
export const presenceOf = (page, key) => settleRow(page.space, key, knowledgeJoinReading, knowledgeBottom());

/** A cell's truth across vantages: the truth meet of its row, or its join. */
export const truthOf = (page, key, mode = "meet") => settleRow(page.space, key, mode === "join" ? truthJoinReading : truthMeetReading, mode === "join" ? truthBottom() : truthTop());

function witnesses(values) {
  return values.length === 0 ? "<em>none recorded</em>" : values.map((entry) => `<li>${escapeText(label(entry))}</li>`).join("");
}

function renderSpan(entry, mode) {
  const { cell } = entry;
  const reading = knowledgeReading(cell), mark = VALUE_MARK[reading];
  const predicate = label(cell.predicate), subject = label(cell.subject);
  const hasObject = cell.object !== undefined && cell.object !== null && cell.object !== "";
  const attrs = [`class="${escapeAttr(slug(predicate))}"`, `data-e="${escapeAttr(subject)}"`, `data-a="${escapeAttr(predicate)}"`,
    hasObject ? `data-v="${escapeAttr(label(cell.object))}"` : "", !isConsistentReading(reading) ? `data-contested="true"` : ""].filter(Boolean).join(" ");
  const why = !isConsistentReading(reading) || mode === "audit"
    ? `<details class="why" data-value="${escapeAttr(mark)}"><summary>why ${escapeText(mark)}</summary><ul class="witnesses-truth" data-side="truth">${witnesses([...cell.for])}</ul><ul class="witnesses-falsity" data-side="falsity">${witnesses([...cell.against])}</ul></details>`
    : "";
  return `      <span ${attrs}>${escapeText(hasObject ? `${predicate} ${label(cell.object)}` : predicate)}${why}</span>`;
}

/** The article a vantage reads of a page: one section per subject, one span per selected cell. */
export function renderArticle(page, contextName = "public", options = {}) {
  const mode = options.mode === "audit" ? "audit" : "calm";
  const selected = selectForContext(page, contextName);
  if (selected.length === 0) return "";
  const groups = new Map();
  for (const entry of selected) groups.set(label(entry.cell.subject), [...(groups.get(label(entry.cell.subject)) ?? []), entry]);
  const body = [...groups].map(([subject, entries]) => `    <section class="subject" data-e="${escapeAttr(subject)}">\n${entries.map((entry) => renderSpan(entry, mode)).join("\n")}\n    </section>`).join("\n");
  const attrs = [`class="semantic-hypertext-packet"`, page.subject === null ? "" : `data-subject="${escapeAttr(page.subject)}"`,
    options.observer === undefined ? "" : `data-observer="${escapeAttr(options.observer)}"`, `data-cells="${selected.length}"`, `data-mode="${mode}"`].filter(Boolean).join(" ");
  return `  <article ${attrs}>\n${body}\n  </article>`;
}

/** A whole HTML document of the article a vantage reads. */
export function renderDocument(page, contextName = "public", options = {}) {
  const title = options.title ?? page.subject ?? "semantic-hypertext";
  const article = renderArticle(page, contextName, options) || `  <p class="empty">No cells selected.</p>`;
  return `<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="utf-8">\n    <title>${escapeText(title)}</title>\n</head>\n<body>\n${article}\n</body>\n</html>\n`;
}

/** A section's calm article beside its audit, with the cells no vantage can read (absurd). */
export function renderSectionFrame(cells, options = {}) {
  const page = pageOfCells(cells, { contexts: options.contexts ?? [PUBLIC, AUDIT] });
  const contextName = options.contextName ?? "public";
  const html = renderArticle(page, contextName, options.mode ? { mode: options.mode } : {});
  const audit = options.mode === "audit" ? html : renderArticle(page, "audit", { mode: "audit" });
  const absurd = Object.freeze([...page.cells.values()].filter((at) => samePoint(knowledgeReading(at), knowledgeBottom())));
  return Object.freeze({ html, audit, absurd });
}
