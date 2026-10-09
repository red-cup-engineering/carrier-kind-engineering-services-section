/**
 * cognizing/spectral — [Meme] → knowing/spectral-binding: BINDING read through the substrate
 * spectral graph Laplacian.
 *
 * knowing's `bind` (bind.mts/binding.mts) already reads the held section's feature graph as Čech
 * cohomology: H⁰ = bound percepts (connected components), H¹ = binding obstruction (cycle rank),
 * read from SignGraph’s cell cohomology. This reading GROUNDS that H⁰ in relating's combinatorial graph
 * Laplacian L = D − W (`@red-cup-engineering/relating` analysis.laplacian, exact over ℤ): the percept count is the
 * zero-eigenvalue multiplicity (`componentCount`), the spectral definition of H⁰. And it ADDS the one
 * thing union-find cannot see — the **Matrix-Tree (Kirchhoff) spanning-tree count** (`treeCount`), the
 * number of distinct spanning configurations that hold the percept together. That count is the BINDING
 * ROBUSTNESS: `0` ⟺ the section fragments into several percepts (H⁰ > 1); `1` ⟺ a unique rigid binding
 * (a spanning tree, no redundant cycles, H¹ = 0); `> 1` ⟺ a redundantly/over-determined binding (cycles
 * present, H¹ > 0 — the illusory-conjunction / superposition-catastrophe risk bind flags). The relation
 * graph reads only the cells (subject↔object), so the held memes present it directly via
 * `relationGraphOfCells`. Total over any collection of memes.
 */
import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { memeCarrier } from "@red-cup-engineering/relating";
import { cell } from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/analysis/transfinite-cell-complex";
import { magnitude, toCount } from "@red-cup-engineering/exact-number-data-service/exact-number";
import { relationGraphOfCells } from "@red-cup-engineering/signgraph/cell-graph";
import { componentCount, treeCount, hodgeDecomposition } from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/analysis/laplacian";
import { jsonResource } from "@red-cup-engineering/json-services-section";
import { evidence } from "@red-cup-engineering/signcell/cell";
import { admitMemes } from "./section.mjs";
import { contextualityOf } from "./contextuality.mjs";
import { contextualDreamFrontierCarrier, contextualDreamFrontierInputCarrier, contextualSpectrumCarrier, contextualSpectrumInputCarrier, hodgeBindingCarrier, memeCollectionCarrier, spectralBindingCarrier } from "./carriers.mjs";
import { aperiodicDream, aperiodicPraxisFrontier, aperiodicResidue, observation, task } from "../dreaming/index.mjs";

const MEME_CARRIER_ID = memeCarrier.id;

/** The von Neumann cardinality of a `Natural` (its member set's size IS the number). */

/** knowing's spectral read of binding: H⁰ percepts (zero-eigenvalue multiplicity) plus the
 *  Matrix-Tree spanning-tree count as the binding's rigidity/redundancy. */

  

  
  

  

  

    

/** The empty/edgeless binding (no related cells present a relation graph). */
const emptySpectralBinding = (features) => Object.freeze({
  kind: "knowing.spectral-binding",
  features,
  percepts: features,
  bound: features === 1,
  spanningTrees: features <= 1 ? 1 : 0,
  rigid: features <= 1,
  redundant: false,
});

/** Read a held section's binding through the substrate graph Laplacian: the spectral percept count
 *  (H⁰) and the spanning-tree robustness of the binding. */
export function spectralBindingOf(memes) {
  const cells = memes;
  const related = cells.filter((cell) => cell.subject !== cell.object);
  if (related.length === 0) {
    // no non-reflexive relation: each distinct term is its own isolated percept.
    const terms = [];
    for (const cell of cells) for (const term of [cell.subject, cell.object]) if (!terms.includes(term)) terms.push(term);
    return emptySpectralBinding(terms.length);
  }
  const graph = relationGraphOfCells(cells);
  const percepts = toCount(componentCount(graph));
  const spanningTrees = toCount(magnitude(treeCount(graph)));
  return Object.freeze({
    kind: "knowing.spectral-binding",
    features: graph.terms.length,
    percepts,
    bound: percepts === 1,
    spanningTrees,
    rigid: spanningTrees === 1,
    redundant: spanningTrees > 1,
  });
}

