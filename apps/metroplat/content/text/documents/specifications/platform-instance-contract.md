---
title: MetroPlat platform, application, and instance contract
status: specified; implementation incomplete
date-created: 2026-09-27
date-modified: 2026-09-28
---

# Effect and relations

MetroPlat is a reusable ERP/ICS **platform** downstream of FeltOS. It lets an
organization select enterprise operations and applications, admit business
authority, and record outcomes. The installed capability is the effect; neither
a package path nor a process name is its identity.

- `(MetroPlat, downstream-of, FeltOS)`
- `(ops.561.group, instance-of, MetroPlat)`
- `(bare-cedar-fog.561.group, instance-of, MetroPlat)` and the proposed Oracle
  VPS MetroPlat instance, each with its own declared identity and authority
- `(koios.news, federates-with, ops.561.group)`, not `(koios.news, app-of, OPS)`
- `(FeltOS enterprise host, loads, MetroPlat runtime)`
- `(MetroPlat runtime, interprets, OPS instance declaration)`
- `(deployment supervisor, starts, FeltOS enterprise host process)`

An instance is **data** interpreted by MetroPlat. It cannot own a function,
class, process, server assembly, protocol implementation, or codemod. A host
process can serve an instance without becoming part of that instance. Koios.News
is a separate news service and federated peer; OPS neither contains nor runs its
publication pipeline. Content Mill is a FeltOS module; Newswire syndication and
software-change work are AOE components. Those effects stay with their owners
when MetroPlat exposes or coordinates them.

# Data and execution contracts

The version-1 MetroPlat instance declaration has `instanceOf`, `identity`,
`operationSources`, optional `applications`, and optional `schedules`. The
loader refuses unsupported fields, including `web`, and refuses an
`instanceOf` other than `@red-cup-engineering/metroplat`. `identity` supplies
the namespace and optional public origin. Source and application entries name
unique installed package exports and optional application configuration. A
schedule is work-selection data consumed by the host's AOE recurring-work
clock; it is not an instance-owned timer. Runtime secrets, storage locations,
network peers, and process settings belong to the host deployment.

The FeltOS enterprise host has a separate version-1 declaration with
`hostKind: feltos.enterprise-host`, a relative `instance` reference, and `web`
configuration for admission, network sources, companions, and environment
mapping. Its schema is
`feltos-enterprise-host/specifications/enterprise-host.schema.json`. The
host's loader resolves that reference and passes the declaration path directly
to MetroPlat's instance installer and in-process MCP surface before starting
the network surface. CLI and stdio callers retain a process-option adapter to
the same installer. A deployment unit points to the host declaration using
`FELTOS_ENTERPRISE_HOST`; no OPS-specific executable is selected. Neither the
unit name nor that environment variable turns OPS into an executable.

MetroPlat admits instance identity and application declarations as SignCells.
Installation should be a witnessed transition from the declared selections and
authority to the capabilities made available to people and agents. This
transition is not yet fully recorded: current code resolves exports and starts
surfaces, but a restart alone does not prove which capabilities or peers were
available. HTTP, MCP, and human views must project the same admitted operation
rather than maintain separate copies of its business logic.

For an installation, the required order is:

1. Admit the instance declaration as data: identity, selected package exports,
   application configuration, and policy. Refuse a missing, duplicate, or
   unresolved export. A hostname or checkout path does not supply an operation.
2. Resolve each selected export from its owning package. That owner supplies
   the operation and its descriptor; MetroPlat supplies installation,
   organization authority, and presentation. A fixed switch in MetroPlat that
   imports other owners' implementations is not an installed-package contract.
3. Record the selected set and its authority as one witnessed installation
   transition, with the declaration and resolved exports related in the shared
   Sign carriers. Do not claim an operation is installed solely because its
   descriptor was generated during a build.
4. Project MCP, HTTP, and human discovery from that same resolved set. A tool
   omitted from the instance must be absent from discovery and unavailable to
   dispatch; a selected operation must retain the same identity and admission
   rule across surfaces. The host executes those projections, while the
   instance remains configuration and state.

