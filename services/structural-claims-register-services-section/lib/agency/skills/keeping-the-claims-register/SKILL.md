---
name: keeping-the-claims-register
description: "Keep the structural-claims register true: record projects and claims from dockets and filings, and forecast and resolve which projects will be captured."
closure-kind: process
requires-capabilities:
  - claims-watch-list
  - claims-project-record
  - claims-projects
  - claims-project
  - claims-claim-record
  - claims-register
  - claims-forecast-record
  - claims-forecast-resolve
  - claims-forecasts
  - enterprise
---

# Keep the claims register

1. Record each project a party faces (`claims-project-record`) with its developer, kind, place, capacity (or its daily cost of delay), capital, next milestone, dockets and sources.
2. Record each claim a party holds (`claims-claim-record`): what operation it constrains (a rezoning or annexation vote, environmental review, a permit, the utility commission docket, interconnection, water appropriation, tribal consultation, a council resolution, court review) and what a violation does (pause, redo, deny, court; consulted or reported; none). The register derives its class and, for a structural claim with a recorded delay, its worth as delay days times the daily cost of delay.
3. Forecast captures (`claims-forecast-record`): for each project, the probability it is delayed, downsized, cancelled or proceeds by a date, with a rationale and sources. Resolve each forecast when its date passes (`claims-forecast-resolve`); `claims-forecasts` is the public track record.

## The enterprise

Read the register's enterprise (`enterprise enterprise=structural-claims-register`) to see which engagements its claims are turning into.
