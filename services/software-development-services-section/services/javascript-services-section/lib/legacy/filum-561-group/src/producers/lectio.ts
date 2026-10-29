#!/usr/bin/env node
// The lectio producer: the liturgical day and its appointed readings as a
// claim-state bundle.
//
// The "season" claim carries liturgy-topology's romanDay (the General Roman
// Calendar's season partition and day chart); "rcl-year" the Revised Common
// Lectionary Sunday cycle; "readings" the recorded lection for the date.
// Absence is reported honestly: when lectionFor answers no-entry-recorded —
// a statement about the package's tables, not about the lectionary — the
// readings claim computes the object "no entry recorded", with the table
// note as its stated accuracy. When an entry is found, provenance.citation
// is the entry's own provenance string.

import process from "node:process";
import { fileURLToPath } from "node:url";
import { lectionFor, rclYear, romanDay } from "@lenticule-science/divining/liturgy";
import type { AssertedClaim, ClaimStateBundle } from "@red-cup-engineering/content/topology/news";

import {
  assertedNow,
  computesClaim,
  reportWrite,
  resolveDate,
  writeBundleIfAbsent,
} from "@red-cup-engineering/producing-content/organizing-a-newswire";

const WIRE = "lectio";
const WITNESS = "liturgy-topology";

/** This wire's store: its own backstage/store/, absolute. */
const STORE = fileURLToPath(new URL("../../store/lectio/", import.meta.url));

const date = resolveDate(process.argv.slice(2).find((argument) => argument !== "--"));
const asserted = assertedNow();
const day = romanDay(date);
const cycle = rclYear(date);
const outcome = lectionFor(date, "rcl");

const readingsClaim: AssertedClaim =
  outcome.outcome === "found"
    ? computesClaim({
        id: "readings",
        predicate: "readings",
        object: {
          name: outcome.entry.name,
          service: outcome.entry.service,
          readings: outcome.entry.readings,
        },
        asserted,
        valid: date,
        witness: WITNESS,
        method: "lectionFor(date, \"rcl\") over the package's recorded tables",
        citation: outcome.entry.provenance,
      })
    : computesClaim({
        id: "readings",
        predicate: "readings",
        object: "no entry recorded",
        asserted,
        valid: date,
        witness: WITNESS,
        method: "lectionFor(date, \"rcl\") over the package's recorded tables",
        accuracy: outcome.note,
      });

const bundle: ClaimStateBundle = Object.freeze({
  subject: `lection-${date}`,
  claims: Object.freeze([
    computesClaim({
      id: "title",
      predicate: "title",
      object: `The lection of ${date}`,
      asserted,
      valid: date,
      witness: WITNESS,
      method: "romanDay + rclYear + lectionFor",
    }),
    computesClaim({
      id: "season",
      predicate: "season",
      object: day,
      asserted,
      valid: date,
      witness: WITNESS,
      method: "romanDay (General Roman Calendar season partition and day chart)",
    }),
    computesClaim({
      id: "rcl-year",
      predicate: "rcl-year",
      object: cycle,
      asserted,
      valid: date,
      witness: WITNESS,
      method: "rclYear (RCL Sunday cycle of the liturgical year)",
    }),
    readingsClaim,
  ]),
});

reportWrite(WIRE, bundle.subject, await writeBundleIfAbsent(STORE, bundle));
