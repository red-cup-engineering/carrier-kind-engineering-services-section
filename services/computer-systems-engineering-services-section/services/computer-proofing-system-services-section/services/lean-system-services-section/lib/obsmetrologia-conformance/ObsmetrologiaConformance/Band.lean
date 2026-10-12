import ObsmetrologiaComputing.Band
import ObsmetrologiaConformance.Four

/-!
# Band — golden vectors for the band regime

Every row is computed by `ObsmetrologiaComputing.Band`'s definitions:

* `members` and `memberReading` — membership as the least fixpoint of recognition by
  recognized members (`members_iff`), and each candidate's standing in FOUR;
* `headStanding` — the knowledge-meet of the members' recognition cells;
* `councilClose` — the knowledge-join of the engaged members' readings, read as consensus,
  contested or unresolved (silence never blocks; withdrawal settles);
* `fission` — a subset withdraws together and founds its own band;
* `confederate` and `councilCost` — glued or obstructed, and what a council pays.

Agents are numbers. A reading is named as `Four` names a point. Told cells are pairs
`[by, of]`.
-/

namespace ObsmetrologiaConformance.Band

open Obsmetrologia
open ObsmetrologiaComputing.Band
open ObsmetrologiaConformance.Four (point)

/-- Agents as JSON. -/
def agents (l : List Agent) : Json := .arr (l.map .nat)

/-- Told pairs as JSON. -/
def pairsJson (l : List (Agent × Agent)) : Json := .arr (l.map fun (a, b) => .arr [.nat a, .nat b])

/-- What a band is told, as JSON. -/
def told (t : Told) : Json :=
  .obj [("recognitions", pairsJson t.recognitions), ("denials", pairsJson t.denials), ("withdrawn", agents t.withdrawn)]

/-- Head recognitions as JSON. -/
def headTold (ht : HeadTold) : Json := .obj [("recognizes", pairsJson ht.recognizes), ("denies", pairsJson ht.denies)]

/-- Engaged members' readings as JSON. -/
def engagedJson (e : List (Agent × Reading)) : Json := .arr (e.map fun (a, r) => .arr [.nat a, point r])

/-- A council close as JSON. -/
def close : Close → Json
  | .consensus s => .obj [("close", .str "consensus"), ("side", .bool s)]
  | .contested => .obj [("close", .str "contested")]
  | .unresolved => .obj [("close", .str "unresolved")]

/-- A fission as JSON. -/
def fissionJson (f : Fission) : Json :=
  .obj [("parent", agents f.parent), ("child", agents f.child), ("campsWith", .bool f.campsWith)]

/-- A confederacy as JSON. -/
def confederacy : Confederacy → Json
  | .glued r => .obj [("glued", point r)]
  | .obstructed ps => .obj [("obstructed", pairsJson ps)]

/-! ## Scenarios -/

/-- Bands: founders and what they were told. -/
def bands : List (List Agent × Told) :=
  [ ([1], {}),
    ([1], { recognitions := [(1, 2), (2, 3)] }),
    ([1], { recognitions := [(1, 2), (2, 3)], withdrawn := [2] }),
    ([1], { recognitions := [(2, 3), (1, 2)], withdrawn := [1] }),
    ([1, 4], { recognitions := [(1, 2), (4, 5), (5, 6)] }),
    ([1], { recognitions := [(1, 2), (2, 1), (2, 3), (3, 3)], denials := [(1, 3)] }),
    ([1], { recognitions := [(9, 2)], denials := [(1, 2)] }),
    ([1], { recognitions := [(1, 2), (2, 3), (3, 4), (4, 5)], withdrawn := [9] }),
    ([], { recognitions := [(1, 2)] }),
    ([1, 2], { recognitions := [(1, 3), (2, 3), (3, 4)], denials := [(2, 4), (5, 1)], withdrawn := [4] }) ]

