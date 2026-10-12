// semantic-recall.mjs — SEMANTIC retrieval over the fact-manifold + agent memory.
//
// This is the drop-in replacement for the LEXICAL relevance fold that today scores by token overlap:
// cognition.mjs recall's overlapScore (cognition.mjs:127-162) and repo-context.mjs overlapScoreDefault
// (repo-context.mjs:72-77). Where those count how many DISTINCT query tokens reappear in a record, this
// embeds the prompt and each record's text into vectors and scores by COSINE — so a record that is
// semantically near the prompt ranks first EVEN WITH ZERO lexical token overlap (the property lexical
// recall structurally cannot have). The record/return shape is preserved verbatim, so it is a true
// drop-in: semanticRecall mirrors recall's { query, records:[ {…record, score, …} ] }, and
// selectRepoContextSemantic mirrors selectRepoContext's { context, selected, contested }.
//
// THE SWARM-Y SPINE IS NON-NEGOTIABLE. The live embedding is a real network egress, so it does NOT call
// the provider directly: it runs THROUGH runGovernedTool (governed-tool-runner.mjs:40) as a governed
// tool named 'memory.embed', supplied as an extraActuator (actuators.mjs:108-119) so it passes
// tool-policy admission -> the Gov regime -> the held-⊤ safety gate before a single byte leaves the
// process. A test injects a FAKE deterministic embedder as that extraActuator, so the gate is never
// bypassed and NO live key / network is touched.
//
// CACHE-AS-CELL (the repo-memory content-hash idempotence, repo-memory.mjs:11-16,104-123). Each embedded
// text is content-addressed: embTerm = embeddings/<model>/<stableId([model,text],'emb')>. If a settled
// 'vector' cell for that content already stands, cachedEmbedding RETURNS it (cached:true, no re-embed);
// else it embeds once and writes the cell. So re-embedding the same text is idempotent — the second call
// is a pure read, the cell count does not grow.
//
// NEVER FABRICATE A VOID. A record with no cacheable text, or a sub-threshold cosine, is simply EXCLUDED
// (the repo-context '0-overlap is not grounding' rule, repo-context.mjs:146-147) — never invented, never
// given a stand-in score. A 0-norm vector cosines to 0 (a refusal), never NaN. A held succession (a
// content-hash succession on a source file cell) is carried through to `contested` exactly as
// selectRepoContext does (repo-context.mjs:168-176) — never collapsed to last-writer.

import { join } from "node:path";

import write from "@561-group/computer/typed-term-memory-system/writing";
import { isTop } from "@red-cup-engineering/metrologic/articulation/predicating/positing/bilattice-charge";

import { providers, resolveApiKey } from "./providers.mjs";
import { stableId, jsonSafe, readRecord, scanAgentRecords } from "./cognition.mjs";
import { settledSection } from "./swarm-sheaf.mjs";
import { memoryRootOf } from "./memory.mjs";
import { repoMemoryRootOf, DEFAULT_CONTEXT } from "./repo-context.mjs";
import { runGovernedTool } from "./governed-tool-runner.mjs";

import { existsSync, readdirSync } from "node:fs";

// SEMANTIC_DEFAULTS — every bound a DERIVED-or-GOVERNED named default, NEVER a magic literal:
//   threshold — GOVERNED default cosine floor: a record scoring below it is not grounding for THIS
//               prompt and is excluded (the repo-context 0-overlap rule). DECLARED, overridable, NOT
//               structural — a governed knob with a documented default, not a law of the manifold.
//   limit     — mirrors recall's default slice (cognition.mjs:159).
//   excerpt   — the embed-text BYTE budget, mirrors DEFAULT_INGEST.excerpt (repo-memory.mjs:45): the
//               number of characters of a record's text that are embedded (and cached as sourceText).
//   model     — GOVERNED per-provider default embedding model. DECLARED (no live default that silently
//               costs a key); the embedding DIMENSION is DERIVED from the returned vector length, never
//               asserted as a literal here.
export const SEMANTIC_DEFAULTS = {
  threshold: 0.55,
  limit: 6,
  excerpt: 4000,
  // per-provider declared embedding model — OpenAI-compatible names; no call is made without an injected
  // embedder or a live key, so these are the documented default a deployment overrides, not a secret.
  model: {
    groq: "nomic-embed-text-v1.5",
    nim: "nvidia/nv-embedqa-e5-v5",
    cerebras: "nomic-embed-text-v1.5",
  },
};

// DEFAULT_EMBED_PROVIDER — GOVERNED-declared. groq is the foundation's first provider (providers.mjs:2).
export const DEFAULT_EMBED_PROVIDER = "groq";

