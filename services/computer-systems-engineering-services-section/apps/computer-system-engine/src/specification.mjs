/**
 * The only schema family that defines computer-data, computer-code,
 * computer-networking, and computer-systems terms. Consumers carry these
 * locators into their bindings; they do not copy term definitions.
 */
export const COMPUTER_ENGINEERING_SPECIFICATION_ID = "https://schemas.561.group/computer/computer-engineering.schema.json";
export const COMPUTER_ENGINEERING_SPECIFICATION_DOCUMENT = new URL("../specifications/computer-engineering.specification.json", import.meta.url);
const token = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/** Locate the single `$token.schema.json` document for an engineering term. */
export function computerEngineeringTermSchema(tokenName) {
    if (!token.test(tokenName))
        throw new TypeError("engineering term token must be lowercase kebab-case");
    return new URL(`../specifications/${tokenName}.schema.json`, import.meta.url);
}
