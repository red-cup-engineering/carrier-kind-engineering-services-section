/**
 * Mandarin-to-English translation with modules. A module is a domain's
 * instruction, glossary and output rules; `general` serves any text and
 * `cdrama-subtitles` serves Chinese short-drama subtitles. A request is plain
 * text or a subtitle file (SRT or WebVTT); a subtitle file comes back in its
 * own format with its cues and timings unchanged and only its text
 * translated.
 *
 * The model call goes through the inference engine's Workers AI runner, so
 * the same function runs inside the market's Worker (through its `AI`
 * binding) and on a Node host (over REST). Models are tried in order and the
 * next is used when one fails; a request fails only when every model has.
 */
import { runWorkersAiModel } from "@red-cup-engineering/computer-inference-engine/cloudflare/workers-ai";
import { parseSubtitles, serializeSubtitles } from "@red-cup-engineering/computer-text-content-engineering-services-section/subtitles";

import { evidenceCensus, joinedReading, renderingsOf, segmentEvidence } from "./translation-evidence.mjs";
import cdramaLexicon from "../data/translation-lexicons/cdrama-subtitles.json" with { type: "json" };

export const MANDARIN_TRANSLATION_MODELS = Object.freeze(["@cf/zai-org/glm-4.7-flash", "@cf/qwen/qwen3.8-27b"]);

/** Source characters one request may carry, spaces excluded. */
export const MANDARIN_TRANSLATION_CHARACTER_LIMIT = 4000;

const SEGMENTS_PER_CALL = 60;
const HAN = /\p{Script=Han}/u;
const NUMBERED = /^\s*\[(\d+)\]\s?(.*)$/u;
// A name line: models asked for "NAME: 顾北辰 = Gu Beichen" also write "Gu Beichen: 顾北辰 = Gu Beichen"
// or a bare "顾北辰 = Gu Beichen", so any non-numbered line whose last Han run is set equal to English counts.
const NAMED = /(\p{Script=Han}+)\s*=\s*([^=\n]*[\p{L}][^=\n]*?)\s*$/u;
const GLOSSARY_LIMIT = 200;
const MEMORY_LIMIT = 1000;

/** The C-drama module's lexicon, compiled from the micro-drama glossary terms by scripts/compile-translation-lexicons.mjs. */
const CDRAMA_GLOSSARY = Object.freeze(cdramaLexicon.entries.map(({ source, target, kind }) => Object.freeze({ source, target, ...(kind === undefined ? {} : { kind }) })));

export const MANDARIN_TRANSLATION_MODULES = Object.freeze({
  general: Object.freeze({
    id: "general",
    instruction: "You translate Mandarin Chinese into clear, natural American English, keeping the meaning, register and any names, numbers, dates and units exactly. Romanize Chinese personal names in pinyin without tone marks, surname first, unless an English name is given.",
    glossary: Object.freeze([]),
    rules: Object.freeze([]),
    subtitleLineLength: 42,
  }),
  "cdrama-subtitles": Object.freeze({
    id: "cdrama-subtitles",
    instruction: "You translate subtitles of Chinese short dramas (micro-dramas) into natural, idiomatic American English as English-language drama fans expect them: short, speakable lines that keep each line's emotion, insult or cliffhanger. Romanize Chinese personal names in pinyin without tone marks, surname first. Address people the way English speech does: a title becomes \"Mr. <surname>\", \"Ms. <surname>\", \"sir\" or \"ma'am\", never \"Mr. CEO\" or \"Mr. Chairman\" alone. Use the glossary's renderings for the terms it lists.",
    glossary: CDRAMA_GLOSSARY,
    rules: Object.freeze([
      Object.freeze({ id: "bare-title-address", pattern: "\\bMr\\.? (?:CEO|Chairman|President|Director)\\b", message: "a bare title used as a form of address; English speech says Mr. <surname>, sir or ma'am" }),
    ]),
    subtitleLineLength: 42,
  }),
});

/**
 * The naturalization levels a model translates at, from closest to the
 * source to closest to the reader. Each is a permitted loss: grammatical
 * gives up idiom and register to keep structure, natural gives up structure
 * for idiomatic English, localized also gives up source-culture detail. The
 * levels below them (hanzi, pinyin, gloss) need no model and are the
 * Mandarin fiber's reading (./interlinear).
 */
export const MANDARIN_MODEL_LEVELS = Object.freeze({
  grammatical: "Translate at the grammatical level, and let this override any instruction above to be idiomatic: a literal English sentence that keeps the Chinese sentence's structure, word order and figures of speech wherever English grammar allows. Render idioms word for word rather than replacing them with English ones, and keep titles and forms of address as literal renderings (总裁 as CEO, 少爷 as Young Master).",
  natural: "",
  localized: "Translate at the localized level: English an American listener would hear as native. Replace Chinese idioms with English idioms of the same force, turn titles and forms of address into what an American would say (a name, sir, ma'am, boss), and replace a culture-bound reference with its nearest American equivalent when the literal one would confuse.",
});

