import ObsmetrologiaConformance.SenLambda

/-- Write the golden vectors of SEN's λ fragment as JSONL, read off the specification revision
named by the one argument. Run with `lake env lean --run SenLambdaMain.lean <specification-address>`. -/
def main (args : List String) : IO Unit := do
  match args with
  | [t] =>
    for r in ObsmetrologiaConformance.SenLambda.rows do
      IO.println (r.render t)
  | _ => throw <| IO.userError "usage: lean --run SenLambdaMain.lean <specification-address>"
