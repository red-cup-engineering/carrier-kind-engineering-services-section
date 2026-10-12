/**
 * learning/actions — the learning loop as operations a host (MetroPlat) serves.
 *
 *   learning-pending             the utterances no articulation cites yet, with the brief to articulate them against
 *   learning-articulation-admit  record articulations (the one inference-bearing step, done once per utterance)
 *   learning-consolidate         settle every articulation into the knowledge section
 *   learning-fiber               the always-loaded fiber a session opens with
 *
 * Articulations are records in the host's data root (`data/records/knowing-records/articulations.jsonl`),
 * tracked with the corpus so every node and every later session reads the same section instead of
 * re-deriving it. An utterance's text stays in the carrier that heard it; the record keeps only the
 * spans its claims quote. The host binding supplies `dataRoot` and `utterances({ since, until })`.
 */
import fs from "node:fs";
import path from "node:path";
import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { articulation, consolidate, naming } from "./consolidate.mjs";
import { articulationBrief, fiber } from "./fiber.mjs";

export const articulationsPath = (dataRoot) => path.join(dataRoot, "data", "records", "knowing-records", "articulations.jsonl");
export const namingsPath = (dataRoot) => path.join(dataRoot, "data", "records", "knowing-records", "namings.jsonl");

/** Every admitted naming in a data root, the latest per canonical token. */
export function readNamings(dataRoot) {
  let text;
  try { text = fs.readFileSync(namingsPath(dataRoot), "utf8"); } catch (error) { if (error.code === "ENOENT") return []; throw error; }
  const latest = new Map();
  for (const line of text.split("\n")) if (line.trim() !== "") { const record = naming(JSON.parse(line)); latest.set(record.token, record); }
  return [...latest.values()];
}

/** The consolidation of a data root: its articulations under its namings. */
export const consolidateAt = (dataRoot) => consolidate(readArticulations(dataRoot), { namings: readNamings(dataRoot) });

/** Every admitted articulation in a data root, the latest per utterance. */
export function readArticulations(dataRoot) {
  let text;
  try { text = fs.readFileSync(articulationsPath(dataRoot), "utf8"); } catch (error) { if (error.code === "ENOENT") return []; throw error; }
  const latest = new Map();
  for (const line of text.split("\n")) if (line.trim() !== "") {
    const record = articulation(JSON.parse(line));
    latest.set(record.observation, record);
  }
  return [...latest.values()];
}

/** Append namings to a data root; returns how many were new or changed. */
export function writeNamings(dataRoot, records) {
  const known = new Map(readNamings(dataRoot).map((record) => [record.token, JSON.stringify(record)]));
  const fresh = records.map(naming).filter((record) => known.get(record.token) !== JSON.stringify(record));
  if (fresh.length === 0) return 0;
  fs.mkdirSync(path.dirname(namingsPath(dataRoot)), { recursive: true });
  fs.appendFileSync(namingsPath(dataRoot), fresh.map((record) => `${JSON.stringify(record)}\n`).join(""));
  return fresh.length;
}

/** Append articulations to a data root; returns how many were new or changed. */
export function writeArticulations(dataRoot, records) {
  const admitted = records.map(articulation);
  const known = new Map(readArticulations(dataRoot).map((record) => [record.observation, JSON.stringify(record)]));
  const fresh = admitted.filter((record) => known.get(record.observation) !== JSON.stringify(record));
  if (fresh.length === 0) return 0;
  const file = articulationsPath(dataRoot);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, fresh.map((record) => `${JSON.stringify(record)}\n`).join(""));
  return fresh.length;
}

