/**
 * CSE locators for computer-data, computer-code, networking, and systems
 * terms. Their semantic definitions retain their existing source owners.
 * Consumers resolve explicit owner references; they do not copy definitions.
 */
import { TmSchema, TySchema } from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation";
import specification from "../specifications/computer-engineering.specification.json" with { type: "json" };

/** Exact owner schemas required to resolve the local SEN term reference.
 * These are source objects, not a private grammar or an import-time registry. */
export const COMPUTER_ENGINEERING_SEN_SCHEMA_REFERENCES = Object.freeze([TySchema, TmSchema]);

export const COMPUTER_ENGINEERING_SPECIFICATION_ID = "https://schemas.561.group/computer/computer-engineering.schema.json";
export const COMPUTER_ENGINEERING_SPECIFICATION_DOCUMENT = new URL("../specifications/computer-engineering.specification.json", import.meta.url);
const token = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/** Locate the indexed schema. A locator does not promise graph availability. */
export function computerEngineeringTermSchema(tokenName) {
    if (!token.test(tokenName))
        throw new TypeError("engineering term token must be lowercase kebab-case");
    if (!Object.hasOwn(specification.terms, tokenName))
        throw new TypeError("engineering term is not indexed");
    return new URL(specification.terms[tokenName].schema, COMPUTER_ENGINEERING_SPECIFICATION_DOCUMENT);
}
