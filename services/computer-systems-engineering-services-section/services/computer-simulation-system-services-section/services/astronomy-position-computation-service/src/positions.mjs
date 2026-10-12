// Charts: the carrier for a moment's sky.
//
// Vocabulary: a Body is one of the eleven members of the astrological
// septenary-plus-moderns (Sun through Pluto). A BodyState is a body's
// geocentric ecliptic coordinates of date — longitude and latitude on the
// circle, plus the longitude's time-derivative, whose sign carries apparent
// motion. A Chart is a finite map from bodies to states at one instant,
// stamped with the provenance of the computation that witnessed it.
//
// Motion is a three-valued reading of the derivative, not a boolean: a body
// within the stationary band is neither direct nor retrograde.

export const BODIES = Object.freeze([
  "sun",
  "moon",
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
  "pluto",
]);

export const BODY_GLYPHS = Object.freeze({
  sun: "☉",
  moon: "☽",
  mercury: "☿",
  venus: "♀",
  mars: "♂",
  jupiter: "♃",
  saturn: "♄",
  uranus: "♅",
  neptune: "♆",
  pluto: "♇",
});

/** Below this |speed| (degrees/day) a body reads as stationary. */
export const STATIONARY_BAND = 0.003;

export function motionOf(state) {
  if (Math.abs(state.speed) <= STATIONARY_BAND) return "stationary";
  return state.speed > 0 ? "direct" : "retrograde";
}

