function mediaTypeParts(value) {
    const [mediaType = "*/*"] = value.split(";", 1);
    const [type = "*", subtype = "*"] = mediaType.trim().toLowerCase().split("/");
    return [
        type,
        subtype
    ];
}
export function parseAccept(header) {
    return header.split(",").map((s)=>s.trim()).filter(Boolean).map((s, order)=>{
        const [mediaRange, ...params] = s.split(";").map((p)=>p.trim());
        const qParam = params.find((p)=>p.startsWith("q="));
        const q = qParam ? parseFloat(qParam.slice(2)) : 1;
        const [type, subtype] = mediaTypeParts(mediaRange ?? "*/*");
        const specificity = type === "*" ? 0 : subtype === "*" ? 1 : 2;
        return {
            type,
            subtype,
            q: isNaN(q) ? 1 : q,
            specificity,
            order
        };
    }).sort((a, b)=>b.q - a.q || b.specificity - a.specificity || a.order - b.order);
}
function acceptsType(entry, candidate) {
    const [t, s] = mediaTypeParts(candidate);
    if (entry.type === "*") return true;
    if (entry.type !== t) return false;
    return entry.subtype === "*" || entry.subtype === s;
}
function mediaPreference(entries, offered) {
    const matches = entries.filter((entry)=>acceptsType(entry, offered)).sort((a, b)=>b.specificity - a.specificity || b.q - a.q || a.order - b.order);
    return matches[0] ?? null;
}
export function negotiateType(acceptHeader, offered) {
    if (!offered.length) return null;
    if (!acceptHeader) return offered[0] ?? null;
    const accepted = parseAccept(acceptHeader);
    const candidates = [];
    for (const [order, type] of offered.entries()){
        const preference = mediaPreference(accepted, type);
        if (!preference || preference.q <= 0) continue;
        candidates.push({
            type,
            q: preference.q,
            specificity: preference.specificity,
            order
        });
    }
    candidates.sort((a, b)=>b.q - a.q || b.specificity - a.specificity || a.order - b.order);
    return candidates[0]?.type ?? null;
}
