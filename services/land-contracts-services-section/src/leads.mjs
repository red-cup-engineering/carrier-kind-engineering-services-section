/**
 * Land contract leads: reading county tax parcels, in any market the business works, as seller
 * leads (property whose owner is likely to sell, scored with the reasons and an offer range) and
 * buyer leads (owners already holding several lots, who build or trade them).
 *
 * Parcels come from two open layers. St. Louis County's own layer (refreshed weekly) carries tax
 * delinquency and the projected forfeiture year for every city and township in the county. The
 * Minnesota Geospatial Commons statewide layer (refreshed quarterly) carries the 58 other
 * opted-in counties in one schema. Both read into one parcel shape (`normalizeParcel`), and every
 * parcel is read as a kind of property (`propertyKind`), which sets how it scores and how it is
 * offered on.
 * @packageDocumentation
 */

/** St. Louis County's open tax-parcel layer. */
export const ST_LOUIS_COUNTY_LAYER = "https://gis.stlouiscountymn.gov/server2/rest/services/GeneralUse/Open_Data/MapServer/7";

/** Minnesota's compiled parcel layer from the counties that opted in to open parcel data. */
export const MINNESOTA_LAYER = "https://enterprise.gisdata.mn.gov/aghost/rest/services/us_mn_state_mngeo/plan_parcels_open/FeatureServer/1";

const ST_LOUIS_FIELDS = [
  "PRCL_NBR", "OWNAME", "OWADR1", "OWADR2", "OWADR3", "OWADR4",
  "PHYSADDR", "PHYSCITY", "PHYSZIP", "PLDESC", "LEGAL", "LOT_NBR", "BLOCK_NBR",
  "ACREAGE", "DEEDED_ACRES", "TPCLS1", "HSTD_Desc1", "TAX_DIST_NAME", "LAKE_NAME", "Ownership",
  "LAND_EST", "EstTotalValue", "NET_TAX", "TOT_SPEC_ASMT",
  "DELINQUENT", "BAL_DUE", "PRJ_FORF_YR", "LASTSALEDATE", "BUILDING",
];

const MINNESOTA_FIELDS = [
  "state_pin", "county_pin", "co_name", "ctu_name", "owner_name", "own_add_l1", "own_add_l2", "own_add_l3", "own_add_l4",
  "anumber", "anumbersuf", "st_pre_dir", "st_name", "st_pos_typ", "st_pos_dir", "zip", "plat_name", "abb_legal", "lot", "block",
  "acres_poly", "acres_deed", "useclass1", "homestead", "ownership", "emv_land", "emv_bldg", "emv_total", "total_tax", "spec_asses",
  "tax_name", "tax_add_l1", "tax_add_l2", "tax_add_l3", "tax_add_l4", "sale_date", "dwell_type", "num_units", "Shape__Area",
];

/**
 * The layers a market can be read from: the query fields, and the where clause for the
 * privately owned parcels worth reading (no building, an underbuilt commercial or industrial
 * site, or a building its owner does not live in).
 */
export const SOURCES = Object.freeze({
  "st-louis-county": Object.freeze({
    layer: ST_LOUIS_COUNTY_LAYER,
    fields: ST_LOUIS_FIELDS,
    where: (area) => `${area} AND (Ownership='Tax Forfeit' OR (Ownership='Private' AND (BUILDING=0 OR HSTD_Desc1='Non Homestead' OR (ACREAGE>=0.25 AND (TPCLS1 LIKE 'Commercial%' OR TPCLS1 LIKE 'Industrial%')))))`,
  }),
  minnesota: Object.freeze({
    layer: MINNESOTA_LAYER,
    fields: MINNESOTA_FIELDS,
    where: (area) => `${area} AND emv_land>0 AND (ownership='Tax Forfeit' OR ((ownership IS NULL OR ownership IN ('','Private','Unknown','No Value')) AND (emv_bldg=0 OR homestead='No')))`,
  }),
});

