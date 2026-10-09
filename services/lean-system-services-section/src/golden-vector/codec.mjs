import { leanGoldenVectorContract, } from "./schema.mjs";
export { LeanGoldenVectorSchema, leanGoldenVectorContract, } from "./schema.mjs";
export function decodeLeanGoldenVectorLine(line, label = "Lean golden vector") {
    const parsed = JSON.parse(line.replace(/^\uFEFF/u, ""));
    return leanGoldenVectorContract.assert(parsed, label);
}
export function decodeLeanGoldenVectorJsonl(text, label = "Lean golden vector JSONL") {
    return Object.freeze(text
        .split(/\r?\n/u)
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.startsWith("#"))
        .map((line, index) => decodeLeanGoldenVectorLine(line, `${label}:${index + 1}`)));
}
export function encodeLeanGoldenVectorJsonl(rows) {
    return `${rows.map((row) => JSON.stringify(leanGoldenVectorContract.assert(row))).join("\n")}\n`;
}
export function leanGoldenVectorsByAction(rows) {
    const grouped = new Map();
    for (const row of rows) {
        const next = grouped.get(row.a) ?? [];
        next.push(row);
        grouped.set(row.a, next);
    }
    return new Map([...grouped.entries()].sort((left, right) => left[0].localeCompare(right[0]))
        .map(([action, operationRows]) => [action, Object.freeze(operationRows)]));
}
