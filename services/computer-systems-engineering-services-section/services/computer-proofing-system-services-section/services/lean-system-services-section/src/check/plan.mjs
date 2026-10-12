import path from "node:path";

export const defaultLeanCheckTimeoutMs = 300_000;
export const maximumLeanCheckTimeoutMs = 1_800_000;
const qualifiedName = /^[A-Za-z_][A-Za-z0-9_']*(?:\.[A-Za-z_][A-Za-z0-9_']*)*$/u;

function nonempty(value, name) {
    if (typeof value !== "string" || value.trim() === "") throw new TypeError(`lean-check: ${name} is required`);
    return value.trim();
}
function name(value, field) {
    const normalized = nonempty(value, field);
    if (!qualifiedName.test(normalized)) throw new TypeError(`lean-check: ${field} must be a qualified Lean name`);
    return normalized;
}

/** Typed compiler actions, never arbitrary command or shell arguments. */
export function planLeanCheck(input) {
    const project = path.resolve(nonempty(input?.project, "project"));
    const mode = input?.mode ?? "build";
    if (!["build", "file", "declaration"].includes(mode)) throw new TypeError("lean-check: mode must be build, file, or declaration");
    const allowed = new Set(["project", "id", "mode", "timeoutMs", ...(mode === "build" ? ["targets"] : mode === "file" ? ["file"] : ["module", "declaration"])]);
    for (const key of Object.keys(input)) if (!allowed.has(key)) throw new TypeError(`lean-check: ${key} is not a ${mode} input`);
    const timeoutMs = input?.timeoutMs ?? defaultLeanCheckTimeoutMs;
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > maximumLeanCheckTimeoutMs)
        throw new TypeError(`lean-check: timeoutMs must be an integer from 1 through ${maximumLeanCheckTimeoutMs}`);
    const id = nonempty(input?.id, "id");
    if (!/^[A-Za-z0-9][A-Za-z0-9-]{0,79}$/u.test(id)) throw new TypeError("lean-check: id must be an alphanumeric/hyphen identifier of at most 80 characters");
    let action;
    if (mode === "build") {
        const targets = input?.targets ?? [];
        if (!Array.isArray(targets)) throw new TypeError("lean-check: targets must be an array");
        const normalized = targets.map(target => nonempty(target, "target"));
        if (normalized.some(target => target.startsWith("-"))) throw new TypeError("lean-check: targets must be Lake names, not options");
        action = { targets: Object.freeze(normalized), args: Object.freeze(["build", ...normalized]) };
    } else if (mode === "file") {
        const file = nonempty(input?.file, "file");
        const resolved = path.resolve(project, file);
        const relative = path.relative(project, resolved);
        if (file.startsWith("-") || !relative || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative) || !file.endsWith(".lean"))
            throw new TypeError("lean-check: file must be a Lean source inside the project");
        action = { file: relative, args: Object.freeze(["env", "lean", relative]) };
    } else {
        const module = name(input?.module, "module");
        const declaration = name(input?.declaration, "declaration");
        const program = `import Lean\nimport ${module}\nopen Lean Elab Command\n#eval show CommandElabM Unit from do\n  let n := \`${declaration}\n  let env ← getEnv\n  let some ci := env.find? n | throwError "declaration not found"\n  let axs ← liftCoreM (collectAxioms n)\n  IO.println s!"#lean-declaration\t{n}"\n  IO.println s!"#lean-axioms\t{String.intercalate "," (axs.map toString).toList}"\n  IO.println s!"#lean-dependencies\t{String.intercalate "," (ci.getUsedConstantsAsSet.toList.map toString)}"\n`;
        action = { module, declaration, program };
    }
    return Object.freeze({ kind: "metroplat.lean.check-plan", id, project, mode,
        ...action, command: "lake", timeoutMs, unit: `lean-check-${id}.scope` });
}

/** Read only the requested declaration's compiler-produced rows. */
export function readLeanDeclarationInspection(stdout, declaration) {
    const read = tag => {
        const rows = stdout.split("\n").filter(line => line.startsWith(`${tag}\t`));
        if (rows.length !== 1) throw new TypeError(`lean-check: missing or repeated ${tag} row`);
        return rows[0].slice(tag.length + 1).trim();
    };
    if (read("#lean-declaration") !== declaration) throw new TypeError("lean-check: declaration result does not match request");
    const names = tag => Object.freeze(read(tag).split(",").filter(Boolean).sort());
    return Object.freeze({ declaration, axioms: names("#lean-axioms"), dependencies: names("#lean-dependencies") });
}
