import ObsmetrologiaEconomics.MeetPay
import ObsmetrologiaConformance.Row

/-!
# MeetPay — golden vectors for pay-the-meet

Read off `ObsmetrologiaEconomics.MeetPay`: the two-witness `pay` and `heldMass`, and the n-ary
`payAll` for several challengers (the Lean binder for the local report is `own`; the vector argument
order is `[local, claims]`).

All numbers are decimal strings, so the `uint256` boundary values (`2^255`, `2^256 - 1`) survive JSON.

* `pay` and `heldMass` range over every ordered pair from `values`: zero, small numbers, a million,
  `10^18` (one token at 18 decimals), `2^255` and `2^256 - 1`; 81 rows each. The arguments are
  `[a, b]`; the result is a decimal string.
* `payAll` ranges over local reports `0, 5, 10, 10^18` and every claim list of length 0 to 3 over
  `0, 3, 7, 12, 10^18` (the empty list is the untold second witness): 4 x 156 = 624 rows. The
  arguments are `[local, [claim, ...]]`; the result is a decimal string.
-/

namespace ObsmetrologiaConformance.MeetPay

open Obsmetrologia.Economics.MeetPay

def num (n : Nat) : Json := .str (toString n)

def values : List Nat := [0, 1, 2, 7, 10, 1000000, 10 ^ 18, 2 ^ 255, 2 ^ 256 - 1]

def pairs : List (Nat × Nat) := values.flatMap fun a => values.map fun b => (a, b)

def payRows : List Row :=
  pairs.map fun (a, b) => row ``pay [num a, num b] (num (pay a b))

def heldMassRows : List Row :=
  pairs.map fun (a, b) => row ``heldMass [num a, num b] (num (heldMass a b))

def locals : List Nat := [0, 5, 10, 10 ^ 18]

def claimValues : List Nat := [0, 3, 7, 12, 10 ^ 18]

/-- Every claim list over `claimValues` of length 0 to 3, shortest first. -/
def claimLists : List (List Nat) :=
  [[]] ++ claimValues.map (fun c => [c])
    ++ claimValues.flatMap (fun c => claimValues.map fun d => [c, d])
    ++ claimValues.flatMap (fun c => claimValues.flatMap fun d => claimValues.map fun e => [c, d, e])

def payAllRows : List Row :=
  locals.flatMap fun l =>
    claimLists.map fun cs =>
      row ``payAll [num l, .arr (cs.map num)] (num (payAll l cs))

/-- The golden vectors of pay-the-meet. -/
def rows : List Row := payRows ++ heldMassRows ++ payAllRows

end ObsmetrologiaConformance.MeetPay
