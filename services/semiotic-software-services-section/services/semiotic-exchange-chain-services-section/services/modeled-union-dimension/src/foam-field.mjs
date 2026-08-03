import {
  chargeValue,
  chargeValueName,
  closureMonadReceipt,
  fixedSet,
  joinKnowledgeValue,
  knowledgeJoinClosure,
} from "@lenticule-science/articulating/predicating/positing";
import { isCanonicalSha256NiUri } from "@red-cup-engineering/semantic-content-identify-service";
import { EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/semantic-content-identify-service";

const PHASE = Object.freeze({ absurd: "void", potential: "positive-bulk", active: "negative-bulk", stable: "interface" });
const frozenProjectionCache = new Map();
const closureEvidenceCache = new Map();

function identify(value, objectKind = `modeled-union-dimension.${value?.type ?? "material"}`) {
  return identifyJsonSemanticContent({ objectKind, value, witnessRoot: EMPTY_WITNESS_ROOT }).token;
}
function freeze(value) {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
  if (ArrayBuffer.isView(value) || value instanceof ArrayBuffer) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}
function required(value, label) {
  if (typeof value !== "string" || value.length === 0) throw new TypeError(`${label} must be a non-empty string`);
  return value;
}
function exactNi(value, label) {
  if (!isCanonicalSha256NiUri(value)) throw new TypeError(`${label} must be a canonical SHA-256 ni identifier`);
  return value;
}

function admitTerritory(receipt) {
  if (receipt?.type !== "CarrierAdmissionReceipt" || receipt.version !== 1 || receipt.disposition !== "admitted") throw new TypeError("territoryAdmission must be one CarrierAdmissionReceipt v1");
  if (receipt.carrier === null || typeof receipt.carrier !== "object" || Array.isArray(receipt.carrier)) throw new TypeError("territoryAdmission.carrier must be one typed decoded relational value");
  required(receipt.carrier.type, "territoryAdmission.carrier.type");
  if (!("value" in receipt.carrier)) throw new TypeError("territoryAdmission.carrier.value is required");
  if (!Array.isArray(receipt.protocolVerificationReceiptNis) || receipt.protocolVerificationReceiptNis.length === 0) throw new TypeError("territoryAdmission must retain protocol verification receipts");
  const protocolVerificationReceiptNis = [...new Set(receipt.protocolVerificationReceiptNis.map((ni, index) => exactNi(ni, `territoryAdmission.protocolVerificationReceiptNis[${index}]`)))].sort();
  const contentNi = identify(receipt.carrier, `semiotic-exchange.${receipt.carrier.type}`);
  const body = freeze({ type: "CarrierAdmissionReceipt", version: 1, disposition: "admitted", contentNi, carrier: { type: receipt.carrier.type, value: structuredClone(receipt.carrier.value) }, protocolVerificationReceiptNis });
  const canonical = freeze({ id: identify(body), ...body });
  if (canonical.id !== receipt.id || canonical.contentNi !== receipt.contentNi) throw new Error("territoryAdmission does not match its canonical identity");
  const territory = canonical.carrier.value;
  if (territory?.type !== "NodeWorkspaceSourceCatalogReceipt" || territory.version !== 1) throw new TypeError("territoryAdmission does not carry a NodeWorkspaceSourceCatalogReceipt v1");
  exactNi(territory.id, "territoryAdmission.carrier.value.id");
  if (!Array.isArray(territory.packages) || !Array.isArray(territory.relations)) throw new TypeError("territory receipt must expose exact top-level packages and relations arrays");
  return { admission: canonical, territory };
}

function territoryLoci(admission, territory) {
  const seen = new Set();
  return territory.packages.map((pkg, index) => {
    required(pkg?.name, `territory.packages[${index}].name`);
    required(pkg?.path, `territory.packages[${index}].path`);
    exactNi(pkg.classificationReceiptNi, `territory.packages[${index}].classificationReceiptNi`);
    if (pkg.manifestEvidence === undefined || !Array.isArray(pkg.proofPath) || pkg.proofPath.length === 0) throw new TypeError(`territory.packages[${index}] lacks manifest evidence or its proof path`);
    const locus = `package:${pkg.name}`;
    if (seen.has(locus)) throw new Error(`territory contains duplicate locus ${locus}`);
    seen.add(locus);
    const coordinate = freeze({ type: "CodebaseTerritoryActorLocus", locus, package: pkg.name, packageVersion: pkg.version, path: pkg.path, actor: pkg.service?.actor ?? null, nodeId: pkg.service?.nodeId ?? null });
    const witnessPath = freeze({ territoryAdmissionReceiptNi: admission.id, territoryContentNi: admission.contentNi, territoryReceiptNi: territory.id, manifestEvidence: pkg.manifestEvidence, classificationReceiptNi: pkg.classificationReceiptNi, proofPath: pkg.proofPath });
    return freeze({ ...coordinate, coordinateNi: identify(coordinate), witnessPath });
  });
}

function territoryRelations(admission, territory, locusSet) {
  return territory.relations.flatMap((edge, index) => {
    if (edge?.type !== "node-package-dependency" || edge.scope !== "workspace") return [];
    const from = `package:${required(edge.consumer, `territory.relations[${index}].consumer`)}`;
    const to = `package:${required(edge.provider, `territory.relations[${index}].provider`)}`;
    if (!locusSet.has(from) || !locusSet.has(to)) throw new Error(`workspace dependency ${from} -> ${to} escapes the admitted package carrier`);
    const relation = freeze({
      type: "CodebaseTerritoryDependencyRelation", from, to, requested: edge.requested,
      role: edge.role, optional: edge.optional, selected: edge.selected,
      witnessPath: { territoryAdmissionReceiptNi: admission.id, territoryContentNi: admission.contentNi, territoryReceiptNi: territory.id, relationOrdinal: index },
    });
    return [freeze({ ...relation, id: identify(relation) })];
  });
}

function admitObserverFamily(value, locusSet) {
  if (value?.type !== "FoamObserverFamily" || value.version !== 1 || !Array.isArray(value.observers)) throw new TypeError("observerFamily must be a FoamObserverFamily v1");
  const actors = new Set();
  const observers = value.observers.map((observer, observerIndex) => {
    const actor = required(observer?.actor, `observerFamily.observers[${observerIndex}].actor`);
    if (actors.has(actor)) throw new Error(`observer family repeats actor ${actor}`);
    actors.add(actor);
    if (!Array.isArray(observer.commitments)) throw new TypeError(`observer ${actor} commitments must be an array`);
    const commitments = observer.commitments.map((commitment, commitmentIndex) => {
      const locus = required(commitment?.locus, `commitment ${observerIndex}:${commitmentIndex}.locus`);
      if (!locusSet.has(locus)) throw new Error(`observer commitment names locus outside the admitted territory: ${locus}`);
      if (commitment.polarity !== "positive" && commitment.polarity !== "negative") throw new TypeError(`commitment ${observerIndex}:${commitmentIndex}.polarity must be positive or negative`);
      if (!Array.isArray(commitment.witnessNis) || commitment.witnessNis.length === 0) throw new TypeError(`commitment ${observerIndex}:${commitmentIndex} must retain at least one witness ni`);
      const witnessNis = [...new Set(commitment.witnessNis.map((ni, witnessIndex) => exactNi(ni, `commitment ${observerIndex}:${commitmentIndex}.witnessNis[${witnessIndex}]`)))].sort();
      const assertion = freeze({ type: "FoamObservedCommitment", actor, locus, polarity: commitment.polarity, witnessNis });
      return freeze({ ...assertion, assertionNi: identify(assertion) });
    });
    commitments.sort((left, right) => left.assertionNi.localeCompare(right.assertionNi));
    return freeze({ actor, commitments });
  });
  observers.sort((left, right) => left.actor.localeCompare(right.actor));
  const family = freeze({ type: "FoamObserverFamily", version: 1, observers });
  return freeze({ ...family, id: identify(family) });
}

function exactFour(commitments) {
  let value = chargeValue("absurd");
  for (const commitment of commitments) value = joinKnowledgeValue(value, chargeValue(commitment.polarity === "positive" ? "potential" : "active"));
  const charge = chargeValueName(value);
  return freeze({
    positiveEvidence: commitments.filter(({ polarity }) => polarity === "positive").map(({ assertionNi, witnessNis }) => ({ assertionNi, witnessNis })),
    negativeEvidence: commitments.filter(({ polarity }) => polarity === "negative").map(({ assertionNi, witnessNis }) => ({ assertionNi, witnessNis })),
    charge,
    symbol: charge === "absurd" ? "bottom" : charge === "potential" ? "t" : charge === "active" ? "f" : "top",
  });
}

function closureEvidence(four) {
  const prior = closureEvidenceCache.get(four.charge);
  if (prior !== undefined) return prior;
  const closure = knowledgeJoinClosure(four.charge);
  const receipt = closureMonadReceipt(closure, "absurd", "absurd");
  const orbit = receipt.settleStepOrbit;
  const ordinal = orbit.findIndex((value, index) => index < orbit.length - 1 && value === orbit[index + 1]);
  const body = freeze({
    type: "FoamFiniteClosureEvidence", version: 1, operation: closure.operation, orbit, fixedPoint: receipt.settled,
    closureOrdinal: { kind: "finite", value: ordinal }, regime: "strict-finite",
    laws: { inflationary: receipt.settleStepInflationary, settlesByThree: receipt.settleStepSettlesByThree, noPeriodicOrbits: receipt.noPeriodicOrbits, multiplicationIdempotent: receipt.multiplicationIdempotent },
    proofAuthority: {
      lean: ["Obsmetrologia.Valuation.lfp_is_settled", "Obsmetrologia.Valuation.lfp_reached_by_three", "Obsmetrologia.four_regime_dichotomy"],
      runtime: "@lenticule-science/articulating closureMonadReceipt",
    },
  });
  const evidence = freeze({ ...body, id: identify(body) });
  closureEvidenceCache.set(four.charge, evidence);
  return evidence;
}

/** Project the corpus FOAM field equation over an admitted codebase territory. */
export function projectTerritoryFoam({ territoryAdmission, observerFamily } = {}) {
  const { admission, territory } = admitTerritory(territoryAdmission);
  if (Object.isFrozen(observerFamily)) {
    const prior = frozenProjectionCache.get(admission.id)?.get(observerFamily);
    if (prior !== undefined) return prior;
  }
  const loci = territoryLoci(admission, territory);
  const locusSet = new Set(loci.map(({ locus }) => locus));
  const relations = territoryRelations(admission, territory, locusSet);
  const family = admitObserverFamily(observerFamily, locusSet);
  // The observer family is admitted in canonical actor/assertion order above.  Index
  // its commitments once: `filter`ing the whole family at every locus made the
  // field equation quadratic while contributing no semantic information.
  const commitmentsByLocus = new Map();
  for (const observer of family.observers) for (const commitment of observer.commitments) {
    const atLocus = commitmentsByLocus.get(commitment.locus) ?? [];
    atLocus.push(commitment);
    commitmentsByLocus.set(commitment.locus, atLocus);
  }
  const sections = loci.map((coordinate) => {
    const observed = commitmentsByLocus.get(coordinate.locus) ?? [];
    const four = exactFour(observed);
    const closure = closureEvidence(four);
    const section = freeze({
      type: "FoamDerivedSection", locus: coordinate.locus, coordinateNi: coordinate.coordinateNi, observerFamilyNi: family.id,
      phase: PHASE[four.charge], four, convergence: closure,
      witnessPath: freeze({ territory: coordinate.witnessPath, commitments: observed.map(({ assertionNi, witnessNis }) => ({ assertionNi, witnessNis })), closureEvidenceNi: closure.id }),
    });
    return freeze({ ...section, id: identify(section) });
  });
  const counts = { void: 0, "positive-bulk": 0, "negative-bulk": 0, interface: 0 };
  for (const { phase } of sections) counts[phase] += 1;
  const body = freeze({
    type: "ModeledUnionFoamFieldPresentation", version: 1, territoryAdmissionReceiptNi: admission.id, territoryReceiptNi: territory.id,
    observerFamily: family,
    fourNegationSelfDualLocus: { values: fixedSet("negation").map(({ name }) => name), symbols: ["bottom", "top"], leanTheorem: "Obsmetrologia.Charge.negate_orbit", runtimeWitness: "@lenticule-science/articulating fixedSet(negation)" },
    sections, relations, census: freeze(counts),
    proofBoundary: {
      proved: "FOUR negation fixed points, finite closure/fixed-point laws, and the four-regime classifier",
      executableDefinition: "Phi_D is the knowledge-order join of explicit witnessed commitments at each admitted territory locus",
      proseOnly: "FOAM phase relativity as a universal theorem and any physical Plateau-foam consequence",
      obstruction: "This finite explicit projection cannot witness Scott, transfinite-bounded, or aperiodic closure without an independent settlement filtration and cofinality witness",
    },
  });
  const projection = freeze({ ...body, id: identify(body) });
  if (Object.isFrozen(observerFamily)) {
    let byObserver = frozenProjectionCache.get(admission.id);
    if (byObserver === undefined) {
      byObserver = new WeakMap();
      frozenProjectionCache.set(admission.id, byObserver);
    }
    byObserver.set(observerFamily, projection);
  }
  return projection;
}
