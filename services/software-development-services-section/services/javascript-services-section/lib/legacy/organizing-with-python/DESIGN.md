# organizing-with-python — design

Status: **design + skeleton only.** Nothing here is built, installed, or registered.
The two packages live in new directories and are wired into the workspace by the human-facing agent (see the integration checklist at the end).

This pair mirrors the proven `organizing-with-claude` (generic upstream faculty) → `organizing-with-claude-code-in-vs-code` (VS Code cockpit specialization over `organizing-with-vscode-agents`) pattern.
Files read to ground this design:

- `lib/organizing-with-vscode-agents/src/index.mts` — carrier/action idiom, `vsCodeAgentCockpit`, `specializeCoreCapabilityBundle`, `realizeAgentCore`.
- `lib/organizing-with-vscode-agents/src/cockpit.mts` — `VsCodeAgentCockpit`, `CockpitCommand`, `CockpitReadinessCheck`, `vsCodeAgentCockpit()` factory, `defaultCockpitPanels` / `defaultCockpitAttachments`.
- `lib/organizing-with-vscode-agents/src/cockpit-readiness.mts` — observer registry, `workspaceVisibleObserver`, `readText` / `fileExists`, `evaluateCockpitReadiness`.
- `lib/organizing-with-claude-code-in-vs-code/src/index.mts` — the `-in-vs-code` specialization template (`defaultCockpitCommands`, `defaultCockpitReadinessChecks`, observers, `claudeCodeInVsCodeCockpit()`).
- `lib/organizing-with-claude/src/index.mts` + `package.json` — upstream faculty shape and manifest.
- `lib/organizing-with-agents/src/capabilities/index.mts` — `CoreLibraryId`, `specializeCoreCapabilityBundle`, `realizeAgentCore`, `coreCapabilitySpine`.
- `lib/relating/src/typing/kernel.mts` — `carrier()` and `action()` signatures; `@emsenn/relating` re-exports `carrier`, `action`, `tm`.
- `lab/.vscode/{settings,tasks}.json`, `lab/Makefile`, `lab/pyproject.toml`, root `.vscode/{settings,tasks,mcp,extensions}.json`.

## 1. Where this sits among the organizing-with-* siblings

`@emsenn/organizing` is social-scale governing (Gen-2 multi-agent animating).
The `organizing-with-<platform>` packages are **organizing fibers over a concrete platform**: each reads a real tool as an organizing harness.
`organizing-with-claude` reads the Claude harness; `organizing-with-vscode-agents` reads the editor-side agent layer; `organizing-with-python` reads **the JupyterLab platform as an organizing harness** — the lab server as a *habitat* where computational work runs, kernels as the execution contexts that habitat admits, notebook documents as the governed artifacts, sessions as the live document↔kernel pairing, and cell execution as the settled unit of work.

The dependency layering is strict and acyclic, matching the Claude pair:

```
@emsenn/relating
  └─ @emsenn/organizing-with-python          (generic faculty; deps: relating + typebox)
        └─ @emsenn/organizing-with-python-in-vs-code
              deps: organizing-with-python + organizing-with-vscode-agents
```

The generic faculty is provider-neutral (no VS Code, no WSL, no cockpit).
The `-in-vs-code` package is the only one that knows about VS Code, the `lab/` submodule path, and WSL specifics — exactly as `organizing-with-claude-code-in-vs-code` is the only Claude-pair package that knows about the cockpit.

## 2. Carrier / action surface (generic faculty)

All `$id`s are **bare descent paths** under `organizing/python/...
`, never baked URLs (per the schema-$id-scheme rule).
Descent paths:

