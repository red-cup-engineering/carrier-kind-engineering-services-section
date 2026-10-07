function indexValue(value, key) {
    if (value && typeof value === "object") return value[key];
    for (const pair of String(value ?? "").split(/[;&]/)){
        const eq = pair.indexOf("=");
        if (eq !== -1 && pair.slice(0, eq).trim() === key) return decodeURIComponent(pair.slice(eq + 1).trim());
    }
    return undefined;
}
export function substituteVars(text, vars = {}) {
    let out = String(text ?? "");
    if (!out.includes("$")) return out;
    const sentinel = "\0ESI_DOLLAR\0";
    out = out.replace(/\$\$/g, sentinel);
    out = out.replace(/\$\(([A-Za-z0-9_]+)(?:\{([^}]*)\})?(?:\|([^)]*))?\)/g, (_all, name, key, fallback)=>{
        let value = vars[name];
        if (key !== undefined) value = indexValue(value, key);
        return value == null || value === "" ? fallback ?? "" : String(value);
    });
    return out.split(sentinel).join("$");
}
export class EsiIncludeError extends Error {
    src;
    alt;
    constructor(src, alt){
        super(`ESI include failed: src=${src ?? "-"} alt=${alt ?? "-"}`);
        this.name = "EsiIncludeError";
        this.src = src;
        this.alt = alt;
    }
}
function parseAttrs(text) {
    const attrs = {};
    const re = /([A-Za-z_:][-A-Za-z0-9_:.]*)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
    let match;
    while((match = re.exec(text)) !== null){
        attrs[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? true;
    }
    return attrs;
}
export function hasEsi(html) {
    return typeof html === "string" && /<esi:/i.test(html);
}
function coerceFragment(value) {
    if (value == null) return null;
    if (typeof value === "string") return value;
    if (Buffer.isBuffer(value)) return value.toString("utf8");
    if (typeof value === "object") {
        const fragment = value;
        if (fragment.status !== undefined && fragment.status >= 400) return null;
        if (fragment.type && !/^text\/|\+xml|\/xml|\/json|javascript/i.test(fragment.type)) return null;
        if (fragment.body == null) return "";
        if (typeof fragment.body === "string") return fragment.body;
        if (Buffer.isBuffer(fragment.body)) return fragment.body.toString("utf8");
    }
    return null;
}
export async function processEsi(html, ctx = {}, resolve, options = {}) {
    if (typeof resolve !== "function") throw new TypeError("processEsi requires a resolve(src, ctx) function");
    return composeEsi(String(html ?? ""), ctx, resolve, options.maxDepth ?? 8, options.vars ?? {});
}
async function composeEsi(html, ctx, resolve, depth, vars) {
    let out = html.replace(/<esi:remove>[\s\S]*?<\/esi:remove>/gi, "");
    out = out.replace(/<esi:comment\b[^>]*\/?>/gi, "");
    out = out.replace(/<esi:vars\b[^>]*>([\s\S]*?)<\/esi:vars>/gi, (_all, body)=>substituteVars(body, vars));
    out = out.replace(/<esi:vars\b([^>]*?)\/>/gi, (_all, attrsText)=>{
        const attrs = parseAttrs(attrsText);
        return attrs.name === undefined || attrs.name === true ? "" : substituteVars(attrs.name, vars);
    });
    const includeRe = /<esi:include\b([^>]*?)(?:\/>|>(?:[\s\S]*?<\/esi:include>)?)/gi;
    const matches = [];
    let match;
    while((match = includeRe.exec(out)) !== null)matches.push({
        index: match.index,
        length: match[0].length,
        attrs: match[1] ?? ""
    });
    if (!matches.length) return out;
    let result = "";
    let cursor = 0;
    for (const item of matches){
        result += out.slice(cursor, item.index);
        result += await resolveInclude(parseAttrs(item.attrs), ctx, resolve, depth, vars);
        cursor = item.index + item.length;
    }
    return result + out.slice(cursor);
}
async function resolveInclude(attrs, ctx, resolve, depth, vars) {
    const onerror = String(attrs.onerror ?? "").toLowerCase();
    const src = typeof attrs.src === "string" ? substituteVars(attrs.src, vars) : null;
    const alt = typeof attrs.alt === "string" ? substituteVars(attrs.alt, vars) : null;
    let fragment = src ? await tryResolve(src, ctx, resolve) : null;
    if (fragment == null && alt) fragment = await tryResolve(alt, ctx, resolve);
    if (fragment == null) {
        if (onerror === "continue") return "";
        throw new EsiIncludeError(src, alt);
    }
    if (depth > 1 && hasEsi(fragment)) return composeEsi(fragment, ctx, resolve, depth - 1, vars);
    return fragment;
}
async function tryResolve(src, ctx, resolve) {
    try {
        return coerceFragment(await resolve(src, ctx));
    } catch  {
        return null;
    }
}
