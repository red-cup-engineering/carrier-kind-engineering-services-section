---
title: "Hopeium capability specification"
description: "Capability specification for the territorial-economy program's app, the endeavor the founder named hopeium on 2026-09-05: the territory catalog over the Turtle Island taxonomy, the value-chain reader whose first fixtures are the narcotics empires' measured price ladders, the continuation reader that is the first code the unbuilt-affects hope proposal has had, the benefit-sharing register through the semantic record journal, the media line as parameterizations of the house's existing production services, the site as a parameterization of shared upstream services, and the priced measures on the x402 gateway. Written before anything is built, against what the tree already holds."
date-created: 2026-09-05
type: specification
name: 2026-09-05-hopeium-capability-specification
status: draft-for-owner-review
authors:
  - claude-fable-5.1
keywords:
  - hopeium
  - territorial-economy
  - retort-systems
  - value-chain
  - benefit-sharing
  - socially-ontogenic-media
  - x402
---

# Hopeium capability specification

The relevant proposal note is `lib/emsenn/services/561-group/services/science-services-section/services/social-science-services-section/services/economics-and-business-science-services-section/services/economics-science-services-section/services/territorial-economy-science-services-section/content/text/documents/articles/notes/2026/09/05/2026-09-05-note-on-territorial-economy-product-hypotheses.md`; this document is its engineering form and adds no theory.
Every capability below is one JSON object in and one JSON object out under a schema, fabricated through the jsnode line as `scripts/<verb>-<noun>.mjs` in this section, composed by apps, sold by the call, and rendered by faces that hold no logic of their own.

## What the app is, and is not

The app is the public face of a territorial economy: for a place, what it yields and to whom the value goes; for a person, which resolving continuations exist and with what evidence; and the media that carries both into a population.
It is the engineering of the carrier's sentence "hopeium is hope manufactured only where the program itself makes the continuation exist."

It is not a marketplace, not a platform that hosts other people's content, not a feed, not a wellness product, and not a study of narcotics.
The narcotics empires appear in exactly one place in this system: as the science seat's measured rows, which are the value-chain reader's first test fixtures because they are the best-documented price ladders in the literature.
No controlled substance is ever a catalog row.

## Fences

Every fence is a ruling already on disk, applied to this product; the business plan carries the same fences in the business register.

- **Hope is never demanded.** No surface gates anything on the person's mood, asks for optimism, keeps a streak, or defers ("things will get better"); a continuation reading that finds nothing says "none found" with the search it ran, and that output is as first-class as any other (the anarcho-nihilist hope term; the unbuilt-affects note's ⊥ held, never collapsed to t).
- **A continuation is shown with its evidence or not at all.** Every continuation carries the source, the date, and the evidence status in plain words; a projected outcome is labeled a projection (the work program's fence, verbatim).
- **Sell sections, never the whirl.** A knowledge holder's material enters the catalog only through a benefit-sharing record with consent scope; ceremony, kinship, and knowledge that does not translate are never catalog rows (Stringing Glass §3; the Nagoya Protocol's access and benefit-sharing as the standard the operations seat runs under).
- **Decision support, never automation; the companion is a witness, not a boss.** The EVE Assist principles and the PACER fences apply to any conversational face unchanged.
- **No data sale, no lead generation, no engagement optimization, no dark pattern, no subscription trap.** The media line reports no engagement metric to any decision; issues are produced on a cadence the operations seat sets, never on a signal from the audience's attention.
- **Thin products are not sold.** The app ships free; the priced measures are sold to agents by the call; a paid tier for people, if any, follows product quality and never gates a reading, its evidence, or the export.

## What the tree already holds (verified 2026-09-05 against the jsnode package graph)

