import { parseSubtitles, serializeSubtitles, measureSubtitleCue } from "@red-cup-engineering/computer-text-content-engineering-services-section/subtitles";
import { MANDARIN_TRANSLATION_MODULES, translateNumberedBatch, wrapSubtitleText } from "@red-cup-engineering/computer-language-systems-engineering-services-section/translation";
import { segmentEvidence } from "@red-cup-engineering/computer-language-systems-engineering-services-section/translation-evidence";
import { admitJsonSemanticContent, EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/computer-content-address-engineering-services-section/semantic-content-identity";

const MAX_SOURCE_CHARACTERS = 4000;
const MAX_CONTEXT_CHARACTERS = 1000;
const MAX_TERMS = 500;
const MAX_REVIEWS = 2000;
const SERIES_KEY = /^[A-Za-z0-9_-]{43}$/u;
const EPISODE_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/u;
const HAN = /\p{Script=Han}/u;
const LATIN = /\p{Script=Latin}/u;
const MARKUP = /<[^>]+>|\{\\[^}]+\}/gu;
const REVIEW_KIND = "cdrama.review/v1";
const DIRECTIONS = Object.freeze({
  "zh-en": Object.freeze({ source: HAN, width: 42, cps: 20, instruction: MANDARIN_TRANSLATION_MODULES["cdrama-subtitles"].instruction }),
  "en-zh": Object.freeze({ source: LATIN, width: 20, cps: 12, instruction: "Translate English short-drama dialogue into natural, speakable Mandarin Chinese in simplified characters. Preserve character identities, relationships, emotional force, numbers, and scene meaning. Use the approved series terminology and keep each numbered subtitle cue aligned. Do not turn a character name into a title. Keep protected subtitle markup exactly." }),
});

