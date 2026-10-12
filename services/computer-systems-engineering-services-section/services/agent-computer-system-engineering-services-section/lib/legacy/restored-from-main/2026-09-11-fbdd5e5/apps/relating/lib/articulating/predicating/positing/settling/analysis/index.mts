/**
 * @packageDocumentation
 *
 * settling/analysis — analytical reads of settled carriers.
 *
 * Analysis is downstream of settlement: it reads extrema and derived geometry
 * (exact arithmetic, graded sectors, finite relation-graph Laplacians,
 * first-order conservation reads, spectral root structure, differential
 * controls) without defining the primitive carriers it analyzes.
 *
 * The public package handle is `@emsenn/relating/analysis`. The same namespace
 * is also available from the root import as `analysis`.
 *
 * This surface is carrier-valued and exact. It is useful for reading relation
 * geometry, spectral root-location judgments, harmonic and conservation
 * witness/obstruction data, charged control findings, and evidence
 * distributions after settlement, but it is not a drop-in floating-point
 * numerical library.
 *
 * @example
 * ```js
 * import * as analysis from "@emsenn/relating/analysis";
 * import { chargeValue } from "@emsenn/relating";
 *
 * const n = analysis.count(["a", "b", "c"]);
 * n.kind; // "exactNumber.natural"
 *
 * const distribution = analysis.chargeDistribution([
 *   chargeValue("potential"),
 *   chargeValue("active"),
 *   chargeValue("stable"),
 * ]);
 *
 * analysis.evidenceCoordinates(distribution).kind;
 * // "meme-analysis.evidence.coordinates"
 *
 * // `section` is a SectionCarrier from settlement.
 * const graph = analysis.relationGraph(section);
 * analysis.harmonic(graph, [analysis.ratZero, analysis.ratZero]).kind;
 * // "meme-analysis.laplacian.harmonic:witness"
 *
 * // `matrix` is an exact integer Matrix.
 * analysis.pisotRoot(analysis.charPoly(matrix)).kind;
 * // "spectral.pisotRoot:witness"
 *
 * const network = analysis.conservation.flowNetwork(section);
 * analysis.conservation.conserved(network, network.edges.map(() => analysis.ratZero)).kind;
 * // "meme-analysis.conservation.conserved:witness"
 * ```
 */
