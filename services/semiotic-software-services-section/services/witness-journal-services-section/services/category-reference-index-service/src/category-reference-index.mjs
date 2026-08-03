import { createHash } from "node:crypto";
import { createR2SigV4Client, r2Configuration } from "@red-cup-engineering/resource-brokerage-service-section/r2-sigv4";
import { isCanonicalSha256NiUri, sha256DigestFromNiUri } from "@red-cup-engineering/semantic-content-identify-service";

const PROFILE = "org.red-cup-engineering.category-reference.v1";
const hash = (value, encoding) => createHash("sha256").update(value).digest(encoding);
function categoryPrefix(category, predicate) {
  if (typeof category !== "string" || category.length === 0 || Buffer.byteLength(category) > 1024) throw new TypeError("category must contain 1 through 1024 UTF-8 bytes");
  if (typeof predicate !== "string" || predicate.length === 0 || Buffer.byteLength(predicate) > 2048) throw new TypeError("category predicate must contain 1 through 2048 UTF-8 bytes");
  return `indexes/category-reference/sha-256/${hash(`${predicate}\n${category}`, "base64url")}/`;
}
function bodyFor(category, predicate, ni) {
  if (!isCanonicalSha256NiUri(ni)) throw new TypeError("category member must be one canonical SHA-256 ni URI");
  return Buffer.from(`${JSON.stringify({ profile: PROFILE, predicate, category, ni })}\n`);
}
export function createCategoryReferenceIndex({ r2 = createR2SigV4Client(r2Configuration()) } = {}) {
  async function add({ category, predicate = "urn:emsenn:witness-journal:category", ni }) {
    const body = bodyFor(category, predicate, ni), suffix = sha256DigestFromNiUri(ni), key = `${categoryPrefix(category, predicate)}${suffix}.json`;
    // This body is a pure function of its content-addressed key; write it
    // directly so an initial missing-key GET cannot poison the read-back.
    await r2.putCurrent(key, { body, byteLength: body.length, sha256: hash(body, "hex"), mediaType: "application/json" });
    const retained = await r2.get(key);
    if (!retained || !retained.body.equals(body)) throw new Error("category index read-back failed");
    return Object.freeze({ profile: PROFILE, predicate, category, ni, key });
  }
  async function query(category, { predicate = "urn:emsenn:witness-journal:category", continuationToken } = {}) {
    const page = await r2.list(categoryPrefix(category, predicate), continuationToken);
    const references = [];
    for (const key of page.keys) {
      const object = await r2.get(key); if (!object) throw new Error("category index listed a missing reference");
      const value = JSON.parse(object.body.toString("utf8"));
      if (value.profile !== PROFILE || value.predicate !== predicate || value.category !== category || !isCanonicalSha256NiUri(value.ni)) throw new Error("category index returned a foreign reference");
      references.push(Object.freeze({ profile: PROFILE, predicate, category, ni: value.ni, key }));
    }
    return Object.freeze({ references: Object.freeze(references), continuationToken: page.continuationToken });
  }
  return Object.freeze({ add, query });
}
export const CATEGORY_REFERENCE_PROFILE = PROFILE;
