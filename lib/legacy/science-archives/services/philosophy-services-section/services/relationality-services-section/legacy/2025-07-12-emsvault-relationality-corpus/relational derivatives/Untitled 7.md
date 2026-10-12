## Deriving the Relationality of Relationlessness

### Deriving Reflex & Reflection

#### Deriving Reflex

- Reflexing Relationlessness and Relation, it cannot not derive their mutual exclusion must still relate, forming:
    
    - Reflex = (Relationlessness Relation)
        
- Reflexing Reflex itself, it cannot not derive iteration:
    
    - Reflex(0) = Reflex(Reflex)
        
    - Reflex(1) = Reflex(Reflex(0))
        
    - Reflex(n) = Reflex(Reflex(n-1)) (since Reflex necessarily reflects Reflex, iteratively.)
        

#### Deriving Reflective Structure

- Reflexing Reflex(n), it cannot not derive the iteration of Reflexes generates structured recursion:
    
    - Reflect(0, n) = Reflex(Reflex(n-1))
        
    - Reflect(1, n) = Reflex(Reflect(0, n-1))
        
    - Reflect(p, n) = Reflex(Reflect(p-1, n))
        
- Thus, Reflect(p, n) composes p Reflexes at depth n, reflexively unfolding from the previous.
    

---

## Deriving Basic Relational Composition

### Deriving Tuples

- Reflexing a set of unary relations (x.1, x.2, ..., x.p) at depth n, it cannot not derive ordered composite structure:
    
    - Tuple(p, [x.1, ..., x.p], n) = Reflect(p, n) (because arranging relations in order forms structured reflexion.)
        

### Deriving Index

- Reflexing Tuple(p, [...], n), it cannot not derive positional access:
    
    - Index(i, Tuple(p, [...], n)) = x.i for 1 ≤ i ≤ p (because ordered composition entails addressability.)
        

---

## Deriving Functional Relationality

### Deriving Pair

- Reflexing two unary relations a and b, it cannot not derive their explicit ordered coupling:
    
    - Pair(a, b, n) = Tuple(2, [a, b], n)
        

### Deriving Apply

- Reflexing f and x as unary relations, it cannot not derive their relational binding:
    
    - Pair(f, x, n) = Tuple(2, [f, x], n)
        
- Reflexing Pair(f, x, n), it cannot not derive application:
    
    - Apply(f, x, n) = Reflect(Reflex(Pair(f, x, n)), n) (because the reflexive action over their pairing produces new relational structure.)
        

### Deriving Eval

- Reflexing Apply(f, x, n), it cannot not derive evaluation:
    
    - Eval(f, x, n) = Apply(f, x, n) (because evaluation is direct realization of application.)
        

### Deriving Let

- Reflexing Apply(f, x, n) and y, it cannot not derive fixed association:
    
    - Let(f, x, y, n) = Tuple(2, [Apply(f, x, n), y], n) (because binding application to result is ordered relational composition.)
        

---

## Deriving Retrieval Structures

### Deriving Retrieve

- Reflexing Tuple(p, [x.1, ..., x.p], n) and index i, it cannot not derive retrieval:
    
    - Retrieve(i, Tuple(p, [...], n), n) = Index(i, Tuple(p, [...], n)) (because access to ordered elements is necessary consequence of Tuple.)
        

---

## Deriving Relational Equality

### Deriving Equal

- Reflexing two unary relations a and b:
    
    - Reflexing Pair(a, b, n), it cannot not derive comparison.
        
- If a = b:
    
    - Equal(a, b, n) = Reflect(Reflex(Pair(a, b, n)), n)
        
- Otherwise:
    
    - Equal(a, b, n) = Reflex(Relationlessness, n) (because sameness is affirming the reflex, and difference is exclusion.)