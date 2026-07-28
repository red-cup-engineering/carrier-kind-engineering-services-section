import { access, glob, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, join, relative, resolve, sep } from "node:path";

export const VOXEL_PROFILE = "org.harmonious-union.semiotic-voxel.v1";

const DEPENDENCY_FIELDS = Object.freeze([
  "dependencies",
  "devDependencies",
  "optionalDependencies",
  "peerDependencies",
]);

const SOURCE_EXTENSIONS = new Set([
  ".cjs", ".cts", ".js", ".json", ".jsx", ".mjs", ".mts", ".ts", ".tsx",
]);

const MODULE_SPECIFIER = /(?<!["'])((?:\bfrom\s*|\bimport\s*(?:\(\s*)?|\brequire\s*\()\s*)(["'])(\.{1,2}\/[^"']+)\2/gu;

const EXCLUDED_TERRITORIES = Object.freeze([
  "**/node_modules/**",
  "**/.git/**",
  "**/content/assets/legacy/**",
  "**/src/content/assets/legacy/**",
  "**/data/runtime-images/**",
  "**/dev/content/triage/prior-app/**",
  "**/.archive/**",
  "**/.cache/**",
  "**/.venv/**",
  "**/venv/**",
  "**/build/**",
  "**/dist/**",
]);

function slash(path) {
  return path.split(sep).join("/");
}

