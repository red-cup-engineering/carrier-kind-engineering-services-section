# Rule witness versions

SignChain rules have labels, positive knowledge thresholds, and a consequent
cell/reading. Labels need not be unique. The finite SignCraft closure keeps one
stable derivation witness per rule; canonical evidence sets absorb repeat firing.

## New records

New SignChain derivations retain `rule` (the label) and `from` (ordered premise
addresses), and add `ruleId`, the existing `semanticId` of the complete rule
record. Thus different thresholds, conclusions, and evidence lanes remain
identifiable even when their label and premise addresses coincide. Canonically
coincident rules still produce coincident witnesses. This is content identity,
not logical equivalence, issuer authentication, or a signature.

New SignCraft settlements carry `derivationVersion: 2`. Admission replays the
existing closure engine with that witness version and compares the complete
stage valuations. Substituting a different fired rule cannot preserve the
original version-2 valuation merely by keeping its label and premise addresses.

This is a witness wire-format change. Direct `derivation`, `fireRule`,
`fireRuleIn`, `fire`, and `step` calls now produce version-2 witnesses by default.
Their label and premise fields remain available to existing display consumers,
but serialized witnesses and their content addresses change. Callers that persist
or compare complete witness records must retain their original version context.

## Historical records

An absent own `derivationVersion` field means the original version 1; inherited
properties do not select a wire format. An explicit value of 1 also selects that
historical law; own values other than numeric 1 or 2, including `undefined`, are refused.
Version 1 continues to emit only `rule` and `from`. Its admission law therefore
cannot distinguish every same-label license. Replaying a historical record does
not retroactively give it version-2 provenance or new authority.

Historical witnesses are never rewritten or replaced. Relating a historical
settlement to new work retains its existing witnesses in the new seed; new rule
firing may add a version-2 witness alongside the legacy witness. The resulting
settlement is version 2 and replays from that preserved seed. Admission does not
independently certify the origin or authority of seed evidence in either version.

The marker selects a replay law; it is not an authentication mechanism. Removing
or downgrading it on a version-2 record with new derived witnesses fails replay.
A record whose orbit adds no witnesses can satisfy both laws, but changing or
removing the marker still changes the complete settlement's semantic content
identity. Explicitly trusted issuance or authority remains a separate concern.

## Scope and checks

The regression fixture is an admitted, unversioned settlement captured with the
original implementation at Computer PR31 head
`5497ea03c1ec2986dcace21d2ab90c7f84ebc491`, using genuine provider sources. Its
witnesses remain unchanged. Tests cover license collisions, repeat firing,
canonical duplicates, substitution, historical replay, mixed-version evidence,
and malformed versions. Neither this change nor these tests assert general
execution-history commutation, transfinite closure, or authenticated execution.

The `infer` / `derive` / `witnessChain` consumer keeps `ruleId` on each selected
derived proof node, including counter-witness nodes. Given facts retain their
original unlicensed shape. The JSON verdict CLI forwards this same result;
serialization does not strip the rule identity. This remains a selected witness
DAG, not an enumeration of every alternate proof.
