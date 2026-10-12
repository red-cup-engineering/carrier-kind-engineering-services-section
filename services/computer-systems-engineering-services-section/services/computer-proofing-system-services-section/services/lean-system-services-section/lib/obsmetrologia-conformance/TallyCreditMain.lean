import ObsmetrologiaConformance.TallyCredit

/-- Write the golden vectors of `TallyCredit` as JSONL, read off the specification revision named
by the one argument. Run with `lake env lean --run TallyCreditMain.lean <specification-address>`. -/
def main (args : List String) : IO Unit := do
  match args with
  | [t] =>
    for r in ObsmetrologiaConformance.TallyCredit.rows do
      IO.println (r.render t)
  | _ => throw <| IO.userError "usage: lean --run TallyCreditMain.lean <specification-address>"
