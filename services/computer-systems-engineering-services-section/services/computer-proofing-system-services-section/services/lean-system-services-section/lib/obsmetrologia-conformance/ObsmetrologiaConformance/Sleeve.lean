import ObsmetrologiaEconomics.Sleeve
import ObsmetrologiaConformance.Row

/-!
# Sleeve — golden vectors for the member sleeve's mark, routable yield and redeemable principal

Read off `ObsmetrologiaEconomics.Sleeve`. All numbers are decimal strings, so the `uint256` boundary
values (`2^255`, `2^256 - 1`) survive JSON. Argument order is the Lean order.

* `routableYield [value, hwm]` -> `value - hwm`: every pair over `values` with `hwm <= value` (the
  definition carries that hypothesis; out-of-domain pairs have no row here, see `surplus`).
* `routeYield [value, hwm, maxA]` -> `min maxA (value - hwm)`: every in-domain pair, `maxA` over
  `amounts`.
* `hwmAfterLoss [value, hwm]` -> `min hwm value`: every pair.
* `redeemable [hwm, value, maxWithdraw]` -> `min hwm (min value maxWithdraw)`: every triple over `values`.
* `surplus [value, hwm]` -> the floored view `redeemablePrincipal`'s sibling `surplus()` returns (zero
  under water): every pair.
* `hwmAfterRedeem [hwm, out]` -> `hwm - min hwm out`: every pair.
-/

namespace ObsmetrologiaConformance.Sleeve

open Obsmetrologia.Economics.Sleeve

def num (n : Nat) : Json := .str (toString n)

def values : List Nat := [0, 1, 2, 7, 10, 100, 1000000, 10 ^ 18, 2 ^ 255, 2 ^ 256 - 1]

def amounts : List Nat := [0, 1, 5, 10 ^ 18, 2 ^ 256 - 1]

def pairs : List (Nat × Nat) := values.flatMap fun a => values.map fun b => (a, b)

def routableYieldRows : List Row :=
  pairs.flatMap fun (value, hwm) =>
    if h : hwm ≤ value then
      [row ``routableYield [num value, num hwm] (num (routableYield value hwm h))]
    else []

def routeYieldRows : List Row :=
  pairs.flatMap fun (value, hwm) =>
    if h : hwm ≤ value then
      amounts.map fun m =>
        row ``routeYield [num value, num hwm, num m] (num (routeYield value hwm m h))
    else []

def hwmAfterLossRows : List Row :=
  pairs.map fun (value, hwm) =>
    row ``hwmAfterLoss [num value, num hwm] (num (hwmAfterLoss value hwm))

def redeemableRows : List Row :=
  values.flatMap fun hwm => values.flatMap fun value => values.map fun m =>
    row ``redeemable [num hwm, num value, num m] (num (redeemable hwm value m))

def surplusRows : List Row :=
  pairs.map fun (value, hwm) => row ``surplus [num value, num hwm] (num (surplus value hwm))

def hwmAfterRedeemRows : List Row :=
  pairs.map fun (hwm, out) => row ``hwmAfterRedeem [num hwm, num out] (num (hwmAfterRedeem hwm out))

/-- The golden vectors of the sleeve. -/
def rows : List Row :=
  routableYieldRows ++ routeYieldRows ++ hwmAfterLossRows ++ redeemableRows ++ surplusRows
    ++ hwmAfterRedeemRows

end ObsmetrologiaConformance.Sleeve
