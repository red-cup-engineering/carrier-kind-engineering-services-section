/**
 * thermodynamics - temperature as balanced contradiction flux.
 *
 * This module is the MetroPlat realization of `Obsmetrologia.Thermodynamics.Temperature`.
 * It does not introduce a physical simulator. It retains the same upstream
 * evidence as the Lean module: top-creation source, stochastic balance,
 * load-bearing Landauer support, and hard-flow free-energy discharge.
 *
 * @packageDocumentation
 */
import {
  chargeValue,
  type ChargeValue,
  type ChargeValueName,
} from "../../../values/index.mts";
import {
  dihedral,
  dihedralElementNames,
  type DihedralElementName,
} from "../../../logic/predicating/evidence/dihedral-gauge.mts";
import {
  advance,
  detailedBalance,
  isStationary,
  rowsSumToOne,
  type MarkovKernel,
  type StochSemiring,
} from "../../../fixpoint/stochastic.mts";
import {
  coverNerve,
  landauerEntropyReceipt,
  type CoverNerve,
  type LandauerEntropyReceipt,
} from "../../topology/coordination-cohomology.mts";
import {
  closureToStableOperator,
  freeEnergyLyapunov,
  valuation,
  type ChargeOperator,
  type FiniteValuation,
  type FreeEnergyLyapunovWitness,
} from "../../topology/flow.mts";

export type TopCreationSourceKind = "gauge" | "collision";

export interface GaugeTopCreationSource {
  readonly kind: "thermodynamics.temperature.topCreation.gauge";
  readonly charge: ChargeValue;
  readonly orbit: readonly ChargeValueName[];
  readonly count: number;
  readonly d8Length: number;
  readonly quarterRate: true;
  readonly leanTheorem: "Obsmetrologia.Thermodynamics.Temperature.gauge_top_creation_quarter";
}

export interface CollisionTopCreationSource {
  readonly kind: "thermodynamics.temperature.topCreation.collision";
  readonly positive: string;
  readonly negative: string;
  readonly target: string;
  readonly count: 1;
  readonly minted: "contested";
  readonly leanTheorem: "Obsmetrologia.Thermodynamics.Temperature.collision_top_minted";
}

export type TopCreationSource = GaugeTopCreationSource | CollisionTopCreationSource;

export interface TopFlux<C> {
  readonly kind: "thermodynamics.temperature.topFlux";
  readonly creation: C;
  readonly discharge: C;
  readonly balanced: boolean;
}

export interface BalancedTemperatureWitness<C> {
  readonly kind: "thermodynamics.temperature.balancedTemperature:witness";
  readonly flux: TopFlux<C>;
  readonly temperature: C;
  readonly unique: true;
  readonly leanTheorem: "Obsmetrologia.Thermodynamics.Temperature.balancedTemperature_unique";
}

export interface StationaryTopState<S, C> {
  readonly kind: "thermodynamics.temperature.stationaryTopState";
  readonly kernel: MarkovKernel<S, C>;
  readonly semiring: StochSemiring<C>;
  readonly distribution: (state: S) => C;
  readonly state: S;
  readonly stationary: true;
  readonly flux: TopFlux<C>;
  readonly temperature: C;
  readonly temperatureEqDistribution: true;
  readonly leanTheorems: readonly [
    "Obsmetrologia.Thermodynamics.Temperature.stationary_flux_balanced",
    "Obsmetrologia.Thermodynamics.Temperature.stationary_temperature_eq_distribution",
    "Obsmetrologia.Thermodynamics.Temperature.stationary_temperature_unique",
  ];
}

export interface DetailedBalancedTopState<S, C> {
  readonly kind: "thermodynamics.temperature.detailedBalancedTopState";
  readonly stationary: StationaryTopState<S, C>;
  readonly detailedBalance: true;
  readonly rowsSumToOne: true;
  readonly leanTheorems: readonly [
    "Obsmetrologia.Thermodynamics.Temperature.detailed_balance_stationary_flux_balanced",
    "Obsmetrologia.Thermodynamics.Temperature.detailed_balance_temperature_eq_distribution",
    "Obsmetrologia.Thermodynamics.Temperature.detailed_balance_temperature_unique",
  ];
}

export interface LandauerSupport {
  readonly kind: "thermodynamics.temperature.landauerSupport";
  readonly receipt: LandauerEntropyReceipt;
  readonly cost: number;
  readonly costPositive: true;
  readonly ledger: number;
  readonly eulerCharacteristic: number;
  readonly ledgerEqEulerCharacteristic: true;
  readonly loadBearingIffPositiveLandauer: true;
  readonly leanTheorems: readonly [
    "Obsmetrologia.Thermodynamics.Temperature.loadBearing_iff_positive_landauer",
    "Obsmetrologia.Thermodynamics.Temperature.landauerLedger_eq_eulerChar",
    "Obsmetrologia.Thermodynamics.Temperature.LandauerSupport.cost_pos",
  ];
}

