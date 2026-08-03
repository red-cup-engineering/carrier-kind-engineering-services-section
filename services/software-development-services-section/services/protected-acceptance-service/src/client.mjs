import { prepareAcceptanceCapsule } from "./acceptance-capsule.mjs";

export {
  acceptanceCapsuleDigest,
  executeAcceptanceCapsule,
  loadAcceptanceCapsule,
  materializeAcceptanceCapsule,
  validateAcceptanceCapsule,
} from "./acceptance-capsule.mjs";

export function prepareProtectedAcceptance(input, options = {}) {
  return prepareAcceptanceCapsule(input, options);
}
