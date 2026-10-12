# @red-cup-engineering/decide-work-placement-service

Decides one provider-neutral work placement from exact demand, finite resource and quota, offer, policy, and observation evidence without performing effects.

## Operation

~~~js
export function admitTypedWorkDemand(value)

export function decideWorkPlacement({ demand: demandValue, offers: offerValues, observations: observationValues = [] })
~~~

### Parameters

- value (object): A TypedWorkDemand candidate to admit and normalize.
- request (object): A demand, offers, and observations record.

### Returns

admitTypedWorkDemand returns the normalized TypedWorkDemand without selecting a provider or performing effects.

object: A WorkPlacementDecision or typed WorkPlacementRefusal with an explicit attempt plan.

### Refusals

- TypeError: When the TypedWorkDemand, demand, or observation contract is invalid.

decideWorkPlacement admits its demand through admitTypedWorkDemand before evaluating offers, so direct admission and placement consume the same normalized contract. Subscription quota remains a nonfungible resource: moving work from one paid subscription quota to another is capacity management, not savings.

## Measured-resource requirements

A work offer MUST retain consideration and resource dimensions as exact `{kind|resource, asset, unit, amount}` vectors. Placement MUST NOT convert currencies, credits, tokens, network bytes, requests, or elapsed time into one scalar.

An availability observation MAY describe one account/window-scoped resource vector. It MUST name the offer, account identity, provider identity, observation time, and every validity or reset bound it asserts; credentials are references only and never observation data. An exhausted, expired, or identity-mismatched observation MUST refuse the offer before execution. Missing availability is unknown rather than zero or unlimited, and a caller policy MAY permit that uncertainty explicitly.

Every durable `WorkResourceBinding` also carries one `WorkResourceFinancialControl`: an exact cost vector, its evidence and expiry, meter evidence and expiry, and either a time-bounded billing authority or an explicit `not-required` status. `observed`, `candidate`, and `committed` cost states are distinct. A candidate price cannot execute; nonzero observed cost cannot execute; nonzero committed cost requires current authorized billing. A zero exact cost may use `not-required` billing only while its cost and meter evidence are current. This is resource-control evidence, not an expense, payable, cash movement, or ledger posting.

Placement observations and budgets MUST remain distinct for different account/window identities even when they name the same provider. A selected result MUST preserve separately the planned resource vector and the measured execution vector. Failed, child, fallback, and re-ask attempts MUST retain known request, token, duration, and network-byte measurements; absent measurements remain absent.

## Command

decide-work-placement reads one JSON value per input line and writes one JSON value per output line.

## Examples

### no feasible work offer produces the typed refusal

Input:

~~~json
{
  "demand": {
    "type": "TypedWorkDemand",
    "id": "urn:demand:example",
    "taskClass": "bounded-work",
    "principal": "urn:actor:customer",
    "requiredCapabilities": [],
    "requiredQualityTiers": [],
    "requiredEffects": [],
    "requiredExecutionClasses": [
      "bounded-compute"
    ],
    "idempotence": "idempotent",
    "context": {
      "identity": "urn:context:one",
      "authorityScope": "urn:scope:one",
      "freshnessIdentity": "urn:freshness:one",
      "dataConstraints": [],
      "custodyConstraints": []
    },
    "outputContract": {
      "identity": "urn:output:one"
    },
    "measures": {},
    "routePolicy": {
      "preferenceOrder": [
        [
          "consideration"
        ],
        [
          "resources"
        ],
        [
          "latency"
        ],
        [
          "acceptance-probability"
        ]
      ],
      "considerationPreference": [],
      "considerationCeilings": [],
      "resourceCeilings": [],
      "reuse": "forbid",
      "unknownObservations": "choice-required"
    }
  },
  "offers": [],
  "observations": []
}
~~~

Output:

~~~json
{
  "type": "WorkPlacementRefusal",
  "version": 1,
  "disposition": "refused",
  "selected": null,
  "attemptPlan": [],
  "refusals": [],
  "rationale": [
    "exact-feasibility-produced-no-placement"
  ]
}
~~~
