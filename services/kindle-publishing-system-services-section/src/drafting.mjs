import { readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { dispatchInferenceAsConfiguredCustomer } from "@red-cup-engineering/computer-inference-engine/dispatch/inference-dispatch";
import { lintManuscript } from "@red-cup-engineering/ebook-production-services-section/lint-manuscript";
import { fabricateEbookEdition } from "@red-cup-engineering/ebook-production-services-section/fabricate-ebook-edition";
import { acceptEbookEdition } from "@red-cup-engineering/ebook-production-services-section/accept-ebook-edition";
import { createTypedMark } from "@red-cup-engineering/signcell/typed-mark";
import { defineSchemaType } from "@red-cup-engineering/computer-data-engineering-services-section/type-system/schema-type";

const chapterSchema = { type: "object", additionalProperties: false, required: ["markdown", "summary", "revealedSecrets", "povLedger"], properties: { markdown: { type: "string", minLength: 100 }, summary: { type: "string", minLength: 20 }, revealedSecrets: { type: "array", items: { type: "string" } }, povLedger: { type: "object" } } };
const criticSchema = { type: "object", additionalProperties: false, required: ["accepted", "findings"], properties: { accepted: { type: "boolean" }, findings: { type: "array", items: { type: "object", required: ["severity", "claim"], properties: { severity: { enum: ["error", "correction", "note"] }, claim: { type: "string" } } } } } };
const proofSchema = {
  type: "object", additionalProperties: false, required: ["method", "findings"],
  properties: {
    method: { type: "string", minLength: 40 },
    findings: {
      type: "array",
      items: {
        type: "object", required: ["id", "severity", "claim", "resolution"],
        properties: { id: { type: "string" }, severity: { enum: ["error", "correction", "note"] }, claim: { type: "string" }, resolution: { enum: ["fixed", "declined", "open"] }, fix: { type: "string" }, reason: { type: "string" }, file: { type: "string" }, source: { type: "string" } },
      },
    },
  },
};
const delivered = (result) => typeof result?.outcome === "string" && result.outcome.startsWith("candidate-pending-") && result.outcome.endsWith("-acceptance");
const providerKey = (result) => `${result.provider ?? "unknown"}/${result.model ?? "unknown"}`;
const draftProvenanceType = defineSchemaType({ $id: "org.561-group.kindle.draft-provenance.v1", title: "Kindle draft provenance", description: "Content-addressed chapter, inference, rolling-memory, and lint evidence for one completed draft.", type: "object", additionalProperties: false, required: ["type", "version", "plan", "chapters", "rollingState", "inference", "lint"], properties: { type: { const: "KindleDraftProvenance" }, version: { const: 1 }, plan: { type: "string" }, chapters: { type: "array", items: { type: "object" } }, rollingState: { type: "object" }, inference: { type: "array", items: { type: "object" } }, lint: { type: "object" } } });

function exactChapter(outline, body) {
  const frontmatter = `---\npov: ${outline.pov}\nwhen: ${outline.when}\nbeat: ${outline.beat}\nreveals: [${outline.reveals.map((item) => JSON.stringify(item)).join(", ")}]\n---`;
  const stripped = String(body).replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/u, "").trim();
  const titled = /^# /mu.test(stripped) ? stripped : `# ${outline.title}\n\n${stripped}`;
  return `${frontmatter}\n${titled}\n`;
}

