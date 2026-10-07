import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { planCoverCandidates, assertPromptHasNoTypography } from "./concepts.mjs";
import { calibrateJudges, FROZEN_RUBRIC, runThumbnailTournament, scoreCandidate } from "./rubric.mjs";
import { compositeTypography, validateCover } from "./specification.mjs";
import { generateCoverBackground, providerInventoryRecord } from "./providers.mjs";
import { addressedRecord, writeAddressedRecord } from "./records.mjs";

const safeName = (value) => value.replace(/[^a-z0-9-]/giu, "-");

export async function runCoverLab({ storyBible, ebook, conventionField, observations, outputRoot, bylineAdopted = false, observedAt = new Date().toISOString(), calibrationRows }, capabilities = {}) {
  const judge = capabilities.judge;
  if (typeof judge !== "function") return Object.freeze({ status: "blocked", code: "vision-judge-adapter-unavailable", blocker: { boundaryType: null, failureClass: "INSUFFICIENT_MACHINE_CAPABILITY", detail: "The house catalog has no admitted executable vision-judge adapter." } });
  const calibration = calibrateJudges(calibrationRows);
  const conceptSet = planCoverCandidates({ conventionField, storyBible });
  const author = ebook.author;
  await mkdir(join(outputRoot, "candidates"), { recursive: true });
  const assessed = [];
  for (const candidate of conceptSet.candidates) {
    assertPromptHasNoTypography(candidate.prompt, { title: ebook.title, author });
    const generated = await (capabilities.generate ? capabilities.generate(candidate) : generateCoverBackground(candidate));
    const cover = await compositeTypography(generated.buffer, { title: ebook.title, subtitle: ebook.subtitle, author, titleAreaRatio: conventionField.vector.meanTitleAreaRatio });
    const judgments = await judge({ candidate, cover, storyBible, conventionField, rubric: FROZEN_RUBRIC });
    const defectReports = judgments.map(({ defects, family }) => ({ defects, family }));
    const check = await validateCover(cover, { observations, perceptualHash: judgments.find(({ perceptualHash }) => perceptualHash)?.perceptualHash ?? null, defectReports });
    const path = join(outputRoot, "candidates", `${safeName(candidate.id)}.jpg`);
    await writeFile(path, cover, { mode: 0o600 });
    assessed.push(Object.freeze({ ...candidate, path, generation: generated.evidence, judgments, check, ...(check.passed ? scoreCandidate(judgments) : { score: -Infinity, families: [] }) }));
  }
  const eligible = assessed.filter(({ check }) => check.passed);
  if (eligible.length < 2) return Object.freeze({ status: "blocked", code: "insufficient-defect-free-candidates", assessed });
  const fields = [];
  for (let index = 0; index < eligible.length; index += 4) {
    const field = eligible.slice(index, index + 4);
    if (field.length > 1) for (const family of calibration.families) fields.push({ family, field: field.map(({ id }) => id), winner: [...field].sort((a, b) => (b.judgments.find((row) => row.family === family)?.tournamentPreference ?? b.score) - (a.judgments.find((row) => row.family === family)?.tournamentPreference ?? a.score))[0].id });
  }
  const tournament = runThumbnailTournament(eligible, fields);
  const wins = Object.fromEntries(tournament.map(({ id, attentionAdjustedWins }) => [id, attentionAdjustedWins]));
  const ranked = [...eligible].sort((a, b) => (b.score + (wins[b.id] ?? 0)) - (a.score + (wins[a.id] ?? 0)) || a.id.localeCompare(b.id));
  const winner = ranked[0], runnerUp = ranked[1];
  const selectedPath = join(outputRoot, "selected-cover.jpg"), runnerUpPath = join(outputRoot, "runner-up-cover.jpg");
  await copyFile(winner.path, selectedPath); await copyFile(runnerUp.path, runnerUpPath);
  const experiment = addressedRecord("ConceptExperiment", 1, { status: "future-not-run", work: storyBible.work, variants: [{ arm: "A", candidate: winner.id, artifact: selectedPath }, { arm: "B", candidate: runnerUp.id, artifact: runnerUpPath }], outcomes: ["KDP sales", "sample-to-purchase conversion", "Search Console click-through", "ads click-through"], startCondition: "live traffic and publication authority available" });
  const decision = addressedRecord("CoverDecisionReceipt", 1, {
    work: storyBible.work, decidedAt: observedAt, rubric: FROZEN_RUBRIC.id, conventionField: conventionField.id,
    conceptSet: conceptSet.id, winner: winner.id, runnerUp: runnerUp.id,
    candidateEvidence: assessed.map(({ id, generation, check, score, families }) => ({ id, generation: generation.id, check, score, families })),
    tournament, judgeCalibration: calibration, byline: { value: author, adopted: bylineAdopted },
    disclosure: { aiGeneratedCoverImage: true, deterministicTypography: true, provider: winner.generation.provider, model: winner.generation.model },
    experiment: experiment.id,
  });
  await Promise.all([writeAddressedRecord(join(outputRoot, "evidence"), providerInventoryRecord(observedAt, { disposition: "invocation-reachable", provider: winner.generation.provider, model: winner.generation.model })), writeAddressedRecord(join(outputRoot, "evidence"), conceptSet), writeAddressedRecord(join(outputRoot, "evidence"), decision), writeAddressedRecord(join(outputRoot, "evidence"), experiment)]);
  return Object.freeze({ status: "selected", winner: selectedPath, runnerUp: runnerUpPath, decision, experiment, assessed });
}
