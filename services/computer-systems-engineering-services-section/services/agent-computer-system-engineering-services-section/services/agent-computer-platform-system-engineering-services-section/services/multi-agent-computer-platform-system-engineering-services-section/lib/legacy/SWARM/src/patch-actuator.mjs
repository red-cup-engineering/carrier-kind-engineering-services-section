// patch-actuator — the SURGICAL file mutator: search/replace + unified-diff apply. The Aider-style
// differentiator over files.write, whose whole-file write (actuators.mjs:58) is LAST-WRITER — it
// clobbers the on-disk content with whatever the agent believed, discarding any divergence. That
// clobber IS the CLAUDE.md anti-pattern: a held ⊤ collapsed to a silent overwrite.
//
// A patch carries the agent's BELIEF about the current bytes (its `search` context). When that context
// no longer matches the file EXACTLY ONCE, the agent's belief and the file's reality are in
// CONTRADICTION — a held ⊤. We do NOT collapse it to a write. We refuse with the named reason
// 'patch-context-mismatch', so the SPINE gate (governed-tool-runner.mjs:170) settles "active" and feeds
// it back to the model (agent-loop.mjs:159 re-plan path) — the agent re-reads, re-forms its belief, and
// re-proposes. Reality is never overwritten by a stale belief.
//
// Each actuator mirrors actuators.mjs's admit->act->witness shape and owns ONLY the structural refusals
// that are FACTS ABOUT THE PATCH (sandbox escape, missing file, context mismatch). It decides NO
// governance admission — that is the runner's job (tool-policy admission + Gov regime + held-⊤ safety).
// The proposed trace row carries before/after content digests so the audit row witnesses the exact
// transition the patch effected.
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, relative } from "node:path";
import { createHash } from "node:crypto";

import { withinRoot } from "./actuators.mjs";

// digest — reuse the actuators.mjs:41 digest shape so a patch's before/after digests are comparable to
// a files.read / files.write digest on the same bytes.
function digestOf(content) {
  return "sha256-" + createHash("sha256").update(content).digest("hex");
}

// refused — build the ok:false result + its swarm.actuator.refused proposed trace row. The `error` is
// the NAMED reason the runner folds into FOUR (a context mismatch -> 'patch-context-mismatch' -> F).
function refused(tool, scope, path, error, extra = {}) {
  return {
    ok: false,
    tool,
    scope,
    error,
    value: null,
    trace: { predicate: tool, object: path, kind: "swarm.actuator.refused" },
    ...extra,
  };
}

// countOccurrences — how many EXACT (substring) matches of `needle` sit in `haystack`. The patch
// contract is EXACTLY ONCE: zero matches means the agent's belief is absent (the file moved on);
// multiple matches means the belief is AMBIGUOUS (which one did the agent mean?). Both are held-⊤
// contradictions, both refuse. Empty needle is treated as a malformed edit, not a match.
function countOccurrences(haystack, needle) {
  if (needle === "") return -1;
  let count = 0;
  let from = 0;
  for (;;) {
    const at = haystack.indexOf(needle, from);
    if (at === -1) break;
    count += 1;
    from = at + needle.length;
  }
  return count;
}