const encode = (value) => new TextEncoder().encode(value);
const hex = (bytes) => [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
async function sha256(value) { return hex(await crypto.subtle.digest("SHA-256", encode(value))); }
const json = (value) => `${JSON.stringify(value)}\n`;
const now = () => new Date().toISOString();

function bucketOf(env) {
  const bucket = env?.CDRAMA_TRANSLATIONS;
  if (typeof bucket?.get !== "function" || typeof bucket?.put !== "function") throw new Error("CDRAMA_TRANSLATIONS durable store is unbound");
  return bucket;
}

function seriesKeyOf(body) {
  if (body.seriesKey === undefined) return undefined;
  if (typeof body.seriesKey !== "string" || !SERIES_KEY.test(body.seriesKey)) throw new TypeError("seriesKey must be the 43-character key returned with the first episode");
  return body.seriesKey;
}

function sourceDocumentOf(body, direction) {
  if (typeof body !== "object" || body === null || Array.isArray(body)) throw new TypeError("request body must be an object");
  const hasSubtitles = typeof body.subtitles === "string";
  const hasText = typeof body.text === "string";
  if (hasSubtitles === hasText) throw new TypeError("send exactly one of subtitles or text");
  const document = hasSubtitles ? parseSubtitles(body.subtitles) : {
    format: "text",
    cues: body.text.replace(/\r\n?/gu, "\n").split(/\n[ \t]*\n+/u).map((text) => ({ lines: [text.trim().replace(/\s*\n\s*/gu, " ")] })).filter((cue) => cue.lines[0] !== ""),
  };
  if (document.cues.length === 0) throw new RangeError("source has no dialogue");
  const segments = document.cues.map((cue) => cue.lines.join(" ").trim());
  const characters = [...segments.join("").replace(/\s/gu, "")].length;
  if (characters > MAX_SOURCE_CHARACTERS) throw new RangeError(`source exceeds ${MAX_SOURCE_CHARACTERS} characters`);
  if (!segments.some((segment) => DIRECTIONS[direction].source.test(segment))) throw new RangeError(`source contains no ${direction === "zh-en" ? "Mandarin" : "English"} text`);
  return document;
}

function requireDirection(direction) {
  if (!Object.hasOwn(DIRECTIONS, direction)) throw new RangeError("direction must be zh-en or en-zh");
  return direction;
}

export function admitCdramaEpisode(body, direction = body?.direction) {
  requireDirection(direction);
  seriesKeyOf(body);
  if (body.memory !== undefined || body.glossary !== undefined) throw new TypeError("use approvedTerms to seed a series or the review operation to update one; seriesKey carries terms into later episodes");
  if (body.seriesKey !== undefined && body.approvedTerms !== undefined) throw new TypeError("approvedTerms seeds a new series; change existing series terms through review");
  termsAfter([], termChangesOf(body.approvedTerms ?? []));
  if (body.episodeId !== undefined && (typeof body.episodeId !== "string" || !EPISODE_ID.test(body.episodeId))) throw new TypeError("episodeId must be an alphanumeric slug of at most 80 characters");
  if (body.productionContext !== undefined && (typeof body.productionContext !== "string" || [...body.productionContext].length > MAX_CONTEXT_CHARACTERS)) throw new RangeError(`productionContext must be at most ${MAX_CONTEXT_CHARACTERS} characters`);
  return sourceDocumentOf(body, direction);
}

export const admitCdramaZhEnEpisode = (body) => admitCdramaEpisode(body, "zh-en");
export const admitCdramaEnZhEpisode = (body) => admitCdramaEpisode(body, "en-zh");

function reverseHouseTerms() {
  const byTarget = new Map();
  for (const term of MANDARIN_TRANSLATION_MODULES["cdrama-subtitles"].glossary) {
    if (/[();<>]/u.test(term.target)) continue;
    const key = term.target.toLocaleLowerCase("en");
    byTarget.set(key, [...(byTarget.get(key) ?? []), term]);
  }
  return [...byTarget].filter(([, terms]) => terms.length === 1).map(([source, [term]]) => ({ source, target: term.source }));
}
const HOUSE_TERMS = Object.freeze({
  "zh-en": MANDARIN_TRANSLATION_MODULES["cdrama-subtitles"].glossary,
  "en-zh": Object.freeze(reverseHouseTerms()),
});

function activeTerms(state, direction) {
  const chosen = state.terms.filter((term) => term.direction === direction);
  const seen = new Set(chosen.map((term) => term.source.toLocaleLowerCase("en")));
  const reverseCandidates = new Map();
  for (const term of state.terms.filter((entry) => entry.direction !== direction)) {
    const source = term.target.trim();
    if (!source || /[\r\n<>]/u.test(source)) continue;
    const key = source.toLocaleLowerCase("en");
    reverseCandidates.set(key, [...(reverseCandidates.get(key) ?? []), { source, target: term.source }]);
  }
  const reversed = [];
  for (const [key, candidates] of reverseCandidates) {
    if (candidates.length !== 1 || seen.has(key)) continue;
    reversed.push(candidates[0]);
    seen.add(key);
  }
  const house = HOUSE_TERMS[direction].filter((term) => !seen.has(term.source.toLocaleLowerCase("en")));
  return [...chosen, ...reversed, ...house];
}

function targetLines(target, direction) {
  if (target.includes("\n") || /<[^>]+>|\{\\[^}]+\}/u.test(target)) return target.trim().split(/\n/u);
  if (direction === "zh-en") return wrapSubtitleText(target, DIRECTIONS[direction].width);
  const characters = [...target.trim()];
  const lines = [];
  for (let offset = 0; offset < characters.length; offset += DIRECTIONS[direction].width) lines.push(characters.slice(offset, offset + DIRECTIONS[direction].width).join(""));
  return lines.length ? lines : [""];
}

function cueChecks(sourceCue, target, direction, terms, format) {
  const source = sourceCue.lines.join(" ");
  const lines = format === "text" ? [target] : targetLines(target, direction);
  const issues = direction === "zh-en" ? [...segmentEvidence({
    source, english: target, terms,
    rules: MANDARIN_TRANSLATION_MODULES["cdrama-subtitles"].rules,
    ...(format === "text" ? {} : { cue: { ...sourceCue, lines }, lineWidth: DIRECTIONS[direction].width }),
  }).against] : [];
  if (direction === "en-zh") {
    if (LATIN.test(source) && !HAN.test(target)) issues.push({ check: "target-script-absent" });
    for (const term of terms) {
      if (source.toLocaleLowerCase("en").includes(term.source.toLocaleLowerCase("en")) && !target.includes(term.target)) {
        issues.push({ check: "approved-term", source: term.source, expected: term.target });
      }
    }
  }
  for (const mark of source.match(MARKUP) ?? []) if (!target.includes(mark)) issues.push({ check: "markup", expected: mark });
  if (format !== "text" && direction === "en-zh") {
    const measure = measureSubtitleCue({ ...sourceCue, lines });
    if (measure.longestLine > DIRECTIONS[direction].width || measure.charactersPerSecond > DIRECTIONS[direction].cps) {
      issues.push({ check: "fit", longestLine: measure.longestLine, charactersPerSecond: Math.round(measure.charactersPerSecond * 10) / 10, maxLine: DIRECTIONS[direction].width, maxCps: DIRECTIONS[direction].cps });
    }
  }
  return { lines, issues };
}

