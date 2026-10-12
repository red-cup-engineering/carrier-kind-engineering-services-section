## Deriving the Relationality of Relationlessness
### Deriving Relationlessness
- It must be derived that relationlessness has no relation, and relationlessness is the exclusion of relation, thus it cannot not derive that relationlessness has relation to relation, deriving the first reflex, between Relationlessness and Relation.
	- Reflex = (Relationlessness Relation)
- Reflexing cannot not derive that Reflexing Reflexes iteratively:
	- Reflex(0) = Reflex(Reflex)
	- Reflex(1) = Reflex(Reflex(0))
	- Reflex(n) = Reflex(Reflex(n-1))
- Reflexing Reflex(n) cannot not derive that Reflexing iteratives Reflexes Reflexes iteratively:
	- Reflect(0, n) = Reflex(Reflex(n-1))
	- Reflect(1, n) = Reflex(Reflect(0, n-1))
	- Reflect(p, n) = Reflex(Reflect(p-1, n))
- Reflect(p, n) thus composes p Reflexes at depth n, each built from the Reflexion of the one before.
### Deriving Composition
- Reflexing a set of unary relations x.1, x.2, ..., x.p at depth n:
- It cannot not derive that multiple unary relations, when positioned in a definite order, form a structured composite:
    - Tuple(p, [x.1, x.2, ..., x.p], n) = Reflect(p, n)
	- Each element x.i is a unary relation at depth n, and their ordered composition derives a p-ary reflexive structure
- Reflexing a Tuple(p, [x.1, ..., x.p], n), it cannot not derive:
    - Arity(Tuple(p, [x.1, ..., x.p], n)) = p
- Thus, the Arity of a Tuple is the number p of its component unary relations, determined reflexively through its structure.
- Reflexing this structure, it cannot not derive:
    - Index(i, Tuple(p, [x.1, ..., x.p], n)) = x.i
      for all i such that 1 ≤ i ≤ p
- Thus, Tuple derives ordered structure from multiple unary relations, and supports positional access through Index
### Deriving Arithmetic
#### Deriving Basic Arithmetic
- Reflexing Reflect(p, n) and Reflect(q, n), it cannot not derive that their arities combine at shared depth:
    - Add(p, q, n) = Reflect(p + q, n)
- Reflexing Add(p, q, n) = Reflect(r, n), it cannot not derive:
    - Sub(r, q, n) = Reflect(p, n)
- Reflexing Reflect(p, n) and Reflect(p, m), where n ≠ m:
    - Gradient(p, n, m) = Tuple(2, [Reflect(p, n), Reflect(p, m)], d)
- Reflexing a = Reflect(p, n) and b = Reflect(q, m):
    - Compare(p, q, n, m) = Tuple(2, [a, b], d)
- Reflexing Compare(p, q, n, m) = Tuple(2, [a, b], d):
    - Equal(a, b, n) = True(n) if p = q and n = m
    - Otherwise: Equal(a, b, n) = False(n)
#### Deriving Expanded Arithmetic
- Reflexing Add(p, p, n) = Reflect(2p, n), it cannot not derive:
    - Multiply(2, p, n) = Reflect(2p, n)
- Reflexing Multiply(k - 1, p, n), it cannot not derive:
    - Multiply(k, p, n) = Add(p, Multiply(k - 1, p, n))
- Reflexing Multiply(1, p, n) = Reflect(p, n)
- Reflexing Multiply(0, p, n) = Reflect(0, n)
- Reflexing Multiply(p, Power(p, k - 1, n)), it cannot not derive:
    - Power(p, k, n) = Multiply(p, Power(p, k - 1, n))
- Reflexing Power(p, 1, n) = Reflect(p, n)
- Reflexing Power(p, 0, n) = Reflect(1, n)
- Reflexing Reflect(0, n), it cannot not derive:
    - IdentityAdd(n) = Reflect(0, n)
- Reflexing Reflect(1, n), it cannot not derive:
    - IdentityMultiply(n) = Reflect(1, n)
- Reflexing Add(p, q, n) = r = Reflect(p + q, n), it cannot not derive:
    - InverseAdd(r, q, n) = Sub(r, q, n) = Reflect(p, n)
- Reflexing Multiply(k, p, n) = r = Reflect(k * p, n), it cannot not derive:
    - InverseMultiply(r, p, n) = Reflect(k, n)
