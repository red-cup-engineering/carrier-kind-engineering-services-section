import { leanDeclarationContract, leanModuleContract, } from "../schema.mjs";
export { leanDeclarationContract, leanDeclarationSchema, leanModuleContract, leanModuleSchema, } from "../schema.mjs";
export function decodeLeanModule(text, module, path) {
    const lines = text.split(/\r?\n/u);
    const codeLines = stripBlockComments(lines);
    const imports = new Set();
    const declarations = [];
    const namespaceStack = [];
    const admittedLines = admittedLineNumbers(codeLines);
    codeLines.forEach((raw, index) => {
        const line = stripLineComment(raw).trim();
        const imported = /^import\s+(.+)$/u.exec(line)?.[1];
        if (imported !== undefined) {
            for (const item of imported.split(/\s+/u).filter(Boolean))
                imports.add(item);
            return;
        }
        const namespace = /^namespace\s+([A-Za-z_][A-Za-z0-9_'.]*)/u.exec(line)?.[1];
        if (namespace !== undefined) {
            namespaceStack.push(namespace);
            return;
        }
        if (/^end(?:\s+[A-Za-z_][A-Za-z0-9_'.]*)?\s*$/u.test(line)) {
            namespaceStack.pop();
            return;
        }
        const match = /^(?:@[^\s]+\s+)*(?:noncomputable\s+)?(?:private\s+|protected\s+)?(theorem|lemma|def|inductive|structure|class|axiom|opaque|abbrev|instance)\s+([A-Za-z_][A-Za-z0-9_'.]*)/u.exec(line);
        if (match?.[1] === undefined || match[2] === undefined)
            return;
        const kind = match[1];
        const lineNumber = index + 1;
        const proofStatus = kind === "axiom"
            ? "assumed"
            : admittedLines.has(lineNumber) || declarationBodyAdmitted(codeLines, index)
                ? "admitted"
                : "proved";
        declarations.push(leanDeclarationContract.assert({
            kind,
            name: qualifyLeanName(match[2], namespaceStack),
            ...(namespaceStack.length === 0 ? {} : { namespace: namespaceStack.join(".") }),
            line: lineNumber,
            proofStatus,
        }, "Lean declaration"));
    });
    return leanModuleContract.assert({
        kind: "metroplat.lean.module",
        id: module,
        ...(path === undefined ? {} : { path }),
        imports: Object.freeze([...imports].sort((left, right) => left.localeCompare(right))),
        declarations: Object.freeze(declarations),
        mediaType: "text/vnd.lean4",
    }, "Lean module");
}
function stripLineComment(line) {
    const offset = line.indexOf("--");
    return offset === -1 ? line : line.slice(0, offset);
}
function stripBlockComments(lines) {
    let depth = 0;
    return Object.freeze(lines.map((line) => {
        let out = "";
        let index = 0;
        while (index < line.length) {
            const pair = line.slice(index, index + 2);
            if (depth > 0) {
                if (pair === "/-") {
                    depth += 1;
                    index += 2;
                }
                else if (pair === "-/") {
                    depth -= 1;
                    index += 2;
                }
                else {
                    out += " ";
                    index += 1;
                }
                continue;
            }
            if (pair === "/-") {
                depth += 1;
                out += "  ";
                index += 2;
                continue;
            }
            out += line[index] ?? "";
            index += 1;
        }
        return out;
    }));
}
function qualifyLeanName(name, namespaceStack) {
    if (name.includes(".") || namespaceStack.length === 0)
        return name;
    return `${namespaceStack.join(".")}.${name}`;
}
function admittedLineNumbers(lines) {
    const admitted = new Set();
    lines.forEach((line, index) => {
        if (/\b(sorry|admit)\b/u.test(stripLineComment(line)))
            admitted.add(index + 1);
    });
    return admitted;
}
function declarationBodyAdmitted(lines, startIndex) {
    for (let index = startIndex + 1; index < lines.length; index += 1) {
        const line = stripLineComment(lines[index] ?? "").trim();
        if (/^(?:@[^\s]+\s+)*(?:noncomputable\s+)?(?:private\s+|protected\s+)?(theorem|lemma|def|inductive|structure|class|axiom|opaque|abbrev|instance)\s+/u.test(line))
            return false;
        if (/^end(?:\s+[A-Za-z_][A-Za-z0-9_'.]*)?\s*$/u.test(line))
            return false;
        if (/\b(sorry|admit)\b/u.test(line))
            return true;
    }
    return false;
}