function render(document, targets, direction) {
  if (document.format === "text") return targets.join("\n\n");
  return serializeSubtitles({ ...document, cues: document.cues.map((cue, index) => ({ ...cue, lines: targetLines(targets[index], direction) })) });
}

function reviewIdentity(record) {
  return identifyJsonSemanticContent({ objectKind: REVIEW_KIND, value: record, witnessRoot: EMPTY_WITNESS_ROOT });
}

const reviewPath = (seriesId, token) => `series/${seriesId}/reviews/${encodeURIComponent(token)}.sen`;

async function reviewAt(bucket, seriesId, reference) {
  const object = await bucket.get(reviewPath(seriesId, reference.token));
  if (!object) throw new Error(`review record is unavailable: ${reference.id}`);
  const admitted = admitJsonSemanticContent({ bytes: new Uint8Array(await object.arrayBuffer()), token: reference.token, objectKind: REVIEW_KIND });
  const record = admitted.value;
  if (record.id !== reference.id || record.episodeId !== reference.episodeId || record.requestDigest !== reference.requestDigest) throw new Error(`review reference is inconsistent: ${reference.id}`);
  return record;
}

async function materialize(bucket, episode, state, includeKey, candidate) {
  const references = state.reviews.filter((review) => review.episodeId === episode.episodeId);
  const reviews = await Promise.all(references.map((reference) =>
    candidate?.id === reference.id ? candidate : reviewAt(bucket, episode.seriesId, reference)));
  const targets = [...episode.targets];
  let status = "draft";
  for (const review of reviews) {
    for (const correction of review.corrections) targets[correction.cueIndex] = correction.target;
    if (review.corrections.length) status = "draft";
    if (review.approve) status = "approved";
  }
  const terms = activeTerms(state, episode.direction);
  const cues = episode.document.cues.map((cue, index) => {
    const checked = cueChecks(cue, targets[index], episode.direction, terms, episode.document.format);
    return { index, ...(cue.id === undefined ? {} : { id: cue.id }), ...(cue.start === undefined ? {} : { start: cue.start, end: cue.end }), source: cue.lines.join(" "), target: targets[index], issues: checked.issues };
  });
  const issues = cues.flatMap((cue) => cue.issues.map((issue) => ({ cueIndex: cue.index, ...issue })));
  if (issues.length) status = "draft";
  return {
    kind: "cdrama.episode-translation/v1",
    seriesId: episode.seriesId,
    ...(includeKey ? { seriesKey: includeKey } : {}),
    episodeId: episode.episodeId,
    direction: episode.direction,
    format: episode.document.format,
    sourceDigest: episode.sourceDigest,
    productionContext: episode.productionContext,
    model: episode.models,
    termCandidates: episode.termCandidates,
    seriesRevision: state.revision,
    seriesTerms: state.terms,
    reviewHistory: reviews.map((review, index) => ({
      reviewId: review.id,
      token: references[index].token,
      recordedAt: review.recordedAt,
      corrections: review.corrections,
      terms: review.terms,
      approve: review.approve,
    })),
    status,
    reviewRequired: status !== "approved",
    translation: render(episode.document, targets, episode.direction),
    cues,
    checks: { scope: "mechanical-only", issues },
  };
}

async function loadSeries(bucket, seriesKey) {
  const seriesId = await sha256(seriesKey);
  const object = await bucket.get(`series/${seriesId}/state.json`);
  if (!object) throw new RangeError("unknown seriesKey");
  return { seriesId, object, state: await object.json() };
}

