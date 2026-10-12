import { addressPrimitiveArticulation, addressSiteConstitution, INITIAL_SITE_CONSTITUTION, isArtifactRef, verifyArtifact } from "../identity/index.mjs";
import { canonicalizeJson, JSON_RESOURCE_ENVELOPE } from "@red-cup-engineering/json-services-section";
import {
  isCausalWitness,
  causalObstruction,
  causalWitness,

} from "./judgment.mjs";
import { causalGraphHasCycle } from "./causal-graph.mjs";
import {
  INITIAL_CAUSAL_RESOURCE_ENVELOPE,
  validateAddressedWitnessCore,

} from "./witness.mjs";

/** The causal dependency facts needed to judge one witness. Filesystem
 * admission implements this view from exact source artifacts and its derived
 * admission indexes; the in-memory substrate implements it from its maps. */

/** Run one identity step; a refusal comes back as `{ error }`. */
function attempt(step) {
  try {
    return { value: step() };
  } catch (error) {
    return { error };
  }
}

function sorted(values) {
  return Object.freeze([...values].sort());
}

function snapshotRetainedObstructions(input) {
  try {
    if (!Array.isArray(input) || Object.getPrototypeOf(input) !== Array.prototype) return undefined;
    const keys = Reflect.ownKeys(input);
    const lengthDescriptor = Object.getOwnPropertyDescriptor(input, "length");
    if (lengthDescriptor === undefined || !("value" in lengthDescriptor)) return undefined;
    const length = lengthDescriptor.value;
    if (!Number.isSafeInteger(length) || length < 0 || keys.length !== length + 1) return undefined;
    const values = new Map();
    for (const key of keys) {
      if (key === "length") continue;
      if (typeof key !== "string" || !/^(?:0|[1-9][0-9]*)$/u.test(key)) return undefined;
      const index = Number(key);
      if (!Number.isSafeInteger(index) || index >= length) return undefined;
      const descriptor = Object.getOwnPropertyDescriptor(input, key);
      if (descriptor === undefined || !("value" in descriptor)) return undefined;
      values.set(index, descriptor.value);
    }
    const records = [];
    for (let index = 0; index < length; index += 1) {
      if (!values.has(index)) return undefined;
      const canonical = canonicalizeJson(values.get(index), JSON_RESOURCE_ENVELOPE);
      const record = canonical.value;
      if (record === null || Array.isArray(record) || typeof record !== "object") return undefined;
      const keys = Object.keys(record);
      if (keys.length !== 2 || !Object.hasOwn(record, "event") || !Object.hasOwn(record, "obstruction") || !isArtifactRef(record.event)) return undefined;
      records.push({ record, text: canonical.text });
    }
    records.sort((left, right) => left.record.event < right.record.event ? -1
      : left.record.event > right.record.event ? 1
        : left.text < right.text ? -1 : left.text > right.text ? 1 : 0);
    const unique = [];
    let previous;
    for (const item of records) {
      if (previous !== undefined && previous.record.event === item.record.event && previous.text === item.text) continue;
      unique.push(item.record);
      previous = item;
    }
    return Object.freeze(unique);
  } catch {
    return undefined;
  }
}

function recordKind(artifact) {
  const value = artifact.canonical.value;
  if (value === null || Array.isArray(value) || typeof value !== "object") return undefined;
  const record = value;
  return typeof record.kind === "string" ? record.kind : undefined;
}

/** Judge one witness against an already-settled causal cut. This is the one
 * dependency rule used by both whole-source reconstruction and incremental
 * filesystem admission. A persisted admitted cause is a fixed predecessor;
 * missing and quarantined causes remain obstructions-to-readiness, while a
 * structurally blocked cause propagates its obstruction. */
