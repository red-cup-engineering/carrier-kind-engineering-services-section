import ObsmetrologiaComputing.ProviderAttestation
import ObsmetrologiaConformance.Four

/-!
# ProviderAttestation — golden vectors for the attestation record

Every row is `ObsmetrologiaComputing.attestationRecord` applied to a partition of
providers' observations by attested state, given as its class sizes: every list of up
to three classes, each attested one to three times. An implementation reads the
record off the same sizes; the reading of that record is judged by `Four`'s rows of
`Record.reading`.
-/

namespace ObsmetrologiaConformance.ProviderAttestation

open ObsmetrologiaConformance.Four

/-- The sizes a class ranges over: a class is attested at least once. -/
def sizes : List Nat := [1, 2, 3]

/-- Every partition of up to three classes, as its class sizes. -/
def partitions : List (List Nat) :=
  [0, 1, 2, 3].flatMap fun k =>
    (List.range k).foldl (fun acc _ => acc.flatMap fun cs => sizes.map (cs ++ [·])) [[]]

/-- The golden vectors of the attestation record. -/
def rows : List Row :=
  partitions.map fun cs =>
    row ``ObsmetrologiaComputing.attestationRecord [.arr (cs.map .nat)]
      (record (ObsmetrologiaComputing.attestationRecord cs))

end ObsmetrologiaConformance.ProviderAttestation
