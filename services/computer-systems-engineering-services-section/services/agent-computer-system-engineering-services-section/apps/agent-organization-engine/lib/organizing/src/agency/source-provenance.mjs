/** Source evidence for authored agency records. No function here grants custody,
 * office authority, or public disclosure. The import owner supplies authentic
 * observations and the original native import witness; validating caller data
 * alone never establishes either of those admissions. */
import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { makeNiUri, isNiUri } from "@red-cup-engineering/uri-services-section/ni-uri";
import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { gitSourceWorkingCopyBindingSchema } from "@red-cup-engineering/git-services-section/git-command-codec";
import { parseGitmodules } from "@red-cup-engineering/git-services-section/gitmodules";
import { semanticId } from "@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address";
import { artifactId } from "@red-cup-engineering/semiotic-eavt-services-section/identity";
import { each, has, put } from "@red-cup-engineering/semiotic-eavt-services-section/store";
import { revisionOf } from "./acts.mjs";
import { AGENCY_POOLS } from "./index.mjs";

export const AGENCY_SOURCE_PROJECTION_KIND = "organizing.agency-source-projection";
/** The store type of a source projection: a record whose cause is the original native import. */
export const AGENCY_SOURCE_PROJECTION_TYPE = "agency-source-projection";
/** The store type the import owner's native import witnesses are held under, in the same custody root. */
export const AGENCY_SOURCE_IMPORT_TYPE = "agency-source-import";
const DEFAULT_TOLD = Object.freeze({ for: true, against: false });
const copyContract = schemaFrom({ $id: "organizing/agency/source-copy", ...gitSourceWorkingCopyBindingSchema });
const requiredText = { type: "string", minLength: 1 };
const gitId = { type: "string", pattern: "^([a-f0-9]{40}|[a-f0-9]{64})$" };
const revision = { type: "string", pattern: "^[a-f0-9]{64}$" };
const closed = properties => ({ type: "object", required: Object.keys(properties), properties, additionalProperties: false });
const targetSchema = closed({ pool: { enum: AGENCY_POOLS }, key: requiredText, source: requiredText,
  sectionPath: { type: "string" }, id: requiredText, revision });
const sourceIdentitySchema = closed({ sourceRepository: requiredText, commit: gitId });
const fileSchema = closed({ copy: gitSourceWorkingCopyBindingSchema, path: requiredText, blob: gitId,
  mode: { enum: ["100644", "100755"] }, material: closed({ encoding: { const: "base64" }, bytes: { type: "string" }, revision }) });
const parentSchema = closed({ parent: fileSchema,
  gitlink: closed({ path: requiredText, mode: { const: "160000" }, type: { const: "commit" }, commit: gitId, observedUnder: requiredText }),
  child: sourceIdentitySchema });
const correspondenceFields = { target: targetSchema,
  source: closed({ sourceRepository: requiredText, commit: gitId, path: requiredText, blob: gitId }),
  parents: { type: "array", maxItems: 16, items: closed({ sourceRepository: requiredText, commit: gitId,
    gitmodules: gitId, path: requiredText, child: sourceIdentitySchema }) } };
export const agencySourceProjectionSchema = { $id: "organizing/agency/source-projection", ...closed({
  kind: { const: AGENCY_SOURCE_PROJECTION_KIND }, version: { const: 1 }, target: targetSchema, source: fileSchema,
  parents: { type: "array", maxItems: 16, items: parentSchema },
  correspondence: closed({ ...correspondenceFields, exact: closed({ encoding: { const: "utf8-json-tuple-v1" }, id: requiredText }), id: requiredText }),
  imported: closed({ witness: requiredText, at: requiredText, sourceBinding: requiredText, sourcePath: requiredText,
    target: targetSchema, parents: { type: "array", maxItems: 16, items: closed({ sourceBinding: requiredText, path: requiredText }) }, exact: requiredText }),
}) };
export const agencySourceProjectionContract = schemaFrom(agencySourceProjectionSchema);

