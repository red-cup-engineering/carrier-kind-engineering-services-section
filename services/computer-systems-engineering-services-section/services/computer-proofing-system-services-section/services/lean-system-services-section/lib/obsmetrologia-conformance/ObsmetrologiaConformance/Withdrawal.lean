import ObsmetrologiaEconomics.Withdrawal
import ObsmetrologiaConformance.Row

/-!
# Withdrawal — golden vectors for consensus by withdrawal

Read off `ObsmetrologiaEconomics.Withdrawal`: `counts` over the storage list of participations and
`quiesce` over the counters.

A participation is the lower-case string of its constructor (`silent`, `assented`, `objected`,
`withdrawn`); a status list is the array of them, in the fixed order silent, assented, objected,
withdrawn (the counters do not depend on order: `counts_swap`). Counts are decimal strings.

* `counts` ranges over every multiset of up to 6 members: all `(silent, assented, objected, withdrawn)`
  with the four multiplicities summing to at most 6, 210 rows. The result is
  `{"heard", "withdrawn", "objections"}`.
* `quiesce` ranges over every distinct counter triple those multisets reach, at quorums 1 to 4.
  The arguments are `[heard, withdrawn, objections, quorum]`; the result is
  `{"outcome": "consensus" | "escalated" | "adjourned", "execute": bool}` (`execute`: the standing
  formula executes). A Foundry harness reads the object by key.
-/

namespace ObsmetrologiaConformance.Withdrawal

open Obsmetrologia.Economics.Withdrawal

def count (n : Nat) : Json := .str (toString n)

def participationName : Participation → String
  | .silent => "silent"
  | .assented => "assented"
  | .objected => "objected"
  | .withdrawn => "withdrawn"

def outcomeName : Outcome → String
  | .consensus => "consensus"
  | .escalated => "escalated"
  | .adjourned => "adjourned"

def participations (ps : List Participation) : Json := .arr (ps.map fun p => .str (participationName p))

/-- Every multiset of at most `n` members, as the status list sorted silent, assented, objected, withdrawn. -/
def multisets (n : Nat) : List (List Participation) :=
  (List.range (n + 1)).flatMap fun s =>
    (List.range (n + 1 - s)).flatMap fun a =>
      (List.range (n + 1 - s - a)).flatMap fun o =>
        (List.range (n + 1 - s - a - o)).map fun w =>
          List.replicate s .silent ++ List.replicate a .assented ++
            List.replicate o .objected ++ List.replicate w .withdrawn

def multisetsUpToSix : List (List Participation) := multisets 6

def countsRows : List Row :=
  multisetsUpToSix.map fun ps =>
    let c := counts ps
    row ``counts [participations ps]
      (.obj [("heard", count c.1), ("withdrawn", count c.2.1), ("objections", count c.2.2)])

/-- The distinct counter triples the multisets reach, in first-seen order. -/
def triples : List (Nat × Nat × Nat) :=
  multisetsUpToSix.foldl (fun acc ps => if acc.contains (counts ps) then acc else acc ++ [counts ps]) []

def quorums : List Nat := [1, 2, 3, 4]

def quiesceRows : List Row :=
  triples.flatMap fun (h, w, o) =>
    quorums.map fun q =>
      let r := quiesce h w o q
      row ``quiesce [count h, count w, count o, count q]
        (.obj [("outcome", .str (outcomeName r.1)), ("execute", .bool r.2)])

/-- The golden vectors of consensus by withdrawal. -/
def rows : List Row := quiesceRows ++ countsRows

end ObsmetrologiaConformance.Withdrawal
