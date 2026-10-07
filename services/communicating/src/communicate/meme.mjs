/**
 * communicate/meme - the meme-transforming morphisms of communicating.
 *
 * The argument-free generators here are CHL run terms over the meme carrier.
 * Option-bearing generators in `./morphisms/` consume one explicit input carrier
 * whose formerly-option fields live beside the `meme` field.
 */
import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { memeCarrier } from "@red-cup-engineering/relating";

import { communicateTerm, semioseTerm } from "./expressing.mjs";
import { morphismActions } from "./morphisms/index.mjs";

/** The carrier `$id` for the Meme carrier these morphisms read and produce. */
export const MEME_CARRIER_ID = memeCarrier.id;

/** communicate - the monoid unit: faithful transmission as the identity proof. */
export const communicateAction = operation({
  verb: "communicate",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Communicate a meme: the monoid unit (faithful transmission).",
  description: "Domain: a meme carrier. Codomain: a meme carrier. Faithful transmission — the identity morphism — represented as a CHL term.",
  domain: memeCarrier,
  codomain: memeCarrier,
  runTerm: communicateTerm,
});

/** semiose - the iteration primitive (Meme -> Meme), represented as a CHL term. */
export const semioseAction = operation({
  verb: "semiose",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Semiose a meme: produce its interpretant (unlimited semiosis).",
  description: "Domain: a sign meme. Codomain: the interpretant meme; the prior meme becomes the new vehicle and witnesses the new potential evidence.",
  domain: memeCarrier,
  codomain: memeCarrier,
  runTerm: semioseTerm,
});

export const memeActions = Object.freeze([
  communicateAction,
  semioseAction,
  ...morphismActions,
]);