/**
 * The markets the business works: where a market's parcels come from, which area of the layer
 * it is, the places whose owners count as local, and the standard lot, in acres, its infill
 * builders build on. Adding a market is adding an entry. A county on the statewide layer is a
 * market only when it publishes values there: 31 of the 59 opted-in counties do (2026-09-26);
 * Carlton, among others, publishes parcels without values. Some counties that do (Itasca,
 * Stearns, Scott, Carver) name the owner only as the taxpayer and give area only as the polygon's.
 */
export const MARKETS = Object.freeze({
  duluth: { name: "Duluth", county: "St. Louis", source: "st-louis-county", area: "TWPCITY='010'", local: ["DULUTH", "HERMANTOWN", "PROCTOR", "SUPERIOR"], lotAcres: (25 * 125) / 43560 },
  hermantown: { name: "Hermantown", county: "St. Louis", source: "st-louis-county", area: "TWPCITY='395'", local: ["DULUTH", "HERMANTOWN", "PROCTOR"], lotAcres: 0.25 },
  proctor: { name: "Proctor", county: "St. Louis", source: "st-louis-county", area: "TWPCITY='185'", local: ["DULUTH", "HERMANTOWN", "PROCTOR"], lotAcres: 0.15 },
  "iron-range": { name: "Iron Range cities", county: "St. Louis", source: "st-louis-county", area: "TWPCITY IN ('139','140','141','090','175','040','020','100','015','060','105','142')", local: ["HIBBING", "VIRGINIA", "MOUNTAIN IRON", "MT IRON", "EVELETH", "CHISHOLM", "AURORA", "BIWABIK", "GILBERT", "BABBITT", "HOYT LAKES"], lotAcres: 0.15 },
  "st-louis-county-rural": { name: "St. Louis County towns and unorganized land", county: "St. Louis", source: "st-louis-county", area: "TAX_DIST_NAME NOT LIKE 'CITY OF%'", local: [], lotAcres: 1 },
  "lake-county": { name: "Lake County", county: "Lake", source: "minnesota", area: "co_name='Lake'", local: ["TWO HARBORS", "SILVER BAY", "FINLAND", "BEAVER BAY"], lotAcres: 0.25 },
  "itasca-county": { name: "Itasca County", county: "Itasca", source: "minnesota", area: "co_name='Itasca'", local: ["GRAND RAPIDS", "COHASSET", "COLERAINE", "DEER RIVER", "NASHWAUK", "BIGFORK"], lotAcres: 0.2 },
  "crow-wing-county": { name: "Crow Wing County", county: "Crow Wing", source: "minnesota", area: "co_name='Crow Wing'", local: ["BRAINERD", "BAXTER", "CROSSLAKE", "NISSWA", "PEQUOT LAKES", "CROSBY"], lotAcres: 0.2 },
  "cass-county": { name: "Cass County", county: "Cass", source: "minnesota", area: "co_name='Cass'", local: ["WALKER", "PINE RIVER", "BACKUS", "REMER", "PILLAGER"], lotAcres: 0.25 },
  "aitkin-county": { name: "Aitkin County", county: "Aitkin", source: "minnesota", area: "co_name='Aitkin'", local: ["AITKIN", "MCGREGOR", "HILL CITY", "PALISADE"], lotAcres: 0.25 },
  minneapolis: { name: "Minneapolis", county: "Hennepin", source: "minnesota", area: "co_name='Hennepin' AND ctu_name='Minneapolis'", local: ["MINNEAPOLIS", "SAINT PAUL", "ST PAUL"], lotAcres: (40 * 128) / 43560 },
  "saint-paul": { name: "Saint Paul", county: "Ramsey", source: "minnesota", area: "co_name='Ramsey' AND ctu_name='Saint Paul'", local: ["SAINT PAUL", "ST PAUL", "MINNEAPOLIS"], lotAcres: (40 * 125) / 43560 },
});

/** The market a name refers to, with its id; throws on an unknown market. */
export function marketOf(id = "duluth") {
  const market = MARKETS[id];
  if (!market) throw new Error(`no market "${id}": the markets are ${Object.keys(MARKETS).join(", ")}`);
  return Object.freeze({ id, ...market, source: market.source, layer: SOURCES[market.source].layer });
}

