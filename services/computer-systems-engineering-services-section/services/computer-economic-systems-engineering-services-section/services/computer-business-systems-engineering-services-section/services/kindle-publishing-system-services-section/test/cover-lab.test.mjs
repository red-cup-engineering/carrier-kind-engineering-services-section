import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { addressedRecord, contentId, humanBoundary, writeAddressedRecord } from "../src/cover-lab/records.mjs";
import { deriveConventionField, observeCoverFeatures } from "../src/cover-lab/conventions.mjs";
import { assertPromptHasNoTypography, planCoverCandidates } from "../src/cover-lab/concepts.mjs";
import { calibrateJudges, FROZEN_RUBRIC, runThumbnailTournament, scoreCandidate } from "../src/cover-lab/rubric.mjs";
import { compositeTypography, validateCover } from "../src/cover-lab/specification.mjs";
import { generateCoverBackground, providerInventoryRecord } from "../src/cover-lab/providers.mjs";
import { acquireCoverFeatureObservations, extractCoverSamples } from "../src/cover-lab/acquisition.mjs";
import { runCoverLab } from "../src/cover-lab/run.mjs";

const observedAt = "2026-09-29T12:00:00.000Z";

function observations() {
  return Array.from({ length: 8 }, (_, index) => observeCoverFeatures({
    source: "https://www.amazon.com/bestsellers/books/9059889011", observedAt,
    sample: { asin: `B00000000${index}`, category: "small-town-romance" },
    samplingMethod: "fixture first-page sample", biasLimits: ["fixture"],
    palette: ["#17324d", index % 2 ? "#ed9a72" : "#f5e7d3"], rendering: index < 5 ? "illustrated" : "photographic",
    figurePose: index < 4 ? "couple-embrace" : "couple-separated", settingMotifs: index < 2 ? ["warm-window-light"] : ["small-town-street"],
    titleAreaRatio: 0.3, typographyClass: "display-serif", thumbnailContrast: 0.8, perceptualHash: `${index}`.repeat(16),
  }));
}

test("records are canonical, content-addressed, immutable on disk, and human boundaries are typed", async () => {
  const left = addressedRecord("Fixture", 1, { b: 2, a: 1 });
  const right = addressedRecord("Fixture", 1, { a: 1, b: 2 });
  assert.equal(left.id, right.id);
  assert.equal(left.id, contentId({ type: "Fixture", version: 1, a: 1, b: 2 }));
  const root = await mkdtemp(join(tmpdir(), "cover-records-")), path = await writeAddressedRecord(root, left);
  assert.deepEqual(JSON.parse(await readFile(path, "utf8")), left);
  assert.equal(humanBoundary({ reason: "byline adoption", boundaryType: "RESERVED_HUMAN_AUTHORITY_REQUIRED", at: observedAt }).boundaryType, "RESERVED_HUMAN_AUTHORITY_REQUIRED");
  assert.throws(() => humanBoundary({ reason: "unknown", boundaryType: "ASK_FOUNDER", at: observedAt }), /invalid human boundary/u);
});

test("convention field remains a vector and produces six families with twenty-four text-free image prompts", () => {
  const field = deriveConventionField(observations(), { category: "slow-burn small-town winter romance", derivedAt: observedAt });
  assert.equal(field.sampleSize, 8);
  assert.equal(typeof field.vector.rendering.illustrated, "number");
  const set = planCoverCandidates({ conventionField: field, storyBible: { type: "StoryBible", work: "ice-out" } });
  assert.equal(set.families.length, 6);
  assert.equal(set.candidates.length, 24);
  for (const candidate of set.candidates) assert.equal(assertPromptHasNoTypography(candidate.prompt, { title: "Ice Out", author: "561 Group" }), true);
});

test("rubric is frozen before generation and correlated judge votes have reduced effective sample size", () => {
  assert.equal(FROZEN_RUBRIC.type, "CoverSelectionRubric");
  const calibration = calibrateJudges([
    ...["a", "b", "c"].map((item, index) => ({ family: "gemini", item, predicted: index + 0.1, observed: index })),
    ...["a", "b", "c"].map((item, index) => ({ family: "glm-v", item, predicted: index + 0.1, observed: index })),
    ...["a", "b", "c"].map((item, index) => ({ family: "llama-vision", item, predicted: index + [0.2, -0.1, 0.3][index], observed: index })),
  ]);
  assert.ok(calibration.effectiveSampleSize < 3);
  const scores = Object.fromEntries(FROZEN_RUBRIC.dimensions.map(({ id }) => [id, 0.8]));
  assert.ok(Math.abs(scoreCandidate(["gemini", "glm-v", "llama-vision"].map((family) => ({ family, scores }))).score - 0.8) < Number.EPSILON * 2);
  assert.equal(runThumbnailTournament([{ id: "a" }, { id: "b" }], [{ field: ["a", "b"], winner: "b" }])[0].id, "b");
});

