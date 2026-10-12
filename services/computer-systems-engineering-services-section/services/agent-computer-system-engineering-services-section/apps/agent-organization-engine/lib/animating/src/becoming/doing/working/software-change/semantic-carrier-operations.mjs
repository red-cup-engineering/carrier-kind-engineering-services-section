/** Native AOE faces of the existing witnessed deterministic generator. */
import { mkdir, realpath } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { generateSemanticCarriersWork } from "./semantic-carrier-generation.mjs";

const text = { type: "string", minLength: 1 };
const fields = { owner: text, specificationsDir: text, outFile: text, schemaTypeImport: text };

async function within(root, path, output = false) {
  if (isAbsolute(path)) throw new TypeError("software work paths must be relative to their bound root");
  const base = await realpath(root);
  const target = resolve(base, path);
  const parent = await realpath(output ? dirname(target) : target);
  const rel = relative(base, parent);
  if (rel === ".." || rel.startsWith("../") || isAbsolute(rel)) throw new TypeError("software work path escapes its bound root");
  // Existing output symlinks must not redirect the generator outside its owner.
  if (output) {
    try { if (await realpath(target) !== target) throw new TypeError("generated output must not be a symlink"); }
    catch (error) { if (error.code !== "ENOENT") throw error; }
  }
  return output ? target : parent;
}

/** Installation exposes resources; authorization remains the native invocation's responsibility.
 * The subject comes from that invocation, never from provider-supplied arguments.
 * Journals stay in the host's supplied persistent data root, outside release source.
 */
export function semanticCarrierOperations(binding, options = {}) {
  const repositoryRoot = options.root ?? binding?.repositoryRoot;
  const dataRoot = binding?.dataRoot;
  if (!repositoryRoot || !dataRoot) throw new TypeError("software work needs bound repository and persistent data roots");
  return Object.freeze(["plan", "apply", "check"].map(action => operation({
    verb: "aoe-semantic-carriers-" + action,
    relation: "boundary", locus: "owner", inputFormat: "json", outputFormat: "json",
    summary: action + " schema-derived source through AOE's witnessed generator",
    description: "Uses the existing deterministic generator, not inference. Paths are relative to the named owner within the bound repository. Plan records an exact SignChain proposal; apply requires that unfinished proposal, unchanged schemas and output identity, and records the read-back result. Check observes agreement with the current specifications. The invoking subject is attribution, not receiving or a new authority grant. No registry publication or work discharge is performed.",
    domain: schemaFrom({ $id: "aoe/software/semantic-carriers/" + action + "/input",
      type: "object", additionalProperties: false,
      required: ["owner", "specificationsDir", "outFile", ...(action === "check" ? [] : ["journal"])],
      properties: { ...fields, ...(action === "check" ? {} : { journal: { type: "string", pattern: "^[a-z0-9][a-z0-9._-]{0,127}$" } }) },
    }),
    codomain: schemaFrom({ $id: "aoe/software/semantic-carriers/" + action + "/output", type: "object" }),
    effects: { class: action === "plan" ? "journal-write" : action === "check" ? "host-read" : "external",
      replay: action === "check" ? "safe" : "coordinated", coordination: "coordination-required",
      deterministic: true, totality: "partial" },
    run: async (input, _args, context) => {
      const actor = context?.invocation?.subject;
      if (typeof actor !== "string" || !actor.trim()) throw new TypeError("software work needs the invoking subject");
      const owner = await within(repositoryRoot, input.owner);
      const specificationsDir = await within(owner, input.specificationsDir);
      const outFile = await within(owner, input.outFile, true);
      let journalPath;
      if (action !== "check") {
        const journals = join(dataRoot, "software-work");
        if (action === "plan") await mkdir(journals, { recursive: true });
        journalPath = join(journals, input.journal + ".jsonl");
      }
      return generateSemanticCarriersWork({ specificationsDir, outFile, actor,
        ...(input.schemaTypeImport === undefined ? {} : { schemaTypeImport: input.schemaTypeImport }),
        journalPath, write: action === "apply", check: action === "check" });
    },
  })));
}
