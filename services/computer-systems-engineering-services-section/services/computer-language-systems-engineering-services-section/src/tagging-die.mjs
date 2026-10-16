// tagging-die — the one ActivityStreams text-tagging service provider every language
// algebra mounts: `taggingDie` is the pure solicit/invoke logic over one language's
// `tagText`; `serveTaggingDie` is its process face, the CLI transport
// run-leader-movement.js's invokeOperation() uses (`--operation <name> --now <instant>`,
// JSON on stdin or --input-file, JSON on stdout or --output-file).

import { readFileSync, writeFileSync } from "node:fs";

import { semanticIdOf } from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation/semantic-content-identity";
import { ACTIVITYSTREAMS_CONTEXT } from "@red-cup-engineering/activitypub-services-section/activitystreams";

const LMT_ACTOR = "urn:ame:leader-movement-team";

function attachments(note) { return Array.isArray(note?.attachment) ? note.attachment : note?.attachment === undefined ? [] : [note.attachment]; }

/** A tagging that produced conflicting analysis for a sentence is reported, not refused:
 *  real language is often ambiguous, so obstruction is priced, not hidden. */
function checkedPostcondition(result) {
  const perSentence = result.sentences.map((sentence) => sentence.cohomology);
  return {
    settled: perSentence.every((c) => c.glued),
    totalObstructionBits: perSentence.reduce((sum, c) => sum + c.h1, 0),
  };
}

/**
 * The tagging provider for one language. `language` is the algebra's slug ("latin"),
 * `name` its type prefix ("Latin"), `tagText` its tagger. Every operation returns
 * `{ value, code }`: the response Activity and the process exit code.
 */
export function taggingDie({ language, name, tagText }) {
  const nodeId = `${language}-language-algebra`;
  const actor = `urn:ame:${nodeId}`;
  const activityId = semanticIdOf(`lenticule.${nodeId}.activity`);
  const requestId = semanticIdOf(`lenticule.${nodeId}.tagging-request`);
  const resultId = semanticIdOf(`lenticule.${nodeId}.tagging-result`);
  const requestType = `${name}TaggingRequest`;
  const article = /^[AEIOU]/.test(name) ? "an" : "a";

  const response = (type, source, object) => ({
    "@context": ACTIVITYSTREAMS_CONTEXT,
    id: activityId({ actor, type, inReplyTo: source?.id ?? null, object }),
    type, actor, target: source?.actor ?? LMT_ACTOR, inReplyTo: source?.id ?? "urn:activity:unidentified", object,
  });
  const reject = (source, reason, details = {}) => ({ value: response("Reject", source, { type: "Refusal", reason, ...details }), code: 2 });
  const ok = (value) => ({ value, code: 0 });

  /** The text to tag: an explicit `<Name>TaggingRequest` attachment ({ text }), else the Note content. */
  function requestedText(sourceActivity) {
    const explicit = attachments(sourceActivity?.object).find((item) => item?.type === requestType);
    if (typeof explicit?.text === "string" && explicit.text.length > 0) return explicit.text;
    if (typeof sourceActivity?.object?.content === "string" && sourceActivity.object.content.length > 0) return sourceActivity.object.content;
    return null;
  }

  function solicit(activity) {
    if (activity?.["@context"] !== ACTIVITYSTREAMS_CONTEXT || activity.type !== "Offer" || activity.target !== actor || activity.object?.type !== "ServiceSolicitation") {
      return reject(activity, "solicitation must be an ActivityStreams Offer<ServiceSolicitation> addressed to this provider");
    }
    const sourceActivity = activity.object.sourceActivity;
    const text = requestedText(sourceActivity);
    if (text === null) {
      return ok(response("Question", activity, { type: "ServiceTermsRequired", sourceActivity: sourceActivity?.id, missing: [`text(nonempty string, as ${article} ${requestType} attachment or Note content)`] }));
    }
    const request = { text };
    const requestDigest = requestId(request);
    return ok(response("Offer", activity, {
      type: "ExecutableServiceOffer",
      sourceActivity: sourceActivity.id,
      requestDigest,
      request,
      operation: "invoke-service",
      effects: [],
      requirements: [],
      intentSignature: `urn:service-intent:tag-${language}-text`,
      scope: { textDigest: requestDigest },
    }));
  }

  function invalidInvocation(activity) {
    if (activity?.["@context"] !== ACTIVITYSTREAMS_CONTEXT || activity.type !== "Accept" || activity.target !== actor) return "invocation must be an ActivityStreams Accept addressed to this provider";
    const contract = activity.object;
    if (contract?.type !== "ServiceContract") return "invocation must accept a ServiceContract";
    const offer = contract.offer;
    if (offer?.type !== "Offer" || offer.actor !== actor || offer.object?.type !== "ExecutableServiceOffer") return "ServiceContract must carry this provider's executable Offer";
    if (offer.object.requestDigest !== requestId(offer.object.request)) return "accepted request does not match the provider offer digest";
    const capability = contract.capability;
    if (capability?.type !== "Capability" || capability.holder !== actor || capability.invocationTarget !== actor) return "accepted contract requires a capability held by this provider";
    if (capability.parentOffer !== offer.id || capability.attenuation?.requestDigest !== offer.object.requestDigest) return "capability is not attenuated to the accepted offer and request";
    if (!Array.isArray(capability.allowedActions) || !capability.allowedActions.includes("invoke-service")) return "capability does not grant invoke-service";
    return null;
  }

  function invoke(activity, instant) {
    const invalid = invalidInvocation(activity);
    if (invalid) return reject(activity, invalid);
    const offer = activity.object.offer;
    let result;
    try { result = tagText(offer.object.request.text); }
    catch (error) { return reject(activity, "tagging failed before producing a result", { diagnostic: error.message }); }
    const postcondition = checkedPostcondition(result);
    const resultBody = {
      type: `${name}TaggingResult`,
      taggedAt: instant,
      requestDigest: offer.object.requestDigest,
      sourceActivity: offer.object.sourceActivity,
      ...result,
      settled: postcondition.settled,
      totalObstructionBits: postcondition.totalObstructionBits,
      customerTerritoryMutation: false,
    };
    return ok(response("Accept", activity, { ...resultBody, id: resultId(resultBody) }));
  }

  return Object.freeze({ actor, solicit, invoke, reject });
}

/** Run one die as a process: read the Activity, dispatch the operation, write the response. */
export function serveTaggingDie(die, argv = process.argv) {
  const arg = (flag) => { const index = argv.indexOf(flag); return index === -1 ? undefined : argv[index + 1]; };
  const emit = ({ value, code }) => {
    const serialized = `${JSON.stringify(value, null, 2)}\n`;
    const outputFile = arg("--output-file");
    if (outputFile === undefined) process.stdout.write(serialized);
    else writeFileSync(outputFile, serialized, "utf8");
    process.exitCode = code;
  };
  const instant = arg("--now") ?? new Date().toISOString();
  let activity;
  try { activity = JSON.parse(readFileSync(arg("--input-file") ?? 0, "utf8")); }
  catch (error) { emit(die.reject({}, `invalid JSON input: ${error.message}`)); return; }
  const op = arg("--operation") ?? "solicit-service";
  if (op === "solicit-service") emit(die.solicit(activity));
  else if (op === "invoke-service") emit(die.invoke(activity, instant));
  else emit(die.reject(activity, `unknown provider operation ${op}`));
}
