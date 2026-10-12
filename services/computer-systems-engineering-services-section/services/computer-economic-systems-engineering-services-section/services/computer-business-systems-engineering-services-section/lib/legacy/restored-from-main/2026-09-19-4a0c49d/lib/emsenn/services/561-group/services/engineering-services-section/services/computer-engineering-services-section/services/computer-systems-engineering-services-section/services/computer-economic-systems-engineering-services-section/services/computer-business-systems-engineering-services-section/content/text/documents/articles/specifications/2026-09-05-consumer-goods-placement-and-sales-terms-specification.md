# Prospect qualification and sales compensation specification

This specification gives computer-business-systems-engineering-services-section one reusable, bounded
commercial terms model for a goods placement and for a distinct service
contract. It is a data contract and worksheet shape, not a CRM, a prospecting
engine, a commission engine, or a grant of outreach authority.

The consumer-goods program consumes this specification through its
[program carrier](../../../../../../../../../../../../../../561-group-services-section/services/561-group-operations-services-section/services/561-group-goods-services-section/services/consumer-goods-services-section/README.md).

## Objects and custody

An **offering** is the thing sold. A **placement or customer candidate** is a
possible site or customer. A public directory entry makes a candidate; it
does not create a qualified prospect or authorize contact. A qualification is
one offering at one candidate at one time. It records each required condition
as met, unmet, or unknown, with its source, as-of time, and expiry.

An **economics scenario** names its inputs and whether each is a seller
estimate, quote, measurement, history, or hypothesis. It carries low, base,
and high cases. Unknown rent, volume, or any other input keeps the scenario
unpriced; an opaque weighted score may not turn missing facts into a good
prospect or a positive forecast.

A **sales assignment and compensation agreement** is separate from both a
candidate and an economics scenario. It distinguishes the property or host
decision-maker, audience, customer buyer, installer, restocker, artist or IP
owner, 3PL, and sales representative. It does not decide legal enforceability
or employment classification.

Exports use JSON Schema plus the existing EAVT and semantic-record-journal
references for identity and provenance. This specification adds no storage
system.

## Qualification

The qualification record has `offering`, `candidate`, `asOf`, `expiresAt`,
and a set of conditions. Each condition states whether it is required and
contains `state` (`met`, `unmet`, or `unknown`), `source`, and `observedAt`.
An accepted qualification has every required condition met; no summary flag
may substitute for those individual facts. It may name an authorized next
action, but contact discovery remains separate from outreach authorization.

The first consumer-goods examples are a sticker counter and a weather rack.
A service contract is the second, distinct consumer of these same fields; it
prevents the contract from being silently specialized to physical goods.

## Economics

For each scenario and case, operating contribution is calculated from revenue excluding
collected sales tax, less landed goods or print waste, payment variable and
per-transaction fees, refunds and chargebacks, artist royalty, host revenue
share or rent, maintenance reserve, recurring connectivity or software,
travel and replenishment labor. Horizon operating contribution is the monthly
operating contribution multiplied by an explicit horizon, before capex and
acquisition payout.

The maximum affordable acquisition payout is
`max(0, horizon operating contribution - net upfront capex - required retained
surplus)`. Each low, base, or high case records its own allowance and
viability. Economic viability remains a separate boolean: a zero allowance
does not itself establish viability. A priced case supplies its volume, rent,
inputs, and contribution; unknown values make it unpriced. The allowance may
never be inferred from gross sales, footfall, or an unsigned placement.
Inputs retain their stated evidence class; a hypothesis is not a measurement.

## Sales compensation

Each payout rule identifies exactly one trigger: upfront research fee,
qualified appointment, signed site agreement, installed or activated
placement, or realized collected sales. Compensation is either a fixed cent
amount or a share expressed in basis points with its base; it is never a
cent-valued rate. The rule names its cap, attribution scope and window,
required evidence, observed evidence references, and treatment for refunds,
cancellations, and termination. A payout remains pending until observed
evidence references are present. Realized-sales payouts apply the agreement's
refund treatment rather than treating a refunded sale as permanent revenue.
Schema validation establishes record shape only. A runtime semantic assay
must establish that an evidence reference is authentic and satisfies the
named requirement before any actual payout or claim enforcement.

## Acceptance examples

A manually reproducible JSON example validates against the exported
[JSON Schema](../../../../../data/records/schema/prospect-qualification-and-sales-compensation.schema.json).
The sticker-counter and weather-rack examples
may use explicitly hypothetical low/base/high values to demonstrate the
formula; they are not demand forecasts. A scenario with unknown rent or
volume stays `unpriced`. A qualifying record with an unknown required
condition cannot be accepted. A commission payout without its specified
acceptance evidence remains pending.

## External comparison boundary

The bounded comparable jobs were observed on 2026-09-06 and retained in the
[comparison record](../../../../../data/records/2026-09-06-consumer-goods-commercial-interface-observations.json).
HubSpot documents
customizable lifecycle stages and defines a sales-qualified lead as a contact
or company that the sales team has qualified as a potential customer;
opportunity and customer stages follow a deal. ArcGIS Business Analyst
documents demographic, business, lifestyle, spending, and census data with
map analysis that can combine proprietary locations and property costs with
prospective-customer data. Xactly Incent documents compensation-plan
administration, calculations, payments, and reporting. Their pricing,
US account-specific contracts, failure behavior, and parity with this
specification are unmeasured. Salesforce's attempted source URL returned 404
and is omitted from this comparison.

The hypothesis to test is narrow: one small deployment record can join site
evidence, observed contribution, and sales acceptance or payout across a
counter-goods placement and a service contract. It is not a claimed advantage
until a measured comparison supports it.

## Grounding

The house starting point is the business-science
[customer-discovery and market-intelligence carrier](../../../../../../../../../../../../../../science-services-section/services/social-science-services-section/services/economics-and-business-science-services-section/services/business-science-services-section/services/business-research-services-section/content/source-packets/modern-firm-as-operational-system/customer-discovery-market-intelligence.md)
and its marketing-science [lead-generation term](../../../../../../../../../../../../../../science-services-section/services/social-science-services-section/services/economics-and-business-science-services-section/services/business-science-services-section/services/marketing-science-services-section/content/text/glossary/terms/lead-generation.md).
The local
[sticker-machines and Duluth research note](../../../../../../../../../../../../../../public-services-section/services/public-consumer-goods-services-section/content/text/documents/articles/notes/2026/09/06/2026-09-06-note-on-sticker-machines-and-duluth-consumer-goods.md)
supplies the current application boundary. This contract keeps their
customer-discovery question separate from authorization to contact someone.
