/**
 * Heir search buyer leads: who pays for heir search and heirs'-property title clearing, and how
 * their federal awards, nonprofit filings and legal environment read as a lead list.
 *
 * Three kinds of buyer, three sources:
 *   - federal funders: USDA Section 2501, the Heirs' Property Relending Program, BIA and Forest
 *     Service programs that pay named grantees to do this work or buy it done — read live from
 *     USAspending.gov's award-search API (see `../scripts/pull-lead-lists.mjs`).
 *   - nonprofit buyers and partners: heirs'-property centers, legal-aid societies, community land
 *     trusts — read live from ProPublica's Nonprofit Explorer (IRS exempt-organization list).
 *   - the private-market side (probate/estate attorneys, title companies, county probate and
 *     public administrators, tax-forfeit/partition buyers) has no open national directory API;
 *     the Uniform Partition of Heirs Property Act's enacting states below are where their
 *     court-facing demand for this deliverable is legislated into existence, so they are the
 *     states to work a state bar "find a lawyer" search and a county probate-clerk list by hand.
 * @packageDocumentation
 */

/**
 * States (and DC, and the U.S. Virgin Islands) that have enacted the Uniform Partition of Heirs
 * Property Act, with the year enacted: each one creates the partition actions that are ongoing,
 * court-facing demand for a title chain and heir tree. Hand-compiled 2026-09-26 from the Uniform
 * Law Commission's enactment map (https://www.uniformlaws.org/committees/community-home?CommunityKey=50724584-e808-4255-bc5d-8ea4e588371d)
 * and the ABA Real Property, Trust and Estate Law Section's "Uniform Laws Update: 2025
 * Legislative Update" (Michigan and New Jersey, both 2025); not live-fetched, because the
 * Commission's own page is a rendered legislative-tracking app rather than a stable structured
 * document. Refresh by hand against that page before relying on this list for a state not yet
 * marked here.
 */
export const UPHPA_STATES = Object.freeze([
  { state: "AL", name: "Alabama", yearEnacted: 2014 },
  { state: "AR", name: "Arkansas", yearEnacted: 2015 },
  { state: "CA", name: "California", yearEnacted: 2021 },
  { state: "CT", name: "Connecticut", yearEnacted: 2015 },
  { state: "DC", name: "District of Columbia", yearEnacted: 2023 },
  { state: "FL", name: "Florida", yearEnacted: 2020 },
  { state: "GA", name: "Georgia", yearEnacted: 2012 },
  { state: "HI", name: "Hawaii", yearEnacted: 2016 },
  { state: "IA", name: "Iowa", yearEnacted: 2018 },
  { state: "IL", name: "Illinois", yearEnacted: 2019 },
  { state: "MD", name: "Maryland", yearEnacted: 2022 },
  { state: "MI", name: "Michigan", yearEnacted: 2025 },
  { state: "MS", name: "Mississippi", yearEnacted: 2020 },
  { state: "MO", name: "Missouri", yearEnacted: 2019 },
  { state: "MT", name: "Montana", yearEnacted: 2013 },
  { state: "NV", name: "Nevada", yearEnacted: 2011 },
  { state: "NJ", name: "New Jersey", yearEnacted: 2025 },
  { state: "NM", name: "New Mexico", yearEnacted: 2017 },
  { state: "NY", name: "New York", yearEnacted: 2020 },
  { state: "SC", name: "South Carolina", yearEnacted: 2016 },
  { state: "TX", name: "Texas", yearEnacted: 2017 },
  { state: "UT", name: "Utah", yearEnacted: 2022 },
  { state: "VA", name: "Virginia", yearEnacted: 2020 },
  { state: "VI", name: "U.S. Virgin Islands", yearEnacted: 2019 },
  { state: "WA", name: "Washington", yearEnacted: 2023 },
]);

/**
 * Named incumbent heir-search vendors and their published pricing (from the 2026-08-27 note on
 * mission-aligned service markets in land tenure and probate records): the comps a pricing sheet
 * is set against, not leads to call.
 */
