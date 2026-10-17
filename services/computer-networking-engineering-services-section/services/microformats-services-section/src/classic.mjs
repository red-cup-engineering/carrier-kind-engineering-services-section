/**
 * Backward compatibility with classic microformats (hCard, hEntry, ...): the root and property
 * mappings of microformats2-parsing, "Backward Compatibility". A classic root class becomes its
 * microformats2 type; inside it, a classic property class becomes the mapped microformats2 property
 * (`p-`, `u-`, `dt-` or `e-`), and some imply a nested root (an hEntry's `author` is an `h-card`).
 */

/** Classic root class -> microformats2 type. */
export const CLASSIC_ROOTS = Object.freeze({
  adr: { type: "h-adr" },
  geo: { type: "h-geo" },
  hentry: { type: "h-entry" },
  hfeed: { type: "h-feed" },
  hnews: { type: "h-news" },
  hproduct: { type: "h-product" },
  hrecipe: { type: "h-recipe" },
  hresume: { type: "h-resume" },
  hreview: { type: "h-review" },
  "hreview-aggregate": { type: "h-review-aggregate" },
  item: { type: "h-item" },
  vcard: { type: "h-card" },
  vevent: { type: "h-event" },
});

/** The classic root an implied microformats2 type stands for (to know whose properties its children carry). */
export const CLASSIC_OF_TYPE = Object.freeze({
  "h-adr": "adr", "h-card": "vcard", "h-entry": "hentry", "h-event": "vevent", "h-feed": "hfeed", "h-geo": "geo",
  "h-item": "item", "h-news": "hnews", "h-product": "hproduct", "h-recipe": "hrecipe", "h-resume": "hresume",
  "h-review": "hreview", "h-review-aggregate": "hreview-aggregate",
});

const ADR = {
  "post-office-box": "p-post-office-box", "extended-address": "p-extended-address", "street-address": "p-street-address",
  locality: "p-locality", region: "p-region", "postal-code": "p-postal-code", "country-name": "p-country-name",
};
const GEO = { latitude: "p-latitude", longitude: "p-longitude", altitude: "p-altitude" };
const VCARD = {
  fn: "p-name", "honorific-prefix": "p-honorific-prefix", "given-name": "p-given-name", "additional-name": "p-additional-name",
  "family-name": "p-family-name", "honorific-suffix": "p-honorific-suffix", nickname: "p-nickname", email: "u-email",
  logo: "u-logo", photo: "u-photo", url: "u-url", uid: "u-uid", category: "p-category", adr: "p-adr h-adr",
  ...ADR, label: "p-label", geo: "p-geo h-geo", ...GEO, tel: "p-tel", note: "p-note", bday: "dt-bday", key: "u-key",
  org: "p-org", "organization-name": "p-organization-name", "organization-unit": "p-organization-unit",
  title: "p-job-title", role: "p-role", tz: "p-tz", rev: "dt-rev", "sort-string": "p-sort-string", sound: "u-sound", class: "p-class",
};
const HENTRY = {
  "entry-title": "p-name", "entry-summary": "p-summary", "entry-content": "e-content", published: "dt-published",
  updated: "dt-updated", author: "p-author h-card", category: "p-category", geo: "p-geo h-geo", ...GEO,
};
const PROPERTIES = Object.freeze({
  adr: ADR,
  geo: GEO,
  vcard: VCARD,
  vevent: {
    summary: "p-name", dtstart: "dt-start", dtend: "dt-end", duration: "dt-duration", description: "p-description",
    url: "u-url", uid: "u-uid", category: "p-category", location: "p-location", geo: "p-geo h-geo", ...GEO,
    attendee: "p-attendee h-card", contact: "p-contact h-card", organizer: "p-organizer h-card", status: "p-status",
    rdate: "dt-rdate", rrule: "p-rrule", "class": "p-class",
  },
  hentry: HENTRY,
  hnews: { ...HENTRY, dateline: "p-dateline", "source-org": "p-source-org", "principles": "u-principles", geo: "p-geo h-geo" },
  hfeed: { ...HENTRY, url: "u-url", photo: "u-photo", description: "p-description" },
  hproduct: {
    brand: "p-brand", category: "p-category", description: "p-description", fn: "p-name", photo: "u-photo", url: "u-url",
    price: "p-price", review: "p-review h-review", listing: "p-listing h-listing", identifier: "u-identifier",
  },
  hrecipe: {
    fn: "p-name", ingredient: "p-ingredient", yield: "p-yield", instructions: "e-instructions", duration: "dt-duration",
    photo: "u-photo", summary: "p-summary", author: "p-author h-card", published: "dt-published", nutrition: "p-nutrition", category: "p-category",
  },
  hresume: {
    summary: "p-summary", contact: "p-contact h-card", education: "p-education h-event", experience: "p-experience h-event",
    skill: "p-skill", affiliation: "p-affiliation h-card",
  },
  hreview: {
    summary: "p-name", description: "e-description", item: "p-item h-item", reviewer: "p-reviewer h-card", dtreviewed: "dt-reviewed",
    rating: "p-rating", best: "p-best", worst: "p-worst", category: "p-category", url: "u-url", version: "p-version",
  },
  "hreview-aggregate": {
    summary: "p-name", item: "p-item h-item", rating: "p-rating", best: "p-best", worst: "p-worst", average: "p-average",
    count: "p-count", votes: "p-votes", category: "p-category",
  },
  item: { fn: "p-name", url: "u-url", photo: "u-photo" },
});

/** Per-root properties that nest their classic root when the element carries no root class of its own. */
function parseSpec(spec) {
  const [property, impliedRoot] = spec.split(" ");
  const m = /^(p|u|dt|e)-(.+)$/u.exec(property);
  return { kind: m[1], name: m[2], impliedType: impliedRoot };
}

/** The microformats2 property a classic class names inside `rootClass`, or undefined. */
export function classicPropertyOf(rootClass, className) {
  const spec = PROPERTIES[rootClass]?.[className];
  return spec === undefined ? undefined : parseSpec(spec);
}

/** Classic roots whose `rel="tag"` links are categories (rel-tag: the last path segment of the href). */
export const REL_TAG_ROOTS = Object.freeze(new Set(["hentry", "hfeed", "hnews", "hreview", "hrecipe", "hproduct", "vcard", "vevent", "hreview-aggregate"]));
