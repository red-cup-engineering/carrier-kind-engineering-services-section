import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { createTypedMark } from "@red-cup-engineering/signcell/typed-mark";
import { defineSchemaType } from "@red-cup-engineering/computer-data-engineering-services-section/type-system/schema-type";
import { humanBoundaryTypeFor, recordAutonomyIncident, recordHumanBoundary } from "./publication-control.mjs";

/**
 * Submitting one accepted edition to one retail channel, as a resumable,
 * idempotent state machine over the retailer's portal forms. The machine is
 * the same for every channel. A channel definition supplies the rest:
 *
 * - `id`, `name`, `steps` (in the portal's page order), `forms` (steps the
 *   portal saves together, which roll back together);
 * - `admit(inputs, capabilities)`, the gate: it checks the exact artifact
 *   bytes against their signed acceptances and returns `{ exact, intent,
 *   config }`, where `exact` maps each artifact to its `sha256`;
 * - `stepInput(step, fields, artifacts, inputs)`, what a step is given;
 *   `uploads` maps an upload step to the artifact it sends, so its input is
 *   bound to the bytes, not the path;
 * - `declarations`, the step that needs the founder's signed declarations
 *   receipt and how the receipt must cover the listing;
 * - `receipt(fields, exact)`, the rendition, artifact, cover and price terms;
 * - `session` (`check`, `command`), `liveDriver` and `fixtureDriver`; a
 *   channel that `rehearses` dry-runs without saved portal pages;
 * - `titleAllowance` (`step`, `perWeek`), a retailer's cap on new titles
 *   per account a week, counted when the title is created. A live run does
 *   not create a title past it; it stops blocked until the week turns.
 *
 * Nothing irreversible happens without the person at the browser: the live
 * drivers hand every publish click to them.
 */

export const RETAIL_RECEIPT_CHANNELS = Object.freeze(["kdp", "kdp-paperback", "google-play-books", "apple-books", "barnes-noble-press"]);
const retailScreenshotEvidenceType = defineSchemaType({
  $id: "org.561-group.retail.screenshot-evidence.v1", title: "Retail submission screenshot evidence",
  description: "A content-addressed observation of one retail submission step.",
  type: "object", additionalProperties: false, required: ["type", "version", "channel", "book", "step", "at", "path", "bytes", "sha256"],
  properties: { type: { const: "RetailScreenshotEvidence" }, version: { const: 1 }, channel: { enum: RETAIL_RECEIPT_CHANNELS }, book: { type: "string" }, step: { type: "string" }, at: { type: "string" }, path: { type: "string" }, bytes: { type: "integer", minimum: 1 }, sha256: { type: "string", pattern: "^[a-f0-9]{64}$" } },
});
/** A receipt names the retailer account; a channel other than the account's ebook (KDP's paperback) names itself. */
export const retailerSubmissionReceiptType = defineSchemaType({
  $id: "org.561-group.retailer-submission-receipt.v1", title: "Retailer submission receipt",
  description: "Evidence that a receiver was given exact rendition, metadata, cover, and price terms; submission is not an on-store observation.",
  type: "object", additionalProperties: false, required: ["type", "version", "retailer", "book", "rendition", "artifactSha256", "metadataProjectionSha256", "coverSha256", "priceTermsDigest", "submittedAt", "method", "remoteIdentifier", "remoteState", "lastObservedAt", "evidence"],
  properties: { type: { const: "RetailerSubmissionReceipt" }, version: { const: 1 }, retailer: { enum: ["kdp", "google-play-books", "apple-books", "barnes-noble-press"] }, channel: { enum: RETAIL_RECEIPT_CHANNELS }, book: { type: "string" }, rendition: { enum: ["EPUB", "PDF"] }, artifactSha256: { type: "string" }, metadataProjectionSha256: { type: "string" }, coverSha256: { type: "string" }, priceTermsDigest: { type: "string" }, submittedAt: { type: "string" }, method: { const: "playwright-browser-receiver" }, remoteIdentifier: { type: ["string", "null"] }, remoteState: { enum: ["submitted", "processing", "retailer-accepted", "on-store", "rejected", "withdrawn"] }, lastObservedAt: { type: "string" }, evidence: { type: "array", items: { type: "string" } } },
});

export const digestJson = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
export const sha256Bytes = (bytes) => createHash("sha256").update(bytes).digest("hex");

export function screenshotEvidenceFor(channel) {
  return (path, bytes, book, step, at) => {
    const admitted = createTypedMark(retailScreenshotEvidenceType, { type: "RetailScreenshotEvidence", version: 1, channel, book, step, at, path, bytes: bytes.byteLength, sha256: sha256Bytes(bytes) });
    if (!admitted.ok) throw new TypeError(admitted.refusal.message);
    return admitted.value;
  };
}

/** The listing a channel submits: its own, and only when nothing blocks it. */
export function channelFields(channel, listing) {
  if (listing?.channel !== channel.id || listing.blocks?.length) throw new TypeError(`${channel.name} listing is unavailable${listing?.blocks?.length ? `: ${listing.blocks.join("; ")}` : ""}`);
  return listing.fields;
}

