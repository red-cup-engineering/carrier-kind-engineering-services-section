/**
 * Pure receiving check for Cold Red Gate's root filesystem.  The host adapter
 * supplies observations; this operation never reads, removes, or deploys.
 */

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isNonNegativeSafeInteger = (value) => Number.isSafeInteger(value) && value >= 0;
const isText = (value) => typeof value === "string" && value.length > 0;

function refusal(code, subject) {
  return Object.freeze({ code, subject });
}

/**
 * Decide whether the observed filesystem can accept a release and which
 * explicitly observed release generations may be removed.  Missing safety
 * evidence is a refusal: a generation is never eligible by omission.
 *
 * @param {{minimumRootAvailableBytes: number, rootAvailableBytes: number, generations: readonly {name: string, current?: boolean, previous?: boolean, active?: boolean, interrupted?: boolean}[]}} input
 * @returns {{type: "ColdRedGateFilesystemCapacityRetentionEligibility", version: 1, publication: {admitted: boolean, refusals: readonly {code: string, subject: string}[]}, generations: readonly {name: string, deletion: {admitted: boolean, refusals: readonly {code: string, subject: string}[]}}[]}}
 */
export function observeFilesystemCapacityAndRetentionEligibility(input) {
  const publicationRefusals = [];
  if (!isObject(input) || !isNonNegativeSafeInteger(input.minimumRootAvailableBytes)) {
    publicationRefusals.push(refusal("release-reserve-not-observed", "minimumRootAvailableBytes"));
  }
  if (!isObject(input) || !isNonNegativeSafeInteger(input.rootAvailableBytes)) {
    publicationRefusals.push(refusal("root-capacity-not-observed", "rootAvailableBytes"));
  }
  if (publicationRefusals.length === 0 && input.rootAvailableBytes < input.minimumRootAvailableBytes) {
    publicationRefusals.push(refusal("root-capacity-below-release-reserve", "rootAvailableBytes"));
  }

  const observedGenerations = isObject(input) && Array.isArray(input.generations) ? input.generations : [];
  if (!isObject(input) || !Array.isArray(input.generations)) {
    publicationRefusals.push(refusal("release-generations-not-observed", "generations"));
  }
  const generations = observedGenerations.map((generation) => {
    const refusals = [];
    if (!isObject(generation) || !isText(generation.name)) {
      refusals.push(refusal("generation-not-identified", "generation.name"));
    }
    if (!isObject(generation) || generation.current !== false) refusals.push(refusal("generation-current-or-unobserved", "generation.current"));
    if (!isObject(generation) || generation.previous !== false) refusals.push(refusal("generation-previous-or-unobserved", "generation.previous"));
    if (!isObject(generation) || generation.active !== false) refusals.push(refusal("generation-active-or-unobserved", "generation.active"));
    if (!isObject(generation) || generation.interrupted !== false) refusals.push(refusal("generation-interrupted-or-unobserved", "generation.interrupted"));
    return Object.freeze({
      name: isObject(generation) && isText(generation.name) ? generation.name : "",
      deletion: Object.freeze({ admitted: refusals.length === 0, refusals: Object.freeze(refusals) }),
    });
  });

  return Object.freeze({
    type: "ColdRedGateFilesystemCapacityRetentionEligibility",
    version: 1,
    publication: Object.freeze({ admitted: publicationRefusals.length === 0, refusals: Object.freeze(publicationRefusals) }),
    generations: Object.freeze(generations),
  });
}
