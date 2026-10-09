import { createPublicKey } from "node:crypto";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { mkdir, readFile, stat } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { admitAcceptedEbook, declaresAnswers } from "./edition-gates.mjs";
import { liveKdpDriver } from "./kdp-live-driver.mjs";
import { channelRelease } from "./launch-plan.mjs";
import { DEFAULT_KDP_STORAGE_STATE_PATH, KDP_LOGIN_COMMAND, isKdpSessionValid } from "./kdp-session.mjs";
import { channelFields, digestJson, portalChallenge, recordNeedsHuman, runRetailSubmission } from "./retail-submission.mjs";

export { retailerSubmissionReceiptType } from "./retail-submission.mjs";
/** Human boundaries on any KDP step (the feedback loop's report download too) are recorded as for every retailer. */
export const recordKdpNeedsHuman = recordNeedsHuman;

/** In KDP's page order: details (title, metadata, series), content (files, AI declarations), pricing, then publish. */
export const KDP_STEPS = Object.freeze(["create-title", "metadata", "series", "upload-epub", "upload-cover", "declarations", "pricing", "save-draft", "publish"]);
/** The steps each KDP form holds, saved together: the content page by Save and Continue, the pricing page by Save as Draft or Publish. */
const KDP_FORMS = Object.freeze([Object.freeze(["upload-epub", "upload-cover", "declarations"]), Object.freeze(["pricing", "save-draft", "publish"])]);

function configPath() { return join(homedir(), ".config", "561-group", "kdp.json"); }

