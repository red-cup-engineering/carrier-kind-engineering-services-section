# ROADMAP: signstuff-evm

Each task is independently pickable. Conventions: Solidity 0.8.28, `via_ir`, evm `shanghai`; sha256 for
identities; new library code gets exhaustive/fuzz tests *and* a JS-emitted golden vector (extend
`scripts/emit-golden-vectors.mjs`, then read it from a Foundry test). Acceptance means `forge build` clean,
`forge test` green, `node scripts/emit-golden-vectors.mjs --check` clean. Run heavy commands one at a time.
Do not edit the four JS SignStuff libraries or ETH from here; JS-side changes are separate tasks marked (JS).

## Phase 0: package and toolchain (done unless marked)
* P0.1 **Lockfile.** `pnpm install --filter @red-cup-engineering/signstuff-evm...` once, commit nothing. Accept: `pnpm-lock.yaml` lists the importer, `forge-std` resolves (github tag v1.10.0 or vendored in `lib/`), `node_modules` are pnpm-made not hand links. *Open.*
* P0.2 `foundry.toml`, `package.json`, `.gitignore`. *Done.*
* P0.3 Deployment-chain check: confirm Base, Arbitrum, Optimism, Gnosis accept shanghai bytecode (no PUSH0 gaps); record in DESIGN. *Open.*

## Phase 1: core (done)
* P1.1 `Four.sol` + exhaustive/fuzz laws + JS vectors. *Done.*
* P1.2 `Cbor.sol`, `SignCell.sol` identity parity (cells, tellings, witnesses). *Done.*
* P1.3 `Evidence.sol` (Pair, Committed), `WitnessSet.sol`. *Done.*
* P1.4 `CellLedger.sol`, `AllowlistMembrane.sol`, `Settlement.sol`, `GraphCohomology.sol`. *Done.*
* P1.5 **Gas report.** `forge test --gas-report` for `tell`, `tellKnown`, `tellRelayed`, `section`; add `test/Gas.t.sol` with snapshot (`forge snapshot`). Accept: numbers in DESIGN sec. 1; `tellKnown` fresh <= 90k gas, repeat <= 30k.
* P1.6 **Canonical-CBOR validator.** `Cbor.isCanonical(bytes)` (shortest heads, sorted map keys, no tags). Files: `src/Cbor.sol`, `test/Cbor.t.sol`. Accept: every `semanticBytes` vector passes; each non-shortest-int / unsorted-map / indefinite item fails; optional strict mode flag on `CellLedger` (immutable) rejecting non-canonical terms.
* P1.7 **NFC guard (JS).** Export `isNfc`/`assertSemioticString` helper in `scripts/lib/cell-address.mjs` and use it in a `encodeTermForChain(term)` that throws on non-NFC strings; document that on-chain cannot check. Accept: unit test with a decomposed `e + U+0301`.

## Phase 2: evidence at scale and cross-chain import
* P2.1 **Witness registry + bitmap tallies.** `src/WitnessRegistry.sol`: `register(bytes32 witness) -> uint8 slot` (<=256 per scope, append-only, permissioned by membrane), `slotOf`, `witnessAt`. `src/BitmapCell.sol`: ledger variant whose per-cell state is `Evidence.Pair` (two uint256 + value), `tellSlot(cell, side)`. Accept: fuzz equality with `CellLedger` value for the same tellings; joinK of two `BitmapCell` snapshots via OR matches; tell cost <= 50k gas.
* P2.2 **Set anchoring.** `CellLedger.anchorSet(cell, Side, bytes32 root, uint32 count)` emitting `SetAnchored`, restricted to an `ANCHOR` membrane bit; plus `challengeAnchor(cell, side, proof...)`. Accept: anchored root equals `rootHex` of the event-reconstructed set in a test using the JS twin.
* P2.3 **Snapshot import.** `src/CellImporter.sol`: `importSnapshot(ledgerRef, cells[], values[], digest, sig/proof)` telling each remote cell *as the witness* `ledger:eip155:<chain>:<addr>` on the matching side(s) (`True`->For, `False`->Against, `Both`->both, `None`->nothing). Accept: Base says True, Arbitrum says False => local `Both`; re-import is idempotent; digest mismatch reverts.
* P2.4 **Hive witness attestation.** Define the witness `hive:<account>` and an attested telling envelope (`{cell, side, witness, hiveTrxId, blockNum}` + k-of-n witness-signature check via ERC-1271/EOA). `src/HiveAttestationMembrane.sol`. Accept: forged signatures rejected; vector for the envelope hash produced from a JS fixture. (JS) pool-service emits the envelope.
* P2.5 **Light-client/proof relays.** Optional adapters: OP-stack `L1Block`/`L1SLOAD`, Arbitrum outbox, Gnosis AMB; each only earns a stronger RELAY. Separate file per bridge; no change to `CellLedger`.
* P2.6 **Revision DAG parity (JS+EVM).** `Cbor` helpers for arrays/maps + `SignCell.revisionId(parents, source, cells)` equal to `history.mjs identify(body)`. Accept: JS vector from `observeHistory`; ledger can verify a replayed revision.

