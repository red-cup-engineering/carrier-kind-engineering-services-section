# VPS A2A normative state

This historical state preserves the normative and deployment payloads from the
`2026-08-17-vps-services/a2a-services-section` source snapshot that are not
equivalent to the current A2A services section. The source was an independently
packaged A2A 1.0 provider; the active owner has since divided that responsibility
among capability-specific services.

The two RML files are intentionally historical. Their weak v2 predicates are
not silently substituted for the active packages' newer carrier, circuit,
custody, and refusal contracts. The EVM record is likewise a distinct
`org.emsenn.evm.sovereign-enterprise-account.v2` deployment witness; current
Agent Cards advertise later circuit-bound accounts, so the old account is not
asserted as active.

## Normalization ledger

The source tree manifest contained 19 files (29 entries including directories).
The deterministic corpus inventory found 19 unique byte hashes and no internal
exact or near-text families. Paths below are relative to the removed source
root.

| Source path | SHA-256 | Disposition |
| --- | --- | --- |
| `.gitignore` | `4d56952b0fb13bf8f9b6c13a6d4c34a075bac3af447636a1df4335d7576e2f97` | Exact active section-level witness retained. |
| `README.md` | `76b87c4d243672528687c1676b9ad7b57032b5680f1f002c7967d2fdbd8355bf` | Contract and boundary text is covered by the richer active section README. |
| `content/agent-cards/bare-cedar-fog-npu-inference-team.json` | `e11cf783b156eb1aca32fbd42d4b86907a52cf907097b8d918c703ee9d187338` | Covered by the active contracted-agent card, which preserves these fields and adds its required sovereign-circuit interface. |
| `content/agent-cards/gemini-inference-team.json` | `fe5fde5618e7a9e043f5113466be6c2a84e2e07204b33d27c4cc72d5c108e279` | Covered by the active contracted-agent card, which preserves these fields and adds its required sovereign-circuit interface. |
| `content/contracts/sends-rmn-task.rml` | `52994d2e4084faa9e2837960def1129409eb526056ef74e13fb7fd05b8b6222a` | Moved byte-for-byte to this state. |
| `content/contracts/serves-contracted-rmn-agent.rml` | `ed5289d6e2d595c2906a3a1915eaa3a0cdef42d67e1c28c190285e34014bae83` | Moved byte-for-byte to this state. |
| `content/evm/accounts/eip155-31337.json` | `ad5b2a74d3cb0f4a8312cf7fe65199bd11cd788b39209903b57fc31f93b08ce2` | Moved byte-for-byte to this state as a superseded v2 deployment witness. |
| `package-lock.json` | `eee748cb9cff7b2d2f82c40c84aa793c4bc27512726732531634eb6846f9d140` | Monolith-only dependency resolution; active split packages retain their own current locks. |
| `package.json` | `e7d4c970a3db8b481e402bb1bd9dda2b8426ae8b4b4cdc9ea430e5e93e4798db` | Every export and binary is owned by the five active capability packages named below. |
| `src/discover-agent-card.mjs` | `80063e00c3f5b55b7cb486d6f4497ff117ea363159bb86a20921b9169832aa8f` | Covered by `a2a-agent-card-discovery-service`; all four exports remain, with stricter signature verification and typed carriers. |
| `src/provision-agent-card-key.mjs` | `84037f07c7bf76ce8180e665b41cd4321da7d54c139c4dd92667b5ffd1cffe36` | Covered by `a2a-agent-card-key-service`; the active CLI deliberately names the key `--signing-key`. |
| `src/rmn-part.mjs` | `d5bb6675b2cf240df6fc8c39eb4cc354226887496ddb72a9137e0427723c28ec` | Covered by `a2a-rmn-part-service`; all exports remain with canonical NI validation and message constructors. |
| `src/send-rmn-task.mjs` | `b09032dbe1b02dbe30413d829741980761c8870dc31f6286bb21099919600128` | Covered by `a2a-rmn-task-client-service`; the active client adds signed discovery, authentication, lifecycle resumption, cancellation, and durable receipts. |
| `src/serve-contracted-agent.mjs` | `c10c6ad33af33cc72c74703841c5950a6eedec0603e9f733f2fe157bebdff016` | Covered by `a2a-contracted-agent-service`; the active server preserves serving/signing behavior and adds explicit durable state and cancellation. |
| `test/a2a-provider.test.mjs` | `a1970ff8c3abfa63feb90b8e712ef5ebb23e8126de7d679cd9bae4e298837ae1` | Covered by the active discovery, RMN-part, client, and contracted-agent test suites. |
| `test/fixtures/agent-card.json` | `efc5b36762a315ec872d748eeb1097216b9c11df0d013468cca7dc8cd225063d` | Covered by the richer active contracted-agent fixture. |
| `test/fixtures/echo-rmn.mjs` | `b91481872343d7d71ae664bf69d83600f229e5b21957b9f599bd4b8f0c192946` | Exact active contracted-agent fixture retained. |
| `test/gemini-contracted-agent.test.mjs` | `e41b2f37080d007fcfc7f32d792e63fc965d7b1169a03ac4e59d4c4f52c009ac` | Its obsolete cross-tree integration is superseded by the active contracted-agent and inference-service tests; its old relative owners no longer exist. |
| `types/client.d.mts` | `a9afa194adec7633eb7274761031deb1b0b7cb6e94a35f9fb8ab29924ea5e7da` | Covered by the expanded active RMN task-client declaration. |

The retired predecessor carrier
`retired-a2a-carrier-before-signed-cards.19523d1446af738e2d72c56021166a15293886d383d6b14d8d5f928371691fd9.tar.gz`
contained only `package.json`, `package-lock.json`, `src/rmn-part.mjs`,
`src/send-rmn-task.mjs`, and `src/serve-contracted-agent.mjs`. Its RMN-part
payload was byte-identical to the inventoried source; its other four payloads
were earlier revisions wholly covered by the inventoried source and the active
services. The carrier therefore has no independent retained payload.

Original source root:
`lib/emsenn/services/561-group/lib/legacy/2026-08-17-vps-services/a2a-services-section`.
