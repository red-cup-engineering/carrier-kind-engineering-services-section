/**
 * @red-cup-engineering/communicating — communicating admitted through @red-cup-engineering/relating.
 *
 * The package root is the universal admission surface and the language-neutral
 * machinery: parsing, understanding, grammatical judgment, codecs, geometry, the
 * language algebra, signifying, grounding, illocuting, messaging, and the
 * `actions(bundle)` cocone factory. Every morphism that reads a language is
 * parameterized over a `CompiledBundle`; this package injects no bundle of its
 * own. Concrete languages — their bundles, realization, and prose conformance —
 * live in language-algebra packages downstream. The root
 * deliberately does not re-export subpaths as a namespace bag.
 */

import { admitCommunication } from "./speaking/listening/parsing/carrier.mjs";

export { actions } from "./communicate/actions.mjs";
export {
  codecActions,
  decodeCommunicationAction,
  articulateCommunicationAction,
  settleCommunicationAction,
} from "./communicate/codec-actions.mjs";
export {
  manifestActions,
  readLanguageChuReceiptAction,
  readLanguageDiscourseCoverReceiptAction,
  readLanguageLambekReceiptAction,
  readLanguageManifestAction,
  readLanguageManifestReceiptsAction,
  readLanguageWitnessJournalAction,
  readLanguageSoficReceiptAction,
} from "./communicate/manifest-actions.mjs";
export { communicateAction, semioseAction, memeActions, MEME_CARRIER_ID } from "./communicate/meme.mjs";
export {
  composeInputCarrier,
  groundInputCarrier,
  illocuteInputCarrier,
  listenInputCarrier,
  modalizeInputCarrier,
  presupposeInputCarrier,
  quoteInputCarrier,
  referInputCarrier,
  speakInputCarrier,
  translateInputCarrier,
} from "./communicate/carriers.mjs";

export { communicatingFace, membraneMeme, COMMUNICATING_FACE_AXIS } from "./communicate/face.mjs";

export { cohereAction, discourseCohesionOf, spacetimeAction, discourseSpacetimeOf, channelAction, channelInformationOf } from "./communicate/cohesion.mjs";
export {
  morphismActions,
  speakAction,
  listenAction,
  illocuteAction,
  groundAction,
  translateAction,
  negateAction,
  referAction,
  modalizeAction,
  presupposeAction,
  quoteAction,
  composeAction,
} from "./communicate/morphisms/index.mjs";

export {
  projectReading,
  read,
  settle,
} from "./holography/index.mjs";

export {
  advanceSemiosis,
  semiosisStepCarrier,
  semiosphereBoundaryTranslationCarrier,
  semiosphereCarrier,
  semiosphere,
  signRelationCarrier,
  signRelation,
  translateAcrossSemiosphereBoundary,
} from "./speaking/signifying/index.mjs";

export {
  accommodateCommonGround,
  assertIntoCommonGround,
  challengeCommonGround,
  CommonGroundBasisSchema,
  commonGroundCarrier,
  commonGround,
  commonGroundPropositionCarrier,
  commonGroundProposition,
  commonGroundUpdateCarrier,
} from "./speaking/listening/grounding/index.mjs";

export {
  illocute,
  locute,
  performSpeechAct,
  perlocute,
  speechAct,
} from "./speaking/illocuting/index.mjs";

export { admitCommunication, carrierOfUtterance, communicationDocument, communicationMark, isMark } from "./speaking/listening/parsing/carrier.mjs";
export { articulate, articulateCommunication } from "./speaking/listening/parsing/articulating.mjs";
export { lambekForestProofCarrier, lambekForestProofSchema, lambekForestReadingProofCarrier, lambekForestReadingProofSchema, lambekProofOfForest } from "./speaking/listening/parsing/lambek.mjs";
export { parseCommunicationForest, parseForest, parseForestCarrier, parseForestFromArticulation, parseForestReadingCarrier, parseForestReadingSchema, parseForestSchema } from "./speaking/listening/parsing/forest.mjs";
export { parseCommunication } from "./speaking/listening/parsing/parsing.mjs";

export {
  communicationObservation,
  communicationObservationCarrier,
  communicationObservations,
  communicationObservationSetCarrier,
  communicationTask,
  communicationTaskCarrier,
  observationsOfCommunication,
  taskCell as communicationTaskCell,
} from "./speaking/listening/observing/index.mjs";

