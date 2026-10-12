## Algorithm: Predictive Determination Principle (PDP)

We formalize the Predictive Determination Principle (PDP) as an **explicit algorithmic process** that determines the necessary shape of the next relational domain (Dₙ₊₁) from the closure of the current domain (Dₙ).

---

### Input

- **Domain Dₙ:**  
  A fully formalized relational domain, represented as:

  - **Actsₙ:** The set of primitive and composite acts formalized in Dₙ,
  - **Conditionsₙ:** The set of formal conditions (trigger, continuity, closure) in Dₙ,
  - **Structuresₙ:** The set of formal relational structures (e.g., composites, networks) in Dₙ,
  - **Closureₙ:** The closure specification of Dₙ, detailing when Dₙ is formally complete.

---

### Output

- **Predicted Shape of Dₙ₊₁:**  
  A determination of:

  - **Actsₙ₊₁ (Predicted),**
  - **Conditionsₙ₊₁ (Predicted),**
  - **Structuresₙ₊₁ (Predicted),**

representing the necessary relational constructs that Dₙ₊₁ must formalize to fully capture the dynamics exposed but unformalized in Dₙ.

---

### Steps

1️⃣ **Identify Implicit Dynamics (IDₙ):**

   - Scan **Closureₙ** for any **exposed but unformalized dynamics.**
   - Look for phrases such as:
     - “enabled but not fully formalized,”
     - “reveals propagation-like behavior,”
     - “implies additional dynamics.”

   - Extract all such dynamics and list them as **IDₙ = { id₁, id₂, ..., id_k }.**

---

2️⃣ **Classify Each Implicit Dynamic:**

   For each **id_i in IDₙ:**

   - **Determine its nature:**
     - Does it represent an **Act** (a new operation)?
     - A **Condition** (a rule or invariant)?
     - A **Structure** (a composite, network, or higher-order configuration)?

   - Record the classification:
     - **Acts_candidate.append(id_i)** if it implies a new act,
     - **Conditions_candidate.append(id_i)** if it implies a new condition,
     - **Structures_candidate.append(id_i)** if it implies a new structure.

---

3️⃣ **Generalize and Formalize Initial Definitions:**

   - For each entry in **Acts_candidate:**
     - Derive a **formal name** (e.g., Propagate, Trace).
     - Draft an **initial definition** that specifies:
       - Its inputs,
       - Its role in the relational system.

   - For each entry in **Conditions_candidate:**
     - Formalize as a logical condition with:
       - Triggers,
       - Continuity rules,
       - Termination cases.

   - For each entry in **Structures_candidate:**
     - Define the **composite or network form,**
     - Specify its **relational components,**
     - Identify any required invariants.

---

4️⃣ **Check Type-Homogeneity and Reflexivity:**

   - Ensure that all predicted **Actsₙ₊₁, Conditionsₙ₊₁, Structuresₙ₊₁:**
     - Preserve the **ontological type** of the relational system,
     - Allow for **reflexive embedding** (e.g., reflex(S) = relating(S, S)).

   - If any predicted element **violates type-homogeneity or reflexivity:**
     - Flag for **reconsideration or additional formalization** to bring it into compliance.

---

5️⃣ **Output Predicted Domain Shape:**

   - Assemble the following:

     - **Actsₙ₊₁ (Predicted):** List of formalized new acts,
     - **Conditionsₙ₊₁ (Predicted):** List of formalized new conditions,
     - **Structuresₙ₊₁ (Predicted):** List of formalized new structures.

   - Optionally:  
     Include **anticipatory notes** on how Dₙ₊₁’s closure might expose further dynamics (preparing for recursive planning).

---

### Termination

The algorithm halts once all implicit dynamics in Dₙ have been:

- Identified,
- Classified,
- Formalized in initial definition,
- Verified for type-homogeneity and reflexivity.

This completes the **predictive determination of Dₙ₊₁’s necessary shape.**

---

## Example (Application to D₁)

- **ID₁:** { propagation behavior, trace formation, directional flow }
- **Acts_candidate:** { Propagate, Trace }
- **Conditions_candidate:** { TriggerCondition, ContinuityCondition, TerminationCondition }
- **Structures_candidate:** { PropagationTrace, PropagationNetwork, TraceInvariant }

After formalization and verification:

- **Acts₂ (Predicted):** Propagate(Edge), Trace(Node), ChainPropagate([...])
- **Conditions₂ (Predicted):** Trigger, Continuity, Termination, Directionality
- **Structures₂ (Predicted):** PropagationTrace, PropagationNetwork, PropagationCascade

---

This algorithm provides a **systematic, formal method** for deriving the shape of the next relational domain prior to full derivation—enabling predictive planning and structurally guided formalization.
