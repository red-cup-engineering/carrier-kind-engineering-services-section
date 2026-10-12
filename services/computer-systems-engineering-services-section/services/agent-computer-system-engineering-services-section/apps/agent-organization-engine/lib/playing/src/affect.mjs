/**
 * affect — Silvan Tomkins' affect system as a reading over a ludic CHRONICLE (frontier register,
 * Layer B / first cut: dev/docs/notes/2026-06-25-affect-and-dramaturgy-in-play.md, in @red-cup-engineering/gaming).
 *
 * Tomkins (Affect Imagery Consciousness, 1962) holds that affect is triggered not by content but by the
 * PROFILE of neural firing density — its gradient: a steep rise fires fear, a moderate rise interest, a
 * sustained high level anger or distress, a fall (relief) enjoyment, a sudden onset surprise. A
 * CHRONICLE is, in his terms, a SCENE (a lived run) and a design is a SCRIPT; the affect a play carries
 * is read off the gradient of its STIMULATION — here the `ramification` opened at each action (the
 * branching novelty introduced). This gives the felt TEXTURE of a play that the win/loss reading discards.
 *
 * A reading, honestly: it maps the chronicle's stimulation profile to seven of Tomkins' nine affects.
 * The two rejection affects (disgust, dissmell) are content-directed, not gradient-driven, and are
 * reserved — never produced by this gradient reading. Consumes only the chronicle's actions; re-derives
 * no ludics.
 */

/** Tomkins' nine affects. The gradient reading produces seven; `disgust`/`dissmell` are reserved for a
 *  future content-directed (not density-driven) reading. */

const POSITIVE = new Set(["interest", "enjoyment"]);
const NEUTRAL = new Set(["surprise"]);

/** The stimulation profile of a chronicle and the dominant affect read off its gradient. */

  

  

    

const valenceOf = (affect) =>
  POSITIVE.has(affect) ? "positive" : NEUTRAL.has(affect) ? "neutral" : "negative";

/**
 * playAffect — read the dominant Tomkins affect of a chronicle off its stimulation gradient (the
 * branching `ramification` opened at each action). A give-up (Daimon) fires shame; a startling onset
 * (maximal stimulation at the first move) fires surprise; a steep build fires fear, a moderate build
 * interest; sustained-high-without-relief fires anger, sustained-moderate distress; a smooth low or
 * resolved line settles to enjoyment. The empty play is bare attention (interest).
 */
export function playAffect(c) {
  const sizes = c.actions.map((action) => action.ramification.length);
  const length = c.actions.length;
  const onset = sizes[0] ?? 0;
  const peak = sizes.reduce((max, size) => Math.max(max, size), 0);
  const buildup = peak - onset;
  const last = c.actions[length - 1];
  const surrender = last?.variety === "daimon";

  let dominant;
  const fell = (sizes[length - 1] ?? 0) < onset;
  if (length === 0) dominant = "interest";
  else if (surrender) dominant = "shame";
  else if (onset >= 2 && onset === peak && length >= 2 && fell) dominant = "surprise";
  else if (buildup >= 2) dominant = "fear";
  else if (buildup === 1) dominant = "interest";
  else if (peak >= 2) dominant = "anger";
  else if (peak === 1) dominant = "distress";
  else dominant = "enjoyment";

  return Object.freeze({
    kind: "playing.play-affect",
    dominant,
    valence: valenceOf(dominant),
    onset,
    peak,
    buildup,
    length,
    surrender,
  });
}
