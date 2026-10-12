/**
 * @red-cup-engineering/knowing/dreaming — the four forms of dreaming, one per closure regime.
 *
 * Dreaming is what knowing does at each of its four regimes — confirmed by the
 * memorystore (the dreaming-tick journal; the dream convergence/emergence functions).
 * Three regimes are inward, deterministic, network-free learning acts that
 * RECOMBINE held observations (the convergence reading Ξᵣ — mutual stabilization of
 * difference toward a shared unrealized future):
 *
 *   - strict (κ<ω): compose observations chaining object → subject;
 *   - scott (κ=ω): consolidate repeated cells by knowledge-join (ω-limit);
 *   - transfinite-bounded (ω<κ<ω₁): co-predicate pairs sharing a subject.
 *
 * The fourth regime — **aperiodic (κ≥ω₁)** — is dreaming proper: the EMERGENCE
 * reading Dᵣ, "the persistence of intention in the absence of realizable
 * constraint", where genuinely new generators enter from OUTSIDE the settled
 * fibers. That can only happen by reaching past the closure, so the aperiodic
 * enactor is an external boundary (today: the LLM in
 * @emsenn/organizing-with-llm-agents/dreaming). Aperiodic knowing IS dreaming; this
 * surface owns the structure and the inward three, and exposes `"aperiodic"` as a
 * regime its downstream enactor fills.
 *
 * No form names its regime by hand. Each states only its settlement filtration,
 * and its regime, whether it settles, and the transport its results travel on
 * are read off that filtration (SignCraft `classify`, SignChain phase finality).
 */

import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { coincides, sameCell as sameTriple } from "@red-cup-engineering/signcell/cell";
import { knowledgeJoin, knowledgeMeet, noEvidence } from "@red-cup-engineering/signchain/bilattice";
import { observation as makeObservation } from "./observation.mjs";
import { task as makeTask } from "./task.mjs";
import { tokenOf } from "../learning/vocabulary.mjs";
import { jsonResource } from "@red-cup-engineering/json-services-section";
import { settlementSignature } from "@red-cup-engineering/signcraft/settlement-signature";

export { task, taskCell } from "./task.mjs";

export { observation } from "./observation.mjs";

/** The settlement filtration of each form of dreaming: composing a chain settles at a
 * finite stage; consolidating repeated cells settles at the ω-limit of a Scott join;
 * co-predicating fires a non-Scott limit at countable cofinality; emergence fires a
 * non-Scott limit no countable chain reaches. */
const dreamSettlements = Object.freeze({
  compose: Object.freeze({ kind: "relating.codomain.settlement-filtration", limitStage: false, nonScottLimitFiring: false, cofinality: "countable" }),
  consolidate: Object.freeze({ kind: "relating.codomain.settlement-filtration", limitStage: true, nonScottLimitFiring: false, cofinality: "countable" }),
  coPredicate: Object.freeze({ kind: "relating.codomain.settlement-filtration", limitStage: true, nonScottLimitFiring: true, cofinality: "countable" }),
  emerge: Object.freeze({ kind: "relating.codomain.settlement-filtration", limitStage: true, nonScottLimitFiring: true, cofinality: "uncountable" }),
});

const dreamSignature = (form) => settlementSignature(dreamSettlements[form], `knowing.dream.${form}`, "knowing.dream.settlement-signature");
const composing = dreamSignature("compose");
const consolidating = dreamSignature("consolidate");
const coPredicating = dreamSignature("coPredicate");
const emerging = dreamSignature("emerge");
/** Whether an emergent dream attains a settled value: never, its finality is unattained. */
const emergingSettles = emerging.finality !== "unattained";

/** The four closure regimes a dream settles at; `aperiodic` is filled by an external enactor. */

/** The result of a dream: its regime, the observations it generated, and their joined evidence. */

/** Whether the three finite inward regimes can derive a residue pair. */

/** One finite-regime exclusion witness for a conjecture candidate. */

/** One non-convergent residue pair, with the finite-regime impossibility certificate attached. */

/** The residue field: exactly the observation pairs no finite dream regime reaches. */

/** Audit ledger: finite products versus genuinely new aperiodic candidates. */

/** A concrete candidate observation that would test whether residue can become finite-reachable. */

/** Intervention design: concrete probes for moving residue into finite reachability tests. */

/** One action obligation produced by folding non-convergent residue back into material practice. */

/** The praxis frontier: residue transformed into intervention obligations and feedback loops. */

/** One intervention result: did practice make a finite regime newly able to reach the pair? */

/** Theory-practice-theory feedback: post-intervention observations folded back into residue. */

/** One local spatiotemporal projection of the aperiodic residue field. */

/** A residue pair that recurs across local windows, visible from more than one local cut. */

/** Spatiotemporal agentic holography: local windows carrying the non-convergent frontier. */

/** A recurrent hologram residue turned into an organized praxis obligation. */

/** Holographic praxis: recurrent local residue becomes the organized intervention frontier. */

/** One conjunctural line: analysis -> strategy -> tactics -> feedback over recurrent residue. */

/** Conjunctural praxis: a strategy/program layer over holographic praxis. */

/** A full PAR/theory-practice-theory cycle over the aperiodic dream frontier. */

/** One emitted event from the non-terminating action-research sequence. */

/** A bounded prefix of the action-research stream. */

/** One read of a non-terminating action-research event as a metastable trajectory step. */

/** The aperiodic stream read as productive non-stationary coordination, not convergence. */

/** One global-historical research method selected for the current aperiodic trajectory. */

/** A global and historical repertoire for choosing how the aperiodic stream should act next. */

/** One selected world method turned into an observation obligation for the next cycle. */

/** A concrete next-batch plan produced by global-historical methods. */

/** One selected method evaluated by its own generated observation against the current field. */

/** Adaptive feedback for global-historical methods: which ones changed the aperiodic frontier? */

/** Audit whether the method ecology has enough variety for the aperiodic frontier it regulates. */

/** Two distinct world methods braided into one combined intervention. */

/** Compose diverse methods into paired interventions so the ecology acts with variety. */

/** A graph read of the method ecology: how global methods relate before the next action. */

/** A bounded aperiodic walk through the method constellation. */

/** One next research obligation derived from a non-terminating action-research stream. */

/** The live agenda: what the non-terminating dream loop should pursue next. */

/** Audit whether the non-terminating research stream is producing progressive novelty. */

/** A conjecture emitted from the aperiodic residue of the dream trajectory. */

/** A bounded prefix of the aperiodic dream stream. */

/** Options shared by the dream regimes: where, who observes, and a generation cap. */

/** strict (κ<ω): compose observations where one's object is the next's subject. */
export function strictFiniteDream(observations, options = {}) {
  const observer = options.observer ?? dreamTerm(["observer", composing.regime]);
  const at = options.at ?? dreamMark([composing.regime]);
  const limit = options.limit ?? 50;
  const out = [];
  for (const left of observations) {
    for (const right of observations) {
      if (out.length >= limit) break;
      if (!sameTerm(left.task.object, right.task.subject)) continue;
      out.push(makeObservation({
        observer,
        task: makeTask({
          subject: left.task.subject,
          predicate: dreamPredicate([`${composing.regime}-composition`, left.task.predicate, right.task.predicate]),
          object: right.task.object,
        }),
        evidence: knowledgeMeet(left.evidence, right.evidence),
        at,
        note: dreamMark([`${composing.regime}-dream`, left.task.cell, right.task.cell]),
      }));
    }
    if (out.length >= limit) break;
  }
  return dreamResult(composing.regime, out);
}

/**
 * strict (κ<ω), latent cells: open every topic the window's memory terms share but none names.
 *
 * Each observation is one memory term (`task.subject`) carrying its topic tokens (`task.object`).
 * A topic present in at least `minSupport` distinct terms and absent as a term of its own is a
 * latent cell, and is opened as a ⊥-opened `open-question` cell over the agent: the cell was
 * asked, neither supported nor refuted (`noEvidence`). The dream recombines the window's own
 * tokens, invents none, calls nothing, and writes nothing; its proposals are inert until a
 * governing office articulates them. Sorted by support descending, then topic ascending.
 */
export function latentCellDream(observations, options = {}) {
  const minSupport = options.minSupport ?? 2;
  const maxProposals = options.maxProposals ?? Infinity;
  const tokenize = options.tokenize ?? topicTokens;
  const observer = options.observer ?? dreamTerm(["observer", composing.regime]);
  const agent = options.agent ?? observer;
  const at = options.at ?? dreamMark([composing.regime]);
  const named = new Set();
  const support = new Map();
  for (const obs of observations) {
    const key = termKey(obs.task.subject);
    for (const own of tokenize(obs.task.subject)) named.add(own);
    for (const topic of tokenize(obs.task.object)) {
      const witnesses = support.get(topic) ?? new Map();
      witnesses.set(key, obs.task.subject);
      support.set(topic, witnesses);
    }
  }
  const latent = [...support]
    .filter(([topic, witnesses]) => witnesses.size >= minSupport && !named.has(topic))
    .map(([topic, witnesses]) => ({ topic, witnesses: [...witnesses].sort(([a], [b]) => compareText(a, b)).map(([, term]) => term) }))
    .sort((a, b) => b.witnesses.length - a.witnesses.length || compareText(a.topic, b.topic))
    .slice(0, maxProposals);
  return dreamResult(composing.regime, latent.map(({ topic, witnesses }) => makeObservation({
    observer,
    task: makeTask({ subject: agent, predicate: "open-question", object: topic }),
    evidence: noEvidence,
    at,
    note: dreamMark([`${composing.regime}-latent-cell`, `support:${witnesses.length}`, ...witnesses]),
  })));
}

/** scott (κ=ω): consolidate repeated cells by knowledge-join. */
export function scottContinuousDream(observations, options = {}) {
  const observer = options.observer ?? dreamTerm(["observer", consolidating.regime]);
  const at = options.at ?? dreamMark([consolidating.regime]);
  const limit = options.limit ?? 50;
  const grouped = [];
  for (const obs of observations) {
    const group = grouped.find((candidate) => sameCell(candidate.cell, obs.task.cell));
    if (group) group.observations.push(obs);
    else grouped.push({ cell: obs.task.cell, observations: [obs] });
  }
  const out = [];
  for (const group of grouped) {
    if (out.length >= limit) break;
    if (group.observations.length < 2) continue;
    const [first, ...rest] = group.observations;
    out.push(makeObservation({
      observer,
      task: first.task,
      evidence: rest.reduce((left, obs) => knowledgeJoin(left, obs.evidence), first.evidence),
      at,
      note: dreamMark([`${consolidating.regime}-dream`, group.cell]),
    }));
  }
  return dreamResult(consolidating.regime, out);
}

/** transfinite-bounded (ω<κ<ω₁): co-predicate every pair sharing a subject. */
export function transfiniteDream(observations, options = {}) {
  const observer = options.observer ?? dreamTerm(["observer", coPredicating.regime]);
  const at = options.at ?? dreamMark([coPredicating.regime]);
  const limit = options.limit ?? 50;
  const bySubject = [];
  for (const obs of observations) {
    const group = bySubject.find((candidate) => sameTerm(candidate.subject, obs.task.subject));
    if (group) group.observations.push(obs);
    else bySubject.push({ subject: obs.task.subject, observations: [obs] });
  }
  const out = [];
  for (const group of bySubject) {
    const members = group.observations;
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        if (out.length >= limit) break;
        const left = members[i];
        const right = members[j];
        out.push(makeObservation({
          observer,
          task: makeTask({
            subject: group.subject,
            predicate: dreamPredicate(["co-predicate", left.task.predicate, right.task.predicate]),
          }),
          evidence: knowledgeMeet(left.evidence, right.evidence),
          at,
          note: dreamMark([`${coPredicating.regime}-dream`, left.task.cell, right.task.cell]),
        }));
      }
      if (out.length >= limit) break;
    }
    if (out.length >= limit) break;
  }
  return dreamResult(coPredicating.regime, out);
}

/** Dispatch the three synchronous inward regimes over a single observation set. */
export function dreaming(
  input = {},
  options = {},
) {
  const regime = input.regime ?? composing.regime;
  const observations = input.observations ?? [];
  if (regime === consolidating.regime) return scottContinuousDream(observations, options);
  if (regime === coPredicating.regime) return transfiniteDream(observations, options);
  return strictFiniteDream(observations, options);
}

/** Aperiodic (kappa >= omega_1): stream conjectures from residue no finite regime derives. */
export function* aperiodicDreamConjectures(
  observations,
  options = {},
) {
  const residue = aperiodicResiduePairs(observations);
  if (residue.length === 0) return;
  const observer = options.observer ?? dreamTerm(["observer", emerging.regime]);
  const at = options.at ?? dreamMark([emerging.regime]);
  let index = options.start ?? 0;
  while (true) {
    const step = sturmianStep(index);
    const pair = residue[(index + (step === "long" ? 1 : 0)) % residue.length];
    const [left, right] = step === "long" ? [pair.right, pair.left] : [pair.left, pair.right];
    const conjecture = makeObservation({
      observer,
      task: makeTask({
        subject: left.task.subject,
        predicate: dreamPredicate(["aperiodic-residue-conjecture", left.task.predicate, right.task.predicate, `step:${index}`]),
        object: right.task.object,
      }),
      evidence: knowledgeMeet(left.evidence, right.evidence),
      at,
      note: dreamMark(["non-convergent-residue", left.task.cell, right.task.cell, `sturmian:${sturmianPrefix(index + 1)}`]),
    });
    yield Object.freeze({
      kind: "knowing.dream.conjecture",
      index,
      regime: emerging.regime,
      maturity: "Research-grade",
      trajectory: Object.freeze({
        kind: "sturmian-golden",
        step,
        prefix: sturmianPrefix(index + 1),
        neverSettles: true,
      }),
      finiteReachability: pair.finiteReachability,
      strictRegimeExclusions: pair.strictRegimeExclusions,
      novelty: Object.freeze({
        genuinelyNew: true,
        reason: "The source observations are in the non-convergent residue: no object-to-subject chain, repeated cell, or shared-subject co-predicate lets the finite dream regimes derive this conjecture.",
      }),
      source: Object.freeze({ left, right }),
      conjecture,
    });
    index += 1;
  }
}

/** Return a bounded prefix of the aperiodic dream stream for request/response callers. */
export function aperiodicDream(
  input = {},
  options = {},
) {
  const observations = input.observations ?? [];
  const limit = finiteLimit(input.limit ?? options.limit ?? 8);
  const candidates = [];
  const stream = aperiodicDreamConjectures(observations, options);
  for (const candidate of stream) {
    if (candidates.length >= limit) break;
    candidates.push(candidate);
  }
  return Object.freeze({
    kind: "knowing.dream.aperiodic-research",
    regime: emerging.regime,
    settles: emergingSettles,
    transport: emerging.transport,
    candidates: Object.freeze(candidates),
    residue: Object.freeze({
      observations: observations.length,
      pairs: aperiodicResidue(observations).pairs.length,
      emitted: candidates.length,
    }),
  });
}

/** Extract the non-convergent residue as a reusable carrier. */
export function aperiodicResidue(observations) {
  return Object.freeze({
    kind: "knowing.dream.aperiodic-residue",
    regime: emerging.regime,
    observations: observations.length,
    pairs: aperiodicResiduePairs(observations),
    theory: Object.freeze({
      closure: "finite-regime-exclusion",
      order: "aperiodic-non-convergence",
      practice: "praxis-frontier",
    }),
  });
}

