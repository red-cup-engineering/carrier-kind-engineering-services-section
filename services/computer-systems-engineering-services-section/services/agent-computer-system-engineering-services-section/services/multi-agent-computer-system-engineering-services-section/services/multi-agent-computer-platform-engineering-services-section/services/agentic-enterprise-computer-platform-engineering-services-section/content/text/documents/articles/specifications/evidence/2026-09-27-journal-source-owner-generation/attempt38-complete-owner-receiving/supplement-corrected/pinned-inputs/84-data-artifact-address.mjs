import { artifactTier } from "./statement.mjs";
import { identifierSlug } from "@red-cup-engineering/computer-text-content-engineering-services-section/slugify-text";


/** Encoding names used to derive durable data-artifact extensions. */

/** A UTC calendar partition for a dated `<tier-segment>/YYYY/MM/DD` directory. */

/** A first-class address for one durable artifact under a POSIX data tree. */

/** Data-artifact tiers, ordered by non-increasing information from source to reconstruction. */

/** Durable codomain/domain descriptor addressed by artifact path instead of process memory. */

/** A path-addressed artifact handle accepted by projection services. */

/** Options for deriving a dated durable artifact path. */

/** Encoding choices for the derived log/state/record/content artifact quartet. */

/** The four path handles for one artifact projection chain. */

/** Host-neutral directory presentation for one statement feed. */

/** A store/feed pair recovered from a durable artifact path. */

/** Result of writing source statement rows. */

/** Addressing options for a store statement-write move. */

/** Result of reading statement rows from a source log. */

/** Result of projecting one source log into a state sufficient statistic. */

/** Result of committing settled records from source rows. */

function slug(value) {
  return (identifierSlug(value) || "feed");
}

function trimSlashes(value) {
  return value.replace(/^\/+|\/+$/g, "");
}

function posixJoin(...parts) {
  const absolute = parts[0]?.startsWith("/") === true;
  const joined = parts.map(trimSlashes).filter(Boolean).join("/");
  return absolute ? `/${joined}` : joined;
}

function pathBasename(value) {
  return value.split("/").filter(Boolean).at(-1) ?? "";
}

function rootNameOf(root, explicit) {
  if (explicit !== undefined && explicit.trim().length > 0) return slug(explicit.replace(/^@/, ""));
  return slug(pathBasename(root) || "root");
}

/** The POSIX directory segment (relative to the data root) for one artifact
 *  tier, sourced from `artifactTier` — the tiers' own law, not a second,
 *  independently hand-kept copy of the same mapping. Data tiers
 *  (log/state/record) live under `data/`; `content` is a
 *  lossy, human-markdown reconstruction and lives at the top-level `content/` instead. */
export function dataTierPathSegment(tier) {
  return artifactTier(tier).pathSegment;
}

function tierFileLabel(tier) {
  return tier === "log" ? "log" : tier;
}

function tierPathSegments(tier) {
  return dataTierPathSegment(tier).split("/").filter(Boolean);
}

/** The single-segment act a tier's artifacts are named by: admit statements into
 *  `data/journals`, settle state, commit records, realize content. Filenames read
 *  `${date}-${act}-${token}`, so the act must never contain a hyphen — the
 *  token boundary is the first hyphen after the act segment. */
export function dataTierAct(tier) {
  if (tier === "log") return "admit";
  if (tier === "state") return "settle";
  if (tier === "record") return "commit";
  return "realize";
}

const TIER_ACTS = new Set(["admit", "settle", "commit", "realize"]);

/** Parse a `${date}-${act}-${token}` artifact stem; null when not act-named. */
export function parseArtifactStem(stem) {
  const match = /^(\d{4}-\d{2}-\d{2})-([a-z]+)-(.+)$/u.exec(stem);
  if (match === null || !TIER_ACTS.has(match[2])) return null;
  return Object.freeze({ date: match[1], act: match[2], token: match[3] });
}

