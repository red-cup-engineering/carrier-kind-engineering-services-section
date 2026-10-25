---
title: "Logical inference model survey: signcell-data"
description: "What this area of the tree actually computes, its abstractions with their theoretical readings, capabilities a logical inference model can build on, gaps and slop, and attachment points."
date-created: 2026-10-08
kind: engineering-survey-note
keywords:
  - logical-inference-model
  - signstuff
  - survey
  - signcell-data
status: survey-read-only-not-adversarially-verified
produced-by: info-0d logical-inference-model survey workflow (Claude agents; Sonnet readers for code, Fable readers for house theory), read-only over the tree at 773ea6d6df4
---

# Logical inference model survey: signcell-data: SignCell (signstuff/signcell) plus FOUR, Mark, utterance, predication, content addressing

## Summary

SignCell is about 1900 lines of ESM, with no I/O, that does one real thing. It defines an evidence-bearing triple, "cell" = {subject, predicate, object, for[], against[], value?}, and a content address for that triple. Everything else is a wrapper around two substrates. (1) FOUR (data-engineering src/four.mjs) is Belnap/Dunn's four-valued bilattice. It is computed from two boolean "sides" (for told, against told). The 4 points have 4 name families (knowledge: absurd/potential/active/stable; told; truth: neither/true/false/both; extremal: unknown/held/denied/contested). Every join, meet, negation, conflation and residuated operation is computed from sides rather than tabulated. (2) semiotic-content-address (content-engineering src/semiotic-content-address/semiotic-content-address.mjs) is one identity scheme: NFC-normalize, canonicalize JSON-ish values, encode as RFC 8949 canonical CBOR, SHA-256, and name the result as an RFC 6920 ni: URI. "Coincides" means identical canonical bytes.

IDENTITY (the load-bearing idea). In cell.mjs, `address(cell) = semanticId({subject,predicate,object})`. Evidence never enters the address, so identity is stable as witnesses arrive. A cell therefore is a stable site (the triple) carrying a mutable-by-merge FOUR-valued presheaf stalk (the two witness sets). `sameCell` compares triple bytes. Each witness side is a deduplicated set sorted by canonical-byte hex, so `merge` (union of sides, knowledge-join of values) is a join-semilattice (a G-Set CRDT per side). The value is stored only when it differs from `presence` (the reading of "is for non-empty, is against non-empty"). A cell is "Measured" when value == presence. After a meet or conflation the value can fall below the presence, so the cell keeps its witnesses while the value drops (the Lean "Valued" structure). The `recordOf` function gives the counting view (a record with pos/neg counts and topMass).

THE MARK/UTTERANCE/PREDICATION STACK is a second, parallel vocabulary layered on the same cell. A Mark is {kind:"utterance.mark", value}, a canonicalCarrier wrapper; `coincides` is delegated. An utterance is {kind:"utterance.carrier", token:{hand:"left",mark}, claim:{hand:"right",mark}}. This is the "two hands" construction: the left hand yields a token, the right hand yields a claim, and the same mark in each role never coincides (`tokenNeClaim`). `utterance.articulate` produces an "articulation cell" with the token slot filled and the claim slot empty, i.e. raw status (true,false), the potential cell. `predication.mjs` types a cell as (Token, Predicate{claim,mark}, Token). The seed `predicationSeed(utt) = cell(token, predicate(claim), token)` is the reflexive cell. A "predication site" is {cells, specializations, base} where base is a category with objects = entities + predicates, plus converse / subjectProjection / objectProjection arrows. `cohere` and `closeSpecialization` give the transitive closure of the specialization relation. `generatePredicationCategory` and `materializePredicationCategory` expand a generated cell set Phi = E x Pi x E to a full cartesian product of cells (every token x every predicate x every token), all with empty evidence. `presentPredicationSite` and `freePredicationSite` are the generator/free round trip.

A THIRD, SEMANTIC LAYER (typed-mark, semantic-claim, semantic-graph, semantic-carriers, source-statement, semiotic-concept-universe) uses "cell" in a different sense. There, `createTypedMark(type, content)` makes {kind:"sign.cell", id, type, content}, a typed-content object whose id is semanticId({kind,type,content}). That is not the evidence triple. `createSignClaim` bridges back into the evidence cell, with typed references {id,type} as subject and object. `createSignGraph` is a closed, content-addressed graph of typed marks with declared relations (subjectTypes/objectTypes/witnessTypes), and edges are checked against declared types. `glueSignGraphs` is a genuine gluing: it unions cells and edges, and where two cuts declare the same relation id differently it removes that relation and its edges and reports an obstruction. The result is order-independent. This is the only sheaf-flavoured computation in the package.

Overall, SignCell is a small, real kernel (FOUR-valued witnessed triple, content-addressed, CRDT merge, glue with obstructions) wrapped in three overlapping naming layers. The Lean names (RelMath.*, Obsmetrologia.*) are attached to JS functions in comments. Only FOUR has an explicit `obsmetrologiaRealization` binding table. cell.mjs, predication.mjs, utterance.mjs and typed-mark.mjs are all modified and uncommitted. There is no test for cell.mjs or predication.mjs in test/ (only articulating, mark, semantic-carriers and semantic-claim).

