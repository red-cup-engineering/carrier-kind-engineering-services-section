import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import write from "@561-group/computer/typed-term-memory-system/writing";
import { jcs } from "@561-group/computer/typed-resource-catalog/json";

import { memoryRootOf } from "./memory.mjs";
import { settledSection, witnessOf } from "./swarm-sheaf.mjs";

const STOP = new Set([
  "the", "and", "for", "with", "that", "this", "from", "have", "will", "what", "when",
  "where", "into", "about", "your", "you", "are", "was", "were", "our", "their", "they",
  "can", "could", "should", "would", "just", "like", "over", "time", "thing", "things",
  "remember", "prompt", "reply", "respond", "record", "future", "context",
]);

// Fold a value to a jcs-encodable JSON value: undefined -> null (mirroring JSON.stringify's reading
// of an absent array element), recursively; object keys whose value is undefined are dropped (again
// as JSON.stringify does). This is presentation for the content-address only, never a logic value.
export function jsonSafe(value) {
  if (value === undefined) return null;
  if (Array.isArray(value)) return value.map(jsonSafe);
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) if (v !== undefined) out[k] = jsonSafe(v);
    return out;
  }
  return value;
}

export function stableId(parts, prefix = "item") {
  // Identity is content: canonical JSON (jcs/RFC-8785) -> sha256. Not raw JSON.stringify.
  // jcs has no encoding for `undefined` (an absent field); fold it to JSON null first — the same
  // reading JSON.stringify gave undefined array elements, so content-addresses stay faithful.
  const digest = createHash("sha256").update(jcs(jsonSafe(parts))).digest("hex").slice(0, 16);
  return `${prefix}-${digest}`;
}

export function tokenize(text) {
  return [...new Set(String(text).toLowerCase().match(/[a-z0-9][a-z0-9-]{2,}/g) ?? [])]
    .filter((token) => !STOP.has(token))
    .slice(0, 80);
}

function walkJsonl(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkJsonl(path));
    else if (entry.isFile() && entry.name.endsWith(".jsonl")) out.push(path);
  }
  return out;
}

function rawRows(path) {
  try {
    return readFileSync(path, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line));
  } catch {
    return [];
  }
}

// ⊤-RESOLUTION CONTRACT (docs/dev/notes/2026-06-05-refounding-verified-map-and-migration.md, the
// per-reader classification §4 `cognition.mjs`). Every cognition predicate is Class F (functional,
// row-order-last-writer) — `summary`, `prompt`, `reply`, `topic`, `insight`, `relevance`, `created`,
// `lastTouched`, `kind`, `agent`, `source` — except `keywords`, which is Class R (a set) but stored
// by the writer as ONE array-valued cell, so last-writer over append order is its correct fold too.
// There are NO Class-B (belief/safety) writes in cognition today, so a >1-object fold here is a
// SUCCESSION, not a held ⊤: resolve to the LAST object in APPEND ORDER (NOT newest-`t` — `t` is
// id-valued pre-P0 and mis-orders). settledSection's `assignments` preserve append order (each
// distinct object for one (subject,predicate) is its own cell, in log order), so the row-order-last
// object is simply the LAST matching assignment. This rebases the doc fold onto the canonical
// section while keeping `doc.summary` etc. SCALARS so tokenize/overlapScore/Number(relevance) stay
// total. A predicate that nonetheless settles to >1 surviving distinct object is surfaced under a
// non-enumerable `contested` map (predicate -> { objects, witnesses }) so the succession is auditable,
// never silently swallowed; the scalar doc value remains the row-order-last object per Class F.
function foldSectionToDoc(section) {
  const doc = {};
  const contested = {};
  const cellsByPredicate = new Map();
  for (const assignment of section.assignments) {
    const key = assignment.cell?.predicate?.const;
    if (!key) continue;
    const object = assignment.cell?.object?.const ?? assignment.cell?.object;
    // append-order-last (Class F): a later matching assignment overwrites — the same
    // append-order-last-writer the old `doc[row.a]=row.v` loop produced by accident of iteration,
    // now produced by construction over the canonical fold.
    doc[key] = object;
    const cells = cellsByPredicate.get(key) ?? [];
    cells.push(assignment.cell);
    cellsByPredicate.set(key, cells);
  }
  for (const [key, cells] of cellsByPredicate) {
    if (cells.length <= 1) continue;
    contested[key] = {
      objects: cells.map((cell) => cell.object?.const ?? cell.object),
      witnesses: cells.map((cell) => witnessOf(section, cell)),
    };
  }
  if (Object.keys(contested).length) {
    // non-enumerable: keeps the held succession visible to an auditor without changing the doc's
    // enumerable scalar shape (tokenize/keyword/recordText iteration is unaffected).
    Object.defineProperty(doc, "contested", { value: contested, enumerable: false });
  }
  return doc;
}

