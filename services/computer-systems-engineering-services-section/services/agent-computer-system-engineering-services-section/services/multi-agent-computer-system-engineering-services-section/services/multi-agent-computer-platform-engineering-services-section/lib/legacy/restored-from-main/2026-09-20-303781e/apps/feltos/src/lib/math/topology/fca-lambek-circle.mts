/** Preserve Metroplat's receipt shape and diagnostic wording over the shared FCA laws. */
import {
  circle as sharedCircle,
  formalConceptAnalysisReceipt as sharedReceipt,
  workedContext,
  type FiniteFcaContext,
  type FormalConceptAnalysisReceipt as SharedReceipt,
} from "@lenticule-science/articulating/predicating/positing/settling/analysis/fca-lambek-circle";
import type { FiniteResiduatedLatticeSystem } from "@lenticule-science/articulating/predicating/positing/settling/analysis/residuated-lattice";

export * from "@lenticule-science/articulating/predicating/positing/settling/analysis/fca-lambek-circle";
export type FormalConceptAnalysisReceipt = Omit<SharedReceipt, "sourceModule" | "theorems">;

function withContextDiagnostic<T>(read: () => T): T {
  try { return read(); }
  catch (error) {
    if (error instanceof RangeError && error.message === "fcaLambek: finite context carrier exceeds max size 16") {
      error.message = "fcaLambek: finite context exceeds max size 16";
    }
    throw error;
  }
}

export function circle(context: FiniteFcaContext, residuated: FiniteResiduatedLatticeSystem): ReturnType<typeof sharedCircle> {
  return withContextDiagnostic(() => sharedCircle(context, residuated));
}

export function formalConceptAnalysisReceipt(
  context: FiniteFcaContext = workedContext,
  sampleExtent: readonly string[] = ["a", "b"],
): FormalConceptAnalysisReceipt {
  return withContextDiagnostic(() => {
    const { sourceModule, theorems, ...receipt } = sharedReceipt(context, sampleExtent);
    return Object.freeze(receipt);
  });
}