const MAX_BYTES = 1024 * 1024;
const MAX_PARENTS = 16;
const sha256 = /^[a-f0-9]{64}$/u;
const fail = message => { throw new TypeError(`agency source projection: ${message}`); };
const text = (value, label) => {
  if (typeof value !== "string" || value.trim() === "") fail(`${label} is required`);
  return value;
};
const sourcePath = (value, label) => {
  text(value, label);
  if (value.startsWith("/") || /[\\\0\r\n]/u.test(value)
      || value.split("/").some(part => !part || [".", "..", ".git"].includes(part))) fail(`${label} must be an exact relative source path`);
  return value;
};
const freeze = value => {
  if (value && typeof value === "object") {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
};
function copyOf(value) {
  copyContract.assert(value);
  const copy = structuredClone(value);
  const { id, ...content } = copy;
  if (artifactId(content) !== id) fail("source copy identity differs from its carried content");
  for (const key of ["sourceRepository", "ref", "commit"])
    if (copy.custody[key] !== copy[key]) fail("source selection differs from its custody witness");
  return copy;
}
function blobOf(observation, budget) {
  const copy = copyOf(observation?.sourceBinding);
  const path = sourcePath(observation.path, "Git source path");
  const entry = observation.entry;
  if (!entry || !["100644", "100755"].includes(entry.mode) || entry.type !== "blob") fail("source must be an observed regular Git blob");
  if (!(observation.bytes instanceof Uint8Array)) fail("complete observed source bytes are required");
  const bytes = Buffer.from(observation.bytes);
  budget.bytes += bytes.length;
  if (budget.bytes > MAX_BYTES) fail("source projection exceeds the one MiB observation bound");
  const algorithm = copy.commit.length === 40 ? "sha1" : "sha256";
  const object = createHash(algorithm).update(`blob ${bytes.length}\0`).update(bytes).digest("hex");
  if (entry.object !== object) fail("observed bytes differ from the selected Git blob");
  return { copy, path, blob: object, mode: entry.mode,
    material: { encoding: "base64", bytes: bytes.toString("base64"), revision: revisionOf(bytes) } };
}
function targetOf(record, bytes, pool) {
  if (!AGENCY_POOLS.includes(pool)) fail("actual receiving agency pool is required");
  if (!record || !(bytes instanceof Uint8Array)) fail("actual receiving record and complete readback bytes are required");
  for (const key of ["key", "source", "id", "revision"]) text(record[key], `record ${key}`);
  sourcePath(record.source, "agency source");
  if (typeof record.sectionPath !== "string" || record.key !== `${record.sectionPath}#${record.id}`) fail("record key and authored section disagree");
  if (record.sectionPath !== "") sourcePath(record.sectionPath, "agency section");
  if (record.sectionPath && !record.source.startsWith(`${record.sectionPath}/`)) fail("record source is outside its authored section");
  if (!sha256.test(record.revision) || revisionOf(bytes) !== record.revision) fail("receiver bytes differ from its exact record revision");
  return { pool, key: record.key, source: record.source, sectionPath: record.sectionPath, id: record.id, revision: record.revision };
}

/** Validate a byte-preserving projection supplied by the qualified import reader.
 * Git tree membership and repository custody are observations of that reader,
 * not facts established merely by this function's shape/content checks. */
export function prepareAgencySourceProjection({ source, parents = [], record, pool, receivedBytes, imported }) {
  if (!Array.isArray(parents) || parents.length > MAX_PARENTS) fail("parent proof must be bounded and ordered root to leaf");
  text(imported?.witness, "original native import witness");
  text(imported?.at, "original import time");
  if (!Number.isFinite(Date.parse(imported.at))) fail("original import time is invalid");
  const budget = { bytes: 0 };
  const leaf = blobOf(source, budget);
  const target = targetOf(record, receivedBytes, pool);
  if (leaf.material.revision !== target.revision) fail("source bytes were not received unchanged");
  let child = leaf.copy;
  let composedPath = leaf.path;
  const proof = [];
  const visited = new Set([`${child.sourceRepository}\0${child.commit}`]);
  for (const parent of [...parents].reverse()) {
    const modules = blobOf(parent.gitmodules, budget);
    if (modules.path !== ".gitmodules") fail("parent declarations must be the committed .gitmodules blob");
    const link = parent.gitlink;
    const path = sourcePath(link?.path, "parent gitlink path");
    if (copyOf(link.sourceBinding).id !== modules.copy.id) fail("gitlink and declaration were observed under different parent custody");
    if (link.mode !== "160000" || link.type !== "commit" || link.object !== child.commit) fail("parent gitlink does not select the child's exact commit");
    const entries = parseGitmodules(Buffer.from(modules.material.bytes, "base64").toString("utf8"));
    const matching = entries.filter(entry => entry.url === child.sourceRepository);
    if (matching.length !== 1 || matching[0].path !== path || matching[0].update === "none"
        || entries.filter(entry => entry.path === path).length !== 1) fail("parent source declaration is missing, ambiguous, or not composed");
    const key = `${modules.copy.sourceRepository}\0${modules.copy.commit}`;
    if (visited.has(key)) fail("parent composition repeats a source snapshot");
    visited.add(key);
    proof.unshift({ parent: modules, gitlink: { path, mode: link.mode, type: link.type, commit: link.object, observedUnder: modules.copy.id }, child: { sourceRepository: child.sourceRepository, commit: child.commit } });
    composedPath = `${path}/${composedPath}`;
    child = modules.copy;
  }
  if (composedPath !== target.source) fail("source composition does not name the received agency source");
  const importSelection = { sourceBinding: leaf.copy.id, sourcePath: leaf.path, target,
    parents: proof.map(edge => ({ sourceBinding: edge.parent.copy.id, path: edge.gitlink.path })) };
  importSelection.exact = makeNiUri(Buffer.from(JSON.stringify([
    importSelection.sourceBinding, importSelection.sourcePath,
    [target.pool, target.key, target.source, target.sectionPath, target.id, target.revision],
    importSelection.parents.map(edge => [edge.sourceBinding, edge.path]),
  ]), "utf8"));
  if (imported.exact !== importSelection.exact || imported.sourceBinding !== importSelection.sourceBinding || imported.sourcePath !== importSelection.sourcePath
      || !isDeepStrictEqual(imported.target, target)
      || !isDeepStrictEqual(imported.parents, importSelection.parents))
    fail("original native import does not bind this source, composition and received record");
  const correspondence = {
    target,
    source: { sourceRepository: leaf.copy.sourceRepository, commit: leaf.copy.commit, path: leaf.path, blob: leaf.blob },
    parents: proof.map(edge => ({ sourceRepository: edge.parent.copy.sourceRepository, commit: edge.parent.copy.commit,
      gitmodules: edge.parent.blob, path: edge.gitlink.path, child: edge.child })),
  };
  // Git names are byte-sensitive even when semantic strings are equivalent.
  // Keep their exact selection committed inside the existing semantic carrier.
  const exactTuple = [
    [target.pool, target.key, target.source, target.sectionPath, target.id, target.revision],
    [leaf.copy.sourceRepository, leaf.copy.commit, leaf.path, leaf.blob],
    proof.map(edge => [edge.parent.copy.sourceRepository, edge.parent.copy.commit,
      edge.parent.blob, edge.gitlink.path, edge.child.sourceRepository, edge.child.commit]),
  ];
  correspondence.exact = { encoding: "utf8-json-tuple-v1", id: makeNiUri(Buffer.from(JSON.stringify(exactTuple), "utf8")) };
  const projection = { kind: AGENCY_SOURCE_PROJECTION_KIND, version: 1, target, source: leaf, parents: proof,
    correspondence: { ...correspondence, id: artifactId(correspondence) },
    imported: { witness: imported.witness, at: imported.at, ...importSelection } };
  agencySourceProjectionContract.assert(projection);
  return freeze(projection);
}

/** Revalidate persisted proof bytes and relations; no persisted `valid: true`
 * flag can substitute for the original carrier or the current record revision. */
function readProjection(value, record) {
  agencySourceProjectionContract.assert(value);
  if (value?.kind !== AGENCY_SOURCE_PROJECTION_KIND || value.version !== 1) fail("unsupported source projection carrier");
  const observation = file => ({ sourceBinding: file.copy, path: file.path,
    entry: { mode: file.mode, type: "blob", object: file.blob }, bytes: Buffer.from(file.material.bytes, "base64") });
  const rebuilt = prepareAgencySourceProjection({ source: observation(value.source),
    parents: value.parents.map(edge => ({ gitmodules: observation(edge.parent),
      gitlink: { ...edge.gitlink, object: edge.gitlink.commit, sourceBinding: edge.parent.copy } })),
    record, pool: value.target.pool, receivedBytes: Buffer.from(value.source.material.bytes, "base64"), imported: value.imported });
  if (!isDeepStrictEqual(rebuilt, value)) fail("persisted source projection differs from its checked carrier");
  return rebuilt;
}

/** Return correspondence evidence only. Complete/private source material stays
 * in the native journal and is never returned to the public GitHub receiver. */
export function selectAgencySourceProjection(rows, record) {
  const relevant = rows.filter(row => row.record?.target?.source === record?.source
    && row.record?.target?.key === record?.key && row.record?.target?.revision === record?.revision);
  const byProof = new Map();
  const refused = [];
  for (const row of relevant) {
    let projection;
    try {
      projection = readProjection(row.record, record);
    }
    catch {
      refused.push({ ...(isNiUri(row.id) ? { id: row.id } : {}), reason: "invalid-source-projection" });
      continue;
    }
    const prior = byProof.get(row.id) ?? { projection, for: false, against: false };
    prior.for ||= row.told?.for === true;
    prior.against ||= row.told?.against === true;
    byProof.set(row.id, prior);
  }
  const candidates = new Map();
  for (const [id, entry] of byProof) {
    if (!entry.for || entry.against) { refused.push({ id, reason: entry.against ? "denied-or-contested" : "unknown" }); continue; }
    const key = entry.projection.correspondence.id;
    const candidate = candidates.get(key) ?? { correspondence: entry.projection.correspondence, witnesses: [] };
    candidate.witnesses.push({ id });
    candidates.set(key, candidate);
  }
  if (refused.length > 0) return freeze({ state: "unresolved", reason: "source-evidence-refused", refused });
  if (candidates.size !== 1) return freeze({ state: "unresolved", reason: candidates.size ? "ambiguous-source-correspondence" : "source-provenance-absent", candidates: [...candidates.keys()] });
  const selected = [...candidates.values()][0];
  return freeze({ state: "held", ...selected });
}

/** The rows of a custody root's source projections, as selection reads them: the address is the identity,
 * and the cause and the charge are the store's `causes` and `told` members taken off the projection. */
function projectionRows(root) {
  return [...each(root, AGENCY_SOURCE_PROJECTION_TYPE)].map(({ address, record }) => {
    const { causes: _causes, told, ...projection } = record;
    return { id: address, record: projection, told: told ?? DEFAULT_TOLD };
  });
}

/** A source import owner binds these readers to its already admitted operation.
 * The only request is an original native import witness; caller-written source
 * or authority fields are not accepted. This creates no public operation. A projection is
 * recorded here when the original import is held in this custody root (as an
 * `agency-source-import` record); an import held elsewhere is proposed, not recorded. */
export function agencySourceProjectionReceiving({ root, readImport, observeSource, readReceived }) {
  if (typeof readImport !== "function" || typeof observeSource !== "function" || typeof readReceived !== "function") fail("qualified import, source and receiving readers are required");
  text(root, "native journal custody root");
  return Object.freeze({
    async receive(witness) {
      text(witness, "original native import witness");
      const imported = await readImport(witness);
      if (!imported || imported.witness !== witness) fail("original native import is unavailable");
      const observation = await observeSource(imported);
      const received = await readReceived(imported);
      const projection = prepareAgencySourceProjection({ ...observation, record: received?.record, pool: received?.pool,
        receivedBytes: received?.bytes, imported });
      const stored = freeze({ ...projection, causes: [{ type: AGENCY_SOURCE_IMPORT_TYPE, id: witness }] });
      const address = semanticId(stored);
      const recorded = isNiUri(witness) && has(root, AGENCY_SOURCE_IMPORT_TYPE, witness);
      let appended = 0;
      if (recorded) {
        appended = has(root, AGENCY_SOURCE_PROJECTION_TYPE, address) ? 0 : 1;
        put(root, AGENCY_SOURCE_PROJECTION_TYPE, stored);
      }
      const current = await readReceived(imported);
      const rows = projectionRows(root);
      let selection;
      try {
        targetOf(current?.record, current?.bytes, current?.pool);
        selection = selectAgencySourceProjection(rows, current.record);
      } catch {
        selection = { state: "unresolved", reason: "current-readback-invalid" };
      }
      return freeze({ state: selection.state, recorded, ...(recorded ? { witness: address } : { proposed: address }), appended,
        record: projection.target, selection });
    },
    read(record) { return selectAgencySourceProjection(projectionRows(root), record); },
  });
}
