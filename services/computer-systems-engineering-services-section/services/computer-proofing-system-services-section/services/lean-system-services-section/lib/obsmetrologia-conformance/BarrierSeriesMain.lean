import ObsmetrologiaConformance.BarrierSeries

/-- Write the golden vectors of `BarrierSeries` as JSONL, read off the specification revision named
by the one argument. Run with `lake env lean --run BarrierSeriesMain.lean <specification-address>`. -/
def main (args : List String) : IO Unit := do
  match args with
  | [t] =>
    for r in ObsmetrologiaConformance.BarrierSeries.rows do
      IO.println (r.render t)
  | _ => throw <| IO.userError "usage: lean --run BarrierSeriesMain.lean <specification-address>"
