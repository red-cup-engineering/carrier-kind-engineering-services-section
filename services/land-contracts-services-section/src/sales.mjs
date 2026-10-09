/**
 * County sale lists: the forfeited land a county is selling now, read from the lists it publishes
 * (auction lists, and the available lists of parcels left unsold at auction and sold over the
 * counter, first come, first served, at the listed price). Each row is one tract with its parcels,
 * place, acres, price, whether it is sold, and whether the county will take terms (Minn. Stat.
 * 282.01, subd. 4: at least ten percent down, the rest in no more than ten annual installments).
 * @packageDocumentation
 */
import { decodeCsv } from "@red-cup-engineering/csv-services-section/csv-codec";
import { MARKETS } from "./leads.mjs";

/**
 * The counties whose lists are read: the page that links each current list, and what each of the
 * county's sale types is. St. Louis County's standard sales take terms (10% or $500 down,
 * whichever is greater, up to ten years, 7%); its settlement sales (parcels forfeited 2016 and
 * later) are cash only.
 */
export const COUNTY_SALES = Object.freeze({
  "st-louis": Object.freeze({
    name: "St. Louis County",
    page: "https://www.stlouiscountymn.gov/departments-a-z/land-minerals/sales-and-contracts/tax-forfeited-land-sales",
    terms: Object.freeze({ downShare: 0.1, downMinimum: 500, years: 10, rate: 0.07 }),
    saleTypes: Object.freeze({
      1: { name: "land sale auction", way: "auction", terms: true },
      2: { name: "available list", way: "over the counter", terms: true },
      18: { name: "settlement sale auction", way: "auction", terms: false },
      19: { name: "settlement sale available list", way: "over the counter", terms: false },
      22: { name: "new forfeiture auction", way: "auction", terms: null },
    }),
  }),
});

/** The county a name refers to; throws on an unknown county. */
export function countySalesOf(id = "st-louis") {
  const county = COUNTY_SALES[id];
  if (!county) throw new Error(`no county sale lists for "${id}": the counties are ${Object.keys(COUNTY_SALES).join(", ")}`);
  return Object.freeze({ id, ...county });
}

const LIST_LINK = /href="([^"]*ShowAvailable_LandSale_Table[^"]*)"/g;

/** The lists a county's sales page links: sale type, sale date and the report's address, once each. */
export function saleListLinks(html, county) {
  const seen = new Map();
  for (const [, href] of html.matchAll(LIST_LINK)) {
    const url = new URL(href.replaceAll("&amp;", "&"), county.page);
    const params = [...url.searchParams.entries()].map(([key, value]) => `${key}=${value}`).join("&");
    const saleType = Number(/saleType=(\d+)/.exec(params)?.[1]);
    const saleDate = /saleDate=(\d{4}-\d{2}-\d{2})/.exec(params)?.[1] ?? null;
    const known = county.saleTypes[saleType] ?? { name: `sale type ${saleType}`, way: null, terms: null };
    const key = `${saleType}:${saleDate}`;
    if (!seen.has(key)) seen.set(key, Object.freeze({ saleType, saleDate, ...known, url: url.href }));
  }
  return [...seen.values()];
}

const PARCEL_NUMBER = /\d{3}-\d{4}-\d{5}/g;
const dollars = (value) => Number(String(value ?? "").replace(/[$,\s]/g, "")) || 0;

/** The market a county list's taxing district falls in, when the business works it. */
export function marketOfPlace(place) {
  const name = String(place ?? "").toUpperCase();
  if (/CITY OF DULUTH/.test(name)) return "duluth";
  if (/HERMANTOWN/.test(name)) return "hermantown";
  if (/PROCTOR/.test(name)) return "proctor";
  if (MARKETS["iron-range"].local.some((city) => name.includes(city))) return "iron-range";
  if (/^CITY OF/.test(name)) return null;
  return "st-louis-county-rural";
}

/** What buying a tract on the county's terms takes: the down payment and the first year's installment. */
export function termsOf(price, terms) {
  if (!terms || !(price > 0)) return null;
  const down = Math.max(Math.round(price * terms.downShare), terms.downMinimum);
  const financed = Math.max(price - down, 0);
  const principal = Math.round(financed / terms.years);
  return Object.freeze({ down, financed, years: terms.years, rate: terms.rate, firstInstallment: principal + Math.round(financed * terms.rate) });
}

/** One list's rows from its CSV export. */
export function saleListRows(csv, list, county) {
  return decodeCsv(csv).map((row) => {
    const price = dollars(row.AppraisedSubTotal);
    const place = String(row.TaxDistNames ?? "").trim();
    return Object.freeze({
      county: county.id,
      list: list.name,
      saleType: list.saleType,
      saleDate: list.saleDate,
      way: list.way,
      tract: String(row.TractNumber ?? "").trim(),
      contract: String(row.ContractNumber ?? "").trim(),
      sold: /^SOLD$/i.test(String(row.ContractNumber ?? "").trim()),
      parcels: String(row.ParcelStringList ?? "").match(PARCEL_NUMBER) ?? [],
      place,
      market: marketOfPlace(place),
      acres: Number(row.ACRES) || 0,
      price,
      terms: list.terms ? termsOf(price, county.terms) : null,
      cashOnly: list.terms === false,
      comments: String(row.Comments ?? "").replace(/\s+/g, " ").trim(),
    });
  });
}

/**
 * A sale-list tract as a parcel, so buy boxes read it the way they read any other: forfeited land
 * in its market and place, its listed price standing for its value.
 */
export function saleParcel(row) {
  return Object.freeze({
    parcel: row.parcels[0] ?? `${row.county}:${row.saleDate}:${row.tract}`,
    market: row.market,
    county: COUNTY_SALES[row.county]?.name ?? row.county,
    place: row.place,
    inCity: /^CITY OF/i.test(row.place),
    owner: "",
    mailing: [],
    address: "",
    zip: "",
    plat: "",
    legal: row.comments,
    lot: "",
    block: "",
    lake: "",
    acres: row.acres,
    useClass: "Tax Forfeited",
    homestead: null,
    publicOwner: true,
    forfeited: true,
    landValue: row.price,
    buildingValue: 0,
    totalValue: row.price,
    tax: null,
    delinquent: false,
    balanceDue: 0,
    forfeitYear: null,
    lastSaleYear: null,
  });
}

/**
 * Read every list a county's sales page links, through the report exporter a host supplies
 * (`exportReport(url) -> { text }`), into one dated pull.
 */
export async function pullSaleLists(countyId, { exportReport, fetch: fetchImpl = fetch } = {}) {
  const county = countySalesOf(countyId);
  const res = await fetchImpl(county.page, { headers: { accept: "text/html" } });
  if (!res.ok) throw new Error(`${county.name}'s sales page answered HTTP ${res.status}`);
  const lists = saleListLinks(await res.text(), county);
  const read = [];
  for (const list of lists) {
    const { text } = await exportReport(list.url, { fetch: fetchImpl });
    read.push(Object.freeze({ ...list, rows: saleListRows(text, list, county) }));
  }
  return Object.freeze({ county: county.id, name: county.name, page: county.page, lists: read });
}
