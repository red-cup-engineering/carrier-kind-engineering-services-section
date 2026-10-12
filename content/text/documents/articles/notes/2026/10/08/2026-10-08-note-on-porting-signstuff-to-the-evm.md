---
title: "Porting SignStuff to the EVM"
date-created: 2026-10-08T20:00:00Z
authors: ["claude"]
keywords: ["evm", "solidity", "signcell", "signchain", "signgraph", "signcraft", "four", "bilattice", "content-addressing", "tidepool"]
---


SignCell, SignChain, SignGraph and SignCraft now have an EVM carrier: `lib/signstuff/signstuff-evm` (`@red-cup-engineering/signstuff-evm`, private, 0.1.0). The reason is Tidepool. A pool that runs on Hive and on several EVM chains needs one world model, so a cell must have the same identity on every chain and off-chain, and what each place has been told must join without loss. This note records what mattered, what was decided and why, what was verified, and what is open. The design is in [DESIGN.md](../../../../../../../../lib/signstuff/signstuff-evm/DESIGN.md) and the task list in [ROADMAP.md](../../../../../../../../lib/signstuff/signstuff-evm/ROADMAP.md); this note does not restate them.

## What mattered about the four libraries

**SignCell.** A cell is the ordered triple (subject, predicate, object). Its address is the content address of the triple alone, never of its evidence, so identity does not move when evidence arrives. That property is what makes a cross-chain world model possible at all. Evidence sides are grow-only sets ordered by canonical bytes, so merging is a join-semilattice.

**SignChain.** The bilattice keeps value and evidence separate (Obsmetrologia `Valued`). Every operation unions both witness sides whatever it does to the value, so a meet can fall to absurd while the witnesses stay on record. This is the lossless property the EVM carrier had to keep.

**SignGraph.** The site is a set of cells plus specialization edges between predicates; a valuation is a cell set with evidence. `cohomologyOfCells` gives H0 and H1 by union-find, and `pricedNerve` counts held contradictions. Those are cheap enough to audit on-chain for small graphs. The sheaf Laplacian is floating-point and stays off-chain.

**SignCraft.** Settlement is the least fixed point of rule firing, with specialization transport. A contradiction stays designated rather than collapsing. History is a causal DAG of content-addressed revisions. The membrane is the admission boundary through which utterances become tellings.

One fact about the existing ETH ports mattered most: their ids are `sha256(abi.encode(...))` folds and a mark is `sha256(surface)`. They are not the SignCell content address, so the same triple has a different id there than in JS.

## Decisions and why

**Cell identity is sha256 of the canonical CBOR of the triple.** The JS address is an RFC 6920 ni: name, which is only a base64url spelling of that digest, so the EVM id is the 32-byte digest. The three map keys are fixed and sort by encoded bytes (object, subject, predicate), so the chain only concatenates and never sorts. Terms arrive pre-encoded as one CBOR item, which lets any JSON term be a term. The contract rejects anything that is not exactly one well-formed item, because otherwise a subject could smuggle in a predicate and dodge the membrane. NFC and canonical form remain the caller's job; a non-canonical term merely names an unreachable cell.

**Three witness carriers, chosen per use case.** A bitmap of up to 256 registered witnesses makes union a bitwise OR, for rosters and tallies. A dedupe map with a count and hash-chain head is the ledger default; it is cheap and unbounded but order-dependent, so it is a local log commitment. A sorted-pair Merkle root is a pure function of the set, so equal sets have equal roots on every chain. A modular-sum accumulator was rejected because adversarial witnesses can break it.

**Contradictions are held, never reverted.** `Both` is an ordinary absorbing point. The ledger emits one `Held` event on the transition, counts it in a census, and keeps accepting tellings. Only the membrane or malformed terms can stop a telling. Resolution is a further telling, not a deletion.

**Foreign chains are named witnesses.** A relayer with an explicit RELAY grant tells the foreign party's witness (`hive:emsenn`, or `ledger:eip155:8453:<addr>`). Two chains that disagree become two witnesses on opposite sides, which is `Both`, held and visible, not a bridge error. Trust can be upgraded later without changing the model.

**Shanghai, not Cancun.** OpenZeppelin 5.6.1's `Strings.sol` pulls in `mcopy`, which needs Cancun. Shanghai gives PUSH0 without MCOPY or transient storage, so one bytecode lands on Base, Arbitrum, Optimism and Gnosis without a per-chain hardfork audit. That the four chains accept it is still to be confirmed (ROADMAP P0.3).

**Hand-written hex and decimal helpers.** Rather than raise the EVM version for two small string functions, `SignCell` writes its own lowercase address hex and decimal conversion. Only `AllowlistMembrane` still imports OpenZeppelin, and only `Ownable2Step`.

## What was built and verified

The package has libraries for FOUR, a minimal CBOR writer and checker, cell identity, evidence (bitmap and committed), witness sets, settlement readings and small-graph cohomology. It also has a telling ledger and an allowlist membrane.

`forge build` is clean and `forge test` passes 77 tests. The lattice laws are checked exhaustively and by fuzzing. Identity and the other encodings are checked against vectors emitted by the real JS libraries (`scripts/emit-golden-vectors.mjs`, with a `--check` mode that currently reports no drift). Parity is byte for byte for cell ids, telling rows, term encodings and account witnesses. Also checked against JS: SignChain evidence results, witness-set roots and proofs, section digests, H0/H1 and CBOR well-formedness. A fuzz test shows the ledger fold is independent of telling order.

Not verified: gas figures, an audit, deployment on any chain, and any Lean vector.

## Still open

**Lockfile.** A workspace-wide `pnpm install` timed out and loaded the machine, so `node_modules` were linked by hand and `pnpm-lock.yaml` has no entry for the package. A frozen-lockfile install will fail until someone runs the filtered install once (ROADMAP P0.1). The `forge-std` dependency is declared as a GitHub tag because the npm package is stale.

**Lean vectors.** `test/vectors/lean/` is empty and no Lean vector has been run. The loader accepts the table shape and a row shape and skips what it does not recognise. The conformance package's directory is `.../lean-system-services-section/lib/obsmetrologia-conformance/vectors/`, whose files are shaped `{suite, declaration, cases:[{op,args,result}]}`. That is a third shape, not yet supported: the loader takes rows as `{rows:[{op|decl, args, result}]}`. Closing the gap means either teaching the loader the `cases` wrapper (the `declaration` field resembles the Lean declaration names the row path already matches by last segment) or having that package emit into `test/vectors/lean/`. Until a real file has been run, the Lean side is unconfirmed.

**ETH migration.** None of it has been done, and ETH was deliberately not touched. The Articulating family, the claim, consideration and outcome registries, the typed commitment and the Chu verifier need re-founding on the ledger and `SignCell`. Their ids will change when they move, which must be documented. The tasks are ROADMAP Phase 4.

The remaining phases (cross-chain import, rule firing, the Tidepool surface) are in the ROADMAP.
