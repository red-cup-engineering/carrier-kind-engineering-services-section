import { versoTexPlateContract } from "../tex/schema.mjs";
import { decodeTexPlate } from "@red-cup-engineering/tex-engineering-services-section";
import { countMatches, matchAll, uniqueSorted } from "@red-cup-engineering/tex-engineering-services-section/syntax";
/** Admit Verso authoring text as exposition and theorem-reference welds. */
export function decodeVersoTexPlate(text, source = "verso-source") {
    const tex = decodeTexPlate(text, { source, format: "verso-tex" });
    return versoTexPlateContract.assert({
        kind: "metroplat.tex.verso-plate",
        source,
        tex,
        imports: uniqueSorted(matchAll(text, /^import\s+([A-Za-z0-9_.]+)/gmu)),
        includes: uniqueSorted(matchAll(text, /\{include\s+\d+\s+([A-Za-z0-9_.]+)\}/gu)),
        leanDeclarations: uniqueSorted([
            ...matchAll(text, /\{docstring\s+([A-Za-z0-9_.]+)\}/gu),
            ...matchAll(text, /`(Obsmetrologia[A-Za-z0-9_.]*)`/gu),
        ]),
        claimOccurrences: uniqueSorted(matchAll(text, /claim-occurrence:\s*([^;\n]+)/giu).map((value) => value.trim())),
        blueprintNodes: uniqueSorted(matchAll(text, /`((?:def|lem|thm|prop|cor):[A-Za-z0-9:_-]+)`/gu)),
        checkedLeanBlocks: countMatches(text, /^```lean\s*$/gmu),
        mediaType: "application/vnd.metroplat.tex.verso-plate+json",
    }, "Verso TeX plate");
}