export const NAMED_VENDOR_COMPS = Object.freeze([
  { name: "HeirSearch", model: "per-year-plus-per-heir", perResearchYear: 60, perHeirLocated: 175 },
  { name: "Heir Pros", model: "per-year-plus-per-heir", perResearchYear: 60, perHeirLocated: 175 },
  { name: "Morse Genealogical", model: "per-year-plus-per-heir", perResearchYear: 60, perHeirLocated: 175 },
  { name: "Discovering Connections", model: "contingency", contingencyPercentLow: 20, contingencyPercentHigh: 30 },
  { name: "DavisDNA", model: "contingency", contingencyPercentLow: 20, contingencyPercentHigh: 30 },
]);

/** Federal keywords worth searching for buyer-side award leads: heirs'-property and land-tenure programs, named by the note and by USAspending's own award text. */
export const FEDERAL_LEAD_KEYWORDS = Object.freeze([
  "heirs property",
  "heir property",
  "land tenure heirs",
  "fractionated heirship",
]);

/** Nonprofit search terms worth running against ProPublica's Nonprofit Explorer for buyer and partner organizations. */
export const NONPROFIT_LEAD_QUERIES = Object.freeze([
  "heirs property",
  "heir property preservation",
  "land loss prevention",
  "community land trust",
  "farmer land assistance",
]);

/** One federal award as a buyer-side lead row: who was paid, how much, for what, and by which agency. */
export function funderRow(award) {
  return {
    recipient: award["Recipient Name"] ?? "",
    amount: Math.round(Number(award["Award Amount"] ?? 0)),
    awardingSubAgency: award["Awarding Sub Agency"] ?? "",
    startDate: award["Start Date"] ?? "",
    awardId: award["Award ID"] ?? "",
    why: String(award.Description ?? "").slice(0, 240),
    phone: "",
    contact: "",
    called: "",
    outcome: "",
  };
}

/** One IRS exempt-organization record (ProPublica search result) as a nonprofit lead row. */
export function nonprofitRow(organization) {
  return {
    name: organization.name ?? "",
    ein: organization.ein ?? organization.strein ?? "",
    city: organization.city ?? "",
    state: organization.state ?? "",
    nteeCode: organization.ntee_code ?? "",
    score: organization.score ?? "",
    phone: "",
    contact: "",
    called: "",
    outcome: "",
  };
}

/** A nonprofit lead row filled out with its mailing address from ProPublica's organization detail (by EIN). */
export function nonprofitRowWithAddress(row, organizationDetail) {
  return {
    ...row,
    address: organizationDetail?.address ?? "",
    zip: organizationDetail?.zipcode ?? "",
    revenue: organizationDetail?.revenue_amount ?? "",
  };
}

const ESTATE_OWNER = /\b(ESTATE|EST OF|HEIRS?|DECD|DECEASED|TRUSTEE|TRUST|ET AL|ETAL)\b/;

/**
 * Project one land-business seller lead (a Duluth `land-parcels-find`/`sellers.csv` row, or any
 * row shaped the same way: `owner`, `mailing`, `parcel`/lot identifier, `why`) into an heir
 * search case lead: an estate, heirs or trust owner is a land lead on one list and a probable
 * open or unopened probate on the other. Rows whose owner or `why` do not read as an estate,
 * heirs or trust are dropped (`null`).
 */
export function heirSearchLeadFromLandRow(row, { county = "", state = "" } = {}) {
  const owner = String(row.owner ?? "");
  const why = String(row.why ?? "");
  if (!ESTATE_OWNER.test(owner) && !/estate|heirs|trust/i.test(why)) return null;
  return {
    decedentOrOwnerOfRecord: owner,
    mailing: row.mailing ?? "",
    county,
    state,
    parcel: row.parcel ?? row.lot ?? "",
    landLeadWhy: why,
    suggestedProduct: "heir search report ahead of a land offer",
    phone: "",
    contact: "",
    called: "",
    outcome: "",
  };
}

/** Every Duluth land row that also reads as an heir search case (see `heirSearchLeadFromLandRow`). */
export function heirSearchLeadsFromLandRows(rows, options) {
  return rows.map((row) => heirSearchLeadFromLandRow(row, options)).filter((lead) => lead !== null);
}
