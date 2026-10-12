# x402 settlement derivation

Seller settlements are corroborated by `corroborateMarketSellerSettlements`
(`src/settlement-derivation/book-market-seller-settlements.mjs`), which checks each stored seller
settlement witness against the chain and refuses any transfer that lacks a transaction-time
offer snapshot.

group-operations' daily financial readout tells the corroborated settlements as outcomes
(organizing enterprise/outcomes). The entity's book of judged deliveries lives in node state.
Nothing appends to the authored ledger: there is no candidate record, no Beancount derivation and
no chain-scan observer in this collection.
