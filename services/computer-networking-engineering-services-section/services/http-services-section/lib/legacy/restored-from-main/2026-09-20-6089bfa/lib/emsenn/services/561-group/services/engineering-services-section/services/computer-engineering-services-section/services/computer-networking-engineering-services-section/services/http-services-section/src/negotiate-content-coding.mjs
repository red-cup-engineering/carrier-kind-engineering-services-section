export function parseAcceptEncoding(header) {
    const prefs = new Map();
    for (const part of header.split(",")){
        const [coding = "", ...params] = part.trim().split(";");
        const token = coding.trim().toLowerCase();
        if (!/^[!#$%&'*+.^_`|~0-9a-z-]+$/.test(token)) continue;
        const weight = params.length === 1 ? /^[ \t]*q=(0(?:\.\d{0,3})?|1(?:\.0{0,3})?)[ \t]*$/i.exec(params[0]) : null;
        prefs.set(token, params.length === 0 ? 1 : weight ? Number(weight[1]) : 0);
    }
    return prefs;
}
export function negotiateEncoding(acceptEncodingHeader, offered) {
    if (acceptEncodingHeader === undefined) return offered.includes("identity") ? "identity" : offered[0] ?? null;
    const prefs = parseAcceptEncoding(acceptEncodingHeader);
    let best = null;
    let bestQ = 0;
    for (const coding of offered){
        const q = prefs.get(coding) ?? prefs.get("*") ?? (coding === "identity" ? Number.EPSILON : 0);
        if (q > bestQ) {
            best = coding;
            bestQ = q;
        }
    }
    return best;
}
