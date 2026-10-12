/**
 * predicating/typed-theory — consequence over predication base objects.
 *
 * The logic generated inside predicating: inference morphisms (specialization,
 * converse, subject/object projection) over base objects, inference rules and
 * their composition closure, breadth-first derivation search, typing judgments
 * (is the conclusion derivable from the premise?), derivation validity checking,
 * and predicate words (composition of predicates along a path). Self-contained
 * over predication coincidence and the exact `count`/`natZero`.
 */
import { type BaseCategory, type Cell, type PredicationBaseObject, type PredicationPredicate, type PredicationTerm, type PredicationDatum } from "../predication.mjs";
import { type Natural } from "../positing/settling/analysis/exact-number.mjs";
/** An inference morphism specializing a base object along a specialization edge. */
export interface SpecializationInferenceMorphism {
    readonly kind: "typedTheory.inferenceMorphism.specialization";
}
/** An inference morphism swapping subject and object of a cell. */
export interface ConverseInferenceMorphism {
    readonly kind: "typedTheory.inferenceMorphism.converse";
}
/** An inference morphism projecting a cell onto its subject. */
export interface SubjectProjectionInferenceMorphism {
    readonly kind: "typedTheory.inferenceMorphism.subjectProjection";
}
/** An inference morphism projecting a cell onto its object. */
export interface ObjectProjectionInferenceMorphism {
    readonly kind: "typedTheory.inferenceMorphism.objectProjection";
}
/** The inference morphism kinds. */
export type InferenceMorphism = SpecializationInferenceMorphism | ConverseInferenceMorphism | SubjectProjectionInferenceMorphism | ObjectProjectionInferenceMorphism;
/** Two inference morphisms coincide. */
export interface InferenceMorphismIdentityWitness {
    readonly kind: "typedTheory.inferenceMorphismIdentity:witness";
    readonly left: InferenceMorphism;
    readonly right: InferenceMorphism;
}
/** Two inference morphisms differ. */
export interface InferenceMorphismIdentityObstruction {
    readonly kind: "typedTheory.inferenceMorphismIdentity-obstruction";
    readonly left: InferenceMorphism;
    readonly right: InferenceMorphism;
}
/** The result of comparing two inference morphisms. */
export type InferenceMorphismIdentityJudgment = InferenceMorphismIdentityWitness | InferenceMorphismIdentityObstruction;
/** A trace of inference morphisms composed in order. */
export interface InferenceTraceCarrier {
    readonly kind: "typedTheory.inferenceTrace";
    readonly morphisms: readonly InferenceMorphism[];
}
/** An inference rule: domain → codomain via a trace. */
export interface InferenceRule {
    readonly kind: "typedTheory.inferenceRule";
    readonly domain: PredicationBaseObject;
    readonly trace: InferenceTraceCarrier;
    readonly codomain: PredicationBaseObject;
}
/** Two inference rules coincide. */
export interface InferenceRuleIdentityWitness {
    readonly kind: "typedTheory.inferenceRuleIdentity:witness";
    readonly left: InferenceRule;
    readonly right: InferenceRule;
}
/** Two inference rules differ. */
export interface InferenceRuleIdentityObstruction {
    readonly kind: "typedTheory.inferenceRuleIdentity-obstruction";
    readonly left: InferenceRule;
    readonly right: InferenceRule;
}
/** The result of comparing two inference rules. */
export type InferenceRuleIdentityJudgment = InferenceRuleIdentityWitness | InferenceRuleIdentityObstruction;
/** A typed theory: base objects and the inference rules between them. */
export interface TypedTheoryCarrier {
    readonly kind: "typedTheory.carrier";
    readonly objects: readonly PredicationBaseObject[];
    readonly rules: readonly InferenceRule[];
}
/** One step of a derivation. */
export interface DerivationStep {
    readonly kind: "typedTheory.derivationStep";
    readonly premise: PredicationBaseObject;
    readonly rule: InferenceRule;
    readonly conclusion: PredicationBaseObject;
}
/** A derivation from premise to conclusion. */
export interface Derivation {
    readonly kind: "typedTheory.derivation";
    readonly theory: TypedTheoryCarrier;
    readonly premise: PredicationBaseObject;
    readonly conclusion: PredicationBaseObject;
    readonly steps: readonly DerivationStep[];
    readonly length: Natural;
}
/** Two derivations coincide. */
export interface DerivationIdentityWitness {
    readonly kind: "typedTheory.derivationIdentity:witness";
    readonly left: Derivation;
    readonly right: Derivation;
}
/** Two derivations differ. */
export interface DerivationIdentityObstruction {
    readonly kind: "typedTheory.derivationIdentity-obstruction";
    readonly left: Derivation;
    readonly right: Derivation;
}
/** The result of comparing two derivations. */
export type DerivationIdentityJudgment = DerivationIdentityWitness | DerivationIdentityObstruction;
/** A derivation was found from premise to conclusion. */
export interface DerivationSearchWitness {
    readonly kind: "typedTheory.derivationSearch:witness";
    readonly theory: TypedTheoryCarrier;
    readonly premise: PredicationBaseObject;
    readonly conclusion: PredicationBaseObject;
    readonly derivation: Derivation;
}
/** No derivation was found (the explored frontier). */
export interface DerivationSearchObstruction {
    readonly kind: "typedTheory.derivationSearch-obstruction";
    readonly theory: TypedTheoryCarrier;
    readonly premise: PredicationBaseObject;
    readonly conclusion: PredicationBaseObject;
    readonly explored: readonly PredicationBaseObject[];
    readonly rank: Natural;
}
/** The outcome of a derivation search. */
export type DerivationSearchJudgment = DerivationSearchWitness | DerivationSearchObstruction;
/** A conclusion is derivable from a premise. */
export interface TypingJudgmentWitness {
    readonly kind: "typedTheory.typing:witness";
    readonly theory: TypedTheoryCarrier;
    readonly premise: PredicationBaseObject;
    readonly conclusion: PredicationBaseObject;
    readonly derivation: Derivation;
}
/** A conclusion is not derivable from a premise. */
export interface TypingJudgmentObstruction {
    readonly kind: "typedTheory.typing-obstruction";
    readonly theory: TypedTheoryCarrier;
    readonly premise: PredicationBaseObject;
    readonly conclusion: PredicationBaseObject;
    readonly search: DerivationSearchObstruction;
}
/** The result of a typing judgment. */
export type TypingJudgment = TypingJudgmentWitness | TypingJudgmentObstruction;
/** A derivation step not justified by the theory. */
export interface DerivationObstruction {
    readonly kind: "typedTheory.derivation-obstruction";
    readonly theory: TypedTheoryCarrier;
    readonly at: PredicationBaseObject;
    readonly step: DerivationStep;
}
/** The composition closure of a theory's rules. */
export interface DerivationClosure {
    readonly kind: "typedTheory.derivationClosure";
    readonly theory: TypedTheoryCarrier;
    readonly generated: readonly InferenceRule[];
    readonly generatedRank: Natural;
    readonly residual: readonly InferenceRule[];
    readonly residualRank: Natural;
}
/** A valid derivation against a theory. */
export interface DerivationCheckWitness {
    readonly kind: "typedTheory.derivationCheck:witness";
    readonly theory: TypedTheoryCarrier;
    readonly derivation: Derivation;
}
/** The result of checking a derivation against a theory. */
export type DerivationCheckJudgment = DerivationCheckWitness | DerivationObstruction;
/** A proof carrier for a typed theory. */
export interface TypedTheoryProofCarrier {
    readonly kind: "typedTheory.proof.carrier";
    readonly theory: TypedTheoryCarrier;
    readonly closure: DerivationClosure;
    readonly judgments: readonly TypingJudgment[];
    readonly obstructions: readonly TypingJudgmentObstruction[];
    readonly rank: Natural;
}
/** A predicate word: an ordered sequence of predicates. */
export type PredicateWord = readonly PredicationPredicate[];
/** An arrow from a subject to an object labeled by a predicate word. */
export interface PredicateWordArrow {
    readonly kind: "typedTheory.predicateWordArrow";
    readonly subject: PredicationTerm;
    readonly word: PredicateWord;
    readonly object: PredicationTerm;
}
/** A collection of predicate word arrows. */
export interface PredicateWordCarrier {
    readonly kind: "typedTheory.predicateWord.carrier";
    readonly arrows: readonly PredicateWordArrow[];
}
/** A potential set of predicate word arrows pending composition. */
export interface PredicateWordPotential {
    readonly kind: "typedTheory.predicateWordPotential";
    readonly potential: readonly PredicateWordArrow[];
}
/** The residue of composing predicate words. */
export interface PredicateWordResidue {
    readonly kind: "typedTheory.predicateWordResidue";
    readonly saturated: PredicateWordCarrier;
    readonly atomic: PredicateWordCarrier;
    readonly composites: readonly PredicateWord[];
}
/** Build a cell from subject, predicate, object. */
export declare const cellOf: (subject: PredicationTerm, predicate: PredicationPredicate, object: PredicationTerm) => Cell;
/** Frozen specialization inference morphism. */
export declare const specializationInferenceMorphism: SpecializationInferenceMorphism;
/** Frozen converse inference morphism. */
export declare const converseInferenceMorphism: ConverseInferenceMorphism;
/** Frozen subject projection inference morphism. */
export declare const subjectProjectionInferenceMorphism: SubjectProjectionInferenceMorphism;
/** Frozen object projection inference morphism. */
export declare const objectProjectionInferenceMorphism: ObjectProjectionInferenceMorphism;
/** A frozen inference trace from a sequence of morphisms. */
export declare function inferenceTrace(morphisms: readonly InferenceMorphism[]): InferenceTraceCarrier;
/** Derive inference rules from predication data. */
export declare function inferenceRules(witnesses: readonly PredicationDatum[]): readonly InferenceRule[];
/** Build a typed theory from a base category. */
export declare function theoryOfBase(base: BaseCategory): TypedTheoryCarrier;
/** Build a typed theory from predication data. */
export declare function theoryOfData(data: readonly PredicationDatum[]): TypedTheoryCarrier;
/** Compare two inference morphisms (by kind). */
export declare function inferenceMorphismIdentity(left: InferenceMorphism, right: InferenceMorphism): InferenceMorphismIdentityJudgment;
/** Compare two inference rules (domain, codomain, trace). */
export declare function inferenceRuleIdentity(left: InferenceRule, right: InferenceRule): InferenceRuleIdentityJudgment;
/** Close a set of inference rules under one round of composition. */
export declare function composeInferenceRules(rules: readonly InferenceRule[]): readonly InferenceRule[];
/** The composition closure of a theory's rules (to a fixed point). */
export declare function derivationClosure(theory: TypedTheoryCarrier): DerivationClosure;
/** Breadth-first search for a derivation from premise to conclusion. */
export declare function derive(theory: TypedTheoryCarrier, premise: PredicationBaseObject, conclusion: PredicationBaseObject): DerivationSearchJudgment;
/** Search for a derivation in the theory built from a base category. */
export declare function deriveInBase(base: BaseCategory, premise: PredicationBaseObject, conclusion: PredicationBaseObject): DerivationSearchJudgment;
/** Judge whether a conclusion is derivable from a premise. */
export declare function typing(theory: TypedTheoryCarrier, premise: PredicationBaseObject, conclusion: PredicationBaseObject): TypingJudgment;
/** Check that each step of a derivation is justified by a theory rule. */
export declare function derivationValidity(theory: TypedTheoryCarrier, derivation: Derivation): DerivationCheckJudgment;
/** Compare two derivations. */
export declare function derivationIdentity(left: Derivation, right: Derivation): DerivationIdentityJudgment;
/** Build a proof carrier for a theory (typing judgment for every generated rule). */
export declare function typedTheoryProofCarrier(theory: TypedTheoryCarrier): TypedTheoryProofCarrier;
/** A predicate word arrow with a single-predicate word. */
export declare function predicateWordArrow(subject: PredicationTerm, predicate: PredicationPredicate, object: PredicationTerm): PredicateWordArrow;
/** Close a predicate word carrier under composition. */
export declare function composePredicateWords(input: PredicateWordCarrier): PredicateWordCarrier;
/** Compose the arrows of a predicate word potential. */
export declare function composePredicateWordPotential(input: PredicateWordPotential): PredicateWordPotential;
/** Filter a predicate word carrier to its atomic (length-one) arrows. */
export declare function atomicPredicateWords(input: PredicateWordCarrier): PredicateWordCarrier;
/** The predicate word residue: saturated, atomic, and composite words. */
export declare function predicateWordResidue(input: {
    readonly arrows: readonly PredicateWordArrow[];
}): PredicateWordResidue;
