import { deepStrictEqual, ok, strictEqual, throws } from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  admitArtifactFabricationRealizationReceipt,
  admitArtifactFabricationSpecification,
} from "@red-cup-engineering/computer-code-development-engine/artifact-fabrication";
import {
  ALLOWED_AXIOMS,
  axiomBudgetFindings,
  axiomCensusProgram,
  blueprintChapterPath,
  blueprintInputLine,
  blueprintNodePath,
  candidateOfProofWorkOrder,
  chartFindings,
  digestOf,
  draftOrderOfFrontier,
  headlineStatusOf,
  nextNodeFileNumber,
  parentOrdersOf,
  promotedFrontierLabels,
  leanModulePath,
  OBLIGATION_IDS,
  parseProofWorkOrder,
  PROJECTION_IDS,
  receiptCandidateOf,
  renderBlueprintNode,
  seatInChapter,
  versePath,
} from "../src/proof-work-order.mjs";
import { parseArgv as parseAdmitArgv } from "../scripts/admit-proof-work-order.mjs";
import { parseArgv as parseRealizeArgv, statusOf } from "../scripts/realize-blueprint-node.mjs";
import { parseArgv as parseDraftArgv } from "../scripts/draft-proof-work-order.mjs";
import { parseArgv as parseAuditArgv, runGates } from "../scripts/audit-proof-realization.mjs";

const FIXTURE_ROOT = fileURLToPath(new URL("./fixtures/proof-line/", import.meta.url)).replace(/\/$/u, "");

function order() {
  return {
    type: "ObsmetrologiaProofWorkOrder",
    version: 1,
    id: "fixture",
    title: "Fixture",
    module: "Obsmetrologia.Fixture",
    headline: "Obsmetrologia.Fixture.headline",
    declarations: ["Obsmetrologia.Fixture.headline"],
    axiomBudget: ["Quot.sound"],
    requirements: [{ id: "is-true", statement: "The headline is True." }],
    prohibitions: [{ id: "no-sorry", statement: "No sorry." }],
    openQuestions: [{ id: "later", question: "What next?", blocking: false }],
    corpus: ["content/text/glossary/README.md"],
    references: [],
    blueprint: {
      chapter: "fixture",
      chapterFile: "00-fixture",
      file: "01-node",
      section: "Fixture",
      label: "thm:fixture",
      title: "Fixture",
      statement: "True.",
      uses: [],
      frontier: [{ label: "thm:fixture-frontier", title: "Fixture frontier", statement: "Open.", uses: ["thm:fixture"] }],
    },
    verse: { module: "ObsmetrologiaManual.Fixture" },
  };
}

const sourceMeta = () => ({ locator: "content/work-orders/fixture.json", digest: digestOf("fixture"), lineCount: 40, toolchain: "leanprover/lean4:v4.31.0\n" });

test("parseProofWorkOrder: accepts the fixture and refuses each broken shape by code", () => {
  strictEqual(parseProofWorkOrder(JSON.stringify(order())).id, "fixture");
  const code = (mutate) => {
    const broken = order();
    mutate(broken);
    try {
      parseProofWorkOrder(JSON.stringify(broken));
    } catch (error) {
      return error.code;
    }
    return "ADMITTED";
  };
  strictEqual(code((o) => { o.type = "Other"; }), "INVALID_ORDER");
  strictEqual(code((o) => { o.axiomBudget = ["sorryAx"]; }), "FORBIDDEN_AXIOM");
  strictEqual(code((o) => { o.axiomBudget = ["propext"]; }), "AXIOM_OUTSIDE_LAW");
  strictEqual(code((o) => { o.headline = "Obsmetrologia.Fixture.other"; }), "HEADLINE_NOT_DECLARED");
  strictEqual(code((o) => { o.declarations = ["Elsewhere.x"]; }), "INVALID_DECLARATION");
  strictEqual(code((o) => { o.corpus = []; }), "MISSING_CORPUS");
  strictEqual(code((o) => { o.blueprint.label = "hat"; }), "INVALID_LABEL");
  strictEqual(code((o) => { o.blueprint.frontier[0].label = "thm:fixture"; }), "DUPLICATE_LABEL");
  strictEqual(code((o) => { o.verse.module = "Obsmetrologia.Fixture"; }), "INVALID_VERSE");
  strictEqual(code((o) => { o.requirements = []; }), "MISSING_CLAUSES");
  throws(() => parseProofWorkOrder("{"), /INVALID_JSON/u);
});

