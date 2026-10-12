import ObsmetrologiaConformance.PoolSplit

/-- Write the golden vectors of `PoolSplit` as JSONL, read off the specification revision named
by the one argument. Run with `lake env lean --run PoolSplitMain.lean <specification-address>`. -/
def main (args : List String) : IO Unit := do
  match args with
  | [t] =>
    for r in ObsmetrologiaConformance.PoolSplit.rows do
      IO.println (r.render t)
  | _ => throw <| IO.userError "usage: lean --run PoolSplitMain.lean <specification-address>"
