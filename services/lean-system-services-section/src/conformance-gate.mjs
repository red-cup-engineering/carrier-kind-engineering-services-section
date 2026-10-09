/**
 * conformance-gate — whether a candidate commit keeps the house's code conforming to its theory,
 * judged against the commit it would follow. Three theories judge it:
 *
 * - the house dependency order (house-layers), as a ratchet: the candidate may remove layer
 *   findings, never add one (javascript-node's ratchet-layer-imports);
 * - one implementation of each formal object, as a ratchet: the candidate may remove hand copies
 *   of FOUR and its kin, never add one (javascript-node's audit-formal-object-copies);
 * - the Lean specifications, by golden vectors: every suite with a realization conforms in the
 *   candidate's own tree, every declaration the base's vectors judged is still judged, row for row,
 *   and no realization the base registered is dropped, so a candidate cannot pass by removing a
 *   realizer, its vectors or its table. A suite no realization has yet is pending, an obligation
 *   that refuses nothing.
 *
 * Findings may only fall. The candidate is admitted when no theory refuses it; every reason
 * for a refusal is named.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { changedPaths, gitTreeAtRef } from "@red-cup-engineering/javascript-node-services-section/git-tree-at-ref";
import { ratchetFormalObjectCopiesOfTrees } from "@red-cup-engineering/javascript-node-services-section/audit-formal-object-copies";
import { ratchetLayerImportsOfTrees } from "@red-cup-engineering/javascript-node-services-section/ratchet-layer-imports";

const JUDGE = "lean-system-services-section/scripts/judge-conformance.mjs";
const RESOLVER = "javascript-node-services-section/scripts/register-house-resolver.mjs";
const VECTORS = "/golden-vectors.jsonl";

/** The one path a tree holds with this suffix. */
function onePath(tree, suffix) {
    const paths = [...tree.blobs.keys()].filter((candidate) => candidate.endsWith(`/${suffix}`));
    if (paths.length !== 1)
        throw new Error(`${tree.ref}: expected one ${suffix}, found ${paths.length}`);
    return paths[0];
}

/** Every declaration a tree's golden vectors judge, with its row count. */
export function judgedDeclarations(tree) {
    const files = [...tree.blobs.keys()].filter((candidate) => candidate.endsWith(VECTORS));
    const rows = new Map();
    for (const [, text] of tree.read(files)) {
        for (const line of text.toString("utf8").split("\n")) {
            if (line.trim() === "")
                continue;
            const action = JSON.parse(line).a;
            rows.set(action, (rows.get(action) ?? 0) + 1);
        }
    }
    return rows;
}

/** Run the candidate's own judge over its own tree; its judgments, or why there are none. */
function judgeTree(directory, after) {
    const judge = path.join(directory, onePath(after, JUDGE));
    const resolver = path.join(directory, onePath(after, RESOLVER));
    if (!existsSync(judge) || !existsSync(resolver))
        return { failure: `judge-missing-in-tree:${directory}` };
    const run = spawnSync(process.execPath, ["--import", resolver, judge, "--json"], {
        cwd: directory,
        env: { ...process.env, HOUSE_ROOT: directory },
        encoding: "utf8",
        maxBuffer: 1 << 28,
    });
    try {
        return { judgments: JSON.parse(run.stdout) };
    }
    catch {
        return { failure: `judge-failed:${(run.stderr || run.error?.message || `exit ${run.status}`).trim().split("\n").slice(-1)[0]}` };
    }
}

/** The commit a checkout directory has checked out, or undefined when it is not a checkout. */
function checkedOut(directory) {
    const run = spawnSync("git", ["rev-parse", "--verify", "HEAD"], { cwd: directory, encoding: "utf8" });
    return run.status === 0 && existsSync(path.join(directory, ".git")) ? run.stdout.trim() : undefined;
}

/** A module registers a realization by exporting this table; dropping the export drops the realization. */
const REALIZATION_EXPORT = /\bexport\s+const\s+obsmetrologiaRealization\b/u;

