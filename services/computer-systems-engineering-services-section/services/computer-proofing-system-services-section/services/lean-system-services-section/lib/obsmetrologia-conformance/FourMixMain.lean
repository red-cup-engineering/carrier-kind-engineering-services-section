import ObsmetrologiaConformance.FourMix

/-- Write the golden vectors of `FourMix` as JSONL, read off the specification revision named
by the one argument. Run with `lake env lean --run FourMixMain.lean <specification-address>`. -/
def main (args : List String) : IO Unit := do
  match args with
  | [t] =>
    for r in ObsmetrologiaConformance.FourMix.rows do
      IO.println (r.render t)
  | _ => throw <| IO.userError "usage: lean --run FourMixMain.lean <specification-address>"