export function readRecord(root, term) {
  return foldSectionToDoc(settledSection(memoryRootOf(root), term));
}

export function scanAgentRecords(root, agentName, collection) {
  const memoryRoot = memoryRootOf(root);
  const base = join(memoryRoot, "agents", agentName, collection);
  return walkJsonl(base).map((path) => {
    const rows = rawRows(path);
    const term = rows[0]?.e;
    if (!term) return { path, term, doc: {}, rows };
    // discover the term from the raw rows, then fold via the CANONICAL section — never re-fold
    // values from `rows` (that is the last-writer hand-parse the refounding removes).
    return { path, term, doc: foldSectionToDoc(settledSection(memoryRoot, term)), rows };
  }).filter((record) => record.term);
}

function overlapScore(queryTokens, recordTokens) {
  const haystack = new Set(recordTokens);
  let score = 0;
  for (const token of queryTokens) if (haystack.has(token)) score += 1;
  return score;
}

function recordText(record) {
  return [
    record.doc.summary,
    record.doc.prompt,
    record.doc.reply,
    record.doc.topic,
    record.doc.insight,
    Array.isArray(record.doc.keywords) ? record.doc.keywords.join(" ") : "",
  ].filter(Boolean).join(" ");
}

export function recall(root, agent, prompt, options = {}) {
  const query = tokenize(prompt);
  const collections = options.collections ?? ["memories", "dreams", "plans", "messages"];
  const records = collections.flatMap((collection) =>
    scanAgentRecords(root, agent.name, collection).map((record) => ({ ...record, collection })),
  );
  const ranked = records.map((record) => {
    const text = recordText(record);
    const overlap = overlapScore(query, tokenize(text));
    const relevance = Number(record.doc.relevance ?? (record.collection === "messages" ? 0.25 : 0.5));
    const score = overlap + relevance;
    return { ...record, score, overlap, relevance };
  }).filter((record) => record.score > 0)
    .sort((a, b) => b.score - a.score || String(b.doc.created ?? "").localeCompare(String(a.doc.created ?? "")))
    .slice(0, options.limit ?? 6);

  return { query, records: ranked };
}

export function derivePlan(agent, prompt, recalled = []) {
  const lower = prompt.toLowerCase();
  const steps = [];
  if (/\b(implement|build|add|fix|wire|create)\b/.test(lower)) {
    steps.push("inspect relevant substrate and prior memory");
    steps.push("choose a scoped implementation path");
    steps.push("apply changes with tests");
  } else if (prompt.includes("?") || /\b(how|why|what|where|find|search)\b/.test(lower)) {
    steps.push("recall related memory");
    steps.push("answer from recalled evidence and current prompt");
  } else {
    steps.push("interpret prompt");
    steps.push("respond and record useful residue");
  }
  if (recalled.length === 0) steps.push("mark missing knowledge for future dreaming");
  else steps.push("promote relevant recalled records");

  return {
    id: stableId([agent.name, prompt, steps], "plan"),
    kind: "swarm.plan",
    agent: agent.name,
    prompt,
    steps,
    requiredSkills: lower.includes("file") || lower.includes("repo") ? ["memory.recall", "tool.files"] : ["memory.recall"],
  };
}

function memoryDirective(prompt) {
  const match = String(prompt).match(/(?:^|\b)remember\s*:\s*([\s\S]+)/i);
  return match?.[1]?.trim() ?? null;
}

