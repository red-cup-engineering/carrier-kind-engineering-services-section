# @red-cup-engineering/communicating

`communicating` is the language-neutral operation algebra over
`@red-cup-engineering/relating`. Its core operations transform admitted meme
carriers; raw text is admitted separately by a language bundle's codec, and
language-manifest evidence is read separately from both.

The published package surface is the `exports` map in
[`package.json`](package.json). The older `multi-agent-engine` command and
`agentic-communication-engine` name are not supplied by this package.

## Operation surfaces

The core surface contains exactly fourteen operations:

- `communicate`, `semiose`
- `speak`, `listen`, `illocute`, `ground`, `translate`, `negate`, `conflate`,
  `refer`, `modalize`, `presuppose`, `quote`, `compose`

`actions(bundle)` returns those fourteen operations plus the three bundle-bound
readings `cohere`, `spacetime`, and `channel`. Those readings do not enlarge the
core operation algebra.

`codecActions(bundle)` is the separate three-operation raw-text boundary:
`decode-communication`, `articulate-communication`, and
`settle-communication`.

`manifestActions(manifest)` is the separate seven-operation evidence surface:
the admitted language manifest, its Witness Journal rows, the combined finite
receipts, and its Lambek, sofic, Chu, and discourse-cover receipts.

## Boundary continuity

The messaging surface emits SCIS v2 CloudEvents. Its deterministic identifier
is derived from the normalized `{ source, type, time, data }` semantic value with
the established `lenticule.communicating.cloudevent` object kind and empty
witness root. Optional CloudEvents extension attributes do not rewrite it.

The [Newswire modules](src/messaging/newswire/) admit configured RSS/Atom
source arrivals to that carrier. `feed-arrivals` fetches and deduplicates;
`source-arrival` defines the observation; `source-acquisition` performs the
network effect. The caller owns the cursor and decides when to commit it.
`syndicate-feeds` now maps many admitted source feeds to many configured
RSS, Atom, or JSON Feed snapshots using the shared web-feed serializers. It
retains original item URLs and a receipt relating each output item to the
source-arrival identities; it does not write articles or claim to have
delivered the projected bytes. ActivityPub delivery and durable output
publication remain separate work. Newswire does not write articles. The
Koios.News newsroom currently consumes its admitted arrivals.

## Package surfaces

The root exports the operation factories and language-neutral admission
machinery. Fourteen explicit subpaths expose holography; language algebra;
understanding, codecs, geometry, grammaticality, parsing, and grounding;
speaking, signifying, illocuting, and listening; and messaging. Concrete
language packages supply their own bundles and manifests.
