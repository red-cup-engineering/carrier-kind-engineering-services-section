/** JSON transport binding for typed ledger reports. Runtime Maps become keyed
 * objects and exact integers become decimal strings; arithmetic stays upstream. */

/** Explicit representation transformation; does not parse or stringify a report. */
export function toLedgerJson(value) {
  function encode(item) {
    if (item === null || typeof item === "string" || typeof item === "boolean") return item;
    if (typeof item === "bigint") return item.toString();
    if (typeof item === "number" && Number.isFinite(item)) return item;
    if (Array.isArray(item) || item instanceof Set) return Object.freeze([...item].map(encode));
    if (item instanceof Map) {
      for (const key of item.keys()) if (typeof key !== "string") throw new TypeError("ledger JSON map keys must be strings");
      return Object.freeze(Object.fromEntries([...item].map(([key, entry]) => [key, encode(entry)])));
    }
    if (typeof item === "object" && (Object.getPrototypeOf(item) === Object.prototype || Object.getPrototypeOf(item) === null)) {
      return Object.freeze(Object.fromEntries(Object.entries(item).filter(([, entry]) => entry !== undefined).map(([key, entry]) => [key, encode(entry)])));
    }
    throw new TypeError("ledger report contains an unsupported JSON value");
  }
  return encode(value);
}