/** Compare finite closure products with genuinely new aperiodic candidates. */
export function aperiodicDiscoveryLedger(
  input = {},
) {
  const observations = input.observations ?? [];
  const limit = finiteLimit(input.limit ?? 8);
  const finite = Object.freeze([
    finiteDiscovery(composing.regime, strictFiniteDream(observations)),
    finiteDiscovery(consolidating.regime, scottContinuousDream(observations)),
    finiteDiscovery(coPredicating.regime, transfiniteDream(observations)),
  ]);
  const candidates = aperiodicDream({ observations, limit }, { ...(input.start === undefined ? {} : { start: input.start }) }).candidates;
  const aperiodic = Object.freeze(candidates.map((candidate) => aperiodicDiscovery(candidate)));
  return Object.freeze({
    kind: "knowing.dream.discovery-ledger",
    regime: emerging.regime,
    finite,
    aperiodic,
    residue: aperiodicResidue(observations),
    verdict: Object.freeze({
      genuineNovelty: "finite-regime-exclusion",
      finiteProducts: finite.reduce((sum, discovery) => sum + discovery.count, 0),
      aperiodicCandidates: aperiodic.length,
      allAperiodicUnreachable: aperiodic.every((discovery) => discovery.unreachableBy.length === 3),
    }),
    theory: Object.freeze({
      finite: "closure-products",
      aperiodic: "non-convergent-residue",
      discovery: "new-iff-finite-unreachable",
    }),
  });
}

/** Design concrete probes that can test whether residue becomes finite-reachable after action. */
export function aperiodicPraxisProbes(
  input = {},
) {
  const residue = aperiodicResidue(input.observations ?? []);
  const pairLimit = finiteLimit(input.limit ?? residue.pairs.length);
  const probes = residue.pairs
    .slice(0, pairLimit)
    .flatMap((pair, pairIndex) => praxisProbesForPair(pair, pairIndex));
  return Object.freeze({
    kind: "knowing.dream.praxis-probes",
    regime: emerging.regime,
    residue,
    probes: Object.freeze(probes),
    method: Object.freeze({
      analysis: "finite-regime-exclusion",
      design: "minimal-observation-probes",
      feedback: "praxis-feedback-classifies-the-result",
    }),
    theory: Object.freeze({
      praxis: "concrete-analysis-into-situated-action",
      activeInference: "epistemic-probing",
      dreaming: "test-non-convergence-without-forcing-settlement",
    }),
  });
}

/** Fold residue into praxis: the non-settling frontier becomes material intervention obligations. */
export function aperiodicPraxisFrontier(
  input = {},
) {
  const residue = aperiodicResidue(input.observations ?? []);
  const limit = finiteLimit(input.limit ?? residue.pairs.length);
  return Object.freeze({
    kind: "knowing.dream.praxis-frontier",
    regime: emerging.regime,
    residue,
    interventions: Object.freeze(residue.pairs.slice(0, limit).map((pair, index) => praxisIntervention(pair, index))),
    doctrine: Object.freeze({
      analysis: "finite closure cannot settle this pair",
      organization: "intervene at the material boundary",
      feedback: "return action results as new observations",
    }),
  });
}

/** Fold intervention results back into dreaming and classify whether finite regimes can now reach. */
export function aperiodicPraxisFeedback(
  input = {},
) {
  const beforeObservations = input.before ?? [];
  const afterObservations = input.after ?? [];
  const before = aperiodicResidue(beforeObservations);
  const after = aperiodicResidue(Object.freeze([...beforeObservations, ...afterObservations]));
  const limit = finiteLimit(input.limit ?? before.pairs.length);
  return Object.freeze({
    kind: "knowing.dream.praxis-feedback",
    regime: emerging.regime,
    before,
    after,
    effects: Object.freeze(before.pairs.slice(0, limit).map((pair, index) => praxisFeedbackEffect(pair, index, afterObservations))),
    loop: Object.freeze({
      theory: "finite-regime-exclusion",
      practice: "situated-intervention",
      return: "reobserve-and-reclassify",
    }),
  });
}

/** Project the aperiodic residue through local observation windows as a spatiotemporal hologram. */
export function aperiodicHologram(
  input

 = {},
) {
  const observations = input.observations ?? [];
  const windowSize = positiveInteger(input.window ?? Math.max(2, observations.length || 2), "aperiodic-hologram: window");
  const stride = positiveInteger(input.stride ?? 1, "aperiodic-hologram: stride");
  const candidatesPerWindow = finiteLimit(input.candidatesPerWindow ?? 1);
  const limit = finiteLimit(input.limit ?? observations.length);
  const projections = [];
  for (let start = 0; start < observations.length && projections.length < limit; start += stride) {
    const end = Math.min(observations.length, start + windowSize);
    const segment = observations.slice(start, end);
    if (segment.length < 2) continue;
    const residue = aperiodicResidue(segment);
    projections.push(Object.freeze({
      kind: "knowing.dream.aperiodic-hologram-projection",
      index: projections.length,
      regime: emerging.regime,
      window: Object.freeze({
        start,
        end,
        observations: segment.length,
        observers: observerCount(segment),
      }),
      residue,
      candidates: aperiodicDream({ observations: segment, limit: candidatesPerWindow }).candidates,
    }));
  }
  const recurrences = hologramRecurrences(projections);
  return Object.freeze({
    kind: "knowing.dream.aperiodic-hologram",
    regime: emerging.regime,
    settles: emergingSettles,
    transport: emerging.transport,
    projections: Object.freeze(projections),
    recurrences,
    frontier: Object.freeze({
      phase: hologramPhase(projections, recurrences),
      windows: projections.length,
      maxResiduePairs: projections.reduce((max, projection) => Math.max(max, projection.residue.pairs.length), 0),
      recurrentResidues: recurrences.length,
    }),
    theory: Object.freeze({
      spatial: "local-window-projection",
      temporal: "ordered-observation-stream",
      agentic: "observer-indexed-field",
      holographic: "local-projection-carries-frontier",
      aperiodic: "finite-regime-exclusion",
    }),
  });
}

/** Turn recurrent local residue into organized praxis obligations. */
export function aperiodicHolographicPraxis(
  input

 = {},
) {
  const hologram = aperiodicHologram(input);
  const limit = finiteLimit(input.limit ?? hologram.recurrences.length);
  return Object.freeze({
    kind: "knowing.dream.holographic-praxis",
    regime: emerging.regime,
    hologram,
    interventions: Object.freeze(hologram.recurrences.slice(0, limit).map((recurrence, index) => holographicPraxisIntervention(recurrence, index))),
    doctrine: Object.freeze({
      analysis: "local projections reveal the frontier",
      organization: "act where residue recurs across cuts",
      feedback: "reobserve the windows and classify praxis feedback",
    }),
    theory: Object.freeze({
      aperiodic: "non-convergent-residue",
      holographic: "whole-frontier-visible-locally",
      autopoietic: "structural-coupling",
      southAmericanPraxis: "specific-organization-and-social-insertion",
      participatoryResearch: "knowledge-through-action",
    }),
  });
}

/** Build a conjunctural strategy/program from holographic praxis. */
export function aperiodicConjuncturalPraxis(
  input

 = {},
) {
  const praxis = aperiodicHolographicPraxis(input);
  return Object.freeze({
    kind: "knowing.dream.conjunctural-praxis",
    regime: emerging.regime,
    praxis,
    lines: Object.freeze(praxis.interventions.map((intervention, index) => conjuncturalPraxisLine(intervention, index))),
    program: Object.freeze({
      analysis: "concrete-analysis-of-concrete-residue",
      strategy: "select-recurrent-local-windows",
      tactics: "situated-probes-and-reobservation",
      feedback: "participatory-action-research-cycle",
    }),
    theory: Object.freeze({
      huertaGrande: "theory-as-practical-tool",
      especifismo: "specific-organization-and-social-insertion",
      falsBorda: "participatory-action-research",
      dreaming: "aperiodic-research-that-does-not-terminate",
    }),
  });
}

/** Run one action-research cycle and keep the next aperiodic frontier open. */
export function aperiodicActionResearchCycle(
  input

 = {},
) {
  const beforeObservations = input.before ?? [];
  const afterObservations = input.after ?? [];
  const options = {
    ...(input.window === undefined ? {} : { window: input.window }),
    ...(input.stride === undefined ? {} : { stride: input.stride }),
    ...(input.limit === undefined ? {} : { limit: input.limit }),
    ...(input.candidatesPerWindow === undefined ? {} : { candidatesPerWindow: input.candidatesPerWindow }),
  };
  const before = aperiodicConjuncturalPraxis({ observations: beforeObservations, ...options });
  const feedback = aperiodicPraxisFeedback({
    before: beforeObservations,
    after: afterObservations,
    ...(input.limit === undefined ? {} : { limit: input.limit }),
  });
  const after = aperiodicConjuncturalPraxis({ observations: Object.freeze([...beforeObservations, ...afterObservations]), ...options });
  return Object.freeze({
    kind: "knowing.dream.action-research-cycle",
    regime: emerging.regime,
    settles: emergingSettles,
    before,
    feedback,
    after,
    delta: actionResearchDelta(before, feedback, after),
    loop: Object.freeze({
      reflection: "analyze-recurrent-residue",
      action: "intervene-and-observe",
      observation: "classify-finite-reachability",
      next: "repeat",
      continues: true,
    }),
    theory: Object.freeze({
      falsBorda: "participatory-action-research-cycle",
      huertaGrande: "analysis-strategy-tactics-feedback",
      autopoietic: "structural-coupling-through-observation",
      dreaming: "valuable-because-it-does-not-terminate",
    }),
  });
}

/** Stream action-research cycles over successive observation batches, accumulating the field. */
export function* aperiodicActionResearchCycles(
  input

 = {},
) {
  const batches = input.batches ?? [];
  const cycleLimit = finiteLimit(input.cycleLimit ?? batches.length);
  let field = Object.freeze([...(input.before ?? [])]);
  for (let index = 0; index < batches.length && index < cycleLimit; index++) {
    const batch = Object.freeze([...batches[index]]);
    const cycle = aperiodicActionResearchCycle({
      before: field,
      after: batch,
      ...(input.window === undefined ? {} : { window: input.window }),
      ...(input.stride === undefined ? {} : { stride: input.stride }),
      ...(input.limit === undefined ? {} : { limit: input.limit }),
      ...(input.candidatesPerWindow === undefined ? {} : { candidatesPerWindow: input.candidatesPerWindow }),
    });
    const nextField = Object.freeze([...field, ...batch]);
    yield Object.freeze({
      kind: "knowing.dream.action-research-sequence-event",
      index,
      regime: emerging.regime,
      cycle,
      field: Object.freeze({
        before: field.length,
        after: batch.length,
        total: nextField.length,
      }),
      trajectory: Object.freeze({
        settles: emergingSettles,
        next: "repeat",
      }),
    });
    field = nextField;
  }
}

/** Return a bounded prefix of the non-terminating action-research sequence. */
export function aperiodicActionResearchSequence(
  input

 = {},
) {
  const events = Object.freeze([...aperiodicActionResearchCycles(input)]);
  return Object.freeze({
    kind: "knowing.dream.action-research-sequence",
    regime: emerging.regime,
    settles: emergingSettles,
    transport: emerging.transport,
    events,
    trajectory: Object.freeze({
      batches: input.batches?.length ?? 0,
      emitted: events.length,
      observations: events.at(-1)?.field.total ?? input.before?.length ?? 0,
      continues: true,
    }),
  });
}

/** Read the non-terminating action-research stream as a metastable aperiodic trajectory. */
export function aperiodicMetastableTrajectory(
  input

 = {},
) {
  const sequence = aperiodicActionResearchSequence(input);
  const steps = Object.freeze(sequence.events.map((event) => metastableTrajectoryStep(event)));
  const integration = steps.reduce((sum, step) => sum + step.integration, 0);
  const segregation = steps.reduce((sum, step) => sum + step.segregation, 0);
  const novelty = steps.reduce((sum, step) => sum + step.novelty, 0);
  const drift = steps.reduce((sum, step) => sum + step.drift, 0);
  const nonstationary = metastableNonstationary(steps);
  const phase = metastableTrajectoryPhase(steps.length, integration, segregation, nonstationary);
  return Object.freeze({
    kind: "knowing.dream.metastable-trajectory",
    regime: emerging.regime,
    settles: emergingSettles,
    sequence,
    steps,
    assessment: Object.freeze({
      phase,
      integration,
      segregation,
      novelty,
      drift,
      nonstationary,
    }),
    next: Object.freeze({
      carrier: "knowing.dream.frontier-agenda",
      reason: metastableNextReason(phase),
    }),
    theory: Object.freeze({
      metastability: "integration-segregation-without-stationary-settlement",
      activeInference: "epistemic-value-of-probing-uncertain-frontiers",
      falsBorda: "knowledge-through-action-and-return",
      huertaGrande: "theory-guides-situated-strategy",
      dreaming: "aperiodic-trajectory-as-discovery-surface",
    }),
  });
}

/** Choose global-historical research methods fitted to the current aperiodic trajectory. */
export function aperiodicWorldMethodRepertoire(
  input

 = {},
) {
  const trajectory = aperiodicMetastableTrajectory(input);
  const agenda = aperiodicFrontierAgenda(input);
  const methods = Object.freeze(worldMethodsFor(trajectory, agenda));
  const selected = Object.freeze(methods.slice(0, finiteLimit(input.methodLimit ?? Math.min(3, methods.length))));
  return Object.freeze({
    kind: "knowing.dream.world-method-repertoire",
    regime: emerging.regime,
    settles: emergingSettles,
    trajectory,
    agenda,
    methods,
    selected,
    doctrine: Object.freeze({
      compare: "multiple-historical-inquiry-lineages",
      choose: "fit-method-to-trajectory-phase",
      act: "return-method-as-carrier-obligation",
      repeat: true,
    }),
    theory: Object.freeze({
      activeInference: "epistemic-value-probing",
      enaction: "sense-making-through-structural-coupling",
      catuskoti: "four-corner-paraconsistent-obstruction",
      asabiyyah: "cohesion-as-collective-capacity",
      cybernetics: "observer-in-the-loop",
      dreaming: "world-methods-for-non-convergent-research",
    }),
  });
}

/** Turn selected world methods into concrete next-batch observations and project the next cycle. */
export function aperiodicWorldMethodInterventionPlan(
  input

 = {},
) {
  const repertoire = aperiodicWorldMethodRepertoire(input);
  const interventions = Object.freeze(repertoire.selected.map((method, index) => worldMethodIntervention(method, index, repertoire)));
  const after = Object.freeze(interventions.map((intervention) => intervention.observation));
  const currentField = accumulatedActionResearchField(input);
  const projected = aperiodicActionResearchCycle({
    before: currentField,
    after,
    ...(input.window === undefined ? {} : { window: input.window }),
    ...(input.stride === undefined ? {} : { stride: input.stride }),
    ...(input.limit === undefined ? {} : { limit: input.limit }),
    ...(input.candidatesPerWindow === undefined ? {} : { candidatesPerWindow: input.candidatesPerWindow }),
  });
  return Object.freeze({
    kind: "knowing.dream.world-method-intervention-plan",
    regime: emerging.regime,
    settles: emergingSettles,
    repertoire,
    interventions,
    after,
    projected,
    loop: Object.freeze({
      currentField: currentField.length,
      nextBatch: after.length,
      next: "run-action-research-cycle",
      continues: true,
    }),
    theory: Object.freeze({
      comparativeMethod: "global-historical-methods-as-operational-probes",
      navigation: "wayfinding-through-non-convergent-fields",
      change: "pattern-change-without-final-settlement",
      action: "minimal-situated-intervention",
      dreaming: "methods-become-observations",
    }),
  });
}

