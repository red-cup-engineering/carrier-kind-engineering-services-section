import { acquirePublicWebSources } from "@causeway-services/web-source-acquisition/acquire";
import { acquireOne, robotsAllows } from "../market-acquisition.mjs";
import { observeCoverFeatures } from "./conventions.mjs";

const USER_AGENT = "Koios-Source-Acquisition";
const AMAZON = /(^|\.)amazon\.(com|ca|co\.uk|com\.au)$/u;
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function categoryUrl(value) {
  const url = new URL(value);
  if (url.protocol !== "https:" || !AMAZON.test(url.hostname.toLowerCase())) throw new TypeError("cover market sources must be HTTPS Amazon category URLs");
  return url;
}

export function extractCoverSamples(markup, source) {
  const samples = [];
  for (const match of String(markup).matchAll(/<(?<tag>[a-z][^>]*data-asin=["'](?<asin>[A-Z0-9]{10})["'][^>]*)>(?<body>[\s\S]*?)(?=<[a-z][^>]*data-asin=["'][A-Z0-9]{10}["']|$)/giu)) {
    const body = match.groups.body, image = body.match(/<img[^>]+(?:src|data-a-dynamic-image)=["'](?<src>[^"']+)/iu);
    const title = body.match(/(?:alt|data-field=["']title["'])=["'](?<title>[^"']+)/iu)?.groups?.title ?? body.match(/<b[^>]*data-field=["']title["'][^>]*>(?<title>[^<]+)/iu)?.groups?.title ?? null;
    samples.push(Object.freeze({ asin: match.groups.asin, title, imageSource: image?.groups?.src ?? null, listingSource: source }));
  }
  return Object.freeze(samples.filter(({ imageSource }) => imageSource));
}

/** Acquire listings through the bounded house source service; retain only classifier-derived cover features. */
export async function acquireCoverFeatureObservations({ categories, observedAt, policy }, { acquire = acquirePublicWebSources, classify, sleep = delay, io = {} } = {}) {
  if (typeof classify !== "function") throw new TypeError("a cover feature classifier capability is required");
  if (policy?.permission !== "permitted" || !/^\d{4}-\d{2}-\d{2}/u.test(policy.reviewedAt ?? "") || !Number.isInteger(policy.minimumIntervalMs) || policy.minimumIntervalMs < 5000) throw new TypeError("cover research needs dated permission and a minimum 5000ms interval");
  const observations = [], obstructions = [];
  for (const category of categories) {
    const url = categoryUrl(category.url);
    try {
      const robots = await acquireOne(`${url.origin}/robots.txt`, observedAt, acquire, io);
      await sleep(policy.minimumIntervalMs);
      if (!robotsAllows(robots.text, url.href, USER_AGENT)) { obstructions.push({ category: category.id, code: "robots-disallowed", source: url.href }); continue; }
      const page = await acquireOne(url.href, observedAt, acquire, io);
      for (const sample of extractCoverSamples(page.markup ?? page.text, url.href).slice(0, category.maximumSamples ?? 24)) {
        try {
          const features = await classify(sample);
          observations.push(observeCoverFeatures({ ...features, source: url.href, observedAt, sample: { category: category.id, asin: sample.asin, title: sample.title }, samplingMethod: "robots-permitted Amazon category listing; bounded first-page sample", biasLimits: ["ranking-position bias", "first-page survivorship bias", "marketplace personalization may vary", ...(features.biasLimits ?? [])] }));
        } catch (error) { obstructions.push({ category: category.id, asin: sample.asin, code: "feature-classification-obstructed", reason: String(error?.message ?? error) }); }
      }
    } catch (error) { obstructions.push({ category: category.id, code: "acquisition-obstructed", reason: String(error?.message ?? error) }); }
  }
  return Object.freeze({ type: "CoverFeatureAcquisitionResult", version: 1, observedAt, observations: Object.freeze(observations), obstructions: Object.freeze(obstructions), retainedCoverImages: 0 });
}
