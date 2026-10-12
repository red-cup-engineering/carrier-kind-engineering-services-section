import ObsmetrologiaEconomics.FloatDesk
import ObsmetrologiaConformance.Row

/-!
# FloatDesk — golden vectors for the refusal order and the two prices

Read off `ObsmetrologiaEconomics.FloatDesk`. All numbers are decimal strings, so the `uint256` boundary
values survive JSON. Argument order is the Lean order.

* `drawAdmitted [feeAvoided, term, minTerm, maxTerm, amount, open, limit, cap, lent, poolCap, writeoff,
  budget, drawSafe]` -> the refusal's name (`feeUnknown`, `termOutOfRange`, `exceedsLine`, `agentCap`,
  `poolCap`, `writeoff`, `crossesBarrier`, `admitted`). `drawSafe` is a JSON boolean, the rest decimal
  strings. The grid is the product of per-check states around a base draw (amount 20, window 3 to 30 days,
  line 100, pool lent 500, budget 10): fee {known, unknown}; term {interior, at minTerm, at maxTerm, one
  below, one above}; line {interior, exactly at the line, one over}; agent cap {interior, equal to the
  amount, one under}; pool cap {interior, exactly full, one over}; writeoff {interior, at budget, one over};
  barrier {safe, crosses}. That is 2 x 5 x 3 x 3 x 3 x 3 x 2 = 1620 rows, every combination of failures, so
  the first failing check is the one named in each row (the order is witnessed, not asserted). Then a few
  `uint256` rows (sums that exceed `2^256`, which the realizer must refuse without a panic).
* `pricePerson [capBpsPerYear, amount, termSeconds]` -> `amount * cap * term / (365 * 86400 * 10000)`:
  caps up to `10000`, terms up to one year, amounts up to `2^256 - 1` (the result never exceeds the amount,
  so it fits; the product does not, so the realizer needs a full-precision `mulDiv`).
* `priceBusiness [floor, feeAvoided, fractionBps]` -> `max floor (feeAvoided * fractionBps / 10000)`:
  fractions up to `10000`, fees up to `2^256 - 1`.
-/

namespace ObsmetrologiaConformance.FloatDesk

open Obsmetrologia.Economics.FloatDesk

def num (n : Nat) : Json := .str (toString n)

def refusalName : Refusal → String
  | .feeUnknown => "feeUnknown"
  | .termOutOfRange => "termOutOfRange"
  | .exceedsLine => "exceedsLine"
  | .agentCap => "agentCap"
  | .poolCap => "poolCap"
  | .writeoff => "writeoff"
  | .crossesBarrier => "crossesBarrier"
  | .admitted => "admitted"

def day : Nat := 86400

/-- One draw row: the 12 numbers and the barrier verdict, in the Lean order. -/
def drawRow (fee term minT maxT amount openE limit cap lent poolCap wo budget : Nat) (safe : Bool) : Row :=
  row ``drawAdmitted
    [num fee, num term, num minT, num maxT, num amount, num openE, num limit, num cap, num lent,
      num poolCap, num wo, num budget, .bool safe]
    (.str (refusalName (drawAdmitted fee term minT maxT amount openE limit cap lent poolCap wo budget safe)))

/-- The product grid over the per-check states, around amount 20, window `[3d, 30d]`, line 100, lent 500,
budget 10. -/
def drawGridRows : List Row :=
  [50, 0].flatMap fun fee =>
  [7 * day, 3 * day, 30 * day, 3 * day - 1, 30 * day + 1].flatMap fun term =>
  [(0, 100), (80, 100), (81, 100)].flatMap fun (openE, limit) =>
  [1000, 20, 19].flatMap fun cap =>
  [1000000, 520, 519].flatMap fun poolCap =>
  [0, 10, 11].flatMap fun wo =>
  [true, false].map fun safe =>
    drawRow fee term (3 * day) (30 * day) 20 openE limit cap 500 poolCap wo 10 safe

def m : Nat := 2 ^ 256 - 1

/-- Boundary rows where a sum `amount + open` or `lent + amount` exceeds `2^256`. -/
def drawBoundaryRows : List Row :=
  [ drawRow 50 (7 * day) (3 * day) (30 * day) m 1 m m 0 m 0 10 true
  , drawRow 50 (7 * day) (3 * day) (30 * day) m 0 m m 0 m 0 10 true
  , drawRow 50 (7 * day) (3 * day) (30 * day) 1 0 m m m m 0 10 true
  , drawRow 50 (7 * day) (3 * day) (30 * day) 20 0 m m m m 0 10 true
  , drawRow m (7 * day) (3 * day) (30 * day) 20 0 100 1000 0 1000 0 10 true
  , drawRow 50 m 0 m 20 0 100 1000 0 1000 0 10 true
  , drawRow 50 0 0 m 20 0 100 1000 0 1000 0 10 true
  , drawRow 50 (7 * day) 0 m 0 0 0 0 0 0 0 0 true ]

def caps : List Nat := [0, 1, 50, 1200, 10000]
def amounts : List Nat := [0, 1, 1000000, 10 ^ 18, 2 ^ 128, 2 ^ 230, 2 ^ 255, m]
def terms : List Nat := [0, 1, day, 30 * day, 365 * day]

def pricePersonRows : List Row :=
  caps.flatMap fun c => amounts.flatMap fun a => terms.map fun t =>
    row ``pricePerson [num c, num a, num t] (num (pricePerson c a t))

def floors : List Nat := [0, 1, 50, 10 ^ 18, 2 ^ 255]
def fees : List Nat := [0, 1, 1000, 10000, 10 ^ 18, 2 ^ 200, 2 ^ 255, m]
def fractions : List Nat := [0, 1, 500, 10000]

def priceBusinessRows : List Row :=
  floors.flatMap fun f => fees.flatMap fun a => fractions.map fun b =>
    row ``priceBusiness [num f, num a, num b] (num (priceBusiness f a b))

/-- The golden vectors of the float desk. -/
def rows : List Row := drawGridRows ++ drawBoundaryRows ++ pricePersonRows ++ priceBusinessRows

end ObsmetrologiaConformance.FloatDesk
