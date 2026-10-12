/** Interpret MetroPlat instance data independently of its host or transport. */
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, isAbsolute, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { defineType } from "@red-cup-engineering/computer-data-engineering-services-section/type-system";
import { createTypedMark } from "@red-cup-engineering/signcell/typed-mark";
import { operationSourcesFromFern, fernCatalogOptionsFrom } from "./fern-catalog.mjs";

const SPECIFIER = /^@[^/]+\/[^/]+(?:\/[A-Za-z0-9._-]+)*$/u;
const EXPORT = /^[A-Za-z_$][A-Za-z0-9_$]*$/u;
const INSTANCE_ID = /^[A-Za-z0-9@][A-Za-z0-9@._:/-]*$/u;
const identityDeclaration = defineType({
  id: "metroplat.instance.identity.v1",
  name: "MetroPlat instance identity",
  description: "Stable id, display title, and optional public origin of one MetroPlat instance",
  parents: [],
  schema: {
    type: "object", additionalProperties: false, required: ["id", "title"],
    properties: { id: { type: "string", minLength: 1 }, title: { type: "string", minLength: 1 }, origin: { type: "string", minLength: 1 } },
  },
});
if (!identityDeclaration.ok) throw new Error(identityDeclaration.refusal.message);
const applicationDeclaration = defineType({
  id: "metroplat.instance.application.v1",
  name: "MetroPlat application installation",
  description: "One named package export and the instance data that binds it",
  parents: [],
  schema: {
    type: "object", additionalProperties: false, required: ["module", "export"],
    properties: {
      module: { type: "string", minLength: 1 },
      export: { type: "string", minLength: 1 },
      configuration: { type: "object" },
    },
  },
});
if (!applicationDeclaration.ok) throw new Error(applicationDeclaration.refusal.message);
function identityCell(input) {
  const admitted = createTypedMark(identityDeclaration.value, input);
  if (!admitted.ok) throw new TypeError(admitted.refusal.message);
  const identity = admitted.value.content;
  if (!INSTANCE_ID.test(identity.id) || identity.title.trim() === "") {
    throw new TypeError("MetroPlat instance identity requires a stable id and nonempty title");
  }
  if (identity.origin !== undefined) {
    const origin = new URL(identity.origin);
    if (origin.protocol !== "https:" || origin.href !== `${origin.origin}/`) {
      throw new TypeError("MetroPlat instance origin must be one HTTPS origin");
    }
  }
  return admitted.value;
}
const defaultIdentityCell = identityCell({ id: "@red-cup-engineering/metroplat", title: "MetroPlat" });
export const DEFAULT_METROPLAT_IDENTITY = defaultIdentityCell.content;

async function readInstanceDefinition(instancePath) {
  const local = JSON.parse(await readFile(instancePath, "utf8"));
  if (local?.profile === undefined) return local;
  if (typeof local.profile !== "string" || !local.profile || isAbsolute(local.profile)) {
    throw new TypeError("MetroPlat instance profile must be a relative JSON path");
  }
  const profile = JSON.parse(await readFile(resolve(dirname(instancePath), local.profile), "utf8"));
  if (profile?.version !== 1 || profile.instanceOf !== "@red-cup-engineering/metroplat"
    || !Array.isArray(profile.operationSources) || !Array.isArray(profile.applications)
    || (profile.capabilities !== undefined && (!Array.isArray(profile.capabilities)
      || profile.capabilities.some((verb) => typeof verb !== "string" || !verb)))
    || Object.keys(profile).some((key) => !["version", "instanceOf", "operationSources", "applications", "capabilities"].includes(key))) {
    throw new TypeError("MetroPlat capability profile may declare only operationSources, applications, and requested capabilities");
  }
  const applications = [...profile.applications];
  for (const application of local.applications ?? []) {
    if (applications.some((entry) => entry.module === application.module && entry.export === application.export)) {
      throw new TypeError(`MetroPlat instance duplicates shared application ${application.module}#${application.export}`);
    }
    applications.push(application);
  }
  return {
    ...local,
    operationSources: [...profile.operationSources, ...(local.operationSources ?? [])],
    applications,
    capabilities: [...new Set([...(profile.capabilities ?? []), ...(local.capabilities ?? [])])],
  };
}

