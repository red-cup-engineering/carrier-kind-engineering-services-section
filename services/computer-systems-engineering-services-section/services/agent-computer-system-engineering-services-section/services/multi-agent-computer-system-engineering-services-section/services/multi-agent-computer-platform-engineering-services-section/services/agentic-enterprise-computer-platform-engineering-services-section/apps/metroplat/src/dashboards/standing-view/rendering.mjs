/**
 * standing-view holds HTML rendering for settlement, feed, content, and directory views over already-derived JSON material.
 * It may import values, schema, records, logic, fixpoint, math, codecs, capability, contracts, and sibling rendering modules; its current themed-page bridge still imports runtime and integrations until the later app/integration split removes that adapter.
 */
const isReadingInKnowledge = (name) => isReading(name, "knowledge");

/** Claim-session-shaped `{cell, reading}` material (glued judgements, raw EAVT-derived
 *  state views) carries the relation model notation's own reading vocabulary — see
 *  `claims/session.mjs` — so it crosses into this module's own `segmentOfCell`
 *  (a straight computer-data-engine `readingValue` call) at read time. */
function isNotationReadingName(value) {
  try {
    readingAs("knowledge", value);
    return true;
  } catch {
    return false;
  }
}

import { projectRadial, radialPalette } from "@red-cup-engineering/xml-document-rendering-service/svg/radial";

import { articleContract } from "@red-cup-engineering/computer-article-engineering-services-section/article";

import { articleToThemedPage } from "@red-cup-engineering/web-theming-service/themed-page";
import { headFile } from "@red-cup-engineering/semiotic-eavt-services-section/layout";
import { isReading, readingAs } from "@red-cup-engineering/computer-data-engineering-services-section/four";

/* ── shared shape readers ──────────────────────────────────────────────── */

function isRecord(value) {
  return value !== undefined && value !== null && typeof value === "object" && !Array.isArray(value);
}

function stringField(record, key) {
  const value = record[key];
  return typeof value === "string" ? value : undefined;
}

function arrayField(record, key) {
  const value = record[key];
  return Array.isArray(value) ? value : Object.freeze([]);
}

function recordField(record, key) {
  const value = record[key];
  return isRecord(value) ? value : Object.freeze({});
}

/** One `{cell, reading}` pair, wherever it is found. */

/**
 * Scan a log->state view (`{entityKey: {attributeKey: value}}`, both keys
 * JSON-stringified) for the `{cell, reading}` shape every claim-session-style
 * feed's rows carry on their attribute (the same shape the claim-modality and
 * governance filesystem derivers already parse off raw EAVT rows — here read
 * off the folded state view instead, so it works for ANY claim-session-shaped
 * feed's default settlement, not one named token). Non-matching entries are skipped,
 * not coerced.
 */
export function valuedCellsOfStateView(view) {
  const cells = [];
  for (const entityKey of Object.keys(view)) {
    const entityView = view[entityKey];
    if (!isRecord(entityView)) continue;
    for (const attributeKey of Object.keys(entityView)) {
      let parsed;
      try {
        parsed = JSON.parse(attributeKey);
      } catch {
        continue;
      }
      if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) continue;
      const record = parsed;
      const cell = record["cell"];
      const cellReading = record["reading"];
      if (typeof cell === "string" && typeof cellReading === "string" && isNotationReadingName(cellReading)) {
        cells.push(Object.freeze({ cell, reading: readingAs("knowledge", cellReading) }));
      }
    }
  }
  return Object.freeze(cells);
}

/** A settlement is shaped like a default log->state view when every top-level value
 *  is itself a JSON-object-keyed record (the feed settlement's `designated`
 *  and the generic per-token fallback settlement share this exact shape). */
function looksLikeStateView(value) {
  const entries = Object.values(value);
  return entries.length > 0 && entries.every(isRecord);
}

/* ── SVG dataform builders ─────────────────────────────────────────────── */

