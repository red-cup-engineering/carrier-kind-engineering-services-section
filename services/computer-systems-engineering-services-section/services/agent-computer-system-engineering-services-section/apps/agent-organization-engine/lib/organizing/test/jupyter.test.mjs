import test from "node:test";
import assert from "node:assert/strict";

// signcraft/fiber, signcraft/fixed-point and signcraft/graph/document are retired (commit
// e4c52b0c866: "the old settling modules ... are gone, their capabilities in settle, SignGraph
// and the membrane"). Their replacements: a site is now built directly by SignGraph
// (signgraph/site's `utteranceSite`, over plain-JSON tokens/claims — SignCell's `cell()`
// content-addresses every component, so a class-based Mark/Token/Claim, as `signcell/utterance`
// still constructs, is rejected); `valuationOfReading`/`posit` are SignGraph's
// `valuationOfEvidence`/`posit` (signgraph/valuation.mjs); `fixedPoints` is SignCraft's `settle`
// (the settlement's `.settled` is the fixed-point valuation the old `fixedPoints` produced); and
// `documentOfFixedPoint` is SignCraft's `documentOf` (settle.mjs), whose document carrier is
// tagged "signcraft.document" (was "settledDocument.fixedPoint") but carries the same
// addresses/order/references/valuationSites shape `htmlCarrierOf` reads.
const mark = (value) => ({ kind: "utterance.mark", value });
const token = (markValue) => ({ kind: "utterance.token", hand: "left", mark: markValue });
const claim = (markValue) => ({ kind: "utterance.claim", hand: "right", mark: markValue });
const utterance = (left, right) => Object.freeze({ kind: "utterance.carrier", token: token(left), claim: claim(right) });
import { utteranceSite } from "@red-cup-engineering/signgraph/site";
import { posit, valuationOfEvidence } from "@red-cup-engineering/signgraph/valuation";
import { witnessedReading } from "@red-cup-engineering/signchain/bilattice";
import { settle, documentOf } from "@red-cup-engineering/signcraft/settle";
import { completeGraphWeights } from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/analysis/coloring";
import { htmlCarrierOf } from "@red-cup-engineering/html-engineering-services-section/html-document-render";
import {
  actions,
  jupyterRunCellsAction,
  jupyterNotebookAction,
} from "../src/index.mjs";
import {
  ORGANIZING_JUPYTER_METADATA_KEY,
  decodeIpynb,
  encodeIpynb,
  organizingContentsModel,
  organizingIpynbCodec,
  organizingKernelModel,
  organizingKernelSpec,
  organizingNotebook,
  organizingSessionModel,
  jupyterHtmlRenderProfile,
  jupyterNotebookHtmlFiber,
  jupyterKernelSpecCarrier,
  jupyterNotebookCarrier,
} from "../src/jupyter.mjs";

test("organizing registers Jupyter projection actions for ICK", () => {
  const verbs = actions.map((act) => act.verb);
  assert.equal(verbs.includes("jupyter-notebook"), true);
  assert.equal(verbs.includes("jupyter-run-cells"), true);

  const notebook = jupyterNotebookAction.execute({ id: "work:action", title: "Action Notebook" }, {});
  assert.equal(notebook.nbformat, 4);
  assert.equal(notebook.metadata[ORGANIZING_JUPYTER_METADATA_KEY].id, "work:action");

  const runNotebook = jupyterRunCellsAction.execute({
    id: "work:run",
    title: "Run Notebook",
    cells: ["1 + 1"],
  }, {});
  assert.equal(runNotebook.nbformat, 4);
  assert.equal(runNotebook.cells.filter((cell) => cell.cell_type === "code").length, 1);

});

test("organizing projects its own notebook carrier to nbformat 4 ipynb JSON", () => {
  const notebook = organizingNotebook({
    id: "work:demo",
    title: "Demo Work",
    summary: "A small organizing work notebook.",
    cells: [
      { kind: "markdown", source: "# Demo Work\n" },
      { kind: "code", source: "organize({ socializing: 'demo' })", executionCount: 1 },
    ],
  });

  assert.equal(notebook.nbformat, 4);
  assert.equal(notebook.nbformat_minor, 5);
  assert.equal(jupyterNotebookCarrier.validate(notebook), true);
  assert.equal(jupyterNotebookCarrier.id, "organizing/jupyter/notebook");
  assert.equal(notebook.cells.length, 2);
  assert.equal(notebook.cells[1].cell_type, "code");
  assert.deepEqual(notebook.cells[1].outputs, []);
  assert.deepEqual(notebook.metadata[ORGANIZING_JUPYTER_METADATA_KEY], {
    id: "work:demo",
    title: "Demo Work",
    renderProfile: "jupyter-html",
    summary: "A small organizing work notebook.",
  });

  const encoded = encodeIpynb(notebook);
  assert.equal(encoded, organizingIpynbCodec.encode(notebook));
  assert.deepEqual(decodeIpynb(encoded), notebook);
  assert.deepEqual(organizingIpynbCodec.decode(encoded), notebook);
});