## Phase 3: settlement, rules, graph
* P3.1 **Specialization transport.** `src/Site.sol`: told `specializes(general, special)` edge cells; `transport(cellSpecial)` tells the general cell FOR and the special cell AGAINST per `transportRules`. Accept: vector from `signgraph/site transportRules` + `fireRule` on a 3-predicate site; held contradiction survives transport.
* P3.2 **Bounded rule firing.** `src/Rules.sol`: `Rule{ antecedents[(cell, atLeast)], consequent(cell, reading) }`, `fireRule(ledger, rule)` with derivation witness `{rule: name, from: [cellIds]}` encoded as canonical CBOR (JS `derivation`). `step(rules[])` and `settleN(rules[], maxStages)`. Accept: orbit stages equal `closureOrbit` for the JS fixtures; stage cap = rule count (JS bound).
* P3.3 **Section commitments and contest.** `SettlementRegistry`: `post(sectionDigest, ruleSetRoot, stageCount)`, `contest(post, cellId, claimedValue)` telling AGAINST the post; the post cell reads `Both` while contested. Accept: honest post uncontested stays `True`; a wrong post becomes `Both`; resolution telling by an arbiter office.
* P3.4 **H^1 certificate verifier.** `GraphCohomology.verifyBetti(cells, claimedH0, claimedH1, forest)` O(n) from a spanning forest; `H^1 = 0` iff forest covers all cells. Accept: random-graph fuzz vs. union-find `betti`; JS emits certificates from `cohomologyOfCells`.
* P3.5 **Priced nerve on-chain.** `Settlement.pricedNerve(Point[] values, uint32[] forCounts, uint32[] againstCounts)` returning `(top, mass)` = JS `pricedNerve` legs for register-style cells. Accept: vector parity.
* P3.6 (JS) **Export a canonical chain encoder** from `signcell` (`encodeForChain(cell|telling|section)`) so the twin in this package stops duplicating sha256 definitions; then delete `tellingIdHex`/`sectionDigestHex` local definitions in favour of it.

## Phase 4: migration of ETH contracts (ETH owner executes; this package provides the target)
* P4.1 `FourMixConsensusProfile` -> import `Four` (`tensor`, `par`, `requiresConsensus`, `Point`); keep the profile ABI. Accept: ETH `FourMixConsensusProfile.t.sol` passes unchanged.
* P4.2 Add `src/ArticulationCompat.sol` here: maps ETH `Corner` <-> `Four.Point`, mark/utterance/predication to `SignCell` ids; document the id change. Accept: table test for the 4 corners; ETH ids are *not* equal to SignCell ids (assert and document).
* P4.3 Re-found `Utterance`/`Articulating`/`ArticulationCell` on `CellLedger`: `seat` = open reflexive cell, `articulateToken/Claim` = telling by role predicates `articulated-token`/`articulated-claim`. Accept: ETH `Articulate.t.sol` behaviours reproduced against the ledger (one-way, idempotence).
* P4.4 `Predicating` -> opening the triple cell; the "subject must be Potential" rule becomes a membrane precondition (`PotentialSubjectMembrane`). Accept: `Predicate.t.sol` behaviours.
* P4.5 `ContentClaimRegistryV1`, `ConsiderationEvidenceRegistryV1`, `OutcomeReceiptRegistryV1` -> predicate vocabularies + membranes (issuer, customer, assayer roles). Accept: each existing revert path maps to a membrane refusal or a held `Both`; add a doc table old function -> new telling.
* P4.6 `TypedCommitmentProjection` evidenceRoot -> `WitnessSet` root; commitment becomes a relayed telling by the settlement account. 
* P4.7 `CommittedChuSquareVerifier` Merkle -> `WitnessSet`; charges -> `Four.Point`.
* P4.8 (JS) `articulating-evm-projection.mjs` -> `signstuff-evm/cell-address`. Delete the dangling `RouteDirectedYield.t.sol` import separately (recover with `git show 32efbf028f0a^:<path>` if the yield router returns).

