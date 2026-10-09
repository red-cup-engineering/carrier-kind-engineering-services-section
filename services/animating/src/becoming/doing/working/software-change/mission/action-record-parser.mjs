import { jsonValuesOfText } from "@red-cup-engineering/json-services-section/json-values-of-text";

// Aliases used to normalize action names that appear under different
// spellings depending on which model produced the record.
const ACTION_ALIASES = {
  read_file: "read",
  list_dir: "list_files",
  edit_file: "edit",
  create_file: "create",
  run_test: "test",
  apply_patch: "edit",
};

const KNOWN_ACTION_NAMES = [
  "list_files",
  "list_dir",
  "search",
  "read",
  "read_file",
  "edit",
  "edit_file",
  "create",
  "create_file",
  "test",
  "run_test",
  "finish",
];

const DEFAULT_REASON = "provider selected this next tool move";

/**
 * Parse a model-generated action record into a normalized
 * `{ action, args, reason }` shape.
 *
 * `record.text` may contain a JSON object (bare or inside a fenced code
 * block) or a plain-text "TOOL: ..." block. Returns `null` when no action
 * can be recovered.
 */
export function parseSoftwareMissionActionRecord(record) {
  if (!record || typeof record.text !== "string") return null;

  const value = extractJsonRecord(record.text);
  if (!value) return extractMarkdownAction(record.text);

  if (typeof value.action === "string") {
    return {
      action: ACTION_ALIASES[value.action] || value.action,
      args: normalizeArgs(value.args, value, ["action", "reason"]),
      reason: value.reason || DEFAULT_REASON,
    };
  }

  if (typeof value.command === "string") {
    return {
      action: ACTION_ALIASES[value.command] || value.command,
      args: normalizeArgs(undefined, value, ["command", "reason"]),
      reason: value.reason || DEFAULT_REASON,
    };
  }

  for (const name of KNOWN_ACTION_NAMES) {
    if (value[name] === undefined) continue;
    return {
      action: ACTION_ALIASES[name] || name,
      args: value[name] && typeof value[name] === "object" ? value[name] : {},
      reason: value.reason || DEFAULT_REASON,
    };
  }

  if (typeof value.path === "string") {
    const action = value.blocks !== undefined ? "edit" : value.content !== undefined ? "create" : "read";
    const reason =
      value.blocks !== undefined
        ? "provider supplied a source edit"
        : value.content !== undefined
          ? "provider supplied a source creation"
          : "provider selected a source path to inspect";
    return { action, args: value, reason };
  }

  return null;
}

/**
 * Given a parsed action, return its edit blocks as an array, or `null` if
 * the action isn't an edit or carries no blocks.
 */
export function actionBlocks(action) {
  if (action?.action !== "edit") return null;
  const blocks = action.args?.blocks;
  if (Array.isArray(blocks)) return blocks;
  if (blocks && typeof blocks === "object") return [blocks];
  return null;
}

function normalizeArgs(explicitArgs, source, omitKeys) {
  if (explicitArgs && typeof explicitArgs === "object") return explicitArgs;
  return Object.fromEntries(Object.entries(source).filter(([key]) => !omitKeys.includes(key)));
}

// The first JSON record the text carries (json-services-section jsonValuesOfText: the whole
// text, then its fenced blocks from the last, then its outermost braces). Arrays and primitives
// don't count as records.
function extractJsonRecord(text) {
  return jsonValuesOfText(String(text)).find((value) => value !== null && typeof value === "object" && !Array.isArray(value)) ?? null;
}

// Fallback parser for the plain-text action format:
//
//   TOOL: edit
//   PATH: src/index.js
//   SEARCH:
//   ```
//   old code
//   ```
//   REPLACE:
//   ```
//   new code
//   ```
function extractMarkdownAction(text) {
  const source = String(text);
  const tool = source.match(/(?:^|\n)\s*TOOL\s*:\s*([a-z_]+)\s*(?:\n|$)/iu)?.[1]?.toLowerCase();
  if (!tool) return null;

  const aliases = {
    read_file: "read",
    list_dir: "list_files",
    edit_file: "edit",
    create_file: "create",
    run_test: "test",
  };
  const action = aliases[tool] ?? tool;
  const path = source.match(/(?:^|\n)\s*PATH\s*:\s*([^\n]+)\s*(?:\n|$)/iu)?.[1]?.trim();
  const query = source.match(/(?:^|\n)\s*QUERY\s*:\s*([^\n]+)\s*(?:\n|$)/iu)?.[1]?.trim();
  const fenced = (label) =>
    source.match(new RegExp(`(?:^|\\n)\\s*${label}\\s*:\\s*\\n\\s*\`\`\`(?:[^\\n]*)\\n([\\s\\S]*?)\\n\`\`\``, "iu"))?.[1];

  if (action === "create" && path) {
    const content = fenced("CONTENT");
    return typeof content === "string"
      ? { action, args: { path, content }, reason: "provider proposed a source creation in natural text" }
      : null;
  }

  if (action === "edit" && path) {
    const search = fenced("SEARCH");
    const replace = fenced("REPLACE");
    return typeof search === "string" && typeof replace === "string"
      ? { action, args: { path, blocks: [{ search, replace }] }, reason: "provider proposed a source edit in natural text" }
      : null;
  }

  if (["read", "list_files"].includes(action)) {
    return { action, args: path ? { path } : {}, reason: "provider proposed an observation in natural text" };
  }

  if (action === "search" && query) {
    return { action, args: { query, ...(path ? { path } : {}) }, reason: "provider proposed a search in natural text" };
  }

  if (action === "finish") {
    const begin = "---BEGIN WORK PRODUCT---";
    const end = "---END WORK PRODUCT---";
    const from = source.lastIndexOf(begin);
    const to = source.lastIndexOf(end);
    const summary = from >= 0 && to > from ? source.slice(from + begin.length, to).trim() : "";
    return { action, args: summary ? { summary } : {}, reason: "provider proposed a control transition in natural text" };
  }

  if (action === "test") {
    return { action, args: {}, reason: "provider proposed a control transition in natural text" };
  }

  return null;
}
