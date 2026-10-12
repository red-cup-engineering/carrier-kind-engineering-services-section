/**
 * writing/atproto — AT Protocol as a second across-federation wire for socializing.
 *
 * AT Protocol is not a second social ontology here. A per-actor signed repo is
 * read as an RWIL witness log scoped to one observer: each commit operation is a
 * witnessed cell, Lexicon is a typed carrier declaration, and the firehose is
 * socializing.broadcast projected as repository events.
 */

import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { canonical } from "@red-cup-engineering/json-services-section";
import { evidence } from "@red-cup-engineering/signcell/cell";
import { cell } from "@red-cup-engineering/eavt-services-section/ledger/cells";

import { mergeCrdtStates } from "../crdt/index.mjs";
import { jsonResource } from "@red-cup-engineering/json-services-section";

const cidSchema = {
  type: "string",
  minLength: 1,
  description: "CID text carried opaquely; content addressing belongs to the AT repo wire.",
};

const atRepoOperationSchema = {
  type: "object",
  required: ["action", "path"],
  properties: {
    action: { enum: ["create", "update", "delete"] },
    path: {
      type: "string",
      minLength: 3,
      pattern: "^[A-Za-z0-9._~-]+\\/[A-Za-z0-9._~-]+$",
      description: "AT repo path: <collection NSID>/<record-key>.",
    },
    cid: cidSchema,
    record: { description: "Lexicon-shaped record value, retained as JSON." },
  },
  additionalProperties: false,
};

const atRepoRecordSchema = {
  type: "object",
  required: ["path", "cid", "record"],
  properties: {
    path: atRepoOperationSchema.properties.path,
    cid: cidSchema,
    record: { description: "Current record JSON for this path." },
  },
  additionalProperties: false,
};

export const AtRepoCommitSchema = {
  $id: "socializing/writing/atproto/repo-commit",
  title: "AT Protocol repo commit as RWIL witness step",
  description:
    "A signed per-actor AT Protocol repository commit read as one observer-scoped RWIL witness step. Operations are the witnessed cells; the signature is retained as witness metadata.",
  type: "object",
  required: ["kind", "did", "version", "rev", "data", "prev", "sig", "ops"],
  properties: {
    kind: { const: "socializing.atproto.repo.commit" },
    did: { type: "string", pattern: "^did:[a-z0-9]+:.+" },
    version: { const: 3 },
    rev: { type: "string", minLength: 1 },
    data: cidSchema,
    prev: { description: "Previous commit CID, or null for the root commit." },
    sig: { type: "string", minLength: 1 },
    ops: { type: "array", items: atRepoOperationSchema },
  },
  additionalProperties: false,
};

export const atRepoCommitCarrier = schemaFrom(AtRepoCommitSchema);

export const AtRepoSchema = {
  $id: "socializing/writing/atproto/repo",
  title: "AT Protocol repo as observer RWIL log",
  description:
    "A normalized AT Protocol per-actor repository: current records plus the signed commit sequence whose operations project functorially to RWIL cells.",
  type: "object",
  required: ["kind", "did", "head", "commits", "records"],
  properties: {
    kind: { const: "socializing.atproto.repo" },
    did: { type: "string", pattern: "^did:[a-z0-9]+:.+" },
    head: { type: "string", minLength: 1 },
    commits: { type: "array", items: AtRepoCommitSchema },
    records: { type: "array", items: atRepoRecordSchema },
  },
  additionalProperties: false,
};

export const atRepoCarrier = schemaFrom(AtRepoSchema);

export const AtLexiconSchema = {
  $id: "socializing/writing/atproto/lexicon",
  title: "AT Protocol Lexicon document",
  description:
    "An AT Protocol Lexicon file admitted as a typed carrier declaration. The Lexicon schema is the protocol's carrier source; schemaFrom supplies the local validation surface.",
  type: "object",
  required: ["lexicon", "id", "defs"],
  properties: {
    lexicon: { const: 1 },
    id: { type: "string", minLength: 1 },
    description: { type: "string" },
    defs: { type: "object" },
  },
  additionalProperties: false,
};

