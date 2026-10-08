/**
 * Heir search pricing and the heir tree's evidentiary readings.
 *
 * Pricing is set against the named incumbents' published rates (`./leads.mjs`'s
 * `NAMED_VENDOR_COMPS`): roughly $60 per year of research plus roughly $175 per heir located, or
 * 20-30% of the estate on contingency. A retainer covers the county deed-index and probate-docket
 * setup a per-year rate does not.
 *
 * Each heir the research finds is read on FOUR's extremal family (unknown/held/denied/contested):
 * a heir tree is not one bill of facts but a set of claims each with its own evidence, and a
 * name that later research contradicts stays contested rather than silently overwritten.
 * @packageDocumentation
 */
import { readingOfSides } from "@red-cup-engineering/computer-data-services-section/four";

/**
 * The declared defaults of the heir-search enterprise's pricing axes (its agency record's settings);
 * an order is priced on the enterprise's current settings when they are given.
 * The retainer covers opening county deed-index and probate-docket access before any year or heir is billed.
 */
export const RETAINER = 150;
export const PER_RESEARCH_YEAR = 60;
export const PER_HEIR_LOCATED = 175;
export const RUSH_SURCHARGE = 200;

/**
 * Price one heir search order. `contingencyPercent` (20-30, matching the named incumbents)
 * switches the whole order to a percentage of `estateValue` instead of the per-year/per-heir
 * schedule; `estateValue` alone with no `contingencyPercent` still prices per-year/per-heir, with
 * the estate value carried for reference.
 */
export function orderPrice({
  researchYears = 0,
  heirsLocated = 0,
  rush = false,
  contingencyPercent = null,
  estateValue = null,
} = {}, settings = {}) {
  const retainer = settings.retainer ?? RETAINER;
  const perYear = settings["per-research-year"] ?? PER_RESEARCH_YEAR;
  const perHeir = settings["per-heir-located"] ?? PER_HEIR_LOCATED;
  const rushSurcharge = settings["rush-surcharge"] ?? RUSH_SURCHARGE;
  if (contingencyPercent !== null) {
    return Object.freeze({
      model: "contingency",
      contingencyPercent,
      estateValue,
      estimate: estateValue === null ? null : Math.round((estateValue * contingencyPercent) / 100),
    });
  }
  const researchFee = Math.round(researchYears * perYear);
  const heirFee = Math.round(heirsLocated * perHeir);
  const rushFee = rush ? rushSurcharge : 0;
  const total = retainer + researchFee + heirFee + rushFee;
  return Object.freeze({
    model: "retainer-plus-per-year-per-heir",
    retainer,
    perResearchYear: perYear,
    perHeirLocated: perHeir,
    researchYears,
    researchFee,
    heirsLocated,
    heirFee,
    rush,
    rushFee,
    total,
    estateValue,
  });
}

/** One heir tree entry's reading: `documented` (held), `disputed` (contested), `excluded` (denied, e.g. predeceased or disclaimed), or `presumed` (unknown, not yet checked against a second source). */
export function heirReading(entry) {
  const told = Boolean(entry.confirmedBy?.length);
  const against = Boolean(entry.contestedBy?.length || entry.excluded);
  const point = readingOfSides("extremal", told, against);
  return { unknown: "presumed", held: "documented", denied: "excluded", contested: "disputed" }[point];
}

/** A heir tree's summary: counts by reading, and whether every heir is documented (report is ready for attorney review) or some remain presumed/disputed (research or a second source is still needed). */
export function heirTreeSummary(heirs) {
  const counts = { documented: 0, disputed: 0, excluded: 0, presumed: 0 };
  for (const entry of heirs) counts[heirReading(entry)] += 1;
  return Object.freeze({ counts, readyForReview: counts.disputed === 0 && counts.presumed === 0, total: heirs.length });
}
