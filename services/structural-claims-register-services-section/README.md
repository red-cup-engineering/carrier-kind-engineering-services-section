# Structural Claims Register Services Section

The 561 Group's structural-claims business. Tribal nations, counties and communities
hold claims against the data-center, transmission and pipeline projects built near
them: consultation, water and treaty rights, land along a route, standing in
environmental review and in the utility commission's docket, a council's own
resolutions. Some of those claims can pause a project; most cannot. The register says
which is which, and what each is worth against the developer's schedule, so a
community benefit agreement, a lease or a consent is negotiated as the sale of a
priced option instead of as goodwill.

Why now: in September 2026 data-center developers are courting Native nations as a
lighter regulatory path, while the Seminole Nation and the Hualapai Tribe have enacted
moratoria and the Cherokee Nation has a task force (the watch list, with sources, is
`data/records/watch-list.json`). Data Center Watch counts about $130 billion of
projects blocked or delayed in the first quarter of 2026 alone.

The business plan is sections 5 and 8 of the
[collapse-aware financial enterprises note](../../../../content/text/documents/articles/notes/2026/09/05/2026-09-05-note-on-collapse-aware-financial-enterprises.md).

## How a claim is read

Each claim is recorded with the operation it constrains and what its violation does.
Its class follows the claim-constraint hierarchy (cybernetic-postliberalism glossary):

| class | when | worth |
|---|---|---|
| structural | it constrains an operation (a rezoning or annexation vote, environmental review, a permit, the utility commission docket, interconnection, water appropriation, tribal consultation, a council resolution, court review) and its violation pauses, redoes, denies or goes to court | the delay it can impose times the developer's daily cost of delay |
| aspirational | it is consulted or reported, but a violation is absorbed | none as an option |
| decorative | it constrains no operation (jobs, economic impact) | none |

The daily cost of delay is the project's recorded figure, or its capacity at STL
Partners' $14.2 million a month for a 60 MW site (about $7,889 a megawatt a day). An
unknown factor leaves a claim's worth unknown, never zero.

## The offices and their verbs

Through MetroPlat, spoken as powers in the operations world on bare-cedar-fog.561.group:

- **Claims caller**: `claims-call-queue`, `claims-watch-list`, `claims-projects`,
  `claims-project`, `claims-register`, `claims-contact-log`. Calls councils, county
  boards, community groups and developers; paid a share of each engagement they
  originate.
- **Claims analyst**: `claims-project-record`, `claims-claim-record`,
  `claims-forecast-record`, `claims-forecast-resolve`, `claims-forecasts`, and the
  readings. Keeps the register true and scores capture forecasts with the forecasting
  service.
- **Claims engagement lead**: `claims-engagement-record`, `claims-pipeline`, and the
  readings. Runs discovery calls, proposes and delivers engagements, takes deposits,
  and records each fee and caller share.

## What is sold

- A party's register: every claim it holds against a project, classed and priced.
- Per-project docket readings: the review pathway, the scoping, the water and power
  filings, and the claims whose violation pauses the permit.
- Capture forecasts with a public Brier record: which projects will be delayed,
  downsized or cancelled, by what, and by when.
- The same reading read the other way is a second market: which claims a developer
  should settle first.

## Code

- `src/register.mjs`: the pure readings (class, daily cost of delay, option value,
  interest, engagement state).
- `src/operations.mjs`: the `claims-*` operation family over semantic record journal
  rows under MetroPlat's data root.
- `lib/agency/`: the three offices with their duties, works and skills.
