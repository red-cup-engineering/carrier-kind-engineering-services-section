// A ready duty on the rail becomes one bounded inference demand: write the
// closed Markdown work order that fabricates the operation package closing
// it. The demand is pure data; the fabrication line's translator is the gate.
import { basename } from "node:path";
import { JSNODE_PACKAGE_DIALECT_RULES } from "@red-cup-engineering/jsnode-package-services-section/jsnode-package-dialect";

export const WORK_ORDER_TASK_CLASS = "agent-work.duty-work-order.v1";

/** The market's output contract for a work order: natural text, bound by the line's translator, never JSON-wrapped (small models cannot JSON-escape a whole Markdown document). */
export const WORK_ORDER_OUTPUT_CONTRACT = Object.freeze({ outputSchema: undefined, enforceProviderSchema: false });


/**
 * Forms the inference demand that asks a provider for the work order closing one duty.
 * @param {object} options
 * @param {{scope: string, text?: string, intent?: string}} options.duty - one ready item from the rail's dispatch readout.
 * @param {string} options.dialectExample - a work order the line has already admitted, verbatim.
 * @param {object|null} [options.refusal] - the translator's or fabricator's refusal from the previous attempt, if any.
 * @param {string} [options.workType] - the market work type to solicit under.
 * @returns {{objective: string, context: string, workType: string, taskClass: string, enforceProviderSchema: false}}
 * @throws {TypeError} when the duty has no scope or the dialect example is empty.
 */
export function formDutyWorkOrderDemand({ duty, dialectExample, workContext = null, refusal = null, workType = "inquiry" }) {
  if (typeof duty?.scope !== "string" || duty.scope === "") throw new TypeError("duty.scope is required");
  if (typeof dialectExample !== "string" || dialectExample.trim() === "") throw new TypeError("dialectExample is required");
  const need = typeof duty.text === "string" && duty.text !== "" ? duty.text : duty.scope;
  const objective = `Write one closed Markdown work order that fabricates a JSNode operation package closing this duty: ${duty.scope}. Reply with the Markdown document only: the first character of the reply is the title's "#", there is no code fence around the document, and nothing follows its last Traceability bullet.`;
  const sections = [
    `## Duty\n${need}`,
    `## Work and governing records
${JSON.stringify(workContext ?? { duty })}`,
    `## Dialect\n${JSNODE_PACKAGE_DIALECT_RULES.map((rule) => `- ${rule}`).join("\n")}`,
    `## Admitted example (copy its structure exactly)\n${dialectExample.trim()}`,
  ];
  sections.push("Use the supplied governing records and their locators for requirements and constraints. Do not treat the example as authority. Keep domain algebra in src, atomic JSON operations in scripts, and CLI composition in apps. Package identity belongs to the topic owner and is independent of the artifact title. Fabrication is development work; publication and activation require their own evidence.");
  if (refusal !== null && refusal !== undefined) {
    sections.push(`## Previous attempt was refused by the deterministic gate; fix exactly this\n${JSON.stringify(refusal)}`);
  }
  return Object.freeze({
    objective,
    context: sections.join("\n\n"),
    workType,
    taskClass: WORK_ORDER_TASK_CLASS,
    zeroCashOnly: true,
    enforceProviderSchema: false,
  });
}

/**
 * The work order text carried by an inference result, wherever the market's result shape puts it.
 * @param {unknown} result - an inference work result.
 * @returns {string|null} the Markdown, or null when the result carries none.
 */
export function workOrderOfInferenceResult(result) {
  if (result === null || typeof result !== "object") return null;
  const candidates = [result.candidate, result.value, result.output, result.delivered?.candidate];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim() !== "") return maybeUnwrap(candidate);
    if (candidate && typeof candidate === "object" && typeof candidate.workOrder === "string" && candidate.workOrder.trim() !== "") return candidate.workOrder;
  }
  return null;
}

function maybeUnwrap(text) {
  let trimmed = text.trim();
  const fenced = /^```[a-zA-Z-]*\n([\s\S]*?)\n```\s*$/u.exec(trimmed);
  if (fenced) trimmed = fenced[1].trim();
  if (!trimmed.startsWith("{")) return trimmed;
  try {
    const parsed = JSON.parse(trimmed);
    return typeof parsed?.workOrder === "string" ? parsed.workOrder : trimmed;
  } catch {
    return trimmed;
  }
}