## Abstractions

### FOUR readings (Belnap/Dunn bilattice as side-pair)

- **File:** `services/engineering-services-section/services/computer-engineering-services-section/services/computer-data-engineering-services-section/src/four.mjs`
- **Computes:** A point is a pair (forTold, againstTold) with 4 name families. Exports include readingOfSides, sidesOfReading, readingAs (family rename), knowledgeJoinReading [lf||rf, la||ra], knowledgeMeetReading, truthJoinReading [lf||rf, la&&ra], truthMeetReading, knowledgeImplyReading, truthImplyReading, negateReading (swap sides), conflateReading ([!a,!f]), knowledgeLeqReading, isConsistentReading. Mixing families throws via sharedFamily. About 450 lines.
- **Theory:** Belnap 1977 / Ginsberg 1988 / Dunn 1976: FOUR = 2x2 (Bool x Bool), the bilattice with knowledge and truth orders. Realized faithfully: all operations are derived from sides, not tabulated. This is the paraconsistent value domain the whole stack stands on. Not transfinite: only 2 sides, no grading beyond the Record counts.

### twistProduct + linear (residuated) operations

- **File:** `services/engineering-services-section/services/computer-engineering-services-section/services/computer-data-engineering-services-section/src/four.mjs`
- **Computes:** twistProduct({bottom,top,one,leq,meet,join,fuse,imply}) builds a bilattice (pairs, both orders, negation) from any residuated lattice. Instantiated on Two to give fusionReading, residuumReading, linearUnit, linearNegationReading, parReading, residuationHolds.
- **Theory:** Kalman 1958 / Fitting 1994 twist construction, giving a linear-logic-style (fusion, par, residuum) structure on FOUR. Real and generic: this is the hook for graded/valued truth beyond Two (a general residuated lattice L yields a twist L x L^op). Only used here on Two; the generality is untested within SignCell.

### Record / tally counting carrier + attestationRecord

- **File:** `services/engineering-services-section/services/computer-engineering-services-section/services/computer-data-engineering-services-section/src/four.mjs`
- **Computes:** record(pos,neg) as natural-number counts; recordJoinK/MeetK (max/min both), recordJoinT/MeetT, recordAdd, recordLeqK/T, readingOfRecord (pos>0, neg>0), topMass = min(pos,neg), attestationRecord(census). In cell.mjs `recordOf(cell) = record(for.length, against.length)`.
- **Theory:** A counting lift of FOUR (Obsmetrologia.Record). The point of FOUR is the >0 truncation of the record. topMass is a quantitative contradiction measure; this is the natural place for graded/transfinite paraconsistency. It exists as functions but nothing downstream uses topMass to decide anything.

### WIT ledger: knowledgeHeight, cellFlux, witFlux

- **File:** `services/engineering-services-section/services/computer-engineering-services-section/services/computer-data-engineering-services-section/src/four.mjs`
- **Computes:** knowledgeHeight = number of told sides (0,1,2). cellFlux(before,after) in {none, commit (0->1), mint (1->2), jump (0->2)} and throws unless after is above before in the knowledge order. witFlux(pairs) gives commits, mints, jumps, reversible = commits+mints, irreversible = 2*jumps, wits = their sum.
- **Theory:** Labelled in the file as 'Obsmetrologia FreeEnergyLyapunov': a Lyapunov/energy function along the knowledge order, with a conserved budget (budget_splits). It is a simple additive height function on a 3-rank poset, and the thermodynamic naming is far larger than the arithmetic. It is still the only existing energy-like quantity on cells and a plausible foam-physics hook (energy of a cell = knowledge height).

### Klein four-group gauge + bilattice law receipts

- **File:** `services/engineering-services-section/services/computer-engineering-services-section/services/computer-data-engineering-services-section/src/four.mjs`
- **Computes:** gaugeElementNames = id, negation, conflation, double. gauge(element, name), gaugeMul, gaugeOrderEffect, fixedSet, kleinFourGaugeReceipt(), firingPatternSelfDuality, bilatticeLawReceipt() (checks the laws on all 4 points; a runtime self-test returning a receipt).
- **Theory:** The automorphism group of the bilattice is the Klein 4-group {id, neg, conf, neg.conf}. Mathematically correct. Gauge symmetry of readings is a usable idea (duality between truth and falsity witnesses).

### FOUR evidence wire + FOUR constant + obsmetrologiaRealization

- **File:** `services/engineering-services-section/services/computer-engineering-services-section/services/computer-data-engineering-services-section/src/four.mjs`
- **Computes:** four(pos,neg) -> frozen {positiveEvidence, negativeEvidence}. validateFour, readingOfWire (via truth family), wireOfReading, FOUR = {neither,true,false,both} wire records, joinKnowledgeWire. obsmetrologiaRealization maps 28 Lean declaration names (Obsmetrologia.Reading.joinK ... ObsmetrologiaComputing.attestationRecord) to JS functions so a conformance judge can apply golden vectors.
- **Theory:** A data-driven JS-to-Lean conformance binding. This is real engineering: Lean names are bound to executable realizers. It exists only for FOUR, not for cell, predication or utterance.

