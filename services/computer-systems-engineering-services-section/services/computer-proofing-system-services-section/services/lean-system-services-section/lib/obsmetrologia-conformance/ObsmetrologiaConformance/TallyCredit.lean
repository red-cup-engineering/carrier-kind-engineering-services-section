import ObsmetrologiaEconomics.TallyCredit
import ObsmetrologiaConformance.Row

/-!
# TallyCredit — golden vectors for the median ring, the clip, the derived line and the limit

Read off `ObsmetrologiaEconomics.TallyCredit`. All numbers are decimal strings, so the `uint256`
boundary values (`2^255`, `2^256 - 1`) survive JSON; a ring is a JSON array of decimal strings.

* `median`: arguments `[ring]`. Every ring of length 0 to 3 over `0, 1, 2, 10^18, 2^256 - 1` (156
  rings, the empty ring and the two-entry floor-average rows among them, and the `2^256 - 1` pair that
  overflows a naive `a + b`), plus rings of length 4 to 16 built from a fixed deterministic
  generator (ascending, descending, constant, alternating, a linear-congruential scramble), and the
  house cases of the pool-service fixture (`[20, 20, 20]`, the even-length floor-average).
* `clip`: arguments `[size, currentMedian, minDraw]`, every triple over `0, 1, 3, 100, 10^18, 2^255,
  2^256 - 1` (343 rows). `2 * max currentMedian minDraw` exceeds `uint256` when the larger is at
  least `2^255`; the result is then `size`, so a realizer saturates the doubling.
* `deriveLine`: arguments `[count, ring, stale]` with `count <= 16` and `ring.length <= 16` (the
  theorems' hypotheses). Entries stay below `2^252` (`deriveLine_lt_two_pow_256`). The pool-service
  fixture `deriveMemberCreditLine` (three matched draws of 20: limit 60; with a stale open half-tally:
  limit 0) is among the rows.
* `limit`: arguments `[line, cap]`, every pair over `0, 1, 60, 100, 10^18, 2^256 - 1` (36 rows).
-/

namespace ObsmetrologiaConformance.TallyCredit

open Obsmetrologia.Economics.TallyCredit

def num (n : Nat) : Json := .str (toString n)

def ringJ (r : List Nat) : Json := .arr (r.map num)

/-! ## Rings -/

def medianValues : List Nat := [0, 1, 2, 10 ^ 18, 2 ^ 256 - 1]

/-- Every ring over `medianValues` of length 0 to 3, shortest first. -/
def smallRings : List (List Nat) :=
  [[]] ++ medianValues.map (fun a => [a])
    ++ medianValues.flatMap (fun a => medianValues.map fun b => [a, b])
    ++ medianValues.flatMap (fun a => medianValues.flatMap fun b => medianValues.map fun c => [a, b, c])

/-- Deterministic pseudo-random entries (a linear congruential step), bounded by `m`. -/
def scramble (seed m : Nat) : Nat → List Nat
  | 0 => []
  | k + 1 =>
    let s := (seed * 1103515245 + 12345) % 2147483648
    (s % m) :: scramble s m k

/-- Rings of length 4 to 16 of five shapes, and the pool-service house cases. -/
def longRings : List (List Nat) :=
  let lens := List.range 13 |>.map (· + 4)
  lens.flatMap fun n =>
    [ (List.range n).map (· + 1),
      (List.range n).reverse.map (· + 1),
      List.replicate n 20,
      (List.range n).map (fun i => if i % 2 = 0 then 1 else 1000),
      scramble (n + 7) 1000 n ]

def houseRings : List (List Nat) :=
  [[20, 20, 20], [3, 1, 2], [4, 1], [1, 2], [1, 2, 3, 4], [1, 100, 1000], [1, 100, 1000, 1]]

def allRings : List (List Nat) := smallRings ++ longRings ++ houseRings

def medianRows : List Row :=
  allRings.map fun r => row ``median [ringJ r] (num (median r))

/-! ## Clip -/

def clipValues : List Nat := [0, 1, 3, 100, 10 ^ 18, 2 ^ 255, 2 ^ 256 - 1]

def clipRows : List Row :=
  clipValues.flatMap fun s => clipValues.flatMap fun m => clipValues.map fun d =>
    row ``clip [num s, num m, num d] (num (clip s m d))

/-! ## deriveLine -/

def lineRings : List (List Nat) :=
  [[], [5], [20, 20, 20], [1, 100, 1000], [4, 1], [2 ^ 252 - 1], [2 ^ 252 - 1, 2 ^ 252 - 1],
   (List.range 16).map (· + 1), List.replicate 16 (10 ^ 18), scramble 3 1000 16, scramble 5 1000 9]

def lineCounts : List Nat := [0, 1, 3, 9, 15, 16]

def deriveLineRows : List Row :=
  lineRings.flatMap fun r => lineCounts.flatMap fun c => [false, true].map fun st =>
    row ``deriveLine [num c, ringJ r, .bool st] (num (deriveLine c r st))

/-! ## limit -/

def limitValues : List Nat := [0, 1, 60, 100, 10 ^ 18, 2 ^ 256 - 1]

def limitRows : List Row :=
  limitValues.flatMap fun l => limitValues.map fun c => row ``limit [num l, num c] (num (limit l c))

/-- The golden vectors of the tally credit derivation. -/
def rows : List Row := medianRows ++ clipRows ++ deriveLineRows ++ limitRows

end ObsmetrologiaConformance.TallyCredit