const folded = (text) => String(text).toLowerCase().replace(/[\s\u2018\u2019\u201c\u201d"'`*_]+/gu, " ").replace(/\s+/gu, " ").trim();

/** Whether a span quotes its utterance: the first six words of its longest unelided stretch, folded
 *  for case, quotes and spacing, occur in the utterance's text. */
export function quotes(text, span) {
  const stretches = String(span).split(/\.\.\.|…|\[\.\.\.\]/u).map((part) => folded(part).split(" ").filter(Boolean));
  const longest = stretches.reduce((best, words) => (words.length > best.length ? words : best), []);
  return longest.length > 0 && folded(text).includes(longest.slice(0, 6).join(" "));
}

/** Ground articulations in the utterances they cite: records for an unknown utterance are refused,
 *  and a claim whose span does not quote its own utterance is dropped. */
export function groundArticulations(records, utterances) {
  const byAddress = new Map(utterances.map((u) => [u.address, u]));
  const unknown = [], dropped = [], grounded = [];
  for (const record of records) {
    const said = byAddress.get(record?.observation);
    if (said === undefined) { unknown.push(record?.observation); continue; }
    const claims = (record.claims ?? []).filter((claim) => quotes(said.text, claim?.span) || (dropped.push({ observation: record.observation, span: claim?.span }), false));
    grounded.push({ ...record, claims });
  }
  return { grounded, unknown, dropped };
}

export function learningOperations(binding) {
  const consolidated = () => consolidateAt(binding.dataRoot);
  return Object.freeze([
    operation({
      verb: "learning-pending",
      inputFormat: "json",
      outputFormat: "json",
      summary: "The founder's utterances no articulation cites yet, with the brief a carrier articulates them against.",
      description: "Domain: { since?, until?, limit? (default 40), offset? }. Returns { pending, total, articulated, brief, utterances: [{ address, session, at, text }] }. Articulate each into claims in the brief's vocabulary and admit them with learning-articulation-admit.",
      run: async (input = {}) => {
        const cited = new Set(readArticulations(binding.dataRoot).map((record) => record.observation));
        const all = await binding.utterances({ since: input.since, until: input.until });
        const pending = all.filter((u) => !cited.has(u.address));
        const offset = input.offset ?? 0, limit = input.limit ?? 40;
        return Object.freeze({
          kind: "knowing.learning-pending",
          total: all.length,
          articulated: all.length - pending.length,
          pending: pending.length,
          brief: articulationBrief(consolidated()),
          utterances: pending.slice(offset, offset + limit).map(({ address, session, at, text, carrier }) => ({ address, session, at, carrier, text })),
        });
      },
    }),
    operation({
      verb: "learning-articulation-admit",
      inputFormat: "json",
      outputFormat: "json",
      summary: "Record articulations of utterances: claims in the relation vocabulary, each quoting its span.",
      description: "Domain: { articulations: [{ observation (the utterance address), session, at, utterer, carrier, articulator, claims: [{ subject, predicate, object, side, span }] }] }. Refuses the whole batch if any record is malformed. Records for utterances no carrier holds are refused; a claim whose span does not quote its utterance is dropped and reported. namings: [{ token, names, articulator, basis? }] records a carrier's judgment that several tokens name one thing (the latest per token stands).",
      run: async (input = {}) => {
        if (!Array.isArray(input.articulations ?? []) || !Array.isArray(input.namings ?? [])) throw new TypeError("learning-articulation-admit: articulations and namings must be arrays");
        const named = writeNamings(binding.dataRoot, input.namings ?? []);
        if (input.articulations === undefined) return Object.freeze({ kind: "knowing.articulations-admitted", admitted: 0, named });
        const { grounded, unknown, dropped } = groundArticulations(input.articulations, await binding.utterances({}));
        return Object.freeze({ kind: "knowing.articulations-admitted", admitted: writeArticulations(binding.dataRoot, grounded), named, refused: unknown.length, dropped: dropped.length, droppedSpans: dropped.slice(0, 20) });
      },
    }),
    operation({
      verb: "learning-consolidate",
      inputFormat: "json",
      outputFormat: "json",
      summary: "Settle every articulation into the knowledge section: relations with readings, contested cells, aliases, rounds and co-statement themes.",
      description: "Domain: { subject?, limit? (default 200) }. subject narrows relations to cells about one token (as subject or object).",
      run: (input = {}) => {
        const section = consolidated();
        const about = input.subject === undefined ? section.relations : section.relations.filter((r) => r.subject === input.subject || r.object === input.subject);
        return Object.freeze({ ...section, relations: about.slice(0, input.limit ?? 200), relationCount: about.length });
      },
    }),
    operation({
      verb: "learning-fiber",
      inputFormat: "json",
      outputFormat: "string",
      summary: "The always-loaded fiber: the founder's settled relations, most restated first, contested ones apart.",
      description: "Domain: { budget? (characters, default 12000), minimumSessions? }.",
      run: (input = {}) => fiber(consolidated(), { budget: input.budget, minimumSessions: input.minimumSessions }),
    }),
  ]);
}
