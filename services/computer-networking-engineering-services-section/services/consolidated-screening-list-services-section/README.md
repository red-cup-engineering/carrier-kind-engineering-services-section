# Consolidated Screening List Services Section

The US government's [consolidated screening list](https://www.trade.gov/consolidated-screening-list):
one list of every party restricted by the Treasury (SDN, sectoral, CAPTA and
other OFAC lists), Commerce (Entity List, Military End User List, Unverified
List, Denied Persons List) and State. The International Trade Administration
publishes it whole and free, no key, at
`https://data.trade.gov/downloadable_consolidated_screening_list/v1/consolidated.json`
(about 34 MB).

- `src/client.mjs`: `fetchConsolidatedList()` downloads it and returns its
  entries (name, alt names, addresses, ids, programs, source list, type).
- `src/screen.mjs`: screening a name against those entries with the text-comparison service's
  name matcher (`match-names`: names folded, company forms ignored, words weighted by how rare
  they are on the list). An exact match is `listed`, a near one `possible`, an exact match on
  OFAC's SDN list `blocked` (US persons may not deal with that party at all); the whole reads
  `clear` with no match. Each match names the list it comes from.

Screening reads a match by the list it comes from; the law is in the law
science note on doing business with and for Chinese firms (§5).
