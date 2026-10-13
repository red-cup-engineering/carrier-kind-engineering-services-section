---
title: "Specification of the Kalshi desk as an Area with pulses"
date-created: 2026-10-10
description: "How the requirements raised by the Leader on Kalshi and prediction markets compose: a typed Area, pulses through FeltOS into MetroPlat, a guarded computed desk, total category coverage, a price-trajectory line and a minimal recorder."
keywords:
  - kalshi
  - area
  - pulse
  - metroplat
  - feltos
  - specification
provenance:
  authors:
    - emsenn
  office: Red Cup Engineer Senior (pass kalshi-markets of debt-2026-10-09-leader-words-held-in-corpus)
  realizes:
    - kalshi-guards-bound-the-desk-and-never-replace-development
    - kalshi-covers-every-market-category-and-the-games-inside-them
    - kalshi-contract-price-trajectory-research-line
    - kalshi-runs-as-an-area-with-pulses-not-systemd-timers
    - kalshi-keeps-only-data-that-cannot-be-requeried
  extends:
    - kalshi-one-system-for-more-and-better-predictions
    - kalshi-trading-on-determined-outcomes
---

This specification states a design only. It writes no code. Where the house already holds a mechanism it names it and adds only what the Leader's words require. Notes: `2026-10-09-note-on-the-kalshi-proven-false-lane.md` (financial section) holds the observed state; `2026-10-10-note-on-the-leaders-trading-direction.md` holds the direction.

## Operating host and ASSIST destination

Leader, 2026-10-13: "Our Kalshi ASSIST shouldn't depend on my laptop running in order to do whatever it does." The Kalshi service's credentials, state and autonomous pulses belong on its operating web host; the Leader's laptop is a development and access client. Verify the host's own signing and execution, with no runtime dependency on the laptop.

The directed public destination is `public-kalshi-services-section/sites/kalshi.assist.561.group` at `https://kalshi.assist.561.group`: a rich ASSIST application whose MetroPlat instance carries the Kalshi Semioverse and a Kalshi Paracosm for each Person. It supports account monitoring and prompts that lead agents to improve strategies and upstream applications, including other people who join. This destination guides architecture; the Leader explicitly says it is beyond today's work. Today's delivery remains working, improving Kalshi account operation, current source reconciliation, issues, PRs and deployment before the day's markets.

## Composition

1. **The Area.** The Kalshi services section is a typed Resource of the MetroPlat instance on Cold Red Gate. Its Area holds Characters (the desk, the forecaster, the recorder, the category shadows), each with pulses (the cycle the desk already runs every 60 seconds becomes a pulse), heartbeats (liveness) and ticks (the unit of advance). The seven Kalshi jobs now declared only on the host are declared in the section under source control (CN-4) as pulses, not as systemd timers.
2. **The carrier.** AOE pulses ride FeltOS into MetroPlat. Machine services (systemd, memory, CPU, network) are provided by their engineering services sections, hired by the one Bare Cedar Fog services section, a micro-enterprise on the Bare Cedar Fog MetroPlat instance. No Kalshi unit file is authored in the Kalshi section.
3. **The data.** Every datum the section holds is a SignCell; sequences are SignChains and relations SignGraphs. The recorder keeps only what the venue will not return again (order-book snapshots at their moments, observation values that are later revised or dropped) and stores differences, not repeats.
4. **The desk.** One desk, with lanes and evidence adapters (proven-false lane PF-1..PF-10). A guard is a typed limit that names the loss it prevents. Every probability and decision is a computation from the Group's mathematics (local gluing, global sections, tiling, sheaf Laplacians, fiber algebra), in code. Before capital rests on a forecast, the regime check compares it with the series' observed regime and the re-test compares it with settled outcomes.
5. **Coverage.** A category registry lists weather (all series), sports, elections, politics, culture, crypto, commodities, economics, finance, mentions, and science and tech. Each category runs in shadow mode with a graded record before capital (CN-11). A liquidity calculation states the capital needed to rest tickets across all weather books daily. Near-close contracts, mention contracts and the Sports Prop Combo are classes in the registry.
6. **The price-trajectory line.** A second forecaster predicts the executable price distribution of a contract after 30 s, 1 min, 5 min and the next game-state transition from a recorder of event state, book, implied probability and incoming information. Its output is an executable-value estimate net of spread, fees, depth, slippage, latency, fill probability, adverse selection and holding-period risk. It is scored apart from settlement forecasts, by Brier score on settlement forecasts and net realized value on trajectory trades.
7. **Strategy space.** Each category's strategies are written in the shared typed vocabulary of players, rules, arena and strategies. Obsmetrologia measures coordination and conflict among participants; each measurement names the result it uses (see the ludics record `sports-and-other-prediction-strategy-spaces-by-obsmetrologia`).
8. **Cross-venue.** A comparator records Kalshi/Polymarket gaps for the same event net of both fee schedules and the cost of moving funds between the venues' wallets.

## Where Obsmetrologia applies and the result it rests on

Obsmetrologia is the Leader's measure of "coordination and conflict in complex systems". It applies in items 6 and 7 (the participants' belief updates and the strategy space). No named theorem is asserted here; the theorem census lives in `computer-proofing-system-services-section/apps/obsmetrologia-theorem-audit`, and each use in a later strategy-space record must name the result it takes from that census.

## Open

- The Area's Character list and the exact pulse period of each are not settled; the desk's 60-second cycle is the only observed period.
- Cold Red Gate is the current operating host. The distinct Kalshi ASSIST instance and public destination above remain a future delivery; they are not an acceptance condition for today.
