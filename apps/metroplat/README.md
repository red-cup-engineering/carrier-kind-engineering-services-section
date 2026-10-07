# MetroPlat

The [MetroPlat term](../../../../../../../../../../../../../../content/text/glossary/terms/metroplat.md)
records its current dependencies, instances, and specification status. Read
that before treating this package's present contents as the platform boundary.
The [platform and instance contract](content/text/documents/specifications/platform-instance-contract.md)
states what the runtime, installed applications, and instance data must do.

**MetroPlat** is a reusable enterprise platform downstream of
[FeltOS](../../../../../../../../../../../../../../content/text/glossary/terms/feltos.md).
An installation selects platform applications and operations through instance
data. The FeltOS enterprise host owns the process that interprets that data;
an instance such as OPS has no process or executable of its own.
[MARSH](../../../../../../../../../../../../../../content/text/glossary/terms/marsh.md)
supplies EVM resource-sharing effects where an operation uses them.

The current MetroPlat package includes a schema-driven operation host,
CLI/HTTP/MCP/LSP surfaces, shared runtime machinery, and protocol
integrations. Their present location is implementation drift: it does not
make them all MetroPlat capabilities. The complete platform, host, and
application boundaries have not yet been realized by separating these
responsibilities.

## Governing, knowledge, and execution

The installed `operations` catalog distinguishes an operation's existence from
current authority. `help <verb>` shows its contract even without a grant.
`agency` and `agency-record` retain the full authored institutional terms,
including jurisdiction, service offerings, deontic profiles and source revisions.

`agency-record-admit` enacts changes in those canonical JSON or Markdown records
under a separately authored scoped deontic power, an observed office session,
and a matching source revision. Office methods, norms, rules and allocation
consumers read that same carrier. Appointment remains a separate act.

`knowledge-claim-admit` records sourced testimony as native SignCell evidence;
`knowledge-claims` joins both sides, preserving contradictions. Relating and
socializing operations transform and judge their declared carriers directly.
Enterprise settings, contracts and settlements retain their own operation family.
These acts require no work item. Execution obligations still use the work rail.

## Source

This directory is the live source in the 561 Group corpus. Code and tests
are developed and verified here. Earlier engine drafts from this package
are retained as dated [engineering notes](../../../../../../../../../../../../../../content/text/documents/articles/notes),
with their historical terminology and authority distinguished from the current
product definitions.
Any external repository carrying MetroPlat is a distribution or collaboration
surface; it does not make this Engineering app a read-only vendor snapshot.

## Accounting operations

Metroplat's Infograph catalog exposes its energy-accounting work on every
application surface (CLI, HTTP, MCP, and LSP):

- `energy-price-directives` derives sourced, forward and inverse KWH, propane,
  and diesel Beancount price directives from caller-provided tariff and weekly
  series data. It does not fetch or retain source credentials.
- `settlement-energy-allocation` allocates declared CPU and network conversion
  factors to overlapping resource and settlement receipts, returning joules
  with the evidence that produced them.
- `ledger-energy-valuation` reads only `METROPLAT_LEDGER_JOURNAL`, the
  deployment's configured book of record, and returns its USD and KWH
  valuations. A caller cannot direct it to another journal.

The Infograph discovery surface lists the input schema and description for
each verb; the implementations live with the app in
[`src/integrations/energy/service.mjs`](src/integrations/energy/service.mjs),
not in a separately packaged ledger-service tree.

## Legacy snapshot

`lib/legacy/2026-07-31-metroplat/` is a stale, mislabeled prior capture —
an earlier executable-source snapshot that predates the source
above and was sitting under a since-dissolved
metroplat-services-section rather than under MetroPlat's own app directory.
It is kept for history only. Do not treat it as current, and do not port
from it without checking any given path against the real source above first.

## The measured failure lesson

Any reading of the package's file graph is a fact about that graph, not a
claim about what MetroPlat structurally is or should be — readings must
never be promoted into ontology. The corpus's own phrase for
the general failure this guards against: past Mark and Articulating,
nothing is free. A measurement is evidence to act on, not a category to
build further structure on top of.
