import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  arc42ProjectionLanguageReadout,
  arc42SenPresentation,
  sadReadout,
  sadReadoutHtml,
  sadReadoutXml,
} from "@red-cup-engineering/communicating/language/arc42";
import { artifactId } from "@red-cup-engineering/computer-system-engine/identity";
import { defineLanguageFamily, defineLanguagePresentation, defineLanguageTranslation, languageArtifactOf, translateInLanguageFamily } from "@red-cup-engineering/communicating/language/presentation";
import {
  analyzeArc42StatementSet,
  arc42SadWorkbenchResponseContract,
  runArc42SadWorkbench,
} from "../src/integrations/filesystem/services/arc42-sad-workbench.mjs";
import { defaultFilesystemBinding } from "../src/integrations/filesystem/services/read-write.mjs";
import { eavtRecord } from "@red-cup-engineering/eavt/row";

const SAD = `---
title: Test architecture
---

# Test Architecture

## 1. Introduction and goals

The system has one goal.

## 5. Building block view

### 5.10 Settlement

Settlement satisfies \`Closure.op_fixed\`:
\`∀ x. settle(settle(x)) = settle(x)\`.

### 5.11 Knowledge base

The knowledge base retains settled claims.

## 11. Risks and technical debt

| Risk | Treatment |
|---|---|
| Missing runtime evidence | Implementation evidence is absent. |
| Generic language-presentation projection laws are only partially realized | §5.3/§8.7/AD-39 require LanguagePresentation, typed Translation, declared validation scope, and projection loss profiles; current arc42 projections are bounded implementation evidence, not generic kernel conformance. |
| Projection language row lacks refinement | §5.3/§8.7 require LanguagePresentation, Translation, validation scope, and projection loss profiles. |
`;

function hasRow(rows, entity, attribute, value) {
  return rows.some((row) => {
    const eavt = eavtRecord(row);
    return eavt.e === entity
      && eavt.a === attribute
      && (value === undefined || JSON.stringify(eavt.v) === JSON.stringify(value));
  });
}

function embeddedArc42HtmlPayload(html) {
  const match = /<script id="metroplat-arc42-claims" type="application\/vnd\.metroplat\.arc42\+json">([^<]*)<\/script>/u.exec(html);
  assert.ok(match);
  return JSON.parse(match[1]);
}

test("sadReadout selects one exact numbered review unit with evidence signals", () => {
  const readout = sadReadout(SAD, "5.10");
  assert.equal(readout.title, "Test Architecture");
  assert.equal(readout.reviewUnit.id, "5.10");
  assert.match(readout.reviewUnit.text, /Closure\.op_fixed/u);
  assert.equal(readout.reviewUnit.next.id, "5.11");
  assert.ok(readout.reviewUnit.evidenceSignals.some((signal) => signal.kind === "code-span" && signal.value === "Closure.op_fixed"));
  assert.ok(readout.reviewUnit.evidenceSignals.some((signal) => signal.kind === "formula-line"));
  assert.deepEqual(readout.missingArc42Sections, [2, 3, 4, 6, 7, 8, 9, 10, 12]);
  assert.deepEqual(readout.missingCanonicalSections, readout.missingArc42Sections);
  const reviewUnit = `metroplat:arc42:review-unit:${readout.carrier}#5.10`;
  const section = `metroplat:arc42:section:${readout.carrier}#5`;
  const profile = `metroplat:arc42:architecture-description-profile:${readout.carrier}`;
  assert.ok(hasRow(readout.statementRows, readout.carrier, "metroplat.kind", "metroplat.arc42.architecture-description"));
  assert.ok(hasRow(readout.statementRows, readout.carrier, "arc42.architecture-description-profile", profile));
  assert.ok(hasRow(readout.statementRows, profile, "metroplat.kind", "metroplat.arc42.architecture-description-profile"));
  assert.ok(hasRow(readout.statementRows, profile, "iso42010.standard", "ISO/IEC/IEEE 42010"));
  assert.ok(hasRow(readout.statementRows, profile, "iso42010.conceptual-model", "https://www.iso-architecture.org/42010/cm/"));
  assert.ok(hasRow(readout.statementRows, profile, "iso42010.architecture-description-language", "arc42"));
  assert.ok(hasRow(readout.statementRows, profile, "iso42010.correspondence-carrier", "eavt-statement-rows"));
  assert.ok(hasRow(readout.statementRows, profile, "iso42010.concept", "architecture-viewpoint"));
  assert.ok(hasRow(readout.statementRows, readout.carrier, "arc42.selected-review-unit", reviewUnit));
  assert.ok(hasRow(readout.statementRows, section, "arc42.viewpoint", "building-block-view"));
  assert.ok(hasRow(readout.statementRows, section, "arc42.model-kind", "static-decomposition"));
  assert.ok(hasRow(readout.statementRows, section, "arc42.concern", "structural decomposition and responsibilities"));
  assert.ok(hasRow(readout.statementRows, section, "iso42010.architecture-view", section));
  assert.ok(hasRow(readout.statementRows, section, "iso42010.architecture-viewpoint", "building-block-view"));
  assert.ok(hasRow(readout.statementRows, section, "iso42010.model-kind", "static-decomposition"));
  assert.ok(hasRow(readout.statementRows, section, "iso42010.concern", "structural decomposition and responsibilities"));
  assert.ok(hasRow(readout.statementRows, profile, "iso42010.governs-view", section));
  assert.ok(hasRow(readout.statementRows, reviewUnit, "arc42.section-id", "5.10"));
  assert.ok(hasRow(readout.statementRows, reviewUnit, "arc42.carrier-text"));
  assert.ok(readout.statementRows.some((row) => {
    const eavt = eavtRecord(row);
    return eavt.a === "arc42.signal-kind" && eavt.v === "code-span";
  }));
});