### tally (split-tally reconciliation as FOUR join)

- **File:** `services/engineering-services-section/services/computer-engineering-services-section/services/computer-data-engineering-services-section/src/tally.mjs`
- **Computes:** tally({release, admission, fields}) compares per-field canonicalJson equality of two receipt halves. Each field is told for (agree) or against (disagree). Counterparty mutual-naming is one extra field. Reading = knowledgeJoinAll. Status is 'settled' iff reading=='potential' (all agree), else 'dispute'. Returns {status, reading, mismatches, awaiting}.
- **Theory:** A tiny but clean worked example of 'evidence per field joined in FOUR': contested = some agree and some disagree, denied = none agree. This pattern (a local compatibility check as a FOUR-valued join over fields) generalizes to tile-edge matching and sheaf overlap checks. Note that it uses canonicalJson rather than semanticId, a second equality notion.

### closure-regime (four ordinal strata)

- **File:** `services/engineering-services-section/services/computer-engineering-services-section/services/computer-data-engineering-services-section/src/closure-regime.mjs`
- **Computes:** names [strict, scott, transfinite-bounded, aperiodic]; regimeCost = index; regimeDecidable = cost <= scott's cost; costlierRegime; closureRegimeSchema.
- **Theory:** Labels for the kappa<omega, kappa=omega, omega<kappa<omega1, kappa>=omega1 strata. It is a 4-element enum with an index. All reading of ordinals is delegated to metrologic. Pure naming; there is no ordinal arithmetic here.

### semiotic-content-address (canonical carrier, semanticBytes/Id, coincides)

- **File:** `services/engineering-services-section/services/computer-engineering-services-section/services/computer-data-engineering-services-section/services/computer-content-engineering-services-section/src/semiotic-content-address/semiotic-content-address.mjs`
- **Computes:** canonicalizeSemioticJson: iterative (non-recursive) walk that NFC-normalizes strings and keys, rejects NaN/Infinity, cycles and NFC key collisions, drops undefined members, and admits null/bool/finite number/bigint/Uint8Array/arrays/plain objects. canonicalCarrier: the deeply frozen snapshot, tracked in a WeakSet. semanticBytes: encodeCanonical (RFC 8949 CBOR, memoized for frozen snapshots). semanticId: ni: URI of the SHA-256. coincides: string/scalar fast paths, else bytesEqual. coincidenceKey: latin1 string of the bytes (a Map/Set key).
- **Theory:** Identity = hash of canonical form; one equivalence relation 'coincides'. Sound and shared by every layer. All identity in SignCell reduces to this. Limit: identity is purely syntactic (structural equality of canonical form); there is no quotient by semantic equivalence below the envelope layer. Numbers 1 and 1.0 are the same JS number, so no int/float distinction survives.

### semantic-content-identity (SEN envelope identity)

- **File:** `services/engineering-services-section/services/computer-engineering-services-section/services/computer-data-engineering-services-section/services/computer-content-engineering-services-section/src/semiotic-content-address/semantic-content-identity.mjs`
- **Computes:** Identity of a typed SEN envelope {kind, version 3, objectKind, semanticType, normal-form body, witnessRoot}: identifyJsonSemanticContent, identifyValueSemanticContent, identifyBytesSemanticContent, verifyJsonSemanticRecord, admitSemanticEnvelope, decodeSemanticEnvelope. EMPTY_WITNESS_ROOT is the address of an empty witness bundle. 303 lines. I only skimmed the exports.
- **Theory:** The claim 'There is no other identity scheme' means identity = hash of (type, normal form, witness-root), a dependent-type-flavored content address. This is the Curry-Howard hook, in that identity includes the settlement witnesses. SignCell itself does NOT use this envelope. It uses bare semanticId, so the claim is not true of the cell layer.

### Mark

- **File:** `services/engineering-services-section/services/computer-engineering-services-section/lib/signstuff/signcell/src/mark.mjs`
- **Computes:** Mark(v) -> canonicalCarrier({kind:'utterance.mark', value:v}); validates via type-system instantiate(MarkType); throws if the value is absent. mark() is an alias. isMark is a shape test. coincides is re-exported. Schema: {kind const, value: {}}.
- **Theory:** An opaque present datum. It is a one-field wrapper whose only effect is to tag a value as 'present'. The 'one canonical Mark' claim holds in this package. The type-system admission (defineType/instantiate) is heavyweight for what is a shape check.

### Utterance (two-hand token/claim carrier) and Articulating chain

