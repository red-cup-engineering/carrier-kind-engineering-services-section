# Hive blockchain client

This plain Node package reads Hive state and builds, serializes, signs, and broadcasts
Hive transactions. Fleet operations and Hive computing use this client directly.

- `src/client.mjs` exposes `HiveClient`: every read, and role-specific signing and submission for social, wallet, savings, conversion, delegation and market operations.
- `src/ops.mjs` and `src/serialize.mjs` hold Hive operation fields and binary wire rules.
- `src/keys.mjs` and `src/transaction.mjs` handle Hive key formats and transaction identity.
- Cryptographic primitives come from `cryptographic-computer-data-engineering-services-section`.
- Base58 comes from `computer-data-serialization-services-section/base58`.
- Bounded HTTP exchanges come from `http-services-section/json-rpc`; `src/rpc.mjs`
  supplies the Hive endpoint rotation and failover policy.

Run the offline crypto, serialization, RPC failover, and transaction proofs with
`node test/_run_tests.mjs`. No compilation is required.

The CLI is `node scripts/hive-client.mjs`; for example, `account hiveio` reads account
state. Signing and broadcasting require an explicitly selected account and key role.

## Usage (library)

```js
import { HiveClient } from "@red-cup-engineering/hive-blockchain-client-service";

// reads need no keys
const hive = new HiveClient();
const [acct] = await hive.getAccounts(["hiveio"]);
const trending = await hive.getRankedPosts({ sort: "trending", tag: "photography", limit: 10 });

// writes: supply WIF keys per role (posting for social, active for value)
const me = new HiveClient({ account: "alice", keys: { posting: process.env.POSTING_WIF } });
await me.vote({ author: "bob", permlink: "a-post", weight: 10000 });
await me.follow("bob");
await me.post({ title: "Hello Hive", body: "# hi\nfrom hive-client", tags: ["hive", "introduceyourself"] });

// internal-market limit orders — active key
const trader = new HiveClient({ account: "alice", keys: { active: process.env.ACTIVE_WIF } });
await trader.limitOrderCreate({ orderid: 1, amount_to_sell: "10.000 HIVE", min_to_receive: "0.500 HBD", expiration: 1718000000 });
await trader.limitOrderCancel({ orderid: 1 });
```

## Notes & limits

- **No memo encryption yet.** Transfers carry plaintext memos; encrypted (`#`-prefixed) memos are not implemented.
- **Single-sig.** One key per role; multi-sig authorities are not assembled (the serializer supports `authority` structs, the high-level API does not yet drive them).
- **Mainnet only.** The chain id and `STM` prefix are pinned to mainnet.
- The CLI reads keys from the environment (`HIVE_ACCOUNT`, `HIVE_POSTING_KEY`, `HIVE_ACTIVE_KEY`); it never writes them to disk.

Exact balances, reward conversions and order-book quantities use the canonical exact-number data supplier, including its commodity-graded carrier. The client no longer depends on the machine-wide computer-data package. A source consumer demonstrated HIVE/VESTS conversion beyond binary floating-point precision without quantity loss. Crypto, transport, text and order-book supplier delivery still require closure; this does not claim a fully independent installation or live custody migration.

Signing and hashing now use `@red-cup-engineering/cryptographic-data-service`; provisioning and signature verification use that same supplier, including its preserved sealing API. These consumers no longer depend on the crypto service-offer command package or its JSON/RDF dependencies. Protocol formatting and host admission remain separate responsibilities. This changes shared method delivery, not signing or asset authority.

## Independent source consumption

The recovered source client depends on published-form suppliers rather than snapshot `workspace:*` packages. Packing this client and its six suppliers, installing their archives into a fresh npm project with local archive overrides (`npm install --offline --ignore-scripts`), then running `test/independent-consumer.mjs` demonstrates HTTP account retrieval against a local fixture, exact book cost above the JavaScript safe-integer range, commodity mismatch refusal, WIF key roundtrip and title-permlink generation. The fixture makes no live chain writes or claims of account authority. Local archive overrides demonstrate source closure, not registry availability, deployed migration, complete protocol coverage or Board hiring.

Local fixture binding uses `localhost` rather than forcing IPv4. On this laptop, a minimal Node HTTP server/client pair refused 127.0.0.1 connections while ::1 succeeded; the same consumer succeeded using localhost. This separates observed host transport friction from Hive protocol behavior without claiming its system cause is resolved.