## Phase 5: Tidepool surface (`src/tidepool/`, composes P1-P3; Tidepool-product repo decides economics)
* P5.1 **Vocabulary.** `src/tidepool/Predicates.sol`: constants `MEMBER_OF, ADMITTED_BY, EXPELLED_BY, VOTED, TALLY, RECEIPT_ACCURATE, RESOLVED_AS, PAID` as pre-encoded text terms + `sha256` ids; JS twin `scripts/lib/tidepool-vocab.mjs` with vectors.
* P5.2 **Membership.** `PoolMembership`: cell `(member, member-of, pool)`; membranes `AdmissionsOffice` (FOR) and `ExpulsionOffice` (AGAINST); `isMember(member)` = `valueOf == True` (a `Both` member is *suspended*, exposed as a distinct read `membershipStatus -> {None, Member, Expelled, Contested}`). Accept: admit, expel, contest-expulsion sequences; roster bitmap via P2.1.
* P5.3 **Votes and tallies.** `PoolVotes`: `vote(proposal, side)` is a telling by the voter's chain-agnostic account witness, admitted only if `isMember`; `tally(proposal)` returns `(forCount, againstCount, topMass)`; quorum/threshold are views. Accept: member voting on two chains counts once after import (P2.3); non-member rejected; vote-change is allowed as a held `Both` or forbidden by a membrane flag (decide with Tidepool governance and record in DESIGN).
* P5.4 **Contested receipts.** `PoolReceipts`: `issue(receipt)` FOR by issuer; `contest(receipt)` AGAINST via open grant; `dispute(receipt) -> (value, topMass)`; `resolve(receipt, upheld)` told by the arbiter office as a separate cell. Accept: contest does not block the receipt, only holds it; `Held` event emitted; payouts reading the receipt must read `value` and treat `Both` per pool policy.
* P5.5 **Settlement epochs.** `PoolEpoch.close()` computes `sectionDigest` of the pool section, emits `EpochClosed(epoch, digest, held)`, posts to `SettlementRegistry` (P3.3), and exposes the digest for Hive (JS: pool-service publishes it) and peer chains (P2.3). Accept: two chains close the same epoch with identical digests when their sections agree, `Both`-disagreement otherwise.
* P5.6 **Weighted votes (matched-tally).** `Evidence.Pair` tally with per-slot weights from a weights cell; reading under truth order. Accept: reproduces pool-service `matched-tally weighted votes` fixtures (JS emits vectors).
* P5.7 **Deployment scripts.** `script/DeployPool.s.sol` (membrane, ledger per chain with identical terms) + `scripts/verify-parity.mjs` that reads each chain's `cellId` for the pool membership cell and asserts equality with JS. Accept: dry-run on anvil forks of Base and Arbitrum.

## Phase 6: hardening
* P6.1 Invariant tests (`forge test` invariants): census sums to opened cells; `wits` equals sum of heights; `Both` never decreases.
* P6.2 Slither/mythril pass; formal check of `Cbor.isSingleItem` against a reference parser fuzzed with random bytes.
* P6.3 Upgrade story: ledgers are immutable; a new version is a new ledger and an import (P2.3) of the old section. Document in DESIGN.
* P6.4 Lean conformance: `scripts/sync-lean-vectors.mjs` + `test/LeanConformance.t.sol` replay every Lean `four`, `valued` and `record` case Four/Evidence realize (see DESIGN sec. 13.1). *Done* for those suites. *Open:* `Record.meetK/joinT/meetT/topMass` (no tally-level realizer) and the `pool` suite (needs a pool-accounting library: split, transfer, settleCycle, solver).
