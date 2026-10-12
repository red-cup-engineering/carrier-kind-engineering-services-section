---
title: ActivityPub Entity Schema and Trust Model
description: Specifies ActivityPub entity schemas with required fields, delivery records, moderation decisions, and bilattice-valued trust model for federated instances.
date-created: 2026-04-05
type: note
name: federated-movement-coordination
keywords:
  - activitypub-entities
  - instance-trust
  - moderation-decision
  - delivery-events
  - trust-bilattice
specialization: project
serves: paradigm-applications
goal:
  - paradigm-applications
campaign: prove-the-paradigm
serves-system: application
scope: application
absorbs:
  - operations/engineering/triage/content/relationality/ideas/activitypub.md
  - operations/engineering/triage/content/relationality/docs/math/structure/activitypub-program.md
  - operations/engineering/triage/content/relationality/docs/reference/relational-activity-streams.md
entity-types: [actor, note, activity, inbox-event, outbox-event, moderation-decision]
channels: [inbox, outbox, federation, moderation]
requires-from-substrate: [http-server, http-signatures-ed25519, entity-type-declaration, channel-registry, message-envelope, witness-records]
scaling-path: [single-user, multi-user, fars-to-fars-federation, mixed-federation-with-mastodon-pleroma]
paradigm-features: [federation-as-messaging, trust-as-bilattice, moderation-as-witness, authority-provenance-on-delivery, social-graph-as-bypass-cone]
in-service-of: lib/emsenn/services/561-group/services/561-group-services-section
---

**actor**: ActivityPub Person/Application/Service. Required: inbox-url, outbox-url, public-key-pem, preferred-username, display-name. Discoverable via webfinger (`/.well-known/webfinger?resource=acct:user@instance`).
**note**: Required: author-ref, content, published (ISO 8601), visibility (public/unlisted/followers-only/direct). Optional: in-reply-to (note-ref), tags, mentions, attachments.
**activity**: Required: activity-type (Create/Like/Announce/Follow/Undo/Accept/Reject), actor-ref, object-ref, published. Immutable once sent (M7).
**inbox-event**: Required: source-instance, http-signature-status (valid/invalid/missing), activity-ref, received-at. Append-only delivery record.
**outbox-event**: Required: destination-instance, delivery-status (pending/delivered/failed/retrying), activity-ref, sent-at, retry-count.
**moderation-decision**: Required: activity-ref or actor-ref, verdict (allow/reject/flag/silence/suspend), policy-refs (which policies justified this), decided-by (officer/automated), decided-at. A witness-record (M5) certifying disposition of content.

Trust model: instance-trust is bilattice-valued per remote instance. ⊥ = unknown (new instance, no history). t = trusted (history of good-faith interaction). f = blocked (policy violation, spam). ⊤ = conflicted (some trusted actors on an otherwise-problematic instance). Trust updates are new messages on the moderation channel, not mutations.

Absorbed from triage sources: the activitypub.md idea file mapped AP objects to "recognitions" with intake/topology/measurement/traceability stacks. The activitypub-program.md specified operators (recognition, evaluate-step, storage) and a wiring plan. The relational-activity-streams.md specified AP-compatible activity-stream encoding. All three map directly: recognition = entity, intake = inbox-channel validation, topology = social/instance graph in EAVT, measurement = engagement metrics as fiber-summaries, traceability = event-log + witness-records.
