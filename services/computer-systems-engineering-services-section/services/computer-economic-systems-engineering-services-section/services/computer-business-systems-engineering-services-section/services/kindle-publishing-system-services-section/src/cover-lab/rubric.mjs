import { addressedRecord } from "./records.mjs";

export const FROZEN_RUBRIC = addressedRecord("CoverSelectionRubric", 1, {
  frozenAt: "2026-09-29T00:00:00.000Z",
  dimensions: [
    { id: "thumbnail-legibility", weight: 0.25, protocol: "inspect at 100x160, 200x320, and grayscale" },
    { id: "genre-signal", weight: 0.22, protocol: "identify contemporary slow-burn romance before metadata" },
    { id: "category-differentiation", weight: 0.18, protocol: "constrained choice against sampled category thumbnails" },
    { id: "story-fit", weight: 0.25, protocol: "score only against story-bible evidence" },
    { id: "defect-freedom", weight: 0.10, protocol: "AI text, anatomy, border, artifact, and look-alike checks" },
  ],
  rejectionRules: ["ai-text-artifact", "hand-or-face-defect", "known-cover-hamming-distance-under-8", "kdp-spec-failure"],
  judgeRule: "three-or-more-different-model-families; generating family cannot be sole judge",
});

function pearson(left, right) {
  if (left.length !== right.length || left.length < 2) return 0;
  const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
  const lm = mean(left), rm = mean(right);
  const numerator = left.reduce((sum, value, index) => sum + (value - lm) * (right[index] - rm), 0);
  const denominator = Math.sqrt(left.reduce((sum, value) => sum + (value - lm) ** 2, 0) * right.reduce((sum, value) => sum + (value - rm) ** 2, 0));
  return denominator ? numerator / denominator : 0;
}

export function calibrateJudges(calibrationRows) {
  const families = [...new Set(calibrationRows.map(({ family }) => family))].sort();
  if (families.length < 3) throw new TypeError("at least three judge families are required");
  const errors = Object.fromEntries(families.map((family) => [family, calibrationRows.filter((row) => row.family === family).sort((a, b) => a.item.localeCompare(b.item)).map(({ predicted, observed }) => predicted - observed)]));
  const correlations = [];
  for (let left = 0; left < families.length; left += 1) for (let right = left + 1; right < families.length; right += 1) correlations.push({ left: families[left], right: families[right], correlation: pearson(errors[families[left]], errors[families[right]]) });
  const meanPositiveCorrelation = correlations.length ? correlations.reduce((sum, row) => sum + Math.max(0, row.correlation), 0) / correlations.length : 0;
  const effectiveSampleSize = families.length / (1 + (families.length - 1) * meanPositiveCorrelation);
  return Object.freeze({ families, correlations, effectiveSampleSize });
}

export function scoreCandidate(judgments) {
  const byFamily = new Map();
  for (const judgment of judgments) byFamily.set(judgment.family, judgment);
  if (byFamily.size < 3) throw new TypeError("candidate needs judgments from at least three model families");
  const score = [...byFamily.values()].reduce((total, judgment) => total + FROZEN_RUBRIC.dimensions.reduce((subtotal, dimension) => subtotal + Number(judgment.scores[dimension.id]) * dimension.weight, 0), 0) / byFamily.size;
  return Object.freeze({ score, families: [...byFamily.keys()].sort() });
}

export function runThumbnailTournament(candidates, choices) {
  const allowed = new Set(candidates.map(({ id }) => id)), wins = Object.fromEntries(candidates.map(({ id }) => [id, 0]));
  for (const choice of choices) {
    if (!allowed.has(choice.winner) || !choice.field.includes(choice.winner) || choice.field.some((id) => !allowed.has(id))) throw new TypeError("invalid constrained choice");
    wins[choice.winner] += 1 / choice.field.length;
  }
  return Object.freeze(Object.entries(wins).map(([id, attentionAdjustedWins]) => ({ id, attentionAdjustedWins })).sort((a, b) => b.attentionAdjustedWins - a.attentionAdjustedWins || a.id.localeCompare(b.id)));
}
