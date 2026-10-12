import Obsmetrologia.Calculus.Logic.LinearLogicMix
import ObsmetrologiaConformance.FourBilattice

/-!
# FourMix — golden vectors for the tensor, the par, the lax MIX and the consensus locus

The multiplicatives of FOUR, as evidence bits `[pos, neg]`, read off `LinearLogicMix`:

* `readingFuse` (tensor `⊗`) and `readingPar` (`⅋`) on all sixteen ordered pairs;
* `readingMix` — `a ⊗ b ≤ₜ a ⅋ b`, true on every pair;
* `requiresConsensus` — the pair on which tensor and par differ (`readingMix_strict` is a witness);
* `equalityLocus` — the right-hand side of `readingPar_eq_readingFuse_iff`: they agree on
  `(a, b)` iff `a` or `b` is `⊤ₖ`, or `a = b` and `a ≠ ⊥ₖ`.

`requiresConsensus` and `equalityLocus` are defined here as Boolean tests of the library's
statements and proved equivalent to them (`requiresConsensus_iff`, `equalityLocus_iff`); the Solidity
library `FourMix` (`requiresConsensus`, `equalityLocus`) is judged against them.
-/

namespace ObsmetrologiaConformance.FourMix

open Obsmetrologia
open ObsmetrologiaConformance.FourBilattice (bits pairs)

/-- Tensor and par differ on the pair. -/
def requiresConsensus (a b : Reading) : Bool := decide (readingFuse a b ≠ readingPar a b)

/-- Tensor and par differ exactly when consensus is required. -/
theorem requiresConsensus_iff (a b : Reading) :
    requiresConsensus a b = true ↔ readingFuse a b ≠ readingPar a b := by
  unfold requiresConsensus; exact decide_eq_true_iff

/-- The exact agreement locus of `⊗` and `⅋`, as a Boolean. -/
def equalityLocus (a b : Reading) : Bool :=
  decide (a = Reading.kTop ∨ b = Reading.kTop ∨ (a = b ∧ a ≠ Reading.kBot))

/-- The locus is the agreement of tensor and par. -/
theorem equalityLocus_iff (a b : Reading) :
    equalityLocus a b = true ↔ readingPar a b = readingFuse a b := by
  rw [readingPar_eq_readingFuse_iff]; unfold equalityLocus; exact decide_eq_true_iff

/-- Consensus is required exactly off the locus. -/
theorem requiresConsensus_eq_not_locus (a b : Reading) :
    requiresConsensus a b = !equalityLocus a b := by
  cases a <;> cases b <;> decide

def binary (op : Lean.Name) (f : Reading → Reading → Reading) : List Row :=
  pairs.map fun (a, b) => row op [bits a, bits b] (bits (f a b))

def relation (op : Lean.Name) (f : Reading → Reading → Bool) : List Row :=
  pairs.map fun (a, b) => row op [bits a, bits b] (.bool (f a b))

/-- The golden vectors of the multiplicatives of FOUR. -/
def rows : List Row :=
  binary ``readingFuse readingFuse
  ++ binary ``readingPar readingPar
  ++ relation ``readingMix (fun a b => Reading.leT (readingFuse a b) (readingPar a b))
  ++ relation ``requiresConsensus requiresConsensus
  ++ relation ``equalityLocus equalityLocus

end ObsmetrologiaConformance.FourMix