| Capability | Package | Version | State |
|---|---|---|---|
| the territorial taxonomy | `@red-cup-engineering/turtle-island-ecological-adaptation-services` and its descendants down to Finland, Minnesota | 0.1.0 | source; no records, no catalog |
| four-valued evidence, held ⊥ | `@lenticule-science/metrologic` (`/bilattice` subpath) | 0.2.0 | published, nineteen consumers |
| the settle loop over FOUR | `@red-cup-engineering/predicated-inference-kernel` | 0.1.0 | source; one consumer |
| the hope proposal against `genre.mts` and `affect.mts` | `apps/playing/src/` in multi-agent-computer-system-engineering-services-section | prose only | graded target, falsification path named, no code |
| records with support and refutation | `@red-cup-engineering/semantic-record-journal-service` | 0.1.11 | published, ninety-four consumers |
| books | `@red-cup-engineering/ebook-production-services-section` | 0.3.3 | source; two curriculum consumers |
| newsletter issues | `@red-cup-engineering/newsletter-issue-production-services-section` | 0.1.0 | source; koios-news and two others consume it |
| video | `@red-cup-engineering/youtube-channel-production-services-section` (one program, every channel a JSON ChannelSpec) | 0.2.3 | source; one channel consumes it |
| HTML | `@red-cup-engineering/html-document-render-service` in html-engineering-services-section | 0.1.0 | the founder's standing order: all HTML capability lives once there |
| the paid hull | `@red-cup-engineering/base-chain-data-gateway` (x402 v2 seller as a Cloudflare Worker, free tier) | 0.1.0 | the live shape; the ephemeris and pacing gateways were Cloud Run deployments, dead with billing off, and are not on the registry |
| the ledger | `@red-cup-engineering/farolfi` | 0.1.13 | the Group's books run on it |
| narcotics-economy figures | none | | the science seat's first research note lands this session |
| a territory catalog, a value-chain reader, a continuation reader, a benefit-sharing register | none | | this specification |

## Architecture

### (i) `@red-cup-engineering/computer-territorial-economic-systems-engineering-services-section`, pure compute

Pure, no-I/O, no-clock scripts, each with its JSON Schema in `data/records/schema/`, every output carrying an evidence label.

- `derive-value-chain-shares.mjs`: in, a price ladder (named positions from producer to retail, each with a unit price and a source row); out, each position's share of the retail price, the producer's share named first, the multiplier between adjacent positions, and the evidence label of every input row.
  Its test fixtures are the science seat's rows for the six narcotics cases (farm gate to retail), so the science's figures become the reader's tests and a figure the science cannot cite cannot enter a test.
- `derive-territory-readout.mjs`: in, a place (a node of the Turtle Island taxonomy) and the catalog; out, the catalogued materials of that place and its ancestors, each with its known products and uses, the markets that buy them, the chain position the place currently holds for each, and the citation of every row; materials with no benefit-sharing record are returned only as names, never with a holder.
- `derive-continuation-reading.mjs` (extending, never replacing, `apps/playing/src/genre.mts`'s impasse and resolves reads and `affect.mts`'s Tomkins reader in multi-agent-computer-system-engineering-services-section, published first if they are not): in, a position (a person's or a place's chronicle prefix: what is held, what has been tried, what is wanted) and a set of candidate continuations with their evidence rows; out, for each candidate, whether a resolving continuation exists (condition 1), whether it is already reached (condition 2), and the held ⊥ or the settled value (condition 3), computed over metrologic's bilattice, with difficulty as the note's ratio.
  This is the unbuilt-affects proposal's first code, and its first assay is the note's own falsification path: if every chronicle in the fixture set is fully determined at read time, the script must report that hope is vacuous for that set rather than fabricate a ⊥.
- `derive-benefit-share.mjs`: in, a chain-shares reading and a benefit-sharing record; out, what the agreement returns to the territory per unit sold, as a share and as a floor, and whether the reading meets the agreement's terms.

### (ii) The territory catalog

