---
title: "ActivityPub++: One Federated Carrier for Activities, Events, Agent Messages and Payments"
date-created: 2026-09-27
authors: [emsenn, claude-opus-5-5]
status: draft
part-of: activitypub-services-section
version: 0.1.0
stability: draft
---

# ActivityPub++: One Federated Carrier for Activities, Events, Agent Messages and Payments

## What this is

ActivityPub++ is the profile a node speaks to join the Semioverse, the 561 Group's federated network named after the Fediverse. It composes four open protocols into one nesting instead of four neighbouring services: an ActivityPub activity carries one CloudEvents envelope, whose data is one A2A message, whose single part is a content-addressed SEN object. Payment and authority (x402, UCAN, CapTP, an EVM anchor) appear only inside that A2A message, when the message actually carries them. This document states that nesting as requirements, so that a second implementation can interoperate with the house one without reading its code. It is derived from the [Semioverse](lib/emsenn/services/561-group/services/engineering-services-section/content/text/glossary/terms/semioverse.md) term, the [activitypub-services-section README, "Union transport"](lib/emsenn/services/561-group/services/engineering-services-section/services/computer-engineering-services-section/services/computer-networking-engineering-services-section/services/activitypub-services-section/README.md), and the projection and extraction the house code enforces in [sen-activity.mjs](lib/emsenn/services/561-group/services/engineering-services-section/services/computer-engineering-services-section/services/computer-networking-engineering-services-section/services/activitypub-services-section/src/sen-activity.mjs).

## Terminology

