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
import { baseObjectCoincides, predicateCoincides, termCoincides, isSpecializationMorphism, } from "@red-cup-engineering/signcell/predication";
import { count, natZero } from "@red-cup-engineering/exact-number-data-service/exact-number";
/** Build a cell from subject, predicate, object. */
export const cellOf = (subject, predicate, object) => ({ subject, predicate, object });
const inferenceRule = (morphism, domain, codomain, trace = inferenceTrace([morphism])) => Object.freeze({ kind: "typedTheory.inferenceRule", domain, trace, codomain });
/** Frozen specialization inference morphism. */
export const specializationInferenceMorphism = Object.freeze({ kind: "typedTheory.inferenceMorphism.specialization" });
/** Frozen converse inference morphism. */
export const converseInferenceMorphism = Object.freeze({ kind: "typedTheory.inferenceMorphism.converse" });
/** Frozen subject projection inference morphism. */
export const subjectProjectionInferenceMorphism = Object.freeze({ kind: "typedTheory.inferenceMorphism.subjectProjection" });
/** Frozen object projection inference morphism. */
export const objectProjectionInferenceMorphism = Object.freeze({ kind: "typedTheory.inferenceMorphism.objectProjection" });
/** A frozen inference trace from a sequence of morphisms. */
export function inferenceTrace(morphisms) {
    return Object.freeze({ kind: "typedTheory.inferenceTrace", morphisms: Object.freeze([...morphisms]) });
}
/** Derive inference rules from predication data. */
export function inferenceRules(witnesses) {
    const out = [];
    for (const witness of witnesses) {
        if (isSpecializationMorphism(witness))
            out.push(inferenceRule(specializationInferenceMorphism, witness.domain, witness.codomain));
        else {
            const cell = witness;
            const node = Object.freeze([cell.subject, cell.predicate, cell.object]);
            out.push(inferenceRule(converseInferenceMorphism, node, Object.freeze([cell.object, cell.predicate, cell.subject])));
            out.push(inferenceRule(subjectProjectionInferenceMorphism, node, cell.subject));
            out.push(inferenceRule(objectProjectionInferenceMorphism, node, cell.object));
        }
    }
    return Object.freeze(out);
}
const ruleOfBaseEdge = (morphism) => (edge) => inferenceRule(morphism, edge.domain, edge.codomain);
/** Build a typed theory from a base category. */
export function theoryOfBase(base) {
    return Object.freeze({
        kind: "typedTheory.carrier",
        objects: base.objects,
        rules: Object.freeze([
            ...base.specialization.map(ruleOfBaseEdge(specializationInferenceMorphism)),
            ...base.converse.map(ruleOfBaseEdge(converseInferenceMorphism)),
            ...base.subjectProjection.map(ruleOfBaseEdge(subjectProjectionInferenceMorphism)),
            ...base.objectProjection.map(ruleOfBaseEdge(objectProjectionInferenceMorphism)),
        ]),
    });
}
/** Build a typed theory from predication data. */
export function theoryOfData(data) {
    const rules = inferenceRules(data);
    const objects = [];
    for (const rule of rules) {
        if (!objects.some((object) => baseObjectCoincides(object, rule.domain)))
            objects.push(rule.domain);
        if (!objects.some((object) => baseObjectCoincides(object, rule.codomain)))
            objects.push(rule.codomain);
    }
    return Object.freeze({ kind: "typedTheory.carrier", objects: Object.freeze(objects), rules });
}
/** Compare two inference morphisms (by kind). */
export function inferenceMorphismIdentity(left, right) {
    return left.kind === right.kind
        ? Object.freeze({ kind: "typedTheory.inferenceMorphismIdentity:witness", left, right })
        : Object.freeze({ kind: "typedTheory.inferenceMorphismIdentity-obstruction", left, right });
}
const inferenceMorphismsCoincide = (left, right) => inferenceMorphismIdentity(left, right).kind === "typedTheory.inferenceMorphismIdentity:witness";
const sameTrace = (left, right) => left.morphisms.length === right.morphisms.length && left.morphisms.every((morphism, index) => inferenceMorphismsCoincide(morphism, right.morphisms[index]));
function inferenceRulesCoincide(left, right) {
    return baseObjectCoincides(left.domain, right.domain) && baseObjectCoincides(left.codomain, right.codomain) && sameTrace(left.trace, right.trace);
}
/** Compare two inference rules (domain, codomain, trace). */
export function inferenceRuleIdentity(left, right) {
    return inferenceRulesCoincide(left, right)
        ? Object.freeze({ kind: "typedTheory.inferenceRuleIdentity:witness", left, right })
        : Object.freeze({ kind: "typedTheory.inferenceRuleIdentity-obstruction", left, right });
}
const sameGeneratedRule = (left, right) => baseObjectCoincides(left.domain, right.domain) && baseObjectCoincides(left.codomain, right.codomain);
const composeRule = (left, right) => Object.freeze({
    kind: "typedTheory.inferenceRule",
    domain: left.domain,
    trace: inferenceTrace([...left.trace.morphisms, ...right.trace.morphisms]),
    codomain: right.codomain,
});
/** Close a set of inference rules under one round of composition. */
export function composeInferenceRules(rules) {
    const out = [...rules];
    for (const left of rules) {
        for (const right of rules) {
            if (!baseObjectCoincides(left.codomain, right.domain))
                continue;
            const rule = composeRule(left, right);
            if (!out.some((existing) => sameGeneratedRule(existing, rule)))
                out.push(rule);
        }
    }
    return Object.freeze(out);
}
const sameGeneratedRuleSet = (left, right) => left.length === right.length && left.every((rule) => right.some((other) => sameGeneratedRule(rule, other)));
/** The composition closure of a theory's rules (to a fixed point). */
export function derivationClosure(theory) {
    let rules = Object.freeze([...theory.rules]);
    for (;;) {
        const next = composeInferenceRules(rules);
        if (sameGeneratedRuleSet(next, rules)) {
            const closedTheory = Object.freeze({ ...theory, rules });
            const residual = Object.freeze(rules.filter((rule) => !theory.rules.some((original) => sameGeneratedRule(original, rule))));
            return Object.freeze({
                kind: "typedTheory.derivationClosure",
                theory: closedTheory,
                generated: rules,
                generatedRank: count(rules),
                residual,
                residualRank: count(residual),
            });
        }
        rules = next;
    }
}
const derivationSearchWitness = (theory, premise, conclusion, derivation) => Object.freeze({ kind: "typedTheory.derivationSearch:witness", theory, premise, conclusion, derivation });
const derivationSearchObstruction = (theory, premise, conclusion, explored) => Object.freeze({ kind: "typedTheory.derivationSearch-obstruction", theory, premise, conclusion, explored: Object.freeze([...explored]), rank: count(explored) });
/** Breadth-first search for a derivation from premise to conclusion. */
export function derive(theory, premise, conclusion) {
    if (baseObjectCoincides(premise, conclusion)) {
        const derivation = Object.freeze({ kind: "typedTheory.derivation", theory, premise, conclusion, steps: Object.freeze([]), length: natZero });
        return derivationSearchWitness(theory, premise, conclusion, derivation);
    }
    const queue = [{ object: premise, steps: [] }];
    const seen = [premise];
    for (let index = 0; index < queue.length; index += 1) {
        const current = queue[index];
        for (const rule of theory.rules.filter((candidate) => baseObjectCoincides(candidate.domain, current.object))) {
            if (seen.some((object) => baseObjectCoincides(object, rule.codomain)))
                continue;
            const step = Object.freeze({ kind: "typedTheory.derivationStep", premise: current.object, rule, conclusion: rule.codomain });
            const steps = Object.freeze([...current.steps, step]);
            if (baseObjectCoincides(rule.codomain, conclusion)) {
                const derivation = Object.freeze({ kind: "typedTheory.derivation", theory, premise, conclusion, steps, length: count(steps) });
                return derivationSearchWitness(theory, premise, conclusion, derivation);
            }
            seen.push(rule.codomain);
            queue.push({ object: rule.codomain, steps });
        }
    }
    return derivationSearchObstruction(theory, premise, conclusion, seen);
}
/** Search for a derivation in the theory built from a base category. */
export function deriveInBase(base, premise, conclusion) {
    return derive(theoryOfBase(base), premise, conclusion);
}
/** Judge whether a conclusion is derivable from a premise. */
export function typing(theory, premise, conclusion) {
    const search = derive(theory, premise, conclusion);
    return search.kind === "typedTheory.derivationSearch:witness"
        ? Object.freeze({ kind: "typedTheory.typing:witness", theory, premise, conclusion, derivation: search.derivation })
        : Object.freeze({ kind: "typedTheory.typing-obstruction", theory, premise, conclusion, search });
}
/** Check that each step of a derivation is justified by a theory rule. */
export function derivationValidity(theory, derivation) {
    let current = derivation.premise;
    for (const step of derivation.steps) {
        const generated = theory.rules.some((rule) => inferenceRulesCoincide(rule, step.rule)
            && baseObjectCoincides(step.premise, current)
            && baseObjectCoincides(rule.domain, current)
            && baseObjectCoincides(rule.codomain, step.conclusion));
        if (!generated)
            return Object.freeze({ kind: "typedTheory.derivation-obstruction", theory, at: current, step });
        current = step.conclusion;
    }
    return Object.freeze({ kind: "typedTheory.derivationCheck:witness", theory, derivation });
}
/** Compare two derivations. */
export function derivationIdentity(left, right) {
    const same = baseObjectCoincides(left.premise, right.premise)
        && baseObjectCoincides(left.conclusion, right.conclusion)
        && left.steps.length === right.steps.length
        && left.steps.every((step, index) => {
            const other = right.steps[index];
            return inferenceRulesCoincide(step.rule, other.rule) && baseObjectCoincides(step.conclusion, other.conclusion);
        });
    return same
        ? Object.freeze({ kind: "typedTheory.derivationIdentity:witness", left, right })
        : Object.freeze({ kind: "typedTheory.derivationIdentity-obstruction", left, right });
}
/** Build a proof carrier for a theory (typing judgment for every generated rule). */
export function typedTheoryProofCarrier(theory) {
    const closure = derivationClosure(theory);
    const judgments = Object.freeze(closure.generated.map((rule) => typing(closure.theory, rule.domain, rule.codomain)));
    const obstructions = Object.freeze(judgments.filter((item) => item.kind === "typedTheory.typing-obstruction"));
    return Object.freeze({ kind: "typedTheory.proof.carrier", theory: closure.theory, closure, judgments, obstructions, rank: count(judgments) });
}
/** A predicate word arrow with a single-predicate word. */
export function predicateWordArrow(subject, predicate, object) {
    return Object.freeze({ kind: "typedTheory.predicateWordArrow", subject, word: Object.freeze([predicate]), object });
}
const predicateWordCarrier = (arrows) => Object.freeze({ kind: "typedTheory.predicateWord.carrier", arrows: Object.freeze(arrows) });
const samePredicateWord = (left, right) => left.length === right.length && left.every((predicate, index) => predicateCoincides(predicate, right[index]));
const samePredicateWordArrow = (left, right) => termCoincides(left.subject, right.subject) && samePredicateWord(left.word, right.word) && termCoincides(left.object, right.object);
const atomicPredicateWord = (arrow) => arrow.word.length === 1;
/** Close a predicate word carrier under composition. */
export function composePredicateWords(input) {
    const arrows = [...input.arrows];
    for (let leftIndex = 0; leftIndex < input.arrows.length; leftIndex += 1) {
        for (let rightIndex = 0; rightIndex < input.arrows.length; rightIndex += 1) {
            if (leftIndex === rightIndex)
                continue;
            const left = input.arrows[leftIndex];
            const right = input.arrows[rightIndex];
            if (!termCoincides(left.object, right.subject))
                continue;
            const composite = Object.freeze({ kind: "typedTheory.predicateWordArrow", subject: left.subject, word: Object.freeze([...left.word, ...right.word]), object: right.object });
            if (!arrows.some((arrow) => samePredicateWordArrow(arrow, composite)))
                arrows.push(composite);
        }
    }
    return predicateWordCarrier(arrows);
}
/** Compose the arrows of a predicate word potential. */
export function composePredicateWordPotential(input) {
    const composed = composePredicateWords(Object.freeze({ kind: "typedTheory.predicateWord.carrier", arrows: input.potential }));
    return Object.freeze({ kind: "typedTheory.predicateWordPotential", potential: composed.arrows });
}
/** Filter a predicate word carrier to its atomic (length-one) arrows. */
export function atomicPredicateWords(input) {
    return predicateWordCarrier(input.arrows.filter(atomicPredicateWord));
}
/** The predicate word residue: saturated, atomic, and composite words. */
export function predicateWordResidue(input) {
    const saturated = composePredicateWords(predicateWordCarrier(input.arrows));
    const atomic = atomicPredicateWords(saturated);
    return Object.freeze({
        kind: "typedTheory.predicateWordResidue",
        saturated,
        atomic,
        composites: Object.freeze(saturated.arrows.filter((arrow) => arrow.word.length > 1).map((arrow) => Object.freeze(arrow.word))),
    });
}

