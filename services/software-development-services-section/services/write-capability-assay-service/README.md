# write-capability-assay-service

Checks one finite write-authorization bundle — office identity, scope, dispatch, digests — without touching any filesystem. Use when an office must prove it may write before writing.

Reseated 2026-07-30 from `board-of-directors/services/executive-office/services/leader-movement-team/services/standing-write-capability-assay-service` (zero registry dependents verified before the move) and renamed from `standing-write-capability-assay-service` to drop the "standing" qualifier from the display name.

## Legacy identifiers kept for wire compatibility

The rename touched display strings only (package name, agent-card `name`/`organization`, systemd unit description). The following identifiers are unchanged on purpose, because changing them would break wire/content-addressed compatibility with anything that already observed them:

- RMN protocol type ids in `src/protocol.mjs`: `org.emsenn.standing-write-capability-assay.request.v1` and `org.emsenn.standing-write-capability-assay.response.v1`.
- The RML law contract `content/contracts/assay-standing-write-capability.rml` (byte-for-byte identical to the pre-move file; its `ni:///sha-256;...` content digest is referenced from the agent card).
- The actor URN `urn:ame:standing-write-capability-assay-service` (RML `provider` field and `content/evm/accounts/eip155-31337.json`).
- The agent-card skill id `assay-standing-write-capability`.
- The Ed25519 signing key id `standing-write-capability-assay-service-2026-07-21` (`content/agent-card-signing/jwks.json`, `data/agent-card-signing/ed25519-private.pem`, and the systemd unit's `AGENT_CARD_SIGNING_KID`).

Any future full protocol-version bump can retire these; until then, treat them as legacy ids rather than an inconsistency.
