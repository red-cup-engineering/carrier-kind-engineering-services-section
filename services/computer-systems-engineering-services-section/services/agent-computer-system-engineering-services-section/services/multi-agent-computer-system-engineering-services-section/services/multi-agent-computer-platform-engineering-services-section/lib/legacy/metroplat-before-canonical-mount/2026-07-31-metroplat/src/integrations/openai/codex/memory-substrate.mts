import path from "node:path";
import { sha256Hex } from "../../../lib/identity/index.mts";


import { pathExists, readFileUtf8, statPathOrNull, walkFiles } from "../../../lib/filesystem/index.mts";

export interface CodexMemoryPriorContextOptions {
  readonly query?: string;
  readonly limit?: number;
  readonly maxExcerptChars?: number;
}

export type CodexMemoryRecallFacet =
  | "workspace-orientation"
  | "active-root"
  | "prior-attempts"
  | "operator-corrections"
  | "placement-guidance"
  | "research-corpus";

export interface CodexMemoryRecallPolicy {
  readonly kind: "metroplat.codex-memory.recall-policy";
  readonly query: string;
  readonly facets: readonly CodexMemoryRecallFacet[];
  readonly requiredTerms: readonly string[];
  readonly evidence: readonly string[];
}

export interface CodexMemoryPriorContextSource {
  readonly kind: "metroplat.codex-memory.prior-context-source";
  readonly address: string;
  readonly path: string;
  readonly source: string;
  readonly role: "index" | "rollout-summary";
  readonly bytes: number;
  readonly sha256: string;
  readonly modifiedAt?: string;
  readonly matchedTerms: readonly string[];
  readonly excerpt: string;
  readonly excerptStart: number;
  readonly excerptEnd: number;
  readonly rolloutId?: string;
  readonly evidence: readonly string[];
  readonly policyFacets: readonly CodexMemoryRecallFacet[];
}

export interface CodexMemoryPriorContext {
  readonly kind: "metroplat.agent.prior-context-synthesis";
  readonly substrate: "codex-memory";
  readonly root: string;
  readonly query: string;
  readonly recallPolicy: CodexMemoryRecallPolicy;
  readonly sources: readonly CodexMemoryPriorContextSource[];
  readonly claims: readonly string[];
  readonly openQuestions: readonly string[];
  readonly evidence: readonly string[];
}

const DEFAULT_QUERY = "active agent task prior context";
const DEFAULT_LIMIT = 16;
const DEFAULT_EXCERPT_CHARS = 1200;
const WORD_PATTERN = /[a-z0-9][a-z0-9_-]{2,}/giu;
const FACET_TERMS: Readonly<Record<CodexMemoryRecallFacet, readonly string[]>> = Object.freeze({
  "workspace-orientation": Object.freeze(["README is the only root orientation", "live context wins", "stale memory", "workspace posture"]),
  "active-root": Object.freeze(["current active metroplat root", "active root", "lib/emsenn/src/apps/metroplat", "sites/metroplat.emsenn.net"]),
  "prior-attempts": Object.freeze(["prior attempt", "prior attempts", "rollout", "rederive", "capability", "previous"]),
  "operator-corrections": Object.freeze(["when the user", "operator", "corrected", "symptom:", "cause:", "fix:"]),
  "placement-guidance": Object.freeze(["ordinary Node", "industry-standard", "placement", "package boundaries"]),
  "research-corpus": Object.freeze(["Obsmetrologia", "Lean", "theorem", "proof", "research", "mathematics"]),
});

function termsOf(query: string): readonly string[] {
  const seen = new Set<string>();
  for (const match of query.matchAll(WORD_PATTERN)) seen.add(match[0].toLowerCase());
  return Object.freeze([...seen]);
}

function unique(values: Iterable<string>): readonly string[] {
  return Object.freeze([...new Set([...values].filter((value) => value.length > 0))]);
}