| Carrier | `$id` | What it is |
|---|---|---|
| `kernelSpecCarrier` | `organizing/python/kernelspec` | An installable kernel: language + launch `argv`. The habitat's admission vocabulary. |
| `kernelCarrier` | `organizing/python/kernel` | A running execution context with an `executionState` (starting/idle/busy/dead/restarting/unknown). |
| `notebookCellCarrier` | `organizing/python/notebook/cell` | One unit of a document: `code` / `markdown` / `raw`, with execution count + output count for code cells. |
| `notebookDocumentCarrier` | `organizing/python/notebook/document` | The persisted artifact (.ipynb / jupytext-paired .py): nbformat, kernelspec name, language, cells, optional `pairedFormat`. |
| `sessionCarrier` | `organizing/python/session` | The live binding of a document path to a `kernelId` (notebook/console/file). |
| `cellExecutionCarrier` | `organizing/python/execution/cell` | A cell submitted to a kernel and its settlement: `status` (ok/error/aborted/pending), execution count, outputs. |
| `labHabitatCarrier` | `organizing/python/habitat` | The lab server read as a habitat: base URL, root dir, version, admitted kernelspecs, live kernels, live sessions. |

The descent nests by specialization: `notebook/cell` and `notebook/document` share the `notebook` stem; `execution/cell` is its own stem (execution is a distinct phase, not a sub-part of a notebook).
The habitat is the apex — the carrier a cockpit reads first.

**Actions** follow the vscode-agents idiom: each carrier gets an identity-morphism `canonicalize-*` action (`domain == codomain`, `runTerm: tm.lam(tm.var(0))`), matching `canonicalizeVsCodeAgentExtensionAction`.
The one non-identity morphism is `executeCellAction` (`organizing.python.execute-cell`), the carrier-to-carrier arrow `cellExecution → cellExecution` that settles a pending execution.
Its IR body is identity at the faculty layer; a downstream runtime that actually owns a kernel connection binds the real round-trip behind the action boundary (kept out of the carrier algebra).
Verbs:

- `organizing.python.canonicalize-kernelspec`
- `organizing.python.canonicalize-kernel`
- `organizing.python.canonicalize-notebook-cell`
- `organizing.python.canonicalize-notebook-document`
- `organizing.python.canonicalize-session`
- `organizing.python.canonicalize-habitat`
- `organizing.python.execute-cell` ← the only non-identity morphism

Reference values mirror `defaultVsCodeAgentExtension`: `defaultPythonKernelSpec` and `defaultLabHabitat` describe the `lab/` submodule's WSL uv-venv lab serving paired py:percent notebooks.
Small readers: `habitatHasLiveKernel`, `codeCellCount`, `pendingCellExecution`.

### Core-capability bundle (deferred, optional)

`organizing-with-vscode-agents` calls `specializeCoreCapabilityBundle("vscode-agents", "editor-agent-extension", uses)` to project the platform across the nine core libraries.
JupyterLab could do the same — `specializeCoreCapabilityBundle("jupyterlab", "notebook-execution-habitat", uses)` with per-library `providerUse` strings (e.g. computing = "classify kernel availability and resource limits as capability decisions"; animating = "read a kernel session as a perceive-act loop over cells").
This is **deliberately omitted from the skeleton** to keep the generic faculty's dependency to `@emsenn/relating` only (the bundle would pull in `@emsenn/organizing-with-agents`).
If wanted, it belongs in the generic package and adds that dependency.
Marked as a TODO for the human agent's judgment, not scaffolded.

## 3. The cockpit specialization (`-in-vs-code`)

Mirrors `claudeCodeInVsCodeCockpit()` exactly: `provider: "python"`, `upstreamPackage: "@emsenn/organizing-with-python"`, `subject: "dev.bare-cedar-fog.emsenn.net/python-in-vs-code"`, built via the shared `vsCodeAgentCockpit(...)
` factory (so it inherits `defaultCockpitPanels` and `defaultCockpitAttachments`).

**Cockpit commands** (`defaultCockpitCommands`):

