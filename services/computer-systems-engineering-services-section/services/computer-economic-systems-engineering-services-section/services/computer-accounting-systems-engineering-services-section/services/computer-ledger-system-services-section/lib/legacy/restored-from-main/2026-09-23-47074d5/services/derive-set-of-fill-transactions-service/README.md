# @red-cup-engineering/derive-set-of-fill-transactions-service

Derives Beancount transactions for a chronologically ordered set of venue fills: a FIFO cost-basis lot per custody-account/base-commodity pair opened on each buy with Beancount total-cost `{{...}}` syntax, consumed exactly on each sell with the realized gain or loss posted against the settled proceeds, a separate fee posting when a fill's fee is not already netted into its settled amount, and a refusal (never a booking) for any fill whose supplied witness nodes disagree.

## Operation

~~~js
export function deriveSetOfFillTransactions(input)
~~~

### Parameters

- input ({ fills: readonly object[], openAccounts?: readonly string[], realizedGainAccount?: string, realizedLossAccount?: string }): A chronologically ordered set of venue fills to render as Beancount transactions, the account names the ledger already has open, and optional realized-gain/loss account overrides. Each fill: `{ venue, account, fillId, date, side: "buy"|"sell", baseCommodity, quoteCommodity, baseQuantity, quoteAmount, feeAmount?, feeCommodity?, feeAccount?, custodyAccount, mandateId, narration?, witnessBlock?, witnesses? }`.

### Returns

VenueFillTransactionSet: `{ type: "VenueFillTransactionSet", version: 1, transactionCount, transactions, accountsToOpen, refusals }`.

### Refusals

- TypeError: When `input.fills` is not an array or a fill is malformed.
- RangeError: When a sell fill's `baseQuantity` exceeds the open lot inventory for its custody account and base commodity.
- A fill carrying two or more `witnesses` whose `databaseHash` values disagree is listed under `refusals` (reason `witness-disagreement`) rather than thrown or booked.

## Command

derive-set-of-fill-transactions reads one JSON value on stdin and writes one JSON value to stdout.

## Examples

### derive-set-of-fill-transactions example

~~~json
{
  "input": {
    "openAccounts": ["Assets:Digital-Assets:HiveEngine:Unclassified", "Income:Investment:Realized-Gains"],
    "fills": [
      {
        "venue": "hive-engine", "account": "michael561",
        "fillId": "a6308f23ba5026f1e670e61cea257eaf62524322-0", "date": "2026-09-05", "side": "buy",
        "baseCommodity": "GLD", "quoteCommodity": "SWAP.HIVE", "baseQuantity": "4.1917", "quoteAmount": "0.99502065",
        "custodyAccount": "Assets:Digital-Assets:HiveEngine:Unclassified", "mandateId": "manual-michael561-gld-round-trip"
      },
      {
        "venue": "hive-engine", "account": "michael561",
        "fillId": "5f6ff58a3be67498734d57ba0c9e5ef4230fa26f", "date": "2026-09-05", "side": "sell",
        "baseCommodity": "GLD", "quoteCommodity": "SWAP.HIVE", "baseQuantity": "4.1917", "quoteAmount": "1.02172637",
        "custodyAccount": "Assets:Digital-Assets:HiveEngine:Unclassified", "mandateId": "manual-michael561-gld-round-trip"
      }
    ]
  },
  "output": {
    "type": "VenueFillTransactionSet",
    "version": 1,
    "transactionCount": 2,
    "accountsToOpen": [],
    "refusals": []
  }
}
~~~

The second (`sell`) transaction's `realized` field is the exact FIFO gain: `1.02172637 - 0.99502065 = 0.02670572 SWAP.HIVE`, posted to `Income:Investment:Realized-Gains`.