function lintDraft(chapters, bible, serialInProgress) { return lintManuscript(chapters, { profile: "fiction", storyBible: bible, serialInProgress, minWords: 400, maxWords: 6000 }); }
async function writeExact(path, content) {
  try { await writeFile(path, content, { flag: "wx" }); }
  catch (error) {
    if (error?.code !== "EEXIST" || await readFile(path, "utf8") !== content) throw error?.code === "EEXIST" ? new Error(`existing draft artifact differs: ${path}`) : error;
  }
}
async function readCheckpoint(path, plan) {
  try { const checkpoint = JSON.parse(await readFile(path, "utf8")); if (checkpoint.plan !== plan) throw new Error("draft checkpoint belongs to another plan"); return checkpoint; }
  catch (error) { if (error?.code === "ENOENT") return null; throw error; }
}
async function writeCheckpoint(path, checkpoint) {
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(checkpoint, null, 2)}\n`, { mode: 0o600 });
  await rename(temporary, path);
}

/** Draft chapters serially so each call sees bounded rolling state; critic and lint jointly gate every accepted chapter. */
export async function draftKindleBook({ planReceipt, bookRoot, customerActor, maxRewriteAttempts = 2 }, { dispatch = dispatchInferenceAsConfiguredCustomer } = {}) {
  const plan = planReceipt?.content?.plan;
  if (!planReceipt?.content?.lint?.ok || !plan) throw new TypeError("drafting requires an admitted lint-clean plan receipt");
  if (!Number.isInteger(maxRewriteAttempts) || maxRewriteAttempts < 0 || maxRewriteAttempts > 5) throw new RangeError("maxRewriteAttempts must be between zero and five");
  const checkpointPath = join(bookRoot, ".kindle-draft-state.json"), checkpoint = await readCheckpoint(checkpointPath, planReceipt.id);
  const chapters = checkpoint?.chapters ?? [], state = checkpoint?.rollingState ?? { summaries: [], revealedSecrets: [], povLedger: {} }, provenance = checkpoint?.inference ?? [], writerProviders = new Set(checkpoint?.writerProviders ?? []);
  for (const outline of plan.outline.slice(chapters.length)) {
    let priorFindings = [], accepted = null;
    for (let attempt = 0; attempt <= maxRewriteAttempts; attempt += 1) {
      const result = await dispatch({ objective: "Draft exactly one original fiction chapter from the supplied plan and rolling state. Preserve POV knowledge boundaries, reveal only declared secrets, obey refusals, and return Markdown plus bounded memory.", context: JSON.stringify({ storyBible: plan.storyBible, outline, rollingState: state, priorFindings }), workType: "inquiry", taskClass: "kindle-pipeline/chapter-draft/v1", outputSchema: chapterSchema, enforceProviderSchema: true, requiredCapabilities: ["json-output", "json-schema-output"], mode: "live" }, { customerActor });
      if (!delivered(result)) return Object.freeze({ status: "obstructed", stage: "draft", chapter: outline.chapter, code: result?.outcome ?? "inference-not-delivered" });
      writerProviders.add(result.provider); provenance.push({ role: "writer", chapter: outline.chapter, attempt, provider: result.provider, model: result.model, receipt: result.receipt?.id });
      const markdown = exactChapter(outline, result.candidate.markdown);
      const candidateChapters = [...chapters, { path: `${String(outline.chapter).padStart(2, "0")}-${plan.ebook.slug}.md`, text: markdown }];
      const lint = lintDraft(candidateChapters, { ...plan.storyBible, outline: plan.outline }, candidateChapters.length < plan.outline.length);
      const chapterErrors = lint.findings.filter((finding) => finding.severity === "error" && (finding.path === candidateChapters.at(-1).path || finding.path === null));
      const critic = await dispatch({ objective: "Critique this chapter against the supplied story bible and outline. Accept only coherent, specific prose with correct POV knowledge, chronology, beat, consent, and declared secret handling. Do not rewrite it.", context: JSON.stringify({ storyBible: plan.storyBible, outline, rollingState: state, markdown, deterministicLint: lint }), workType: "inquiry", taskClass: "kindle-pipeline/chapter-critic/v1", outputSchema: criticSchema, enforceProviderSchema: true, requiredCapabilities: ["json-output", "json-schema-output"], mode: "live" }, { customerActor });
      if (!delivered(critic)) return Object.freeze({ status: "obstructed", stage: "critic", chapter: outline.chapter, code: critic?.outcome ?? "inference-not-delivered" });
      provenance.push({ role: "critic", chapter: outline.chapter, attempt, provider: critic.provider, model: critic.model, receipt: critic.receipt?.id });
      if (chapterErrors.length === 0 && critic.candidate.accepted) { accepted = { markdown, memory: result.candidate, path: candidateChapters.at(-1).path }; break; }
      priorFindings = [...chapterErrors, ...critic.candidate.findings];
    }
    if (!accepted) return Object.freeze({ status: "refused", stage: "rewrite-budget", chapter: outline.chapter, findings: priorFindings });
    chapters.push({ path: accepted.path, text: accepted.markdown });
    state.summaries.push({ chapter: outline.chapter, summary: accepted.memory.summary });
    state.revealedSecrets.push(...accepted.memory.revealedSecrets);
    state.povLedger = { ...state.povLedger, ...accepted.memory.povLedger };
    await writeExact(join(bookRoot, accepted.path), accepted.markdown);
    await writeCheckpoint(checkpointPath, { type: "KindleDraftCheckpoint", version: 1, plan: planReceipt.id, chapters, rollingState: state, inference: provenance, writerProviders: [...writerProviders] });
  }
  const lint = lintDraft(chapters, { ...plan.storyBible, outline: plan.outline }, false);
  if (!lint.ok) return Object.freeze({ status: "refused", stage: "manuscript-lint", lint });
  const evidence = createTypedMark(draftProvenanceType, { type: "KindleDraftProvenance", version: 1, plan: planReceipt.id, chapters: chapters.map(({ path, text }) => ({ path, sha256: createHash("sha256").update(text).digest("hex") })), rollingState: state, inference: provenance, lint });
  if (!evidence.ok) throw new TypeError(evidence.refusal.message);
  await writeExact(join(bookRoot, "draft-provenance.json"), `${JSON.stringify(evidence.value, null, 2)}\n`);
  return Object.freeze({ status: "drafted", chapters, rollingState: state, lint, writerProviders: Object.freeze([...writerProviders]), provenance: Object.freeze(provenance), receipt: evidence.value });
}

/** Run the existing fabrication adapter, procure an independent proof, and close EbookEditionProof acceptance. */
export async function fabricateProofAndAccept({ specification, source, draft, customerActor, provedAt = new Date().toISOString() }, { dispatch = dispatchInferenceAsConfiguredCustomer, fabricate = fabricateEbookEdition } = {}) {
  if (draft?.status !== "drafted" || !draft.lint?.ok) throw new TypeError("fabrication requires a lint-clean drafted manuscript");
  const fabrication = await fabricate(specification, source);
  if (fabrication.status !== "fabricated-awaiting-acceptance") return Object.freeze({ status: "obstructed", stage: "fabrication", fabrication });
  const result = await dispatch({ objective: "Independently proof the exact accepted manuscript and fabricated artifact evidence. Report findings only; never claim publication authority.", context: JSON.stringify({ manuscript: draft.chapters, lint: draft.lint, artifacts: fabrication.artifacts }), workType: "inquiry", taskClass: "kindle-pipeline/independent-proof/v1", outputSchema: proofSchema, enforceProviderSchema: true, requiredCapabilities: ["json-output", "json-schema-output"], excludeProviders: draft.writerProviders, mode: "live" }, { customerActor });
  if (!delivered(result)) return Object.freeze({ status: "obstructed", stage: "proof", code: result?.outcome ?? "no-independent-provider" });
  if (draft.writerProviders.includes(result.provider)) return Object.freeze({ status: "refused", stage: "proof", code: "proofer-not-independent" });
  const proof = { type: "EbookEditionProof", version: 1, editionInputDigest: fabrication.specification.projections[0].configuration.editionInputDigest, artifacts: { epub: fabrication.artifacts.epub.sha256, screenPdf: fabrication.artifacts.screenPdf.sha256 }, proofer: providerKey(result), writer: draft.provenance.filter(({ role }) => role === "writer").map(({ provider, model }) => `${provider}/${model}`).sort().join(","), provedAt, method: result.candidate.method, findings: result.candidate.findings };
  const acceptance = acceptEbookEdition(fabrication, proof, { now: provedAt });
  const editorialClosed = ["accepted", "partially-accepted"].includes(acceptance.status) && acceptance.closedObligationIds?.includes("editorial-proof");
  return Object.freeze({ status: editorialClosed ? "editorially-accepted" : "refused", fabrication, proof, acceptance, inference: { provider: result.provider, model: result.model, receipt: result.receipt?.id } });
}
