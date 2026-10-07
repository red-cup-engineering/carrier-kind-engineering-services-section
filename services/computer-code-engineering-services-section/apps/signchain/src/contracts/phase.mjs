/**
 * contracts/phase - a contract's phase is its closure regime (Obsmetrologia
 * `Closure.Regime`). A phase states only its closure data: whether its closure
 * is Scott-continuous, whether its base is finite, whether its state space has
 * countable cofinality. `classify` reads the regime off that data, and every
 * other coordinate of the phase is read off the regime: when a settled value is
 * attained (finality), its completion cost (`regimeCost`), whether settling
 * needs evidenced coordination (`cohomologyVanishes`), and its energetic
 * behavior. Phase evidence is an observed closure ordinal, or a certificate. Its
 * regime is read off it and must be the phase's own.
 *
 * Observation reaches only the lower two rungs. A stage at which an approximant
 * equalled its successor witnesses strict. An orbit no observed stage settles
 * witnesses Scott, the directed join of its approximants, and only for a
 * Scott-continuous phase. The upper two rungs have a gap no iteration crosses
 * (`gap_iff_upper`), so an orbit that did not settle there is evidence of
 * nothing. Their evidence is a certificate naming the declaration that proves the
 * completion (`omega_ahead`, `residue_germ_ahead`), checked for its decidable
 * hypotheses by metrologic's `settling/certificate`.
 *
 * Contradiction is not a phase coordinate: the house is paraconsistent and a
 * cell holds both sides witnessed in every regime. Observability is the lens's,
 * not the phase's.
 */
import { classifyRegime, closureRegimeData, cohomologyVanishesInRegime } from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/value-category";
import { ofNat, regimeOfOrdinal } from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/analysis/ordinal-closure";
import { closureRegimeName, omegaOrdinal } from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/closure";
import { certificateOf, regimeRank } from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/certificate";
import { record } from "@red-cup-engineering/computer-data-services-section/four";

/** When a settled value is attained, by regime (`unattained_settling_gate`): at a finite
 * stage; only as the directed join of approximants; at a limit stage no finite stage
 * reaches; never, the orbit's stages never equal one another. */
const finalities = Object.freeze({ strict: "normal-form", scott: "approximation", "transfinite-bounded": "stage", aperiodic: "unattained" });

/** Completion-cost height of a regime (`ObsmetrologiaComputing.regimeCost`). */
const costs = Object.freeze({ strict: 0, scott: 1, "transfinite-bounded": 2, aperiodic: 3 });

/** Energetic behavior by regime: a finite settling descends well-foundedly; a Scott
 * settling accumulates monotonically; where `H¹` does not vanish, settling pays a
 * coordination cost. */
const energies = Object.freeze({ strict: "decreasing", scott: "accumulating", "transfinite-bounded": "costed", aperiodic: "costed" });

export const phaseClosureSchema = {
  $id: "metroplat/contracts/phase/phase-closure",
  type: "object",
  required: ["scottContinuous", "finiteBase", "countableCofinality"],
  properties: {
    scottContinuous: { type: "boolean" },
    finiteBase: { type: "boolean" },
    countableCofinality: { type: "boolean" },
  },
  additionalProperties: false,
  title: "PhaseClosure",
  description: "A phase's closure data (Obsmetrologia ClosureRegimeData); a finite base forces Scott continuity and countable cofinality.",
};

export const phaseEvidenceSchema = {
  $id: "metroplat/contracts/phase/phase-evidence",
  type: "object",
  required: ["kind", "id", "phase", "stages"],
  properties: {
    kind: { const: "metroplat.phase-evidence" },
    id: { type: "string" },
    phase: { type: "string" },
    stages: { type: "array", minItems: 1, items: { type: "string" } },
    settledAt: { type: "integer", minimum: 0 },
    certificate: {
      type: "object",
      required: ["declaration"],
      properties: {
        declaration: { type: "string" },
        residue: {
          type: "object",
          required: ["pos", "neg"],
          properties: { pos: { type: "integer", minimum: 0 }, neg: { type: "integer", minimum: 0 } },
          additionalProperties: false,
        },
      },
      additionalProperties: false,
    },
  },
  additionalProperties: false,
  title: "PhaseEvidence",
  description: "An observed closure ordinal (the approximant stages observed, and the finite stage at which one equalled its successor, if any did), or a certificate naming the declaration that proves the completion a gap rung's orbit never reaches.",
};