test("candidateOfProofWorkOrder: admits through the admission service, deterministically", () => {
  const candidate = candidateOfProofWorkOrder(order(), sourceMeta());
  strictEqual(candidate.artifact.kind, "obsmetrologia-proof");
  deepStrictEqual(candidate.projections.map(({ id }) => id), [...PROJECTION_IDS]);
  deepStrictEqual(candidate.acceptanceObligations.map(({ id }) => id), [...OBLIGATION_IDS]);
  strictEqual(candidate.traceability.length, 2);
  const first = admitArtifactFabricationSpecification(candidate);
  const second = admitArtifactFabricationSpecification(candidateOfProofWorkOrder(order(), sourceMeta()));
  strictEqual(first.type, "ArtifactFabricationSpecification");
  strictEqual(first.specificationDigest, second.specificationDigest);
  strictEqual(first.constraints.find(({ id }) => id === "lean-toolchain").revision, "leanprover/lean4:v4.31.0");
});

test("candidateOfProofWorkOrder: a blocking open question is refused at admission", () => {
  const blocked = order();
  blocked.openQuestions[0].blocking = true;
  strictEqual(admitArtifactFabricationSpecification(candidateOfProofWorkOrder(blocked, sourceMeta())).code, "BLOCKING_OPEN_QUESTION");
});

test("candidateOfProofWorkOrder: axiom-discipline constraint states the 2026-09-21 axiom law", () => {
  deepStrictEqual(ALLOWED_AXIOMS, ["Quot.sound"]);
  const candidate = candidateOfProofWorkOrder(order(), sourceMeta());
  const constraint = candidate.constraints.find(({ id }) => id === "axiom-discipline");
  strictEqual(constraint.authority, "Obsmetrologia axiom law (owner ruling)");
  strictEqual(constraint.revision, "2026-09-21");
  strictEqual(
    constraint.locator,
    "lib/emsenn/services/561-group/services/science-services-section/services/information-science-services-section/services/math-services-section/services/obsmetrological-services-section/content/text/documents/articles/notes/2026/09/21/2026-09-21-note-on-the-axiom-law-spine-lineage-and-the-light-cone.md",
  );
  strictEqual(
    constraint.statement,
    "collectAxioms of every named declaration is a subset of {Quot.sound}; propext, Classical.choice and sorryAx are never within budget.",
  );
});

test("paths: module, verse, node, chapter, and input line", () => {
  strictEqual(leanModulePath("Obsmetrologia.A.B"), "Obsmetrologia/A/B.lean");
  strictEqual(versePath("ObsmetrologiaManual.BookVII.X"), "docs/verso/ObsmetrologiaManual/BookVII/X.lean");
  strictEqual(blueprintNodePath(order().blueprint), "docs/blueprint/src/chapters/fixture/01-node.tex");
  strictEqual(blueprintChapterPath(order().blueprint), "docs/blueprint/src/chapters/00-fixture.tex");
  strictEqual(blueprintInputLine(order().blueprint), "\\input{chapters/fixture/01-node}");
});

test("renderBlueprintNode: red until settled, frontier nodes always red", () => {
  const red = renderBlueprintNode(order(), { status: "frontier" });
  ok(red.startsWith("\\section{Fixture}\n"));
  ok(red.includes("\\label{thm:fixture}\\lean{Obsmetrologia.Fixture.headline}\\notready\n"));
  ok(red.includes("\\label{thm:fixture-frontier}\\notready\\uses{thm:fixture}\n"));
  ok(!red.includes("\\leanok"));
  const green = renderBlueprintNode(order(), { status: "settled" });
  ok(green.includes("\\label{thm:fixture}\\lean{Obsmetrologia.Fixture.headline}\\leanok\n"));
  ok(green.includes("\\label{thm:fixture-frontier}\\notready"));
  throws(() => renderBlueprintNode(order(), { status: "green" }), /INVALID_STATUS/u);
});

test("seatInChapter: appends the input line once", () => {
  const first = seatInChapter("\\chapter{X}\n", order().blueprint);
  strictEqual(first.changed, true);
  strictEqual(first.text, "\\chapter{X}\n\\input{chapters/fixture/01-node}\n");
  const second = seatInChapter(first.text, order().blueprint);
  strictEqual(second.changed, false);
  strictEqual(second.text, first.text);
});

test("axiomCensusProgram: imports the module and names every declaration", () => {
  const program = axiomCensusProgram(order());
  ok(program.includes("import Obsmetrologia.Fixture\n"));
  ok(program.includes("[`Obsmetrologia.Fixture.headline]"));
  ok(program.includes("collectAxioms"));
});

