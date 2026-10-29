/**
 * @red-cup-engineering/organizing-with-python-in-vs-code
 *
 * The JupyterLab specialization of the generic VS Code agent cockpit. The
 * cockpit carrier, panels, attachments, and readiness framework all live in
 * @red-cup-engineering/organizing-with-vscode-agents; this package binds them to JupyterLab:
 * the generic Python faculty re-exports, the "jupyter" cockpit defaults
 * (open notebook, run cell, restart kernel, run the lab gate), and the JupyterLab
 * readiness observers (WSL uv venv present, jupyter installed, notebooks
 * jupytext-paired).
 *
 * It mirrors lib/organizing-with-claude-code-in-vs-code/src/index.mts exactly:
 * provider="jupyter", upstreamPackage="@red-cup-engineering/organizing-with-python",
 * a defaultCockpitCommands list, defaultCockpitReadinessChecks, per-check
 * observers, and a `pythonInVsCodeCockpit()` factory.
 */
import {
  vsCodeAgentCockpit,
  evaluateCockpitReadiness as evaluateGenericCockpitReadiness,
  workspaceVisibleObserver,
  readText,
  fileExists,
  type CockpitCommand,
  type CockpitReadinessCheck,
  type CockpitReadinessObservers,
  type CockpitReadinessObservation,
  type CockpitReadinessReport,
  type VsCodeAgentCockpit,
} from "@red-cup-engineering/organizing-with-vscode-agents";

// Re-export the generic VS Code agent cockpit surface so this package is a
// complete cockpit boundary, symmetric with organizing-with-claude-code-in-vs-code.
export {
  vsCodeAgentCockpit,
  defaultCockpitPanels,
  defaultCockpitAttachments,
} from "@red-cup-engineering/organizing-with-vscode-agents";
export type {
  CockpitPanel,
  CockpitPanelId,
  CockpitCommand,
  CockpitAttachment,
  CockpitAttachmentKind,
  CockpitReadinessCheck,
  CockpitReadinessReport,
  CockpitReadinessEvaluation,
  CockpitReadinessStatus,
  VsCodeAgentCockpit,
} from "@red-cup-engineering/organizing-with-vscode-agents";

// The generic Python faculty: carriers (habitat, kernel, kernelspec,
// notebook document, cell, session, execution) and their actions.
export * as jupyterLab from "@red-cup-engineering/organizing-with-python";
export {
  labHabitatCarrier,
  kernelCarrier,
  kernelSpecCarrier,
  notebookDocumentCarrier,
  notebookCellCarrier,
  sessionCarrier,
  cellExecutionCarrier,
  defaultLabHabitat,
  defaultPythonKernelSpec,
  habitatHasLiveKernel,
  codeCellCount,
  pendingCellExecution,
  executeCellAction,
} from "@red-cup-engineering/organizing-with-python";
export type {
  JupyterLabHabitat,
  JupyterKernel,
  JupyterKernelSpec,
  KernelExecutionState,
  JupyterNotebookDocument,
  JupyterNotebookCell,
  CellType,
  JupyterSession,
  SessionType,
  JupyterCellExecution,
  ExecutionStatus,
  OutputKind,
} from "@red-cup-engineering/organizing-with-python";

/** The JupyterLab cockpit is a {@link VsCodeAgentCockpit} specialized to JupyterLab. */
export type PythonInVsCodeCockpit = VsCodeAgentCockpit;
export type PythonInVsCodeCockpitInput = Readonly<{
  subject?: string;
  commands?: readonly CockpitCommand[];
  readinessChecks?: readonly CockpitReadinessCheck[];
}>;

// The lab/ submodule path the cockpit drives. Centralized so observers and the
// integration checklist agree on one location.
// TODO(verify): confirm the lab submodule path if it ever moves from `lab/`.
const LAB_ROOT = "lab";

