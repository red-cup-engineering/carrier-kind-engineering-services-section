// interlinear.mjs — Mandarin read at every naturalization level at once,
// aligned by segment and by word: the fiber's own levels (hanzi, pinyin,
// gloss), which need no model, and the model's levels (grammatical, natural,
// localized) from the translation module. This is the layout language
// learners read: characters over pronunciation over word glosses, with the
// sentence translations beneath. A request that names only the fiber's
// levels calls no model at all.
import {
  admitMandarinTranslation,
  MANDARIN_MODEL_LEVELS,
  MANDARIN_TRANSLATION_MODULES,
  translateMandarin,
} from "@red-cup-engineering/computer-language-systems-engineering-services-section/translation";

import { createMandarinReader, mandarinEnglishLexiconSource } from "./reading.mjs";
import { mandarinLexiconSource } from "./segmentation.mjs";

export const MANDARIN_FIBER_LEVELS = Object.freeze(["hanzi", "pinyin", "gloss"]);
export const MANDARIN_INTERLINEAR_LEVELS = Object.freeze([...MANDARIN_FIBER_LEVELS, ...Object.keys(MANDARIN_MODEL_LEVELS)]);

/** The levels an interlinear request asks for, in the order given; the fiber's three by default. */
export function mandarinInterlinearLevelsOf(body) {
  const levels = Array.isArray(body?.levels) ? body.levels : [...MANDARIN_FIBER_LEVELS];
  if (levels.length === 0 || new Set(levels).size !== levels.length) throw new RangeError("levels must be distinct and at least one");
  for (const level of levels) if (!MANDARIN_INTERLINEAR_LEVELS.includes(level)) throw new RangeError(`unknown level: ${level}; known: ${MANDARIN_INTERLINEAR_LEVELS.join(", ")}`);
  return levels;
}

function split(levels) {
  return { fiber: levels.filter((level) => MANDARIN_FIBER_LEVELS.includes(level)), model: levels.filter((level) => !MANDARIN_FIBER_LEVELS.includes(level)) };
}

/** Admission before pricing: the translation's own admission, with the model levels asked for. */
export function admitMandarinInterlinear(body) {
  const { model } = split(mandarinInterlinearLevelsOf(body));
  const { levels: _levels, level: _level, ...rest } = body;
  return admitMandarinTranslation({ ...rest, levels: model.length > 0 ? model : ["natural"] }, body.module);
}

const readers = new Map();

function readerFor(moduleId) {
  if (!readers.has(moduleId)) {
    const glossary = MANDARIN_TRANSLATION_MODULES[moduleId]?.glossary ?? [];
    readers.set(moduleId, createMandarinReader({ extraWords: glossary.map(({ source, target }) => ({ word: source, gloss: target })) }));
  }
  return readers.get(moduleId);
}

function textLayout(segments, levels) {
  const { fiber, model } = split(levels);
  return segments.map((segment) => {
    const lines = [];
    if (fiber.includes("hanzi")) lines.push(segment.words.map((word) => word.hanzi).join(" "));
    if (fiber.includes("pinyin")) lines.push(segment.words.map((word) => word.pinyin).join(" "));
    if (fiber.includes("gloss")) lines.push(segment.words.map((word) => word.gloss).join(" | "));
    for (const level of model) lines.push(`${level}: ${segment.targets[level]}`);
    return lines.join("\n");
  }).join("\n\n");
}

/**
 * Read one request at the levels it names. Returns each segment's words at
 * the fiber's levels and its sentence at the model's levels, a plain-text
 * interlinear layout, and the sources the fiber's levels rest on.
 */
export async function readMandarinInterlinear(body, env = {}) {
  const levels = mandarinInterlinearLevelsOf(body);
  const { fiber, model } = split(levels);
  const request = admitMandarinInterlinear(body);
  const moduleId = body.module ?? "general";
  const reader = readerFor(moduleId);
  const { levels: _levels, level: _level, ...rest } = body;
  const translated = model.length > 0 ? await translateMandarin({ ...rest, levels: model }, env, moduleId) : undefined;
  const segments = request.segments.map((source, index) => Object.freeze({
    source,
    words: Object.freeze(fiber.length === 0 ? [] : reader.read(source).map((word) => Object.freeze(Object.fromEntries([...fiber.map((level) => [level, word[level]]), ["source", word.source]])))),
    targets: Object.freeze(translated === undefined ? {} : translated.segments[index].targets),
  }));
  return Object.freeze({
    kind: "mandarin-interlinear/v1",
    module: moduleId,
    format: request.format,
    levels: Object.freeze([...levels]),
    models: Object.freeze(translated?.models ?? []),
    segments: Object.freeze(segments),
    text: textLayout(segments, levels),
    ...(translated === undefined ? {} : { translations: translated.translations }),
    sources: Object.freeze({ segmentation: mandarinLexiconSource, pronunciationAndGloss: mandarinEnglishLexiconSource }),
  });
}
