/**
 * Configured-firm-pool authority adapter for the MetroPlat service process.
 * It reads the firm's authored agency records; allocation requests can name
 * identities, but cannot choose this root or supply authority facts.
 */
import { readFileSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";
import type { AgencyWorkAuthority } from "../../work/agency-work-allocation.mts";
import type { AgencyWorkAllocation } from "../../work/schema.mts";

const IDENTIFIER = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const DUTY_PREFIX = "emsenn/duty/";
const CLOSURE_KINDS = new Set(["procedure", "inquiry", "derivation", "process"]);

type RecordValue = Readonly<Record<string, unknown>>;

function recordOf(value: unknown, label: string): RecordValue {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`firm pool: ${label} must be a JSON object`);
  }
  return value as RecordValue;
}

function stringOf(record: RecordValue, key: string, label: string): string {
  const value = record[key];
  if (typeof value !== "string" || value.length === 0) throw new TypeError(`firm pool: ${label}.${key} must be a non-empty string`);
  return value;
}

function stringsOf(record: RecordValue, key: string, label: string): readonly string[] {
  const value = record[key];
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || item.length === 0)) {
    throw new TypeError(`firm pool: ${label}.${key} must be an array of non-empty strings`);
  }
  return Object.freeze([...value] as string[]);
}

function booleanOf(record: RecordValue, key: string, label: string): boolean {
  const value = record[key];
  if (typeof value !== "boolean") throw new TypeError(`firm pool: ${label}.${key} must be a boolean`);
  return value;
}

function safeIdentifier(value: string, label: string): string {
  if (!IDENTIFIER.test(value)) throw new TypeError(`firm pool: unsafe ${label} identifier`);
  return value;
}

function readJson(root: string, pool: string, identifier: string): RecordValue {
  const id = safeIdentifier(identifier, pool);
  const file = resolve(root, "lib", "agency", pool, `${id}.json`);
  const poolRoot = resolve(root, "lib", "agency", pool);
  if (relative(poolRoot, file).startsWith("..")) throw new TypeError(`firm pool: ${pool} record escapes configured root`);
  try {
    return recordOf(JSON.parse(readFileSync(file, "utf8")), `${pool}/${id}`);
  } catch (error) {
    throw new TypeError(`firm pool: cannot read ${pool}/${id}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function frontmatterValue(source: string, name: string): string | undefined {
  const match = new RegExp(`^${name}:\\s*(.+?)\\s*$`, "mu").exec(source);
  return match?.[1]?.trim();
}

function frontmatterList(source: string, name: string): readonly string[] | undefined {
  const block = new RegExp(`^${name}:\\s*\\n((?:^[ \\t]+-\\s*[^\\n]+\\n?)+)`, "mu").exec(source)?.[1];
  if (block === undefined) return undefined;
  const values = [...block.matchAll(/^[ \t]+-\s*([^\n]+)$/gmu)].map((match) => match[1]!.trim());
  return values.length === 0 || values.some((value) => value.length === 0) ? undefined : Object.freeze(values);
}

function skillAuthority(root: string, id: string): AgencyWorkAuthority["skill"] {
  const skillId = safeIdentifier(id, "skill");
  const file = join(root, "lib", "agency", "skills", skillId, "SKILL.md");
  let source: string;
  try {
    source = readFileSync(file, "utf8");
  } catch (error) {
    throw new TypeError(`firm pool: cannot read skill/${skillId}: ${error instanceof Error ? error.message : String(error)}`);
  }
  // Closure facts are explicit skill facts.  Description prose is never used
  // as a default because it cannot establish a callable closure route.
  const closureKind = frontmatterValue(source, "skill-closure-kind");
  const requiresCapabilities = frontmatterList(source, "requires-capabilities");
  if (closureKind === undefined || !CLOSURE_KINDS.has(closureKind) || requiresCapabilities === undefined) {
    throw new TypeError(`firm pool: skill/${skillId} lacks declared closure-kind and requires-capabilities`);
  }
  const method = source.replace(/^---\s*\n[\s\S]*?^---\s*\n?/mu, "").trim();
  if (method.length === 0) throw new TypeError(`firm pool: skill/${skillId} lacks a canonical method body`);
  return Object.freeze({ id: skillId, closureKind: closureKind as AgencyWorkAuthority["skill"]["closureKind"], requiresCapabilities, method });
}

/** Build one resolver at process startup from an absolute, local firm pool. */
export function firmPoolAuthorityResolver(
  { firmPoolRoot }: { readonly firmPoolRoot: string },
): (allocation: AgencyWorkAllocation) => AgencyWorkAuthority {
  if (!isAbsolute(firmPoolRoot)) throw new TypeError("firm pool: root must be an absolute local path");
  const root = resolve(firmPoolRoot);
  const agencyRoot = join(root, "lib", "agency");
  return (allocation) => {
    const dutyId = allocation.duty.startsWith(DUTY_PREFIX)
      ? allocation.duty.slice(DUTY_PREFIX.length)
      : allocation.duty;
    const duty = readJson(root, "duties", dutyId);
    const office = readJson(root, "offices", allocation.office.id);
    const workId = stringOf(duty, "work", `duties/${dutyId}`);
    const work = readJson(root, "works", workId);
    const dutySkills = stringsOf(duty, "skills", `duties/${dutyId}`);
    if (dutySkills.length !== 1) throw new TypeError(`firm pool: duties/${dutyId} must name exactly one allocation skill`);
    const requestedSkill = dutySkills[0]!;
    const skill = skillAuthority(root, requestedSkill);
    const officeProfile = recordOf(office["deontic-profile"], `offices/${allocation.office.id}`);
    const profile = Object.fromEntries(Object.entries(officeProfile).filter(([, value]) => typeof value === "string")) as Record<string, string>;
    // `agencyRoot` is intentionally touched here so startup refuses a root
    // that cannot possibly supply the three canonical record pools.
    if (!agencyRoot.startsWith(root)) throw new TypeError("firm pool: agency root escapes configured root");
    return Object.freeze({
      office: Object.freeze({
        id: stringOf(office, "id", `offices/${allocation.office.id}`),
        bearsDuty: stringsOf(office, "bears-duty", `offices/${allocation.office.id}`),
        deonticProfile: Object.freeze(profile),
      }),
      duty: Object.freeze({
        id: `${DUTY_PREFIX}${stringOf(duty, "id", `duties/${dutyId}`)}`,
        work: workId,
        claim: stringOf(duty, "claim", `duties/${dutyId}`),
        skills: dutySkills,
        delegation: booleanOf(duty, "delegation", `duties/${dutyId}`),
      }),
      work: Object.freeze({
        id: stringOf(work, "id", `works/${workId}`),
        needs: stringsOf(work, "needs", `works/${workId}`),
        receiverCondition: stringOf(work, "to", `works/${workId}`),
      }),
      skill,
      officeService: Object.freeze({ id: allocation.duty, requiredCapabilities: skill.requiresCapabilities }),
    });
  };
}
