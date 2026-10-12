/**
 * models/glass/kappa-sector-charges - finite/conditional κ-sector bridge.
 *
 * This captures the record shape of
 * `Obsmetrologia.Relational.Material.KappaSectorCharges`: material readout,
 * Landauer/H1 compatibility, shared κ projection theorems, and Collatz-frontier
 * conditional inputs. Global Collatz frontier conclusions remain conditional.
 */
import { collatzBarrierDecidableCoreReceipt, collatzBarrierKeratinReceipt } from "@lenticule-science/metrologic/number-theory/collatz";
import { glassMaterialReceipt as glassReceipt } from "./glass.mts";

export interface KappaSectorChargesReceipt {
  readonly kind: "kappaSectorCharges.receipt:witness";
  readonly capturedLeanModule: "Obsmetrologia.Relational.Material.KappaSectorCharges";
  readonly material: ReturnType<typeof glassReceipt>;
  readonly collatzCore: ReturnType<typeof collatzBarrierDecidableCoreReceipt>;
  readonly collatzKeratin: ReturnType<typeof collatzBarrierKeratinReceipt>;
  readonly materialSectorReadout: true;
  readonly materialNerveLandauerCompat: true;
  readonly materialNerveH1Compat: true;
  readonly materialNerveMatterAntimatterLedger: true;
  readonly fullSharedKappaCriterionConditional: true;
  readonly antimatterBarrierBoundaryConditional: true;
  readonly kappaPackageForPositiveSeedConditional: true;
  readonly sectorInterfaceCarried: true;
  readonly frontierStatus: "conditional-collatz-frontier-inputs";
  readonly leanTheorems: readonly [
    "Obsmetrologia.Relational.Material.KappaSectorCharges.material_sector_readout",
    "Obsmetrologia.Relational.Material.KappaSectorCharges.material_nerve_landauer_compat",
    "Obsmetrologia.Relational.Material.KappaSectorCharges.material_nerve_h1_compat",
    "Obsmetrologia.Relational.Material.KappaSectorCharges.material_nerve_antiLandauer_compat",
    "Obsmetrologia.Relational.Material.KappaSectorCharges.material_nerve_h0_compat",
    "Obsmetrologia.Relational.Material.KappaSectorCharges.material_nerve_matter_antimatter_ledger",
    "Obsmetrologia.Relational.Material.KappaSectorCharges.material_shared_kappa_carrier",
    "Obsmetrologia.Relational.Material.KappaSectorCharges.collatz_carrier_projection",
    "Obsmetrologia.Relational.Material.KappaSectorCharges.zeta_star_carrier_projection",
    "Obsmetrologia.Relational.Material.KappaSectorCharges.full_shared_kappa_carrier_of_collatz_inputs",
    "Obsmetrologia.Relational.Material.KappaSectorCharges.full_shared_kappa_carrier_iff_collatz_inputs",
    "Obsmetrologia.Relational.Material.KappaSectorCharges.full_shared_kappa_carrier_iff_noPositiveInfiniteBarrierStream",
    "Obsmetrologia.Relational.Material.KappaSectorCharges.kappaPackage_of_fullSharedKappaCarrier",
    "Obsmetrologia.Relational.Material.KappaSectorCharges.antimatter_barrier_boundary_iff_cylinderLiftContracts",
    "Obsmetrologia.Relational.Material.KappaSectorCharges.antimatter_barrier_boundary_iff_parentBarrierOneLockCollapse",
    "Obsmetrologia.Relational.Material.KappaSectorCharges.full_shared_kappa_carrier_iff_antimatter_barrier_boundary",
    "Obsmetrologia.Relational.Material.KappaSectorCharges.full_shared_kappa_carrier_iff_frontierInputs",
    "Obsmetrologia.Relational.Material.KappaSectorCharges.full_shared_carrier_implies_sector_interface",
    "Obsmetrologia.Relational.Material.KappaSectorCharges.material_kappa_sector_charges",
    "Obsmetrologia.Relational.Material.KappaSectorCharges.full_shared_carrier_material_kappa_sector_charges",
  ];
}