function segmentOfCell(cell) {
  const label = cell.cell.length > 72 ? `${cell.cell.slice(0, 69)}...` : cell.cell;
  return Object.freeze({
    e: cell.cell,
    label,
    title: cell.cell,
    orbit: "diagonal",
    reading: cell.reading,
  });
}

function ringOfCells(ordinal, label, cells) {
  return Object.freeze({ ordinal, label, segments: Object.freeze(cells.map(segmentOfCell)) });
}

function dataformOfRings(rings, title) {
  const nonEmpty = rings.filter((ring) => ring.segments.length > 0);
  if (nonEmpty.length === 0) return undefined;
  return Object.freeze({ rings: Object.freeze(nonEmpty), title });
}

/* ── markdown body builders ────────────────────────────────────────────── */

function heading(level, text) {
  return `${"#".repeat(level)} ${text}`;
}

function bullets(items) {
  return items.map((item) => `- ${item}`).join("\n");
}

function jsonFence(value) {
  return `\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\``;
}

function bodyOf(title, markdown, dataform) {
  return Object.freeze({ title, markdown, ...(dataform === undefined ? {} : { dataform }) });
}

function orientationBody(settlement, coords) {
  const scale = recordField(settlement, "scale");
  const fleet = isRecord(settlement["fleet"]) ? settlement["fleet"] : undefined;
  const adjudication = recordField(settlement, "adjudication");
  const conflicts = arrayField(adjudication, "conflicts").filter((v) => typeof v === "string");
  const held = arrayField(adjudication, "held").filter((v) => typeof v === "string");
  const obstructions = arrayField(adjudication, "obstructions");
  const failures = arrayField(settlement, "readingFailures").filter((v) => typeof v === "string");

  const lines = [heading(2, "Scale"), bullets([
    `modules ${scale["modules"] ?? "—"}, loc ${scale["loc"] ?? "—"}, sloc ${scale["sloc"] ?? "—"}, functions ${scale["functions"] ?? "—"}, classes ${scale["classes"] ?? "—"}`,
    `file-census: ${scale["fileCensusFiles"] ?? "—"} files, ${scale["fileCensusLoc"] ?? "—"} loc`,
  ])];
  if (fleet !== undefined) {
    lines.push(heading(2, "Fleet"), bullets([
      `sessions ${fleet["sessions"] ?? "—"}, claims ${fleet["claims"] ?? "—"}, regime ${fleet["regime"] ?? "—"}`,
    ]));
  }
  lines.push(heading(2, "Adjudication"), bullets([
    `conflicts (⊤, held): ${conflicts.length}`,
    `hook-settlement held (⊤): ${held.length}`,
    `coordination obstructions: ${obstructions.length}`,
  ]));
  if (obstructions.length > 0) lines.push(jsonFence(obstructions));
  if (failures.length > 0) lines.push(heading(2, "Reading failures"), bullets(failures));

  const cells = [
    ...conflicts.map((cell) => ({ cell, reading: "stable" })),
    ...held.map((cell) => ({ cell: `held:${cell}`, reading: "stable" })),
  ];
  return bodyOf(
    `Orientation — ${coords.date}`,
    lines.join("\n\n"),
    dataformOfRings([ringOfCells(0, "adjudication ⊤ (held/conflict)", cells)], "orientation adjudication"),
  );
}

function claudeFleetBody(settlement, coords) {
  const glued = recordField(settlement, "glued");
  const judgement = recordField(glued, "judgement");
  const coordination = recordField(glued, "coordination");
  const evidence = arrayField(settlement, "evidence").filter((v) => typeof v === "string");

  const cells = [];
  for (const [cell, value] of Object.entries(judgement)) {
    if (typeof value === "string" && isNotationReadingName(value)) cells.push({ cell, reading: readingAs("knowledge", value) });
  }

  const lines = [
    heading(2, "Evidence"),
    bullets(evidence),
    heading(2, "Judgement"),
    bullets([
      `claims ${glued["claims"] ?? "—"}, regime ${glued["regime"] ?? "—"}, cells judged: ${cells.length}`,
      `coordination: rank ${coordination["rank"] ?? "—"}, vanishing ${coordination["vanishing"] ?? "—"}`,
    ]),
  ];
  return bodyOf(
    `Claude fleet — ${coords.date}`,
    lines.join("\n\n"),
    dataformOfRings([ringOfCells(0, "glued judgement", cells)], "claude-fleet judgement"),
  );
}