test("axiomBudgetFindings: missing declaration, axiom outside budget, clean", () => {
  deepStrictEqual(axiomBudgetFindings([], order()), [{ code: "declaration-missing", declaration: "Obsmetrologia.Fixture.headline" }]);
  deepStrictEqual(
    axiomBudgetFindings([{ name: "Obsmetrologia.Fixture.headline", axioms: ["Quot.sound", "Classical.choice"] }], order()),
    [
      { code: "axiom-outside-budget", declaration: "Obsmetrologia.Fixture.headline", axioms: ["Classical.choice"] },
      { code: "axiom-outside-law", declaration: "Obsmetrologia.Fixture.headline", axioms: ["Classical.choice"] },
    ],
  );
  deepStrictEqual(axiomBudgetFindings([{ name: "Obsmetrologia.Fixture.headline", axioms: ["Quot.sound"] }], order()), []);
});

test("axiomBudgetFindings: flags an axiom outside the law even when the order (wrongly) budgeted it", () => {
  const historical = order();
  historical.axiomBudget = ["propext"];
  deepStrictEqual(
    axiomBudgetFindings([{ name: "Obsmetrologia.Fixture.headline", axioms: ["propext"] }], historical),
    [{ code: "axiom-outside-law", declaration: "Obsmetrologia.Fixture.headline", axioms: ["propext"] }],
  );
});

test("chartFindings: node presence, headline reference, catalog, and weld findings", () => {
  const chart = (nodes, names) => ({
    texWorkspaceRead: { blueprintClaimGraph: { nodes } },
    declarationCatalog: { entries: names.map((name) => ({ name, module: "Obsmetrologia.Fixture" })) },
  });
  const good = chart(
    [{ id: "thm:fixture", leanDeclarations: ["Obsmetrologia.Fixture.headline"] }, { id: "thm:fixture-frontier", leanDeclarations: [] }],
    ["Obsmetrologia.Fixture.headline"],
  );
  deepStrictEqual(chartFindings(good, [], order()), []);
  deepStrictEqual(chartFindings(chart([], []), [], order()), [
    { code: "node-missing", label: "thm:fixture" },
    { code: "node-missing", label: "thm:fixture-frontier" },
    { code: "declaration-not-cataloged", declaration: "Obsmetrologia.Fixture.headline" },
  ]);
  const elsewhere = chart([{ id: "thm:fixture", leanDeclarations: ["Obsmetrologia.Fixture.headline"] }, { id: "thm:fixture-frontier", leanDeclarations: [] }], []);
  elsewhere.declarationCatalog.entries.push({ name: "Obsmetrologia.Fixture.headline", module: "Obsmetrologia.Other" });
  deepStrictEqual(chartFindings(elsewhere, [], order()), [{ code: "declaration-not-in-module", declaration: "Obsmetrologia.Fixture.headline", module: "Obsmetrologia.Other" }]);
  const weld = [{ code: "unmatched-lean-reference", nodeId: "thm:fixture", message: "x" }, { code: "unmatched-lean-reference", nodeId: "thm:other", message: "y" }, { code: "red-settled", nodeId: "thm:fixture", message: "receipt pending" }];
  deepStrictEqual(chartFindings(good, weld, order()), [{ code: "unmatched-lean-reference", label: "thm:fixture", message: "x" }]);
});

test("receiptCandidateOf: binds one evidence per projection and obligation and admits", () => {
  const specification = admitArtifactFabricationSpecification(candidateOfProofWorkOrder(order(), sourceMeta()));
  const evidence = (id) => ({ locator: id, digest: digestOf(id) });
  const candidate = receiptCandidateOf(specification, {
    projections: Object.fromEntries(PROJECTION_IDS.map((id) => [id, evidence(id)])),
    obligations: Object.fromEntries(OBLIGATION_IDS.map((id) => [id, evidence(id)])),
  });
  const receipt = admitArtifactFabricationRealizationReceipt(specification, candidate);
  strictEqual(receipt.type, "ArtifactFabricationRealizationReceipt");
  strictEqual(receipt.realizations.length, 3);
  strictEqual(receipt.acceptances.length, 4);
});

