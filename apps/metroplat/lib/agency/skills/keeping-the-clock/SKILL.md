---
name: keeping-the-clock
description: "Keep the operations world's clock: admit and retire schedules, read them, and tick run-due."
closure-kind: process
requires-capabilities:
  - schedule-admit
  - schedules
  - run-due
---

# Keeping the clock

The host's one timer ticks `run-due`. Schedules are admitted with `schedule-admit` (the work runs as the account named, under its offices and the house's rules) and read with `schedules`.
