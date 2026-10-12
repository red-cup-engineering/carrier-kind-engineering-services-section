import ObsmetrologiaConformance.Four
import ObsmetrologiaConformance.ProviderAttestation

/-- Write the golden vectors of FOUR and the attestation record as JSONL, read off the specification revision named by
the one argument. Run with `lake env lean --run Main.lean <specification-address>`. -/
def main (args : List String) : IO Unit := do
  match args with
  | [t] =>
    for r in ObsmetrologiaConformance.Four.rows ++ ObsmetrologiaConformance.ProviderAttestation.rows do
      IO.println (r.render t)
  | _ => throw <| IO.userError "usage: lean --run Main.lean <specification-address>"