async function readInstalledInstance(instancePath, binding, operationOptions = {}, moduleBasePath = instancePath) {
  const instance = await readInstanceDefinition(instancePath);
  if (instance?.version !== 1 || !Array.isArray(instance.operationSources)) {
    throw new TypeError("MetroPlat instance must declare version 1 operationSources");
  }
  if (instance.instanceOf !== "@red-cup-engineering/metroplat") {
    throw new TypeError("MetroPlat instanceOf must name @red-cup-engineering/metroplat");
  }
  const unsupported = Object.keys(instance).filter((key) => !["version", "instanceOf", "identity", "profile", "operationSources", "applications", "schedules", "scheduleSources", "capabilities"].includes(key));
  if (unsupported.length > 0) {
    throw new TypeError(`MetroPlat instance declares unsupported fields: ${unsupported.sort().join(", ")}`);
  }
  const identity = instance.identity === undefined ? defaultIdentityCell : identityCell(instance.identity);
  if (instance.schedules !== undefined && !Array.isArray(instance.schedules)) throw new TypeError("MetroPlat instance schedules must be an array");
  if (instance.capabilities !== undefined && (!Array.isArray(instance.capabilities)
    || instance.capabilities.some((verb) => typeof verb !== "string" || !verb))) {
    throw new TypeError("MetroPlat instance requested capabilities must be nonempty strings");
  }
  const require = createRequire(moduleBasePath);
  const sources = [];
  const applications = [];
  const modules = new Set();
  for (const entry of instance.operationSources) {
    if (typeof entry?.module !== "string" || !SPECIFIER.test(entry.module)
      || typeof entry.export !== "string" || !EXPORT.test(entry.export)
      || modules.has(JSON.stringify([entry.module, entry.export]))) {
      throw new TypeError("MetroPlat instance operation source must name one unique installed package/export pair");
    }
    modules.add(JSON.stringify([entry.module, entry.export]));
    const imported = await import(pathToFileURL(require.resolve(entry.module)).href);
    const factory = imported[entry.export];
    if (typeof factory !== "function" && !Array.isArray(factory)) throw new TypeError(`${entry.module} does not export an operation family ${entry.export}`);
    // A web surface reads the installed identity and applications without opening operation state.
    if (binding == null) continue;
    const operations = typeof factory === "function" ? await factory(binding, operationOptions) : factory;
    if (!Array.isArray(operations) || operations.some((operation) => typeof operation?.verb !== "string" || typeof operation.execute !== "function")) {
      throw new TypeError(`${entry.module} did not provide an operation family`);
    }
    sources.push(Object.freeze({ module: entry.module, operations: Object.freeze([...operations]) }));
  }
  if (instance.applications !== undefined && !Array.isArray(instance.applications)) {
    throw new TypeError("MetroPlat instance applications must be an array");
  }
  const installedApplications = new Set();
  for (const entry of instance.applications ?? []) {
    const declarationCell = createTypedMark(applicationDeclaration.value, entry);
    if (!declarationCell.ok) throw new TypeError(declarationCell.refusal.message);
    if (!SPECIFIER.test(entry.module)
      || typeof entry.export !== "string" || !EXPORT.test(entry.export)
      || installedApplications.has(`${entry.module}#${entry.export}`)
      || (entry.configuration !== undefined && (entry.configuration === null
        || typeof entry.configuration !== "object" || Array.isArray(entry.configuration)))) {
      throw new TypeError("MetroPlat application must name a unique installed package export and object configuration");
    }
    installedApplications.add(`${entry.module}#${entry.export}`);
    const imported = await import(pathToFileURL(require.resolve(entry.module)).href);
    const factory = imported[entry.export];
    if (typeof factory !== "function") throw new TypeError(`${entry.module} does not export ${entry.export}`);
    applications.push(Object.freeze({ module: entry.module, export: entry.export,
      declarationCell: declarationCell.value,
      configuration: Object.freeze({ ...(entry.configuration ?? {}) }), factory }));
  }
  const schedules = [...(instance.schedules ?? []), ...await declaredScheduleSources(instance.scheduleSources, require, identity.content.id)];
  return Object.freeze({ identity, operationSources: Object.freeze(sources), applications: Object.freeze(applications), schedules: Object.freeze(schedules), capabilities: Object.freeze(instance.capabilities ?? []) });
}