test("organizing owns Jupyter runtime models for kernels, sessions, and contents", () => {
  const spec = organizingKernelSpec({
    argv: ["node", "kernel.mjs", "{connection_file}"],
    displayName: "Organizing JS",
    language: "typescript",
  });
  assert.equal(jupyterKernelSpecCarrier.validate(spec), true);
  assert.equal(jupyterKernelSpecCarrier.id, "organizing/jupyter/kernelspec");
  assert.deepEqual(spec.argv, ["node", "kernel.mjs", "{connection_file}"]);
  assert.equal(spec.display_name, "Organizing JS");

  const kernel = organizingKernelModel({
    id: "kernel-1",
    name: "organizing-js",
    executionState: "idle",
    connections: 2,
  });
  const session = organizingSessionModel({
    id: "session-1",
    path: "work/demo.ipynb",
    name: "Demo Work",
    kernel,
  });
  assert.equal(session.type, "notebook");
  assert.equal(session.kernel.id, "kernel-1");

  const contents = organizingContentsModel({
    name: "demo.ipynb",
    path: "work/demo.ipynb",
    type: "notebook",
    created: "2026-06-25T00:00:00.000Z",
    lastModified: "2026-06-25T00:00:00.000Z",
    content: organizingNotebook({ id: "work:demo", title: "Demo Work" }),
    format: "json",
  });
  assert.equal(contents.type, "notebook");
  assert.equal(contents.mimetype, null);
  assert.equal(contents.format, "json");
});

test("Jupyter HTML presentation is a profile fiber over relating's render machinery", () => {
  const notebookHasCell = utterance(mark("notebook"), mark("has-cell"));
  const site = utteranceSite(notebookHasCell.token, notebookHasCell.claim);
  const presheaf = posit(site, valuationOfEvidence(site, witnessedReading("potential", notebookHasCell.token.mark)));
  const settlement = settle(presheaf);
  const document = documentOf(settlement);
  assert.equal(document.kind, "signcraft.document");

  const nodes = document.addresses.map((address, index) => Object.freeze({
    kind: "rendering.htmlCarrier.node",
    nodeId: `cell-${index}`,
    element: "span",
    semanticAddress: address.key,
    valuationSite: address.key,
  }));
  const carrier = htmlCarrierOf(document, nodes);
  assert.equal(carrier.kind, "rendering.htmlCarrier");

  const notebook = organizingNotebook({
    id: "work:html-fiber",
    title: "HTML Fiber",
    cells: [{ kind: "markdown", source: "# HTML Fiber\n" }],
  });
  const system = Object.freeze({
    kind: "rendering.css.system",
    carrier,
    declarations: Object.freeze([
      Object.freeze({
        kind: "rendering.css.declaration",
        nodeId: nodes[0].nodeId,
        property: "font-family",
        value: "monospace",
        sourceOrder: 0,
      }),
    ]),
    classFactorMap: Object.freeze({
      kind: "rendering.css.classFactorMap",
      constraintGraph: completeGraphWeights(nodes.length),
      nodeIds: nodes.map((node) => node.nodeId),
      classes: nodes.map((_node, index) => index),
      alphabet: nodes.map((_node, index) => `jp-${index}`),
    }),
  });
  const fiber = jupyterNotebookHtmlFiber({ notebook, carrier, system, styleBehavior: "static" });

  assert.equal(jupyterHtmlRenderProfile.name, "jupyter-html");
  assert.equal(fiber.kind, "organizing.jupyter.htmlProfileFiber:witness");
  assert.equal(fiber.renderFiber.kind, "rendering.profile_forms_render_fiber:witness");
  assert.equal(notebook.metadata[ORGANIZING_JUPYTER_METADATA_KEY].renderProfile, "jupyter-html");
});

test("organizing rejects non-notebook JSON at the ipynb boundary", () => {
  assert.throws(
    () => decodeIpynb(JSON.stringify({ nbformat: 3, metadata: {}, cells: [] })),
    /ipynb:/u,
  );
  assert.throws(
    () => organizingKernelSpec({ argv: [], displayName: "Broken", language: "typescript" }),
    /organizingKernelSpec:/u,
  );
});
