import { blueprintClaimGraphContract, } from "./schema.mjs";
export { blueprintClaimGraphContract, blueprintClaimGraphSchema, } from "./schema.mjs";
/**
 * Walk a plate's TeX commands in line order and compute, per line, the
 * enclosing part/chapter/chapterLabel/section/subsection context — mirroring
 * the stateful document walk a LaTeX engine performs. Section/subsection
 * reset whenever a new \chapter is seen; a \label immediately after a
 * \chapter (before any other content) is captured as the chapterLabel, same
 * as obsmetrologia's blueprint-coverage.mjs `parseFile`.
 */
function contextsByLine(commands) {
    const ordered = [...commands].sort((left, right) => left.line - right.line);
    const marks = [];
    let part;
    let chapter;
    let chapterLabel;
    let section;
    let subsection;
    let awaitingChapterLabel = false;
    for (const command of ordered) {
        if (command.name === "part") {
            part = command.argument ?? "";
            awaitingChapterLabel = false;
        }
        else if (command.name === "chapter") {
            chapter = command.argument ?? "";
            chapterLabel = undefined;
            section = undefined;
            subsection = undefined;
            awaitingChapterLabel = true;
        }
        else if (command.name === "label" && awaitingChapterLabel && chapterLabel === undefined) {
            chapterLabel = command.argument ?? "";
            awaitingChapterLabel = false;
        }
        else if (command.name === "section") {
            section = command.argument ?? "";
            subsection = undefined;
            awaitingChapterLabel = false;
        }
        else if (command.name === "subsection") {
            subsection = command.argument ?? "";
            awaitingChapterLabel = false;
        }
        else {
            awaitingChapterLabel = false;
        }
        marks.push([command.line, Object.freeze({
                ...(part === undefined ? {} : { part }),
                ...(chapter === undefined ? {} : { chapter }),
                ...(chapterLabel === undefined ? {} : { chapterLabel }),
                ...(section === undefined ? {} : { section }),
                ...(subsection === undefined ? {} : { subsection }),
            })]);
    }
    return Object.freeze(marks);
}
/** The chapter context in effect at or before the given line. */
function contextAtLine(marks, line) {
    let context = {};
    for (const [markLine, markContext] of marks) {
        if (markLine > line)
            break;
        context = markContext;
    }
    return context;
}
export function blueprintClaimGraph(input) {
    const plates = Array.isArray(input) ? input : [input];
    const nodes = plates.flatMap((plate) => {
        const marks = contextsByLine(plate.tex.commands);
        return plate.claimOccurrences.map((occurrence) => {
            const context = contextAtLine(marks, occurrence.line);
            return Object.freeze({
                id: occurrence.label,
                source: plate.source,
                statementKind: occurrence.statementKind,
                ...(occurrence.title === undefined ? {} : { title: occurrence.title }),
                leanDeclarations: occurrence.leanDeclarations,
                status: occurrence.status,
                line: occurrence.line,
                ...(context.part === undefined ? {} : { part: context.part }),
                ...(context.chapter === undefined ? {} : { chapter: context.chapter }),
                ...(context.chapterLabel === undefined ? {} : { chapterLabel: context.chapterLabel }),
                ...(context.section === undefined ? {} : { section: context.section }),
                ...(context.subsection === undefined ? {} : { subsection: context.subsection }),
            });
        });
    });
    const nodeIds = new Set(nodes.map((node) => node.id));
    const edges = plates.flatMap((plate) => plate.claimOccurrences.flatMap((occurrence) => occurrence.dependencies.map((dependency) => Object.freeze({
        from: occurrence.label,
        to: dependency,
        relationship: "uses",
        source: plate.source,
        line: occurrence.line,
    }))));
    const missingDependencies = [...new Set(edges.filter((edge) => !nodeIds.has(edge.to)).map((edge) => edge.to))].sort();
    return blueprintClaimGraphContract.assert({
        kind: "metroplat.blueprint.claim-graph",
        sources: [...new Set(plates.map((plate) => plate.source))].sort(),
        nodes: Object.freeze(nodes.sort((left, right) => left.id.localeCompare(right.id) || left.source.localeCompare(right.source))),
        edges: Object.freeze(edges.sort((left, right) => left.from.localeCompare(right.from) || left.to.localeCompare(right.to))),
        settled: nodes.filter((node) => node.status === "settled").length,
        frontier: nodes.filter((node) => node.status === "frontier").length,
        unstated: nodes.filter((node) => node.status === "unstated").length,
        missingDependencies,
        mediaType: "application/vnd.metroplat.blueprint.claim-graph+json",
    }, "Blueprint claim graph");
}