export * from "@lenticule-science/articulating/predicating/positing/settling/analysis/exact-number";
export * from "@lenticule-science/articulating/predicating/positing/settling/analysis/graded";
export * from "@lenticule-science/articulating/predicating/positing/settling/analysis/spectral";
export * from "@lenticule-science/articulating/predicating/positing/settling/analysis/laplacian";
export * from "@lenticule-science/articulating/predicating/positing/settling/analysis/information";
export * from "@lenticule-science/articulating/predicating/positing/settling/analysis/coloring";
export * as formatsFour from "@lenticule-science/articulating/predicating/positing/settling/analysis/formats-four";
export * from "@lenticule-science/articulating/predicating/positing/settling/analysis/evidence";
export * as causal from "@lenticule-science/articulating/predicating/positing/settling/analysis/causal";
export * as causalInvolutivity from "@lenticule-science/articulating/predicating/positing/settling/analysis/causal-involutivity";
export * as causalManifoldlikeness from "@lenticule-science/articulating/predicating/positing/settling/analysis/causal-manifoldlikeness";
export * as causalMicrosupport from "@lenticule-science/articulating/predicating/positing/settling/analysis/causal-microsupport";
export * as causalMldClassification from "@lenticule-science/articulating/predicating/positing/settling/analysis/causal-mld-classification";
export * as causalPolarization from "@lenticule-science/articulating/predicating/positing/settling/analysis/causal-polarization";
export * as chromaticLorentzian from "@lenticule-science/articulating/predicating/positing/settling/analysis/chromatic-lorentzian";
export * as collatz from "@lenticule-science/articulating/predicating/positing/settling/analysis/collatz";
export * as continuumColimit from "@lenticule-science/articulating/predicating/positing/settling/analysis/continuum-colimit";
export * as dFrame from "@lenticule-science/articulating/predicating/positing/settling/analysis/d-frame";
export * as flow from "@lenticule-science/articulating/predicating/positing/settling/analysis/flow";
export * as glassOverlap from "@lenticule-science/articulating/predicating/positing/settling/analysis/glass-overlap";
export * as hauptvermutung from "@lenticule-science/articulating/predicating/positing/settling/analysis/hauptvermutung";
export * as inconsistencySheaf from "@lenticule-science/articulating/predicating/positing/settling/analysis/inconsistency-sheaf";
export * as internalReal from "@lenticule-science/articulating/predicating/positing/settling/analysis/internal-real";
export * as inverseHull from "@lenticule-science/articulating/predicating/positing/settling/analysis/inverse-hull";
export * as knasterTarski from "@lenticule-science/articulating/predicating/positing/settling/analysis/knaster-tarski";
export * as laxSlack from "@lenticule-science/articulating/predicating/positing/settling/analysis/lax-slack";
export * as linearAlgebra from "@lenticule-science/articulating/predicating/positing/settling/analysis/linear-algebra";
export * as matterTopology from "@lenticule-science/articulating/predicating/positing/settling/analysis/matter-topology";
export * as closureRule from "./closure-rule-system.mjs";
export * as discrete from "@lenticule-science/articulating/predicating/positing/settling/analysis/discrete-set-number-graph";
export * as fcaLambek from "@lenticule-science/articulating/predicating/positing/settling/analysis/fca-lambek-circle";
export * as lambek from "@lenticule-science/articulating/predicating/positing/settling/analysis/lambek-calculus";
export * as numberTheory from "@lenticule-science/articulating/predicating/positing/settling/analysis/number-theory";
export * as orderInfra from "@lenticule-science/articulating/predicating/positing/settling/analysis/order-infra";
export * as ordinalClosure from "@lenticule-science/articulating/predicating/positing/settling/analysis/ordinal-closure";
export * as portGraph from "@lenticule-science/articulating/predicating/positing/settling/analysis/port-graph";
export * as regimeTimeSection from "@lenticule-science/articulating/predicating/positing/settling/analysis/regime-time-section";
export * as scottCoalgebra from "@lenticule-science/articulating/predicating/positing/settling/analysis/scott-coalgebra";
export * as residuatedLattice from "@lenticule-science/articulating/predicating/positing/settling/analysis/residuated-lattice";
export * as settlingLocalConstancy from "@lenticule-science/articulating/predicating/positing/settling/analysis/settling-local-constancy";
export * as transfiniteCellComplex from "@lenticule-science/articulating/predicating/positing/settling/analysis/transfinite-cell-complex";
export * as sofic from "@lenticule-science/articulating/predicating/positing/settling/analysis/sofic";
export * as twistProduct from "@lenticule-science/articulating/predicating/positing/settling/analysis/twist-product";
export * as verificationTournament from "@lenticule-science/articulating/predicating/positing/settling/analysis/verification-tournament";
export * as algebraHierarchy from "@lenticule-science/articulating/predicating/positing/settling/analysis/algebra-hierarchy";
export * as aperiodicAutocorrelation from "@lenticule-science/articulating/predicating/positing/settling/analysis/aperiodic-autocorrelation";
export * as aperiodicClassification from "@lenticule-science/articulating/predicating/positing/settling/analysis/aperiodic-classification";
export * as bitopologicalSettlingSite from "@lenticule-science/articulating/predicating/positing/settling/analysis/bitopological-settling-site";
export * as weaveDraft from "@lenticule-science/articulating/predicating/positing/settling/analysis/weave-draft";
export * as coordinationCohomology from "@lenticule-science/articulating/predicating/positing/settling/analysis/coordination-cohomology";
export * as frobeniusTqft from "@lenticule-science/articulating/predicating/positing/settling/analysis/frobenius-tqft";
export * as jeandelRaoWitness from "@lenticule-science/articulating/predicating/positing/settling/analysis/jeandel-rao-witness";
export * as pairwiseStoneClopen from "@lenticule-science/articulating/predicating/positing/settling/analysis/pairwise-stone-clopen";
export * as persistentH0 from "@lenticule-science/articulating/predicating/positing/settling/analysis/persistent-h0";
export * as settlingAssociatedSheaf from "@lenticule-science/articulating/predicating/positing/settling/analysis/settling-associated-sheaf";
export * as settlingCohomologyH1 from "@lenticule-science/articulating/predicating/positing/settling/analysis/settling-cohomology-h1";
export * as negativeParaconsistentSheaf from "@lenticule-science/articulating/predicating/positing/settling/analysis/negative-paraconsistent-sheaf";
export * as quantaleEnrichedSheaf from "@lenticule-science/articulating/predicating/positing/settling/analysis/quantale-enriched-sheaf";
export * as alexandrovHusainov from "@lenticule-science/articulating/predicating/positing/settling/analysis/alexandrov-husainov";
export * as crdtCalm from "@lenticule-science/articulating/predicating/positing/settling/analysis/crdt-cohomological-calm";
export * as kzCoherentSheaf from "@lenticule-science/articulating/predicating/positing/settling/analysis/kz-coherent-sheaf";
export * as lawvereHarmonicCohomology from "@lenticule-science/articulating/predicating/positing/settling/analysis/lawvere-harmonic-cohomology";
export * as bigradedDiamond from "@lenticule-science/articulating/predicating/positing/settling/analysis/bigraded-diamond";
export * as bigradedCohomology from "@lenticule-science/articulating/predicating/positing/settling/analysis/bigraded-cohomology";
export * as arithmetic from "@lenticule-science/articulating/predicating/positing/settling/analysis/arithmetic";
export * as differential from "@lenticule-science/articulating/predicating/positing/settling/analysis/differential";
export * as conservation from "@lenticule-science/articulating/predicating/positing/settling/analysis/conservation";
