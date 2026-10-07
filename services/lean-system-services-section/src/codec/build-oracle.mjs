import { leanBuildOracleContract } from "../schema.mjs";

function diagnosticLines(text, level) {
    return Object.freeze(text.split(/\r?\n/u)
        .map((line) => line.trim())
        .filter((line) => line.toLowerCase().includes(`${level}:`)));
}

// Lean writes `file:line:col: error: message`; Lake 5 writes `error: file:line:col: message`.
const SEVERITY_LAST = /^(.*?):(\d+)(?::(\d+))?:\s*(error|warning):\s*(.*)$/u;
const SEVERITY_FIRST = /^(error|warning):\s*(.*?):(\d+)(?::(\d+))?:\s*(.*)$/u;

function sourceDiagnostic(line, level) {
    const last = SEVERITY_LAST.exec(line.trim());
    const first = last === null ? SEVERITY_FIRST.exec(line.trim()) : null;
    const [severity, file, row, column, message] = last !== null ? [last[4], last[1], last[2], last[3], last[5]] : first !== null ? [first[1], first[2], first[3], first[4], first[5]] : [];
    if (severity !== level)
        return undefined;
    return Object.freeze({
        file, line: Number(row),
        ...(column === undefined ? {} : { column: Number(column) }),
        message,
    });
}

/** Purely parse Lake's combined output into completed jobs and source-addressed diagnostics. */
export function parseLeanBuildOutput(stdout = "", stderr = "") {
    const builtJobs = [];
    const errors = [];
    const warnings = [];
    for (const line of `${stdout}\n${stderr}`.split(/\r?\n/u)) {
        const built = /^\s*(?:[✔✖]\s*)?\[\d+\/\d+\]\s+Built\s+(.+?)\s*$/u.exec(line)?.[1];
        if (built !== undefined) builtJobs.push(built.replace(/\s+\([^)]*\)$/u, ""));
        const error = sourceDiagnostic(line, "error");
        if (error !== undefined) errors.push(error);
        const warning = sourceDiagnostic(line, "warning");
        if (warning !== undefined && /\b(?:sorry|axiom|axioms)\b/iu.test(warning.message)) {
            warnings.push(Object.freeze({ ...warning, category: /\bsorry\b/iu.test(warning.message) ? "sorry" : "axiom" }));
        }
    }
    return Object.freeze({
        builtJobs: Object.freeze([...new Set(builtJobs)]),
        errors: Object.freeze(errors), warnings: Object.freeze(warnings),
    });
}

/** Read one `lake build` run (command, args, exit code, output) as a build oracle: its error and warning lines, and whether it succeeded. */
export function decodeLeanBuildOracle(input) {
    const stdout = input.stdout ?? "";
    const stderr = input.stderr ?? "";
    const combined = `${stdout}\n${stderr}`;
    const errors = diagnosticLines(combined, "error");
    const warnings = diagnosticLines(combined, "warning");
    return leanBuildOracleContract.assert({
        kind: "metroplat.lean.build-oracle",
        command: input.command,
        args: Object.freeze([...input.args]),
        exitCode: input.exitCode,
        stdout,
        stderr,
        succeeded: input.exitCode === 0 && errors.length === 0,
        errors,
        warnings,
        mediaType: "application/vnd.lean.build-oracle+json",
    }, "Lean build oracle");
}
