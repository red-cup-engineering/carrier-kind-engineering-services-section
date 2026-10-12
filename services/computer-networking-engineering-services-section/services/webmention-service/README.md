# Webmention service

This active lower application implements the Webmention protocol boundary without
requiring a publishing engine or database. It provides:

- target endpoint discovery, preferring HTTP `Link` metadata before HTML
  `rel=webmention` links;
- source retrieval, exact target-link verification, deletion/retraction handling,
  and reply/like/repost/bookmark/ordinary-mention classification;
- sender and receiver functions with explicit network-policy boundaries;
- an HTTP application resource whose required `custody(record)` callback is the
  handoff to storage, moderation, queues, or a larger application such as VICTOR.

The default network policy authorizes the initial URL and every redirect, rejects
credentials, localhost, IP literals in private/special ranges, and hostnames that
resolve to any such address. An injected `authorize` policy can narrow or replace
that behavior. Deployments that need a hard DNS-rebinding guarantee should also
inject a transport which pins the authorized address; authorization before a
general-purpose fetch cannot eliminate DNS time-of-check/time-of-use by itself.

```ts
import { webmentionReceiverApp } from "@red-cup-engineering/webmention-service";

const app = webmentionReceiverApp({
  ownsTarget: (target) => target.origin === "https://example.test",
  custody: async (record) => mentions.put(`${record.target} ${record.source}`, record),
});
```

The receiver accepts the standard URL-encoded `source` and `target` fields. It
verifies before custody and acknowledges with `202` only after custody succeeds.
Invalid ownership is rejected before any source fetch.

## Deliberately deferred

Salmention fan-out and Vouch are not included. Salmentions require queueing,
deduplication, retry policy, and fan-out abuse controls rather than a loop over all
outbound links. Vouch requires an explicit trust-policy and moderation model; merely
checking that a third page links to both parties does not establish useful trust.
