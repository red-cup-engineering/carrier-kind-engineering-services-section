/**
 * suites — every Lean specification judged by golden vectors, and the implementations judged against it.
 *
 * A suite is one specification's emitter in a Lake package. Its `entry` module prints the golden vectors,
 * given the specification address, and they are kept in its `vectors` file beside it. Its address is read
 * off the import closure of its own entry, so revising one specification stales only its own vectors. The
 * specification's package roots are the package's own and every package Lake resolved for it, as its
 * `lake-manifest.json` records them (inherited requirements included), so a module the specification
 * reaches through a requirement's requirement is in the closure.
 *
 * Each realization is a table an implementation exports, binding the declarations it realizes to its
 * realizers. The suite's realization is their union. A realization named by a file that does not exist
 * yet is not registered. A suite with no registered realization is pending: an open obligation, never a
 * nonconformance. Once any realization is registered, every operation of the suite must conform.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const section = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const conformancePackage = path.join(section, "lib/obsmetrologia-conformance");
const organizing = path.resolve(section, "../../../agent-computer-system-engineering-services-section/apps/agent-organization-engine/lib/organizing");
const codeEngineering = path.resolve(section, "../../../../../computer-code-engineering-services-section");

/** A realization exported as `name` by the module at `file`, registered once the file exists. */
const realizationAt = (file, name) => async () => (existsSync(file) ? (await import(pathToFileURL(file).href))[name] : undefined);

export const conformanceSuites = Object.freeze([
    Object.freeze({
        name: "obsmetrologia",
        package: conformancePackage,
        entry: "Main",
        vectors: "golden-vectors.jsonl",
        realizations: Object.freeze([
            async () => (await import("@red-cup-engineering/computer-data-services-section/four")).obsmetrologiaRealization,
        ]),
    }),
    Object.freeze({
        name: "work-arena",
        package: conformancePackage,
        entry: "WorkArenaMain",
        vectors: "work-arena.golden-vectors.jsonl",
        realizations: Object.freeze([
            realizationAt(path.join(organizing, "src/enterprise/work-arena-realization.mjs"), "obsmetrologiaRealization"),
        ]),
    }),
    Object.freeze({
        name: "sen-lambda",
        package: conformancePackage,
        entry: "SenLambdaMain",
        vectors: "sen-lambda.golden-vectors.jsonl",
        realizations: Object.freeze([
            realizationAt(path.join(codeEngineering, "src/semiotic-expression-notation/realization.mjs"), "obsmetrologiaRealization"),
        ]),
    }),
    Object.freeze({
        name: "band",
        package: conformancePackage,
        entry: "BandMain",
        vectors: "band.golden-vectors.jsonl",
        realizations: Object.freeze([
            realizationAt(path.join(organizing, "src/agency/band-realization.mjs"), "obsmetrologiaRealization"),
        ]),
    }),
]);

/** Where a suite's emitter, vectors, toolchain and specification roots are. */
export function suiteLayout(suite) {
    const manifest = JSON.parse(readFileSync(path.join(suite.package, "lake-manifest.json"), "utf8"));
    const packageRoot = (resolved) => {
        if (resolved.type === "path") return path.resolve(suite.package, resolved.dir);
        if (resolved.type === "git") return path.resolve(suite.package, manifest.packagesDir, resolved.name);
        throw new TypeError(`${suite.name}: lake-manifest package ${resolved.name} has unknown type ${resolved.type}`);
    };
    return Object.freeze({
        main: path.join(suite.package, `${suite.entry}.lean`),
        entryName: suite.entry,
        vectors: path.join(suite.package, suite.vectors),
        toolchain: readFileSync(path.join(suite.package, "lean-toolchain"), "utf8"),
        roots: Object.freeze([suite.package, ...manifest.packages.map(packageRoot)]),
    });
}

/** A suite's realization: the union of its registered implementations' tables, or undefined while none is registered. */
export async function suiteRealization(suite) {
    const tables = (await Promise.all(suite.realizations.map((load) => load()))).filter((table) => table !== undefined);
    return tables.length === 0 ? undefined : Object.freeze(Object.assign({}, ...tables));
}
