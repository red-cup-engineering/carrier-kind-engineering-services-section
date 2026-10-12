# Blockchain Trashpanda

This package owns deterministic, zero-custody evaluation of Base pre-sign
policies and proposed market actions. It accepts declared policy and evidence,
then returns replayable admission or refusal receipts; it never receives keys,
signs, broadcasts, holds custody, or executes a trade.

The accompanying admission and production-assay modules retain the operational
evidence needed to establish those evaluations. Virtuals ACP brokerage transport
is intentionally owned by `virtuals-brokerage-products-border`, not here.
