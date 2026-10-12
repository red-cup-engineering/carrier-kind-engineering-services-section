# SignStuff on the EVM (`@red-cup-engineering/signstuff-evm`)

A fifth SignStuff library: the same computation as SignCell, SignChain, SignGraph and SignCraft,
carried by the EVM. The aim is **one world model across chains**. A cell's identity is the same
number on Base, Arbitrum, Optimism, Gnosis, in a Hive-side service and in JS, and what each
place has been told about it is evidence that joins losslessly with what the others have been told.

Dependency order (AGENTS.md): data -> code -> networking -> systems. This package is *code*
(pure libraries, `Four`, `Cbor`, `SignCell`, `Evidence`, `WitnessSet`, `Settlement`, `GraphCohomology`)
plus one small *networking* contract layer (`CellLedger`, `AllowlistMembrane`). Pool products
(Tidepool) are *systems* that compose it; they live elsewhere.

Status key: **[0/1]** implemented and tested here; **[R]** specified here, scheduled in ROADMAP.md.

## 1. What lives on-chain, what off-chain, and why

Rule: *the chain holds what must be non-repudiable and cheaply checkable; everything else is held
off-chain under an on-chain commitment.* Two costs decide.

* **Gas.** A cold SSTORE is ~22k gas, calldata ~16 gas/byte. FOUR is two bits, so a cell's whole
  value costs one packed slot. But witness *sets* and rule closures grow without bound, so they are
  committed (Merkle root + count), not stored.
* **Trust.** On-chain state is the thing a counterparty cannot argue with: membership, who told
  what, the held/not-held status of a contested receipt. Off-chain compute (settling rules,
  H^1 of a large graph, heat-flow) is repeatable by anyone from the log, so the chain needs only the
  commitment and a way to *contest* it. Contesting is itself a telling against the commitment, which FOUR
  already knows how to hold (sec. 7).

| Thing | On-chain | Off-chain, committed on-chain |
|---|---|---|
| FOUR value of a cell | stored implicitly (two counters, derived) [0/1] | - |
| Cell identity (triple) | `bytes32` content address; terms emitted once in `CellOpened` [0/1] | term bytes (events/indexer) |
| Evidence sides | per-witness dedupe map + count + hash-chain head [0/1]; bitmap for <=256 registered witnesses [0/1] | full sorted witness sets, Merkle root [0/1 lib, R ledger anchoring] |
| Tellings (history) | content-addressed `Told` events + `head` hash chain [0/1] | event DAG / archive |
| Membrane | allowlist policy contract [0/1] | token/office-gated policies [R] |
| Settlement (rule closure) | `sectionDigest` of a settled section [0/1 lib] | the rule fixpoint (`fireRule` loop), orbit [R] |
| SignGraph | exact H^0/H^1 of <=~64 cells [0/1 lib] | sheaf Laplacian, diffusion, large H^1 [R] |

What deliberately never goes on-chain: rule-closure orbits of unbounded length, heat-flow numerics
(floating point), diagram rendering, the inference engine, free text.

## 2. FOUR as two evidence bits [0/1] `src/Four.sol`

`enum Four.Point { None, True, False, Both }` **is** the bit pattern `for | against<<1`, the same
index the JS `four` module uses (`names[for + 2*against]`). A point crosses JS / Lean / EVM as the
integer 0..3. Name families (JS `readingFamilies`): None=absurd/unknown, True=potential/held,
False=active/denied, Both=stable/contested. `Both` is **knowledge top, told both**; it is a point,
not an error.

Everything is computed from the two bits, never tabulated: joinK/meetK (or/and), joinT/meetT,
leqK/leqT, negate, conflate, impK/impT, and the twist-product connectives tensor (`FourMix.tensor`),
residuum, par (`FourMix.par`), unit = Both, plus knowledge/truth height and the WIT flux
(commit/mint/jump). Lawfulness is tested exhaustively (the carrier has four points) and fuzzed:
commutativity, associativity, idempotence, absorption, all twelve distributive laws, De Morgan,
involutive negation and conflation (Klein four-group), interlacing monotonicity, Heyting adjunction in the
knowledge order, tensor/par laws, lax MIX (tensor <=t par), residuation adjunction, and the Lean equality
locus oracle of `FourMixConsensusProfile`.

