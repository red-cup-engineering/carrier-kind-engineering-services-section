# World Hosting Services Section

World-hosting landlord: hosts other communities' FeltOS worlds the way
`play.561.group` hosts our own free games and itch.io hosts others' games.
Pure tier catalog and quoting live in `src/world-hosting.mjs`; real
tenant-workspace provisioning composes
[`@red-cup-engineering/feltos`](../../apps/feltos), engineered at
`computer-mud-engineering-services-section`. Published as
`@red-cup-engineering/world-hosting`.

## Thread

Five-custody thread (org-layering.md, 2026-09-01):
- science: [Computer MUD System Engineering Services Section](../../../../../../../../../../../../../science-services-section/services/engineering-science-services-section/services/computer-science-services-section/services/computer-systems-science-services-section/services/computer-mud-system-engineering-services-section/README.md) -- studies MUDs as programmable computer systems (world-building-as-programming, session/world-state models); this section's tier catalog and provisioning plan are engineering built directly on that theory, cited specifically in `content/glossary/topics/world-building-as-programming.md`
- engineering: **this section** -- it occupies engineering custody itself: tier catalog, quoting, and real tenant-workspace provisioning against `@red-cup-engineering/feltos`
- operations: [Rendanheyi Enterprise Services Section](../../../../../../../../../../../../../operations-services-section/services/enterprise-services-section/services/enterprise-systems-services-section/services/rendanheyi-enterprise-services-section/README.md) -- the hull doctrine governing how any 561-group venture runs as a self-governing micro-enterprise bound by contract and user-paid compensation, which this landlord venture runs under
- 561-group: [561 Group Enterprise Project Management Services Section](../../../../../../../../../../../../../561-group-services-section/services/561-group-operations-services-section/services/561-group-enterprise-services-section/services/561-group-enterprise-project-management-services-section/README.md) -- tracks the org's actual running of this venture; its `data/records/2026-09-01-0300-goal-stack-roadmap.json` names `world-hosting-services-section` directly among the eight committed named-relational-scarce enterprises ("15/15; multi-tenancy gap analysis is its roadmap")
- public: **absent -- no tenant-facing public page or site exists yet for this product.** `play.561.group` (`public-media-services-section/public-games-services-section/public-web-games-services-section/sites/play.561.group`) is the closest analog in the corpus, but it is the public face for hosting *our own* games, not a third-party-tenant-facing face for this landlord product.

## What it does

Prices and provisions hosted-world tenancy for communities that want their
own FeltOS world run by the 561 Group, instead of running FeltOS themselves.

- **Tier catalog** (`src/world-hosting.mjs`) -- three tiers (Starter,
  Community, Flagship), each capability entry either grounded in a verified
  FeltOS export (`groundedIn: "<file>#<export>"`) or honestly marked
  `needs-building`. Pricing rationale cites Minecraft-hosting comparables
  (no verified MUD-hosting monthly rate was found as of the 2026-08-31
  mudday survey).
- **Quoting** -- given a tier name and an estimated concurrent-player count,
  computes whether the tier's ceiling holds the estimate and recommends the
  cheapest fitting tier when it doesn't.
- **Tenant-workspace provisioning** -- builds a pure provisioning plan (no
  I/O), then the effect script creates the tenant's namespaced directory
  under a caller-supplied `dataRoot` (never a path inside this checkout),
  initializes a fresh FeltOS world, writes its initial snapshot, and
  journals a provisioning receipt through the house semantic record
  journal.
