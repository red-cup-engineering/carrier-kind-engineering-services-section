import { blueprintTexPlateContract, } from "../tex/schema.mjs";
import { decodeTexPlate } from "@red-cup-engineering/tex-engineering-services-section";
import { escapeRegExp, matchAll, stripTexComment, uniqueSorted } from "@red-cup-engineering/tex-engineering-services-section/syntax";
const CLAIM_ENVIRONMENTS = new Set(["definition", "proposition", "lemma", "theorem", "corollary", "conjecture", "example", "remark"]);
/** Admit Blueprint TeX as claim-occurrence incidence over an admitted TeX plate. */
export function decodeBlueprintTexPlate(text, source = "blueprint.tex") {
    const tex = decodeTexPlate(text, { source, format: "blueprint-tex" });
    const claimOccurrences = blueprintClaimOccurrences(text);
    return blueprintTexPlateContract.assert({
        kind: "metroplat.tex.blueprint-plate",
        source,
        tex,
        claimOccurrences,
        mediaType: "application/vnd.metroplat.tex.blueprint-plate+json",
    }, "Blueprint TeX plate");
}
function blueprintClaimOccurrences(text) {
    const lines = text.split(/\r?\n/u);
    const occurrences = [];
    let current;
    const flush = () => {
        if (current === undefined)
            return;
        const body = current.body.join("\n");
        const label = matchAll(body, /\\label\{([^{}]+)\}/gu)[0];
        if (label !== undefined && label !== "") {
            const leanDeclarations = uniqueSorted(splitCommaList(matchAll(body, /\\lean\{([^{}]+)\}/gu)));
            const dependencies = uniqueSorted(splitCommaList(matchAll(body, /\\uses\{([^{}]+)\}/gu)));
            const frontier = /\\notready\b/u.test(body);
            const settled = /\\leanok\b/u.test(body) && !frontier;
            occurrences.push(Object.freeze({
                kind: "metroplat.tex.blueprint.claim-occurrence",
                label,
                statementKind: current.statementKind,
                ...(current.title === undefined ? {} : { title: current.title }),
                leanDeclarations,
                status: settled ? "settled" : frontier ? "frontier" : "unstated",
                dependencies,
                line: current.line,
            }));
        }
        current = undefined;
    };
    for (let offset = 0; offset < lines.length; offset += 1) {
        const line = stripTexComment(lines[offset] ?? "");
        const begin = line.match(/\\begin\{([^{}]+)\}(?:\[([^\]]+)\])?/u);
        if (begin !== null && CLAIM_ENVIRONMENTS.has(begin[1] ?? "")) {
            flush();
            current = {
                statementKind: begin[1] ?? "",
                ...(begin[2] === undefined ? {} : { title: begin[2] }),
                line: offset + 1,
                body: [line],
            };
            continue;
        }
        if (current !== undefined) {
            current.body.push(line);
            if (new RegExp(String.raw `\\end\{${escapeRegExp(current.statementKind)}\}`, "u").test(line))
                flush();
        }
    }
    flush();
    return Object.freeze(occurrences.sort((left, right) => left.line - right.line || left.label.localeCompare(right.label)));
}
/** Split a Blueprint TeX comma-list argument (e.g. `\uses{a, b, c}`) into its individual entries. */
function splitCommaList(values) {
    return values.flatMap((value) => value.split(",").map((entry) => entry.trim()).filter((entry) => entry !== ""));
}
