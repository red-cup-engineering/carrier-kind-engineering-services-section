---
title: "Note on the FeltOS ecology law: stock and pollution read from the last event"
description: "Specification note for feltos-ecology-is-read-from-the-last-event: why a world's ecology should be a closed-form law over its last harvest and pollution events, and the shape of that law."
date-created: 2026-10-10
authors: [Red Cup Engineer Senior]
status: specification note
leader-utterances:
  - ni:///sha-256;sDzm9B89oVD9HXiHG4mRVAJHrJJzP9tfJ9zd0nbxZrM
requirements: ../../../../../../../requirements/feltos-ecology-is-read-from-the-last-event.json
---

## The law

A FeltOS world's ecology is a law over events, not a state advanced by ticks. For each resource r, the world records only two things:
- its last harvest, (t_h, stock after harvest S_h);
- its last pollution event, (t_p, pollution after event P_p).

Stock and pollution at any time t are read by formula. The forms below are this note's proposal; the Leader fixed only that the read is a formula from the last event:
- **Stock** regrows by logistic recovery toward capacity K at rate g. S(t) = K / (1 + ((K − S_h)/S_h)·e^(−g(t − t_h))) for S_h > 0. A depleted resource (S_h = 0) recovers only from a declared seed stock.
- **Pollution** decays exponentially at rate d. P(t) = P_p·e^(−d(t − t_p)).
- **Coupling.** Pollution can lower capacity: K_eff(t) = K·(1 − κ·P(t)). Where coupling is declared, the stock read integrates the coupled law in closed form if one exists, or by a fixed-step evaluation from t_h, memoised by (r, t_h, t).

A harvest at t reads S(t), subtracts the take, and records the new (t, S). A polluting act reads P(t), adds the emission, and records the new (t, P). Nothing is written on a tick in which nothing happens.

## Why

- Climate and needs already run on rate laws (FeltOS e037384, Farstone a11fe8e). Ecology was the remaining per-tick writer.
- Farstone's world host advances time on requests, at most one overdue tick per request, and owes idle time. Per-tick writes make owed time cost proportional to its length. A law makes it cost one evaluation.
- It is the same principle the orbital flight design uses for trajectories (computer-mud-engineering-services-section, `2026-10-10-farstone-orbital-flight-high-level-design.md`): law, not state.

## Consumers

- FeltOS `ecology.mjs` (the law) and `gathering.mjs` (harvest events), with their tests.
- Farstone's climate and perception, which read stock and pollution through the law.

## Open questions

- Which resources need coupled laws without a closed form, and what memoisation bound keeps memory within the host's limits (the 7 GB test incident of 2026-10-03)?
- Should a harvest or pollution event be a SignCraft cell, so that ecology history merges across world replicas like any other history?
