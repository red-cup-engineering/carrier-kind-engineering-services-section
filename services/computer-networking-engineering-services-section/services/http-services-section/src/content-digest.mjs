/** RFC 9530 Content-Digest for exact HTTP message-content bytes, not Repr-Digest. */
import { parseDictionary, serializeDictionary, itemConstruct, byteSequence } from "@red-cup-engineering/computer-serialized-content-engineering-services-section/http-structured-fields";
import { decodeJsonByteCarrier } from "@red-cup-engineering/json-services-section/decode-json-byte-carrier";

const algorithms = { "sha-256": "SHA-256", "sha-512": "SHA-512" };
function request(body, required, optional = []) {
  if (!body || typeof body !== "object" || Array.isArray(body) || required.some(k => !Object.hasOwn(body, k)) || Object.keys(body).some(k => ![...required, ...optional].includes(k))) throw new TypeError(`request requires ${required.join(", ")}`);
  const carrier = body.carrier;
  if (typeof carrier?.mediaType !== "string" || !carrier.mediaType.isWellFormed() || carrier.mediaType.length > 256) throw new TypeError("carrier requires bounded well-formed mediaType");
  return Uint8Array.from(decodeJsonByteCarrier({ carrier, maximumBytes: 65536 }).bytes);
}
async function digest(bytes, algorithm) { return new Uint8Array(await crypto.subtle.digest(algorithms[algorithm], bytes)); }
export async function makeContentDigest(body) {
  const bytes = request(body, ["carrier"], ["algorithms"]);
  const selected = body.algorithms ?? ["sha-256"];
  if (!Array.isArray(selected) || !selected.length || selected.length > 2 || new Set(selected).size !== selected.length || selected.some(a => !Object.hasOwn(algorithms, a))) throw new TypeError("algorithms must select sha-256 and/or sha-512 without duplicates");
  const entries = await Promise.all(selected.map(async algorithm => [algorithm, itemConstruct(byteSequence(await digest(bytes, algorithm)))]));
  return { contentDigest: serializeDictionary(new Map(entries)), byteLength: bytes.length };
}
export async function verifyContentDigest(body) {
  const bytes = request(body, ["carrier", "contentDigest"]);
  if (typeof body.contentDigest !== "string" || !body.contentDigest.isWellFormed() || body.contentDigest.length > 16384 || /[^\x20-\x7e\t]/u.test(body.contentDigest)) throw new TypeError("Content-Digest must be bounded ASCII field text");
  let entries;
  try { entries = parseDictionary(body.contentDigest); } catch (error) { throw new TypeError(error.message); }
  if (!entries.size) throw new TypeError("Content-Digest must contain a digest");
  for (const [, entry] of entries) if (entry.type !== "item" || entry.value.type !== "byteSequence" || entry.parameters.size) throw new TypeError("Content-Digest members must be unparameterized byte sequences");
  const supported = [], unsupported = [];
  for (const [algorithm, entry] of entries) {
    if (!Object.hasOwn(algorithms, algorithm)) { unsupported.push(algorithm); continue; }
    const actual = await digest(bytes, algorithm), supplied = entry.value.value;
    let difference = actual.length ^ supplied.length;
    for (let i = 0; i < actual.length; i++) difference |= actual[i] ^ (supplied[i] ?? 0);
    supported.push({ algorithm, matches: difference === 0 });
  }
  if (!supported.length) throw new TypeError("Content-Digest needs at least one supported sha-256 or sha-512 algorithm");
  return { matches: supported.every(entry => entry.matches), results: supported, unsupported, byteLength: bytes.length };
}
