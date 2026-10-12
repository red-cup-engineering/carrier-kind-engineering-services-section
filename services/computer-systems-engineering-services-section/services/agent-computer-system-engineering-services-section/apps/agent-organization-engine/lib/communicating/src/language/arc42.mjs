/**
 * codecs/arc42 - an authoring form for arc42 building-block claims.
 *
 * The arc42 SAD's §5 building blocks are handwritten prose against a
 * five-field template (Depends on / Interface / Obstruction variants /
 * Preconditions / Postconditions), with enough real-world drift — a
 * non-templated wrapper heading, one block that abandons the template
 * entirely, cross-references that lead or trail or stack mid-sentence —
 * that recovering the template mechanically from the prose is guesswork.
 *
 * `buildingBlock` inverts the direction: instead of parsing prose into
 * claims, state the claims directly in the shape they already are, and let
 * the shared SHP codec do the projection. `dependsOn` entries
 * are wrapped as `ref()` automatically, so a dependency is a genuine link
 * to another building block's subject, not a citation a reader has to
 * resolve by eye.
 */
import {
  fromSection,
  ref,

} from "@red-cup-engineering/html-structural-projection-service";
import {
  htmlElement,
  htmlFragment,
  renderHtmlDocument,

} from "@red-cup-engineering/html-structural-projection-service/document-nodes";

import { toEavt } from "@red-cup-engineering/eavt-services-section/row";
import { addressTextDocument } from "@red-cup-engineering/semiotic-eavt-services-section/identity";
import { canonicalJson } from "@red-cup-engineering/json-services-section";
import {
  defineLanguageFamily,
  defineLanguagePresentation,
  defineLanguageTranslation,
  languageArtifactOf,
  translateInLanguageFamily,

} from "./presentation.mjs";
import { readMarkdownStructure } from "@red-cup-engineering/markdown-engineering-services-section/read-markdown-structure";
import { renderMarkdownBlockHtml } from "@red-cup-engineering/markdown-engineering-services-section/render-markdown-block-html";
import { renderMarkdownInlineHtml } from "@red-cup-engineering/markdown-engineering-services-section/render-markdown-inline-html";
import { document, element } from "@red-cup-engineering/xml-document-rendering-service/core";

/** The five canonical arc42 building-block fields, plus identity and links. */

const FIELDS = [
  { key: "interface", predicate: "interface" },
  { key: "obstructionVariants", predicate: "obstruction-variants" },
  { key: "preconditions", predicate: "preconditions" },
  { key: "postconditions", predicate: "postconditions" },
];

/** Build one building block's claims: name, depends-on refs, and its filled-in fields. */
export function buildingBlock(spec, opts = {}) {
  if (!spec.id) throw new TypeError("buildingBlock: id is required");
  if (!spec.name) throw new TypeError("buildingBlock: name is required");
  const affirmed = [{ predicate: "name", object: spec.name }];
  for (const target of spec.dependsOn ?? []) {
    affirmed.push({ predicate: "depends-on", object: ref(target) });
  }
  for (const { key, predicate } of FIELDS) {
    const value = spec[key];
    if (typeof value !== "string") continue;
    affirmed.push({ predicate, object: value });
  }
  for (const [predicate, object] of Object.entries(spec.extra ?? {})) {
    affirmed.push({ predicate, object });
  }
  return fromSection({ affirmed }, { subject: spec.id, title: `${spec.id} ${spec.name}`, ...opts });
}

/** One numbered arc42 heading, addressable as a bounded review unit. */

/** A code span or formula-bearing line available as local grounding evidence. */

/** Exact text and immediate context for one selected SAD review unit. */

/** Structure-first reading of arc42 architecture-description carrier text. */

