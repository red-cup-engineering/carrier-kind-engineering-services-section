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
// also: discoverWebmentionEndpoint, sendWebmention, verifyWebmention, receiveMentionRequest ...

const app = webmentionReceiverApp({
  ownsTarget: (target) => target.origin === "https://example.test",
  custody: async (record) => mentions.put(`${record.target} ${record.source}`, record),
});
```

The receiver accepts the standard URL-encoded `source` and `target` fields. It
verifies before custody and acknowledges with `202` only after custody succeeds.
Invalid ownership is rejected before any source fetch.

## Verification (W3C Webmention 3.2.2, 6)

A source is verified by its media type: HTML (and XML) sources by an exact, base-resolved
link in `a`/`link` `href` or `img`/`video`/`audio`/`source` `src`; JSON sources by any exactly
equal string value (microformats2 JSON classifies by its response properties); `text/plain`
by containment; other media types are `invalid`. A fragment target falls back to its fragmentless
page. Relative links resolve against the final (post-redirect) URL and `<base href>`.
`410` is `deleted`, a 2xx without the link is `retracted`, other non-2xx is `invalid`, a failed
fetch is `error`; the first two set `retract`.

## Sender discovery (3.1.2)

`Link` header first, then the first `link`/`a` `rel~=webmention` in document order; comments
and escaped text never count; an empty `href` is the page itself; query strings are kept. The suite
in `test/webmention.test.mjs` states the webmention.rocks discovery cases 1-23 as tests.

## Salmention and Vouch

`sendSalmentions` sends to every outbound link of a source page (the caller owns queueing and
retry policy). `vouch` is parsed, and `verifyVouchBody`/`verifyWebmentionVouch` check that the
vouch page links to both parties; trust policy on top of that belongs to the caller.
