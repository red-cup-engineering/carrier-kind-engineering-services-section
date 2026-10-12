/**
 * @packageDocumentation
 *
 * running/catalog — the package's mounted projector catalog: every codec and
 * projection node of the recognition lattice, assembled so `read(path)` and
 * `write(path, claim)` can dispatch through `classifyAt` to the most specific
 * projector at a requested content-commitment corner.
 *
 * The lattice mounted here:
 *
 *   string ── markdown (assertion) ── agents-doc (assertion)
 *   json ─┬─ jsonl ─┬─ eavt (assertion)
 *         │         ├─ claude-session (data) ─┬─ /work-claims (assertion)
 *         │         │                         └─ /continuation (prose)
 *         │         └─ codex-session (data) ──┬─ /work-claims (assertion)
 *         │                                   └─ /continuation (prose)
 *         ├─ sen
 *         ├─ hook-envelope (data)
 *         ├─ lean-workspace (data)
 *         ├─ tex-workspace (data)
 *         └─ directory-manifest (data) ── knowledge-vault (assertion) ── site-directory-grammar (assertion)
 *
 * A genuinely new kind of material gets a RECOGNIZER mounted here (a codec
 * restriction), and a genuinely new view gets a PROJECTION at a corner — never
 * a new service verb.
 */
import { pathBasename, pathParent } from "@red-cup-engineering/computer-filepath-engineering-services-section/posix";
import {
  classifyAt,
  restrict,

} from "@red-cup-engineering/computer-content-engineering-services-section/typed-resource-classification";
import { stringProjector } from "@red-cup-engineering/computer-content-engineering-services-section/text-projector";
import { generateAgentsDocBody, markdownProjector, siteNoteFrontmatterConformance } from "@red-cup-engineering/markdown-engineering-services-section/markdown-projector";
import { createMarkdownDocument } from "@red-cup-engineering/markdown-engineering-services-section/create-markdown-document";
import { glueFactClaims, sourceReliabilityCorrelation } from "@red-cup-engineering/feltos/claims/fact-claims";
import { parse } from "@red-cup-engineering/json-services-section";
import { senProjector } from "@red-cup-engineering/communicating/language/projector";
import {
  claudeCodeTranscriptRecordsFromJsonl,
  claudeSessionContinuationOfContent,
  claudeSessionWorkClaimsOfContent,
  isClaudeSessionTranscriptContent,
} from "@red-cup-engineering/feltos/agents/sessions/claude-code/codec";
import {
  codexSessionContinuationOfContent,
  codexSessionWorkClaimsOfContent,
  isCodexSessionTranscriptContent,
} from "@red-cup-engineering/feltos/agents/sessions/codex/codec";
import { admitHookEnvelope, isHookEnvelope } from "@red-cup-engineering/agent-harness-computer-system-engineering-services-section/hooks/codec";
import { leanWorkspaceReadContract } from "@red-cup-engineering/feltos/lean/schema";
import { texWorkspaceReadContract } from "@red-cup-engineering/lean-system-services-section/tex/schema";
import { siteDirectoryGrammarOf } from "@red-cup-engineering/signchain/contracts/site-directory-grammar";
import { directoryManifestContract, isDirectoryManifest } from "@red-cup-engineering/metroplat/resources/directory-manifest";
import { jsonProjector } from "@red-cup-engineering/computer-content-engineering-services-section/json-projector";
import { jsonlProjector } from "@red-cup-engineering/jsonl-services-section/jsonl-projector";
import { eavtProjector } from "@red-cup-engineering/eavt-services-section/row";

export { isDirectoryManifest };

/* ── agents-doc ─────────────────────────────────────────────────────────── */

const AGENTS_DOC_FILENAME = /(^|\/)(AGENTS\.md|CLAUDE(\.local)?\.md)$/u;

function isAgentsDocWriteView(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    && typeof (value)["site"] === "string"
    && typeof (value)["claimsByFacet"] === "object";
}

/** AGENTS.md/CLAUDE.md specifically, restricting the generic markdown
 *  projector: reads exactly as markdown (no behavior change), but a write
 *  carrying a `{site, claimsByFacet}` view renders its body from real facet
 *  fact claims (`generateAgentsDocBody`) instead of accepting hand-authored
 *  prose as the only path — a plain markdown view still writes through
 *  unchanged, so existing callers are not broken. */
export const agentsDocProjector = restrict(markdownProjector, {
  type: "agents-doc",
  recognize: (resource) => AGENTS_DOC_FILENAME.test(resource.path),
  write: (items) => {
    if (items.length === 1 && isAgentsDocWriteView(items[0])) {
      const view = items[0];
      const claimsByFacet = new Map(Object.entries(view.claimsByFacet));
      const body = generateAgentsDocBody(view.site, claimsByFacet, glueFactClaims, sourceReliabilityCorrelation);
      return markdownProjector.write([{ body }]);
    }
    return markdownProjector.write(items);
  },
});

/* ── site notes ──────────────────────────────────────────────────────────── */