## 3. Cell identity: byte-for-byte parity with the JS content address [0/1] `src/SignCell.sol`, `src/Cbor.sol`

JS: `address(cell) = ni:///sha-256;<base64url(sha256(canonicalCBOR({subject, predicate, object})))>`
(RFC 6920 name of RFC 8949 deterministic CBOR; strings NFC). The ni: name is a base64url *spelling* of
the digest, so the EVM id is the digest: `cellId = sha256(a3 66"object" O 67"subject" S 69"predicate" P)`.
The three keys are fixed and sorted by encoded bytes (length-first for these keys), so the EVM only
concatenates; no map sorting on-chain.

* **Parity is exact** and tested against `semanticHex({subject, predicate, object})` from the real JS
  libraries for text, unicode (NFC), empty, long (head widths 23/24/300) and non-text terms.
* **Terms** arrive already encoded as one canonical-CBOR item (`semanticBytes(term)` in JS), so any
  semiotic JSON value is a term. On-chain builders exist for text, bytes and uint
  (`SignCell.textTerm/bytesTerm/uintTerm`); JS-only exotic terms (arrays, maps, floats) ride the
  pre-encoded path.
* **Caller obligations**: strings must be NFC (the JS carrier normalises; a non-NFC string is simply a
  different unreachable cell). Non-canonical CBOR also only names an unreachable cell. What the chain does
  enforce (`Cbor.isSingleItem`) is that each term is exactly one well-formed definite-length item, so
  the concatenation is uniquely parsable: nobody can smuggle a predicate inside a subject to dodge the
  membrane.
* Order is load-bearing: `converseId` differs from `cellId`; `utteranceCellId(token, claim)` is
  `(token, claim, token)`.
* Cell id never contains evidence, a chain id, an address or a time. It cannot move when evidence arrives.
* The JS twin is the JS library itself (`scripts/lib/cell-address.mjs: cellIdHex`).

Identity of a **telling row** `{subject, predicate, object, side, witness}` also matches
`semanticHex(telling(...))` (`SignCell.tellingRowId`, tested). The ledger's own telling id is the
chain-native `tellingId = sha256("signstuff-evm.telling.v1"-hash || cell || side || witnessId)`,
because on a known cell the terms are not re-supplied. JS twin: `tellingIdHex`.

Witness id: `sha256(canonicalCBOR(witness))` (JS side keys sides by those bytes). Two account witness
forms: chain-agnostic `"evm:0x<lowercase>"` (one key = one witness on every chain; right for people)
and chain-scoped `"eip155:<id>:0x<lowercase>"` (right for authority that exists on one chain). A ledger
picks one at deploy time (`WitnessScope`).

## 4. Evidence sides as witness-set commitments [0/1] `src/Evidence.sol`, `src/WitnessSet.sol`

JS sides are grow-only sets ordered by canonical bytes (a state-based G-Set per side), so merge is a
join-semilattice. The EVM picks the commitment **per use case**:

1. **Registered-witness bitmap** (`Evidence.Pair`, `uint256` per side): witness = a registered slot
   (<=256). Union is OR: O(1) gas, every law exact. Use for rosters, quorums, tallies, memberships, any
   small known electorate. A Tidepool pool of <=256 members keeps its tally cell evidence as bitmaps.
2. **Counted + hash-chain head** (`CellLedger.Cell`): dedupe map `told[cell][witness]` + per-side
   count + `head = sha256(head, witness)`. Unbounded witnesses, cheap append (one SSTORE per *new*
   (cell, witness), counters packed), the set is recoverable from events. Order-dependent head means it
   is a *local* log commitment, not a canonical set. Default for the ledger.
