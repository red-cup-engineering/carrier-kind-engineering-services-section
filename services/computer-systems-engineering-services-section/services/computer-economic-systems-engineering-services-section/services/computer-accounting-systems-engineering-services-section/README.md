# Computer Accounting Systems Engineering Services Section

This section holds computer systems that derive consumer-credit accounting
artifacts: reward-routing decisions over a principal's connected cards, and
the Beancount postings for a principal's reward events. Consolidated
2026-09-10 from two formerly sibling single-function packages under
`financial-engineering-services-section/consumer-credit-services-section`
(`route-card-rewards-service`, `derive-set-of-rewards-postings-service`),
per the section shape law: a services-section IS the package, never
fragmented into sibling single-function packages.

## Scripts

- `scripts/route-card-rewards.mjs` — routes one purchase to the best of a
  principal's connected cards: bonus-progress outranks an in-cap category
  multiplier, which outranks the base rate, and ties break on the lower
  foreign-transaction fee then the most cap headroom; every card is scored,
  and a mandate naming no cards refuses.
- `scripts/derive-set-of-rewards-postings.mjs` — derives Beancount
  transactions and price directives for a principal's reward events, keeping
  earned/redeemed/expired/transferred/statement-credit rewards as a
  multi-commodity double-entry ledger: earned posts the commodity from
  Income:Rewards, expired posts it to Expenses:Rewards:Expired, transferred
  moves it between two program accounts, statement-credit posts USD from
  Income:Rewards:Statement-Credits against the card's Liabilities account,
  and redeemed converts the commodity at the matching price directive's cost
  basis into Assets:Cash:Operating with the realized difference booked to
  Income:Rewards:Redemption-Gain or Expenses:Rewards:Redemption-Loss; a
  redemption with no covering price directive is skipped, and every
  referenced account gets one open directive.
