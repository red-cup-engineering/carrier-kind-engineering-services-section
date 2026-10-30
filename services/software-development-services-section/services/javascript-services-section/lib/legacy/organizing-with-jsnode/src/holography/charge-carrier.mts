// charge-carrier.mts — a state→charge carrier over named points.
//
// The relational substrate (@emsenn/relating) exports the bilattice charge
// value space (ChargeValueName) but not a carrier constructor; this holography
// module mints its own thin carrier over it, the same shape posix-holography
// uses, so the family reads alike. A carrier evaluates each (point, state) face
// to a charge value; an unknown state reads as `absurd`.

import type { ChargeValueName as MemeCharge } from "@emsenn/relating";

export type { MemeCharge };

export type StateChargeCarrier<State extends string> = Readonly<{
  kind: "meme-charge.carrier";
  points: readonly string[];
  states: readonly State[];
  at(point: string, state: State): MemeCharge;
}>;

export function createStateChargeCarrier<State extends string>(
  points: Iterable<string>,
  states: Iterable<State>,
  evaluate: (point: string, state: State) => MemeCharge,
): StateChargeCarrier<State> {
  const pointList = Object.freeze([...points].map(String));
  const stateList = Object.freeze([...states]);
  return Object.freeze({
    kind: "meme-charge.carrier" as const,
    points: pointList,
    states: stateList,
    at(point, state) {
      if (!stateList.includes(state)) return "absurd";
      return evaluate(point, state);
    },
  });
}
