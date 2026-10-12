// Founder utterance reading is a pure, non-authorizing boundary.  It keeps
// the transcript record intact, admits explicit BCP 14 conditions
// deterministically, and makes any model reading a provisional proposal.

export const FOUNDER_UTTERANCE_READING_TYPE = "agent-work.founder-utterance-reading";
export const FOUNDER_UTTERANCE_PROPOSAL_TYPE = "agent-work.founder-utterance-proposal";
export const FOUNDER_UTTERANCE_INTERPRETATION_TASK_CLASS = "agent-work.founder-utterance-interpretation.v1";

export const FOUNDER_UTTERANCE_INTERPRETATION_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: ["type", "version", "source", "interpretations"],
  properties: {
    type: { const: "FounderUtteranceInterpretation" },
    version: { const: 1 },
    source: {
      type: "object",
      additionalProperties: false,
      required: ["s", "n"],
      properties: { s: { type: "string", minLength: 1 }, n: { type: "integer", minimum: 0 } },
    },
    interpretations: {
      type: "array",
      maxItems: 16,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["kind", "sourceText", "proposal"],
        properties: {
          kind: { enum: ["requirement-interpretation", "correction-interpretation", "open-question"] },
          sourceText: { type: "string", minLength: 1, maxLength: 4000 },
          proposal: { type: "string", minLength: 1, maxLength: 4000 },
        },
      },
    },
  },
});

function sourceOf(utterance) {
  if (utterance === null || typeof utterance !== "object") throw new TypeError("utterance must be an object");
  for (const key of ["s", "t", "cwd", "n", "text", "source", "line"]) {
    if (utterance[key] === undefined || utterance[key] === null || utterance[key] === "") throw new TypeError(`utterance.${key} is required`);
  }
  if (typeof utterance.s !== "string" || typeof utterance.t !== "string" || typeof utterance.cwd !== "string" || typeof utterance.text !== "string" || typeof utterance.source !== "string") throw new TypeError("utterance source fields must be strings");
  if (!Number.isInteger(utterance.n) || utterance.n < 0 || !Number.isInteger(utterance.line) || utterance.line < 1) throw new TypeError("utterance n and line must be non-negative and one-based integers");
  return Object.freeze({ s: utterance.s, t: utterance.t, cwd: utterance.cwd, n: utterance.n, source: utterance.source, line: utterance.line });
}

function freezeBcpEntry(entry, source) {
  return Object.freeze({ ...entry, source: Object.freeze({ ...source, line: source.line + entry.line - 1 }) });
}

/**
 * Reads one persisted FounderUtterance without changing its meaning or
 * granting it operational authority.  `readBcp14Requirements` and
 * `settleLanguage` are supplied by their actual semantic owners.
 */
export function readFounderUtterance({ utterance, readBcp14Requirements, settleLanguage }) {
  const source = sourceOf(utterance);
  if (typeof readBcp14Requirements !== "function") throw new TypeError("readBcp14Requirements must be a function");
  if (typeof settleLanguage !== "function") throw new TypeError("settleLanguage must be a function");
  const bcp14 = readBcp14Requirements({ text: utterance.text });
  if (bcp14?.type !== "Bcp14RequirementSet" || !Array.isArray(bcp14.requirements) || !Array.isArray(bcp14.refusals)) throw new TypeError("readBcp14Requirements returned no Bcp14RequirementSet");
  const language = settleLanguage(utterance.text);
  return Object.freeze({
    type: FOUNDER_UTTERANCE_READING_TYPE,
    version: 1,
    source,
    text: utterance.text,
    language,
    requirements: Object.freeze(bcp14.requirements.map((entry) => freezeBcpEntry(entry, source))),
    refusals: Object.freeze(bcp14.refusals.map((entry) => freezeBcpEntry(entry, source))),
    needsProvisionalInterpretation: bcp14.requirements.length === 0,
  });
}

/** Forms a zero-cash, schema-constrained request for a *proposal*, never a specification or accepted direction. */
export function formFounderUtteranceInterpretationDemand(reading) {
  if (reading?.type !== FOUNDER_UTTERANCE_READING_TYPE || reading.version !== 1) throw new TypeError("a FounderUtteranceReading@1 is required");
  return Object.freeze({
    taskClass: FOUNDER_UTTERANCE_INTERPRETATION_TASK_CLASS,
    workType: "inquiry",
    zeroCashOnly: true,
    enforceProviderSchema: true,
    outputSchema: FOUNDER_UTTERANCE_INTERPRETATION_SCHEMA,
    objective: "Read one Founder utterance. Return only source-anchored provisional interpretations or open questions. Do not claim acceptance, invent facts, rewrite a condition, execute work, or call the result a specification.",
    context: JSON.stringify({ source: reading.source, text: reading.text, deterministicRequirements: reading.requirements, deterministicRefusals: reading.refusals }),
  });
}

function candidateValue(result) {
  if (result === null || typeof result !== "object") return null;
  for (const value of [result.candidate, result.value, result.output, result.delivered?.candidate]) {
    if (value && typeof value === "object") return value;
    if (typeof value === "string") {
      try { return JSON.parse(value); } catch { /* a non-JSON provider result is refused below */ }
    }
  }
  return null;
}

/**
 * Applies the receiver's deterministic source gate to an inference result.
 * A passing record is still a proposal: only its source anchors are accepted.
 */
export function assayFounderUtteranceInterpretation({ reading, result }) {
  if (reading?.type !== FOUNDER_UTTERANCE_READING_TYPE || reading.version !== 1) throw new TypeError("a FounderUtteranceReading@1 is required");
  const candidate = candidateValue(result);
  const refusals = [];
  if (candidate?.type !== "FounderUtteranceInterpretation" || candidate?.version !== 1) refusals.push("candidate is not FounderUtteranceInterpretation@1");
  if (candidate?.source?.s !== reading.source.s || candidate?.source?.n !== reading.source.n) refusals.push("candidate source does not name this Founder utterance");
  if (!Array.isArray(candidate?.interpretations)) refusals.push("candidate interpretations must be an array");
  const interpretations = Array.isArray(candidate?.interpretations) ? candidate.interpretations : [];
  if (interpretations.length > 16) refusals.push("candidate has more than 16 interpretations");
  for (const [index, interpretation] of interpretations.entries()) {
    if (interpretation === null || typeof interpretation !== "object") { refusals.push(`interpretation ${index} is not an object`); continue; }
    if (!["requirement-interpretation", "correction-interpretation", "open-question"].includes(interpretation.kind)) refusals.push(`interpretation ${index} has no admitted kind`);
    if (typeof interpretation.sourceText !== "string" || !reading.text.includes(interpretation.sourceText)) refusals.push(`interpretation ${index} does not quote a contiguous source excerpt`);
    if (typeof interpretation.proposal !== "string" || interpretation.proposal.trim() === "") refusals.push(`interpretation ${index} has no proposal`);
  }
  if (refusals.length > 0) return Object.freeze({ type: FOUNDER_UTTERANCE_PROPOSAL_TYPE, version: 1, source: reading.source, accepted: false, refusals: Object.freeze(refusals) });
  return Object.freeze({
    type: FOUNDER_UTTERANCE_PROPOSAL_TYPE,
    version: 1,
    source: reading.source,
    accepted: true,
    interpretations: Object.freeze(interpretations.map((interpretation) => Object.freeze({ kind: interpretation.kind, sourceText: interpretation.sourceText, proposal: interpretation.proposal }))),
  });
}
