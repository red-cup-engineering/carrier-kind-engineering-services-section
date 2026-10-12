# MARSH candidate assessment receipt

Assessment custody: `/tmp/muse-marsh-assessment-20260927-01`.

## Invocation and observed result

Exact outer invocation: [assessment-invocation.txt](assessment-invocation.txt), SHA-256 `445facb8018c73aca957ab4c418d78d6d925ecba62d103e59f197ee7f4b69453`. It runs the committed private runner inside `bwrap` with network and PID namespaces unshared, cleared environment, the toolchain mounted read-only, and this custody as the writable `/work`. The runner builds the reader fixture, runs the private Foundry suite, starts local Anvil at chain ID 8453, installs local Multicall fixture code, deploys the fixture locally, and calls the protected reader through an injected viem client.

The runner's original stdout was not persisted at execution time; the exact observed stdout retained from the tool transcript is [assessment.stdout.log](assessment.stdout.log), SHA-256 `c434eae198cb9fd3771225c2367f8dbc7e2be567d80e93f937aa91c69c27a119`:

```
independent-solidity-assay: 9 passed, 0 failed, 0 skipped
candidate-current-head: decoded; chain=8453; block=1; provider=private-anvil
legacy-raw-key-head: decoded; chain=8453; block=1; provider=private-anvil
absent-resource: null; chain=8453; block=1; provider=private-anvil
fixture-only: local Anvil chain 8453; not live Base finality
```

The Foundry aggregate represents successful effect assertions, including 10 expected reverts, 5 successful admissions (4 candidate-bound and 1 legacy-fixture), and 1 successful CAS transition. The protected reader made 3 calls: 2 decoded values and 1 absent-resource `null`; no RPC failures. Per-test raw traces were not persisted; only these aggregate observations are retained.

## Bound inputs and digests

- Assay commitment: `assay-commitment.json`, SHA-256 `1448e38482d41508544ec76395deb8259a2ac27f464b3421649b92bac4af55c9`.
- Candidate receipt/public-input manifest: `candidate-manifest.json`, SHA-256 `183f29b314de1ccd00e202240ad536b158cad85dac3601246b9530a09962d560`.
- Candidate `src/MARSH.sol`: SHA-256 `3853999734381791821beca7de40e209f29151b925ddee8a59935922122be1dd`.
- Predecessor MARSH input digest (per candidate manifest): `10d762d961e1ee86807c65b2d3679cc0add558e63c2aa43a458573d5041b4c87`.
- `foundry.toml`: `3898856eff7f2855b51f8fdba9d39a297f80c0a9c1f8e614e34efc83ef3a29e8`.
- Independent Solidity assay source: `d86405832d1b053cfa1e03d00f8f89789cc11b16b62d100232af61d307c5a091`.
- Legacy fixture: `922f48393e43479c2999d72d33813f22ef5234244914b8d49e9e891740a37a6f`.
- Reader fixture: `204b98aeca7b2dab152410c3df78139bb2d42daa0e5284c5ffae7984c47e923d`.
- Protected reader source: `a5c51ad9d344daae8c857e9daea20030fb7ace4d2413bea3781c913a657e80b8`.
- Public pool source: `9071ccea6c2aebac6870bd1134b4f91500cc66fba0a390b1633fcb10bde51c6a`.
- Private reader adapter: `5a3d2e13aaa604f1d3dbe3563b9fc25f06065be165d69b7317bd69d987e42a62`.
- Reader check: `aaa1c1829af019f464e51db56ba6ef3a87eb672536f9b508e275ab2caf9c56cb`.
- ESM loader: `805dcbc61640279fdd10e326764b14bbf50f88f8e9d6083448c9952ddbc2a912`.
- Assessment runner: `c2f4aed02de2853806822a8a2b29e5a018b62034d6a6ef1b83a369eaeaee6a61`.
- Generated migration test (not used as independent acceptance): `6d27c10da91c7d2a319a44f584470b44ad31d6c3f6a37df08d9f89dc7aed9f38`.

## Toolchain

- Foundry `1.8.3`, commit `cae51ad458f6abb64852b7709eb784352429825d`; forge SHA-256 `deb412a722e873e11e60051deb9d403b584a2d7e49d8b9ee68441edfea215e9c`; anvil `674a06c97a01350cd00241762bbfb01ebcafce9b6e8cbd6c8758ecea6ef4b968`; cast `1412cb2374f68032ce2c73a3fcb04e0e02a8d2b1744c160456ce513bdb2416da`.
- solc `0.8.28+commit.7893614a`, SHA-256 `9a0fb7e0db2c0641dbae1c5cc645dc686820c83af516226abb1c0a2f76636f25`.
- Node `24.19.0`, copied runtime SHA-256 `bc17c508ffeed0ec622934f9b7fa72f8e78da65350e63c3eceb56fa688aa5e12`; viem `2.55.4`.
- bubblewrap `0.9.0`, SHA-256 `52231e1caf55bcbc667b269f49c63599a6f7db4767ae6a039580d0ff853db712`.

## Limits

All calls were confined to local Anvil; network and PID namespaces were unshared, credentials/repository home were not mounted, and no external chain was contacted. Chain ID 8453 and the pinned fixture block exercise the real reader/ABI path against a private provider only; this does not establish live Base access, finality, or production deployment behavior. The reader's provider seam was injected for the fixture. Generated migration tests were not counted as independent acceptance. No source, deployment, key, or secret was changed or used.
