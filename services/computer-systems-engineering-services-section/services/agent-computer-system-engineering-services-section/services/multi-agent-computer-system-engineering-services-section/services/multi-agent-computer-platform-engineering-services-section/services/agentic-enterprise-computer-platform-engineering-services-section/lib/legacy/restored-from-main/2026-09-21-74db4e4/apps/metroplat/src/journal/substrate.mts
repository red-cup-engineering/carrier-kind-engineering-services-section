import {
  addressPrimitiveArticulation,
  addressSiteConstitution,
  INITIAL_IDENTITY_PROFILE_REGISTRY,
  INITIAL_SITE_CONSTITUTION,
  isIdentityWitness,
  verifyArtifact,
  type AddressedArtifact,
  type AddressedSiteConstitution,
  type ArtifactRef,
  type ArtifactSource,
  type IdentityProfileRegistry,
  type PrimitiveArticulation,
  type SiteConstitution,
} from "../lib/identity/index.mts";
import {
  isCausalWitness,
  causalObstruction,
  causalWitness,
  type CausalJudgment,
  type CausalObstruction,
} from "./judgment.mts";
import { causalGraphHasCycle } from "./causal-graph.mts";
import {
  INITIAL_CAUSAL_RESOURCE_ENVELOPE,
  validateAddressedWitnessCore,
  type AddressedWitnessCore,
  type CausalResourceEnvelope,
  type WitnessCore,
  type WitnessRef,
} from "./witness.mts";

export type WitnessAdmissionState = "not-witness" | "quarantined" | "admitted" | "blocked";

export interface ReceptionReceipt {
  readonly kind: "metroplat.journal.reception";
  readonly ref: ArtifactRef;
  readonly disposition: "stored" | "existing";
  readonly classification: "artifact" | "witness";
  readonly witnessState: WitnessAdmissionState;
  readonly missing: readonly ArtifactRef[];
  readonly promoted: readonly WitnessRef[];
  readonly blocked: readonly WitnessRef[];
}

export interface CausalSubstrateSnapshot {
  readonly kind: "metroplat.journal.substrate-snapshot";
  readonly site: ArtifactRef;
  readonly artifacts: readonly ArtifactSource[];
  readonly witnesses: readonly WitnessRef[];
  readonly admitted: readonly WitnessRef[];
  readonly quarantined: readonly WitnessRef[];
  readonly blocked: readonly WitnessRef[];
}

export interface WitnessDependencyEvaluation {
  readonly missing: readonly ArtifactRef[];
  readonly obstruction?: CausalObstruction;
}

/** The causal dependency facts needed to judge one witness. Filesystem
 * admission implements this view from exact source artifacts and its derived
 * admission indexes; the in-memory substrate implements it from its maps. */
export interface WitnessDependencyView {
  artifact(reference: ArtifactRef): AddressedArtifact | undefined;
  witnessState(reference: WitnessRef): WitnessAdmissionState;
}

function sorted<T extends string>(values: Iterable<T>): readonly T[] {
  return Object.freeze([...values].sort());
}

function recordKind(artifact: AddressedArtifact): string | undefined {
  const value = artifact.canonical.value;
  if (value === null || Array.isArray(value) || typeof value !== "object") return undefined;
  const record = value as { readonly [key: string]: unknown };
  return typeof record.kind === "string" ? record.kind : undefined;
}

/** Judge one witness against an already-settled causal cut. This is the one
 * dependency rule used by both whole-source reconstruction and incremental
 * filesystem admission. A persisted admitted cause is a fixed predecessor;
 * missing and quarantined causes remain obstructions-to-readiness, while a
 * structurally blocked cause propagates its obstruction. */
