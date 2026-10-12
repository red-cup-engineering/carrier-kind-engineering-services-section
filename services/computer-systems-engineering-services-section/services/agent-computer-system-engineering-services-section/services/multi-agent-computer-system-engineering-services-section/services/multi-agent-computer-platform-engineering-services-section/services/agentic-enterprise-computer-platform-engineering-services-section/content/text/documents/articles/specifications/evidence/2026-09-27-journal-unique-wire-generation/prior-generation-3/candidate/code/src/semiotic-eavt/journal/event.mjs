/** Journal-facing construction and verification of witnessed observations. */
import { createHash } from "node:crypto";
import {
  addressArtifact,
  addressSiteConstitution,
  addressPrimitiveArticulation,
  verifyArtifact,
  isArtifactRef,
} from "../identity/index.mjs";
import {
  canonicalJson,
  requireJsonValue,
  canonicalizeJson,
  JSON_RESOURCE_ENVELOPE,
} from "@red-cup-engineering/json-services-section";
import {
  isClosed,
  inferTy,
  checkTy,
} from "@red-cup-engineering/computer-code-engineering-services-section/semiotic-expression-notation/typing";
import { tm } from "@red-cup-engineering/computer-code-engineering-services-section/semiotic-expression-notation";
import { eavtKey } from "@red-cup-engineering/eavt-services-section/row";
import { isCausalWitness } from "./judgment.mjs";
import { addressWitnessCore } from "./witness.mjs";

const UNIQUE_COMMAND = "metroplat.journal.unique-command";
const UNIQUE_ADMISSION = "metroplat.journal.unique-admission";
const UNIQUE_RECORD = "metroplat.journal.unique-record";
const ENVELOPE = Object.freeze({
  maxSourceBytes: 1048576,
  maxCanonicalBytes: 1048576,
  maxDepth: 64,
  maxNodes: 100000,
  maxObjectMembers: 4096,
  maxArrayLength: 65536,
  maxStringBytes: 262144,
  maxKeyBytes: 1024,
});

function check(term, type) {
  return isClosed(term) && (type === undefined ? inferTy([], term) !== null : checkTy([], term, type));
}

function bad(field) {
  const error = new TypeError(`unique journal ${field} is invalid`);
  error.code = "unique-journal-invalid";
  throw error;
}

function guard(run) {
  try {
    return run();
  } catch (error) {
    if (error?.code === "unique-journal-invalid") throw error;
    if (error instanceof TypeError || error instanceof RangeError) bad("input or retained record");
    throw error;
  }
}

function snapshot(value, field) {
  try {
    return canonicalizeJson(value, JSON_RESOURCE_ENVELOPE).value;
  } catch {
    bad(field);
  }
}

function sameKeys(value, keys, field) {
  if (value === null || Array.isArray(value) || typeof value !== "object") bad(field);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) bad(field);
}

function scalarString(value, field) {
  if (typeof value !== "string" || value.length === 0 || [...value].length > 512) bad(field);
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(i + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) bad(field);
      i++;
    } else if (code >= 0xdc00 && code <= 0xdfff) bad(field);
  }
  return value;
}