export const atLexiconCarrier = schemaFrom(AtLexiconSchema);

export const AtFirehoseCommitSchema = {
  $id: "socializing/writing/atproto/firehose-commit",
  title: "AT Protocol firehose commit event",
  description:
    "The broadcast face of an AT repo commit: a sequence-addressed repository event compatible with the com.atproto.sync.subscribeRepos commit reading.",
  type: "object",
  required: ["kind", "seq", "repo", "commit", "rev", "time", "ops"],
  properties: {
    kind: { const: "socializing.atproto.firehose.commit" },
    seq: { type: "integer", minimum: 0 },
    repo: { type: "string", pattern: "^did:[a-z0-9]+:.+" },
    commit: cidSchema,
    rev: { type: "string", minLength: 1 },
    time: { type: "string", minLength: 1 },
    ops: { type: "array", items: atRepoOperationSchema },
  },
  additionalProperties: false,
};

export const atFirehoseCommitCarrier = schemaFrom(AtFirehoseCommitSchema);

const sortedBy = (values, key) =>
  Object.freeze([...values].sort((left, right) => key(left).localeCompare(key(right))));

function repoWitness(commit) {
  return Object.freeze({
    protocol: "atproto",
    did: commit.did,
    rev: commit.rev,
    commit: commit.data,
    prev: commit.prev,
    sig: commit.sig,
  });
}

function entityOf(did, path) {
  return Object.freeze({ protocol: "atproto", did, path });
}

function attributeOf(op) {
  const [collection] = op.path.split("/");
  return Object.freeze({
    protocol: "atproto",
    collection,
    action: op.action,
    cid: op.cid ?? null,
  });
}

function valueOfOperation(op) {
  return op.action === "delete" ? null : (op.record);
}

function pathOfEntity(entity) {
  if (entity === null || typeof entity !== "object" || Array.isArray(entity)) throw new TypeError("atproto entity is not a record");
  const path = (entity)["path"];
  if (typeof path !== "string") throw new TypeError("atproto entity is missing path");
  return path;
}

function didOfEntity(entity) {
  if (entity === null || typeof entity !== "object" || Array.isArray(entity)) throw new TypeError("atproto entity is not a record");
  const did = (entity)["did"];
  if (typeof did !== "string") throw new TypeError("atproto entity is missing did");
  return did;
}

function operationOf(row) {
  if (row.a === null || typeof row.a !== "object" || Array.isArray(row.a)) throw new TypeError("atproto row attribute is not an operation");
  const attribute = row.a;
  const action = attribute["action"];
  const path = pathOfEntity(row.e);
  if (action !== "create" && action !== "update" && action !== "delete") throw new TypeError("atproto row operation has invalid action");
  return Object.freeze({
    action,
    path,
    ...(typeof attribute["cid"] === "string" ? { cid: attribute["cid"] } : {}),
    ...(action === "delete" ? {} : { record: row.v }),
  });
}

function commitWitnessOf(row) {
  if (row.t === null || typeof row.t !== "object" || Array.isArray(row.t)) throw new TypeError("atproto row witness is not a record");
  return row.t;
}

function evidenceOf(witness) {
  const w = witness;
  return evidence({ for: [w] });
}

/** Build and admit one normalized AT repo commit. */
export function atRepoCommit(input

) {
  return atRepoCommitCarrier.assert(Object.freeze({
    kind: "socializing.atproto.repo.commit",
    did: input.did,
    version: 3,
    rev: input.rev,
    data: input.data,
    prev: input.prev ?? null,
    sig: input.sig,
    ops: sortedBy(input.ops, (op) => `${op.path}:${op.action}:${op.cid ?? ""}`),
  }));
}

