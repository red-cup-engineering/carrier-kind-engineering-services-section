/**
 * Finite FOUR-valued specialization of Obsmetrologia/Calculus/Order/
 * TarskiSheafClosure.lean: Edge, IsCompatible, driveFn, settle_le_of_compatible.
 *
 * For monotone rho, join{rho(q) | q <= x} = rho(x): every summand is <= rho(x)
 * and q=x occurs. Thus four positive threshold rules per directed edge compile
 * its restriction exactly into the existing immediate-consequence operator.
 * The finite closure is the least compatible assignment above its seed. This
 * binding neither implements arbitrary transfinite iteration nor computes H1.
 */
import { type ChargeValueName } from '../../../../../../../../../../../computer-data-engineering-services-section/apps/computer-data-engine/src/bilattice-charge.mjs';
import { type ValuationFiberCarrier } from '../../valuation-fiber-algebra.mjs';
import { type ClosureRuleSystemCarrier } from './closure-rule-system.mjs';
export interface TarskiRestriction {
    readonly src: string;
    readonly tgt: string;
    readonly restrict: Readonly<Record<ChargeValueName, ChargeValueName>>;
}
export interface TarskiSheafComplex {
    readonly kind: 'tarski.four-complex';
    readonly vertices: readonly string[];
    readonly edges: readonly TarskiRestriction[];
}
export type TarskiComplexAdmission = {
    readonly kind: 'admitted';
    readonly complex: TarskiSheafComplex;
} | {
    readonly kind: 'refused';
    readonly reason: 'invalid-carrier' | 'invalid-edge' | 'nonmonotone-restriction';
    readonly edge?: number;
};
/** Validate the complete finite restriction tables and the theorem's monotonicity premise. */
export declare function admitTarskiSheafComplex(input: unknown): TarskiComplexAdmission;
/** Representation compilation, with no second fixed-point solver. */
export declare function compileTarskiSheaf(complex: TarskiSheafComplex): ClosureRuleSystemCarrier;
export interface TarskiSheafSettlement {
    readonly kind: 'tarski.four-settlement';
    readonly section: ValuationFiberCarrier;
    readonly compatible: boolean;
}
export declare function isTarskiCompatible(complex: TarskiSheafComplex, section: ValuationFiberCarrier): boolean;
export declare function settleTarskiSheaf(complex: TarskiSheafComplex, seed: Readonly<Record<string, ChargeValueName>>): TarskiSheafSettlement;
