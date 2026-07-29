#!/usr/bin/env node
// The arithmomantia producer: the date's numerological reduction as a
// claim-state bundle.
//
// The reduction is the orbit of the digit-sum map until it lands in the
// terminal set {1..9} ∪ {11, 22, 33}; the whole orbit is published — the
// steps are part of the reading, not just the answer — plus the terminal
// value ("reduces-to") and the kind of terminal reached ("kind": simple or
// master). All claims carry force "computes", witnessed by the numerology.

import process from "node:process";
import { fileURLToPath } from "node:url";
import { reduceDate } from "@emsenn/divining/divination";
import type { ClaimStateBundle } from "@emsenn/content/topology/news";

import {
  assertedNow,
  computesClaim,
  reportWrite,
  resolveDate,
  writeBundleIfAbsent,
} from "@emsenn/producing-content/organizing-a-newswire";

const WIRE = "arithmomantia";
const WITNESS = "divination-topology numerology";

/** This wire's store: its own backstage/store/, absolute. */
const STORE = fileURLToPath(new URL("../../store/arithmomantia/", import.meta.url));
const METHOD = "iterated digit sum; terminal set {1..9} ∪ {11, 22, 33}";

const date = resolveDate(process.argv.slice(2).find((argument) => argument !== "--"));
const asserted = assertedNow();
const reduction = reduceDate(date);

function reductionClaim(id: string, predicate: string, object: unknown) {
  return computesClaim({ id, predicate, object, asserted, valid: date, witness: WITNESS, method: METHOD });
}

const bundle: ClaimStateBundle = Object.freeze({
  subject: `reduction-${date}`,
  claims: Object.freeze([
    reductionClaim("title", "title", `The reduction of ${date}`),
    reductionClaim("reduces-to", "reduces-to", reduction.value),
    reductionClaim("orbit", "orbit", [...reduction.steps]),
    reductionClaim("kind", "kind", reduction.kind),
  ]),
});

reportWrite(WIRE, bundle.subject, await writeBundleIfAbsent(STORE, bundle));
