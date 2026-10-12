import {
  carrierFrom,

} from "@red-cup-engineering/relating";

import {
  moduleGraphCarrier,

} from "./host-neutral-carriers.mjs";

const idSchema = { type: "string", minLength: 1 };
const stringArraySchema = { type: "array", items: idSchema };

export const LeanToolchainSchema = {
  $id: "computing/lean/toolchain",
  title: "LeanToolchain",
  type: "object",
  required: ["kind", "toolchain"],
  additionalProperties: false,
  properties: {
    kind: { const: "computing.lean.toolchain" },
    toolchain: idSchema,
    version: { type: "string" },
    channel: { type: "string" },
    mediaType: { type: "string" },
  },
};

export const leanToolchainCarrier = carrierFrom(LeanToolchainSchema);

const lakeRequireSchema = {
  type: "object",
  required: ["name"],
  additionalProperties: false,
  properties: {
    name: idSchema,
    source: { type: "string" },
    scope: { type: "string" },
  },
};

const lakeLibrarySchema = {
  type: "object",
  required: ["name"],
  additionalProperties: false,
  properties: {
    name: idSchema,
    roots: stringArraySchema,
  },
};

export const LakefileSchema = {
  $id: "computing/lean/lakefile",
  title: "Lakefile",
  type: "object",
  required: ["kind", "name", "defaultTargets", "requires", "libraries"],
  additionalProperties: false,
  properties: {
    kind: { const: "computing.lean.lakefile" },
    name: idSchema,
    version: { type: "string" },
    defaultTargets: stringArraySchema,
    requires: { type: "array", items: lakeRequireSchema },
    libraries: { type: "array", items: lakeLibrarySchema },
    mediaType: { type: "string" },
  },
};

export const lakefileCarrier = carrierFrom(LakefileSchema);

export const LeanDeclarationSchema = {
  $id: "computing/lean/declaration",
  title: "LeanDeclaration",
  type: "object",
  required: ["kind", "name"],
  additionalProperties: false,
  properties: {
    kind: { enum: ["theorem", "lemma", "def", "inductive", "structure", "class", "axiom", "opaque", "abbrev", "instance"] },
    name: idSchema,
    namespace: { type: "string" },
    line: { type: "integer", minimum: 1 },
    proofStatus: { enum: ["proved", "assumed", "admitted", "unknown"] },
  },
};

export const leanDeclarationCarrier = carrierFrom(LeanDeclarationSchema);

export const LeanModuleSchema = {
  $id: "computing/lean/module",
  title: "LeanModule",
  type: "object",
  required: ["kind", "id", "imports", "declarations"],
  additionalProperties: false,
  properties: {
    kind: { const: "computing.lean.module" },
    id: idSchema,
    path: { type: "string" },
    imports: stringArraySchema,
    declarations: { type: "array", items: LeanDeclarationSchema },
    mediaType: { type: "string" },
  },
};

export const leanModuleCarrier = carrierFrom(LeanModuleSchema);

export const LeanDeclarationIndexSchema = {
  $id: "computing/lean/declaration-index",
  title: "LeanDeclarationIndex",
  type: "object",
  required: ["kind", "source", "declarations"],
  additionalProperties: false,
  properties: {
    kind: { const: "computing.lean.declaration-index" },
    source: idSchema,
    declarations: stringArraySchema,
    mediaType: { type: "string" },
  },
};

export const leanDeclarationIndexCarrier = carrierFrom(LeanDeclarationIndexSchema);

export const LeanEnvironmentSchema = {
  $id: "computing/lean/environment",
  title: "LeanEnvironment",
  type: "object",
  required: ["kind", "rootModule", "modules"],
  additionalProperties: false,
  properties: {
    kind: { const: "computing.lean.environment" },
    rootModule: idSchema,
    toolchain: LeanToolchainSchema,
    lakefile: LakefileSchema,
    declarationIndex: LeanDeclarationIndexSchema,
    modules: { type: "array", items: LeanModuleSchema },
    mediaType: { type: "string" },
  },
};

export const leanEnvironmentCarrier = carrierFrom(LeanEnvironmentSchema);

export const LeanBuildOracleSchema = {
  $id: "computing/lean/build-oracle",
  title: "LeanBuildOracle",
  type: "object",
  required: ["kind", "command", "args", "exitCode", "stdout", "stderr", "succeeded", "errors", "warnings"],
  additionalProperties: false,
  properties: {
    kind: { const: "computing.lean.build-oracle" },
    command: idSchema,
    args: stringArraySchema,
    exitCode: { type: "integer" },
    stdout: { type: "string" },
    stderr: { type: "string" },
    succeeded: { type: "boolean" },
    errors: stringArraySchema,
    warnings: stringArraySchema,
    mediaType: { type: "string" },
  },
};

export const leanBuildOracleCarrier = carrierFrom(LeanBuildOracleSchema);

