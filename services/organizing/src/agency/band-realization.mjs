/**
 * The band regime's realization: each declaration of obsmetrologia-computing's
 * `ObsmetrologiaComputing.Band` read as organizing's own function (./band.mjs), over the JSON its golden
 * vectors carry (lean-system conformance, suite `band`). Agents are numbers, readings FOUR's points.
 */
import { bandMembers, confederate, councilClose, councilCost, fission, headStanding, memberReading } from "./band.mjs";

export const obsmetrologiaRealization = Object.freeze({
  "ObsmetrologiaComputing.Band.members": (founders, told) => bandMembers(founders, told),
  "ObsmetrologiaComputing.Band.memberReading": (founders, told, candidate) => memberReading(founders, told, candidate),
  "ObsmetrologiaComputing.Band.headStanding": (members, headTold, head) => headStanding(members, headTold, head),
  "ObsmetrologiaComputing.Band.councilClose": (engaged, withdrawn) => councilClose(engaged, withdrawn),
  "ObsmetrologiaComputing.Band.fission": (founders, told, subset) => fission(founders, told, subset),
  "ObsmetrologiaComputing.Band.confederate": (settlements) => confederate(settlements),
  "ObsmetrologiaComputing.Band.councilCost": (settlements) => councilCost(settlements),
});