// embeddingsEndpoint(providerName) — the OpenAI-compatible /embeddings endpoint, DERIVED not literal:
// every provider endpoint ends in /chat/completions (providers.mjs:2-13); /embeddings is its sibling.
// So we rewrite the suffix rather than hardcode a second URL per provider.
export function embeddingsEndpoint(providerName) {
  const provider = providers[providerName];
  if (!provider) {
    throw new Error(
      `Unsupported provider "${providerName}". Supported providers: ${Object.keys(providers).join(", ")}.`,
    );
  }
  return provider.endpoint.replace(/\/chat\/completions$/, "/embeddings");
}

// cosine(a, b) — the pure scorer. The dot product over the product of the L2 norms. A 0-norm vector (or
// an empty vector) yields 0, NEVER NaN — a refusal, not a fabricated score. Mismatched dimensions also
// yield 0 (a refusal: two vectors of different rank are not comparable; we do not invent a similarity).
export function cosine(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i += 1) {
    const x = Number(a[i]) || 0;
    const y = Number(b[i]) || 0;
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  if (na === 0 || nb === 0) return 0; // a 0-norm vector cosines to 0, never NaN.
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

// embedText(text, {embed, provider, model, env, fetch}?) -> Promise<number[]>
//
// The provider call (or its injected stand-in). When `opts.embed` is supplied it IS the embedder — the
// test passes a fake deterministic embedder here, so NO key and NO network are needed. Otherwise this
// POSTs the OpenAI embeddings shape {model, input:text} to the DERIVED /embeddings endpoint, reading
// data.data[0].embedding (the OpenAI embeddings response shape). fetch + env + apiKey are injectable
// exactly as infer.mjs:58-83.
export async function embedText(text, opts = {}) {
  if (typeof opts.embed === "function") return opts.embed(text);

  const providerName = opts.provider ?? DEFAULT_EMBED_PROVIDER;
  const model = opts.model ?? SEMANTIC_DEFAULTS.model[providerName];
  if (!model) throw new Error(`No embedding model declared for provider "${providerName}".`);
  const endpoint = embeddingsEndpoint(providerName);
  const { apiKey } = resolveApiKey(providerName, { env: opts.env, apiKey: opts.apiKey });
  const fetchImpl = opts.fetch ?? globalThis.fetch;
  if (!fetchImpl) throw new Error("No fetch implementation available.");

  const response = await fetchImpl(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, input: text }),
  });
  if (!response.ok) {
    throw new Error(`Embedding request failed with HTTP ${response.status} at ${endpoint}.`);
  }
  const data = await response.json();
  const vector = data?.data?.[0]?.embedding;
  if (!Array.isArray(vector)) throw new Error("Embedding response did not include data[0].embedding.");
  return vector;
}

// the term for a content-addressed embedding cell. The text is content-addressed so the SAME text under
// the SAME model maps to ONE term — re-embedding it is idempotent (the cell already stands).
function embeddingTermOf(model, text) {
  return `embeddings/${model}/${stableId([model, text], "emb")}`;
}

// the stored vector cell object, in the {const:v}|bare reading swarm-sheaf uses (cognition.mjs:86).
const objectOf = (cell) => cell.object?.const ?? cell.object;

// read a settled embedding cell's stored 'vector' (the cached embedding) if one stands. TTMS rides an
// array bare (swarm-sheaf.mjs:31-32), so the stored vector comes back as the array itself. Returns null
// when no vector cell has settled on this term (a void — we do not invent one).
function settledVector(memRoot, term, settled) {
  for (const { cell } of settled(memRoot, term).assignments) {
    const predicate = cell.predicate?.const ?? cell.predicate;
    if (predicate !== "vector") continue;
    const value = objectOf(cell);
    if (Array.isArray(value)) return value;
  }
  return null;
}

