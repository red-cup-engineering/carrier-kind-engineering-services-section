/** BCP 14 normative-requirement reading for Markdown specifications. */
import { addressTextDocument, contentAddress, type ArtifactRef } from "../../identity/index.mts";
import { markdownStructure } from "../markdown/index.mts";
import { document, element } from "../xml-svg/index.mts";

export const BCP14_KEYWORDS = Object.freeze([
  "MUST NOT",
  "SHALL NOT",
  "SHOULD NOT",
  "NOT RECOMMENDED",
  "MUST",
  "REQUIRED",
  "SHALL",
  "SHOULD",
  "RECOMMENDED",
  "MAY",
  "OPTIONAL",
] as const);

export type Bcp14Keyword = (typeof BCP14_KEYWORDS)[number];
export type RequirementLevel = "absolute" | "prohibition" | "recommendation" | "discouragement" | "optional";

export type NormativeRequirement = Readonly<{
  readonly id: ArtifactRef;
  readonly keyword: Bcp14Keyword;
  readonly level: RequirementLevel;
  readonly line: number;
  readonly section?: string;
  readonly text: string;
}>;

export type SpecificationIssue = Readonly<{
  readonly rule: "bcp14-boilerplate-missing-rfc2119" | "bcp14-boilerplate-missing-rfc8174";
  readonly severity: "warning";
  readonly message: string;
}>;

export type SpecificationReadout = Readonly<{
  readonly kind: "metroplat.specification.readout";
  readonly source: ArtifactRef;
  readonly title?: string;
  readonly bcp14: Readonly<{
    readonly rfc2119: boolean;
    readonly rfc8174: boolean;
    readonly requirements: readonly NormativeRequirement[];
  }>;
  readonly issues: readonly SpecificationIssue[];
}>;

const KEYWORD_PATTERN = new RegExp(`\\b(${BCP14_KEYWORDS.join("|")})\\b`, "gu");

function requirementLevel(keyword: Bcp14Keyword): RequirementLevel {
  if (keyword === "MUST NOT" || keyword === "SHALL NOT") return "prohibition";
  if (keyword === "SHOULD NOT" || keyword === "NOT RECOMMENDED") return "discouragement";
  if (keyword === "SHOULD" || keyword === "RECOMMENDED") return "recommendation";
  if (keyword === "MAY" || keyword === "OPTIONAL") return "optional";
  return "absolute";
}

function sectionAtLine(structure: ReturnType<typeof markdownStructure>, line: number): string | undefined {
  return [...structure.headings].reverse().find((heading) => heading.line <= line && heading.endLine >= line)?.title;
}

function fenceAfter(line: string, fence: Readonly<{ readonly marker: "`" | "~"; readonly length: number }> | undefined) {
  const match = line.match(/^[ \t]*(`{3,}|~{3,})/u);
  if (match === null) return fence;
  const marker = match[1]![0] as "`" | "~";
  const length = match[1]!.length;
  if (fence === undefined) return Object.freeze({ marker, length });
  if (fence.marker === marker && length >= fence.length) return undefined;
  return fence;
}

function proseForRequirementScan(line: string): string {
  return line.replace(/`[^`\n]*`/gu, "");
}

function bcp14DeclarationLine(line: string): boolean {
  return /\bkey words?\b/iu.test(line) && /\binterpreted\b/iu.test(line) && /\bRFC\s*(?:2119|8174)\b/iu.test(line);
}

/** Read only uppercase BCP 14 words as normative keywords, per RFC 8174. */
export function specificationReadout(text: string): SpecificationReadout {
  const structure = markdownStructure(text);
  const requirements: NormativeRequirement[] = [];
  const lines = text.replace(/\r\n?/gu, "\n").split("\n");
  let fence: Readonly<{ readonly marker: "`" | "~"; readonly length: number }> | undefined;
  for (const [offset, lineText] of lines.entries()) {
    const nextFence = fenceAfter(lineText, fence);
    if (fence !== undefined || nextFence !== undefined) {
      fence = nextFence;
      continue;
    }
    if (bcp14DeclarationLine(lineText)) continue;
    const prose = proseForRequirementScan(lineText);
    KEYWORD_PATTERN.lastIndex = 0;
    for (const match of prose.matchAll(KEYWORD_PATTERN)) {
      const keyword = match[1] as Bcp14Keyword;
      const line = offset + 1;
      const textValue = lineText.trim();
      requirements.push(Object.freeze({
        id: contentAddress({ keyword, line, text: textValue }),
        keyword,
        level: requirementLevel(keyword),
        line,
        ...(sectionAtLine(structure, line) === undefined ? {} : { section: sectionAtLine(structure, line)! }),
        text: textValue,
      }));
    }
  }
  const rfc2119 = /\bRFC\s*2119\b/iu.test(text);
  const rfc8174 = /\bRFC\s*8174\b/iu.test(text);
  const issues: SpecificationIssue[] = [];
  if (requirements.length > 0 && !rfc2119) issues.push(Object.freeze({
    rule: "bcp14-boilerplate-missing-rfc2119" as const,
    severity: "warning" as const,
    message: "uppercase BCP 14 keywords are present but RFC 2119 is not named",
  }));
  if (requirements.length > 0 && !rfc8174) issues.push(Object.freeze({
    rule: "bcp14-boilerplate-missing-rfc8174" as const,
    severity: "warning" as const,
    message: "uppercase BCP 14 keywords are present but RFC 8174 is not named",
  }));
  const title = structure.headings.find((heading) => heading.level === 1)?.title;
  return Object.freeze({
    kind: "metroplat.specification.readout" as const,
    source: addressTextDocument(text).ref,
    ...(title === undefined ? {} : { title }),
    bcp14: Object.freeze({ rfc2119, rfc8174, requirements: Object.freeze(requirements) }),
    issues: Object.freeze(issues),
  });
}

/**
 * Project the normative requirement index to a small XML interchange form.
 * This is the first structured-source boundary shared by future xml2rfc-like
 * and xml2arc42 projections; Markdown remains the canonical authored file.
 */
export function specificationRequirementsXml(readout: SpecificationReadout): string {
  return document(element("specification-requirements", {
    source: readout.source,
    "bcp14-rfc2119": String(readout.bcp14.rfc2119),
    "bcp14-rfc8174": String(readout.bcp14.rfc8174),
  }, readout.bcp14.requirements.map((requirement) => element("requirement", {
    id: requirement.id,
    keyword: requirement.keyword,
    level: requirement.level,
    line: requirement.line,
    section: requirement.section,
  }, [requirement.text]))), { declaration: true });
}