/** Evaluate selected world methods by their actual effect on the aperiodic frontier. */
export function aperiodicWorldMethodFeedback(
  input

 = {},
) {
  const plan = aperiodicWorldMethodInterventionPlan(input);
  const currentField = accumulatedActionResearchField(input);
  const effects = Object.freeze(plan.interventions.map((intervention, index) => worldMethodFeedbackEffect(intervention, index, currentField, input)));
  const adapted = Object.freeze(effects
    .map((effect) => adaptWorldMethod(effect))
    .sort((left, right) => right.score - left.score || left.index - right.index));
  return Object.freeze({
    kind: "knowing.dream.world-method-feedback",
    regime: emerging.regime,
    settles: emergingSettles,
    plan,
    effects,
    adapted,
    summary: Object.freeze({
      amplified: effects.filter((effect) => effect.next === "amplify").length,
      repeated: effects.filter((effect) => effect.next === "repeat").length,
      heldOpen: effects.filter((effect) => effect.next === "hold-open").length,
      retiredForNow: effects.filter((effect) => effect.next === "retire-for-now").length,
    }),
    loop: Object.freeze({
      nextCarrier: "knowing.dream.world-method-repertoire",
      action: "adjust-method-priorities-and-repeat",
      continues: true,
    }),
    theory: Object.freeze({
      bayesianDesign: "rank-methods-by-information-producing-intervention",
      reflectivePractice: "reflection-in-action",
      decolonizingMethodology: "method-accountability-to-the-field",
      reciprocity: "methods-return-value-to-the-observation-community",
      dreaming: "adaptive-method-feedback-without-settlement",
    }),
  });
}

/** Audit the global-historical method ecology for requisite variety against the aperiodic frontier. */
export function aperiodicWorldMethodEcology(
  input

 = {},
) {
  const feedback = aperiodicWorldMethodFeedback(input);
  const selected = feedback.plan.repertoire.selected;
  const regions = uniqueCount(selected.map((method) => method.region));
  const periods = uniqueCount(selected.map((method) => method.period));
  const nextCarriers = uniqueCount(selected.map((method) => method.nextCarrier));
  const assessments = uniqueCount(feedback.effects.map((effect) => effect.assessment));
  const requiredVariety = worldMethodRequiredVariety(feedback.plan.repertoire.trajectory.assessment.phase, selected.length);
  const effectiveVariety = regions + periods + nextCarriers + assessments;
  const verdict = worldMethodEcologyVerdict(selected.length, regions, effectiveVariety, requiredVariety);
  return Object.freeze({
    kind: "knowing.dream.world-method-ecology",
    regime: emerging.regime,
    settles: emergingSettles,
    feedback,
    variety: Object.freeze({
      selectedMethods: selected.length,
      regions,
      periods,
      nextCarriers,
      assessments,
      effectiveVariety,
      requiredVariety,
    }),
    verdict,
    obligations: worldMethodEcologyObligations(verdict, regions, periods, nextCarriers, assessments),
    loop: Object.freeze({
      nextCarrier: "knowing.dream.world-method-feedback",
      action: "increase-method-variety-and-repeat",
      continues: true,
    }),
    theory: Object.freeze({
      requisiteVariety: "method-variety-must-match-frontier-variety",
      epistemologicalPluralism: "no-single-method-governs-discovery",
      strongObjectivity: "situated-standpoints-increase-reflexive-correction",
      collectiveIntelligence: "heterogeneous-search-can-outperform-homogeneous-search",
      dreaming: "aperiodic-method-ecology",
    }),
  });
}

/** Braid complementary world methods into combined next-cycle observations. */
export function aperiodicWorldMethodBraid(
  input

 = {},
) {
  const ecology = aperiodicWorldMethodEcology(input);
  const braidLimit = finiteLimit(input.braidLimit ?? Math.max(0, Math.floor(ecology.feedback.adapted.length / 2)));
  const pairs = Object.freeze(worldMethodBraidPairs(ecology.feedback.adapted, ecology, braidLimit));
  const after = Object.freeze(pairs.map((pair) => pair.observation));
  const currentField = accumulatedActionResearchField(input);
  const projected = aperiodicActionResearchCycle({
    before: currentField,
    after,
    ...(input.window === undefined ? {} : { window: input.window }),
    ...(input.stride === undefined ? {} : { stride: input.stride }),
    ...(input.limit === undefined ? {} : { limit: input.limit }),
    ...(input.candidatesPerWindow === undefined ? {} : { candidatesPerWindow: input.candidatesPerWindow }),
  });
  return Object.freeze({
    kind: "knowing.dream.world-method-braid",
    regime: emerging.regime,
    settles: emergingSettles,
    ecology,
    pairs,
    after,
    projected,
    loop: Object.freeze({
      currentField: currentField.length,
      braidedPairs: pairs.length,
      next: "run-action-research-cycle",
      continues: true,
    }),
    theory: Object.freeze({
      requisiteVariety: "compose-response-variety",
      epistemologicalPluralism: "methods-check-each-other",
      standpoint: "situated-difference-as-correction",
      collectiveIntelligence: "diverse-heuristics-as-search",
      dreaming: "braided-methods-for-aperiodic-research",
    }),
  });
}

/** Build a constellation graph over the selected/adapted global method ecology. */
export function aperiodicWorldMethodConstellation(
  input

 = {},
) {
  const braid = aperiodicWorldMethodBraid(input);
  const nodes = Object.freeze(braid.ecology.feedback.adapted.map((method, index) => worldMethodConstellationNode(method, index)));
  const edges = Object.freeze(worldMethodConstellationEdges(nodes, braid));
  const topology = worldMethodConstellationTopology(nodes, edges);
  return Object.freeze({
    kind: "knowing.dream.world-method-constellation",
    regime: emerging.regime,
    settles: emergingSettles,
    braid,
    nodes,
    edges,
    topology,
    obligations: worldMethodConstellationObligations(topology, braid.ecology.obligations),
    theory: Object.freeze({
      boundaryObjects: "methods-coordinate-without-identical-meanings",
      actorNetwork: "relations-between-methods-change-the-research-field",
      pluriverse: "many-worlds-of-inquiry-without-single-sovereign-method",
      dreaming: "constellated-method-field-for-aperiodic-research",
    }),
  });
}

/** Walk the method constellation with an aperiodic step schedule and emit navigation events. */
export function aperiodicWorldMethodWayfinding(
  input

 = {},
) {
  const constellation = aperiodicWorldMethodConstellation(input);
  const pathLimit = finiteLimit(input.pathLimit ?? Math.min(8, constellation.edges.length));
  const events = Object.freeze(worldMethodWayfindingEvents(constellation, pathLimit));
  return Object.freeze({
    kind: "knowing.dream.world-method-wayfinding",
    regime: emerging.regime,
    settles: emergingSettles,
    transport: emerging.transport,
    constellation,
    events,
    trajectory: Object.freeze({
      emitted: events.length,
      visitedMethods: uniqueCount(events.flatMap((event) => [event.from.method, event.to.method])),
      relations: uniqueCount(events.map((event) => event.edge.relation)),
      continues: true,
    }),
    theory: Object.freeze({
      graphWalks: "walk-record-as-graph-learning-signal",
      foraging: "aperiodic-search-through-sparse-method-space",
      songlines: "navigation-as-storied-relation",
      ifa: "structured-interpretive-traversal",
      dreaming: "wayfinding-through-method-constellation",
    }),
  });
}

/** Rank the live frontiers produced by an action-research stream into next obligations. */
export function aperiodicFrontierAgenda(
  input

 = {},
) {
  const sequence = aperiodicActionResearchSequence(input);
  const items = Object.freeze(sequence.events
    .map((event) => frontierAgendaItem(event))
    .sort((left, right) => right.score - left.score || left.index - right.index));
  return Object.freeze({
    kind: "knowing.dream.frontier-agenda",
    regime: emerging.regime,
    sequence,
    items,
    method: Object.freeze({
      analyze: "rank-residue-by-persistence-and-reachability",
      decide: "prefer-unsettled-recurrent-frontiers",
      act: "feed-next-cycle",
      repeat: true,
    }),
    theory: Object.freeze({
      researchProgram: "progressive-problemshift",
      participatoryResearch: "return-results-to-action",
      especifismo: "organized-priority-from-social-insertion",
      dreaming: "agenda-emerges-from-non-convergence",
    }),
  });
}

/** Audit the research programme carried by a non-terminating frontier agenda. */
export function aperiodicResearchProgramAudit(
  input

 = {},
) {
  const agenda = aperiodicFrontierAgenda(input);
  const finiteBridges = agenda.sequence.events.reduce(
    (sum, event) => sum + event.cycle.delta.strictBridges + event.cycle.delta.scottJoins + event.cycle.delta.transfiniteCovers,
    0,
  );
  const persistentResidues = agenda.sequence.events.reduce((sum, event) => sum + event.cycle.delta.persistentResidues, 0);
  const organize = agenda.items.filter((item) => item.priority === "organize").length;
  const experiment = agenda.items.filter((item) => item.priority === "experiment").length;
  const consolidate = agenda.items.filter((item) => item.priority === "consolidate").length;
  return Object.freeze({
    kind: "knowing.dream.research-program-audit",
    regime: emerging.regime,
    agenda,
    assessment: Object.freeze({
      phase: researchProgramPhase(finiteBridges, persistentResidues, agenda.items.length),
      finiteBridges,
      persistentResidues,
      agendaItems: agenda.items.length,
      organize,
      experiment,
      consolidate,
    }),
    heuristics: Object.freeze({
      positive: "prefer-cycles-that-produce-new-reachability-or-sharper-residue",
      negative: "do-not-declare-final-settlement-from-one-finite-bridge",
      next: "feed-the-agenda-back-into-action-research",
    }),
    theory: Object.freeze({
      lakatos: "progressive-versus-degenerating-problemshift",
      falsBorda: "participatory-return-to-the-field",
      dreaming: "non-termination-with-novelty-audit",
    }),
  });
}

export function admitAperiodicDreamInput(input, verb = "aperiodic-dream")

 {
  const value = jsonResource(input, `${verb} input`);
  const record = Array.isArray(value)
    ? { observations: value }
    : value !== null && typeof value === "object"
      ? value
      : null;
  if (record === null) throw new TypeError(`${verb}: expected an array of observations or { observations, limit }`);
  const rawObservations = record["observations"];
  if (!Array.isArray(rawObservations)) throw new TypeError(`${verb}: observations must be an array`);
  const observations = rawObservations.map((obs) => admitObservation(obs, verb));
  const limit = optionalNonNegativeInteger(record["limit"], `${verb}: limit`);
  const start = optionalNonNegativeInteger(record["start"], `${verb}: start`);
  return Object.freeze({
    observations: Object.freeze(observations),
    ...(limit === undefined ? {} : { limit }),
    ...(start === undefined ? {} : { start }),
  });
}

export function admitAperiodicHologramInput(input, verb = "aperiodic-hologram")

 {
  const value = jsonResource(input, `${verb} input`);
  const record = Array.isArray(value)
    ? { observations: value }
    : value !== null && typeof value === "object"
      ? value
      : null;
  if (record === null) throw new TypeError(`${verb}: expected an array of observations or { observations, window?, stride?, limit?, candidatesPerWindow? }`);
  const rawObservations = record["observations"];
  if (!Array.isArray(rawObservations)) throw new TypeError(`${verb}: observations must be an array`);
  const observations = rawObservations.map((obs) => admitObservation(obs, verb));
  const window = optionalPositiveInteger(record["window"], `${verb}: window`);
  const stride = optionalPositiveInteger(record["stride"], `${verb}: stride`);
  const limit = optionalNonNegativeInteger(record["limit"], `${verb}: limit`);
  const candidatesPerWindow = optionalNonNegativeInteger(record["candidatesPerWindow"], `${verb}: candidatesPerWindow`);
  return Object.freeze({
    observations: Object.freeze(observations),
    ...(window === undefined ? {} : { window }),
    ...(stride === undefined ? {} : { stride }),
    ...(limit === undefined ? {} : { limit }),
    ...(candidatesPerWindow === undefined ? {} : { candidatesPerWindow }),
  });
}

export function admitActionResearchCycleInput(input, verb = "action-research-cycle")

 {
  const value = jsonResource(input, `${verb} input`);
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${verb}: expected { before, after, window?, stride?, limit?, candidatesPerWindow? }`);
  }
  const record = value;
  const rawBefore = record["before"];
  const rawAfter = record["after"];
  if (!Array.isArray(rawBefore)) throw new TypeError(`${verb}: before must be an array of observations`);
  if (!Array.isArray(rawAfter)) throw new TypeError(`${verb}: after must be an array of observations`);
  const before = rawBefore.map((obs) => admitObservation(obs, verb));
  const after = rawAfter.map((obs) => admitObservation(obs, verb));
  const window = optionalPositiveInteger(record["window"], `${verb}: window`);
  const stride = optionalPositiveInteger(record["stride"], `${verb}: stride`);
  const limit = optionalNonNegativeInteger(record["limit"], `${verb}: limit`);
  const candidatesPerWindow = optionalNonNegativeInteger(record["candidatesPerWindow"], `${verb}: candidatesPerWindow`);
  return Object.freeze({
    before: Object.freeze(before),
    after: Object.freeze(after),
    ...(window === undefined ? {} : { window }),
    ...(stride === undefined ? {} : { stride }),
    ...(limit === undefined ? {} : { limit }),
    ...(candidatesPerWindow === undefined ? {} : { candidatesPerWindow }),
  });
}

export function admitActionResearchSequenceInput(input, verb = "action-research-sequence")

 {
  const value = jsonResource(input, `${verb} input`);
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${verb}: expected { before, batches, window?, stride?, limit?, candidatesPerWindow?, cycleLimit? }`);
  }
  const record = value;
  const rawBefore = record["before"];
  const rawBatches = record["batches"];
  if (!Array.isArray(rawBefore)) throw new TypeError(`${verb}: before must be an array of observations`);
  if (!Array.isArray(rawBatches)) throw new TypeError(`${verb}: batches must be an array of observation arrays`);
  const before = rawBefore.map((obs) => admitObservation(obs, verb));
  const batches = rawBatches.map((batch, index) => {
    if (!Array.isArray(batch)) throw new TypeError(`${verb}: batches[${index}] must be an array of observations`);
    return Object.freeze(batch.map((obs) => admitObservation(obs, verb)));
  });
  const window = optionalPositiveInteger(record["window"], `${verb}: window`);
  const stride = optionalPositiveInteger(record["stride"], `${verb}: stride`);
  const limit = optionalNonNegativeInteger(record["limit"], `${verb}: limit`);
  const candidatesPerWindow = optionalNonNegativeInteger(record["candidatesPerWindow"], `${verb}: candidatesPerWindow`);
  const cycleLimit = optionalNonNegativeInteger(record["cycleLimit"], `${verb}: cycleLimit`);
  return Object.freeze({
    before: Object.freeze(before),
    batches: Object.freeze(batches),
    ...(window === undefined ? {} : { window }),
    ...(stride === undefined ? {} : { stride }),
    ...(limit === undefined ? {} : { limit }),
    ...(candidatesPerWindow === undefined ? {} : { candidatesPerWindow }),
    ...(cycleLimit === undefined ? {} : { cycleLimit }),
  });
}