test("sadReadout projects one bounded review unit to xml2arc42 interchange", () => {
  const readout = sadReadout(SAD, "5.10");
  const xml = sadReadoutXml(readout);
  assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>/u);
  assert.match(xml, /<architecture-description profile="arc42"/u);
  assert.match(xml, /standard="ISO\/IEC\/IEEE 42010"/u);
  assert.match(xml, /conceptualModel="https:\/\/www\.iso-architecture\.org\/42010\/cm\/"/u);
  assert.match(xml, /carrier="ni:\/\/\/sha-256;/u);
  assert.match(xml, /<missing-arc42-sections>/u);
  assert.doesNotMatch(xml, /<missing-canonical-sections>/u);
  assert.match(xml, /<review-unit id="5\.10"/u);
  assert.match(xml, /<carrier-text>/u);
  assert.doesNotMatch(xml, /<source-text>/u);
  assert.match(xml, /<evidence-signal kind="code-span"/u);
  assert.match(xml, new RegExp(`<statement-rows mediaType="application/eavt\\+json" count="${readout.statementRows.length}">`, "u"));
  assert.doesNotMatch(xml, /<projection-basis/u);
  assert.match(xml, /<eavt-row index="0"><e>"ni:\/\/\/sha-256;/u);
  assert.match(xml, /<a>"metroplat\.kind"<\/a>/u);
  assert.match(xml, /Closure\.op_fixed/u);
});

test("sadReadout projects one bounded review unit to HTML with machine-readable section coordinates", () => {
  const html = sadReadoutHtml(sadReadout(SAD, "5.10"));
  assert.match(html, /^<!DOCTYPE html>/u);
  assert.match(html, /<main class="arc42-sad" data-kind="metroplat\.arc42\.sad-readout"/u);
  assert.match(html, /data-carrier="ni:\/\/\/sha-256;/u);
  assert.match(html, /data-architecture-description-profile="arc42"/u);
  assert.match(html, /data-architecture-description-standard="ISO\/IEC\/IEEE 42010"/u);
  assert.doesNotMatch(html, /data-source=/u);
  assert.match(html, /data-section-id="5\.10"/u);
  assert.match(html, /data-start-line="13"/u);
  assert.match(html, /id="review-unit-5\.10"/u);
  assert.match(html, /Closure\.op_fixed/u);
});

test("arc42 codec owns projection language artifacts and translation witnesses", () => {
  const readout = sadReadout(SAD, "5.10");
  const rmn = arc42ProjectionLanguageReadout(readout, "rmn");
  const xml = arc42ProjectionLanguageReadout(readout, "xml2arc42");
  const html = arc42ProjectionLanguageReadout(readout, "html");
  assert.equal(rmn.mediaType, "application/vnd.metroplat.arc42.rmn+json");
  assert.equal(rmn.artifact.kind, "metroplat.language.artifact");
  assert.equal(rmn.artifact.language, arc42SenPresentation.id);
  assert.equal(rmn.artifact.expression.kind, "metroplat.arc42.rmn-expression");
  assert.equal(rmn.artifact.expression.architectureDescriptionProfile.standard, "ISO/IEC/IEEE 42010");
  assert.equal(rmn.artifact.expression.architectureDescriptionProfile.architectureDescriptionLanguage, "arc42");
  assert.ok(rmn.artifact.expression.architectureDescriptionProfile.concepts.includes("architecture-viewpoint"));
  assert.equal(rmn.translation.kind, "metroplat.language.translation");
  assert.equal(rmn.translation.sourceLanguage, "metroplat.arc42.sad");
  assert.equal(rmn.translation.targetLanguage, "metroplat.arc42.rmn");
  assert.equal(rmn.translation.family, xml.translation.family);
  assert.equal(rmn.translation.family, html.translation.family);
  assert.equal(rmn.translation.route.length, 1);
  assert.match(rmn.translation.sourcePresentation, /^ni:\/\/\/sha-256;/u);
  assert.equal(rmn.translation.targetPresentation, rmn.artifact.presentation);
  assert.ok(rmn.validationScope.includes("eavt-statement-rows"));
  assert.ok(rmn.lossProfile.includes("unselected-section-carrier-text"));
  assert.deepEqual(JSON.parse(rmn.content), rmn.artifact);
});

test("sadReadout reads arc42 risk rows as implementation-conformance gap statements", () => {
  const readout = sadReadout(SAD, "11");
  const risk = readout.statementRows.find((row) => {
    const eavt = eavtRecord(row);
    return eavt.a === "metroplat.kind" && eavt.v === "metroplat.arc42.implementation-conformance-gap";
  });
  assert.ok(risk);
  const riskEntity = eavtRecord(risk).e;
  assert.ok(hasRow(readout.statementRows, riskEntity, "arc42.risk-title", "Missing runtime evidence"));
  assert.ok(hasRow(readout.statementRows, riskEntity, "arc42.evidence-boundary", "Implementation evidence is absent."));
  assert.ok(hasRow(readout.statementRows, `metroplat:arc42:section:${readout.carrier}#11`, "arc42.viewpoint", "risks-and-technical-debt"));
  assert.ok(hasRow(readout.statementRows, `metroplat:arc42:section:${readout.carrier}#11`, "arc42.model-kind", "risk-register"));
});

test("sadReadout addresses a SAD larger than one identity string envelope", () => {
  const large = `${SAD}\n${"architecture evidence\n".repeat(16_000)}`;
  assert.ok(Buffer.byteLength(large, "utf8") > 262_144);
  const readout = sadReadout(large, "5.10");
  assert.equal(readout.carrier, sadReadout(large, "5.10").carrier);
  assert.equal(readout.source, readout.carrier);
  assert.equal(readout.reviewUnit.id, "5.10");
});

test("arc42 SAD workbench dry-runs and journal-persists heading-scoped edits", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "metroplat-arc42-"));
  try {
    const sadPath = path.join(root, "architecture.md");
    writeFileSync(sadPath, SAD, "utf8");
    const binding = defaultFilesystemBinding(root, { now: () => "2026-07-12T12:00:00.000Z" });
    const operation = Object.freeze({
      operation: "replace-section",
      heading: "5.10 Settlement",
      level: 3,
      body: "Settlement is idempotent: `∀ x. settle(settle(x)) = settle(x)`.\n",
      required: true,
    });

    const dryRun = await runArc42SadWorkbench(binding, { path: sadPath, section: "5.10", operations: [operation], includeXml: true, includeHtml: true, includeProjections: ["rmn"] });
    assert.equal(arc42SadWorkbenchResponseContract.validate(dryRun), true);
    assert.equal(dryRun.changed, true);
    assert.equal(dryRun.persisted, false);
    assert.match(dryRun.sad.reviewUnit.text, /Settlement is idempotent/u);
    assert.equal(dryRun.projections.xml2arc42.projection, "xml2arc42");
    assert.equal(dryRun.projections.xml2arc42.mediaType, "application/xml");
    assert.equal(dryRun.projections.xml2arc42.carrier, dryRun.sad.carrier);
    assert.deepEqual(dryRun.projections.xml2arc42.validationScope, [
      "arc42-section-identity",
      "arc42-section-line-coordinates",
      "selected-review-unit-carrier-text",
      "local-evidence-signals",
      "eavt-statement-rows",
      "derived-statement-analysis",
      "improvement-finding-rows",
    ]);
    assert.deepEqual(dryRun.projections.xml2arc42.lossProfile, []);
    assert.match(dryRun.projections.xml2arc42.address, /^ni:\/\/\/sha-256;/u);
    assert.match(dryRun.projections.xml2arc42.content, /<projection-basis basis="non-self">/u);
    assert.match(dryRun.projections.xml2arc42.content, /<statement-analysis mediaType="application\/vnd\.metroplat\.arc42\.statement-analysis\+json">/u);
    assert.match(dryRun.projections.xml2arc42.content, /"kind":"metroplat\.arc42\.improvement-readout"/u);
    assert.equal(dryRun.projections.xml2arc42.artifact.expression.projectionBasis, "non-self");
    assert.equal(dryRun.projections.xml2arc42.artifact.expression.statementAnalysis.counts.projections, 2);
    assert.equal(dryRun.projections.xml2arc42.artifact.expression.improvement.kind, "metroplat.arc42.improvement-readout");
    assert.equal(dryRun.projections.html.projection, "html");
    assert.equal(dryRun.projections.html.mediaType, "text/html");
    assert.equal(dryRun.projections.html.carrier, dryRun.sad.carrier);
    assert.deepEqual(dryRun.projections.html.validationScope, [
      "arc42-section-identity",
      "arc42-section-line-coordinates",
      "selected-review-unit-carrier-text",
      "local-evidence-signals",
      "eavt-statement-rows",
      "derived-statement-analysis",
      "improvement-finding-rows",
    ]);
    assert.deepEqual(dryRun.projections.html.lossProfile, ["markdown-frontmatter", "markdown-source-formatting"]);
    assert.match(dryRun.projections.html.address, /^ni:\/\/\/sha-256;/u);
    const htmlPayload = embeddedArc42HtmlPayload(dryRun.projections.html.content);
    assert.equal(htmlPayload.kind, "metroplat.arc42.html-claim-payload");
    assert.equal(htmlPayload.carrier, dryRun.sad.carrier);
    assert.equal(htmlPayload.reviewUnit.id, "5.10");
    assert.equal(htmlPayload.statementRows.length, dryRun.sad.statementRows.length);
    assert.ok(htmlPayload.validationScope.includes("eavt-statement-rows"));
    assert.equal(htmlPayload.projectionBasis, "non-self");
    assert.equal(htmlPayload.statementSet.kind, "metroplat.arc42.statement-set");
    assert.equal(htmlPayload.statementAnalysis.kind, "metroplat.arc42.statement-analysis");
    assert.equal(htmlPayload.statementAnalysis.counts.projections, 2);
    assert.equal(htmlPayload.statementAnalysis.counts.languageArtifacts, 2);
    assert.equal(htmlPayload.statementAnalysis.counts.translationWitnesses, 2);
    assert.equal(htmlPayload.improvement.kind, "metroplat.arc42.improvement-readout");
    assert.ok(htmlPayload.improvement.rows.length > 0);
    assert.equal(dryRun.projections.rmn.projection, "rmn");
    assert.equal(dryRun.projections.rmn.mediaType, "application/vnd.metroplat.arc42.rmn+json");
    assert.equal(dryRun.projections.rmn.carrier, dryRun.sad.carrier);
    assert.ok(dryRun.projections.rmn.validationScope.includes("eavt-statement-rows"));
    assert.ok(dryRun.projections.rmn.lossProfile.includes("unselected-section-carrier-text"));
    assert.match(dryRun.projections.rmn.address, /^ni:\/\/\/sha-256;/u);
    assert.equal(dryRun.projections.rmn.artifact.kind, "metroplat.language.artifact");
    assert.equal(dryRun.projections.rmn.artifact.language, "metroplat.arc42.rmn");
    assert.equal(dryRun.projections.rmn.artifact.expression.kind, "metroplat.arc42.rmn-expression");
    assert.equal(dryRun.projections.rmn.artifact.expression.carrier, dryRun.sad.carrier);
    assert.equal(dryRun.projections.rmn.artifact.expression.reviewUnit.id, "5.10");
    assert.ok(dryRun.projections.rmn.artifact.expression.statementRows.length > 0);
    assert.equal(dryRun.projections.rmn.artifact.expression.projectionBasis, "non-self");
    assert.equal(dryRun.projections.rmn.artifact.expression.statementSet.kind, "metroplat.arc42.statement-set");
    assert.equal(dryRun.projections.rmn.artifact.expression.statementAnalysis.kind, "metroplat.arc42.statement-analysis");
    assert.equal(dryRun.projections.rmn.artifact.expression.statementAnalysis.counts.projections, 2);
    assert.equal(dryRun.projections.rmn.artifact.expression.statementAnalysis.counts.languageArtifacts, 2);
    assert.equal(dryRun.projections.rmn.artifact.expression.statementAnalysis.counts.translationWitnesses, 2);
    assert.equal(dryRun.projections.rmn.artifact.expression.improvement.kind, "metroplat.arc42.improvement-readout");
    assert.equal(dryRun.projections.rmn.artifact.expression.improvement.counts.infos, 1);
    assert.ok(dryRun.projections.rmn.artifact.expression.improvement.rows.length > 0);
    assert.deepEqual(JSON.parse(dryRun.projections.rmn.content), dryRun.projections.rmn.artifact);
    assert.match(dryRun.sadXml, /architecture-description/u);
    assert.equal(dryRun.sadXml, dryRun.projections.xml2arc42.content);
    assert.match(dryRun.sadHtml, /<main class="arc42-sad"/u);
    assert.equal(dryRun.sadHtml, dryRun.projections.html.content);
    assert.deepEqual(embeddedArc42HtmlPayload(dryRun.sadHtml), htmlPayload);
    assert.match(dryRun.sadHtml, /data-carrier="ni:\/\/\/sha-256;/u);
    assert.match(dryRun.sadHtml, /data-section-id="5\.10"/u);
    assert.match(dryRun.statementSet.address, /^ni:\/\/\/sha-256;/u);
    assert.match(dryRun.analysis.address, /^ni:\/\/\/sha-256;/u);
    assert.equal(dryRun.analysis.kind, "metroplat.arc42.statement-analysis");
    assert.equal(dryRun.analysis.carrier, dryRun.sad.carrier);
    assert.equal(dryRun.analysis.statementSet, dryRun.statementSet.address);
    assert.equal(dryRun.analysis.counts.rows, dryRun.statementSet.rows.length);
    assert.equal(dryRun.analysis.counts.projections, 3);
    assert.equal(dryRun.analysis.counts.validationScopes, 3);
    assert.equal(dryRun.analysis.counts.validationJudgments, 21);
    assert.equal(dryRun.analysis.counts.projectionLossProfiles, 3);
    assert.equal(dryRun.analysis.counts.projectionLosses, 5);
    assert.equal(dryRun.analysis.counts.languageArtifacts, 3);
    assert.equal(dryRun.analysis.counts.translationWitnesses, 3);
    assert.equal(dryRun.analysis.counts.semanticAddresses, 1);
    assert.equal(dryRun.analysis.counts.projectionFamilies, 1);
    assert.equal(dryRun.analysis.counts.projectionFamilyMembers, 3);
    assert.equal(dryRun.analysis.selectedReviewUnit.sectionId, "5.10");
    assert.equal(dryRun.analysis.viewpoints.find((view) => view.sectionId === "5").viewpoint, "building-block-view");
    assert.equal(dryRun.analysis.viewpoints.find((view) => view.sectionId === "5").modelKind, "static-decomposition");
    assert.deepEqual(dryRun.analysis.projections.find((projection) => projection.projectionKind === "xml2arc42").lossProfile, []);
    assert.deepEqual(dryRun.analysis.projections.find((projection) => projection.projectionKind === "html").lossProfile, ["markdown-frontmatter", "markdown-source-formatting"]);
    assert.equal(dryRun.analysis.projections.find((projection) => projection.projectionKind === "xml2arc42").languageArtifact, dryRun.projections.xml2arc42.artifact.address);
    assert.equal(dryRun.analysis.projections.find((projection) => projection.projectionKind === "html").languageArtifact, dryRun.projections.html.artifact.address);
    assert.equal(dryRun.analysis.projections.find((projection) => projection.projectionKind === "rmn").languageArtifact, dryRun.projections.rmn.artifact.address);
    assert.equal(dryRun.analysis.projections.find((projection) => projection.projectionKind === "xml2arc42").translationWitness, dryRun.projections.xml2arc42.translation.address);
    assert.equal(dryRun.analysis.projections.find((projection) => projection.projectionKind === "html").translationWitness, dryRun.projections.html.translation.address);
    assert.equal(dryRun.analysis.projections.find((projection) => projection.projectionKind === "rmn").translationWitness, dryRun.projections.rmn.translation.address);
    assert.equal(dryRun.analysis.projections.find((projection) => projection.projectionKind === "xml2arc42").sourceLanguage, "metroplat.arc42.sad");
    assert.equal(dryRun.analysis.projections.find((projection) => projection.projectionKind === "html").targetLanguage, "metroplat.arc42.html");
    assert.equal(dryRun.analysis.projections.find((projection) => projection.projectionKind === "rmn").semanticAddress, dryRun.projections.rmn.translation.semanticAddress);
    assert.ok(dryRun.analysis.projections.find((projection) => projection.projectionKind === "rmn").validationScope.includes("eavt-statement-rows"));
    assert.equal(dryRun.analysis.projectionFamilies.length, 1);
    const dryRunProjectionFamily = dryRun.analysis.projectionFamilies[0];
    assert.equal(dryRunProjectionFamily.kind, "metroplat.arc42.projection-family");
    assert.equal(dryRunProjectionFamily.semanticAddress, dryRun.projections.xml2arc42.translation.semanticAddress);
    assert.equal(dryRunProjectionFamily.sourceLanguage, "metroplat.arc42.sad");
    assert.equal(dryRunProjectionFamily.completeCarrierSet, true);
    assert.deepEqual(dryRunProjectionFamily.projectionKinds, ["html", "rmn", "xml2arc42"]);
    assert.deepEqual(dryRunProjectionFamily.targetLanguages, [
      "metroplat.arc42.html",
      "metroplat.arc42.rmn",
      "metroplat.arc42.xml2arc42",
    ]);
    assert.ok(dryRunProjectionFamily.members.some((member) => member.includes("#xml2arc42")));
    assert.ok(dryRunProjectionFamily.members.some((member) => member.includes("#html")));
    assert.ok(dryRunProjectionFamily.members.some((member) => member.includes("#rmn")));
    assert.ok(hasRow(dryRun.statementSet.rows, dryRun.sad.carrier, "arc42.projection-family", dryRunProjectionFamily.entity));
    assert.ok(hasRow(dryRun.statementSet.rows, dryRunProjectionFamily.entity, "metroplat.kind", "metroplat.arc42.projection-family"));
    assert.ok(hasRow(dryRun.statementSet.rows, dryRunProjectionFamily.entity, "metroplat.address", dryRunProjectionFamily.address));
    assert.ok(hasRow(dryRun.statementSet.rows, dryRunProjectionFamily.entity, "metroplat.semantic-address", dryRunProjectionFamily.semanticAddress));
    assert.ok(hasRow(dryRun.statementSet.rows, dryRunProjectionFamily.entity, "arc42.member-projection", dryRun.analysis.projections.find((projection) => projection.projectionKind === "xml2arc42").entity));
    assert.ok(hasRow(dryRun.statementSet.rows, dryRunProjectionFamily.entity, "arc42.projection-kind", "html"));
    assert.ok(hasRow(dryRun.statementSet.rows, dryRunProjectionFamily.entity, "metroplat.target-language", "metroplat.arc42.xml2arc42"));
    assert.ok(hasRow(dryRun.statementSet.rows, dryRunProjectionFamily.entity, "metroplat.translation-witness", dryRun.projections.rmn.translation.address));
    const alteredProjectionFamilyAddress = artifactId({ altered: "projection-family-address-row" });
    const alteredStatementSet = {
      ...dryRun.statementSet,
      rows: dryRun.statementSet.rows.map((row) => {
        const eavt = eavtRecord(row);
        return eavt.e === dryRunProjectionFamily.entity && eavt.a === "metroplat.address"
          ? [eavt.e, eavt.a, alteredProjectionFamilyAddress, eavt.t]
          : row;
      }),
    };
    const alteredAnalysis = analyzeArc42StatementSet(alteredStatementSet);
    assert.equal(alteredAnalysis.projectionFamilies[0].address, alteredProjectionFamilyAddress);
    assert.match(dryRun.improvement.address, /^ni:\/\/\/sha-256;/u);
    assert.equal(dryRun.improvement.kind, "metroplat.arc42.improvement-readout");
    assert.equal(dryRun.improvement.carrier, dryRun.sad.carrier);
    assert.equal(dryRun.improvement.statementAnalysis, dryRun.analysis.address);
    assert.equal(dryRun.improvement.counts.risks, 0);
    assert.equal(dryRun.improvement.counts.warnings, 9);
    assert.equal(dryRun.improvement.counts.infos, 2);
    assert.equal(dryRun.improvement.counts.findings, 11);
    assert.equal(dryRun.improvement.counts.rows, dryRun.improvement.rows.length);
    const dryRunImprovementEntity = `metroplat:arc42:improvement-readout:${dryRun.analysis.address}`;
    const dryRunMissingSectionFinding = dryRun.improvement.findings.find((finding) =>
      finding.code === "missing-arc42-section"
      && finding.sectionId === "2");
    assert.ok(dryRunMissingSectionFinding);
    assert.ok(hasRow(dryRun.improvement.rows, dryRunImprovementEntity, "metroplat.kind", "metroplat.arc42.improvement-readout"));
    assert.ok(hasRow(dryRun.improvement.rows, dryRunImprovementEntity, "arc42.statement-analysis", dryRun.analysis.address));
    assert.ok(hasRow(dryRun.improvement.rows, dryRunImprovementEntity, "arc42.finding-count", 11));
    assert.ok(hasRow(dryRun.improvement.rows, dryRunImprovementEntity, "arc42.projection-family", dryRunProjectionFamily.address));
    assert.ok(hasRow(dryRun.improvement.rows, dryRunProjectionFamily.address, "metroplat.kind", "metroplat.arc42.projection-family"));
    assert.ok(hasRow(dryRun.improvement.rows, dryRunProjectionFamily.address, "metroplat.semantic-address", dryRunProjectionFamily.semanticAddress));
    assert.ok(hasRow(dryRun.improvement.rows, dryRunProjectionFamily.address, "arc42.member-projection", dryRun.analysis.projections.find((projection) => projection.projectionKind === "html").entity));
    assert.ok(hasRow(dryRun.improvement.rows, dryRunProjectionFamily.address, "metroplat.target-language", "metroplat.arc42.rmn"));
    assert.ok(hasRow(dryRun.improvement.rows, dryRunProjectionFamily.address, "metroplat.translation-witness", dryRun.projections.xml2arc42.translation.address));
    assert.ok(hasRow(dryRun.improvement.rows, dryRunImprovementEntity, "arc42.improvement-finding", dryRunMissingSectionFinding.address));
    assert.ok(hasRow(dryRun.improvement.rows, dryRunMissingSectionFinding.address, "metroplat.kind", "metroplat.arc42.improvement-finding"));
    assert.ok(hasRow(dryRun.improvement.rows, dryRunMissingSectionFinding.address, "arc42.finding-code", "missing-arc42-section"));
    assert.ok(hasRow(dryRun.improvement.rows, dryRunMissingSectionFinding.address, "arc42.section-id", "2"));
    assert.ok(hasRow(dryRun.improvement.rows, dryRunMissingSectionFinding.address, "arc42.evidence", dryRun.analysis.address));
    assert.ok(dryRun.improvement.findings.some((finding) =>
      finding.code === "missing-arc42-section"
      && finding.sectionId === "2"
      && finding.severity === "warning"));
    assert.ok(dryRun.improvement.findings.some((finding) =>
      finding.code === "projection-loss-boundary"
      && finding.subject.includes("#html")
      && finding.severity === "info"
      && finding.detail.includes("markdown-frontmatter")));
    const dryRunProjectionLossFinding = dryRun.improvement.findings.find((finding) =>
      finding.code === "projection-loss-boundary"
      && finding.subject.includes("#html"));
    assert.ok(dryRunProjectionLossFinding);
    assert.equal(dryRunProjectionLossFinding.projectionKind, "html");
    assert.ok(dryRunProjectionLossFinding.validationScope.includes("eavt-statement-rows"));
    assert.ok(dryRunProjectionLossFinding.lossProfile.includes("markdown-frontmatter"));
    assert.ok(hasRow(dryRun.improvement.rows, dryRunProjectionLossFinding.address, "arc42.projection-kind", "html"));
    assert.ok(hasRow(dryRun.improvement.rows, dryRunProjectionLossFinding.address, "arc42.validates-judgment", "eavt-statement-rows"));
    assert.ok(hasRow(dryRun.improvement.rows, dryRunProjectionLossFinding.address, "arc42.projection-loss", "markdown-frontmatter"));
    assert.ok(dryRun.improvement.findings.every((finding) =>
      /^ni:\/\/\/sha-256;/u.test(finding.address)));
    assert.ok(hasRow(dryRun.statementSet.rows, dryRun.sad.carrier, "arc42.selected-review-unit"));
    assert.ok(dryRun.statementSet.rows.some((row) => {
      const eavt = eavtRecord(row);
      return eavt.a === "arc42.validation-scope"
        && Array.isArray(eavt.v)
        && eavt.v.includes("selected-review-unit-carrier-text");
    }));
    assert.ok(dryRun.statementSet.rows.some((row) => {
      const eavt = eavtRecord(row);
      return eavt.a === "arc42.validates-judgment"
        && eavt.v === "selected-review-unit-carrier-text";
    }));
    assert.ok(dryRun.statementSet.rows.some((row) => {
      const eavt = eavtRecord(row);
      return eavt.a === "arc42.loss-profile"
        && Array.isArray(eavt.v)
        && eavt.v.includes("markdown-frontmatter");
    }));
    assert.ok(dryRun.statementSet.rows.some((row) => {
      const eavt = eavtRecord(row);
      return eavt.a === "arc42.projection-loss"
        && eavt.v === "markdown-frontmatter";
    }));
    assert.match(readFileSync(sadPath, "utf8"), /Closure\.op_fixed/u);
    assert.equal(arc42SadWorkbenchResponseContract.validate({
      ...dryRun,
      projections: {
        ...dryRun.projections,
        html: { ...dryRun.projections.html, mediaType: "application/xml" },
      },
    }), false);
    assert.equal(arc42SadWorkbenchResponseContract.validate({
      ...dryRun,
      projections: {
        ...dryRun.projections,
        markdown: {
          ...dryRun.projections.html,
          projection: "markdown",
          mediaType: "text/markdown",
        },
      },
    }), false);
    assert.equal(arc42SadWorkbenchResponseContract.validate({
      ...dryRun,
      projections: {
        ...dryRun.projections,
        html: { ...dryRun.projections.html, validationScope: [] },
      },
    }), false);
    const { lossProfile: _lossProfile, ...htmlWithoutLossProfile } = dryRun.projections.html;
    assert.equal(arc42SadWorkbenchResponseContract.validate({
      ...dryRun,
      projections: {
        ...dryRun.projections,
        html: htmlWithoutLossProfile,
      },
    }), false);
    assert.equal(arc42SadWorkbenchResponseContract.validate({
      ...dryRun,
      statementSet: {
        ...dryRun.statementSet,
        rows: [...dryRun.statementSet.rows, ["too", "short", "row"]],
      },
    }), false);
    assert.equal(arc42SadWorkbenchResponseContract.validate({
      ...dryRun,
      analysis: {
        ...dryRun.analysis,
        counts: { ...dryRun.analysis.counts, implementationConformanceGaps: -1 },
      },
    }), false);
    const { projectionFamilies: _projectionFamilies, ...analysisWithoutProjectionFamilies } = dryRun.analysis;
    assert.equal(arc42SadWorkbenchResponseContract.validate({
      ...dryRun,
      analysis: analysisWithoutProjectionFamilies,
    }), false);
    assert.equal(arc42SadWorkbenchResponseContract.validate({
      ...dryRun,
      analysis: {
        ...dryRun.analysis,
        projectionFamilies: dryRun.analysis.projectionFamilies.map((family, index) => {
          if (index !== 0) return family;
          const { completeCarrierSet: _completeCarrierSet, ...familyWithoutCompleteness } = family;
          return familyWithoutCompleteness;
        }),
      },
    }), false);
    assert.equal(arc42SadWorkbenchResponseContract.validate({
      ...dryRun,
      improvement: {
        ...dryRun.improvement,
        findings: dryRun.improvement.findings.map((finding, index) =>
          index === 0 ? { ...finding, severity: "urgent" } : finding),
      },
    }), false);
    assert.equal(arc42SadWorkbenchResponseContract.validate({
      ...dryRun,
      improvement: {
        ...dryRun.improvement,
        rows: [...dryRun.improvement.rows, ["extra", "wide", "row", "with", "tail"]],
      },
    }), false);

    const projected = await runArc42SadWorkbench(binding, { path: sadPath, section: "5.10", includeProjections: ["html"] });
    assert.equal(arc42SadWorkbenchResponseContract.validate(projected), true);
    assert.equal(projected.sadHtml, undefined);
    assert.equal(projected.sadXml, undefined);
    assert.deepEqual(Object.keys(projected.projections), ["html"]);
    assert.match(projected.projections.html.content, /<main class="arc42-sad"/u);
    const projectedHtmlPayload = embeddedArc42HtmlPayload(projected.projections.html.content);
    assert.equal(projectedHtmlPayload.kind, "metroplat.arc42.html-claim-payload");
    assert.equal(projectedHtmlPayload.projectionBasis, "non-self");
    assert.equal(projectedHtmlPayload.statementAnalysis.counts.projections, 1);
    assert.equal(projectedHtmlPayload.statementAnalysis.counts.languageArtifacts, 1);
    assert.equal(projectedHtmlPayload.statementAnalysis.counts.translationWitnesses, 1);
    assert.equal(projected.analysis.counts.validationJudgments, 7);
    assert.equal(projected.analysis.counts.languageArtifacts, 1);
    assert.equal(projected.analysis.counts.translationWitnesses, 1);
    assert.equal(projected.analysis.counts.projectionFamilies, 1);
    assert.equal(projected.analysis.projectionFamilies[0].completeCarrierSet, true);

    const senProjected = await runArc42SadWorkbench(binding, { path: sadPath, section: "5.10", includeProjections: ["rmn"] });
    assert.equal(arc42SadWorkbenchResponseContract.validate(senProjected), true);
    assert.deepEqual(Object.keys(senProjected.projections), ["rmn"]);
    assert.equal(senProjected.analysis.counts.projections, 1);
    assert.equal(senProjected.analysis.counts.validationJudgments, 7);
    assert.equal(senProjected.analysis.counts.projectionLosses, 3);
    assert.equal(senProjected.analysis.counts.languageArtifacts, 1);
    assert.equal(senProjected.analysis.counts.translationWitnesses, 1);
    assert.equal(senProjected.analysis.counts.projectionFamilies, 1);
    assert.equal(senProjected.projections.rmn.artifact.expression.reviewUnit.id, "5.10");
    assert.equal(senProjected.projections.rmn.artifact.expression.projectionBasis, "non-self");
    assert.equal(senProjected.projections.rmn.artifact.expression.statementAnalysis.counts.projections, 0);
    assert.equal(senProjected.projections.rmn.artifact.expression.statementAnalysis.counts.translationWitnesses, 0);
    assert.equal(senProjected.projections.rmn.artifact.expression.improvement.counts.infos, 0);
    assert.equal(senProjected.improvement.counts.infos, 1);
    assert.equal(senProjected.improvement.findings.find((finding) => finding.code === "projection-loss-boundary").subject, senProjected.analysis.projections[0].entity);

    const riskReadout = await runArc42SadWorkbench(binding, { path: sadPath, section: "11" });
    assert.equal(arc42SadWorkbenchResponseContract.validate(riskReadout), true);
    assert.ok(riskReadout.statementSet.rows.some((row) => {
      const eavt = eavtRecord(row);
      return eavt.a === "metroplat.kind" && eavt.v === "metroplat.arc42.implementation-conformance-gap";
    }));
    assert.ok(riskReadout.statementSet.rows.some((row) => {
      const eavt = eavtRecord(row);
      return eavt.a === "arc42.evidence-boundary" && eavt.v === "Implementation evidence is absent.";
    }));
    assert.equal(riskReadout.analysis.selectedReviewUnit.sectionId, "11");
    assert.equal(riskReadout.analysis.counts.implementationConformanceGaps, 3);
    assert.equal(riskReadout.analysis.counts.evidenceBoundaries, 3);
    assert.equal(riskReadout.analysis.counts.conformanceEvidenceLinks, 0);
    const missingRuntimeGap = riskReadout.analysis.implementationConformanceGaps.find((gap) =>
      gap.riskTitle === "Missing runtime evidence");
    const languageProjectionGap = riskReadout.analysis.implementationConformanceGaps.find((gap) =>
      gap.riskTitle === "Generic language-presentation projection laws are only partially realized");
    const staleProjectionGap = riskReadout.analysis.implementationConformanceGaps.find((gap) =>
      gap.riskTitle === "Projection language row lacks refinement");
    assert.ok(missingRuntimeGap);
    assert.ok(languageProjectionGap);
    assert.ok(staleProjectionGap);
    assert.equal(missingRuntimeGap.evidenceBoundary, "Implementation evidence is absent.");
    assert.equal(missingRuntimeGap.evidenceStatus, "unaddressed");
    assert.equal(languageProjectionGap.evidenceStatus, "unaddressed");
    assert.equal(staleProjectionGap.evidenceStatus, "unaddressed");
    assert.equal(riskReadout.improvement.counts.risks, 3);
    assert.equal(riskReadout.improvement.counts.warnings, 9);
    assert.equal(riskReadout.improvement.counts.infos, 0);
    assert.equal(riskReadout.improvement.counts.riskRefinements, 0);
    assert.equal(riskReadout.improvement.counts.rows, riskReadout.improvement.rows.length);
    const riskFinding = riskReadout.improvement.findings.find((finding) =>
      finding.code === "implementation-conformance-gap");
    assert.ok(riskFinding);
    assert.ok(hasRow(riskReadout.improvement.rows, riskFinding.address, "arc42.finding-code", "implementation-conformance-gap"));
    assert.ok(hasRow(riskReadout.improvement.rows, riskFinding.address, "arc42.severity", "risk"));
    assert.ok(hasRow(riskReadout.improvement.rows, riskFinding.address, "arc42.title", "Missing runtime evidence"));
    assert.ok(hasRow(riskReadout.improvement.rows, riskFinding.address, "arc42.evidence-boundary", "Implementation evidence is absent."));
    assert.ok(hasRow(riskReadout.improvement.rows, riskFinding.address, "arc42.recommended-action", "Use this §11 item as a bounded improvement candidate: collect implementation-conformance evidence, refine the evidence boundary, or retire the risk only when the workbench can re-read the updated row."));
    assert.ok(riskReadout.improvement.findings.some((finding) =>
      finding.code === "implementation-conformance-gap"
      && finding.severity === "risk"
      && finding.title === "Missing runtime evidence"
      && finding.detail === "Implementation evidence is absent."));

    const riskProjectionReadout = await runArc42SadWorkbench(binding, {
      path: sadPath,
      section: "11",
      includeProjections: ["xml2arc42", "html", "rmn"],
    });
    assert.equal(arc42SadWorkbenchResponseContract.validate(riskProjectionReadout), true);
    const projectedLanguageGap = riskProjectionReadout.analysis.implementationConformanceGaps.find((gap) =>
      gap.riskTitle === "Generic language-presentation projection laws are only partially realized");
    assert.ok(projectedLanguageGap);
    assert.equal(projectedLanguageGap.evidenceStatus, "bounded-conformance-evidence");
    assert.ok(projectedLanguageGap.conformanceEvidence.length > 0);
    assert.ok(projectedLanguageGap.conformanceEvidence.some((evidence) => evidence.includes("#xml2arc42")));
    assert.ok(projectedLanguageGap.conformanceEvidence.some((evidence) => evidence.includes("#html")));
    assert.ok(projectedLanguageGap.conformanceEvidence.some((evidence) => evidence.includes("#rmn")));
    const projectedStaleGap = riskProjectionReadout.analysis.implementationConformanceGaps.find((gap) =>
      gap.riskTitle === "Projection language row lacks refinement");
    assert.ok(projectedStaleGap);
    assert.equal(projectedStaleGap.evidenceStatus, "bounded-conformance-evidence");
    assert.ok(projectedStaleGap.conformanceEvidence.length > 0);
    assert.equal(
      riskProjectionReadout.analysis.counts.conformanceEvidenceLinks,
      projectedLanguageGap.conformanceEvidence.length + projectedStaleGap.conformanceEvidence.length,
    );
    const conformanceEvidenceFinding = riskProjectionReadout.improvement.findings.find((finding) =>
      finding.code === "implementation-conformance-evidence"
      && finding.subject === projectedLanguageGap.entity);
    assert.ok(conformanceEvidenceFinding);
    assert.equal(conformanceEvidenceFinding.severity, "info");
    assert.equal(conformanceEvidenceFinding.subject, projectedLanguageGap.entity);
    assert.equal(conformanceEvidenceFinding.evidenceStatus, "bounded-conformance-evidence");
    assert.ok(hasRow(riskProjectionReadout.improvement.rows, conformanceEvidenceFinding.address, "arc42.finding-code", "implementation-conformance-evidence"));
    assert.ok(hasRow(riskProjectionReadout.improvement.rows, conformanceEvidenceFinding.address, "arc42.evidence-status", "bounded-conformance-evidence"));
    assert.ok(hasRow(riskProjectionReadout.improvement.rows, conformanceEvidenceFinding.address, "arc42.evidence", projectedLanguageGap.conformanceEvidence[0]));
    assert.equal(riskProjectionReadout.improvement.counts.riskRefinements, 2);
    assert.equal(riskProjectionReadout.analysis.counts.projectionFamilies, 1);
    assert.equal(riskProjectionReadout.analysis.projectionFamilies[0].members.length, 3);
    const distinguishedRefinement = riskProjectionReadout.improvement.riskRefinements.find((refinement) =>
      refinement.gap === projectedLanguageGap.entity);
    const staleRefinement = riskProjectionReadout.improvement.riskRefinements.find((refinement) =>
      refinement.gap === projectedStaleGap.entity);
    assert.ok(distinguishedRefinement);
    assert.ok(staleRefinement);
    assert.equal(distinguishedRefinement.carrierAlreadyDistinguished, true);
    assert.equal(distinguishedRefinement.carrierOperation, undefined);
    assert.equal(staleRefinement.carrierAlreadyDistinguished, false);
    assert.equal(staleRefinement.carrierOperation.operation, "replace-section");
    assert.equal(staleRefinement.carrierOperation.heading, "11. Risks and technical debt");
    assert.match(staleRefinement.carrierOperation.body, /bounded arc42 projection conformance/u);
    assert.match(staleRefinement.remainingObligation, /Generic LanguagePresentation\/Translation kernel conformance remains open/u);
    assert.ok(hasRow(riskProjectionReadout.improvement.rows, staleRefinement.address, "metroplat.kind", "metroplat.arc42.risk-refinement"));
    assert.ok(hasRow(riskProjectionReadout.improvement.rows, staleRefinement.address, "arc42.carrier-already-distinguished", false));
    assert.ok(hasRow(riskProjectionReadout.improvement.rows, staleRefinement.address, "arc42.carrier-operation"));
    assert.ok(hasRow(riskProjectionReadout.improvement.rows, staleRefinement.address, "arc42.bounded-evidence", projectedStaleGap.conformanceEvidence[0]));

    const written = await runArc42SadWorkbench(binding, { path: sadPath, section: "5.10", operations: [operation], write: true });
    assert.equal(written.changed, true);
    assert.equal(written.persisted, true);
    assert.equal(written.writeReceipt.kind, "metroplat.filesystem.write-receipt");
    assert.match(readFileSync(sadPath, "utf8"), /Settlement is idempotent/u);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("arc42 SAD workbench emits a content-addressed language refinement packet", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "metroplat-arc42-language-"));
  try {
    const sadPath = path.join(root, "architecture.md");
    const evidencePath = path.join(root, "theory.md");
    writeFileSync(sadPath, SAD, "utf8");
    writeFileSync(evidencePath, "# Theory\n\nchurch_rosser establishes confluence.\n", "utf8");
    const claim = artifactId({ claim: "typed reduction" });
    const stages = ["dream", "plan", "architect", "spec", "tests", "docs", "code"];
    const presentations = Object.fromEntries(stages.map((stage) => [stage, defineLanguagePresentation({
      id: `test.arc42.${stage}`,
      name: stage,
      version: "1",
      corner: "assertion",
      rung: "identity",
      validationScope: Object.freeze(["typed reduction"]),
      contract: Object.freeze({ grammar: Object.freeze({ kind: "claim-expression" }), judgments: Object.freeze(["typed reduction"]), reduction: Object.freeze({ kind: "claim-field" }), semantics: Object.freeze({ kind: "claim-field" }), canonicalEncoding: Object.freeze({ kind: "rfc8785-jcs" }) }),
      canonicalExpression: (expression) => expression,
      accepts: () => true,
      semantics: (expression) => ({ claim: expression.claim }),
    })]));
    const family = defineLanguageFamily({
      id: "test.arc42.development",
      name: "test arc42 development family",
      sharedSemantics: { kind: "claim-field" },
      presentations: Object.values(presentations),
      translations: stages.slice(1).map((stage, index) => defineLanguageTranslation({ source: presentations[stages[index]].address, target: presentations[stage].address, contract: { kind: "development-stage-refinement", from: stages[index], to: stage }, lossProfile: { kind: "lossless" }, translate: () => ({ stage, claim }) })),
    });
    const developmentArtifacts = [];
    let artifact = languageArtifactOf(presentations.dream, { stage: "dream", claim }, {
      assertions: [{ claim, charge: "held" }],
    });
    developmentArtifacts.push(Object.freeze({ ...artifact, stage: "dream", translations: Object.freeze([]) }));
    for (const stage of stages.slice(1)) {
      const translation = translateInLanguageFamily({
        family,
        source: artifact,
        targetPresentation: presentations[stage].address,
      });
      assert.equal(translation.ok, true);
      artifact = translation.artifact;
      developmentArtifacts.push(Object.freeze({ ...artifact, stage, translations: Object.freeze([translation.witness]) }));
    }
    const binding = defaultFilesystemBinding(root);
    const result = await runArc42SadWorkbench(binding, {
      path: sadPath,
      section: "5.10",
      includeRefinementPacket: true,
      evidenceSources: [{ kind: "formal-declaration", path: evidencePath, locator: "church_rosser" }],
      developmentArtifacts,
    });

    assert.equal(result.refinementPacket.section.id, "5.10");
    assert.equal(result.refinementPacket.evidence[0].matches[0].line, 3);
    assert.equal(result.refinementPacket.development.complete, true);
    assert.match(result.refinementPacket.address, /^ni:\/\/\/sha-256;/u);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
