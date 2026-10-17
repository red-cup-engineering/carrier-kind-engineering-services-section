# web-syndication-services-section

Web syndication from one item model: a field added to the model appears in RSS, Atom and JSON Feed at
once, and an item's own author or title overrides the channel's in all three. Pure and deterministic --
instants are RFC 3339 strings the caller supplies, there is no clock, so identical input is
byte-identical output.

- `serializeRss` -- RSS 2.0 with the Best Practices Profile (`atom:link rel="self"`, permalink `guid`,
  RFC 822 `pubDate`, `dc:creator`, `content:encoded` in CDATA, `enclosure`).
- `serializeAtom` -- Atom 1.0 (RFC 4287): `id` (an IRI; an item id that is not one is replaced by the
  item URL), `title`, `updated`; the author rule of 4.1.1 is enforced rather than left to produce an
  invalid feed.
- `serializeJsonFeed` / `jsonFeedObject` -- JSON Feed 1.1: `authors`, `content_html` or `content_text`
  on every item (an item with neither gets `content_text`), `attachments`, `next_url`.
- `paginate`, `pagedLinks`, `mayAssertComplete`, `archiveChain`, `hfeedLinks` -- RFC 5005 paged
  (`first`/`last`/`previous`/`next`), complete (`fh:complete`) and archived feeds. `archiveChain` splits an
  oldest-first history into archive documents that never change as the feed grows, plus one subscription
  document (`prev-archive`, `current`, `fh:archive`). Pass the links and the `complete` / `archive`
  flags in the channel; each serializer writes them in its own format.
- `readFeed` -- the other direction: Atom, RSS and JSON Feed into the same model, with paging links.
  Its XML reader refuses a DOCTYPE with an internal subset and undeclared entities.
- `sitemap`, `sitemapIndex`, `splitSitemaps` -- sitemaps.org 0.9; `robots` -- robots.txt (RFC 9309).

This section carries the legacy `web-feed` and `web-feed-paging` capabilities and supersedes
`@red-cup-engineering/project-web-feed-artifacts-service@0.1.0`, whose Atom output can be invalid (no
author rule, non-IRI ids) and whose JSON Feed items can lack content.
