# @red-cup-engineering/derive-set-of-x402-settlement-transactions-service

Derive Beancount transaction candidates for a set of chain-read x402 USDC settlements to one
gateway's receiver, converting each settlement's atomic USDC amount to an exact decimal and
posting it to that gateway's `Income:Sales:X402:<Gateway>` account against the shared Base
USDC asset account, `Assets:Digital-Assets:EVM:Base:Tokens`. A settlement is booked only when
it carries a second witness -- the `witnessGraphId` computed by
`@red-cup-engineering/x402-settlement-witness-identity` from its (network, transactionHash) --
beside the chain-read observation itself; a settlement missing that second witness is refused,
never booked and never treated as a zero amount. When `input.settlements` is empty, the
gateway's income account (and the shared asset account, when not already open) are still
derived for opening, dated `input.asOf`.

## Operation

~~~js
export function deriveSetOfX402SettlementTransactions(input)
~~~

### Parameters

- input ({ settlements: readonly object[], receiver: string, gateway: string,
 *   priceDirectives?: readonly object[], openAccounts?: readonly string[], asOf?: string }): 

Each entry of `settlements` additionally needs, beside `transactionHash`/`payer`/`amount`/
`blockTime`/`witnessGraphId`: `asset` and `receiver` (the exact Base USDC contract and payout
address the settlement's event bound to), `logIndex` (decimal or `0x`-hex), an `evidenceId`
(a non-empty string identifying evidence beside the chain-read witness), and a `recognition`
object -- `{kind: "revenue", account, contractId, performanceId}`,
`{kind: "advance", account, contractId}`, or `{kind: "receivable-collection", account, invoiceId}`
-- naming which ledger account the sale credits and why. A settlement missing any of these is
refused (`refusals` entry, never booked, never a thrown error) rather than treated as
malformed input.

### Returns

{ type: "X402SettlementTransactionSet", version: 1, gateway: string, receiver: string,
 *   assetAccount: string, incomeAccount: string, transactionCount: number,
 *   transactions: readonly object[], accountsToOpen: readonly object[], refusals: readonly object[] }: 

### Refusals

Soft (recorded in the returned `refusals` array, never thrown, never booked as a zero amount):
a settlement missing `witnessGraphId` (`missing-second-witness`), missing `recognition`/
`evidenceId` (`missing-recognition-or-evidence`), whose `network`/`asset`/`receiver` do not
match the call's own Base-mainnet-USDC/`input.receiver` binding (`event-binding-mismatch`), or
whose `transactionHash` collides with another settlement in the same call
(`multiple-receiver-transfers-in-one-transaction`, from the observer companion below).

Hard (thrown):

- TypeError: When `input.settlements` is not an array, `input.receiver`/`input.gateway` is not a non-empty string, or a settlement that already cleared the soft refusals above is otherwise malformed (a bad `transactionHash`/`payer`/`amount`/`blockTime`/`logIndex`/hex field).
- RangeError: When `input.settlements` is empty and `input.asOf` is not a `YYYY-MM-DD` string.

## Command

derive-set-of-x402-settlement-transactions reads one JSON value per input line and writes one JSON value per output line.

## Read-only observer companion

`scripts/observe-set-of-x402-settlements.mjs` (`observeSetOfX402Settlements`, exported as
`./observe`) chain-reads Base USDC settlements to feed this operation: it composes
`chainTip`/`BASE_USDC` from `@red-cup-engineering/x402-market-observation-service` and
`settlementWitnessGraphId` from `@red-cup-engineering/x402-settlement-witness-identity`, requires
two independent public RPC nodes to agree on every matched ERC-20 `Transfer` log before
reporting it, and never carries the receiver it was called with in its own return value. Its CLI
face reads the receiver from `X402_SETTLEMENT_OBSERVER_RECEIVER` (never a flag, so it never
appears in `argv`/process listings) and an optional `--window <blocks>`, writing the same
`{ok, network, fromBlock, toBlock, settlements, disagreements}` shape to stdout. Hand-authored
beside the fabricated operation above (the fabrication line covers a pure JSON-in/JSON-out
transform; a live, two-node-witnessed chain read is not that shape), mirroring
`x402-market-observation-service`'s own hand-authored `scripts/observe.mjs`.

### Backfilling a contiguous historical range

A single `observeSetOfX402Settlements` call is bounded by whichever pair of the three public
Base RPC endpoints (`mainnet.base.org`, `base.drpc.org`, `base-rpc.publicnode.com`) it lands on
-- each caps non-archive `eth_getLogs` ranges at its own undocumented, provider-controlled
threshold well inside the library's 20,000-block hard limit. `backfillSetOfX402Settlements`
(same file) covers a wide, contiguous span by chunking it: for each chunk it tries
`DEFAULT_CHUNK_WINDOW_CANDIDATES` (10,000 blocks down to 1) largest-first, keeping the first
size both providers accept for that exact `[fromBlock, toBlock]`, so it adapts to whichever
provider pair a given chunk happens to land on instead of assuming the worst case throughout.
After every completed chunk it persists `{nextFromBlock, receiver, lastCompletedAt}` to
`data/state/x402-settlement-backfill-cursor.json`, so a later call with no explicit `fromBlock`
resumes exactly where the previous one stopped -- the timer resumes a backfill across restarts
the same way it discovers its own window each run. `estimateBlockForTimestamp` (same file)
gives a starting `--from-block` for a target date from the chain tip's own header timestamp and
Base's ~2-second block time, for a one-off historical run; it is an estimate, not a claim of
exact block-time linearity.

The CLI passes `--from-block <n>` and/or `--to-block <n>` straight to `backfillSetOfX402Settlements`
(`--to-block` alone still needs a persisted cursor or a prior `--from-block` run; omitting
`--to-block` reads to the current tip). With neither flag it keeps the single-window
`observeSetOfX402Settlements` behavior the recorder below relies on.

## Scheduled settlement-candidate recorder

`scripts/record-set-of-x402-settlement-candidates.mjs` (`recordSetOfX402SettlementCandidates`)
puts the observer and this operation on a timer, for gateway `paid-ephemeris-gateway`: it calls
`observeSetOfX402Settlements` for the receiver named by `X402_SETTLEMENT_OBSERVER_RECEIVER`
(never a flag), discovering the largest read window the public read pool currently accepts by
trying candidate windows from 50,000 blocks down to 1 and keeping the first that succeeds
(`--window <blocks>` names one explicitly instead); attaches each candidate's `witnessGraphId`
via `settlementWitnessGraphId`; supplies the minimal honest revenue-recognition classification a
chain-only observation can support (`spotSaleRecognition`: `{kind: "revenue", account:
incomeAccountFor(gateway), contractId: transactionHash, performanceId: transactionHash}` -- a
walk-up x402 call has no separate standing contract, so the settling transaction stands as both,
and an `evidenceId` of `evm:<network>:tx:<transactionHash>`, since the two-provider-agreed
on-chain transfer is the only evidence a chain read has; see `RECOGNITION_LIMITATION` in the
source for the exact text carried onto the journaled record as `recognitionLimitation`); and
pipes the result into `deriveSetOfX402SettlementTransactions`, which now books rather than
refuses every witnessed settlement. It journals one dated record per run, category
`x402-settlement-candidates`, through `@red-cup-engineering/semantic-record-journal-service`
(root: this package), mirrored as a dated JSON file under `data/records/` for human legibility;
`--dry-run` observes and derives without writing either. It exits `0` on a successful
observation even with zero settlements, `1` when the observer never succeeds.

Two limits are load-bearing. First, this is a **receiver-level** observation: the receiver
settles for several x402 gateways sharing one payout address, and every settlement found is
attributed to `paid-ephemeris-gateway` on the operator's own say-so, never from a per-gateway
signal present in the chain read itself -- the journaled record carries this limitation as
text (`gatewayAttributionLimitation`). Second, the free-tier public RPC endpoints this package
reads from (`mainnet.base.org`, `base-rpc.publicnode.com`, `base.drpc.org`) cap non-archive
`eth_getLogs` ranges well inside the library's own 20,000-block hard limit, often to a window
of only a few minutes of Base chain history; the actual window on any run is whatever
`record-set-of-x402-settlement-candidates.mjs` discovers by trying candidate windows from
50,000 blocks down to 1, and is carried in the settlement-candidate record that run journals,
not hand-reported here. Reaching further back into the Group's settlement history is
`backfillSetOfX402Settlements` (above), run as a one-off with an explicit `--from-block`; the
recorder's own runs should be invoked deliberately with an explicit operator decision.

## Examples

### a two-witness $0.51 USDC advance books against the recognized contract account

Input:

~~~json
{
  "receiver": "0x1111111111111111111111111111111111111111",
  "gateway": "public-solar",
  "openAccounts": [
    "Assets:Digital-Assets:EVM:Base:Tokens"
  ],
  "settlements": [
    {
      "transactionHash": "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "payer": "0xpayer000000000000000000000000000000000",
      "amount": "510000",
      "blockTime": "2026-09-05T14:00:00Z",
      "witnessGraphId": "ni:///sha-256;abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHI",
      "asset": "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
      "receiver": "0x1111111111111111111111111111111111111111",
      "logIndex": 0,
      "evidenceId": "ni:///sha-256;receipt",
      "recognition": { "kind": "advance", "account": "Liabilities:Contract", "contractId": "contract:1" }
    }
  ]
}
~~~

Output:

~~~json
{
  "type": "X402SettlementTransactionSet",
  "version": 1,
  "gateway": "public-solar",
  "receiver": "0x1111111111111111111111111111111111111111",
  "assetAccount": "Assets:Digital-Assets:EVM:Base:Tokens",
  "incomeAccount": "Income:Sales:X402:Public-solar",
  "transactionCount": 1,
  "transactions": [
    {
      "date": "2026-09-05",
      "narration": "x402 advance via public-solar",
      "transactionHash": "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "network": "eip155:8453",
      "payer": "0xpayer000000000000000000000000000000000",
      "amount": "0.51",
      "amountUsd": null,
      "witnessGraphId": "ni:///sha-256;abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHI",
      "directive": "2026-09-05 * \"x402 advance via public-solar\"\n  source_id: \"evm:eip155:8453:0x833589fcd6edb6e08f4c7c32d4f71b54bda02913:0x1111111111111111111111111111111111111111:0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa:0\"\n  payer: \"0xpayer000000000000000000000000000000000\"\n  network: \"eip155:8453\"\n  witness_graph_id: \"ni:///sha-256;abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHI\"\n  evidence_ids: \"[\"ni:///sha-256;receipt\"]\"\n  gateway: \"public-solar\"\n  receiver: \"0x1111111111111111111111111111111111111111\"\n  recognition: \"advance\"\n  Assets:Digital-Assets:EVM:Base:Tokens  0.51 USDC\n  Liabilities:Contract  -0.51 USDC"
    }
  ],
  "accountsToOpen": [
    {
      "account": "Liabilities:Contract",
      "date": "2026-09-05",
      "directive": "2026-09-05 open Liabilities:Contract"
    }
  ],
  "refusals": []
}
~~~

Note the account credited is `recognition.account` (the caller's own classification), not
automatically `incomeAccount` -- `incomeAccount` in the returned envelope is the gateway's
default income account, opened as shown when `input.settlements` is empty, and is what
`record-set-of-x402-settlement-candidates.mjs`'s `spotSaleRecognition` posts every settlement to.