export interface FreeEnergyFiring {
  readonly kind: "thermodynamics.temperature.freeEnergyFiring";
  readonly lyapunov: FreeEnergyLyapunovWitness;
  readonly time: number;
  readonly cell: string;
  readonly discharge: number;
  readonly dischargePositive: true;
  readonly leanTheorem: "Obsmetrologia.Thermodynamics.Temperature.FreeEnergyFiring.discharge_pos";
}

export interface LiftedThermoTransition<S, C> {
  readonly kind: "thermodynamics.temperature.liftedTransition";
  readonly creation: TopCreationSource;
  readonly stochastic: StationaryTopState<S, C>;
  readonly support: LandauerSupport;
  readonly firing: FreeEnergyFiring;
  readonly creationCount: number;
  readonly flux: TopFlux<C>;
  readonly temperature: C;
  readonly landauerCost: number;
  readonly discharge: number;
  readonly fluxBalanced: true;
  readonly temperatureEqDistribution: true;
  readonly producesLandauerAndDischarge: true;
  readonly producesCreationLandauerAndDischarge: true;
  readonly leanTheorems: readonly [
    "Obsmetrologia.Thermodynamics.Temperature.LiftedThermoTransition.creationCount_pos",
    "Obsmetrologia.Thermodynamics.Temperature.LiftedThermoTransition.flux_balanced",
    "Obsmetrologia.Thermodynamics.Temperature.LiftedThermoTransition.temperature_eq_distribution",
    "Obsmetrologia.Thermodynamics.Temperature.LiftedThermoTransition.produces_landauer_and_discharge",
    "Obsmetrologia.Thermodynamics.Temperature.LiftedThermoTransition.produces_creation_landauer_and_discharge",
  ];
}

export interface TemperatureModuleReceipt<S, C> {
  readonly kind: "thermodynamics.temperature.receipt:witness";
  readonly gaugeCreation: GaugeTopCreationSource;
  readonly stationary: StationaryTopState<S, C>;
  readonly detailedBalanced: DetailedBalancedTopState<S, C>;
  readonly support: LandauerSupport;
  readonly firing: FreeEnergyFiring;
  readonly transition: LiftedThermoTransition<S, C>;
  readonly capturedLeanModule: "Obsmetrologia.Thermodynamics.Temperature";
  readonly boundary: "finite witness-retaining surface; real-valued physical scaling remains outside this Node surface";
}

const assertNat = (name: string, value: number): number => {
  if (!Number.isSafeInteger(value) || value < 0) throw new TypeError(`${name} must be a safe natural number`);
  return value;
};

export function gaugeTopCreationCount(value: ChargeValue | ChargeValueName): GaugeTopCreationSource {
  const charge = typeof value === "string" ? chargeValue(value) : value;
  const orbit = Object.freeze(dihedralElementNames.map((element: DihedralElementName) => dihedral(element, charge).name));
  const count = orbit.filter((name) => name === "contested").length;
  const d8Length = dihedralElementNames.length;
  if (count <= 0 || count * 4 !== d8Length) {
    throw new TypeError("gaugeTopCreationCount: D8 held-top quarter-rate failed");
  }
  return Object.freeze({
    kind: "thermodynamics.temperature.topCreation.gauge" as const,
    charge,
    orbit,
    count,
    d8Length,
    quarterRate: true as const,
    leanTheorem: "Obsmetrologia.Thermodynamics.Temperature.gauge_top_creation_quarter" as const,
  });
}

export function collisionTopMint(positive: string, negative: string, target: string): CollisionTopCreationSource {
  if (positive.length === 0 || negative.length === 0 || target.length === 0) {
    throw new TypeError("collisionTopMint: positive, negative, and target must be named");
  }
  return Object.freeze({
    kind: "thermodynamics.temperature.topCreation.collision" as const,
    positive,
    negative,
    target,
    count: 1 as const,
    minted: "contested" as const,
    leanTheorem: "Obsmetrologia.Thermodynamics.Temperature.collision_top_minted" as const,
  });
}

export function topCreationCount(source: TopCreationSource): number {
  return source.count;
}

export function topFlux<C>(semiring: StochSemiring<C>, creation: C, discharge: C): TopFlux<C> {
  return Object.freeze({
    kind: "thermodynamics.temperature.topFlux" as const,
    creation,
    discharge,
    balanced: semiring.eq(creation, discharge),
  });
}

