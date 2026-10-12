import Obsmetrologia.Language.Positing.Four
import Obsmetrologia.Language.Positing.Record
import Obsmetrologia.Language.Positing.Evidence
import ObsmetrologiaConformance.Row

/-!
# FourBilattice — golden vectors for the evidence bilattice, as evidence bits

The same specification as `Four`, with the encoding an on-chain implementation holds: a reading is
the pair `[pos, neg]` of its two evidence bits (`Reading.pos`, `Reading.neg`; told-for, told-against),
never a name. The tables are complete:

* `Reading` over the four points: the four bounds, `joinK`, `meetK`, `joinT`, `meetT` and the two orders
  on all sixteen ordered pairs, and the Klein four-group `negate`, `conflate`, `negConf`;
* `Record` (the counting carrier) over tallies `0, 1, 2`: the four lattice operations, the merge `add`,
  the two orders, the readout `reading` and the contradiction mass `topMass`;
* `Valued` (the lossless carrier) over the four measured states, the first operand witnessed by tokens
  `a` (for) and `b` (against), the second by `c` and `d`: the four operations, `negate`, `conflate` and
  `presumeFree`. A token list is the evidence as it is carried; two lists are the same evidence when
  they have the same members.
-/

namespace ObsmetrologiaConformance.FourBilattice

open Obsmetrologia

/-- A reading as its evidence bits `[pos, neg]`. -/
def bits (c : Reading) : Json := .arr [.bool c.pos, .bool c.neg]

/-- Every point. -/
def points : List Reading := Articulating.Corner.all

/-- Every ordered pair of points. -/
def pairs : List (Reading × Reading) := points.flatMap fun a => points.map (a, ·)

def constant (op : Lean.Name) (c : Reading) : List Row := [row op [] (bits c)]

def unary (op : Lean.Name) (f : Reading → Reading) : List Row :=
  points.map fun a => row op [bits a] (bits (f a))

def binary (op : Lean.Name) (f : Reading → Reading → Reading) : List Row :=
  pairs.map fun (a, b) => row op [bits a, bits b] (bits (f a b))

def relation (op : Lean.Name) (f : Reading → Reading → Bool) : List Row :=
  pairs.map fun (a, b) => row op [bits a, bits b] (.bool (f a b))

/-- The rows of `Reading`. -/
def readingRows : List Row :=
  constant ``Reading.kBot Reading.kBot
  ++ constant ``Reading.kTop Reading.kTop
  ++ constant ``Reading.tTop Reading.tTop
  ++ constant ``Reading.tBot Reading.tBot
  ++ binary ``Reading.joinK Reading.joinK
  ++ binary ``Reading.meetK Reading.meetK
  ++ binary ``Reading.joinT Reading.joinT
  ++ binary ``Reading.meetT Reading.meetT
  ++ relation ``Reading.leK Reading.leK
  ++ relation ``Reading.leT Reading.leT
  ++ unary ``Reading.negate Reading.negate
  ++ unary ``Reading.conflate Reading.conflate
  ++ unary ``Reading.negConf Reading.negConf

/-! ## Record -/

def tallies : List Nat := [0, 1, 2]

def records : List Record := tallies.flatMap fun p => tallies.map fun n => ⟨p, n⟩

/-- A record as its tallies `[pos, neg]`. -/
def tally (r : Record) : Json := .arr [.nat r.pos, .nat r.neg]

def recordBinary (op : Lean.Name) (f : Record → Record → Record) : List Row :=
  records.flatMap fun a => records.map fun b => row op [tally a, tally b] (tally (f a b))

def recordRelation (op : Lean.Name) (f : Record → Record → Bool) : List Row :=
  records.flatMap fun a => records.map fun b => row op [tally a, tally b] (.bool (f a b))

/-- The rows of `Record`. -/
def recordRows : List Row :=
  recordBinary ``Record.joinK Record.joinK
  ++ recordBinary ``Record.meetK Record.meetK
  ++ recordBinary ``Record.joinT Record.joinT
  ++ recordBinary ``Record.meetT Record.meetT
  ++ recordBinary ``Record.add Record.add
  ++ recordRelation ``Record.leK Record.leK
  ++ recordRelation ``Record.leT Record.leT
  ++ records.map (fun r => row ``Record.reading [tally r] (bits (Record.reading r)))
  ++ records.map (fun r => row ``Record.topMass [tally r] (.nat (Record.topMass r)))

/-! ## Valued -/

/-- The token named `s`. -/
def tok (s : String) : Token := ⟨⟨s⟩⟩

/-- The measured state with bits `p`, `n`, witnessed by `f` for and `g` against. -/
def measured (f g : String) (p n : Bool) : Valued :=
  ⟨Reading.ofSlots p n, ((if p then [tok f] else []), (if n then [tok g] else []))⟩

def surfaces (l : Slot) : Json := .arr (l.map fun t => .str t.mark.surface)

/-- A valued as `{ value, for, against }`. -/
def valued (x : Valued) : Json :=
  .obj [("value", bits x.value), ("for", surfaces x.evidence.1), ("against", surfaces x.evidence.2)]

def lefts : List Valued :=
  [measured "a" "b" false false, measured "a" "b" true false,
   measured "a" "b" false true, measured "a" "b" true true]

def rights : List Valued :=
  [measured "c" "d" false false, measured "c" "d" true false,
   measured "c" "d" false true, measured "c" "d" true true]

def valuedBinary (op : Lean.Name) (f : Valued → Valued → Valued) : List Row :=
  lefts.flatMap fun x => rights.map fun y => row op [valued x, valued y] (valued (f x y))

def valuedUnary (op : Lean.Name) (f : Valued → Valued) : List Row :=
  lefts.map fun x => row op [valued x] (valued (f x))

/-- The rows of `Valued`. -/
def valuedRows : List Row :=
  valuedBinary ``Valued.joinK Valued.joinK
  ++ valuedBinary ``Valued.meetK Valued.meetK
  ++ valuedBinary ``Valued.joinT Valued.joinT
  ++ valuedBinary ``Valued.meetT Valued.meetT
  ++ valuedUnary ``Valued.negate Valued.negate
  ++ valuedUnary ``Valued.conflate Valued.conflate
  ++ valuedUnary ``Valued.presumeFree Valued.presumeFree

/-- The golden vectors of the evidence bilattice. -/
def rows : List Row := readingRows ++ recordRows ++ valuedRows

end ObsmetrologiaConformance.FourBilattice
