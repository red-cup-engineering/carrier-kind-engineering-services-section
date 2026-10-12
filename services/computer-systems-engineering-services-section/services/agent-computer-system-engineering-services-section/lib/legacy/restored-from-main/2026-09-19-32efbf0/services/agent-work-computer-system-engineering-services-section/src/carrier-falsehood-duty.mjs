import { readMarkdownStructure } from "@red-cup-engineering/markdown-engineering-services-section/read-markdown-structure";
// Pure helpers for the carrier-falsehood hand: a duty admitted by
// admit-friction.mjs, whose text is exactly `${carrier} states
// ${JSON.stringify(observed)} but on disk ${expected}. Repair: replace the
// falsehood at its owner with the truth; never annotate it.`
// (session-frictions.mjs's taskFromFrictionReport). This module reads that
// shape, finds the smallest enclosing Markdown section by heading
// structure, and gates a provider's replacement deterministically. All I/O
// (reading the carrier, resolving links, writing it back) stays in the app.
import { isAbsolute, join, normalize, sep } from "node:path";

const STATES_MARKER = " states ";
const BUT_ON_DISK_MARKER = " but on disk ";
const REPAIR_SUFFIX = ". Repair: replace the falsehood at its owner with the truth; never annotate it.";

/**
 * Reads `{carrier, observed, expected}` off a carrier-falsehood duty's text, exactly as
 * `taskFromFrictionReport` wrote it (`observed` is `JSON.stringify`-escaped in the text; this
 * un-escapes it via `JSON.parse` rather than a second bespoke unescaper).
 * @param {string} text - a duty's `text` field.
 * @returns {{carrier: string, observed: string, expected: string}|null} null when the text does not match the template.
 */
export function parseCarrierFalsehoodDutyText(text) {
  if (typeof text !== "string" || !text.endsWith(REPAIR_SUFFIX)) return null;
  const withoutSuffix = text.slice(0, -REPAIR_SUFFIX.length);
  const statesIndex = withoutSuffix.indexOf(STATES_MARKER);
  if (statesIndex < 0) return null;
  const carrier = withoutSuffix.slice(0, statesIndex);
  const afterStates = withoutSuffix.slice(statesIndex + STATES_MARKER.length);
  if (!afterStates.startsWith('"')) return null;
  const butOnDiskIndex = afterStates.indexOf(`"${BUT_ON_DISK_MARKER}`);
  if (butOnDiskIndex < 0) return null;
  let observed;
  try {
    observed = JSON.parse(afterStates.slice(0, butOnDiskIndex + 1));
  } catch {
    return null;
  }
  const expected = afterStates.slice(butOnDiskIndex + 1 + BUT_ON_DISK_MARKER.length);
  if (carrier === "" || typeof observed !== "string" || observed === "" || expected === "") return null;
  return { carrier, observed, expected };
}

/**
 * Candidate absolute filesystem paths for a duty's `carrier` reference: itself when it already
 * names a `.md` file, else itself, `<carrier>/README.md`, and `<carrier>.md` in that order.
 * @param {{carrier: string, repositoryRoot: string}} options
 * @returns {readonly string[]}
 */
export function candidateCarrierPaths({ carrier, repositoryRoot }) {
  if (typeof carrier !== "string" || carrier === "" || typeof repositoryRoot !== "string" || repositoryRoot === "") return [];
  const absolute = normalize(isAbsolute(carrier) ? carrier : join(repositoryRoot, carrier));
  if (absolute.endsWith(".md")) return Object.freeze([absolute]);
  return Object.freeze([absolute, join(absolute, "README.md"), `${absolute}.md`]);
}

/**
 * Whether a resolved carrier path is one this hand may write: a Markdown file under the
 * repository's `lib/`, outside `lib/legacy`.
 * @param {{path: string, repositoryRoot: string}} options
 * @returns {boolean}
 */
export function isWritableCarrierPath({ path, repositoryRoot }) {
  if (typeof path !== "string" || typeof repositoryRoot !== "string") return false;
  const libRoot = `${join(repositoryRoot, "lib")}${sep}`;
  if (!path.startsWith(libRoot)) return false;
  if (path.includes(`${sep}legacy${sep}`)) return false;
  return path.endsWith(".md");
}

/**
 * The smallest Markdown section (by heading structure) containing `needle`: from the nearest
 * heading at or before the match down to (not including) the next heading of the same or a
 * shallower level.
 * @param {string} text - the carrier's full Markdown text.
 * @param {string} needle - the observed falsehood, verbatim.
 * @returns {{heading: string, level: number, startOffset: number, endOffset: number, sectionText: string}|null}
 *   null when `needle` is not found, or found before any heading.
 */
