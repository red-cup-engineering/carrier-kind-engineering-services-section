/**
 * models/quantum-condensate/fock-condensate - finite Fock condensate realizations.
 *
 * This captures `Obsmetrologia.Relational.Quantum.FockCondensate` as the finite
 * structure it currently proves: C4 ledger counts, particle-number Fock sectors,
 * coherent condensates with indefinite support, condensate holes, and finite
 * glass-overlap nonfactorization.
 */
import {
  fockSectorTotal,
  fockSectorTotalToFockSpace,
  type FockSectorTotal,
  type FockSpace,
} from "./filter-fiber-sector.mts";

export type C4LedgerStepName =
  | "matterCreate"
  | "antimatterCreate"
  | "matterAnnihilate"
  | "antimatterAnnihilate";

export interface C4LedgerStep {
  readonly kind: "relational.quantum.c4Ledger.step";
  readonly name: C4LedgerStepName;
  readonly isCreation: boolean;
  readonly isAnnihilation: boolean;
  readonly isMatter: boolean;
  readonly isAntimatter: boolean;
}

export interface C4Ledger {
  readonly kind: "relational.quantum.c4Ledger";
  readonly steps: readonly C4LedgerStep[];
  readonly creationCount: number;
  readonly annihilationCount: number;
  readonly particleNumber: number;
}

export interface C4LedgerParticleNumberLaws {
  readonly kind: "relational.quantum.c4Ledger.particleNumberLaws:witness";
  readonly nilParticleNumber: 0;
  readonly singleCreateParticleNumber: 1;
  readonly singleAnnihilateParticleNumber: 0;
  readonly nilLaw: true;
  readonly singleCreateLaw: true;
  readonly singleAnnihilateLaw: true;
  readonly leanTheorems: readonly [
    "Obsmetrologia.Relational.Quantum.C4Ledger.particleNumber_nil",
    "Obsmetrologia.Relational.Quantum.C4Ledger.particleNumber_single_create",
    "Obsmetrologia.Relational.Quantum.C4Ledger.particleNumber_single_annihilate",
  ];
}

export interface C4LedgerFockSectorWitness<Mode> {
  readonly kind: "relational.quantum.c4Ledger.fockSector_particleNumber:witness";
  readonly ledger: C4Ledger;
  readonly sector: FockSectorTotal<Mode>;
  readonly fockSpace: FockSpace<Mode>;
  readonly particleNumberMatchesLedger: true;
  readonly leanTheorem: "Obsmetrologia.Relational.Quantum.C4Ledger.fockSector_particleNumber";
}

export interface FockState<Mode> {
  readonly kind: "relational.quantum.fockState";
  readonly support: readonly FockSpace<Mode>[];
}

export interface IndefiniteParticleNumberWitness<Mode> {
  readonly kind: "relational.quantum.indefiniteParticleNumber:witness";
  readonly left: FockSpace<Mode>;
  readonly right: FockSpace<Mode>;
  readonly distinctParticleNumbers: true;
  readonly leanDefinition: "Obsmetrologia.Relational.Quantum.IndefiniteParticleNumber";
}

export interface CoherentCondensate<Mode, OrderParameter> {
  readonly kind: "relational.quantum.coherentCondensate";
  readonly support: FockState<Mode>;
  readonly orderParameter: OrderParameter;
  readonly indefinite: IndefiniteParticleNumberWitness<Mode>;
  readonly orderParameterCount: 1;
  readonly hasIndefiniteParticleNumber: true;
  readonly oneOrderParameter: true;
  readonly leanTheorems: readonly [
    "Obsmetrologia.Relational.Quantum.CoherentCondensate.has_indefinite_particle_number",
    "Obsmetrologia.Relational.Quantum.CoherentCondensate.orderParameterCount_eq_one",
  ];
}

export interface NoReadoutHole<Event> {
  readonly kind: "relational.quantum.condensateHole.noReadoutHole";
  readonly events: readonly Event[];
  readonly boundary: readonly Event[];
  readonly noReadoutInterior: true;
  readonly theoremReference: "Obsmetrologia.Relational.Spacetime.Boundary.Hole";
}

export interface CondensateHole<Event, Mode, OrderParameter> {
  readonly kind: "relational.quantum.condensateHole";
  readonly hole: NoReadoutHole<Event>;
  readonly condensate: CoherentCondensate<Mode, OrderParameter>;
  readonly indefiniteParticleNumber: true;
  readonly oneOrderParameter: true;
  readonly leanTheorems: readonly [
    "Obsmetrologia.Relational.Quantum.CondensateHole.indefinite_particle_number",
    "Obsmetrologia.Relational.Quantum.CondensateHole.one_order_parameter",
  ];
}

