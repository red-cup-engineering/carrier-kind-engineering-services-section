import { CATALOG_PROFILE, classifyResource, compileCatalog } from "./catalog.mjs";
import { immutable, semanticId } from "./canonical.mjs";

const WORKSPACE_CATALOG = compileCatalog({
  profile: CATALOG_PROFILE,
  nodes: [
    { type: "resource", parent: null, recognize: { op: "true" } },
    {
      type: "node-package-manifest",
      parent: "resource",
      recognize: {
        op: "all",
        clauses: [
          { op: "path-suffix", value: "package.json" },
          { op: "content-includes", value: "\"name\"" },
          { op: "content-includes", value: "\"version\"" },
        ],
      },
    },
  ],
}, { closed: true });

const DEPENDENCY_FIELDS = Object.freeze([
  ["dependencies", "runtime", false],
  ["optionalDependencies", "runtime", true],
  ["peerDependencies", "peer", false],
  ["devDependencies", "development", false],
]);

function text(value, label) {
  if (typeof value !== "string" || value.length === 0) throw new TypeError(`${label} must be a non-empty string`);
  return value;
}

function portablePath(value) {
  const path = text(value, "resource.path").replaceAll("\\", "/").replace(/^\.\//u, "");
  if (path.startsWith("/") || path === ".." || path.startsWith("../") || path.includes("/../") || path.includes("\0")) {
    throw new TypeError(`resource.path escapes the observed workspace: ${value}`);
  }
  return path;
}

function stringKeys(value) {
  if (value === undefined) return [];
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new TypeError("package dependency fields must be objects");
  return Object.entries(value).map(([name, requested]) => ({ name: text(name, "dependency name"), requested: text(requested, `${name} dependency request`) }));
}

function observe(raw, index) {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) throw new TypeError(`resources[${index}] must be an object`);
  const path = portablePath(raw.path);
  const content = text(raw.content, `resources[${index}].content`);
  let manifest;
  try { manifest = JSON.parse(content); }
  catch (error) { throw new TypeError(`${path} is not JSON: ${error.message}`); }
  const name = text(manifest.name, `${path}.name`), version = text(manifest.version, `${path}.version`);
  const classification = classifyResource(WORKSPACE_CATALOG, { path, content });
  if (classification.classification !== "node-package-manifest") throw new Error(`${path} did not classify as a Node package manifest`);
  return {
    name,
    version,
    path,
    manifest,
    manifestEvidence: classification.resource,
    classificationReceiptNi: classification.id,
    // The catalog NI identifies the recognition rules. Carry only the checked
    // CHL derivation spine here; duplicating every rule per package would turn
    // a compact presentation into stored bulk.
    proofPath: classification.proofPath.map(({ ordinal, type, parent, witnessed }) => ({ ordinal, type, parent, witnessed })),
  };
}

/**
 * Project an already admitted set of package-manifest readings as the complete
 * live workspace territory. Acquisition is deliberately outside this pure
 * projector: a browser Worker consumes its canonical receipt and never crawls
 * a filesystem or guesses workspace membership.
 */
export function catalogNodeWorkspaceSources({ resources }) {
  if (!Array.isArray(resources) || resources.length === 0) throw new TypeError("resources must be a non-empty admitted package-manifest set");
  const packages = resources.map(observe);
  const byName = new Map();
  for (const pkg of packages) {
    if (byName.has(pkg.name)) throw new TypeError(`workspace package identity is duplicated: ${pkg.name}`);
    byName.set(pkg.name, pkg);
  }
  const relations = [];
  for (const consumer of packages) {
    const claimed = new Map();
    for (const [field, role, defaultOptional] of DEPENDENCY_FIELDS) {
      for (const dependency of stringKeys(consumer.manifest[field])) {
        const optional = field === "peerDependencies"
          ? consumer.manifest.peerDependenciesMeta?.[dependency.name]?.optional === true
          : defaultOptional;
        const prior = claimed.get(dependency.name);
        const relation = {
          type: "node-package-dependency",
          consumer: consumer.name,
          provider: dependency.name,
          requested: dependency.requested,
          role,
          optional,
          scope: byName.has(dependency.name) ? "workspace" : "external",
          selected: byName.get(dependency.name)?.version ?? null,
        };
        // npm makes optionalDependencies override dependencies. Preserve that
        // one effective claim rather than presenting two conflicting edges.
        if (field === "optionalDependencies" || prior === undefined) claimed.set(dependency.name, relation);
      }
    }
    relations.push(...claimed.values());
  }
  const body = {
    type: "NodeWorkspaceSourceCatalogReceipt",
    version: 1,
    catalog: WORKSPACE_CATALOG.id,
    denominator: { type: "admitted-package-manifest-set", count: packages.length },
    packages: packages.map(({ manifest: _manifest, ...pkg }) => pkg)
      .sort((left, right) => left.name.localeCompare(right.name)),
    relations: relations.sort((left, right) => left.consumer.localeCompare(right.consumer)
      || left.provider.localeCompare(right.provider) || left.role.localeCompare(right.role)),
  };
  return immutable({ ...body, id: semanticId(body) });
}