function safeBook(channel, value) { if (!/^[a-z0-9][a-z0-9-]*$/u.test(value ?? "")) throw new TypeError(`${channel.name} book id must be kebab-case`); return value; }

async function writeState(path, state) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
  await rename(temporary, path);
}
async function readState(channel, path, book) {
  try { const value = JSON.parse(await readFile(path, "utf8")); if (value.book !== book) throw new Error(`${channel.name} state belongs to another book`); return value; }
  catch (error) {
    if (error?.code !== "ENOENT") throw error;
    return { type: "RetailSubmissionState", version: 2, channel: channel.id, book, status: "pending", completed: [], stepInputs: {}, evidence: [], blocker: null };
  }
}

const CHALLENGE_PATTERNS = /captcha|verify (?:it'?s|your) identity|two[- ]factor|2fa|one[- ]time password|sign in to your account|session expired|accept (?:the )?terms|tax interview|payout|bank account/iu;

/** Whether a portal page asks for a person, and which kind of challenge it is: the kind decides the boundary recorded. */
export function portalChallenge(body, url) {
  return CHALLENGE_PATTERNS.test(body) || /\/signin|\/ap\/challenge/iu.test(url) ? humanChallenge(body, url) : null;
}

function humanChallenge(body, url) {
  const observed = `${body}\n${url}`;
  if (/tax interview|tax information/iu.test(observed)) return "tax-attestation-required";
  if (/payout|bank account/iu.test(observed)) return "payout-attestation-required";
  if (/accept (?:the )?terms|terms (?:and conditions|of service)/iu.test(observed)) return "provider-terms-acceptance-required";
  if (/captcha/iu.test(observed)) return "captcha-challenge";
  if (/two[- ]factor|2fa|one[- ]time password/iu.test(observed)) return "two-factor-challenge";
  if (/verify (?:it'?s|your) identity/iu.test(observed)) return "provider-identity-challenge";
  if (/sign in|session expired|\/signin|\/ap\/challenge/iu.test(observed)) return "authentication-challenge";
  return null;
}

/** The UTC week a retailer counts new titles in: Sunday 00:00 to the next. */
export function titleWeek(at) {
  const day = new Date(at), start = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate() - day.getUTCDay());
  return { start: new Date(start).toISOString(), end: new Date(start + 7 * 86_400_000).toISOString() };
}

/**
 * The other titles this channel's live runs created in the week of `at`, from
 * each book's evidence of its creation step. A title made by hand in the
 * portal leaves no state here, so it is not counted.
 */
export async function titlesCreatedInWeek(channel, dataRoot, at, book) {
  const { start, end } = titleWeek(at), root = join(dataRoot, channel.id), created = [];
  let books = [];
  try { books = await readdir(root, { withFileTypes: true }); } catch (error) { if (error?.code !== "ENOENT") throw error; }
  for (const entry of books.filter((item) => item.isDirectory() && item.name !== book && item.name !== "dry-run")) {
    let state;
    try { state = JSON.parse(await readFile(join(root, entry.name, "state.json"), "utf8")); } catch (error) { if (error?.code === "ENOENT") continue; throw error; }
    const made = (state.evidence ?? []).find(({ content }) => content?.step === channel.titleAllowance.step);
    if (made && made.content.at >= start && made.content.at < end) created.push({ book: entry.name, at: made.content.at });
  }
  return created;
}

export function recordNeedsHuman(dataRoot, book, step, reason, at, detail = {}, boundaryType = humanBoundaryTypeFor(reason)) {
  return recordHumanBoundary(dataRoot, { book, step, reason, boundaryType, at, detail });
}

/** Idempotent, resumable boundary driver. Live network execution requires an explicit allowLive capability. */
export async function runRetailSubmission(channel, { book, listing, artifacts, dataRoot, dryRun = true, fixtureRoot, now = () => new Date().toISOString(), ...inputs }, capabilities = {}) {
  safeBook(channel, book);
  const fields = channelFields(channel, listing);
  const { exact, intent: intentSource, config } = await channel.admit({ book, listing, artifacts, ...inputs }, capabilities);
  if (!dryRun && capabilities.allowLive !== true) throw new Error(`live ${channel.name} effects are disabled unless the host grants allowLive`);
  if (dryRun && !fixtureRoot && !capabilities.driver && !channel.rehearses) throw new TypeError(`${channel.name} dry-run requires saved fixtureRoot pages`);
  // A dry run keeps its own state, so a rehearsed "submitted" never stands for the live title.
  const root = join(dataRoot, ...(dryRun ? ["dry-run"] : []), channel.id, book), statePath = join(root, "state.json");
  const state = await readState(channel, statePath, book);
  // The title is bound to its artifact bytes and acceptances; each completed step to the input it ran with.
  const intent = digestJson(intentSource);
  const inputFor = (step) => channel.stepInput(step, fields, artifacts, inputs);
  const stepInput = (step) => {
    const input = inputFor(step), artifact = channel.uploads?.[step];
    return digestJson(artifact ? { ...input, path: exact[artifact].sha256 } : input);
  };
  channel.migrateState?.(state, { book, fields, exact, inputs, intent, stepInput });
  if (state.intent && state.intent !== intent) throw new Error(`${channel.name} resume state belongs to different artifact bytes or release`);
  state.intent ??= intent; state.stepInputs ??= {};
  if (state.status === "submitted" && state.receipt && channel.steps.every((step) => state.completed.includes(step))) return Object.freeze(state);
  const formOf = (step) => channel.forms.find((steps) => steps.includes(step)) ?? [step];
  // A completed step whose listing input has changed since runs again, with the rest of its form.
  for (const step of state.completed.filter((done) => state.stepInputs[done] !== stepInput(done))) {
    const form = formOf(step);
    state.completed = state.completed.filter((done) => !form.includes(done));
  }
  const stop = async (status, blocker, extra) => {
    Object.assign(state, { status, blocker, ...extra });
    await writeState(statePath, state);
    return Object.freeze(state);
  };
  const allowance = channel.titleAllowance;
  if (!dryRun && allowance && !state.remoteIdentifier && !state.completed.includes(allowance.step)) {
    const at = now(), created = await titlesCreatedInWeek(channel, dataRoot, at, book);
    if (created.length >= allowance.perWeek) {
      const retryAfter = titleWeek(at).end;
      return stop("blocked", { code: "RETAILER_WEEKLY_TITLE_LIMIT", reason: `${channel.name} allows ${allowance.perWeek} new titles a week and this week's are used (${created.map((item) => item.book).join(", ")}); a saved draft counts, so none is created before ${retryAfter}.`, created, retryAfter }, { updatedAt: at });
    }
  }
  if (!dryRun) {
    const sessionValid = await (capabilities.sessionCheck ?? channel.session.check)(config, capabilities.sessionCapabilities);
    if (!sessionValid) {
      const at = now();
      return stop("needs-human", recordNeedsHuman(dataRoot, book, "session", channel.session.reason, at, { command: channel.session.command }, "EXTERNAL_PROVIDER_REQUIRES_HUMAN"), { updatedAt: at });
    }
  }
  const evidenceRoot = join(root, "evidence");
  const evidence = screenshotEvidenceFor(channel.id);
  const driver = capabilities.driver ?? (dryRun
    ? await channel.fixtureDriver({ fixtureRoot, evidenceRoot, book, evidence })
    : await channel.liveDriver({ config, evidenceRoot, book, evidence }));
  try {
    for (const step of channel.steps) {
      if (state.completed.includes(step)) continue;
      const declarations = channel.declarations;
      if (step === declarations?.step && !declarations.covers(inputs.declarationsReceipt, book, fields)) {
        const at = now();
        return stop("needs-human", recordNeedsHuman(dataRoot, book, step, "policy-declaration-required", at, { answers: declarations.answers(fields) }, "RESERVED_HUMAN_AUTHORITY_REQUIRED"), { updatedAt: at });
      }
      let result;
      try { result = await driver.run(step, inputFor(step), { remoteIdentifier: state.remoteIdentifier ?? null }); }
      catch (error) {
        const at = now(), repair = recordAutonomyIncident(dataRoot, { run: `${channel.id}:${book}`, cycle: 1, book, stage: step, code: error?.code ?? `${channel.id}-driver-failed`, reason: String(error?.message ?? error), at });
        // A portal saves a form as one, so a failure on it leaves none of its steps saved: resume from its first.
        const form = formOf(step);
        state.completed = state.completed.filter((done) => !form.includes(done));
        return stop("blocked", repair.incident, { repairRequest: repair.repairRequest, updatedAt: at });
      }
      if (result.needsHuman) {
        const at = now();
        return stop("needs-human", recordNeedsHuman(dataRoot, book, step, result.reason, at), { updatedAt: at });
      }
      state.completed.push(step); state.stepInputs[step] = stepInput(step); if (result.evidence) state.evidence.push(result.evidence);
      if (result.remoteIdentifier) state.remoteIdentifier = result.remoteIdentifier;
      Object.assign(state, { status: step === channel.steps.at(-1) ? "submitted" : "in-progress", blocker: null, updatedAt: now() }); await writeState(statePath, state);
    }
    const submittedAt = now(), terms = channel.receipt(fields, exact), receipt = createTypedMark(retailerSubmissionReceiptType, {
      type: "RetailerSubmissionReceipt", version: 1, retailer: channel.retailer, ...(channel.retailer === channel.id ? {} : { channel: channel.id }), book,
      rendition: terms.rendition, artifactSha256: terms.artifactSha256, metadataProjectionSha256: digestJson(fields), coverSha256: terms.coverSha256,
      priceTermsDigest: digestJson(terms.priceTerms),
      submittedAt, method: "playwright-browser-receiver", remoteIdentifier: state.remoteIdentifier ?? null, remoteState: "submitted", lastObservedAt: submittedAt,
      evidence: state.evidence.map(({ id }) => id),
    });
    if (!receipt.ok) throw new TypeError(receipt.refusal.message);
    state.receipt = receipt.value; state.updatedAt = submittedAt; await writeState(statePath, state);
    return Object.freeze(state);
  } finally { await driver.close?.(); }
}
