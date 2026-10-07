/**
 * enterprise/documents — the Group's legal entities and the documents its businesses draft.
 *
 * A micro-enterprise is not a legal person (Rendanheyi glossary: xiaowei, "not a subsidiary");
 * the company that signs for it is. Legal entities are agency records (pool `entities`): a legal
 * name, form, state, standing (proposed until filed) and the enterprises they carry. Every
 * business's document drafts read their contracting party from their enterprise's entity, so a
 * contract names the company once it exists and says plainly when it does not yet.
 * @packageDocumentation
 */

/** The standings a legal entity passes through. */
export const ENTITY_STANDINGS = Object.freeze(["proposed", "filed", "terminated"]);

/** A legal entity record in the business's own terms. */
export function legalEntityOf(record) {
  const standing = record.standing ?? "proposed";
  if (!ENTITY_STANDINGS.includes(standing)) throw new TypeError(`entity ${record.id}: standing is one of ${ENTITY_STANDINGS.join(", ")}`);
  return Object.freeze({
    id: record.id,
    key: record.key,
    legalName: record.legalName ?? record.id,
    form: record.form ?? "limited liability company",
    state: record.state ?? null,
    standing,
    filed: record.filed ?? null,
    fileNumber: record.fileNumber ?? null,
    management: record.management ?? null,
    enterprises: Object.freeze([...(record.enterprises ?? [])]),
    packet: record.packet ?? null,
    // The entity's own holdings book, relative to its section; its micro-enterprises keep their own.
    book: record.book ?? null,
    sectionPath: record.sectionPath ?? null,
    // Each entry names a principal by id (`{ principal, ... }`); the id is resolved against the
    // `principals` pool (organizing/enterprise's principalsIn), never a value stored here.
    members: Object.freeze((record.members ?? []).map((m) => Object.freeze({ ...m }))),
    managers: Object.freeze((record.managers ?? []).map((m) => Object.freeze({ ...m }))),
  });
}

/**
 * A principal record in the business's own terms: a real person or organization an entity names
 * as a member or manager. Carries only public or personal information (name, address, role) —
 * never a private-tier credential (SSN, ITIN, bank details): see the `agency-records-must-not
 * -carry-private-information` rule and the private/personal/public glossary term it implements.
 */
export function principalOf(record) {
  return Object.freeze({
    id: record.id,
    key: record.key,
    name: record.name ?? record.id,
    address: record.address ?? null,
    role: record.role ?? null,
  });
}

/**
 * How a document names the company that signs: "561 Group LLC, a Minnesota limited liability
 * company" once filed; before filing, the same with "(not yet formed)", since a person who signs
 * for a company that does not exist yet answers for the contract personally.
 */
export function contractingParty(entity) {
  if (!entity) return undefined;
  const described = `${entity.legalName}, a ${entity.state ? `${entity.state} ` : ""}${entity.form}`;
  return entity.standing === "filed" ? described : `${described} (not yet formed)`;
}

/**
 * Fill a document template: `{{name}}` markers take the named value (numbers with thousands
 * separators), and a missing value leaves a blank line to write in by hand.
 */
export function fillTemplate(template, values) {
  return template.replace(/\{\{\s*([a-zA-Z][\w-]*)\s*\}\}/g, (_, name) => {
    const value = values[name];
    if (value === undefined || value === null || value === "") return "____________";
    return typeof value === "number" ? value.toLocaleString("en-US", { maximumFractionDigits: 3 }) : String(value);
  });
}

/** A template's text without its frontmatter. */
export const templateBody = (text) => text.replace(/^---[\s\S]*?---\n/, "");
