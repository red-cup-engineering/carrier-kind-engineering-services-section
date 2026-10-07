import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { memeCarrier } from "@red-cup-engineering/relating";

import { listenInputCarrier } from "../carriers.mjs";
import { listenTerm } from "../expressing.mjs";

export const listenAction = operation({
  verb: "listen",
  inputFormat: "json",
  outputFormat: "json",
  options: ["listener"],
  summary: "Listen to a meme: uptake the input meme, witnessed by the listener field in the input carrier.",
  description: "Domain: communicating/communicate/listen-input. Codomain: meme. The CHL runTerm consumes one carrier and produces an active-evidence uptake meme without consulting an out-of-band argument record.",
  domain: listenInputCarrier,
  codomain: memeCarrier,
  runTerm: listenTerm,
});