function recallPolicyOf(query: string): CodexMemoryRecallPolicy {
  const lower = query.toLowerCase();
  const facets: CodexMemoryRecallFacet[] = [
    "workspace-orientation",
    "active-root",
    "prior-attempts",
    "operator-corrections",
  ];
  if (/\b(node|package|placement|directory|src|integration|export|public api)\b/iu.test(lower)) facets.push("placement-guidance");
  if (/\b(lean|proof|theorem|math|mathematics|research|corpus|obsmetrologia)\b/iu.test(lower)) facets.push("research-corpus");
  const selectedFacets = unique(facets) as readonly CodexMemoryRecallFacet[];
  const requiredTerms = unique(selectedFacets.flatMap((facet) => FACET_TERMS[facet]));
  return Object.freeze({
    kind: "metroplat.codex-memory.recall-policy" as const,
    query,
    facets: selectedFacets,
    requiredTerms,
    evidence: Object.freeze([
      `facets:${selectedFacets.length}`,
      `required-terms:${requiredTerms.length}`,
      "baseline:workspace-orientation",
      "baseline:active-root",
      "baseline:prior-attempts",
      "baseline:operator-corrections",
    ]),
  });
}

function relativePath(root: string, filePath: string): string {
  return path.relative(root, filePath).split(path.sep).join("/");
}

function roleOf(relative: string): "index" | "rollout-summary" | undefined {
  if (relative === "MEMORY.md") return "index";
  if (relative.startsWith("rollout_summaries/") && (relative.endsWith(".md") || relative.endsWith(".jsonl"))) return "rollout-summary";
  return undefined;
}

function matchedTermsOf(text: string, terms: readonly string[]): readonly string[] {
  const lower = text.toLowerCase();
  return Object.freeze(terms.filter((term) => lower.includes(term.toLowerCase())));
}

function policyFacetsOf(text: string, policy: CodexMemoryRecallPolicy): readonly CodexMemoryRecallFacet[] {
  const lower = text.toLowerCase();
  return Object.freeze(policy.facets.filter((facet) =>
    FACET_TERMS[facet].some((term) => lower.includes(term.toLowerCase()))));
}

function excerptOf(text: string, terms: readonly string[], maxChars: number): Readonly<{ text: string; start: number; end: number }> {
  if (text.length <= maxChars) return Object.freeze({ text, start: 0, end: text.length });
  const lower = text.toLowerCase();
  const firstHit = terms.map((term) => lower.indexOf(term)).filter((index) => index >= 0).sort((left, right) => left - right)[0] ?? 0;
  const start = Math.max(0, firstHit - Math.floor(maxChars / 4));
  const excerpt = text.slice(start, start + maxChars);
  const end = start + excerpt.length;
  return Object.freeze({
    text: `${start === 0 ? "" : "[leading context omitted]\n"}${excerpt}${end >= text.length ? "" : "\n[trailing context omitted]"}`,
    start,
    end,
  });
}

function compareSources(left: CodexMemoryPriorContextSource, right: CodexMemoryPriorContextSource): number {
  if (left.role !== right.role) {
    if (left.role === "index") return -1;
    if (right.role === "index") return 1;
  }
  if (left.policyFacets.length !== right.policyFacets.length) return right.policyFacets.length - left.policyFacets.length;
  if (left.matchedTerms.length !== right.matchedTerms.length) return right.matchedTerms.length - left.matchedTerms.length;
  const leftTime = left.modifiedAt ?? "";
  const rightTime = right.modifiedAt ?? "";
  if (leftTime !== rightTime) return leftTime < rightTime ? 1 : -1;
  return left.path.localeCompare(right.path);
}

function candidateFiles(root: string): readonly string[] {
  if (!pathExists(root)) return Object.freeze([]);
  const memoryIndex = path.join(root, "MEMORY.md");
  const rolloutRoot = path.join(root, "rollout_summaries");
  return Object.freeze([
    ...(pathExists(memoryIndex) ? [memoryIndex] : []),
    ...walkFiles(rolloutRoot, {
      maxDepth: 1,
      includeFile: (name) => name.endsWith(".md") || name.endsWith(".jsonl"),
    }),
  ]);
}

function rolloutIdOf(text: string): string | undefined {
  const threadId = /^thread_id:\s*([0-9a-f]{8}-[0-9a-f-]{27,})$/imu.exec(text)?.[1];
  if (threadId !== undefined) return threadId;
  return /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/iu.exec(text)?.[0];
}

function claimsOf(sources: readonly CodexMemoryPriorContextSource[], query: string, policy: CodexMemoryRecallPolicy): readonly string[] {
  return Object.freeze([
    `Prior-context substrate read for query: ${query}`,
    `Recall policy requires facets: ${policy.facets.join(", ")}.`,
    `Selected ${sources.length} memory source(s) as boot material.`,
    ...sources.slice(0, 6).map((source) =>
      `${source.role}:${source.path} matched ${source.matchedTerms.length} query term(s) and ${source.policyFacets.length} policy facet(s).`),
  ]);
}