/** The changed files that exported a realization at the base and no longer do in the candidate. */
export function droppedRealizations(before, after) {
    const changed = changedPaths(before, after).filter((candidate) => /\.[cm]?js$/u.test(candidate));
    const then = before.read(changed);
    const now = after.read(changed);
    return [...then]
        .filter(([file, text]) => REALIZATION_EXPORT.test(text.toString("utf8")) && !REALIZATION_EXPORT.test(now.get(file)?.toString("utf8") ?? ""))
        .map(([file]) => file)
        .sort();
}

/**
 * The judge's half of the verdict. A pending suite (no realization registered yet) is an open
 * obligation and refuses nothing. Every other suite must conform, and every declaration the base's
 * vectors judged must still agree row for row, unless its suite is pending.
 */
export function judgeVerdict(judgments, baseDeclarations) {
    const reasons = [];
    const agreed = new Map();
    const pending = new Set();
    for (const judgment of judgments) {
        if (judgment.pending) {
            for (const action of judgment.operations ?? [])
                pending.add(action);
            continue;
        }
        if (!judgment.conforms)
            reasons.push(`suite-does-not-conform:${judgment.suite}${judgment.missing ? ":no-vectors" : ""}`);
        for (const operation of judgment.operations ?? []) {
            if (operation.tally.neg === 0 && operation.tally.pos === operation.rows)
                agreed.set(operation.action, (agreed.get(operation.action) ?? 0) + operation.rows);
        }
    }
    const lost = [...baseDeclarations].filter(([action, rows]) => !pending.has(action) && (agreed.get(action) ?? 0) < rows).map(([action]) => action).sort();
    for (const action of lost)
        reasons.push(`declaration-no-longer-judged:${action}`);
    return Object.freeze({
        suites: Object.freeze(judgments.map((judgment) => Object.freeze({
            suite: judgment.suite,
            pending: judgment.pending === true,
            conforms: judgment.conforms,
            reading: judgment.reading,
            operations: judgment.operations?.length ?? 0,
            rows: judgment.pending ? judgment.rows : (judgment.operations ?? []).reduce((sum, operation) => sum + operation.rows, 0),
            stale: judgment.stale === true,
        }))),
        lost: Object.freeze(lost),
        reasons: Object.freeze(reasons),
    });
}

/**
 * Gate `candidate` against `base` in the repository at `root`. `tree` is a directory holding the
 * candidate's files with their dependencies resolvable (a checkout or a release of the candidate;
 * by default `root`); the candidate's judge runs there, on its own code.
 */
export function gateConformance({ root, base, candidate, tree = root }) {
    const before = gitTreeAtRef(root, base);
    const after = gitTreeAtRef(root, candidate);
    const layers = ratchetLayerImportsOfTrees(before, after);
    const copies = ratchetFormalObjectCopiesOfTrees(before, after);
    const head = checkedOut(tree);
    const misplaced = head !== undefined && head !== after.commit;
    const judged = misplaced ? { failure: `tree-not-at-candidate:${head}` } : judgeTree(tree, after);
    const verdict = judged.failure === undefined
        ? judgeVerdict(judged.judgments, judgedDeclarations(before))
        : Object.freeze({ suites: Object.freeze([]), lost: Object.freeze([]), reasons: Object.freeze([judged.failure]) });
    const dropped = droppedRealizations(before, after);
    const judge = Object.freeze({ ...verdict, dropped: Object.freeze(dropped), reasons: Object.freeze([...verdict.reasons, ...dropped.map((file) => `realization-dropped:${file}`)]) });
    const reasons = [...layers.reasons, ...copies.reasons, ...judge.reasons];
    return Object.freeze({
        kind: "conformance-gate:verdict",
        base: before.commit,
        candidate: after.commit,
        tree,
        layers,
        copies,
        judge,
        admitted: reasons.length === 0,
        reasons: Object.freeze(reasons),
    });
}