export function balancedTemperature<C>(flux: TopFlux<C>): C {
  if (!flux.balanced) throw new TypeError("balancedTemperature: creation and discharge differ");
  return flux.discharge;
}

export function balancedTemperatureWitness<C>(flux: TopFlux<C>): BalancedTemperatureWitness<C> {
  return Object.freeze({
    kind: "thermodynamics.temperature.balancedTemperature:witness" as const,
    flux,
    temperature: balancedTemperature(flux),
    unique: true as const,
    leanTheorem: "Obsmetrologia.Thermodynamics.Temperature.balancedTemperature_unique" as const,
  });
}

export function stationaryFlux<S, C>(
  kernel: MarkovKernel<S, C>,
  semiring: StochSemiring<C>,
  distribution: (state: S) => C,
  state: S,
): TopFlux<C> {
  return topFlux(semiring, advance(kernel, semiring, distribution)(state), distribution(state));
}

export function stationaryTopState<S, C>(
  kernel: MarkovKernel<S, C>,
  semiring: StochSemiring<C>,
  distribution: (state: S) => C,
  state: S,
): StationaryTopState<S, C> {
  if (!isStationary(kernel, semiring, distribution)) throw new TypeError("stationaryTopState: distribution is not stationary");
  const flux = stationaryFlux(kernel, semiring, distribution, state);
  const temperature = balancedTemperature(flux);
  if (!semiring.eq(temperature, distribution(state))) {
    throw new TypeError("stationaryTopState: temperature did not equal distribution at state");
  }
  return Object.freeze({
    kind: "thermodynamics.temperature.stationaryTopState" as const,
    kernel,
    semiring,
    distribution,
    state,
    stationary: true as const,
    flux,
    temperature,
    temperatureEqDistribution: true as const,
    leanTheorems: Object.freeze([
      "Obsmetrologia.Thermodynamics.Temperature.stationary_flux_balanced",
      "Obsmetrologia.Thermodynamics.Temperature.stationary_temperature_eq_distribution",
      "Obsmetrologia.Thermodynamics.Temperature.stationary_temperature_unique",
    ] as const),
  });
}

export function detailedBalancedTopState<S, C>(
  kernel: MarkovKernel<S, C>,
  semiring: StochSemiring<C>,
  distribution: (state: S) => C,
  state: S,
): DetailedBalancedTopState<S, C> {
  if (!detailedBalance(kernel, semiring, distribution)) throw new TypeError("detailedBalancedTopState: detailed balance failed");
  if (!rowsSumToOne(kernel, semiring)) throw new TypeError("detailedBalancedTopState: rows do not sum to one");
  return Object.freeze({
    kind: "thermodynamics.temperature.detailedBalancedTopState" as const,
    stationary: stationaryTopState(kernel, semiring, distribution, state),
    detailedBalance: true as const,
    rowsSumToOne: true as const,
    leanTheorems: Object.freeze([
      "Obsmetrologia.Thermodynamics.Temperature.detailed_balance_stationary_flux_balanced",
      "Obsmetrologia.Thermodynamics.Temperature.detailed_balance_temperature_eq_distribution",
      "Obsmetrologia.Thermodynamics.Temperature.detailed_balance_temperature_unique",
    ] as const),
  });
}

export function landauerLedger(nerve: CoverNerve): number {
  return nerve.components - (nerve.cells + nerve.components - nerve.entities);
}

export function landauerSupport(nerve: CoverNerve = coverNerve(3, 3, 1)): LandauerSupport {
  const receipt = landauerEntropyReceipt(nerve);
  const cost = assertNat("landauer cost", receipt.bits);
  if (cost <= 0) throw new TypeError("landauerSupport: support is not load-bearing");
  const ledger = landauerLedger(nerve);
  const eulerCharacteristic = nerve.entities - nerve.cells;
  if (ledger !== eulerCharacteristic) throw new TypeError("landauerSupport: ledger did not equal Euler characteristic");
  return Object.freeze({
    kind: "thermodynamics.temperature.landauerSupport" as const,
    receipt,
    cost,
    costPositive: true as const,
    ledger,
    eulerCharacteristic,
    ledgerEqEulerCharacteristic: true as const,
    loadBearingIffPositiveLandauer: true as const,
    leanTheorems: Object.freeze([
      "Obsmetrologia.Thermodynamics.Temperature.loadBearing_iff_positive_landauer",
      "Obsmetrologia.Thermodynamics.Temperature.landauerLedger_eq_eulerChar",
      "Obsmetrologia.Thermodynamics.Temperature.LandauerSupport.cost_pos",
    ] as const),
  });
}

