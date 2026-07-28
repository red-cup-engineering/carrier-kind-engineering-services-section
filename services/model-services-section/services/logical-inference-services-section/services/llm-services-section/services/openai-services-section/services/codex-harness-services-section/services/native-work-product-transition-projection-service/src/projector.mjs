// FOAM locus: model / llm / openai / codex / native-work-product-transition-projection.
export const ACTOR = "urn:ame:native-work-product-transition-projection-service";

const aliases = Object.freeze({
  read_file: "read", list_dir: "list_files", edit_file: "edit",
  create_file: "create", run_test: "test", apply_patch: "edit",
});
const supported = new Set(["list_files", "search", "read", "edit", "create", "command", "test", "finish"]);

function jsonRecord(text) {
  const candidates = [];
  for (const match of String(text).matchAll(/```(?:json)?\s*([\s\S]*?)```/giu)) candidates.push(match[1]);
  candidates.push(String(text).trim());
  for (const candidate of candidates) {
    try {
      const value = JSON.parse(candidate);
      if (value && typeof value === "object" && !Array.isArray(value)) return value;
    } catch { /* Native text is the primary carrier. */ }
  }
  return null;
}

function markdownTransition(text) {
  const source = String(text);
  const raw = source.match(/(?:^|\n)\s*TOOL\s*:\s*([a-z_]+)\s*(?:\n|$)/iu)?.[1]?.toLowerCase();
  if (!raw) return null;
  const action = aliases[raw] ?? raw;
  if (!supported.has(action)) return null;
  const path = source.match(/(?:^|\n)\s*PATH\s*:\s*([^\n]+)\s*(?:\n|$)/iu)?.[1]?.trim();
  const query = source.match(/(?:^|\n)\s*QUERY\s*:\s*([^\n]+)\s*(?:\n|$)/iu)?.[1]?.trim();
  const fenced = (label) => source.match(new RegExp("(?:^|\\n)\\s*" + label + "\\s*:\\s*\\n\\s*```(?:[^\\n]*)\\n([\\s\\S]*?)\\n```", "iu"))?.[1];
  if (action === "create" && path) {
    const content = fenced("CONTENT");
    return typeof content === "string" ? { action, args: { path, content }, reason: "provider proposed a source creation in native text" } : null;
  }
  if (action === "edit" && path) {
    const search = fenced("SEARCH"), replace = fenced("REPLACE");
    return typeof search === "string" && typeof replace === "string"
      ? { action, args: { path, blocks: [{ search, replace }] }, reason: "provider proposed a source edit in native text" }
      : null;
  }
  if (["read", "list_files"].includes(action)) return { action, args: path ? { path } : {}, reason: "provider proposed an observation in native text" };
  if (action === "search" && query) return { action, args: { query, ...(path ? { path } : {}) }, reason: "provider proposed a search in native text" };
  if (action === "finish") {
    const begin = "---BEGIN WORK PRODUCT---", end = "---END WORK PRODUCT---";
    const from = source.lastIndexOf(begin), to = source.lastIndexOf(end);
    const summary = from >= 0 && to > from ? source.slice(from + begin.length, to).trim() : "";
    return { action, args: summary ? { summary } : {}, reason: "provider proposed a control transition in native text" };
  }
  if (action === "test") return { action, args: {}, reason: "provider proposed a control transition in native text" };
  return null;
}

function jsonTransition(value) {
  if (!value) return null;
  if (typeof value.action === "string") {
    const action = aliases[value.action] ?? value.action;
    return supported.has(action) ? { action, args: value.args && typeof value.args === "object" ? value.args : Object.fromEntries(Object.entries(value).filter(([key]) => !["action", "reason"].includes(key))), reason: value.reason || "provider selected this next transition" } : null;
  }
  if (typeof value.command === "string") {
    const action = aliases[value.command] ?? value.command;
    return supported.has(action) ? { action, args: Object.fromEntries(Object.entries(value).filter(([key]) => !["command", "reason"].includes(key))), reason: value.reason || "provider selected this next transition" } : null;
  }
  for (const name of ["list_files", "list_dir", "search", "read", "read_file", "edit", "edit_file", "create", "create_file", "test", "run_test", "finish"]) {
    if (value[name] !== undefined) {
      const action = aliases[name] ?? name;
      return { action, args: value[name] && typeof value[name] === "object" ? value[name] : {}, reason: value.reason || "provider selected this next transition" };
    }
  }
  if (typeof value.path === "string") return { action: value.blocks !== undefined ? "edit" : value.content !== undefined ? "create" : "read", args: value, reason: value.blocks !== undefined ? "provider supplied a source edit" : value.content !== undefined ? "provider supplied a source creation" : "provider selected a source path to inspect" };
  return null;
}

export function projectNativeWorkProduct(input) {
  if (!input || typeof input !== "object" || Array.isArray(input) || typeof input.text !== "string") throw new TypeError("projection requires native work-product text");
  const transition = jsonTransition(jsonRecord(input.text)) ?? markdownTransition(input.text);
  return Object.freeze(transition
    ? { type: "NativeWorkProductTransitionProjectionResult", projected: true, transition }
    : { type: "NativeWorkProductTransitionProjectionRefusal", projected: false, reason: "no-supported-transition-in-native-work-product" });
}