function topTopic(texts) {
  const counts = new Map();
  for (const text of texts) {
    for (const token of tokenize(text)) counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;
}

export function runTools(root, agent, prompt, recalled, plan, options = {}) {
  const now = options.now ?? new Date().toISOString();
  const results = [];
  results.push({
    tool: "memory.recall",
    outcome: "ok",
    count: recalled.length,
    records: recalled.map((record) => ({
      collection: record.collection,
      term: record.term,
      summary: record.doc.summary ?? record.doc.insight ?? record.doc.prompt ?? record.term,
      score: record.score,
    })),
  });
  results.push({ tool: "plan.derive", outcome: "ok", plan });

  const directive = memoryDirective(prompt);
  if (directive) {
    const term = `agents/${agent.name}/memories/${stableId([agent.name, directive], "memory")}`;
    const doc = {
      kind: "swarm.memory",
      agent: agent.name,
      summary: directive,
      keywords: tokenize(directive),
      relevance: 1,
      source: "remember-directive",
      created: now,
    };
    write(memoryRootOf(root), term, doc, { t: plan.id });
    results.push({ tool: "memory.write", outcome: "ok", term, summary: directive });
  }

  return results;
}

export function renderCognitiveContext({ recalled, plan, toolResults, dreams = [] }) {
  const lines = [];
  if (recalled.length) {
    lines.push("SWARM MEMORY:");
    for (const record of recalled.slice(0, 6)) {
      const summary = record.doc.summary ?? record.doc.insight ?? record.doc.prompt ?? record.term;
      lines.push(`- [${record.collection}] ${summary}`);
    }
  }
  if (dreams.length) {
    lines.push("SWARM DREAMS:");
    for (const dream of dreams.slice(0, 3)) lines.push(`- ${dream.doc.insight ?? dream.doc.summary}`);
  }
  if (plan) {
    lines.push("SWARM PLAN:");
    plan.steps.forEach((step, index) => lines.push(`${index + 1}. ${step}`));
  }
  if (toolResults.length) {
    lines.push("SWARM TOOLS:");
    for (const result of toolResults) lines.push(`- ${result.tool}: ${result.outcome}`);
  }
  return lines.join("\n");
}

export function persistPlan(root, agent, plan, options = {}) {
  const term = `agents/${agent.name}/plans/${plan.id}`;
  write(memoryRootOf(root), term, {
    ...plan,
    summary: plan.steps.join(" -> "),
    keywords: tokenize(`${plan.prompt} ${plan.steps.join(" ")}`),
    relevance: 0.7,
    created: options.now ?? new Date().toISOString(),
  }, { t: plan.id });
  return { term, read: readRecord(root, term) };
}

export function learnFromMessage(root, agent, prompt, reply, recalled, options = {}) {
  const now = options.now ?? new Date().toISOString();
  const terms = [];
  const summary = memoryDirective(prompt) ?? (reply ? `Prompt: ${prompt.slice(0, 120)} | Reply: ${reply.slice(0, 160)}` : prompt);
  const term = `agents/${agent.name}/memories/${stableId([agent.name, summary], "memory")}`;
  write(memoryRootOf(root), term, {
    kind: "swarm.memory",
    agent: agent.name,
    summary,
    keywords: tokenize(`${prompt} ${reply}`),
    relevance: memoryDirective(prompt) ? 1 : 0.45,
    source: memoryDirective(prompt) ? "remember-directive" : "message-residue",
    created: now,
  }, { t: options.messageId ?? term });
  terms.push(term);

  for (const record of recalled) {
    const relevance = Math.min(1, Number(record.doc.relevance ?? 0.5) + 0.15);
    write(memoryRootOf(root), record.term, {
      relevance,
      lastTouched: now,
    }, { t: options.messageId ?? term });
  }
  return { terms };
}

export function dream(root, agent, options = {}) {
  const now = options.now ?? new Date().toISOString();
  const messages = scanAgentRecords(root, agent.name, "messages");
  const memories = scanAgentRecords(root, agent.name, "memories");
  const [topic, count] = topTopic([...messages, ...memories].map(recordText)) ?? [];
  if (!topic || count < 2) return { created: null, reason: "no-repeated-topic" };

  const id = stableId([agent.name, topic, count], "dream");
  const term = `agents/${agent.name}/dreams/${id}`;
  const existing = readRecord(root, term);
  if (existing.kind) return { created: null, reason: "already-dreamed", term };

  const insight = `Repeated topic "${topic}" appears across ${count} memory traces; keep it present in future context.`;
  write(memoryRootOf(root), term, {
    kind: "swarm.dream",
    agent: agent.name,
    topic,
    insight,
    keywords: [topic],
    relevance: 0.85,
    created: now,
  }, { t: id });
  return { created: term, insight };
}

export function buildCognition(root, agent, prompt, options = {}) {
  const recalled = recall(root, agent, prompt, options.recall).records;
  const dreams = recall(root, agent, prompt, { collections: ["dreams"], limit: 3 }).records;
  const plan = derivePlan(agent, prompt, recalled);
  const planRecord = persistPlan(root, agent, plan, options);
  const toolResults = runTools(root, agent, prompt, recalled, plan, options);
  const context = renderCognitiveContext({ recalled, dreams, plan, toolResults });
  return { recalled, dreams, plan, planRecord, toolResults, context };
}