async function prepareSeries(approvedTerms = []) {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const seriesKey = btoa(String.fromCharCode(...bytes)).replace(/\+/gu, "-").replace(/\//gu, "_").replace(/=+$/u, "");
  const seriesId = await sha256(seriesKey);
  const state = { kind: "cdrama.series/v1", seriesId, createdAt: now(), revision: 0, terms: termsAfter([], approvedTerms), reviews: [] };
  return { seriesId, seriesKey, state };
}

async function translateEpisode(body, env, direction) {
  const document = admitCdramaEpisode(body, direction);
  const bucket = bucketOf(env);
  const seriesKey = seriesKeyOf(body);
  const series = seriesKey === undefined ? await prepareSeries(body.approvedTerms ?? []) : await loadSeries(bucket, seriesKey);
  const episodeId = body.episodeId ?? crypto.randomUUID();
  const sourceDigest = await sha256(JSON.stringify({ direction, document, productionContext: body.productionContext ?? "" }));
  const path = `series/${series.seriesId}/episodes/${episodeId}.json`;
  const existing = await bucket.get(path);
  if (existing) {
    const episode = await existing.json();
    if (episode.sourceDigest !== sourceDigest) throw new RangeError("episodeId already names different source material");
    return materialize(bucket, episode, series.state, series.seriesKey);
  }
  const segments = document.cues.map((cue) => cue.lines.join(" ").trim());
  const terms = activeTerms(series.state, direction);
  const targets = [...segments];
  const models = new Set();
  const termCandidates = [];
  for (let start = 0; start < segments.length; start += 60) {
    const pending = segments.slice(start, start + 60).map((segment, offset) => ({ segment, index: start + offset })).filter(({ segment }) => DIRECTIONS[direction].source.test(segment));
    if (!pending.length) continue;
    const relevantTerms = terms.filter((term) => pending.some(({ segment }) => segment.toLocaleLowerCase("en").includes(term.source.toLocaleLowerCase("en"))));
    const instruction = `${DIRECTIONS[direction].instruction}${body.productionContext ? `\n\nProduction context: ${body.productionContext}` : ""}`;
    const result = await translateNumberedBatch({ instruction, segments: pending.map(({ segment }) => segment), format: document.format, terms: relevantTerms, targetLanguage: direction === "zh-en" ? "English" : "Mandarin Chinese", askNames: direction === "zh-en" }, env);
    for (const model of result.model ? [result.model] : []) models.add(model);
    for (const name of result.names) {
      if (segments.some((segment) => segment.includes(name.source)) && !terms.some((term) => term.source === name.source || term.target.toLocaleLowerCase("en") === name.target.toLocaleLowerCase("en")) && !termCandidates.some((candidate) => candidate.source === name.source)) termCandidates.push({ direction, ...name });
    }
    pending.forEach(({ index }, offset) => { targets[index] = result.targets[offset]; });
  }
  if (seriesKey === undefined) {
    const saved = await bucket.put(`series/${series.seriesId}/state.json`, json(series.state), { onlyIf: new Headers({ "If-None-Match": "*" }), httpMetadata: { contentType: "application/json" } });
    if (!saved) throw new Error("could not create a unique series");
  }
  const episode = { kind: "cdrama.episode-source-and-draft/v1", seriesId: series.seriesId, episodeId, direction, sourceDigest, productionContext: body.productionContext ?? "", document, targets, termCandidates, models: [...models], createdAt: now(), seriesRevision: series.state.revision };
  const saved = await bucket.put(path, json(episode), { onlyIf: new Headers({ "If-None-Match": "*" }), httpMetadata: { contentType: "application/json" } });
  if (!saved) {
    const concurrent = await bucket.get(path);
    if (!concurrent) throw new Error("episode write failed");
    const actual = await concurrent.json();
    if (actual.sourceDigest !== sourceDigest) throw new RangeError("episodeId already names different source material");
    return materialize(bucket, actual, series.state, series.seriesKey);
  }
  return materialize(bucket, episode, series.state, series.seriesKey);
}

export const translateCdramaZhEnEpisode = (body, env) => translateEpisode(body, env, "zh-en");
export const translateCdramaEnZhEpisode = (body, env) => translateEpisode(body, env, "en-zh");

function termChangesOf(terms) {
  if (!Array.isArray(terms) || terms.length > MAX_TERMS || terms.some((item) => !Object.hasOwn(DIRECTIONS, item?.direction) || typeof item.source !== "string" || !item.source.trim() || typeof item.target !== "string" || !item.target.trim() || (item.replaces !== undefined && typeof item.replaces !== "string"))) throw new TypeError("terms must be { direction, source, target, replaces? } entries");
  return terms;
}

export function admitCdramaReview(body) {
  if (body === null || typeof body !== "object" || Array.isArray(body)) throw new TypeError("review must be an object");
  seriesKeyOf(body);
  if (body.seriesKey === undefined) throw new TypeError("seriesKey is required");
  if (typeof body.episodeId !== "string" || !EPISODE_ID.test(body.episodeId)) throw new TypeError("episodeId is required");
  if (body.reviewId !== undefined && (typeof body.reviewId !== "string" || !EPISODE_ID.test(body.reviewId))) throw new TypeError("reviewId must be an alphanumeric slug");
  const corrections = body.corrections ?? [];
  const terms = body.terms ?? [];
  if (!Array.isArray(corrections) || corrections.length > 500 || corrections.some((item) => !Number.isInteger(item?.cueIndex) || item.cueIndex < 0 || typeof item.target !== "string" || item.target.trim() === "")) throw new TypeError("corrections must be { cueIndex, target } entries");
  termChangesOf(terms);
  if (!corrections.length && !terms.length && body.approve !== true) throw new TypeError("review must correct a cue, approve a term, or approve the episode");
  if (body.approve !== undefined && typeof body.approve !== "boolean") throw new TypeError("approve must be boolean");
  return { corrections, terms };
}

export function admitCdramaRead(body) {
  if (body === null || typeof body !== "object" || Array.isArray(body)) throw new TypeError("read must be an object");
  if (seriesKeyOf(body) === undefined) throw new TypeError("seriesKey is required");
  if (typeof body.episodeId !== "string" || !EPISODE_ID.test(body.episodeId)) throw new TypeError("episodeId is required");
}

function termsAfter(existing, changes) {
  const terms = existing.map((term) => ({ ...term }));
  for (const change of changes) {
    const source = change.source.trim();
    const target = change.target.trim();
    const index = terms.findIndex((term) => term.direction === change.direction && term.source === source);
    if (index < 0) { terms.push({ direction: change.direction, source, target }); continue; }
    if (terms[index].target === target) continue;
    if (change.replaces !== terms[index].target) throw new RangeError(`changing approved ${source} requires replaces: ${terms[index].target}`);
    terms[index] = { direction: change.direction, source, target };
  }
  if (terms.length > MAX_TERMS) throw new RangeError(`series holds at most ${MAX_TERMS} approved terms`);
  return terms;
}

export async function readCdramaEpisode(body, env) {
  admitCdramaRead(body);
  const bucket = bucketOf(env);
  const series = await loadSeries(bucket, body.seriesKey);
  const object = await bucket.get(`series/${series.seriesId}/episodes/${body.episodeId}.json`);
  if (!object) throw new RangeError("unknown episodeId in series");
  return materialize(bucket, await object.json(), series.state);
}

export async function reviewCdramaEpisode(body, env) {
  const { corrections, terms } = admitCdramaReview(body);
  const bucket = bucketOf(env);
  const seriesId = await sha256(body.seriesKey);
  const episodeObject = await bucket.get(`series/${seriesId}/episodes/${body.episodeId}.json`);
  if (!episodeObject) throw new RangeError("unknown episodeId in series");
  const episode = await episodeObject.json();
  if (corrections.some((item) => item.cueIndex >= episode.document.cues.length)) throw new RangeError("correction names a cue outside the episode");
  const reviewId = body.reviewId ?? crypto.randomUUID();
  const requestDigest = await sha256(JSON.stringify({ episodeId: body.episodeId, corrections, terms, approve: body.approve === true }));
  const record = { id: reviewId, requestDigest, episodeId: body.episodeId, recordedAt: now(), corrections: corrections.map(({ cueIndex, target }) => ({ cueIndex, target: target.trim() })), terms: terms.map(({ direction, source, target, replaces }) => ({ direction, source: source.trim(), target: target.trim(), ...(replaces === undefined ? {} : { replaces }) })), approve: body.approve === true };
  const identity = reviewIdentity(record);
  const reference = { id: reviewId, episodeId: body.episodeId, requestDigest, token: identity.token, recordedAt: record.recordedAt };
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const { object, state } = await loadSeries(bucket, body.seriesKey);
    const prior = state.reviews.find((review) => review.id === reviewId);
    if (prior) {
      if (prior.requestDigest !== requestDigest) throw new RangeError("reviewId already names a different decision");
      return materialize(bucket, episode, state);
    }
    if (state.reviews.length >= MAX_REVIEWS) throw new RangeError(`series holds at most ${MAX_REVIEWS} reviews`);
    const updated = { ...state, revision: state.revision + 1, terms: termsAfter(state.terms, terms), reviews: [...state.reviews, reference] };
    const result = await materialize(bucket, episode, updated, undefined, record);
    if (body.approve === true && result.checks.issues.length) throw new RangeError("episode still has mechanical issues; correct them before approval");
    const stored = await bucket.put(reviewPath(seriesId, identity.token), identity.bytes, { onlyIf: new Headers({ "If-None-Match": "*" }), httpMetadata: { contentType: "application/sen+cbor" } });
    if (!stored) await reviewAt(bucket, seriesId, reference);
    const saved = await bucket.put(`series/${seriesId}/state.json`, json(updated), { onlyIf: { etagMatches: object.etag }, httpMetadata: { contentType: "application/json" } });
    if (saved) return result;
  }
  throw new Error("series changed concurrently; retry the review with the same reviewId");
}
