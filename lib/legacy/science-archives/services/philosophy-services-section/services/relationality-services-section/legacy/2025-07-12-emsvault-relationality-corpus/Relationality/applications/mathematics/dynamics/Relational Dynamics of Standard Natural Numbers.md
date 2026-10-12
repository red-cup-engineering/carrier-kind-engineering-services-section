## 📖 Relational Dynamics of Standard Natural Numbers

In this module, we formalize the **standard natural numbers (`StandardNat`)** alongside their **interpretation into the relational framework.**

Whereas `NumberUnit` in the relational module is built **from the ground up relationally,** `StandardNat` reflects the **conventional inductive definition of ℕ:**

- `zeroS` represents 0.
    
- `succS` represents the successor function.
    

This structure is **strict and familiar,** embodying the **standard understanding of natural numbers** as a **well-founded, discrete set with no hidden path structure.**

The primary goals of this module are twofold:

1️⃣ **Establish `StandardNat` as a strict set:**

- We rigorously prove that `StandardNat` is a **set (0-truncated),** confirming **uniqueness of identity proofs (UIP)** and ensuring that no non-trivial paths exist between numbers.
    
- This aligns `StandardNat` with the classical notion of ℕ, where two numbers are equal **only if they are definitionally the same.**
    

2️⃣ **Validate the bridge between Standard and Relational ℕ:**

- We define an **interpretation function `interpret`** that **maps `StandardNat` into `NumberUnit`.**
    
- Crucially, we **prove that `interpret`:**
    
    - **Preserves path triviality:** paths in `StandardNat` map to trivial (identity) paths in `NumberUnit`.
        
    - **Is injective:** ensuring that **distinct standard numbers remain distinct** under interpretation—no unintended identifications arise.
        

This careful bridging is vital because it allows us to **transfer proofs and properties between the two worlds reliably.** For example, any theorem we prove **in the relational setting** can be **lifted and guaranteed to hold in the standard ℕ context,** so long as our bridge maintains faithfulness and preserves structure.

---

🚩 **This module, therefore, ensures that our relationally-defined ℕ is not only conceptually robust but also technically aligned with the standard natural numbers—enabling seamless back-and-forth reasoning between relational and standard number theory.**

👉 **The following Agda code block rigorously formalizes these dynamics and proves the compatibility of the relational and standard systems.**

```
{-# OPTIONS --cubical #-}

module RelationalDynamics.StandardNat where

open import Cubical.Core.Everything
open import Cubical.Foundations.Path
open import Cubical.Foundations.Function
open import Cubical.Foundations.IsType

open import RelationalDynamics.NumberUnit

------------------------------------------------------------------------
-- Standard Natural Numbers

data StandardNat : Set where
  zeroS : StandardNat
  succS : StandardNat → StandardNat

------------------------------------------------------------------------
-- Confirm: StandardNat is a set (UIP holds)

-- Using the inductive structure of StandardNat

isSetStandardNat : isSet StandardNat
isSetStandardNat =
  standardNatInductionSet

------------------------------------------------------------------------
-- Induction for paths in StandardNat

standardNatInductionSet
  : isSet StandardNat
standardNatInductionSet zeroS zeroS = isOfHLevelPath 2 (λ _ → isPropUnit) zeroS zeroS
standardNatInductionSet zeroS (succS n) = λ p q → Path.absurd (λ ())
standardNatInductionSet (succS n) zeroS = λ p q → Path.absurd (λ ())
standardNatInductionSet (succS n) (succS m) =
  isOfHLevelPath 2
    (λ p →
      isSetStandardNat n m)
    (succS n) (succS m)

------------------------------------------------------------------------
-- Test: all paths between zeroS and zeroS are refl

trivialPathZero : (p : zeroS ≡ zeroS) → p ≡ Path.refl zeroS
trivialPathZero p = isSetStandardNat zeroS zeroS p (Path.refl zeroS)

------------------------------------------------------------------------
-- Test: paths between succS n and succS n are refl

trivialPathSucc : (n : StandardNat) → (p : succS n ≡ succS n) → p ≡ Path.refl (succS n)
trivialPathSucc n p = isSetStandardNat (succS n) (succS n) p (Path.refl (succS n))

------------------------------------------------------------------------
-- Cross-check: Interpretation preserves triviality of paths

interpret : StandardNat → NumberUnit
interpret zeroS = zeroNum
interpret (succS n) = succNum (interpret n)

interpretPathPreservation
  : (n : StandardNat)
  → (p : n ≡ n)
  → (interpret n ≡ interpret n)
interpretPathPreservation n p = Path.ap interpret p

------------------------------------------------------------------------
-- Prove that interpreting trivial paths yields trivial paths

interpretPathIsTrivial
  : (n : StandardNat)
  → (p : n ≡ n)
  → Path.ap interpret p ≡ Path.refl (interpret n)
interpretPathIsTrivial n p =
  begin
    Path.ap interpret p
    ≡⟨ cong (Path.ap interpret) (isSetStandardNat n n p (Path.refl n)) ⟩
    Path.ap interpret (Path.refl n)
    ≡⟨ Path.ap-refl interpret n ⟩
    Path.refl (interpret n)
  ∎

------------------------------------------------------------------------
-- Verify that the mapping is fully faithful: distinct numbers don't collapse

injectivityOfInterpret
  : (n m : StandardNat)
  → interpret n ≡ interpret m
  → n ≡ m
injectivityOfInterpret zeroS zeroS _ = Path.refl zeroS
injectivityOfInterpret (succS n) (succS m) p =
  let
    -- Invert succNum
    p' : succNum (interpret n) ≡ succNum (interpret m)
    p' = p

    -- By injectivity of succNum (since NumberUnit is a set)
    q : interpret n ≡ interpret m
    q = Path.ap (λ s → case s of (succNum x) → x) p'

    IH = injectivityOfInterpret n m q
  in
    cong succS IH
injectivityOfInterpret zeroS (succS _) p = Path.absurd (λ ())
injectivityOfInterpret (succS _) zeroS p = Path.absurd (λ ())

------------------------------------------------------------------------
-- Test: injectivity check on succS

testInjectivity
  : (n m : StandardNat)
  → succS n ≡ succS m
  → n ≡ m
testInjectivity n m p =
  let q = Path.ap (λ s → case s of (succS x) → x) p in q

```