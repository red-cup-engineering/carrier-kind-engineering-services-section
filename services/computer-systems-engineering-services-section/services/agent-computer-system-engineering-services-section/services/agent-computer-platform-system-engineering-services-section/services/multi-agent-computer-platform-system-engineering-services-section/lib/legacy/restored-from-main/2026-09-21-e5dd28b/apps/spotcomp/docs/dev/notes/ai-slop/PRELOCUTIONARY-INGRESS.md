# Prelocutionary Ingress

Status: source-backed declaration profile.
This file records the boundary before locution and the handler discipline that preserves the predication-stage categories when external messages enter SPOTCOMP.

## 1. Primitive Boundary

The active tree grounds articulating in an `utterance`, not in a row, command, packet, or settlement.
An utterance is the ordered pair of one token and one claim.
Token and claim are the two non-assembling primitives that let the recursive articulating type have finite inhabitants.

The string presentation of a token or claim is not its categorical identity.
The string is the finite on-disk presentation.
The categorical identity is the primitive's role in the articulating recursion and its position in the utterance pair.

The pair structure is load-bearing.
With one primitive, articulating would have only two statuses.
With token and claim, articulating has the two-sided carrier needed for the four aperiodic cell positions.
The token-before-claim reading is a declared working reading, not a silent final theorem; handlers must record the ordering they preserve.

## 2. Articulating Ingress

Articulating is the constitutive generator:

`utterance -> aperiodic-predication-category`

Its codomain is the aperiodic predication category whose initial presentation carries the potential aperiodic predication cell.
Later movement into active, stable, or absurd cells is downstream work inside the generated category.
Finite settlement, row records, and FOUR projections are not prerequisites for articulating.

Prelocutionary ingress therefore has one main obligation: before an external trigger reaches locution, the handler must preserve whether it is presenting an utterance for articulating, a typed input for predicating, a positing input, or a finite projection request.
The handler must not infer the stage from transport shape alone.

## 3. Locutionary Handler Boundary

Locution is environmental decoding: receiving an argv vector, hook payload, HTTP request, or comparable environment shape, parsing it, validating it, and yielding typed internal input for the next morphism.
It is distinct from:

- illocution: the pure event-bounded positing morphism;
- perlocution: closure propagation and settlement toward a least fixed point.

A runtime may package these steps in one executable command for convenience, but conformance evidence must name the component morphisms.
A single path or function body that treats environmental parsing, pure positing, trace writes, and closure firing as one proof object is malformed.

## 4. Handler Classes

A conforming ingress declaration should cover each environmental handler class it supports:

- script argument vector;
- hook payload;
- HTTP request.

For each class, the declaration records the environmental shape, typed codomain, required stage declaration, target morphism role, validation behavior, error behavior before illocution, and whether any downstream writes or closure steps are separate named morphisms.

Parsing or validation failure is pre-illocutionary.
It may produce a local error response or audit fact, but it is not evidence that a positing occurred.
A handler that cannot prove typed input MUST NOT emit a positing event.

## 5. Implementation Profile

Prelocutionary-ingress declarations use [schema/prelocutionary-ingress-profile.schema.json](./schema/prelocutionary-ingress-profile.schema.json).
The declaration probe [src/prelocutionary-ingress-profile.mjs](./src/prelocutionary-ingress-profile.mjs) checks that a profile records:

- token, claim, and utterance as the primitive ingress carrier;
- articulating as the generator from utterance to the aperiodic predication category;
- locution, illocution, and perlocution as distinct ordered positions;
- handler classes for script, hook, and HTTP ingress;
- implementation boundaries preventing transport parsing from becoming hidden positing, trace write, or closure evidence.

The checker does not prove the articulating category generation, the token-before-claim working reading, or the full Austin-Searle coincidence theorem.
It makes those assumptions explicit so implementation probes cannot erase them.
