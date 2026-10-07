/**
 * Assembling the heir search report deliverable from an order and the research findings an
 * agent or a paid human retrieval step produced: the heir tree (each entry read on FOUR, see
 * `./pricing.mjs`), the sources checked, and the chain-of-title summary, filled into
 * `content/text/documents/templates/heir-search-report-template.md`.
 *
 * Template filling is the enterprise layer's `fillTemplate` (the `{{name}}` convention)
 * instead of a second implementation.
 * @packageDocumentation
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { fillTemplate } from "@red-cup-engineering/organizing/enterprise";
import { PER_HEIR_LOCATED, PER_RESEARCH_YEAR, heirReading, heirTreeSummary, orderPrice } from "./pricing.mjs";

const SECTION_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const REPORT_TEMPLATE_PATH = join(SECTION_ROOT, "content", "text", "documents", "templates", "heir-search-report-template.md");

function heirsTable(heirs) {
  if (heirs.length === 0) return "_No heirs recorded yet._";
  const header = "| Name | Relationship to decedent | Reading | Sources |\n|---|---|---|---|";
  const rows = heirs.map((heir) => `| ${heir.name ?? ""} | ${heir.relationship ?? ""} | ${heirReading(heir)} | ${[...(heir.confirmedBy ?? []), ...(heir.contestedBy ?? [])].join("; ") || "—"} |`);
  return [header, ...rows].join("\n");
}

function sourcesList(sources) {
  if (sources.length === 0) return "_No sources logged yet._";
  return sources.map((source) => `- **${source.kind ?? "source"}** (${source.county ?? "county unspecified"}): ${source.note ?? source.citation ?? ""}`).join("\n");
}

function chainOfTitleSummary(chain) {
  if (chain.length === 0) return "_Chain of title not yet reconstructed._";
  return chain.map((step, index) => `${index + 1}. ${step.date ?? "date unknown"} — ${step.event ?? ""} (${step.instrument ?? "instrument unrecorded"})`).join("\n");
}

function pricingBreakdown(price) {
  if (price.model === "contingency") {
    return `Contingency: ${price.contingencyPercent}% of the estate` + (price.estimate === null ? "." : ` (estimated at $${price.estimate.toLocaleString("en-US")} against an estate value of $${price.estateValue.toLocaleString("en-US")}).`);
  }
  const lines = [
    `Retainer: $${price.retainer}`,
    `Research: ${price.researchYears} year(s) at ${price.perResearchYear ?? PER_RESEARCH_YEAR}/year = ${price.researchFee}`,
    `Heirs located: ${price.heirsLocated} at ${price.perHeirLocated ?? PER_HEIR_LOCATED}/heir = ${price.heirFee}`,
  ];
  if (price.rush) lines.push(`Rush surcharge: $${price.rushFee}`);
  lines.push(`**Total: $${price.total.toLocaleString("en-US")}**`);
  return lines.map((line) => `- ${line}`).join("\n");
}

/**
 * Assemble the report's markdown and its structured summary from an order and the research
 * findings gathered for it. `findings`: `{ heirs: [], sources: [], chainOfTitle: [] }`.
 */
export function assembleReport(order, findings = {}) {
  const heirs = findings.heirs ?? [];
  const sources = findings.sources ?? [];
  const chainOfTitle = findings.chainOfTitle ?? [];
  const summary = heirTreeSummary(heirs);
  const price = order.price ?? orderPrice(order);
  const template = readFileSync(REPORT_TEMPLATE_PATH, "utf8").replace(/^---[\s\S]*?---\n/, "");
  const markdown = fillTemplate(template, {
    orderId: order.orderId ?? order.id ?? "",
    preparedFor: order.client ?? "",
    preparedDate: new Date().toISOString().slice(0, 10),
    decedent: order.decedent ?? "",
    dateOfDeath: order.dateOfDeath ?? "",
    county: order.county ?? "",
    state: order.state ?? "",
    parcel: order.parcel ?? "",
    scope: order.scope ?? "",
    sources_list: sourcesList(sources),
    heirs_table: heirsTable(heirs),
    heirTreeStatus: summary.readyForReview ? "every heir documented; ready for attorney review" : `not ready: ${summary.counts.presumed} presumed, ${summary.counts.disputed} disputed`,
    chain_of_title: chainOfTitleSummary(chainOfTitle),
    pricing_breakdown: pricingBreakdown(price),
  });
  return Object.freeze({ markdown, summary, price });
}
