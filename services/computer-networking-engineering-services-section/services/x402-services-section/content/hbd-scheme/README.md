# x402 HBD scheme service

The x402 HBD scheme, in one package with three operations:

- `form-hbd-payment-requirement` (`./form-hbd-payment-requirement`, `formHbdPaymentRequirement`) forms one HBD payment requirement for a priced resource, identified by its canonical CBOR content identity.
- `verify-hbd-payment` (`./verify-hbd-payment`, `verifyHbdPayment`) verifies one HBD transfer against the Hive chain through the house Hive client.
- `settle-hbd-purchase` (`./settle-hbd-purchase`, `settleHbdPurchase`) settles one verified purchase into a witnessed settlement record under the shared settlement-witness graph identity.

Each operation is a script export and a bin that reads one JSON request on standard input through the house Node operation runner.
The three work orders under `content/text/documents/specifications/` are the specifications they were fabricated from.

The HBD operations are modules of this one x402 collection: `./hbd/form-payment-requirement`, `./hbd/verify-payment`, and `./hbd/settle-purchase`. The Hive adapter consumes them through those modules; no separate HBD or Hive x402 package remains.
HBD over Hive is a different rail from the EVM exact scheme the one market (market.
561.group) settles on, which is why that seller is not yet a catalog entry; see the market app's not-yet-foldable finding.
