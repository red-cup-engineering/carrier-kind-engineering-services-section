import assert from "node:assert/strict";
import test from "node:test";

import { decodeBlueprintTexPlate } from "../src/blueprint/codec.mjs";
import { blueprintClaimGraph } from "../src/blueprint/view.mjs";
import {
  blueprintClaimGraphFindings,
  blueprintLeanWeldFindings,
} from "../src/blueprint/lint.mjs";

const SAMPLE_TEX = String.raw`
\part{First Part}
\chapter{Marks}
\label{ch:marks}

\begin{definition}[Mark]
\label{def:mark}
A mark is the atomic primitive.
\leanok
\lean{Obsmetrologia.Mark}
\end{definition}

\section{Derived}

\begin{remark}[A remark]
\label{rem:remark-one}
\uses{def:mark}
\leanok
\lean{Obsmetrologia.RemarkOne}
\end{remark}

\subsection{Deeper}

\begin{theorem}[Something]
\label{thm:something}
\uses{def:mark}
\notready
\end{theorem}

\begin{lemma}[Rootless]
\label{lem:rootless}
No uses edge here.
\end{lemma}

\begin{definition}[Overboxed]
\label{def:overboxed}
\uses{def:mark}
\leanok
\lean{Obsmetrologia.Overboxed}
\end{definition}
`;

test("decodeBlueprintTexPlate captures remark-kind claim occurrences", () => {
  const plate = decodeBlueprintTexPlate(SAMPLE_TEX, "sample.tex");
  const remark = plate.claimOccurrences.find((occurrence) => occurrence.statementKind === "remark");
  assert.ok(remark, "expected a remark claim occurrence to be captured");
  assert.equal(remark.label, "rem:remark-one");
});

test("blueprintClaimGraph attaches part/chapter/chapterLabel/section/subsection context", () => {
  const plate = decodeBlueprintTexPlate(SAMPLE_TEX, "sample.tex");
  const graph = blueprintClaimGraph(plate);

  const mark = graph.nodes.find((node) => node.id === "def:mark");
  assert.equal(mark.part, "First Part");
  assert.equal(mark.chapter, "Marks");
  assert.equal(mark.chapterLabel, "ch:marks");
  assert.equal(mark.section, undefined);

  const remark = graph.nodes.find((node) => node.id === "rem:remark-one");
  assert.equal(remark.chapter, "Marks");
  assert.equal(remark.section, "Derived");
  assert.equal(remark.subsection, undefined);

  const something = graph.nodes.find((node) => node.id === "thm:something");
  assert.equal(something.section, "Derived");
  assert.equal(something.subsection, "Deeper");
});

test("blueprintClaimGraphFindings flags rootless, unglued, overboxed, and status findings", () => {
  const plate = decodeBlueprintTexPlate(SAMPLE_TEX, "sample.tex");
  const graph = blueprintClaimGraph(plate);
  const findings = blueprintClaimGraphFindings(graph, { baseLabels: ["def:mark"] });

  const codes = new Set(findings.map((f) => f.code));
  assert.ok(codes.has("rootless-node"));
  assert.ok(codes.has("overboxed-definition"));

  const rootless = findings.find((f) => f.code === "rootless-node");
  assert.equal(rootless.nodeId, "lem:rootless");

  assert.ok(findings.every((f) => f.severity === "error" || f.severity === "warning"));
});

test("blueprintClaimGraphFindings honors externalPrefixes and baseLabels", () => {
  const tex = String.raw`
\begin{definition}[Mark]
\label{def:mark}
\leanok
\lean{Obsmetrologia.Mark}
\end{definition}

\begin{lemma}[External use]
\label{lem:ext}
\uses{mathlib:some_lemma}
\leanok
\lean{Obsmetrologia.ExtUse}
\end{lemma}
`;
  const plate = decodeBlueprintTexPlate(tex, "external.tex");
  const graph = blueprintClaimGraph(plate);
  const findings = blueprintClaimGraphFindings(graph, {
    baseLabels: ["def:mark"],
    externalPrefixes: ["mathlib:"],
  });
  assert.ok(!findings.some((f) => f.nodeId === "lem:ext" && f.code === "missing-upstream"));
  assert.ok(!findings.some((f) => f.nodeId === "lem:ext" && f.code === "unglued-node"));
});

test("blueprintLeanWeldFindings flags unmatched Lean references and green-admitted drift", () => {
  const plate = decodeBlueprintTexPlate(SAMPLE_TEX, "sample.tex");
  const graph = blueprintClaimGraph(plate);
  const declarationCatalog = {
    kind: "metroplat.lean.declaration-catalog",
    rootModule: "Obsmetrologia",
    entries: [
      { module: "Obsmetrologia.Mark", name: "Obsmetrologia.Mark", kind: "def", proofStatus: "admitted" },
      { module: "Obsmetrologia.RemarkOne", name: "Obsmetrologia.RemarkOne", kind: "theorem", proofStatus: "proved" },
    ],
  };

  const findings = blueprintLeanWeldFindings(graph, declarationCatalog);
  const codes = findings.map((f) => f.code);
  assert.ok(codes.includes("unmatched-lean-reference"));
  assert.ok(codes.includes("green-admitted"));

  const greenAdmitted = findings.find((f) => f.code === "green-admitted");
  assert.equal(greenAdmitted.nodeId, "def:mark");
});