/** The where clause that pulls a market's parcels from its source layer. */
export function marketWhere(market) {
  return SOURCES[market.source].where(market.area);
}

/** The statewide layer's polygons are in UTM zone 15 meters. */
const SQUARE_METERS_PER_ACRE = 4046.8564224;
const saleYearFromDate = (value) => (value ? Math.floor(Number(value) / 10000) : null);
const saleYearFromEpoch = (value) => (value ? new Date(Number(value)).getUTCFullYear() : null);
const text = (value) => (value === undefined || value === null ? "" : String(value).trim());
const street = (raw) => [raw.anumber, raw.anumbersuf, raw.st_pre_dir, raw.st_name, raw.st_pos_typ, raw.st_pos_dir].map(text).filter(Boolean).join(" ");

/**
 * One parcel in the business's own shape, from either layer. A parcel already in this shape is
 * returned as it is, so snapshots read the same whichever layer and date they came from.
 */
export function normalizeParcel(raw, market = {}) {
  if (raw.parcel !== undefined && raw.owner !== undefined) return raw;
  if (raw.PRCL_NBR !== undefined) {
    const place = text(raw.TAX_DIST_NAME);
    return {
      parcel: raw.PRCL_NBR,
      market: market.id ?? "duluth",
      county: "St. Louis",
      place,
      inCity: place === "" || /^CITY OF/.test(place),
      owner: text(raw.OWNAME),
      mailing: [raw.OWADR1, raw.OWADR2, raw.OWADR3, raw.OWADR4].map(text).filter(Boolean),
      address: text(raw.PHYSADDR),
      zip: text(raw.PHYSZIP),
      plat: text(raw.PLDESC),
      legal: text(raw.LEGAL),
      lot: text(raw.LOT_NBR),
      block: text(raw.BLOCK_NBR),
      lake: text(raw.LAKE_NAME),
      acres: raw.ACREAGE || raw.DEEDED_ACRES || 0,
      useClass: text(raw.TPCLS1),
      homestead: text(raw.HSTD_Desc1) ? !/^Non Homestead/i.test(text(raw.HSTD_Desc1)) : null,
      publicOwner: raw.Ownership !== undefined && raw.Ownership !== "Private",
      forfeited: raw.Ownership === "Tax Forfeit" || FORFEITED.test(text(raw.TPCLS1)),
      landValue: raw.LAND_EST ?? 0,
      buildingValue: raw.BUILDING ?? 0,
      totalValue: raw.EstTotalValue ?? (raw.LAND_EST ?? 0) + (raw.BUILDING ?? 0),
      tax: raw.NET_TAX ?? null,
      delinquent: raw.DELINQUENT === "Y",
      balanceDue: raw.BAL_DUE ?? 0,
      forfeitYear: raw.PRJ_FORF_YR ?? null,
      lastSaleYear: saleYearFromDate(raw.LASTSALEDATE),
    };
  }
  const place = text(raw.ctu_name);
  const ownerLines = [raw.own_add_l1, raw.own_add_l2, raw.own_add_l3, raw.own_add_l4].map(text).filter(Boolean);
  const taxLines = [raw.tax_add_l1, raw.tax_add_l2, raw.tax_add_l3, raw.tax_add_l4].map(text).filter(Boolean);
  return {
    parcel: text(raw.state_pin) || `${text(raw.co_name)}:${text(raw.county_pin)}`,
    market: market.id ?? null,
    county: text(raw.co_name),
    place,
    inCity: place ? !/\b(Twp|Township|Unorg|Unorganized|Territory)\b/i.test(place) : null,
    owner: (text(raw.owner_name) || text(raw.tax_name)).toUpperCase(),
    mailing: (ownerLines.length > 0 ? ownerLines : taxLines).map((line) => line.toUpperCase()),
    address: street(raw),
    zip: text(raw.zip),
    plat: text(raw.plat_name),
    legal: text(raw.abb_legal),
    lot: text(raw.lot),
    block: text(raw.block),
    lake: "",
    acres: raw.acres_poly || raw.acres_deed || (raw.Shape__Area ? raw.Shape__Area / SQUARE_METERS_PER_ACRE : 0),
    useClass: text(raw.useclass1),
    homestead: raw.homestead === "Yes" ? true : raw.homestead === "No" ? false : null,
    publicOwner: /Tax Forfeit|County|State|Federal|Municipal|Tribal|Port Authority|Regional/i.test(text(raw.ownership)),
    forfeited: /Tax Forfeit/i.test(text(raw.ownership)) || /^Tax Forfeit/i.test(text(raw.owner_name) || text(raw.tax_name)) || FORFEITED.test(text(raw.useclass1)),
    units: raw.num_units ?? null,
    landValue: raw.emv_land ?? 0,
    buildingValue: raw.emv_bldg ?? 0,
    totalValue: raw.emv_total ?? (raw.emv_land ?? 0) + (raw.emv_bldg ?? 0),
    tax: raw.total_tax ?? null,
    delinquent: false,
    balanceDue: 0,
    forfeitYear: null,
    lastSaleYear: saleYearFromEpoch(raw.sale_date),
  };
}

