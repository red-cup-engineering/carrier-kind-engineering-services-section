import ObsmetrologiaConformance.FourBilattice

/-- Write the golden vectors of `FourBilattice` as JSONL, read off the specification revision named
by the one argument. Run with `lake env lean --run FourBilatticeMain.lean <specification-address>`. -/
def main (args : List String) : IO Unit := do
  match args with
  | [t] =>
    for r in ObsmetrologiaConformance.FourBilattice.rows do
      IO.println (r.render t)
  | _ => throw <| IO.userError "usage: lean --run FourBilatticeMain.lean <specification-address>"
