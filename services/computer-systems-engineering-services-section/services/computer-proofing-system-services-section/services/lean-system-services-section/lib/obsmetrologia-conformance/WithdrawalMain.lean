import ObsmetrologiaConformance.Withdrawal

/-- Write the golden vectors of `Withdrawal` as JSONL, read off the specification revision named
by the one argument. Run with `lake env lean --run WithdrawalMain.lean <specification-address>`. -/
def main (args : List String) : IO Unit := do
  match args with
  | [t] =>
    for r in ObsmetrologiaConformance.Withdrawal.rows do
      IO.println (r.render t)
  | _ => throw <| IO.userError "usage: lean --run WithdrawalMain.lean <specification-address>"