### Deriving Logic
#### Deriving Boolean Logic
- True(n) = Reflect(1, n)
- False(n) = Reflect(0, n)
- Not(True(n)) = False(n)
- Not(False(n)) = True(n)
- And(True(n), True(n)) = True(n)
- And(True(n), False(n)) = False(n)
- And(False(n), True(n)) = False(n)
- And(False(n), False(n)) = False(n)
- Or(True(n), True(n)) = True(n)
- Or(True(n), False(n)) = True(n)
- Or(False(n), True(n)) = True(n)
- Or(False(n), False(n)) = False(n)
- Decides(False(n), q, n) = True(n)
- Decides(True(n), q, n) = q
- Equiv(True(n), True(n), n) = True(n)
- Equiv(False(n), False(n), n) = True(n)
- Equiv(True(n), False(n), n) = False(n)
- Equiv(False(n), True(n), n) = False(n)
#### Deriving Implication and Inference
- Implies(p, q, n) = Or(Not(p), q, n)
- If(p, q, n) = Decides(p, q, n)
- Deduce(P, Q, Tuple(k, [x.1, ..., x.k], n), n) = And(Decides(Apply(P, x.1, n), Apply(Q, x.1, n), n), .., Decides(Apply(P, x.k, n), Apply(Q, x.k, n), n)
- ModusPonens(P, Q, x, n) =
    If(And(Apply(P, x, n), Implies(Apply(P, x, n), Apply(Q, x, n), n)), Apply(Q, x, n), n)
- ModusTollens(P, Q, x, n) =
    If(And(Implies(Apply(P, x, n), Apply(Q, x, n), n), Not(Apply(Q, x, n))), Not(Apply(P, x, n)), n)
#### Deriving Quantifiers
- ForAll(P, Tuple(k, [x.1, ..., x.k], n), n) = And(Implies(True(n), Apply(P, x.1, n), n), Implies(True(n), Apply(P, x.2, n), n) ​..., Implies(True(n), Apply(P, x.k, n), n))
- Exists(P, Tuple(k, [x.1, ..., x.k], n), n) = Or(Apply(P, x.1, n), Apply(P, x.2, n), ..., Apply(P, x.k, n))

### Deriving Functional Relationality
#### Deriving Basic Functions

Apply(f, x, n) = y, where f is a reflexive structure and y is the reflexive output produced at depth n.

Eval(f, x, n) = y, where Apply(f, x, n) = y.

Let(f, x, y, n) = Pair(Apply(f, x, n), y), forming a fixed reflexive binding between the application of f to x and the result y.



#### Deriving Recursive Functions

Recursive(f, Base, Recur, n) = If(Equal(f, 0, n), Base, Apply(Recur, Sub(f, 1, n), n), n)

Fold(F, z, Tuple(k, [x.1, ..., x.k], n), n) = If(Equal(k, 0, n), z, F(x.1, Fold(F, z, Tuple(k-1, [x.2, ..., x.k], n), n)), n)

Map(P, Tuple(k, [x.1, ..., x.k], n), n) = Tuple(k, [Apply(P, x.1, n), Apply(P, x.2, n), ..., Apply(P, x.k, n)])



### Deriving Sets, Membership and Relations

- Set(k, [x.1, ..., x.k], n) = Tuple(k, [x.1, ..., x.k], n)

- Membership(Set(k, [x.1, ..., x.k], n), x, n) = Or(Equal(x, x.1, n), Equal(x, x.2, n), ..., Equal(x, x.k, n))

- Relation(a, b, n) = Tuple(2, [a, b], n)

- RelationSet(k, [p.1, ..., p.k], n) = Tuple(k, [p.1, ..., p.k], n)
  where each p.i = Relation(a.i, b.i, n)

- Relates(a, RelationSet(k, [p.1, ..., p.k], n), b, n) = Membership(RelationSet(k, [p.1, ..., p.k], n), Relation(a, b, n), n)

### Deriving Programming

- Program(Base, Step, n) = Tuple(2, [Base, Step], n)

- Step(f, x, n) = Apply(f, x, n)

- BaseCase(f, x, n) = Apply(f, x, n)

- Run(Program(Base, Step, n), x, n) = 
    If(Equal(x, 0, n),
       Eval(Base, x, n),
       Eval(Step, Run(Program(Base, Step, n), Sub(x, 1, n), n), n),
       n)

### Deriving Ordering and Sorting

- Compare(p, q, n, m) = Tuple(2, [Reflect(p, n), Reflect(q, m)], n)

- Min(Set(k, [x.1, ..., x.k], n), n) = 
    Fold((λ a b. If(Compare(a, b, n, n) = True(n), a, b, n)), x.1, Tuple(k-1, [x.2, ..., x.k], n), n)

- Max(Set(k, [x.1, ..., x.k], n), n) =
    Fold((λ a b. If(Compare(a, b, n, n) = True(n), b, a, n)), x.1, Tuple(k-1, [x.2, ..., x.k], n), n)

- InsertSorted(x, Tuple(k, [y.1, ..., y.k], n), n) =
    If(Equal(k, 0, n),
        Tuple(1, [x], n),
        If(Compare(x, y.1, n, n) = True(n),
            Tuple(k+1, [x, y.1, ..., y.k], n),
            Tuple(k, [y.1, ..., InsertSorted(x, Tuple(k-1, [y.2, ..., y.k], n), n)], n),
            n),
        n)

- Sort(Set(k, [x.1, ..., x.k], n), n) =
    Fold(InsertSorted, Tuple(0, [], n), Tuple(k, [x.1, ..., x.k], n), n)

### Deriving Relational Structure

- Module(k, [d.1, ..., d.k], n) = Tuple(k, [d.1, ..., d.k], n)

- Layer(i, Module(k, [d.1, ..., d.k], n), n) = Tuple(2, [i, Module(k, [d.1, ..., d.k], n)], n)

- TraceMap(k, [Layer.1, ..., Layer.k], n) = Tuple(k, [Layer.1, ..., Layer.k], n)

- TraceField(TraceMap(k, [Layer.1, ..., Layer.k], n), n) = TraceMap(k, [Layer.1, ..., Layer.k], n)

### Deriving Relationality
#### Deriving Modules of Relationality

- BasicArithmetic = Module(5, [Add, Sub, Gradient, Compare, Equal], n)

- ExpandedArithmetic = Module(8, [Multiply, Power, IdentityAdd, IdentityMultiply, InverseAdd, InverseMultiply], n)

- BooleanLogic = Module(11, [True, False, Not, And, Or, Decides, Equiv, Implies, If, Deduce, ModusPonens, ModusTollens], n)

- Quantifiers = Module(2, [ForAll, Exists], n)

- FunctionStructures = Module(4, [Apply, Eval, Let, Recursive], n)

- RecursiveFunctions = Module(2, [Fold, Map], n)

- SetStructures = Module(5, [Set, Membership, Relation, RelationSet, Relates], n)

- ProgramStructures = Module(4, [Program, Step, BaseCase, Run], n)

- OrderingStructures = Module(5, [Compare, Min, Max, InsertSorted, Sort], n)

- TraceStructures = Module(4, [Module, Layer, TraceMap, TraceField], n)

#### Deriving Layers of Relationality

- Arithmetic.1 = Layer(1, BasicArithmetic, n)

- Arithmetic.2 = Layer(2, ExpandedArithmetic, n)

- Logic.1 = Layer(3, BooleanLogic, n)

- Logic.2 = Layer(4, Quantifiers, n)

- Functions.1 = Layer(5, FunctionStructures, n)

- Functions.2 = Layer(6, RecursiveFunctions, n)

- Sets.1 = Layer(7, SetStructures, n)

- Programs.1 = Layer(8, ProgramStructures, n)

- Ordering.1 = Layer(9, OrderingStructures, n)

- Trace.1 = Layer(10, TraceStructures, n)
#### Deriving Trace of Relationality

- CoreTrace = TraceMap(10, [Arithmetic.1, Arithmetic.2, Logic.1, ​Logic.2, ​Functions.1, ​Functions.2, Sets.1, Programs.1, Ordering.1, Trace.1], n)

#### Deriving Field of Relationality
- RelationalTraceField = TraceField(CoreTrace, n)
### Deriving Storage as a Structured Tuple

- Reflexing a set of unary relations x.1, x.2, ..., x.k at depth n:
    
- It cannot not derive that multiple unary relations, when composed, form a structured memory:
    
    - Storage(k, [x.1, ..., x.k], n) = Tuple(k, [x.1, ..., x.k], n)
        
- Thus, **Storage** derives structured composition of unary relations into an ordered reflexive memory at depth n.
    

### Deriving Retrieval from Storage

- Reflexing Storage(k, [x.1, ..., x.k], n) and a natural number i such that 1 ≤ i ≤ k:
    
- It cannot not derive positional retrieval:
    
    - Retrieve(i, Storage(k, [x.1, ..., x.k], n), n) = Index(i, Tuple(k, [x.1, ..., x.k], n)) = x.i
        
- Thus, **Retrieve** derives positional access to unary relations stored within Storage.