3. **Merkle root + count** (`Evidence.Committed`, `WitnessSet`): sorted-pair sha256 Merkle over the strictly
   ascending witness ids. A pure function of the *set*, so equal sets have equal roots on every chain and
   in JS. Joins are checked by opening both operands (linear merge) for small sets, and *claimed and
   contested* for large ones (sec. 7). Use for cross-chain transfer of a cell's evidence, snapshots,
   and anything above 256 witnesses.

Why not an XOR/modular-sum accumulator? It is incremental and commutative, but the unmitigated sum
mod 2^256 falls to generalised-birthday attacks once an adversary can pick witnesses; the sorted
Merkle set has no such weakness and costs only at commit time.

## 5. Lossless bilattice operations [0/1]

`Evidence.Pair`/`Committed` are Obsmetrologia `Valued`: `value` and evidence are separate fields.
`joinK, meetK, joinT, meetT` all **union both sides** whatever they do to the value
(`evidence_accumulates_*`); tests assert no witness bit is lost, joinK keeps Measured
(`joinK_measured`), and meetK can fall below presence while keeping witnesses (`meetK_not_measured`,
"absurd reached, witnesses kept"). `negate` swaps sides and value together (stays Measured);
`conflate` moves the value alone; `presumeFree` is the one sanctioned breach of Measured and
manufactures no witness. Golden vectors: the real `signchain/bilattice` functions on cells.

## 6. Settlement: a contradiction is a held state [0/1] `src/CellLedger.sol`, `src/Settlement.sol`

The ledger is SignChain's `TellingLog` + `KnowledgeBase.section()` as EVM state. A telling is
(cell, side, witness); repeats are no-ops. The cell value is the **knowledge join** of its tellings =
presence of the two sides. `Both` is absorbing and **never reverts, never overwrites**: a later telling of
either side is still accepted, counts rise, `Held(cell, ...)` fires once on the transition, `census()[Both]`
counts held cells, `topMassOf` reports `min(for, against)` (Obsmetrologia `Record.topMass`: how many tellings
each way are held at once). A held cell stays *designated* (told for), as in `settle.mjs designatedCells`.
Only two things can stop a telling: the membrane (sec. 8) and malformed terms. The fold is order independent
(fuzzed): replaying the same tellings in reverse order on a second ledger gives the same values, counts, census
and `wits` (the knowledge-height Lyapunov quantity, which only grows).

Resolution of a dispute is *a further telling*, never a deletion: a governance/arbiter cell
(`(receipt-9, resolved-as, upheld)`) told by the arbiter office, read under the truth order
(`adjudicate`) or by a rule. `Settlement.sectionDigest` commits a whole settled section (cells ascending with
values) as 32 bytes for cross-chain publication; JS twin `sectionDigestHex`.

SignCraft's rule closure (`fireRule`, transport along specializations, `closureOrbit`) is *not* on the ledger:
it is deterministic, replayable and monotone, so it is computed off-chain, and its section digest compared with
`Settlement.sectionDigest` (and contested if wrong) [R].

## 7. Append-only, content-addressed history [0/1]

Every fresh telling emits `Told(cell, telling, witness, side, teller, relayed, before, current, seq, head,
witnessCbor)` and advances `head = sha256(head, tellingId)`. `telling` is a pure function of content, so the
same telling has the same id on every chain; `head` orders arrival locally; `seq` is a counter. Events carry the
raw witness CBOR so an indexer rebuilds the sets, and `CellOpened` carries the raw terms. JS `history.mjs`
revisions are a causal DAG (parents = heads, id = ni: of CBOR of `{parents, source, cells}`); chain history is
a total order per ledger, so a ledger is a *linear branch* of that DAG. Byte-exact revision ids need a CBOR
encoder for arrays-of-ni-strings: [R] (`Cbor.sol` already has the heads).

## 8. SignCraft's membrane as on-chain access policy [0/1] `IMembrane`, `AllowlistMembrane`

JS `membrane.mjs` is the admission boundary through which utterances become tellings (negation parity
of a claim picks the side). On-chain, the boundary is `admits(teller, predicateHash, side, relayed)`.

* Grants are bits FOR, AGAINST, RELAY per (teller, predicate); `predicate = 0` is any predicate and
  `teller = 0` is anyone, so "anyone may contest a receipt" is `(0, paid) -> AGAINST`.
