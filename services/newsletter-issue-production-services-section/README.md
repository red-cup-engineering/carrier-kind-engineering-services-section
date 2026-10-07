# Newsletter issue production services section

Platform-neutral newsletter-issue fabrication: an issue is
`{title, dek, sections: [{heading, "body-markdown", sources}], references}`
— `references` a CSL-JSON pool keyed by citekey, the same frontmatter shape
`predication-literature-review-long-covid-mechanisms.md` uses. A validated
issue renders to three targets: clean Markdown, paste-ready HTML, and an
RSS/Atom item fragment. Built to arm any house newsletter product (the
koios-intelligence-briefing precedent named the shape); it composes
carriers into an issue, it does not own or schedule any one property's
delivery.

## What lives here

- `src/newsletter-issue.mjs` — the pure domain semantics:
  `validateIssue` (shape, citekey cross-reference, and CSL-JSON minimum
  checks on every `references` entry — errors block rendering, an
  unused-reference is a warning only), `renderMarkdown`, `renderPasteHtml`,
  `renderFeedItem` (an RSS `<item>` or Atom `<entry>` fragment, not a whole
  feed), plus the `formatCitation`/`citationUrl` helpers they share.
- `scripts/compose-issue.mjs` — the effect: issue JSON in, all three
  renderings written to an output directory.
- `scripts/extract-issue-sources.mjs` — the effect: given carrier Markdown
  paths, harvest each one's frontmatter `references:` block into one
  merged CSL-JSON pool, refusing a citekey two carriers disagree on.
- `apps/newsletter-issue-production-cli.mjs` — the composed face:
  `compose` and `extract-sources`.

## Why the paste-ready renderer is hand-rolled, not the registry's

jsnode search turned up a published, registry-pinned house Markdown
family — `@red-cup-engineering/render-markdown-block-html-service` (0.1.2)
over `render-markdown-inline-html-service` (0.1.2), plus
`render-markdown-inline-html-nodes-service` and
`convert-html-to-markdown-service`. It renders the full house Markdown
dialect: headings h1-h6, lists, code fences, thematic breaks, callouts as
`<aside>`, and vault features (wikilinks, transclusions, citation groups,
inline fields) as `<span>`. The paste-ready contract here is a strict,
smaller allowlist — h2/h3/p/blockquote/a/strong/em only, nothing else,
ever, because that is what a rich-text editor such as Substack's accepts
on paste. Guaranteeing that allowlist by post-filtering the general
renderer's output would cost about as much code as a dedicated bounded
parser, without the allowlist being structurally guaranteed (a stray
wikilink-shaped span in prose would leak through). So `renderPasteHtml`
uses its own small block/inline subset (`renderBlockSubsetHtml`,
`renderInlineSubset` in `src/newsletter-issue.mjs`) that can only ever
emit the six allowed tags, by construction — a bare `#`/`####`+ heading or
any other unrecognized construct falls through to an escaped paragraph
rather than a wider tag.

The one dependency taken is
`@red-cup-engineering/read-markdown-frontmatter-service` (0.1.4,
registry-pinned), reused in `extract-issue-sources.mjs` for the YAML
frontmatter parse — a different job (structured-data extraction, not
Markdown-to-HTML rendering) the house package already owns outright.

## Feed-item delegation checked against the house writer, not applied

`@red-cup-engineering/project-web-feed-artifacts-service` (0.1.0, published
on the canonical registry) is the house feed writer, and `renderFeedItem`
above was checked against it for duplication before this README was
written. Its exports (`serializeRssFeed`, `serializeAtomFeed`,
`jsonFeedObject`, `serializeJsonFeed`, `projectWebFeedArtifacts`) all take
a whole `channel` plus an `items` array and return a complete feed
document — there is no export that serializes one item/entry as a
standalone fragment. `renderFeedItem` exists for the opposite contract:
one bare `<item>`/`<entry>` fragment, no channel, meant for later
splicing into an assembled feed by a publishing step this composer does
not own (see `compose-issue.mjs`'s `issue.feed-item.*.xml` output).
Synthesizing a throwaway one-item `channel` just to call the whole-feed
functions and then string-extracting the inner `<item>`/`<entry>` back
out would trade a small, tested hand-roll for a fragile regex peel of a
generated document — worse code, not delegation. Real delegation needs a
fragment-level export added to the house package itself, its evident
owner; until that exists, this duplication (XML/attribute escaping,
CDATA wrapping) is a named debt, not a refactor performed here.

## Section shape debt, named rather than routed around

`@red-cup-engineering/fabricate-markdown-jsnode-operation-package-service`
and `@red-cup-engineering/project-jsnode-operation-package-readme-service`
are the house's own operation-package fabrication machinery this section
should ideally have been authored through. Both are source-only
(`classification: source-with-unassayed-delivery` in the jsnode graph —
never published), and neither of this section's siblings
(`ebook-production-services-section`, `bibliography-engineering-services-section`,
`koios-intelligence-briefing`) was built through them either. This
package was hand-authored following those siblings' shape instead, the
same way they were; the fabrication machinery's own unpublished state is
a debt named here, not fixed as part of this task.

## Status

`npm run check` (syntax) and `npm test` (`node --test test/*.test.mjs`)
both pass. Published as 0.1.0 to
`https://registry.561.group` on 2026-09-02.

## Draft delivery

`publish-newsletter-draft <issue-dir> --feed-link <public-issue-url> --data-root <publication-data-dir>` validates and recomposes an authored issue, creates a Buttondown draft using `BUTTONDOWN_API_KEY`, and records its returned identifier in `publications.jsonl`. The issue directory and publication data belong to the caller. The engineering package contains no health-specific content or channel defaults.

## Fiction serials

The same renderers also admit a fiction issue shaped as
`{canon, serial, episode, title, previously, body, next, access}`. It renders
to the same Markdown, paste-HTML and RSS/Atom item targets without converting
Unicode text, including Simplified/Traditional Chinese and full-width
punctuation.

`src/fiction-serial.mjs` owns the serial projection. A `serial.json` beside
episode Markdown names its story-bible path, serial, cadence, free episodes,
Buttondown newsletter name (never a key), language and script. Each episode
keeps the ebook fiction lint's `pov`, `when`, `beat` and `reveals`
frontmatter, adding `episode` and the one-line `next` hook. The `previously`
value is derived from the two most recent prior outline summaries in the
story bible; optional episode frontmatter may override it editorially.
