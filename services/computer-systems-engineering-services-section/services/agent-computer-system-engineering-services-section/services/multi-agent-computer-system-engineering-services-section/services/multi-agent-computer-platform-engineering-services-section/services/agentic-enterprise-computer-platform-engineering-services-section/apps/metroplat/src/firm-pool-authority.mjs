/**
 * Configured-firm-pool authority adapter for the MetroPlat service process.
 * It reads the firm's authored agency records through organizing's agency
 * registry; allocation requests can name identities, but cannot choose this
 * root or supply authority facts.
 */
import { readFileSync } from "node:fs";
import { isAbsolute, join, resolve as resolvePath } from "node:path";
import { resolve } from "@red-cup-engineering/organizing/agency";
import { agencyAt } from "@red-cup-engineering/organizing/agency/held";

const IDENTIFIER = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const DUTY_PREFIX = "emsenn/duty/";
const CLOSURE_KINDS = new Set(["procedure", "inquiry", "derivation", "process"]);

function safeIdentifier(value, label) {
  if (!IDENTIFIER.test(value)) throw new TypeError(`firm pool: unsafe ${label} identifier`);
  return value;
}

function recordAt(agency, pool, identifier, fromSectionPath = "") {
  // Qualified references address a record already held in this agency. They
  // are never filesystem paths supplied by the allocation caller.
  const id = agency[pool].has(identifier) ? identifier : safeIdentifier(identifier, pool);
  const record = resolve(agency, pool, id, fromSectionPath);
  if (record === undefined) throw new TypeError(`firm pool: cannot read ${pool}/${id}: no such record in the firm's agency`);
  return record;
}

function skillAuthorityOfRecord(root, skill, options, agency) {
  let source;
  try {
    source = options.readFileUtf8 === undefined && agency.carrier !== undefined ? agency.carrier(skill.source)
      : (options.readFileUtf8 ?? ((file) => readFileSync(file, "utf8")))(join(root, skill.source));
  } catch (error) {
    throw new TypeError(`firm pool: cannot read skill/${skill.id}: ${error instanceof Error ? error.message : String(error)}`);
  }
  // Closure facts are explicit skill facts. Description prose is never used
  // as a default because it cannot establish a callable closure route.
  if (skill.closureKind === undefined || !CLOSURE_KINDS.has(skill.closureKind) || skill.requiresCapabilities.length === 0 && !/requires-capabilities:/u.test(source)) {
    throw new TypeError(`firm pool: skill/${skill.id} lacks declared closure-kind and requires-capabilities`);
  }
  const method = source.replace(/^---\s*\n[\s\S]*?^---\s*\n?/mu, "").trim();
  if (method.length === 0) throw new TypeError(`firm pool: skill/${skill.id} lacks a canonical method body`);
  if (skill.authored.execution !== undefined) throw new TypeError(`firm pool: skill/${skill.id} prescribes staffing; the promiser's ladder selects carrier and effort`);
  return Object.freeze({ id: skill.id, closureKind: skill.closureKind, requiresCapabilities: Object.freeze([...skill.requiresCapabilities]), method });
}

function addressOf(agency, pool, record) {
  return resolve(agency, pool, record.id, "")?.key === record.key ? record.id : record.key;
}

function requiredCarrierForOffering(office, duty) {
  const offerings = office.authored.serviceOfferings ?? office.authored["service-offerings"] ?? [];
  const matches = offerings.filter((offering) => Array.isArray(offering?.duties)
    && (offering.duties.includes(duty.id) || offering.duties.includes(`${DUTY_PREFIX}${duty.id}`)));
  if (matches.length === 0) return undefined;
  const requirements = matches.map((offering) => offering.requiredCarrier);
  if (requirements.some((required) => required === undefined)) {
    if (requirements.some((required) => required !== undefined)) {
      throw new TypeError(`firm pool: office ${office.id} has overlapping constrained and unconstrained offerings for duty ${duty.id}`);
    }
    return undefined;
  }
  const distinct = new Map(requirements.map((required) => [JSON.stringify(required), required]));
  if (distinct.size !== 1) throw new TypeError(`firm pool: office ${office.id} has conflicting carrier requirements for duty ${duty.id}`);
  const required = distinct.values().next().value;
  if (typeof required?.model !== "string" || required.model.length === 0
    || typeof required?.reasoningEffort !== "string" || required.reasoningEffort.length === 0) {
    throw new TypeError(`firm pool: office ${office.id} has an invalid carrier requirement for duty ${duty.id}`);
  }
  return Object.freeze({ model: required.model, reasoningEffort: required.reasoningEffort });
}