function claimModalityBody(settlement, coords) {
  const subject = stringField(settlement, "subject") ?? coords.token;
  const frameClass = stringField(settlement, "frameClass") ?? "—";
  const cellsRecord = recordField(settlement, "cells");
  const valued = { reading: [], possibly: [], necessarily: [] };
  for (const [cell, reading] of Object.entries(cellsRecord)) {
    if (!isRecord(reading)) continue;
    for (const lens of ["reading", "possibly", "necessarily"]) {
      const value = reading[lens];
      if (typeof value === "string" && isReadingInKnowledge(value)) valued[lens].push({ cell, reading: value });
    }
  }
  const lines = [
    heading(2, "S5 claim-modality reading"),
    bullets([
      `subject ${subject}, frame class ${frameClass}`,
      `cells: ${Object.keys(cellsRecord).length}`,
    ]),
  ];
  return bodyOf(
    `Claim modality — ${subject} (${coords.date})`,
    lines.join("\n\n"),
    dataformOfRings([
      ringOfCells(0, "reading (flat join)", valued.reading),
      ringOfCells(1, "possibly (◇)", valued.possibly),
      ringOfCells(2, "necessarily (□)", valued.necessarily),
    ], "claim-modality S5 reading"),
  );
}

function feedFeedStateBody(settlement, coords) {
  const feed = stringField(settlement, "feed") ?? coords.token;
  const designated = recordField(settlement, "designated");
  const held = arrayField(settlement, "held");
  const closure = recordField(settlement, "closure");
  const designatedValued = valuedCellsOfStateView(designated);
  const heldCells = held
    .filter(isRecord)
    .map((cell) => Object.freeze({
      cell: `${stringField(cell, "entity") ?? JSON.stringify(cell["entity"] ?? null)}.${stringField(cell, "attribute") ?? "?"}`,
      reading: "contested",
    }));

  const lines = [
    heading(2, "Feed settlement"),
    bullets([
      `feed ${feed}, source rows ${settlement["sourceRows"] ?? "—"}, entities ${settlement["entities"] ?? "—"}`,
      `closure: stabilization ${closure["stabilization"] ?? "—"}, stage ${closure["stage"] ?? "—"}, regime ${closure["regime"] ?? "—"}`,
      `held (⊤) cells: ${heldCells.length}`,
    ]),
  ];
  return bodyOf(
    `Settlement — ${feed} (${coords.date})`,
    lines.join("\n\n"),
    dataformOfRings([
      ringOfCells(0, "held ⊤ (functional contradictions)", heldCells),
      ringOfCells(1, "designated claim cells", designatedValued),
    ], `settlement:${feed}`),
  );
}

function genericStateViewBody(settlement, coords) {
  const cells = valuedCellsOfStateView(settlement);
  const lines = [
    heading(2, "Generic default log→state view"),
    bullets([
      `No named filesystem deriver recognizes token \`${coords.token}\`; this is the default per-token log->state fold.`,
      `entities: ${Object.keys(settlement).length}`,
      `valued {cell,reading} pairs recovered from claim-session-shaped attributes: ${cells.length}`,
    ]),
  ];
  return bodyOf(
    `${coords.token} — ${coords.date}`,
    lines.join("\n\n"),
    dataformOfRings([ringOfCells(0, "recovered cells", cells)], coords.token),
  );
}

const TIER_DEPTH_LABEL = Object.freeze({
  state: "state only",
  record: "state → record",
  content: "state → record → content",
});

