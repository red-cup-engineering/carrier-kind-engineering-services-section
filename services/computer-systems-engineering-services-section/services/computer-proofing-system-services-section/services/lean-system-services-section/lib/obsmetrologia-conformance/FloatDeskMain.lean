import ObsmetrologiaConformance.FloatDesk

/-- Write the golden vectors of `FloatDesk` as JSONL, read off the specification revision named
by the one argument. Run with `lake env lean --run FloatDeskMain.lean <specification-address>`. -/
def main (args : List String) : IO Unit := do
  match args with
  | [t] =>
    for r in ObsmetrologiaConformance.FloatDesk.rows do
      IO.println (r.render t)
  | _ => throw <| IO.userError "usage: lean --run FloatDeskMain.lean <specification-address>"