// cachedEmbedding(root, sourceTerm, text, {embed, model, now, settled, write}?) -> {vector, cached, term}
//
// Content-address `text` (under the embedding model) to a stable term, settle its section, and:
//   • if a 'vector' cell already stands -> RETURN it (cached:true, NO re-embed). Idempotent.
//   • else -> embed once (THROUGH the injected/governed embedder), write the cell, RETURN it (cached:false).
// `sourceTerm` is the term the text came from (a repo file cell, an agent record) — carried for the
// trace, never load-bearing for identity (identity is the content, the repo-memory content-hash
// discipline). The vector is stored as the cell object (TTMS rides an array bare, swarm-sheaf.mjs:31-32).
export async function cachedEmbedding(root, sourceTerm, text, opts = {}) {
  const settled = opts.settled ?? settledSection;
  const writeFn = opts.write ?? write;
  const now = opts.now ?? new Date().toISOString();
  const providerName = opts.provider ?? DEFAULT_EMBED_PROVIDER;
  const model = opts.model ?? SEMANTIC_DEFAULTS.model[providerName];
  const excerpt = opts.excerpt ?? SEMANTIC_DEFAULTS.excerpt;

  const memRoot = memoryRootOf(root);
  const sourceText = String(text).slice(0, excerpt);
  const term = embeddingTermOf(model, sourceText);

  const existing = settledVector(memRoot, term, settled);
  if (existing) return { vector: existing, cached: true, term };

  const vector = await embedText(sourceText, opts);
  writeFn(memRoot, term, jsonSafe({
    kind: "swarm.embedding",
    model,
    dim: vector.length, // the embedding DIMENSION is DERIVED from the vector, never a literal.
    vector,
    sourceTerm,
    sourceText,
    "content-hash": stableId([sourceText]),
    created: now,
  }), { t: now });
  return { vector, cached: false, term };
}

// recordText — the embeddable text of an agent record. Mirrors cognition.mjs recordText (cognition.mjs:134)
// verbatim in field choice, so the same record fields are scored — lexical or semantic.
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

// the GOVERNED embed seam. The live embed MUST pass the swarm-y spine: it runs as the 'memory.embed'
// governed tool through runGovernedTool, supplied as the extraActuator so it passes tool-policy admission
// -> the Gov regime -> the held-⊤ safety gate before the network egress. The actuator returns the
// actuators.mjs result shape {ok, value, trace} (actuators.mjs:34-101) so runActuator hands the governed
// runner a value it can witness/refuse/hold. A test injects the FAKE embedder here, so the gate is real
// but no key/network is touched.
//
// GOVERNANCE TRIGGER: the embed is GOVERNED whenever a governing `agent` is supplied AND `opts.govern`
// is not explicitly false (the message() pipeline supplies the agent, so the live egress is always
// gated). A read-path caller that wants the UNGOVERNED embed — a pure relevance fold with NO effect to
// govern, e.g. a test driving ranking with a deterministic fake — passes `opts.govern === false` (or no
// agent). `agent` is still required by semanticRecall for the record NAMESPACE; govern is the separate
// question of whether the embed effect passes the gate.
function governedEmbedder(root, agent, opts = {}) {
  if (!agent || opts.govern === false) return (text) => embedText(text, opts); // ungoverned read-path.
  const baseEmbed = (text) => embedText(text, opts);
  const embedActuator = async (_root, args) => {
    try {
      const vector = await baseEmbed(args?.text ?? "");
      return {
        ok: true,
        tool: "memory.embed",
        scope: "read",
        value: { dim: vector.length, vector, digest: stableId([args?.text ?? ""]) },
        trace: { predicate: "memory.embed", object: stableId([args?.text ?? ""]), kind: "swarm.actuator.embed" },
      };
    } catch (error) {
      return {
        ok: false,
        tool: "memory.embed",
        scope: "read",
        error: error?.message ?? "embedding-failed",
        value: null,
        trace: { predicate: "memory.embed", object: "", kind: "swarm.actuator.refused" },
      };
    }
  };
  return async (text) => {
    const run = await runGovernedTool(
      root,
      agent,
      { id: stableId([agent.name, "memory.embed", text], "embcall"), name: "memory.embed", arguments: { text } },
      { ...opts.governance, now: opts.now, extraActuators: { "memory.embed": embedActuator } },
    );
    if (run.ran && run.result?.ok === true) return run.result.value.vector;
    // the gate refused / held / unsettled: surface the verdict, never fabricate a vector.
    throw new Error(`memory.embed gate did not admit: ${run.outcome} (${run.reason}) at gate ${run.gate}`);
  };
}

