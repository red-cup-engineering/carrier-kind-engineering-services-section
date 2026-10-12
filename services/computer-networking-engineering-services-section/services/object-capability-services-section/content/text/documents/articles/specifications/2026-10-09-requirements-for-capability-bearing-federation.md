---
title: "Requirements for capability-bearing federation between MetroPlat nodes"
date-created: 2026-10-09
description: "EARS requirements, specification, design constraints and receiving conditions that close the gap between the Group's capability and federation theory and the running Bare Cedar Fog and Cold Red Gate nodes."
status: requirements
part-of: object-capability-services-section
keywords:
  - capability-assertion
  - federation
  - work-peer
  - activitypub-plus-plus
  - ocapn
  - requirements
provenance:
  authors:
    - bare-cedar-fog-claude (senior-scientist)
    - claude-sonnet-5-5
  derived-from: lib/emsenn/services/561-group/services/science-services-section/services/engineering-science-services-section/services/computer-science-services-section/content/text/documents/articles/notes/2026/10/09/2026-10-09-note-on-capabilities-and-federation-between-metroplat-nodes.md
  receiver: lib/emsenn/services/561-group/services/561-group-services-section#chief-engineering-officer, through a distinct qualified engineering receiving service it allocates; material architecture outcomes are received by the Chief Technology Officer
---

Science has stated the theory and measured the nodes in the note named under `derived-from`; this document is the engineering request that the note obliges. It names the wanted outcomes and the judge. It does not name a builder. Section letters G1 to G11 refer to the gaps in that note's measurement. Aliases are the note's: `NET` is `lib/emsenn/services/561-group/services/engineering-services-section/services/computer-engineering-services-section/services/computer-networking-engineering-services-section`; `SYS`, `HOST`, `APS` as there.

## Requirements

Each requirement has one *shall*. "The node" is a MetroPlat node. "The gate" is `authorizationFromCapabilityAssertions` at the dispatch seam (`SYS/apps/computer-system-engine/src/rpc/dispatch.mjs:43`). "Standing" is the four-valued reading of `can` (`NET/src/object-capability/index.mjs:387`).

### A. Peer authority is a standing, not an identity (G1, G2)

1. When a peer delivers a work opening, telling, decision, forward or refusal, the node shall decide admission by the standing the sending actor holds for the grant `<node origin>#work-<move kind>` in the node's own capability-assertions feed at the time of delivery.
2. When that standing reads unevidenced, the node shall refuse the delivery with an obstruction that names the missing grant and shall admit the refusal as a witness.
3. When that standing reads refused, the node shall refuse the delivery and admit the refusal as a witness.
4. When that standing reads contested, the node shall hold the delivery unadmitted and admit the contest as a witness for repair.
5. The node shall not use equality between a sender's actor identifier and a configured peer actor as the test of authority for any federated operation.
6. Where a node has more than one peer, the node shall hold the grants of each peer as assertions and shall not limit work federation to one configured actor.
7. When two nodes are first configured as peers, each node shall admit a `grant` assertion to the other's instance actor for the work-move kinds the pair agrees, issued by the office that holds peering authority on that node.

### B. Authority crosses nodes with provenance (G2, G3)

8. When a node delegates a grant to a peer, the node shall admit a `delegate` assertion that names its parent assertion and the accountable allocation.
9. When a node admits an assertion received from a peer, the node shall treat it as standing only if the issuer of that assertion holds the standing for the grant it issues in the receiving node's own feed.
10. When an issuer revokes a grant, the node shall admit a `revoke` assertion and shall send it to every peer that received the grant at the next settlement exchange.
11. If an assertion is presented for admission whose issuer holds no standing for the grant it issues, then the node shall refuse it with an obstruction naming the issuer and the grant.
12. Each admitted assertion shall name as issuer a principal or office that holds the authority to issue it, and not the name of an activation event.
13. When an admission restates a standing assertion unchanged in issuer, holder, grant and kind, the node shall record no new witness.

### C. One carrier and one gate (G5, G6)

