const KEYS = ["negativeEvidence", "positiveEvidence"];

function fail(code, message) { const error = new Error(message); error.code = code; throw error; }

function exactKeys(value, keys) {
  return value && Object.getPrototypeOf(value) === Object.prototype
    && Object.keys(value).sort().join("\u0000") === [...keys].sort().join("\u0000");
}

export function four(positiveEvidence, negativeEvidence) {
  if (typeof positiveEvidence !== "boolean" || typeof negativeEvidence !== "boolean") {
    fail("malformed-four", "FOUR requires explicit Boolean positiveEvidence and negativeEvidence bits");
  }
  return Object.freeze({ positiveEvidence, negativeEvidence });
}

export function validateFour(value) {
  if (!exactKeys(value, KEYS)) fail("malformed-four", "FOUR must expose exactly positiveEvidence and negativeEvidence");
  return four(value.positiveEvidence, value.negativeEvidence);
}

export function joinKnowledge(left, right) {
  const a = validateFour(left), b = validateFour(right);
  return four(a.positiveEvidence || b.positiveEvidence, a.negativeEvidence || b.negativeEvidence);
}

export function isKnowledgeCover(before, after) {
  const a = validateFour(before), b = validateFour(after);
  const positive = !a.positiveEvidence && b.positiveEvidence && a.negativeEvidence === b.negativeEvidence;
  const negative = !a.negativeEvidence && b.negativeEvidence && a.positiveEvidence === b.positiveEvidence;
  return positive !== negative;
}

export function witnessBit(before, after) {
  if (!isKnowledgeCover(before, after)) fail("not-one-wit", "a WIT must be exactly one 0→1 cover transition in the FOUR knowledge order");
  return before.positiveEvidence === after.positiveEvidence ? "negativeEvidence" : "positiveEvidence";
}

// Pure placement-independent RMN die material.
export const FOUR = Object.freeze({
  neither: four(false, false),
  true: four(true, false),
  false: four(false, true),
  both: four(true, true)
});
