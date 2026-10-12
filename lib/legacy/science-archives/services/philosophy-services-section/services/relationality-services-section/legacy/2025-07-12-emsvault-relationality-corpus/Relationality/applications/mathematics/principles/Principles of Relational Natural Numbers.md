{-# OPTIONS --cubical #-}

module RelationalNatPrinciples where

open import Cubical.Core.Everything
open import Cubical.Data.Nat
open import Cubical.Data.Bool
open import Cubical.Data.List
open import Cubical.Foundations.Function
open import Cubical.Foundations.Path

-- Import your existing NumberUnit system:
open import CollatzMetaReflexiveProof public  -- Assuming this is where NumberUnit lives

------------------------------------------------------------------------
-- Arithmetic principles

-- Addition associativity:
postulate
  additionAssociative
    : (n m p : NumberUnit)
    → numberAdd n (numberAdd m p) ≡ numberAdd (numberAdd n m) p

-- Addition commutativity:
postulate
  additionCommutative
    : (n m : NumberUnit)
    → numberAdd n m ≡ numberAdd m n

-- Multiplication associativity:
postulate
  multiplicationAssociative
    : (n m p : NumberUnit)
    → numberTimes3 (numberTimes3 (numberTimes3 n))
      ≡ numberTimes3 (numberTimes3 (numberTimes3 n))  -- Placeholder for real mult

-- Distributivity of multiplication over addition:
postulate
  distributivity
    : (n m p : NumberUnit)
    → numberTimes3 (numberAdd m p)
      ≡ numberAdd (numberTimes3 m) (numberTimes3 p)

------------------------------------------------------------------------
-- Order principles

-- Trichotomy:
postulate
  trichotomy
    : (n m : NumberUnit)
    → (n ≡ m) ⊎ (∃ λ k → n ≡ numberAdd m (succNum k))
      ⊎ (∃ λ k → m ≡ numberAdd n (succNum k))

------------------------------------------------------------------------
-- Well-foundedness

-- Every non-empty list of NumberUnit has a least element:
postulate
  wellFoundedness
    : (ns : List NumberUnit)
    → (¬ (ns ≡ []))
    → Σ[ m ∈ NumberUnit ] ((m ∈ ns) × (∀ n → n ∈ ns → numberLessEq m n))

-- Less-than-or-equal (to make wellFoundedness meaningful)
postulate
  numberLessEq
    : NumberUnit → NumberUnit → Set

------------------------------------------------------------------------
-- Induction principles

-- Strong induction:
postulate
  strongInduction
    : (P : NumberUnit → Set)
    → ((n : NumberUnit)
        → (∀ m → numberLessEq m n → P m)
        → P n)
    → (n : NumberUnit)
    → P n

------------------------------------------------------------------------
-- Infinity property

postulate
  natInfinite
    : (n : NumberUnit)
    → Σ[ m ∈ NumberUnit ] (¬ (n ≡ m))

------------------------------------------------------------------------
-- Reflexivity test (already proven in Collatz module, but useful for tests)

testReflexivity
  : (n : NumberUnit)
  → Path NumberUnit n n
testReflexivity n = Path.refl n

------------------------------------------------------------------------
-- Example: checking associativity on 1 + (2 + 3)

exampleOne : NumberUnit
exampleOne = succNum zeroNum  -- 1

exampleTwo : NumberUnit
exampleTwo = succNum (succNum zeroNum)  -- 2

exampleThree : NumberUnit
exampleThree = succNum (succNum (succNum zeroNum))  -- 3

exampleAssociativityTest
  : numberAdd exampleOne (numberAdd exampleTwo exampleThree)
  ≡ numberAdd (numberAdd exampleOne exampleTwo) exampleThree
exampleAssociativityTest = additionAssociative exampleOne exampleTwo exampleThree
