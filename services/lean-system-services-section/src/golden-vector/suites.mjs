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
 * realizers. The suite's realization is their union. These registered realizers are declared package
 * dependencies: a missing owner or table is a broken binding, never an unimplemented theory.
 * A genuinely unregistered suite may remain pending. Every registered operation must conform.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const section = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const conformancePackage = path.join(section, "lib/obsmetrologia-conformance");

/** Resolve a registered realization through its declared owning package, independent of checkout layout. */
const realizationAt = (specifier) => async () => {
    const table = (await import(specifier)).obsmetrologiaRealization;
    if (table === null || typeof table !== "object" || Array.isArray(table))
        throw new TypeError(`${specifier}: registered obsmetrologiaRealization table is missing`);
    return table;
};

export const conformanceSuites = Object.freeze([
    Object.freeze({
        name: "obsmetrologia",
        package: conformancePackage,
        entry: "Main",
        vectors: "golden-vectors.jsonl",
        realizations: Object.freeze([
            realizationAt("@red-cup-engineering/computer-data-engineering-services-section/four"),
        ]),
    }),
    Object.freeze({
        name: "work-arena",
        package: conformancePackage,
        entry: "WorkArenaMain",
        vectors: "work-arena.golden-vectors.jsonl",
        realizations: Object.freeze([
            realizationAt("@red-cup-engineering/organizing/enterprise/work-arena-realization"),
        ]),
    }),
    Object.freeze({
        name: "sen-lambda",
        package: conformancePackage,
        entry: "SenLambdaMain",
        vectors: "sen-lambda.golden-vectors.jsonl",
        realizations: Object.freeze([
            realizationAt("@red-cup-engineering/computer-code-engineering-services-section/semiotic-expression-notation/realization"),
        ]),
    }),
    Object.freeze({
        name: "band",
        package: conformancePackage,
        entry: "BandMain",
        vectors: "band.golden-vectors.jsonl",
        realizations: Object.freeze([
            realizationAt("@red-cup-engineering/organizing/agency/band-realization"),
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