* **RELAY** (vouching for a witness that is not your own account: a Hive account, another chain's ledger)
  can only be granted to a named address, so it is always accountable. Self tellings derive the witness from
  `msg.sender`; they cannot forge another witness.
* The membrane only ever admits or refuses; it cannot edit history. A ledger holds its membrane by
  address, so policies can be swapped (token-gated, office-gated, `EnterpriseAccount`-gated) [R].
* The surface negation parsing (`denialOf`) is a client concern: the chain takes an explicit side.

## 9. SignGraph on-chain [0/1 for small graphs]

* **Site**: a set of cells (triples) + specialization edges between predicates. On-chain a site is a set of
  cell ids plus `specialize(general, specialized)` edge cells *told in the ledger itself* [R], so the site
  is evidence, not configuration.
* **Valuation**: a cell set with evidence = the ledger section over the site's cells. `read(cells[])` and
  `section(cells[])` return it; valuation join is the ledger fold (cellwise knowledge join), valuation order
  is `Evidence.leqK`.
* **Obstruction measures**, audited at three grains:
  1. *H^1 of the cell graph* (`GraphCohomology.betti`): exact `H^0` (components) and `H^1 = cells - entities +
     components` by union-find, matching `cohomologyOfCells`; O(n^2), for <=~64 cells.
  2. *Priced nerve / held-contradiction count*: `ledger.census()[Both]` over a section is the `top` leg
     of `pricedNerve` (held measurements), `topMass` per cell the `mass` leg. Zero iff the sources agree
     everywhere they overlap: the section is coordination-free-glued.
  3. *Sheaf Laplacian / diffusion / large H^1*: off-chain (floating point and O(n^3) rank). The chain stores
     the section digest and a claimed `(h0, h1, held)` triple [R]; verification of a *claimed vanishing* of H^1
     by a certificate (a spanning forest + the cycle count) is O(n) on-chain [R].

## 10. Cells told on Hive or another chain [0/1 mechanism, R for proofs]

Everything arrives as **evidence**, never as state overwrite:
* The cell id is the same, so the foreign telling lands on the same cell.
* A trusted or quorum relayer calls `tellRelayed(terms, side, witnessCbor)` with the *foreign party's* witness
  (`"hive:emsenn"`, or `"ledger:eip155:8453:<addr>"` for a whole remote ledger's reading). The event names
  the relayer. Two relayers carrying one foreign telling collapse to one witness; a lying relayer adds
  a witness that is attributable and contestable.
* **Why it fits FOUR:** two chains (or Hive and an EVM chain) that disagree about a cell are two
  witnesses on opposite sides = `Both`, held. That is not a bridge error to be reverted or
  an oracle to be trusted; it is the correct state, visible to every reader, and policy decides what a
  held cell means (the truth-order reading, a quorum rule, an arbiter telling).
* Trust is upgraded without changing the model: relayer allowlist now; later light-client / OP-stack
  `L1SLOAD`-style proofs, Hive witness-quorum signatures, EAS attestations [R]. Each is just a stronger
  way to earn the right to tell a particular witness.
* Hive has no EVM; its side is a service (pool-service) that tells the same cell ids via signed
  attestations. `scripts/lib/cell-address.mjs` is the one id function both use.

## 11. Existing ETH contracts -> this package (migration; ETH is not touched here)

| ETH file | Disposition | Roadmap |
|---|---|---|
| `FourMixConsensusProfile.sol` | `FourMix` library is subsumed by `Four` (`tensor`, `par`, `requiresConsensus`, `Four.Point`). Keep the profile contract as a thin stateless face importing `Four`; its tests become a subset of `Four.t.sol`. | P4.1 |
| `ArticulatingMark/Utterance/Articulating/ArticulationCell/Predicating` | These ids are `sha256(abi.encode(...))` folds and a mark is `sha256(surface)`: **not** the SignCell content address, so the same triple has a different id here. Re-found them on `SignCell`: mark = term; utterance = `(token, claim, token)`-cell opened in the ledger; Corner = `ledger.valueOf` (the ETH `Corner` order Absurd, Potential, Active, Stable equals `Four.Point` 0..3); `Predicating` = opening the triple cell; "articulateToken/Claim" = tellings by role. Their one-way "status moves false to true" is exactly the monotone ledger. | P4.2-P4.4 |
| `ContentClaimRegistryV1`, `ConsiderationEvidenceRegistryV1`, `OutcomeReceiptRegistryV1` | Bespoke registries of claim -> provenance/dependency/outcome roots with per-phase records. Re-express as predicates over cells (`registered`, `revoked`, `quoted/authorized/incurred/settled`, `delivered/assayed/accepted/rejected`), with the existing digests as the cell objects and the existing issuer rules as membrane grants. Revocation and *rejected-vs-accepted* become held `Both` rather than distinct enum-only records. | P4.5 |
| `TypedCommitmentProjection.sol` | Its `commitmentId` already hashes (act, settlement, predicate, subject, object, evidenceRoot). Keep as a *witness*: the evidenceRoot is a `WitnessSet` root, the telling is relayed with the settlement account's witness. | P4.6 |
| `CommittedChuSquareVerifier.sol` | Its Merkle leaves/proofs and strict FOUR charge checks move onto `WitnessSet` + `Four`; the square's closing becomes a telling. | P4.7 |
| `articulating-evm-projection.mjs` (JS) | Replace with `scripts/lib/cell-address.mjs` (id parity) and the `Told` event decoder. | P4.8 |

## 12. Tidepool-facing surface (sketch; details in ROADMAP P5)

* **Membership**: cell `(member, member-of, pool)`. Admitted by a membrane grant held by the admissions
  office; told FOR by the admitting office witness, AGAINST by an expulsion office. Both offices telling
  is a held, visible disagreement, not a silent flip. The roster is a bitmap keyed by member slot.
* **Tallies**: per proposal `(proposal, tally-for/against, pool)`; each voter is a witness (chain-agnostic
  account witness, so a member voting on two chains counts once). `record(Pair)` gives the counts; quorum
  and threshold are readings over the section, not storage.
* **Contested receipts**: `(receipt, accurate, receipt)` told FOR by the issuer, AGAINST by anyone with the open
  contest grant; `Both` = contested, `Held` event for indexers, `topMass` as the dispute weight, resolution by
  a later arbiter telling.
* **Votes**: a vote is a telling; vote weights are an off-chain reading under the truth order, or an on-chain
  `Evidence.Pair` tally with weights by slot [R].
* **Settlement**: epoch close publishes `sectionDigest` of the pool's section to every chain and to Hive; a
  peer chain accepts it as a relayed witness `ledger:<chain>:<addr>`; disagreement is `Both`.

## 13. Golden vectors

* `scripts/emit-golden-vectors.mjs` runs the real JS libraries and writes `test/vectors/js/*.json`
  (`--check` fails on drift). Files: `four`, `cell-address`, `telling`, `account-witness`, `witness-set`,
  `evidence`, `section-digest`, `cohomology`, `cbor`.
* `test/vectors/lean/` is optional (a parallel Lean-emitted conformance set). The loader
  (`test/helpers/Vectors.sol`, `FourTest._checkTables/_checkRows`) checks any file of the same name found
  there, and **skips any key or operation it does not recognise**. For `four.json` it accepts:
  * the table shape: `{ "binary": { "joinK": [16 ints...], "leqK": [16 bools], ... }, "unary": { "negate": [4 ints] }, "constants": {...} }`
    where a point is its bits (for + 2*against) and binary tables are indexed `a*4 + b`;
  * a row shape: `{ "rows": [ { "op" | "decl": "joinK" | "Obsmetrologia.Reading.joinK", "args": [a, b], "result": r } ] }`,
    with points as bits or names in any family (absurd/potential/active/stable, told none/..., neither/true/false/both,
    unknown/held/denied/contested) and booleans as `true`/`false`. Declaration names are matched by last segment, with
    `leK->leqK, leT->leqT, fuse->tensor, imp->residuum` aliases.
  A Lean vector that disagrees with the EVM fails the suite, which is the point.

### 13.1 Lean conformance: declaration -> Solidity realizer [0/1] `test/LeanConformance.t.sol`

`node scripts/sync-lean-vectors.mjs` copies `vectors/{four,valued,record}` from
`lean-system-services-section/lib/obsmetrologia-conformance` into `test/vectors/lean/<suite>/<op>.json`
byte for byte (`--check` fails on any missing, extra or differing file). Files are
`{"suite","declaration","cases":[{"op","args","result"}]}`; `Vectors.sol` decodes them (struct fields in
alphabetical order, as Foundry requires) and refuses a file whose declaration does not end in its op.
Every case is replayed; a disagreement fails the suite.

| Lean declaration | Solidity | Cases |
|---|---|---|
| `Reading.joinK / meetK / joinT / meetT` | `Four.joinK / meetK / joinT / meetT` | 16 each |
| `Reading.leK / leT` | `Four.leqK / leqT` | 16 each |
| `Reading.negate / conflate` | `Four.negate / conflate` | 4 each |
| `Reading.negConf` | `Four.negate(Four.conflate(p))` (composition) | 4 |
| `Reading.kBot / kTop / tTop / tBot` | `Four.knowledgeBottom / knowledgeTop / truthTop / truthBottom` | 1 each |
| `FourMix.readingFuse` | `Four.tensor` | 16 |
| `FourMix.readingPar` | `Four.par` | 16 |
| `FourMix.readingMix` | `Four.leqT(tensor(a,b), par(a,b))` (composition) | 16 |
| `FourMix.requiresConsensus` | `Four.requiresConsensus` | 16 |
| `FourMix.equalityLocus` | `!Four.requiresConsensus` (no named function; the vectors make it the exact complement) | 16 |
| `Valued.joinK / meetK / joinT / meetT` | `Evidence.joinK / meetK / joinT / meetT` on `Pair` (witness letters a..d = slots 0..3) | 16 each |
| `Valued.negate / conflate / presumeFree` | `Evidence.negate / conflate / presumeFree` | 4 each |
| `Record.reading` | `Evidence.presence` of the prefix-bitmap pair (tally n = n low bits), read back with `Evidence.record` | 9 |
| `Record.joinK` | `Evidence.joinK` on prefix pairs (OR of prefixes = max) | 81 |
| `Record.leK / leT` | `Evidence.leqK / leqT` on prefix pairs | 81 each |
| `Record.add` | `Evidence.joinK` of two pairs with disjoint witness bits (union of disjoint sets counts the sum) | 81 |

**Lean ops with no Solidity realizer, stated plainly:**

* `Record.meetK`, `Record.joinT`, `Record.meetT`: `Evidence.meetK/joinT/meetT` union the witnesses (the
  lossless rule), they do not take the min/max of tallies. No function computes these on tallies.
  `test_unrealized_*` only checks the vectors exist; it judges nothing.
* `Record.topMass` (`min(pos,neg)`): no function. `Evidence.record` gives the tallies, nobody takes the min.
* The whole `pool` suite (`split shares dust settleCycle transfer solveL solveR degeneracy`): no Solidity
  library in this package computes a split, a transfer, a cycle settlement or the knapsack. The suite is not
  copied by the sync script. It is the acceptance test for the first Tidepool pool-accounting library.
* Not vector-judged though realized: `impK/impT/residuum/linearNegate/unit`, `knowledgeHeight/truthHeight/flux`,
  the `*All` folds, `Evidence.Committed`, `WitnessSet` (Lean emits no vectors for these).

## 14. Honest limits

* Strings must arrive NFC and terms should be canonical CBOR; the chain checks well-formedness, not canonicality.
* The ledger counts distinct witnesses it was *told*; a relayer is trusted for the witness it vouches for.
* The pnpm lockfile has not been regenerated for this package (sec. ROADMAP P0.1); `node_modules` were linked by hand.
* No gas benchmarks yet (ROADMAP P1.4). No audit.
