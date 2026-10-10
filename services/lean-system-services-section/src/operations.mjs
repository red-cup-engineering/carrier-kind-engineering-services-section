import { randomUUID } from "node:crypto";
import { openJournal } from "@red-cup-engineering/computer-system-engine/journal/journal";
import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { toEavt } from "@red-cup-engineering/eavt-services-section/row";
import { planLeanCheck } from "./check/plan.mjs";
import { runLeanCheck } from "./check/run.mjs";
import { leanCheckRequestContract, leanCheckResultContract } from "./check/schema.mjs";

export const leanCheckFeed = "lean-checks";

function append(dataRoot, value, context) {
    const record = JSON.parse(JSON.stringify(value));
    const at = record.ended ?? record.requestedAt;
    openJournal(dataRoot).appendRows(leanCheckFeed, [toEavt({ e: `lean-check:${record.id}`, a: Object.freeze({ kind: record.kind, state: record.state }), v: record, t: at })], { at: at.slice(0, 10), subject: leanCheckFeed, caller: Object.freeze({ transport: "lean-check", subject: context?.invocation?.subject ?? null }) });
    return record;
}

export function leanCheckOperations({ dataRoot }) {
    return Object.freeze([operation({
        verb: "lean-check", inputFormat: "json", outputFormat: "json",
        domain: leanCheckRequestContract, codomain: leanCheckResultContract, locus: "project",
        writes: [leanCheckFeed],
        effects: { class: "external", replay: "coordinated", coordination: "coordination-required", deterministic: "unmeasured", totality: "partial" },
        summary: "Run a bounded Lake build, Lean file check, or declaration inspection in lean.slice with durable compiler evidence.",
        description: "Domain: { project, mode?: build|file|declaration, timeoutMs?: integer }. Build accepts targets?: string[]; file requires file: project-relative .lean path; declaration requires module and declaration: qualified Lean names. No arbitrary command or args. Results include stdout, stderr, exitCode, diagnostics, and for declaration mode actual axioms and direct dependencies after rebuilding the requested module. Only one check runs on the node; concurrency is refused with runningId.",
        run: async (input, _args, context) => {
            const plan = planLeanCheck({ ...(input ?? {}), id: randomUUID() });
            const requestedAt = new Date().toISOString();
            append(dataRoot, { kind: "metroplat.lean.check-request", id: plan.id, state: "requested", requestedAt, request: plan, requestedBy: context?.invocation?.subject ?? null }, context);
            try {
                const result = await runLeanCheck(plan);
                return append(dataRoot, result.ended === undefined ? { ...result, ended: new Date().toISOString() } : result, context);
            } catch (error) {
                const result = { kind: "metroplat.lean.check-result", id: plan.id, state: "failed", project: plan.project, targets: plan.targets, ended: new Date().toISOString(), errors: [{ message: error instanceof Error ? error.message : String(error) }] };
                append(dataRoot, result, context);
                return result;
            }
        },
    })]);
}
