/** Canonical institutional records, enacted directly rather than converted to work. */
import { mkdirSync, readFileSync, realpathSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { encodeYaml } from "@red-cup-engineering/yaml-frontmatter-codec-service";
import { AGENCY_POOLS, prescribedCarrier, readAgency, resolve } from "./index.mjs";
import { agencyMoved, agencyPoolsAt } from "./held.mjs";
import { agencyActsLog, appendAgencyAct, readAgencyActs, revisionOf } from "./acts.mjs";

export function agencyRecord(agency, pool, id, section = "") {
  if (!AGENCY_POOLS.includes(pool)) throw new TypeError("unknown agency pool");
  const record = resolve(agency, pool, id, section);
  if (record === undefined) return undefined;
  // An absent optional derived field is absent from the institutional record,
  // not an undefined value that makes its complete JSON carrier unreadable.
  return Object.freeze(Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined)));
}

/** The power is resolved from the pre-act state. Neither a method nor a role title is a power. */
export function recordPower(agency, office, pool, source) {
  return office.powers.map((id) => resolve(agency, "deontic-powers", id, office.sectionPath))
    .find((power) => power?.alters === "agency-record" && power.under === office.jurisdiction
      && power.pools?.includes(pool) && power.scope?.some((prefix) =>
        source === prefix.replace(/\/$/u, "") || source.startsWith(prefix.endsWith("/") ? prefix : `${prefix}/`)));
}

/** Validate a governing act's record against its pool. */
function checkRecord(pool, id, record) {
  if (!record || typeof record !== "object" || Array.isArray(record) || record.id !== id
    || typeof record.name !== "string" || !record.name.trim()) throw new TypeError("agency record requires matching id and name");
  const required = { offices: ["normative-structure", "deontic-profile", "jurisdiction"], duties: ["authority", "claim", "work"], works: ["from", "to", "cost"], skills: ["requires-capabilities"], requirements: ["raised-by", "asks", "met-when"], incumbencies: ["office", "holder", "recognition", "induction"] };
  // A duty carrying its own closure (from, to) is its own work, so it needs no `work` reference.
  const carriesClosure = pool === "duties" && record.from !== undefined && record.to !== undefined;
  for (const field of required[pool] ?? []) if (record[field] === undefined && !(carriesClosure && field === "work")) throw new TypeError(`agency record missing ${field}`);
  if (record["formed-from"] !== undefined) throw new TypeError("retired form binding: author the office or duty obligation directly");
  const prescribed = prescribedCarrier(pool, record);
  if (prescribed.length > 0) throw new TypeError(`agency record names who does its work (${prescribed.join(", ")}); staffing is derived, never authored`);
  if (pool === "skills" && (!Array.isArray(record["requires-capabilities"]) || typeof (record.method ?? record.body) !== "string")) throw new TypeError("skill needs operation requirements and a method");
}

/** A record's complete carrier text, with the act that made it. */
function carrierText(source, next) {
  if (!source.endsWith(".md")) return `${JSON.stringify(next, null, 2)}\n`;
  const { body = "", ...head } = next;
  return `---\n${encodeYaml(head)}\n---\n${body}`;
}

/**
 * Enact one governing act on an agency record, after comparing the record's current revision.
 *
 * Where the process has an act log (`AGENCY_ACTS_LOG`, or `log`), as a released node does, the act
 * is appended there as settled state and the registry reads it as the head of the record's chain
 * (./acts.mjs); the authored tree is never written. Without one, as in a working tree, the act
 * replaces the authored carrier itself under a per-record lock.
 */