export const defaultCockpitCommands: readonly CockpitCommand[] = Object.freeze([
  {
    name: "read-workspace",
    route: "/api/workspace",
    packageName: "@red-cup-engineering/organizing-with-python",
    summary: "Load the JupyterLab habitat: base URL, kernelspecs, live kernels, and sessions.",
    readOnly: true,
    writesWorkspace: false,
  },
  {
    name: "read-readiness",
    route: "/api/readiness",
    packageName: "@red-cup-engineering/organizing-with-python-in-vs-code",
    summary: "Evaluate cockpit readiness checks against the current lab/ submodule files.",
    readOnly: true,
    writesWorkspace: false,
  },
  {
    name: "read-cockpit",
    route: "/api/cockpit",
    packageName: "@red-cup-engineering/organizing-with-python-in-vs-code",
    summary: "Read the JupyterLab VS Code cockpit composition as a stable JSON carrier.",
    readOnly: true,
    writesWorkspace: false,
  },
  {
    name: "open-notebook",
    // Maps to the VS Code command `jupyter.openNotebook` / vscode.open on the
    // notebook document. TODO(verify): exact command id for the active editor.
    route: "/notebook/open",
    packageName: "@red-cup-engineering/organizing-with-python",
    summary: "Open a notebook document (paired .py or .ipynb) in the editor, bound to a kernel session.",
    readOnly: true,
    writesWorkspace: false,
  },
  {
    name: "run-cell",
    route: "/notebook/run-cell",
    packageName: "@red-cup-engineering/organizing-with-python",
    summary: "Submit a code cell to its kernel and settle the cell-execution carrier (outputs + status).",
    readOnly: false,
    writesWorkspace: false,
  },
  {
    name: "restart-kernel",
    route: "/kernel/restart",
    packageName: "@red-cup-engineering/organizing-with-python",
    summary: "Restart the notebook's kernel, returning the kernel carrier in its restarting/idle state.",
    readOnly: false,
    writesWorkspace: false,
  },
  {
    name: "run-lab-gate",
    // Wraps `make check` in lab/ (lint + format-check + types + tests).
    route: "/lab/gate",
    packageName: "@red-cup-engineering/organizing-with-python-in-vs-code",
    summary: "Run the lab/ full gate (make check): ruff lint+format, mypy strict, and the pytest suite.",
    readOnly: false,
    writesWorkspace: false,
  },
]);

export const defaultCockpitReadinessChecks: readonly CockpitReadinessCheck[] = Object.freeze([
  {
    id: "workspace-visible",
    label: "Workspace package graph is visible",
    required: true,
    evidence: "pnpm-workspace.yaml includes this package and @red-cup-engineering/organizing-with-python.",
  },
  {
    id: "lab-venv-present",
    label: "The lab/ WSL uv venv is present",
    required: true,
    evidence: "lab/.venv/bin/python (the WSL-built interpreter) and lab/pyproject.toml exist.",
  },
  {
    id: "jupyter-installed",
    label: "JupyterLab is installed in the lab habitat",
    required: true,
    evidence: "lab/pyproject.toml declares the notebooks extra and the lab/ Makefile exposes `make lab`.",
  },
  {
    id: "notebooks-jupytext-paired",
    label: "Notebooks are jupytext-paired py:percent sources",
    required: true,
    evidence: "lab/notebooks/*.py paired text sources back the .ipynb documents (lab/ Makefile `nb` target).",
  },
]);

export function pythonInVsCodeCockpit(
  input: PythonInVsCodeCockpitInput = {},
): PythonInVsCodeCockpit {
  return vsCodeAgentCockpit({
    subject: input.subject ?? "dev.bare-cedar-fog.emsenn.net/python-in-vs-code",
    provider: "python",
    upstreamPackage: "@red-cup-engineering/organizing-with-python",
    commands: input.commands ?? defaultCockpitCommands,
    readinessChecks: input.readinessChecks ?? defaultCockpitReadinessChecks,
  });
}

export const defaultPythonInVsCodeCockpit = pythonInVsCodeCockpit();

// ─────────────────────────── readiness observers ───────────────────────────

