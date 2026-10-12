import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { chmod, cp, mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createTypedMark } from "@red-cup-engineering/signcell/typed-mark";
import { EPUB_VALIDATOR_PROFILES, kindleReleaseAcceptanceType, kindleValidationReceiptType, signKindleValidationReceipt } from "@red-cup-engineering/ebook-engineering-services-section/kindle-validation";
import { kdpStepInput, readKdpConfig, runKdpSubmission } from "../src/kdp-submit.mjs";
import { DEFAULT_KDP_STORAGE_STATE_PATH, KDP_LOGIN_COMMAND } from "../src/kdp-session.mjs";

test("fixture dry runs do not require a KDP browser session", async () => {
  const root = await mkdtemp(join(tmpdir(), "kdp-config-")), path = join(root, "kdp.json");
  await writeFile(path, `${JSON.stringify({ validationPublicKey: "./validation.pem" })}\n`);
  await chmod(path, 0o600);
  const config = await readKdpConfig(path, { dryRun: true });
  assert.equal(config.storageState, null);
  assert.equal((await readKdpConfig(path)).storageState, DEFAULT_KDP_STORAGE_STATE_PATH);
});

const FIXTURES = fileURLToPath(new URL("./fixtures/kdp", import.meta.url));

/** A fixture edition: its EPUB and cover, their signed validation and release acceptance, and its listing. */
async function fixtureEdition(root) {
  const epub = join(root, "book.epub"), cover = join(root, "cover.jpg");
  await writeFile(epub, "epub"); await writeFile(cover, "cover");
  const hash = async (path) => (await import("node:crypto")).createHash("sha256").update(await (await import("node:fs/promises")).readFile(path)).digest("hex");
  const epubHash = await hash(epub), coverHash = await hash(cover);
  const admitted = createTypedMark(kindleValidationReceiptType, { type: "KindleValidationReceipt", version: 2, book: "fixture", validatedAt: "2026-09-29T00:00:00Z", validatorProfile: EPUB_VALIDATOR_PROFILES.release, passed: true, artifacts: { epub: { name: "book.epub", bytes: 4, sha256: epubHash }, cover: { name: "cover.jpg", bytes: 5, sha256: coverHash } }, checks: { conformance: { release: { passed: true } }, accessibility: { type: "EpubAccessibilityEvidence" }, features: {}, navigation: { passed: true }, portability: {}, readingSystems: [], cover: { passed: true } } });
  const { privateKey, publicKey } = generateKeyPairSync("ed25519"), validation = signKindleValidationReceipt(admitted.value, privateKey, "fixture");
  const releaseAcceptance = createTypedMark(kindleReleaseAcceptanceType, { type: "KindleReleaseAcceptance", version: 1, status: "release-ready", book: "fixture", editionInputDigest: "ni:///sha-256;fixture", rendition: { kind: "EPUB", artifactSha256: epubHash }, closedObligationIds: ["editorial-proof", "epub-conformance", "accessibility-assessment"], evidence: { validation: admitted.value.id } }).value;
  const listing = { channel: "kdp", blocks: [], fields: { title: "Fixture", language: "English", author: "561 Group", publisher: "561 Group", description: "Fixture", keywords: [], subjects: [], aiDisclosure: { text: "AI-generated", images: "None", translations: "None" }, territories: "Worldwide", royalty: "70%", listPriceUsd: "3.99", drm: "No", kdpSelect: "No" } };
  return { epub, cover, publicKey, validation, releaseAcceptance, listing };
}

