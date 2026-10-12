import ObsmetrologiaComputing.WorkArena.Fragment
import ObsmetrologiaConformance.Four

/-!
# WorkArena — golden vectors for the law of one work-arena thread

Every row is computed by `ObsmetrologiaComputing.WorkArena`'s own definitions:

* `answers` and `told` on every kind and act: which acts answer which openings, and which are
  tellings. `fragment_law` characterizes the told table: a telling needs no seal, and every other
  act either needs the seal or retracts.
* `board` on scenarios. Each scenario is an opening, a history and a reading time. It covers
  every witness `fragment_law` rests on (the history, then the history with its late move) and
  the law's other paths. Each history is given in several arrival orders. By
  `board_of_sealed_arrival` and the sorting `board` does, every order of one history reads one
  board.

The eighteenth edition's supply is covered the same way: its witnesses (a draw refused by a
competing draw, by a late reading, admitted by a late return; a return and a withdrawal; a late
reading that closes or reopens the supply) and its other paths (floor and open admission, lapse,
returns, the supplier's side, readings, ties and future readings, closure). A supply's opening
carries its `amount`, `lapses` and `admitsOpen`; a draw's or a return's move carries its `amount`.
These fields appear only on a supply and its draws and returns, so no earlier row changes.

Kinds, acts, standings and the rest are named by their constructors, read off the derived
`Repr`, so this module states no names of its own. A reading is named as `Four` names a point.
A player is a number and a time is a number (minutes after the opening).

The implementation is judged on its own vocabulary through its realization, which maps these
names onto it. Rows on which the law departs from the current implementation are kept as rows,
not dropped. The main one is a witness told before its delivery stands: it is a telling, so the
law keeps it.
-/

namespace ObsmetrologiaConformance.WorkArena

open ObsmetrologiaComputing.WorkArena
open ObsmetrologiaConformance.Four (point)

/-- A constructor's name: the last component of its `Repr`, without guillemets. -/
def ctorName {α : Type} [Repr α] (x : α) : String :=
  let last := ((reprStr x).splitOn ".").getLast!
  String.ofList (last.toList.filter (fun c => c ≠ '«' && c ≠ '»'))

/-- A name as JSON. -/
def named {α : Type} [Repr α] (x : α) : Json := .str (ctorName x)

/-- Naturals as JSON. -/
def nats (l : List Nat) : Json := .arr (l.map .nat)

/-- An opening as JSON. -/
def opening (o : Opening) : Json :=
  .obj ([("kind", named o.kind), ("opener", .nat o.opener), ("assayer", .nat o.assayer)]
    ++ (match o.addressee with | some p => [("addressee", .nat p)] | none => [])
    ++ [("conditions", nats o.conditions), ("measures", nats o.measures)]
    ++ (match o.kind with
      | .supply => [("amount", .nat o.amount), ("lapses", .nat o.lapses), ("admitsOpen", .bool o.admitsOpen)]
      | _ => []))

/-- A move as JSON, every field given. -/
def move (m : Move) : Json :=
  .obj ([("act", named m.act), ("player", .nat m.player), ("time", .nat m.time),
    ("about", .nat m.about), ("measure", .nat m.measure), ("value", .nat m.value),
    ("ends", .nat m.ends), ("observed", .nat m.observed), ("unmet", nats m.unmet),
    ("terms", nats m.terms), ("completes", .bool m.completes)]
    ++ (match m.act with
      | .draw | .«return» => [("amount", .nat m.amount)]
      | _ => []))

/-- A delivery as the board shows it: its reading and verdict appear once it is witnessed. -/
def delivery (d : DeliveryOutcome) : Json :=
  .obj ([("player", .nat d.player), ("time", .nat d.time),
    ("readings", .arr (d.readings.map fun (c, r) => .obj [("claim", .nat c), ("reading", point r)]))]
    ++ (match d.reading with | some r => [("reading", point r)] | none => [])
    ++ (match d.verdict with | some v => [("verdict", named v)] | none => []))

/-- A wager as the board shows it. -/
def wager (w : WagerOutcome) : Json :=
  .obj [("player", .nat w.player), ("measure", .nat w.measure), ("standing", named w.standing)]

/-- A board as JSON. -/
def outcome (b : Outcome) : Json :=
  .obj [("standing", named b.standing), ("takers", nats b.takers), ("refused", nats b.refused),
    ("deliveries", .arr (b.deliveries.map delivery)), ("wagers", .arr (b.wagers.map wager))]

/-! ## Scenarios -/

/-- A scenario: an opening, a history and a time to read the board at. -/
structure Scenario where
  opening : Opening
  moves : List Move
  readAt : Time

/-- A request with no conditions stated. -/
def reqBare : Opening := { kind := .request, opener := 1, assayer := 9 }

/-- `m` with `about` set. -/
def about (m : Move) (p : Player) : Move := { m with about := p }
/-- `m` with `terms` set. -/
def terms (m : Move) (ts : List Nat) : Move := { m with terms := ts }

/-- The witnesses `fragment_law` rests on: each history, then the history with its late move. -/
def witnessScenarios : List Scenario :=
  let pair (o : Opening) (l : List Move) (x : Move) : List Scenario := [⟨o, l, 9⟩, ⟨o, x :: l, 9⟩]
  pair aimO [mv .hold 2 3] lateWithdraw
  ++ pair aimO [wagerMv 3 9] lateWithdraw
  ++ pair aimO [mv .hold 2 1, mv .attach 2 3] lateWithdraw
  ++ pair aimO [mv .hold 2 1, mv .leave 2 3] lateWithdraw
  ++ pair aimO [] (mv .withdraw 1 1)
  ++ pair reqO [mv .promise 2 3] lateWithdraw
  ++ pair reqO [mv .promise 2 1, mv .attach 2 3] lateWithdraw
  ++ pair reqTo [mv .decline 2 3] lateWithdraw
  ++ pair reqO [terms (mv .refine 9 3) [2]] lateWithdraw
  ++ pair reqO [terms (mv .counter 2 3) [2]] lateWithdraw
  ++ pair reqO [terms (mv .counter 2 1) [2], about (mv .agree 9 3) 2] lateWithdraw
  ++ pair reqO [mv .promise 2 1, mv .deliver 2 3] lateWithdraw
  ++ pair reqO [mv .promise 2 1, mv .release 2 3] lateWithdraw
  ++ pair reqO [mv .promise 2 1, mv .deliver 2 2, mv .withdraw 1 4] (about (mv .accept 9 3) 2)
  ++ pair propO [mv .adopt 2 3] lateWithdraw
  ++ pair propO [mv .adopt 2 1, mv .attach 2 3] lateWithdraw
  ++ pair propO [] (mv .withdraw 1 1)
  ++ pair repO [mv .adopt 2 3] (mv .resolve 3 2)
  ++ pair repO [mv .adopt 2 1, mv .attach 2 3] lateWithdraw
  ++ pair repO [mv .resolve 2 3] (mv .resolve 3 2)
  ++ pair repO [mv .withdraw 1 3] (mv .resolve 2 2)
  ++ pair askO [mv .answer 2 1, about (mv .accept 9 3) 2] lateWithdraw
  ++ pair askO [mv .answer 2 1, mv .withdraw 1 4] (about (mv .accept 9 3) 2)
  ++ pair declO [] (mv .withdraw 1 1)
  ++ pair reqO [mv .promise 2 1] (mv .supersede 1 2)
  ++ pair aimO [wagerMv 1 3, observeMv 3 2 1, wagerMv 4 6, wagerMv 7 9] (observeMv 6 5 1)
  ++ pair reqO [mv .promise 2 1, mv .deliver 2 2, about (mv .accept 9 3) 2]
      { about (mv .reject 3 4) 2 with unmet := [1] }
  ++ pair repO [mv .resolve 2 1] (mv .corroborate 3 2)

/-- The law's other paths. -/
def lawScenarios : List Scenario :=
  [ -- requests: acceptance, contest, completion after a miss
    ⟨reqO, [mv .promise 2 1, mv .deliver 2 2, about (mv .accept 9 3) 2], 9⟩,
    ⟨reqO, [mv .promise 2 1, mv .deliver 2 2, { about (mv .reject 9 3) 2 with unmet := [1] },
      { terms (mv .refine 1 4) [1, 2] with completes := true }, mv .deliver 2 5, about (mv .accept 9 6) 2], 9⟩,
    ⟨reqO, [mv .promise 2 1, mv .deliver 2 2, { about (mv .reject 9 3) 2 with unmet := [7] }], 9⟩,
    ⟨reqO, [mv .promise 2 1, mv .deliver 2 2, about (mv .accept 3 3) 2], 9⟩,
    -- a witness told before its delivery stands is kept, and bears on no delivery
    ⟨reqO, [about (mv .accept 9 2) 2, mv .promise 2 1, mv .deliver 2 3], 9⟩,
    -- a deliverer never witnesses its own delivery
    ⟨reqO, [mv .promise 2 1, mv .deliver 2 2, about (mv .accept 2 3) 2], 9⟩,
    -- the taking side
    ⟨reqO, [mv .promise 1 1, mv .promise 9 2, mv .promise 2 3, mv .promise 2 4], 9⟩,
    ⟨reqTo, [mv .promise 3 1, mv .decline 3 2, mv .decline 2 3], 9⟩,
    ⟨reqTo, [mv .promise 2 1, mv .decline 2 2], 9⟩,
    -- counter-offers, agreement and award
    ⟨reqO, [terms (mv .counter 3 1) [2], about (mv .agree 9 2) 3, mv .promise 2 3, mv .promise 3 4,
      mv .release 3 5, mv .promise 2 6], 9⟩,
    ⟨reqO, [terms (mv .counter 1 1) [2], about (mv .agree 9 2) 3, terms (mv .counter 3 3) [], about (mv .agree 3 4) 3], 9⟩,
    -- refinement
    ⟨reqBare, [mv .promise 2 1, terms (mv .refine 2 2) [1], terms (mv .refine 2 3) [2], terms (mv .refine 1 4) [3]], 9⟩,
    ⟨reqO, [mv .promise 2 1, mv .deliver 2 2, terms (mv .refine 9 3) [2], terms (mv .counter 2 4) [2]], 9⟩,
    ⟨reqO, [mv .promise 2 1, mv .deliver 2 2, { terms (mv .refine 1 3) [1, 2] with completes := true }], 9⟩,
    ⟨reqO, [mv .promise 2 1, mv .deliver 2 2, { about (mv .reject 9 3) 2 with unmet := [1] },
      { terms (mv .refine 1 4) [1] with completes := true }, { terms (mv .refine 2 5) [1, 2] with completes := true }], 9⟩,
    -- delivery and attachment
    ⟨reqO, [mv .promise 2 1, mv .attach 2 2, mv .attach 2 3, mv .deliver 2 4, mv .deliver 2 5, mv .attach 3 6], 9⟩,
    ⟨reqO, [mv .promise 2 1, mv .deliver 2 2, mv .attach 2 3], 9⟩,
    -- withdrawal, knowledge after closing, supersession
    ⟨reqO, [mv .withdraw 2 1, mv .promise 2 2, mv .withdraw 1 3, mv .promise 3 4], 9⟩,
    ⟨reqO, [mv .promise 2 1, mv .deliver 2 2, mv .withdraw 1 3, about (mv .accept 9 4) 2], 9⟩,
    ⟨reqO, [mv .promise 2 1, mv .supersede 2 2, mv .supersede 1 3, mv .deliver 2 4], 9⟩,
    -- a second promiser's delivery after the first is rejected
    ⟨reqO, [mv .promise 2 1, mv .promise 3 2, mv .deliver 2 3, { about (mv .reject 9 4) 2 with unmet := [1] },
      mv .deliver 3 5, about (mv .accept 9 6) 3], 9⟩,
    -- aims: wagers met, contested, unread and running
    ⟨aimO, [mv .hold 2 1, { wagerMv 2 6 with player := 3 }, observeMv 7 5 6], 9⟩,
    ⟨aimO, [{ wagerMv 2 6 with player := 3 }, observeMv 7 5 6, { observeMv 8 5 1 with player := 4 }], 9⟩,
    ⟨aimO, [wagerMv 2 6], 9⟩,
    ⟨aimO, [wagerMv 2 20, observeMv 5 4 9], 9⟩,
    ⟨aimO, [wagerMv 2 6, observeMv 4 3 1, observeMv 5 4 7], 9⟩,
    ⟨aimO, [{ wagerMv 1 5 with measure := 2 }, wagerMv 2 2, wagerMv 3 8, wagerMv 4 9], 9⟩,
    ⟨aimO, [{ observeMv 1 1 5 with measure := 2 }, observeMv 2 3 5, observeMv 4 3 5], 9⟩,
    ⟨aimO, [mv .hold 1 1, mv .leave 2 2, mv .hold 2 3, mv .hold 2 4, mv .leave 2 5, mv .hold 2 6], 9⟩,
    ⟨aimO, [wagerMv 1 3, observeMv 3 2 1, wagerMv 4 6, observeMv 6 5 9, wagerMv 7 9], 9⟩,
    -- proposals
    ⟨propO, [mv .adopt 2 1, mv .argue 3 2, mv .adopt 2 3, mv .withdraw 1 4, mv .argue 3 5, mv .adopt 4 6], 9⟩,
    ⟨propO, [mv .adopt 1 1, mv .observe 2 2, mv .adopt 2 3, mv .attach 2 4, mv .attach 2 5], 9⟩,
    -- reports
    ⟨repO, [mv .corroborate 2 1, mv .adopt 3 2, mv .resolve 3 3, mv .corroborate 4 4, mv .resolve 3 5], 9⟩,
    ⟨repO, [mv .resolve 2 1, mv .resolve 3 2, mv .adopt 3 3, mv .corroborate 2 4], 9⟩,
    -- questions
    ⟨askO, [mv .answer 2 1, mv .answer 3 2, about (mv .accept 9 3) 3, mv .answer 4 4], 9⟩,
    ⟨askO, [mv .answer 2 1, about (mv .accept 1 2) 2, about (mv .accept 9 3) 5, about (mv .reject 9 4) 2], 9⟩,
    ⟨{ askO with assayer := 1 }, [mv .answer 2 1, mv .answer 2 2, about (mv .accept 1 3) 2], 9⟩,
    -- declarations
    ⟨declO, [mv .withdraw 2 1, mv .observe 3 2, mv .withdraw 1 3], 9⟩,
    ⟨declO, [mv .supersede 1 1, mv .withdraw 1 2], 9⟩ ]

/-- A supply of `5` that admits work while any is left (the last draw may overdraw). -/
def supplyOpen : Opening := { supplyO with admitsOpen := true }

/-- The supply's witnesses `fragment_law` rests on, each history and then the history with its
late move. -/
def supplyWitnessScenarios : List Scenario :=
  let pair (o : Opening) (l : List Move) (x : Move) : List Scenario := [⟨o, l, 9⟩, ⟨o, x :: l, 9⟩]
  pair supplyO [drawMv 2 3 5] (drawMv 4 2 5)
  ++ pair supplyO [drawMv 2 3 5] (remainingMv 2 2 0)
  ++ pair supplyO [drawMv 2 1 5, drawMv 3 4 3] (returnMv 2 3 3)
  ++ pair supplyO [drawMv 2 1 3, returnMv 2 3 2] lateWithdraw
  ++ pair supplyO [] (mv .withdraw 1 1)
  ++ pair supplyO [drawMv 2 3 2] (remainingMv 4 4 0)
  ++ pair supplyO [drawMv 2 3 5] (remainingMv 4 4 3)

/-- The supply's other paths. -/
def supplyScenarios : List Scenario :=
  [ -- a supply admitting only what fits: drawn out, then an overdraw refused
    ⟨supplyO, [drawMv 2 1 3, drawMv 3 2 2], 9⟩,
    ⟨supplyO, [drawMv 2 1 3, drawMv 3 2 3], 9⟩,
    ⟨supplyO, [drawMv 2 1 3, drawMv 3 2 2, drawMv 4 3 1], 9⟩,
    -- a supply admitting while any is left: the last draw overdraws, the next is refused
    ⟨supplyOpen, [drawMv 2 1 4, drawMv 3 2 4, drawMv 4 3 1], 9⟩,
    ⟨supplyOpen, [drawMv 2 1 5, drawMv 3 2 1], 9⟩,
    -- a supply lapses: a draw at the lapse stands, one after it is refused
    ⟨supplyO, [drawMv 2 100 2, drawMv 3 101 1], 150⟩,
    -- returns: what a player holds, and no more
    ⟨supplyO, [drawMv 2 1 3, returnMv 2 2 1, returnMv 2 3 3, returnMv 3 4 1], 9⟩,
    ⟨supplyO, [drawMv 2 1 3, returnMv 2 2 3], 9⟩,
    ⟨supplyO, [drawMv 2 1 5, returnMv 2 3 2], 9⟩,
    ⟨supplyO, [drawMv 2 1 5, returnMv 2 2 5, drawMv 3 3 5], 9⟩,
    -- the supplier's side never draws or returns
    ⟨supplyO, [drawMv 1 1 1, returnMv 1 2 1], 9⟩,
    -- a draw of nothing is refused
    ⟨supplyO, [drawMv 2 1 0, drawMv 2 2 1], 9⟩,
    -- the supplier's reading replaces the floor, and counts what is drawn after it
    ⟨supplyO, [remainingMv 3 2 2, drawMv 2 1 3, drawMv 3 4 2, drawMv 4 5 1], 9⟩,
    ⟨supplyO, [remainingMv 3 2 2, remainingMv 6 5 4, drawMv 2 7 4, drawMv 3 8 1], 9⟩,
    -- a reading restates a supply that was drawn out
    ⟨supplyO, [drawMv 2 1 5, remainingMv 3 2 4, drawMv 3 4 4, drawMv 4 5 1], 9⟩,
    -- another player's reading bears on nothing
    ⟨supplyO, [{ remainingMv 1 1 0 with player := 5 }, drawMv 2 2 5], 9⟩,
    -- a reading of another measure is not one, and is refused
    ⟨supplyO, [{ remainingMv 1 1 0 with measure := 1 }, drawMv 2 2 5], 9⟩,
    -- a value is read once it has held, never ahead of it
    ⟨supplyO, [remainingMv 3 7 0, drawMv 2 4 5], 9⟩,
    -- readings of one time that disagree give the least
    ⟨supplyO, [remainingMv 3 2 4, remainingMv 4 2 1, drawMv 2 5 2], 9⟩,
    ⟨supplyO, [remainingMv 3 2 4, remainingMv 4 2 1, drawMv 2 5 1], 9⟩,
    -- a reading of a later time takes over from an earlier one
    ⟨supplyO, [remainingMv 3 2 1, remainingMv 4 3 4, drawMv 2 5 4], 9⟩,
    -- a supply withdrawn or superseded closes to draws and returns; readings still stand
    ⟨supplyO, [drawMv 2 1 2, mv .withdraw 1 2, drawMv 3 3 1, returnMv 2 4 1, remainingMv 5 4 0], 9⟩,
    ⟨supplyO, [drawMv 2 1 2, mv .supersede 1 2, drawMv 3 3 1], 9⟩,
    ⟨supplyO, [mv .withdraw 2 1, mv .withdraw 1 2], 9⟩,
    -- no other act answers a supply
    ⟨supplyO, [mv .promise 2 1, mv .hold 2 2, mv .adopt 2 3, mv .attach 2 4, drawMv 2 5 1], 9⟩ ]

/-- Every scenario. -/
def scenarios : List Scenario := witnessScenarios ++ lawScenarios ++ supplyWitnessScenarios ++ supplyScenarios

/-- The arrival orders a history is given in: as written, reversed, and the last move first. -/
def arrivals (l : List Move) : List (List Move) :=
  let orders := [l, l.reverse, (l.getLast?.toList ++ l.dropLast)]
  orders.foldl (fun acc o => if acc.contains o then acc else acc ++ [o]) []

/-! ## Rows -/

/-- The response and telling tables on every kind and act. -/
def tableRows : List Row :=
  (Kind.all.flatMap fun k => Act.all.map fun a =>
    row ``ObsmetrologiaComputing.WorkArena.answers [named k, named a] (.bool (answers k a)))
  ++ (Kind.all.flatMap fun k => Act.all.map fun a =>
    row ``ObsmetrologiaComputing.WorkArena.told [named k, named a] (.bool (told k a)))

/-- The board of every scenario, in each of its arrival orders. -/
def boardRows : List Row :=
  scenarios.flatMap fun s => (arrivals s.moves).map fun l =>
    row ``ObsmetrologiaComputing.WorkArena.board [opening s.opening, .arr (l.map move), .nat s.readAt]
      (outcome (board s.opening l s.readAt))

/-- The golden vectors of the work arena. -/
def rows : List Row := tableRows ++ boardRows

end ObsmetrologiaConformance.WorkArena