export type GlassConfiguration<Coordinate extends string, Value> = Readonly<Record<Coordinate, Value>>;

export interface NonfactorizingJoint<Coordinate extends string> {
  readonly kind: "relational.quantum.glassOverlap.joint";
  readonly label: string;
  readonly support: readonly Coordinate[];
  readonly factorizes: false;
}

export interface GlassOverlapEntanglement<Coordinate extends string, Value> {
  readonly kind: "relational.quantum.glassOverlapEntanglement";
  readonly support: readonly Coordinate[];
  readonly left: GlassConfiguration<Coordinate, Value>;
  readonly right: GlassConfiguration<Coordinate, Value>;
  readonly joint: NonfactorizingJoint<Coordinate>;
  readonly orderParameter: number;
  readonly overlapCount: number;
  readonly notFactorizes: true;
  readonly factorizedGluingExcluded: true;
  readonly leanTheorems: readonly [
    "Obsmetrologia.Relational.Quantum.GlassOverlapEntanglement.orderParameter_eq_overlapCount",
    "Obsmetrologia.Relational.Quantum.GlassOverlapEntanglement.joint_fails_to_factor",
    "Obsmetrologia.Relational.Quantum.GlassOverlapEntanglement.not_factorized_gluing",
  ];
}

export interface FockCondensateReceipt {
  readonly kind: "relational.quantum.fockCondensate.receipt:witness";
  readonly ledgerLaws: C4LedgerParticleNumberLaws;
  readonly ledgerSector: C4LedgerFockSectorWitness<string>;
  readonly condensate: CoherentCondensate<string, string>;
  readonly condensateHole: CondensateHole<string, string, string>;
  readonly glassOverlap: GlassOverlapEntanglement<"0" | "1", boolean>;
  readonly eprOrderParameter: 2;
  readonly eprNotFactorizes: true;
  readonly finiteFockSpaceOnly: true;
  readonly capturedLeanModule: "Obsmetrologia.Relational.Quantum.FockCondensate";
}

const stepTraits: Record<C4LedgerStepName, Omit<C4LedgerStep, "kind" | "name">> = Object.freeze({
  matterCreate: Object.freeze({
    isCreation: true,
    isAnnihilation: false,
    isMatter: true,
    isAntimatter: false,
  }),
  antimatterCreate: Object.freeze({
    isCreation: true,
    isAnnihilation: false,
    isMatter: false,
    isAntimatter: true,
  }),
  matterAnnihilate: Object.freeze({
    isCreation: false,
    isAnnihilation: true,
    isMatter: true,
    isAntimatter: false,
  }),
  antimatterAnnihilate: Object.freeze({
    isCreation: false,
    isAnnihilation: true,
    isMatter: false,
    isAntimatter: true,
  }),
});

const assertSafeNat = (value: number, caller: string): number => {
  if (!Number.isSafeInteger(value) || value < 0) throw new RangeError(`${caller}: expected a safe natural number`);
  return value;
};

function stepName(step: C4LedgerStepName | C4LedgerStep): C4LedgerStepName {
  return typeof step === "string" ? step : step.name;
}

function hasOwnValue<Coordinate extends string, Value>(
  configuration: Partial<Record<Coordinate, Value>>,
  coordinate: Coordinate,
): configuration is Record<Coordinate, Value> {
  return Object.hasOwn(configuration, coordinate);
}

function normalizeFockSpace<Mode>(space: FockSpace<Mode>, caller: string): FockSpace<Mode> {
  if (space.particleNumber !== space.modes.length) {
    throw new TypeError(`${caller}: Fock sector particle number does not match mode slots`);
  }
  return Object.freeze({
    kind: "relational.fock.space" as const,
    particleNumber: assertSafeNat(space.particleNumber, caller),
    modes: Object.freeze([...space.modes]),
  });
}

export function c4LedgerStep(name: C4LedgerStepName): C4LedgerStep {
  const traits = stepTraits[name];
  return Object.freeze({
    kind: "relational.quantum.c4Ledger.step" as const,
    name,
    ...traits,
  });
}

export function c4Ledger(steps: readonly (C4LedgerStepName | C4LedgerStep)[]): C4Ledger {
  const normalizedSteps = Object.freeze(steps.map((step) => c4LedgerStep(stepName(step))));
  const creationCount = normalizedSteps.filter((step) => step.isCreation).length;
  const annihilationCount = normalizedSteps.filter((step) => step.isAnnihilation).length;
  return Object.freeze({
    kind: "relational.quantum.c4Ledger" as const,
    steps: normalizedSteps,
    creationCount,
    annihilationCount,
    particleNumber: Math.max(0, creationCount - annihilationCount),
  });
}