export function smallestEnclosingMarkdownSection(text, needle) {
  if (typeof text !== "string" || typeof needle !== "string" || needle === "") return null;
  const needleIndex = text.indexOf(needle);
  if (needleIndex < 0) return null;
  const lines = [...text.matchAll(/[^\r\n]*(?:\r\n|\n|\r|$)/gu)].filter(({ 0: line }) => line !== "");
  const needleLine = lines.findIndex(({ index, 0: line }) => needleIndex >= index && needleIndex < index + line.length) + 1;
  const heading = readMarkdownStructure(text).headings.findLast(({ line, endLine }) => line <= needleLine && needleLine <= endLine);
  if (!heading) return null;
  const startOffset = lines[heading.line - 1].index;
  const endOffset = lines[heading.endLine]?.index ?? text.length;
  return Object.freeze({
    heading: heading.title,
    level: heading.level,
    startOffset,
    endOffset,
    sectionText: text.slice(startOffset, endOffset),
  });
}

/**
 * Splices a replacement section into a carrier's full text at one already-located section.
 * @param {string} fullText
 * @param {{startOffset: number, endOffset: number}} section
 * @param {string} replacementText
 * @returns {string}
 */
export function spliceMarkdownSection(fullText, section, replacementText) {
  const replaced = fullText.slice(section.startOffset, section.endOffset);
  const separator = replaced.match(/\n*$/u)?.[0] ?? "";
  const body = replacementText.replace(/\n*$/u, "");
  return fullText.slice(0, section.startOffset) + body + (separator || "\n") + fullText.slice(section.endOffset);
}

/**
 * The deterministic gate on a provider's replacement section, before any splice or link check:
 * non-empty, heading unchanged, and the observed falsehood string no longer present.
 * @param {object} options
 * @param {{heading: string}} options.section
 * @param {string} options.replacementText
 * @param {string} options.observed
 * @returns {readonly string[]} failure codes; empty means the gate passed.
 */
export function sectionReplacementFailures({ section, replacementText, observed }) {
  if (typeof replacementText !== "string" || replacementText.trim() === "") return Object.freeze(["REPLACEMENT_EMPTY"]);
  const failures = [];
  const heading = readMarkdownStructure(replacementText.trim()).headings[0];
  if (!heading || heading.line !== 1 || heading.title !== section.heading) failures.push("HEADING_MISMATCH");
  if (replacementText.includes(observed)) failures.push("FALSEHOOD_STILL_PRESENT");
  return Object.freeze(failures);
}

/**
 * Forms the inference demand that asks a provider to rewrite one carrier's smallest enclosing
 * Markdown section to state the expected truth instead of the observed falsehood.
 * @param {object} options
 * @param {string} options.carrier - the duty's named carrier, verbatim.
 * @param {{heading: string, sectionText: string}} options.section
 * @param {string} options.expected
 * @param {object|null} [options.refusal] - the previous attempt's gate failure, if any.
 * @returns {object} a bounded inference demand.
 * @throws {TypeError} when carrier or expected is missing.
 */
export function formCarrierSectionReplacementDemand({ carrier, section, expected, refusal = null }) {
  if (typeof carrier !== "string" || carrier === "") throw new TypeError("carrier is required");
  if (typeof expected !== "string" || expected === "") throw new TypeError("expected is required");
  const objective = `Rewrite this one Markdown section of ${carrier} so it states the truth instead of the falsehood, keeping its heading unchanged. Reply with the replacement section only: keep the original heading declaration, there is no enclosing code fence, and nothing follows the section's last line.`;
  const sections = [
    `## Current section\n${section.sectionText}`,
    `## Expected truth\n${expected}`,
  ];
  if (refusal !== null && refusal !== undefined) {
    sections.push(`## Previous attempt was refused by the deterministic gate; fix exactly this\n${JSON.stringify(refusal)}`);
  }
  return Object.freeze({
    objective,
    context: sections.join("\n\n"),
    workType: "inquiry",
    taskClass: "agent-work.carrier-section-replacement.v1",
    zeroCashOnly: true,
    enforceProviderSchema: false,
  });
}

/**
 * The discharge record that closes a carrier-falsehood duty with the repaired carrier as evidence.
 * @param {object} options
 * @param {{scope: string, intent: string}} options.duty
 * @param {{id: string, revision: string}} options.producer
 * @param {string} options.carrierPath
 * @param {number} options.linksChecked
 * @returns {object} a metroplat.work.discharge record.
 */
export function dischargeOfCarrierRepair({ duty, producer, carrierPath, linksChecked }) {
  return Object.freeze({
    kind: "metroplat.work.discharge",
    id: `discharge-${duty.scope}`,
    intent: duty.intent,
    producer,
    scope: duty.scope,
    text: `replaced the falsehood at its owner ${carrierPath} with a market-written section, gated on heading match, falsehood absence, and ${linksChecked} resolved link(s)`,
    evidence: Object.freeze([`carrier:${carrierPath}`, `links-checked:${linksChecked}`]),
  });
}