function packageLeaf(name, path) {
  const fromName = typeof name === "string" ? name.replace(/^@[^/]+\//u, "") : "";
  const leaf = fromName || slash(path).split("/").at(-1);
  return leaf.replace(/^eo-/u, "").replace(/[^a-z0-9-]+/gu, "-").replace(/^-+|-+$/gu, "");
}

export function ownerForPackagePath(path) {
  const value = `/${slash(path)}/`;
  const rules = [
    ["/services/561-group/services/red-cup-engineering/", "red-cup-engineering"],
    ["/services/561-group/services/lenticule-science/", "lenticule-science"],
    ["/services/561-group/services/rsc-quiescent/services/aagaard/", "aagaard"],
    ["/services/561-group/services/rsc-quiescent/services/agrodao/", "agrodao"],
    ["/services/561-group/services/rsc-quiescent/services/emsweb/", "emsweb"],
    ["/services/561-group/services/rsc-quiescent/services/koios-news/", "koios-news"],
    ["/services/561-group/services/rsc-quiescent/services/turntide-islands/", "turntide-islands"],
    ["/services/561-group/services/rsc-quiescent/", "rsc-quiescent"],
    ["/services/561-group/services/union-officer-academy/", "union-officer-academy"],
    ["/services/561-group/services/rsc-quiescent/services/persistent-machines-services-section/services/bare-cedar-fog-services-section/services/bare-cedar-fog-codex-enterprise/", "bare-cedar-fog"],
    ["/services/561-group/services/rsc-quiescent/services/persistent-machines-services-section/services/bare-cedar-fog-services-section/services/bare-cedar-fog-private-transport/", "bare-cedar-fog"],
    ["/services/561-group/services/rsc-quiescent/services/persistent-machines-services-section/services/bare-cedar-fog-services-section/services/bare-cedar-fog-cloudflare-ingress/", "bare-cedar-fog"],
    ["/services/561-group/sites/", "561-group"],
    ["/services/561-group/services/", "561-group"],
    ["/services/561-group/lib/", "561-group"],
    ["/services/board-of-directors/", "harmonious-union"],
  ];
  const match = rules.find(([needle]) => value.includes(needle));
  if (!match) throw new Error(`no sovereign package owner for ${path}`);
  return match[1];
}

function operationsOf(manifest) {
  return Object.keys(manifest["x-agentic-metro-enterprise"]?.["operation-catalog"] ?? {}).sort();
}

function capabilitiesOf(manifest, path) {
  const leaf = packageLeaf(manifest.name, path);
  const capabilities = new Map();
  const catalog = manifest["x-agentic-metro-enterprise"]?.["operation-catalog"] ?? {};
  for (const operation of operationsOf(manifest)) {
    const declared = catalog[operation]?.capability;
    const capability = typeof declared === "string" && declared ? declared : leaf;
    const members = capabilities.get(capability) ?? [];
    members.push(operation);
    capabilities.set(capability, members.sort());
  }
  return capabilities;
}

function organizational(manifest, path) {
  const kind = String(manifest["x-agentic-metro-enterprise"]?.["organizational-kind"] ?? "");
  const leaf = slash(dirname(path)).split("/").at(-1);
  const named = packageLeaf(manifest.name, path);
  return /(?:section|sector|team|board|office|colony|enterprise)$/u.test(leaf)
    || /(?:section|sector|team|board|office|colony|enterprise)$/u.test(named)
    || /(?:section|sector|team|board|office|colony|enterprise)/u.test(kind);
}

export function classifyPackageVoxel(manifest, path) {
  const operations = operationsOf(manifest);
  const capabilities = capabilitiesOf(manifest, path);
  if (organizational(manifest, path)) return { kind: "actor", operations, capabilities: [...capabilities] };
  if (capabilities.size === 1) return { kind: "capability-cell", operation: [...capabilities][0][0], operations, capabilities: [...capabilities] };
  if (capabilities.size > 1) return { kind: "aggregate-capability-defect", operations, capabilities: [...capabilities] };
  const leaf = packageLeaf(manifest.name, path);
  if (manifest.bin || /(?:assay|border|broker|cell|gateway|provider|readout|service)$/u.test(leaf)) {
    return { kind: "capability-cell", operation: leaf, operations: [leaf], capabilities: [[leaf, [leaf]]] };
  }
  return { kind: "inert-material", operations, capabilities: [] };
}

async function packageBodyManifests(root) {
  const candidates = new Set();
  for await (const path of glob("lib/emsenn/services/**/package.json", { cwd: root, exclude: EXCLUDED_TERRITORIES })) candidates.add(path);
  const named = [];
  for (const path of [...candidates].sort()) {
    const manifest = JSON.parse(await readFile(resolve(root, path), "utf8"));
    if (typeof manifest.name === "string" && manifest.name.length > 0) named.push(path);
  }
  return named;
}

function exactVersion(manifest) {
  return /^\d+\.\d+\.\d+$/u.test(manifest.version ?? "") ? manifest.version : "0.1.0";
}

function rewriteDependencyValue(value, providerVersion) {
  return typeof value === "string" ? providerVersion : value;
}

function rewriteManifest(manifest, path, identities, identitiesByDirectory) {
  const priorName = manifest.name;
  const identity = identities.get(priorName);
  const voxel = classifyPackageVoxel(manifest, path);
  const result = { ...manifest, name: identity.name, version: exactVersion(manifest) };
  if (result.packageManager?.startsWith("pnpm@")) delete result.packageManager;
  if (result.engines?.pnpm) {
    result.engines = { ...result.engines };
    delete result.engines.pnpm;
    if (Object.keys(result.engines).length === 0) delete result.engines;
  }
  if (result.scripts) result.scripts = Object.fromEntries(Object.entries(result.scripts).map(([name, command]) => [
    name,
    typeof command === "string" ? command.replaceAll("pnpm run ", "npm run ").replaceAll("pnpm test", "npm test") : command,
  ]));
  for (const field of DEPENDENCY_FIELDS) {
    if (!manifest[field]) continue;
    result[field] = Object.fromEntries(Object.entries(manifest[field]).map(([name, value]) => {
      const local = typeof value === "string" ? value.match(/^(?:file:|link:)(.+)$/u) : null;
      const localDirectory = local ? resolve(dirname(resolve(identity.root, path)), local[1]) : null;
      const provider = (localDirectory && identitiesByDirectory.get(localDirectory)) || identities.get(name);
      return provider
        ? [provider.name, rewriteDependencyValue(value, provider.version)]
        : [name, value];
    }));
  }
  result["x-semiotic-voxel"] = {
    profile: VOXEL_PROFILE,
    owner: identity.owner,
    kind: voxel.kind,
    actor: manifest["x-agentic-metro-enterprise"]?.actor ?? `urn:ame:${packageLeaf(priorName, path)}`,
    operations: voxel.operations,
    capabilities: voxel.capabilities.map(([capability, faces]) => ({ capability, faces })),
    package: identity.name,
  };
  return result;
}

async function sourceFiles(root, manifestPaths) {
  const directories = manifestPaths.map((path) => slash(dirname(path))).sort((left, right) => right.length - left.length);
  const files = [];
  // Active carriers nest. Scanning once per carrier made a full-repository
  // normalization quadratic and prevented the migration from ever producing
  // a receipt at its real (hundreds-of-packages) scale. Enumerate the active
  // service body once, then retain files carried by a declared package.
  // Package identity is normative in package.json. This pass rewrites active
  // executable import edges; records, schemas, and preserved content have
  // their own projections and must not turn a package cutover into an archive
  // crawl. JSON remains supported for executable configuration outside content.
  const extensions = [...SOURCE_EXTENSIONS].map((extension) => extension.slice(1)).sort().join(",");
  for await (const path of glob(`lib/emsenn/services/**/*.{${extensions}}`, {
    cwd: root,
    exclude: ["**/node_modules/**", "**/.git/**", "**/data/**", "**/content/**", "**/dev/**", "**/dist/**", "**/test/**", "**/tests/**"],
  })) {
    const extension = extname(path);
    const carried = directories.some((directory) => path === directory || path.startsWith(`${directory}/`));
    if (carried && SOURCE_EXTENSIONS.has(extension) && !path.endsWith("package-lock.json") && !path.endsWith("package.json")) files.push(path);
  }
  return [...new Set(files)].sort();
}

function inside(root, candidate) {
  const displacement = relative(root, candidate);
  return displacement === "" || (displacement !== ".." && !displacement.startsWith(`..${sep}`));
}

async function resolveModuleTarget(path) {
  for (const candidate of [path, `${path}.js`, `${path}.mjs`, `${path}.cjs`, `${path}.json`, join(path, "index.js"), join(path, "index.mjs"), join(path, "index.cjs")]) {
    try { await access(candidate); return candidate; } catch (error) { if (error?.code !== "ENOENT") throw error; }
  }
  return null;
}

function exposeProviderTarget(manifest, target) {
  const key = `./${target.replace(/^\.\//u, "")}`;
  const prior = manifest.exports;
  let exportsMap;
  if (prior === undefined) exportsMap = {};
  else if (typeof prior === "string" || Array.isArray(prior) || (prior && typeof prior === "object" && !Object.keys(prior).some((name) => name.startsWith(".")))) exportsMap = { ".": prior };
  else exportsMap = { ...prior };
  exportsMap[key] = key;
  manifest.exports = exportsMap;
  return key;
}

async function rewriteCrossPackageImports({ root, files, rewritten }) {
  const carriers = rewritten.map((row) => ({ ...row, directory: dirname(resolve(root, row.path)) })).sort((left, right) => right.directory.length - left.directory.length);
  const carrierByDirectory = new Map(carriers.map((carrier) => [carrier.directory, carrier]));
  // Carrier territories nest. Resolving a file through `find` over every
  // carrier made each import proportional to the entire package body. Walk
  // ancestors instead: a path has one nearest carrier and the lookup is
  // bounded by its depth, independent of the number of package cells.
  const carrierOf = (path) => {
    let directory = dirname(path);
    for (;;) {
      const carrier = carrierByDirectory.get(directory);
      if (carrier) return carrier;
      const parent = dirname(directory);
      if (parent === directory) return null;
      directory = parent;
    }
  };
  const changed = [];
  const edges = new Set();
  for (const path of files) {
    const absolute = resolve(root, path);
    const consumer = carrierOf(absolute);
    if (!consumer) continue;
    const before = await readFile(absolute, "utf8");
    let cursor = 0;
    let after = "";
    for (const match of before.matchAll(MODULE_SPECIFIER)) {
      const target = await resolveModuleTarget(resolve(dirname(absolute), match[3]));
      const provider = target ? carrierOf(target) : null;
      if (!provider || provider === consumer) continue;
      const providerRelative = slash(relative(provider.directory, target));
      const providerSubpath = exposeProviderTarget(provider.after, providerRelative);
      consumer.after.dependencies = { ...consumer.after.dependencies, [provider.after.name]: provider.after.version };
      const replacement = `${match[1]}${match[2]}${provider.after.name}/${providerSubpath.slice(2)}${match[2]}`;
      after += before.slice(cursor, match.index) + replacement;
      cursor = match.index + match[0].length;
      edges.add(`${consumer.after.name}->${provider.after.name}:${providerSubpath}`);
    }
    if (cursor > 0) {
      after += before.slice(cursor);
      changed.push({ path, before, after });
    }
  }
  return { changed, edges: [...edges].sort() };
}

function replaceIdentities(text, replacements) {
  let result = text;
  for (const [before, after] of replacements) result = result.replaceAll(before, after);
  return result;
}

export async function normalizePackageBody({ root = process.cwd(), apply = false } = {}) {
  const absoluteRoot = resolve(root);
  const manifestPaths = await packageBodyManifests(absoluteRoot);
  const packages = await Promise.all(manifestPaths.map(async (path) => ({
    path,
    manifest: JSON.parse(await readFile(resolve(absoluteRoot, path), "utf8")),
  })));
  const duplicateOld = Object.entries(Object.groupBy(packages, ({ manifest }) => manifest.name ?? ""))
    .filter(([name, rows]) => !name || rows.length > 1);
  if (duplicateOld.length) throw new Error(`active package identities are ambiguous: ${duplicateOld.map(([name]) => name || "<unnamed>").join(", ")}`);
  const primaryIdentities = packages.map(({ path, manifest }) => {
    const owner = ownerForPackagePath(path);
    return { owner, name: `@${owner}/${packageLeaf(manifest.name, path)}`, version: exactVersion(manifest), path, root: absoluteRoot, priorName: manifest.name };
  });
  const collisions = Object.entries(Object.groupBy(primaryIdentities, ({ name }) => name)).filter(([, rows]) => rows.length > 1);
  if (collisions.length) throw new Error(`normalized package identities collide: ${collisions.map(([name]) => name).join(", ")}`);
  const identities = new Map(primaryIdentities.map((identity) => [identity.priorName, identity]));
  const identitiesByDirectory = new Map(primaryIdentities.map((identity) => [dirname(resolve(absoluteRoot, identity.path)), identity]));
  const byLeaf = Object.groupBy(primaryIdentities, (identity) => packageLeaf(identity.priorName, identity.path));
  for (const [leaf, rows] of Object.entries(byLeaf)) {
    if (rows.length === 1) identities.set(`@emsenn/${leaf}`, rows[0]);
  }
  const replacements = [...identities.entries()].map(([before, identity]) => [before, identity.name]).filter(([before, after]) => before !== after).sort((a, b) => b[0].length - a[0].length);
  const rewritten = packages.map(({ path, manifest }) => ({ path, before: manifest, after: rewriteManifest(manifest, path, identities, identitiesByDirectory) }));
  const files = await sourceFiles(absoluteRoot, manifestPaths);
  const crossPackage = await rewriteCrossPackageImports({ root: absoluteRoot, files, rewritten });
  const crossPackageByPath = new Map(crossPackage.changed.map((row) => [row.path, row]));
  const sourceRewrites = [];
  for (const path of files) {
    const before = await readFile(resolve(absoluteRoot, path), "utf8");
    const after = replaceIdentities(crossPackageByPath.get(path)?.after ?? before, replacements);
    if (before !== after) sourceRewrites.push({ path, before, after });
  }
  const manifestRewrites = rewritten.filter(({ before, after }) => JSON.stringify(before) !== JSON.stringify(after));
  if (apply) {
    await Promise.all([
      ...manifestRewrites.map(({ path, after }) => writeFile(resolve(absoluteRoot, path), `${JSON.stringify(after, null, 2)}\n`, "utf8")),
      ...sourceRewrites.map(({ path, after }) => writeFile(resolve(absoluteRoot, path), after, "utf8")),
    ]);
  }
  const byKind = Object.fromEntries([...new Set(rewritten.map(({ after }) => after["x-semiotic-voxel"].kind))].sort().map((kind) => [kind, rewritten.filter(({ after }) => after["x-semiotic-voxel"].kind === kind).length]));
  return Object.freeze({
    type: "SemioticVoxelPackageNormalizationReceipt",
    version: 1,
    applied: apply,
    packages: rewritten.length,
    manifestFilesChanged: manifestRewrites.length,
    identitiesChanged: rewritten.filter(({ before, after }) => before.name !== after.name).length,
    identityAliasesKnown: replacements.length,
    consumerFilesChanged: sourceRewrites.length,
    packageContractEdgesChanged: crossPackage.edges.length,
    byKind,
    aggregateDefects: rewritten.filter(({ after }) => after["x-semiotic-voxel"].kind === "aggregate-capability-defect").map(({ path, after }) => ({ path, package: after.name, operations: after["x-semiotic-voxel"].operations })),
    unarticulatedDefects: rewritten.filter(({ after }) => after["x-semiotic-voxel"].kind === "unarticulated-capability-defect").map(({ path, after }) => ({ path, package: after.name })),
  });
}