function openQuestionsOf(sources: readonly CodexMemoryPriorContextSource[], policy: CodexMemoryRecallPolicy): readonly string[] {
  const covered = new Set(sources.flatMap((source) => source.policyFacets));
  return Object.freeze([
    ...(sources.length === 0 ? ["No Codex memory sources were available for this context image."] : []),
    ...policy.facets.filter((facet) => !covered.has(facet)).map((facet) =>
      `Recall policy facet ${facet} has no selected memory source.`),
    ...sources.filter((source) => source.matchedTerms.length === 0 && source.policyFacets.length > 0).slice(0, 4).map((source) =>
      `${source.path} is included by recall policy, not direct query-term match.`),
  ]);
}

/** Read Codex's memory index and rollout summaries as bootable prior-context material.
 *
 * The output is intentionally a context substrate, not a tool-loop shortcut:
 * it names source files, matched query evidence, excerpts, claims, and open
 * questions so the agent context image can page the material in and still tell
 * what remains uncertain.
 */
export function readCodexMemoryPriorContext(
  root: string,
  options: CodexMemoryPriorContextOptions = {},
): CodexMemoryPriorContext {
  const resolvedRoot = path.resolve(root);
  const query = options.query ?? DEFAULT_QUERY;
  const recallPolicy = recallPolicyOf(query);
  const terms = termsOf(query);
  const excerptTerms = unique([...terms, ...recallPolicy.requiredTerms]);
  const maxExcerptChars = options.maxExcerptChars ?? DEFAULT_EXCERPT_CHARS;
  const limit = options.limit ?? DEFAULT_LIMIT;
  const sources = candidateFiles(resolvedRoot).flatMap((source): CodexMemoryPriorContextSource[] => {
    const relative = relativePath(resolvedRoot, source);
    const role = roleOf(relative);
    if (role === undefined) return [];
    const stat = statPathOrNull(source);
    if (stat === null || !stat.isFile()) return [];
    let text: string;
    try {
      text = readFileUtf8(source);
    } catch {
      return [];
    }
    const matchedTerms = matchedTermsOf(text, terms);
    const policyFacets = policyFacetsOf(text, recallPolicy);
    if (role !== "index" && matchedTerms.length === 0 && policyFacets.length === 0) return [];
    const sha256 = sha256Hex(text);
    const excerpt = excerptOf(text, excerptTerms, maxExcerptChars);
    const rolloutId = role === "rollout-summary" ? rolloutIdOf(text) : undefined;
    return [Object.freeze({
      kind: "metroplat.codex-memory.prior-context-source" as const,
      address: `${relative}#char-${excerpt.start}-${excerpt.end}`,
      path: relative,
      source,
      role,
      bytes: stat.size,
      sha256,
      modifiedAt: stat.mtime.toISOString(),
      matchedTerms,
      excerpt: excerpt.text,
      excerptStart: excerpt.start,
      excerptEnd: excerpt.end,
      ...(rolloutId === undefined ? {} : { rolloutId }),
      policyFacets,
      evidence: Object.freeze([
        `role:${role}`,
        `bytes:${stat.size}`,
        `sha256:${sha256}`,
        `matched-terms:${matchedTerms.length}`,
        `policy-facets:${policyFacets.join(",")}`,
        `excerpt:${excerpt.start}-${excerpt.end}`,
        ...(rolloutId === undefined ? [] : [`rollout-id:${rolloutId}`]),
      ]),
    })];
  });
  const selected = Object.freeze([...sources].sort(compareSources).slice(0, limit));
  return Object.freeze({
    kind: "metroplat.agent.prior-context-synthesis" as const,
    substrate: "codex-memory" as const,
    root: resolvedRoot,
    query,
    recallPolicy,
    sources: selected,
    claims: claimsOf(selected, query, recallPolicy),
    openQuestions: openQuestionsOf(selected, recallPolicy),
    evidence: Object.freeze([
      `terms:${terms.length}`,
      `policy-facets:${recallPolicy.facets.length}`,
      `sources:${sources.length}`,
      `selected:${selected.length}`,
      "substrate:codex-memory",
    ]),
  });
}
