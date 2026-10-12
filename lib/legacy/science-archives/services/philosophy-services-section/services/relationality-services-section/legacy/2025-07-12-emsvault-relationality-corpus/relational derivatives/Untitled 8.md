### REflex and Relation
- It must be derived that relationlessness has no relation, and relationlessness is the exclusion of relation, thus it cannot not derive that relationlessness has relation to relation, deriving the first reflex, between Relationlessness and Relation.

    
    - Reflex = (Relationlessness Relation)
        
- Reflexes reflex iteratively:
    
    - Reflex(0) = Reflex(Reflex)
        
    - Reflex(1) = Reflex(Reflex(0))
        
    - Reflex(n) = Reflex(Reflex(n-1))
        
- Reflexes reflexively iterate Reflexes:
    
    - Reflect(0, n) = Reflex(Reflex(n-1))
        
    - Reflect(1, n) = Reflex(Reflect(0, n-1))
        
    - Reflect(p, n) = Reflex(Reflect(p-1, n))
        

---

**Basic Unary Truth Structures**

- True(n) = Reflect(1, n)
    
- False(n) = Reflect(0, n)
    

---

**Basic Relational Composition**

- Relative(p, [x.1, ..., x.p], n) = Reflect(p, n)
    
- Index(i, Relative(p, [x.1, ..., x.p], n)) = x.i
    
- Relationship(a, b, n) = Relative(2, [a, b], n)
    

---

**Functional Relationality**

- Apply(f, x, n) = Reflect(Reflect(f, x), n)
    
- Eval(f, x, n) = Apply(f, x, n)
    
- Let(f, x, y, n) = Relative(2, [Apply(f, x, n), y], n)
    

---

**Storage and Retrieval**

- Storage(i, v, Relative(p, [x.1, ..., x.p], n), n) = Relative(p, [x.1, ..., x.(i-1), v, x.(i+1), ..., x.p], n)
    
- Retrieve(i, Relative(p, [x.1, ..., x.p], n), n) = Index(i, Relative(p, [x.1, ..., x.p], n))
    

---

**Basic Logical Structures**

- Equal(a, b, n) = True(n) if identical, False(n) otherwise
    
- Not(a, n) = If(Equal(a, True(n), n), False(n), True(n), n)
    
- Or(a, b, n) = If(Equal(a, True(n), n), True(n), If(Equal(b, True(n), n), True(n), False(n), n), n)
    
- And(a, b, n) = If(Equal(a, True(n), n), If(Equal(b, True(n), n), True(n), False(n), n), False(n), n)
    
- Decides(a, b, n) = If(Equal(a, True(n), n), b, True(n), n)
    

---

**Logical Inference**

- Implies(p, q, n) = Or(Not(p, n), q, n)
    
- Deduce(P, Q, Relative(k, [x.1, ..., x.k], n), n) =  
    And(Decides(Apply(P, x.1, n), Apply(Q, x.1, n), n), ..., Decides(Apply(P, x.k, n), Apply(Q, x.k, n), n), n)
    
- ModusPonens(P, Q, x, n) =  
    If(And(Apply(P, x, n), Implies(Apply(P, x, n), Apply(Q, x, n), n), n), Apply(Q, x, n), True(n), n)
    
- ModusTollens(P, Q, x, n) =  
    If(And(Implies(Apply(P, x, n), Apply(Q, x, n), n), Not(Apply(Q, x, n), n), n), Not(Apply(P, x, n), n), True(n), n)
    

---

**Quantifiers**

- ForAll(P, Relative(k, [...]), n) =  
    And(Implies(True(n), Apply(P, x.1, n), n), ..., Implies(True(n), Apply(P, x.k, n), n), n)
    
- Exists(P, Relative(k, [...]), n) =  
    Or(Apply(P, x.1, n), ..., Apply(P, x.k, n), n)
    

---

**Membership Structures**

- Membership(x, Relative(k, [...]), n) =  
    Or(Equal(x, x.1, n), ..., Equal(x, x.k, n), n)
    

---

**Binding Structures**

- Binding(a, b, n) = Relative(2, [a, b], n)
    
- BindingRelative(k, [...], n) = Relative(k, [Binding(a.1, b.1, n), ..., Binding(a.k, b.k, n)], n)
    
- Binds(a, BindingRelative(k, [...], n), b, n) = Membership(Binding(a, b, n), BindingRelative(k, [...], n), n)
    

---

**Program Structures**

- Program(Base, Step, n) = Binding(Base, Step, n)
    

---

**Folding and Mapping**

- Fold(F, z, Relative(k, [...]), n) =  
    If(Equal(k, True(n), n),  
    Apply(F, x.1, z, n),  
    Fold(F, Apply(F, x.1, z, n), Relative(k-1, [x.2, ..., x.k], n), n),  
    n)
    
- Map(P, Relative(k, [...]), n) =  
    Relative(k, [Apply(P, x.1, n), ..., Apply(P, x.k, n)], n)
    

---

**Basic Ordering**

- GreaterThan(a, b, n) = If(And(Equal(a, True(n), n), Equal(b, False(n), n), n), True(n), False(n), n)
    
- LessThan(a, b, n) = If(And(Equal(a, False(n), n), Equal(b, True(n), n), n), True(n), False(n), n)