export function decodeLeanToolchain(text) {
  const toolchain = text.trim();
  const version = /lean4:v?([^/\s]+)$/u.exec(toolchain)?.[1];
  const channel = /^([^:]+):/u.exec(toolchain)?.[1];
  return leanToolchainCarrier.assert({
    kind: "computing.lean.toolchain",
    toolchain,
    ...(version === undefined ? {} : { version }),
    ...(channel === undefined ? {} : { channel }),
    mediaType: "text/vnd.lean-toolchain",
  }, "lean-toolchain");
}

export function decodeLakefileToml(text) {
  const root = parseTomlAssignments(text);
  const libraries = parseTomlTables(text, "lean_lib")
    .map((table) => ({
      name: table.name ?? "",
      roots: table.roots === undefined ? Object.freeze([]) : Object.freeze(splitTomlArray(table.roots)),
    }))
    .filter((library) => library.name !== "");
  const requires = parseTomlTables(text, "require")
    .map((table) => ({
      name: table.name ?? "",
      ...(table.path === undefined && table.git === undefined ? {} : { source: table.path ?? table.git }),
      ...(table.scope === undefined ? {} : { scope: table.scope }),
    }))
    .filter((requirement) => requirement.name !== "");
  return lakefileCarrier.assert({
    kind: "computing.lean.lakefile",
    name: root.name ?? "unknown",
    ...(root.version === undefined ? {} : { version: root.version }),
    defaultTargets: Object.freeze(root.defaultTargets === undefined ? [] : splitTomlArray(root.defaultTargets)),
    requires: Object.freeze(requires),
    libraries: Object.freeze(libraries),
    mediaType: "application/vnd.lean.lakefile+toml",
  }, "lakefile.toml");
}

