/**
 * jural — the Hohfeldian jural relations and their evidence-valued readings now live in
 * @red-cup-engineering/socializing (the faculty that governs with them; socializing was
 * this module's only faculty consumer). This re-exports the same public surface so
 * existing consumers of @lenticule-science/governance-services-section/jural keep resolving.
 */
export {
  JURAL_KINDS,
  correlativeKind,
  correlate,
  admitJuralRelations,
  poolJuralRelations,
  readJuralRelations,
  governanceAct,
  type JuralKind,
  type JuralRelation,
  type JuralAdmission,
  type JuralReading,
  type GovernanceActEvidence,
  type GovernanceActReading,
} from "@red-cup-engineering/socializing/jural";