export function evaluateWitnessDependencies(
  witness,
  view,
  site = INITIAL_SITE_CONSTITUTION,
) {
  const core = witness.core;
  const missing = new Set();
  const articulationArtifact = view.artifact(core.articulation);
  let articulation;
  if (articulationArtifact === undefined) {
    missing.add(core.articulation);
  } else {
    const validated = attempt(() => addressPrimitiveArticulation(articulationArtifact.canonical.value, site));
    if (validated.error !== undefined || validated.value.ref !== core.articulation) {
      return {
        missing: Object.freeze([]),
        obstruction: causalObstruction("articulation-invalid", "$.articulation", "articulation dependency is not a valid primitive articulation", [core.articulation]),
      };
    }
    articulation = validated.value.articulation;
  }
  if (articulation !== undefined) {
    if (view.artifact(articulation.token) === undefined) missing.add(articulation.token);
    if (view.artifact(articulation.claim) === undefined) missing.add(articulation.claim);
  }
  for (const artifact of core.referencedArtifacts) {
    if (view.artifact(artifact) === undefined) missing.add(artifact);
  }
  for (const cause of core.causes) {
    const state = view.witnessState(cause);
    if (state === "admitted") continue;
    if (state === "blocked") {
      return {
        missing: Object.freeze([]),
        obstruction: causalObstruction("cause-blocked", "$.causes", "a causal dependency is structurally blocked", [cause]),
      };
    }
    if (state === "quarantined") {
      missing.add(cause);
      continue;
    }
    if (view.artifact(cause) !== undefined) {
      return {
        missing: Object.freeze([]),
        obstruction: causalObstruction("cause-not-witness", "$.causes", "a causal dependency address contains no valid WitnessCore", [cause]),
      };
    }
    missing.add(cause);
  }
  return { missing: sorted(missing) };
}

export class CausalSubstrate {
 site;
 causalEnvelope;

 artifactsByRef = new Map();
 coresByRef = new Map();
 quarantinedRefs = new Set();
 admittedRefs = new Set();
 blockedByRef = new Map();
 missingByRef = new Map();
 retainedObstructionRecords = Object.freeze([]);
 retainedObstructionRefs = new Set();

 constructor(
    site,
    causalEnvelope = INITIAL_CAUSAL_RESOURCE_ENVELOPE,
  ) {
    this.site = site;
    this.causalEnvelope = Object.freeze({ ...causalEnvelope });
  }

  static fromMountedSite(
    site,
    causalEnvelope = INITIAL_CAUSAL_RESOURCE_ENVELOPE,
  ) {
    return new CausalSubstrate(site, causalEnvelope);
  }

  receive(reference, source) {
    const verified = attempt(() => verifyArtifact(reference, source));
    if (verified.error !== undefined) {
      return causalObstruction("artifact-invalid", verified.error.path ?? "$", verified.error.message, typeof reference === "string" ? [reference] : []);
    }
    const artifact = verified.value;
    const existing = this.artifactsByRef.get(artifact.ref);
    if (existing !== undefined) {
      if (existing.canonical.text !== artifact.canonical.text) {
        return causalObstruction("address-collision", "$", "one ArtifactRef was observed with different canonical bytes", [artifact.ref]);
      }
      const changes = this.promoteAvailable();
      return causalWitness(this.receipt(artifact.ref, "existing", this.coresByRef.has(artifact.ref), changes));
    }

    let witness;
    if (recordKind(artifact) === "metroplat.witness-core") {
      const validated = validateAddressedWitnessCore(
        artifact.canonical,
        this.site.constitution,
        this.causalEnvelope,
      );
      if (!isCausalWitness(validated)) return validated;
      witness = validated.value;
      if (witness.ref !== artifact.ref) {
        return causalObstruction("artifact-invalid", "$", "WitnessRef does not equal its canonical artifact address", [artifact.ref]);
      }
      if (this.wouldCreateCycle(witness.ref, witness.core)) {
        return causalObstruction("causal-cycle", "$.causes", "WitnessCore would introduce a causal cycle", [witness.ref, ...witness.core.causes]);
      }
    }

    this.artifactsByRef.set(artifact.ref, artifact);
    if (witness !== undefined) {
      this.coresByRef.set(witness.ref, witness);
      if (!this.retainedObstructionRefs.has(witness.ref)) this.quarantinedRefs.add(witness.ref);
    }
    const changes = this.promoteAvailable();
    return causalWitness(this.receipt(artifact.ref, "stored", witness !== undefined, changes));
  }

