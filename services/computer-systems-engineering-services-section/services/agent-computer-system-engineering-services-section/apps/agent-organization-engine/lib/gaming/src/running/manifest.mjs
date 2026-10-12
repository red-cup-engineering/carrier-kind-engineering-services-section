/**
 * Game manifest — the catalog record of one playable game: its identity, configurations,
 * entry points, how its seed is chosen, the version of its play record, and the module that
 * verifies a stored play (`playVerifier` in `./rules.mjs`).
 *
 * The contract is a JSON Schema checked by the house's one evaluator; the only rule a schema
 * cannot state (configuration ids unique by value) is checked beside it. Errors read
 * `<dotted.path>: <message>`, every one collected.
 */

import { validateJsonSchema } from "@red-cup-engineering/json-schema-services-section/validation";

const urlSafeId = { type: "string", pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$" };
const text = { type: "string", minLength: 1 };

export const gameManifestSchema = Object.freeze({
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "gaming/game-manifest",
  type: "object",
  required: ["id", "displayName", "description", "subdomain", "entryPoints", "seedPolicy", "intentLog", "replayVerifier", "keywords"],
  properties: {
    id: urlSafeId,
    displayName: text,
    description: text,
    subdomain: urlSafeId,
    configs: {
      type: "array",
      items: { type: "object", required: ["id", "displayName", "params"], properties: { id: text, displayName: text, params: { type: "object" } } },
    },
    entryPoints: {
      type: "object",
      properties: { browser: text, headless: text },
      anyOf: [{ required: ["browser"] }, { required: ["headless"] }],
    },
    seedPolicy: { type: "object", required: ["kind"], properties: { kind: { enum: ["daily-utc", "on-demand", "client-supplied"] } } },
    intentLog: { type: "object", required: ["schemaVersion"], properties: { schemaVersion: text, schemaRef: text } },
    replayVerifier: text,
    energy: { type: "object", required: ["hooksRef", "accountNamespace"], properties: { hooksRef: text, accountNamespace: text } },
    keywords: { type: "array", items: { type: "string" } },
  },
});

const dotted = (pointer) => pointer.split("/").slice(1).map((part) => (/^\d+$/u.test(part) ? `[${part}]` : `.${part}`)).join("").replace(/^\./u, "");

function issueText(issue) {
  if (issue.keyword === "required") {
    const missing = /'([^']+)'/u.exec(issue.message)?.[1] ?? "";
    const where = dotted(issue.path);
    return `${where === "" ? missing : `${where}.${missing}`}: is required`;
  }
  if (issue.keyword === "anyOf" && issue.path === "/entryPoints") return "entryPoints: at least one of browser or headless must be present";
  return `${dotted(issue.path)}: ${issue.message}`;
}

export function validateGameManifest(data) {
  const result = validateJsonSchema(data, gameManifestSchema);
  const errors = result.issues.map(issueText);
  if (Array.isArray(data?.configs)) {
    const seen = new Set();
    for (const config of data.configs) {
      const id = config?.id;
      if (typeof id !== "string") continue;
      if (seen.has(id)) errors.push(`configs: duplicate config id "${id}"`);
      seen.add(id);
    }
  }
  return { valid: errors.length === 0, errors: [...new Set(errors)] };
}

export const isGameManifest = (data) => validateGameManifest(data).valid;

/** Validate and return `data`, or throw one `TypeError` listing every error. */
export function assertGameManifest(data) {
  const result = validateGameManifest(data);
  if (!result.valid) throw new TypeError(`invalid game manifest:\n  ${result.errors.join("\n  ")}`);
  return data;
}
