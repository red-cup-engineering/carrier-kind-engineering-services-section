import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { memeCarrier } from "@red-cup-engineering/relating";

import { translateInputCarrier } from "../carriers.mjs";
import { translateTerm } from "../expressing.mjs";

export const translateAction = operation({
  verb: "translate",
  inputFormat: "json",
  outputFormat: "json",
  options: ["target"],
  summary: "Re-sign a meme as a truth-order-preserving semiosphere factor.",
  description: "Domain: communicating/communicate/translate-input. Codomain: meme. Translation changes the semiosphere reading while preserving the meme evidence: the meaning factor is monotone on the truth order, commutes with negate, and leaves the bilattice top/bottom fixed. Register loss is reported by language-pair receipts rather than fabricated as a new assertion.",
  domain: translateInputCarrier,
  codomain: memeCarrier,
  runTerm: translateTerm,
});