Rows, not code: `data/records/` in this section, one dated JSON record per material. A catalog row is a resource row first: the parent section's `data/records/schema/resource-row.schema.json` (Cistern's one row for a currency, credit, commodity, or scarce input, kept once there) is the base, with `kind` `commodity` or `scarce-input`, the territory's holder as `issuer`, and the two-witness `witnesses` and `provenance` blocks it requires; the catalog's own schema is a thin `allOf` profile over it (the house pattern for a node's schema, org-layering's tree habits) adding the taxonomy node, the material's accepted scientific name where one exists, the known products and uses with citations, the markets, the chain position the place currently holds, and the benefit-sharing record it enters under, if any. The study of this economy resource by resource follows `.claude/skills/study-an-economy/SKILL.md` and is the economist office's duty; the catalog is that study's rows for a territory.
The first records are the band's own region: the manoomin, rivercane, and Lake Superior fish and agate cases the ecology essays already describe, and the catalog refuses a row without a citation (a `validate-territory-catalog-row` script over the house JSON Schema validator).

### (iii) The benefit-sharing register

Records written through the semantic record journal into the Root Cellar's `data/records/`, object kind `561-group.territorial-economy.benefit-sharing-record`: the holder (a person, a household, a band, a nation), the material, the consent scope (what may be catalogued, what may be sold, what may be named, what may never leave), the share and the floor, the effective and expiry dates, and both of FOUR's booleans.
A catalog row that names a holder must reference a register record; the validator refuses one that does not.

### (iv) The media line, as parameterizations

No new production code.
A hopeium issue is a continuation reading rendered as socially ontogenic media: the continuation, its evidence rows, the territory it stands on, and nothing that asks the reader to feel anything first. It is neither of the two formats the 2026-08-23 abandonment note names, the doom-take (the future settled as loss) and the solution-take (the future settled as secured); the issue schema has a held-cell field and no verdict field, and a renderer that receives a settled outcome for an open cell refuses it. Because the northern-Minnesota essay's Conjecture 7 says marketing a territory as a climate haven raises its risk, no issue and no readout markets a place.
Each medium is a JSON parameterization of the existing service: an issue through newsletter-issue-production (CSL-JSON cited), a book through ebook-production from the science seat's notes and the catalog's rows, a channel through youtube-channel-production as one ChannelSpec.
The health-education program is the live example of the shape and the review gate; a run that cannot clear its quality bar is a finding about the production line, not about this program.

### (vi) Priced measures on the x402 gateway

Three sellers in base-chain-data-gateway's Worker shape, each a thin face over one script of (i): the value-chain reading, the territory readout, and the continuation reading, priced in the business plan, settling to the Group's Base USDC address, storing nothing. Landed 2026-09-05: `@red-cup-engineering/paid-value-chain-gateway` 0.1.0 at `https://paid-value-chain-gateway.morgan-sennhauser.workers.dev`, one route, $0.04, receiver resolved through the key-management resolver.

## Build order

1. The science rows land (this session's research lot) and the founding is journaled.
2. (i) `derive-value-chain-shares` fabricated through the jsnode line with the narcotics rows as fixtures, published through the gate; (vi) its seller listed. This is the first-cash condition.
3. (ii) the first catalog records for the band's region, with the validator; (iii) the register's object kind and first record.
4. (i) `derive-territory-readout` and `derive-benefit-share`.
5. Measured 2026-09-05 (the science seat's `2026-09-05-continuation-reading-falsification-finding.json`): the assay fails in the negative for `@red-cup-engineering/playing` 0.1.2 as built, whose chronicles are maximal by construction, so `derive-continuation-reading` is blocked upstream on a position carrier over an unclosed event structure, a lot in the playing substrate's own section and the proof line, not here. (iv) The first issue waits on it; until then the media line ships nothing that claims a continuation.

## Review gate

A lot on this section closes on: its package tests green with counts quoted; `workspace-import-audit` and `jsnode_duplication` clean over the changed packages; a published tarball diff that is additive; a receipt through the semantic record journal; and, for anything that renders, the health-education program's quality gate.