/** spectral — read a held section's binding through the spectral graph Laplacian (H⁰ percepts as
 *  zero-eigenvalue multiplicity + Matrix-Tree spanning-tree robustness). */
export const spectralAction = operation({
  verb: "spectral",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Read a held section's BINDING through the substrate graph Laplacian: H⁰ percepts (zero-eigenvalue multiplicity) and the Matrix-Tree spanning-tree count as the binding's rigidity/redundancy.",
  description: `Domain: an array of meme carriers (${MEME_CARRIER_ID}) or { memes: [...] } — the held section. Codomain: knowing/spectral-binding — knowing's BIND read through relating's combinatorial graph Laplacian L = D − W (analysis.laplacian, exact over ℤ). The percept count H⁰ is the Laplacian's zero-eigenvalue multiplicity (componentCount) — the spectral definition of bind's bound-percept count. The Matrix-Tree (Kirchhoff) spanning-tree count is the binding ROBUSTNESS union-find cannot see: 0 ⟺ the section fragments (H⁰ > 1), 1 ⟺ a unique rigid binding (a spanning tree, H¹ = 0), > 1 ⟺ a redundant/over-determined binding (cycles, H¹ > 0 — illusory-conjunction risk). Grounded in relating's analysis.laplacian (relationGraphOfCells / componentCount / treeCount) and bind.mts.`,
  domain: memeCollectionCarrier,
  codomain: spectralBindingCarrier,
  run: (input) =>
    jsonResource(spectralBindingOf(admitMemes(input, "spectral")), "spectral binding"),
});

/** knowing's HODGE DECOMPOSITION of binding: the held section's binding-graph edge-flows split into
 *  the DERIVABLE bindings (exact / gradient — reconstructible from a per-term potential) and the
 *  IRREDUCIBLE binding cycles (harmonic / β₁ = the H¹ obstruction no local amendment can kill — the
 *  exact count of illusory-conjunction cycles `spectralBinding.redundant` only flagged). */

  

    

  
  

         

/** Decompose a held section's binding through the substrate graph Hodge decomposition. */
export function hodgeBindingOf(memes) {
  const cells = memes;
  const related = cells.filter((cell) => cell.subject !== cell.object);
  if (related.length === 0) {
    const terms = [];
    for (const cell of cells) for (const term of [cell.subject, cell.object]) if (!terms.includes(term)) terms.push(term);
    return Object.freeze({ kind: "knowing.hodge-binding", features: terms.length, bindings: 0, derivable: 0, irreducible: 0 });
  }
  const graph = relationGraphOfCells(cells);
  const hodge = hodgeDecomposition(graph);
  return Object.freeze({
    kind: "knowing.hodge-binding",
    features: graph.terms.length,
    bindings: toCount(hodge.edges),
    derivable: toCount(hodge.exact),
    irreducible: toCount(hodge.harmonic),
  });
}

/** hodge — decompose a held section's binding into derivable (exact) and irreducible (harmonic) parts. */
export const hodgeAction = operation({
  verb: "hodge",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Hodge-decompose a held section's BINDING: derivable (exact/gradient) bindings vs irreducible (harmonic/β₁) cycles — the exact H¹ illusory-conjunction count.",
  description: `Domain: an array of meme carriers (${MEME_CARRIER_ID}) or { memes: [...] } — the held section. Codomain: knowing/hodge-binding — the discrete Hodge decomposition of the binding graph's edge-flows (analysis.laplacian.hodgeDecomposition, exact over ℤ): \`derivable\` = exact/gradient flows rank(L) = V − C (bindings inference can reconstruct from local potentials), \`irreducible\` = harmonic flows β₁ = E − V + C (the H¹ obstruction — the illusory-conjunction cycles no local amendment kills). Refines spectral-binding's \`redundant\` flag into the exact obstruction rank. Grounded in relating's analysis.laplacian and bind.mts.`,
  domain: memeCollectionCarrier,
  codomain: hodgeBindingCarrier,
  run: (input) =>
    jsonResource(hodgeBindingOf(admitMemes(input, "hodge")), "hodge binding"),
});

/** The bridge carrier: spectral/Hodge residue plus signed contextual obstruction. */