/**
 * The schedules an instance's installed modules declare: each scheduleSources entry names a package
 * export that, given its configuration and the account the instance's clock runs as, returns clock
 * schedule declarations (organizing work/recurring), as an operation source returns operations. A
 * node job declares its trigger beside its template this way, so no instance repeats it.
 */
async function declaredScheduleSources(entries, require, account) {
  if (entries === undefined) return [];
  if (!Array.isArray(entries)) throw new TypeError("MetroPlat instance scheduleSources must be an array");
  const seen = new Set();
  const schedules = [];
  for (const entry of entries) {
    const key = JSON.stringify([entry?.module, entry?.export, entry?.configuration ?? null]);
    if (typeof entry?.module !== "string" || !SPECIFIER.test(entry.module) || typeof entry.export !== "string" || !EXPORT.test(entry.export)
      || (entry.configuration !== undefined && (entry.configuration === null || typeof entry.configuration !== "object" || Array.isArray(entry.configuration)))
      || seen.has(key)) {
      throw new TypeError("MetroPlat instance schedule source must name one unique installed package export and object configuration");
    }
    seen.add(key);
    const factory = (await import(pathToFileURL(require.resolve(entry.module)).href))[entry.export];
    if (typeof factory !== "function") throw new TypeError(`${entry.module} does not export a schedule source ${entry.export}`);
    const declared = await factory(Object.freeze({ ...(entry.configuration ?? {}) }), { account });
    if (!Array.isArray(declared) || declared.some((schedule) => typeof schedule?.id !== "string" || typeof schedule.verb !== "string")) {
      throw new TypeError(`${entry.module} ${entry.export} did not declare schedules`);
    }
    schedules.push(...declared);
  }
  return schedules;
}

/** Install a declared MetroPlat instance as data, independent of any process or transport. */
export async function installedMetroplatInstance(instancePath, binding, operationOptions = {}, moduleBasePath = instancePath) {
  const installed = await readInstalledInstance(instancePath, binding, operationOptions, moduleBasePath);
  return Object.freeze({
    identityCell: installed.identity,
    identity: installed.identity.content,
    operationSources: installed.operationSources,
    applications: installed.applications,
    schedules: installed.schedules,
    capabilities: installed.capabilities,
  });
}

/** Adapt CLI/MCP process options to the same instance installer. The package
 * identity remains a compatibility default when no instance is declared. */
export async function installedMetroplatFromProcessOptions(options, binding, operationOptions = {}) {
  const fern = fernCatalogOptionsFrom(options);
  const [bound, installed] = await Promise.all([
    fern === undefined ? [] : operationSourcesFromFern(fern),
    options.instance === undefined ? undefined : installedMetroplatInstance(options.instance, binding, operationOptions),
  ]);
  return Object.freeze({
    identityCell: installed?.identityCell ?? defaultIdentityCell,
    identity: installed?.identity ?? defaultIdentityCell.content,
    operationSources: Object.freeze([...bound, ...(installed?.operationSources ?? [])]),
    applications: installed?.applications ?? Object.freeze([]),
    schedules: installed?.schedules ?? Object.freeze([]),
    capabilities: installed?.capabilities ?? Object.freeze([]),
  });
}