function ordinal(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function sortedReferences(value, field) {
  if (!Array.isArray(value)) bad(field);
  let previous;
  for (const ref of value) {
    if (!isArtifactRef(ref)) bad(field);
    if (previous !== undefined && ordinal(previous, ref) >= 0) bad(field);
    previous = ref;
  }
  return value;
}

function checkEnvelope() {
  for (const [key, value] of Object.entries(ENVELOPE)) {
    if (JSON_RESOURCE_ENVELOPE?.[key] !== value) bad("JSON resource envelope");
  }
}

function slotDigest(journal, command) {
  const tuple = ["metroplat.journal.unique-slot", 1, journal, command.domain, command.key];
  const bytes = Buffer.from(canonicalJson(tuple), "utf8");
  return createHash("sha256").update(bytes).digest("hex");
}

function addressCommand(value, journalIdentity) {
  checkEnvelope();
  scalarString(journalIdentity, "journal identity");
  const command = snapshot(value, "command");
  sameKeys(command, ["kind", "version", "domain", "key", "subject", "value", "causes", "artifactRefs"], "command fields");
  if (command.kind !== UNIQUE_COMMAND || command.version !== 1) bad("command kind or version");
  if (command.domain !== "interaction" && command.domain !== "effect-successor") bad("command domain");
  scalarString(command.subject, "command subject");
  if (command.domain === "interaction") {
    sameKeys(command.key, ["context", "principal", "requestId"], "interaction key");
    scalarString(command.key.context, "interaction context");
    scalarString(command.key.principal, "interaction principal");
    scalarString(command.key.requestId, "interaction requestId");
  } else {
    sameKeys(command.key, ["journal", "effectId", "predecessor"], "effect key");
    scalarString(command.key.journal, "effect journal");
    scalarString(command.key.effectId, "effectId");
    if (command.key.journal !== journalIdentity) bad("effect journal correspondence");
    if (command.key.predecessor !== null && !isArtifactRef(command.key.predecessor)) bad("effect predecessor");
  }
  sortedReferences(command.causes, "causes");
  sortedReferences(command.artifactRefs, "artifactRefs");
  if (command.domain === "effect-successor" && command.key.predecessor !== null
    && !command.causes.includes(command.key.predecessor)) bad("predecessor in causes");
  const commandRef = addressArtifact(command).ref;
  return Object.freeze({ command, commandRef, slotDigest: slotDigest(journalIdentity, command) });
}

function source(ref, canonicalText) {
  return Object.freeze({ ref, canonicalText });
}

function sortedUnique(values) {
  return Object.freeze([...new Set(values)].sort(ordinal));
}

export function journalWitness(observation) {
  if (observation.kind !== "metroplat.journal.observation") {
    throw new TypeError("journal observation has an unsupported kind");
  }
  if (observation.time.length === 0) throw new TypeError("journal observation time must be nonempty");
  if (!check(observation.claim)) throw new TypeError("journal observation claim is not a closed typed term");
  if (!check(observation.address)) throw new TypeError("journal observation address is not a closed typed term");

  const site = addressSiteConstitution();
  const token = addressArtifact(Object.freeze({
    kind: "metroplat.journal.address-mark",
    version: 1,
    address: observation.address,
  }));
  const claim = addressArtifact(Object.freeze({
    kind: "metroplat.journal.claim-mark",
    version: 1,
    claim: observation.claim,
    ...(observation.payload === undefined ? {} : { payload: observation.payload }),
  }));
  const boundary = addressArtifact(Object.freeze({
    kind: "metroplat.journal.boundary-observation",
    version: 1,
    seat: observation.seat,
    observedAt: observation.time,
  }));
  const articulation = addressPrimitiveArticulation(Object.freeze({
    kind: "metroplat.primitive-articulation",
    version: 1,
    token: token.ref,
    claim: claim.ref,
  }));
  const artifactRefs = new Set(observation.referencedArtifacts ?? []);
  if (artifactRefs.size !== (observation.referencedArtifacts?.length ?? 0)) {
    throw new TypeError("journal observation repeats a referenced artifact");
  }
  const witnessResult = addressWitnessCore(Object.freeze({
    kind: "metroplat.witness-core",
    version: 1,
    site: site.ref,
    articulation: articulation.ref,
    causes: sortedUnique(observation.causes),
    referencedArtifacts: sortedUnique([boundary.ref, ...artifactRefs]),
    attestationRefs: Object.freeze([]),
    boundaryObservationRefs: Object.freeze([]),
  }));
  if (!isCausalWitness(witnessResult)) throw new TypeError(witnessResult.message);
  const witness = witnessResult.value;
  const sources = Object.freeze([
    source(site.ref, site.canonical.text),
    source(token.ref, token.canonical.text),
    source(claim.ref, claim.canonical.text),
    source(boundary.ref, boundary.canonical.text),
    source(articulation.ref, articulation.canonical.text),
    source(witness.ref, witness.canonical.text),
  ].sort((left, right) => ordinal(left.ref, right.ref)));
  return Object.freeze({
    kind: "metroplat.journal.witness",
    id: witness.ref,
    bytes: witness.canonical.text,
    core: witness.core,
    observation: Object.freeze({
      ...observation,
      causes: sortedUnique(observation.causes),
      ...(artifactRefs.size === 0 ? {} : { referencedArtifacts: sortedUnique([...artifactRefs]) }),
    }),
    sources,
  });
}

export function parseJournalWitness(value) {
  const record = requireJsonValue(value, "journal witness");
  if (record === null || Array.isArray(record) || typeof record !== "object") {
    throw new TypeError("journal witness must be an object");
  }
  const candidate = record;
  if (candidate.kind !== "metroplat.journal.witness") throw new TypeError("unsupported journal witness kind");
  const expected = journalWitness(candidate.observation);
  if (
    candidate.id !== expected.id
    || candidate.bytes !== expected.bytes
    || canonicalJson(candidate.core) !== canonicalJson(expected.core)
  ) {
    throw new TypeError("journal witness does not match its exact observation and causal source material");
  }
  if (!Array.isArray(candidate.sources) || candidate.sources.length !== expected.sources.length) {
    throw new TypeError("journal witness sources do not match the reconstructed source set");
  }
  const expectedByRef = new Map(expected.sources.map((entry) => [entry.ref, entry.canonicalText]));
  const seen = new Set();
  for (const entry of candidate.sources) {
    if (entry === null || Array.isArray(entry) || typeof entry !== "object") {
      throw new TypeError("journal witness source entry must be an object");
    }
    const keys = Object.keys(entry).sort();
    if (keys.length !== 2 || keys[0] !== "canonicalText" || keys[1] !== "ref") {
      throw new TypeError("journal witness source entry has unexpected fields");
    }
    if (typeof entry.ref !== "string" || typeof entry.canonicalText !== "string"
      || seen.has(entry.ref) || expectedByRef.get(entry.ref) !== entry.canonicalText) {
      throw new TypeError("journal witness source set is incomplete or altered");
    }
    seen.add(entry.ref);
  }
  if (seen.size !== expectedByRef.size) throw new TypeError("journal witness source set is incomplete");
  return expected;
}

export function payloadJson(value, context) {
  return requireJsonValue(value, context);
}

export function addressUniqueJournalCommand(value, journalIdentity) {
  return guard(() => {
    if (arguments.length !== 2) bad("arguments");
    const addressed = addressCommand(value, journalIdentity);
    return snapshot(addressed, "addressed command");
  });
}

function exactTimestamp(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) bad("admittedAt");
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) || date.toISOString() !== value) bad("admittedAt");
  return value;
}

