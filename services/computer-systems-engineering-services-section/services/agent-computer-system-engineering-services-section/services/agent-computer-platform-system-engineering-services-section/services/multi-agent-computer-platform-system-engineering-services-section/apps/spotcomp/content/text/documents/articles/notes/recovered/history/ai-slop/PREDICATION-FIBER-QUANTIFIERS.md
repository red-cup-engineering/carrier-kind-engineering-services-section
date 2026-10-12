# Predication Fiber Quantifiers

Status: candidate declaration surface for predication-fiber reindexing and
quantifier adjoints.

This file records the SPOTCOMP-facing obligations added by the active
predication-fiber quantifier work. It refines the hyperdoctrine layer in
[PREDICATION-FIBER-ALGEBRA.md](./PREDICATION-FIBER-ALGEBRA.md) without
claiming the full hyperdoctrine proof is complete.

## 1. Position

For a predicate morphism `f : p -> q`, reindexing is the pullback:

`f* : A_q -> A_p`

The active coordinate morphisms currently covered are:

- `converse`;
- `subject-projection`;
- `object-projection`.

For these morphisms, the quantifiers are adjoints to `f*` in two distinct
orders:

- `exists_f` is left adjoint to `f*`;
- `forall_f` is right adjoint to `f*`;
- the adjunctions are checked in the knowledge order and the truth order
  separately.

Specialization remains part of the required fibration generator inventory, but
the current finite active checker does not close the specialization
quantifier-adjoint proof.

## 2. Reindexing

The current coordinate readings are:

- converse swaps subject and object coordinates;
- subject projection reads the subject diagonal;
- object projection reads the object diagonal.

Reindexing preserves the underlying datum while changing its predicate-fiber
position. It is not a row rewrite and not a finite projection artifact.

## 3. Existential Quantifier

The existential quantifier is the left adjoint:

`exists_f(w) <= v` iff `w <= f*(v)`

For the active coordinate morphisms:

- in the knowledge order, `exists_f` folds by knowledge joins;
- in the truth order, `exists_f` folds by truth joins;
- outside the image of a projection, it fills with the bottom element for the
  chosen order;
- the output fiber is over the target predicate.

## 4. Universal Quantifier

The universal quantifier is the right adjoint:

`v <= forall_f(w)` iff `f*(v) <= w`

For the active coordinate morphisms:

- in the knowledge order, `forall_f` folds by knowledge meets;
- in the truth order, `forall_f` folds by truth meets;
- outside the image of a projection, it fills with the top element for the
  chosen order;
- the output fiber is over the target predicate.

## 5. Order Separation

The knowledge-order and truth-order adjunctions MUST remain distinct. A
profile is not conformant when it:

- collapses truth quantification into knowledge quantification;
- uses twist-product fusion as the hyperdoctrinal meet;
- asserts Frobenius for fusion as a general law;
- treats a finite boolean or FOUR-valued probe as the global value substrate.

The finite active checker is useful evidence because it exhausts a small
boolean/two-entity instance, but it is still a law probe. It does not replace
the general proof for arbitrary declared `L`, arbitrary entity support, all
predicate-category morphisms, Beck-Chevalley, Frobenius, or comprehension.

## 6. Declaration Probe

The current declaration probe is:

- [schema/predication-fiber-quantifier-profile.schema.json](./schema/predication-fiber-quantifier-profile.schema.json);
- [examples/predication-fiber-quantifier-profile.json](./examples/predication-fiber-quantifier-profile.json);
- [src/predication-fiber-quantifier-profile.mjs](./src/predication-fiber-quantifier-profile.mjs).

It checks declarations for:

- `f* : A_q -> A_p` reindexing;
- covered coordinate morphism kinds;
- existential left-adjoint law;
- universal right-adjoint law;
- knowledge/truth order separation;
- finite active-checker boundary;
- open specialization and full-hyperdoctrine obligations.