const ESTATE_OWNER = /\b(ESTATE|EST OF|HEIRS?|DECD|DECEASED|TRUSTEE|TRUST|ET AL|ETAL)\b/;
const ENTITY_OWNER = /\b(LLC|INC|CORP|CO|COMPANY|LP|LLP|PROPERTIES|HOMES|BUILDERS|CONSTRUCTION|DEVELOPMENT|INVESTMENTS?|HOLDINGS|REALTY|PARTNERS|PARTNERSHIP|LTD|ASSOCIATION|CHURCH|BANK)\b/;
/** Parcels the State holds in trust after forfeiture ("ST OF MN FOR <name>"): not an owner who can sell. */
const STATE_TRUST_OWNER = /^ST(ATE)? OF MN\b/;
/** Public bodies some counties list by name without marking the parcel publicly owned. */
const PUBLIC_OWNER = /^(COUNTY OF|CITY OF|STATE OF|TOWN OF|VILLAGE OF|UNITED STATES|USA\b|HOUSING AND REDEVELOPMENT|HOUSING & REDEVELOPMENT|INDEPENDENT SCHOOL DISTRICT|SCHOOL DISTRICT|METROPOLITAN COUNCIL|UNIVERSITY OF MINNESOTA|REGENTS OF)|\b(COUNTY|CITY) OF [A-Z]+$/;

/** What kind of owner a parcel has: an estate or trust, a company, or a person. */
export function ownerKind(parcel) {
  if (ESTATE_OWNER.test(parcel.owner)) return "estate";
  if (ENTITY_OWNER.test(parcel.owner)) return "company";
  return "person";
}

/** Whether the named owner can sign a purchase agreement for the parcel. */
export function ownerCanSell(parcel) {
  return !parcel.publicOwner && parcel.owner !== "" && !STATE_TRUST_OWNER.test(parcel.owner) && !PUBLIC_OWNER.test(parcel.owner);
}

/** The owner's mailing address as one line, and its city, state and ZIP. */
export function ownerMailing(parcel) {
  const last = parcel.mailing.at(-1) ?? "";
  const match = /\b([A-Z]{2})\s+(\d{5})(?:-\d{4})?\s*$/.exec(last);
  return {
    line: parcel.mailing.join(", "),
    city: match ? last.slice(0, match.index).replace(/,\s*$/, "").trim() : "",
    state: match?.[1] ?? "",
    zip: match?.[2] ?? "",
  };
}

/** How far the owner lives from the parcel: local, elsewhere in Minnesota, or out of state. */
export function absentee(parcel, market = MARKETS[parcel.market] ?? {}) {
  const { city, state } = ownerMailing(parcel);
  if (!state) return "unknown";
  if (state !== "MN" && !(state === "WI" && (market.local ?? []).includes(city))) return "out-of-state";
  const place = parcel.place.replace(/^(CITY|TOWN) OF /i, "").replace(/ (City|Twp|Unorg)$/i, "").toUpperCase();
  return (market.local ?? []).includes(city) || (place && city === place) ? "local" : "in-state";
}

