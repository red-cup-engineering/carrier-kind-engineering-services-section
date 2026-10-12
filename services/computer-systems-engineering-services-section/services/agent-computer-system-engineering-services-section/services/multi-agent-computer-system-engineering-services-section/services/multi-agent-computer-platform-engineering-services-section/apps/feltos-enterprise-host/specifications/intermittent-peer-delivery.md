# Intermittent peer delivery source receiving

This specification is derived from the addressed source claims and consumer proposals in [the owning source requirement knowledge](../data/records/source-receiving-records/intermittent-peer-delivery.json). That knowledge is not native-admitted. Git blob identities bind observed bytes; the old and new package versions alone establish no compatibility. The four historical SGP formation requirements and the actual PR118/CRG103 proposals supply the receiving purpose. No new office, signature, requirement admission or operating acceptance is asserted.

## Requirements and observable boundaries

1. A host declaration shall admit `presence`, `peerPresences` and the existing peer policy fields through the same installed web contract before any declared factories are imported. A presence declaration describes transport availability and grants no operation or peering authority.
2. An intermittent recipient's addressed activities shall be held in the existing semantic journal rather than pushed. An authenticated actor request keeps the same sender admission, operation identity, payment task, reuse key and recipient throughout the delivery choice.
3. The holding host shall expose held activities only at its own instance actor outbox to a GET verifiably signed by the exact recipient, still declared intermittent. Recipient-bound durable continuation records preserve unsent tails and survive replay and restart.
4. A returning intermittent instance shall pull its existing selected peers through its own actor key custody before its existing catch-up sends work. The original author's origin and the addressee are checked before ordinary arrival admission. Presence grants no standing or execution authority.
5. A peer observation shall retain positive and negative liveness evidence independently. Silence of an intermittent peer stays unknown; refusal remains an answer, and a continuous peer's failure remains a failure.
6. Receiving shall preserve the canonical source's worker world, software development, source custody, enterprise services, actor payment and request reuse. Its hosted execution policy is not replaced by the donor tree.

## High-level design

The host owns transport policy and supplies an optional delivery port to the existing generic actor client. The generic client defaults to its current ActivityPub delivery and retains its native sender, recipient, request and payment admission. The host uses the same held-delivery carrier for actor replies and existing work peer deliveries. Existing declaration, actor, peer and semantic journal owners retain their boundaries. No second orchestration loop, actor, mailbox or deployment wrapper is introduced.

The received `peer-liveness.mjs` and `held-delivery.mjs` capabilities are folded into the host at their existing owning paths. Existing web declaration and host schema are expanded consistently. Catch-up uses current peer authority and native journal receipts; historic flat ledger records remain readable rather than becoming current authority. The existing scheduled operation is preserved; this source change installs or starts no timer.

## Low-level receiving design

- `installed-web.mjs` validates availability and peer policy before importing factories. `instance-config.mjs` resolves canonical actors and retains existing newer process settings.
- `actor-mesh.mjs` supplies the held-delivery port to `createActorClient`. That generic factory's optional port does not select an executor or relax current sender admission.
- `serve-instance.mjs` routes addressed replies and signed held-outbox GETs through the same native ActivityPub provider. Pulled activities reach the original arrival handler, including the newer paid enterprise service boundary.
- `federated-work.mjs` and `work-replication.mjs` retain existing native work admission while applying peer delivery and pull policy. Work authority remains separate from availability.
- `peer-liveness.mjs` retains the received observation contracts and both sides of contested evidence. `held-delivery.mjs` retains recipient-bound semantic continuation custody and the fifty-item bound.

## Qualification

Source review and syntax parsing are permitted. No application modules, tests, health probes, native goals, signing keys, provider acquisition, deployments or schedules are executed. Source delivery, lock qualification, host deployment and independent operating receiving remain distinct outcomes. This specification does not mark SGP118 or CRG103 received merely because their fields are admitted.

