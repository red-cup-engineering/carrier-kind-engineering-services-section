import { actions as baseActions, codecActions, manifestActions } from "@red-cup-engineering/communicating";

import relationConlang from "./compiled.mjs";
import { manifest } from "./manifest.mjs";

export const actions = Object.freeze([
  ...baseActions(relationConlang),
  ...codecActions(relationConlang),
  ...manifestActions(manifest),
]);