/** The UTC date (YYYY-MM-DD) named by a statement coordinate; safe fallback otherwise. */
export function dataDatePartition(at) {
  const text = String(at);
  const date = /^\d{4}-\d{2}-\d{2}/.test(text) ? text.slice(0, 10) : "0000-00-00";
  const [year = "0000", month = "00", day = "00"] = date.split("-");
  return Object.freeze({ date, year, month, day });
}

/** The deterministic dated directory for one artifact tier under a data root. */
export function dataTierDirectory(root, tier, at) {
  const { year, month, day } = dataDatePartition(at);
  return posixJoin(root, dataTierPathSegment(tier), year, month, day);
}

function extensionOf(encoding) {
  const text = String(encoding).trim().replace(/^\.+/, "");
  if (!text) throw new TypeError("dataArtifactAddress: encoding must name a file extension");
  return text === "markdown" ? "md" : text;
}

function schemaAddressForTier(tier) {
  if (tier === "log") return "metroplat/witness/eavt-log";
  if (tier === "state") return "metroplat/witness/state-view";
  if (tier === "record") return "data/records";
  return "content";
}

function mediaTypeForEncoding(encoding) {
  const extension = extensionOf(encoding);
  if (extension === "jsonl") return "application/jsonl";
  if (extension === "json") return "application/json";
  if (extension === "md" || extension === "markdown") return "text/markdown";
  return `application/octet-stream; extension=${extension}`;
}

export function dataArtifactDescriptor(
  tier,
  path,
  encoding,
) {
  const inferredEncoding = encoding ?? (tier === "state" ? "json" : tier === "content" ? "md" : "jsonl");
  return Object.freeze({
    kind: "metroplat.data-artifact-descriptor",
    tier,
    role: artifactTier(tier).role,
    path,
    mediaType: mediaTypeForEncoding(inferredEncoding),
    schema: schemaAddressForTier(tier),
  });
}

/** Recover the durable path from a data artifact handle and optionally check its tier. */
export function dataArtifactHandlePath(
  handle,
  expectedTier,
) {
  if (typeof handle === "string") return handle;
  if (expectedTier !== undefined && handle.tier !== expectedTier) {
    throw new TypeError(`dataArtifactHandlePath: expected ${expectedTier} artifact, got ${handle.tier}`);
  }
  return handle.path;
}

/** Derive the stable path for a data artifact from tier, encoding, action, subject, and statement date. */
export function dataArtifactAddress(options) {
  const partition = dataDatePartition(options.at);
  const extension = extensionOf(options.encoding);
  const rootName = rootNameOf(options.root, options.rootName);
  const action = slug(options.action);
  const subject = slug(options.subject.replace(/^@/, ""));
  const feed = `${partition.date}-${dataTierAct(options.tier)}-${subject}`;
  const directory = dataTierDirectory(options.root, options.tier, options.at);
  const filename = `${feed}.${extension}`;
  const relativePath = posixJoin(dataTierPathSegment(options.tier), partition.year, partition.month, partition.day, filename);
  return Object.freeze({
    kind: "metroplat.data-artifact-address",
    root: options.root,
    rootName,
    tier: options.tier,
    encoding: options.encoding,
    extension,
    date: partition.date,
    action,
    subject,
    feed,
    directory,
    filename,
    path: posixJoin(directory, filename),
    relativePath,
  });
}

/** Derive all four data-tier artifact addresses for one action-on-subject information chain. */
export function dataArtifactQuartet(options) {
  const base = {
    root: options.root,
    ...(options.rootName === undefined ? {} : { rootName: options.rootName }),
    at: options.at,
    action: options.action,
    subject: options.subject,
  };
  return Object.freeze({
    kind: "metroplat.data-artifact-quartet",
    log: dataArtifactAddress({ ...base, tier: "log", encoding: options.logEncoding ?? "jsonl" }),
    state: dataArtifactAddress({ ...base, tier: "state", encoding: options.stateEncoding ?? "json" }),
    record: dataArtifactAddress({ ...base, tier: "record", encoding: options.recordEncoding ?? "jsonl" }),
    content: dataArtifactAddress({ ...base, tier: "content", encoding: options.contentEncoding ?? "md" }),
  });
}

