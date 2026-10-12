import ObsmetrologiaConformance.AllocationSolver

/-- Write the golden vectors of `AllocationSolver` as JSONL, read off the specification revision named
by the one argument. Run with `lake env lean --run AllocationSolverMain.lean <specification-address>`. -/
def main (args : List String) : IO Unit := do
  match args with
  | [t] =>
    for r in ObsmetrologiaConformance.AllocationSolver.rows do
      IO.println (r.render t)
  | _ => throw <| IO.userError "usage: lean --run AllocationSolverMain.lean <specification-address>"
