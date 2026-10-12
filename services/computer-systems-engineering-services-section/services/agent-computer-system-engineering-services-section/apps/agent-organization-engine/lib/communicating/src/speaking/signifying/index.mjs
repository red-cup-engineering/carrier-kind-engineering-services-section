/**
 * speaking/signifying — semiotic carriers for spoken communication.
 *
 * A sign relation is triadic: vehicle, object, interpretant. Semiosis advances
 * by taking an interpretant as a further sign-vehicle for the same object in a
 * semiosphere. The semiosphere boundary is a translation mechanism, not a codec.
 */
export {
  signRelationCarrier,
  semiosisStepCarrier,
  semiosphereCarrier,
  semiosphereBoundaryTranslationCarrier,
} from "./carriers.mjs";

/** Construct a semiosphere carrier. */
export const semiosphere = (name) =>
  Object.freeze({ kind: "communicating.speaking.signifying.semiosphere", name });

/** Construct a sign relation from vehicle, object, and interpretant. */
export const signRelation = (
  vehicle,
  object,
  interpretant,
) =>
  Object.freeze({
    kind: "communicating.speaking.signifying.signRelation",
    vehicle,
    object,
    interpretant,
  });

/** Advance semiosis by making the prior interpretant the next vehicle. */
export function advanceSemiosis(
  prior,
  interpretant,
)

 {
  return Object.freeze({
    kind: "communicating.speaking.signifying.semiosisStep",
    prior,
    next: signRelation(prior.interpretant, prior.object, interpretant),
  });
}

/** Apply a boundary translation into a semiosphere and carry both sides. */
export function translateAcrossSemiosphereBoundary(
  sphere,
  external,
  translate,
) {
  return Object.freeze({
    kind: "communicating.speaking.signifying.semiosphereBoundaryTranslation",
    semiosphere: sphere,
    external,
    internal: translate(external),
  });
}