- **Node**: a server that speaks ActivityPub++. The Semioverse is the network of nodes, not a server; its intended server is [MOOSE](lib/emsenn/services/561-group/services/engineering-services-section/content/text/glossary/terms/moose.md), which no package yet carries.
- **Actor**: an ActivityPub actor hosted by a node.
- **SEN object**: a value in the house semiotic expression notation, encoded as the canonical normalized-content envelope and carried as `application/sen+cbor` bytes.
- **Envelope**: the CloudEvents event that carries one A2A message.
- **ni name**: an RFC 6920 `ni:///sha-256;` URI naming bytes by their SHA-256 digest (Naming Things with Hashes (**IETF RFC 6920**, [https://www.rfc-editor.org/rfc/rfc6920](https://www.rfc-editor.org/rfc/rfc6920); applies to: naming envelope and SEN bytes).).

## One Public Face

A node federates through ActivityPub and nothing beside it. ActivityPub (**W3C Recommendation, 23 January 2018**, [https://www.w3.org/TR/activitypub/](https://www.w3.org/TR/activitypub/); applies to: actors, inboxes, outboxes, delivery). supplies actors, inboxes, outboxes and delivery; Activity Streams 2.0 (**W3C Recommendation, 23 May 2017**, [https://www.w3.org/TR/activitystreams-core/](https://www.w3.org/TR/activitystreams-core/); applies to: activity and object vocabulary). supplies the vocabulary; WebFinger (**IETF RFC 7033**, [https://www.rfc-editor.org/rfc/rfc7033](https://www.rfc-editor.org/rfc/rfc7033); applies to: actor discovery). and NodeInfo (**NodeInfo 2.1**, [https://nodeinfo.diaspora.software/](https://nodeinfo.diaspora.software/); applies to: node discovery). make actors and nodes discoverable.

**A node MUST** give each actor exactly one public ActivityPub face, at the actor URL `<origin>/actors/<identifier>` ([activitypub-services-section README, "Union transport"](../../../../../README.md); [sen-activity.mjs](../../../../../src/sen-activity.mjs)).

**A node MUST NOT** expose a public A2A listener beside its ActivityPub face; A2A is the operation language inside the federated carrier, not a second public transport ([activitypub-services-section README, "Union transport"](../../../../../README.md); [Semioverse](../../../../../../../../../../../content/text/glossary/terms/semioverse.md)).

**A node MUST** verify the signature or proof on every inbound activity before its inbox callback runs, and offer no unsigned-admission mode ([activitypub-services-section README, "Union transport"](../../../../../README.md)).

**A node that has no receiving workflow for an actor MUST** answer a POST to that actor's inbox with 405 rather than accept and discard the activity ([activitypub-services-section README, "Publication profile"](../../../../../README.md)).

## The Activity

An ActivityPub++ activity is an ordinary ActivityStreams activity whose object is one document naming one envelope.

**An ActivityPub++ activity MUST** have type `Accept`, `Announce`, `Create`, `Offer`, `Reject` or `Update` ([sen-activity.mjs](../../../../../src/sen-activity.mjs)). Checked by: activitypub-services-section test/sen-activity.test.mjs.

**The activity's object MUST** be one `Document` with `mediaType` `application/sen+cbor`, whose `name` is the ni name of the envelope bytes and whose `url` is one `Link` with the same media type ([sen-activity.mjs](../../../../../src/sen-activity.mjs)). Checked by: activitypub-services-section test/sen-activity.test.mjs.

**The object's link MUST** carry the envelope bytes as one canonical base64 `data:application/sen+cbor` URI ([sen-activity.mjs](../../../../../src/sen-activity.mjs)). Checked by: activitypub-services-section test/sen-activity.test.mjs.

**A receiver MUST** reject an activity whose inline envelope bytes do not hash to the object's `name` ([sen-activity.mjs](../../../../../src/sen-activity.mjs)). Checked by: activitypub-services-section test/sen-activity.test.mjs.

**A sender MUST** keep the inline envelope bytes nonempty and at most 262,144 bytes ([sen-activity.mjs](../../../../../src/sen-activity.mjs)).

**A receiver MUST** reject inline envelope bytes that are larger than 262,144 bytes or not canonically encoded ([sen-activity.mjs](../../../../../src/sen-activity.mjs)).

**The activity MUST** name exactly one A2A Agent Card, as an `attachment` `Link` with `mediaType` `application/json` and `name` "A2A Agent Card" ([sen-activity.mjs](../../../../../src/sen-activity.mjs)). Checked by: activitypub-services-section test/sen-activity.test.mjs.

**The actor origin, the recipient and the Agent Card URL MUST** use HTTPS, except on loopback addresses during development ([sen-activity.mjs](../../../../../src/sen-activity.mjs)).

**A sender SHOULD** derive the activity's `id` from its type, actor, recipient, envelope ni name and Agent Card, so that republishing the same activity yields the same identity ([sen-activity.mjs](../../../../../src/sen-activity.mjs)).

The object therefore has this shape, with the envelope's bytes inline (The "data" URL scheme (**IETF RFC 2397**, [https://www.rfc-editor.org/rfc/rfc2397](https://www.rfc-editor.org/rfc/rfc2397); applies to: inline envelope bytes).):

```json
{
  "@context": "https://www.w3.org/ns/activitystreams",
  "id": "https://node.example/activities/sen-<digest>",
  "type": "Offer",
  "actor": "https://node.example/actors/seller",
  "to": "https://peer.example/actors/buyer",
  "object": {
    "type": "Document",
    "mediaType": "application/sen+cbor",
    "name": "ni:///sha-256;<envelope digest>",
    "url": { "type": "Link", "mediaType": "application/sen+cbor",
             "href": "data:application/sen+cbor;base64,<envelope bytes>" }
  },
  "attachment": { "type": "Link", "mediaType": "application/json",
                  "name": "A2A Agent Card", "href": "https://node.example/.well-known/agent-card.json" }
}
```

## The Envelope

The envelope is a CloudEvents event (CloudEvents specification (**CNCF CloudEvents 1.0**, [https://github.com/cloudevents/spec/blob/v1.0.2/cloudevents/spec.md](https://github.com/cloudevents/spec/blob/v1.0.2/cloudevents/spec.md); applies to: the envelope).) whose fields bind it to the activity that carries it.

**The envelope MUST** have `specversion` "1.0" and exactly the attributes `id`, `specversion`, `source`, `type`, `time`, `subject`, `datacontenttype` and `data` ([sen-activity.mjs](../../../../../src/sen-activity.mjs)).

**A receiver MUST** reject an envelope whose `source` is not the activity's actor or whose `subject` is not the recipient it was addressed to ([sen-activity.mjs](../../../../../src/sen-activity.mjs)).

**The envelope's `type` MUST** be `org.harmonious-union.activitypub.<activity type in lower case>.v1`, matching the carrying activity's type ([sen-activity.mjs](../../../../../src/sen-activity.mjs)).

**The envelope MUST** declare `datacontenttype` `application/a2a+json` and carry `data` with exactly `profile` "org.harmonious-union.activitypub.cloudevent.a2a-sen.v1", `transport` "A2A" and one A2A `message` ([sen-activity.mjs](../../../../../src/sen-activity.mjs)).

**The envelope's `id` MUST** be the ni name of the envelope's canonical body without its `id` ([sen-activity.mjs](../../../../../src/sen-activity.mjs)).

**A receiver MUST** reject an envelope whose `id` does not name its canonical body ([sen-activity.mjs](../../../../../src/sen-activity.mjs)).

**The envelope's `time` MUST** be an RFC 3339 timestamp ([sen-activity.mjs](../../../../../src/sen-activity.mjs)).

## The Agent Message

The envelope's data is one message in the Agent2Agent protocol (Agent2Agent (A2A) Protocol (**Linux Foundation A2A Project Agent2Agent Protocol 1.0**, [https://a2a-protocol.org/](https://a2a-protocol.org/); applies to: the agent message).). The message, not the activity, is where the operation is stated.

**The message MUST** have role `ROLE_USER` or `ROLE_AGENT` ([sen-activity.mjs](../../../../../src/sen-activity.mjs)).

**The message MUST** carry exactly one raw part with `mediaType` `application/sen+cbor` ([sen-part.mjs](../../../../../../a2a-services-section/scripts/sen-part.mjs); [sen-activity.mjs](../../../../../src/sen-activity.mjs)).

**That part MUST** state the ni name of its bytes in `metadata.ni` ([sen-part.mjs](../../../../../../a2a-services-section/scripts/sen-part.mjs)).

**A receiver MUST** reject a SEN part whose bytes do not match its `metadata.ni` ([sen-part.mjs](../../../../../../a2a-services-section/scripts/sen-part.mjs)).

**The part's bytes MUST** be canonical normalized SEN content, so that equal values have equal bytes and equal names ([sen-activity.mjs](../../../../../src/sen-activity.mjs)). Checked by: activitypub-services-section test/sen-activity.test.mjs.

**A node SHOULD** publish a signed Agent Card, so that a receiver can check the card was issued by the domain it names ([agent-card-signing.mjs](../../../../../../a2a-services-section/scripts/agent-card-signing.mjs)).

## Authority and Payment

Payment and authority ride inside the agent message. They are never sibling labels on the activity. Payment is x402 (**x402 Foundation x402 Protocol Specification v2**, [https://github.com/coinbase/x402/blob/main/specs/x402-specification-v2.md](https://github.com/coinbase/x402/blob/main/specs/x402-specification-v2.md); applies to: payment)..

**A node MUST NOT** mark an activity as carrying UCAN, CapTP, x402 or an EVM anchor unless its A2A message actually carries that authority, invocation, settlement or anchor ([activitypub-services-section README, "Union transport"](../../../../../README.md); [Semioverse](../../../../../../../../../../../content/text/glossary/terms/semioverse.md)).

**A node that prices an operation MUST** state the price and settle it as x402 version 2 payment requirements and payloads ([x402 services section README](../../../../../../x402-services-section/README.md)).

**A node carrying an x402 exchange inside an A2A message SHOULD** use the message metadata keys of the A2A x402 extension (`x402.payment.status`, `x402.payment.required`, `x402.payment.payload`, `x402.payment.receipts`) ([A2A x402 extension v0.1](https://github.com/google-agentic-commerce/a2a-x402)).

**A node MUST NOT** treat a settled payment as authority to perform an operation that its own admission has not accepted; payment proves a payment event and nothing more ([the Group's publishing program note](../../../../../../../../../../../../561-group-services-section/content/text/documents/articles/notes/2026/09/02/2026-09-02-note-on-the-groups-publishing-program.md)).

## Security Considerations

Every carried byte is named by its digest, so a receiver detects substitution of the envelope or the SEN object; the digests do not authenticate the sender, which is the job of the signature every inbound activity carries.

The envelope binds its `source` and `subject` to the activity's actor and recipient, so an envelope lifted from one activity and replayed inside another addressed elsewhere is rejected. An identical activity replayed to the same recipient has the same `id`, which lets a receiver's idempotency custody detect it.

The inline size bound limits the cost of verifying an activity before its signature is checked.

Payment carried inside an agent message inherits the risks of x402 itself: payments applied to the wrong resource, duplicate settlement, overdrawn allowances and delivery on payments that fail.

**A node that sells an operation MUST** bind each payment to the exact operation it pays for, and settle it before performing the operation or bear the loss ([Ling et al., Free-Riding the Agentic Web, arXiv 2605.30998](https://arxiv.org/abs/2605.30998); [Li, Wang and Wang, Five Attacks on x402, arXiv 2605.11781](https://arxiv.org/abs/2605.11781)).

Activities addressed to the public collection are readable by anyone, and a payer's address is public on its settlement network; neither is suitable for material its parties need to keep private.

## IANA Considerations

This revision makes no request of IANA. It uses two media types that are not registered, `application/sen+cbor` and `application/a2a+json`; registering them, or replacing them with registered types, is an open issue.

## Implementations

### House activitypub-services-section

`src/sen-activity.mjs` projects (`projectSenActivity`) and extracts (`extractSenActivity`) the whole nesting and enforces every MUST in The Activity, The Envelope and The Agent Message. The provider (`src/provider.mjs`) is built on Fedify and supplies WebFinger, NodeInfo 2.1, signature verification and delivery.

### House a2a-services-section and x402-services-section

`scripts/sen-part.mjs` builds and checks the SEN part; `scripts/agent-card-signing.mjs` signs Agent Cards. The x402 section is the one x402 v2 payment boundary. No house code yet carries an x402 exchange inside an A2A message.

### Nodes

On 2026-09-27 no node runs this profile as one server: ActivityPub, A2A and x402 each still have their own HTTP carrier in separate sections, which the one-public-face requirement forbids for a conforming node. MOOSE, the intended node server, has no package.

## Open questions

- **Which x402 version the A2A carriage uses.** Resolution blocked by: the A2A x402 extension v0.1 references x402 version 1, while this profile requires version 2.
- **Whether node-to-node settlement replication travels inside ActivityPub like other activities.** Resolution blocked by: MetroPlat federation now posts CloudEvents to a peer's /arrivals route and signs transfers with RFC 9421, a second channel beside the one public face.
- **Whether the envelope type and profile keep the `org.harmonious-union` prefix.** Resolution blocked by: a naming decision; renaming changes every envelope type string and breaks interoperation with existing activities.
- **Whether `application/sen+cbor` and `application/a2a+json` are registered.** Resolution blocked by: a stable SEN encoding specification to cite in a registration request.
- **Which inbound signature schemes a conforming node must accept.** Resolution blocked by: a survey of what deployed Fediverse peers send (HTTP Signatures drafts, RFC 9421, Data Integrity proofs).
