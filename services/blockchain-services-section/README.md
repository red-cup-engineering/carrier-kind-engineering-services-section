# Blockchain Services Section

Parent home under Red Cup Engineering for every chain-specific blockchain
service the Union operates. Union enterprises that need blockchain/EVM
capability have a proper seat to offer and consume it from here, rather than
each hand-rolling its own.

## Holdings

- `services/ethereum-services-section` — Ethereum/EVM chain services, the
  first chain-specific section seated here.

Chain-specific work seats under `services/` as its own section. Shared
non-chain-specific blockchain code, if any accumulates, seats here directly.

## Shared core

Chain-specific sections build on the Union's canonical cryptographic core in
the sibling `cryptographic-services-section` (`secp256k1`, `keccak256`, EVM
identity/signing primitives) rather than re-deriving key math.

## Org

- **Over**: red-cup-engineering (Internal Market)
- **Owns**: services/ethereum-services-section
