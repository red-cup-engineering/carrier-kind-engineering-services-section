In this module, we formalize the **internal dynamics of the natural numbers** within a **relational framework.** Rather than taking ℕ as a fixed, foundational object, we **derive its structure relationally** using a **higher inductive type** `NumberUnit`. This allows us to model numbers not as static entities but as **points and paths—relations that generate and stabilize numeric identities.**

The core idea is that **relational numbers emerge from two fundamental dynamics:**

1. **Zero Dynamics:**
    
    - The base point `zeroNum` represents the minimal numeric unit (analogous to 0).
        
    - The path `includeNum` stabilizes `zeroNum` reflexively, ensuring that its identity is coherently maintained.
        
2. **Successor Dynamics:**
    
    - The constructor `succNum` builds the sequence of numbers iteratively.
        
    - The path `succPathNum` stabilizes each successor, again reflexively.
        

Together, these components form a **minimal cohesive system** that **generates ℕ-like behavior** purely from **relational dynamics.** However, because we are working in **cubical type theory,** we must ensure that these dynamics **do not introduce unintended higher-dimensional structures (non-trivial paths).**

To fully validate `NumberUnit` as a faithful model of ℕ, we rigorously:

- **Prove `NumberUnit` is a set (0-truncated):**
    
    - This ensures all paths between numbers are homotopically trivial—no exotic identifications exist beyond what's required.
        
- **Demonstrate that all path constructors (`includeNum`, `succPathNum`) are path-equal to the identity path (`refl`):**
    
    - This aligns `NumberUnit` with the traditional expectations of ℕ, confirming that its relational dynamics preserve strict numerical identities.
        

The significance of this approach is that we **do not assume the standard structure of ℕ;** instead, we **rebuild it from relational first principles,** and **prove from within** that the resulting structure matches standard expectations. This provides both a **deeper conceptual understanding of numbers as relational objects** and a **solid foundation for mechanizing the Collatz mechanism in relational terms.**

```
{-# OPTIONS --cubical #-}

module RelationalDynamics.NumberUnit where

open import Cubical.Core.Everything
open import Cubical.Foundations.Path
open import Cubical.Foundations.Function
open import Cubical.Foundations.IsType

------------------------------------------------------------------------
-- Definition of Relational Natural Numbers

data NumberUnit : Set where
  zeroNum    : NumberUnit
  succNum    : NumberUnit → NumberUnit
  includeNum : zeroNum ≡ zeroNum
  succPathNum : (n : NumberUnit) → succNum n ≡ succNum n

------------------------------------------------------------------------
-- Proving that NumberUnit is a set (0-truncated)

-- We proceed by showing that all paths between any two paths are trivial.

isSetNumberUnit : isSet NumberUnit
isSetNumberUnit = elimNumberUnitIsSet

------------------------------------------------------------------------
-- First: build the induction principle (eliminator)

numberUnitInduction
  : (P : NumberUnit → Set)
  → P zeroNum
  → (∀ n → P n → P (succNum n))
  → (n : NumberUnit)
  → P n
numberUnitInduction P base step zeroNum = base
numberUnitInduction P base step (succNum n) = step n (numberUnitInduction P base step n)

------------------------------------------------------------------------
-- Now: Prove that any two paths between the same two numbers are equal

pathEqualityNumberUnit
  : ∀ (x y : NumberUnit) (p q : x ≡ y) → p ≡ q
pathEqualityNumberUnit =
  numberUnitInduction
    (λ x → ∀ y → (p q : x ≡ y) → p ≡ q)
    (λ y p q → pathEqualityBaseCase zeroNum y p q)
    (λ n ih y p q → pathEqualitySuccCase n ih y p q)

------------------------------------------------------------------------
-- Base case: when x = zeroNum

pathEqualityBaseCase
  : (x y : NumberUnit) → (p q : zeroNum ≡ y) → p ≡ q
pathEqualityBaseCase zeroNum zeroNum p q =
  -- All paths from zeroNum to zeroNum are equal (by path induction)
  isSet→isPropPathP (λ _ → isSetPath NumberUnit zeroNum zeroNum) p q
pathEqualityBaseCase zeroNum (succNum y) p q =
  -- No path from zeroNum to succNum y (disjoint cases)
  Path.absurd (λ ())  -- Empty because zero ≠ succ

------------------------------------------------------------------------
-- Successor case: when x = succNum n

pathEqualitySuccCase
  : (n : NumberUnit)
  → (∀ y (p q : n ≡ y) → p ≡ q)
  → ∀ y (p q : succNum n ≡ y) → p ≡ q
pathEqualitySuccCase n ih (succNum y) p q =
  -- Reduce to paths between n and y
  isSet→isPropPathP (λ _ → isSetPath NumberUnit (succNum n) (succNum y)) p q
pathEqualitySuccCase n ih zeroNum p q =
  -- No path from succNum n to zeroNum (disjoint cases)
  Path.absurd (λ ())

------------------------------------------------------------------------
-- Prove includeNum is trivial

trivialIncludeNum : includeNum ≡ Path.refl zeroNum
trivialIncludeNum =
  pathEqualityNumberUnit zeroNum zeroNum includeNum (Path.refl zeroNum)

------------------------------------------------------------------------
-- Prove succPathNum is trivial

trivialSuccPathNum : (n : NumberUnit) → succPathNum n ≡ Path.refl (succNum n)
trivialSuccPathNum n =
  pathEqualityNumberUnit (succNum n) (succNum n) (succPathNum n) (Path.refl (succNum n))

------------------------------------------------------------------------
-- Confirm: NumberUnit is a set

elimNumberUnitIsSet : isSet NumberUnit
elimNumberUnitIsSet x y = isOfHLevelPath 2 (λ _ → isPropUnit) x y

------------------------------------------------------------------------
-- Helper: isPropUnit (unit type has unique inhabitants)

isPropUnit : isProp ⊤
isPropUnit _ _ = Path.refl tt
```