import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { memeCarrier } from "@red-cup-engineering/relating";

import { modalizeInputCarrier } from "../carriers.mjs";
import { modalizeTerm } from "../expressing.mjs";

export const modalizeAction = operation({
  verb: "modalize",
  inputFormat: "json",
  outputFormat: "json",
  options: ["mode", "witness"],
  summary: "Modulate a meme evidence's evidence while preserving its cell and value.",
  description: "Domain: communicating/communicate/modalize-input. Codomain: meme. The modal fields are input-carrier fields; evidence accumulation is carried by CHL IR.",
  domain: modalizeInputCarrier,
  codomain: memeCarrier,
  runTerm: modalizeTerm,
});
