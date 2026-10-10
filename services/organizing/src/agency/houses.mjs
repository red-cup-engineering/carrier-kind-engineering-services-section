/**
 * Cross-house references: an agency edge that names a record seated in another house.
 *
 * A firm pool is one house's agency, read from its own root; widening it to span every house would
 * dissolve section custody. A record in another house is named instead by `<house-section-path>#<id>`,
 * the house's path in the estate and the record's id there, and resolved against that house's own
 * mounted pool root (the forest mounts each house at its directory path). The reference resolves when
 * the house is present, reads "house-not-mounted" when it is not, and reads "unresolved" when the house
 * is present but does not seat the record. Nothing is guessed: a missing house is never a missing record.
 */
import { existsSync } from "node:fs";
import path from "node:path";
import { agencyPools, readAgency, resolve } from "./index.mjs";

const HOUSE_REFERENCE = /^([a-z0-9][a-z0-9.-]*(?:\/[a-z0-9][a-z0-9.-]*)+)#([a-z0-9]+(?:-[a-z0-9]+)*)$/u;

/** A house reference's parts, or undefined when `ref` is not one. */
export function houseReference(ref) {
  const match = typeof ref === "string" ? HOUSE_REFERENCE.exec(ref) : null;
  return match ? Object.freeze({ house: match[1], id: match[2] }) : undefined;
}

/**
 * A resolver over the estate at `estateRoot` (the directory house paths are relative to). It reads each
 * house's registry once, from its own root, and answers
 *   { reading: "resolved", record, house }       the record, from this pool (house null) or its house's
 *   { reading: "house-not-mounted", house }       the house is not present in this estate
 *   { reading: "unresolved", house?, reason }     no such record where the reference points
 */
export function houseResolver(estateRoot, { read = (root) => readAgency(root, { acts: [], pools: agencyPools(root) }) } = {}) {
  const houses = new Map();
  return function resolveAcrossHouses(agency, pool, ref, fromSectionPath = "") {
    const local = resolve(agency, pool, ref, fromSectionPath);
    if (local !== undefined) return Object.freeze({ reading: "resolved", record: local, house: null });
    const parts = houseReference(ref);
    if (parts === undefined) return Object.freeze({ reading: "unresolved", reason: "not seated in this pool" });
    const root = path.join(estateRoot, parts.house);
    if (!existsSync(path.join(root, "lib", "agency"))) return Object.freeze({ reading: "house-not-mounted", house: parts.house });
    if (!houses.has(root)) houses.set(root, read(root));
    const house = houses.get(root);
    const record = house[pool]?.get(`#${parts.id}`) ?? resolve(house, pool, parts.id, "");
    return record === undefined
      ? Object.freeze({ reading: "unresolved", house: parts.house, reason: "the house does not seat it" })
      : Object.freeze({ reading: "resolved", record, house: parts.house });
  };
}
