
## Core Concepts

### 1. Act

**Definition:**  
A dynamic operation that initiates or modifies relational coherence.

**Examples:**
- Inclusion
- Exclusion
- Reflexive Relating
- Boundary Excluding
- Meta-Reflexive Engagement

**Attributes:**
- `name`
- `description`
- `applies_to` → [Unit, Structure, Boundary]
- `resulting_condition` → Condition

---

### 2. Condition

**Definition:**  
A stabilized relational state resulting from an Act.

**Examples:**
- Inclusion Condition
- Relational Coherence
- Meta-Negation

**Attributes:**
- `name`
- `description`
- `stabilizes` → Act
- `formalized_by` → Structure

---

### 3. Structure

**Definition:**  
A minimal formal architecture that stabilizes and preserves coherence between Acts and Conditions.

**Examples:**
- Relational Boundary
- Reflexive Form
- Composite Network

**Attributes:**
- `name`
- `description`
- `enforces_conditions` → [Condition]
- `contains_units` → [Unit]

---

### 4. Unit

**Definition:**  
A composed relational entity that embodies coherence at some scale.

**Examples:**
- Basic Relational Unit
- Composite
- Network
- Meta-Relational Field

**Attributes:**
- `name`
- `description`
- `composed_of` → [Unit]
- `stabilized_by` → [Structure]
- `subject_to` → [Act]

---

## Relations Overview

- **Act → Condition:** Every act leads to a stabilized condition.
- **Condition → Structure:** Every condition is formalized and stabilized by a structure.
- **Structure → Unit:** Structures hold together and enforce coherence for units.
- **Unit → Act:** Units are subject to acts (e.g., reflexive relating).

---

## Example Pattern (In Plain English)

- Act: **Inclusion**
    - Applied to: a new Unit
    - Produces: **Inclusion Condition**
    - Formalized by: **Relational Boundary**

- Act: **Reflexive Relating**
    - Applied to: the Unit’s own boundary
    - Produces: **Reflexive Relation Condition**
    - Formalized by: **Reflexive Form**

---

## Meta-Level Concepts (Emerging)

- **Meta-Boundary:**  
  A boundary that defines the outside of the entire relational field.

- **Meta-Expansion:**  
  The act of folding the meta-boundary back into the system, extending coherence.

---

## Notes for Implementation Later

- Entities to model: Act, Condition, Structure, Unit.
- Relations between entities are **directed and reflexive**.
- Everything should be capable of **nesting and recursion** (e.g., Units contain Units, Acts apply at multiple levels).

---