/** Where the parcel is, for a caller: street address when it has one, else plat, block and lot. */
export function parcelLocation(parcel) {
  if (parcel.address) return parcel.address;
  const lotBlock = [parcel.lot && `lot ${parcel.lot}`, parcel.block && `block ${parcel.block}`].filter(Boolean).join(", ");
  return [parcel.plat, lotBlock].filter(Boolean).join(", ") || parcel.legal.slice(0, 80);
}

/** Standard lots the parcel's area holds in its market (floored). */
export function standardLots(parcel, market = MARKETS[parcel.market] ?? {}) {
  return Math.floor(parcel.acres / (market.lotAcres ?? 0.1));
}

/** The kinds of property the business contracts, in the order a caller is shown them. */
export const PROPERTY_KINDS = Object.freeze(["infill-lot", "underbuilt-site", "seasonal", "rural-acreage", "dwelling", "forfeited"]);

const COMMERCIAL = /commercial|industrial|railroad|utility|marina/i;
const SEASONAL = /seasonal|recreational|lakeshore|resort|\bsrr\b/i;
const RESIDENTIAL = /residential|apartment|dwelling|unit/i;
const RURAL = /rural|agric|farm|forest|timber|wetland/i;
const FORFEITED = /tax forfeit/i;

/**
 * County class codes read as class names, for counties that write their own numeric codes
 * (Itasca, Crow Wing and others on the statewide layer). These are each county's codes, not the
 * Department of Revenue's PRISM property types; a county's table is added here from its
 * assessor's code list. Until a county has one, its vacant parcels are read by value, place and
 * size, and its built parcels are not read as any kind.
 */
export const CLASS_CODES = Object.freeze({});

const className = (parcel) => CLASS_CODES[parcel.county]?.[parcel.useClass] ?? parcel.useClass;
const numericClass = (useClass) => /^\d+[a-z]?$/i.test(useClass);

/**
 * What kind of property a parcel is, read from its class, values, place and homestead status:
 * an infill lot (vacant residential land in a city), an underbuilt site (commercial or industrial
 * land the buildings on it are worth little against), a seasonal parcel (lake and cabin land), rural
 * acreage (vacant land outside cities), a dwelling its owner does not live in, or forfeited land
 * the county will auction. Counties that write classes as numeric codes read by value and place.
 * Null when the parcel is none of these (a homestead, a built-up business).
 */
export function propertyKind(parcel) {
  const useClass = className(parcel);
  if (parcel.forfeited || FORFEITED.test(useClass)) return "forfeited";
  if (parcel.publicOwner || PUBLIC_OWNER.test(parcel.owner)) return null;
  const vacant = parcel.buildingValue === 0;
  if (COMMERCIAL.test(useClass)) return parcel.acres >= 0.25 && parcel.buildingValue <= parcel.landValue * 0.25 && parcel.landValue >= 10000 ? "underbuilt-site" : null;
  if (vacant) {
    if (SEASONAL.test(useClass)) return "seasonal";
    if (RURAL.test(useClass)) return parcel.inCity && parcel.acres <= 2 ? "infill-lot" : "rural-acreage";
    if (RESIDENTIAL.test(useClass) || /vacant/i.test(useClass)) return parcel.inCity || parcel.acres <= 1 ? "infill-lot" : "rural-acreage";
    return parcel.inCity && parcel.acres <= 2 ? "infill-lot" : "rural-acreage";
  }
  if (numericClass(useClass)) return null;
  const smallDwelling = !/apartment|4 or more|4\+|low income/i.test(useClass) && !(parcel.units > 4);
  if (parcel.homestead === false && smallDwelling && (RESIDENTIAL.test(useClass) || SEASONAL.test(useClass))) return "dwelling";
  return null;
}

const KIND_WEIGHT = Object.freeze({ "infill-lot": 6, "underbuilt-site": 4, seasonal: 5, "rural-acreage": 3, dwelling: 4, forfeited: 0 });

/**
 * Score a parcel as a seller lead: higher means the owner is likelier to sell and the property
 * likelier to be wanted by a buyer. Returns the score and the reasons, so the caller knows why
 * the parcel is on the list.
 */
