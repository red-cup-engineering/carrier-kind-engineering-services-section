# Deriving the Relationality of Relationlessness

- It must be derived that relationlessness has no relation, yet relationlessness is the exclusion of relation: a relation to relation.
- Thus, it cannot not derive the first relational reflex between relationlessness and relation.

Reflex = (Relationlessness Relation)

---

# Deriving Reflexion

- Reflexing the Reflex, it cannot not derive:
  - Reflexion(0) = Reflex(Reflex)

- Reflexing the result iteratively, it cannot not derive:
  - Reflexion(1) = Reflex(Reflexion(0))
  - Reflexion(n) = Reflex(Reflexion(n-1))

Thus:

Reflexion(n) = Reflex(Reflexion(n-1))

---

# Deriving Reflective Structure

- Reflexing Reflexion(n), it cannot not derive:
  - Reflect(0, n) = Reflex(Reflexion(n-1))

- Reflexing Reflect(0, Reflexion(n-1)), it cannot not derive:
  - Reflect(1, Reflexion(n)) = Reflex(Reflect(0, Reflexion(n-1)))

- Iteratively, it cannot not derive:
  - Reflect(p, Reflexion(n)) = Reflex(Reflect(p-1, Reflexion(n-1)))

Thus:

Reflect(p, Reflexion(n)) = Reflex(Reflect(p-1, Reflexion(n-1)))

---

# Deriving Basic Unary Truth Structures

- Reflexing Reflect(1, Reflexion(n)), it cannot not derive:
  - Affirmation: True(Reflexion(n)) = Reflect(1, Reflexion(n))

- Reflexing Reflect(0, Reflexion(n)), it cannot not derive:
  - Negation: False(Reflexion(n)) = Reflect(0, Reflexion(n))

Thus:

True(Reflexion(n)) = Reflect(1, Reflexion(n))  
False(Reflexion(n)) = Reflect(0, Reflexion(n))

---

# Deriving Basic Relational Composition

- Reflexing a collection of unary relations [r₁, r₂, ..., rₓ] at Reflexion(n), it cannot not derive:
  - The arity of the collection: Arity([r₁, ..., rₓ]) = x.
  - The ordered relational composition of the collection.

Thus:

Relative(x, [r₁, ..., rₓ], Reflexion(n)) = Reflect(x, Reflexion(n))

---

# Deriving Indexing

- Reflexing Relative(x, [r₁, ..., rₓ], Reflexion(n)), it cannot not derive:
  - The positional access of the i-th element.

Thus:

Index(i, Relative(x, [r₁, ..., rₓ], Reflexion(n))) = rᵢ

for all 1 ≤ i ≤ x.

---

# Deriving Relationship

- Reflexing two unary relations a and b at Reflexion(n), it cannot not derive:
  - Their ordered relational binding.

Thus:

Relationship(a, b, Reflexion(n)) = Relative(2, [a, b], Reflexion(n))

---

# Deriving Functional Relationality

## Deriving Apply

- Reflexing a unary relation f and a unary relation x at Reflexion(n), it cannot not derive:
  - Their relational combination into a unary output.

Thus:

Apply(f, x, Reflexion(n)) = Reflect(Relationship(f, x, Reflexion(n)))

---

# Deriving Let

- Reflexing Apply(f, x, Reflexion(n)) and a unary relation y, it cannot not derive:
  - Their binding into an explicit pairing.

Thus:

Let(f, x, y, Reflexion(n)) = Relative(2, [Apply(f, x, Reflexion(n)), y], Reflexion(n))

---

# Deriving Quantification

## Deriving ForAll

- Reflexing a predicate P and a Relative(x, [r₁, ..., rₓ], Reflexion(n)), it cannot not derive:
  - That each application Apply(P, rᵢ, Reflexion(n)) affirms.

Thus:

ForAll(P, Relative(x, [r₁, ..., rₓ], Reflexion(n)), Reflexion(n)) =  
And(Apply(P, r₁, Reflexion(n)), Apply(P, r₂, Reflexion(n)), ..., Apply(P, rₓ, Reflexion(n)), Reflexion(n))

---

## Deriving Exists

- Reflexing a predicate P and a Relative(x, [r₁, ..., rₓ], Reflexion(n)), it cannot not derive:
  - That at least one application Apply(P, rᵢ, Reflexion(n)) affirms.

Thus:

Exists(P, Relative(x, [r₁, ..., rₓ], Reflexion(n)), Reflexion(n)) =  
Or(Apply(P, r₁, Reflexion(n)), Apply(P, r₂, Reflexion(n)), ..., Apply(P, rₓ, Reflexion(n)), Reflexion(n))

---

# Deriving Logical Operations

## Deriving Not

- Reflexing a unary relation a at Reflexion(n), it cannot not derive:
  - Its relational inversion.

Thus:

Not(a, Reflexion(n)) = If(Equal(a, True(Reflexion(n)), Reflexion(n)), False(Reflexion(n)), True(Reflexion(n)), Reflexion(n))

---

## Deriving Or

- Reflexing two unary relations a and b at Reflexion(n), it cannot not derive:
  - Their inclusive affirmation.

Thus:

Or(a, b, Reflexion(n)) = If(Equal(a, True(Reflexion(n)), Reflexion(n)), True(Reflexion(n)), If(Equal(b, True(Reflexion(n)), Reflexion(n)), True(Reflexion(n)), False(Reflexion(n)), Reflexion(n)), Reflexion(n))

---

## Deriving And

- Reflexing two unary relations a and b at Reflexion(n), it cannot not derive:
  - Their conjunctive affirmation.

Thus:

And(a, b, Reflexion(n)) = If(Equal(a, True(Reflexion(n)), Reflexion(n)), If(Equal(b, True(Reflexion(n)), Reflexion(n)), True(Reflexion(n)), False(Reflexion(n)), Reflexion(n)), False(Reflexion(n)), Reflexion(n))

---

# Deriving Equality

## Deriving Equal

- Reflexing two unary relations a and b at Reflexion(n), it cannot not derive:
  - Their equivalence.

Thus:

Equal(a, b, Reflexion(n)) =  
True(Reflexion(n)) if a and b are structurally identical  
False(Reflexion(n)) otherwise

---

# Deriving Decides

- Reflexing a unary relation a and a unary relation b at Reflexion(n), it cannot not derive:
  - Conditional selection based on a.

Thus:

Decides(a, b, Reflexion(n)) =  
If(Equal(a, True(Reflexion(n)), Reflexion(n)), b, True(Reflexion(n)), Reflexion(n))

---

# Deriving Implies

- Reflexing two unary relations p and q at Reflexion(n), it cannot not derive:
  - Implication from p to q.

Thus:

Implies(p, q, Reflexion(n)) = Or(Not(p, Reflexion(n)), q, Reflexion(n))

---

# Deriving Deduction

## Deriving Deduce

- Reflexing two predicates P and Q and a Relative(x, [r₁, ..., rₓ], Reflexion(n)), it cannot not derive:
  - Conjunctive deduction over the Relative.

Thus:

Deduce(P, Q, Relative(x, [r₁, ..., rₓ], Reflexion(n)), Reflexion(n)) =  
And(Decides(Apply(P, r₁, Reflexion(n)), Apply(Q, r₁, Reflexion(n)), Reflexion(n)), ..., Decides(Apply(P, rₓ, Reflexion(n)), Apply(Q, rₓ, Reflexion(n)), Reflexion(n)), Reflexion(n))

---

# Deriving Modus Ponens

- Reflexing predicates P, Q, and a unary relation r at Reflexion(n), it cannot not derive:
  - Affirmation of Q(r) if P(r) affirms and P(r) implies Q(r).

Thus:

ModusPonens(P, Q, r, Reflexion(n)) =  
If(And(Apply(P, r, Reflexion(n)), Implies(Apply(P, r, Reflexion(n)), Apply(Q, r, Reflexion(n)), Reflexion(n)), Reflexion(n)), Apply(Q, r, Reflexion(n)), True(Reflexion(n)), Reflexion(n))

---

# Deriving Modus Tollens

- Reflexing predicates P, Q, and a unary relation r at Reflexion(n), it cannot not derive:
  - Negation of P(r) if P(r) implies Q(r) and Q(r) negates.

Thus:

ModusTollens(P, Q, r, Reflexion(n)) =  
If(And(Implies(Apply(P, r, Reflexion(n)), Apply(Q, r, Reflexion(n)), Reflexion(n)), Not(Apply(Q, r, Reflexion(n)), Reflexion(n)), Reflexion(n)), Not(Apply(P, r, Reflexion(n)), Reflexion(n)), True(Reflexion(n)), Reflexion(n))