function carrierOfferingIssues(office, agency) {
  const offerings = office.authored.serviceOfferings ?? office.authored["service-offerings"] ?? [];
  const held = new Set(office.bearsDuty.map(reference => reference.startsWith(DUTY_PREFIX) ? reference.slice(DUTY_PREFIX.length) : reference));
  const issues = [];
  for (const offering of offerings) {
    if (offering?.requiredCarrier === undefined) continue;
    if (!Array.isArray(offering.duties) || offering.duties.length === 0) {
      issues.push(`firm pool: constrained offering ${offering.id ?? "<unnamed>"} on office ${office.id} has no duties`);
      continue;
    }
    for (const reference of offering.duties) {
      const id = typeof reference === "string" && reference.startsWith(DUTY_PREFIX) ? reference.slice(DUTY_PREFIX.length) : reference;
      if (typeof id !== "string" || !held.has(id) || resolve(agency, "duties", id, office.sectionPath) === undefined) {
        issues.push(`firm pool: constrained offering ${offering.id ?? "<unnamed>"} on office ${office.id} names an unheld or unresolved duty ${String(reference)}`);
      }
    }
  }
  return issues;
}

function authorityRecord(root, office, duty, work, skill, options, agency, requested = {}) {
  const officeAddress = requested.office ?? addressOf(agency, "offices", office);
  const dutyAddress = requested.duty ?? addressOf(agency, "duties", duty);
  if (typeof duty.claim !== "string" || duty.claim.length === 0) throw new TypeError(`firm pool: duties/${duty.id}.claim must be a non-empty string`);
  if (typeof work.to !== "string" || work.to.length === 0) throw new TypeError(`firm pool: works/${work.id}.to must be a non-empty string`);
  const profile = Object.fromEntries(Object.entries(office.deonticProfile).filter(([, value]) => typeof value === "string"));
  const admittedSkill = skillAuthorityOfRecord(root, skill, options, agency);
  const requiredCarrier = requiredCarrierForOffering(office, duty);
  return Object.freeze({
    office: Object.freeze({ ...office.authored, id: officeAddress, key: office.key, source: office.source, revision: office.revision, bearsDuty: Object.freeze(office.bearsDuty.map((ref) => {
      const held = resolve(agency, "duties", ref, office.sectionPath);
      return `${DUTY_PREFIX}${held?.key === duty.key ? dutyAddress : held === undefined ? ref : addressOf(agency, "duties", held)}`;
    })), deonticProfile: Object.freeze(profile) }),
    duty: Object.freeze({
      ...duty.authored, source: duty.source, revision: duty.revision,
      id: `${DUTY_PREFIX}${dutyAddress}`,
      work: work.id,
      claim: duty.claim,
      skills: duty.skills,
      delegation: duty.delegation,
    }),
    work: Object.freeze({ ...work.authored, id: work.id, source: work.source, revision: work.revision, needs: work.needs, receiverCondition: work.to }),
    skill: admittedSkill,
    officeService: Object.freeze({ id: `${DUTY_PREFIX}${dutyAddress}`, requiredCapabilities: admittedSkill.requiresCapabilities,
      ...(requiredCarrier === undefined ? {} : { requiredCarrier }) }),
  });
}

/**
 * Read the authored firm in reverse: which office-service chains declare one
 * exact work + skill pair? This is a pure authority discovery operation, not
 * staffing and not an allocation. It intentionally returns section-qualified
 * source keys beside the same authority shape the forward resolver uses so a
 * controller can preserve ambiguity instead of guessing across duplicate ids.
 *
 * Provider capability, availability, current load, delegation authority and
 * work-scope readiness are outside this function. They are runtime evidence,
 * not authored firm-pool facts.
 */
