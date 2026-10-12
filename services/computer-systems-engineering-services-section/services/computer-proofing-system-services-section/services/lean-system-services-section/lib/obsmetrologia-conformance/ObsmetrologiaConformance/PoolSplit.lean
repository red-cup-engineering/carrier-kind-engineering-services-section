import ObsmetrologiaEconomics.PoolSplit
import ObsmetrologiaConformance.Row

/-!
# PoolSplit — golden vectors for exact pro-rata splitting and balance conservation

Read off `ObsmetrologiaEconomics.PoolSplit`: `shares`, `dust`, `split` (the dust to the first bucket),
`transfer` and `settleCycle`. Amounts and weights are decimal strings, since they range past the
integers a JSON number carries exactly; a ledger is the list of balances.

The totals range over small cases, round numbers, the dust boundaries and `2^256 - 1`; the weights over the
house's 20/30/50 as parts and as basis points, equal parts, a single bucket, zero weights and a zero total
weight. The transfers are every valid `(i, j, x)` of three ledgers.
-/

namespace ObsmetrologiaConformance.PoolSplit

open Obsmetrologia.Economics.PoolSplit

def amount (n : Nat) : Json := .str (toString n)
def amounts (l : List Nat) : Json := .arr (l.map amount)

def totals : List Nat :=
  [0, 1, 2, 3, 7, 9, 10, 99, 100, 101, 999, 1000, 12345, 1000000000000000007,
   340282366920938463463374607431768211455, 2 ^ 256 - 1]

def weightSets : List (List Nat) :=
  [[2, 3, 5], [2000, 3000, 5000], [1, 1, 1], [1, 2], [0, 0], [0, 1], [5], [1, 1, 1, 1, 1, 1, 1], [3, 0, 7], [1, 0, 0]]

def over (f : Nat → List Nat → Row) : List Row :=
  totals.flatMap fun t => weightSets.map (f t)

def sharesRows : List Row := over fun t ws => row ``shares [amount t, amounts ws] (amounts (shares t ws))
def dustRows : List Row := over fun t ws => row ``dust [amount t, amounts ws] (amount (dust t ws))
def splitRows : List Row := over fun t ws => row ``split [amount t, amounts ws] (amounts (split t ws))

def settleRows : List Row :=
  [0, 5, 1000].flatMap fun p => [0, 7, 1000].flatMap fun y =>
    [[2, 3, 5], [1, 1, 1]].map fun ws =>
      row ``settleCycle [amount p, amount y, amounts ws]
        (.arr [amount (settleCycle p y ws).1, amounts (settleCycle p y ws).2])

def ledgers : List (List Nat) := [[10, 5, 0], [3, 3], [7, 0, 0, 1]]

def transferRows : List Row :=
  ledgers.flatMap fun l =>
    (List.range l.length).flatMap fun i => (List.range l.length).flatMap fun j =>
      [0, 1, 3, 7, 10].filterMap fun x =>
        if x ≤ l.getD i 0 then
          some (row ``transfer [.nat i, .nat j, amount x, amounts l] (amounts (transfer i j x l)))
        else none

/-- The golden vectors of the pool split and ledger. -/
def rows : List Row := sharesRows ++ dustRows ++ splitRows ++ settleRows ++ transferRows

end ObsmetrologiaConformance.PoolSplit
