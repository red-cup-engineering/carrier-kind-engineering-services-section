import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { defaultFilesystemBinding } from "@red-cup-engineering/computer-system-engine/rpc/binding";
import { admitAgencyWorkAllocation } from "@red-cup-engineering/feltos/work/agency-work-allocation";
import { charterProviderDelegationAuthorizer } from "@red-cup-engineering/feltos/work/provider-delegation-authority";
import { admitStructuredWorkIntent } from "@red-cup-engineering/feltos/work/structured-intent";
import { operationFamilyDescriptors } from "../src/generated/operation-family-descriptors.mjs";
import { admitCharacterMasks, CATALOG_CAPABILITY_RESOURCE, delegatedVerbs, delegationGrants, publicVerbs } from "@red-cup-engineering/metroplat/offices";
import { capabilityGrant, locusResource } from "@red-cup-engineering/computer-networking-engineering-services-section/object-capability";
import { modelCharacterResolverFromProviderAdmissions } from "@red-cup-engineering/organizing/work/model-character";

const DATE = "2026-09-28";
const SUBJECT = "structured-work-intent-delegated-standing";
const SCOPE = "work-item:delegated-standing";
// A real duty-bound catalog operation no one holds as a liberty, so only the delegation can grant it.
const delegated = Object.values(operationFamilyDescriptors).flat().find((d) => !publicVerbs().includes(d.verb) && d.locus === "duty" && d.effects.class === "host-read");

function intent() {
  const provenance = (start) => [{ source: "assignment", start, end: start + 1, unit: "unicode-code-point" }];
  const levels = ["endeavor:standing", "campaign:standing", "project:standing", "plan:standing", "task:standing", SCOPE];
  return {
    kind: "metroplat.work.structured-intent", id: "delegated-standing", producer: { id: "fixture", revision: "1" },
    sources: [{ id: "assignment", kind: "natural-language-prompt", locator: "test:delegated-standing" }],
    items: levels.map((cell, index) => ({
      cell, ...(index === 0 ? {} : { parent: levels[index - 1] }),
      ...(cell === SCOPE ? { work: "standing-work", skill: "standing-skill" } : {}),
      text: cell, evidence: [], provenance: provenance(index),
    })),
  };
}

function allocate(binding) {
  return admitAgencyWorkAllocation(binding, {
    kind: "metroplat.work.agency-work-allocation", id: "delegated-standing-allocation", subject: SUBJECT,
    office: { id: "fixture#operator" }, duty: "emsenn/duty/standing",
    character: { model: "fixture-model", id: "fixture:holder", capabilities: [delegated.verb] },
    officeService: { id: "emsenn/duty/standing", requiredCapabilities: [delegated.verb] },
    allocation: { scope: SCOPE, delegation: { provider: "character:outside", operations: [delegated.ref], effects: ["host-read"], authority: "charter-delegation" } },
  }, {
    at: DATE,
    resolveModelCharacter: modelCharacterResolverFromProviderAdmissions([{ model: "fixture-model", capabilities: [delegated.verb] }]),
    authorizeProviderDelegation: charterProviderDelegationAuthorizer({
      providers: [],
      isConnectedProvider: (provider) => provider === "character:outside",
      operationOf: (reference) => reference === delegated.ref ? delegated : undefined,
      resolveHolderOffices: () => [{ office: "fixture#operator", charter: "fixture-office.md", powers: [delegated.verb] }],
    }),
    resolveAuthority: () => ({
      office: { id: "fixture#operator", bearsDuty: ["emsenn/duty/standing"], deonticProfile: { "standing-work": "duty" } },
      duty: { id: "emsenn/duty/standing", work: "standing-work", claim: "claim:standing", skills: ["standing-skill"], delegation: true },
      work: { id: "standing-work", needs: ["standing-skill"], receiverCondition: "independent fixture receiver" },
      skill: { id: "standing-skill", closureKind: "procedure", requiresCapabilities: [delegated.verb], method: "perform the delegated operation" },
      officeService: { id: "emsenn/duty/standing", requiredCapabilities: [delegated.verb] },
    }),
  });
}

test("an account holds standing for exactly the operations delegated to the character it masks, on that duty alone, and a stranger holds none", () => {
  const root = mkdtempSync(path.join(tmpdir(), "metroplat-delegated-standing-"));
  try {
    const binding = defaultFilesystemBinding(root, { now: () => `${DATE}T12:00:00.000Z` });
    admitCharacterMasks({ dataRoot: root, date: DATE, masks: [{ kind: "metroplat.character-mask", account: "account:outside", character: "character:outside", reading: "held", issuer: "fixture", at: `${DATE}T11:00:00.000Z` }] });
    admitStructuredWorkIntent(binding, intent(), { at: DATE, subject: SUBJECT });
    allocate(binding);

    assert.deepEqual(delegatedVerbs(binding, "account:outside"), [delegated.verb]);
    const grants = delegationGrants(binding, "account:outside");
    assert.equal(grants.length, 1);
    assert.equal(grants[0].issuer, `delegation:${SCOPE}`);
    assert.equal(grants[0].holder, "account:outside");
    assert.equal(grants[0].grants, capabilityGrant(locusResource(CATALOG_CAPABILITY_RESOURCE, "duty", SCOPE), delegated.verb));
    assert.equal(grants[0].grants, `${CATALOG_CAPABILITY_RESOURCE}/duty/${encodeURIComponent(SCOPE)}#${delegated.verb}`);

    assert.deepEqual(delegatedVerbs(binding, "account:stranger"), []);
    assert.deepEqual(delegationGrants(binding, "account:stranger"), []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