/** Build a normalized per-actor repo from commits, deriving the current record view. */
export function atRepo(did, commits) {
  const admitted = sortedBy(commits.map((commit) => atRepoCommitCarrier.assert(commit)), (commit) => commit.rev);
  const records = new Map();
  for (const commit of admitted) {
    if (commit.did !== did) throw new TypeError(`atRepo: commit ${commit.rev} belongs to ${commit.did}, not ${did}`);
    for (const op of commit.ops) {
      if (op.action === "delete") records.delete(op.path);
      else records.set(op.path, Object.freeze({
        path: op.path,
        cid: op.cid ?? `${commit.data}:${op.path}`,
        record: op.record,
      }));
    }
  }
  const head = admitted.at(-1)?.rev ?? "";
  return atRepoCarrier.assert(Object.freeze({
    kind: "socializing.atproto.repo",
    did,
    head,
    commits: admitted,
    records: sortedBy([...records.values()], (record) => record.path),
  }));
}

/** Project a signed repo commit to RWIL rows: commits are witnesses. */
export function witnessLogFromAtRepoCommit(commit) {
  const admitted = atRepoCommitCarrier.assert(commit);
  return Object.freeze(admitted.ops.map((op) => cell(entityOf(admitted.did, op.path), attributeOf(op), valueOfOperation(op), repoWitness(admitted))));
}

/** Project a per-actor repo to its observer-scoped RWIL witness log. */
export function witnessLogFromAtRepo(repo) {
  const admitted = atRepoCarrier.assert(repo);
  return Object.freeze(admitted.commits.flatMap((commit) => witnessLogFromAtRepoCommit(commit)));
}

/** Reconstruct the normalized AT repo view from the RWIL rows produced above. */
export function atRepoFromWitnessLog(rows) {
  if (rows.length === 0) throw new TypeError("atRepoFromWitnessLog: empty witness log has no actor DID");
  const did = didOfEntity(rows[0].e);
  const groups = new Map();
  for (const row of rows) {
    const rowDid = didOfEntity(row.e);
    if (rowDid !== did) throw new TypeError(`atRepoFromWitnessLog: mixed DID log ${did} and ${rowDid}`);
    const witness = commitWitnessOf(row);
    const rev = witness["rev"];
    if (typeof rev !== "string") throw new TypeError("atRepoFromWitnessLog: commit witness missing rev");
    const group = groups.get(rev) ?? { witness, ops: [] };
    group.ops.push(operationOf(row));
    groups.set(rev, group);
  }
  return atRepo(did, [...groups.values()].map(({ witness, ops }) => atRepoCommit({
    did,
    rev: witness["rev"],
    data: witness["commit"],
    prev: typeof witness["prev"] === "string" ? witness["prev"] : null,
    sig: witness["sig"],
    ops,
  })));
}

export const atRepoLogReading = Object.freeze({
  id: "socializing.atproto.repo",
  toWire: atRepoFromWitnessLog,
  fromWire: witnessLogFromAtRepo,
});

/** Project one commit as socializing.broadcast over the AT firehose channel. */
export function firehoseCommitFromRepoCommit(commit, seq, time) {
  const admitted = atRepoCommitCarrier.assert(commit);
  return atFirehoseCommitCarrier.assert(Object.freeze({
    kind: "socializing.atproto.firehose.commit",
    seq,
    repo: admitted.did,
    commit: admitted.data,
    rev: admitted.rev,
    time,
    ops: admitted.ops,
  }));
}

/** Broadcast a repo's commit sequence as firehose events. */
export function firehoseFromAtRepo(repo, opts = {}) {
  const admitted = atRepoCarrier.assert(repo);
  const startSeq = opts.startSeq ?? 0;
  const time = opts.time ?? new Date(0).toISOString();
  return Object.freeze(admitted.commits.map((commit, index) => firehoseCommitFromRepoCommit(commit, startSeq + index, time)));
}

function writeOfRecord(repo, record) {
  return Object.freeze({
    dot: `${repo.did}:${repo.head}:${record.path}:${record.cid}`,
    replica: repo.did,
    value: record.record,
    standing: "potential",
    witness: `${repo.did}:${repo.head}:${record.path}:${record.cid}`,
  });
}