// applyPatch — the pure, in-memory core: given the CURRENT content and a list of {search, replace}
// edits, fold each edit in order, requiring EACH search to match EXACTLY ONCE in the content as it
// stands at that step. Returns { ok, content?, error?, edit? } — no disk touch, so it is the unit the
// tests pin and the actuators reuse. On the first edit whose context does not match exactly once, it
// STOPS and surfaces the contradiction (ok:false, error:'patch-context-mismatch') with the offending
// edit and its match count — the held ⊤ named, never collapsed to a partial clobber.
export function applyPatch(currentContent, edits) {
  if (!Array.isArray(edits) || edits.length === 0) {
    return { ok: false, error: "malformed-args" };
  }
  let content = currentContent;
  for (let i = 0; i < edits.length; i += 1) {
    const edit = edits[i];
    if (edit == null || typeof edit.search !== "string" || typeof edit.replace !== "string") {
      return { ok: false, error: "malformed-args", index: i, edit };
    }
    const occurrences = countOccurrences(content, edit.search);
    if (occurrences !== 1) {
      // zero, many, or empty-needle (-1) -> the belief does not pin a unique site. HELD ⊤: the agent's
      // context contradicts the file. Refuse with the named reason; do NOT write a partial result.
      return {
        ok: false,
        error: "patch-context-mismatch",
        index: i,
        edit,
        occurrences: occurrences < 0 ? 0 : occurrences,
      };
    }
    content = content.replace(edit.search, edit.replace);
  }
  return { ok: true, content };
}

// parseUnifiedDiff — extract the minimal unified-diff hunks into {search, replace} edits, so files.apply
// reduces to applyPatch (same EXACTLY-ONCE held-⊤ discipline). We parse ` ` context, `-` removals, and
// `+` additions per @@ hunk; the search side is (context + removals), the replace side is
// (context + additions), preserving surrounding context so the match is anchored. Headers (---/+++) are
// ignored. Returns { ok, edits? , error? }.
export function parseUnifiedDiff(unifiedDiff) {
  if (typeof unifiedDiff !== "string" || unifiedDiff.trim() === "") {
    return { ok: false, error: "malformed-args" };
  }
  const lines = unifiedDiff.split("\n");
  const edits = [];
  let search = null;
  let replace = null;
  const flush = () => {
    if (search !== null) edits.push({ search: search.join("\n"), replace: replace.join("\n") });
    search = null;
    replace = null;
  };
  for (const line of lines) {
    if (line.startsWith("---") || line.startsWith("+++")) continue;
    if (line.startsWith("@@")) {
      flush();
      search = [];
      replace = [];
      continue;
    }
    if (search === null) continue; // preamble before the first hunk
    if (line.startsWith("-")) search.push(line.slice(1));
    else if (line.startsWith("+")) replace.push(line.slice(1));
    else if (line.startsWith(" ")) {
      search.push(line.slice(1));
      replace.push(line.slice(1));
    } else if (line === "") {
      // a bare blank line inside a hunk is a context line of empty content.
      search.push("");
      replace.push("");
    }
  }
  flush();
  if (edits.length === 0) return { ok: false, error: "malformed-args" };
  return { ok: true, edits };
}

// PATCH_ACTUATORS — (root, args) => result. Sync (no async edit needed). Each reads the CURRENT bytes
// (withinRoot + readFileSync, reusing the actuators.mjs sandbox), folds the edits in memory via
// applyPatch, and ONLY writes back when every edit matched exactly once. The proposed EAVT row carries
// beforeDigest / afterDigest / digest so the trace witnesses the precise transition. No governance
// decision happens here — the runner gates it under the files.write policy.
export const PATCH_ACTUATORS = {
  // files.patch — search/replace edits. The held-⊤ differentiator: a context mismatch refuses, it does
  // NOT clobber.
  "files.patch": (root, { path, edits }) => {
    const abs = withinRoot(root, path);
    if (!abs) return refused("files.patch", "write", path, "out-of-sandbox");
    let before;
    try {
      before = readFileSync(abs, "utf8");
    } catch (e) {
      return refused(
        "files.patch",
        "write",
        path,
        e.code === "ENOENT" ? "enoent" : e.code === "EISDIR" ? "eisdir" : "io-error",
      );
    }
    const applied = applyPatch(before, edits);
    if (!applied.ok) {
      // a held ⊤ (context mismatch) or a malformed edit — surface the NAMED reason and the offending
      // edit; the runner settles "active" and feeds it back. Reality stays untouched.
      return refused("files.patch", "write", path, applied.error, {
        beforeDigest: digestOf(before),
        index: applied.index,
        occurrences: applied.occurrences,
        edit: applied.edit,
      });
    }
    return writeBack(root, abs, before, applied.content, "files.patch", "swarm.actuator.patch");
  },

  // files.apply — a unified diff. Reduces to applyPatch over the diff's hunks (same held-⊤ discipline).
  "files.apply": (root, { path, unifiedDiff }) => {
    const abs = withinRoot(root, path);
    if (!abs) return refused("files.apply", "write", path, "out-of-sandbox");
    const parsed = parseUnifiedDiff(unifiedDiff);
    if (!parsed.ok) return refused("files.apply", "write", path, parsed.error);
    let before;
    try {
      before = readFileSync(abs, "utf8");
    } catch (e) {
      return refused(
        "files.apply",
        "write",
        path,
        e.code === "ENOENT" ? "enoent" : e.code === "EISDIR" ? "eisdir" : "io-error",
      );
    }
    const applied = applyPatch(before, parsed.edits);
    if (!applied.ok) {
      return refused("files.apply", "write", path, applied.error, {
        beforeDigest: digestOf(before),
        index: applied.index,
        occurrences: applied.occurrences,
        edit: applied.edit,
      });
    }
    return writeBack(root, abs, before, applied.content, "files.apply", "swarm.actuator.apply");
  },
};