function buildUniqueRecord(commandValue, optionsValue) {
  checkEnvelope();
  const options = snapshot(optionsValue, "options");
  sameKeys(options, ["journal", "seat", "admittedAt", "artifacts"], "options fields");
  scalarString(options.journal, "journal");
  scalarString(options.seat, "seat");
  exactTimestamp(options.admittedAt);
  if (!Array.isArray(options.artifacts)) bad("artifacts");
  const addressed = addressCommand(commandValue, options.journal);
  const command = addressed.command;
  if (command.domain === "interaction" && options.seat !== command.key.principal) bad("interaction seat correspondence");

  const payload = [command.subject, UNIQUE_ADMISSION, command, options.admittedAt];
  const observation = {
    kind: "metroplat.journal.observation",
    seat: options.seat,
    claim: tm.mark(UNIQUE_ADMISSION),
    address: tm.mark(eavtKey(payload)),
    time: options.admittedAt,
    causes: command.causes,
    payload,
    referencedArtifacts: command.artifactRefs,
  };
  const witness = journalWitness(observation);
  const sourceByRef = new Map(witness.sources.map((entry) => [entry.ref, entry.canonicalText]));
  const required = command.artifactRefs.filter((ref) => !sourceByRef.has(ref));
  let previous;
  const suppliedRefs = [];
  const artifacts = options.artifacts.map((entry) => {
    sameKeys(entry, ["ref", "canonicalText"], "artifact entry fields");
    if (typeof entry.ref !== "string" || typeof entry.canonicalText !== "string") bad("artifact entry");
    if (previous !== undefined && ordinal(previous, entry.ref) >= 0) bad("artifact order");
    previous = entry.ref;
    const verified = verifyArtifact(entry.ref, entry.canonicalText);
    if (verified.canonical.text !== entry.canonicalText) bad("artifact canonical text");
    suppliedRefs.push(entry.ref);
    return source(entry.ref, entry.canonicalText);
  });
  if (suppliedRefs.length !== required.length || suppliedRefs.some((ref, index) => ref !== required[index])) {
    bad("external artifact set");
  }
  for (const ref of command.artifactRefs) {
    if (sourceByRef.has(ref)) {
      const text = sourceByRef.get(ref);
      if (verifyArtifact(ref, text).canonical.text !== text) bad("witness source artifact body");
    }
  }

  const record = snapshot({
    kind: UNIQUE_RECORD,
    version: 1,
    journal: options.journal,
    commandRef: addressed.commandRef,
    witness,
    artifacts,
  }, "retained record");
  return Object.freeze({ record, command, slotDigest: addressed.slotDigest });
}

export function uniqueJournalRecord(command, options) {
  return guard(() => {
    if (arguments.length !== 2) bad("arguments");
    return buildUniqueRecord(command, options).record;
  });
}

export function parseUniqueJournalRecord(value, journalIdentity, expectedSlotDigest) {
  return guard(() => {
    if (arguments.length !== 3) bad("arguments");
    scalarString(journalIdentity, "journal identity");
    if (typeof expectedSlotDigest !== "string" || !/^[0-9a-f]{64}$/.test(expectedSlotDigest)) bad("expected slot digest");
    const supplied = snapshot(value, "record");
    sameKeys(supplied, ["kind", "version", "journal", "commandRef", "witness", "artifacts"], "record fields");
    if (supplied.kind !== UNIQUE_RECORD || supplied.version !== 1 || supplied.journal !== journalIdentity) bad("record identity");
    const observation = supplied.witness?.observation;
    if (observation === null || typeof observation !== "object" || Array.isArray(observation)) bad("witness observation");
    if (!Array.isArray(observation.payload) || observation.payload.length !== 4) bad("observation payload");
    const command = observation.payload[2];
    if (observation.payload[1] !== UNIQUE_ADMISSION || observation.payload[3] !== observation.time) bad("observation correspondence");
    const reconstructed = buildUniqueRecord(command, {
      journal: supplied.journal,
      seat: observation.seat,
      admittedAt: observation.time,
      artifacts: supplied.artifacts,
    });
    if (reconstructed.slotDigest !== expectedSlotDigest) bad("slot digest");
    if (canonicalJson(supplied) !== canonicalJson(reconstructed.record)) bad("record correspondence");
    const reference = {
      journal: supplied.journal,
      subject: reconstructed.command.subject,
      event: reconstructed.record.witness.id,
      payload: reconstructed.record.commandRef,
    };
    return snapshot({
      record: reconstructed.record,
      command: reconstructed.command,
      slotDigest: reconstructed.slotDigest,
      reference,
    }, "verified result");
  });
}
