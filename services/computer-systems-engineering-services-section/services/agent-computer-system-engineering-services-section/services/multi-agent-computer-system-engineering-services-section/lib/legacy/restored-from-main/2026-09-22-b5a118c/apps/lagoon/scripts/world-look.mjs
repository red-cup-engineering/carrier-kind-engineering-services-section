// world-look — composes @red-cup-engineering/eavt reads (readEavtFile, listEntities, fold,
// relate) into one "look at a place" answer; invents no substrate law, only orchestrates.

import { readEavtEntries } from "@red-cup-engineering/eavt/read-eavt-entries";
import { entities } from "@red-cup-engineering/eavt/list-entities";
import { foldEavtEvidence } from "@red-cup-engineering/eavt/fold-eavt-evidence";
import { relateEavtRows } from "@red-cup-engineering/eavt/relate-eavt-rows";

// an entity's genesis "constituted" cell object, or undefined if never constituted in rows.
function attributesOf(address, rows) {
  return foldEavtEvidence({ subject: address, rows }).fiber.find((c) => c.predicate === "constituted")?.object;
}

/**
 * Resolves a constituted entity's own address from one named genesis attribute, generalizing
 * findAddressByName to any attribute key (e.g. an office's "occupant" rather than its "name").
 *
 * @summary Finds the address of the entity whose "constituted" attributes carry key===value.
 * @param {object[]} rows An in-memory {e,a,v,t} row array (e.g. from readEavtFile).
 * @param {string} key The genesis attribute key to match.
 * @param {*} value The attribute value to match.
 * @returns {string|undefined} The matched entity's own address, or undefined if none matches.
 */
export function findAddressByAttribute(rows, key, value) {
  return entities(rows).find((address) => attributesOf(address, rows)?.[key] === value);
}

/**
 * Resolves a constituted entity's own address from its genesis `name` attribute.
 *
 * @summary Finds the address of the entity whose "constituted" attributes name `name`.
 * @param {object[]} rows An in-memory {e,a,v,t} row array (e.g. from readEavtFile).
 * @param {string} name The `name` attribute to match against a constituted entity.
 * @returns {string|undefined} The matched entity's own address, or undefined if none matches.
 */
export function findAddressByName(rows, name) {
  return findAddressByAttribute(rows, "name", name);
}

/**
 * Looks up one named place in an on-disk EAVT trace: its permanent located-in occupants (actors,
 * workbenches, ...), plus the most recent duty events reported-at it — a separate, time-ordered,
 * capped list, since duties accrue without bound while "things" names what is durably there.
 *
 * @summary Reads a place, its located-in things, and its recent reported-at duty events.
 * @param {string} tracePath Path to the on-disk EAVT trace (readEavtFile's own format).
 * @param {string} placeName The `name` attribute to match against a constituted entity.
 * @param {{recentDutyLimit?: number}} [opts] recentDutyLimit caps recentDuties (default 10).
 * @returns {object} `{place, address, placeAttributes, things, recentDuties}` on a match (place is
 *   placeName as given; address is the matched entity's own address; placeAttributes is its
 *   genesis "constituted" cell's object; things is `{address, attributes, fiber}` for every entity
 *   related by (thing, located-in, place), each folded with opts.converse ACTIVE ({}) so any
 *   in-trace has-converse declaration applies; recentDuties is the same shape for the newest-first
 *   `recentDutyLimit` entities related by (duty, reported-at, place)) — or, when the place is not
 *   found, exactly `{place, address: null, placeAttributes: null, things: []}`.
 */
export function look(tracePath, placeName, opts = {}) {
  const recentDutyLimit = opts.recentDutyLimit ?? 10;
  const rows = readEavtEntries({ path: tracePath });
  const placeAddress = findAddressByName(rows, placeName);

  if (placeAddress === undefined) {
    return { place: placeName, address: null, placeAttributes: null, things: [] };
  }

  const placeAttributes = attributesOf(placeAddress, rows);
  const things = relateEavtRows({ rows, predicate: "located-in", object: placeAddress }).subjects.map((address) => ({
    address,
    attributes: attributesOf(address, rows),
    fiber: foldEavtEvidence({ subject: address, rows, converse: {} }).fiber,
  }));

  const genesisT = (address) => rows.find((r) => r.e === address && r.a === "constituted")?.t;
  const recentDuties = relateEavtRows({ rows, predicate: "reported-at", object: placeAddress }).subjects
    .map((address) => ({ address, t: genesisT(address) }))
    .sort((left, right) => (right.t ?? 0) - (left.t ?? 0))
    .slice(0, recentDutyLimit)
    .map(({ address }) => ({
      address,
      attributes: attributesOf(address, rows),
      fiber: foldEavtEvidence({ subject: address, rows }).fiber,
    }));

  return { place: placeName, address: placeAddress, placeAttributes, things, recentDuties };
}