/** A contextual/spectral obstruction promoted into the aperiodic dreaming loop. */

/** Bridge the spectral/Hodge reading of a held section with signed contextuality constraints. */
export function contextualSpectrumOf(input

) {
  const spectral = spectralBindingOf(input.memes);
  const hodge = hodgeBindingOf(input.memes);
  const contextuality = contextualityOf(input.constraints ?? []);
  const harmonic = hodge.irreducible > 0;
  const contextual = contextuality.contextual;
  const phase = harmonic
    ? contextual ? "harmonic-contextual" : "harmonic"
    : contextual ? "contextual" : "flat";
  return Object.freeze({
    kind: "knowing.contextual-spectrum",
    spectral,
    hodge,
    contextuality,
    obstruction: Object.freeze({
      phase,
      harmonicRank: hodge.irreducible,
      frustration: contextuality.frustration,
      globalSection: contextuality.globalSection,
    }),
    praxis: praxisOf(phase),
    theory: Object.freeze({
      spectral: "hodge-harmonic-residue",
      contextual: "global-section-obstruction",
      autonomous: "self-producing-frontier",
      social: "theory-practice-loop",
    }),
  });
}

/** Promote contextual/spectral obstruction into a finite-excluded aperiodic dream frontier. */
export function contextualDreamFrontierOf(input

) {
  const spectrum = contextualSpectrumOf(input);
  const observations = contextualDreamObservations(spectrum, input.memes);
  const limit = optionalNonNegativeInteger(input.limit, "contextual-dream-frontier: limit") ?? 1;
  // The frontier's regime is read off the dream's own settlement filtration (dreaming's emerge), never declared.
  const dream = aperiodicDream({ observations, limit });
  return Object.freeze({
    kind: "knowing.contextual-dream-frontier",
    regime: dream.regime,
    spectrum,
    observations,
    residue: aperiodicResidue(observations),
    dream,
    praxis: aperiodicPraxisFrontier({ observations, limit }),
    bridge: Object.freeze({
      from: "knowing.contextual-spectrum",
      to: "knowing.dream.aperiodic-residue",
      active: observations.length > 0,
      reason: contextualDreamReason(spectrum),
    }),
    theory: Object.freeze({
      sheaf: "global-section-obstruction",
      spectral: "hodge-harmonic-residue",
      praxis: "theory-practice-theory",
      dream: "aperiodic-non-convergence",
    }),
  });
}

function praxisOf(phase) {
  switch (phase) {
    case "harmonic-contextual":
      return Object.freeze({
        reflection: "The section has a harmonic residue and no compatible signed global section.",
        action: "Treat it as a dream frontier: do not resolve locally; surface the obstruction for a new conjecture or intervention.",
      });
    case "harmonic":
      return Object.freeze({
        reflection: "The section has irreducible cycles, but the signed constraints still admit a global section.",
        action: "Preserve the cycle as long-range structure; look for spectral invariants before forcing simplification.",
      });
    case "contextual":
      return Object.freeze({
        reflection: "The section is not harmonically redundant, but its signs are globally frustrated.",
        action: "Repair the measurement/context cover or promote the contradiction as a signed research obligation.",
      });
    case "flat":
      return Object.freeze({
        reflection: "No harmonic residue or signed contextual obstruction is visible at this grain.",
        action: "Let finite researching handle it; dreaming has no residue to feed on here.",
      });
  }
}

function contextualDreamObservations(spectrum, memes) {
  if (spectrum.obstruction.phase === "flat") return Object.freeze([]);
  const reading = evidence({ for: memes[0]?.for ?? [], against: memes[0]?.against ?? [] });
  const observer = Object.freeze(["knowing", "contextual-dream", "observer"]);
  const local = observation({
    observer,
    task: task({
      subject: Object.freeze(["contextual-dream", "local", spectrum.obstruction.phase]),
      predicate: Object.freeze(["contextual-dream", "hodge-residue"]),
      object: Object.freeze(["hodge", "harmonic-rank", String(spectrum.obstruction.harmonicRank)]),
    }),
    evidence: reading,
    note: Object.freeze(["contextual-dream", "local-window"]),
  });
  const global = observation({
    observer,
    task: task({
      subject: Object.freeze(["contextual-dream", "global", spectrum.obstruction.phase]),
      predicate: Object.freeze(["contextual-dream", "global-section-obstruction"]),
      object: Object.freeze(["contextuality", "frustration", String(spectrum.obstruction.frustration)]),
    }),
    evidence: reading,
    note: Object.freeze(["contextual-dream", "signed-cover"]),
  });
  return Object.freeze([local, global]);
}