- **File:** `services/engineering-services-section/services/computer-engineering-services-section/lib/signstuff/signcell/src/utterance.mjs`
- **Computes:** Token(mark) = {kind:'utterance.token', hand:'left', mark}; Claim(mark) = {..., hand:'right', mark}; utterance(left, right) -> {kind:'utterance.carrier', token, claim} (a non-Mark datum is marked automatically; a Mark is kept). utteranceAt, tokenValue, claimValue, isUtterance. utterEvidence(entry) maps {subject, predicate, object?} -> utterance(token = subject or {subject, object}, claim = predicate). articulatingUtter/Pair/Head/Depth/Floor build a recursive list-like carrier. tokenIdentity/claimIdentity return witness-or-obstruction records. articulate(carrier) -> {kind:'utterance.articulation.cell', potentialAperiodicArticulationCell:[carrier,[[token],[]]]}. isArticulationCell validates this. There are Lean-lemma stubs: markKinds, markKindTwoKinds, tokenNeClaim.
- **Theory:** 'Two hands' (left token, right claim) and an 'aperiodic articulation cell' (token present, claim empty = (true,false) = FOUR 'potential') are naming overlays. Computationally it is a pair of tagged wrappers around two values, plus a pair-of-lists whose second component is always the empty list. 'Aperiodic' has no computational content here. The recursive Articulating chain is a nonempty list with depth = length-1. tokenNeClaim is trivially true because the 'kind' fields differ. Lean lemma names are asserted as JS predicates; they test only that the tags differ.

### Cell (evidence-bearing ordered triple) and its address

- **File:** `services/engineering-services-section/services/computer-engineering-services-section/lib/signstuff/signcell/src/cell.mjs`
- **Computes:** cell(s,p,o,{for,against,value}) -> frozen canonical {subject,predicate,object,for[],against[],value?}. Each side is deduplicated by hex of its canonical bytes and sorted. Value is stored only if != presence (Measured iff absent). address(c) = semanticId(triple(c)); evidence is excluded, and the result is memoized in a WeakMap for admitted cells. sameCell = triple-bytes equality. admitCell/isCell validate the carrier shape (exactly 5 keys, or 6 with a knowledge-family value). cellBytes = CBOR of the whole cell. 297 lines, uncommitted modifications.
- **Theory:** A Valued predication site: key = triple (site), stalk = FOUR via two grow-only witness sets. Identity-by-triple with evidence off to the side is the right design for monotone knowledge accumulation (identity stable under learning). The terms are opaque JSON, so there is no typing here. Limit: witnesses are bare JSON values, not cells, so there is no structure for 'evidence about evidence' and no provenance DAG.

### Cell merge / witnessFor / witnessAgainst / evidenced (join-semilattice)

- **File:** `services/engineering-services-section/services/computer-engineering-services-section/lib/signstuff/signcell/src/cell.mjs`
- **Computes:** merge(l, r): the same cell is required; for = union, against = union, value = knowledgeJoinReading(valueOf(l), valueOf(r)). witnessFor/Against add one witness and join the value with the one-sided reading. evidenced(at, value) REPLACES evidence (it is not monotone). Value can sit below presence after an external meet or conflation, but nothing in the package performs meets on cells: merge is only join.
- **Theory:** State-based CRDT / join-semilattice (comm, assoc, idemp) for the knowledge order, the truth-maintenance accumulation law of FOUR-valued logic. The package header mentions meet and conflation but only join is implemented in SignCell (meet is in signchain, per comments). No Heyting/residuated cell-level operations here.

### Cell moves: converse, subject/object projection, specialize

- **File:** `services/engineering-services-section/services/computer-engineering-services-section/lib/signstuff/signcell/src/cell.mjs`
- **Computes:** converse(c) = cell(o,p,s); subjectProjection(c) = cell(s,p,s); objectProjection(c) = cell(o,p,o); specialize(refine, c) = cell(s, refine(p), o); namedMove(name). Evidence is explicitly NOT carried ('transporting it is a valuation question').
- **Theory:** Dagger / reflexive-collapse operations on the triple-site; predicate morphism via the user-supplied refine. Converse is an involution; projections are idempotent (the predication.mjs 'Lemma' predicates check this). They produce NEW cells with empty evidence, so they are not morphisms of evidence-bearing objects. Evidence transport is the missing functoriality, and it is exactly where a Chu/sheaf transport would plug in.

### cellSet / cellAt / cellDifference / cell-set.mjs (two cell-set implementations)

