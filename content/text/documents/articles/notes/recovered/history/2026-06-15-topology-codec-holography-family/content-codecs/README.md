# @561-group/content-codecs

Content demand codecs: coders/decoders between this workspace's demand
records and external demand representations. One module so far — Google
Search Console (`./search-console`, also re-exported from the root). A
codec here is pure value translation: this package performs no network or
filesystem I/O, reads no clock, and decides nothing about what to publish.

## Consumer contract

- **Zero runtime dependencies** (codec law L4): nothing is carried, nothing
  is borrowed.
- All returned records are frozen; functions are pure.
- `TypeError` is thrown for malformed shapes only. Meaningful absences are
  values: a Search Analytics response without `rows` decodes to `[]`.
- Time enters as parameters (`issuedAt`/`expiresAt`, seconds since epoch);
  the caller supplies the clock as testimony.
- `apps/content-computer` (`./demand`) binds these codecs to fetch and the
  key file; sites consume the resulting records.

## Quick start

```ts
import {
  encodeServiceAccountAssertion,
  decodeTokenResponse,
  encodeSearchAnalyticsQuery,
  decodeSearchAnalyticsRows,
  searchAnalyticsEndpoint,
  SEARCH_CONSOLE_TOKEN_AUDIENCE,
} from "@561-group/content-codecs/search-console";

const assertion = encodeServiceAccountAssertion({
  clientEmail: "robot@project.iam.gserviceaccount.com",
  privateKeyPem,            // from the service-account key file
  issuedAt: nowSeconds,     // the caller's clock, as a value
  expiresAt: nowSeconds + 3600,
});
// POST grant_type=jwt-bearer&assertion=… to SEARCH_CONSOLE_TOKEN_AUDIENCE,
// then decodeTokenResponse(json) → { accessToken, expiresIn }.

const body = encodeSearchAnalyticsQuery({ startDate: "2026-05-15", endDate: "2026-06-11" });
// POST body to searchAnalyticsEndpoint("sc-domain:koios.news"), then
const queries = decodeSearchAnalyticsRows(json); // readonly DemandAssertion[]
```

## Export groups

- **Objects**: `DemandAssertion`, `TokenGrant`,
  `ServiceAccountAssertionInput`, `SearchAnalyticsQueryInput`,
  `SearchAnalyticsQuery`.
- **Morphisms**: `encodeServiceAccountAssertion`, `decodeTokenResponse`,
  `encodeSearchAnalyticsQuery`, `decodeSearchAnalyticsRows`,
  `searchAnalyticsEndpoint`.
- **Constants**: `SEARCH_CONSOLE_SCOPE`, `SEARCH_CONSOLE_TOKEN_AUDIENCE`.