The current generated MCP and catalog descriptor files duplicate an earlier,
package-wide assembly. They cannot serve as the installed instance's discovery
record. The current fixed operation-family loader also violates step 2. These
are separate defects: retiring the duplicate discovery files does not by
itself make the uninstalled default catalog instance-selected. Named-instance
installation now selects the declared operation exports; the fixed loader
and generated all-family catalog still serve the legacy uninstalled default.
The observed named-instance MCP projections exposed 34 OPS verbs and 45
Binding Generations verbs, while the uninstalled default exposed 227.

Federation belongs to the network and hosting owners. A received activity must
bind sender, recipient, content identity, admission decision, and resulting
state transition. An instance's identity does not grant a peer local authority.
ActivityPub, CloudEvents, and A2A, with x402 where consideration applies, are
interoperability carriers, not Koios or OPS-specific server implementations.

# Current implementation and remaining migration

`ops.561.group` and `ops.bindinggenerations.net` now each have a MetroPlat
instance declaration and a separate FeltOS host declaration. Their checked-in
systemd units start the same FeltOS host executable with different host data.
An isolated local OPS boot has served `/healthz` through this path. Live release
status must be established from release receipts and the running origin; a
source declaration does not prove production has the same bits.

The World MUD view receives an admitted instance identity from the MCP
and legacy HTTP assembly paths, so its world title and printable-edition link
no longer assume the 561 Group or `ops.561.group`. Named-instance MCP, CLI,
and HTTP assembly now selects MetroPlat's entrance and authority families plus
the instance's declared operation exports. OPS declares FeltOS work, Farolfi
ledger, and Group readout exports; Binding Generations declares the same first
two and its own operations. In isolated host invocations the two named MCP
surfaces exposed 34 and 45 verbs respectively, while the uninstalled legacy
default exposed 227. The installed work and ledger verbs remained present;
`utter` from the unselected default catalog was absent. This demonstrates
selection at the named host boundary, not a witnessed installation transition
or a production release.

The fixed loader and generated default catalog still contain many operation
families owned elsewhere. MetroPlat also exports `metroplat-serve`, an older
process carrying HTTP, inference, worker, and settlement behavior. That route
is implementation drift, not platform ownership. Remove it only after its distinct effects and consumers
have been migrated to the proper FeltOS, inference, network, and system owners
and observed there. The OPS and Binding Generations instance directories now carry data without
package manifests. Separate host deployment bundles install their selected
package exports; MetroPlat resolves them from the host bundle, rather than
using an instance JSON path as an executable dependency root. The selected
operations still need a witnessed installation transition.

The intended cold-red-gate placement for the host serving OPS and the intended
mesh relation to Koios.News are not established by these source changes. The
repository records an earlier public OPS route proxied from bare-cedar-fog
through cold-red-gate; verify current deployment before stating which host
serves the OPS declaration. Federation
between Koios and OPS, authority-root admission, witnessed installation,
and retirement of the old `metroplat-serve` route remain implementation work.

## Office placement in the world

The world names and places an office through its current native `office-key`
and `located-in` claims. That relation applies to offices at a house root, in
an app, and in an ordinary services section alike. A display path is not a
replacement for the office's actual location. Moving an office changes the hall
used in its name and its default placement when no work section resolves.
Existing section-based work placement takes precedence, including a section
derived from an opening office's key; relocating that office does not rewrite
the section its work concerns.

When a native office binding is duplicated, contested, withdrawn, or does
not locate the office in one settled room, the world must not invent a hall
from an older section path. The existing unplaced-work fallback is the plaza;
the existing unavailable-hall name is “the house.” A legacy office without a
native binding may still use section placement. An absent hall is not a
semiotic subject and must not be queried as `undefined`.

The existing live-carrier receiving tests exercise a complete typed first
and repeated `look`, normal authored office construction, relocation, and
unresolved bindings using the selected FeltOS and SignCraft implementations.