- **Customer funnel channels** -- the real communities where MUD/world-
  building people already gather (MUD Coders Guild, r/MUD, mudconnector.com,
  itch.io's IF/MUD tags, Grapevine), with the recommended first channel
  marked.

## Exports

- `.` (`src/world-hosting.mjs`) -- `listHostingTiers`, `findHostingTier`,
  `quoteHostingTenant`, `planTenantProvisioning`, `customerFunnelChannels`.
- `./list-hosting-tiers` (`scripts/list-hosting-tiers.mjs`) -- prints the
  tier catalog as JSON.
- `./quote-hosting-tenant` (`scripts/quote-hosting-tenant.mjs`) -- computes
  a quote from CLI args (`--tier`, `--players`) or a pre-parsed object.
- `./provision-tenant-workspace` (`scripts/provision-tenant-workspace.mjs`)
  -- provisions one tenant's workspace end to end and journals the receipt.
- `./cli` (`apps/world-hosting-cli.mjs`) -- composes the three into one CLI
  face: `list`, `quote`, `provision`.

### The world-host runtime

Extracted from `farstone.561.group` per the
[world-host-runtime note](content/text/documents/articles/notes/2026/09/01/2026-09-01-note-on-the-world-host-runtime.md):
the generic serving runtime a tenant world composes with its own game
module, room factory, and page/telnet wiring.

- `./world-store` (`src/world-store.mjs`) -- `resolveWorldBackend`,
  `openWorldStore`: FeltOS engine persistence to a local file or a GCS
  bucket (conditional-write, 412-retried), or in-memory only.
- `./clock-store` (`src/clock-store.mjs`) -- `openClockStore`: persists
  `lastTickAt` at a sibling path/object, with a `clockKind` tag a
  migrating site can pin to its own historic value for byte compatibility.
- `./world-runtime` (`src/world-runtime.mjs`) -- `createWorldRuntime`,
  `WorldRuntime`: request-driven tick catch-up plus flush-on-mutation
  persistence, single-flight both ways, for hosts (e.g. Cloud Run at
  `min-instances 0`) that don't reliably schedule a background timer.
- `./http-wiring` (`src/http-wiring.mjs`) -- `createWorldHttpServer`:
  the outer `http.Server` wrapping FeltOS's own request listener with
  catch-up/flush and (additively) a qwzspace room's WS transport.
- `./fake-gcs` (`src/fake-gcs.mjs`) -- `startFakeGcs`: an in-memory GCS
  double for exercising `world-store`/`clock-store` without a real bucket.
- `./serve` (`apps/serve-world-host.mjs`) -- `serveWorldHost`: composes
  all of the above into one boot sequence, parameterized over a site's
  game module, room factory, page/static files, telnet wiring, and port/
  tick knobs. `farstone.561.group`'s own `src/serve.mts` is the reference
  parameterization.

`scripts/record-multi-tenancy-gap-finding.mjs` is a one-off that recorded
the honest multi-tenancy provisioning gap found in FeltOS's `MudServer`
(one instance serves exactly one world for its process lifetime) as a
dated finding through the same journal service; its roadmap items are
carried in that record, not duplicated here.

## Entanglement debts

None found. `src/` and `scripts/` were checked against the house
primitives named in the five-custody law (`@lenticule-science/metrologic`,
`@red-cup-engineering/eavt`, `@red-cup-engineering/image-generation-inference-team`,
`@red-cup-engineering/semantic-record-journal-service`): both record-writing
call sites (`provision-tenant-workspace.mjs`,
`record-multi-tenancy-gap-finding.mjs`) already go through
`createSemanticRecordJournal`; there is no hand-rolled EAVT-shaped row, no
image-generation call, and no confidence/evidence math a math primitive
should own -- the tier arithmetic is plain ceiling/cost comparison, not
evidential fusion. The one `writeFile` in `provision-tenant-workspace.mjs`
writes a FeltOS world *snapshot* under the tenant's own `dataRoot` (state,
not a record), which is the correct shape as-is.

The multi-tenancy provisioning gap itself (FeltOS's `MudServer` serves one
world per process, no tenant routing, no quotas, no admin lifecycle API)
remains a real, filed engineering debt --
`scripts/record-multi-tenancy-gap-finding.mjs` and its journal record are
the debt's carrier, not this README.
