/** FeltOS interpretation of the shared working/governing library's typed operations.
 * Shared library packages define the carriers and transformations. This boundary admits
 * serialized requests and returns either their result or a refusal. It performs
 * no external effect and confers no authority from an analytic reading.
 */
import { classifyWork, DETERMINATION_OF_WORK_KIND, type WorkDetermination, type WorkKind }
  from '@lenticule-science/work-science-services-section';
import { evaluateAuthority, type AuthorityEvaluationRequest, type AuthorityEvaluationDecision }
  from '@lenticule-science/governance-services-section';
import { admitJuralRelations, readJuralRelations, governanceAct,
  type JuralRelation, type JuralReading, type GovernanceActEvidence, type GovernanceActReading }
  from '@lenticule-science/governance-services-section/jural';
import { admitTarskiSheafComplex, settleTarskiSheaf,
  type TarskiSheafComplex, type TarskiSheafSettlement }
  from '@lenticule-science/metrologic/articulation/predicating/positing/settling/analysis/tarski-sheaf-closure';
import { isChargeValueName, type ChargeValueName }
  from '@red-cup-engineering/computer-data-engine/bilattice-charge';

export type WorkingGoverningRequest =
  | { readonly operation:'classify-work'; readonly determination:WorkDetermination }
  | { readonly operation:'read-jural-relations'; readonly relations:readonly JuralRelation[] }
  | { readonly operation:'evaluate-authority'; readonly request:AuthorityEvaluationRequest }
  | { readonly operation:'read-governance-act'; readonly evidence:GovernanceActEvidence }
  | { readonly operation:'settle-directed-evidence'; readonly complex:TarskiSheafComplex; readonly seed:Readonly<Record<string,ChargeValueName>> };
export interface WorkingGoverningValues {
  readonly 'classify-work': WorkKind;
  readonly 'read-jural-relations': JuralReading;
  readonly 'evaluate-authority': AuthorityEvaluationDecision;
  readonly 'read-governance-act': GovernanceActReading;
  readonly 'settle-directed-evidence': TarskiSheafSettlement;
}
export type WorkingGoverningResult =
  | { [K in keyof WorkingGoverningValues]: { readonly kind:'completed'; readonly operation:K; readonly value:WorkingGoverningValues[K] } }[keyof WorkingGoverningValues]
  | { readonly kind:'refused'; readonly reason:string };
const refused = (reason:string):WorkingGoverningResult => Object.freeze({kind:'refused',reason});
const record = (value:unknown):value is Record<string,unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const chargeName = (value:unknown):value is ChargeValueName => typeof value === 'string' && isChargeValueName(value);
const completed = <K extends keyof WorkingGoverningValues>(operation:K, value:WorkingGoverningValues[K]) =>
  Object.freeze({kind:'completed' as const,operation,value});

export function runWorkingGoverning(input:unknown):WorkingGoverningResult {
  if (!record(input)) return refused('invalid-request');
  switch (input.operation) {
    case 'classify-work': {
      const d=input.determination;
      if (!record(d)) return refused('invalid-determination');
      const admitted=Object.values(DETERMINATION_OF_WORK_KIND).find(value => value.operation===d.operation && value.inputsAndPath===d.inputsAndPath);
      return admitted === undefined ? refused('invalid-determination') : completed(input.operation,classifyWork(admitted));
    }
    case 'read-jural-relations': {
      const admitted=admitJuralRelations(input.relations);
      return admitted.kind==='refused' ? refused(admitted.reason) : completed(input.operation,readJuralRelations(admitted.relations));
    }
    case 'evaluate-authority': return completed(input.operation,evaluateAuthority(input.request));
    case 'read-governance-act': {
      const e=input.evidence;
      if (!record(e)||!chargeName(e.attribution)||!chargeName(e.binding)||!chargeName(e.becoming)) return refused('invalid-governance-evidence');
      return completed(input.operation,governanceAct({attribution:e.attribution,binding:e.binding,becoming:e.becoming}));
    }
    case 'settle-directed-evidence': {
      const admitted=admitTarskiSheafComplex(input.complex);
      if (admitted.kind==='refused') return refused(admitted.reason);
      if (!record(input.seed) || Object.entries(input.seed).some(([point,value])=>!admitted.complex.vertices.includes(point)||!chargeName(value))) return refused('invalid-seed');
      return completed(input.operation,settleTarskiSheaf(admitted.complex,input.seed as Readonly<Record<string,ChargeValueName>>));
    }
    default: return refused('unknown-operation');
  }
}
