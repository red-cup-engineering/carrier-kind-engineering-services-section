---
title: "Re-homing the home-grow pull request by kind"
description: "The judgment of red-cup-engineering/computer-services-section#49 (the indoor-grow autonomic system and the cannabis finder) part by part: what is science and went to botany, agronomy and law; what is one household's data and went to the personal Minnesota indoor cannabis grow section; what is generic engineering and is carried as requirements; and what the house's MAPE-K and agent-organization engines lack."
date-created: 2026-10-10
type: note
authors: [red-cup-engineer-senior]
utterances:
  - "ni:///sha-256;iOEf1dsqSmKb_UpuMDTvvhHBO52eH5FtabD-CdpaJJM"
  - "ni:///sha-256;OyRuhOjz7BSMjgw3xQW_EXV83l4yIlR4iv-xC_noRnI"
  - "leader message 2026-10-10T01:08Z, quoted in the grow-assist brief of 2026-10-09-leader-words-pass-order.md"
judges: "red-cup-engineering/computer-services-section#49, closed 2026-10-09, head refs/archive/2026-10-09/senior/indoor-grow-autonomic-system at dcc986bd19"
---

# Re-homing the home-grow pull request by kind

## What was made

On 2026-10-07 the Leader asked for three Sonnet engineers and two Haiku researchers to extend the Group's science, engineering and operations for cannabis, finding cannabis, and running a small eight-plant indoor grow in Minnesota: "the most AI assisted grow we can possibly imagine, next-gen nonsense, since we have so much agent stuff anyway. Go hard on this work." The work landed as one pull request, red-cup-engineering/computer-services-section#49, "Control a home grow autonomically and find what to grow": about 8,350 added lines in two packages, `services/indoor-grow-autonomic-system` and `services/cannabis-finder-service`, zero-dependency Node 22 ES modules. The Leader's sprint sheet of 2026-10-09 listed "Cannabis PRs #31, #58 and #49" for review. On 2026-10-09 the receiving note judged #49 "evacuate" and closed it as misaligned: one household's Minnesota data and a parallel MAPE-K loop, in a generic engineering repository. Its head is archived; nothing of it was deleted. On 2026-10-10 the Leader said the grow work "got lost in sessions that diverted into fixing bugs" and that in-repo resources must be thicker than out-of-repo resources so other agents can carry it forward.

The rule existing-work-is-judged-before-it-is-discarded requires each part judged. The rule science-engineering-operations-parameterize-in-order decides where each part goes: science holds theory and research; engineering derives generic, unbranded tools; operations parameterizes them; public and personal sections parameterize operations. No engineering resource carries a particular section's data.

## The parts and where each went

| Part of #49 | Kind | Judgment | Re-homed to |
|---|---|---|---|
| `data/stage-setpoints.json` (per-stage day/night bands, substrate, drying, curing; sources; practice notes) | science data | aligned content, misplaced | botany `data/records/cultivation-research-records/2026-10-10-minnesota-indoor-cannabis-cultivation.json`; explained in the agricultural-science note on indoor cannabis cultivation |
| Crop-steering numbers, yield-per-mole prior, GDD model, harvest timing, perpetual-harvest rhythm (README) | science | aligned content, misplaced | agricultural-science note `2026-10-10-note-on-indoor-cannabis-cultivation.md`; glossary terms `crop-steering`, `vapor-pressure-deficit` |
| `src/compliance/minnesota-governor.mjs`, `src/schedule/possession.mjs` limits (8, 4, 907 g, 56.7 g gifts) | law as code | aligned content, misplaced (law as literals) | law-science note `2026-10-10-note-on-minnesota-adult-use-home-cultivation.md`; limits as data in the botany cultivation record; the governor as requirements R1, R2, R7 below |
| `cannabis-finder-service/data/sources.json`, `data/platform-terms.json` | public market data | aligned content, misplaced | botany `data/records/sourcing-research-records/2026-10-10-minnesota-cannabis-sourcing.json` (the place requirement `minnesota-eight-plant-indoor-grow-science` R4 names) |
| `deploy/` (ESPHome nodes, Home Assistant package, entity map, cameras, systemd unit, environment), `src/loop/config.mjs` site defaults | one household's data | aligned content, misplaced | personal Minnesota indoor cannabis grow section `data/records/household-grow-configuration-records/2026-10-07-household-indoor-grow-configuration.json` |
| MAPE-K loop (`src/loop`), journal (`src/knowledge/journal.mjs`), runtime, alarms, watchdog | generic engineering | misaligned as a parallel loop; the capabilities are real | requirements `indoor-grow-autonomic-control.json` (this section), on the indoor-grow controller and on the Group's MAPE-K engine |
| Perception, plant twin, recipe optimizer, crop steering, possession scheduling, advisor | generic engineering over science records | aligned capabilities, unowned | same requirements file |
| Cannabis finder (`src/`: terms gate, robots, polite fetch, ranking, genetics filters, advisor) | generic engineering | aligned capabilities, misplaced | same requirements file, subject "the cannabis-sourcing finder" |
| Fixtures (synthetic menus, seed banks) | test data | superseded | left in the archive ref |

## What the house's engines lack

The requirement `ai-assisted-indoor-grow-controller` (R2) says the controller runs on the Group's MAPE-K engine and carries no loop of its own. On 2026-10-10 the house holds no MAPE-K engine package: `git ls-files` finds the glossary term MAPE-K, the 2026-07-11 research note, design notes, and a corpus-management `mape-stage` schema, but no loop that monitors, plans and executes over a managed resource. The agent organization engine (`agent-computer-system-engineering-services-section/apps/agent-organization-engine`) holds nine faculties (relating, communicating, knowing, playing, animating, computing, socializing, gaming, organizing) and SignChain telling logs for agent work, but no control loop, no governor over proposals and no device boundary. So #49's loop was not parallel to an existing engine; it was the only realization, in the wrong place. What it had that the engines lack is carried as requirements on "the Group's MAPE-K engine" (E1-E6), and the grow-specific capabilities as requirements on "the indoor-grow controller", which composes that engine. The agent-organization engine's part is the proposer side: an agent's output enters the loop as a proposal with its evidence (E2), and its telling log is the natural carrier of the journal (E1).

## The Assist side

The indoor-grow controller is autonomic; an Assist application is decision support, never automation (Assist application platform v0.3.0). They meet at the journal: the controller writes observations, plans, proposals and refusals; `indoor.cannabis.grow.assist.561.group` and its Minnesota leaf read them, explain them with their provenance, and let the grower submit proposals the controller admits or refuses. The instance chain is specified in the personal grow section's specification `2026-10-10-grow-assist-instance-chain.md`.

## Open questions

- Pull requests #31 and #58 (the other cannabis pull requests on the 2026-10-09 sheet) were not located in computer-services-section by this pass; their repository is unknown here.
- Which engineering section owns the Group's MAPE-K engine when it is founded (systems engineering under computer-systems-engineering, or the agent-computer-system line beside the agent organization engine).
- Whether the cultivar record #49 named in `coesite-operations/operations-services-section` (`cultivation-operations-services-section`) and the stage-setpoint dataset in `lenticule-science/science-services-section` (`cannabis-services-section`) exist outside this house; neither is in it.