/** Lower an AT repo to the existing socializing.merge CRDT carrier. */
export function crdtStateFromAtRepo(repo) {
  const admitted = atRepoCarrier.assert(repo);
  const cells = admitted.records.map((record) => Object.freeze({
    key: record.path,
    evidence: evidenceOf(`${admitted.did}:${admitted.head}:${record.path}`),
    writes: Object.freeze([writeOfRecord(admitted, record)]),
  }));
  const raw = Object.freeze({
    kind: "socializing.crdt.state",
    cells: Object.freeze(cells),
  });
  return mergeCrdtStates(Object.freeze({ kind: "socializing.crdt.state", cells: Object.freeze([]) }), raw);
}

/** Merge AT repos by delegating exactly to socializing's CRDT <=_k join. */
export function mergeAtRepos(...repos) {
  return repos.reduce((state, repo) => mergeCrdtStates(state, crdtStateFromAtRepo(repo)), Object.freeze({
    kind: "socializing.crdt.state",
    cells: Object.freeze([]),
  }));
}

function lexiconFieldToJsonSchema(field) {
  const type = field["type"];
  if (type === "string") return Object.freeze({ type: "string", ...(typeof field["minLength"] === "number" ? { minLength: field["minLength"] } : {}) });
  if (type === "integer") return Object.freeze({ type: "integer", ...(typeof field["minimum"] === "number" ? { minimum: field["minimum"] } : {}) });
  if (type === "boolean") return Object.freeze({ type: "boolean" });
  if (type === "array") return Object.freeze({
    type: "array",
    items: lexiconFieldToJsonSchema((field["items"] ?? {})),
  });
  if (type === "object") return lexiconObjectToJsonSchema(field);
  return Object.freeze({});
}

function lexiconObjectToJsonSchema(objectDef) {
  const properties = (objectDef["properties"] ?? {});
  const required = Object.entries(properties)
    .filter(([, field]) => field !== null && typeof field === "object" && !Array.isArray(field) && (field)["required"] === true)
    .map(([name]) => name);
  return Object.freeze({
    type: "object",
    required: Object.freeze(["$type", ...required]),
    properties: Object.freeze({
      $type: { type: "string" },
      ...Object.fromEntries(Object.entries(properties).map(([name, field]) => [name, lexiconFieldToJsonSchema(field)])),
    }),
    additionalProperties: true,
  });
}

/** Translate the main Lexicon record definition into the JSON-Schema carrier kernel. */
export function jsonSchemaFromLexiconRecord(lexicon, defName = "main") {
  const admitted = atLexiconCarrier.assert(lexicon);
  const def = admitted.defs[defName];
  if (def === null || typeof def !== "object" || Array.isArray(def)) throw new TypeError(`jsonSchemaFromLexiconRecord: missing ${defName}`);
  if ((def)["type"] !== "record") throw new TypeError(`jsonSchemaFromLexiconRecord: ${defName} is not a record definition`);
  const record = (def)["record"];
  if (record === null || typeof record !== "object" || Array.isArray(record)) throw new TypeError(`jsonSchemaFromLexiconRecord: ${defName} has no record object`);
  return Object.freeze({
    $id: `socializing/writing/atproto/lexicon/${admitted.id}`,
    title: admitted.id,
    ...lexiconObjectToJsonSchema(record),
    properties: Object.freeze({
      ...(lexiconObjectToJsonSchema(record)["properties"]),
      $type: { const: admitted.id },
    }),
  });
}

/** Build a relating carrier from an AT Lexicon record definition. */
export function carrierFromLexiconRecord(lexicon, defName = "main") {
  return schemaFrom(jsonSchemaFromLexiconRecord(lexicon, defName));
}

/** Stable equality witness for tests and callers comparing channel-code projections. */
export function sameAtprotoProjection(left, right) {
  return canonical(jsonResource(left)) === canonical(jsonResource(right));
}