export function admitPraxisFeedbackInput(input, verb = "praxis-feedback")

 {
  const value = jsonResource(input, `${verb} input`);
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${verb}: expected { before, after, limit? }`);
  }
  const record = value;
  const rawBefore = record["before"];
  const rawAfter = record["after"];
  if (!Array.isArray(rawBefore)) throw new TypeError(`${verb}: before must be an array of observations`);
  if (!Array.isArray(rawAfter)) throw new TypeError(`${verb}: after must be an array of observations`);
  const before = rawBefore.map((obs) => admitObservation(obs, verb));
  const after = rawAfter.map((obs) => admitObservation(obs, verb));
  const limit = optionalNonNegativeInteger(record["limit"], `${verb}: limit`);
  return Object.freeze({
    before: Object.freeze(before),
    after: Object.freeze(after),
    ...(limit === undefined ? {} : { limit }),
  });
}

const aperiodicDreamInputCarrier = schemaFrom({
  $id: "knowing/dreaming/input/aperiodic-dream",
  type: "object",
  properties: {
    observations: { type: "array" },
    limit: { type: "integer", minimum: 0 },
    start: { type: "integer", minimum: 0 },
  },
  required: ["observations"],
  additionalProperties: true,
});

const aperiodicResidueInputCarrier = schemaFrom({
  $id: "knowing/dreaming/input/aperiodic-residue",
  type: "object",
  properties: {
    observations: { type: "array" },
  },
  required: ["observations"],
  additionalProperties: true,
});

const praxisProbesInputCarrier = schemaFrom({
  $id: "knowing/dreaming/input/praxis-probes",
  type: "object",
  properties: {
    observations: { type: "array" },
    limit: { type: "integer", minimum: 0 },
  },
  required: ["observations"],
  additionalProperties: true,
});

const aperiodicResearchCarrier = schemaFrom({
  $id: "knowing/dreaming/aperiodic-research",
  type: "object",
  required: ["kind", "regime", "settles", "transport", "candidates", "residue"],
  properties: {
    kind: { const: "knowing.dream.aperiodic-research" },
    regime: { const: emerging.regime },
    settles: { const: emergingSettles },
    transport: { const: emerging.transport },
    candidates: { type: "array" },
    residue: { type: "object" },
  },
  "x-settlement-filtration": dreamSettlements.emerge,
});

const discoveryLedgerCarrier = schemaFrom({
  $id: "knowing/dreaming/discovery-ledger",
  type: "object",
  required: ["kind", "regime", "finite", "aperiodic", "residue", "verdict", "theory"],
  properties: {
    kind: { const: "knowing.dream.discovery-ledger" },
    regime: { const: emerging.regime },
    finite: { type: "array" },
    aperiodic: { type: "array" },
    residue: { type: "object" },
    verdict: { type: "object" },
    theory: { type: "object" },
  },
});

const praxisProbesCarrier = schemaFrom({
  $id: "knowing/dreaming/praxis-probes",
  type: "object",
  required: ["kind", "regime", "residue", "probes", "method", "theory"],
  properties: {
    kind: { const: "knowing.dream.praxis-probes" },
    regime: { const: emerging.regime },
    residue: { type: "object" },
    probes: { type: "array" },
    method: { type: "object" },
    theory: { type: "object" },
  },
});

const aperiodicResidueCarrier = schemaFrom({
  $id: "knowing/dreaming/aperiodic-residue",
  type: "object",
  required: ["kind", "regime", "observations", "pairs", "theory"],
  properties: {
    kind: { const: "knowing.dream.aperiodic-residue" },
    regime: { const: emerging.regime },
    observations: { type: "integer", minimum: 0 },
    pairs: { type: "array" },
    theory: { type: "object" },
  },
});

const praxisFrontierCarrier = schemaFrom({
  $id: "knowing/dreaming/praxis-frontier",
  type: "object",
  required: ["kind", "regime", "residue", "interventions", "doctrine"],
  properties: {
    kind: { const: "knowing.dream.praxis-frontier" },
    regime: { const: emerging.regime },
    residue: { type: "object" },
    interventions: { type: "array" },
    doctrine: { type: "object" },
  },
});

const aperiodicHologramInputCarrier = schemaFrom({
  $id: "knowing/dreaming/input/aperiodic-hologram",
  type: "object",
  properties: {
    observations: { type: "array" },
    window: { type: "integer", minimum: 1 },
    stride: { type: "integer", minimum: 1 },
    limit: { type: "integer", minimum: 0 },
    candidatesPerWindow: { type: "integer", minimum: 0 },
  },
  required: ["observations"],
  additionalProperties: true,
});

const actionResearchCycleInputCarrier = schemaFrom({
  $id: "knowing/dreaming/input/action-research-cycle",
  type: "object",
  properties: {
    before: { type: "array" },
    after: { type: "array" },
    window: { type: "integer", minimum: 1 },
    stride: { type: "integer", minimum: 1 },
    limit: { type: "integer", minimum: 0 },
    candidatesPerWindow: { type: "integer", minimum: 0 },
  },
  required: ["before", "after"],
  additionalProperties: true,
});

const actionResearchSequenceInputCarrier = schemaFrom({
  $id: "knowing/dreaming/input/action-research-sequence",
  type: "object",
  properties: {
    before: { type: "array" },
    batches: { type: "array" },
    window: { type: "integer", minimum: 1 },
    stride: { type: "integer", minimum: 1 },
    limit: { type: "integer", minimum: 0 },
    candidatesPerWindow: { type: "integer", minimum: 0 },
    cycleLimit: { type: "integer", minimum: 0 },
  },
  required: ["before", "batches"],
  additionalProperties: true,
});

const worldMethodInputCarrier = schemaFrom({
  $id: "knowing/dreaming/input/world-method",
  type: "object",
  properties: {
    before: { type: "array" },
    batches: { type: "array" },
    window: { type: "integer", minimum: 1 },
    stride: { type: "integer", minimum: 1 },
    limit: { type: "integer", minimum: 0 },
    candidatesPerWindow: { type: "integer", minimum: 0 },
    cycleLimit: { type: "integer", minimum: 0 },
    methodLimit: { type: "integer", minimum: 0 },
  },
  required: ["before", "batches"],
  additionalProperties: true,
});

const worldMethodBraidInputCarrier = schemaFrom({
  $id: "knowing/dreaming/input/world-method-braid",
  type: "object",
  properties: {
    before: { type: "array" },
    batches: { type: "array" },
    window: { type: "integer", minimum: 1 },
    stride: { type: "integer", minimum: 1 },
    limit: { type: "integer", minimum: 0 },
    candidatesPerWindow: { type: "integer", minimum: 0 },
    cycleLimit: { type: "integer", minimum: 0 },
    methodLimit: { type: "integer", minimum: 0 },
    braidLimit: { type: "integer", minimum: 0 },
  },
  required: ["before", "batches"],
  additionalProperties: true,
});

const worldMethodWayfindingInputCarrier = schemaFrom({
  $id: "knowing/dreaming/input/world-method-wayfinding",
  type: "object",
  properties: {
    before: { type: "array" },
    batches: { type: "array" },
    window: { type: "integer", minimum: 1 },
    stride: { type: "integer", minimum: 1 },
    limit: { type: "integer", minimum: 0 },
    candidatesPerWindow: { type: "integer", minimum: 0 },
    cycleLimit: { type: "integer", minimum: 0 },
    methodLimit: { type: "integer", minimum: 0 },
    braidLimit: { type: "integer", minimum: 0 },
    pathLimit: { type: "integer", minimum: 0 },
  },
  required: ["before", "batches"],
  additionalProperties: true,
});

const praxisFeedbackInputCarrier = schemaFrom({
  $id: "knowing/dreaming/input/praxis-feedback",
  type: "object",
  properties: {
    before: { type: "array" },
    after: { type: "array" },
    limit: { type: "integer", minimum: 0 },
  },
  required: ["before", "after"],
  additionalProperties: true,
});

const dreamObjectCarrier = (
  id,
  required,
  properties,
  settlement,
) => schemaFrom({
  $id: id,
  type: "object",
  required,
  properties,
  ...(settlement === undefined ? {} : { "x-settlement-filtration": settlement }),
});

const aperiodicHologramCarrier = dreamObjectCarrier(
  "knowing/dreaming/aperiodic-hologram",
  ["kind", "regime", "settles", "transport", "projections", "recurrences", "frontier", "theory"],
  {
    kind: { const: "knowing.dream.aperiodic-hologram" },
    regime: { const: emerging.regime },
    settles: { const: emergingSettles },
    transport: { const: emerging.transport },
    projections: { type: "array" },
    recurrences: { type: "array" },
    frontier: { type: "object" },
    theory: { type: "object" },
  },
  dreamSettlements.emerge,
);

const holographicPraxisCarrier = dreamObjectCarrier(
  "knowing/dreaming/holographic-praxis",
  ["kind", "regime", "hologram", "interventions", "doctrine", "theory"],
  {
    kind: { const: "knowing.dream.holographic-praxis" },
    regime: { const: emerging.regime },
    hologram: { type: "object" },
    interventions: { type: "array" },
    doctrine: { type: "object" },
    theory: { type: "object" },
  },
);

const conjuncturalPraxisCarrier = dreamObjectCarrier(
  "knowing/dreaming/conjunctural-praxis",
  ["kind", "regime", "praxis", "lines", "program", "theory"],
  {
    kind: { const: "knowing.dream.conjunctural-praxis" },
    regime: { const: emerging.regime },
    praxis: { type: "object" },
    lines: { type: "array" },
    program: { type: "object" },
    theory: { type: "object" },
  },
);

const actionResearchCycleCarrier = dreamObjectCarrier(
  "knowing/dreaming/action-research-cycle",
  ["kind", "regime", "settles", "before", "feedback", "after", "delta", "loop", "theory"],
  {
    kind: { const: "knowing.dream.action-research-cycle" },
    regime: { const: emerging.regime },
    settles: { const: emergingSettles },
    before: { type: "object" },
    feedback: { type: "object" },
    after: { type: "object" },
    delta: { type: "object" },
    loop: { type: "object" },
    theory: { type: "object" },
  },
  dreamSettlements.emerge,
);

const actionResearchSequenceCarrier = dreamObjectCarrier(
  "knowing/dreaming/action-research-sequence",
  ["kind", "regime", "settles", "transport", "events", "trajectory"],
  {
    kind: { const: "knowing.dream.action-research-sequence" },
    regime: { const: emerging.regime },
    settles: { const: emergingSettles },
    transport: { const: emerging.transport },
    events: { type: "array" },
    trajectory: { type: "object" },
  },
  dreamSettlements.emerge,
);

const metastableTrajectoryCarrier = dreamObjectCarrier(
  "knowing/dreaming/metastable-trajectory",
  ["kind", "regime", "settles", "sequence", "steps", "assessment", "next", "theory"],
  {
    kind: { const: "knowing.dream.metastable-trajectory" },
    regime: { const: emerging.regime },
    settles: { const: emergingSettles },
    sequence: { type: "object" },
    steps: { type: "array" },
    assessment: { type: "object" },
    next: { type: "object" },
    theory: { type: "object" },
  },
  dreamSettlements.emerge,
);

const worldMethodRepertoireCarrier = dreamObjectCarrier(
  "knowing/dreaming/world-method-repertoire",
  ["kind", "regime", "settles", "trajectory", "agenda", "methods", "selected", "doctrine", "theory"],
  {
    kind: { const: "knowing.dream.world-method-repertoire" },
    regime: { const: emerging.regime },
    settles: { const: emergingSettles },
    trajectory: { type: "object" },
    agenda: { type: "object" },
    methods: { type: "array" },
    selected: { type: "array" },
    doctrine: { type: "object" },
    theory: { type: "object" },
  },
  dreamSettlements.emerge,
);

const worldMethodInterventionPlanCarrier = dreamObjectCarrier(
  "knowing/dreaming/world-method-intervention-plan",
  ["kind", "regime", "settles", "repertoire", "interventions", "after", "projected", "loop", "theory"],
  {
    kind: { const: "knowing.dream.world-method-intervention-plan" },
    regime: { const: emerging.regime },
    settles: { const: emergingSettles },
    repertoire: { type: "object" },
    interventions: { type: "array" },
    after: { type: "array" },
    projected: { type: "object" },
    loop: { type: "object" },
    theory: { type: "object" },
  },
  dreamSettlements.emerge,
);

const worldMethodFeedbackCarrier = dreamObjectCarrier(
  "knowing/dreaming/world-method-feedback",
  ["kind", "regime", "settles", "plan", "effects", "adapted", "summary", "loop", "theory"],
  {
    kind: { const: "knowing.dream.world-method-feedback" },
    regime: { const: emerging.regime },
    settles: { const: emergingSettles },
    plan: { type: "object" },
    effects: { type: "array" },
    adapted: { type: "array" },
    summary: { type: "object" },
    loop: { type: "object" },
    theory: { type: "object" },
  },
  dreamSettlements.emerge,
);

const worldMethodEcologyCarrier = dreamObjectCarrier(
  "knowing/dreaming/world-method-ecology",
  ["kind", "regime", "settles", "feedback", "variety", "verdict", "obligations", "loop", "theory"],
  {
    kind: { const: "knowing.dream.world-method-ecology" },
    regime: { const: emerging.regime },
    settles: { const: emergingSettles },
    feedback: { type: "object" },
    variety: { type: "object" },
    verdict: { type: "string" },
    obligations: { type: "array" },
    loop: { type: "object" },
    theory: { type: "object" },
  },
  dreamSettlements.emerge,
);

const worldMethodBraidCarrier = dreamObjectCarrier(
  "knowing/dreaming/world-method-braid",
  ["kind", "regime", "settles", "ecology", "pairs", "after", "projected", "loop", "theory"],
  {
    kind: { const: "knowing.dream.world-method-braid" },
    regime: { const: emerging.regime },
    settles: { const: emergingSettles },
    ecology: { type: "object" },
    pairs: { type: "array" },
    after: { type: "array" },
    projected: { type: "object" },
    loop: { type: "object" },
    theory: { type: "object" },
  },
  dreamSettlements.emerge,
);

const worldMethodConstellationCarrier = dreamObjectCarrier(
  "knowing/dreaming/world-method-constellation",
  ["kind", "regime", "settles", "braid", "nodes", "edges", "topology", "obligations", "theory"],
  {
    kind: { const: "knowing.dream.world-method-constellation" },
    regime: { const: emerging.regime },
    settles: { const: emergingSettles },
    braid: { type: "object" },
    nodes: { type: "array" },
    edges: { type: "array" },
    topology: { type: "object" },
    obligations: { type: "array" },
    theory: { type: "object" },
  },
  dreamSettlements.emerge,
);

const worldMethodWayfindingCarrier = dreamObjectCarrier(
  "knowing/dreaming/world-method-wayfinding",
  ["kind", "regime", "settles", "transport", "constellation", "events", "trajectory", "theory"],
  {
    kind: { const: "knowing.dream.world-method-wayfinding" },
    regime: { const: emerging.regime },
    settles: { const: emergingSettles },
    transport: { const: emerging.transport },
    constellation: { type: "object" },
    events: { type: "array" },
    trajectory: { type: "object" },
    theory: { type: "object" },
  },
  dreamSettlements.emerge,
);

const frontierAgendaCarrier = dreamObjectCarrier(
  "knowing/dreaming/frontier-agenda",
  ["kind", "regime", "sequence", "items", "method", "theory"],
  {
    kind: { const: "knowing.dream.frontier-agenda" },
    regime: { const: emerging.regime },
    sequence: { type: "object" },
    items: { type: "array" },
    method: { type: "object" },
    theory: { type: "object" },
  },
);

const researchProgramAuditCarrier = dreamObjectCarrier(
  "knowing/dreaming/research-program-audit",
  ["kind", "regime", "agenda", "assessment", "heuristics", "theory"],
  {
    kind: { const: "knowing.dream.research-program-audit" },
    regime: { const: emerging.regime },
    agenda: { type: "object" },
    assessment: { type: "object" },
    heuristics: { type: "object" },
    theory: { type: "object" },
  },
);

const praxisFeedbackCarrier = dreamObjectCarrier(
  "knowing/dreaming/praxis-feedback",
  ["kind", "regime", "before", "after", "effects", "loop"],
  {
    kind: { const: "knowing.dream.praxis-feedback" },
    regime: { const: emerging.regime },
    before: { type: "object" },
    after: { type: "object" },
    effects: { type: "array" },
    loop: { type: "object" },
  },
);

export const aperiodicDreamAction = operation({
  verb: "aperiodic-dream",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Stream aperiodic dreaming as research-grade conjectures emitted from non-convergent residue.",
  description: "Domain: { observations, limit?, start? } or an observation array. Codomain: a bounded prefix of the unsettling knowing.dream.aperiodic-research session. Each candidate is tagged with the finite regimes that cannot derive it; the genuinely-new candidates are exactly the non-convergent residue outside strict, scott, and transfinite-bounded dreaming.",
  domain: aperiodicDreamInputCarrier,
  codomain: aperiodicResearchCarrier,
  run: (input) => {
    const admitted = admitAperiodicDreamInput(input);
    const options = {
      ...(admitted.limit === undefined ? {} : { limit: admitted.limit }),
      ...(admitted.start === undefined ? {} : { start: admitted.start }),
    };
    return jsonResource(aperiodicDream(admitted, options), "aperiodic dream");
  },
});

export const discoveryLedgerAction = operation({
  verb: "discovery-ledger",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Audit finite dream products against genuinely new aperiodic candidates.",
  description: "Domain: { observations, limit?, start? } or an observation array. Codomain: knowing.dream.discovery-ledger. The ledger runs strict, scott, and transfinite-bounded dreaming, then records aperiodic candidates whose novelty is exactly certified by finite-regime exclusion.",
  domain: aperiodicDreamInputCarrier,
  codomain: discoveryLedgerCarrier,
  run: (input) => {
    const admitted = admitAperiodicDreamInput(input, "discovery-ledger");
    return jsonResource(aperiodicDiscoveryLedger(admitted), "discovery ledger");
  },
});

export const praxisProbesAction = operation({
  verb: "praxis-probes",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Generate concrete observation probes for testing aperiodic residue against finite regimes.",
  description: "Domain: { observations, limit? } or an observation array. Codomain: knowing.dream.praxis-probes. For each finite-excluded residue pair, emits strict-chain, repeated-cell, and shared-subject probe observations whose results should be re-entered through praxis-feedback.",
  domain: praxisProbesInputCarrier,
  codomain: praxisProbesCarrier,
  run: (input) => {
    const admitted = admitAperiodicDreamInput(input, "praxis-probes");
    return jsonResource(aperiodicPraxisProbes(admitted), "praxis probes");
  },
});

export const aperiodicResidueAction = operation({
  verb: "aperiodic-residue",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Extract the non-convergent residue: observation pairs no finite dream regime can reach.",
  description: "Domain: { observations } or an observation array. Codomain: knowing.dream.aperiodic-residue, the reusable residue carrier whose pairs carry strict, scott, and transfinite-bounded exclusion witnesses. This is the theory/practice hinge: the part finite closure cannot settle is the frontier dreaming acts on.",
  domain: aperiodicResidueInputCarrier,
  codomain: aperiodicResidueCarrier,
  run: (input) => {
    const admitted = admitAperiodicDreamInput(input, "aperiodic-residue");
    return jsonResource(aperiodicResidue(admitted.observations), "aperiodic residue");
  },
});

export const praxisFrontierAction = operation({
  verb: "praxis-frontier",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Turn aperiodic residue into theory-practice intervention obligations with feedback loops.",
  description: "Domain: { observations, limit? } or an observation array. Codomain: knowing.dream.praxis-frontier. This reads non-convergent residue through aperiodic order, contextual obstruction, autopoietic structural coupling, and South American especifista praxis: theory only counts when it returns to material intervention and re-observation.",
  domain: praxisProbesInputCarrier,
  codomain: praxisFrontierCarrier,
  run: (input) => {
    const admitted = admitAperiodicDreamInput(input, "praxis-frontier");
    return jsonResource(aperiodicPraxisFrontier(admitted), "praxis frontier");
  },
});

export const aperiodicHologramAction = operation({
  verb: "aperiodic-hologram",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Project an ordered agent observation stream into local aperiodic residue windows and recurrent holographic frontiers.",
  description: "Domain: { observations, window?, stride?, limit?, candidatesPerWindow? } or an observation array. Codomain: knowing.dream.aperiodic-hologram. Each local window computes the finite-regime-excluded residue and a bounded conjecture prefix; recurrences report non-convergent structures visible across multiple local projections.",
  domain: aperiodicHologramInputCarrier,
  codomain: aperiodicHologramCarrier,
  run: (input) => {
    const admitted = admitAperiodicHologramInput(input);
    return jsonResource(aperiodicHologram(admitted), "aperiodic hologram");
  },
});

export const holographicPraxisAction = operation({
  verb: "holographic-praxis",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Turn recurrent aperiodic hologram residue into organized praxis obligations.",
  description: "Domain: { observations, window?, stride?, limit?, candidatesPerWindow? } or an observation array. Codomain: knowing.dream.holographic-praxis. This reads recurrent non-convergent residue across local windows as the organized frontier: act where the same finite-excluded structure keeps becoming locally visible, then reobserve those windows and classify praxis feedback.",
  domain: aperiodicHologramInputCarrier,
  codomain: holographicPraxisCarrier,
  run: (input) => {
    const admitted = admitAperiodicHologramInput(input, "holographic-praxis");
    return jsonResource(aperiodicHolographicPraxis(admitted), "holographic praxis");
  },
});

export const conjuncturalPraxisAction = operation({
  verb: "conjunctural-praxis",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Build an analysis-strategy-tactics-feedback program from recurrent aperiodic hologram residue.",
  description: "Domain: { observations, window?, stride?, limit?, candidatesPerWindow? } or an observation array. Codomain: knowing.dream.conjunctural-praxis. This turns holographic praxis into a concrete program: analyze the recurrent finite-excluded residue, select local windows for social insertion, name situated tactics, and send results back through praxis-feedback.",
  domain: aperiodicHologramInputCarrier,
  codomain: conjuncturalPraxisCarrier,
  run: (input) => {
    const admitted = admitAperiodicHologramInput(input, "conjunctural-praxis");
    return jsonResource(aperiodicConjuncturalPraxis(admitted), "conjunctural praxis");
  },
});

export const actionResearchCycleAction = operation({
  verb: "action-research-cycle",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Run one participatory action-research cycle over aperiodic conjunctural praxis.",
  description: "Domain: { before, after, window?, stride?, limit?, candidatesPerWindow? }. Codomain: knowing.dream.action-research-cycle. This composes conjunctural-praxis before action, praxis-feedback after situated observations, and the next conjunctural-praxis frontier, explicitly marking the loop as continuing rather than terminating.",
  domain: actionResearchCycleInputCarrier,
  codomain: actionResearchCycleCarrier,
  run: (input) => {
    const admitted = admitActionResearchCycleInput(input);
    return jsonResource(aperiodicActionResearchCycle(admitted), "action research cycle");
  },
});

export const actionResearchSequenceAction = operation({
  verb: "action-research-sequence",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Return a bounded prefix of repeated aperiodic action-research cycles.",
  description: "Domain: { before, batches, window?, stride?, limit?, candidatesPerWindow?, cycleLimit? }. Codomain: knowing.dream.action-research-sequence. Each batch is folded into the accumulated observation field, producing an action-research-cycle event whose trajectory remains aperiodic and explicitly continues.",
  domain: actionResearchSequenceInputCarrier,
  codomain: actionResearchSequenceCarrier,
  run: (input) => {
    const admitted = admitActionResearchSequenceInput(input);
    return jsonResource(aperiodicActionResearchSequence(admitted), "action research sequence");
  },
});

export const metastableTrajectoryAction = operation({
  verb: "metastable-trajectory",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Read an aperiodic action-research stream as a metastable, non-stationary discovery trajectory.",
  description: "Domain: { before, batches, window?, stride?, limit?, candidatesPerWindow?, cycleLimit? }. Codomain: knowing.dream.metastable-trajectory. Interprets finite bridges as integration, persistent residue as segregation, and changing cycle signatures as non-stationary drift, then routes the open trajectory back to frontier-agenda rather than declaring settlement.",
  domain: actionResearchSequenceInputCarrier,
  codomain: metastableTrajectoryCarrier,
  run: (input) => {
    const admitted = admitActionResearchSequenceInput(input, "metastable-trajectory");
    return jsonResource(aperiodicMetastableTrajectory(admitted), "metastable trajectory");
  },
});

export const worldMethodRepertoireAction = operation({
  verb: "world-method-repertoire",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Choose global-historical inquiry methods for the current aperiodic research trajectory.",
  description: "Domain: { before, batches, window?, stride?, limit?, candidatesPerWindow?, cycleLimit?, methodLimit? }. Codomain: knowing.dream.world-method-repertoire. Reads the metastable trajectory and frontier agenda, then ranks intervention methods drawn from active inference, enaction/autopoiesis, catuskoti-style paraconsistency, Ibn Khaldun's asabiyyah, Huerta Grande conjunctural praxis, and second-order cybernetics.",
  domain: worldMethodInputCarrier,
  codomain: worldMethodRepertoireCarrier,
  run: (input) => {
    const admitted = admitActionResearchSequenceInput(input, "world-method-repertoire");
    const value = jsonResource(input, "world-method-repertoire input");
    const methodLimit = value !== null && typeof value === "object" && !Array.isArray(value)
      ? optionalNonNegativeInteger((value)["methodLimit"], "world-method-repertoire: methodLimit")
      : undefined;
    return jsonResource(aperiodicWorldMethodRepertoire({ ...admitted, ...(methodLimit === undefined ? {} : { methodLimit }) }), "world method repertoire");
  },
});

export const worldMethodInterventionPlanAction = operation({
  verb: "world-method-intervention-plan",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Turn selected global-historical methods into concrete next-batch observations.",
  description: "Domain: { before, batches, window?, stride?, limit?, candidatesPerWindow?, cycleLimit?, methodLimit? }. Codomain: knowing.dream.world-method-intervention-plan. Selects methods with world-method-repertoire, emits one first-class Observation obligation per selected method, and projects the next action-research-cycle over those observations without terminating the aperiodic loop.",
  domain: worldMethodInputCarrier,
  codomain: worldMethodInterventionPlanCarrier,
  run: (input) => {
    const admitted = admitActionResearchSequenceInput(input, "world-method-intervention-plan");
    const value = jsonResource(input, "world-method-intervention-plan input");
    const methodLimit = value !== null && typeof value === "object" && !Array.isArray(value)
      ? optionalNonNegativeInteger((value)["methodLimit"], "world-method-intervention-plan: methodLimit")
      : undefined;
    return jsonResource(aperiodicWorldMethodInterventionPlan({ ...admitted, ...(methodLimit === undefined ? {} : { methodLimit }) }), "world method intervention plan");
  },
});

export const worldMethodFeedbackAction = operation({
  verb: "world-method-feedback",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Evaluate which global-historical methods changed the aperiodic frontier.",
  description: "Domain: { before, batches, window?, stride?, limit?, candidatesPerWindow?, cycleLimit?, methodLimit? }. Codomain: knowing.dream.world-method-feedback. Builds a world-method-intervention-plan, tests each selected method's observation through its own action-research-cycle, and adapts method priorities without settling the research loop.",
  domain: worldMethodInputCarrier,
  codomain: worldMethodFeedbackCarrier,
  run: (input) => {
    const admitted = admitActionResearchSequenceInput(input, "world-method-feedback");
    const value = jsonResource(input, "world-method-feedback input");
    const methodLimit = value !== null && typeof value === "object" && !Array.isArray(value)
      ? optionalNonNegativeInteger((value)["methodLimit"], "world-method-feedback: methodLimit")
      : undefined;
    return jsonResource(aperiodicWorldMethodFeedback({ ...admitted, ...(methodLimit === undefined ? {} : { methodLimit }) }), "world method feedback");
  },
});

export const worldMethodEcologyAction = operation({
  verb: "world-method-ecology",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Audit whether the global-historical method loop has enough variety for the aperiodic frontier.",
  description: "Domain: { before, batches, window?, stride?, limit?, candidatesPerWindow?, cycleLimit?, methodLimit? }. Codomain: knowing.dream.world-method-ecology. Reads world-method-feedback and audits selected methods for requisite variety across regions, periods, next carriers, and feedback assessments, producing obligations when the method ecology collapses toward monoculture.",
  domain: worldMethodInputCarrier,
  codomain: worldMethodEcologyCarrier,
  run: (input) => {
    const admitted = admitActionResearchSequenceInput(input, "world-method-ecology");
    const value = jsonResource(input, "world-method-ecology input");
    const methodLimit = value !== null && typeof value === "object" && !Array.isArray(value)
      ? optionalNonNegativeInteger((value)["methodLimit"], "world-method-ecology: methodLimit")
      : undefined;
    return jsonResource(aperiodicWorldMethodEcology({ ...admitted, ...(methodLimit === undefined ? {} : { methodLimit }) }), "world method ecology");
  },
});

export const worldMethodBraidAction = operation({
  verb: "world-method-braid",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Braid complementary global-historical methods into combined aperiodic interventions.",
  description: "Domain: { before, batches, window?, stride?, limit?, candidatesPerWindow?, cycleLimit?, methodLimit?, braidLimit? }. Codomain: knowing.dream.world-method-braid. Reads world-method-ecology, pairs complementary adapted methods across regions, periods, and next carriers, emits one combined Observation per pair, and projects the next action-research-cycle without settling the loop.",
  domain: worldMethodBraidInputCarrier,
  codomain: worldMethodBraidCarrier,
  run: (input) => {
    const admitted = admitActionResearchSequenceInput(input, "world-method-braid");
    const value = jsonResource(input, "world-method-braid input");
    const record = value !== null && typeof value === "object" && !Array.isArray(value) ? value : {};
    const methodLimit = optionalNonNegativeInteger(record["methodLimit"], "world-method-braid: methodLimit");
    const braidLimit = optionalNonNegativeInteger(record["braidLimit"], "world-method-braid: braidLimit");
    return jsonResource(aperiodicWorldMethodBraid({
      ...admitted,
      ...(methodLimit === undefined ? {} : { methodLimit }),
      ...(braidLimit === undefined ? {} : { braidLimit }),
    }), "world method braid");
  },
});

export const worldMethodConstellationAction = operation({
  verb: "world-method-constellation",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Build a constellation graph over the global-historical method ecology.",
  description: "Domain: { before, batches, window?, stride?, limit?, candidatesPerWindow?, cycleLimit?, methodLimit?, braidLimit? }. Codomain: knowing.dream.world-method-constellation. Reads world-method-braid and builds a graph of selected/adapted methods with braided-complementarity, historical-translation, standpoint-tension, and reciprocity-obligation edges.",
  domain: worldMethodBraidInputCarrier,
  codomain: worldMethodConstellationCarrier,
  run: (input) => {
    const admitted = admitActionResearchSequenceInput(input, "world-method-constellation");
    const value = jsonResource(input, "world-method-constellation input");
    const record = value !== null && typeof value === "object" && !Array.isArray(value) ? value : {};
    const methodLimit = optionalNonNegativeInteger(record["methodLimit"], "world-method-constellation: methodLimit");
    const braidLimit = optionalNonNegativeInteger(record["braidLimit"], "world-method-constellation: braidLimit");
    return jsonResource(aperiodicWorldMethodConstellation({
      ...admitted,
      ...(methodLimit === undefined ? {} : { methodLimit }),
      ...(braidLimit === undefined ? {} : { braidLimit }),
    }), "world method constellation");
  },
});

export const worldMethodWayfindingAction = operation({
  verb: "world-method-wayfinding",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Walk the world-method constellation as a bounded aperiodic prefix.",
  description: "Domain: { before, batches, window?, stride?, limit?, candidatesPerWindow?, cycleLimit?, methodLimit?, braidLimit?, pathLimit? }. Codomain: knowing.dream.world-method-wayfinding. Builds a world-method-constellation, traverses its method-relation graph with a Sturmian aperiodic step schedule, and emits navigation observations for the next research loop.",
  domain: worldMethodWayfindingInputCarrier,
  codomain: worldMethodWayfindingCarrier,
  run: (input) => {
    const admitted = admitActionResearchSequenceInput(input, "world-method-wayfinding");
    const value = jsonResource(input, "world-method-wayfinding input");
    const record = value !== null && typeof value === "object" && !Array.isArray(value) ? value : {};
    const methodLimit = optionalNonNegativeInteger(record["methodLimit"], "world-method-wayfinding: methodLimit");
    const braidLimit = optionalNonNegativeInteger(record["braidLimit"], "world-method-wayfinding: braidLimit");
    const pathLimit = optionalNonNegativeInteger(record["pathLimit"], "world-method-wayfinding: pathLimit");
    return jsonResource(aperiodicWorldMethodWayfinding({
      ...admitted,
      ...(methodLimit === undefined ? {} : { methodLimit }),
      ...(braidLimit === undefined ? {} : { braidLimit }),
      ...(pathLimit === undefined ? {} : { pathLimit }),
    }), "world method wayfinding");
  },
});

export const frontierAgendaAction = operation({
  verb: "frontier-agenda",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Rank aperiodic action-research stream events into next research obligations.",
  description: "Domain: { before, batches, window?, stride?, limit?, candidatesPerWindow?, cycleLimit? }. Codomain: knowing.dream.frontier-agenda. This reads the non-terminating action-research sequence and ranks each cycle by persistent residue, new finite reachability, and remaining lines, producing the next agenda for participatory aperiodic research.",
  domain: actionResearchSequenceInputCarrier,
  codomain: frontierAgendaCarrier,
  run: (input) => {
    const admitted = admitActionResearchSequenceInput(input, "frontier-agenda");
    return jsonResource(aperiodicFrontierAgenda(admitted), "frontier agenda");
  },
});

export const researchProgramAuditAction = operation({
  verb: "research-program-audit",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Audit whether an aperiodic action-research stream is progressive, open, or degenerating.",
  description: "Domain: { before, batches, window?, stride?, limit?, candidatesPerWindow?, cycleLimit? }. Codomain: knowing.dream.research-program-audit. This applies a Lakatos-style progressive/degenerating problemshift read to the frontier agenda while preserving the aperiodic rule that one finite bridge never terminates the research loop.",
  domain: actionResearchSequenceInputCarrier,
  codomain: researchProgramAuditCarrier,
  run: (input) => {
    const admitted = admitActionResearchSequenceInput(input, "research-program-audit");
    return jsonResource(aperiodicResearchProgramAudit(admitted), "research program audit");
  },
});

export const praxisFeedbackAction = operation({
  verb: "praxis-feedback",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Fold post-intervention observations back into aperiodic dreaming and classify what changed.",
  description: "Domain: { before, after, limit? }. Codomain: knowing.dream.praxis-feedback. This closes the theory-practice-theory loop: residue produces interventions, practice adds observations, and the carrier reports which finite regimes became able to reach the former residue and which residue still persists.",
  domain: praxisFeedbackInputCarrier,
  codomain: praxisFeedbackCarrier,
  run: (input) => {
    const admitted = admitPraxisFeedbackInput(input);
    return jsonResource(aperiodicPraxisFeedback(admitted), "praxis feedback");
  },
});

/** Build a frozen `DreamResult`: its regime, observations, and their knowledge-joined evidence. */
export function dreamResult(regime, observations) {
  return Object.freeze({
    regime,
    observations: Object.freeze([...observations]),
    evidence: observations.reduce((left, obs) => knowledgeJoin(left, obs.evidence), noEvidence),
  });
}

function aperiodicResiduePairs(observations) {
  const out = [];
  for (let i = 0; i < observations.length; i++) {
    for (let j = i + 1; j < observations.length; j++) {
      const left = observations[i];
      const right = observations[j];
      const reachability = finiteReachability(left, right);
      if (reachability[composing.regime] || reachability[consolidating.regime] || reachability[coPredicating.regime]) continue;
      out.push(Object.freeze({
        kind: "knowing.dream.aperiodic-residue-pair",
        left,
        right,
        finiteReachability: reachability,
        strictRegimeExclusions: finiteExclusions(),
      }));
    }
  }
  return Object.freeze(out);
}

function finiteDiscovery(regime, result) {
  return Object.freeze({
    kind: "knowing.dream.finite-discovery",
    regime,
    observations: result.observations,
    count: result.observations.length,
  });
}

function aperiodicDiscovery(candidate) {
  const unreachableBy = [];
  if (!candidate.finiteReachability[composing.regime]) unreachableBy.push(composing.regime);
  if (!candidate.finiteReachability[consolidating.regime]) unreachableBy.push(consolidating.regime);
  if (!candidate.finiteReachability[coPredicating.regime]) unreachableBy.push(coPredicating.regime);
  return Object.freeze({
    kind: "knowing.dream.aperiodic-discovery",
    regime: emerging.regime,
    candidate,
    genuinelyNew: true,
    unreachableBy: Object.freeze(unreachableBy),
  });
}

function praxisProbesForPair(pair, pairIndex) {
  return Object.freeze([
    praxisProbe(pair, pairIndex * 3, composing.regime, "strict-chain-probe", strictChainProbe(pair), "strict-chain-created", "Create the missing object-to-subject bridge between the residue pair."),
    praxisProbe(pair, pairIndex * 3 + 1, consolidating.regime, "repeat-cell-probe", repeatCellProbe(pair), "repeat-cell-created", "Create a repeated cell so the pair can be tested by knowledge-join."),
    praxisProbe(pair, pairIndex * 3 + 2, coPredicating.regime, "shared-subject-probe", sharedSubjectProbe(pair), "shared-subject-created", "Create a shared-subject co-predicate so transfinite-bounded dreaming can fire."),
  ]);
}

function praxisProbe(
  source,
  index,
  targetRegime,
  probe,
  observation,
  predictedFeedback,
  rationale,
) {
  return Object.freeze({
    kind: "knowing.dream.praxis-probe",
    index,
    regime: emerging.regime,
    targetRegime,
    probe,
    source,
    observation,
    predictedFeedback,
    rationale,
  });
}

function strictChainProbe(pair) {
  return makeObservation({
    observer: dreamTerm(["observer", emerging.regime]),
    task: makeTask({
      subject: pair.left.task.object,
      predicate: dreamPredicate(["praxis-probe", "strict-chain"]),
      object: pair.right.task.subject,
    }),
    evidence: knowledgeMeet(pair.left.evidence, pair.right.evidence),
    note: dreamMark(["praxis-probe", pair.left.task.cell, pair.right.task.cell, "strict-chain"]),
  });
}

function repeatCellProbe(pair) {
  return makeObservation({
    observer: dreamTerm(["observer", emerging.regime]),
    task: pair.left.task,
    evidence: knowledgeMeet(pair.left.evidence, pair.right.evidence),
    note: dreamMark(["praxis-probe", pair.left.task.cell, pair.right.task.cell, "repeat-cell"]),
  });
}

function sharedSubjectProbe(pair) {
  return makeObservation({
    observer: dreamTerm(["observer", emerging.regime]),
    task: makeTask({
      subject: pair.left.task.subject,
      predicate: dreamPredicate(["praxis-probe", "shared-subject"]),
      object: pair.right.task.object,
    }),
    evidence: knowledgeMeet(pair.left.evidence, pair.right.evidence),
    note: dreamMark(["praxis-probe", pair.left.task.cell, pair.right.task.cell, "shared-subject"]),
  });
}

function finiteReachability(left, right) {
  return Object.freeze({
    [composing.regime]: sameTerm(left.task.object, right.task.subject) || sameTerm(right.task.object, left.task.subject),
    [consolidating.regime]: sameCell(left.task.cell, right.task.cell),
    [coPredicating.regime]: sameTerm(left.task.subject, right.task.subject),
  });
}

function finiteExclusions() {
  return Object.freeze([
    Object.freeze({
      regime: composing.regime,
      reachable: false,
      because: "strict dreaming only composes an object-to-subject chain; the residue pair has no such chain in either direction.",
    }),
    Object.freeze({
      regime: consolidating.regime,
      reachable: false,
      because: "scott dreaming only joins repeated cells; the residue pair occupies distinct cells.",
    }),
    Object.freeze({
      regime: coPredicating.regime,
      reachable: false,
      because: "transfinite-bounded dreaming only co-predicates observations sharing a subject; the residue pair has distinct subjects.",
    }),
  ]);
}

function praxisIntervention(pair, index) {
  return Object.freeze({
    kind: "knowing.dream.praxis-intervention",
    index,
    regime: emerging.regime,
    source: pair,
    lineages: Object.freeze([
      "aperiodic-order",
      "sheaf-contextuality",
      "autopoietic-cognition",
      "south-american-especifismo",
      "critical-pedagogy",
    ]),
    reflection: "This pair is not a gap in search effort; it is residue produced by the limits of the finite closure regimes.",
    action: "Make a situated intervention that can change the observation field: create a probe, convene the affected boundary, or build a small carrier that forces the two terms to meet in practice.",
    materialCheck: "After acting, record whether the intervention produced a new chain, repeated cell, shared subject, or persistent residue.",
    feedback: Object.freeze({
      observeAgain: true,
      nextCarrier: "knowing.dream.aperiodic-residue",
      loop: "theory-practice-theory",
    }),
  });
}

function praxisFeedbackEffect(
  pair,
  index,
  afterObservations,
) {
  const field = Object.freeze([pair.left, pair.right, ...afterObservations]);
  const reachability = Object.freeze({
    [composing.regime]: strictFiniteDream(field, { limit: 1 }).observations.length > 0,
    [consolidating.regime]: scottContinuousDream(field, { limit: 1 }).observations.length > 0,
    [coPredicating.regime]: transfiniteDream(field, { limit: 1 }).observations.length > 0,
  });
  const reachableBy = [];
  if (reachability[composing.regime]) reachableBy.push(composing.regime);
  if (reachability[consolidating.regime]) reachableBy.push(consolidating.regime);
  if (reachability[coPredicating.regime]) reachableBy.push(coPredicating.regime);
  const effect = praxisFeedbackEffectKind(reachability);
  return Object.freeze({
    kind: "knowing.dream.praxis-feedback-effect",
    index,
    regime: emerging.regime,
    source: pair,
    effect,
    finiteReachability: reachability,
    reachableBy: Object.freeze(reachableBy),
    interpretation: praxisFeedbackInterpretation(effect),
  });
}

function praxisFeedbackEffectKind(reachability) {
  if (reachability[composing.regime]) return "strict-chain-created";
  if (reachability[consolidating.regime]) return "repeat-cell-created";
  if (reachability[coPredicating.regime]) return "shared-subject-created";
  return "persistent-residue";
}

export function praxisFeedbackInterpretation(effect) {
  if (effect === "strict-chain-created") return "The intervention created an object-to-subject chain; the former residue is now reachable by strict finite composition.";
  if (effect === "repeat-cell-created") return "The intervention created a repeated cell; the former residue can now be joined as a scott consolidation.";
  if (effect === "shared-subject-created") return "The intervention created a shared subject; the former residue can now be explored as a bounded transfinite co-predicate.";
  return "The intervention did not make any finite regime reach the pair; the residue persists as an aperiodic research obligation.";
}

function holographicPraxisIntervention(
  recurrence,
  index,
) {
  return Object.freeze({
    kind: "knowing.dream.holographic-praxis-intervention",
    index,
    regime: emerging.regime,
    recurrence,
    intervention: praxisIntervention(recurrence.source, index),
    organization: Object.freeze({
      method: "social-insertion-through-local-windows",
      target: "recurrent-non-convergent-residue",
      windows: recurrence.windows,
    }),
    feedback: Object.freeze({
      observeAgain: true,
      nextCarrier: "knowing.dream.praxis-feedback",
      measure: "local-window-recurrence-after-intervention",
    }),
  });
}

function conjuncturalPraxisLine(
  source,
  index,
) {
  return Object.freeze({
    kind: "knowing.dream.conjunctural-praxis-line",
    index,
    regime: emerging.regime,
    source,
    analysis: Object.freeze({
      conjuncture: "recurrent-non-convergent-residue",
      correlationOfForces: "finite-regimes-excluded",
      windows: source.organization.windows,
    }),
    strategy: Object.freeze({
      orientation: "social-insertion",
      objective: "change-the-observation-field",
      criterion: "finite-bridge-created-or-persistent-residue-certified",
    }),
    tactics: Object.freeze([
      "create a situated probe inside each recurrent local window",
      "convene the observers whose cuts expose the same residue",
      "build one small carrier that can create a strict chain, repeated cell, or shared subject",
      "record after-observations and run praxis-feedback before declaring settlement",
    ]),
    feedback: Object.freeze({
      nextCarrier: "knowing.dream.praxis-feedback",
      after: "append-situated-observations",
      question: "which finite regime became reachable, if any?",
    }),
  });
}

function actionResearchDelta(
  before,
  feedback,
  after,
) {
  return Object.freeze({
    strictBridges: feedback.effects.filter((effect) => effect.effect === "strict-chain-created").length,
    scottJoins: feedback.effects.filter((effect) => effect.effect === "repeat-cell-created").length,
    transfiniteCovers: feedback.effects.filter((effect) => effect.effect === "shared-subject-created").length,
    persistentResidues: feedback.effects.filter((effect) => effect.effect === "persistent-residue").length,
    beforeLines: before.lines.length,
    afterLines: after.lines.length,
  });
}

function metastableTrajectoryStep(event) {
  const { delta } = event.cycle;
  const integration = delta.strictBridges + delta.scottJoins + delta.transfiniteCovers;
  const segregation = delta.persistentResidues;
  const novelty = integration + Math.max(0, delta.afterLines - delta.beforeLines);
  const drift = Math.abs(delta.afterLines - delta.beforeLines) + event.field.after;
  return Object.freeze({
    kind: "knowing.dream.metastable-trajectory-step",
    index: event.index,
    regime: emerging.regime,
    source: event,
    integration,
    segregation,
    novelty,
    drift,
    recommendation: metastableRecommendation(integration, segregation),
  });
}

function metastableRecommendation(
  integration,
  segregation,
) {
  if (segregation > 0) return "organize-residue";
  if (integration > 0) return "probe-again";
  return "consolidate-bridge";
}

function metastableNonstationary(steps) {
  if (steps.length < 2) return steps.length === 1 && steps[0].drift > 0;
  const first = metastableStepSignature(steps[0]);
  return steps.some((step) => metastableStepSignature(step) !== first || step.drift > 0);
}

function metastableStepSignature(step) {
  return `${step.integration}/${step.segregation}/${step.novelty}`;
}

function metastableTrajectoryPhase(
  steps,
  integration,
  segregation,
  nonstationary,
) {
  if (steps === 0) return "quiescent";
  if (integration > 0 && segregation > 0 && nonstationary) return "metastable";
  if (integration > 0 && segregation === 0) return "integrated";
  if (segregation > 0) return "segregated";
  return "quiescent";
}

function metastableNextReason(phase) {
  if (phase === "metastable") return "The stream is producing bridges while residue persists; rank the frontier instead of forcing convergence.";
  if (phase === "integrated") return "Finite bridges appeared without persistent residue; re-enter them through agenda so consolidation does not become false settlement.";
  if (phase === "segregated") return "Persistent residue dominates the stream; organize the next situated probe around the recurring obstruction.";
  return "The stream has too little movement; build the next observation batch before judging the program.";
}

function worldMethodsFor(
  trajectory,
  agenda,
) {
  const phase = trajectory.assessment.phase;
  const organize = agenda.items.filter((item) => item.priority === "organize").length;
  const experiment = agenda.items.filter((item) => item.priority === "experiment").length;
  return Object.freeze(worldMethodSpecs()
    .map((method, index) => worldMethod(method, index, phase, organize, experiment, trajectory.assessment.nonstationary))
    .filter((method) => method.score > 0)
    .sort((left, right) => right.score - left.score || left.index - right.index));
}

function worldMethodIntervention(
  method,
  index,
  repertoire,
) {
  return Object.freeze({
    kind: "knowing.dream.world-method-intervention",
    index,
    regime: emerging.regime,
    method,
    observation: worldMethodObservation(method, repertoire.trajectory.assessment.phase),
    protocol: Object.freeze({
      read: method.question,
      act: method.intervention,
      verify: method.evidence,
      nextCarrier: method.nextCarrier,
    }),
  });
}

function worldMethodObservation(
  method,
  phase,
) {
  return makeObservation({
    observer: dreamTerm(["observer", "world-method", method.method]),
    task: makeTask({
      subject: dreamTerm(["world-method", method.method, phase]),
      predicate: dreamPredicate(["world-method-intervention"]),
      object: dreamTerm(["world-method-intervention", method.nextCarrier, String(method.score)]),
    }),
    evidence: noEvidence,
    note: dreamMark(["world-method-intervention", method.region, method.period]),
  });
}

function accumulatedActionResearchField(input

) {
  const limit = finiteLimit(input.cycleLimit ?? input.batches?.length ?? 0);
  const out = [...(input.before ?? [])];
  const batches = input.batches ?? [];
  for (let i = 0; i < batches.length && i < limit; i++) out.push(...batches[i]);
  return Object.freeze(out);
}

function worldMethodFeedbackEffect(
  intervention,
  index,
  before,
  input

,
) {
  const cycle = aperiodicActionResearchCycle({
    before,
    after: Object.freeze([intervention.observation]),
    ...(input.window === undefined ? {} : { window: input.window }),
    ...(input.stride === undefined ? {} : { stride: input.stride }),
    ...(input.limit === undefined ? {} : { limit: input.limit }),
    ...(input.candidatesPerWindow === undefined ? {} : { candidatesPerWindow: input.candidatesPerWindow }),
  });
  const assessment = worldMethodAssessment(cycle);
  return Object.freeze({
    kind: "knowing.dream.world-method-feedback-effect",
    index,
    regime: emerging.regime,
    intervention,
    cycle,
    assessment,
    scoreDelta: worldMethodScoreDelta(assessment),
    next: worldMethodNext(assessment),
  });
}

function worldMethodAssessment(cycle) {
  const bridges = cycle.delta.strictBridges + cycle.delta.scottJoins + cycle.delta.transfiniteCovers;
  if (bridges > 0) return "finite-bridge-created";
  if (cycle.delta.persistentResidues > 0) return "residue-persisted";
  if (cycle.delta.afterLines !== cycle.delta.beforeLines) return "trajectory-shifted";
  return "no-method-signal";
}

function worldMethodScoreDelta(assessment) {
  if (assessment === "finite-bridge-created") return 4;
  if (assessment === "residue-persisted") return 2;
  if (assessment === "trajectory-shifted") return 1;
  return -2;
}

function worldMethodNext(assessment) {
  if (assessment === "finite-bridge-created") return "amplify";
  if (assessment === "residue-persisted") return "repeat";
  if (assessment === "trajectory-shifted") return "hold-open";
  return "retire-for-now";
}

function adaptWorldMethod(effect) {
  const method = effect.intervention.method;
  return Object.freeze({
    ...method,
    score: Math.max(0, method.score + effect.scoreDelta),
  });
}

function worldMethodRequiredVariety(phase, selectedMethods) {
  if (selectedMethods === 0) return 4;
  if (phase === "metastable") return Math.min(10, selectedMethods + 4);
  if (phase === "segregated") return Math.min(9, selectedMethods + 3);
  if (phase === "integrated") return Math.min(8, selectedMethods + 2);
  return Math.min(6, selectedMethods + 2);
}

function worldMethodEcologyVerdict(
  selectedMethods,
  regions,
  effectiveVariety,
  requiredVariety,
) {
  if (selectedMethods <= 1 || regions <= 1) return "method-monoculture";
  if (effectiveVariety < requiredVariety) return "under-varied";
  return "requisite-variety";
}

function worldMethodEcologyObligations(
  verdict,
  regions,
  periods,
  nextCarriers,
  assessments,
) {
  const out = [];
  if (verdict !== "requisite-variety") {
    out.push(worldMethodEcologyObligation(
      out.length,
      "add-variety",
      "Which absent region, period, or knowledge tradition should enter the next method repertoire?",
      "knowing.dream.world-method-repertoire",
    ));
  }
  if (regions < 3 || periods < 3) {
    out.push(worldMethodEcologyObligation(
      out.length,
      "preserve-conflict",
      "Which historically distant standpoint should remain in tension with the current selected methods?",
      "knowing.dream.world-method-repertoire",
    ));
  }
  if (nextCarriers < 2 || assessments < 2) {
    out.push(worldMethodEcologyObligation(
      out.length,
      "return-to-field",
      "Which method must be rerun through feedback so the ecology learns from action instead of taxonomy?",
      "knowing.dream.world-method-feedback",
    ));
  }
  return Object.freeze(out);
}

function worldMethodEcologyObligation(
  index,
  priority,
  question,
  nextCarrier,
) {
  return Object.freeze({
    kind: "knowing.dream.world-method-ecology-obligation",
    index,
    regime: emerging.regime,
    priority,
    question,
    nextCarrier,
  });
}

function uniqueCount(values) {
  return new Set(values).size;
}

function worldMethodBraidPairs(
  methods,
  ecology,
  limit,
) {
  const candidates = [];
  for (let i = 0; i < methods.length; i++) {
    for (let j = i + 1; j < methods.length; j++) {
      const left = methods[i];
      const right = methods[j];
      const score = worldMethodComplementarityScore(left, right);
      if (score > 0) candidates.push({ left, right, score });
    }
  }
  candidates.sort((left, right) => right.score - left.score || (right.left.score + right.right.score) - (left.left.score + left.right.score));
  const used = new Set();
  const out = [];
  for (const candidate of candidates) {
    if (out.length >= limit) break;
    if (used.has(candidate.left.method) || used.has(candidate.right.method)) continue;
    out.push(worldMethodBraidPair(candidate.left, candidate.right, out.length, ecology));
    used.add(candidate.left.method);
    used.add(candidate.right.method);
  }
  return Object.freeze(out);
}

function worldMethodBraidPair(
  left,
  right,
  index,
  ecology,
) {
  const complementarity = Object.freeze({
    regionDifference: left.region !== right.region,
    periodDifference: left.period !== right.period,
    carrierDifference: left.nextCarrier !== right.nextCarrier,
    score: worldMethodComplementarityScore(left, right),
  });
  return Object.freeze({
    kind: "knowing.dream.world-method-braid-pair",
    index,
    regime: emerging.regime,
    left,
    right,
    complementarity,
    question: `How does ${left.method} correct ${right.method}, and what residue survives both?`,
    observation: worldMethodBraidObservation(left, right, complementarity.score, ecology.verdict),
  });
}

function worldMethodComplementarityScore(left, right) {
  return (left.region === right.region ? 0 : 2)
    + (left.period === right.period ? 0 : 1)
    + (left.nextCarrier === right.nextCarrier ? 0 : 2)
    + Math.abs(left.score - right.score);
}

function worldMethodBraidObservation(
  left,
  right,
  score,
  verdict,
) {
  return makeObservation({
    observer: dreamTerm(["observer", "world-method-braid", left.method, right.method]),
    task: makeTask({
      subject: dreamTerm(["world-method-braid", left.method, right.method]),
      predicate: dreamPredicate(["world-method-braid"]),
      object: dreamTerm(["world-method-braid", verdict, String(score)]),
    }),
    evidence: noEvidence,
    note: dreamMark(["world-method-braid", left.nextCarrier, right.nextCarrier]),
  });
}

function worldMethodConstellationNode(
  method,
  index,
) {
  return Object.freeze({
    kind: "knowing.dream.world-method-constellation-node",
    index,
    regime: emerging.regime,
    method,
  });
}

function worldMethodConstellationEdges(
  nodes,
  braid,
) {
  const out = [];
  for (const pair of braid.pairs) out.push(worldMethodConstellationEdge(out.length, "braided-complementarity", pair.left, pair.right, pair.complementarity.score));
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const left = nodes[i].method;
      const right = nodes[j].method;
      if (hasWorldMethodConstellationEdge(out, left, right)) continue;
      const relation = worldMethodConstellationRelation(left, right);
      if (relation === undefined) continue;
      out.push(worldMethodConstellationEdge(out.length, relation, left, right, worldMethodConstellationWeight(relation, left, right)));
    }
  }
  return Object.freeze(out);
}

function worldMethodConstellationRelation(
  left,
  right,
) {
  if (left.method === "decolonizing-methodologies" || right.method === "decolonizing-methodologies" || left.method === "kula-reciprocity" || right.method === "kula-reciprocity") {
    return "reciprocity-obligation";
  }
  if (left.region !== right.region && left.period !== right.period) return "historical-translation";
  if (left.nextCarrier === right.nextCarrier && left.region !== right.region) return "standpoint-tension";
  return undefined;
}

function worldMethodConstellationWeight(
  relation,
  left,
  right,
) {
  const base = relation === "reciprocity-obligation" ? 4 : relation === "historical-translation" ? 3 : relation === "standpoint-tension" ? 2 : 5;
  return base + Math.abs(left.score - right.score);
}

function worldMethodConstellationEdge(
  index,
  relation,
  left,
  right,
  weight,
) {
  return Object.freeze({
    kind: "knowing.dream.world-method-constellation-edge",
    index,
    regime: emerging.regime,
    relation,
    left,
    right,
    weight,
    reason: worldMethodConstellationReason(relation),
  });
}

function worldMethodConstellationReason(relation) {
  if (relation === "braided-complementarity") return "The braid selected these methods as a complementary intervention pair.";
  if (relation === "historical-translation") return "The methods come from different regions and historical periods, so their relation must be translated rather than merged.";
  if (relation === "standpoint-tension") return "The methods route toward the same next carrier from different situated standpoints.";
  return "At least one method requires reciprocal accountability to the field before the next cycle.";
}

function hasWorldMethodConstellationEdge(
  edges,
  left,
  right,
) {
  return edges.some((edge) => (
    edge.left.method === left.method && edge.right.method === right.method
  ) || (
    edge.left.method === right.method && edge.right.method === left.method
  ));
}

function worldMethodConstellationTopology(
  nodes,
  edges,
) {
  const methods = nodes.map((node) => node.method.method);
  const adjacency = new Map();
  for (const method of methods) adjacency.set(method, new Set());
  for (const edge of edges) {
    adjacency.get(edge.left.method)?.add(edge.right.method);
    adjacency.get(edge.right.method)?.add(edge.left.method);
  }
  const visited = new Set();
  let components = 0;
  for (const method of methods) {
    if (visited.has(method)) continue;
    components++;
    const stack = [method];
    while (stack.length > 0) {
      const current = stack.pop();
      if (visited.has(current)) continue;
      visited.add(current);
      for (const next of adjacency.get(current) ?? []) if (!visited.has(next)) stack.push(next);
    }
  }
  const isolates = methods.filter((method) => (adjacency.get(method)?.size ?? 0) === 0).length;
  return Object.freeze({
    components,
    connected: nodes.length === 0 ? true : components <= 1,
    isolates,
    braidedEdges: edges.filter((edge) => edge.relation === "braided-complementarity").length,
    reciprocityEdges: edges.filter((edge) => edge.relation === "reciprocity-obligation").length,
  });
}

function worldMethodConstellationObligations(
  topology,
  ecologyObligations,
) {
  const out = [...ecologyObligations];
  if (!topology.connected) {
    out.push(worldMethodEcologyObligation(
      out.length,
      "preserve-conflict",
      "Which isolated method fragment must be translated into the shared constellation before the next cycle?",
      "knowing.dream.world-method-repertoire",
    ));
  }
  if (topology.reciprocityEdges === 0) {
    out.push(worldMethodEcologyObligation(
      out.length,
      "return-to-field",
      "Which braided method pair must carry a reciprocal return obligation to the field?",
      "knowing.dream.world-method-feedback",
    ));
  }
  return Object.freeze(out);
}

function worldMethodWayfindingEvents(
  constellation,
  limit,
) {
  if (constellation.edges.length === 0 || limit === 0) return Object.freeze([]);
  const events = [];
  let current = constellation.edges[0].left;
  for (let index = 0; index < limit; index++) {
    const step = sturmianStep(index);
    const edge = worldMethodWayfindingEdge(constellation.edges, current, index, step);
    const from = sameWorldMethod(edge.left, current) ? edge.left : edge.right;
    const to = sameWorldMethod(edge.left, current) ? edge.right : edge.left;
    events.push(worldMethodWayfindingEvent(index, edge, from, to, step));
    current = to;
  }
  return Object.freeze(events);
}

function worldMethodWayfindingEdge(
  edges,
  current,
  index,
  step,
) {
  const incident = edges.filter((edge) => sameWorldMethod(edge.left, current) || sameWorldMethod(edge.right, current));
  const choices = incident.length > 0 ? incident : edges;
  const stride = step === "long" ? 2 : 1;
  return choices[(index * stride) % choices.length];
}

function worldMethodWayfindingEvent(
  index,
  edge,
  from,
  to,
  step,
) {
  return Object.freeze({
    kind: "knowing.dream.world-method-wayfinding-event",
    index,
    regime: emerging.regime,
    edge,
    from,
    to,
    step,
    observation: worldMethodWayfindingObservation(index, edge, from, to, step),
    question: `Follow ${edge.relation} from ${from.method} to ${to.method}: what residue changes after this navigation?`,
  });
}

function worldMethodWayfindingObservation(
  index,
  edge,
  from,
  to,
  step,
) {
  return makeObservation({
    observer: dreamTerm(["observer", "world-method-wayfinding", from.method]),
    task: makeTask({
      subject: dreamTerm(["world-method-wayfinding", from.method, step]),
      predicate: dreamPredicate(["world-method-wayfinding"]),
      object: dreamTerm(["world-method-wayfinding", to.method, edge.relation, String(index)]),
    }),
    evidence: noEvidence,
    note: dreamMark(["world-method-wayfinding", sturmianPrefix(index + 1), edge.reason]),
  });
}

function sameWorldMethod(left, right) {
  return left.method === right.method;
}

function worldMethod(
  spec,
  index,
  phase,
  organize,
  experiment,
  nonstationary,
) {
  const phaseFit = spec.fits.includes(phase) ? 4 : phase === "metastable" && spec.fits.includes("segregated") ? 2 : 0;
  const agendaFit = spec.nextCarrier === "knowing.dream.frontier-agenda"
    ? organize + experiment
    : spec.nextCarrier === "knowing.dream.praxis-probes"
      ? experiment + (nonstationary ? 1 : 0)
      : organize;
  return Object.freeze({
    kind: "knowing.dream.world-method",
    index,
    regime: emerging.regime,
    method: spec.method,
    region: spec.region,
    period: spec.period,
    fits: spec.fits,
    score: spec.baseScore + phaseFit + agendaFit,
    question: spec.question,
    intervention: spec.intervention,
    evidence: spec.evidence,
    nextCarrier: spec.nextCarrier,
  });
}

function worldMethodSpecs() {
  return Object.freeze([
    Object.freeze({
      method: "active-inference-epistemic-probing",
      region: "contemporary computational cognitive science",
      period: "late 20th to 21st century",
      fits: Object.freeze(["integrated", "metastable"]),
      baseScore: 3,
      question: "Which next observation would most reduce uncertainty about the finite-regime exclusion?",
      intervention: "Select the smallest praxis-probe whose result can distinguish strict-chain, repeat-cell, shared-subject, or persistent-residue feedback.",
      evidence: "A new after-observation changes reachableBy or certifies persistent residue in praxis-feedback.",
      nextCarrier: "knowing.dream.praxis-probes",
    }),
    Object.freeze({
      method: "enactive-autopoiesis",
      region: "Chile and global enactive cognitive science",
      period: "1970s onward",
      fits: Object.freeze(["segregated", "metastable"]),
      baseScore: 3,
      question: "Which observer-boundary coupling is reproducing the residue?",
      intervention: "Change the observer/task/environment coupling, then re-enter the changed field as an action-research batch.",
      evidence: "The same residue pair changes recurrence, reachability, or observer distribution after the coupling shift.",
      nextCarrier: "knowing.dream.praxis-feedback",
    }),
    Object.freeze({
      method: "catuskoti-paraconsistency",
      region: "South Asian Buddhist logic and later paraconsistent readings",
      period: "classical antiquity through contemporary logic",
      fits: Object.freeze(["segregated", "metastable"]),
      baseScore: 2,
      question: "Does the frontier require holding true, false, both, and neither without explosion?",
      intervention: "Preserve contradictory observations as a four-corner obstruction and ask which finite regime fails when contradiction is held.",
      evidence: "The residue remains meaningful while conflict is retained rather than normalized away.",
      nextCarrier: "knowing.dream.frontier-agenda",
    }),
    Object.freeze({
      method: "ibn-khaldun-asabiyyah",
      region: "Maghrebi historical sociology",
      period: "14th century",
      fits: Object.freeze(["segregated", "metastable"]),
      baseScore: 2,
      question: "Which observers have enough shared cohesion to carry the next intervention?",
      intervention: "Group recurrent-window observers by shared residue and route the next probe through the strongest collective carrier.",
      evidence: "The next cycle gains a finite bridge or sharper residue through a specific observer coalition.",
      nextCarrier: "knowing.dream.frontier-agenda",
    }),
    Object.freeze({
      method: "huerta-grande-conjunctural-praxis",
      region: "Uruguay and Latin American especifismo",
      period: "1960s to 1970s",
      fits: Object.freeze(["segregated", "metastable"]),
      baseScore: 4,
      question: "What concrete analysis, strategy, tactics, and feedback should organize this residue?",
      intervention: "Turn the ranked agenda item into a situated action-research cycle with an explicit feedback obligation.",
      evidence: "The cycle reports whether the intervention created finite reachability or persistent residue.",
      nextCarrier: "knowing.dream.frontier-agenda",
    }),
    Object.freeze({
      method: "second-order-cybernetics",
      region: "global cybernetics",
      period: "mid 20th century onward",
      fits: Object.freeze(["quiescent", "integrated", "segregated", "metastable"]),
      baseScore: 1,
      question: "How is the observer included in the system being observed?",
      intervention: "Treat the observing action itself as the next batch and remeasure trajectory drift.",
      evidence: "The next metastable-trajectory changes because observation changed the observed field.",
      nextCarrier: "knowing.dream.praxis-feedback",
    }),
    Object.freeze({
      method: "yijing-change-pattern",
      region: "ancient Chinese correlative change traditions",
      period: "late first millennium BCE onward",
      fits: Object.freeze(["integrated", "segregated", "metastable"]),
      baseScore: 2,
      question: "Which changing line marks the frontier's next transformation rather than its final answer?",
      intervention: "Treat the highest-scoring agenda item as a changing pattern and generate one observation that tests whether the pattern flips, persists, or branches.",
      evidence: "The next cycle changes phase, priority, or recurrence while remaining non-settling.",
      nextCarrier: "knowing.dream.frontier-agenda",
    }),
    Object.freeze({
      method: "polynesian-wayfinding",
      region: "Oceania navigational knowledge systems",
      period: "deep historical practice through contemporary revival",
      fits: Object.freeze(["quiescent", "segregated", "metastable"]),
      baseScore: 3,
      question: "Which weak signals can orient action when there is no fixed map of the frontier?",
      intervention: "Use recurrent residue, observer cuts, and drift as steering signs; choose a small next batch that keeps orientation without demanding a settled map.",
      evidence: "The next trajectory preserves directionality through drift rather than requiring global convergence.",
      nextCarrier: "knowing.dream.frontier-agenda",
    }),
    Object.freeze({
      method: "daoist-wuwei-minimal-action",
      region: "classical Chinese Daoist practical philosophy",
      period: "Warring States period onward",
      fits: Object.freeze(["integrated", "segregated", "metastable"]),
      baseScore: 2,
      question: "What is the least intervention that lets the field reveal its own next constraint?",
      intervention: "Emit a minimal observation obligation and defer stronger organization until praxis-feedback shows which regime moved.",
      evidence: "A small after-observation changes trajectory phase or finite reachability without overfitting the frontier.",
      nextCarrier: "knowing.dream.praxis-feedback",
    }),
    Object.freeze({
      method: "decolonizing-methodologies",
      region: "Indigenous and anti-colonial research praxis",
      period: "20th century to present",
      fits: Object.freeze(["segregated", "metastable"]),
      baseScore: 3,
      question: "Who benefits from this method, and who must be able to contest the observation it creates?",
      intervention: "Treat the next observation as accountable to the affected field rather than extractive evidence for the researcher.",
      evidence: "The next feedback cycle preserves contestability while returning value to the observation community.",
      nextCarrier: "knowing.dream.praxis-feedback",
    }),
    Object.freeze({
      method: "reflective-practice",
      region: "global professional inquiry traditions",
      period: "late 20th century onward",
      fits: Object.freeze(["integrated", "segregated", "metastable"]),
      baseScore: 2,
      question: "What did the intervention teach while it was being performed?",
      intervention: "Record the method's own action as an observation and adapt the next cycle from that reflection-in-action.",
      evidence: "The method's feedback changes its future priority rather than being treated as a fixed rule.",
      nextCarrier: "knowing.dream.frontier-agenda",
    }),
    Object.freeze({
      method: "kula-reciprocity",
      region: "Massim / Trobriand exchange anthropology",
      period: "long-running Oceanic practice and early 20th century ethnography",
      fits: Object.freeze(["segregated", "metastable"]),
      baseScore: 2,
      question: "What reciprocal obligation keeps the research relation alive across cycles?",
      intervention: "Route the next probe through a return obligation so the field receives a carrier back, not only an extraction.",
      evidence: "The next cycle adds or preserves reciprocal relation while keeping residue auditable.",
      nextCarrier: "knowing.dream.frontier-agenda",
    }),
  ]);
}

function frontierAgendaItem(event) {
  const { delta } = event.cycle;
  const bridges = delta.strictBridges + delta.scottJoins + delta.transfiniteCovers;
  const score = (delta.persistentResidues * 3) + (delta.afterLines * 2) + bridges;
  const priority = delta.persistentResidues > 0
    ? "organize"
    : bridges > 0
      ? "experiment"
      : "consolidate";
  return Object.freeze({
    kind: "knowing.dream.frontier-agenda-item",
    index: event.index,
    regime: emerging.regime,
    source: event,
    priority,
    score,
    question: frontierAgendaQuestion(priority),
    next: Object.freeze({
      carrier: "knowing.dream.action-research-cycle",
      reason: frontierAgendaReason(priority),
    }),
  });
}

function frontierAgendaQuestion(priority) {
  if (priority === "organize") return "Which recurrent residue still resists every finite regime after intervention, and who must observe the next cut?";
  if (priority === "experiment") return "Which newly reachable bridge should be probed again before it is mistaken for final settlement?";
  return "Which finite bridge can be stabilized without closing the aperiodic research loop?";
}

export function frontierAgendaReason(priority) {
  if (priority === "organize") return "Persistent residue remains the live frontier; organize the next cycle around the local windows where it recurs.";
  if (priority === "experiment") return "The intervention created finite reachability, but the result must be re-entered as a situated experiment.";
  return "Finite reachability dominated this cycle; consolidate it as evidence while keeping the sequence open.";
}

function researchProgramPhase(
  finiteBridges,
  persistentResidues,
  agendaItems,
) {
  if (finiteBridges > 0 && agendaItems > 0) return "progressive-problemshift";
  if (persistentResidues > 0 || agendaItems > 0) return "open-problemshift";
  return "degenerating-problemshift";
}

function hologramRecurrences(projections) {
  const groups = [];
  for (const projection of projections) {
    for (const pair of projection.residue.pairs) {
      const group = groups.find((candidate) => sameResiduePair(candidate.pair, pair));
      if (group === undefined) groups.push({ pair, windows: [projection.index] });
      else if (!group.windows.includes(projection.index)) group.windows.push(projection.index);
    }
  }
  return Object.freeze(groups
    .filter((group) => group.windows.length > 1)
    .map((group) => Object.freeze({
      kind: "knowing.dream.aperiodic-hologram-recurrence",
      regime: emerging.regime,
      source: group.pair,
      windows: Object.freeze([...group.windows]),
      finiteReachability: group.pair.finiteReachability,
    })));
}

function hologramPhase(
  projections,
  recurrences,
) {
  const residueWindows = projections.filter((projection) => projection.residue.pairs.length > 0).length;
  if (residueWindows === 0) return "empty";
  if (recurrences.length > 0) return "persistent";
  if (residueWindows > 1) return "motile";
  return "local";
}

function sameResiduePair(left, right) {
  return (
    sameObservationCell(left.left, right.left) && sameObservationCell(left.right, right.right)
  ) || (
    sameObservationCell(left.left, right.right) && sameObservationCell(left.right, right.left)
  );
}

function sameObservationCell(left, right) {
  return sameCell(left.task.cell, right.task.cell);
}

function observerCount(observations) {
  const observers = [];
  for (const obs of observations) {
    if (!observers.some((observer) => sameTerm(observer, obs.observer))) observers.push(obs.observer);
  }
  return observers.length;
}

function sturmianStep(index) {
  const alpha = (Math.sqrt(5) - 1) / 2;
  return Math.floor((index + 1) * alpha) - Math.floor(index * alpha) === 0 ? "short" : "long";
}

function sturmianPrefix(length) {
  let out = "";
  for (let i = 0; i < length; i++) out += sturmianStep(i) === "short" ? "S" : "L";
  return out;
}

function finiteLimit(value) {
  if (!Number.isInteger(value) || value < 0) throw new TypeError("aperiodic-dream: limit must be a non-negative integer");
  return value;
}

function optionalNonNegativeInteger(value, context) {
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) throw new TypeError(`${context} must be a non-negative integer`);
  return value;
}

function optionalPositiveInteger(value, context) {
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) throw new TypeError(`${context} must be a positive integer`);
  return value;
}

function positiveInteger(value, context) {
  if (!Number.isInteger(value) || value <= 0) throw new TypeError(`${context} must be a positive integer`);
  return value;
}

function admitObservation(value, verb) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${verb}: each observation must be an object`);
  }
  const record = value;
  if (record["task"] === undefined || record["evidence"] === undefined || record["observer"] === undefined) {
    throw new TypeError(`${verb}: each observation needs observer, task, and evidence`);
  }
  const task = record["task"];
  if (task === null || typeof task !== "object" || Array.isArray(task) || (task)["kind"] !== "knowing.task") {
    throw new TypeError(`${verb}: each observation.task must be a knowing.task`);
  }
  return record;
}

const sameTerm = coincides;
const sameCell = sameTriple;

/** The topic tokens a term or object carries: its texts (strings, mark values, list members) as tokens. */
function topicTokens(value) {
  const out = new Set();
  const visit = (part) => {
    if (typeof part === "string") {
      const token = tokenOf(part);
      if (token) out.add(token);
    } else if (Array.isArray(part)) part.forEach(visit);
    else if (part !== null && typeof part === "object") visit(part.mark ?? part.value);
  };
  visit(value);
  return [...out];
}

/** A deterministic key for a term: its JSON with object keys sorted. */
function termKey(term) {
  return JSON.stringify(term, (_, value) => (value !== null && typeof value === "object" && !Array.isArray(value)
    ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, value[key]]))
    : value));
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function dreamTerm(parts) {
  return dreamMark(parts);
}

function dreamPredicate(parts) {
  return dreamMark(parts);
}

function dreamMark(parts) {
  return Object.freeze(["knowing", "dream", ...parts]);
}
