/**
 * enterprise/store — each micro-enterprise's records, one store type per category
 * (`enterprise-contact`, `enterprise-order`, ...) in its own root, each record naming its
 * enterprise: contacts, orders, parties' standing wants (buy boxes), settings, settlements, costs,
 * contract signatures and leadership bids. Businesses write and read through this store. A record is
 * written in its enterprise's own root; the store at the binding's root, where every enterprise's
 * records were kept before they held their own, stays readable as their former root.
 * A record is read by its type (`each`), in the order it was recorded; a contact's or a signature's
 * side is read from the record's own outcome or reading, never stored beside it.
 * @packageDocumentation
 */
import { each, put } from "@red-cup-engineering/semiotic-eavt-services-section/store";
import { canonicalJson } from "@red-cup-engineering/json-services-section/canonical-json";
import { CONTACT_SIDES } from "./orders.mjs";
import { validateControlRecord } from "./control.mjs";

export const RECORD_CATEGORIES = Object.freeze(["contact", "order", "party", "resource", "setting", "settlement", "cost", "signature", "bid", "control"]);

/** The store type of an enterprise record category. */
export const enterpriseRecordType = (category) => `enterprise-${category}`;

const recordedOrder = (a, b) => String(a.recordedAt).localeCompare(String(b.recordedAt)) || (canonicalJson(a) < canonicalJson(b) ? -1 : 1);

/**
 * The store over the micro-enterprises' own roots.
 * @param {{dataRoot: string}} binding its root is the former root every enterprise's records were kept in
 * @param {object} [options]
 * @param {{ rootOf: (id: string) => string, ids: () => string[] }} [options.roots] each enterprise's own
 *   root (`enterpriseRoots`); without it every record stays in the binding's root
 */
export function enterpriseStore(binding, { roots, now = () => new Date().toISOString() } = {}) {
  const rootOf = (enterprise) => {
    if (!roots) return binding.dataRoot;
    return roots.rootOf(enterprise);
  };
  function write(category, record) {
    if (!RECORD_CATEGORIES.includes(category)) throw new TypeError(`unknown enterprise record category: ${category}`);
    if (typeof record.enterprise !== "string" || record.enterprise === "") throw new TypeError(`an enterprise ${category} names its enterprise`);
    const stored = Object.freeze(Object.fromEntries(Object.entries({ ...record, recordedAt: now() }).filter(([, value]) => value !== undefined)));
    put(rootOf(record.enterprise), enterpriseRecordType(category), stored);
    return stored;
  }
  const heldFor = (filter) => !roots ? [binding.dataRoot]
    : [...new Set([binding.dataRoot, ...(filter.enterprise === undefined ? roots.ids() : [filter.enterprise]).map(rootOf)])];
  const matching = (rows, filter) => rows.filter((record) => Object.entries(filter).every(([key, value]) => value === undefined || record[key] === value));
  const recordsOf = (root, category) => [...each(root, enterpriseRecordType(category))].map(({ record }) => record);
  function read(category, filter = {}) {
    return matching(heldFor(filter).flatMap((root) => recordsOf(root, category)), filter).sort(recordedOrder);
  }
  return Object.freeze({
    write,
    read,
    /** One business observation reads each custody root once for the needed categories. */
    readView() {
      const observed = new Map(heldFor({}).map((root) => [root, new Map(RECORD_CATEGORIES.map((category) => [category, recordsOf(root, category)]))]));
      return Object.freeze({ read(category, filter = {}) {
        return matching(heldFor(filter).flatMap((root) => observed.get(root)?.get(category) ?? recordsOf(root, category)), filter).sort(recordedOrder);
      } });
    },
    /** A contact is for or against the party's interest by its outcome's side, and must be a known outcome. */
    contact(record, outcomes = CONTACT_SIDES) {
      if (!(record.outcome in outcomes)) throw new TypeError(`unknown contact outcome: ${record.outcome}`);
      return write("contact", record);
    },
    order: (record) => write("order", record),
    party: (record) => write("party", record),
    resource: (record) => write("resource", record),
    setting: (record) => write("setting", record),
    settlement: (record) => write("settlement", record),
    cost: (record) => write("cost", record),
    signature: (record) => write("signature", record),
    bid: (record) => write("bid", record),
    control(record) {
      validateControlRecord(record);
      return write("control", record);
    },
  });
}
