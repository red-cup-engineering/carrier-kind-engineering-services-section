import ObsmetrologiaEconomics.AllocationSolver
import ObsmetrologiaConformance.Row

/-!
# AllocationSolver — golden vectors for the two-handed knapsack

Read off `ObsmetrologiaEconomics.AllocationSolver`: the left-fold optimum `solveL`, the right-fold optimum
`solveR` and the optimum's `degeneracy` (the size of the tie-set). An obstruction is `[cost, benefit]`; a
selection is a list of obstructions, a sublist of the universe in its order. Over every universe of at most
three obstructions drawn from costs `{1, 2}` and benefits `{2, 3}`, at budgets `0..4`. The two hands return
the same benefit (`solvers_agree_value`) and the same selection exactly when the optimum is unique
(`hands_agree_of_unique_optimum`).
-/

namespace ObsmetrologiaConformance.AllocationSolver

open Obsmetrologia.Cohomology.Attention

def obstruction (o : Obstruction) : Json := .arr [.nat o.cost, .nat o.benefit]
def selection (l : List Obstruction) : Json := .arr (l.map obstruction)

def alphabet : List Obstruction := [⟨1, 2⟩, ⟨1, 3⟩, ⟨2, 2⟩, ⟨2, 3⟩]

/-- Every universe of at most three obstructions. -/
def universes : List (List Obstruction) :=
  [[]] ++ alphabet.map (fun a => [a])
    ++ alphabet.flatMap (fun a => alphabet.map (fun b => [a, b]))
    ++ alphabet.flatMap (fun a => alphabet.flatMap (fun b => alphabet.map (fun c => [a, b, c])))

def budgets : List Nat := [0, 1, 2, 3, 4]

def over (f : Nat → List Obstruction → Row) : List Row :=
  universes.flatMap fun u => budgets.map fun b => f b u

/-- The golden vectors of the allocation solver. -/
def rows : List Row :=
  over (fun b u => row ``solveL [.nat b, selection u] (selection (solveL b u)))
  ++ over (fun b u => row ``solveR [.nat b, selection u] (selection (solveR b u)))
  ++ over (fun b u => row ``degeneracy [.nat b, selection u] (.nat (degeneracy b u)))

end ObsmetrologiaConformance.AllocationSolver