| name | route | read-only | purpose |
|---|---|---|---|
| `read-workspace` | `/api/workspace` | yes | Load the lab habitat (base URL, kernelspecs, kernels, sessions). |
| `read-readiness` | `/api/readiness` | yes | Evaluate the cockpit readiness checks. |
| `read-cockpit` | `/api/cockpit` | yes | Read the cockpit composition as JSON. |
| `open-notebook` | `/notebook/open` | yes | Open a paired .py / .ipynb document bound to a kernel session. |
| `run-cell` | `/notebook/run-cell` | no | Submit a code cell and settle the execution carrier. |
| `restart-kernel` | `/kernel/restart` | no | Restart the notebook's kernel. |
| `run-lab-gate` | `/lab/gate` | no | Run `make check` in `lab/` (ruff + mypy + pytest). |

**Readiness checks** (`defaultCockpitReadinessChecks`) + their observers:

| check id | observer | passes when |
|---|---|---|
| `workspace-visible` | `workspaceVisibleObserver([...])` (generic) | `pnpm-workspace.yaml` lists both new packages. |
| `lab-venv-present` | `observeLabVenv` | `lab/.venv/bin/python` (WSL interpreter) and `lab/pyproject.toml` exist. |
| `jupyter-installed` | `observeJupyterInstalled` | `lab/pyproject.toml` declares `jupyterlab` + `jupytext`; `lab/Makefile` has `jupyter lab`. |
| `notebooks-jupytext-paired` | `observeNotebooksPaired` | `lab/notebooks/` exists and `lab/Makefile` has a `jupytext` sync target. |

Observers reuse `readText` / `fileExists` from `@emsenn/organizing-with-vscode-agents` and are pure file observations over a `root`, exactly like `observeClaudeUpstream` / `observeClaudeConfig`.
`evaluateCockpitReadiness({root, cockpit})` delegates to the generic evaluator with these observers.
TODO markers in source flag the few facts to verify against the live `lab/` submodule (exact venv path on the build OS, jupytext pairing config form, the exact VS Code command id behind `open-notebook`).

## 4. Super-repo cockpit plan (design only — NOT scaffolded here)

These edits touch shared/root files and are **left for the human-facing agent**; they are described here, not performed, because of the 8-peer-agent + index.lock constraint and the "new-dir-only" safety rule.

### 4a. Root `561-group.code-workspace` (new, multi-root)

There is no root `.code-workspace` today.
Propose one so the manifold opens as a single multi-root window.
Crucially, `lab/` must be opened as a **WSL** folder (its interpreter is `.venv/bin/python`, a Linux path), while `lib/`, `lean/`, `content/`, `sites/` are native Windows folders.
VS Code multi-root supports mixing only via a Remote-WSL window for the lab root; the practical plan is:

```jsonc
// 561-group.code-workspace  (proposed)
{
  "folders": [
    { "name": "lib",     "path": "lib" },
    { "name": "lean",    "path": "lean" },
    { "name": "content", "path": "content" },
    { "name": "sites",   "path": "sites" },
    { "name": "lab (WSL)", "path": "lab" }   // open via Remote-WSL for the venv
  ],
  "settings": {
    // keep the lab folder's own .vscode/settings.json authoritative for Python;
    // do not hoist Python settings to the workspace level.
  },
  "extensions": {
    "recommendations": [
      "leanprover.lean4", "paperproof.paperproof", "usernamehw.errorlens",
      "ms-python.python", "ms-toolsai.jupyter", "charliermarsh.ruff",
      "ms-python.mypy-type-checker", "ms-vscode-remote.remote-wsl"
    ]
  }
}
```

Note: the `lab/` submodule already ships its own `.vscode/{settings,tasks,launch, extensions}.json` cockpit (WSL Python, Makefile-wrapper tasks).
The workspace file should **defer** to it for the lab folder rather than duplicate Python settings.

### 4b. Extend (do not clobber) the root `.vscode/`

The root `.vscode/` is Lean-centric today (`settings.json` = lean4 + ts; `tasks.json` = Lean build / blueprint; `mcp.json` = lean-lsp + typescript-lsp; `extensions.json` = lean4 / paperproof / errorlens).
Extensions are **additive**:

