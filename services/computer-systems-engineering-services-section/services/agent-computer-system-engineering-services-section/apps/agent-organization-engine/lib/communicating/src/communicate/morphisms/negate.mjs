/**
 * communicate/morphisms/negate - the polarity involution (Meme -> Meme).
 */
import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { memeCarrier } from "@red-cup-engineering/relating";
import { negateTerm } from "../expressing.mjs";

export const negateAction = operation({
  verb: "negate",
  inputFormat: "json",
  outputFormat: "json",
  options: [],
  summary: "Polarity involution: swap the meme's evidence truth and falsity sides.",
  description: "Domain: a meme carrier. Codomain: a meme carrier. The cell is preserved; the evidence transform is represented as a CHL term over the carrier.",
  domain: memeCarrier,
  codomain: memeCarrier,
  runTerm: negateTerm,
});