/**
 * The section (or other named) directory a duty's text points a born package at, read off the
 * `<section-dir-name>/scripts/<file>.mjs needed "..."` shape a missing-capability duty's text carries.
 * @param {string} text - a duty's `text` field.
 * @returns {string|null} the leading directory-name segment, or null when the text has no such shape.
 */
export function sectionDirectoryNameOfDutyText(text) {
  if (typeof text !== "string") return null;
  const match = /^([\w.-]+)\/scripts\/[\w.-]+\.mjs needed /u.exec(text);
  return match ? match[1] : null;
}

/**
 * Resolves a directory basename to exactly one candidate directory. Pure: no filesystem access —
 * the caller lists candidates once (a directory walk is I/O and stays in the app).
 * @param {string} name - a directory basename, e.g. "key-management-services-section".
 * @param {readonly string[]} candidateDirectories - absolute directory paths to search by basename.
 * @returns {string|null} the one matching directory, or null when none or more than one match (ambiguous).
 */
export function resolveSectionDirectory(name, candidateDirectories) {
  if (typeof name !== "string" || name === "" || !Array.isArray(candidateDirectories)) return null;
  const matches = candidateDirectories.filter((dir) => basename(dir) === name);
  return matches.length === 1 ? matches[0] : null;
}

/**
 * The refusal fed back to the provider when a candidate package name is already taken on the registry.
 * @param {{packageName: string, version: string}} options
 * @returns {{code: "PACKAGE_NAME_TAKEN", packageName: string, matches: readonly string[]}}
 */
export function nameTakenRefusal({ packageName, version }) {
  return Object.freeze({ code: "PACKAGE_NAME_TAKEN", packageName, version, matches: Object.freeze([packageName]) });
}

/**
 * The refusal fed back to the provider when the candidate operation duplicates a consumer-backed
 * capability the workspace duplication analysis already knows about.
 * @param {readonly string[]} matches - the matching, consumer-backed package names.
 * @returns {{code: "DUPLICATE_CAPABILITY", matches: readonly string[]}}
 */
export function duplicateCapabilityRefusal(matches) {
  return Object.freeze({ code: "DUPLICATE_CAPABILITY", matches: Object.freeze([...matches]) });
}

/**
 * Whether a refusal names an existing capability the line refused to duplicate, rather than a
 * translation or fabrication defect — the outcome this attempt closes with is `duplicate-refused`.
 * @param {object|null} refusal
 * @returns {boolean}
 */
export function isDuplicateRefusal(refusal) {
  return refusal?.code === "PACKAGE_NAME_TAKEN" || refusal?.code === "DUPLICATE_CAPABILITY";
}

/**
 * The discharge record that closes a duty on the rail with a fabrication receipt as its evidence.
 * @param {object} options
 * @param {{scope: string, intent: string}} options.duty
 * @param {{packageName: string, packageVersion: string, destination?: string, registryPublication?: object|null}} options.receipt - the line's flat fabrication receipt.
 * @param {{id: string, revision: string}} options.producer - the admitting package's name and version.
 * @param {string} options.workOrderPath - where the admitted work order was written.
 * @returns {object} a metroplat.work.discharge record.
 */
export function dischargeOfFabrication({ duty, receipt, producer, workOrderPath }) {
  const published = receipt.registryPublication ? ` published to ${receipt.registryPublication.registry}` : "";
  return Object.freeze({
    kind: "metroplat.work.discharge",
    id: `discharge-${duty.scope}`,
    intent: duty.intent,
    producer,
    scope: duty.scope,
    text: `fabricated ${receipt.packageName}@${receipt.packageVersion}${published} from a provider-written work order under the line's deterministic gates`,
    evidence: [
      `work-order:${workOrderPath}`,
      `package:${receipt.packageName}@${receipt.packageVersion}`,
      ...(receipt.destination ? [`destination:${receipt.destination}`] : []),
      ...(receipt.registryPublication ? [`registry:${receipt.registryPublication.registry}`] : []),
    ],
  });
}