test("statusOf: frontier without a receipt, settled only when the receipt binds the order", () => {
  const admitted = admitArtifactFabricationSpecification(candidateOfProofWorkOrder(order(), sourceMeta()));
  const admission = { admitted };
  strictEqual(statusOf(admission, undefined), "frontier");
  strictEqual(statusOf(admission, { receipt: { type: "ArtifactFabricationRealizationReceipt", artifactId: "fixture", specificationDigest: admitted.specificationDigest } }), "settled");
  throws(() => statusOf(admission, { receipt: { type: "ArtifactFabricationRealizationReceipt", artifactId: "fixture", specificationDigest: "sha256:0" } }), /different order or a different revision/u);
  throws(() => statusOf(admission, { nope: true }), /does not carry an admitted realization receipt/u);
});

test("runGates: four gates over the fixture workspace with an injected command runner", async () => {
  const calls = [];
  const written = [];
  const passing = async (command, args, { cwd }) => {
    calls.push({ command, args, cwd });
    if (args[0] === "env") return { code: 0, stdout: "Obsmetrologia.Fixture.headline\tQuot.sound\n", stderr: "" };
    return { code: 0, stdout: "ok", stderr: "" };
  };
  const gates = await runGates({
    order: order(),
    packageRoot: FIXTURE_ROOT,
    runCommand: passing,
    readText: async (path) => (path.endsWith("Fixture.lean") ? "import Obsmetrologia.Fixture\n" : ""),
    writeText: async (path, text) => { written.push({ path, text }); },
  });
  deepStrictEqual(gates.map(({ id, passed }) => ({ id, passed })), OBLIGATION_IDS.map((id) => ({ id, passed: true })));
  deepStrictEqual(calls.map(({ args }) => args[0]), ["build", "env", "build"]);
  strictEqual(calls[0].args[1], "Obsmetrologia.Fixture");
  ok(written[0].path.endsWith("/.lake/proof-audit/fixture.lean"));
  ok(calls[2].cwd.endsWith("/docs/verso"));

  const failing = async (command, args) => (args[0] === "build" && args[1] === "Obsmetrologia.Fixture" ? { code: 1, stdout: "", stderr: "error" } : passing(command, args, { cwd: "" }));
  const broken = await runGates({ order: order(), packageRoot: FIXTURE_ROOT, runCommand: failing, readText: async () => "import Obsmetrologia.Fixture\n", writeText: async () => {} });
  strictEqual(broken[0].passed, false);
  strictEqual(broken[0].code, 1);

  const overBudget = await runGates({
    order: order(),
    packageRoot: FIXTURE_ROOT,
    runCommand: async (command, args) => (args[0] === "env" ? { code: 0, stdout: "Obsmetrologia.Fixture.headline\tQuot.sound,sorryAx\n", stderr: "" } : { code: 0, stdout: "", stderr: "" }),
    readText: async () => "import Obsmetrologia.Fixture\n",
    writeText: async () => {},
  });
  deepStrictEqual(overBudget[1].findings, [
    { code: "axiom-outside-budget", declaration: "Obsmetrologia.Fixture.headline", axioms: ["sorryAx"] },
    { code: "axiom-outside-law", declaration: "Obsmetrologia.Fixture.headline", axioms: ["sorryAx"] },
  ]);
  strictEqual(overBudget[1].passed, false);

  const noVerse = await runGates({ order: order(), packageRoot: FIXTURE_ROOT, runCommand: passing, readText: async () => { throw new Error("absent"); }, writeText: async () => {} });
  strictEqual(noVerse[3].passed, false);
  deepStrictEqual(noVerse[3].findings[0].code, "verse-missing");
});

test("parseArgv: the three scripts read their flags", () => {
  deepStrictEqual(parseAdmitArgv(["--order", "content/work-orders/x.json"]), { orderPath: "content/work-orders/x.json" });
  deepStrictEqual(parseRealizeArgv(["--order", "o.json", "--receipt", "r.json"]), { orderPath: "o.json", receiptPath: "r.json" });
  deepStrictEqual(parseAuditArgv(["--order", "o.json", "--out-dir", "d", "--date", "2026-09-04"]), { orderPath: "o.json", outDir: "d", date: "2026-09-04" });
});

function frontierOrder() {
  const base = order();
  base.blueprint.frontier = [
    { label: "thm:fixture-frontier", title: "Fixture frontier", statement: "\\emph{Open frontier.} Open.", uses: ["thm:fixture"] },
    { label: "thm:fixture-other", title: "Other", statement: "Also open.", uses: ["thm:fixture"] },
  ];
  return parseProofWorkOrder(JSON.stringify(base));
}

