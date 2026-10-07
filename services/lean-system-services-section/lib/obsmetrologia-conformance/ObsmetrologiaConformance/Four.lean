import Obsmetrologia.Language.Positing.Four
import Obsmetrologia.Language.Positing.Record
import Obsmetrologia.Calculus.Logic.TwistProductResiduation
import Obsmetrologia.Language.Positing.Bigraded
import Obsmetrologia.Language.Positing.FiberAlgebra
import ObsmetrologiaConformance.Row

/-!
# Four — golden vectors for FOUR, the bilattice of readings

Every row is computed by the specification's own definition, applied to every point
(or pair of points) of `Reading = Articulating.Corner`:

* the bijection with `Bool × Bool` (`Articulating.Corner.toStatus`), which fixes the
  side order an implementation names its points in;
* the four bounds, the knowledge and truth joins and meets, and the two orders;
* the Klein four-group's three involutions (`negate`, `conflate`, `negConf`);
* the twist product over `Two`, whose fusion, residual and unit make FOUR a
  residuated lattice in the truth order, named through `FOUR.readingBij`;
* the knowledge-order implication `Reading.impK` and the truth-order Heyting implication
  `FiberAlgebra.Reading.impT`;
* the evidence tallies (`Record`) under the four lattice operations and the merge,
  their reading and their contradiction mass, over tallies `0, 1, 2`.

A point is named by its `Corner` constructor, read off the derived `Repr`, so this
module states no point names of its own.
-/

namespace ObsmetrologiaConformance.Four

open Obsmetrologia

/-- A point's name: its `Articulating.Corner` constructor. -/
def name (c : Reading) : String := ((reprStr c).splitOn ".").getLast!

/-- A point as JSON. -/
def point (c : Reading) : Json := .str (name c)

/-- Every point. -/
def points : List Reading := Articulating.Corner.all

/-- Every ordered pair of points. -/
def pairs : List (Reading × Reading) := points.flatMap fun a => points.map (a, ·)

/-- A named point of the specification. -/
def constant (op : Lean.Name) (c : Reading) : List Row := [row op [] (point c)]

/-- A unary operation on every point. -/
def unary (op : Lean.Name) (f : Reading → Reading) : List Row :=
  points.map fun a => row op [point a] (point (f a))

/-- A binary operation on every pair. -/
def binary (op : Lean.Name) (f : Reading → Reading → Reading) : List Row :=
  pairs.map fun (a, b) => row op [point a, point b] (point (f a b))

/-- An order on every pair. -/
def relation (op : Lean.Name) (f : Reading → Reading → Bool) : List Row :=
  pairs.map fun (a, b) => row op [point a, point b] (.bool (f a b))

/-- The sides `(for told, against told)` of every point. -/
def sides : List Row :=
  points.map fun a => row ``Articulating.Corner.toStatus [point a]
    (.arr [.bool a.toStatus.1, .bool a.toStatus.2])

/-- A twist-product operation over `Two`, its operands and result named through
`FOUR.readingBij`. -/
def twist (op : Lean.Name) (f : Order.FOUR → Order.FOUR → Order.FOUR) : List Row :=
  pairs.map fun (a, b) => row op [point a, point b]
    (point (Order.FOUR.toReading (f (Order.FOUR.ofReading a) (Order.FOUR.ofReading b))))

/-- The tallies the record rows range over. -/
def tallies : List Nat := [0, 1, 2]

/-- Every record with both tallies in `tallies`. -/
def records : List Record := tallies.flatMap fun p => tallies.map fun n => ⟨p, n⟩

/-- A record as JSON. -/
def record (r : Record) : Json := .obj [("pos", .nat r.pos), ("neg", .nat r.neg)]

/-- A record function on every record, its result as JSON by `out`. -/
def recordUnary {α : Type} (op : Lean.Name) (f : Record → α) (out : α → Json) : List Row :=
  records.map fun r => row op [record r] (out (f r))

/-- A binary record operation on every pair of records. -/
def recordBinary (op : Lean.Name) (f : Record → Record → Record) : List Row :=
  records.flatMap fun a => records.map fun b => row op [record a, record b] (record (f a b))

/-- The golden vectors of FOUR. -/
def rows : List Row :=
  sides
  ++ constant ``Reading.kBot Reading.kBot
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
  ++ binary ``Reading.impK Reading.impK
  ++ binary ``Positing.FiberAlgebra.Reading.impT Positing.FiberAlgebra.Reading.impT
  ++ twist ``Order.TwistProduct.fuse (Order.TwistProduct.fuse (R := Order.Two))
  ++ twist ``Order.TwistProduct.imp (Order.TwistProduct.imp (R := Order.Two))
  ++ constant ``Order.TwistProduct.one (Order.FOUR.toReading (Order.TwistProduct.one (R := Order.Two)))
  ++ recordBinary ``Record.joinK Record.joinK
  ++ recordBinary ``Record.meetK Record.meetK
  ++ recordBinary ``Record.joinT Record.joinT
  ++ recordBinary ``Record.meetT Record.meetT
  ++ recordBinary ``Record.add Record.add
  ++ recordUnary ``Record.reading Record.reading point
  ++ recordUnary ``Record.topMass Record.topMass .nat

end ObsmetrologiaConformance.Four