/** An inference morphism specializing a base object along a specialization edge. */
export const specializationInferenceMorphismSchema = {
  $id: "metroplat/calculus/predicating/typed-theory/specialization-inference-morphism",
  type: "object", required: ["kind"],
  properties: { kind: { const: "typedTheory.inferenceMorphism.specialization" } },
  additionalProperties: false,
};

/** An inference morphism swapping subject and object of a cell. */
export const converseInferenceMorphismSchema = {
  $id: "metroplat/calculus/predicating/typed-theory/converse-inference-morphism",
  type: "object", required: ["kind"],
  properties: { kind: { const: "typedTheory.inferenceMorphism.converse" } },
  additionalProperties: false,
};

/** An inference morphism projecting a cell onto its subject. */
export const subjectProjectionInferenceMorphismSchema = {
  $id: "metroplat/calculus/predicating/typed-theory/subject-projection-inference-morphism",
  type: "object", required: ["kind"],
  properties: { kind: { const: "typedTheory.inferenceMorphism.subjectProjection" } },
  additionalProperties: false,
};

/** An inference morphism projecting a cell onto its object. */
export const objectProjectionInferenceMorphismSchema = {
  $id: "metroplat/calculus/predicating/typed-theory/object-projection-inference-morphism",
  type: "object", required: ["kind"],
  properties: { kind: { const: "typedTheory.inferenceMorphism.objectProjection" } },
  additionalProperties: false,
};

