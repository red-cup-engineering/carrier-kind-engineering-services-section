# Computer blockchain system services section

Parent home under Red Cup Engineering for every chain-specific blockchain
service the Union operates. Union enterprises that need blockchain/EVM
capability have a proper seat to offer and consume it from here, rather than
each hand-rolling its own.

## Holdings

- `services/ethereum-engineering-services-section` — Ethereum/EVM chain services, the
  first chain-specific section seated here.
- `services/cross-chain-services-section` — chain registry, multi-fork harness and deterministic
  deployment for Tidepool across EVM chains, Hive and Solana.

Chain-specific work seats under `services/` as its own section. Shared
non-chain-specific blockchain code, if any accumulates, seats here directly.

## Shared data core

Chain-specific sections build on the Union's cryptographic data core
at `computer-data-engineering-services-section/services/computer-data-cryptography-services-section`
(`secp256k1`, `keccak256`, and EVM identity/signing primitives) rather than
re-deriving key math. The chain orders and transports commitments; it does not
own their data semantics.

## Org

- **Over**: red-cup-engineering (Internal Market)
- **Owns**: services/ethereum-engineering-services-section, services/cross-chain-services-section