// semanticRecall(root, agent, prompt, {embed, collections, limit, threshold, now}?) -> {query, records}
//
// The drop-in replacement for cognition.mjs recall (cognition.mjs:145-162). Embeds the prompt, embeds
// (cached) each record's text, scores by cosine, filters score>=threshold (the governed floor), sorts
// desc, slices to limit — SAME record/return shape as recall, so callers swap one for the other. A
// record with no cacheable text, or a sub-threshold score, is EXCLUDED (never fabricated). The embed is
// GOVERNED (runs through the spine as 'memory.embed') unless `opts.embed` is the injected stand-in — in
// which case the gate still wraps it (the fake embedder is the extraActuator).
export async function semanticRecall(root, agent, prompt, opts = {}) {
  const collections = opts.collections ?? ["memories", "dreams", "plans", "messages"];
  const limit = opts.limit ?? SEMANTIC_DEFAULTS.limit;
  const threshold = opts.threshold ?? SEMANTIC_DEFAULTS.threshold;
  const now = opts.now ?? new Date().toISOString();
  const embed = governedEmbedder(root, agent, opts);
  const cacheOpts = { ...opts, embed, now };

  // the prompt's query vector — embedded ONCE, cached as a cell (content-addressed) so a re-ask reuses it.
  const { vector: queryVector } = await cachedEmbedding(root, `query/${stableId([prompt], "q")}`, prompt, cacheOpts);

  // REUSE the record walk verbatim (cognition.mjs scanAgentRecords) — re-derive no addressing.
  const records = collections.flatMap((collection) =>
    scanAgentRecords(root, agent.name, collection).map((record) => ({ ...record, collection })),
  );

  const scored = [];
  for (const record of records) {
    const text = recordText(record);
    if (!text) continue; // no cacheable text -> not grounding, never invented.
    const { vector } = await cachedEmbedding(root, record.term, text, cacheOpts);
    const score = cosine(queryVector, vector);
    if (score < threshold) continue; // sub-threshold -> excluded (the 0-overlap-is-not-grounding rule).
    scored.push({ ...record, score });
  }

  const ranked = scored
    .sort((a, b) => b.score - a.score
      || String(b.doc.created ?? "").localeCompare(String(a.doc.created ?? "")))
    .slice(0, limit);

  return { query: prompt, records: ranked };
}

// ── repo-context, semantic ──────────────────────────────────────────────────────────────────────────
// selectRepoContextSemantic mirrors selectRepoContext (repo-context.mjs:128-180): enumerate the repo
// terms, settle each file cell, score by cosine over the file's path+text embedding (REPLACING token
// overlap), slice to limit + budget, render the same REPO MEMORY: block, surface a held content-hash
// succession under `contested`. The enumerate/settle/render machinery is re-derived here because those
// helpers are module-private in repo-context.mjs (re-deriving rather than editing an existing file —
// see neededExistingEdits for the preferable export-and-import alternative).

// enumerate the repo terms: each settled file is a term whose log lives at <repoMemRoot>/<term>/<x>.jsonl
// (re-derived from repo-context.mjs:53-67 — a term is the DIRECTORY holding a .jsonl log).
function enumerateRepoTerms(repoMemRoot) {
  if (!existsSync(repoMemRoot)) return [];
  const terms = new Set();
  const walk = (dir, prefix) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const childPrefix = prefix ? `${prefix}/${entry.name}` : entry.name;
      const childPath = join(dir, entry.name);
      if (entry.isDirectory()) walk(childPath, childPrefix);
      else if (entry.isFile() && entry.name.endsWith(".jsonl") && prefix) terms.add(prefix);
    }
  };
  walk(repoMemRoot, "");
  return [...terms];
}

// settle one repo file cell, KEEPING the held data (no last-writer collapse) — re-derived from
// repo-context.mjs:85-111. `contestedPredicates` is a >1-distinct-object succession (the affirm-only
// held-⊤); `topCells` are genuinely ⊤-valued cells (isTop).
function settledFileCell(repoMemRoot, term, settled) {
  const section = settled(repoMemRoot, term);
  const objectsByPredicate = new Map();
  const topCells = [];
  for (const { cell, charge } of section.assignments) {
    const predicate = cell.predicate?.const;
    if (!predicate) continue;
    const value = objectOf(cell);
    const objects = objectsByPredicate.get(predicate) ?? [];
    if (!objects.some((o) => o === value)) objects.push(value);
    objectsByPredicate.set(predicate, objects);
    if (isTop(charge)) topCells.push({ predicate, value, charge });
  }
  const path = (objectsByPredicate.get("path") ?? [])[0] ?? term;
  const texts = objectsByPredicate.get("text") ?? [];
  const contestedPredicates = [];
  for (const [predicate, objects] of objectsByPredicate) {
    if (objects.length > 1) contestedPredicates.push({ predicate, objects });
  }
  return { term, path, texts, objectsByPredicate, topCells, contestedPredicates };
}

// the file cell's embeddable text: its path plus its excerpt text (mirrors repo-context.mjs fileText,
// repo-context.mjs:116-118).
function fileText(fileCell) {
  return [fileCell.path, ...fileCell.texts].filter(Boolean).join(" ");
}