/** The levels a request asks for: `levels` (up to all three, in order) or `level`, natural by default; the first is the primary. */
export function mandarinLevelsOf(body) {
  const levels = Array.isArray(body?.levels) ? body.levels : [body?.level ?? "natural"];
  if (levels.length === 0 || levels.length > 3 || new Set(levels).size !== levels.length) throw new RangeError("levels must be one to three distinct levels");
  for (const level of levels) if (!Object.hasOwn(MANDARIN_MODEL_LEVELS, level)) throw new RangeError(`unknown level: ${level}; a model translates at ${Object.keys(MANDARIN_MODEL_LEVELS).join(", ")} (hanzi, pinyin and gloss are the interlinear reading)`);
  return levels;
}

function moduleOf(id) {
  const module = MANDARIN_TRANSLATION_MODULES[id ?? "general"];
  if (module === undefined) throw new RangeError(`unknown translation module: ${id}; known: ${Object.keys(MANDARIN_TRANSLATION_MODULES).join(", ")}`);
  return module;
}

/** A buyer's term list ({ source, target } entries), or none. */
function termsOf(entries, name, limit) {
  if (entries === undefined) return [];
  if (!Array.isArray(entries) || entries.length > limit) throw new RangeError(`${name} must be an array of at most ${limit} { source, target } entries`);
  for (const entry of entries) {
    if (typeof entry?.source !== "string" || typeof entry?.target !== "string" || entry.source.trim() === "" || entry.target.trim() === "") throw new TypeError(`each ${name} entry needs a non-empty source and target`);
  }
  return entries.map(({ source, target }) => Object.freeze({ source: source.trim(), target: target.trim() }));
}

/** The terms in force, in precedence order: the buyer's glossary, the series memory, the module's glossary. */
function termsInForce(module, body) {
  return [...termsOf(body.glossary, "glossary", GLOSSARY_LIMIT), ...termsOf(body.memory?.entries, "memory.entries", MEMORY_LIMIT), ...module.glossary];
}

function sourceCharacters(segments) {
  return [...segments.join("").replace(/\s/gu, "")].length;
}

/** The request as segments to translate and a way to put the translation back. */
function requestOf(body) {
  if (body === null || typeof body !== "object" || Array.isArray(body)) throw new TypeError("request body must be a JSON object");
  const hasText = typeof body.text === "string";
  const hasSubtitles = typeof body.subtitles === "string";
  if (hasText === hasSubtitles) throw new TypeError("send exactly one of `text` or `subtitles`");
  if (hasSubtitles) {
    const document = parseSubtitles(body.subtitles);
    return { format: document.format, segments: document.cues.map((cue) => cue.lines.join(HAN.test(cue.lines.join("")) ? "" : " ")), document };
  }
  const paragraphs = body.text.replace(/\r\n?/gu, "\n").split(/\n[ \t]*\n+/u).map((paragraph) => paragraph.trim()).filter((paragraph) => paragraph !== "");
  return { format: "text", segments: paragraphs.map((paragraph) => paragraph.replace(/\s*\n\s*/gu, " ")) };
}

/**
 * Admit a translation request before it is priced: one of `text` or
 * `subtitles`, a known module, Mandarin in it, and no more than the
 * character limit. Throws TypeError or RangeError, which the market answers
 * with 422 before any payment challenge.
 */
export function admitMandarinTranslation(body, moduleId = body?.module) {
  moduleOf(moduleId);
  mandarinLevelsOf(body);
  termsOf(body?.glossary, "glossary", GLOSSARY_LIMIT);
  termsOf(body?.memory?.entries, "memory.entries", MEMORY_LIMIT);
  const request = requestOf(body);
  if (!request.segments.some((segment) => HAN.test(segment))) throw new RangeError("the source has no Chinese characters to translate");
  const characters = sourceCharacters(request.segments);
  if (characters > MANDARIN_TRANSLATION_CHARACTER_LIMIT) throw new RangeError(`the source has ${characters} characters; one request carries at most ${MANDARIN_TRANSLATION_CHARACTER_LIMIT}`);
  return request;
}

