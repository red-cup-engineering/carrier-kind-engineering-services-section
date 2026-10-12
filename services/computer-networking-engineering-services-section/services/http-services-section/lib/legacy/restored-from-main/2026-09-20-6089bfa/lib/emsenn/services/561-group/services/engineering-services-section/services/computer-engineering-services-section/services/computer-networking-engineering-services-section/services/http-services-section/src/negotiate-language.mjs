function languageSpecificity(range) {
    if (range === "*") return 0;
    return range.split("-").filter(Boolean).length;
}
export function parseAcceptLanguage(header) {
    return header.split(",").map((s)=>s.trim()).filter(Boolean).map((s, order)=>{
        const [range = "*", ...params] = s.split(";").map((p)=>p.trim());
        const qParam = params.find((p)=>p.startsWith("q="));
        const q = qParam ? parseFloat(qParam.slice(2)) : 1;
        const normalized = range.toLowerCase();
        return {
            range: normalized || "*",
            q: isNaN(q) ? 1 : q,
            specificity: languageSpecificity(normalized || "*"),
            order
        };
    }).sort((a, b)=>b.q - a.q || b.specificity - a.specificity || a.order - b.order);
}
function matchesLanguage(entry, offered) {
    if (entry.range === "*") return true;
    const tag = offered.toLowerCase();
    return tag === entry.range || tag.startsWith(`${entry.range}-`);
}
function languagePreference(entries, offered) {
    const matches = entries.filter((entry)=>matchesLanguage(entry, offered)).sort((a, b)=>b.specificity - a.specificity || a.order - b.order);
    return matches[0] ?? null;
}
export function negotiateLanguage(acceptLanguageHeader, offered) {
    if (!offered.length) return null;
    if (!acceptLanguageHeader) return offered[0] ?? null;
    const entries = parseAcceptLanguage(acceptLanguageHeader);
    const candidates = [];
    for (const [order, language] of offered.entries()){
        const preference = languagePreference(entries, language);
        if (!preference || preference.q <= 0) continue;
        candidates.push({
            language,
            q: preference.q,
            specificity: preference.specificity,
            order
        });
    }
    candidates.sort((a, b)=>b.q - a.q || b.specificity - a.specificity || a.order - b.order);
    return candidates[0]?.language ?? null;
}