export function evaluateWitnessDependencies(
  witness: AddressedWitnessCore,
  view: WitnessDependencyView,
  site: SiteConstitution = INITIAL_SITE_CONSTITUTION,
  registry: IdentityProfileRegistry = INITIAL_IDENTITY_PROFILE_REGISTRY,
): WitnessDependencyEvaluation {
  const core = witness.core;
  const missing = new Set<ArtifactRef>();
  const articulationArtifact = view.artifact(core.articulation);
  let articulation: PrimitiveArticulation | undefined;
  if (articulationArtifact === undefined) {
    missing.add(core.articulation);
  } else {
    const validated = addressPrimitiveArticulation(
      articulationArtifact.canonical.value,
      site,
      registry,
    );
    if (!isIdentityWitness(validated) || validated.value.ref !== core.articulation) {
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
  readonly site: AddressedSiteConstitution;
  readonly causalEnvelope: CausalResourceEnvelope;
  readonly registry: IdentityProfileRegistry;

  private readonly artifactsByRef = new Map<ArtifactRef, AddressedArtifact>();
  private readonly coresByRef = new Map<WitnessRef, AddressedWitnessCore>();
  private readonly quarantinedRefs = new Set<WitnessRef>();
  private readonly admittedRefs = new Set<WitnessRef>();
  private readonly blockedByRef = new Map<WitnessRef, CausalObstruction>();
  private readonly missingByRef = new Map<WitnessRef, readonly ArtifactRef[]>();

  private constructor(
    site: AddressedSiteConstitution,
    causalEnvelope: CausalResourceEnvelope = INITIAL_CAUSAL_RESOURCE_ENVELOPE,
    registry: IdentityProfileRegistry = INITIAL_IDENTITY_PROFILE_REGISTRY,
  ) {
    this.site = site;
    this.causalEnvelope = Object.freeze({ ...causalEnvelope });
    this.registry = registry;
  }

  static fromMountedSite(
    site: AddressedSiteConstitution,
    causalEnvelope: CausalResourceEnvelope = INITIAL_CAUSAL_RESOURCE_ENVELOPE,
    registry: IdentityProfileRegistry = INITIAL_IDENTITY_PROFILE_REGISTRY,
  ): CausalSubstrate {
    return new CausalSubstrate(site, causalEnvelope, registry);
  }

  receive(reference: unknown, source: string | Uint8Array): CausalJudgment<ReceptionReceipt> {
    const verified = verifyArtifact(reference, source, this.registry);
    if (!isIdentityWitness(verified)) {
      return causalObstruction("artifact-invalid", verified.path, verified.message, typeof reference === "string" ? [reference] : []);
    }
    const artifact = verified.value;
    const existing = this.artifactsByRef.get(artifact.ref);
    if (existing !== undefined) {
      if (existing.canonical.text !== artifact.canonical.text) {
        return causalObstruction("address-collision", "$", "one ArtifactRef was observed with different canonical bytes", [artifact.ref]);
      }
      const changes = this.promoteAvailable();
      return causalWitness(this.receipt(artifact.ref, "existing", this.coresByRef.has(artifact.ref as WitnessRef), changes));
    }

    let witness: AddressedWitnessCore | undefined;
    if (recordKind(artifact) === "metroplat.witness-core") {
      const validated = validateAddressedWitnessCore(
        artifact.canonical,
        this.site.constitution,
        this.causalEnvelope,
        this.registry,
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
      this.quarantinedRefs.add(witness.ref);
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
  receiveSourceSet(sources: readonly ArtifactSource[]): CausalJudgment<CausalSubstrate> {
    const stagedArtifacts = new Map<ArtifactRef, AddressedArtifact>();
    const stagedCores = new Map<WitnessRef, AddressedWitnessCore>();

    for (const source of sources) {
      const verified = verifyArtifact(source.ref, source.canonicalText, this.registry);
      if (!isIdentityWitness(verified)) {
        return causalObstruction("artifact-invalid", verified.path, verified.message, [source.ref]);
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
        this.registry,
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
      this.quarantinedRefs.add(ref);
    }
    this.promoteAvailable();
    return causalWitness(this);
  }

  artifact(reference: ArtifactRef): AddressedArtifact | undefined {
    return this.artifactsByRef.get(reference);
  }

  witness(reference: WitnessRef): AddressedWitnessCore | undefined {
    return this.coresByRef.get(reference);
  }

  witnessState(reference: WitnessRef): WitnessAdmissionState {
    if (this.admittedRefs.has(reference)) return "admitted";
    if (this.quarantinedRefs.has(reference)) return "quarantined";
    if (this.blockedByRef.has(reference)) return "blocked";
    return "not-witness";
  }

  missingDependencies(reference: WitnessRef): readonly ArtifactRef[] {
    return this.missingByRef.get(reference) ?? Object.freeze([]);
  }

  obstruction(reference: WitnessRef): CausalObstruction | undefined {
    return this.blockedByRef.get(reference);
  }

  admittedWitnessRefs(): readonly WitnessRef[] {
    return sorted(this.admittedRefs);
  }

  sourceArtifacts(): readonly ArtifactSource[] {
    return Object.freeze(sorted(this.artifactsByRef.keys()).map((ref) => Object.freeze({
      ref,
      canonicalText: this.artifactsByRef.get(ref)!.canonical.text,
    })));
  }

  snapshot(): CausalSubstrateSnapshot {
    return Object.freeze({
      kind: "metroplat.journal.substrate-snapshot" as const,
      site: this.site.ref,
      artifacts: this.sourceArtifacts(),
      witnesses: sorted(this.coresByRef.keys()),
      admitted: sorted(this.admittedRefs),
      quarantined: sorted(this.quarantinedRefs),
      blocked: sorted(this.blockedByRef.keys()),
    });
  }

  private receipt(
    ref: ArtifactRef,
    disposition: "stored" | "existing",
    isWitness: boolean,
    changes: { readonly promoted: readonly WitnessRef[]; readonly blocked: readonly WitnessRef[] },
  ): ReceptionReceipt {
    const witnessRef = ref as WitnessRef;
    return Object.freeze({
      kind: "metroplat.journal.reception" as const,
      ref,
      disposition,
      classification: isWitness ? "witness" as const : "artifact" as const,
      witnessState: isWitness ? this.witnessState(witnessRef) : "not-witness" as const,
      missing: isWitness ? this.missingDependencies(witnessRef) : Object.freeze([]),
      promoted: changes.promoted,
      blocked: changes.blocked,
    });
  }

  private wouldCreateCycle(ref: WitnessRef, core: WitnessCore): boolean {
    return causalGraphHasCycle([
      ...[...this.coresByRef.values()].map((witness) => ({ ref: witness.ref, causes: witness.core.causes })),
      { ref, causes: core.causes },
    ]);
  }

  private promoteAvailable(): { readonly promoted: readonly WitnessRef[]; readonly blocked: readonly WitnessRef[] } {
    const promoted = new Set<WitnessRef>();
    const blocked = new Set<WitnessRef>();
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

  private evaluateDependencies(ref: WitnessRef): WitnessDependencyEvaluation {
    const witness = this.coresByRef.get(ref)!;
    return evaluateWitnessDependencies(witness, {
      artifact: (reference) => this.artifactsByRef.get(reference),
      witnessState: (reference) => this.witnessState(reference),
    }, this.site.constitution, this.registry);
  }
}

export function createCausalSubstrate(
  site: SiteConstitution = INITIAL_SITE_CONSTITUTION,
  causalEnvelope: CausalResourceEnvelope = INITIAL_CAUSAL_RESOURCE_ENVELOPE,
  registry: IdentityProfileRegistry = INITIAL_IDENTITY_PROFILE_REGISTRY,
): CausalJudgment<CausalSubstrate> {
  const addressed = addressSiteConstitution(site, registry);
  return isIdentityWitness(addressed)
    ? causalWitness(CausalSubstrate.fromMountedSite(addressed.value, causalEnvelope, registry))
    : causalObstruction("site-mismatch", "$", addressed.message);
}

export function rebuildCausalSubstrate(
  sources: readonly ArtifactSource[],
  site: SiteConstitution = INITIAL_SITE_CONSTITUTION,
  causalEnvelope: CausalResourceEnvelope = INITIAL_CAUSAL_RESOURCE_ENVELOPE,
  registry: IdentityProfileRegistry = INITIAL_IDENTITY_PROFILE_REGISTRY,
): CausalJudgment<CausalSubstrate> {
  const created = createCausalSubstrate(site, causalEnvelope, registry);
  if (!isCausalWitness(created)) return created;
  return created.value.receiveSourceSet(sources);
}