export function c4LedgerParticleNumberLaws(): C4LedgerParticleNumberLaws {
  const nil = c4Ledger([]);
  const singleCreate = c4Ledger(["matterCreate"]);
  const singleAnnihilate = c4Ledger(["antimatterAnnihilate"]);
  if (nil.particleNumber !== 0 || singleCreate.particleNumber !== 1 || singleAnnihilate.particleNumber !== 0) {
    throw new TypeError("c4LedgerParticleNumberLaws: finite C4 ledger laws failed");
  }
  return Object.freeze({
    kind: "relational.quantum.c4Ledger.particleNumberLaws:witness" as const,
    nilParticleNumber: 0 as const,
    singleCreateParticleNumber: 1 as const,
    singleAnnihilateParticleNumber: 0 as const,
    nilLaw: true as const,
    singleCreateLaw: true as const,
    singleAnnihilateLaw: true as const,
    leanTheorems: Object.freeze([
      "Obsmetrologia.Relational.Quantum.C4Ledger.particleNumber_nil",
      "Obsmetrologia.Relational.Quantum.C4Ledger.particleNumber_single_create",
      "Obsmetrologia.Relational.Quantum.C4Ledger.particleNumber_single_annihilate",
    ] as const),
  });
}

export function c4LedgerFockSector<Mode>(
  ledger: C4Ledger,
  modes: readonly Mode[],
): C4LedgerFockSectorWitness<Mode> {
  if (modes.length !== ledger.particleNumber) {
    throw new TypeError("c4LedgerFockSector: mode slots must match the ledger particle number");
  }
  const sector = fockSectorTotal(modes);
  const fockSpace = fockSectorTotalToFockSpace(sector);
  if (fockSpace.particleNumber !== ledger.particleNumber) {
    throw new TypeError("c4LedgerFockSector: generated sector does not match ledger particle number");
  }
  return Object.freeze({
    kind: "relational.quantum.c4Ledger.fockSector_particleNumber:witness" as const,
    ledger,
    sector,
    fockSpace,
    particleNumberMatchesLedger: true as const,
    leanTheorem: "Obsmetrologia.Relational.Quantum.C4Ledger.fockSector_particleNumber" as const,
  });
}

export function fockState<Mode>(support: readonly FockSpace<Mode>[]): FockState<Mode> {
  return Object.freeze({
    kind: "relational.quantum.fockState" as const,
    support: Object.freeze(support.map((space) => normalizeFockSpace(space, "fockState"))),
  });
}

export function indefiniteParticleNumber<Mode>(
  state: FockState<Mode>,
): IndefiniteParticleNumberWitness<Mode> | undefined {
  for (const left of state.support) {
    for (const right of state.support) {
      if (left.particleNumber !== right.particleNumber) {
        return Object.freeze({
          kind: "relational.quantum.indefiniteParticleNumber:witness" as const,
          left,
          right,
          distinctParticleNumbers: true as const,
          leanDefinition: "Obsmetrologia.Relational.Quantum.IndefiniteParticleNumber" as const,
        });
      }
    }
  }
  return undefined;
}

export function coherentCondensate<Mode, OrderParameter>(
  support: FockState<Mode>,
  orderParameter: OrderParameter,
): CoherentCondensate<Mode, OrderParameter> {
  const indefinite = indefiniteParticleNumber(support);
  if (indefinite === undefined) {
    throw new TypeError("coherentCondensate: support must contain distinct particle-number sectors");
  }
  return Object.freeze({
    kind: "relational.quantum.coherentCondensate" as const,
    support,
    orderParameter,
    indefinite,
    orderParameterCount: 1 as const,
    hasIndefiniteParticleNumber: true as const,
    oneOrderParameter: true as const,
    leanTheorems: Object.freeze([
      "Obsmetrologia.Relational.Quantum.CoherentCondensate.has_indefinite_particle_number",
      "Obsmetrologia.Relational.Quantum.CoherentCondensate.orderParameterCount_eq_one",
    ] as const),
  });
}

export function noReadoutHole<Event>(
  events: readonly Event[],
  boundary: readonly Event[],
): NoReadoutHole<Event> {
  return Object.freeze({
    kind: "relational.quantum.condensateHole.noReadoutHole" as const,
    events: Object.freeze([...events]),
    boundary: Object.freeze([...boundary]),
    noReadoutInterior: true as const,
    theoremReference: "Obsmetrologia.Relational.Spacetime.Boundary.Hole" as const,
  });
}