  /**
   * Receive one finite immutable source-set union, then compute dependency
   * promotion once over the union.
   *
   * `rebuildCausalSubstrate` already promises reception-order-independent
   * reconstruction. Running `promoteAvailable` after every artifact does not
   * strengthen that result: it repeatedly derives intermediate closures that
   * no caller observes. This operation validates every source and the complete
   * causal graph before mutating the substrate, joins the sources, and derives
   * the one least promotion closure the rebuilt snapshot exposes.
   */
  receiveSourceSet(sources) {
    const stagedArtifacts = new Map();
    const stagedCores = new Map();

    for (const source of sources) {
      const verified = attempt(() => verifyArtifact(source.ref, source.canonicalText));
      if (verified.error !== undefined) {
        return causalObstruction("artifact-invalid", verified.error.path ?? "$", verified.error.message, [source.ref]);
      }
      const artifact = verified.value;
      const existing = stagedArtifacts.get(artifact.ref) ?? this.artifactsByRef.get(artifact.ref);
      if (existing !== undefined) {
        if (existing.canonical.text !== artifact.canonical.text) {
          return causalObstruction("address-collision", "$", "one ArtifactRef was observed with different canonical bytes", [artifact.ref]);
        }
        continue;
      }

      stagedArtifacts.set(artifact.ref, artifact);
      if (recordKind(artifact) !== "metroplat.witness-core") continue;
      const validated = validateAddressedWitnessCore(
        artifact.canonical,
        this.site.constitution,
        this.causalEnvelope,
      );
      if (!isCausalWitness(validated)) return validated;
      const witness = validated.value;
      if (witness.ref !== artifact.ref) {
        return causalObstruction("artifact-invalid", "$", "WitnessRef does not equal its canonical artifact address", [artifact.ref]);
      }
      stagedCores.set(witness.ref, witness);
    }

    const causalGraph = [
      ...this.coresByRef.values(),
      ...stagedCores.values(),
    ].map((witness) => ({ ref: witness.ref, causes: witness.core.causes }));
    if (causalGraphHasCycle(causalGraph)) {
      return causalObstruction(
        "causal-cycle",
        "$.causes",
        "WitnessCore source-set union would introduce a causal cycle",
        sorted(stagedCores.keys()),
      );
    }

    for (const [ref, artifact] of stagedArtifacts) this.artifactsByRef.set(ref, artifact);
    for (const [ref, witness] of stagedCores) {
      this.coresByRef.set(ref, witness);
      if (!this.retainedObstructionRefs.has(ref)) this.quarantinedRefs.add(ref);
    }
    this.promoteAvailable();
    return causalWitness(this);
  }

  artifact(reference) {
    return this.artifactsByRef.get(reference);
  }

  witness(reference) {
    return this.coresByRef.get(reference);
  }

  witnessState(reference) {
    if (this.blockedByRef.has(reference)) return "blocked";
    if (this.admittedRefs.has(reference)) return "admitted";
    if (this.quarantinedRefs.has(reference)) return "quarantined";
    return "not-witness";
  }

  missingDependencies(reference) {
    return this.missingByRef.get(reference) ?? Object.freeze([]);
  }

  obstruction(reference) {
    return this.blockedByRef.get(reference);
  }

  admittedWitnessRefs() {
    return sorted(this.admittedRefs);
  }

  sourceArtifacts() {
    return Object.freeze(sorted(this.artifactsByRef.keys()).map((ref) => Object.freeze({
      ref,
      canonicalText: this.artifactsByRef.get(ref).canonical.text,
    })));
  }

  retainedObstructions() {
    return this.retainedObstructionRecords;
  }