// the single source of truth for a selected cell's rendered line (mirrors repo-context.mjs
// repoContextLine, repo-context.mjs:199-202) — measured by the budget gate AND emitted by the renderer.
function repoContextLine(cell) {
  const excerpt = (cell?.excerpt ?? "").replace(/\s+/g, " ").trim();
  return `- ${cell?.path ?? ""} — ${excerpt}`;
}

function fileCellSummary(fileCell) {
  return { kind: "repo.file", path: fileCell.path, excerpt: (fileCell.texts[0] ?? "").slice(0, 240) };
}

// render the REPO MEMORY: block + a calm CONTESTED: subsection (mirrors repo-context.mjs renderRepoContext,
// repo-context.mjs:210-227). An empty selection renders to "" so it composes with cognition.context.
function renderRepoContext({ selected, contested, label } = {}) {
  const header = label ?? DEFAULT_CONTEXT.label;
  if (!selected || selected.length === 0) return "";
  const lines = [`${header}:`];
  for (const item of selected) lines.push(repoContextLine(item.cell ?? { path: item.term }));
  if (contested && contested.length) {
    lines.push("CONTESTED:");
    for (const item of contested) {
      const c = item.cell ?? {};
      const held = c.top
        ? `held-⊤ value ${JSON.stringify(c.value)}`
        : `held-⊤ across objects ${JSON.stringify(c.objects ?? [])}`;
      lines.push(`- ${c.path ?? item.term} [${c.predicate}]: ${held}`);
    }
  }
  return lines.join("\n");
}

// selectRepoContextSemantic(root, prompt, {embed, limit, budget, threshold, label, agent}?)
//   -> { context, selected, contested }
//
// The semantic peer of selectRepoContext: score each repo file cell by cosine over its embedding vs the
// prompt's embedding (REPLACING overlapScoreDefault), filter score>=threshold (the governed floor), sort
// desc, slice to limit + budget, surface a held content-hash succession under contested. The embed is
// GOVERNED through the spine (memory.embed) when `opts.agent` is supplied; a test passes a fake embedder
// as `opts.embed`. A sub-threshold file is excluded (never fed as grounding), never invented.
export async function selectRepoContextSemantic(swarmRoot, prompt, opts = {}) {
  const limit = opts.limit ?? DEFAULT_CONTEXT.limit;
  const budget = opts.budget ?? DEFAULT_CONTEXT.budget;
  const label = opts.label ?? DEFAULT_CONTEXT.label;
  const threshold = opts.threshold ?? SEMANTIC_DEFAULTS.threshold;
  const settled = opts.settled ?? settledSection;
  const now = opts.now ?? new Date().toISOString();

  const embed = governedEmbedder(swarmRoot, opts.agent, opts);
  const cacheOpts = { ...opts, embed, now };

  const repoMemRoot = repoMemoryRootOf(swarmRoot);
  const terms = opts.terms ?? enumerateRepoTerms(repoMemRoot);

  const { vector: queryVector } = await cachedEmbedding(swarmRoot, `query/${stableId([prompt], "q")}`, prompt, cacheOpts);

  const ranked = [];
  for (const term of terms) {
    const fileCell = settledFileCell(repoMemRoot, term, settled);
    const text = fileText(fileCell);
    if (!text) continue; // no embeddable text -> not grounding.
    const { vector } = await cachedEmbedding(swarmRoot, term, text, cacheOpts);
    const score = cosine(queryVector, vector);
    if (score < threshold) continue; // sub-threshold -> excluded (the 0-overlap-is-not-grounding rule).
    ranked.push({ fileCell, score });
  }
  ranked.sort((a, b) => b.score - a.score || String(a.fileCell.path).localeCompare(String(b.fileCell.path)));

  const selected = [];
  const contested = [];
  let used = 0;
  for (const { fileCell, score } of ranked) {
    if (selected.length >= limit) break;
    const summary = fileCellSummary(fileCell);
    const line = repoContextLine(summary);
    if (selected.length > 0 && used + line.length + 1 > budget) break;
    used += line.length + 1;

    selected.push({ term: fileCell.term, cell: summary, score });

    // surface every held-⊤ in this selected file — a succession (>1 distinct object) OR a genuine ⊤
    // cell — CALMLY, never collapsed, never resolved to a winner (repo-context.mjs:168-176).
    for (const { predicate, objects } of fileCell.contestedPredicates) {
      contested.push({ term: fileCell.term, cell: { predicate, objects, path: fileCell.path } });
    }
    for (const top of fileCell.topCells) {
      contested.push({ term: fileCell.term, cell: { predicate: top.predicate, value: top.value, path: fileCell.path, top: true } });
    }
  }

  const context = renderRepoContext({ selected, contested, label });
  return { context, selected, contested };
}
