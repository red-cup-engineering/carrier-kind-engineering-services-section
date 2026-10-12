/**
 * Source-bound visibility observations and derived classification.
 *
 * The caller supplies observable boundary facts, not a conclusion such as
 * "verified-empty". The classification is derived conservatively so partial,
 * inaccessible, unsupported, or errored views cannot become absence evidence.
 */

export const AGENT_VISIBILITY_CLASSES = Object.freeze([
  "verified-present",
  "verified-empty",
  "inaccessible",
  "unenumerable",
  "unsupported",
  "filtered-partial",
  "error-degraded",
  "not-applicable",
]);

function nonempty(value, label) {
  if (value.trim().length === 0) throw new TypeError(label + ": expected non-empty string");
  return value;
}

function count(value) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError("visibility resultCount: expected nonnegative safe integer");
  }
  return value;
}

function sourceMode(value) {
  if (
    value !== "canonical"
    && value !== "degraded-projection"
    && value !== "provider-native"
  ) {
    throw new TypeError("visibility sourceMode: unexpected value");
  }
  return value;
}

/**
 * Derive one visibility classification from an admitted observation.
 *
 * Precedence deliberately favors obstructions over absence:
 * not-applicable -> unsupported -> error -> inaccessible -> unenumerable.
 * Positive presence is then admissible from any successfully readable result.
 * Only a complete enumerable zero-result observation becomes VERIFIED_EMPTY.
 * Otherwise the result is FILTERED/PARTIAL.
 */
export function agentVisibilityReading(observation) {
  const sourceRef = nonempty(observation.sourceRef, "visibility sourceRef");
  const mode = sourceMode(observation.sourceMode);
  const scope = nonempty(observation.scope, "visibility scope");
  const operation = nonempty(observation.operation, "visibility operation");
  const resultCount = count(observation.resultCount);

  let classification;
  if (!observation.applicable) classification = "not-applicable";
  else if (!observation.supported) classification = "unsupported";
  else if (observation.error !== undefined) classification = "error-degraded";
  else if (!observation.accessible) classification = "inaccessible";
  else if (!observation.enumerable) classification = "unenumerable";
  else if (resultCount > 0) classification = "verified-present";
  else if (observation.complete) classification = "verified-empty";
  else classification = "filtered-partial";

  return Object.freeze({
    kind: "organizing.cell.visibility-reading",
    sourceRef,
    sourceMode: mode,
    scope,
    operation,
    classification,
    evidence: Object.freeze([
      ...observation.evidence,
      "visibility-source:" + sourceRef,
      "visibility-source-mode:" + mode,
      "visibility-operation:" + operation,
      "visibility-result-count:" + resultCount,
      "visibility-complete:" + observation.complete,
    ]),
  });
}

