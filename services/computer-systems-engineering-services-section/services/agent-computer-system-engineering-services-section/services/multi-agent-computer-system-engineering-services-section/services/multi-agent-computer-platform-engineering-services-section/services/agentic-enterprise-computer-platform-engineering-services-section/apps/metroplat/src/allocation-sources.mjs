/** Live provider facts and authored office services for the allocation reader. */
import { readingAs } from "@red-cup-engineering/computer-data-engineering-services-section/four";
import { agencyAt, agencyRootOf, carrierTestimony, harnessModelCharacterResolver, currentHarnessCarrier } from "./offices.mjs";
import { firmPoolAuthorityCandidates } from "./firm-pool-authority.mjs";

export function allocationSources(binding) {
  return {
    readAllocationAuthorities: (declared) => firmPoolAuthorityCandidates({ firmPoolRoot: agencyRootOf(binding) }, declared,
      { agency: agencyAt(agencyRootOf(binding)), ...(declared.officeKeys === undefined ? {} : { officeKeys: declared.officeKeys }) }),
    readAllocationCharacters: () => {
      const testimony = carrierTestimony(binding);
      if (testimony.malformed > 0) throw new TypeError("provider feed is malformed");
      const resolver = harnessModelCharacterResolver(binding);
      const available = (carrier) => {
        try { return currentHarnessCarrier(binding, carrier.character, carrier.session)?.session === carrier.session; }
        catch { return false; }
      };
      return [...testimony.byModelEffort.values()].filter(({ carrier }) => readingAs("extremal", carrier.reading) === "held").map(({ carrier, witness }) => ({
        character: resolver({ id: carrier.character, model: carrier.model }),
        session: carrier.session,
        ...(carrier.reasoningEffort === undefined ? {} : { reasoningEffort: carrier.reasoningEffort }),
        available: available(carrier),
        evidence: [witness, `provider-session:${carrier.session}`, `provider-model:${carrier.model}`,
          ...(carrier.reasoningEffort === undefined ? [] : [`provider-reasoning-effort:${carrier.reasoningEffort}`]),
          `provider-admitted-at:${carrier.at}`],
      }));
    },
  };
}