- **`.vscode/tasks.json`** — append (never replace) JupyterLab agent tasks that wrap the `lab/` Makefile via WSL, alongside the existing Lean tasks:
  - `Jupyter: lab gate (WSL)` → `wsl.exe bash -lc 'cd lab && make check'`
  - `Jupyter: launch lab (WSL)` → `wsl.exe bash -lc 'cd lab && make lab'` (background)
  - `Jupyter: sync notebooks (WSL)` → `wsl.exe bash -lc 'cd lab && make nb'` Each is a thin Makefile wrapper, matching the lab cockpit's own convention and the root Lean tasks' "command shows exactly what it does" style.
    These are the agent-facing actuators the `run-lab-gate` cockpit command corresponds to.
- **`.vscode/extensions.json`** — add `ms-toolsai.jupyter`, `ms-python.python`, `ms-vscode-remote.remote-wsl` to `recommendations` (additive list edit).
- **`.vscode/settings.json`** — optional, minimal: add `lab/.venv/**` to `files.watcherExclude` / `search.exclude` so the WSL venv doesn't churn the native-side watcher.
  Do **not** add Python interpreter settings at root — those stay in `lab/.vscode/settings.json` (WSL-scoped).
- **`.vscode/mcp.json`** — no change required.
  If a JupyterLab MCP bridge is ever added it goes here additively, but it is out of scope for this pair.

The wiring back to `organizing-with-vscode-agents`: the cockpit carrier produced by `pythonInVsCodeCockpit()` is the *typed description* of exactly these commands/attachments/readiness checks.
The `.vscode` tasks are the concrete actuators; the cockpit carrier is the witnessable model a serving layer (e.g. the dev.bare-cedar-fog.emsenn.net cockpit / a `/api/cockpit` route) projects.
Keep them in sync: the tasks list and `defaultCockpitCommands` describe the same actions at two altitudes (editor actuator vs. typed carrier).

## 5. Integration checklist (for the human-facing agent)

Do these on `main`, serially, mindful of `index.lock` contention.
Nothing below has been done.

1. **Register packages in `pnpm-workspace.yaml`.** Add the two new package globs/ paths (match the existing `lib/*` entry style):
   - `lib/organizing-with-python`
   - `lib/organizing-with-python-in-vs-code` If `lib/*` is already a glob that captures them, no edit is needed — verify.
2. **Verify `tsconfig.base.json` path.** Both `tsconfig.json` files extend `../../tsconfig.base.json`; confirm that resolves from `lib/<pkg>/` (it does for sibling lib packages — they use the identical extends).
3. **Install.** `pnpm install` at repo root to link the new `workspace:*` deps (`@emsenn/relating`, `@sinclair/typebox`, `@emsenn/organizing-with-vscode-agents`, `@emsenn/organizing-with-python`).
4. **Build in dependency order:**
   1. `@emsenn/organizing-with-python` (`pnpm -F @emsenn/organizing-with-python build`)
   2. `@emsenn/organizing-with-python-in-vs-code` (relating + vscode-agents are assumed already built.)
5. **Typecheck.** `pnpm -F @emsenn/organizing-with-python check` and the same for the cockpit package.
  Resolve any TODO(verify) markers against the live `lab/` submodule (venv path, jupytext config form, the `open-notebook` command id).
6. **Optional — core-capability bundle.** If the nine-library projection is wanted on the generic faculty, add `@emsenn/organizing-with-agents` as a dep and a `specializeCoreCapabilityBundle("jupyterlab", ...)
  ` block (see §2).
  This was intentionally left out of the skeleton.
7. **Super-repo cockpit (§4).** Create `561-group.code-workspace` and make the *additive* edits to `.vscode/{tasks,extensions,settings}.json`.
  These are shared-file edits — do them when no peer agent is mid-write, and prefer append over rewrite.
  Keep the new tasks in sync with `defaultCockpitCommands`.
8. **Serve / mount (optional, deferred).** If the dev.bare-cedar-fog.emsenn.net cockpit should expose `/api/cockpit` and `/api/readiness` for JupyterLab, mount the cockpit carrier there the way the Claude cockpit is mounted.
  Out of scope for this pair.
