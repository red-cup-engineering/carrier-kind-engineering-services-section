import ObsmetrologiaEconomics.BarrierSeries
import ObsmetrologiaConformance.Row

/-!
# BarrierSeries — golden vectors for the day-bucketed barrier

Read off `ObsmetrologiaEconomics.BarrierSeries`: `barrierAt`, `capOf`, `contribution`, `drawSafe`,
`projectedSafe` and `firstCrossing`. Amounts, seconds and unix days are decimal strings, since they
range past the integers a JSON number carries exactly. An obligation is the object
`{"amount", "contested", "due", "settled"}` (keys in alphabetical order, the order Foundry's
`vm.parseJson` decodes a struct in); `due` is unix seconds and `amount` the counted contribution.

The obligation sets are the `pool-service` fixture (three obligations of 30 due 2026-09-25, ten
days' lead, floor 20; ISO days are converted to unix days, 2026-09-25 being day 20721), a lead that
is not a whole number of days with a due time inside its day, settled and contested obligations,
overlapping and abutting windows, a ceiling that binds, zero amounts, large amounts, and no
obligations at all. `barrierAt` is read at, and one day either side of, every breakpoint of its
set. Only `leadSeconds ≤ due` rows are carried (the domain of a `uint64` realization), only
`amount ≤ float` rows for `drawSafe` (the hypothesis of the declaration), and only horizons with
`fromDay ≤ toDay` for the three horizon operations. `firstCrossing` is `[]` for no crossing and
`[day]` for the first crossing day. No row has a sum that reaches `2^256`; a realization may
saturate there (see the module's remark).
-/

namespace ObsmetrologiaConformance.BarrierSeries

open Obsmetrologia.Economics.BarrierSeries

def amount (n : Nat) : Json := .str (toString n)

def obligationJson (o : Obligation) : Json :=
  .obj [("amount", amount o.amount), ("contested", .bool o.contested), ("due", amount o.due),
        ("settled", .bool o.settled)]

def obligations (obs : List Obligation) : Json := .arr (obs.map obligationJson)

/-- An obligation due on unix day `d`, `s` seconds into it. -/
def ob (d s a : Nat) (settled contested : Bool := false) : Obligation :=
  ⟨d * 86400 + s, a, settled, contested⟩

/-- A named charter-and-obligations case: `(leadSeconds, floor, ceiling, obligations)`. -/
structure Config where
  lead : Nat
  floor : Nat
  ceiling : Nat
  obs : List Obligation
  deriving Inhabited

def big : Nat := 10 ^ 30

def configs : List Config :=
  [ -- the pool-service fixture at unix days
    ⟨10 * 86400, 20, big, [ob 20721 0 30, ob 20721 0 30, ob 20721 0 30]⟩,
    -- the same under a ceiling that binds, and a ceiling below the floor
    ⟨10 * 86400, 20, 100, [ob 20721 0 30, ob 20721 0 30, ob 20721 0 30]⟩,
    ⟨10 * 86400, 20, 15, [ob 20721 0 30]⟩,
    -- a lead that is not whole days, due times inside their days
    ⟨36 * 3600, 5, big, [ob 20721 3600 40, ob 20722 86399 7, ob 20720 43200 1]⟩,
    -- settled and contested
    ⟨7 * 86400, 10, big, [ob 20800 0 50 true false, ob 20800 0 25 false true, ob 20802 100 60]⟩,
    -- overlapping and abutting windows (a window ends the day after its due day)
    ⟨3 * 86400, 0, big, [ob 20900 0 11, ob 20904 0 13, ob 20908 0 17, ob 20909 0 19]⟩,
    -- zero lead: pending on the due day only
    ⟨0, 50, big, [ob 21000 0 10, ob 21001 0 20]⟩,
    -- zero amounts and a zero floor
    ⟨86400, 0, big, [ob 21100 0 0, ob 21100 5 0]⟩,
    -- large amounts
    ⟨5 * 86400, 1, 2 ^ 255, [ob 21200 0 (2 ^ 254), ob 21200 0 (2 ^ 254), ob 21201 0 (2 ^ 253)]⟩,
    -- the floor alone, and a floor above the ceiling
    ⟨10 * 86400, 50, big, []⟩,
    ⟨10 * 86400, 500, 100, []⟩,
    -- a lead exactly the time to the epoch day (due - lead = 0)
    ⟨30 * 86400, 3, big, [ob 30 0 9, ob 40 0 4]⟩ ]

/-- The days worth reading a configuration at: every breakpoint and a day either side. -/
def daysOf (c : Config) : List Nat :=
  dayset ((breakpoints c.lead c.obs).flatMap fun b => [b, b + 1] ++ (if b = 0 then [] else [b - 1]) ) ++ [0, 1000000]

def barrierAtRows : List Row :=
  configs.flatMap fun c => (daysOf c).map fun d =>
    row ``barrierAt [amount c.lead, amount c.floor, amount c.ceiling, obligations c.obs, amount d]
      (amount (barrierAt c.lead c.floor c.ceiling c.obs d))

/-- Configurations the horizon operations read: the fixture, its ceiling-bound twin, the empty set and a floor-only pool. -/
def horizonConfigs : List Config :=
  [ configs[0]!, configs[1]!, configs[3]!, configs[4]!, ⟨0, 50, 1000, []⟩ ]

def horizons : List (Nat × Nat) :=
  [(20697, 20697), (20700, 20721), (20710, 20721), (20721, 20721), (20721, 20725), (20722, 20740), (20700, 20800), (20800, 20802)]

def floats : List Nat := [0, 20, 50, 55, 110, 125, 140, 1000]
def draws : List Nat := [0, 10, 30, 100]

def drawSafeRows : List Row :=
  horizonConfigs.flatMap fun c => horizons.flatMap fun (a, b) => floats.flatMap fun f => draws.filterMap fun x =>
    if h : x ≤ f then
      some (row ``drawSafe [amount f, amount x, amount c.lead, amount c.floor, amount c.ceiling,
        obligations c.obs, amount a, amount b] (.bool (drawSafe f x h c.lead c.floor c.ceiling c.obs a b)))
    else none

def projections : List Nat := [0, 19, 20, 49, 50, 59, 60, 109, 110, 111, 1000]

def projectedSafeRows : List Row :=
  horizonConfigs.flatMap fun c => horizons.flatMap fun (a, b) => projections.map fun p =>
    row ``projectedSafe [amount c.lead, amount c.floor, amount c.ceiling, obligations c.obs,
      amount p, amount a, amount b] (.bool (projectedSafe c.lead c.floor c.ceiling c.obs p a b))

def firstCrossingRows : List Row :=
  horizonConfigs.flatMap fun c => horizons.flatMap fun (a, b) => projections.map fun p =>
    row ``firstCrossing [amount c.lead, amount c.floor, amount c.ceiling, obligations c.obs,
      amount p, amount a, amount b]
      (.arr ((firstCrossing c.lead c.floor c.ceiling c.obs p a b).toList.map amount))

def sleeveValues : List Nat := [0, 1, 30, 100, 2 ^ 255]

def contributionRows : List Row :=
  sleeveValues.flatMap fun d => sleeveValues.flatMap fun s => sleeveValues.map fun c =>
    row ``contribution [amount d, amount s, amount c] (amount (contribution d s c))

def capRows : List Row :=
  [0, 1, 500, 2500, 10000].flatMap fun bps => [0, 1, 99, 10000, 1000000000000000007, 2 ^ 200].map fun f =>
    row ``capOf [amount bps, amount f] (amount (capOf bps f))

/-- The golden vectors of the barrier series. -/
def rows : List Row :=
  barrierAtRows ++ drawSafeRows ++ projectedSafeRows ++ firstCrossingRows ++ contributionRows ++ capRows

end ObsmetrologiaConformance.BarrierSeries
