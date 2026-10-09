# openFDA Services Section

A client for [openFDA](https://open.fda.gov/apis/), the FDA's public API over
its published datasets. No key is needed below 1,000 requests a day per IP;
an `OPENFDA_API_KEY` raises that to 120,000.

- `openfdaQuery(endpoint, params)`: one page: `{ meta, results, next }`, where
  `next` is the API's own link to the following page (openFDA pages past its
  25,000-record skip limit by `search_after`, which it hands out in the `Link`
  header). A query with no matches answers an empty page, not an error.
- `openfdaAll(endpoint, params, { limit })`: every result across pages.
- `openfdaCount(endpoint, { search, count })`: a count query's terms and counts.
- `DEVICE_REGISTRATION_LISTING`: `device/registrationlisting`, one record per
  device listing, carrying the establishment's registration (name, address,
  country, registration expiry year, owner/operator and official
  correspondent) and its US agent.

Used by the US representation business to read Chinese device
establishments and the US agents they pay.