export function enactAgencyRecord({ root, pool, id, section, expectedRevision, record, act, authorize, log = agencyActsLog() }) {
  if (!AGENCY_POOLS.includes(pool) || !/^[a-z0-9][a-z0-9-]*$/u.test(id)
    || typeof section !== "string" || section.split("/").some((part) => !part || part === "." || part === "..")) {
    throw new TypeError("agency-record-admit: invalid pool, section, or id");
  }
  const key = `${section}#${id}`;
  if (log !== undefined) {
    appendAgencyAct(log, () => {
      const agency = readAgency(root, { acts: readAgencyActs(log), pools: agencyPoolsAt(root) });
      const existing = agency[pool].get(key);
      if (existing?.derivedFrom !== undefined) throw new TypeError(`agency-record-admit: ${key} is carried by ${existing.derivedFrom}; amend that record`);
      const source = existing?.source ?? `${section}/lib/agency/${pool}/${id}.json`;
      if (!path.resolve(root, source).startsWith(`${path.resolve(root)}${path.sep}`)) throw new TypeError("agency record outside root");
      const authority = authorize({ agency, pool, source, existing, record: record });
      checkRecord(pool, id, record);
      const before = existing?.revision ?? agency.problems.find((problem) => problem.file === source)?.revision ?? null;
      if (before !== expectedRevision) throw new TypeError("agency-record-admit: authored record changed; reread its revision");
      const text = carrierText(source, { ...record, "last-governance-act": { ...act, authority, before } });
      return { kind: "organizing.agency-act", pool, id, section, source, before, after: revisionOf(text), text, at: act.at };
    });
    return agencyRecord(readAgency(root, { acts: readAgencyActs(log), pools: agencyPoolsAt(root) }), pool, key);
  }
  const agency = readAgency(root, { acts: [], pools: agencyPoolsAt(root) });
  const existing = agency[pool].get(key);
  if (existing?.derivedFrom !== undefined) throw new TypeError(`agency-record-admit: ${key} is carried by ${existing.derivedFrom}; amend that record`);
  const source = existing?.source ?? `${section}/lib/agency/${pool}/${id}.json`;
  const file = path.resolve(root, source);
  const realRoot = realpathSync(root);
  // Resolve the section before making directories, rejecting symlink escapes.
  if (!realpathSync(path.join(root, section)).startsWith(`${realRoot}${path.sep}`)) throw new TypeError("agency record outside root");
  if (existing && !realpathSync(file).startsWith(`${realRoot}${path.sep}`)) throw new TypeError("agency record outside root");
  const authority = authorize({ agency, pool, source, existing, record: record });
  checkRecord(pool, id, record);
  mkdirSync(path.dirname(file), { recursive: true });
  if (!realpathSync(path.dirname(file)).startsWith(`${realRoot}${path.sep}`)) throw new TypeError("agency record outside root");
  const lock = `${file}.enacting`;
  mkdirSync(lock); // A concurrent act is an obstruction, never an overwrite.
  const temporary = path.join(lock, randomUUID());
  try {
    let bytes;
    try { bytes = readFileSync(file); } catch (error) { if (error.code !== "ENOENT") throw error; }
    const revision = bytes === undefined ? null : revisionOf(bytes);
    if (revision !== expectedRevision) throw new TypeError("agency-record-admit: authored record changed; reread its revision");
    writeFileSync(temporary, carrierText(source, { ...record, "last-governance-act": { ...act, authority, before: revision } }), { flag: "wx" });
    renameSync(temporary, file);
    agencyMoved(root, file);
    return agencyRecord(readAgency(root, { acts: [], pools: agencyPoolsAt(root) }), pool, key);
  } finally { rmSync(lock, { recursive: true }); }
}

/**
 * Enact one governing act that changes several records at once (a founding: the work, the duty, the
 * office and the enterprise listing it), each against its current revision and each authorized on
 * its own. With an act log every entry is appended under the log's one lock, so the act stands whole
 * or not at all; without one each record is replaced in turn. `authorize` is asked of every entry
 * against the registry as it stood before the act.
 * @param {{ root: string, entries: ReadonlyArray<{ pool: string, id: string, section: string, expectedRevision: string | null, record: object }>, act: object, authorize: Function, log?: string }} options
 */
export function enactAgencyRecords({ root, entries, act, authorize, log = agencyActsLog() }) {
  for (const { pool, id, section } of entries) {
    if (!AGENCY_POOLS.includes(pool) || !/^[a-z0-9][a-z0-9-]*$/u.test(id)
      || typeof section !== "string" || section.split("/").some((part) => !part || part === "." || part === "..")) {
      throw new TypeError("governing act: invalid pool, section, or id");
    }
  }
  if (log === undefined) return Object.freeze(entries.map((entry) => enactAgencyRecord({ root, ...entry, act, authorize, log })));
  appendAgencyAct(log, () => {
    const agency = readAgency(root, { acts: readAgencyActs(log), pools: agencyPoolsAt(root) });
    return entries.map(({ pool, id, section, expectedRevision, record }) => {
      const existing = agency[pool].get(`${section}#${id}`);
      if (existing?.derivedFrom !== undefined) throw new TypeError(`governing act: ${section}#${id} is carried by ${existing.derivedFrom}; amend that record`);
      const source = existing?.source ?? `${section}/lib/agency/${pool}/${id}.json`;
      if (!path.resolve(root, source).startsWith(`${path.resolve(root)}${path.sep}`)) throw new TypeError("agency record outside root");
      const authority = authorize({ agency, pool, source, existing, record: record });
      checkRecord(pool, id, record);
      const before = existing?.revision ?? agency.problems.find((problem) => problem.file === source)?.revision ?? null;
      if (before !== expectedRevision) throw new TypeError(`governing act: ${source} changed; reread its revision`);
      const text = carrierText(source, { ...record, "last-governance-act": { ...act, authority, before } });
      return { kind: "organizing.agency-act", pool, id, section, source, before, after: revisionOf(text), text, at: act.at };
    });
  });
  const agency = readAgency(root, { acts: readAgencyActs(log), pools: agencyPoolsAt(root) });
  return Object.freeze(entries.map(({ pool, id, section }) => agencyRecord(agency, pool, `${section}#${id}`)));
}
