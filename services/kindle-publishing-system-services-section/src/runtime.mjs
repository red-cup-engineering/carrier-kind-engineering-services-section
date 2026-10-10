import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createPrivateKey } from "node:crypto";
import { acquireKindleMarketSnapshots } from "./market-acquisition.mjs";
import { planKindleBook, writeBookPlan } from "./planner.mjs";
import { draftKindleBook, fabricateProofAndAccept } from "./drafting.mjs";
import { specifyEbookEdition } from "@red-cup-engineering/ebook-engineering-services-section/specify-ebook-edition";
import { coverFileName } from "@red-cup-engineering/ebook-engineering-services-section";
import { acceptKindleRelease, signKindleValidationReceipt, validateKindleEdition } from "@red-cup-engineering/ebook-engineering-services-section/kindle-validation";
import { retailListingFor } from "@red-cup-engineering/digital-goods-storefront-services-section/retail-listings";
import { runKdpSubmission, readKdpConfig } from "./kdp-submit.mjs";
import { acquireKdpReports, feedbackForNicheScorer, importKdpReport, ownedRankReadings, writeLaunchReadout } from "./feedback.mjs";
import { admitPublicationBundle, attachExternalIdentifier, projectOnix, projectOpdsEntry } from "./publication-projections.mjs";
import { allocateChannelCapacity, validateChannelCapacity } from "./publication-control.mjs";
import { materializeEditionCover } from "./cover-lab/edition-cover.mjs";

const CONFIG = join(homedir(), ".config", "561-group", "kindle-pipeline.json");
async function json(path) { return JSON.parse(await readFile(path, "utf8")); }
async function save(path, value) { await mkdir(dirname(path), { recursive: true }); await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 }); return value; }
const artifact = (root, name) => join(root, `${name}.json`);

export async function readKindlePipelineConfig(path = CONFIG) {
  const config = await json(path), base = dirname(path);
  for (const required of ["dataRoot", "contentRoot", "customerActor", "categories", "marketPolicy", "validationPrivateKey", "validationKeyId"]) if (config[required] === undefined) throw new TypeError(`Kindle pipeline config needs ${required}`);
  if (config.channelCapacity) validateChannelCapacity(config.channelCapacity);
  if (config.bylineAdopted === true && (typeof config.byline?.name !== "string" || typeof config.byline?.adoptionAuthority !== "string")) throw new TypeError("an adopted byline needs its name and explicit adoptionAuthority");
  return Object.freeze({ ...config, bylineAdopted: config.bylineAdopted === true, byline: Object.freeze({ ...(config.byline ?? {}) }), dataRoot: resolve(base, config.dataRoot), contentRoot: resolve(base, config.contentRoot), validationPrivateKey: resolve(base, config.validationPrivateKey), kdpConfig: config.kdpConfig ? resolve(base, config.kdpConfig) : undefined, fixtureRoot: config.fixtureRoot ? resolve(base, config.fixtureRoot) : undefined, declarationsReceipt: config.declarationsReceipt ? resolve(base, config.declarationsReceipt) : undefined, reportFixtures: (config.reportFixtures ?? []).map((fixture) => resolve(base, fixture)), launchPlan: config.launchPlan ? resolve(base, config.launchPlan) : null, dryRun: config.dryRun !== false });
}

function disclosureAnswers(disclosure) {
  const answer = (field) => { const value = disclosure?.[field]; if (typeof value?.answer !== "string" || !value.answer || /replace-with|unknown/iu.test(value.answer) || typeof value.evidence !== "string" || !value.evidence) throw new TypeError(`KDP ${field} disclosure needs an evidence-backed answer`); return value.answer; };
  return Object.freeze({ text: answer("text"), images: answer("images"), translations: answer("translations") });
}

