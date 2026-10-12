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
    // The evidence bilattice as evidence bits, the multiplicatives of FOUR, the pool split and ledger, and the allocation
    // solver. No realization is registered: each is pending until an implementation exports a table. The Foundry harness
    // of the EVM signing package judges the first two from `lib/obsmetrologia-conformance/vectors/` (see the 2026-10-08 note).
    Object.freeze({
        name: "four-bilattice",
        package: conformancePackage,
        entry: "FourBilatticeMain",
        vectors: "four-bilattice.golden-vectors.jsonl",
        realizations: Object.freeze([]),
    }),
    Object.freeze({
        name: "four-mix",
        package: conformancePackage,
        entry: "FourMixMain",
        vectors: "four-mix.golden-vectors.jsonl",
        realizations: Object.freeze([]),
    }),
    Object.freeze({
        name: "pool-split",
        package: conformancePackage,
        entry: "PoolSplitMain",
        vectors: "pool-split.golden-vectors.jsonl",
        realizations: Object.freeze([]),
    }),
    Object.freeze({
        name: "allocation-solver",
        package: conformancePackage,
        entry: "AllocationSolverMain",
        vectors: "allocation-solver.golden-vectors.jsonl",
        realizations: Object.freeze([]),
    }),
    // Consensus by withdrawal (Tidepool A4): the counters over the storage list and the quiescence outcome. The
    // Foundry harness of tidepool-evm judges `WithdrawalAllocatorV1.quiesce` from `vectors/withdrawal/`.
    Object.freeze({
        name: "withdrawal",
        package: conformancePackage,
        entry: "WithdrawalMain",
        vectors: "withdrawal.golden-vectors.jsonl",
        realizations: Object.freeze([]),
    }),
    // The Barrier Series (Tidepool A6): the day-bucketed barrier, counted contributions and draw safety over a horizon.
    // The Foundry harness of tidepool-evm judges `BarrierSeriesV1.{barrierAt, wouldCross, contributionOf}` from `vectors/barrier/`.
    Object.freeze({
        name: "barrier-series",
        package: conformancePackage,
        entry: "BarrierSeriesMain",
        vectors: "barrier-series.golden-vectors.jsonl",
        realizations: Object.freeze([]),
    }),
    // Pay-the-meet (Tidepool 2.8): the two-witness meet, the held mass and the n-ary meet against several challengers.
    // The Foundry harness of tidepool-evm judges `SiteWitnessV1.meetOf` and `TidepoolTreasuryV1.pullDistributable` from `vectors/meetpay/`.
    Object.freeze({
        name: "meetpay",
        package: conformancePackage,
        entry: "MeetPayMain",
        vectors: "meetpay.golden-vectors.jsonl",
        realizations: Object.freeze([]),
    }),
    // The member sleeve (Tidepool A1/A.3): routable yield, the loss-aware principal mark and redeemable principal.
    // The Foundry harness of tidepool-evm judges `MemberSleeveV1.{routableYield, redeemablePrincipal}` from `vectors/sleeve/`.
    Object.freeze({
        name: "sleeve",
        package: conformancePackage,
        entry: "SleeveMain",
        vectors: "sleeve.golden-vectors.jsonl",
        realizations: Object.freeze([]),
    }),
    // The tally credit derivation (Tidepool 2.5-2.6, A5): the median ring, the 2x clip, the derived line and the exposure limit.
    // The Foundry harness of tidepool-evm judges `TallyLedgerV1.{median, clip, deriveLine, limitOf}` from `vectors/tally/`.
    Object.freeze({
        name: "tally-credit",
        package: conformancePackage,
        entry: "TallyCreditMain",
        vectors: "tally-credit.golden-vectors.jsonl",
        realizations: Object.freeze([]),
    }),
    // The float desk (Tidepool A3/A.7): the ordered refusal function of `draw` and the two prices.
    // The Foundry harness of tidepool-evm judges `FloatDeskV1.{draw refusal order, priceOf}` from `vectors/desk/`.
    Object.freeze({
        name: "float-desk",
        package: conformancePackage,
        entry: "FloatDeskMain",
        vectors: "float-desk.golden-vectors.jsonl",
        realizations: Object.freeze([]),
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
