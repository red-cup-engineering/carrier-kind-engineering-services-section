/**
 * Bounded-stake aggression sizing (economics-science-services-section's
 * 2026-09-01 growth-policy note, corrected same night): a bankroll-
 * preservation Kelly haircut is the WRONG utility function for a small,
 * walled, re-seedable risk stake -- losing it is not ruin. Size HARD
 * toward the measured edge (full Kelly or beyond); the only hard cap is
 * structural (never exceed the unlevered stake -- see risk-envelope.mjs).
 */

function requireFiniteNumber(value, label) {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new TypeError(`kelly-sizing: ${label} must be a finite number, got ${JSON.stringify(value)}`);
  return value;
}
function requireUnitInterval(value, label) {
  requireFiniteNumber(value, label);
  if (value < 0 || value > 1) throw new TypeError(`kelly-sizing: ${label} must be in [0,1], got ${value}`);
  return value;
}
function requirePositive(value, label) {
  requireFiniteNumber(value, label);
  if (value <= 0) throw new TypeError(`kelly-sizing: ${label} must be > 0, got ${value}`);
  return value;
}

/**
 * The classic Kelly fraction for a binary win/loss bet, `f* = p -
 * (1-p)/R` where `p` is the measured hit rate and `R` is the win/loss
 * payoff ratio (`averageWin/averageLoss`). Returns 0 (never negative --
 * a negative Kelly fraction means "don't take this bet", represented as
 * no stake) when the measured edge is non-positive.
 * @param {object} edge
 * @param {number} edge.hitRate Measured out-of-sample hit rate, in [0,1] (`p`).
 * @param {number} edge.averageWin Measured mean positive net return; must be > 0.
 * @param {number} edge.averageLoss Measured mean absolute negative net return; must be > 0.
 * @returns {number} the Kelly fraction, clamped to >= 0 (no ceiling here -- "full Kelly or beyond" is a later, structural clamp).
 * @throws {TypeError} when `hitRate` is outside [0,1] or `averageWin`/`averageLoss` are not positive.
 */
export function computeKellyFraction({ hitRate, averageWin, averageLoss }) {
  const p = requireUnitInterval(hitRate, "hitRate");
  const win = requirePositive(averageWin, "averageWin");
  const loss = requirePositive(averageLoss, "averageLoss");
  const payoffRatio = win / loss;
  const fraction = p - (1 - p) / payoffRatio;
  return Math.max(0, fraction);
}

/**
 * Sizes a walled risk stake HARD toward the measured Kelly fraction --
 * bounded-stake aggression, not bankroll-preservation caution. The ONLY
 * clamp is structural: notional can never exceed the unlevered
 * `riskStakeAmount`, because sizing beyond it would require leverage that
 * can create liability BEYOND the stake (the one forbidden thing per the
 * growth-policy note) -- it is never a caution haircut on the edge itself.
 * @param {object} params
 * @param {number} params.riskStakeAmount The walled, losable-to-zero risk-capital amount; must be > 0. Never survival/working capital.
 * @param {number} params.kellyFraction The measured Kelly fraction (from {@link computeKellyFraction}); may exceed 1 (an aggressionMultiplier can push past full Kelly).
 * @param {number} [params.aggressionMultiplier] Multiplies the Kelly fraction before the unlevered clamp; defaults to 1 (full Kelly, "or beyond" via >1).
 * @returns {{notional: number, kellyFraction: number, appliedFraction: number, cappedByUnleveredStake: boolean}}
 * @throws {TypeError} when `riskStakeAmount` is not positive or `kellyFraction`/`aggressionMultiplier` is negative/non-finite.
 */
export function sizeRiskStake({ riskStakeAmount, kellyFraction, aggressionMultiplier = 1 }) {
  const stake = requirePositive(riskStakeAmount, "riskStakeAmount");
  requireFiniteNumber(kellyFraction, "kellyFraction");
  if (kellyFraction < 0) throw new TypeError(`kelly-sizing: kellyFraction must be >= 0, got ${kellyFraction}`);
  requireFiniteNumber(aggressionMultiplier, "aggressionMultiplier");
  if (aggressionMultiplier < 0) throw new TypeError(`kelly-sizing: aggressionMultiplier must be >= 0, got ${aggressionMultiplier}`);
  const requestedFraction = kellyFraction * aggressionMultiplier;
  const appliedFraction = Math.min(1, requestedFraction);
  return {
    notional: appliedFraction * stake,
    kellyFraction,
    appliedFraction,
    cappedByUnleveredStake: requestedFraction > 1,
  };
}
