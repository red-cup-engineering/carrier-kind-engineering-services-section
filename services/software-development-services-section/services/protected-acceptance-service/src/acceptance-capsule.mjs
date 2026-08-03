import { createHash } from "node:crypto";
import { cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { tmpdir } from "node:os";
import { EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/semantic-content-identify-service";
import { runTestsCommand } from "@red-cup-engineering/sandbox-command-execution-service";

const CAPSULE_TYPE = "ProtectedAcceptanceCapsule";
const CAPSULE_VERSION = 1;
const DENIED_SOURCE = [
  /node:(?:child_process|cluster|dgram|dns|http|https|net|tls|worker_threads)/u,
  /\bprocess\.env\b/u,
  /\b(?:fetch|setTimeout|setInterval|setImmediate)\s*\(/u,
  /\bDate\.now\s*\(/u,
  /\bMath\.random\s*\(/u,
  /\bimport\s*\(/u,
];
const INFRASTRUCTURE_FAILURE = /SyntaxError|ERR_MODULE_NOT_FOUND|MODULE_NOT_FOUND|Cannot find module|ENOENT.*(?:test|acceptance)/u;

function sha256(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function inside(root, requested) {
  const path = resolve(root, requested);
  if (path !== resolve(root) && !path.startsWith(`${resolve(root)}${sep}`)) throw new Error(`acceptance capsule path escapes admitted territory: ${requested}`);
  return path;
}

function normalizedPath(root, requested) {
  return relative(root, inside(root, requested)).split(sep).join("/") || ".";
}

function copyTerritory(source) {
  const parent = mkdtempSync(join(tmpdir(), "union-acceptance-")), workspace = join(parent, "territory");
  cpSync(source, workspace, { recursive: true, filter: (path) => !path.split(/[\\/]/).some((part) => [".git", "node_modules", ".lake", "dist", "coverage", "union-acceptance"].includes(part)) });
  const manifestPath = join(source, "package.json");
  if (existsSync(manifestPath)) {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    for (const name of Object.keys(manifest.dependencies ?? {})) {
      const admitted = resolve(source, "node_modules", name);
      if (!existsSync(admitted)) throw new Error(`declared acceptance dependency is not installed: ${name}`);
      const target = resolve(workspace, "node_modules", name);
      mkdirSync(dirname(target), { recursive: true });
      symlinkSync(admitted, target, "dir");
    }
  }
  return { parent, workspace };
}

function normalizeVectors(vectors) {
  if (!Array.isArray(vectors) || vectors.length === 0) throw new Error("acceptance capsule requires test vectors");
  return vectors.map((vector, index) => {
    const id = typeof vector?.id === "string" ? vector.id.trim() : "";
    const given = Array.isArray(vector?.given) ? vector.given.filter((value) => typeof value === "string" && value.trim()) : [];
    const when = typeof vector?.when === "string" ? vector.when.trim() : "";
    const then = Array.isArray(vector?.then) ? vector.then.filter((value) => typeof value === "string" && value.trim()) : [];
    const forbidden = Array.isArray(vector?.forbidden) ? vector.forbidden.filter((value) => typeof value === "string" && value.trim()) : [];
    if (!/^[a-z][a-z0-9-]{1,63}$/u.test(id) || given.length === 0 || !when || then.length === 0) throw new Error(`acceptance capsule test vector ${index + 1} is invalid`);
    return { id, given, when, then, forbidden };
  });
}

function normalizeArtifacts(territory, artifacts) {
  if (!Array.isArray(artifacts) || artifacts.length === 0) throw new Error("acceptance capsule requires artifacts");
  const seen = new Set();
  return artifacts.map((artifact, index) => {
    const path = normalizedPath(territory, artifact?.path);
    const text = typeof artifact?.text === "string" ? artifact.text : "";
    if (!path.startsWith("union-acceptance/") || !/\.(?:mjs|js|json)$/u.test(path)) throw new Error(`acceptance artifact ${index + 1} must live beneath union-acceptance`);
    if (seen.has(path)) throw new Error(`duplicate acceptance artifact path: ${path}`);
    if (!text || Buffer.byteLength(text) > 100000) throw new Error(`acceptance artifact ${path} has invalid bytes`);
    const denied = DENIED_SOURCE.find((pattern) => pattern.test(text));
    if (denied) throw new Error(`acceptance artifact ${path} uses a denied nondeterministic or authority-bearing capability`);
    seen.add(path);
    return { path, text, digest: sha256(text), bytes: Buffer.byteLength(text) };
  });
}

function sourceEvidence(territory, focusPaths) {
  if (!Array.isArray(focusPaths) || focusPaths.length === 0) throw new Error("acceptance capsule requires source evidence paths");
  return [...new Set(focusPaths)].map((requested) => {
    const path = normalizedPath(territory, requested), absolute = inside(territory, path);
    if (!existsSync(absolute) || !lstatSync(absolute).isFile()) throw new Error(`acceptance source evidence is not a file: ${path}`);
    const bytes = readFileSync(absolute);
    return { path, digest: sha256(bytes), bytes: bytes.length, text: bytes.toString("utf8").slice(0, 20000) };
  });
}

function materializeArtifacts(workspace, artifacts) {
  for (const artifact of artifacts) {
    const target = inside(workspace, artifact.path);
    if (existsSync(target) && lstatSync(target).isSymbolicLink()) throw new Error(`acceptance artifact target is a symbolic link: ${artifact.path}`);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, artifact.text, { mode: 0o600 });
    if (sha256(readFileSync(target)) !== artifact.digest) throw new Error(`acceptance artifact digest changed during materialization: ${artifact.path}`);
  }
}

export function acceptanceCapsuleDigest(capsule) {
  const { digest: _digest, ...body } = capsule;
  return identifyJsonSemanticContent({ objectKind: "protected-acceptance.capsule-record", value: body, witnessRoot: EMPTY_WITNESS_ROOT }).id;
}

export function validateAcceptanceCapsule(capsule, { territory } = {}) {
  if (capsule?.type !== CAPSULE_TYPE || capsule?.version !== CAPSULE_VERSION || typeof capsule?.id !== "string") throw new Error("invalid protected acceptance capsule envelope");
  if (acceptanceCapsuleDigest(capsule) !== capsule.digest) throw new Error("protected acceptance capsule digest mismatch");
  const root = resolve(territory || capsule.territory);
  for (const evidence of capsule.sourceEvidence || []) {
    const path = inside(root, evidence.path);
    if (!existsSync(path) || sha256(readFileSync(path)) !== evidence.digest) throw new Error(`protected acceptance capsule source is stale: ${evidence.path}`);
  }
  for (const artifact of capsule.artifacts || []) if (sha256(artifact.text) !== artifact.digest) throw new Error(`protected acceptance artifact digest mismatch: ${artifact.path}`);
  if (capsule.oracleAssay?.charge?.support !== true || capsule.oracleAssay.charge.refutation !== false
      || capsule.redWitness?.charge?.support !== false || capsule.redWitness.charge.refutation !== true) {
    throw new Error("protected acceptance capsule lacks independent red and oracle-assay evidence axes");
  }
  return capsule;
}

export function materializeAcceptanceCapsule(workspace, capsule) {
  if (acceptanceCapsuleDigest(capsule) !== capsule.digest) throw new Error("protected acceptance capsule digest mismatch");
  materializeArtifacts(resolve(workspace), capsule.artifacts);
  return capsule.artifacts.map((artifact) => artifact.path);
}

export function executeAcceptanceCapsule(territory, capsule, {
  requireSourceEvidence = false,
  runAcceptance = runTestsCommand,
} = {}) {
  if (requireSourceEvidence) validateAcceptanceCapsule(capsule, { territory });
  else if (acceptanceCapsuleDigest(capsule) !== capsule.digest) throw new Error("protected acceptance capsule digest mismatch");
  const isolated = copyTerritory(resolve(territory));
  try {
    materializeArtifacts(isolated.workspace, capsule.artifacts);
    return runAcceptance(isolated.workspace, capsule.command);
  } finally {
    rmSync(isolated.parent, { recursive: true, force: true });
  }
}

export async function prepareAcceptanceCapsule(input, {
  assayOracle,
  runAcceptance = runTestsCommand,
  now = () => new Date().toISOString(),
} = {}) {
  if (typeof assayOracle !== "function") throw new Error("protected acceptance preparation requires an explicit receiver-authorized oracle assay capability");
  const territory = resolve(input.territory), vectors = normalizeVectors(input.testVectors);
  const evidence = sourceEvidence(territory, input.focusPaths), artifacts = normalizeArtifacts(territory, input.artifacts);
  if (typeof input.command !== "string" || !/^node\s+--test(?:\s+[^;&|`$]+)+$/u.test(input.command)) throw new Error("acceptance capsule command must be a bounded node --test command");
  const commandPaths = input.command.match(/[A-Za-z0-9_./-]+\.(?:mjs|js)/gu) || [];
  if (!commandPaths.length || commandPaths.some((path) => !artifacts.some((artifact) => artifact.path === normalizedPath(territory, path)))) throw new Error("acceptance command must name only capsule artifacts");
  const isolated = copyTerritory(territory);
  try {
    materializeArtifacts(isolated.workspace, artifacts);
    const result = runAcceptance(isolated.workspace, input.command);
    if (result.passed) throw new Error(`acceptance capsule did not produce a red incumbent witness: ${String(result.output || "").slice(-2000)}`);
    const output = String(result.output || "").slice(-12000);
    if (INFRASTRUCTURE_FAILURE.test(output) || !/(?:AssertionError|not ok|expected|actual)/iu.test(output)) throw new Error(`acceptance red witness is an infrastructure failure rather than a relevant assertion failure: ${output.slice(-3000)}`);
    const missingVectorIds = vectors.map((vector) => vector.id).filter((id) => !output.includes(id));
    if (missingVectorIds.length) throw new Error(`acceptance red witness did not execute every vector: ${missingVectorIds.join(", ")}`);
    const redWitness = { charge: { support: false, refutation: true }, output, outputDigest: sha256(output), executedVectorIds: vectors.map((vector) => vector.id) };
    const oracleAssay = await assayOracle({
      manifest: {
        id: `${input.id}:acceptance-assay`, objective: input.objective, constraints: input.constraints || [],
        testVectors: vectors, sourceEvidence: evidence,
      },
      oracle: { providers: input.supplierProviders || [], artifacts, redWitness },
    });
    if (oracleAssay?.charge?.support !== true || oracleAssay.charge.refutation !== false) {
      const error = new Error(`acceptance capsule failed deterministic oracle assay${oracleAssay?.failures?.length ? `: ${oracleAssay.failures.join("; ")}` : ""}`);
      error.oracleAssay = oracleAssay;
      throw error;
    }
    const capsule = {
      type: CAPSULE_TYPE,
      version: CAPSULE_VERSION,
      id: input.id,
      objective: input.objective,
      territory,
      sourceEvidence: evidence.map(({ text: _text, ...entry }) => entry),
      command: input.command,
      testVectors: vectors,
      artifacts,
      redWitness,
      oracleAssay,
      sealedAt: now(),
    };
    capsule.digest = acceptanceCapsuleDigest(capsule);
    return capsule;
  } finally {
    rmSync(isolated.parent, { recursive: true, force: true });
  }
}

export function loadAcceptanceCapsule(path, options = {}) {
  const record = JSON.parse(readFileSync(resolve(path), "utf8"));
  const capsule = record?.type === "AcceptanceProcurementSettlement" ? record.capsule : record;
  return validateAcceptanceCapsule(capsule, options);
}