- **File:** `services/engineering-services-section/services/computer-engineering-services-section/lib/signstuff/signcell/src/cell.mjs`
- **Computes:** cell.mjs cellSet(cells, join=merge): a Map by address, tellings of one address merged, output sorted by address string; mergeCellSets; cellDifference by address. cell-set.mjs separately provides cellSetRepresentatives and relativeCellComplement by O(n^2) cellCoincides, without merging evidence.
- **Theory:** A cell set is a finite presheaf section / the knowledge-lattice product indexed by triples (point-wise join). DUPLICATION: two cell-set operations with different complexity and different evidence semantics (the cell-set.mjs ones drop later duplicates' evidence). Its header comment says 'settling/cell-set', which is stale.

### Predicate, CellSchema, entity/predicate sets (predication.mjs)

- **File:** `services/engineering-services-section/services/computer-engineering-services-section/lib/signstuff/signcell/src/predication.mjs`
- **Computes:** Predicate(claim) = {kind:'predication.predicate', claim, mark: claim.mark} (the mark is duplicated). A predication cell's subject and object are Tokens and its predicate is a Predicate, so it is a signCell instance with typed terms (cell(), which refuses a null/undefined object). termCoincides compares token.mark.value; predicateCoincides compares claim.mark.value; both are routed through coincides on VALUES (not through the whole token). entitySet and predicateSet dedupe by O(n^2) uniqueBy. cellSet(cells) = signCellSet plus derived entities and predicates.
- **Theory:** Typed predication triple E x Pi x E. Note the identity subtlety: cell address hashes the full Token and Predicate carriers, while termCoincides compares only mark.value. Because token-of-mark carriers are canonical and deterministic these agree, but they are two code paths for one notion. isCell here (shape test on subject, predicate, object only) is a different function from cell.mjs isCell (exact key set); both are exported under the name isCell from different modules.

### Predication site and base category (predicationSite, baseCategory)

- **File:** `services/engineering-services-section/services/computer-engineering-services-section/lib/signstuff/signcell/src/predication.mjs`
- **Computes:** predicationSite(witnesses): filters predication cells and specialization morphisms ({kind:'predication.specialization', domain:general, codomain:specialized}) into {kind:'predication.site', cells: cellSet, specializations, base}. base = {objects: entities + predicates deduped, specialization, converse, subjectProjection, objectProjection}, where the last three are lists of {domain,codomain} arrows over MATERIALIZED cells only (nodes are [s,p,o] arrays).
- **Theory:** The 'predication site' = the sort/category of entities and predicates with specialization order, plus the fibre of cells over (E,Pi,E). A site in Grothendieck terms would need covering families; none exist here, and it is a finite category presentation (objects + generator arrows, with closure only for specialization). Cells are not objects of this category; only entities and predicates are. The 'fiber functor' is a record that merely holds the cellSet; it has no functoriality.

### Generated vs free presentation (Phi = E x Pi x E)

- **File:** `services/engineering-services-section/services/computer-engineering-services-section/lib/signstuff/signcell/src/predication.mjs`
- **Computes:** generatedPredicationCellSet(E, Pi) records only entities and predicates. generatePredicationCategory(articulation) = {entities:[token], predicates:[predicateOfClaim(claim)]}. materializePredicationCategory enumerates ALL |E| x |Pi| x |E| cells with empty evidence. predicate(articulation) = materialize(generate(articulation)). presentPredicationSite (generators) <-> freePredicationSite (rederive the site). transfinitePredicationCategory wraps the set in a fiberFunctor record.
- **Theory:** Generators versus free construction; a product of finite sets. The word 'transfinite' appears in the names but the data are finite arrays (no ordinal indexing). The free site is a Cartesian product, with no tile adjacency constraints, so 'aperiodic' and 'tile coloring' have no content here.

### closeSpecialization / cohere / unrelatedPairs

- **File:** `services/engineering-services-section/services/computer-engineering-services-section/lib/signstuff/signcell/src/predication.mjs`
- **Computes:** closeSpecialization: transitive closure of the token specialization edges via a naive fixpoint (O(E^3) per sweep, repeated). It is not reflexive. cohere(site) -> {saturated: site.cells, residue: site with closed specialization}. unrelatedPairs: all ordered entity pairs (including each entity paired with itself) with no closed edge.
- **Theory:** Preorder closure and its complement: the 'residue' is exactly the set of pairs where no specialization witness exists. Reasonable partial-order machinery, naive implementation. 'saturated' is just the same cells (no inference step). No rule application, so there is no real deduction.

### Typed mark (sign.cell) = typed content-addressed object

- **File:** `services/engineering-services-section/services/computer-engineering-services-section/lib/signstuff/signcell/src/typed-mark.mjs`
- **Computes:** createTypedMark(type, content): admit(type, content) with the type-system, then canonicalCarrier({kind:'sign.cell', id, type: type.id, content}), where id = typedMarkIdentity(type.id, content) = semanticId({kind:'sign.cell', type, content}). admitTypedMark re-admits against the receiver's type and checks id == recomputed. admitTypedMarkCarrier checks only the carrier + id when the type is unresolved. referenceOf = {id, type}.
- **Theory:** A (type, value) pair addressed by hash: a dependent pair / sigma with decidable admission. The wire kind 'sign.cell' is the OLD name; the file's comment says plainly that this is NOT a cell, but it stays because stored addresses depend on it. A naming collision with `cell` in cell.mjs remains permanent (cannot rename without re-addressing).

### semantic-claim (createSignClaim / readSignClaim / conflateClaims)

- **File:** `services/engineering-services-section/services/computer-engineering-services-section/lib/signstuff/signcell/src/semantic-claim.mjs`
- **Computes:** createSignClaim({subject:typedRef, predicate:name, object:typedRef, for, against, value}) -> admit against semanticClaimType, then cell(refs, predicate, refs, evidence). So a semantic claim is an evidence cell whose terms are {id,type} references. readSignClaim migrates the old {kind:'sign.claim', reading} format into one witness told for or against (throws if witness absent). conflateClaims = merge when sameCell.
- **Theory:** Bridges the semantic (typed-mark) layer to the evidence-cell layer. This is where a cell actually becomes a typed proposition: Hom-set element with typed endpoints. Its 'conflate' is a plain merge (join), not the bilattice conflation operator, so the name overclaims.

### semantic-graph (createSignGraph / glueSignGraphs / edgesFrom)

- **File:** `services/engineering-services-section/services/computer-engineering-services-section/lib/signstuff/signcell/src/semantic-graph.mjs`
- **Computes:** createSignGraph({cells (typed marks), relations [{id, subjectTypes, objectTypes, witnessTypes}], edges [{subject, predicate, object, witness}]}) with checks: cell identity, unknown cell, type matches the cell's declared type and lies within the relation's allowed set for each endpoint role, no duplicate cell, relation or edge. Output {kind:'sign.graph', cells, relations, edges: [{id: statement id, edge}], id: semanticId(content)}. Each edge also requires a WITNESS that is itself a cell in the graph. glueSignGraphs(...graphs) unions cells (conflicting content for one cell id errors), keeps relations declared identically, and for relations declared differently drops the relation and all its edges and reports obstructions [{code:'conflicting-relation', relation, graphs}]; the glued graph is rebuilt. Order-independent.
- **Theory:** Typed knowledge graph with witnessed edges (a relational field, via type-system/relations). The glue is a genuine sheaf-style gluing of local sections with a computed obstruction to gluing (conflicting relation declarations): the one place where H^0/obstruction thinking is actually computed. Limits: the obstruction is only on relation declarations, not on edge or cell-valued FOUR data (conflicting cell content is a hard error, not a FOUR 'contested'). Edges are boolean present/absent and carry no FOUR value.

### semantic-carriers (generated JSON Schema carriers)

- **File:** `services/engineering-services-section/services/computer-engineering-services-section/lib/signstuff/signcell/src/semantic-carriers.mjs`
- **Computes:** Frozen JSON-Schema 2020-12 objects cellSchema (an addressable position: kind 'cell', address, provenance[]), claimSchema, evidenceSchema, typedMarkSchema, semanticClaimSchema, semanticGraphSchema, semanticReferenceSchema, statementSchema, and defineSchemaType wrappers (cellType, claimType, ...). 422 lines of data.
- **Theory:** Admission contracts. The comment says the specifications are 'retired, so this module is their source'. COLLISION: `cellSchema` here is the provenance/address 'Cell' and is a different thing from cell.mjs's `cellSchema` (the triple). `Claim` here is {kind,subject:string,predicate,object,provenance}, a third notion of claim, unrelated to utterance claim.

### predicate-vocabulary

- **File:** `services/engineering-services-section/services/computer-engineering-services-section/lib/signstuff/signcell/src/predicate-vocabulary.mjs`
- **Computes:** createPredicateVocabulary(defs): checks lowercase-identifier names, unique, non-empty description/domain/range/category (all free TEXT, not types), and an optional inverse that must be declared and reciprocal. Gives {ok, value:{kind:'sign.predicate-vocabulary', definitions}} or a refusal listing issues. findPredicateDefinition, listPredicateDefinitions({category}). Not in the README, but exported.
- **Theory:** A name registry with an involution (inverse) check. Domain and range are strings, so this is not a typed signature; it cannot check domain/range at all. It is bookkeeping with the vocabulary of a typed category.

### semiotic-concept-universe

- **File:** `services/engineering-services-section/services/computer-engineering-services-section/lib/signstuff/signcell/src/semiotic-concept-universe.mjs`
- **Computes:** createSemioticConceptUniverse({concepts}) normalizes concept declarations ({id, title, body, tags, sameAs, publication{enabled,channels,status}, annotations (reference/atom/attribute/failure), attributes, source}), sorts by id, and computes identity classes by union-find on sameAs (the representative is the lexicographically smallest id; path compression). It resolves reference annotations to representatives and emits diagnostics (annotation-failure, unresolved-reference). It returns a typed mark of the whole object, so the universe's id is the hash of the whole content. selectSemioticConceptPublication picks one record per class filtered by channel and status. differentiateSemioticConceptUniverses diffs two universes (added/removed/changed by key; changed compared by JSON.stringify).
- **Theory:** Quotient of a set by a generated equivalence (sameAs closure), the 'identity class' = setoid. Alias-preserving (competing source concepts retained). It is a document-publication manager more than a semantic carrier: the 'publication' and 'channels' logic is application code in a data-layer library. Concept comparison uses localeCompare and JSON.stringify (locale- and key-order dependent) rather than the content address, which is inconsistent with the rest of the package's identity discipline.

### source-statement

- **File:** `services/engineering-services-section/services/computer-engineering-services-section/lib/signstuff/signcell/src/source-statement.mjs`
- **Computes:** A typed mark type for an 'attributed statement' (sourceSubject, sourceUrl, sourceTitle, text, force const 'alleges', status const 'source-supported', attribution const 'required', scope const, optional dates and evidenceDigest). sourceAssertionSentences(text): strips HTML tags, splits sentences by regex, keeps those with >=35 chars, dedupes by lowercase alphanumeric key, takes at most 20. sourceStatementCells maps these to typed marks.
- **Theory:** News-ingestion application code (provenance carrier), not data-layer theory. The 'const' fields make every statement identical in policy. It belongs in an application layer, not in SignCell.

### articulating operation apex (executeArticulateUtterance)

- **File:** `services/engineering-services-section/services/computer-engineering-services-section/lib/signstuff/signcell/src/articulating.mjs`
- **Computes:** A bounded (64 KiB) JSON request {tokenMark, claimMark, apex?} -> articulate(utterance(mark, mark)) -> a receipt {kind, apex, operation, requestNi: semanticId(input), identifiers, cell, id: semanticId(body)}. ARTICULATING_APEX = semanticId(apex body), which names the operation with its Node, Lean ('Obsmetrologia.Articulating.Cell.initial') and Solidity ('ArticulationCell.seat') implementations. encodeArticulatingRequest / decodeArticulatingRequest use canonical CBOR (refuse noncanonical bytes).
- **Theory:** A content-addressed operation interface (an 'apex' = the address of the operation's spec binding three language implementations). It is the nearest thing to a proof-carrying call: the receipt binds the request hash to the output. The Lean and Solidity identifiers are strings; nothing verifies they exist or agree. The structuredClone line is a workaround for prototype leakage.

## Capabilities a logical inference model can build on

- A FOUR-valued, content-addressed, CRDT-mergeable evidence store: cells with stable identity (the triple hash) and monotone witness accumulation. Merge is commutative, associative and idempotent, so distributed agents can exchange cells without coordination (matches the 'coordination-free' node requirement).
- A complete, correct Belnap bilattice plus twist-product linear logic (fusion, par, residuum, linear negation), the Klein-4 gauge, and counted Record lifts. It is a ready paraconsistent truth-value algebra, and the twistProduct is generic over any residuated lattice, so graded or transfinite truth values can be dropped in without changing the cell code.
- Contradiction is first-class: 'both' (contested) is a legal stable value, and topMass(recordOf(cell)) gives a quantitative conflict measure. This lets an inference engine localize inconsistency instead of exploding.
- Canonical-CBOR/ni: content addressing for any JSON/bytes value (NFC, deterministic). Any new AI state (activations, tiles, beads, proofs) can get an identity and be deduplicated across nodes.
- glueSignGraphs gives an order-independent gluing with computed obstruction reports, a working prototype of the sheaf-gluing step. It can be generalized from 'relation declarations conflict' to 'local FOUR sections disagree on overlaps'.
- Typed admission pipeline (type-system admit/instantiate, defineSchemaType) plus the typed mark {type, content, id}: a dependent-pair carrier with identity check, usable as the 'term with a type' for Curry-Howard-style propositions-as-types.
- WIT ledger (cellFlux / witFlux): an additive energy on knowledge ascent, with reversible/irreversible accounting; a ready scalar for a foam-like energy functional over cell populations.
- obsmetrologiaRealization: a working JS-to-Lean conformance binding table (28 declarations) that a new system can extend so each new operator ships with Lean-linked golden vectors.
- Converse / projections / specialization as named moves on the triple, plus an 'unrelatedPairs' complement over the closed specialization preorder: a minimal relational algebra on predications that can seed predication-algebra operators.

## Gaps and slop

- There are THREE incompatible meanings of 'cell': (a) cell.mjs evidence triple {s,p,o,for,against,value?}; (b) typed-mark 'sign.cell' {kind,id,type,content}; (c) semantic-carriers `cellSchema` {kind:'cell', address, provenance}. A fourth appears in utterance.mjs as 'articulation cell'. Names collide on exports (cellSchema, isCell, cell, cellSet, articulate) between cell.mjs, predication.mjs, utterance.mjs and semantic-carriers.mjs. The 'sign.cell' wire kind is frozen into stored addresses, so renaming means re-addressing.
- There are THREE 'claim' notions: utterance Claim (right-hand mark), semantic-carriers claimSchema (string subject/predicate + provenance), and SignClaim (evidence cell with typed refs). Predicate duplicates the claim's mark (Predicate.mark === Predicate.claim.mark).
- Two parallel coincidence paths: cell-level `sameCell` hashes the whole triple, while `termCoincides` / `predicateCoincides` in predication.mjs compare only `.mark.value`. cell-set.mjs and cell.mjs each implement 'cell set' differently (O(n^2) without merge vs Map-by-address with merge). entitySet/predicateSet use O(n^2) uniqueBy.
- README is stale: it lists `utterance-log`, `claim-identity`, `semantic-cell` modules that do not exist; says it depends on `@lenticule-science/metrologic` and `computer-system-engine`, but package.json depends on the content-engineering and data-engineering sections; omits articulating, typed-mark, source-statement, predicate-vocabulary. cell-set.mjs's header says 'settling/cell-set'. Theory (Lean) names in comments are not backed by any JS checks beyond tag distinctness.
- Names far exceed computation: 'aperiodic articulation cell' = a pair whose second part is a fixed empty list; 'transfinite predication category' and 'predicationFiberFunctor' are record wrappers around finite arrays with no functoriality; 'saturated' in `cohere` is just the unchanged cell list; 'conflateClaims' is a join, not conflation; 'Predication site' has no covering/topology. Nothing in this package computes anything tile-, aperiodic-, light-cone- or bead-like.
- Meet and conflation on cells are described in cell.mjs comments (value 'falls after a meet'), but SignCell has no cell-level meet or conflation. Only join (merge, witnessFor/Against) is present. Edges in semantic-graph carry no FOUR value (present/absent only), and conflicting cell content on glue is a hard error rather than a 'contested' reading.
- Moves (converse, projections, specialize) discard evidence, so they are not functorial on evidence-bearing cells. `evidenced()` REPLACES evidence, which breaks the monotone CRDT discipline. Witnesses are opaque JSON, so evidence has no structure (no provenance DAG, no witnesses-as-cells, no proof terms).
- Identity is purely syntactic (canonical bytes). SignCell never uses the SEN semantic-envelope identity that its own header ('There is no other identity scheme') promotes; it uses bare semanticId. The JS number type merges 1 and 1.0 and carries no exact-number identity. semiotic-concept-universe sorts and diffs with localeCompare and JSON.stringify (locale/key-order dependent), against the package's own canonical-identity discipline.
- Application code embedded in a data-layer library: source-statement.mjs (HTML stripping and 35-char sentence heuristics, news ingestion), semiotic-concept-universe.mjs (publication channels/status selection), plus articulating.mjs's Solidity/Lean identifier strings that nothing verifies.
- Tests: test/ covers only articulating, mark, semantic-carriers and semantic-claim; cell.mjs, predication.mjs, utterance.mjs, typed-mark.mjs (the heart of the package) have no test in this directory. Uncommitted modifications are in articulating, cell, mark, predication, typed-mark, utterance.
- four.mjs is imported by `readingSchema('knowledge')` in two places (cell.mjs and predication.mjs CellSchema) which differ from the cellSchema in cell.mjs: three near-copies of the cell schema (cell.mjs cellSchema, predication.mjs CellSchema, semantic-carriers cellSchema).

## Attachment points

- Make the witness a first-class cell: replace `for`/`against` arrays of opaque JSON by arrays of cell addresses (witnesses are cells whose own evidence is the justification), giving a content-addressed provenance DAG and a proof-term-bearing store (Curry-Howard: a witness is a proof, a cell is a proposition-in-context).
- Generalize the value domain: instantiate twistProduct over a graded residuated lattice (e.g. [0,1] under Lukasiewicz, or an ordinal-indexed chain) so a cell's stalk is a graded paraconsistent value. Keep FOUR as the 2-element quotient (readingOfRecord) and use Record/topMass as the 'frustration' scalar of a foam cell.
- Foam physics: treat a cell set as a foam: cells = bubbles, shared triple components (subject/object tokens) = films, predicates = film tension labels; knowledgeHeight / witFlux gives an energy E; a relaxation step is a knowledge-ascent that decreases the free-energy budget (the Lyapunov in four.mjs). Plateau-style local rules (e.g. at a shared endpoint, evidence from 3 films must be consistent) become FOUR-valued join checks like `tally`.
- Tile coloring: let a cell's endpoints be tile edges and the predicate the edge color; add an adjacency check in the style of `tally` (agree/disagree per edge as told-for/against) and build a Wang/sofic-style constraint satisfier over cellSet where the contested/denied readings localize local failures. 'Aperiodic' then becomes the existence of a consistent (potential-valued) global assignment with no period, tied to closure-regime's 'aperiodic' stratum.
- Light cones: define a causal preorder on cells via the existing specialization closure (closeSpecialization) and witness-containment (witness addresses as parents): past cone = ancestors whose evidence flows into a cell; future cone = cells citing it. 'Merge' restricted to cone-closed sets gives a causally consistent cut; coordination-free because merge is a CRDT join.
- FCA: a cellSet is a formal context if you take objects = subject tokens, attributes = (predicate, object) pairs, incidence = knowledge value ∈ {potential, stable}. Two polarities arise from the two sides (for/against), which is exactly Chu(FOUR)/bilattice-valued FCA; concept lattice via derivation operators over `sidesOf`. A cell-level Galois connection can be computed on `cellSet` output with the existing address ordering.
- Curry-Howard-Lambek: use typed marks {type,content,id} as terms-in-context, semantic-claim as typed Hom(a,b), glueSignGraphs as pasting of typed morphisms; add composition (p: A->B, q: B->C => q∘p with evidence = meet/fusion of witnesses via fusionReading) to turn the predication site into a genuine category with evidence-composition; this is where SignChain's code layer attaches.
- Weaving beads: the two-hand utterance (left token, right claim) is already a two-strand carrier; articulatingPair/Utter gives a finite word over utterances (a bead string with depth). A bead pattern = an Articulating chain; aperiodic order = a substitution rule applied to chains with content addresses as cheap equality checks for sofic/subshift membership.
- Attach an AI's training-free 'model' as an evidence cell set: weights/activations as canonical carriers (bigint/bytes supported), model state = cellSet address; inference step = merge + closure; receipts = articulating-style apex objects binding request address to output address (the apex pattern in articulating.mjs is already a verifiable-call format).
- Normalize the three 'cell' notions before anything is built on them (rename sign.cell type objects to `typed-mark` and re-address, or alias), unify cell-set implementations, make predication cell terms the same carrier as cell.mjs terms, and add real tests for cell/predication/utterance before extending.

