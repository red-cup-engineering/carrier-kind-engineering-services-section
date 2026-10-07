#!/usr/bin/env node
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, join } from "node:path";
import { addressedRecord, writeAddressedRecord } from "../src/cover-lab/records.mjs";
import { planCoverCandidates } from "../src/cover-lab/concepts.mjs";
import { providerInventoryRecord } from "../src/cover-lab/providers.mjs";
import { FROZEN_RUBRIC } from "../src/cover-lab/rubric.mjs";

const [bookRootArgument, outputRootArgument] = process.argv.slice(2);
if (!bookRootArgument || !outputRootArgument) throw new TypeError("usage: cover-lab-plan <book-root> <edition-cover-lab-root>");
const bookRoot = resolve(bookRootArgument), outputRoot = resolve(outputRootArgument);
const storyBible = JSON.parse(await readFile(join(bookRoot, "story-bible.json"), "utf8"));
const ebook = JSON.parse(await readFile(join(bookRoot, "ebook.json"), "utf8"));
const observedAt = "2026-09-29T18:00:00.000Z";

const marketObstruction = addressedRecord("CoverMarketAcquisitionObstruction", 1, {
  work: storyBible.work, observedAt,
  request: { category: "contemporary-romance", source: "https://www.amazon.com/Best-Sellers-Kindle-Store-Contemporary-Romance/zgbs/digital-text/158568011", acquisition: "bounded robots-respecting house market acquisition" },
  disposition: "acquisition-obstructed", reason: "market source acquisition was not delivered", retainedCoverImages: 0,
});
const conventionField = addressedRecord("CoverConventionField", 1, {
  status: "blocked-current-acquisition", category: "contemporary/small-town/slow-burn romance; lake-town and winter settings", derivedAt: observedAt,
  sampleSize: 0, sourceObservations: [],
  vector: { rendering: {}, figurePose: {}, settingMotifs: {}, typographyClass: {}, meanTitleAreaRatio: 0.3, meanThumbnailContrast: null },
  rewards: [], saturated: {}, gaps: [],
  priorsNotMarketFindings: [
    { source: "assignment critique of the current Ice Out cover", claims: ["romance signal is absent", "small title vanishes at thumbnail size", "cover lacks people and warmth", "Duluth Aerial Lift Bridge is story-specific"] },
    { source: "Ice Out story-bible.json", claims: ["slow-burn restrained couple", "Duluth winter", "Harbor Garden warmth", "Aerial Lift Bridge", "acts of service", "Lantern Festival"] },
  ],
  biasLimits: ["No current category sample was delivered; priors are not represented as market observations."], obstruction: marketObstruction.id,
});
const concepts = planCoverCandidates({ conventionField, storyBible });
const providerProbe = {
  disposition: "unreachable",
  attempts: [
    { route: "deployed-worker", provider: "cloudflare-workers-ai", model: "@cf/black-forest-labs/flux-1-schnell", result: "EAI_AGAIN getaddrinfo pod-image-generation-worker.morgan-sennhauser.workers.dev" },
    { route: "account-api", provider: "cloudflare-workers-ai", model: "@cf/black-forest-labs/flux-1-schnell", result: "Missing or invalid CLOUDFLARE_ACCOUNT_ID" },
  ],
};
const providers = providerInventoryRecord(observedAt, providerProbe);
const experiment = addressedRecord("ConceptExperiment", 1, {
  status: "future-not-run", work: storyBible.work,
  variants: [{ arm: "A", plannedFamily: "bridge-couple", artifact: null }, { arm: "B", plannedFamily: "window-light", artifact: null }],
  outcomes: ["KDP sales", "sample-to-purchase conversion", "Search Console click-through", "ads click-through"],
  startCondition: "two defect-free selected cover artifacts and live traffic exist", reasonNotRun: "no live sales data and no generated artifacts",
});
const disclosure = addressedRecord("AiGeneratedContentDisclosure", 1, {
  work: storyBible.work, cover: { answer: "Yes, if a Cover Lab generated candidate is selected", currentBuildAnswer: "No; TikZ fallback remains selected because generation was obstructed", evidence: [providers.id] },
  typography: { generatedByImageModel: false, method: "deterministic code composition", font: "Noto Sans", fontLicense: "OFL-1.1" },
});
const decision = addressedRecord("CoverDecisionReceipt", 1, {
  status: "blocked-before-generation", work: storyBible.work, decidedAt: observedAt,
  conventionField: conventionField.id, concepts: concepts.id, rubric: FROZEN_RUBRIC.id, providers: providers.id,
  winner: null, runnerUp: null, currentBuild: "cover-art.tikz fallback", byline: { value: ebook.author, adopted: false },
  judgeCalibration: null, reason: "No real image provider or three-family vision judge ensemble was reachable; selection would be unevidenced.",
  blockers: [
    { code: "image-provider-unreachable", failureClass: "PROVIDER_OUTAGE", evidence: providers.id, boundaryType: null },
    { code: "vision-judge-adapter-unavailable", failureClass: "INSUFFICIENT_MACHINE_CAPABILITY", boundaryType: null },
    { code: "current-market-sample-unavailable", failureClass: "PROVIDER_OUTAGE", evidence: marketObstruction.id, boundaryType: null },
  ],
  experiment: experiment.id, disclosure: disclosure.id,
});

await mkdir(outputRoot, { recursive: true });
const records = [marketObstruction, conventionField, concepts, providers, FROZEN_RUBRIC, experiment, disclosure, decision];
await Promise.all(records.map((record) => writeAddressedRecord(join(outputRoot, "evidence"), record)));
for (const [name, record] of [["market-obstruction", marketObstruction], ["cover-convention-field", conventionField], ["concept-set", concepts], ["provider-inventory", providers], ["frozen-rubric", FROZEN_RUBRIC], ["future-ab-experiment", experiment], ["ai-disclosure", disclosure], ["decision-receipt", decision]]) await writeFile(join(outputRoot, `${name}.json`), `${JSON.stringify(record, null, 2)}\n`, { mode: 0o600 });
console.log(JSON.stringify({ status: decision.status, outputRoot, records: records.map(({ id, type }) => ({ id, type })), candidates: concepts.candidates.length, families: concepts.families.length }));