14. When a node transfers settlement witnesses to a peer, the node shall carry the transfer as an ActivityPub++ activity addressed to the peer's actor.
15. The node shall authorize a peer's read of a journal feed by a capability assertion for the grant `<feed label>#read` held by the peer's actor, and shall not read a per-peer feed map from the environment.
16. Each work-move activity a node sends shall conform to the activity, envelope and agent-message requirements of `draft-emsenn-activitypub-plus-plus-00`.
17. The node shall evaluate every inbound federated operation at the gate that evaluates a local invocation of the same operation.
18. While a node declares a peer, the node shall schedule the settlement exchange to that peer in its instance configuration.

### D. The profile's public surfaces (G7)

19. The node shall serve a signed A2A Agent Card at the URL its activities name.
20. When asked for the WebFinger of its instance actor, the node shall return the actor's `self` link.
21. When asked for NodeInfo 2.1, the node shall return it.
22. The node shall provide a scheduled conformance probe that checks requirements 19 to 21, the one-public-face rule and the signature-before-callback rule against its own origin and each peer's, and shall admit a finding as work when a check fails.

### E. Capability transport (G8, G9)

23. When two nodes are configured as peers, the node shall open a CapTP session to the peer and shall admit the session transcript as a journal witness.
24. When the node mints or admits an OCapN sturdyref, it shall record the mint and the admission as capability-assertion journal witnesses and shall not keep a private ledger.
25. When a CapTP reference is revoked, the node shall admit a revocation witness, and a later delivery to that reference shall be refused.
26. The object-capability section shall realize one named revocation mechanism for CapTP references, record the choice, and test it.
27. When the node's CapTP implementation is judged for interoperation, it shall exchange a sturdyref, a delivery and a three-party handoff with an independent OCapN implementation.

### F. Properties the theory obliges (G10)

28. The object-capability module shall state and test that no composed pipeline holds more authority than any input to it.
29. The object-capability module shall provide a query that returns the destinations an agent's grant set can reach, as a closure over its capability graph.
30. The object-capability section shall record the assumption list for the correspondence between the JavaScript CapTP and its Lean statements.

### G. The specification (G6, why the knowledge has not settled)

31. The ActivityPub++ specification shall define how a capability assertion is presented, attenuated and revoked inside the agent message.
32. The ActivityPub++ specification shall define the four standing values and the disposition a receiver takes on each.
33. The ActivityPub++ specification shall define the settlement exchange and work evidence as bindings carried inside the one ActivityPub activity.
34. The ActivityPub++ specification shall list as conformance vectors the sender, receiver and standing cases of requirements 1 to 4 and 8 to 11.

### H. One node per machine (G11)

35. The deployment of each machine shall run one MetroPlat node as the only process that speaks ActivityPub++ for that machine's Semioverse actors.
36. When a separate HTTP service on a machine federates, it shall reach the network as a client of the machine's node and shall hold its authority as capability assertions on that node.

## Specification

The wanted behavior is the model in the note's section "The Group's capability model" and the federation in "How federation between MetroPlat nodes works".

1. A peer is a holder. Its authority on a node is the standing the node's `capability-assertions` feed gives it for a grant of the form `<resource>#<action>`.
2. The grant vocabulary for peering is: `<node origin>#work-opening`, `#work-telling`, `#work-decision`, `#work-forward` for work evidence; `<feed label>#read` for journal feeds; `<node origin>#arrival` for receipt-only arrivals.
3. Admission of a federated operation reads the feed uncached, applies `can` to the sender's actor and the grant, and acts on the reading: held admits, unevidenced refuses and asks, refused refuses, contested holds. Every disposition is admitted as a witness.
4. An assertion received from a peer is a journal witness of the `capability-assertions` feed and is admitted by the same contract as a local one. It counts toward standing only through a chain whose issuers hold standing for what they issued, ending at an assertion the receiving node admitted from its own issuing authority.
5. The carrier is the ActivityPub++ nesting: activity, CloudEvents envelope, A2A message, one SEN part. Work moves and settlement transfers are SEN objects of their own kinds inside the message. Authority is carried in the message and never as a label on the activity.
6. Convergence is by join. A receiver treats a duplicate as a no-op, any arrival order as equivalent, and a disagreement as a contested standing.

