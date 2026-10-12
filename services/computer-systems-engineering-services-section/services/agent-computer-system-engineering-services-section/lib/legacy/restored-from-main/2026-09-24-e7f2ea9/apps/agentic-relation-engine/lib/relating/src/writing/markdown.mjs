/**
 * writing/markdown — Markdown flatfiles with optional frontmatter, projected into
 * EAVT-shaped assertions.
 *
 * Filesystem reads/writes are outside this boundary; callers provide the markdown
 * text and witness. Frontmatter unfolds into the same object-spelled EAVT rows
 * the schema writer uses, so a document is a settled fold of its own assertions
 * and its conformance is a four-valued charge, not a boolean lint.
 */
import { restrict,                } from "@red-cup-engineering/computer-content-engineering-services-section/typed-resource-classification";
import { splitMarkdownFrontmatterFence } from "@red-cup-engineering/markdown-engineering-services-section/split-markdown-frontmatter-fence";
import { readMarkdownFrontmatter } from "@red-cup-engineering/markdown-engineering-services-section/read-markdown-frontmatter";
import { canonical } from "@red-cup-engineering/json-services-section";
import {                                        unfoldSchema } from "./schema.mjs";
import { stringProjector } from "./text.mjs";

const extensionOf = (path        )         => {
  const name = path.split("/").filter(Boolean).at(-1) ?? path;
  const index = name.lastIndexOf(".");
  return index <= 0 ? "" : name.slice(index).toLowerCase();
};

export const DOC_TYPE_STAMP = "tx-document-types";

export const markdownProjector                       = restrict(stringProjector, {
  type: "markdown",
  // Prose that carries addressable assertions: it unfolds into EAVT rows, so it
  // climbs from the `bottom` string corner to the `assertion` corner (the ≤_k edge
  // toward triples) while its read stays at the identity rung.
  corner: "assertion",
  recognize: (resource) => [".md", ".markdown"].includes(extensionOf(resource.path)),
  // The write leg: an entity view carried in a singleton list is projected to a
  // markdown-with-frontmatter document. `markdownDataform` is its inverse leg,
  // and `markdownDataform(createMarkdown(view)) ≈ view` is the holographic
  // counit (content is a faithful projection of the cells it folds back to).
  write: (items) => {
    if (items.length === 0) return "";
    const first = items[0];
    return first !== null && typeof first === "object" && !Array.isArray(first)
      ? createMarkdown(first                                       )
      : String(first ?? "");
  },
});

/** Project one entity view to a markdown document: scalar attributes become
 *  `key: value` frontmatter lines, set-valued (array) attributes become YAML
 *  block lists, and the body attribute becomes the markdown body. The inverse
 *  of `markdownDataform`; emits no frontmatter fences when nothing remains.
 *
 * @example
 * ```js
 * import { createMarkdown, markdownDataform } from "@red-cup-engineering/relating/writing";
 *
 * const text = createMarkdown({
 *   slug: "relating",
 *   title: "Relating",
 *   body: "# Relating\n",
 * });
 *
 * markdownDataform(text, { witness: "README.md" }).subject; // "relating"
 * ```
 */
export function createMarkdown(view                                     , opts                        = {})         {
  const bodyKey = opts.bodyKey ?? "body";
  const rawBody = opts.body ?? view[bodyKey];
  const body = typeof rawBody === "string" ? rawBody : "";
  const lines           = [];
  for (const key of Object.keys(view).sort()) {
    if (key === bodyKey) continue;
    const value = view[key];
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      lines.push(`${key}:`);
      for (const item of value) lines.push(`  - ${serializeFrontmatterScalar(item)}`);
    } else {
      lines.push(`${key}: ${serializeFrontmatterScalar(value)}`);
    }
  }
  if (lines.length === 0) return body;
  return `---\n${lines.join("\n")}\n---\n${body}`;
}

/** A frontmatter scalar: emitted plain when it round-trips through YAML decoding
 *  as the same string, JSON-quoted otherwise (so `"true"`, `"3"`, and strings
 *  with structural characters never drift type on the read leg). */
