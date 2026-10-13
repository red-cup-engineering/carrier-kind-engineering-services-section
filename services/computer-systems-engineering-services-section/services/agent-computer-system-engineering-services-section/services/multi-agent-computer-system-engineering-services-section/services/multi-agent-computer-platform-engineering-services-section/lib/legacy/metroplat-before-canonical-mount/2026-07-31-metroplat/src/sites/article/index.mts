/**
 * article - schema-addressed content record for published article material.
 *
 * The record is schema-only and imports no host adapter. Front-matter properties
 * come from Koios article markdown, with body markdown held as `body`.
 */
import type { FromSchema } from "../../lib/schema/contract.mts";
import { ArticleSchema } from "./schema.mts";

export { ArticleSchema, articleContract } from "./schema.mts";

export type Article = FromSchema<typeof ArticleSchema>;

export type ArticlePublicationFindingSeverity = "error" | "warning";
export type ArticlePublicationCandidateStatus =
  | "published-standards-clear"
  | "ready-to-publish"
  | "editorial-hold"
  | "one-click-repair"
  | "copy-edit-required";

export interface ArticlePublicationFinding {
  readonly severity: ArticlePublicationFindingSeverity;
  readonly gate: string;
  readonly code: string;
  readonly message: string;
}

export interface ArticlePublicationPolicy {
  readonly minimumWords?: number;
  readonly requiredLicense?: string;
  readonly requiredLicenseUrl?: string;
  readonly requireSeoTermInFirstParagraph?: boolean;
  readonly requireSeoTermInH2?: boolean;
}

export interface ArticlePublicationCandidate {
  readonly slug: string;
  readonly title: string;
  readonly status: ArticlePublicationCandidateStatus;
  readonly publicationDistance: number;
  readonly nextAction: string;
  readonly nextActionLabel: string;
  readonly nextActionHref: string;
  readonly standardsHref: string;
  readonly standardsJsonHref: string;
  readonly publicHref: string;
  readonly editorialHold: boolean;
  readonly sourceCycleRepairHref?: string;
  readonly sourceCycleRepairJsonHref?: string;
  readonly sourceCycleTaskCount?: number;
  readonly sourceCycleHighestPriority?: number;
  readonly sourceCycleWarnings: readonly string[];
  readonly wordCount: number;
  readonly missingWords: number;
  readonly referenceCount: number;
  readonly sourceCount: number;
  readonly errorCount: number;
  readonly warningCount: number;
  readonly findingCodes: readonly string[];
  readonly note: string;
}

export interface ArticlePublicationReport {
  readonly kind: "metroplat.article.publication-candidates";
  readonly generatedAt: string;
  readonly draftCount: number;
  readonly publishableDraftCount: number;
  readonly publishedCount: number;
  readonly editorialHoldCount: number;
  readonly oneClickRepairCount: number;
  readonly copyEditRequiredCount: number;
  readonly candidates: readonly ArticlePublicationCandidate[];
  readonly policy: readonly string[];
}

const DEFAULT_MINIMUM_WORDS = 450;
const ONE_CLICK_REPAIR_CODES = new Set(["missing-license", "missing-license-url", "missing-syndication-rights"]);

function clean(value: string | undefined): string | undefined {
  const text = value?.trim();
  return text === undefined || text === "" ? undefined : text;
}

function words(value: string): readonly string[] {
  return Object.freeze(value.trim().split(/\s+/u).filter(Boolean));
}

function articleDescription(article: Article): string | undefined {
  return clean(article.metaDescription)
    ?? clean(article.description)
    ?? clean(article.excerpt)
    ?? clean(article.summary)
    ?? clean(article.koios?.tweet);
}

function articleSeoTerm(article: Article): string | undefined {
  return clean(article.seoTerm) ?? clean(article.koios?.seo_term) ?? clean(article.keywords?.[0]);
}

function firstParagraph(body: string): string {
  return body.replace(/\r\n?/gu, "\n").split(/\n\s*\n/u).map((chunk) => chunk.trim()).find(Boolean) ?? "";
}