export function scoreSellerLead(parcel, { year = new Date().getFullYear() } = {}) {
  const reasons = [];
  let score = 0;
  const add = (points, reason) => { score += points; reasons.push(reason); };

  const kind = propertyKind(parcel);
  if (kind) add(KIND_WEIGHT[kind], kind === "dwelling" ? "house the owner does not live in" : kind.replace("-", " "));
  if (parcel.useClass) reasons.push(parcel.useClass);

  if (kind === "infill-lot" || kind === "underbuilt-site") {
    const lots = standardLots(parcel);
    if (lots >= 1) add(2, "buildable size");
    if (lots >= 3) add(Math.min(lots, 8), `room for ${lots} standard lots`);
  } else if (kind === "rural-acreage" || kind === "seasonal") {
    if (parcel.acres >= 5) add(Math.min(Math.floor(parcel.acres / 5), 6), `${Math.round(parcel.acres)} acres`);
    if (parcel.lake) add(3, `on ${parcel.lake}`);
  }

  const away = absentee(parcel);
  if (away === "out-of-state") add(5, "owner out of state");
  else if (away === "in-state") add(3, "owner lives elsewhere in Minnesota");

  if (parcel.delinquent) add(5, `taxes delinquent ($${Math.round(parcel.balanceDue)} due)`);
  if (parcel.forfeitYear) {
    const yearsLeft = parcel.forfeitYear - year;
    add(Math.max(1, 6 - 2 * Math.max(yearsLeft, 0)), `forfeits to the county ${parcel.forfeitYear}`);
  }

  const owner = ownerKind(parcel);
  if (owner === "estate") add(4, "estate, heirs or trust");
  if (owner === "company") add(-2, "company owner");

  if (!parcel.lastSaleYear || year - parcel.lastSaleYear >= 15) add(2, parcel.lastSaleYear ? `held since ${parcel.lastSaleYear}` : "no recorded sale");
  if (parcel.landValue < 1000) add(-3, "county values the land under $1,000");

  return { score, reasons };
}

/**
 * The grey-band settings an offer reads, by kind: the land enterprise's `offer-open-*` and
 * `offer-ceiling-*` axes (lib/agency/enterprises/land-contracts.json). Lots, sites and seasonal land
 * are priced on the county's land estimate, rural acreage in the blind-offer range, a house on the
 * county's total estimate with repairs unknown until someone sees it.
 */
export const OFFER_AXES = Object.freeze({
  "infill-lot": { axis: "lot", basis: "land" },
  "underbuilt-site": { axis: "lot", basis: "land" },
  seasonal: { axis: "seasonal", basis: "land" },
  "rural-acreage": { axis: "rural", basis: "land" },
  dwelling: { axis: "dwelling", basis: "total" },
  forfeited: { axis: null, basis: "land" },
});

/** The settings an offer falls back to when none are given: the enterprise record's declared defaults. */
export const DEFAULT_OFFER_SETTINGS = Object.freeze({
  "offer-open-lot": 0.5, "offer-ceiling-lot": 0.7, "offer-open-seasonal": 0.4, "offer-ceiling-seasonal": 0.6,
  "offer-open-rural": 0.25, "offer-ceiling-rural": 0.45, "offer-open-dwelling": 0.5, "offer-ceiling-dwelling": 0.7,
});

const hundreds = (value) => Math.round(value / 100) * 100;

/** Offer guidance from the county's estimate for the parcel's kind; back taxes come out of the seller's proceeds. */
export function offerGuide(parcel, settings = DEFAULT_OFFER_SETTINGS) {
  const { axis, basis } = OFFER_AXES[propertyKind(parcel) ?? "infill-lot"];
  const estimate = Math.max(basis === "total" ? parcel.totalValue : parcel.landValue, 0);
  const openShare = axis ? settings[`offer-open-${axis}`] ?? DEFAULT_OFFER_SETTINGS[`offer-open-${axis}`] : 1;
  const ceilingShare = axis ? settings[`offer-ceiling-${axis}`] ?? DEFAULT_OFFER_SETTINGS[`offer-ceiling-${axis}`] : 1;
  const open = Math.max(500, hundreds(estimate * openShare));
  const ceiling = Math.max(open, hundreds(estimate * ceilingShare));
  return { estimate, basis, open, ceiling, backTaxes: parcel.delinquent ? parcel.balanceDue : 0 };
}