export function decodeLeanModule(text, id, path) {
  const lines = text.split(/\r?\n/u);
  const imports = new Set();
  const declarations = [];
  const namespaceStack = [];
  const admittedLines = admittedLineNumbers(text);
  lines.forEach((raw, index) => {
    const line = stripLineComment(raw).trim();
    const imported = /^import\s+(.+)$/u.exec(line)?.[1];
    if (imported !== undefined) {
      for (const item of imported.split(/\s+/u).filter(Boolean)) imports.add(item);
      return;
    }
    const namespace = /^namespace\s+([A-Za-z_][A-Za-z0-9_'.]*)/u.exec(line)?.[1];
    if (namespace !== undefined) {
      namespaceStack.push(namespace);
      return;
    }
    if (/^end(?:\s+[A-Za-z_][A-Za-z0-9_'.]*)?\s*$/u.test(line)) {
      namespaceStack.pop();
      return;
    }
    const match = /^(?:@[^\s]+\s+)*(?:noncomputable\s+)?(?:private\s+|protected\s+)?(theorem|lemma|def|inductive|structure|class|axiom|opaque|abbrev|instance)\s+([A-Za-z_][A-Za-z0-9_'.]*)/u.exec(line);
    if (match?.[1] === undefined || match[2] === undefined) return;
    const kind = match[1];
    const lineNumber = index + 1;
    declarations.push(leanDeclarationCarrier.assert({
      kind,
      name: qualifyLeanName(match[2], namespaceStack),
      ...(namespaceStack.length === 0 ? {} : { namespace: namespaceStack.join(".") }),
      line: lineNumber,
      proofStatus: kind === "axiom" ? "assumed" : (admittedLines.has(lineNumber) || declarationBodyAdmitted(lines, index)) ? "admitted" : "proved",
    }, "Lean declaration"));
  });
  return leanModuleCarrier.assert({
    kind: "computing.lean.module",
    id,
    ...(path === undefined ? {} : { path }),
    imports: Object.freeze([...imports].sort((left, right) => left.localeCompare(right))),
    declarations: Object.freeze(declarations),
    mediaType: "text/vnd.lean4",
  }, "Lean module");
}

export function leanEnvironment(input

) {
  return leanEnvironmentCarrier.assert({
    kind: "computing.lean.environment",
    rootModule: input.rootModule,
    ...(input.toolchain === undefined ? {} : { toolchain: input.toolchain }),
    ...(input.lakefile === undefined ? {} : { lakefile: input.lakefile }),
    ...(input.declarationIndex === undefined ? {} : { declarationIndex: input.declarationIndex }),
    modules: Object.freeze([...input.modules].sort((left, right) => left.id.localeCompare(right.id))),
    mediaType: "application/vnd.lean.environment+json",
  }, "Lean environment");
}

export function leanEnvironmentFromAdmission(input

) {
  return leanEnvironment({
    rootModule: input.rootModule === undefined ? "RelMath" : "RelMath",
    modules: input.modules.map((file) => decodeLeanModule(file.text, file.module, file.relative)),
    ...(input.toolchain === undefined ? {} : { toolchain: decodeLeanToolchain(input.toolchain.text) }),
    ...(input.lakefile === undefined ? {} : { lakefile: decodeLakefileToml(input.lakefile.text) }),
    ...(input.blueprintLeanDecls === undefined ? {} : {
      declarationIndex: decodeBlueprintLeanDecls(
        input.blueprintLeanDecls.text,
        input.blueprintLeanDecls.path ?? "blueprint/lean_decls",
      ),
    }),
  });
}

export function reflectLeanModuleGraph(modules, roots = []) {
  return moduleGraphCarrier.assert({
    kind: "computing.module-graph",
    modules: Object.freeze(modules.map((module) => Object.freeze({
      id: module.id,
      mediaType: "text/vnd.lean4",
      imports: Object.freeze(module.imports.map((specifier) => Object.freeze({
        specifier,
        phase: "static",
        optional: false,
      }))),
      exports: Object.freeze(module.declarations.map((decl) => Object.freeze({
        name: decl.name,
        typeOnly: decl.kind === "theorem" || decl.kind === "lemma",
      }))),
    }))),
    edges: Object.freeze(modules.flatMap((module) => module.imports.map((specifier) => Object.freeze({
      from: module.id,
      to: specifier,
      kind: "import",
      specifier,
    })))),
    roots: Object.freeze([...roots]),
  }, "Lean module graph");
}

export function decodeBlueprintLeanDecls(text, source = "blueprint/lean_decls") {
  const declarations = text
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));
  return leanDeclarationIndexCarrier.assert({
    kind: "computing.lean.declaration-index",
    source,
    declarations: Object.freeze([...new Set(declarations)].sort((left, right) => left.localeCompare(right))),
    mediaType: "text/vnd.lean.declarations",
  }, "blueprint lean_decls");
}

export function decodeLeanBuildOracle(input

) {
  const stdout = input.stdout ?? "";
  const stderr = input.stderr ?? "";
  const combined = `${stdout}\n${stderr}`;
  const errors = diagnosticLines(combined, "error");
  const warnings = diagnosticLines(combined, "warning");
  return leanBuildOracleCarrier.assert({
    kind: "computing.lean.build-oracle",
    command: input.command,
    args: Object.freeze([...input.args]),
    exitCode: input.exitCode,
    stdout,
    stderr,
    succeeded: input.exitCode === 0 && errors.length === 0,
    errors,
    warnings,
    mediaType: "application/vnd.lean.build-oracle+json",
  }, "Lean build oracle");
}

function stripLineComment(line) {
  const offset = line.indexOf("--");
  return offset === -1 ? line : line.slice(0, offset);
}

function qualifyLeanName(name, namespaceStack) {
  if (name.includes(".") || namespaceStack.length === 0) return name;
  return `${namespaceStack.join(".")}.${name}`;
}

function admittedLineNumbers(text) {
  const admitted = new Set();
  text.split(/\r?\n/u).forEach((line, index) => {
    if (/\b(sorry|admit)\b/u.test(stripLineComment(line))) admitted.add(index + 1);
  });
  return admitted;
}

function declarationBodyAdmitted(lines, startIndex) {
  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = stripLineComment(lines[index] ?? "").trim();
    if (/^(?:@[^\s]+\s+)*(?:noncomputable\s+)?(?:private\s+|protected\s+)?(theorem|lemma|def|inductive|structure|class|axiom|opaque|abbrev|instance)\s+/u.test(line)) return false;
    if (/^end(?:\s+[A-Za-z_][A-Za-z0-9_'.]*)?\s*$/u.test(line)) return false;
    if (/\b(sorry|admit)\b/u.test(line)) return true;
  }
  return false;
}

function parseTomlAssignments(text) {
  const out = {};
  for (const line of text.split(/\r?\n/u)) {
    if (/^\s*\[\[/u.test(line)) break;
    const match = /^\s*([A-Za-z0-9_-]+)\s*=\s*(.+?)\s*$/u.exec(line);
    if (match?.[1] !== undefined && match[2] !== undefined) out[match[1]] = unquoteToml(match[2]);
  }
  return out;
}

function parseTomlTables(text, name) {
  const tables = [];
  let current;
  for (const line of text.split(/\r?\n/u)) {
    const header = /^\s*\[\[([A-Za-z0-9_-]+)\]\]\s*$/u.exec(line)?.[1];
    if (header !== undefined) {
      current = header === name ? {} : undefined;
      if (current !== undefined) tables.push(current);
      continue;
    }
    if (current === undefined) continue;
    const match = /^\s*([A-Za-z0-9_-]+)\s*=\s*(.+?)\s*$/u.exec(line);
    if (match?.[1] !== undefined && match[2] !== undefined) current[match[1]] = unquoteToml(match[2]);
  }
  return Object.freeze(tables);
}

function splitTomlArray(value) {
  const trimmed = value.trim();
  if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) return Object.freeze(trimmed === "" ? [] : [trimmed]);
  return Object.freeze(trimmed.slice(1, -1).split(",").map((item) => unquoteToml(item.trim())).filter(Boolean));
}

function unquoteToml(value) {
  return value.trim().replace(/^["']|["']$/gu, "");
}

function diagnosticLines(text, level) {
  return Object.freeze(text.split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.toLowerCase().includes(`${level}:`)));
}