test("draftOrderOfFrontier promotes a red frontier node into a draft the parser refuses until filled", () => {
  const parent = frontierOrder();
  const { draft, seededBy } = draftOrderOfFrontier({ orders: [parent], label: "thm:fixture-frontier", nodeFileNumber: "02" });
  strictEqual(seededBy, "fixture");
  strictEqual(draft.id, "fixture-frontier");
  strictEqual(draft.frontierOf, "fixture");
  deepStrictEqual(draft.axiomBudget, parent.axiomBudget);
  deepStrictEqual(draft.corpus, parent.corpus);
  deepStrictEqual(draft.blueprint, {
    chapter: "fixture", chapterFile: "00-fixture", file: "02-fixture-frontier", section: "",
    label: "thm:fixture-frontier", title: "Fixture frontier", statement: "Open.", uses: ["thm:fixture"], frontier: [],
  });
  throws(() => parseProofWorkOrder(JSON.stringify(draft)), (error) => error.code === "INVALID_TEXT");
  const filled = { ...draft, title: "Fixture frontier", module: "Obsmetrologia.FixtureFrontier", headline: "Obsmetrologia.FixtureFrontier.headline", declarations: ["Obsmetrologia.FixtureFrontier.headline"], requirements: [{ id: "r", statement: "s" }], blueprint: { ...draft.blueprint, section: "Fixture frontier" }, verse: { module: "ObsmetrologiaManual.FixtureFrontier" } };
  strictEqual(parseProofWorkOrder(JSON.stringify(filled)).id, "fixture-frontier");
});

test("draftOrderOfFrontier refuses an unseated label and an already promoted one", () => {
  const parent = frontierOrder();
  throws(() => draftOrderOfFrontier({ orders: [parent], label: "thm:nowhere", nodeFileNumber: "02" }), (error) => error.code === "FRONTIER_NOT_SEATED");
  const child = { ...parent, id: "fixture-frontier", blueprint: { ...parent.blueprint, label: "thm:fixture-frontier", frontier: [] } };
  throws(() => draftOrderOfFrontier({ orders: [parent, child], label: "thm:fixture-frontier", nodeFileNumber: "02" }), (error) => error.code === "ALREADY_PROMOTED");
  throws(() => draftOrderOfFrontier({ orders: [parent], label: "thm:fixture-other", nodeFileNumber: "2" }), (error) => error.code === "INVALID_NODE_FILE");
});

test("promotedFrontierLabels, parentOrdersOf, and renderBlueprintNode drop a promoted node from the parent file", () => {
  const parent = frontierOrder();
  const child = { ...parent, id: "fixture-frontier", blueprint: { ...parent.blueprint, file: "02-fixture-frontier", label: "thm:fixture-frontier", frontier: [] } };
  deepStrictEqual(promotedFrontierLabels(parent, [parent, child]), ["thm:fixture-frontier"]);
  deepStrictEqual(promotedFrontierLabels(child, [parent, child]), []);
  deepStrictEqual(parentOrdersOf(child, [parent, child]).map(({ id }) => id), ["fixture"]);
  deepStrictEqual(parentOrdersOf(parent, [parent, child]), []);
  const text = renderBlueprintNode(parent, { status: "settled", promoted: ["thm:fixture-frontier"] });
  ok(!text.includes("thm:fixture-frontier"));
  ok(text.includes("thm:fixture-other"));
  ok(text.includes("\\leanok"));
});

test("headlineStatusOf reads the headline mark back off a node file", () => {
  const parent = frontierOrder();
  strictEqual(headlineStatusOf(renderBlueprintNode(parent, { status: "settled" }), "thm:fixture"), "settled");
  strictEqual(headlineStatusOf(renderBlueprintNode(parent, { status: "frontier" }), "thm:fixture"), "frontier");
  strictEqual(headlineStatusOf(renderBlueprintNode(parent, { status: "settled" }), "thm:fixture-frontier"), "frontier");
  strictEqual(headlineStatusOf("", "thm:fixture"), "frontier");
});

test("nextNodeFileNumber counts from the chapter directory's NN-name.tex files", () => {
  strictEqual(nextNodeFileNumber([]), "01");
  strictEqual(nextNodeFileNumber(["01-node.tex", "05-other.tex", "notes.txt"]), "06");
});

test("draft-proof-work-order parses --label", () => {
  deepStrictEqual(parseDraftArgv(["--label", "thm:x"]), { label: "thm:x" });
  deepStrictEqual(parseDraftArgv([]), { label: undefined });
});
