# Cryptographic Services Section

The union's single canonical cryptographic core. One audited secp256k1 curve and
one keccak256 serve every settlement family — Hive/graphene *and* every EVM chain —
so no downstream enterprise hand-rolls its own key math. Offered to the RCE
Internal Market as a directly contractable service.

## Holdings

- `src/secp256k1.mjs` — BigInt secp256k1 (keygen, RFC6979 signing, low-S, recovery).
  Shared by Hive and EVM; consuming enterprises import from here.
- `src/keccak256.mjs` — Ethereum-pad keccak-256 (node:crypto ships only SHA-3, which
  is not interchangeable).
- `src/hash.mjs` — sha256 / hmac-sha256 / ripemd160.
- `src/evm.mjs` — EVM identity & signing: address derivation, EIP-55 checksum,
  `signDigest` (v-encoded), EIP-191 `signMessage`, `recoverAddress`. The primitives
  x402 settlement needs.
- `src/cryptographic-services.mjs` — the ActivityStreams `solicit-service`/`invoke-service` contract face; stdin carries one addressed activity and positional direct-invocation bypasses are refused by omission.

## Correctness

`npm test` checks the core against published Ethereum vectors — keccak256 empty and
`"abc"` digests, the EIP-155 canonical address, private-key-1 address, EIP-55 casing,
and sign→recover round-trips. These keys hold value; the primitives are proven, not
asserted.

## Boundary

The section derives identity and produces signatures. It never broadcasts, never
moves value, and never persists a private key — key custody and settlement
broadcast belong to the holding enterprise (e.g. aagaard for Hive; the x402-metered
service for EVM payments). This is pure compute behind a contract face.

## Org

- **Over**: red-cup-engineering (Internal Market)
- **Owns**: (no child teams yet)

## Migration note

aagaard currently carries its own copy of the secp256k1 curve under
`.../hive/waggle/`. The consolidation this section exists for is completed by
repointing aagaard's waggle at this module; until then, treat this section's copy
as canonical and aagaard's as legacy pending retirement.