export function freeEnergyFiring(
  lyapunov: FreeEnergyLyapunovWitness = freeEnergyLyapunov(
    closureToStableOperator,
    valuation(["top"], { top: "unknown" }),
  ),
  time?: number,
  cell?: string,
): FreeEnergyFiring {
  const chosenTime = time ?? lyapunov.energies.findIndex((energy, index) => {
    const next = lyapunov.energies[index + 1];
    return next !== undefined && energy > next;
  });
  if (chosenTime < 0) throw new TypeError("freeEnergyFiring: Lyapunov witness has no positive discharge step");
  const nextEnergy = lyapunov.energies[chosenTime + 1];
  if (nextEnergy === undefined) throw new TypeError("freeEnergyFiring: time has no successor energy");
  const discharge = lyapunov.energies[chosenTime]! - nextEnergy;
  if (discharge <= 0) throw new TypeError("freeEnergyFiring: discharge is not positive");
  return Object.freeze({
    kind: "thermodynamics.temperature.freeEnergyFiring" as const,
    lyapunov,
    time: chosenTime,
    cell: cell ?? lyapunov.cells[0] ?? "cell",
    discharge,
    dischargePositive: true as const,
    leanTheorem: "Obsmetrologia.Thermodynamics.Temperature.FreeEnergyFiring.discharge_pos" as const,
  });
}

export function liftedThermoTransition<S, C>(spec: {
  readonly creation: TopCreationSource;
  readonly stochastic: StationaryTopState<S, C>;
  readonly support: LandauerSupport;
  readonly firing: FreeEnergyFiring;
}): LiftedThermoTransition<S, C> {
  const creationCount = topCreationCount(spec.creation);
  if (creationCount <= 0 || !spec.stochastic.flux.balanced || spec.support.cost <= 0 || spec.firing.discharge <= 0) {
    throw new TypeError("liftedThermoTransition: finite churn package is not positive and balanced");
  }
  return Object.freeze({
    kind: "thermodynamics.temperature.liftedTransition" as const,
    creation: spec.creation,
    stochastic: spec.stochastic,
    support: spec.support,
    firing: spec.firing,
    creationCount,
    flux: spec.stochastic.flux,
    temperature: spec.stochastic.temperature,
    landauerCost: spec.support.cost,
    discharge: spec.firing.discharge,
    fluxBalanced: true as const,
    temperatureEqDistribution: true as const,
    producesLandauerAndDischarge: true as const,
    producesCreationLandauerAndDischarge: true as const,
    leanTheorems: Object.freeze([
      "Obsmetrologia.Thermodynamics.Temperature.LiftedThermoTransition.creationCount_pos",
      "Obsmetrologia.Thermodynamics.Temperature.LiftedThermoTransition.flux_balanced",
      "Obsmetrologia.Thermodynamics.Temperature.LiftedThermoTransition.temperature_eq_distribution",
      "Obsmetrologia.Thermodynamics.Temperature.LiftedThermoTransition.produces_landauer_and_discharge",
      "Obsmetrologia.Thermodynamics.Temperature.LiftedThermoTransition.produces_creation_landauer_and_discharge",
    ] as const),
  });
}

export function temperatureModuleReceipt<S, C>(spec: {
  readonly kernel: MarkovKernel<S, C>;
  readonly semiring: StochSemiring<C>;
  readonly distribution: (state: S) => C;
  readonly state: S;
  readonly charge?: ChargeValue | ChargeValueName;
  readonly support?: LandauerSupport;
  readonly firing?: FreeEnergyFiring;
}): TemperatureModuleReceipt<S, C> {
  const gaugeCreation = gaugeTopCreationCount(spec.charge ?? "contested");
  const stationary = stationaryTopState(spec.kernel, spec.semiring, spec.distribution, spec.state);
  const detailedBalanced = detailedBalancedTopState(spec.kernel, spec.semiring, spec.distribution, spec.state);
  const support = spec.support ?? landauerSupport();
  const firing = spec.firing ?? freeEnergyFiring();
  const transition = liftedThermoTransition({ creation: gaugeCreation, stochastic: stationary, support, firing });
  return Object.freeze({
    kind: "thermodynamics.temperature.receipt:witness" as const,
    gaugeCreation,
    stationary,
    detailedBalanced,
    support,
    firing,
    transition,
    capturedLeanModule: "Obsmetrologia.Thermodynamics.Temperature" as const,
    boundary: "finite witness-retaining surface; real-valued physical scaling remains outside this Node surface" as const,
  });
}