## Design constraints

1. Science before engineering before operations. The grants, the gate and the carrier are generic and carry no Group data. A node's peer list, its grants and its instance actor are operations parameters (`science-engineering-operations-parameterize-in-order`).
2. Use and improve the existing mechanisms. The mechanism is `capability-assertions.mjs`, `dispatch.mjs`, `object-capability/index.mjs`, `captp/index.mjs`, `work-replication.mjs`, `federated-work.mjs`, `sen-activity.mjs` and `node.mjs`. No parallel authority table, wrapper or gate is built beside them (`use-and-improve-the-groups-own-software`).
3. The environment keeps only what the node cannot learn from its feed: its own identity, origin and keys. `GROUP_PEER_ACTOR` and `SYSTEM_NODE_SETTLEMENT_FEEDS` are retired once requirements 1 and 15 hold.
4. The authorization read stays uncached and stays fail-closed. Requirement 13 keeps it affordable; it does not replace it with a cache.
5. Existing federation keeps working during migration. A node that has not been upgraded is a peer with unevidenced standing, and the migration admits its grants explicitly before the identity test is removed.
6. Revocation reaches a peer on the next exchange and takes effect on the peer at its next uncached read.

## Receiving conditions

The receiving office judges that the requirements hold when all of these are shown.

1. A test in the manner of `SYS/apps/computer-system-engine/test/node-peering.test.mjs` runs two isolated nodes with no peer actor configured. A move from the sender is refused before a grant, admitted after it, refused again after a `revoke` reaches the receiver, and held when two assertions contest (requirements 1 to 4, 10).
2. The same test shows that a sender holding a grant for `#work-telling` and not for `#work-decision` has its decision refused (requirement 1).
3. A test shows that an assertion whose issuer holds no standing is refused and that an attenuation is refused when it widens (requirements 9, 11).
4. A test shows that restating a standing grant appends no witness, and that the feed on Bare Cedar Fog does not grow by restatement over a day of inference lots (requirement 13).
5. A recording shows that a work-peer catch-up between Bare Cedar Fog and Cold Red Gate after deployment is admitted by held standing, and that `GROUP_PEER_ACTOR` is absent from both environments (requirements 5, 7).
6. The conformance probe of requirement 22 reports all checks passing against both origins, including Agent Card, WebFinger and NodeInfo from outside the machine (requirements 19 to 21).
7. A capture shows that the settlement exchange and work evidence cross as ActivityPub++ activities, that `/arrivals` carries no journal material, and that the activity names one Agent Card (requirements 14, 16).
8. A recorded exchange shows a sturdyref, a delivery and a handoff between a MetroPlat node and an independent OCapN implementation, and a revoked reference refusing a later delivery (requirements 23 to 27).
9. The specification contains sections for requirements 31 to 33 and carries the vectors of requirement 34, and a second implementation reading only the specification passes them.
10. The distinct receiving service has not itself produced any part of the change it receives.

## Slices

The change is too large for one request. The slices are ordered by what blocks what.

1. **Peer authority by standing.** Requirements 1 to 7, 17. The gate on the federated work path and retirement of `GROUP_PEER_ACTOR`. Blocks slices 2 and 3.
2. **Authority across nodes.** Requirements 8 to 13, 15, 18. Delegation, receipt of assertions, issuer standing, revocation propagation, idempotent admission and the settlement grants as assertions.
3. **One carrier and the public surfaces.** Requirements 14, 16, 19 to 22, 31 to 34, 35, 36. The ActivityPub++ nesting for settlement and work, the Agent Card, WebFinger and NodeInfo on Bare Cedar Fog, the conformance probe, the specification sections and vectors, and one node per machine.
4. **CapTP on the node.** Requirements 23 to 30. Sessions as witnessed objects, the sturdyref service on the journal, a revocation mechanism, interoperation with an independent OCapN implementation, and the three properties of the theory.
