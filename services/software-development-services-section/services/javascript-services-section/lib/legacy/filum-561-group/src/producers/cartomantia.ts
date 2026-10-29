#!/usr/bin/env node
// The cartomantia producer: the day's single-card draw as a claim-state
// bundle.
//
// The draw is deterministic — divination-topology's seeded daily spread
// under the "cartomantia" salt — so the claim is checkable: anyone holding the
// seed reproduces the card. The seed is published as its own "seed" claim
// (this package's chosen convention; the method claim carries only the
// algorithm), and every claim carries force "computes" witnessed by the
// seeded draw with the spread's provenance method. No citation: the draw
// cites nothing outside itself.

import process from "node:process";
import { fileURLToPath } from "node:url";
import type { OrientationName } from "@lenticule-science/divining/divination/codecs";
import { dailySpread } from "@lenticule-science/divining/divination";
import type { ClaimStateBundle } from "@red-cup-engineering/content/topology/news";

import {
  assertedNow,
  computesClaim,
  reportWrite,
  resolveDate,
  writeBundleIfAbsent,
} from "@red-cup-engineering/producing-content/organizing-a-newswire";

const WIRE = "cartomantia";
const WITNESS = "divination-topology seeded draw";

/** This wire's store: its own backstage/store/, absolute. */
const STORE = fileURLToPath(new URL("../../store/cartomantia/", import.meta.url));
const SEED_SALT = "cartomantia";

const date = resolveDate(process.argv.slice(2).find((argument) => argument !== "--"));
const asserted = assertedNow();
const spread = dailySpread(date, SEED_SALT);
const position = spread.positions[0];
if (position === undefined) throw new TypeError("dailySpread yielded no positions");

const card: Readonly<{
  name: string;
  arcana: "major" | "minor";
  orientation: OrientationName;
  position: string;
}> = Object.freeze({
  name: position.card.name,
  arcana: position.card.arcana,
  orientation: position.orientation,
  position: position.position,
});

const bundle: ClaimStateBundle = Object.freeze({
  subject: `draw-${date}`,
  claims: Object.freeze([
    computesClaim({
      id: "title",
      predicate: "title",
      object: `The draw of ${date}`,
      asserted,
      valid: date,
      witness: WITNESS,
      method: spread.provenance.method,
    }),
    computesClaim({
      id: "card",
      predicate: "card",
      object: card,
      asserted,
      valid: date,
      witness: WITNESS,
      method: spread.provenance.method,
    }),
    computesClaim({
      id: "seed",
      predicate: "seed",
      object: spread.provenance.seed,
      asserted,
      valid: date,
      witness: WITNESS,
      method: spread.provenance.method,
    }),
  ]),
});

reportWrite(WIRE, bundle.subject, await writeBundleIfAbsent(STORE, bundle));
