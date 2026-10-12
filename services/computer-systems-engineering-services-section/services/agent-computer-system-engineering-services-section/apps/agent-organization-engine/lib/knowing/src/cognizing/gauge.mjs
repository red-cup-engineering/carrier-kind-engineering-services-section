/**
 * cognizing/gauge — Meme → knowing/regime: INTELLIGENCE as the closure regime.
 *
 * knowing is the comonad on Meme working the knowledge order ≤_k
 * (dev/docs/notes/2026-06-21-knowing-as-comonad-on-meme.md). `gauge` reads the
 * INTELLIGENCE faculty: the closure regime of the meme's knowledge orbit — how far up
 * the ordinal the ≤_k-monotone orbit must climb to reach (or fail to reach) its
 * fixpoint. This is the GENERAL faculty of which reflect/ruminate are two values:
 * a settled (or trivially absurd) meme is strict; a one-sided meme settles at
 * ω (scott); a REFLEXIVE meme still unsettled is the APERIODIC regime
 * (κ≥ω₁) — the never-settling rumination orbit, "strictly knowledge-ascending and
 * coherent rather than stabilizing". Each regime is one stage's (Obsmetrologia
 * `Stage.regime`): an orbit that settles is settling; one still admitting evidence at
 * ω is positing; the unsettled reflexive orbit is articulating, witnessed rather than
 * settled. The orbit is always knowledge-monotone (settling-monotonicity). Total over
 * any meme. The closure ordinal's class is the regime itself (strict κ<ω, scott κ≤ω,
 * transfinite-bounded κ<ω₁, aperiodic κ≥ω₁), so no separate ordinal label is carried.
 */
import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { memeCarrier } from "@red-cup-engineering/relating";
import { isCell } from "@red-cup-engineering/signcell/cell";
import { stageOfRegime } from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/closure";
import { orbitRegime, reflexiveMeme, standingOf } from "./section.mjs";
import { regimeCarrier } from "./carriers.mjs";
import { jsonResource } from "@red-cup-engineering/json-services-section";

const MEME_CARRIER_ID = memeCarrier.id;
const REGIME_CARRIER_ID = "knowing/regime";

function admitMeme(input, verb) {
  if (typeof input === "object" && input !== null && isCell(input)) return input;
  throw new TypeError(`${verb}: expected a meme carrier (a SignCell)`);
}

/** A regime reading, carrying the stage whose regime it is. */
const reading = ({ regime, ...orbit }) => ({ kind: "knowing.regime", regime, stage: stageOfRegime(regime), ...orbit });

/** The closure regime implied by a meme's standing and reflexivity. */
function regimeOf(meme) {
  const standing = standingOf(meme);
  const settled = standing === "stable" || standing === "absurd";
  const reflexive = reflexiveMeme(meme);
  const regime = orbitRegime(settled, reflexive);
  return reading({ regime, converges: regime !== "aperiodic", monotone: true, settled });
}

/** gauge — read a meme's intelligence: the closure regime of its knowledge orbit and the stage it is doing. */
export const gaugeAction = operation({
  verb: "gauge",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Gauge a meme's intelligence: the closure regime of its knowledge orbit (strict … aperiodic) and the stage whose work it is doing.",
  description: `Domain: a meme carrier (${MEME_CARRIER_ID}). Codomain: ${REGIME_CARRIER_ID} — the closure-orbit class of the meme's ≤_k orbit and its stage. The general faculty of which reflect/ruminate are two values: a reflexive unsettled meme is the aperiodic (κ≥ω₁) never-settling regime (rumination); a settled meme is strict. Each regime is one stage's: strict settling, scott positing, transfinite-bounded predicating, aperiodic articulating.`,
  domain: memeCarrier,
  codomain: regimeCarrier,
  run: (input) => jsonResource(regimeOf(admitMeme(input, "gauge")), "regime"),
});