function admittedClosure(closure) {
  const admitted = closureRegimeData(closure?.scottContinuous === true, closure?.finiteBase === true, closure?.countableCofinality === true);
  if (admitted.kind !== "settling.closureRegimeData:witness") throw new TypeError(`phase closure violates ${admitted.constraint}`);
  return admitted.data;
}

/** A phase: its closure data, and the regime and coordinates read off it. */
export function phaseSignature(spec) {
  const data = admittedClosure(spec.closure);
  const regime = classifyRegime(data);
  const name = closureRegimeName(regime);
  return Object.freeze({
    kind: "metroplat.phase",
    id: spec.id,
    closure: Object.freeze({ scottContinuous: data.scottContinuous, finiteBase: data.finiteBase, countableCofinality: data.countableCofinality }),
    regime: name,
    finality: finalities[name],
    cost: costs[name],
    coordinationCost: cohomologyVanishesInRegime(regime) ? "none" : "evidenced",
    energy: energies[name],
  });
}

/** Evidence that a phase was observed: the approximant stages seen, the finite stage at
 * which an approximant equalled its successor when one did, and the certificate that
 * proves the completion when the phase sits at a gap rung. */
export function phaseEvidence(spec) {
  if (spec.settledAt !== undefined && (!Number.isSafeInteger(spec.settledAt) || spec.settledAt < 0)) throw new TypeError("phaseEvidence: settledAt is a finite stage");
  if (spec.certificate !== undefined && typeof spec.certificate?.declaration !== "string") throw new TypeError("phaseEvidence: a certificate names its declaration");
  return Object.freeze({
    kind: "metroplat.phase-evidence",
    id: spec.id,
    phase: spec.phase,
    stages: Object.freeze([...spec.stages]),
    ...(spec.settledAt === undefined ? {} : { settledAt: spec.settledAt }),
    ...(spec.certificate === undefined ? {} : {
      certificate: Object.freeze({
        declaration: spec.certificate.declaration,
        ...(spec.certificate.residue === undefined ? {} : { residue: record(spec.certificate.residue.pos, spec.certificate.residue.neg) }),
      }),
    }),
  });
}

const zeroSeed = () => record(0, 0);

/** The regime a piece of evidence witnesses, or `null` when it witnesses none. A
 * certificate witnesses its declaration's regime when its hypotheses hold; a germ
 * certificate's completion holds from every seed, so evidence carries only the residue.
 * An observation reads its closure ordinal under the phase's continuity and cofinality
 * (`regimeOfOrd`) and witnesses that regime only below the gap: a finite settling stage
 * is strict, and an unsettled orbit is Scott when the phase is Scott-continuous. */
export function phaseEvidenceRegime(phase, evidence) {
  if (evidence.certificate !== undefined) {
    const certificate = certificateOf(evidence.certificate.declaration, { residue: evidence.certificate.residue, seed: zeroSeed });
    return certificate.kind.endsWith("-obstruction") ? null : closureRegimeName(certificate.regime);
  }
  const ordinal = evidence.settledAt === undefined ? omegaOrdinal() : ofNat(evidence.settledAt);
  const regime = closureRegimeName(regimeOfOrdinal(ordinal, phase.closure.scottContinuous, phase.closure.countableCofinality));
  return regimeRank(regime) < 2 ? regime : null;
}

/** Whether some piece of evidence for this phase witnesses the phase's own regime. */
export function phaseEvidenced(phase, evidence) {
  return (evidence ?? []).some((entry) =>
    entry.phase === phase.id && entry.stages.length > 0 && phaseEvidenceRegime(phase, entry) === phase.regime);
}

/** A finite settling: finite base, so Scott-continuous and countably cofinal. */
export const strictFinitePhase = phaseSignature({
  id: "metroplat.phase.strict-finite",
  closure: { scottContinuous: true, finiteBase: true, countableCofinality: true },
});

/** A Scott settling: Scott-continuous over an infinite base, settled as a directed join. */
export const scottStreamPhase = phaseSignature({
  id: "metroplat.phase.scott-stream",
  closure: { scottContinuous: true, finiteBase: false, countableCofinality: true },
});

/** A transfinite-bounded settling: not Scott-continuous, countably cofinal. */
export const transfiniteClosurePhase = phaseSignature({
  id: "metroplat.phase.transfinite-closure",
  closure: { scottContinuous: false, finiteBase: false, countableCofinality: true },
});

/** An aperiodic settling: not Scott-continuous, uncountably cofinal. */
export const aperiodicOrderPhase = phaseSignature({
  id: "metroplat.phase.aperiodic-order",
  closure: { scottContinuous: false, finiteBase: false, countableCofinality: false },
});

