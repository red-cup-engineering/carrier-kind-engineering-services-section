import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";

const refusal = (step, reason, evidence) => Object.freeze({ step, reason, evidence });
const digest = (value) => createHash("sha256").update(value).digest("hex");

/**
 * The sole node-unit apply boundary. It derives a deterministic plan from
 * authored carriers and observed non-secret facts, atomically promotes each
 * fully-written carrier, and performs only a user daemon reload. It never
 * enables, starts, stops, or restarts a service.
 */
export async function reconcileNodeUnitFiles({ node, units, destinationDirectory, requiredFacts = [], availableBytes, minimumAvailableBytes = 0, apply = false, run } = {}) {
  const refusals = [];
  if (typeof node !== "string" || node === "") refusals.push(refusal("node", "a node identity is required", node ?? null));
  if (!destinationDirectory) refusals.push(refusal("destination-directory", "a destination directory is required", null));
  if (!Array.isArray(units) || units.length === 0) refusals.push(refusal("units", "a non-empty unit list is required", units ?? null));
  if (!Number.isSafeInteger(availableBytes) || availableBytes < 0 || !Number.isSafeInteger(minimumAvailableBytes) || minimumAvailableBytes < 0) {
    refusals.push(refusal("capacity", "capacity observations must be non-negative safe integers", { availableBytes, minimumAvailableBytes }));
  } else if (availableBytes < minimumAvailableBytes) {
    refusals.push(refusal("capacity", "available capacity is below the node staging floor", { availableBytes, minimumAvailableBytes }));
  }
  if (!Array.isArray(requiredFacts)) refusals.push(refusal("required-facts", "requiredFacts must be an array", requiredFacts ?? null));
  for (const fact of Array.isArray(requiredFacts) ? requiredFacts : []) {
    if (!fact || typeof fact.name !== "string" || typeof fact.present !== "boolean") refusals.push(refusal("required-fact", "each fact needs a name and boolean presence observation", fact ?? null));
    else if (!fact.present) refusals.push(refusal("required-fact", `required ${fact.name} fact is absent`, fact.name));
  }
  const seen = new Set();
  const admitted = [];
  for (const unit of Array.isArray(units) ? units : []) {
    if (!unit || typeof unit.name !== "string" || !/\.(?:service|env)$/u.test(unit.name) || seen.has(unit.name) || (typeof unit.source !== "string" && typeof unit.content !== "string") || (unit.source && basename(unit.source) !== unit.name)) {
      refusals.push(refusal("unit", "each unique service/environment carrier needs authored source bytes or compiler bytes", unit ?? null));
      continue;
    }
    seen.add(unit.name);
    try {
      const content = unit.content ?? await readFile(unit.source, "utf8");
      if (content === "") refusals.push(refusal("unit", "an authored carrier must not be empty", unit.source));
      else admitted.push(Object.freeze({ ...unit, content, sourceDigest: digest(content) }));
    } catch (error) { refusals.push(refusal("unit-source-unreadable", error.message, unit.source)); }
  }
  const plan = Object.freeze({
    node,
    units: Object.freeze(admitted.sort((a, b) => a.name.localeCompare(b.name)).map(({ name, source = "compiler", sourceDigest, destination }) => Object.freeze({ name, source, sourceDigest, destination: resolve(destination ?? join(destinationDirectory ?? ".", name)) }))),
    requiredFacts: Object.freeze((Array.isArray(requiredFacts) ? requiredFacts : []).map(({ name, present }) => Object.freeze({ name, present }))),
    capacity: Object.freeze({ availableBytes, minimumAvailableBytes }),
    effects: Object.freeze({ stageAtomically: true, daemonReloadOnly: true, activation: false }),
  });
  if (refusals.length > 0) return Object.freeze({ outcome: "refused", plan, refusals: Object.freeze(refusals) });
  if (!apply) return Object.freeze({ outcome: "planned", plan });
  await Promise.all([...new Set(admitted.map((unit) => dirname(resolve(unit.destination ?? join(destinationDirectory, unit.name)))))].map((directory) => mkdir(directory, { recursive: true })));
  const staged = [];
  try {
    for (const unit of admitted) {
      const destination = resolve(unit.destination ?? join(destinationDirectory, unit.name));
      const temporary = `${destination}.${randomUUID()}.next`;
      await writeFile(temporary, unit.content, { mode: 0o644 });
      staged.push({ destination, temporary });
    }
    for (const { destination, temporary } of staged) await rename(temporary, destination);
  } finally {
    await Promise.all(staged.map(({ temporary }) => unlink(temporary).catch((error) => { if (error.code !== "ENOENT") throw error; })));
  }
  if (run) run("systemctl", ["--user", "daemon-reload"]);
  return Object.freeze({ outcome: "applied", plan, daemonReloaded: Boolean(run) });
}

/**
 * Validates CTO's compiler output before crossing into the unit-file effect
 * boundary.  The compiler, not operations, owns service/environment syntax.
 * This adapter accepts only its bytes and does not reconstruct them.
 */
export async function reconcileCompiledNodeArtifacts({ spec, artifacts, destinationDirectory, environmentDirectory, ...options } = {}) {
  const incomplete = [];
  if (!spec || spec.kind !== "metroplat.node-spec" || spec.version !== 1 || typeof spec.id !== "string") incomplete.push(refusal("node-spec", "a versioned MetroPlat node specification is required", null));
  if (!artifacts || !artifacts.node || artifacts.node.id !== spec?.id || typeof artifacts.service !== "string" || artifacts.service === "" || typeof artifacts.environment !== "string" || artifacts.environment === "" || !artifacts.ingress) {
    incomplete.push(refusal("compiled-artifacts", "the complete compiler artifact set (node, service, environment, ingress) is required", spec?.id ?? null));
  }
  if (incomplete.length > 0) return Object.freeze({ outcome: "refused", plan: Object.freeze({ node: spec?.id ?? null, effects: Object.freeze({ stageAtomically: true, daemonReloadOnly: true, activation: false }) }), refusals: Object.freeze(incomplete) });
  if (!environmentDirectory) return Object.freeze({ outcome: "refused", plan: Object.freeze({ node: spec.id, effects: Object.freeze({ stageAtomically: true, daemonReloadOnly: true, activation: false }) }), refusals: Object.freeze([refusal("environment-directory", "a destination for compiler-owned environment bytes is required", null)]) });
  return reconcileNodeUnitFiles({
    node: spec.id,
    units: [
      { name: "metroplat.service", content: artifacts.service, destination: join(destinationDirectory, "metroplat.service") },
      { name: "metroplat.env", content: artifacts.environment, destination: join(environmentDirectory, "metroplat.env") },
    ],
    destinationDirectory,
    ...options,
  });
}
