# Agent Cockpit Services Section

See `README.md` for what this section is and its Holdings. This file carries
the operative rules.

- **Provenance-bound promotions, never hand-forked.** Everything under
  `lib/legacy/` is a copy out of a canonical source. Refresh a holding from
  its listed canonical source (see `lib/legacy/SOURCES.md`) when it drifts;
  never hand-edit a promoted file into permanent divergence from its source
  and call that a fork.
- **Canonical cockpit-coordination/theatre lineage is the local archive.**
  `.../src/content/assets/legacy/2026-06-27-agential-relationality/organizing`
  on this machine is canonical for `cockpit-coordination.mts` and
  `theatre.mts`. The cold-red-gate koios.news copy (2026-07-03) is OLDER
  than local (2026-07-04) — do not treat the cold-red-gate copy as
  canonical or refresh from it in preference to local.
- **Nothing here is on the pnpm workspace path.** Wiring a holding up as a
  live package — a `package.json`, a `pnpm-workspace.yaml` entry, an actual
  build/test target — is a deliberate future act with its own review, not a
  side effect of a promotion or a refresh.
- **Don't edit files under `lib/legacy/` except via a documented refresh.**
  A refresh re-copies from the canonical source and records it in
  `lib/legacy/SOURCES.md`; it doesn't hand-patch the promoted copy in place.