/** Sync the body's leading heading to the frontmatter title — the one
 *  operation no existing codec performs (`bodySkeleton`'s `{title}`
 *  templates in `documentTypeDefinitions` are declared but never rendered by
 *  anything). Fixes the two structural drifts a 278-note census found live:
 *  60 of 278 notes carried no H1 at all, 64 carried an H1 that did not match
 *  their own title. A body already opening on `# {title}` is left
 *  untouched; a different leading `#` heading is replaced (the structured
 *  title is the one field a caller cannot have fat-fingered inconsistently
 *  with itself); no heading at all gets one prepended. `semanticLineBreaks`
 *  (`formats/markdown/semantic-line-breaks.mjs`) already leaves heading
 *  lines untouched, so running its output through that reflow afterward is
 *  safe. */
function noteBodyWithSyncedHeading(title, body) {
  const heading = `# ${title}`;
  const lines = body.split("\n");
  const firstContentIndex = lines.findIndex((line) => line.trim() !== "");
  if (firstContentIndex === -1) return `${heading}\n`;
  if (lines[firstContentIndex].trim() === heading) return body;
  if (/^#\s+/u.test(lines[firstContentIndex])) {
    const replaced = [...lines];
    replaced[firstContentIndex] = heading;
    return replaced.join("\n");
  }
  return `${heading}\n\n${body}`;
}

function siteNoteFrontmatterOf(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  return value;
}

/** A markdown file at ANY site's `notes` directory-grammar role — recognized
 *  positionally through `siteDirectoryGrammarOf` (bare `notes/`, `content/
 *  notes/`, `dev/content/notes/YYYY/MM/DD/`, or any other legal ordering of
 *  the `dev`/`content`/`notes` tokens; README.md's directory grammar is a
 *  property of the whole `info` ecosystem, not one site's filenames), never
 *  by matching a literal path string. A note is a note by being ALL of:
 *  markdown (the parent `markdownProjector`'s own recognition), positioned
 *  at a `notes` role, AND carrying the required facets `siteNoteFrontmatter
 *  Conformance` settles through the SAME reading algebra
 *  `frontmatterConformanceOfFormat` already uses — never a flat boolean
 *  guard standing in for it. Unlike `agentsDocProjector`, there is no
 *  hand-authored-prose escape hatch on write: a plain markdown view reaching
 *  this projector IS the drift a 278-note census (one site's `dev/content/
 *  notes/`, read 2026-07-05) found live — so a write's frontmatter facets
 *  must settle `conformant`, and the body is run through the real codecs:
 *  the heading synced to the title, then reflowed to semantic line breaks
 *  (`createMarkdownDocument`'s own `semanticLinefeeds` option — already built,
 *  never previously wired to any caller) rather than left at whatever
 *  wrapping the caller happened to type. */
export const siteNoteProjector = restrict(markdownProjector, {
  type: "site-note",
  recognize: (resource) => siteDirectoryGrammarOf(resource.path)?.role === "notes",
  write: (items) => {
    const frontmatter = items.length === 1 ? siteNoteFrontmatterOf(items[0]) : null;
    if (frontmatter === null) {
      throw new TypeError("site-note: write requires exactly one { title, description, \"date-created\", tags, body? } item — hand-authored prose with no frontmatter is exactly the drift this projector closes.");
    }
    const conformance = siteNoteFrontmatterConformance(frontmatter);
    if (!conformance.conformant) {
      const failed = conformance.readings.filter((entry) => entry.modality === "MUST" && entry.value === "denied").map((entry) => entry.predicate);
      throw new TypeError(`site-note: write does not settle the required note facets — failed: ${failed.join(", ")}.`);
    }
    const title = frontmatter["title"];
    const rawBody = frontmatter["body"];
    const synced = noteBodyWithSyncedHeading(title, typeof rawBody === "string" ? rawBody : "");
    return createMarkdownDocument({ ...frontmatter, body: synced });
  },
});

/* ── agent session transcripts ──────────────────────────────────────────── */

const isJsonlPath = (resource) => resource.path.endsWith(".jsonl");

/** Claude Code session transcripts: JSONL whose rows carry the host mark. Reads
 *  the admitted host records verbatim at the data corner. */
export const claudeSessionProjector = restrict(jsonlProjector, {
  type: "claude-session",
  corner: "data",
  recognize: (resource) => isJsonlPath(resource) && isClaudeSessionTranscriptContent(resource.content),
  read: (resource) => {
    const parentDirectory = pathParent(resource.path) ?? ".";
    return claudeCodeTranscriptRecordsFromJsonl({
      content: resource.content,
      source: resource.path,
      relative: pathBasename(resource.path),
      parentDirectory,
      parentDirectoryName: pathBasename(parentDirectory),
    });
  },
});

/** The work-claims view of a Claude Code transcript: valued goal/obligation/act
 *  claims — truth-apt and addressable, so it reads at the assertion corner. */
