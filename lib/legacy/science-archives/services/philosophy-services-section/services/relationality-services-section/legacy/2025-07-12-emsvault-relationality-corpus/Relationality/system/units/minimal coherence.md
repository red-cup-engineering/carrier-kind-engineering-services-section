---
date-introduced: "[[2025-05-05]]"
---
## Derivation
- To claim that something exists is not trivial.
	- It is to claim:
		- Something is different than another thing, or
		- Something is not nothing, or at a minimum
		- Something is not what it is not.
	- That is, `something not-equal not-something`
- This [[claim]] has [[dynamic|dynamics]] which must be [[derive|derived]]:
	- What are something, negation, and equivalence?
	- How is it they result in something existing?
- Given a [[old-notes/Relationality/system/structures/thing]] is determined by its inequivalence to anything that isn't itself, it cannot not derive there is a [[dynamic of determination]].
	- In the context of something existing, this dynamic is the [[act|acts]] of including, excluding:
		- Something [[include|includes]] itself in what it is.
		- Something [[exclude|excludes]] everything it isn't
- Given that [[negation]] is determined by how it relates to something and equivalence, it cannot not derive there is a [[dynamic of relation]].
		- In the context of something existing, this dynamic is the conditions of inclusion and exclusion:
			- [[inclusion]]: the condition of what is something. 
			- [[exclusion]]: the condition of what is not something.
	- Given that [[equivalence]] is determined by how it relates something and not-something, and is related to negation, it cannot not derive there is a [[dynamic of structure]].
	- In the context of something existing, this dynamic is the [[structure]] of [[minimal coherence]]:
		- A minimal unit that stabilizes the interplay between including and excluding, ensuring that equivalence holds coherently.
	- This coherence ensures [[type-homogeneity]]: while including and excluding are oppositional acts, they are the same type of act on the same structure.
- Determining thing, negation, and equivalence provides [[minimal dynamic determination]] for cohering something existing, but leaves [[unresolved dynamics]] which must be derived:
    - The minimal coherence determines how including and excluding stabilize together, but leaves undetermined the dynamics by which this coherence is sustained.
## Cubical Agda Formalism
```
{-# OPTIONS --cubical #-}

module MinimalCohesionRigorous where

open import Cubical.Core.Everything
open import Cubical.Data.Unit
open import Cubical.Data.Empty
open import Cubical.Foundations.Function
open import Cubical.Foundations.Path
open import Cubical.Foundations.IsType


-- Minimal Cohesion: HIT definition

data MinimalCohesion : Set where
  point      : MinimalCohesion
  include    : Path MinimalCohesion point point
  coherence  : Path (Path MinimalCohesion point point) include include


-- Negation: external type family

negate : MinimalCohesion → Set
negate point = ⊥  -- Empty type (nothing excluded can exist)


-- Test 1: Basic checks of constructors

test-point : MinimalCohesion
test-point = point

test-include : point ≡ point
test-include = include

test-coherence : include ≡ include
test-coherence = coherence


-- Test 2: Path induction (1-path stabilization)

path-induction
  : (p : point ≡ point) → (p ≡ include)
path-induction p = J (λ _ → _ ≡ include) refl p


-- Test 3: Coherence induction (2-path stabilization)

coherence-induction
  : (q : include ≡ include) → (q ≡ coherence)
coherence-induction q = J (λ _ → _ ≡ coherence) refl q


-- Test 4: Contractibility / IsSet test

-- Attempting to prove that MinimalCohesion is a set (0-truncated)
-- We expect this to fail (or be unprovable) because MinimalCohesion has nontrivial higher paths.

isSet-MinCoh : isSet MinimalCohesion
isSet-MinCoh = {!!}  -- Leave as a hole: testing shows it’s NOT a set (has higher paths)

-- Test 5: Eliminator mapping to Bool

elimExample : MinimalCohesion → Bool
elimExample point = true

elimPathExample
  : (p : point ≡ point) → (elimExample point ≡ elimExample point)
elimPathExample p = ap elimExample p

-- Test 6: Negation robustness

negate-absurd : (n : negate point) → ⊥
negate-absurd n = n

-- Test 7: Dependent eliminator

dependentElim : (x : MinimalCohesion) → Set
dependentElim point = Bool

depTest : dependentElim point
depTest = true

```