export function kappaSectorChargesReceipt(): KappaSectorChargesReceipt {
  const material = glassReceipt();
  const collatzCore = collatzBarrierDecidableCoreReceipt();
  const collatzKeratin = collatzBarrierKeratinReceipt();
  if (
    !material.glassRung.h1LandauerMatterLedger
    || !material.thermal.support.loadBearingIffPositiveLandauer
    || !collatzCore.finiteSearchDecidable
    || collatzKeratin.actualFormationStatus !== "not-claimed"
  ) {
    throw new TypeError("kappaSectorCharges.receipt: material/Collatz compatibility checks failed");
  }
  return Object.freeze({
    kind: "kappaSectorCharges.receipt:witness" as const,
    capturedLeanModule: "Obsmetrologia.Relational.Material.KappaSectorCharges" as const,
    material,
    collatzCore,
    collatzKeratin,
    materialSectorReadout: true as const,
    materialNerveLandauerCompat: true as const,
    materialNerveH1Compat: true as const,
    materialNerveMatterAntimatterLedger: true as const,
    fullSharedKappaCriterionConditional: true as const,
    antimatterBarrierBoundaryConditional: true as const,
    kappaPackageForPositiveSeedConditional: true as const,
    sectorInterfaceCarried: true as const,
    frontierStatus: "conditional-collatz-frontier-inputs" as const,
    leanTheorems: Object.freeze([
      "Obsmetrologia.Relational.Material.KappaSectorCharges.material_sector_readout",
      "Obsmetrologia.Relational.Material.KappaSectorCharges.material_nerve_landauer_compat",
      "Obsmetrologia.Relational.Material.KappaSectorCharges.material_nerve_h1_compat",
      "Obsmetrologia.Relational.Material.KappaSectorCharges.material_nerve_antiLandauer_compat",
      "Obsmetrologia.Relational.Material.KappaSectorCharges.material_nerve_h0_compat",
      "Obsmetrologia.Relational.Material.KappaSectorCharges.material_nerve_matter_antimatter_ledger",
      "Obsmetrologia.Relational.Material.KappaSectorCharges.material_shared_kappa_carrier",
      "Obsmetrologia.Relational.Material.KappaSectorCharges.collatz_carrier_projection",
      "Obsmetrologia.Relational.Material.KappaSectorCharges.zeta_star_carrier_projection",
      "Obsmetrologia.Relational.Material.KappaSectorCharges.full_shared_kappa_carrier_of_collatz_inputs",
      "Obsmetrologia.Relational.Material.KappaSectorCharges.full_shared_kappa_carrier_iff_collatz_inputs",
      "Obsmetrologia.Relational.Material.KappaSectorCharges.full_shared_kappa_carrier_iff_noPositiveInfiniteBarrierStream",
      "Obsmetrologia.Relational.Material.KappaSectorCharges.kappaPackage_of_fullSharedKappaCarrier",
      "Obsmetrologia.Relational.Material.KappaSectorCharges.antimatter_barrier_boundary_iff_cylinderLiftContracts",
      "Obsmetrologia.Relational.Material.KappaSectorCharges.antimatter_barrier_boundary_iff_parentBarrierOneLockCollapse",
      "Obsmetrologia.Relational.Material.KappaSectorCharges.full_shared_kappa_carrier_iff_antimatter_barrier_boundary",
      "Obsmetrologia.Relational.Material.KappaSectorCharges.full_shared_kappa_carrier_iff_frontierInputs",
      "Obsmetrologia.Relational.Material.KappaSectorCharges.full_shared_carrier_implies_sector_interface",
      "Obsmetrologia.Relational.Material.KappaSectorCharges.material_kappa_sector_charges",
      "Obsmetrologia.Relational.Material.KappaSectorCharges.full_shared_carrier_material_kappa_sector_charges",
    ] as const),
  });
}
