---
title: "Capability note: @561-group/waggle"
date: 2026-06-29
source-package: "sites/triage.bare-cedar-fog.emsenn.net/sites/archive.emsenn.net/dev/ref/src/from-content-source/apps/interface/waggle"
---

# Capability note: @561-group/waggle

- Package path: `sites/triage.bare-cedar-fog.emsenn.net/sites/archive.emsenn.net/dev/ref/src/from-content-source/apps/interface/waggle`
- Package kind: `archive-site`
- Declared workspace entries: none found in the scanned workspace declarations
- Description: waggle — a zero-dependency Node↔Hive blockchain client, rederived from the ground up. Named for the bees' waggle dance, the social signal by which a hive shares where to go. It speaks Hive's JSON-RPC (condenser positional + bridge named-object), and builds, signs, and broadcasts transactions with hand-rolled secp256k1 (BigInt curve, RFC6979 deterministic-k, low-S + graphene canonical-loop, recovery id → 65-byte compact signature) and graphene binary serialization (little-endian, legacy STEEM/SBD asset symbols on the wire, the operation-variant id table). Node builtins only — node:crypto for sha256/ripemd160/hmac, node:https for transport — no npm dependency tree. High-level helpers (post, vote, follow, reblog, transfer, claim) and a CLI sit on top.
- Capability tags from manifest/source hints: `cli`, `workspace-analysis`, `content-production`, `operations`
- Bins: `waggle`
- Export subpaths: `.`, `./package.json`, `./*`
- Scripts: `test`, `man`
- Dependencies: none

## Local Evidence

- sites/triage.bare-cedar-fog.emsenn.net/sites/archive.emsenn.net/dev/ref/src/from-content-source/apps/interface/waggle/README.md: > **waggle** — a zero-dependency Node↔Hive blockchain client, rederived from the ground up. > Named for the bees' waggle dance, the social signal by which a hive shares where to go. > It reads Hive over JSON-RPC and it *acts* on Hive: it builds, signs, and broadcasts transactions — votes, posts, comments, follows, reblogs, transfers, reward claims — using only Node builtins.
- Source hints: `bin/waggle.mjs`, `lib/base58.mjs`, `lib/chain.mjs`, `lib/client.d.ts`, `lib/client.mjs`, `lib/hash.mjs`, `lib/keys.mjs`, `lib/ops.mjs`, `lib/rpc.mjs`, `lib/secp256k1.mjs`, `lib/serialize.mjs`, `lib/transaction.mjs`, `tests/_harness.mjs`, `tests/_run_tests.mjs`, `tests/prove-crypto.mjs`, `tests/prove-rpc.mjs`, `tests/prove-serialize.mjs`, `tests/prove-transaction.mjs`

## Relation To Infography Baseline

- Direct surface overlap with `@emsenn/infography`: `.`, `./package.json`
- Capability classes not directly realized by infography's exported package surface: `content-production`, `operations`

This note is generated from manifest, nearby prose, and source-path evidence.
It should be checked against opened source before making migration or deletion decisions.