/** Break an English subtitle line at word boundaries into lines of at most `width` characters. */
export function wrapSubtitleText(text, width) {
  const words = text.trim().split(/\s+/u).filter((word) => word !== "");
  if ([...text.trim()].length <= width || words.length < 2) return [text.trim()];
  let best;
  for (let cut = 1; cut < words.length; cut += 1) {
    const first = words.slice(0, cut).join(" ");
    const rest = words.slice(cut).join(" ");
    const worst = Math.max([...first].length, [...rest].length);
    if (best === undefined || worst < best.worst) best = { worst, lines: [first, rest] };
  }
  return best.worst <= width ? best.lines : [best.lines[0], ...wrapSubtitleText(best.lines[1], width)];
}

function promptFor(module, segments, format, level = "natural", allTerms = module.glossary, askNames = false, targetLanguage = "English") {
  const joined = segments.join("\n");
  const seen = new Set();
  const terms = allTerms.filter((entry) => joined.includes(entry.source) && !seen.has(entry.source) && seen.add(entry.source));
  const rules = [
    module.instruction,
    ...(MANDARIN_MODEL_LEVELS[level] === "" ? [] : [MANDARIN_MODEL_LEVELS[level]]),
    ...(format === "text" ? [] : ["Each numbered item is one subtitle cue; keep each translation short enough to read on screen."]),
    askNames
      ? `The input is numbered items like [1] text. Reply with exactly the same numbered items, one per line, each followed by only its ${targetLanguage} translation. Then, after a blank line, list the names as asked below, and nothing else.`
      : `The input is numbered items like [1] text. Reply with exactly the same numbered items, one per line, each followed by only its ${targetLanguage} translation, and nothing else.`,
    ...(terms.length === 0 ? [] : [`Glossary (use these renderings):\n${terms.map((entry) => `${entry.source} = ${entry.target}`).join("\n")}`]),
    ...(askNames ? ["After the numbered items, add one line for each personal name, family or company name, and place name you romanized, in the form NAME: <Chinese> = <English>."] : []),
  ];
  return [
    { role: "system", content: rules.join("\n\n") },
    { role: "user", content: segments.map((segment, index) => `[${index + 1}] ${segment}`).join("\n") },
  ];
}

function textOf(result) {
  const text = result?.response ?? result?.choices?.[0]?.message?.content;
  if (typeof text !== "string") throw new Error("the model returned no text");
  return text.replace(/<think>[\s\S]*?<\/think>/gu, "");
}

function numberedLines(text, count) {
  const found = new Map();
  for (const line of text.split("\n")) {
    const match = NUMBERED.exec(line);
    if (match === null) continue;
    const index = Number(match[1]) - 1;
    if (index >= 0 && index < count && !found.has(index) && match[2].trim() !== "") found.set(index, match[2].trim());
  }
  return found;
}

function namesIn(text) {
  const names = [];
  for (const line of text.split("\n")) {
    if (NUMBERED.test(line)) continue;
    const match = NAMED.exec(line);
    if (match !== null && !/\p{Script=Han}/u.test(match[2])) names.push(Object.freeze({ source: match[1], target: match[2].trim() }));
  }
  return names;
}

/** Shared model boundary for numbered, aligned source and target segments. */
export async function translateNumberedBatch({ instruction, segments, format = "text", terms = [], level = "natural", askNames = false, targetLanguage = "English" }, env = {}) {
  if (!Array.isArray(segments) || segments.length === 0 || segments.length > SEGMENTS_PER_CALL || segments.some((segment) => typeof segment !== "string" || segment.trim() === "")) {
    throw new RangeError(`segments must contain one to ${SEGMENTS_PER_CALL} non-empty strings`);
  }
  if (typeof instruction !== "string" || instruction.trim() === "") throw new TypeError("translation instruction is required");
  if (targetLanguage !== "English" && targetLanguage !== "Mandarin Chinese") throw new RangeError("targetLanguage must be English or Mandarin Chinese");
  const module = { instruction, glossary: terms };
  const failures = [];
  for (const model of MANDARIN_TRANSLATION_MODELS) {
    try {
      const result = await runWorkersAiModel(model, { messages: promptFor(module, segments, format, level, terms, askNames, targetLanguage), max_tokens: 4096, temperature: 0.2, chat_template_kwargs: { enable_thinking: false } }, { env });
      const text = textOf(result);
      const found = numberedLines(text, segments.length);
      if (found.size !== segments.length) throw new Error(`the model returned ${found.size} of ${segments.length} items`);
      return { model, targets: segments.map((_, index) => found.get(index)), names: askNames ? namesIn(text) : [] };
    } catch (error) {
      failures.push(`${model}: ${error.message}`);
    }
  }
  throw new Error(`translation failed on every model (${failures.join("; ")})`);
}

