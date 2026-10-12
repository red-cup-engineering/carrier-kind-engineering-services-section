/**
 * @red-cup-engineering/communicating/speaking/listening/understanding — semantic readings of language.
 *
 * What a settled parse *means*: semantic frames (roles, polarity, scope, tense,
 * presupposition, logical form) and discourse structure (entity linking,
 * reference resolution). Everything here reads parsing's ParseResult and
 * produces measures and structures over it; it never re-settles the parse.
 */

export {
  roles, polarity, scope, temporal, presuppositions, logicalForm,
} from "./semantics/index.mjs";

export { linkEntity } from "./linking.mjs";
export { resolveReferences } from "./referring.mjs";
export {
  discourseStateCarrier,
  discourseStateOfForest,
  discourseStateSchema,
} from "./discourse-state.mjs";
export {
  discourseInformationCarrier,
  discourseInformationOfState,
  discourseInformationSchema,
} from "./discourse-information.mjs";