/** One admitted settlement token as the index reports it: which deriver family
 *  claimed it (or the default per-token `feed` fold), the underlying recorded
 *  feed it reads (when recoverable), and how deep the filing cabinet has
 *  promoted that feed. */
function feedStateIndexBody(settlement, coords) {
  const date = stringField(settlement, "date") ?? coords.date;
  const entries = arrayField(settlement, "tokens").filter(isRecord);
  const lines = [heading(2, `Settlements admitted for ${date}`)];
  if (entries.length === 0) {
    lines.push(`_(no admitted settlements for ${date})_`);
    return bodyOf(`Settlements — ${date}`, lines.join("\n\n"), undefined);
  }
  const families = new Map();
  for (const entry of entries) {
    const family = stringField(entry, "family") ?? "feed";
    const members = families.get(family);
    if (members === undefined) families.set(family, [entry]);
    else members.push(entry);
  }
  for (const [family, members] of families) {
    lines.push(heading(3, family));
    lines.push(bullets(members.map((entry) => {
      const token = stringField(entry, "token") ?? "";
      const subject = stringField(entry, "subject");
      const depth = stringField(entry, "depth") ?? "state";
      const depthLabel = TIER_DEPTH_LABEL[depth] ?? depth;
      const subjectNote = subject !== undefined && subject !== token ? ` _(feed: ${subject})_` : "";
      // The state of a thing on a day is the head the store keeps for it, when its name is a store type.
      let href;
      try { href = headFile("/", token, date); } catch { href = undefined; }
      return `${href === undefined ? token : `[${token}](${href})`}${subjectNote} — ${depthLabel}`;
    })));
  }
  return bodyOf(`Settlements — ${date}`, lines.join("\n\n"), undefined);
}

function unspecializedBody(settlement, coords) {
  const keys = isRecord(settlement) ? Object.keys(settlement) : [];
  const lines = [
    heading(2, "Unspecialized settlement"),
    bullets([
      `Shape matched no named dispatch (orientation, claude-fleet/glued, feed-settlement, claim-modality, generic state-view) — rendering the raw JSON.`,
      `top-level keys: ${keys.length === 0 ? "(none — not an object)" : keys.join(", ")}`,
    ]),
    jsonFence(settlement),
  ];
  return { title: `${coords.token} — ${coords.date}`, markdown: lines.join("\n\n") };
}

/* ── dispatch ───────────────────────────────────────────────────────────── */

/** Dispatch an admitted settlement's JSON to its rendering, by `kind` where a named
 *  filesystem deriver stamps one, by structural shape otherwise. */
export function feedStateBodyOf(settlement, coords) {
  if (!isRecord(settlement)) return unspecializedBody(settlement, coords);
  const kind = stringField(settlement, "kind");
  if (kind === "metroplat.settlement-view.index-page") return feedStateIndexBody(settlement, coords);
  if (kind === "metroplat.holography.orientation-settlement") return orientationBody(settlement, coords);
  if (kind === "metroplat.holography.claim-modality-settlement") return claimModalityBody(settlement, coords);
  if (kind === "metroplat.holography.feed-settlement") return feedFeedStateBody(settlement, coords);
  // The claude-fleet settlement carries `kind: "metroplat.claude-session.fleet-settlement"`
  // (a src/integrations/anthropic/services settlement kind, not a filesystem one) when read
  // through readClaudeSessionFleetReadout directly; the filesystem claude-fleet
  // deriver's own composition may omit `kind` — dispatch on the real `glued`
  // + `evidence` shape either way, not on one specific kind string.
  if ((kind === "metroplat.claude-session.fleet-settlement" || kind === undefined)
    && isRecord(settlement["glued"]) && Array.isArray(settlement["evidence"])) return claudeFleetBody(settlement, coords);
  if (kind === undefined && looksLikeStateView(settlement)) return genericStateViewBody(settlement, coords);
  return unspecializedBody(settlement, coords);
}

const SETTLEMENT_VIEW_LOCUS_MARKER = `<div class="e-content" data-metroplat-locus="content">`;