function serializeFrontmatterScalar(value           )         {
  if (typeof value === "string") return isPlainScalar(value) ? value : JSON.stringify(value);
  return JSON.stringify(value);
}

function isPlainScalar(value        )          {
  if (value === "" || value !== value.trim()) return false;
  if (/[\n:#]/.test(value)) return false;
  if (/^["'[\]{}\-&*!|>%@`,]/.test(value)) return false;
  if (/^(true|false|null)$/.test(value)) return false;
  if (/^-?\d+(\.\d+)?$/.test(value)) return false;
  try {
    JSON.parse(value);
    return false;
  } catch {
    return true;
  }
}

export const markdownDocumentSchemaFragment             = Object.freeze({
  type: "object",
  additionalProperties: true,
  required: Object.freeze(["name", "description"]),
  properties: Object.freeze({
    name: Object.freeze({ type: "string", minLength: 1 }),
    description: Object.freeze({ type: "string", minLength: 1, maxLength: 300 }),
  }),
});

export const documentTypeDefinitions                                    = Object.freeze([
  Object.freeze({
    slug: "readme",
    title: "README",
    description: "A human-facing markdown-document named exactly README.md at a directory root.",
    filename: "^README\\.md$",
    placement: "{thing}/",
    bodySkeleton: "# {name}\n",
  }),
  Object.freeze({
    slug: "agents-guide",
    title: "Agents Guide",
    description: "An agent-facing markdown-document named exactly AGENTS.md at a directory root.",
    filename: "^AGENTS\\.md$",
    placement: "{thing}/",
    bodySkeleton: "# AGENTS.md\n",
  }),
  Object.freeze({
    slug: "claude-memory",
    title: "Claude Memory",
    description: "A markdown-document at a CLAUDE.md or CLAUDE.local.md location for project instruction memory.",
    filename: "^CLAUDE(\\.local)?\\.md$",
    placement: "{thing}/",
    bodySkeleton: "# CLAUDE.md\n",
  }),
  Object.freeze({
    slug: "heartbeat",
    title: "Heartbeat",
    description: "A markdown-document named exactly HEARTBEAT.md at a repository or package root.",
    filename: "^HEARTBEAT\\.md$",
    placement: "{thing}/",
    bodySkeleton: "# HEARTBEAT.md\n",
  }),
  Object.freeze({
    slug: "specification",
    title: "Specification",
    description: "A markdown-document named specification.md at {thing}/docs/dev/ for normative development specification.",
    filename: "^specification\\.md$",
    placement: "{thing}/docs/dev/",
    bodySkeleton: "# {name}\n",
  }),
  Object.freeze({
    slug: "development-journal-entry",
    title: "Development Journal Entry",
    description: "A date-stamped markdown-document at {thing}/docs/dev/journal/<YYYY-MM-DD>[-slug].md carrying historical narrative about the parent thing on the named date.",
    filename: "^\\d{4}-\\d{2}-\\d{2}(-[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)?\\.md$",
    placement: "{thing}/docs/dev/journal/",
    bodySkeleton: "# {title}\n",
    schemaFragment: Object.freeze({
      properties: Object.freeze({
        "entry-date": Object.freeze({ type: "string", format: "date" }),
        "session-of": Object.freeze({ type: "string" }),
        "superseded-by": Object.freeze({ type: "string" }),
      }),
    }),
  }),
  Object.freeze({
    slug: "development-document",
    title: "Development Document",
    description: "A markdown-document at {thing}/docs/dev/{slug}.md carrying development-stage prose.",
    filename: "^(?!specification\\.md$)[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.md$",
    placement: "{thing}/docs/dev/",
    bodySkeleton: "# {name}\n\n## Key Terms\n",
  }),
]);

export function parseMarkdown(text        )                      {
  const parsed = readMarkdownFrontmatter(text);
  return Object.freeze({
    frontmatter: parsed.format === "toml" ? Object.freeze({}) : parsed.frontmatter,
    format: parsed.format,
    body: parsed.body,
  })                       ;
}

export function frontmatterConformance(text        , opts                                = {})                         {
  const witness = opts.witness ?? "frontmatter";
  const format = splitMarkdownFrontmatterFence(text)?.format ?? null;
  const yaml = format === "yaml";
  const toml = format === "toml";
  const present = format !== null;
  const charge = (predicate                                     , modality                     , depth        , value                   )                         =>
    Object.freeze({
      predicate,
      modality,
      depth,
      value,
      evidence: value === "potential"
        ? Object.freeze([Object.freeze([witness]), Object.freeze([])]         )
        : value === "active"
          ? Object.freeze([Object.freeze([]), Object.freeze([witness])]         )
          : Object.freeze([Object.freeze([]), Object.freeze([])]         ),
    });
  const charges = Object.freeze([
    charge("has-frontmatter", "MUST", 0, present ? "potential" : "active"),
    charge("yaml-frontmatter", "SHOULD", 1, yaml ? "potential" : present ? "active" : "absurd"),
    charge("toml-frontmatter", "MAY", 2, toml ? "potential" : "absurd"),
  ]);
  const notes = charges
    .filter((entry) => entry.modality === "SHOULD" && entry.value === "active")
    .map((entry) => `SHOULD ${entry.predicate} (depth ${entry.depth})`);
  return Object.freeze({
    settled: true         ,
    conformant: charges.filter((entry) => entry.modality === "MUST").every((entry) => entry.value !== "active"),
    format: yaml ? "yaml"          : toml ? "toml"          : null,
    charges,
    notes: Object.freeze(notes),
  });
}

export function markdownDataform(text        , opts                                                         )                   {
  const parsed = parseMarkdown(text);
  const verdict = frontmatterConformance(text, { witness: opts.witness });
  const frontmatter = parsed.frontmatter ?? {};
  const subject = opts.subject ?? (typeof frontmatter["slug"] === "string" && frontmatter["slug"] ? frontmatter["slug"] : opts.witness);
  const assertions                      = [];
  const push = (a        , v           )       => {
    assertions.push(Object.freeze({ e: subject, a, v, t: opts.witness }));
  };
  for (const [key, value] of Object.entries(frontmatter)) {
    if (Array.isArray(value)) for (const item of value) push(key, frontmatterRowValue(item));
    else push(key, frontmatterRowValue(value));
  }
  push("body", parsed.body);
  const cells = assertions.map((assertion) => Object.freeze({
    cell: Object.freeze({ subject: assertion.e, predicate: assertion.a, object: assertion.v }),
    charge: Object.freeze({ value: Object.freeze([true, false]         ), evidence: Object.freeze([Object.freeze([opts.witness]), Object.freeze([])]         ) }),
  }));
  return Object.freeze({
    subject,
    format: parsed.format,
    conformant: verdict.conformant,
    verdict,
    frontmatter: Object.freeze(frontmatter),
    body: parsed.body,
    assertions: Object.freeze(assertions),
    cells: Object.freeze(cells),
  });
}

export function documentTypeFragment(definition                        )             {
  return Object.freeze({
    title: definition.title,
    description: definition.description,
    "x-trc-type": definition.slug,
    "x-trc-filename": definition.filename,
    "x-trc-placement": definition.placement,
    "x-trc-body-skeleton": definition.bodySkeleton,
    ...(definition.schemaFragment ?? {}),
  });
}

export function documentTypeAssertions(definition                        , opts

  = {})                    {
  const options = { ...(opts.base === undefined ? {} : { base: opts.base }), t: opts.t ?? DOC_TYPE_STAMP };
  return [
    ...unfoldSchema(markdownDocumentSchemaFragment, options),
    ...unfoldSchema(documentTypeFragment(definition), options),
  ];
}

export function allDocumentTypeAssertions(opts                                                  = {})                             {
  return Object.freeze(documentTypeDefinitions.flatMap((definition) => documentTypeAssertions(definition, opts)));
}

function frontmatterRowValue(value           )            {
  if (value !== null && typeof value === "object") return canonical(value);
  return value;
}
