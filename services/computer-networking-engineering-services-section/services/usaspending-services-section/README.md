# USAspending Services Section

USAspending.gov's award-search API (`api.usaspending.gov`): federal grants and cooperative
agreements by agency, keyword and time period. Public, keyless, JSON.

- `src/client.mjs`: `searchAwards` (one page) and `searchAwardsAll` (an async generator over
  every matching award, newest/largest first).

Used to find real federal buyer-side funders of a market — who a program actually paid, and how
much — not to place any award or request on the founder's behalf.