/** Re-address an artifact onto a sibling artifact tier while preserving date/action/subject/feed coordinates. */
export function projectDataArtifactAddress(
  source,
  tier,
  encoding = source.encoding,
) {
  return dataArtifactAddress({
    root: source.root,
    rootName: source.rootName,
    tier,
    encoding,
    at: source.date,
    action: source.action,
    subject: source.subject,
  });
}

/** Project one concrete artifact path onto a sibling artifact tier path. */
export function projectDataArtifactPath(
  sourcePath,
  tier,
  encoding,
) {
  const extension = extensionOf(encoding ?? (tier === "state" ? "json" : tier === "content" ? "md" : "jsonl"));
  const parts = sourcePath.split("/");
  const filename = parts.at(-1) ?? "";
  const sourceDirectory = parts.slice(0, -1).join("/");
  const match = matchTierDirectory(sourceDirectory);
  const directory = match !== null
    ? posixJoin(match.root, dataTierPathSegment(tier), match.year, match.month, match.day)
    : sourceDirectory;
  const stem = filename.replace(/\.[^.]+$/u, "");
  const parsed = parseArtifactStem(stem);
  const projectedStem = parsed !== null
    ? `${parsed.date}-${dataTierAct(tier)}-${parsed.token}`
    : /-(log|state|record|content)$/u.test(stem)
      ? stem.replace(/-(log|state|record|content)$/u, `-${tierFileLabel(tier)}`)
      : `${stem}-${tierFileLabel(tier)}`;
  return posixJoin(directory, `${projectedStem}.${extension}`);
}

function pathExtension(filePath, fallback) {
  const leaf = filePath.split("/").filter(Boolean).at(-1) ?? "";
  const match = /\.[^.]+$/u.exec(leaf);
  return match?.[0] ?? fallback;
}

function labeledArtifactPath(tierPath, label, fallbackExtension) {
  const extension = pathExtension(tierPath, fallbackExtension);
  return `${tierPath.slice(0, -extension.length)}-${slug(label)}${extension}`;
}

/** Project a log artifact into a selected Memento state artifact path. */
export function mementoStateArtifactPath(logPath, selectedDatetime) {
  return labeledArtifactPath(projectDataArtifactPath(logPath, "state", "json"), `memento-${slug(selectedDatetime)}`, ".json");
}

/** Project a log artifact into a named JSON content artifact path. */
export function logContentArtifactPath(logPath, label) {
  return labeledArtifactPath(projectDataArtifactPath(logPath, "content", "json"), label, ".json");
}

/** Project a log artifact into a named JSON record artifact path — for a
 *  settled slice of the statement log (a credential, a receipt, a safety
 *  judgment) that belongs at the record tier's rate-distortion rank, not the
 *  lossy human-markdown content tier. */
export function logRecordArtifactPath(logPath, label) {
  return labeledArtifactPath(projectDataArtifactPath(logPath, "record", "json"), label, ".json");
}

/** Project a record artifact into a named JSON content artifact path. */
export function recordContentArtifactPath(recordPath, label) {
  return labeledArtifactPath(projectDataArtifactPath(recordPath, "content", "json"), label, ".json");
}

/** Project a content artifact into the corresponding record artifact path. */
export function contentRecordArtifactPath(contentPath) {
  return projectDataArtifactPath(contentPath, "record", "jsonl");
}

/** Return the flat leaf path of a feed file under one tier directory. */
export function feedArtifactPath(dir, feed, type) {
  return posixJoin(dir, `${feed}.${extensionOf(type)}`);
}

function feedNameFromFile(filePath, extension) {
  const suffix = `.${extension}`;
  const base = filePath.split("/").filter(Boolean).at(-1) ?? "";
  return base.endsWith(suffix) ? base.slice(0, -suffix.length) : base;
}

function directoryOf(filePath) {
  const absolute = filePath.startsWith("/");
  const parts = filePath.split("/").filter(Boolean);
  parts.pop();
  const joined = parts.join("/");
  return absolute ? `/${joined}` : joined;
}