// writeBack — commit the folded content and build the ok:true result with before/after digests on both
// the value and the proposed trace row. resultDigest (governed-tool-runner.mjs:78) reads `value.digest`,
// so we set digest to the AFTER digest (the new on-disk bytes), matching files.write's convention.
function writeBack(root, abs, before, after, tool, kind) {
  try {
    writeFileSync(abs, after, "utf8");
  } catch (e) {
    return refused(tool, "write", abs, "io-error");
  }
  const relPath = relative(resolve(root), abs);
  const beforeDigest = digestOf(before);
  const afterDigest = digestOf(after);
  return {
    ok: true,
    tool,
    scope: "write",
    value: {
      path: abs,
      relPath,
      bytesWritten: Buffer.byteLength(after, "utf8"),
      beforeDigest,
      afterDigest,
      digest: afterDigest,
      changed: before !== after,
    },
    trace: { predicate: tool, object: relPath, kind, beforeDigest, afterDigest },
  };
}

// PATCH_SCHEMAS — OpenAI function-schema parameters, consumed by toolSchemasFor to advertise these
// surgical-edit capabilities to a tool-calling model. Both carry the files.write-class warning that the
// edit context must match the current file EXACTLY — a stale context is refused, not clobbered.
export const PATCH_SCHEMAS = {
  "files.patch": {
    name: "files.patch",
    description:
      "Surgically edit a UTF-8 file inside the workspace root by search/replace (leader-delegated). Each `search` must match the CURRENT file content EXACTLY ONCE; zero or multiple matches are refused (patch-context-mismatch) rather than overwriting — re-read the file and re-issue.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "workspace-relative path to an existing file" },
        edits: {
          type: "array",
          description: "ordered search/replace edits, each applied to the content as it stands",
          items: {
            type: "object",
            properties: {
              search: { type: "string", description: "exact text to find (must match exactly once)" },
              replace: { type: "string", description: "text to substitute in its place" },
            },
            required: ["search", "replace"],
          },
        },
      },
      required: ["path", "edits"],
    },
  },
  "files.apply": {
    name: "files.apply",
    description:
      "Apply a unified diff to a UTF-8 file inside the workspace root (leader-delegated). Each hunk's context+removed lines must match the CURRENT file EXACTLY ONCE; a context mismatch is refused (patch-context-mismatch), never a partial or clobbering write.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "workspace-relative path to an existing file" },
        unifiedDiff: { type: "string", description: "a unified diff (@@ hunks) to apply to the file" },
      },
      required: ["path", "unifiedDiff"],
    },
  },
};