function h2Text(body: string): string {
  return body.replace(/\r\n?/gu, "\n").split("\n").filter((line) => /^##\s+\S/u.test(line)).join("\n");
}

function includesTerm(text: string, term: string): boolean {
  return text.toLocaleLowerCase().includes(term.toLocaleLowerCase());
}

function finding(severity: ArticlePublicationFindingSeverity, gate: string, code: string, message: string): ArticlePublicationFinding {
  return Object.freeze({ severity, gate, code, message });
}

function hasBlockingEditorialGate(article: Article): boolean {
  return (article.editorialGates ?? []).some((gate) => {
    const charge = gate.charge.toLocaleLowerCase();
    return charge === "hold" || charge === "block" || charge === "error" || charge === "fail";
  });
}

function articleReferenceCount(article: Article): number {
  return (article.references?.length ?? 0) + (article.citations?.length ?? 0);
}

function articleSourceCount(article: Article): number {
  return article.sources?.length ?? articleReferenceCount(article);
}

function sourceCycleWarnings(article: Article): readonly string[] {
  return Object.freeze([
    ...(article.sourceCycleWarnings ?? []),
    ...(article.koios?.source_cycle_warnings ?? []),
  ]);
}

/** Count publishable body words using the article body, not rendered HTML. */
export function articleWordCount(article: Pick<Article, "body">): number {
  return words(article.body).length;
}

/** Review one Article content record against publication packaging gates derived from the old farm/mill surface. */
export function reviewArticleForPublication(article: Article, policy: ArticlePublicationPolicy = {}): readonly ArticlePublicationFinding[] {
  const minimumWords = policy.minimumWords ?? DEFAULT_MINIMUM_WORDS;
  const findings: ArticlePublicationFinding[] = [];
  const wordCount = articleWordCount(article);
  if (wordCount < minimumWords) {
    findings.push(finding("error", "copy-edited", "body-too-short", `A publishable article needs at least ${minimumWords} words; found ${wordCount}.`));
  }

  const description = articleDescription(article);
  if (description === undefined) findings.push(finding("error", "standards-cleared", "missing-description", "A publishable article needs a summary, description, excerpt, or meta description."));

  const seoTerm = articleSeoTerm(article);
  if (seoTerm === undefined) {
    findings.push(finding("error", "standards-cleared", "missing-seo-term", "A publishable article needs an SEO term or keyword."));
  } else {
    if (policy.requireSeoTermInFirstParagraph !== false && !includesTerm(firstParagraph(article.body), seoTerm)) {
      findings.push(finding("error", "standards-cleared", "seo-term-missing-first-paragraph", "The SEO term must appear in the first paragraph."));
    }
    if (policy.requireSeoTermInH2 !== false && !includesTerm(h2Text(article.body), seoTerm)) {
      findings.push(finding("error", "standards-cleared", "seo-term-missing-h2", "The SEO term must appear in a level-two heading."));
    }
  }

  if (articleReferenceCount(article) === 0 && articleSourceCount(article) === 0) {
    findings.push(finding("error", "standards-cleared", "missing-sources", "A publishable article needs references, citations, or source records."));
  }
  if (clean(article.license) === undefined) findings.push(finding("error", "standards-cleared", "missing-license", "A publishable article needs an explicit license."));
  if (clean(article.license_url) === undefined) findings.push(finding("error", "standards-cleared", "missing-license-url", "Machine-readable syndication works better with a license_url."));
  if (clean(article.syndication_rights) === undefined) findings.push(finding("error", "standards-cleared", "missing-syndication-rights", "A publishable article needs syndication rights metadata."));
  if ((article.tags ?? []).length === 0) findings.push(finding("warning", "standards-cleared", "missing-tags", "A publishable article should carry tags."));
  if ((article.categories ?? []).length === 0) findings.push(finding("warning", "standards-cleared", "missing-categories", "A publishable article should carry categories."));

  for (const correction of article.corrections ?? []) {
    if (correction.severity === "note") continue;
    findings.push(finding(correction.severity, correction.gate ?? "standards-cleared", correction.code, correction.message));
  }

  for (const warning of sourceCycleWarnings(article)) {
    findings.push(finding("warning", "source-cycle", "source-cycle-warning", warning));
  }

  return Object.freeze(findings);
}

function publicationDistance(findings: readonly ArticlePublicationFinding[], missingWords: number): number {
  const errors = findings.filter((item) => item.severity === "error").length;
  const warnings = findings.filter((item) => item.severity === "warning").length;
  return Number((errors * 10 + warnings * 2 + missingWords / 100).toFixed(2));
}

function statusFor(article: Article, findings: readonly ArticlePublicationFinding[]): ArticlePublicationCandidateStatus {
  const errors = findings.filter((item) => item.severity === "error");
  if (hasBlockingEditorialGate(article)) return "editorial-hold";
  if (errors.length === 0) return article.draft ? "ready-to-publish" : "published-standards-clear";
  if (errors.every((item) => ONE_CLICK_REPAIR_CODES.has(item.code))) return "one-click-repair";
  return "copy-edit-required";
}

function href(article: Article, property: "standardsHref" | "standardsJsonHref" | "publicHref", fallback: string): string {
  return clean(article[property]) ?? fallback.replace(":slug", encodeURIComponent(article.slug));
}

function nextAction(candidate: Pick<ArticlePublicationCandidate, "status" | "standardsHref" | "sourceCycleRepairHref" | "publicHref">): Pick<ArticlePublicationCandidate, "nextAction" | "nextActionLabel" | "nextActionHref"> {
  switch (candidate.status) {
    case "published-standards-clear":
      return { nextAction: "inspect-public", nextActionLabel: "Public article", nextActionHref: candidate.publicHref };
    case "ready-to-publish":
      return { nextAction: "publish", nextActionLabel: "Publish", nextActionHref: candidate.standardsHref };
    case "editorial-hold":
      return { nextAction: "review-hold", nextActionLabel: "Review hold", nextActionHref: candidate.standardsHref };
    case "one-click-repair":
      return { nextAction: "apply-standards-defaults", nextActionLabel: "Apply standards defaults", nextActionHref: candidate.standardsHref };
    case "copy-edit-required":
      return { nextAction: "repair-copy", nextActionLabel: "Repair copy", nextActionHref: candidate.sourceCycleRepairHref ?? candidate.standardsHref };
  }
}

/** Project one Article content record into a content-mill-style publication candidate reading. */
export function articlePublicationCandidate(article: Article, policy: ArticlePublicationPolicy = {}): ArticlePublicationCandidate {
  const findings = reviewArticleForPublication(article, policy);
  const wordCount = articleWordCount(article);
  const missingWords = Math.max(0, (policy.minimumWords ?? DEFAULT_MINIMUM_WORDS) - wordCount);
  const errorCount = findings.filter((item) => item.severity === "error").length;
  const warningCount = findings.filter((item) => item.severity === "warning").length;
  const standardsHref = href(article, "standardsHref", "/operators/manuscripts/:slug/standards.html");
  const sourceCycleRepairHref = clean(article.sourceCycleRepairHref) ?? clean(article.koios?.source_cycle_repair_href);
  const candidateBase = {
    slug: article.slug,
    title: article.title,
    status: statusFor(article, findings),
    publicationDistance: publicationDistance(findings, missingWords),
    standardsHref,
    standardsJsonHref: href(article, "standardsJsonHref", "/operators/manuscripts/:slug/standards"),
    publicHref: href(article, "publicHref", article.url ?? article.canonicalUrl ?? "/posts/:slug"),
    editorialHold: hasBlockingEditorialGate(article),
    ...(sourceCycleRepairHref === undefined ? {} : { sourceCycleRepairHref, sourceCycleRepairJsonHref: `${sourceCycleRepairHref}.json` }),
  };
  const action = nextAction(candidateBase);
  return Object.freeze({
    ...candidateBase,
    ...action,
    sourceCycleWarnings: sourceCycleWarnings(article),
    wordCount,
    missingWords,
    referenceCount: articleReferenceCount(article),
    sourceCount: articleSourceCount(article),
    errorCount,
    warningCount,
    findingCodes: Object.freeze(findings.map((item) => item.code)),
    note: findings[0]?.message ?? (article.draft ? "Draft is standards clear and ready for publication." : "Published article is standards clear."),
  });
}

/** Aggregate Article content records into the old mill's operator-facing publication-candidate report shape. */
export function articlePublicationReport(
  articles: readonly Article[],
  options: ArticlePublicationPolicy & Readonly<{ generatedAt?: string }> = {},
): ArticlePublicationReport {
  const candidates = Object.freeze(articles.map((article) => articlePublicationCandidate(article, options))
    .sort((left, right) => right.publicationDistance - left.publicationDistance || left.slug.localeCompare(right.slug)));
  return Object.freeze({
    kind: "metroplat.article.publication-candidates" as const,
    generatedAt: options.generatedAt ?? new Date(0).toISOString(),
    draftCount: articles.filter((article) => article.draft).length,
    publishableDraftCount: candidates.filter((candidate) => candidate.status === "ready-to-publish").length,
    publishedCount: candidates.filter((candidate) => candidate.status === "published-standards-clear").length,
    editorialHoldCount: candidates.filter((candidate) => candidate.status === "editorial-hold").length,
    oneClickRepairCount: candidates.filter((candidate) => candidate.status === "one-click-repair").length,
    copyEditRequiredCount: candidates.filter((candidate) => candidate.status === "copy-edit-required").length,
    candidates,
    policy: Object.freeze([
      `minimumWords=${options.minimumWords ?? DEFAULT_MINIMUM_WORDS}`,
      "requires description, source evidence, license, syndication rights, SEO term in first paragraph, and SEO term in H2",
      "blocking editorial gates force editorial-hold before copy repair",
    ]),
  });
}