const ARC42_TOP_LEVEL_SECTIONS = Object.freeze(Array.from({ length: 12 }, (_, index) => index + 1));
const ISO_42010_STANDARD = "ISO/IEC/IEEE 42010";
const ISO_42010_CONCEPTUAL_MODEL = "https://www.iso-architecture.org/42010/cm/";
const ISO_42010_CONCEPTS = Object.freeze([
  "entity-of-interest",
  "architecture",
  "architecture-description",
  "architecture-description-language",
  "architecture-view",
  "architecture-viewpoint",
  "concern",
  "correspondence",
  "model-kind",
  "stakeholder",
]);
const FORMULA_MARK = /(?:∀|∃|∈|⊆|⊂|⟺|⟹|⇔|⇒|⊢|⊣|\biff\b|\bforall\b|\bexists\b|[A-Za-z0-9_')\]}]\s*=\s*[^=>])/u;
const ARC42_SECTION_KINDS

 = Object.freeze({
  1: Object.freeze({ viewpoint: "introduction-and-goals", modelKind: "quality-goal-tree", concern: "stakeholder goals and quality goals" }),
  2: Object.freeze({ viewpoint: "constraints", modelKind: "constraint-catalog", concern: "architecture constraints" }),
  3: Object.freeze({ viewpoint: "context-and-scope", modelKind: "system-context", concern: "system boundary and external interfaces" }),
  4: Object.freeze({ viewpoint: "solution-strategy", modelKind: "strategy-decision-set", concern: "fundamental solution approach" }),
  5: Object.freeze({ viewpoint: "building-block-view", modelKind: "static-decomposition", concern: "structural decomposition and responsibilities" }),
  6: Object.freeze({ viewpoint: "runtime-view", modelKind: "runtime-scenario", concern: "behavioral interaction and execution flow" }),
  7: Object.freeze({ viewpoint: "deployment-view", modelKind: "deployment-allocation", concern: "runtime nodes, artifacts, and allocation" }),
  8: Object.freeze({ viewpoint: "cross-cutting-concepts", modelKind: "cross-cutting-concept", concern: "recurring architectural rules and mechanisms" }),
  9: Object.freeze({ viewpoint: "architecture-decisions", modelKind: "architecture-decision-record", concern: "decisions, rationale, and consequences" }),
  10: Object.freeze({ viewpoint: "quality-requirements", modelKind: "quality-scenario", concern: "measurable quality acceptance" }),
  11: Object.freeze({ viewpoint: "risks-and-technical-debt", modelKind: "risk-register", concern: "unrealized capabilities and evidence debt" }),
  12: Object.freeze({ viewpoint: "glossary", modelKind: "term-definition", concern: "settled vocabulary" }),
});

function sectionIdentity(title) {
  return title.match(/^(\d+(?:\.\d+)*(?:[a-z])?)\.?(?:\s+|$)/u)?.[1];
}

function sectionOf(heading) {
  const id = sectionIdentity(heading.title);
  if (id === undefined) return undefined;
  return Object.freeze({
    id,
    title: heading.title,
    level: heading.level,
    path: heading.path,
    startLine: heading.startLine,
    endLine: heading.endLine,
  });
}

function linesOf(text) {
  const lines = text.replace(/\r\n?/gu, "\n").split("\n");
  if (text.endsWith("\n")) lines.pop();
  return Object.freeze(lines);
}

function sectionText(lines, section) {
  return lines.slice(section.startLine - 1, section.endLine).join("\n");
}

function evidenceSignals(text, startLine) {
  const signals = [];
  for (const [offset, line] of linesOf(text).entries()) {
    const lineNumber = startLine + offset;
    const spans = line.matchAll(/`([^`\n]+)`/gu);
    for (const match of spans) {
      const value = match[1];
      signals.push(Object.freeze({ kind: "code-span", value, line: lineNumber }));
    }
    if (FORMULA_MARK.test(line)) {
      signals.push(Object.freeze({ kind: "formula-line", value: line.trim(), line: lineNumber }));
    }
  }
  return Object.freeze(signals);
}

function neighbor(section) {
  if (section === undefined) return undefined;
  return Object.freeze({ id: section.id, title: section.title });
}

function sectionEntity(carrier, section) {
  return `metroplat:arc42:section:${carrier}#${section}`;
}

function reviewUnitEntity(carrier, section) {
  return `metroplat:arc42:review-unit:${carrier}#${section}`;
}

function signalEntity(carrier, section, index) {
  return `metroplat:arc42:evidence-signal:${carrier}#${section}/${index}`;
}

function riskEntity(carrier, index) {
  return `metroplat:arc42:risk:${carrier}#${index + 1}`;
}

function architectureDescriptionProfileEntity(carrier) {
  return `metroplat:arc42:architecture-description-profile:${carrier}`;
}

function tableCells(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) return undefined;
  return Object.freeze(trimmed.slice(1, -1).split("|").map((cell) => cell.trim()));
}

function riskRows(text) {
  const rows = [];
  for (const [offset, line] of linesOf(text).entries()) {
    const cells = tableCells(line);
    if (cells === undefined || cells.length < 2) continue;
    const [risk, treatment] = cells;
    if (risk === undefined || treatment === undefined) continue;
    if (risk === "Risk" || /^-+$/u.test(risk) || /^-+$/u.test(treatment)) continue;
    rows.push(Object.freeze({ risk, treatment, line: offset + 1 }));
  }
  return Object.freeze(rows);
}

function sadStatementRows(
  carrier,
  title,
  sections,
  missingArc42Sections,
  reviewUnit,
) {
  const t = `metroplat:arc42:readout:${carrier}`;
  const profile = architectureDescriptionProfileEntity(carrier);
  const rows = [
    toEavt({ e: carrier, a: "metroplat.kind", v: "metroplat.arc42.architecture-description", t }),
    toEavt({ e: carrier, a: "metroplat.carrier", v: carrier, t }),
    toEavt({ e: carrier, a: "arc42.architecture-description-profile", v: profile, t }),
    toEavt({ e: profile, a: "metroplat.kind", v: "metroplat.arc42.architecture-description-profile", t }),
    toEavt({ e: profile, a: "iso42010.standard", v: ISO_42010_STANDARD, t }),
    toEavt({ e: profile, a: "iso42010.conceptual-model", v: ISO_42010_CONCEPTUAL_MODEL, t }),
    toEavt({ e: profile, a: "iso42010.architecture-description-language", v: "arc42", t }),
    toEavt({ e: profile, a: "iso42010.architecture-description", v: carrier, t }),
    toEavt({ e: profile, a: "iso42010.correspondence-carrier", v: "eavt-statement-rows", t }),
  ];
  for (const concept of ISO_42010_CONCEPTS) {
    rows.push(toEavt({ e: profile, a: "iso42010.concept", v: concept, t }));
  }
  if (title !== undefined) rows.push(toEavt({ e: carrier, a: "arc42.title", v: title, t }));
  for (const section of sections) {
    const entity = sectionEntity(carrier, section.id);
    rows.push(
      toEavt({ e: carrier, a: "arc42.has-section", v: entity, t }),
      toEavt({ e: entity, a: "metroplat.kind", v: "metroplat.arc42.section", t }),
      toEavt({ e: entity, a: "arc42.section-id", v: section.id, t }),
      toEavt({ e: entity, a: "arc42.title", v: section.title, t }),
      toEavt({ e: entity, a: "arc42.level", v: section.level, t }),
      toEavt({ e: entity, a: "arc42.start-line", v: section.startLine, t }),
      toEavt({ e: entity, a: "arc42.end-line", v: section.endLine, t }),
    );
    const topLevel = Number(section.id.split(".")[0]);
    const kind = ARC42_SECTION_KINDS[topLevel];
    if (kind !== undefined) {
      rows.push(
        toEavt({ e: entity, a: "arc42.viewpoint", v: kind.viewpoint, t }),
        toEavt({ e: entity, a: "arc42.model-kind", v: kind.modelKind, t }),
        toEavt({ e: entity, a: "arc42.concern", v: kind.concern, t }),
        toEavt({ e: entity, a: "iso42010.architecture-view", v: entity, t }),
        toEavt({ e: entity, a: "iso42010.architecture-viewpoint", v: kind.viewpoint, t }),
        toEavt({ e: entity, a: "iso42010.model-kind", v: kind.modelKind, t }),
        toEavt({ e: entity, a: "iso42010.concern", v: kind.concern, t }),
        toEavt({ e: profile, a: "iso42010.governs-view", v: entity, t }),
      );
    }
  }
  for (const section of missingArc42Sections) {
    rows.push(toEavt({ e: carrier, a: "arc42.missing-section", v: section, t }));
  }
  if (reviewUnit !== undefined) {
    const entity = reviewUnitEntity(carrier, reviewUnit.id);
    const textCarrier = addressTextDocument(reviewUnit.text).ref;
    rows.push(
      toEavt({ e: carrier, a: "arc42.selected-review-unit", v: entity, t }),
      toEavt({ e: entity, a: "metroplat.kind", v: "metroplat.arc42.review-unit", t }),
      toEavt({ e: entity, a: "arc42.section-id", v: reviewUnit.id, t }),
      toEavt({ e: entity, a: "arc42.title", v: reviewUnit.title, t }),
      toEavt({ e: entity, a: "arc42.level", v: reviewUnit.level, t }),
      toEavt({ e: entity, a: "arc42.start-line", v: reviewUnit.startLine, t }),
      toEavt({ e: entity, a: "arc42.end-line", v: reviewUnit.endLine, t }),
      toEavt({ e: entity, a: "metroplat.carrier", v: carrier, t }),
      toEavt({ e: entity, a: "arc42.carrier-text", v: textCarrier, t }),
    );
    if (reviewUnit.previous !== undefined) {
      rows.push(toEavt({ e: entity, a: "arc42.previous-section", v: reviewUnit.previous.id ?? reviewUnit.previous.title, t }));
    }
    if (reviewUnit.next !== undefined) {
      rows.push(toEavt({ e: entity, a: "arc42.next-section", v: reviewUnit.next.id ?? reviewUnit.next.title, t }));
    }
    for (const [index, signal] of reviewUnit.evidenceSignals.entries()) {
      const signalRef = signalEntity(carrier, reviewUnit.id, index);
      rows.push(
        toEavt({ e: entity, a: "arc42.evidence-signal", v: signalRef, t }),
        toEavt({ e: signalRef, a: "metroplat.kind", v: "metroplat.arc42.evidence-signal", t }),
        toEavt({ e: signalRef, a: "arc42.signal-kind", v: signal.kind, t }),
        toEavt({ e: signalRef, a: "arc42.line", v: signal.line, t }),
        toEavt({ e: signalRef, a: "arc42.value", v: signal.value, t }),
      );
    }
    if (reviewUnit.id === "11") {
      for (const [index, row] of riskRows(reviewUnit.text).entries()) {
        const riskRef = riskEntity(carrier, index);
        rows.push(
          toEavt({ e: entity, a: "arc42.risk", v: riskRef, t }),
          toEavt({ e: riskRef, a: "metroplat.kind", v: "metroplat.arc42.implementation-conformance-gap", t }),
          toEavt({ e: riskRef, a: "arc42.risk-title", v: row.risk, t }),
          toEavt({ e: riskRef, a: "arc42.evidence-boundary", v: row.treatment, t }),
          toEavt({ e: riskRef, a: "arc42.line", v: reviewUnit.startLine + row.line - 1, t }),
        );
      }
    }
  }
  return Object.freeze(rows);
}

/**
 * Read an arc42 SAD as numbered review units. `selector` is either a section
 * identity (`5.10`, `5.13a`) or one exact heading title. The selected unit is
 * returned verbatim, including its heading, so an agent can ground and rewrite
 * a bounded claim without loading or restating the whole architecture.
 */
export function sadReadout(text, selector) {
  const structure = readMarkdownStructure(text);
  const sections = Object.freeze(structure.headings.flatMap((heading) => {
    const section = sectionOf(heading);
    return section === undefined ? [] : [section];
  }));
  const topLevel = new Set(sections.filter((section) => section.level === 2).map((section) => Number(section.id)));
  const missingArc42Sections = Object.freeze(ARC42_TOP_LEVEL_SECTIONS.filter((section) => !topLevel.has(section)));
  const lines = linesOf(text);
  let reviewUnit;
  if (selector !== undefined) {
    const wanted = selector.trim();
    const matches = sections.filter((section) => section.id === wanted || section.title === wanted);
    if (matches.length === 0) throw new TypeError(`arc42 SAD: review unit ${JSON.stringify(selector)} was not found`);
    if (matches.length > 1) throw new TypeError(`arc42 SAD: review unit ${JSON.stringify(selector)} is ambiguous`);
    const selected = matches[0];
    const index = sections.indexOf(selected);
    const unitText = sectionText(lines, selected);
    reviewUnit = Object.freeze({
      ...selected,
      text: unitText,
      ...(neighbor(sections[index - 1]) === undefined ? {} : { previous: neighbor(sections[index - 1]) }),
      ...(neighbor(sections[index + 1]) === undefined ? {} : { next: neighbor(sections[index + 1]) }),
      evidenceSignals: evidenceSignals(unitText, selected.startLine),
    });
  }
  const title = structure.headings.find((heading) => heading.level === 1)?.title;
  const carrier = addressTextDocument(text).ref;
  const statementRows = sadStatementRows(carrier, title, sections, missingArc42Sections, reviewUnit);
  return Object.freeze({
    kind: "metroplat.arc42.sad-readout",
    carrier,
    source: carrier,
    ...(title === undefined ? {} : { title }),
    sections,
    missingArc42Sections,
    missingCanonicalSections: missingArc42Sections,
    ...(reviewUnit === undefined ? {} : { reviewUnit }),
    statementRows,
  });
}

function projectionJsonText(value) {
  try {
    return canonicalJson(value);
  } catch (error) {
    if (!(error instanceof TypeError) || !error.message.includes("canonical-limit")) throw error;
    return JSON.stringify(value);
  }
}

/**
 * Project an arc42 reading to the initial xml2arc42 interchange vocabulary.
 * The XML is one presentation of the same content-addressed architecture
 * description material: it carries carrier identity, the numbered outline, and
 * (when selected) one exact review unit with its evidence signals for downstream
 * transposition, presentation, or validation.
 */
export function sadReadoutXml(readout, basis) {
  return document(element("architecture-description", {
    profile: "arc42",
    standard: ISO_42010_STANDARD,
    conceptualModel: ISO_42010_CONCEPTUAL_MODEL,
    carrier: readout.carrier,
    /** @deprecated Compatibility alias for consumers that still expect source. */
    source: readout.source,
    title: readout.title,
  }, [
    element("sections", {}, readout.sections.map((section) => element("section", {
      id: section.id,
      title: section.title,
      level: section.level,
      "start-line": section.startLine,
      "end-line": section.endLine,
    }))),
    element("missing-arc42-sections", {}, readout.missingArc42Sections.map((section) =>
      element("section-ref", { id: section }))),
    readout.reviewUnit === undefined ? null : element("review-unit", {
      id: readout.reviewUnit.id,
      title: readout.reviewUnit.title,
      level: readout.reviewUnit.level,
      "start-line": readout.reviewUnit.startLine,
      "end-line": readout.reviewUnit.endLine,
    }, [
      element("carrier-text", {}, [readout.reviewUnit.text]),
      element("evidence-signals", {}, readout.reviewUnit.evidenceSignals.map((signal) => element("evidence-signal", {
        kind: signal.kind,
        line: signal.line,
      }, [signal.value]))),
    ]),
    element("statement-rows", {
      mediaType: "application/eavt+json",
      count: readout.statementRows.length,
    }, readout.statementRows.map((row, index) => element("eavt-row", { index }, [
      element("e", {}, [canonicalJson(row[0])]),
      element("a", {}, [canonicalJson(row[1])]),
      element("v", {}, [canonicalJson(row[2])]),
      element("t", {}, [canonicalJson(row[3])]),
    ]))),
    basis === undefined ? null : element("projection-basis", { basis: "non-self" }, [
      element("statement-set", {
        mediaType: "application/vnd.metroplat.arc42.statement-set+json",
      }, [projectionJsonText(basis.statementSet)]),
      element("statement-analysis", {
        mediaType: "application/vnd.metroplat.arc42.statement-analysis+json",
      }, [projectionJsonText(basis.analysis)]),
      element("improvement-readout", {
        mediaType: "application/vnd.metroplat.arc42.improvement-readout+json",
      }, [projectionJsonText(basis.improvement)]),
    ]),
  ]), { declaration: true });
}

function reviewUnitHtml(readout) {
  if (readout.reviewUnit === undefined) return null;
  const unit = readout.reviewUnit;
  return htmlElement("article", {
    id: `review-unit-${unit.id}`,
    class: "arc42-review-unit",
    "data-section-id": unit.id,
    "data-start-line": unit.startLine,
    "data-end-line": unit.endLine,
  }, [
    htmlElement("h2", {}, [`Review unit ${unit.id}`]),
    htmlElement("p", { class: "arc42-section-path" }, [unit.path.join(" / ")]),
    htmlElement("section", { class: "arc42-carrier-text" }, [
      htmlFragment(renderMarkdownBlockHtml(unit.text)),
    ]),
    htmlElement("section", { class: "arc42-evidence-signals" }, [
      htmlElement("h3", {}, ["Evidence signals"]),
      unit.evidenceSignals.length === 0
        ? htmlElement("p", {}, ["No local code spans or formula-bearing lines detected."])
        : htmlElement("ul", {}, unit.evidenceSignals.map((signal) =>
          htmlElement("li", {
            "data-kind": signal.kind,
            "data-line": signal.line,
          }, [
            htmlElement("code", {}, [signal.value]),
            ` — line ${signal.line}`,
          ]))),
    ]),
  ]);
}

function sectionLink(section) {
  return htmlElement("li", {
    "data-section-id": section.id,
    "data-level": section.level,
    "data-start-line": section.startLine,
    "data-end-line": section.endLine,
  }, [
    htmlElement("a", { href: `#section-${section.id}` }, [
      htmlFragment(renderMarkdownInlineHtml(section.title)),
    ]),
  ]);
}

/**
 * Project an arc42 readout to a standalone HTML document.
 *
 * The HTML is another presentation of the structured readout: each numbered
 * section carries machine-readable section identity and line coordinates, and a
 * selected review unit carries exact carrier text plus evidence signals. It is
 * neither downstream of a privileged Markdown truth nor a competing authority;
 * it is the web-facing transposition of the content-addressed `SadReadout`.
 */
export function sadReadoutHtml(readout) {
  const title = readout.title ?? "arc42 architecture description";
  return renderHtmlDocument({
    lang: "en",
    head: [
      htmlElement("meta", { charset: "utf-8" }),
      htmlElement("title", {}, [title]),
      htmlElement("meta", { name: "metroplat-kind", content: readout.kind }),
      htmlElement("meta", { name: "metroplat-carrier", content: readout.carrier }),
      htmlElement("meta", { name: "metroplat-architecture-description-profile", content: "arc42" }),
      htmlElement("meta", { name: "metroplat-architecture-description-standard", content: ISO_42010_STANDARD }),
    ],
    body: [
      htmlElement("main", {
        class: "arc42-sad",
        "data-kind": readout.kind,
        "data-carrier": readout.carrier,
        "data-architecture-description-profile": "arc42",
        "data-architecture-description-standard": ISO_42010_STANDARD,
      }, [
        htmlElement("header", {}, [
          htmlElement("h1", {}, [title]),
          htmlElement("p", {}, [
            "Carrier: ",
            htmlElement("code", {}, [readout.carrier]),
          ]),
        ]),
        htmlElement("nav", { "aria-label": "arc42 sections" }, [
          htmlElement("h2", {}, ["Sections"]),
          htmlElement("ol", {}, readout.sections.map(sectionLink)),
        ]),
        readout.missingArc42Sections.length === 0
          ? null
          : htmlElement("section", { class: "arc42-missing-sections" }, [
            htmlElement("h2", {}, ["Missing arc42 numbered sections"]),
            htmlElement("p", {}, [readout.missingArc42Sections.join(", ")]),
          ]),
        htmlElement("section", { class: "arc42-section-index" }, [
          htmlElement("h2", {}, ["Section index"]),
          ...readout.sections.map((section) => htmlElement("section", {
            id: `section-${section.id}`,
            "data-section-id": section.id,
            "data-level": section.level,
            "data-start-line": section.startLine,
            "data-end-line": section.endLine,
          }, [
            htmlElement(`h${Math.min(section.level + 1, 6)}`, {}, [
              htmlFragment(renderMarkdownInlineHtml(section.title)),
            ]),
            htmlElement("p", {}, [
              `Lines ${section.startLine}–${section.endLine}`,
            ]),
          ])),
        ]),
        reviewUnitHtml(readout),
      ]),
    ],
  });
}

export const BASE_ARC42_VALIDATION_SCOPE = Object.freeze([
  "arc42-section-identity",
  "arc42-section-line-coordinates",
  "selected-review-unit-carrier-text",
  "local-evidence-signals",
  "eavt-statement-rows",
]);

export const DERIVED_ARC42_VALIDATION_SCOPE = Object.freeze([
  ...BASE_ARC42_VALIDATION_SCOPE,
  "derived-statement-analysis",
  "improvement-finding-rows",
]);

export function arc42ProjectionValidationScope(basis) {
  return basis === undefined ? BASE_ARC42_VALIDATION_SCOPE : DERIVED_ARC42_VALIDATION_SCOPE;
}

export function arc42ReadoutExpression(sad) {
  const profile = architectureDescriptionProfileEntity(sad.carrier);
  return Object.freeze({
    kind: "metroplat.arc42.sad-expression",
    version: 1,
    profile: "arc42",
    architectureDescriptionProfile: Object.freeze({
      kind: "metroplat.arc42.architecture-description-profile",
      entity: profile,
      standard: ISO_42010_STANDARD,
      conceptualModel: ISO_42010_CONCEPTUAL_MODEL,
      architectureDescriptionLanguage: "arc42",
      correspondenceCarrier: "eavt-statement-rows",
      concepts: ISO_42010_CONCEPTS,
    }),
    carrier: sad.carrier,
    ...(sad.title === undefined ? {} : { title: sad.title }),
    sections: Object.freeze(sad.sections.map((section) => Object.freeze({
      id: section.id,
      title: section.title,
      level: section.level,
      path: Object.freeze([...section.path]),
      startLine: section.startLine,
      endLine: section.endLine,
    }))),
    missingArc42Sections: Object.freeze([...sad.missingArc42Sections]),
    ...(sad.reviewUnit === undefined ? {} : {
      reviewUnit: Object.freeze({
        id: sad.reviewUnit.id,
        title: sad.reviewUnit.title,
        level: sad.reviewUnit.level,
        path: Object.freeze([...sad.reviewUnit.path]),
        startLine: sad.reviewUnit.startLine,
        endLine: sad.reviewUnit.endLine,
        carrierText: addressTextDocument(sad.reviewUnit.text).ref,
        evidenceSignals: Object.freeze(sad.reviewUnit.evidenceSignals.map((signal) => Object.freeze({ ...signal }))),
        ...(sad.reviewUnit.previous === undefined ? {} : { previous: Object.freeze({ ...sad.reviewUnit.previous }) }),
        ...(sad.reviewUnit.next === undefined ? {} : { next: Object.freeze({ ...sad.reviewUnit.next }) }),
      }),
    }),
    statementRows: Object.freeze([...sad.statementRows]),
  });
}

function recordOf(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return Object.freeze({});
  return value;
}

function arc42SharedSemantics(expression) {
  const record = recordOf(expression);
  return Object.freeze({
    profile: record.profile ?? "arc42",
    architectureDescriptionProfile: record.architectureDescriptionProfile,
    carrier: record.carrier,
    sections: record.sections ?? Object.freeze([]),
    missingArc42Sections: record.missingArc42Sections ?? Object.freeze([]),
    ...(record.reviewUnit === undefined ? {} : { reviewUnit: record.reviewUnit }),
    statementRows: record.statementRows ?? Object.freeze([]),
  });
}

export const arc42SadPresentation = defineLanguagePresentation({
  id: "metroplat.arc42.sad",
  name: "arc42 architecture-description structured readout",
  version: "1",
  corner: "assertion",
  rung: "strict",
  validationScope: BASE_ARC42_VALIDATION_SCOPE,
  contract: Object.freeze({ grammar: Object.freeze({ kind: "json-kind", value: "metroplat.arc42.sad-expression", standard: ISO_42010_STANDARD, concepts: ISO_42010_CONCEPTS }), judgments: Object.freeze([...BASE_ARC42_VALIDATION_SCOPE]), reduction: Object.freeze({ kind: "arc42SharedSemantics" }), semantics: Object.freeze({ kind: "arc42SharedSemantics" }), canonicalEncoding: Object.freeze({ kind: "rfc8785-jcs" }) }),
  canonicalExpression: (expression) => expression,
  accepts: (expression) =>
    typeof expression === "object"
    && expression !== null
    && !Array.isArray(expression)
    && "kind" in expression
    && (expression).kind === "metroplat.arc42.sad-expression",
  semantics: arc42SharedSemantics,
});

export const arc42XmlPresentation = defineLanguagePresentation({
  id: "metroplat.arc42.xml2arc42",
  name: "arc42 xml2arc42 interchange projection",
  version: "1",
  corner: "assertion",
  rung: "strict",
  validationScope: BASE_ARC42_VALIDATION_SCOPE,
  contract: Object.freeze({ grammar: Object.freeze({ kind: "json-kind", value: "metroplat.arc42.xml2arc42-expression", standard: ISO_42010_STANDARD, concepts: ISO_42010_CONCEPTS }), judgments: Object.freeze([...BASE_ARC42_VALIDATION_SCOPE]), reduction: Object.freeze({ kind: "arc42SharedSemantics" }), semantics: Object.freeze({ kind: "arc42SharedSemantics" }), canonicalEncoding: Object.freeze({ kind: "rfc8785-jcs" }) }),
  canonicalExpression: (expression) => expression,
  accepts: (expression) =>
    typeof expression === "object"
    && expression !== null
    && !Array.isArray(expression)
    && "kind" in expression
    && (expression).kind === "metroplat.arc42.xml2arc42-expression",
  semantics: arc42SharedSemantics,
});

export const arc42HtmlPresentation = defineLanguagePresentation({
  id: "metroplat.arc42.html",
  name: "arc42 HTML claim-payload projection",
  version: "1",
  corner: "assertion",
  rung: "strict",
  validationScope: DERIVED_ARC42_VALIDATION_SCOPE,
  contract: Object.freeze({ grammar: Object.freeze({ kind: "json-kind", value: "metroplat.arc42.html-claim-payload", standard: ISO_42010_STANDARD, concepts: ISO_42010_CONCEPTS }), judgments: Object.freeze([...DERIVED_ARC42_VALIDATION_SCOPE]), reduction: Object.freeze({ kind: "arc42SharedSemantics" }), semantics: Object.freeze({ kind: "arc42SharedSemantics" }), canonicalEncoding: Object.freeze({ kind: "rfc8785-jcs" }) }),
  canonicalExpression: (expression) => expression,
  accepts: (expression) =>
    typeof expression === "object"
    && expression !== null
    && !Array.isArray(expression)
    && "kind" in expression
    && (expression).kind === "metroplat.arc42.html-claim-payload",
  semantics: arc42SharedSemantics,
});

export const arc42SenPresentation = defineLanguagePresentation({
  id: "metroplat.arc42.sen",
  name: "arc42 architecture-description SEN projection",
  version: "1",
  corner: "assertion",
  rung: "strict",
  validationScope: DERIVED_ARC42_VALIDATION_SCOPE,
  contract: Object.freeze({ grammar: Object.freeze({ kind: "json-kind", value: "metroplat.arc42.sen-expression", standard: ISO_42010_STANDARD, concepts: ISO_42010_CONCEPTS }), judgments: Object.freeze([...DERIVED_ARC42_VALIDATION_SCOPE]), reduction: Object.freeze({ kind: "arc42SharedSemantics" }), semantics: Object.freeze({ kind: "arc42SharedSemantics" }), canonicalEncoding: Object.freeze({ kind: "rfc8785-jcs" }) }),
  canonicalExpression: (expression) => expression,
  accepts: (expression) =>
    typeof expression === "object"
    && expression !== null
    && !Array.isArray(expression)
    && "kind" in expression
    && (expression).kind === "metroplat.arc42.sen-expression",
  semantics: arc42SharedSemantics,
});

export function arc42SenExpression(sad, basis) {
  const source = recordOf(arc42ReadoutExpression(sad));
  return Object.freeze({
    ...source,
    kind: "metroplat.arc42.sen-expression",
    ...(basis === undefined ? {} : {
      projectionBasis: "non-self",
      statementSet: basis.statementSet,
      statementAnalysis: basis.analysis,
      improvement: basis.improvement,
    }),
  });
}

export function arc42HtmlPayload(sad, basis) {
  const source = recordOf(arc42ReadoutExpression(sad));
  return Object.freeze({
    ...source,
    kind: "metroplat.arc42.html-claim-payload",
    validationScope: arc42ProjectionValidationScope(basis),
    ...(basis === undefined ? {} : {
      projectionBasis: "non-self",
      statementSet: basis.statementSet,
      statementAnalysis: basis.analysis,
      improvement: basis.improvement,
    }),
  });
}

export function arc42XmlExpression(sad, basis) {
  const source = recordOf(arc42ReadoutExpression(sad));
  return Object.freeze({
    ...source,
    kind: "metroplat.arc42.xml2arc42-expression",
    ...(basis === undefined ? {} : {
      projectionBasis: "non-self",
      statementSet: basis.statementSet,
      statementAnalysis: basis.analysis,
      improvement: basis.improvement,
    }),
  });
}

export function arc42SourceArtifactOf(sad) {
  return languageArtifactOf(arc42SadPresentation, arc42ReadoutExpression(sad), {
    assertions: [{ claim: sad.carrier, reading: "held" }],
  });
}

export function arc42ProjectionTranslationWitness(
  sad,
  targetPresentation,
  expression,
  lossProfile,
) {
  const source = arc42SourceArtifactOf(sad);
  const routes = Object.freeze([
    Object.freeze({ presentation: arc42XmlPresentation, expression: targetPresentation.address === arc42XmlPresentation.address ? expression : arc42XmlExpression(sad), omits: Object.freeze([]) }),
    Object.freeze({ presentation: arc42HtmlPresentation, expression: targetPresentation.address === arc42HtmlPresentation.address ? expression : arc42HtmlPayload(sad), omits: Object.freeze(["markdown-frontmatter", "markdown-source-formatting"]) }),
    Object.freeze({ presentation: arc42SenPresentation, expression: targetPresentation.address === arc42SenPresentation.address ? expression : arc42SenExpression(sad), omits: Object.freeze(["markdown-frontmatter", "unselected-section-carrier-text", "markdown-source-formatting"]) }),
  ]);
  const selected = routes.find((route) => route.presentation.address === targetPresentation.address);
  if (selected === undefined || canonicalJson([...selected.omits].sort()) !== canonicalJson([...lossProfile].sort())) {
    throw new TypeError(`arc42 projection ${targetPresentation.id} does not match its declared family loss profile`);
  }
  const translations = routes.map((route) => defineLanguageTranslation({
    source: arc42SadPresentation.address,
    target: route.presentation.address,
    contract: Object.freeze({ kind: "metroplat.arc42.projection", target: route.presentation.id }),
    lossProfile: route.omits.length === 0 ? Object.freeze({ kind: "lossless" }) : Object.freeze({ kind: "lossy", omits: route.omits }),
    translate: () => route.expression,
  }));
  const family = defineLanguageFamily({ id: "metroplat.arc42", name: "arc42 architecture-description presentations", sharedSemantics: Object.freeze({ kind: "arc42SharedSemantics" }), presentations: Object.freeze([arc42SadPresentation, arc42XmlPresentation, arc42HtmlPresentation, arc42SenPresentation]), translations: Object.freeze(translations) });
  const translated = translateInLanguageFamily({
    family,
    source,
    targetPresentation: targetPresentation.address,
  });
  if (!translated.ok) {
    throw new TypeError(`arc42 projection ${targetPresentation.id} obstructed: ${translated.obstruction.message}`);
  }
  return Object.freeze({ artifact: translated.artifact, translation: translated.witness });
}

function scriptSafeJson(value) {
  return projectionJsonText(value)
    .replace(/</gu, "\\u003c")
    .replace(/>/gu, "\\u003e")
    .replace(/&/gu, "\\u0026")
    .replace(/\u2028/gu, "\\u2028")
    .replace(/\u2029/gu, "\\u2029");
}

export function arc42HtmlProjectionContent(sad, basis) {
  const payload = arc42HtmlPayload(sad, basis);
  const script = `<script id="metroplat-arc42-claims" type="application/vnd.metroplat.arc42+json">${scriptSafeJson(payload)}</script>`;
  const html = sadReadoutHtml(sad);
  return html.includes("</body>")
    ? html.replace("</body>", `${script}</body>`)
    : `${html}\n${script}\n`;
}

export function arc42ProjectionLanguageReadout(
  sad,
  projection,
  basis,
) {
  if (projection === "sen") {
    const lossProfile = Object.freeze([
      "markdown-frontmatter",
      "unselected-section-carrier-text",
      "markdown-source-formatting",
    ]);
    const { artifact, translation } = arc42ProjectionTranslationWitness(
      sad,
      arc42SenPresentation,
      arc42SenExpression(sad, basis),
      lossProfile,
    );
    return Object.freeze({
      projection,
      mediaType: "application/vnd.metroplat.arc42.sen+json",
      validationScope: arc42SenPresentation.validationScope,
      lossProfile,
      content: `${projectionJsonText(artifact)}\n`,
      artifact,
      translation,
    });
  }
  const lossProfile = Object.freeze(projection === "xml2arc42"
    ? []
    : ["markdown-frontmatter", "markdown-source-formatting"]);
  const targetPresentation = projection === "xml2arc42" ? arc42XmlPresentation : arc42HtmlPresentation;
  const expression = projection === "xml2arc42" ? arc42XmlExpression(sad, basis) : arc42HtmlPayload(sad, basis);
  const { artifact, translation } = arc42ProjectionTranslationWitness(sad, targetPresentation, expression, lossProfile);
  return Object.freeze({
    projection,
    mediaType: projection === "xml2arc42" ? "application/xml" : "text/html",
    validationScope: projection === "html" || projection === "xml2arc42" ? arc42ProjectionValidationScope(basis) : BASE_ARC42_VALIDATION_SCOPE,
    lossProfile,
    content: projection === "xml2arc42" ? sadReadoutXml(sad, basis) : arc42HtmlProjectionContent(sad, basis),
    artifact,
    translation,
  });
}