test("fake image provider records prompt, seed, zero cost, and KDP-valid deterministic typography", async () => {
  const background = await sharp({ create: { width: 800, height: 1280, channels: 3, background: "#25415b" } }).jpeg().toBuffer();
  const generated = await generateCoverBackground(
    { id: "fixture-561", family: "fixture", seed: 561, prompt: "No words, no letters. Warm winter lake." },
    {
      generate: async () => ({
        bytes: background,
        receipt: {
          id: "ni:///sha-256;fixture", provider: "fake-provider", model: "fake-image-v1",
          consideration: { cash: "0", unit: "USD" },
          output: { identity: "ni:///sha-256;image", bytes: background.length, mimeType: "image/jpeg" },
        },
      }),
      now: () => observedAt,
    },
  );
  assert.equal(generated.evidence.seed, 561);
  assert.equal(generated.evidence.cost.amount, 0);
  const cover = await compositeTypography(generated.buffer, { title: "Ice Out", subtitle: "A Slow-Burn Duluth Romance", author: "561 Group", titleAreaRatio: 0.3 });
  const check = await validateCover(cover);
  assert.equal(check.passed, true, JSON.stringify(check));
  assert.deepEqual(check.metadata, { width: 1600, height: 2560, format: "jpeg", space: "srgb", bytes: cover.byteLength, sha256: check.metadata.sha256 });
});

test("market acquisition uses bounded robots-respecting fixtures and retains no cover images", async () => {
  const page = `<li data-asin="B000000001"><img src="https://images.example/one.jpg" alt="Warm Harbor"></li>`;
  assert.equal(extractCoverSamples(page, "https://www.amazon.com/best")[0].asin, "B000000001");
  const calls = [];
  const acquire = async ({ urls }) => { const url = urls[0]; calls.push(url); const text = url.endsWith("robots.txt") ? "User-agent: *\nAllow: /best\n" : page; return { status: "settled", results: [{ requestedUrl: url, finalUrl: url, text, markup: text, rights: "observed", textDigest: "ni:///sha-256;text", responseDigest: "ni:///sha-256:response" }], obstructions: [] }; };
  const result = await acquireCoverFeatureObservations({ categories: [{ id: "romance", url: "https://www.amazon.com/best", maximumSamples: 1 }], observedAt, policy: { permission: "permitted", reviewedAt: "2026-09-29", minimumIntervalMs: 5000 } }, { acquire, sleep: async () => {}, classify: async () => ({ palette: ["#112233", "#ddeeff"], rendering: "illustrated", figurePose: "couple-separated", settingMotifs: ["winter"], titleAreaRatio: 0.3, typographyClass: "display-serif", thumbnailContrast: 0.8 }) });
  assert.deepEqual(calls, ["https://www.amazon.com/robots.txt", "https://www.amazon.com/best"]);
  assert.equal(result.observations.length, 1);
  assert.equal(result.retainedCoverImages, 0);
});

test("provider inventory refuses to equate configured-only routes with reachable generation", () => {
  const inventory = providerInventoryRecord(observedAt);
  assert.equal(inventory.generators.find(({ provider }) => provider === "cloudflare-workers-ai").admission, "executable");
  assert.match(inventory.generators.find(({ provider }) => provider === "gemini").reachability, /configured-only/u);
  assert.equal(inventory.judges.find(({ provider }) => provider === "nvidia-nim").model, "meta/llama-3.2-11b-vision-instruct");
  assert.equal(inventory.judges.filter(({ reachability }) => reachability.includes("no-vision-adapter") || reachability.includes("no-image-input-adapter")).length, 4);
});

test("fake providers exercise the complete 24-candidate selection and future A/B receipt", async () => {
  const outputRoot = await mkdtemp(join(tmpdir(), "cover-run-"));
  const background = await sharp({ create: { width: 400, height: 640, channels: 3, background: "#31516a" } }).jpeg().toBuffer();
  const conventionField = deriveConventionField(observations(), { category: "fixture-romance", derivedAt: observedAt });
  const families = ["gemini", "llama-vision", "glm-v"];
  const scores = Object.fromEntries(FROZEN_RUBRIC.dimensions.map(({ id }) => [id, 0.8]));
  const result = await runCoverLab({
    storyBible: { type: "StoryBible", work: "ice-out" },
    ebook: { title: "Ice Out", subtitle: "A Slow-Burn Duluth Romance", author: "561 Group" },
    conventionField, observations: observations(), outputRoot, observedAt,
    calibrationRows: families.flatMap((family, familyIndex) => ["a", "b", "c"].map((item, index) => ({ family, item, predicted: index + familyIndex * 0.1, observed: index }))),
  }, {
    generate: async (candidate) => ({ buffer: background, evidence: addressedRecord("FixtureGeneration", 1, { candidate: candidate.id, provider: "fake-image", model: "fake-v1" }) }),
    judge: async ({ candidate }) => families.map((family, index) => ({ family, scores, tournamentPreference: candidate.seed + index, defects: [] })),
  });
  assert.equal(result.status, "selected");
  assert.notEqual(result.decision.winner, result.decision.runnerUp);
  assert.equal(result.assessed.length, 24);
  assert.equal(result.experiment.status, "future-not-run");
  assert.equal(result.decision.byline.adopted, false);
});