export function condensateHole<Event, Mode, OrderParameter>(
  hole: NoReadoutHole<Event>,
  condensate: CoherentCondensate<Mode, OrderParameter>,
): CondensateHole<Event, Mode, OrderParameter> {
  return Object.freeze({
    kind: "relational.quantum.condensateHole" as const,
    hole,
    condensate,
    indefiniteParticleNumber: true as const,
    oneOrderParameter: true as const,
    leanTheorems: Object.freeze([
      "Obsmetrologia.Relational.Quantum.CondensateHole.indefinite_particle_number",
      "Obsmetrologia.Relational.Quantum.CondensateHole.one_order_parameter",
    ] as const),
  });
}

export function nonfactorizingJoint<Coordinate extends string>(
  label: string,
  support: readonly Coordinate[],
): NonfactorizingJoint<Coordinate> {
  if (label.trim().length === 0) throw new TypeError("nonfactorizingJoint: label must be nonempty");
  return Object.freeze({
    kind: "relational.quantum.glassOverlap.joint" as const,
    label: label.trim(),
    support: Object.freeze([...support]),
    factorizes: false as const,
  });
}

export function glassOverlapCount<Coordinate extends string, Value>(
  support: readonly Coordinate[],
  left: Partial<Record<Coordinate, Value>>,
  right: Partial<Record<Coordinate, Value>>,
): number {
  return support.filter((coordinate) => {
    if (!hasOwnValue(left, coordinate) || !hasOwnValue(right, coordinate)) {
      throw new TypeError(`glassOverlapCount: missing value at coordinate ${coordinate}`);
    }
    return Object.is(left[coordinate], right[coordinate]);
  }).length;
}

export function glassOverlapEntanglement<Coordinate extends string, Value>(
  support: readonly Coordinate[],
  left: GlassConfiguration<Coordinate, Value>,
  right: GlassConfiguration<Coordinate, Value>,
  joint: NonfactorizingJoint<Coordinate>,
): GlassOverlapEntanglement<Coordinate, Value> {
  const admittedSupport = Object.freeze([...support]);
  if (joint.factorizes !== false) throw new TypeError("glassOverlapEntanglement: joint must fail to factor");
  const overlapCount = glassOverlapCount(admittedSupport, left, right);
  return Object.freeze({
    kind: "relational.quantum.glassOverlapEntanglement" as const,
    support: admittedSupport,
    left: Object.freeze({ ...left }),
    right: Object.freeze({ ...right }),
    joint,
    orderParameter: overlapCount,
    overlapCount,
    notFactorizes: true as const,
    factorizedGluingExcluded: true as const,
    leanTheorems: Object.freeze([
      "Obsmetrologia.Relational.Quantum.GlassOverlapEntanglement.orderParameter_eq_overlapCount",
      "Obsmetrologia.Relational.Quantum.GlassOverlapEntanglement.joint_fails_to_factor",
      "Obsmetrologia.Relational.Quantum.GlassOverlapEntanglement.not_factorized_gluing",
    ] as const),
  });
}

export function eprGlassOverlapEntanglement(): GlassOverlapEntanglement<"0" | "1", boolean> {
  const support = Object.freeze(["0", "1"] as const);
  return glassOverlapEntanglement(
    support,
    Object.freeze({ 0: true, 1: false }),
    Object.freeze({ 0: true, 1: false }),
    nonfactorizingJoint("Obsmetrologia.Relational.Kinetic.eprJoint", support),
  );
}

export function fockCondensateReceipt(): FockCondensateReceipt {
  const ledgerLaws = c4LedgerParticleNumberLaws();
  const ledgerSector = c4LedgerFockSector(c4Ledger(["matterCreate", "antimatterCreate", "matterAnnihilate"]), [
    "mode-created",
  ]);
  const vacuum = fockSectorTotalToFockSpace(fockSectorTotal<string>([]));
  const oneParticle = fockSectorTotalToFockSpace(fockSectorTotal(["mode-created"]));
  const condensate = coherentCondensate(
    fockState([vacuum, oneParticle]),
    "retained-glass-overlap",
  );
  const condensateHoleWitness = condensateHole(
    noReadoutHole(["event-hidden"], ["event-boundary"]),
    condensate,
  );
  const glassOverlap = eprGlassOverlapEntanglement();
  if (glassOverlap.orderParameter !== 2 || !glassOverlap.notFactorizes) {
    throw new TypeError("fockCondensateReceipt: EPR glass-overlap witness failed");
  }
  return Object.freeze({
    kind: "relational.quantum.fockCondensate.receipt:witness" as const,
    ledgerLaws,
    ledgerSector,
    condensate,
    condensateHole: condensateHoleWitness,
    glassOverlap,
    eprOrderParameter: 2 as const,
    eprNotFactorizes: true as const,
    finiteFockSpaceOnly: true as const,
    capturedLeanModule: "Obsmetrologia.Relational.Quantum.FockCondensate" as const,
  });
}