function withValuedSvg(html, dataform) {
  if (dataform === undefined) return html;
  const svg = projectRadial(dataform, { palette: radialPalette, reading: "knowledge" });
  const insertAt = html.indexOf(SETTLEMENT_VIEW_LOCUS_MARKER);
  if (insertAt === -1) return html;
  const at = insertAt + SETTLEMENT_VIEW_LOCUS_MARKER.length;
  return `${html.slice(0, at)}\n<div class="metroplat-settlement-valued-material" data-metroplat-locus="valued-material">\n${svg}\n</div>\n${html.slice(at)}`;
}

/** Render one admitted settlement's JSON as a complete themed HTML page, with any
 *  valued material drawn as radial SVG. */
export function renderFeedStateViewHtml(settlement, coords) {
  const body = feedStateBodyOf(settlement, coords);
  const article = articleContract.assert(Object.freeze({
    title: body.title,
    slug: `settlement-${coords.token}-${coords.date}`,
    author: "metroplat",
    date: coords.date,
    draft: false,
    body: body.markdown,
  }), "settlement-view article");
  return withValuedSvg(articleToThemedPage(article), body.dataform);
}

/* ── record/content tier material ──────────────────────────────────────── */

/** One realized content-tier document (`data/content/.../realize-<feed>.json`'s
 *  element shape: `{entity, type, content}`), read here structurally so this
 *  pure projection module stays free of a `src/stores` dependency. */

function fence(lang, text) {
  return `\`\`\`${lang}\n${text}\n\`\`\``;
}

/** Fenced, never embedded raw: realized `type: "md"` documents observed in
 *  practice are YAML settlement dumps (the `commitRecord` boundary/judgement
 *  shape rendered through `encodeYaml`), not clean prose — embedding them
 *  directly breaks against this renderer's simple block parser (indented list
 *  lines do not match its `^[-*]` rule and collapse into one paragraph). A
 *  fence preserves the document's own structure faithfully regardless of what
 *  its `type` claims. */
function contentDocumentMarkdown(doc) {
  return [heading(3, doc.entity), fence(doc.type, doc.content)].join("\n\n");
}

/** The content tier's own rendering: the browsable, lowest-fidelity end of the
 *  chain, so it is rendered in full — never summarized further — wherever it
 *  is shown (inline in the feed chain, or standalone at `/content/:date/:feed`). */
function contentDocumentsMarkdown(documents) {
  if (documents.length === 0) return "_(no realized content)_";
  return documents.map(contentDocumentMarkdown).join("\n\n---\n\n");
}

/** Render a feed's realized content documents as their own themed page. */
export function renderContentViewHtml(feed, date, documents) {
  const markdown = [
    heading(2, `Realized content (${documents.length} document${documents.length === 1 ? "" : "s"})`),
    contentDocumentsMarkdown(documents),
  ].join("\n\n");
  const article = articleContract.assert(Object.freeze({
    title: `Content — ${feed} (${date})`,
    slug: `content-${feed}-${date}`,
    author: "metroplat",
    date,
    draft: false,
    body: markdown,
  }), "content-view article");
  return withValuedSvg(articleToThemedPage(article), undefined);
}

/** What the feed view knows about the record and content tiers, beyond the
 *  log/state material it already reads: absent when the filing cabinet has
 *  not promoted the feed that far — honest absence, not an error. */

function chainMarkdown(chain) {
  if (chain === undefined) return "";
  const lines = [heading(2, "Chain")];
  lines.push(bullets([
    chain.state.present
      ? `state — [settlement](${chain.state.href})`
      : `state — _(no state settlement for this date)_`,
  ]));
  if (chain.record === undefined) {
    lines.push("record — _(not promoted, stops at state)_");
  } else {
    lines.push(heading(3, `record (${chain.record.rowCount} settled datom${chain.record.rowCount === 1 ? "" : "s"})`));
    if (chain.record.sample !== undefined) lines.push(`most recent settled reading:\n\n${jsonFence(chain.record.sample)}`);
  }
  if (chain.content === undefined) {
    lines.push("content — _(not promoted, stops at record)_");
  } else {
    lines.push(heading(3, "content"), contentDocumentsMarkdown(chain.content));
  }
  return lines.join("\n\n");
}

