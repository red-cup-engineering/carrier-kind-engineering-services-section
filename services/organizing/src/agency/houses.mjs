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
    // A section of this pool is named the same way from this pool's root: its key is local, never a house.
    if (agency.sections?.has(parts.house)) return Object.freeze({ reading: "unresolved", reason: "the section does not seat it" });
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

/**
 * The estate directory a pool root lies in. A configured estate (`ORGANIZING_ESTATE_ROOT`) wins, and a root
 * outside it has none. Otherwise it is the outermost `lib` at the top of a repository (beside its `.git`),
 * so a checkout under `/var/lib` still finds its own; failing that, the outermost ancestor named `lib`.
 */
export function estateRootOf(root, { configured = process.env.ORGANIZING_ESTATE_ROOT, exists = existsSync } = {}) {
  const at = path.resolve(root);
  if (configured) {
    const estate = path.resolve(configured);
    return at === estate || at.startsWith(`${estate}${path.sep}`) ? estate : undefined;
  }
  let outermost, atRepository;
  for (let dir = at; path.dirname(dir) !== dir; dir = path.dirname(dir)) {
    if (path.basename(dir) !== "lib") continue;
    outermost = dir;
    if (exists(path.join(path.dirname(dir), ".git"))) atRepository = dir;
  }
  return atRepository ?? outermost;
}

/** The address another house names `record` of `agency` by: the pool's estate path, its section, and its id. */
export function addressFrom(estateRoot, agency, record) {
  const house = path.relative(estateRoot, agency.root).split(path.sep).join("/");
  return `${house}${record.sectionPath ? `/${record.sectionPath}` : ""}#${record.id}`;
}

const NAMED_BACK = Object.freeze({ "presides-over": "reports-to", serves: "served-by" });

/**
 * Whether `target`, a record in another house, names `from` back across an edge of `kind`: a presided
 * office names its presider in `reports-to`, a served office names who serves it in `served-by`. One house
 * never grants itself standing over another house's offices on its own say-so: a cross-house edge confers
 * reach only when the other house's own record names it back.
 */
export function reciprocates(target, kind, from) {
  const field = NAMED_BACK[kind];
  if (field === undefined) return false;
  const raw = target?.authored?.[field] ?? target?.[field];
  return (Array.isArray(raw) ? raw : [raw]).includes(from);
}

/**
 * Every cross-house `presides-over` edge of `agency`'s offices, each with its reading and whether it grants:
 * a cross-house edge always resolves and is shown; it confers reach only under reciprocity.
 */
export function crossHouseEdges(agency, { estateRoot = estateRootOf(agency.root), across = estateRoot && houseResolver(estateRoot) } = {}) {
  if (!across) return [];
  const edges = [];
  for (const office of agency.offices.values()) for (const ref of office.presidesOver ?? []) {
    if (resolve(agency, "offices", ref, office.sectionPath) !== undefined || houseReference(ref) === undefined) continue;
    const reading = across(agency, "offices", ref, office.sectionPath);
    edges.push(Object.freeze({ from: office.key, to: ref, kind: "presides-over", reading: reading.reading,
      grants: reading.reading === "resolved" && reading.house !== null && reciprocates(reading.record, "presides-over", addressFrom(estateRoot, agency, office)) }));
  }
  return edges;
}