function contextualDreamReason(spectrum) {
  if (spectrum.obstruction.phase === "flat") return "The spectrum is flat: no harmonic residue or contextual obstruction needs the aperiodic dream loop.";
  if (spectrum.obstruction.phase === "harmonic-contextual") return "A harmonic residue coincides with signed global-section obstruction, so local repair cannot settle the frontier.";
  if (spectrum.obstruction.phase === "harmonic") return "A harmonic residue persists as long-range structure even though the signed cover still admits a global section.";
  return "The signed cover has no global section, so the contradiction must be promoted as a research obligation.";
}

function admitContextualSpectrumInput(input) {
  const value = jsonResource(input, "contextual-spectrum input");
  const record = value !== null && typeof value === "object" && !Array.isArray(value)
    ? value
    : { memes: value };
  const memes = admitMemes(record["memes"] ?? value, "contextual-spectrum");
  const rawConstraints = record["constraints"];
  const constraints = rawConstraints === undefined
    ? []
    : Array.isArray(rawConstraints)
      ? rawConstraints.map((constraint) => String(constraint))
      : (() => { throw new TypeError("contextual-spectrum: constraints must be an array"); })();
  return Object.freeze({ memes, constraints: Object.freeze(constraints) });
}

function admitContextualDreamFrontierInput(input)

 {
  const value = jsonResource(input, "contextual-dream-frontier input");
  const record = value !== null && typeof value === "object" && !Array.isArray(value)
    ? value
    : { memes: value };
  const admitted = admitContextualSpectrumInput(record);
  const limit = optionalNonNegativeInteger(record["limit"], "contextual-dream-frontier: limit");
  return Object.freeze({
    memes: admitted.memes,
    constraints: admitted.constraints,
    ...(limit === undefined ? {} : { limit }),
  });
}

function optionalNonNegativeInteger(value, context) {
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) throw new TypeError(`${context} must be a non-negative integer`);
  return value;
}

/** contextual-spectrum — bridge spectral/Hodge residue with signed global-section obstruction. */
export const contextualSpectrumAction = operation({
  verb: "contextual-spectrum",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Bridge spectral/Hodge binding residue with signed contextuality: flat, harmonic, contextual, or harmonic-contextual.",
  description: `Domain: { memes, constraints? } where memes are ${MEME_CARRIER_ID} carriers and constraints are a=b / a!=b signed cover edges. Codomain: knowing/contextual-spectrum. This composes the spectral sheaf reading (Hodge harmonic residue) with Abramsky-Brandenburger-style global-section obstruction. The praxis field names the theory-practice move: finite research when flat, dream-frontier intervention when harmonic and contextual.`,
  domain: contextualSpectrumInputCarrier,
  codomain: contextualSpectrumCarrier,
  run: (input) => {
    const admitted = admitContextualSpectrumInput(input);
    return jsonResource(contextualSpectrumOf(admitted), "contextual spectrum");
  },
});

export const contextualDreamFrontierAction = operation({
  verb: "contextual-dream-frontier",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Promote spectral/contextual obstruction into finite-excluded aperiodic dream residue and praxis.",
  description: `Domain: { memes, constraints?, limit? } where memes are ${MEME_CARRIER_ID} carriers and constraints are signed cover edges. Codomain: knowing/contextual-dream-frontier. A non-flat contextual spectrum becomes two obstruction observations whose pair is unreachable by strict, Scott, or transfinite-bounded dreaming, then flows into aperiodic conjectures and praxis obligations.`,
  domain: contextualDreamFrontierInputCarrier,
  codomain: contextualDreamFrontierCarrier,
  run: (input) => {
    const admitted = admitContextualDreamFrontierInput(input);
    return jsonResource(contextualDreamFrontierOf(admitted), "contextual dream frontier");
  },
});
