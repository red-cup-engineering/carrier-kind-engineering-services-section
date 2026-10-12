import ObsmetrologiaConformance.WorkArena

/-- Write the work arena's golden vectors as JSONL, read off the specification revision named
by the one argument. Run with `lake env lean --run WorkArenaMain.lean <specification-address>`. -/
def main (args : List String) : IO Unit := do
  match args with
  | [t] =>
    for r in ObsmetrologiaConformance.WorkArena.rows do
      IO.println (r.render t)
  | _ => throw <| IO.userError "usage: lean --run WorkArenaMain.lean <specification-address>"
