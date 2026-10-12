/**
 * judge — conformance of an implementation to a Lean specification, by golden vectors.
 *
 * An implementation conforms when, for every operation of the specification, it produces outputs
 * canonical-form-identical to the specification's on the reference set. A golden vector row is one
 * application read off the specification: `a` the operation's declaration, `v` its `{ args, result }`.
 * A realization binds each declaration the implementation realizes to its realizer; the judge applies
 * the row's arguments to it and compares the result by canonical form.
 *
 * Each operation's verdict is an Obsmetrologia Record, (agreements, disagreements), read in FOUR by its
 * positivity: potential when every row agrees, active when none does, stable when the realizer is split,
 * absurd when nothing was told (the operation is unrealized). The implementation conforms when the truth
 * meet of every operation's reading is the truth top.
 */
import { coincides } from "@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address";
import { isTruthTop, readingOfRecord, record, recordAdd, truthMeetAll } from "@red-cup-engineering/computer-data-engineering-services-section/four";
import { leanGoldenVectorsByAction } from "./codec.mjs";

const agreement = record(1, 0);
const disagreement = record(0, 1);

/** The application a row records: its arguments and the specification's result. */
function application(row) {
    const v = row.v;
    if (v === null || typeof v !== "object" || !Array.isArray(v.args) || !Object.hasOwn(v, "result"))
        throw new TypeError(`golden vector ${row.e}: v is not { args, result }`);
    return v;
}

/** Apply a realizer to one row: the realizer's result, or what it threw. */
function realize(realizer, args) {
    try {
        return Object.freeze({ result: realizer(...args) });
    }
    catch (error) {
        return Object.freeze({ thrown: error instanceof Error ? error.message : String(error) });
    }
}

/** One operation's verdict on its rows. */
function judgeOperation(action, rows, realizer) {
    if (typeof realizer !== "function")
        return Object.freeze({ action, rows: rows.length, tally: record(), reading: readingOfRecord(record()), disagreements: Object.freeze([]) });
    let tally = record();
    const disagreements = [];
    for (const row of rows) {
        const { args, result } = application(row);
        const actual = realize(realizer, args);
        const agrees = !Object.hasOwn(actual, "thrown") && coincides(actual.result, result);
        tally = recordAdd(tally, agrees ? agreement : disagreement);
        if (!agrees)
            disagreements.push(Object.freeze({ e: row.e, expected: result, ...actual }));
    }
    return Object.freeze({ action, rows: rows.length, tally, reading: readingOfRecord(tally), disagreements: Object.freeze(disagreements) });
}

/** Judge a realization against golden vector rows. */
export function judgeGoldenVectors(rows, realization) {
    const byAction = leanGoldenVectorsByAction(rows);
    const operations = Object.freeze([...byAction].map(([action, actionRows]) => judgeOperation(action, actionRows, realization[action])));
    const reading = truthMeetAll(operations.map((operation) => operation.reading), "knowledge");
    return Object.freeze({
        kind: "lean-system.conformance:judgment",
        specification: Object.freeze([...new Set(rows.map((row) => row.t))].sort()),
        operations,
        unrealized: Object.freeze(operations.filter((operation) => operation.tally.pos + operation.tally.neg === 0).map((operation) => operation.action)),
        unjudged: Object.freeze(Object.keys(realization).filter((action) => !byAction.has(action)).sort()),
        reading,
        conforms: isTruthTop(reading),
    });
}
