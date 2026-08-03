import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { idOf } from "./semantic-content.mjs";

export const CONTEXT = "https://www.w3.org/ns/activitystreams";
export const ACTOR = "urn:ame:red-cup-engineering:deterministic-intent-compiler-supplier";
export const TARGET = "src/generated-resolvers/bounded-inference-intent-compiler.mjs";
export function record(body) { return Object.freeze({ id: idOf(body, "deterministic-intent-compiler-supplier.record"), ...body }); }
const sha = (bytes) => `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
const inside = (root, path) => { const rel = relative(root, path); return rel === "" || (rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel)); };

function supports(lot, quote, policy) {
  return lot?.type === "SoftwareDevelopmentWorkLot" && quote?.type === "ImprovementBuyerQuote" && quote.lot === lot.id && lot.productContract?.type === "BoundedInferenceIntentCompiler" && lot.ownedTargetRoots?.some((root) => TARGET === root || TARGET.startsWith(`${root}/`)) && !lot.forbiddenRoots?.some((root) => TARGET === root || TARGET.startsWith(`${root}/`)) && lot.acceptanceArtifacts?.length > 0 && lot.acceptanceCommands?.every((command) => command.runner === "node") && quote.consideration?.unit === policy.minimumAsk.unit && quote.consideration.amount >= policy.minimumAsk.amount;
}
export function bidForOffer(activity, policy) {
  const lot = activity?.object, quote = activity?.attachment?.find((item) => item?.type === "ImprovementBuyerQuote");
  if (activity?.type !== "Offer" || !supports(lot, quote, policy)) return null;
  return record({ "@context": CONTEXT, type: "Offer", actor: ACTOR, target: lot.consumer, inReplyTo: quote.id, object: { type: "SoftwareDevelopmentServiceBid", provider: ACTOR, lot: lot.id, quote: quote.id, consideration: policy.minimumAsk, capabilities: policy.capabilities, maximumConcurrentLots: policy.maximumConcurrentLots, estimatedInferenceCalls: 0, deliveryMode: "proposal-only", customerMutation: false, upwardEscalationAuthorized: false, executionPolicy: { route: "provider-owned-deterministic-template", refinement: "script-only" }, lotSnapshot: lot } });
}
export async function fulfillAward(award, bid = award?.object?.bidSnapshot, options = {}) {
  const lot = bid?.object?.lotSnapshot;
  if (award?.type !== "Accept" || award.target !== ACTOR || award.object?.type !== "ImprovementProposalAward" || award.object.bid !== bid?.id || award.object.lot !== lot?.id || bid.object.provider !== ACTOR) return null;
  if (award.object.customerMutationAuthorized !== false || !supports(lot, { type: "ImprovementBuyerQuote", lot: lot.id, consideration: bid.object.consideration }, options.policy)) throw new Error("award expanded or changed deterministic product boundary");
  const territory = resolve(lot.boardTerms.territory), target = resolve(territory, TARGET); if (!inside(territory, target) || (existsSync(target) && lstatSync(target).isSymbolicLink())) throw new Error("customer target boundary changed");
  const before = existsSync(target) ? readFileSync(target) : Buffer.alloc(0), after = readFileSync(options.templatePath);
  const candidate = record({ type: "SoftwareChangeProposal", lot: lot.id, award: award.id, supplier: ACTOR, changes: [{ path: TARGET, beforeExisted: existsSync(target), beforeDigest: sha(before), afterDigest: sha(after), afterBytesBase64: after.toString("base64") }], upwardEscalationAuthorized: false, resources: { route: "provider-owned-deterministic-template", inferenceAttempts: 0, usefulCompletions: 1 }, route: { class: "induced-deterministic-resolver", frontierInferenceCalls: 0, templateDigest: sha(after) }, recordedAt: options.recordedAt ?? new Date().toISOString() });
  const review = await options.reviewProposal({ type: "SoftwareChangeProposalAssayRequest", lot, award, candidate });
  if (review?.type !== "ImprovementCandidateReview" || review.candidate !== candidate.id || review.accepted !== true || review.actor === ACTOR || review.actor === lot.consumer) throw new Error(review?.reason ?? "independent deterministic candidate assay refused");
  return record({ "@context": CONTEXT, type: "Create", actor: ACTOR, target: lot.consumer, inReplyTo: award.id, object: candidate, attachment: [review] });
}
