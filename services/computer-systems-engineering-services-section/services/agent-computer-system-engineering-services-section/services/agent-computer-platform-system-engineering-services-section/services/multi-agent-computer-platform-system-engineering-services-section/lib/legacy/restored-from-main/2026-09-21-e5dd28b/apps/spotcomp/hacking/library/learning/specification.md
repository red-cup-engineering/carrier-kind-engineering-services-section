# Learning Specification

Status: first normative skeleton for the continuous-learning sub-specification.

This sub-specification owns governed modeled-player learning.
Learning is monotone, trace-bearing change in represented state, skills, memory fragments, or closure-rule systems.
It is not hidden runtime adaptation.

## 1. Position In SPOTCOMP

The derivation direction is:

`aperiodic articulating -> transfinite predicating -> Scott-continuous positing -> finite settling`

Learning lives along a modeled-player trajectory.
A finite learned-state record is a settlement witness of that trajectory, not the source of the learning object.
Strong learning claims must preserve attribution, regime, governance, provenance, local settling, and CGS/ludic boundaries when learning affects play.

## 2. Learning Objects

A learning profile MUST state which object changes:

- represented evidence in `V(o)`;
- conferred skill, memory, or doctrine on a bearer;
- skill specification or coverage;
- memory fragment;
- closure-rule system `r(o)`;
- CGS or ludic strategy-relevant behavior;
- governance, capability, or operational state when learning changes what a player can do.

The profile MUST distinguish evidence learning, skill learning, memory learning, and rule learning.
Rule learning is a rule-system transition unless closure-equivalence is proved.

## 3. Answering And Referencing

The minimal learn/use cycle is:

1. reference an observable frontier or projection;
2. answer by positing a `(subject, predicate, object)` cell and value;
3. close or settle under the modeled player's rule system;
4. expose later references against the updated local settling.

Referencing is projection or coordinate movement out of the predication-cell surface.
Answering is positing.
Neither side may be collapsed into a host cache read or an untracked output string.

## 4. Teaching

Teaching confers a skill, memory, or doctrine on a bearer record by adding bearer-side predication.
The conferred object is not mutated.
Repeated identical teaching is idempotent.
Teaching refuses or downgrades when bearer conformance would be broken.

Teaching is distinct from host installation.
Installation can be an operations/computer projection of a learned capability, but it is not the learning evidence.

## 5. Skill Closure

Skill improvement is closure over skill specifications.
A conforming skill learning profile MUST preserve:

- monotonicity;
- inflationary coverage of prior cases;
- idempotence for already covered cases;
- governance and capability admission;
- trace-bearing evidence for changed specifications;
- fixed-point or non-final-prefix status.

If a runtime claims improved behavior without these witnesses, the claim is a runtime observation, not SPOTCOMP learning evidence.

## 6. Memory Fragments

Memory is represented local fragment state closed under the base closure operator.
A memory learning profile MUST declare:

- fragment identity;
- modeled-player local-settling reference;
- provenance;
- update skill or positing;
- closure rule;
- durability boundary;
- retrieval boundary.

Approximate retrieval, context-window presence, cache mutation, or hidden prompt state is not durable learning evidence by itself.

## 7. Rule Learning And Transitions

Changing `r(o)` changes the ruled observer-local system.
A rule-learning profile MUST declare:

- old rule-system reference;
- new rule-system reference;
- transition evidence;
- regime and closure-ordinal consequences;
- closure-equivalence theorem or downgrade;
- impact on consensus, disagreement, and strategy behavior.

Rule perturbation may move a modeled player across MLD or regime classification boundaries.
Smooth within-class evolution requires evidence; it is not the default.

## 8. Ludic And CGS Boundary

Learning that changes observation, inference, capability, or action behavior is part of play.
Such learning MUST be admissible as:

- predication activity over the ruled observer-local settling;
- governed operational activity when it spends resources or changes capabilities;
- ludic or CGS activity when it affects strategy, observation, or response.

This prevents hidden adaptation from sitting outside the modeled-player game.

## 9. Declaration Probe

The current declaration probe is:

- [../../CONTINUOUS-LEARNING.md](../../CONTINUOUS-LEARNING.md);
- [../../schema/continuous-learning-profile.schema.json](../../schema/continuous-learning-profile.schema.json);
- [../../examples/continuous-learning-profile.json](../../examples/continuous-learning-profile.json);
- [../../src/continuous-learning-profile.mjs](../../src/continuous-learning-profile.mjs).

The probe checks answering/referencing, teaching, skill closure, memory fragments, rule-system transition, ludic/CGS learning boundaries, and implementation downgrades.

It does not prove skill fixed points, validate learning quality, inspect runtime model weights, prove closure-equivalence of rule changes, or compute game-strategy preservation.

## 10. Non-Conformance Cases

A learning profile is not conformant when:

- it treats hidden weights, hidden context, cache mutation, or preference drift as learning evidence;
- it changes modeled-player behavior without trace-bearing predication or typed resource evidence;
- it confuses teaching with host installation;
- it improves a skill without monotone closure and prior-case preservation;
- it changes `r(o)` without declaring rule-transition consequences;
- it changes play behavior without CGS or ludic review;
- it omits governance, capability, budget, or cost evidence for operationally significant learning.

## 11. Immediate Derivation Work

The next learning specification pass needs:

- exact schemas for answering, referencing, teaching, skill improvement, memory fragments, and rule transitions;
- theorem connecting learning increments to modeled-player local settling;
- closure-equivalence criterion for rule learning;
- strategy-preservation criterion for learning in play;
- budget and ledger projection for learning costs;
- durability profile for memory fragments;
- downgrade profile for unverifiable model adaptation.
