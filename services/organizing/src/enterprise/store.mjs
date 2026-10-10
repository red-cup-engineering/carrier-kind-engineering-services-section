/**
 * enterprise/store — each micro-enterprise's records in a semantic record journal (kind
 * `enterprise`) in its own root, each record naming its enterprise: contacts, orders, parties'
 * standing wants (buy boxes), settings, settlements, costs, contract signatures and leadership
 * bids. Businesses write and read through this store. A record is written in its enterprise's own
 * root; the journal at the binding's root, where every enterprise's records were kept before they
 * held their own, stays readable as their former root.
 * @packageDocumentation
 */
import { createSemanticRecordJournal } from "@red-cup-engineering/semiotic-eavt-services-section/record-semantic-record";
import { CONTACT_SIDES, contactSide } from "./orders.mjs";
import { validateControlRecord } from "./control.mjs";

export const ENTERPRISE_JOURNAL_KIND = "enterprise";
export const RECORD_CATEGORIES = Object.freeze(["contact", "order", "party", "resource", "setting", "settlement", "cost", "signature", "bid", "control"]);

const journalAt = (root) => createSemanticRecordJournal({ root, objectKind: ENTERPRISE_JOURNAL_KIND });

/**
 * The store over the micro-enterprises' own roots.
 * @param {{dataRoot: string}} binding its root is the former root every enterprise's records were kept in
 * @param {object} [options]
 * @param {{ rootOf: (id: string) => string, ids: () => string[] }} [options.roots] each enterprise's own
 *   root (`enterpriseRoots`); without it every record stays in the binding's root
 */
export function enterpriseStore(binding, { roots, journal, now = () => new Date().toISOString() } = {}) {
  const former = journal ?? journalAt(binding.dataRoot);
  const journals = new Map();
  const journalOf = (enterprise) => {
    if (!roots) return former;
    const root = roots.rootOf(enterprise);
    if (root === binding.dataRoot) return former;
    if (!journals.has(root)) journals.set(root, journalAt(root));
    return journals.get(root);
  };
  function write(category, record, told = { for: true, against: false }) {
    if (!RECORD_CATEGORIES.includes(category)) throw new TypeError(`unknown enterprise record category: ${category}`);
    if (typeof record.enterprise !== "string" || record.enterprise === "") throw new TypeError(`an enterprise ${category} names its enterprise`);
    const recordedAt = now();
    const stored = Object.freeze(Object.fromEntries(Object.entries({ ...record, recordedAt }).filter(([, value]) => value !== undefined)));
    journalOf(record.enterprise).record({ category, recordedAt, record: stored, told });
    return stored;
  }
  const heldFor = (filter) => !roots ? [former]
    : [...new Set([former, ...(filter.enterprise === undefined ? roots.ids() : [filter.enterprise]).map(journalOf)])];
  function read(category, filter = {}) {
    const held = heldFor(filter);
    const rows = held.flatMap((each) => each.query({ category }).map((row) => row.record))
      .filter((record) => Object.entries(filter).every(([key, value]) => value === undefined || record[key] === value));
    return held.length === 1 ? rows : rows.sort((a, b) => String(a.recordedAt).localeCompare(String(b.recordedAt)));
  }
  return Object.freeze({
    write,
    read,
    /** One business observation reads each custody root once for the needed categories. */
    readView() {
      const observed = new Map(heldFor({}).map(each => [each, each.queryCategories({ categories: RECORD_CATEGORIES })]));
      return Object.freeze({ read(category, filter = {}) {
        const held = heldFor(filter);
        const rows = held.flatMap(each => observed.get(each).filter(row => row.category === category).map(row => row.record))
          .filter(record => Object.entries(filter).every(([key, value]) => value === undefined || record[key] === value));
        return held.length === 1 ? rows : rows.sort((a, b) => String(a.recordedAt).localeCompare(String(b.recordedAt)));
      } });
    },
    /** A contact tells for or against the party's interest by its outcome's side. */
    contact(record, outcomes = CONTACT_SIDES) {
      if (!(record.outcome in outcomes)) throw new TypeError(`unknown contact outcome: ${record.outcome}`);
      const side = contactSide(record, outcomes);
      return write("contact", record, { for: side === "for", against: side === "against" });
    },
    order: (record) => write("order", record),
    party: (record) => write("party", record),
    resource: (record) => write("resource", record),
    setting: (record) => write("setting", record),
    settlement: (record) => write("settlement", record),
    cost: (record) => write("cost", record),
    signature: (record) => write("signature", record, { for: record.reading !== "denied", against: record.reading === "denied" }),
    bid: (record) => write("bid", record),
    control(record) {
      validateControlRecord(record);
      return write("control", record);
    },
  });
}