test("submission is resumable, gated by signed exact bytes, and stops for the human declaration", async () => {
  const root = await mkdtemp(join(tmpdir(), "kdp-submit-"));
  const { epub, cover, publicKey, validation, releaseAcceptance, listing } = await fixtureEdition(root);
  const steps = [], driver = { run: async (step) => { steps.push(step); return {}; }, close() {} };
  const state = await runKdpSubmission({ book: "fixture", listing, artifacts: { epub, cover }, releaseAcceptance, validation, dataRoot: root, dryRun: true, now: () => "2026-09-29T00:00:00Z" }, { config: {}, publicKey, driver });
  assert.equal(state.status, "needs-human"); assert.equal(state.blocker.reason, "policy-declaration-required"); assert.deepEqual(steps, ["create-title", "metadata", "series", "upload-epub", "upload-cover"]);
  assert.equal(state.blocker.boundaryType, "RESERVED_HUMAN_AUTHORITY_REQUIRED");
  const resumedSteps = [], resumed = await runKdpSubmission({ book: "fixture", listing, artifacts: { epub, cover }, releaseAcceptance, validation, dataRoot: root, dryRun: true, declarationsReceipt: { type: "KdpDeclarationsReceipt", version: 1, book: "fixture", declaredAt: "2026-09-29T00:01:00Z", acknowledged: true, answers: listing.fields.aiDisclosure } }, { config: {}, publicKey, driver: { run: async (step) => { resumedSteps.push(step); return {}; }, close() {} } });
  assert.equal(resumed.status, "submitted"); assert.deepEqual(resumedSteps, ["declarations", "pricing", "save-draft", "publish"]);
  assert.equal(resumed.receipt.content.remoteState, "submitted");
  const repeated = await runKdpSubmission({ book: "fixture", listing, artifacts: { epub, cover }, releaseAcceptance, validation, dataRoot: root, dryRun: true, declarationsReceipt: { type: "KdpDeclarationsReceipt", version: 1, book: "fixture", declaredAt: "2026-09-29T00:01:00Z", acknowledged: true, answers: listing.fields.aiDisclosure } }, { config: {}, publicKey, driver: { run: async () => { throw new Error("must not rerun"); } } });
  assert.equal(repeated.receipt.id, resumed.receipt.id);

  const blockedRoot = await mkdtemp(join(tmpdir(), "kdp-session-blocked-"));
  const secretLookingPath = join(blockedRoot, "SECRET_PASSWORD_COOKIE_VALUE.json");
  const blocked = await runKdpSubmission({ book: "fixture", listing, artifacts: { epub, cover }, releaseAcceptance, validation, dataRoot: blockedRoot, dryRun: false }, {
    allowLive: true,
    config: { storageState: secretLookingPath, marketplace: "https://kdp.amazon.com" },
    publicKey,
    sessionCheck: async () => false,
    driver: { run: async () => { throw new Error("must not reach the KDP driver"); } },
  });
  assert.equal(blocked.status, "needs-human");
  assert.equal(blocked.blocker.reason, "kdp-session-missing-or-expired");
  assert.equal(blocked.blocker.boundaryType, "EXTERNAL_PROVIDER_REQUIRES_HUMAN");
  assert.equal(blocked.blocker.detail.command, KDP_LOGIN_COMMAND);
  const journalFiles = (await readdir(blockedRoot, { recursive: true, withFileTypes: true }))
    .filter((entry) => entry.isFile()).map((entry) => join(entry.parentPath, entry.name));
  const journalText = (await Promise.all(journalFiles.map((file) => readFile(file, "utf8")))).join("\n");
  assert.match(journalText, new RegExp(KDP_LOGIN_COMMAND.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"));
  assert.doesNotMatch(journalText, /SECRET_PASSWORD_COOKIE_VALUE/u);

  const driftRoot = await mkdtemp(join(tmpdir(), "kdp-selector-drift-"));
  const drift = await runKdpSubmission({ book: "fixture", listing, artifacts: { epub, cover }, releaseAcceptance, validation, dataRoot: driftRoot, dryRun: true, declarationsReceipt: { type: "KdpDeclarationsReceipt", version: 1, book: "fixture", declaredAt: "2026-09-29T00:01:00Z", acknowledged: true, answers: listing.fields.aiDisclosure } }, { config: {}, publicKey, driver: { run: async () => { const error = new Error("KDP form selector missing"); error.code = "KDP_SELECTOR_MISSING"; throw error; }, close() {} } });
  assert.equal(drift.status, "blocked");
  assert.equal(drift.blocker.type, "AutonomyIncident");
  assert.equal(drift.blocker.failureClass, "AUTOMATION_DRIFT");
  assert.equal(drift.repairRequest.status, "open");
});

test("a KDP pre-order is released on its launch plan's KDP date, filled on the details page, and only for an accepted edition", async () => {
  const root = await mkdtemp(join(tmpdir(), "kdp-preorder-"));
  const { epub, cover, publicKey, validation, releaseAcceptance, listing } = await fixtureEdition(root);
  const launchPlan = {
    type: "PublicationLaunchPlan", version: 2, work: "fixture", title: "Fixture", plannedAt: "2026-10-02",
    onSale: { date: "2026-12-08", channels: { kobo: "2026-12-15" } }, announce: "2026-11-03", preorder: { kdp: true, kobo: false }, advanceReading: null,
    channels: [{ id: "kdp", status: "forthcoming", notes: [] }, { id: "kobo", status: "forthcoming", notes: [] }],
  };
  const submission = (overrides = {}, dataRoot = root) => ({ book: "fixture", listing, artifacts: { epub, cover }, releaseAcceptance, validation, launchPlan, dataRoot, dryRun: true, now: () => "2026-10-02T00:00:00Z", ...overrides });
  assert.deepEqual(kdpStepInput("metadata", listing, { epub, cover }, { launchPlan }).release, { preorder: true, date: "2026-12-08" });
  assert.deepEqual(kdpStepInput("metadata", listing, { epub, cover }, { launchPlan: { ...launchPlan, preorder: { kdp: false, kobo: true } } }).release, { preorder: false });
  assert.equal(Object.hasOwn(kdpStepInput("metadata", listing, { epub, cover }), "release"), false, "without a plan, KDP's default release holds");

  // The fixture pages, in a browser: the details page holds the plan's date when the metadata step saves.
  const filled = await runKdpSubmission(submission({ fixtureRoot: FIXTURES }), { config: {}, publicKey });
  assert.equal(filled.status, "needs-human", JSON.stringify(filled.blocker));
  assert.equal(filled.blocker.reason, "policy-declaration-required");
  assert.ok(filled.completed.includes("metadata") && filled.evidence.some(({ content }) => content.step === "metadata"));
  // A details page without the pre-order section stops the step as drift, never saves it without its release.
  const bare = await mkdtemp(join(tmpdir(), "kdp-fixtures-"));
  await cp(FIXTURES, bare, { recursive: true });
  await writeFile(join(bare, "metadata.html"), (await readFile(join(FIXTURES, "metadata.html"), "utf8")).replace(/<label>.*\n/gu, ""));
  const drift = await runKdpSubmission(submission({ fixtureRoot: bare }, await mkdtemp(join(tmpdir(), "kdp-preorder-drift-"))), { config: {}, publicKey });
  assert.equal(drift.status, "blocked");
  assert.deepEqual([drift.blocker.stage, drift.blocker.code], ["metadata", "KDP_SELECTOR_MISSING"]);
  assert.match(drift.blocker.cause, /KDP form selector missing: \[name="release"\]\[value="preorder"\]/u);

  await assert.rejects(runKdpSubmission(submission({ releaseAcceptance: undefined }), { config: {}, publicKey }), /KDP pre-order of fixture needs its edition's release acceptance/u);
  await assert.rejects(runKdpSubmission(submission({ launchPlan: { ...launchPlan, work: "other" } }), { config: {}, publicKey }), /launch plan is for other, not fixture/u);
  await assert.rejects(runKdpSubmission(submission({ launchPlan: { ...launchPlan, onSale: { date: null } } }), { config: {}, publicKey }), /forthcoming .* needs an on-sale date/u);
});