/** Default stage capabilities used by the MetroPlat operation; every durable artifact is replayable. */
export async function kindlePipelineHandlers({ configPath = CONFIG } = {}) {
  const config = await readKindlePipelineConfig(configPath), runRoot = join(config.dataRoot, "kindle-pipeline", "autonomous-kindle-line"); await mkdir(runRoot, { recursive: true });
  const cycleRoot = (cycle) => join(runRoot, `cycle-${String(cycle).padStart(6, "0")}`);
  const planRecord = async (cycle) => json(artifact(cycleRoot(cycle), "plan"));
  const previousFeedback = async (cycle) => {
    for (let earlier = cycle - 1; earlier >= 1; earlier -= 1) {
      try { return feedbackForNicheScorer(await json(artifact(cycleRoot(earlier), "feedback"))); } catch { /* continue to earlier completed cycles */ }
    }
    return [];
  };
  return Object.freeze({
    market: async ({ cycle }) => {
      const root = cycleRoot(cycle), feedback = await previousFeedback(cycle);
      const result = await acquireKindleMarketSnapshots({ categories: config.categories, dataRoot: join(root, "market"), policy: config.marketPolicy, demands: config.demands ?? [], feedback });
      if (!result.snapshots.length) return { status: "blocked", code: "no-market-snapshots", obstructions: result.obstructions };
      await save(artifact(root, "market"), result); return { status: "complete", snapshots: result.snapshots.map(({ id }) => id), analysis: result.analysis.id, opportunities: result.opportunities.length };
    },
    plan: async ({ cycle, at }) => {
      const root = cycleRoot(cycle);
      const market = await json(artifact(root, "market")), opportunity = market.opportunities.filter(({ score }) => Number.isFinite(score)).sort((left, right) => right.score - left.score)[0];
      if (!opportunity) return { status: "blocked", code: "no-ranked-opportunity" };
      const evidenceId = market.analysis?.id ?? market.snapshots[0].id;
      const result = await planKindleBook({ opportunity: { ...opportunity, evidenceId }, customerActor: config.customerActor, editionDate: at.slice(0, 10) }); if (result.status !== "planned") return result;
      const selectedBook = result.receipt.content.plan.ebook.slug, bookRoot = join(config.contentRoot, selectedBook); await writeBookPlan(bookRoot, result.receipt); await save(artifact(root, "plan"), result.receipt); return { status: "complete", book: selectedBook, receipt: result.receipt.id };
    },
    draft: async ({ cycle }) => {
      const root = cycleRoot(cycle), receipt = await planRecord(cycle), selectedBook = receipt.content.plan.ebook.slug; const result = await draftKindleBook({ planReceipt: receipt, bookRoot: join(config.contentRoot, selectedBook), customerActor: config.customerActor }); await save(artifact(root, "draft"), result); return { ...result, book: selectedBook, chapters: result.chapters?.length };
    },
    format: async ({ cycle }) => {
      const root = cycleRoot(cycle), receipt = await planRecord(cycle), draft = await json(artifact(root, "draft")), selectedBook = receipt.content.plan.ebook.slug;
      const dist = join(config.dataRoot, "kindle-pipeline", "editions", selectedBook), specified = specifyEbookEdition({ manifestPath: join(config.contentRoot, selectedBook, "ebook.json"), request: receipt.id, distDir: dist }); if (specified.status !== "specified") return specified;
      const result = await fabricateProofAndAccept({ specification: specified.specification, source: specified.source, draft, customerActor: config.customerActor }); if (result.status !== "editorially-accepted") return result;
      const cover = join(dist, `${selectedBook}-kdp-cover.jpg`);
      const coverMaterialization = await materializeEditionCover({ cover: join(dist, coverFileName(specified.source)), outputJpeg: cover });
      await save(artifact(root, "format"), { ...result, source: specified.source, cover, coverMaterialization }); return { status: "complete", book: selectedBook, acceptance: result.acceptance };
    },
    validate: async ({ cycle }) => {
      const root = cycleRoot(cycle), formatted = await json(artifact(root, "format")), selectedBook = formatted.source.slug, epub = formatted.fabrication.artifacts.epub.path, cover = formatted.cover;
      const cell = await validateKindleEdition({ book: selectedBook, epubPath: epub, coverPath: cover, evidenceRoot: join(root, "validation-evidence") }); if (!cell.content.passed) return { status: "blocked", code: "kindle-validation-failed", receipt: cell };
      const releaseAcceptance = acceptKindleRelease({ book: selectedBook, fabrication: formatted.fabrication, editorialAcceptance: formatted.acceptance, validation: cell });
      const key = createPrivateKey(await readFile(config.validationPrivateKey, "utf8")), signed = signKindleValidationReceipt(cell, key, config.validationKeyId); await save(artifact(root, "validation"), signed); await save(artifact(root, "release-acceptance"), releaseAcceptance); return { status: "complete", book: selectedBook, receipt: cell.id, releaseAcceptance: releaseAcceptance.id };
    },
    publish: async ({ cycle, at }) => {
      const root = cycleRoot(cycle), receipt = await planRecord(cycle), formatted = await json(artifact(root, "format")), validation = await json(artifact(root, "validation")), releaseAcceptance = await json(artifact(root, "release-acceptance")), selectedBook = receipt.content.plan.ebook.slug;
      if (config.bylineAdopted !== true) return { status: "needs-human", code: "byline-adoption-required", boundaryType: "RESERVED_HUMAN_AUTHORITY_REQUIRED", book: selectedBook, detail: { proposedByline: config.byline.name ?? null, researchStatus: config.byline.researchStatus ?? "recommendation-not-adopted" } };
      if (!config.channelCapacity) return { status: "blocked", code: "channel-capacity-profile-missing", book: selectedBook };
      const allocation = allocateChannelCapacity({ profile: config.channelCapacity, candidates: [{ book: selectedBook, format: "EPUB", expectedContribution: receipt.content.expectedContribution }], releases: config.channelReleaseObservations ?? [], now: at });
      if (!allocation.allocated.length) { await save(artifact(root, "publish"), { status: "channel-queued", allocation }); return { status: "complete", code: "channel-capacity-queued", disposition: "channel-queued", book: selectedBook, allocation }; }
      const ebook = receipt.content.plan.ebook, adoptedByline = config.byline.name, offering = { id: selectedBook, title: ebook.title, subtitle: ebook.subtitle, description: ebook.description, blurb: ebook.description, priceCents: config.priceCents ?? 399, keywords: ebook.keywords, book: { author: adoptedByline, profile: "fiction", subjects: ebook.subjects, marks: ebook.marks, coverFile: formatted.cover, edition: { proof: formatted.proof, files: [{ format: "EPUB", path: formatted.fabrication.artifacts.epub.path, sha256: formatted.fabrication.artifacts.epub.sha256 }] } } };
      const projectedListing = retailListingFor(offering, "kdp"), listing = { ...projectedListing, fields: { ...projectedListing.fields, author: config.byline.name, aiDisclosure: disclosureAnswers(config.kdpAiGeneratedContentDisclosure) } }, kdp = await readKdpConfig(config.kdpConfig, { dryRun: config.dryRun }), declarationsReceipt = config.declarationsReceipt ? await json(config.declarationsReceipt) : undefined;
      const epubSha256 = Buffer.from(formatted.fabrication.artifacts.epub.sha256.slice("ni:///sha-256;".length), "base64url").toString("hex");
      const bundle = admitPublicationBundle({
        work: { type: "Work", id: selectedBook, title: ebook.title, ...(ebook.subtitle ? { subtitle: ebook.subtitle } : {}), contributors: [{ role: "A01", name: adoptedByline }], language: "eng" },
        edition: { type: "Edition", id: `${selectedBook}-edition-${receipt.id.slice(-12)}`, work: selectedBook, description: ebook.description, subjects: ebook.subjects, publicationDate: ebook.date ?? at.slice(0, 10), imprint: "561 Group" },
        rendition: { type: "Rendition", id: `${selectedBook}-epub-${epubSha256.slice(0, 12)}`, edition: `${selectedBook}-edition-${receipt.id.slice(-12)}`, form: "EPUB", ...(config.isbnByBook?.[selectedBook] ? { isbn: config.isbnByBook[selectedBook] } : {}) },
        artifact: { type: "Artifact", id: formatted.fabrication.artifacts.epub.sha256, rendition: `${selectedBook}-epub-${epubSha256.slice(0, 12)}`, href: formatted.fabrication.artifacts.epub.path, mediaType: "application/epub+zip", sha256: epubSha256, bytes: formatted.fabrication.artifacts.epub.bytes },
        offer: { type: "Offer", id: `${selectedBook}-kdp`, rendition: `${selectedBook}-epub-${epubSha256.slice(0, 12)}`, currency: "USD", price: (config.priceCents ?? 399) / 100, territories: "WORLD", availability: "20" },
      });
      let projectedBundle = bundle, onix = projectOnix(projectedBundle, { accessibilityEvidence: validation.cell.content.checks }), opds = projectOpdsEntry(projectedBundle);
      await save(artifact(root, "publication"), { bundle: projectedBundle, onix, opds });
      const state = await runKdpSubmission({ book: selectedBook, listing, artifacts: { epub: formatted.fabrication.artifacts.epub.path, cover: formatted.cover }, releaseAcceptance, validation, dataRoot: config.dataRoot, declarationsReceipt, ...(config.launchPlan ? { launchPlan: await json(config.launchPlan) } : {}), dryRun: config.dryRun, fixtureRoot: config.fixtureRoot }, { config: kdp, allowLive: config.allowLiveKdp === true });
      if (/^[A-Z0-9]{10}$/u.test(state.remoteIdentifier ?? "")) {
        projectedBundle = attachExternalIdentifier(projectedBundle, { scheme: "ASIN", value: state.remoteIdentifier, assignedAt: state.updatedAt, evidence: state.receipt?.id ?? null });
        onix = projectOnix(projectedBundle, { accessibilityEvidence: validation.cell.content.checks }); opds = projectOpdsEntry(projectedBundle);
        await save(artifact(root, "publication"), { bundle: projectedBundle, onix, opds });
      }
      await save(artifact(root, "publish"), state); return { ...state, book: selectedBook, publication: projectedBundle.id };
    },
    feedback: async ({ cycle }) => {
      const root = cycleRoot(cycle), receipt = await planRecord(cycle), selectedBook = receipt.content.plan.ebook.slug, kdp = await readKdpConfig(config.kdpConfig, { dryRun: config.dryRun });
      try { const published = await json(artifact(root, "publish")); if (published.status === "channel-queued") return { status: "complete", code: "feedback-awaits-channel-release", book: selectedBook }; } catch { /* publish state is diagnosed below */ }
      const rankSources = (config.ownedAsins ?? []).filter(({ rankUrl }) => typeof rankUrl === "string").map(({ asin, rankUrl }) => ({ id: `owned:${asin}`, url: rankUrl }));
      let rankSnapshots = [];
      if (rankSources.length) {
        const rankMonitor = await acquireKindleMarketSnapshots({ categories: rankSources, dataRoot: join(root, "owned-ranks"), policy: config.marketPolicy });
        rankSnapshots = rankMonitor.snapshots;
        await save(artifact(root, "owned-ranks"), rankMonitor);
      }
      let reports;
      try { reports = await acquireKdpReports({ config: kdp, downloadDirectory: join(root, "reports"), dataRoot: config.dataRoot, book: selectedBook, dryRun: config.dryRun, fixtures: config.reportFixtures }, { allowLive: config.allowLiveKdp === true }); }
      catch (error) { if (error?.code === "KDP_NEEDS_HUMAN") return { status: "needs-human", code: "authentication-challenge", blocker: error.event, book: selectedBook }; throw error; }
      if (!reports.length) return { status: "pending", code: "no-report-yet", book: selectedBook };
      const owned = Object.fromEntries((config.ownedAsins ?? []).map((entry) => [entry.asin, entry])); const ranks = ownedRankReadings(rankSnapshots, owned);
      const feedback = await importKdpReport({ path: reports[0], bookMetadata: Object.fromEntries((config.ownedAsins ?? []).flatMap((entry) => [[entry.asin, entry], [entry.title, entry]])), ranks }); await save(artifact(root, "feedback"), feedback);
      if (config.launchPlan) await writeLaunchReadout({ launchPlanPath: config.launchPlan, outputPath: join(dirname(config.launchPlan), `${new Date().toISOString().slice(0, 10)}-${selectedBook}-readout.json`), feedbackReceipt: feedback });
      return { status: "complete", book: selectedBook, receipt: feedback.id };
    },
  });
}
