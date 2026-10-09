# ScheduleDelivery Service

This portable service lets a colony sell the work of one of its clocks without
claiming to own time. A customer contracts a schedule once; the colony-local
clock may then call `run-due` without gaining authority over the customer work
caused by the pulse. The intended first provider is the always-on VPS colony,
`cold-red-gate`; the office name is **ScheduleDelivery of the Cold Red Gate
Colony**. The laptop colony is `bare-cedar-fog`. This package does not itself
claim that the VPS deployment is installed or healthy.

The public A2A task faces require the standard HTTP Bearer scheme declared by
the signed Agent Card. Credential bytes remain outside the repository and
never enter schedules or WitnessJournal. The current direct-package Koios
carrier does not use that ActivityPub transport configuration: its isolated
environment exposes only a local job manifest, public verification-key maps, a
read-only continuity baseline, and fixed candidate/replay roots to the selected
package bin.

Schedule identity commits the inspected target runtime closure as well as the
customer and request. Renewal is one provider-side `ScheduleTransition` record:
the successor registration and predecessor retirement share one append-only
semantic object. A write-once prepared transition cell makes concurrent claims
for the same predecessor mutually exclusive and lets a lost response replay the
same transition without guessing, compensating, or activating two successors.

The admitted Cold Red Gate carrier installs the package at
`~/services/scheduled-activity-delivery-service` and the customer Koios runtime at
`~/services/koios-news-runtime`. The user timer in
`content/deployments/cold-red-gate/` only supplies provider-local clock ticks;
it cannot choose a customer command, schedule, or activity. Those remain in
accepted provider-owned schedule records.

```sh
npm run check && npm test
node src/service.mjs --operation solicit-service < solicitation.json
node src/service.mjs --operation invoke-service < acceptance.json
node src/service.mjs --operation run-due --now 2026-07-19T12:00:00.000Z
```

The first carrier is deliberately local and narrow. It calls only a named
operation in the target's own package operation catalog, using that package's
own `bin` entry. It accepts no caller-selected executable, argv, shell, or
environment. A later HTTP delivery carrier can be added without changing the
schedule and receipt law.

A self-contained bin needs no further declaration. A package that uses local
runtime modules must declare each operation's additional regular files in
`scheduledActivityDelivery.runtimeFiles`, keyed by operation name; the selected
bin is implicit. Every relative static import must name one of those files.
The carrier rejects bare and dynamic imports, so it never treats ambient
`node_modules` resolution as part of a customer schedule. It captures and
read-only mounts each declared file by raw digest before invoking the bin.

## Bounded projections and legacy custody

`run-due` reads current active-schedule projections and direct occurrence
reservations; it does not snapshot the append-only schedule/receipt history or
walk every historic attempt. One tick considers at most 32 active schedules,
invokes at most three targets concurrently, and rotates both dispatch and
interrupted-attempt recovery windows so later work is not starved. New current
attempt cells and their exact semantic identities share one encoding, while
historic relational-RMN cells remain admitted read-only.

Cold Red Gate's retired `clockkeeper-service` used an older JSONL/RMN/RWIL
custody layout and old literal contracts. Preserve and import it as historical
evidence only:

```sh
node scripts/import-legacy-clockkeeper.mjs \
  --source-root /explicit/quiesced-copy/data \
  --destination-root /explicit/archive-journal
```

The importer validates the complete source before its first destination write,
uses date-partitioned journal batches, is idempotent, and writes only beneath
`legacy-clockkeeper/archive/v1`. It never maps old schedules into the current
contract, creates active projections, or invokes delivery. A current schedule
must be solicited and accepted again against the exact current target package
and operation.

## Cold Red Gate recovery boundary

`content/deployments/cold-red-gate/install-and-verify.sh` installs the user
service and timer but never starts or enables either. It refuses to replace an
enabled or currently active timer. In its normal form it requires the complete local
environment: a job manifest, public verification-key maps, a read-only
continuity baseline, and fixed candidate/replay roots from
`~/.config/emsenn/scheduled-activity-delivery.env`; copy the adjacent
`.env.example` and replace its six paths. It contains no credential, schedule,
or signing material and is not repository content. The manifest and key maps
must be regular non-symlink readable files; the baseline must be an absolute,
real non-symlink readable/searchable directory; candidate and replay roots must
also be writable by the service account.

For a deliberately inert package rollout before environment or schedule
authority exists, use `sh install-and-verify.sh --staged`. It runs
`--structural-only` preflight, validates the package, dependency closure, and
unit/timer, installs them, and daemon-reloads systemd. Structural success is
explicitly not activation readiness and cannot enable or start the timer.

On the VPS, after placing the service at
`~/services/scheduled-activity-delivery-service` and running `npm ci`, run:

```sh
chmod 600 ~/.config/emsenn/scheduled-activity-delivery.env
sh ~/services/scheduled-activity-delivery-service/content/deployments/cold-red-gate/install-and-verify.sh
node ~/services/scheduled-activity-delivery-service/scripts/cold-red-gate-preflight.mjs \
  --service-root ~/services/scheduled-activity-delivery-service \
  --require-koios-schedule
```

The final command is the enablement gate. It verifies the exact package bin and
Node ESM dependency closure, the unit/timer binding, the narrow local Koios
runtime configuration boundary, a no-write plan of the currently selected
signed Koios job, and an accepted active Koios schedule bound to the same exact
runtime closure. It also verifies the three fixed isolation executables used by
live delivery (`timeout`, `nice`, and `bwrap`) and runs a
five-second, zero-effect Bubblewrap assay: a read-only host root, fresh
`/proc`, `/dev`, and `/tmp`, plus a read-only overlay, and requires the kernel
to report all five capability sets empty with `NoNewPrivs=1`. Each actual target starts from that read-only root;
only the provider-configured Koios output and replay roots are remounted
read-write, by their fixed environment names. Customer schedules never select a
host path. Structural-only rollout performs this host-prerequisite check but
never requires Koios configuration or schedule authority. It exits nonzero if
any required condition is absent. A passing result
is evidence for a separate,
deliberate `systemctl --user enable --now
scheduled-activity-delivery-run-due.timer`; this repository does not perform
that state change.
