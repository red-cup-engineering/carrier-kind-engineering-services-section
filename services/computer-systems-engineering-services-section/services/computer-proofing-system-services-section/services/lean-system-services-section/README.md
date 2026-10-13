# Lean system services section

Native JavaScript ESM tools for reading Lean source and workspaces, Lake metadata,
declaration catalogs, Blueprint claim graphs, and Verso exposition links, and
for rendering Lean metaprograms. Proof projects and mathematical applications
live with their subjects; this section owns the proof-assistant integration.

Generic TeX parsing is imported from
`@red-cup-engineering/tex-engineering-services-section`. Mathematical graph
readings are imported from `@lenticule-science/metrologic`.

Run `npm test` to exercise workspace reading, Blueprint linting, and generated
Lean source. Runtime exports load from `src/` without a compilation step.

Lean reference notes remain under `content/`.

## Memory ceiling on this machine

`deploy/lean.slice` puts every Lean and Lake process under one ceiling (4 GB soft, 5 GB hard, no swap), so a build is killed inside its own scope instead of taking the machine and every session on it (2026-09-27). `deploy/lean` and `deploy/lake` replace elan's proxies in `~/.elan/bin` (symlinks) and run the real tool in that slice with `LEAN_NUM_THREADS=4`; the unit is linked into `~/.config/systemd/user/`. `elan self update` restores the plain proxies, so re-link after updating.

MetroPlat composes this section's `lean-check` operation. All Lean execution uses
one bounded runner: one active run per node, an atomic runtime lock, a wall-clock
limit, and the deployed Lake wrapper in a named scope below `lean.slice`.
Completion and timeout both kill/check the whole scope before returning.
A successful compiler exit is necessary but not sufficient: incomplete stdout/stderr,
a scope retaining processes, source changes, or compiler diagnostics all **refuse**
success. Declaration inspection is withheld unless that final admission passes.
A locally present declaration module source is SHA-256 fingerprinted and
rechecked; modules imported only from dependencies are not falsely reported
as locally fingerprinted.
Request and result records are appended to the `lean-checks` journal feed.

Pass a named Lake `project` and optional `timeoutMs` with one typed action:

- `mode: "build"` (default), optionally `targets: ["Module.Name"]`: a targeted or
  whole-project Lake build.
- `mode: "file", file: "Module/Name.lean"`: check an edited source inside the
  project. The result retains its SHA-256 and refuses success if the source
  changed during checking. Escaping paths and symlinks are refused.
- `mode: "declaration", module: "Module.Name", declaration: "Namespace.name"`:
  rebuild and import that module in the same bounded job, then ask Lean for the declaration's actual axioms and
  direct constant dependencies. The generated query and raw compiler output
  remain in the receipt; no inference model estimates these properties.

Declaration inspection rebuilds its module before reading the compiled environment;
a failed build never yields an inspection of an older compiled proof. Inspection reports compiler
facts; it does not accept a proof or waive the scientific Axiom Law, work-order,
or spine-lineage receiving conditions. Whole-library census and law instruments
remain in `obsmetrologia-theorem-audit-service`.

Lean/Lake command claims through directory `write` are retired and explicitly
refused. Use `lean-check`; arbitrary command and shell-argument inputs are not
compiler actions. Workspace read and content projection remain available.
