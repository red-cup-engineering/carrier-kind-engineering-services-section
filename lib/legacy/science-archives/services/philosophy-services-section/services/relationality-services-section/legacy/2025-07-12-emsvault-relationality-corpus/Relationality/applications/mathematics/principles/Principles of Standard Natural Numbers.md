{-# OPTIONS --cubical #-}

module StandardRelationalMapping where

open import Cubical.Core.Everything
open import Cubical.Data.Nat as Nat hiding (_+_; _≡_; zero; suc)
open import Cubical.Data.List
open import Cubical.Foundations.Function
open import Cubical.Foundations.Path
open import Cubical.Data.Sigma

------------------------------------------------------------------------
-- Standard Natural Numbers: Peano definition

data StandardNat : Set where
  zeroS : StandardNat
  succS : StandardNat → StandardNat

------------------------------------------------------------------------
-- Addition on StandardNat

standardAdd : StandardNat → StandardNat → StandardNat
standardAdd zeroS      n = n
standardAdd (succS m) n = succS (standardAdd m n)

------------------------------------------------------------------------
-- Ordering on StandardNat

data standardLessEq : StandardNat → StandardNat → Set where
  leqZero : ∀ n → standardLessEq zeroS n
  leqSucc : ∀ {n m} → standardLessEq n m → standardLessEq (succS n) (succS m)

------------------------------------------------------------------------
-- Relational Natural Numbers: NumberUnit

data NumberUnit : Set where
  zeroNum    : NumberUnit
  succNum    : NumberUnit → NumberUnit
  includeNum : zeroNum ≡ zeroNum
  succPathNum : (n : NumberUnit) → succNum n ≡ succNum n

------------------------------------------------------------------------
-- Addition on NumberUnit

numberAdd : NumberUnit → NumberUnit → NumberUnit
numberAdd zeroNum      n = n
numberAdd (succNum m) n = succNum (numberAdd m n)

------------------------------------------------------------------------
-- Ordering on NumberUnit

data numberLessEq : NumberUnit → NumberUnit → Set where
  leqZero : ∀ n → numberLessEq zeroNum n
  leqSucc : ∀ {n m} → numberLessEq n m → numberLessEq (succNum n) (succNum m)

------------------------------------------------------------------------
-- Interpretation: StandardNat → NumberUnit

interpret : StandardNat → NumberUnit
interpret zeroS      = zeroNum
interpret (succS n) = succNum (interpret n)

------------------------------------------------------------------------
-- Lemmas: Preservation of zero and successor

interpret-zero : interpret zeroS ≡ zeroNum
interpret-zero = Path.refl zeroNum

interpret-succ : (n : StandardNat) → interpret (succS n) ≡ succNum (interpret n)
interpret-succ n = Path.refl (succNum (interpret n))

------------------------------------------------------------------------
-- Theorem: interpret preserves addition

interpret-add : (n m : StandardNat)
  → interpret (standardAdd n m) ≡ numberAdd (interpret n) (interpret m)
interpret-add zeroS m =
  begin
    interpret m
    ≡⟨ Path.refl ⟩
    numberAdd zeroNum (interpret m)
  ∎
interpret-add (succS n) m =
  let
    IH : interpret (standardAdd n m) ≡ numberAdd (interpret n) (interpret m)
    IH = interpret-add n m
  in
  begin
    interpret (succS (standardAdd n m))
    ≡⟨ interpret-succ (standardAdd n m) ⟩
    succNum (interpret (standardAdd n m))
    ≡⟨ cong succNum IH ⟩
    succNum (numberAdd (interpret n) (interpret m))
    ≡⟨ Path.refl ⟩
    numberAdd (succNum (interpret n)) (interpret m)
  ∎

------------------------------------------------------------------------
-- Ordering proofs: reflexivity and transitivity

numberLessEqRefl : (n : NumberUnit) → numberLessEq n n
numberLessEqRefl zeroNum = leqZero zeroNum
numberLessEqRefl (succNum n) = leqSucc (numberLessEqRefl n)

numberLessEqTrans
  : ∀ {n m p : NumberUnit}
  → numberLessEq n m → numberLessEq m p → numberLessEq n p
numberLessEqTrans (leqZero _) _ = leqZero _
numberLessEqTrans (leqSucc nm) (leqSucc mp) =
  leqSucc (numberLessEqTrans nm mp)

------------------------------------------------------------------------
-- Lemma: interpret preserves ordering

interpretLessEq
  : (n m : StandardNat)
  → standardLessEq n m
  → numberLessEq (interpret n) (interpret m)
interpretLessEq zeroS m (leqZero _) = leqZero (interpret m)
interpretLessEq (succS n) (succS m) (leqSucc leq) =
  leqSucc (interpretLessEq n m leq)

------------------------------------------------------------------------
-- Induction lifting: from StandardNat to NumberUnit

relationalNatInductionViaInterpret
  : (P : NumberUnit → Set)
  → P zeroNum
  → (∀ n → P n → P (succNum n))
  → (n : NumberUnit)
  → P n
relationalNatInductionViaInterpret P base step n =
  let
    toStandard : NumberUnit → StandardNat
    toStandard zeroNum = zeroS
    toStandard (succNum m) = succS (toStandard m)
  in
    standardNatInduction
      (λ s → P (interpret s))
      base
      (λ s ih → step (interpret s) ih)
      (toStandard n)

------------------------------------------------------------------------
-- Example: prove all numbers are ≥ zero

geqZeroProp : NumberUnit → Set
geqZeroProp n = numberLessEq zeroNum n

geqZeroProof
  : (n : NumberUnit) → geqZeroProp n
geqZeroProof =
  relationalNatInductionViaInterpret
    geqZeroProp
    (leqZero zeroNum)
    (λ n ih → leqSucc ih)

------------------------------------------------------------------------
-- Example: parity predicate

data Parity : Set where
  even : Parity
  odd  : Parity

parityProp : NumberUnit → Parity
parityProp =
  relationalNatInductionViaInterpret
    (λ _ → Parity)
    even
    (λ _ p → case p of λ where
                         even → odd
                         odd  → even)

exampleParity : parityProp (succNum (succNum zeroNum)) ≡ even
exampleParity = Path.refl even

------------------------------------------------------------------------
-- Membership predicate

_∈_ : {A : Set} → A → List A → Set
x ∈ [] = ⊥
x ∈ (y ∷ ys) = (x ≡ y) ⊎ (x ∈ ys)

------------------------------------------------------------------------
-- Well-foundedness: every non-empty list has a least element

findMin
  : (ns : List NumberUnit)
  → (¬ (ns ≡ []))
  → Σ[ m ∈ NumberUnit ] ((m ∈ ns) × (∀ n → n ∈ ns → numberLessEq m n))
findMin (n ∷ []) _ = (n , inj₁ Path.refl , λ _ inN → numberLessEqRefl n)
findMin (n ∷ n' ∷ ns) _ =
  let
    IH : Σ[ m ∈ NumberUnit ] ((m ∈ (n' ∷ ns)) × (∀ k → k ∈ (n' ∷ ns) → numberLessEq m k))
    IH = findMin (n' ∷ ns) (λ contra → contradiction (sym contra))
    m = IH .fst
    minProof = IH .snd
  in
    if numberLessEq n m
    then (n , inj₁ Path.refl , λ k inK →
          case inK of λ where
            inj₁ eq → transport (λ i → numberLessEq n (subst (λ _ → NumberUnit) eq k)) eq (numberLessEqRefl n)
            inj₂ rest → numberLessEqTrans (numberLessEqRefl n) (minProof .snd k rest))
    else (m , (inj₂ (minProof .fst)) , minProof .snd)

wellFoundedness
  : (ns : List NumberUnit)
  → (¬ (ns ≡ []))
  → Σ[ m ∈ NumberUnit ] ((m ∈ ns) × (∀ n → n ∈ ns → numberLessEq m n))
wellFoundedness ns nonEmpty = findMin ns nonEmpty
