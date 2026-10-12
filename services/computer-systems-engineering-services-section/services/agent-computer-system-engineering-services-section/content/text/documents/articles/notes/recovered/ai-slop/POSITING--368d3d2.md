# Positing Boundary Profile

Status: candidate declaration surface.
This profile records the repo-derived boundary around positing while the full D1/D5 derivations remain open.

## 1. Source Picture

The active positing schema defines positing as the Scott-continuous category generator inside the predication category:

`posit_(phi,q)(v) = v join_k delta_(phi,q)`

It is the knowledge-order least extension of a valuation at one cell.
It changes only the fiber for the cell predicate and only the entity-pair coordinate named by the cell.
Settling, transaction records, and logs are downstream presentations.

The active positing-naturality note then upgrades positing to a 2-cell in the predication-fibration 2-category.
For any predicate-category morphism `f : p' -> p`:

`f*(posit_(phi,q)(v)) = posit_(f*(phi),q)(f*(v))`

The datum `q` is preserved.
Reindexing changes the cell location, not the value.

## 2. Boundary To Rows

SPOTCOMP needs EAVT rows as finite trace carriers, but it must not confuse the row with the whole categorical morphism.
This profile therefore separates:

- categorical positing: the Scott-continuous least-extension morphism on valuations;
- illocutionary event presentation: the pure row or entry returned as a value;
- perlocutionary effects: writes, closure firing, settlement, and downstream propagation.

This resolves the apparent local tension between sources that describe positing as returning a valuation and speech-act notes that describe illocution as producing an EAVT row.
The former is the categorical action; the latter is the event presentation of the act.

## 3. Speech-Act Factorization

The required factorization is:

- locution: environmental decoding into typed internal input;
- illocution: pure positing event, with no IO and no closure firing;
- perlocution: closure-unit propagation toward least fixed point.

These are distinct categorical positions.
A bundled implementation that parses an environment trigger, creates the positing event, writes it to storage, and fires closure in one morphism is malformed as a SPOTCOMP proof object, even if it is useful code.

[PREDICATION-STAGES.md](./PREDICATION-STAGES.md) adds the upstream category boundary that locution must preserve: articulating generates the aperiodic predication category, predicating generates the transfinite predication category, positing generates the Scott-continuous predication category, and settling generates the finite predication category.
A locutionary wrapper may decode environmental input, but it must not silently choose or collapse these stages.

[PRELOCUTIONARY-INGRESS.md](./PRELOCUTIONARY-INGRESS.md) records the earlier ingress boundary: external trigger bytes are parsed and validated into typed input before illocution, and failure at that layer is not evidence that positing occurred.

## 4. Naturality Requirements

A positing profile declares:

- the theorem status for positing naturality;
- the reindexing equation;
- the four generator-action classes: specialization, converse, subject-projection, object-projection;
- preservation of the datum under reindexing;
- the 2-cell status of the fixed-datum family.

Projection cases may require finite batch positings.
This profile allows that only as an explicitly open obligation unless a batch witness is supplied.

## 5. FOUR As Active Specialization

The active on-disk positing script currently realizes boolean `L` through articulation-cell/FOUR data.
That is useful as a witness of one specialization.
It is not the general SPOTCOMP positing carrier.

A profile may cite FOUR only when it also declares:

- `generalCarrier = "L^bowtie"`;
- `activeSpecialization = "FOUR/articulation-cell"`;
- `specializationOnly = true`;
- an open obligation for the general `L` datum schema.

## 6. Declaration Probe

The checker in [src/positing-profile.mjs](./src/positing-profile.mjs) validates only declaration shape:

- positing is declared as Scott-continuous, monotone, least-extension, and single-cell localized;
- naturality has the expected equation, generator classes, datum preservation, and 2-cell status;
- locution, illocution, and perlocution are distinct and ordered;
- illocution has no IO or closure firing;
- event-presentation rows are exact EAVT rows;
- records, logs, writes, and closure are downstream, not the positing morphism itself.

It does not prove naturality, implement general `L`, or close batch projection naturality.