/* ── feed statement views ──────────────────────────────────────────────── */

/** Render a statement feed's sampled raw rows and settlement reading as one themed page —
 *  the status/handoff surface, a statement feed-state read rendered directly, never
 *  a hand-assembled blob. `settlement` is whatever
 *  the journal state reading returned for the feed's
 *  log (read here as plain JSON to keep this module free of a services/
 *  dependency); `sample` is a bounded inspection lens over the raw EAVT
 *  statements in log order. `chain` carries whatever the record/content tiers
 *  hold for this feed, when the filing cabinet has promoted that far — the
 *  whole log->state->record->content chain, not only the state-tier
 *  settlement, per the artifact-tier doctrine that the content tier exists to
 *  be browsed, not merely counted. */
export function renderFeedViewHtml(
  feed,
  date,
  settlement,
  sample,
  chain,
) {
  const record = isRecord(settlement) ? settlement : Object.freeze({});
  const body = feedFeedStateBody(record, { date, token: `settlement-${feed}` });
  const rowLines = sample.rows.map(([entity, attribute, value, time]) =>
    `\`${JSON.stringify(entity)}\` / \`${JSON.stringify(attribute)}\` = \`${JSON.stringify(value)}\` @ ${JSON.stringify(time)}`);
  const omitted = Math.max(0, sample.sourceRows - sample.rows.length);
  const sampleNotes = [
    omitted > 0 ? `showing first ${sample.rows.length}; ${omitted} more row${omitted === 1 ? "" : "s"} not rendered in this HTML lens` : "",
    sample.malformed !== undefined && sample.malformed > 0 ? `malformed source lines held outside the sample: ${sample.malformed}` : "",
  ].filter((line) => line.length > 0);
  const markdown = [
    body.markdown,
    heading(2, `Statement log (${sample.sourceRows} rows)`),
    sampleNotes.length === 0 ? "" : bullets(sampleNotes),
    rowLines.length === 0 ? "_(no recorded rows)_" : bullets(rowLines),
    chainMarkdown(chain),
  ].filter((section) => section.length > 0).join("\n\n");
  const article = articleContract.assert(Object.freeze({
    title: `Feed — ${feed} (${date})`,
    slug: `feed-${feed}-${date}`,
    author: "metroplat",
    date,
    draft: false,
    body: markdown,
  }), "feed-view article");
  return withValuedSvg(articleToThemedPage(article), body.dataform);
}

/* ── directory face ────────────────────────────────────────────────────── */

/** One child of a presented directory manifest: its own name (the manifest's
 *  relative-path key, which may itself carry nested slashes for a recursed
 *  subdirectory) and the address it resolves to under the directory's own
 *  request path. */

/** Render a directory's presented manifest as a navigable listing — one link
 *  per child artifact, through the same themed-page machinery every other
 *  settlement-view render uses. The directory face never invents a second listing
 *  ontology: it is the plain address grammar, one level down. */
export function renderDirectoryListingHtml(
  requestPath,
  date,
  entries,
) {
  const markdown = [
    heading(2, `Directory — ${requestPath}`),
    entries.length === 0
      ? "_(no children)_"
      : bullets(entries.map((entry) => `[${entry.name}](${entry.href})`)),
  ].join("\n\n");
  const slug = requestPath.replace(/[^a-z0-9]+/giu, "-").replace(/^-+|-+$/gu, "").toLowerCase() || "root";
  const article = articleContract.assert(Object.freeze({
    title: `Directory — ${requestPath}`,
    slug: `directory-${slug}`,
    author: "metroplat",
    date,
    draft: false,
    body: markdown,
  }), "directory-listing article");
  return articleToThemedPage(article);
}
