---
name: calling-parties-to-projects
description: "Work the structural-claims call queue: call councils, county boards, community groups and developers about the projects they face, log each contact, and set discovery calls."
closure-kind: process
requires-capabilities:
  - claims-call-queue
  - claims-watch-list
  - claims-projects
  - claims-project
  - claims-register
  - claims-contact-log
  - enterprise
  - enterprise-bid
---

# Call the parties to projects

1. Work the call queue (`claims-call-queue`): callbacks due first, then holders of structural claims not reached lately, the richest priced options first. The watch list (`claims-watch-list`) names the nations already acting.
2. Read the project before each call (`claims-project`): the developer, the schedule, the party's claims and what each is worth as an option on that schedule.
3. Call the party's council office, natural-resources or legal department, county board or community group. The opening: "We keep a register of the claims communities hold against the data-center and energy projects near them, which of those claims can pause the project, and what each is worth against the developer's schedule. We'd like to show you yours for [project]."
4. Log the outcome, callback time and notes (`claims-contact-log`). For every interested party, set the discovery call and log `discovery call set`; the engagement lead picks it up.
5. Your share is recorded on each engagement you originate and shown on the pipeline.

## The enterprise

Read the register's enterprise (`enterprise enterprise=structural-claims-register`) and bid for a target you will commit to (`enterprise-bid`).
