# Responsive colony reconciliation

Claim: the colony's public entrance remains usable while its admitted resident
work reconciles native work evidence with its peers.

## RSD project

Requirements: the public admission membrane shall remain schedulable during
resident journal reading and arena reconstruction. Peer reconciliation shall
retain receiver-owned standing, the original work edition, per-recipient
acknowledgments and held-delivery custody. A failed transport shall retain its
absence or refusal meaning without acknowledging delivery.

Specification: governed dispatch authorizes `work-peer-catch-up` before its
execution enters the existing resident worker. The worker owns reading, arena
reconstruction, outbound selection, acknowledgments and liveness observations.
The host owns its existing ActivityPub identity, signed transport and arrival
admission. Only an active `work-peer-catch-up` invocation can invoke those three
native transport ports. Every message is bounded at 1,048,576 JSON UTF-8 bytes;
oversized input or result fails without a successful acknowledgment. Full
journals, arenas, dependency graphs, provider objects and keys are not messages.

Design: reuse the resident execution carrier already used by enterprise intake
and execution. Add the peer operation to that finite family and bind its three
ports from the owning running host, never operation input. Known-intermittent
deliveries retain their existing native held journal in the worker. Continuous
deliveries use the host's provider. Pulls remain signed by the instance actor,
restricted to declared peer outboxes and addressed to that actor; independently
admitted arrivals use the unchanged native receiving port.

This addresses the observed startup profile's journal-query → work-board replay
→ peer-catch-up work on the public main thread. It does not diagnose an OAuth
defect, prove all future history is cheap, or replace semantic custody with a
cache. Completed source receiving is distinct from a promoted production
artifact and a completed real user login.

## ASSN project

Architecturalization: move resident peer reconciliation behind the existing
execution boundary and keep public admission and private native transport on
their owning host.

Systematization: the existing supervised execution worker and governed recurring
operation own startup, invocation correlation, failure, shutdown and replay.
There is no second scheduler, daemon, mailbox or receipt inventory.

Standardization: retain ActivityPub++, canonical SEN evidence, native SEAVT
custody, ordinary operation authorization and receiver-owned standing.

Normalization: use one finite resident-operation list, one finite port list,
one message bound and one error representation preserving native transport
status/code/cause. Remove main-thread peer reconstruction from the hosted
operation; direct library receiving remains available for isolated callers.

Receiving must exercise real native journal/arena work concurrently with useful
entrance requests, plus replay, withdrawal, refusal, bounded-message and
shutdown behavior. A simulated CPU load is only boundary qualification, not
qualification of the actual native reconstruction or production recovery.
