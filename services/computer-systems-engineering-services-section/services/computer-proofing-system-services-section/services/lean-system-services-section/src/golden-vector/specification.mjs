/**
 * specification — the address of the Lean revision a golden vector set is read off.
 *
 * A set's `t` is the content address of `{ toolchain, modules }`: the Lean toolchain and the SHA-256 of
 * every module in the import closure of the emitter, keyed by module name so the address is the same in
 * any checkout or release. Modules the toolchain supplies (`Init`, `Std`, `Lean`, …) are named by the
 * toolchain. When the address of the current sources differs from a set's `t`, the set is stale: the
 * specification has moved since it was read.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { semanticAddress } from "@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address";
import { decodeLeanModule } from "../codec/module.mjs";

/** The source file of `module` under the first package root that holds it, if any. */
function moduleFile(roots, module) {
    const relative = `${module.split(".").join(path.sep)}.lean`;
    for (const root of roots) {
        const file = path.join(root, relative);
        if (existsSync(file))
            return file;
    }
    return undefined;
}

/** The modules in the import closure of `entry` (a source file, itself keyed `entryName`) found under `roots`. */
export function leanImportClosure({ roots, entry, entryName }) {
    const modules = new Map();
    const visit = (name, file) => {
        if (modules.has(name))
            return;
        const text = readFileSync(file, "utf8");
        modules.set(name, text);
        for (const imported of decodeLeanModule(text, name, file).imports) {
            const importedFile = moduleFile(roots, imported);
            if (importedFile !== undefined)
                visit(imported, importedFile);
        }
    };
    visit(entryName, entry);
    return new Map([...modules].sort(([left], [right]) => left.localeCompare(right)));
}

/** The address of the specification revision under `roots`, read through `entry`, on `toolchain`. */
export function leanSpecificationAddress({ toolchain, roots, entry, entryName }) {
    const modules = Object.fromEntries([...leanImportClosure({ roots, entry, entryName })]
        .map(([name, text]) => [name, createHash("sha256").update(text).digest("hex")]));
    return semanticAddress({ toolchain: toolchain.trim(), modules }).id;
}
