/**
 * evaluating/measuring/laplacian - SEN normalizers for exact finite
 * relation-graph Laplacian carriers.
 *
 * Lean owns the abstract Lawvere harmonic-cohomology and spectral-gap proofs.
 * The Node surface carries finite relation graphs, exact Laplacian matrices,
 * harmonic witness/obstruction receipts, Matrix-Tree/Hodge reads, signed
 * balance, and diffusion directions as serializable evidence.
 */
import { tm, } from "@red-cup-engineering/computer-data-services-section/semiotic-expression-notation";
import { objectTerm, stringTerm } from "@red-cup-engineering/computer-data-services-section/semiotic-expression-notation/json-codec";

const field = (key) => tm.field(key, tm.var(0));

/** Normalize finite relation-graph carriers. */
export const relationGraphTerm = tm.lam(objectTerm([
  ["kind", stringTerm("meme-analysis.laplacian.graph")],
  ["terms", field("terms")],
  ["weights", field("weights")],
]));



const harmonicWitness = objectTerm([
  ["graph", field("graph")],
  ["kind", stringTerm("meme-analysis.laplacian.harmonic:witness")],
  ["values", field("values")],
]);

const harmonicObstruction = objectTerm([
  ["atTerm", field("atTerm")],
  ["deviation", field("deviation")],
  ["graph", field("graph")],
  ["kind", stringTerm("meme-analysis.laplacian.harmonic-obstruction")],
  ["values", field("values")],
]);

/** Normalize exact harmonic witness/obstruction carriers. */
export const harmonicTerm = tm.lam(
  tm.cond(
    tm.coincide(field("kind"), stringTerm("meme-analysis.laplacian.harmonic:witness")),
    harmonicWitness,
    harmonicObstruction,
  ),
);

/** Normalize finite Hodge-decomposition carriers. */
export const hodgeDecompositionTerm = tm.lam(objectTerm([
  ["edges", field("edges")],
  ["exact", field("exact")],
  ["harmonic", field("harmonic")],
  ["kind", stringTerm("meme-analysis.laplacian.hodge")],
]));

/** Normalize finite graph-spectrum carriers. */
export const graphSpectrumTerm = tm.lam(objectTerm([
  ["components", field("components")],
  ["kind", stringTerm("meme-analysis.laplacian.spectrum")],
  ["spanningTrees", field("spanningTrees")],
]));

/** Normalize finite signed-balance carriers. */
export const signedBalanceTerm = tm.lam(objectTerm([
  ["balanced", field("balanced")],
  ["frustration", field("frustration")],
  ["kind", stringTerm("meme-analysis.laplacian.signed-balance")],
]));