/** One call-list row for a seller lead. */
export function sellerRow(parcel, options = {}) {
  const { score, reasons } = scoreSellerLead(parcel, options);
  const mailing = ownerMailing(parcel);
  const offer = offerGuide(parcel, options.settings);
  return {
    score,
    parcel: parcel.parcel,
    market: parcel.market,
    kind: propertyKind(parcel) ?? "",
    owner: parcel.owner,
    mailing: mailing.line,
    owner_state: mailing.state,
    lot: parcelLocation(parcel),
    place: parcel.place,
    acres: Number(parcel.acres.toFixed(3)),
    standard_lots: standardLots(parcel),
    class: parcel.useClass,
    estimate: offer.estimate,
    open_offer: offer.open,
    max_offer: offer.ceiling,
    back_taxes: offer.backTaxes,
    forfeit_year: parcel.forfeitYear ?? "",
    why: reasons.join("; "),
    called: "",
    outcome: "",
  };
}

/**
 * Buyer leads: owners holding several vacant residential lots or sites, grouped by owner.
 * Builders and traders hold residential land; an industrial or institutional holder buying the
 * land around its own plant is not a buyer for infill lots, so only residential-kind holdings count.
 */
export function buyerRows(parcels, { minimumLots = 3, year = new Date().getFullYear() } = {}) {
  const byOwner = new Map();
  for (const parcel of parcels) {
    if (!ownerCanSell(parcel)) continue;
    const kind = propertyKind(parcel);
    if (kind !== "infill-lot" && kind !== "underbuilt-site") continue;
    const useClass = className(parcel);
    if (kind === "infill-lot" && !RESIDENTIAL.test(useClass) && !/vacant/i.test(useClass) && !numericClass(useClass)) continue;
    const entry = byOwner.get(parcel.owner) ?? { owner: parcel.owner, market: parcel.market, mailing: ownerMailing(parcel).line, lots: 0, land_estimate: 0, recent_purchases: 0, company: ownerKind(parcel) === "company" };
    entry.lots += 1;
    entry.land_estimate += parcel.landValue;
    if (parcel.lastSaleYear && parcel.lastSaleYear >= year - 3) entry.recent_purchases += 1;
    byOwner.set(parcel.owner, entry);
  }
  return [...byOwner.values()]
    .filter((entry) => entry.lots >= minimumLots || entry.recent_purchases >= 2)
    .sort((a, b) => b.recent_purchases - a.recent_purchases || b.lots - a.lots)
    .map((entry) => ({ ...entry, contact: "", called: "", outcome: "" }));
}

/** Parcels a layer returns once each: a parcel split across several polygons appears once. */
export function uniqueParcels(parcels) {
  const seen = new Map();
  for (const parcel of parcels) {
    const prior = seen.get(parcel.parcel);
    if (!prior || parcel.acres > prior.acres) seen.set(parcel.parcel, parcel);
  }
  return [...seen.values()];
}

/**
 * Pull one market's parcels from its layer, read into the business's shape, one per parcel,
 * leaving out parcels no owner can sign for.
 * @param {string} marketId
 * @param {{queryFeatures: Function, fetch?: typeof fetch}} io the ArcGIS client's query, and fetch
 */
export async function pullMarket(marketId, { queryFeatures, fetch: fetchImpl } = {}) {
  const market = marketOf(marketId);
  const source = SOURCES[market.source];
  const parcels = [];
  for await (const raw of queryFeatures(source.layer, { where: marketWhere(market), outFields: source.fields, fetch: fetchImpl })) {
    const parcel = normalizeParcel(raw, market);
    if (propertyKind(parcel) && (ownerCanSell(parcel) || propertyKind(parcel) === "forfeited")) parcels.push(parcel);
  }
  return { market, parcels: uniqueParcels(parcels) };
}