export { readingStatus, fuse, implies } from "./speaking/listening/algebra/reading.mjs";
export { conjugate, indefiniteArticle, lemma, pluralize } from "./speaking/listening/algebra/morphology.mjs";
export { grammarProfileFromLegacyBundle, languageGrammarProfileCarrier, languageGrammarProfileSchema, morphotacticPatternRuleCarrier, morphotacticPatternRuleSchema } from "./speaking/listening/algebra/profile.mjs";
export { languageRegisterFiber, languageRegisterFiberCarrier, languageRegisterFiberSchema, registerFiberAxes, registerFiberDataSchema, registerFiberDegradationReceipt } from "./speaking/listening/algebra/register-fiber.mjs";
export { bundleFromLanguageManifest, chuManifestReceipt, compiledBundleFromLanguageManifest, discourseCoverManifestReceipt, lambekManifestReceipt, languageManifestCarrier, languageManifestReceipts, languageManifestWitnessJournalRows, languageManifestSchema, loadLanguageManifest, soficManifestReceipt } from "./speaking/listening/algebra/manifest.mjs";
// loadLanguageManifestFile (the one disk read) lives in read-language-manifest.mjs and is not
// re-exported here: no caller reached it through this barrel (only through the dedicated
// ./speaking/listening/algebra/read-language-manifest subpath), and re-exporting a kernel module
// here would make this hull barrel import kernel again (house-architecture-norms.json,
// "hull-never-imports-kernel") for no live consumer.
export { load } from "./speaking/listening/algebra/compile.mjs";
export { translationFactorChainReceipt, translationFactorReceipt } from "./speaking/listening/algebra/translation.mjs";

export { discourseInformationCarrier, discourseInformationOfState, discourseInformationSchema } from "./speaking/listening/understanding/discourse-information.mjs";
export { discourseStateCarrier, discourseStateOfForest, discourseStateSchema } from "./speaking/listening/understanding/discourse-state.mjs";
export { linkEntity } from "./speaking/listening/understanding/linking.mjs";
export { logicalForm } from "./speaking/listening/understanding/semantics/logical-form.mjs";
export { polarity } from "./speaking/listening/understanding/semantics/polarity.mjs";
export { presuppositions } from "./speaking/listening/understanding/semantics/presupposition.mjs";
export { resolveReferences } from "./speaking/listening/understanding/referring.mjs";
export { roles } from "./speaking/listening/understanding/semantics/roles.mjs";
export { scope } from "./speaking/listening/understanding/semantics/scope.mjs";
export { temporal } from "./speaking/listening/understanding/semantics/tense.mjs";

export { default as render, renderArcs } from "./speaking/listening/codecs/rendering.mjs";
export { similarity, similarPairsFrom } from "./speaking/listening/geometry/index.mjs";

export { grammaticality } from "./speaking/listening/judging/grammaticality/grammaticality.mjs";

export {
  channelBetween,
  channelCarrier,
  CLOUDEVENTS_DATA_CONTENT_TYPE,
  CLOUDEVENTS_JSON_CONTENT_TYPE,
  CLOUDEVENTS_SPECVERSION,
  cloudEventCarrier,
  cloudEventFromUtterance,
  cloudEventIllocutionaryForce,
  cloudEventSchema,
  DIDCOMM_CONTEXT,
  DIDCOMM_ENCRYPTED_TYP,
  DIDCOMM_JWM_ALG,
  DIDCOMM_JWM_ENC,
  DIDCOMM_PRIVATE_VISIBILITY,
  DID_CONTEXT,
  didcommMessageFromUtterance,
  didcommPlaintextMessageCarrier,
  didcommPlaintextMessageSchema,
  didcommSealedMessageCarrier,
  didcommSealedMessageSchema,
  didcommVisibility,
  listener,
  listenerCarrier,
  MessageStatusSchema,
  ACTIVITYPUB_C2S_CONTENT_TYPE,
  messageCarrier,
  DIDCOMM_PLAINTEXT_CONTENT_TYPE,
  acrossFaceProtocolMediaTypes,
  acrossFaceProtocolProjectors,
  activityPubC2sActivityCarrier,
  activityPubC2sActivitySchema,
  activityPubC2sProjector,
  openDIDCommMessage,
  openDIDCommUtterance,
  openChannel,
  receiveMessage,
  cloudEventsProjector,
  didcommProjector,
  negateProtocolUtterance,
  protocolProjector,
  protocolTranslate,
  protocolWireProjector,
  readProtocolUtterances,
  sealDIDCommMessage,
  sealDIDCommUtterance,
  sendMessage,
  speaker,
  speakerCarrier,
  socializingAcrossFaceLift,
  uptakeCarrier,
  utteranceFromCloudEvent,
  utteranceFromDIDCommMessage,
  withinCapacity,
  messageReading,
  writeProtocolUtterances,
} from "./messaging/index.mjs";

/**
 * Admit a communicating act into the relating substrate.
 *
 * Domain: `communicating.admit x token x claim?`, where boundary strings are
 * decoded documents and Mark inputs are already admitted relating carriers.
 * Codomain: a communicating carrier whose utterance descends to Mark/Utterance.
 * Law: all communication normalizes through `Mark -> Utterance -> articulate`;
 * no text span, parse result, or grammatical reading is primitive at the root.
 */
export function communicate(
  action,
  token,
  claim,
) {
  if (action !== "communicating.admit") {
    throw new TypeError(`communicate: unsupported action ${JSON.stringify(action)}`);
  }
  return Object.freeze({
    action,
    carrier: admitCommunication(token, claim),
  });
}