/** Read only a private user configuration file; never include its contents in results or errors. */
export async function readKdpConfig(path = configPath(), { dryRun = false } = {}) {
  const mode = (await stat(path)).mode & 0o777;
  if ((mode & 0o077) !== 0) throw new Error("KDP config must not be readable or writable by group/other users");
  const config = JSON.parse(await readFile(path, "utf8"));
  if (typeof config.validationPublicKey !== "string") throw new TypeError("KDP config needs a validationPublicKey path");
  const storageState = typeof config.storageState === "string"
    ? resolve(dirname(path), config.storageState)
    : dryRun ? null : DEFAULT_KDP_STORAGE_STATE_PATH;
  if (storageState && !dryRun) {
    try {
      const storageMode = (await stat(storageState)).mode & 0o777;
      if ((storageMode & 0o077) !== 0) throw new Error("KDP browser storage state must not be readable or writable by group/other users");
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
  const marketplace = new URL(config.marketplace ?? "https://kdp.amazon.com");
  if (marketplace.protocol !== "https:" || !/(^|\.)kdp\.amazon\.com$/u.test(marketplace.hostname)) throw new TypeError("KDP marketplace must be an HTTPS kdp.amazon.com origin");
  return Object.freeze({ storageState, validationPublicKey: resolve(dirname(path), config.validationPublicKey), marketplace: marketplace.origin });
}

/** The listing's series field reads "<name>, number <n>". */
function kdpSeries(value) {
  if (value === undefined) return null;
  const match = /^(.+),\s*number\s+(\d+)$/u.exec(String(value).trim());
  if (!match) throw new TypeError(`KDP listing series is not "<name>, number <n>": ${value}`);
  return { name: match[1].trim(), number: Number(match[2]) };
}

/**
 * The title's KDP release, from the launch plan a submission carries: `{ preorder: false }`, or a pre-order released on
 * the plan's KDP on-sale date. Without a plan, KDP's default holds: the title goes on sale when it is published. The
 * house makes no assetless pre-order: a pre-order is set up only for an edition with a release acceptance, whose exact
 * EPUB is uploaded with it.
 */
function kdpRelease({ book, launchPlan, releaseAcceptance }) {
  if (!launchPlan) return null;
  if (launchPlan.work !== book) throw new Error(`the launch plan is for ${launchPlan.work}, not ${book}`);
  const release = channelRelease(launchPlan, "kdp");
  if (release.preorder && !releaseAcceptance) throw new Error(`a KDP pre-order of ${book} needs its edition's release acceptance; the house makes no assetless pre-order`);
  return release;
}

function stepInput(step, fields, artifacts, { declarationsReceipt, launchPlan } = {}) {
  switch (step) {
    case "create-title": return { title: fields.title, language: fields.language };
    case "metadata": return { title: fields.title, language: fields.language, subtitle: fields.subtitle ?? "", author: fields.author, publisher: fields.publisher, description: fields.description, keywords: fields.keywords, subjects: fields.subjects, categories: fields.categories ?? "", aiDisclosure: fields.aiDisclosure, ...(launchPlan ? { release: channelRelease(launchPlan, "kdp") } : {}) };
    case "series": return { series: kdpSeries(fields.series) };
    case "upload-epub": return { path: artifacts.epub, drm: fields.drm };
    case "upload-cover": return { path: artifacts.cover };
    case "pricing": return { territories: fields.territories, royalty: fields.royalty, listPriceUsd: fields.listPriceUsd, drm: fields.drm, kdpSelect: fields.kdpSelect };
    case "save-draft": return {};
    case "declarations": return { aiDisclosure: fields.aiDisclosure, kdpOptions: declarationsReceipt?.kdpForm?.options ?? null, kdpTools: declarationsReceipt?.kdpForm?.tools ?? null, publisher: fields.publisher };
    case "publish": return {};
    default: throw new TypeError(`unknown KDP step ${step}`);
  }
}

export function kdpStepInput(step, listing, artifacts, { declarationsReceipt, launchPlan } = {}) {
  return stepInput(step, channelFields(KDP_CHANNEL, listing), artifacts, { declarationsReceipt, launchPlan });
}

/** Drives the saved fixture pages; the live receiver is liveKdpDriver. */
async function fixturePlaywrightDriver({ fixtureRoot, evidenceRoot, book, evidence }) {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const load = async (step) => page.goto(pathToFileURL(join(fixtureRoot, `${step}.html`)).href, { waitUntil: "domcontentloaded" });
  const refuse = (message, code) => { const error = new Error(message); error.code = code; throw error; };
  const present = async (selector) => { const target = page.locator(selector); if (!await target.count()) refuse(`KDP form selector missing: ${selector}`, "KDP_SELECTOR_MISSING"); return target.first(); };
  const fill = async (selector, value) => (await present(selector)).fill(String(value ?? ""));
  return Object.freeze({
    async run(step, input) {
      await load(step);
      const challenged = async () => portalChallenge(await page.locator("body").innerText(), page.url());
      const before = await challenged(); if (before) return { needsHuman: true, reason: before };
      if (step === "create-title") await page.locator('[data-kdp="create-title"]').click();
      if (step === "metadata") {
        await fill('[name="title"]', input.title); await fill('[name="subtitle"]', input.subtitle); await fill('[name="author"]', input.author);
        await fill('[name="publisher"]', input.publisher); await fill('[name="description"]', input.description);
        for (const [index, keyword] of input.keywords.entries()) await fill(`[name="keyword-${index + 1}"]`, keyword);
        await fill('[name="ai-text"]', input.aiDisclosure.text); await fill('[name="ai-images"]', input.aiDisclosure.images); await fill('[name="ai-translations"]', input.aiDisclosure.translations);
        if (input.release) {
          await (await present(`[name="release"][value="${input.release.preorder ? "preorder" : "now"}"]`)).check();
          if (input.release.preorder) await fill('[name="release-date"]', input.release.date);
          const held = await (await present('[name="release"][value="preorder"]')).isChecked() ? await page.locator('[name="release-date"]').inputValue() : null;
          if (held !== (input.release.preorder ? input.release.date : null)) refuse(`the details page holds release ${held ?? "now"}, not the plan's ${input.release.date ?? "now"}`, "KDP_RELEASE_UNSET");
        }
      }
      if (step === "series" && input.series) { await fill('[name="series-name"]', input.series.name); await fill('[name="series-number"]', input.series.number); }
      if (["upload-epub", "upload-cover"].includes(step)) await page.locator(`input[type="file"][data-kdp="${step}"]`).setInputFiles(input.path);
      if (step === "pricing") { await fill('[name="price-usd"]', input.listPriceUsd); await fill('[name="royalty"]', input.royalty); }
      if (["save-draft", "publish"].includes(step)) await page.locator(`[data-kdp="${step}"]`).click();
      const after = await challenged(); if (after) return { needsHuman: true, reason: after };
      await mkdir(evidenceRoot, { recursive: true });
      const screenshot = join(evidenceRoot, `${step}.png`); await page.screenshot({ path: screenshot, fullPage: true });
      const identifier = page.locator('[data-kdp="remote-identifier"]');
      const remoteIdentifier = await identifier.count() ? (await identifier.first().textContent())?.trim() || undefined : undefined;
      return { evidence: evidence(screenshot, await readFile(screenshot), book, step, new Date().toISOString()), ...(remoteIdentifier ? { remoteIdentifier } : {}) };
    },
    close: () => browser.close(),
  });
}

/**
 * KDP's Kindle eBook as a retail channel. Its gate is the signed Kindle
 * validation of the exact EPUB and cover bytes, and the content-addressed
 * Kindle release acceptance of that EPUB.
 */
/**
 * KDP lets an account create 2 new titles per format (ebook, paperback,
 * hardcover) a week, from 2026-09-21; a saved draft counts, and the week
 * resets Sunday 00:00 UTC without rollover (KDP Help, reported by Publishers
 * Lunch, "KDP Limits Authors To Two New Titles A Week", September 2026).
 */
export const KDP_TITLE_ALLOWANCE = Object.freeze({ step: "create-title", perWeek: 2 });

export const KDP_CHANNEL = Object.freeze({
  id: "kdp", retailer: "kdp", name: "KDP",
  steps: KDP_STEPS, forms: KDP_FORMS, titleAllowance: KDP_TITLE_ALLOWANCE,
  uploads: Object.freeze({ "upload-epub": "epub", "upload-cover": "cover" }),
  async admit(inputs, capabilities) {
    kdpRelease(inputs);
    const config = capabilities.config ?? await readKdpConfig(capabilities.configPath);
    const publicKey = capabilities.publicKey ?? createPublicKey(await readFile(config.validationPublicKey, "utf8"));
    // A passing validation already includes the Kindle portability assay.
    return { ...await admitAcceptedEbook("KDP", inputs, publicKey), config };
  },
  /** A version-1 state bound the whole listing at once; it resumes only on that same listing. */
  migrateState(state, { book, fields, exact, inputs, intent, stepInput: digestStep }) {
    if (state.version !== 1 || !state.intent) return;
    if (state.intent !== digestJson({ book, listing: fields, artifacts: exact, releaseAcceptance: inputs.releaseAcceptance.id })) throw new Error("KDP resume state belongs to different metadata, price, or artifact bytes");
    Object.assign(state, { version: 2, intent, stepInputs: Object.fromEntries(state.completed.map((step) => [step, digestStep(step)])) });
  },
  stepInput,
  declarations: Object.freeze({
    step: "declarations",
    answers: (fields) => fields.aiDisclosure,
    covers: (receipt, book, fields) => declaresAnswers(receipt, book, fields.aiDisclosure),
  }),
  receipt: (fields, exact) => ({
    rendition: "EPUB", artifactSha256: exact.epub.sha256, coverSha256: exact.cover.sha256,
    priceTerms: { territories: fields.territories, royalty: fields.royalty, listPriceUsd: fields.listPriceUsd, drm: fields.drm, kdpSelect: fields.kdpSelect },
  }),
  session: Object.freeze({
    check: (config, capabilities) => isKdpSessionValid({ storageState: config.storageState, marketplace: config.marketplace }, capabilities),
    command: KDP_LOGIN_COMMAND, reason: "kdp-session-missing-or-expired",
  }),
  liveDriver: liveKdpDriver,
  fixtureDriver: fixturePlaywrightDriver,
});

/** Idempotent, resumable boundary driver. Live network execution requires an explicit allowLive capability. */
export const runKdpSubmission = (inputs, capabilities = {}) => runRetailSubmission(KDP_CHANNEL, inputs, capabilities);
