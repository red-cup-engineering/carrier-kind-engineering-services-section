import ObsmetrologiaConformance.Band

/-- Write the band regime's golden vectors as JSONL, read off the specification revision named
by the one argument. Run with `lake env lean --run BandMain.lean <specification-address>`. -/
def main (args : List String) : IO Unit := do
  match args with
  | [t] =>
    for r in ObsmetrologiaConformance.Band.rows do
      IO.println (r.render t)
  | _ => throw <| IO.userError "usage: lean --run BandMain.lean <specification-address>"