/-- Head scenarios: members, head recognitions, head. -/
def heads : List (List Agent × HeadTold × Agent) :=
  [ ([1, 2, 3], { recognizes := [(1, 1), (2, 1), (3, 1)] }, 1),
    ([1, 2, 3], { recognizes := [(1, 1), (2, 1)] }, 1),
    ([1, 2, 3], { recognizes := [(1, 1), (2, 1), (3, 1)], denies := [(3, 1)] }, 1),
    ([1, 2], { recognizes := [(1, 2), (2, 2)] }, 2),
    ([], { recognizes := [(1, 1)] }, 1),
    ([1, 2], { denies := [(1, 2), (2, 2)] }, 2),
    ([1], { recognizes := [(1, 1)], denies := [(1, 1)] }, 1) ]

/-- The four readings. -/
def readings : List Reading := [Reading.kBot, Reading.tTop, Reading.tBot, Reading.kTop]

/-- Councils: every engaged list of up to three members over the four readings, with no one
withdrawn, the first withdrawn, and the against-side withdrawn. -/
def councils : List (List (Agent × Reading) × List Agent) :=
  let lists : List (List (Agent × Reading)) :=
    [[]] ++ (readings.map fun r => [(1, r)]) ++
    (readings.flatMap fun r => readings.map fun r' => [(1, r), (2, r')]) ++
    (readings.flatMap fun r => readings.flatMap fun r' => readings.map fun r'' => [(1, r), (2, r'), (3, r'')])
  lists.flatMap fun e => [(e, []), (e, [1]), (e, againstSide true e)]

/-- Fissions: founders, what they were told, and who leaves. -/
def fissions : List (List Agent × Told × List Agent) :=
  [ ([1], { recognitions := [(1, 2), (2, 3), (3, 4), (4, 5)] }, [3]),
    ([1], { recognitions := [(1, 2), (2, 3), (1, 3)] }, [2]),
    ([1], { recognitions := [(1, 2), (1, 3), (2, 4), (3, 4)] }, [2]),
    ([1, 2], { recognitions := [(1, 3), (2, 4)] }, [2]),
    ([1], { recognitions := [(1, 2)] }, []),
    ([1], { recognitions := [(1, 2), (2, 3)] }, [1]) ]

/-- Confederacies: band readings. -/
def confederacies : List (List (Agent × Reading)) :=
  [[]] ++ (readings.flatMap fun r => readings.map fun r' => [(1, r), (2, r')]) ++
    [[(1, Reading.tTop), (2, Reading.kBot), (3, Reading.tBot)], [(1, Reading.tTop), (2, Reading.tTop), (3, Reading.tTop)],
     [(1, Reading.kTop)], [(1, Reading.tBot), (2, Reading.kBot), (3, Reading.tBot), (4, Reading.kBot)]]

/-! ## Rows -/

/-- The golden vectors of the band regime. -/
def rows : List Row :=
  (bands.map fun (f, t) => row ``ObsmetrologiaComputing.Band.members [agents f, told t] (agents (members f t)))
  ++ (bands.flatMap fun (f, t) => [1, 2, 3, 4, 5, 6].map fun b =>
      row ``ObsmetrologiaComputing.Band.memberReading [agents f, told t, .nat b] (point (memberReading f t b)))
  ++ (heads.map fun (ms, ht, h) =>
      row ``ObsmetrologiaComputing.Band.headStanding [agents ms, headTold ht, .nat h] (point (headStanding ms ht h)))
  ++ (councils.map fun (e, w) =>
      row ``ObsmetrologiaComputing.Band.councilClose [engagedJson e, agents w] (close (councilClose e w)))
  ++ (fissions.map fun (f, t, sub) =>
      row ``ObsmetrologiaComputing.Band.fission [agents f, told t, agents sub] (fissionJson (fission f t sub)))
  ++ (confederacies.map fun rs => row ``ObsmetrologiaComputing.Band.confederate [engagedJson rs] (confederacy (confederate rs)))
  ++ (confederacies.map fun rs => row ``ObsmetrologiaComputing.Band.councilCost [engagedJson rs] (.nat (councilCost rs)))

end ObsmetrologiaConformance.Band