/** Re-derive a sibling tier's dated directory from a known tier's dated
 *  directory, by stripping exactly `from`'s own path segments (and the
 *  trailing YYYY/MM/DD) off the end to recover the shared root, then
 *  rebuilding with `to`'s segments. Tiers are not required to share a
 *  parent segment (`content`'s segment is bare; log/state/record's include
 *  `data/`) — the root is whatever remains once `from`'s own segments are
 *  removed, never a hand-matched "data" literal. */
function siblingTierDirectory(tierDirectory, from, to) {
  const absolute = tierDirectory.startsWith("/");
  const parts = tierDirectory.split("/").filter(Boolean);
  const fromSegments = tierPathSegments(from);
  const rootParts = parts.slice(0, Math.max(0, parts.length - 3 - fromSegments.length));
  const dateParts = parts.slice(parts.length - 3);
  return `${absolute ? "/" : ""}${[...rootParts, ...tierPathSegments(to), ...dateParts].join("/")}`;
}

/** Locate which artifact tier a dated directory belongs to and recover its root,
 *  by matching the directory's segments (excluding the trailing YYYY/MM/DD)
 *  against each tier's own declared path segment — never a literal "data"
 *  index, since `content` does not share that prefix. */
function matchTierDirectory(
  directory,
) {
  const absolute = directory.startsWith("/");
  const parts = directory.split("/").filter(Boolean);
  if (parts.length < 3) return null;
  const [year, month, day] = parts.slice(-3);
  const withoutDate = parts.slice(0, parts.length - 3);
  for (const tier of ["log", "state", "record", "content"]) {
    const segments = tierPathSegments(tier);
    if (segments.length === 0 || segments.length > withoutDate.length) continue;
    const candidate = withoutDate.slice(withoutDate.length - segments.length);
    if (candidate.join("/") !== segments.join("/")) continue;
    const rootParts = withoutDate.slice(0, withoutDate.length - segments.length);
    return Object.freeze({ tier, root: `${absolute ? "/" : ""}${rootParts.join("/")}`, year, month, day });
  }
  return null;
}

/** Recover data-store paths and a feed name from a log artifact path. */
export function dataStoreFromLogPath(logPath, options = {}) {
  const logDir = directoryOf(logPath);
  const store = Object.freeze({
    logDir,
    stateDir: siblingTierDirectory(logDir, "log", "state"),
    recordDir: siblingTierDirectory(logDir, "log", "record"),
    ...(options.content === true ? { contentDir: siblingTierDirectory(logDir, "log", "content") } : {}),
  });
  return Object.freeze({ store, feed: feedNameFromFile(logPath, "jsonl") });
}

/** Recover data-store paths and a feed name from a record artifact path. */
export function dataStoreFromRecordPath(recordPath, options = {}) {
  const recordDir = directoryOf(recordPath);
  const store = Object.freeze({
    logDir: siblingTierDirectory(recordDir, "record", "log"),
    stateDir: siblingTierDirectory(recordDir, "record", "state"),
    recordDir,
    ...(options.content === true ? { contentDir: siblingTierDirectory(recordDir, "record", "content") } : {}),
  });
  return Object.freeze({ store, feed: feedNameFromFile(recordPath, options.extension ?? "jsonl") });
}

/** Recover data-store paths and a feed name from a content artifact path. */
export function dataStoreFromContentPath(contentPath, options = {}) {
  const contentDir = directoryOf(contentPath);
  const store = Object.freeze({
    logDir: siblingTierDirectory(contentDir, "content", "log"),
    stateDir: siblingTierDirectory(contentDir, "content", "state"),
    recordDir: siblingTierDirectory(contentDir, "content", "record"),
    contentDir,
  });
  const extension = options.extension ?? (contentPath.split("/").filter(Boolean).at(-1)?.split(".").at(-1) ?? "json");
  return Object.freeze({ store, feed: feedNameFromFile(contentPath, extension) });
}