export const claudeSessionWorkClaimsProjector = restrict(claudeSessionProjector, {
  type: "claude-session/work-claims",
  corner: "assertion",
  rung: "scott",
  read: (resource) => [
    claudeSessionWorkClaimsOfContent(resource.content, { source: resource.path }),
  ],
});

/** The continuation view of a Claude Code transcript: the settled narrative a
 *  successor session resumes from — asserting prose. */
export const claudeSessionContinuationProjector = restrict(claudeSessionProjector, {
  type: "claude-session/continuation",
  corner: "prose",
  rung: "scott",
  read: (resource) => [
    claudeSessionContinuationOfContent(resource.content, { source: resource.path }),
  ],
});

/** Codex session transcripts: rollout JSONL rows admitted verbatim at data. */
export const codexSessionProjector = restrict(jsonlProjector, {
  type: "codex-session",
  corner: "data",
  recognize: (resource) => isJsonlPath(resource) && isCodexSessionTranscriptContent(resource.content),
});

/** The work-claims view of a Codex transcript at the assertion corner. */
export const codexSessionWorkClaimsProjector = restrict(codexSessionProjector, {
  type: "codex-session/work-claims",
  corner: "assertion",
  rung: "scott",
  read: (resource) => [
    codexSessionWorkClaimsOfContent(resource.content, { source: resource.path }),
  ],
});

/** The continuation view of a Codex transcript at the prose corner. */
export const codexSessionContinuationProjector = restrict(codexSessionProjector, {
  type: "codex-session/continuation",
  corner: "prose",
  rung: "scott",
  read: (resource) => [
    codexSessionContinuationOfContent(resource.content, { source: resource.path }),
  ],
});

/* ── harness hook envelopes ─────────────────────────────────────────────── */

/** Codex/Claude-style hook payloads: JSON whose envelope admission succeeds.
 *  Reads the NORMALIZED envelope, not the raw payload. */
export const hookEnvelopeProjector = restrict(jsonProjector, {
  type: "hook-envelope",
  corner: "data",
  recognize: (resource) => {
    try {
      return isHookEnvelope(admitHookEnvelope(parse(resource.content)));
    } catch {
      return false;
    }
  },
  read: (resource) => [admitHookEnvelope(parse(resource.content))],
});

/* ── journal state-tier settlements ────────────────────────────────────────── */

/* ── workspace readings ─────────────────────────────────────────────────── */

/** Parse a resource's content as JSON and check it against an already-declared
 *  schema contract — never a hand-rolled field check re-implementing what
 *  the contract's `validate` already does. A parse failure is "not this kind",
 *  not an error: recognition is a boundary question, never a throw. */
function validatesAs(resource, contract) {
  try {
    return contract.validate(parse(resource.content));
  } catch {
    return false;
  }
}

/** A Lean workspace reading, presented at the workspace's own path by the
 *  read service's directory recognition (lean-toolchain/lakefile marks). All
 *  reports — import graph, theorem spine, obligation and reference coverage,
 *  capability authority, relational configuration — are fields of the one
 *  reading. Scott rung: module admission and claim gluing are monotone. */
export const leanWorkspaceProjector = restrict(jsonProjector, {
  type: "lean-workspace",
  corner: "data",
  rung: "scott",
  recognize: (resource) => validatesAs(resource, leanWorkspaceReadContract),
});

/** A TeX-family workspace reading (TeX/Blueprint/Verso plates and projection
 *  reports), presented at the workspace's own path by directory recognition. */
export const texWorkspaceProjector = restrict(jsonProjector, {
  type: "tex-workspace",
  corner: "data",
  rung: "scott",
  recognize: (resource) => validatesAs(resource, texWorkspaceReadContract),
});

/* ── directory manifests and knowledge vaults ───────────────────────────── */

/** Directory manifests at the data corner: addressable, not truth-apt. */
export const directoryManifestProjector = restrict(jsonProjector, {
  type: "directory-manifest",
  corner: "data",
  recognize: (resource) => validatesAs(resource, directoryManifestContract),
});


/* ── the catalog ────────────────────────────────────────────────────────── */

/** The mounted projector catalog. Depth and corner drive dispatch; the only
 *  role of ORDER is root tie-breaking in `classifyAt`, generic → specific: a
 *  one-line JSON document that both `jsonl` and `json` recognize dispatches to
 *  `json` because its root sits later here. */
export const projectorCatalog = Object.freeze([
  stringProjector,
  markdownProjector,
  agentsDocProjector,
  siteNoteProjector,
  jsonlProjector,
  eavtProjector,
  claudeSessionProjector,
  claudeSessionWorkClaimsProjector,
  claudeSessionContinuationProjector,
  codexSessionProjector,
  codexSessionWorkClaimsProjector,
  codexSessionContinuationProjector,
  jsonProjector,
  senProjector,
  hookEnvelopeProjector,
  leanWorkspaceProjector,
  texWorkspaceProjector,
  directoryManifestProjector,
]);

/** Classify a resource against the mounted catalog at an optional corner. */
export function classifyResource(resource, corner) {
  return classifyAt(resource, projectorCatalog, corner);
}