/** Every segment's English at one level, in order, with the models that made it. */
async function translateAtLevel(module, request, env, level, terms, askNames) {
  const targets = [];
  const models = new Set();
  const names = [];
  for (let start = 0; start < request.segments.length; start += SEGMENTS_PER_CALL) {
    const batch = request.segments.slice(start, start + SEGMENTS_PER_CALL);
    const translatable = batch.map((segment, index) => ({ segment, index })).filter(({ segment }) => HAN.test(segment));
    const translated = translatable.length === 0 ? { targets: [], names: [] } : await translateNumberedBatch({ instruction: module.instruction, segments: translatable.map(({ segment }) => segment), format: request.format, level, terms, askNames }, env);
    if (translated.model !== undefined) models.add(translated.model);
    names.push(...translated.names);
    const byIndex = new Map(translatable.map(({ index }, position) => [index, translated.targets[position]]));
    batch.forEach((segment, index) => targets.push(byIndex.get(index) ?? segment));
  }
  return { targets, models, names };
}

/** The series memory after this request: what it held, then each newly romanized name the terms did not already fix. */
function memoryAfter(body, terms, names) {
  const entries = [...termsOf(body.memory?.entries, "memory.entries", MEMORY_LIMIT)];
  const known = new Set(terms.map((term) => term.source));
  const renderings = new Set(terms.flatMap((term) => renderingsOf(term.target).map((form) => form.toLowerCase())));
  for (const name of names) {
    // A title the model listed as a name (顾总裁 = CEO) is a glossary rendering, not a name to remember.
    if (known.has(name.source) || renderings.has(name.target.toLowerCase())) continue;
    known.add(name.source);
    entries.push(name);
  }
  return Object.freeze({ entries: Object.freeze(entries.slice(0, MEMORY_LIMIT)) });
}

function evidenceFor(module, request, terms, source, english, index) {
  const cue = request.format === "text" ? undefined : { ...request.document.cues[index], lines: wrapSubtitleText(english, module.subtitleLineLength) };
  return segmentEvidence({ source, english, terms, rules: module.rules, cue, lineWidth: module.subtitleLineLength });
}

function renderedAs(module, request, targets) {
  return request.format === "text"
    ? targets.join("\n\n")
    : serializeSubtitles({ ...request.document, cues: request.document.cues.map((cue, index) => ({ ...cue, lines: wrapSubtitleText(targets[index], module.subtitleLineLength) })) });
}

/**
 * Translate one admitted request with one module at one or more levels.
 * Returns the primary level's translation in the request's own form (text,
 * SRT or WebVTT), every requested level's rendering, and each segment's
 * source beside its English at each level, so a buyer can check every line.
 */
export async function translateMandarin(body, env = {}, moduleId = body?.module) {
  const module = moduleOf(moduleId);
  const request = admitMandarinTranslation(body, module.id);
  const levels = mandarinLevelsOf(body);
  const terms = termsInForce(module, body);
  const byLevel = {};
  const models = new Set();
  let names = [];
  for (const [position, level] of levels.entries()) {
    const result = await translateAtLevel(module, request, env, level, terms, position === 0);
    byLevel[level] = result.targets;
    for (const model of result.models) models.add(model);
    if (position === 0) names = result.names;
  }
  const [primary] = levels;
  const evidenceByLevel = Object.fromEntries(levels.map((level) => [level, request.segments.map((source, index) => evidenceFor(module, request, terms, source, byLevel[level][index], index))]));
  const segments = request.segments.map((source, index) => Object.freeze({
    source,
    target: byLevel[primary][index],
    targets: Object.freeze(Object.fromEntries(levels.map((level) => [level, byLevel[level][index]]))),
    evidence: Object.freeze(Object.fromEntries(levels.map((level) => [level, evidenceByLevel[level][index]]))),
  }));
  return Object.freeze({
    kind: "mandarin-english-translation/v1",
    module: module.id,
    format: request.format,
    level: primary,
    levels: Object.freeze([...levels]),
    models: Object.freeze([...models]),
    translation: renderedAs(module, request, byLevel[primary]),
    translations: Object.freeze(Object.fromEntries(levels.map((level) => [level, renderedAs(module, request, byLevel[level])]))),
    reading: Object.freeze(Object.fromEntries(levels.map((level) => [level, joinedReading(evidenceByLevel[level])]))),
    census: Object.freeze(Object.fromEntries(levels.map((level) => [level, evidenceCensus(evidenceByLevel[level])]))),
    memory: memoryAfter(body, terms, names),
    segments: Object.freeze(segments),
  });
}

/** The general module, for the market's `POST /v1/translate/zh-en`. */
export function translateMandarinToEnglish(body, env) {
  return translateMandarin(body, env, "general");
}

/** Admission for the general module's route. */
export function admitMandarinToEnglish(body) {
  admitMandarinTranslation(body, "general");
}