  snapshot() {
    return Object.freeze({
      kind: "metroplat.journal.substrate-snapshot",
      site: this.site.ref,
      artifacts: this.sourceArtifacts(),
      witnesses: sorted(this.coresByRef.keys()),
      admitted: sorted(this.admittedRefs),
      quarantined: sorted(this.quarantinedRefs),
      blocked: sorted(this.blockedByRef.keys()),
      retainedObstructions: this.retainedObstructions(),
    });
  }

 receipt(
    ref,
    disposition,
    isWitness,
    changes,
  ) {
    const witnessRef = ref;
    return Object.freeze({
      kind: "metroplat.journal.reception",
      ref,
      disposition,
      classification: isWitness ? "witness" : "artifact",
      witnessState: isWitness ? this.witnessState(witnessRef) : "not-witness",
      missing: isWitness ? this.missingDependencies(witnessRef) : Object.freeze([]),
      promoted: changes.promoted,
      blocked: changes.blocked,
    });
  }

 wouldCreateCycle(ref, core) {
    return causalGraphHasCycle([
      ...[...this.coresByRef.values()].map((witness) => ({ ref: witness.ref, causes: witness.core.causes })),
      { ref, causes: core.causes },
    ]);
  }

 promoteAvailable() {
    const promoted = new Set();
    const blocked = new Set();
    let changed = true;
    while (changed) {
      changed = false;
      for (const ref of sorted(this.quarantinedRefs)) {
        const evaluation = this.evaluateDependencies(ref);
        if (evaluation.obstruction !== undefined) {
          this.quarantinedRefs.delete(ref);
          this.missingByRef.delete(ref);
          this.blockedByRef.set(ref, evaluation.obstruction);
          blocked.add(ref);
          changed = true;
          continue;
        }
        this.missingByRef.set(ref, evaluation.missing);
        if (evaluation.missing.length === 0) {
          this.quarantinedRefs.delete(ref);
          this.missingByRef.delete(ref);
          this.admittedRefs.add(ref);
          promoted.add(ref);
          changed = true;
        }
      }
    }
    return Object.freeze({ promoted: sorted(promoted), blocked: sorted(blocked) });
  }

 evaluateDependencies(ref) {
    const witness = this.coresByRef.get(ref);
    return evaluateWitnessDependencies(witness, {
      artifact: (reference) => this.artifactsByRef.get(reference),
      witnessState: (reference) => this.witnessState(reference),
    }, this.site.constitution);
  }
}

export function createCausalSubstrate(
  site = INITIAL_SITE_CONSTITUTION,
  causalEnvelope = INITIAL_CAUSAL_RESOURCE_ENVELOPE,
) {
  const addressed = attempt(() => addressSiteConstitution(site));
  return addressed.error === undefined
    ? causalWitness(CausalSubstrate.fromMountedSite(addressed.value, causalEnvelope))
    : causalObstruction("site-mismatch", "$", addressed.error.message);
}

export function rebuildCausalSubstrate(
  sources,
  site = INITIAL_SITE_CONSTITUTION,
  causalEnvelope = INITIAL_CAUSAL_RESOURCE_ENVELOPE,
  retainedObstructions = [],
) {
  const retained = snapshotRetainedObstructions(retainedObstructions);
  if (retained === undefined) {
    return causalObstruction("retained-obstruction-invalid", "$.retainedObstructions", "retained obstruction input is invalid");
  }
  const created = createCausalSubstrate(site, causalEnvelope);
  if (!isCausalWitness(created)) return created;
  const substrate = created.value;
  substrate.retainedObstructionRecords = retained;
  for (const record of retained) {
    substrate.retainedObstructionRefs.add(record.event);
    substrate.blockedByRef.set(record.event, causalObstruction(
      "retained-block",
      "$",
      "a retained journal admission decision blocks this witness",
      [record.event],
    ));
  }
  return substrate.receiveSourceSet(sources);
}
