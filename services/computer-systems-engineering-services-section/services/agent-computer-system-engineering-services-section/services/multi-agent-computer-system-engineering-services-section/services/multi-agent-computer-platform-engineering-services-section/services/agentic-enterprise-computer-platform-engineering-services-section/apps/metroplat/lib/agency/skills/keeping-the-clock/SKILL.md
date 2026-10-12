---
name: keeping-the-clock
description: "Keep the operations world's clock: admit and retire schedules and read them."
closure-kind: process
requires-capabilities:
  - schedule-admit
  - schedules
---

# Keeping the clock

The host's one timer computes which schedules are due, from each schedule and its last run, and runs them as their accounts; it is not an operation and a tick that runs nothing leaves nothing. Schedules are admitted with `schedule-admit` (the work runs as the account named, under its offices and the house's rules) and read with `schedules`.
