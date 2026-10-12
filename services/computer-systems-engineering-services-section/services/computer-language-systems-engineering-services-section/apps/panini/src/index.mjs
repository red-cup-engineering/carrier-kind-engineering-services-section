// Panini: the composing app over @red-cup-engineering/communicating and the
// house language fibers (linguistics custody; the app composes, the engine
// and the fibers hold the laws). load names a fiber and returns the engine's
// compiled bundle; read returns the engine's source-preserving reading —
// forest with every candidate reading, ambiguity count, obstructions
// (voids and conflicts) kept explicit, Lambek proof, discourse state,
// grammaticality, cohomology — never a single silent guess.

import {
  load as loadBundle,
  read as readText,
  settle as settleText,
  grammaticality as judgeParse,
  render as renderParse,
  renderArcs,
} from "@red-cup-engineering/communicating";

export const FIBERS = Object.freeze({
  english: "@lenticule-science/english-language-algebra",
  lakota: "@lenticule-science/lakota-language-algebra",
  latin: "@lenticule-science/latin-language-algebra",
  mandarin: "@lenticule-science/mandarin-language-algebra",
  tokipona: "@lenticule-science/tokipona-language-algebra",
});

// A fiber by house name, a package name, or an already-raw bundle object.
export async function load(fiber) {
  if (fiber && typeof fiber === "object") return loadBundle(fiber);
  if (typeof fiber !== "string" || fiber.length === 0) throw new TypeError("load: a fiber name, package name, or raw bundle is required");
  const pkg = FIBERS[fiber] ?? fiber;
  const mod = await import(pkg);
  const raw = mod.rawBundle ?? mod.default;
  if (!raw || typeof raw !== "object") throw new TypeError(`load: ${pkg} exports no rawBundle`);
  return loadBundle(raw);
}

export function read(text, bundle) {
  if (typeof text !== "string" || text.trim().length === 0) throw new TypeError("read: text must be a non-empty string");
  if (!bundle || typeof bundle !== "object") throw new TypeError("read: a loaded bundle is required");
  return readText(text, bundle);
}

export function settle(text, bundle) {
  if (typeof text !== "string" || text.trim().length === 0) throw new TypeError("settle: text must be a non-empty string");
  return settleText(text, bundle);
}

// The engine's grammaticality judgment of one reading (the first by default).
export function judge(reading, index = 0) {
  const parse = reading?.forest?.readings?.[index]?.parse ?? reading?.readings?.[index]?.parse;
  if (!parse) return { status: "unknown", violations: [] };
  return judgeParse(parse);
}

export function render(reading, index = 0) {
  const parse = reading?.forest?.readings?.[index]?.parse ?? reading?.readings?.[index]?.parse;
  if (!parse) return "(no reading)";
  return `${renderParse(parse)}\nARCS\n${renderArcs(parse)}`;
}

// The receipt a caller can quote: per-token tags and roles, ambiguity,
// obstructions, and the judgment — every field the engine produced, none
// invented here.
export function receipt(reading) {
  const first = reading.forest.readings[0];
  return {
    text: reading.text,
    readings: reading.forest.readings.length,
    ambiguity: reading.forest.ambiguity,
    complete: reading.forest.complete,
    charge: reading.forest.charge,
    tokens: first ? first.parse.words.map((w) => ({ text: w.text, tags: w.tags, feats: w.feats, roles: w.roles, connected: w.connected })) : [],
    arcs: first ? first.parse.arcs.map((a) => ({ rel: a.rel, head: a.headText, dependent: a.depText, status: a.status, value: a.value })) : [],
    obstructions: reading.forest.obstructions,
    grammaticality: judge(reading),
  };
}
