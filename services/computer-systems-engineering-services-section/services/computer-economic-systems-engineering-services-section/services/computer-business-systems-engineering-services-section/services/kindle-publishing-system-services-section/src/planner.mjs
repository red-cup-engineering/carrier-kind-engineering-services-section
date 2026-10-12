import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { dispatchInferenceAsConfiguredCustomer } from "@red-cup-engineering/computer-inference-engine/dispatch/inference-dispatch";
import { lintManuscript } from "@red-cup-engineering/ebook-engineering-services-section/lint-manuscript";
import { defineSchemaType } from "@red-cup-engineering/computer-data-engineering-services-section/type-system/schema-type";
import { createTypedMark } from "@red-cup-engineering/signcell/typed-mark";

const outputSchema = {
  type: "object", additionalProperties: false, required: ["seriesPlan", "storyBible", "ebook", "outline"],
  properties: {
    seriesPlan: { type: "object", required: ["name", "books", "readthrough"], properties: { name: { type: "string" }, books: { type: "array", minItems: 1, items: { type: "object" } }, readthrough: { type: "string" } } },
    storyBible: { type: "object", required: ["type", "version", "work", "premise", "theme", "signature", "arc", "knowledge", "refusals", "locales"], properties: {
      type: { const: "StoryBible" }, version: { const: 1 }, work: { type: "string" }, premise: { type: "string" }, theme: { type: "string" },
      signature: { type: "object", required: ["characters", "places", "lexicon"], properties: { characters: { type: "array", minItems: 1, items: { type: "object", required: ["id", "name", "pov"] } }, places: { type: "array", items: { type: "object" } }, lexicon: { type: "array" } } },
      arc: { type: "array", minItems: 3, items: { type: "string" } }, knowledge: { type: "array", items: { type: "object", required: ["id", "holder", "learner", "fact"] } }, refusals: { type: "array", items: { type: "object", required: ["id", "pattern", "reason"] } }, locales: { type: "object" }, retired: { type: "array" }, constraints: { type: "array" }, pronunciations: { type: "array" },
    } },
    ebook: { type: "object", required: ["slug", "title", "author", "date", "bookDir", "distDir", "profile", "storyBible", "description", "keywords", "subjects", "marks"], properties: { slug: { type: "string" }, title: { type: "string" }, subtitle: { type: "string" }, author: { type: "string" }, date: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" }, bookDir: { type: "string" }, distDir: { type: "string" }, profile: { const: "fiction" }, storyBible: { const: "story-bible.json" }, cover: { const: "typographic" }, description: { type: "string" }, keywords: { type: "array", maxItems: 7, items: { type: "string", maxLength: 50 } }, subjects: { type: "array", items: { type: "string" } }, marks: { type: "array", items: { type: "string" } } } },
    outline: { type: "array", minItems: 3, items: { type: "object", required: ["chapter", "title", "pov", "when", "beat", "summary", "reveals"], properties: { chapter: { type: "integer", minimum: 1 }, title: { type: "string" }, pov: { type: "string" }, when: { type: "string" }, beat: { type: "string" }, summary: { type: "string" }, reveals: { type: "array", items: { type: "string" } } } } },
  },
};

export const bookPlanReceiptType = defineSchemaType({
  $id: "org.561-group.kindle.book-plan-receipt.v1", title: "Kindle book plan receipt",
  description: "An admitted book plan with inference and deterministic lint provenance.",
  type: "object", additionalProperties: false, required: ["type", "version", "nicheEvidence", "expectedContribution", "plan", "lint", "inference"],
  properties: { type: { const: "KindleBookPlanReceipt" }, version: { const: 1 }, nicheEvidence: { type: "string" }, expectedContribution: { type: "number" }, plan: outputSchema, lint: { type: "object" }, inference: { type: "object" } },
});

function frontmatter(chapter) {
  const reveals = chapter.reveals.length ? `[${chapter.reveals.map((item) => JSON.stringify(item)).join(", ")}]` : "[]";
  return `---\npov: ${chapter.pov}\nwhen: ${chapter.when}\nbeat: ${chapter.beat}\nreveals: ${reveals}\n---\n# ${chapter.title}\n\n${chapter.summary}\n`;
}

export function lintBookPlan(plan) {
  const bible = { ...plan.storyBible, outline: plan.outline };
  const chapters = plan.outline.map((chapter) => ({ path: `${String(chapter.chapter).padStart(2, "0")}-${plan.ebook.slug}.md`, text: frontmatter(chapter) }));
  return lintManuscript(chapters, { profile: "fiction", storyBible: bible, minWords: 0, maxWords: 100_000 });
}

function delivered(result) { return typeof result?.outcome === "string" && result.outcome.startsWith("candidate-pending-") && result.outcome.endsWith("-acceptance"); }
async function writeExact(path, content) {
  try { await writeFile(path, content, { flag: "wx" }); }
  catch (error) {
    if (error?.code !== "EEXIST" || await readFile(path, "utf8") !== content) throw error?.code === "EEXIST" ? new Error(`existing plan artifact differs: ${path}`) : error;
  }
}

/** Plan via the shared dispatcher, then subject the exact candidate to the existing fiction lint rules. */
export async function planKindleBook({ opportunity, customerActor, editionDate = new Date().toISOString().slice(0, 10) }, { dispatch = dispatchInferenceAsConfiguredCustomer } = {}) {
  if (typeof opportunity?.niche !== "string" || typeof opportunity?.evidenceId !== "string") throw new TypeError("planner needs a chosen niche and its evidenceId");
  if (!customerActor) throw new TypeError("planner needs an inference customerActor");
  const result = await dispatch({
    objective: "Design one commercially legible original fiction series and its first book from the chosen evidenced niche. Return the exact structured plan. Make every secret reveal exactly once, order arc beats monotonically, alternate POV when declared, avoid copyrighted settings or characters, and use at most seven retailer keywords.",
    context: JSON.stringify({ opportunity, editionDate, constraints: { ebookDate: editionDate } }), workType: "inquiry", taskClass: "kindle-pipeline/book-planning/v1",
    outputSchema, enforceProviderSchema: true, requiredCapabilities: ["json-output", "json-schema-output"], zeroCashOnly: true, mode: "live",
  }, { customerActor });
  if (!delivered(result)) return Object.freeze({ status: "obstructed", code: result?.outcome ?? "inference-not-delivered" });
  const candidate = Object.freeze({ ...result.candidate, ebook: Object.freeze({ ...result.candidate.ebook, cover: result.candidate.ebook.cover ?? "typographic" }) });
  const lint = lintBookPlan(candidate);
  if (!lint.ok) return Object.freeze({ status: "refused", code: "plan-lint-refused", lint });
  const content = { type: "KindleBookPlanReceipt", version: 1, nicheEvidence: opportunity.evidenceId, expectedContribution: Number(opportunity.expectedContribution ?? opportunity.score ?? 0), plan: candidate, lint, inference: { workLot: result.workLot, provider: result.provider, model: result.model ?? null, receipt: result.receipt?.id ?? null } };
  const cell = createTypedMark(bookPlanReceiptType, content);
  if (!cell.ok) return Object.freeze({ status: "refused", code: "plan-schema-refused", reason: cell.refusal.message });
  return Object.freeze({ status: "planned", receipt: cell.value });
}

export async function writeBookPlan(bookRoot, receipt) {
  if (receipt?.type !== bookPlanReceiptType.id || !receipt.content?.lint?.ok) throw new TypeError("only an admitted lint-clean plan may be executed");
  const { plan } = receipt.content;
  await mkdir(bookRoot, { recursive: true });
  await Promise.all([
    writeExact(join(bookRoot, "story-bible.json"), `${JSON.stringify({ ...plan.storyBible, outline: plan.outline }, null, 2)}\n`),
    writeExact(join(bookRoot, "ebook.json"), `${JSON.stringify(plan.ebook, null, 2)}\n`),
    writeExact(join(bookRoot, "series-plan.json"), `${JSON.stringify(plan.seriesPlan, null, 2)}\n`),
    writeExact(join(bookRoot, "chapter-outline.json"), `${JSON.stringify(plan.outline, null, 2)}\n`),
  ]);
  return Object.freeze({ bookRoot, files: ["story-bible.json", "ebook.json", "series-plan.json", "chapter-outline.json"] });
}
