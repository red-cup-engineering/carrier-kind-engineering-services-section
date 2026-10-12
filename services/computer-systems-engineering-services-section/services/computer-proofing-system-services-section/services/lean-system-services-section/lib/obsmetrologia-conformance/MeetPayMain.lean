import ObsmetrologiaConformance.MeetPay

/-- Write the golden vectors of `MeetPay` as JSONL, read off the specification revision named
by the one argument. Run with `lake env lean --run MeetPayMain.lean <specification-address>`. -/
def main (args : List String) : IO Unit := do
  match args with
  | [t] =>
    for r in ObsmetrologiaConformance.MeetPay.rows do
      IO.println (r.render t)
  | _ => throw <| IO.userError "usage: lean --run MeetPayMain.lean <specification-address>"