function observeLabVenv(root: string): CockpitReadinessObservation {
  const observed: string[] = [];
  const missing: string[] = [];
  // TODO(verify): on Windows the venv interpreter lives at .venv/bin/python only
  // when the venv was built in WSL (the lab/ design intent). A Windows-native
  // venv would be .venv/Scripts/python.exe — but lab/ is explicitly WSL.
  if (fileExists(root, `${LAB_ROOT}/.venv/bin/python`)) observed.push(`${LAB_ROOT}/.venv/bin/python`);
  else missing.push(`${LAB_ROOT}/.venv/bin/python`);
  if (fileExists(root, `${LAB_ROOT}/pyproject.toml`)) observed.push(`${LAB_ROOT}/pyproject.toml`);
  else missing.push(`${LAB_ROOT}/pyproject.toml`);
  return Object.freeze({ observed: Object.freeze(observed), missing: Object.freeze(missing) });
}

function observeJupyterInstalled(root: string): CockpitReadinessObservation {
  const observed: string[] = [];
  const missing: string[] = [];
  const pyproject = readText(root, `${LAB_ROOT}/pyproject.toml`);
  if (pyproject === null) {
    missing.push(`${LAB_ROOT}/pyproject.toml`);
  } else {
    observed.push(`${LAB_ROOT}/pyproject.toml`);
    // The lab declares jupyterlab under a notebooks extra; `make lab` runs
    // `uv run --extra notebooks jupyter lab`.
    if (pyproject.includes("jupyterlab")) observed.push("dependency: jupyterlab");
    else missing.push("dependency: jupyterlab");
    if (pyproject.includes("jupytext")) observed.push("dependency: jupytext");
    else missing.push("dependency: jupytext");
  }
  // The Makefile gate that actually launches the lab.
  const makefile = readText(root, `${LAB_ROOT}/Makefile`);
  if (makefile !== null && makefile.includes("jupyter lab")) observed.push("lab/Makefile: make lab");
  else missing.push("lab/Makefile: make lab");
  return Object.freeze({ observed: Object.freeze(observed), missing: Object.freeze(missing) });
}

function observeNotebooksPaired(root: string): CockpitReadinessObservation {
  const observed: string[] = [];
  const missing: string[] = [];
  if (fileExists(root, `${LAB_ROOT}/notebooks`)) observed.push(`${LAB_ROOT}/notebooks/`);
  else missing.push(`${LAB_ROOT}/notebooks/`);
  // Pairing is configured two ways in lab/: the [tool.jupytext] table in
  // pyproject.toml (the authoritative pairing config) and the Makefile `nb`
  // target (`jupytext --sync notebooks/*.py`). Either is sufficient evidence.
  const pyproject = readText(root, `${LAB_ROOT}/pyproject.toml`);
  const makefile = readText(root, `${LAB_ROOT}/Makefile`);
  const pairedByConfig = pyproject !== null && pyproject.includes("[tool.jupytext]");
  const pairedByMakefile = makefile !== null && makefile.includes("jupytext");
  if (pairedByConfig) observed.push("lab/pyproject.toml: [tool.jupytext]");
  if (pairedByMakefile) observed.push("lab/Makefile: jupytext sync");
  if (!pairedByConfig && !pairedByMakefile) missing.push("jupytext pairing config ([tool.jupytext] or Makefile nb target)");
  return Object.freeze({ observed: Object.freeze(observed), missing: Object.freeze(missing) });
}

export const jupyterLabCockpitReadinessObservers: CockpitReadinessObservers = Object.freeze({
  "workspace-visible": workspaceVisibleObserver([
    "lib/organizing-with-python-in-vs-code",
    "lib/organizing-with-python",
  ]),
  "lab-venv-present": observeLabVenv,
  "jupyter-installed": observeJupyterInstalled,
  "notebooks-jupytext-paired": observeNotebooksPaired,
});

/** Evaluate the JupyterLab cockpit's readiness using the JupyterLab observers. */
export function evaluateCockpitReadiness(
  options: Readonly<{ root: string; cockpit: PythonInVsCodeCockpit }>,
): CockpitReadinessReport {
  return evaluateGenericCockpitReadiness({
    root: options.root,
    cockpit: options.cockpit,
    observers: jupyterLabCockpitReadinessObservers,
  });
}