export function firmPoolAuthorityCandidates(
  { firmPoolRoot },
  { work: workId, skill: skillId },
  options = {},
) {
  if (!isAbsolute(firmPoolRoot)) throw new TypeError("firm pool: root must be an absolute local path");
  safeIdentifier(workId, "work");
  safeIdentifier(skillId, "skill");
  const root = resolvePath(firmPoolRoot);
  const agency = options.agency ?? agencyAt(root);
  const candidates = [];
  const obstructions = [];

  const offices = options.officeKeys === undefined ? agency.offices.values()
    : [...options.officeKeys].map(key => agency.offices.get(key)).filter(Boolean);
  for (const office of offices) {
    for (const reason of carrierOfferingIssues(office, agency)) obstructions.push(Object.freeze({ office: office.key, reason }));
    for (const dutyRef of office.bearsDuty) {
      const duty = resolve(agency, "duties", dutyRef, office.sectionPath);
      if (duty === undefined || duty.work !== workId || !duty.skills.includes(skillId)) continue;
      const work = resolve(agency, "works", duty.work, duty.sectionPath);
      const skill = resolve(agency, "skills", skillId, duty.sectionPath);
      if (work === undefined || skill === undefined) {
        obstructions.push(Object.freeze({
          office: office.key,
          duty: duty.key,
          reason: work === undefined ? "work-record-unresolved" : "skill-record-unresolved",
        }));
        continue;
      }
      try {
        const authority = authorityRecord(root, office, duty, work, skill, options, agency);
        candidates.push(Object.freeze({
          ...authority,
          sources: Object.freeze({
            office: office.key,
            duty: duty.key,
            work: work.key,
            skill: skill.key,
          }),
          allocationAddressable: true,
        }));
      } catch (error) {
        obstructions.push(Object.freeze({
          office: office.key,
          duty: duty.key,
          reason: error instanceof Error ? error.message : String(error),
        }));
      }
    }
  }

  return Object.freeze({
    kind: "metroplat.firm-pool-authority-candidates",
    work: workId,
    skill: skillId,
    candidates: Object.freeze(candidates.sort((left, right) =>
      left.sources.office.localeCompare(right.sources.office) || left.sources.duty.localeCompare(right.sources.duty))),
    obstructions: Object.freeze(obstructions.sort((left, right) =>
      left.office.localeCompare(right.office) || (left.duty ?? "").localeCompare(right.duty ?? ""))),
  });
}

/** Build one resolver at process startup from an absolute, local firm pool: the firm's agency
 *  records, read by organizing's agency registry (the firm's own section first). */
export function firmPoolAuthorityResolver(
  { firmPoolRoot },
  options = {},
) {
  if (!isAbsolute(firmPoolRoot)) throw new TypeError("firm pool: root must be an absolute local path");
  const root = resolvePath(firmPoolRoot);
  const agency = agencyAt(root);
  return (allocation, declared = {}) => {
    const dutyId = allocation.duty.startsWith(DUTY_PREFIX)
      ? allocation.duty.slice(DUTY_PREFIX.length)
      : allocation.duty;
    const office = recordAt(agency, "offices", allocation.office.id);
    const duty = recordAt(agency, "duties", dutyId, office.sectionPath);
    if (typeof duty.work !== "string" || duty.work.length === 0) throw new TypeError(`firm pool: duties/${dutyId}.work must be a non-empty string`);
    const work = recordAt(agency, "works", duty.work, duty.sectionPath);
    // The canonical obligation selects the method. Capability lists cannot
    // identify a method, and choosing the first would confuse assessment with
    // execution. Singleton callers retain their unambiguous historical route.
    const skillId = declared.skill ?? (duty.skills.length === 1 ? duty.skills[0] : undefined);
    if (skillId === undefined || !duty.skills.includes(skillId))
      throw new TypeError(`firm pool: duties/${dutyId} requires its declared canonical skill`);
    if (declared.work !== undefined && declared.work !== duty.work)
      throw new TypeError(`firm pool: duties/${dutyId} does not carry the declared work`);
    const skill = recordAt(agency, "skills", skillId, duty.sectionPath);
    return authorityRecord(root, office, duty, work, skill, options, agency, { office: allocation.office.id, duty: dutyId });
  };
}
