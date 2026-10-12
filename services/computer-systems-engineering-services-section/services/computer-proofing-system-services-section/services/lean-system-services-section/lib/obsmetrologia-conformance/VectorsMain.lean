import ObsmetrologiaConformance.FourBilattice
import ObsmetrologiaConformance.FourMix
import ObsmetrologiaConformance.PoolSplit
import ObsmetrologiaConformance.AllocationSolver
import ObsmetrologiaConformance.BarrierSeries
import ObsmetrologiaConformance.Withdrawal
import ObsmetrologiaConformance.MeetPay
import ObsmetrologiaConformance.Sleeve
import ObsmetrologiaConformance.TallyCredit
import ObsmetrologiaConformance.FloatDesk

/-!
Write the plain JSON projection of the golden vectors, for test harnesses that parse JSON and do not
read the JSONL contract (Foundry's `vm.parseJson`). One file per specification operation, under
`<out>/<group>/<op>.json`, shaped

    {"suite": …, "declaration": <the Lean declaration the rows were read off>,
     "cases": [{"op": …, "args": […], "result": …}, …]}

Run with `lake env lean --run VectorsMain.lean <out-directory>`.
-/

open ObsmetrologiaConformance

/-- The text of a projected file: one case per line. -/
def render (suite : String) (declaration : String) (rows : List Row) : String :=
  let cases := rows.map fun r =>
    match r.v with
    | .obj [("args", args), ("result", result)] =>
      Json.render (.obj [("op", .str (declaration.splitOn "." |>.getLast!)), ("args", args), ("result", result)])
    | v => Json.render v
  "{\"suite\":" ++ quote suite ++ ",\"declaration\":" ++ quote declaration ++ ",\"cases\":[\n  "
    ++ ",\n  ".intercalate cases ++ "\n]}\n"

/-- The distinct declarations among rows, in first-seen order. -/
def declarations (rows : List Row) : List String :=
  rows.foldl (fun acc r => if acc.contains r.a then acc else acc ++ [r.a]) []

def writeGroup (out : System.FilePath) (suite group : String) (rows : List Row) : IO Nat := do
  IO.FS.createDirAll (out / group)
  let mut n := 0
  for d in declarations rows do
    let mine := rows.filter (·.a == d)
    let name := d.splitOn "." |>.getLast!
    IO.FS.writeFile (out / group / s!"{name}.json") (render suite d mine)
    n := n + mine.length
  return n

def main (args : List String) : IO Unit := do
  match args with
  | [dir] =>
    let out : System.FilePath := dir
    let mut total := 0
    total := total + (← writeGroup out "four-bilattice" "four" FourBilattice.readingRows)
    total := total + (← writeGroup out "four-mix" "four" FourMix.rows)
    total := total + (← writeGroup out "four-bilattice" "record" FourBilattice.recordRows)
    total := total + (← writeGroup out "four-bilattice" "valued" FourBilattice.valuedRows)
    total := total + (← writeGroup out "pool-split" "pool" PoolSplit.rows)
    total := total + (← writeGroup out "allocation-solver" "pool" AllocationSolver.rows)
    total := total + (← writeGroup out "withdrawal" "withdrawal" Withdrawal.rows)
    total := total + (← writeGroup out "meetpay" "meetpay" MeetPay.rows)
    total := total + (← writeGroup out "barrier-series" "barrier" BarrierSeries.rows)
    total := total + (← writeGroup out "sleeve" "sleeve" Sleeve.rows)
    total := total + (← writeGroup out "tally-credit" "tally" TallyCredit.rows)
    total := total + (← writeGroup out "float-desk" "desk" FloatDesk.rows)
    IO.println s!"{total} cases"
  | _ => throw <| IO.userError "usage: lean --run VectorsMain.lean <out-directory>"
